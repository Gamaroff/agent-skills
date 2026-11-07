#!/usr/bin/env node
/**
 * security-probe-plan.mjs — run the DoD security agent's probe plan (task.189, obs #218).
 *
 * /finalise dispatches its security agent as a read-only Explore subagent. That agent decides
 * WHAT to probe — the boundary, the sink, the entry, the cases — and returns it as `probe_plan[]`.
 * It never runs the engine: the engine builds a sandbox and writes a run record, and a read-only
 * agent asked to do that refuses (task.158 returned a false `probe mode executed no candidates`
 * FAIL; obs #10 added a fallback for exactly that refusal). This script is the step that CAN write:
 * finalise Step 3b.1 runs it on the plan, and the counts in the DoD come from the record it makes.
 *
 * Usage:
 *   node security-probe-plan.mjs --plan <plan.json> --record <run.json> --cases-base <prefix>
 *        --repo-root <dir> [--engine <security-probe.mjs>] [--json]
 *
 *   --plan        JSON array — the agent's probe_plan, one object per control:
 *                   { "argv": ["--sink", "path", "--entry", "lib/x.js#isSafe", ...],
 *                     "cases": null | [ {id, sink, input, why, correct, direction, ...}, ... ] }
 *                 `argv` is the engine's arguments as an ARRAY, one element per argument: an
 *                 entry such as `fence:doc.md#Some Heading` or an --argv JSON template carries
 *                 spaces inside one argument, and an array is the only form that cannot split it.
 *   --record      the run record: <work-item-dir>/<stem>.dod.<DOD_N>.security.run.json. Every
 *                 entry records into this ONE file — the engine folds each control into it and
 *                 keeps `totals.executed` across them (security-probe.mjs, "The run record").
 *   --cases-base  <work-item-dir>/<stem>.dod.<DOD_N>.security.cases — an entry's inline `cases`
 *                 are written to <base>.json (a one-entry plan) or <base>.<i>.json (entry i of
 *                 several, 1-based), beside the record, never a temp file (obs #299).
 *   --repo-root   the consumer's repository root; passed to the engine as --repo-root.
 *   --engine      the probe engine (default: security-probe.mjs beside this file).
 *   --reusable-plan <file>   write the plan as it ran, each inline `cases` replaced by the numbered
 *                 cases file written for it (`cases_file`) and its SHA-256 (`cases_sha256`), when
 *                 every entry ran. Commit it beside the record; a later run's `reuse` checks it.
 *
 * An entry may carry `"cases_file": "<name>"` in place of `cases`: a committed cases file in the
 * --cases-base directory, copied byte for byte into the numbered cases file (never re-serialised, so
 * U+0085, U+2028, VT, FF and a lone CR survive). Refused when it is absolute, climbs out, is a symlink
 * or is not a JSON array; `cases_sha256`, when given, must match. An entry's inline cases or file that
 * carry an HTML entity are refused (`plan-entry-cases-html-entity`) when the plan has no literal `<`
 * and the entry's own source file does not carry that entity (obs #65).
 *
 *   node security-probe-plan.mjs reuse --prior-plan <plan.json> --prior-head <rev> --repo-root <dir>
 *        --engine-path <path> [--engine-path <path>...] [--json]
 *   answers `reusable` or `not-reusable: <why>`; see reusePlan().
 *
 * The plan's argv must not carry --record, --repo-root, --cases-file, --json, --emit-block or
 * --timeout: this script owns them, so a plan cannot redirect the record or the containment root,
 * or lift the engine's per-case time budget. An entry that does is refused (`plan-entry-owns-flag`)
 * and never run. Each engine run is also bounded as a whole (ENGINE_TIMEOUT_MS); one that outlives
 * it is killed and recorded as a refusal, never as executed (task.189 CR2-4). An entry whose argv
 * holds an HTML entity (`&gt;`, `&lt;`, `&amp;`, `&quot;`, `&apos;`, `&#…;`) is refused as
 * `plan-entry-html-entity`: it is a transport escape from the agent's reply, not a probe (obs #133).
 *
 * Output (--json): {
 *   reason:          "ran" | "empty-plan" | "record-unreadable" (entries ran, but the record
 *                    they wrote cannot be folded — never read as zero executed),
 *   record:          the --record path,
 *   probes_executed: the record's totals.executed, read through the engine's own readRecord()
 *                    (the entry files, never the human snapshot) — copied, never composed; 0
 *                    when no entry reached the record (empty plan, every entry refused),
 *   escapes:         every case the engine saw write outside its sandbox: {index, entry, id,
 *                    path}. Non-empty is a finding whatever the verdict — the engine exits 1 on
 *                    an escape even when the control engages,
 *   probes:          one per case the engine reported reproduced (a hostile case accepted) or
 *                    overblocked (a legitimate case refused): {key, control, id, input,
 *                    expected, actual, reproduced: true}. `key` is `<plan index>:<id>`, unique
 *                    within the run — `id` is the corpus case id, which every control on the same
 *                    sink shares, so grading and merging go by `key` (task.189 CR2-1). No `severity` — the orchestrator does not grade,
 *                    and /finalise Step 8a reads a probe without one as not-low,
 *   refusals:        entries that never ran or the engine refused: {index, entry, reason},
 *   runs:            {index, entry, exit, verdict, executed, escapes} for every entry the
 *                    engine took (escapes is that entry's count),
 *   cases_files:     the cases files written,
 * }
 *
 * Exit codes (repository convention): 0 the plan was read and every runnable entry was handed to
 * the engine (findings, refusals and a zero count are all fields, not exit codes — the caller's
 * zero-guard reads probes_executed); 1 the plan file is unreadable or not a JSON array; 2 usage.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OWNED_FLAGS = Object.freeze([
  "--record",
  "--repo-root",
  "--cases-file",
  "--json",
  "--emit-block",
  "--timeout",
]);
// One engine run, bounded as a whole. The engine bounds each case; this bounds the run, so a plan
// with an unbounded inline `cases` list cannot hold Step 3b.1 open indefinitely.
export const ENGINE_TIMEOUT_MS = 20 * 60 * 1000;

function parseArgs(argv) {
  const opts = { json: false, engine: path.join(HERE, "security-probe.mjs") };
  const map = {
    "--plan": "plan",
    "--record": "record",
    "--cases-base": "casesBase",
    "--repo-root": "repoRoot",
    "--engine": "engine",
    "--reusable-plan": "reusablePlan",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (Object.prototype.hasOwnProperty.call(map, a)) {
      const v = argv[++i];
      if (v === undefined || v === "") throw new Error(`${a} needs a value`);
      opts[map[a]] = v;
    } else throw new Error(`unknown argument: ${a}`);
  }
  for (const k of ["plan", "record", "casesBase", "repoRoot"]) {
    if (!opts[k])
      throw new Error(
        `missing --${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`,
      );
  }
  return opts;
}

/**
 * The plan entry's argv when the runner may run it, else null — the refusal boundary in the shape
 * the probe engine reads (a returned value is acceptance, null is refusal), so it can be probed
 * directly (task.189 QA-1). Refused: anything that is not a non-empty array of strings, and any
 * argv carrying a flag this runner owns, in either spelling (`--record x` or `--record=x`).
 */
export function planArgvAllowed(argv) {
  if (
    !Array.isArray(argv) ||
    argv.length === 0 ||
    !argv.every((a) => typeof a === "string")
  )
    return null;
  return ownedFlagIn(argv) === null && htmlEntityIn(argv) === null
    ? argv
    : null;
}

// The escapes a subagent's reply can introduce in transport. On task.243 every `>` came back as
// `&gt;`, so each control ran against `*&gt;chip`. The control rightly refused it, and that read as
// 49 legitimate cases over-blocked (obs #133). Only argv is checked: a case's `input` may carry an
// entity on purpose, but the engine's arguments name code and are never HTML.
const HTML_ENTITY = /&(?:gt|lt|amp|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);/;

/** The first HTML entity in a plan entry's argv, or null. */
export function htmlEntityIn(argv) {
  for (const a of argv) {
    const m = HTML_ENTITY.exec(String(a));
    if (m) return m[0];
  }
  return null;
}

/** The flag a plan entry may not carry, or null. Matches `--flag` and `--flag=value`. */
export function ownedFlagIn(argv) {
  for (const a of argv) {
    const flag = String(a).split("=")[0];
    if (OWNED_FLAGS.includes(flag)) return flag;
  }
  return null;
}

/**
 * A cases file the plan names, resolved under the work-item directory only. `{ok:true, file, bytes,
 * sha256}` with `file` the real path, or `{ok:false, why}`. Refused: a non-string or empty name, an
 * absolute path or one that climbs out (`..`), a symlink (the link, or a parent that resolves outside),
 * and anything that is not a regular file. The check runs on real paths: a name that merely looks
 * inside the directory is not the test (task 269).
 */
export function resolveCasesFile(name, workDir) {
  if (typeof name !== "string" || name === "" || name.includes("\0"))
    return { ok: false, why: "bad-name" };
  if (path.isAbsolute(name)) return { ok: false, why: "outside-work-dir" };
  let root;
  try {
    root = fs.realpathSync(workDir);
  } catch {
    return { ok: false, why: "unreadable" };
  }
  const joined = path.resolve(root, name);
  const rel = path.relative(root, joined);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel))
    return { ok: false, why: "outside-work-dir" };
  let st;
  try {
    st = fs.lstatSync(joined);
  } catch {
    return { ok: false, why: "missing" };
  }
  if (st.isSymbolicLink()) return { ok: false, why: "symlink" };
  if (!st.isFile()) return { ok: false, why: "not-a-file" };
  let real;
  try {
    real = fs.realpathSync(joined);
  } catch {
    return { ok: false, why: "unreadable" };
  }
  const realRel = path.relative(root, real);
  if (realRel.startsWith("..") || path.isAbsolute(realRel))
    return { ok: false, why: "outside-work-dir" };
  let bytes;
  try {
    bytes = fs.readFileSync(real);
  } catch {
    return { ok: false, why: "unreadable" };
  }
  return {
    ok: true,
    file: real,
    bytes,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

/**
 * The first HTML entity in a case list's text (inputs and fixtures alike), when it is an escape and
 * not a payload: `null` when there is none, or when the plan carries a literal `<` somewhere
 * (`planHasLiteralAngle`) or the entry's own source file carries the same entity (`sourceText`).
 * Otherwise every `<` in the plan came back as `&lt;`, and the cases would test a different input
 * (obs #65). The check is on cases only; argv is `plan-entry-html-entity`'s, by design.
 */
export function casesEntityIn(cases, planHasLiteralAngle, sourceText) {
  if (planHasLiteralAngle) return null;
  const m = HTML_ENTITY.exec(JSON.stringify(cases));
  if (!m) return null;
  if (typeof sourceText === "string" && sourceText.includes(m[0])) return null;
  return m[0];
}

/** The text of the file an entry probes (`fence:<path>#…` or `<path>#<export>`), or null. */
export function entrySourceText(argv, repoRoot) {
  const entry = valueOf(argv, "--entry");
  if (typeof entry !== "string" || !repoRoot) return null;
  const file = entry.replace(/^[a-z-]+:/, "").split("#")[0];
  if (!file) return null;
  try {
    const root = fs.realpathSync(repoRoot);
    const real = fs.realpathSync(path.resolve(root, file));
    const rel = path.relative(root, real);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
    return fs.readFileSync(real, "utf8");
  } catch {
    return null;
  }
}

/** The value following `flag` in an argv array, or null. */
function valueOf(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

/** The case a reported id names: `id` or `id@shell` (shell forms), looked up in `cases`. */
function caseFor(cases, reportedId) {
  const id = String(reportedId).replace(/@[^@]*$/, "");
  return (
    (cases || []).find((c) => c && c.id === reportedId) ||
    (cases || []).find((c) => c && c.id === id) ||
    null
  );
}

async function corpusCases(sink, engineDir) {
  if (!sink) return [];
  try {
    const mod = await import(path.join(engineDir, "security-input-corpus.mjs"));
    return mod.corpusFor(sink);
  } catch {
    return [];
  }
}

/**
 * totals.executed, folded by the engine's own readRecord() from the record's entry files — the
 * snapshot at `record` is for humans and never authoritative (security-probe.mjs). `{ok:false}`
 * when the record cannot be folded: a run that wrote entries and an unreadable record are not
 * the same state as nothing executed, and must not both read as 0 (task.189 CR-4).
 */
async function readExecuted(record, engine) {
  try {
    const { readRecord } = await import(path.resolve(engine));
    const rec = readRecord(record);
    // Only called after at least one run, and every run writes an entry: no entry directory now
    // is an unreadable record, not "nothing executed" (task.189 CR2-3).
    if (rec === null)
      return {
        ok: false,
        error: "entries ran, but the record has no entry directory",
      };
    const n = rec.totals && rec.totals.executed;
    return Number.isInteger(n) && n >= 0
      ? { ok: true, executed: n }
      : { ok: false, error: "the record carries no totals.executed" };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

export async function runPlan(options) {
  // The engine defaults to the one beside this file, as the CLI does.
  const opts = { engine: path.join(HERE, "security-probe.mjs"), ...options };
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(opts.plan, "utf8"));
  } catch (e) {
    return {
      exit: 1,
      out: { reason: "bad-plan", error: `cannot read --plan: ${e.message}` },
    };
  }
  if (!Array.isArray(plan)) {
    return {
      exit: 1,
      out: { reason: "bad-plan", error: "--plan is not a JSON array" },
    };
  }
  const out = {
    reason: plan.length === 0 ? "empty-plan" : "ran",
    record: opts.record,
    probes_executed: 0,
    probes: [],
    escapes: [],
    refusals: [],
    runs: [],
    cases_files: [],
  };
  const engineDir = path.dirname(path.resolve(opts.engine));
  // `cases_file:` names are resolved under the directory the numbered cases files are written to.
  const workDir = path.dirname(path.resolve(opts.casesBase));
  // A plan whose every `<` came back as `&lt;` has no literal one anywhere (obs #65).
  const planHasLiteralAngle = JSON.stringify(plan).includes("<");
  const casesWritten = new Map(); // plan index -> the numbered cases file written for it
  const reusable = []; // the entries that ran, in a form `reuse` can check later
  for (let i = 0; i < plan.length; i++) {
    const item = plan[i] || {};
    const argv = item.argv;
    const entryName = Array.isArray(argv) ? valueOf(argv, "--entry") : null;
    if (
      !Array.isArray(argv) ||
      argv.length === 0 ||
      !argv.every((a) => typeof a === "string")
    ) {
      out.refusals.push({
        index: i,
        entry: entryName,
        reason: "plan-entry-argv-not-a-string-array",
      });
      continue;
    }
    if (planArgvAllowed(argv) === null) {
      out.refusals.push({
        index: i,
        entry: entryName,
        reason:
          ownedFlagIn(argv) !== null
            ? `plan-entry-owns-flag: ${ownedFlagIn(argv)}`
            : `plan-entry-html-entity: ${htmlEntityIn(argv)}`,
      });
      continue;
    }
    // `cases_file` names a committed cases file in the work-item directory instead of carrying the
    // cases inline: the runner copies its bytes, so nothing between the file and the engine is a
    // model retyping them (task 269, obs #136). It is an alternative to `cases`, never an addition.
    let entryCases = item.cases;
    let fromFile = null;
    if (item.cases_file !== undefined) {
      const refused = (reason) => {
        out.refusals.push({ index: i, entry: entryName, reason });
      };
      if (item.cases != null) {
        refused("plan-entry-cases-and-cases-file");
        continue;
      }
      const r = resolveCasesFile(item.cases_file, workDir);
      if (!r.ok) {
        refused(`plan-entry-cases-file-${r.why}`);
        continue;
      }
      if (item.cases_sha256 !== undefined && item.cases_sha256 !== r.sha256) {
        refused("plan-entry-cases-file-hash-mismatch");
        continue;
      }
      try {
        entryCases = JSON.parse(r.bytes.toString("utf8"));
      } catch {
        refused("plan-entry-cases-file-not-json");
        continue;
      }
      if (!Array.isArray(entryCases)) {
        refused("plan-entry-cases-not-an-array");
        continue;
      }
      fromFile = r;
    }
    if (entryCases != null) {
      const entity = casesEntityIn(
        entryCases,
        planHasLiteralAngle,
        entrySourceText(argv, opts.repoRoot),
      );
      if (entity !== null) {
        out.refusals.push({
          index: i,
          entry: entryName,
          reason: `plan-entry-cases-html-entity: ${entity}`,
        });
        continue;
      }
    }
    const extra = [];
    let cases = null;
    if (Array.isArray(entryCases)) {
      // Each probe's key is `<index>:<id>`, unique only while ids are unique within the entry
      // (task.189 CR3-2): a repeated id would give two probes one key, and one grade both.
      const seen = new Set();
      // findIndex, not find: a repeated FALSY element (null, null) is still a repeat (CR4-5).
      const at = entryCases.findIndex((c) => {
        const id = c && c.id;
        if (seen.has(id)) return true;
        seen.add(id);
        return false;
      });
      if (at >= 0) {
        const dup = { id: entryCases[at] && entryCases[at].id };
        out.refusals.push({
          index: i,
          entry: entryName,
          reason: `plan-entry-cases-duplicate-id: ${dup.id}`,
        });
        continue;
      }
      const file =
        plan.length === 1
          ? `${opts.casesBase}.json`
          : `${opts.casesBase}.${i + 1}.json`;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fromFile) {
        // Bytes, never a string: a round trip through JSON.parse and stringify would normalise the
        // control characters this route exists to keep. A file that is already at its numbered
        // path is left alone (copying a file onto itself truncates nothing but proves nothing).
        const sameFile =
          fs.existsSync(file) && fs.realpathSync(file) === fromFile.file;
        if (!sameFile) fs.copyFileSync(fromFile.file, file);
      } else {
        fs.writeFileSync(file, JSON.stringify(entryCases, null, 2) + "\n");
      }
      out.cases_files.push(file);
      casesWritten.set(i, file);
      extra.push("--cases-file", file);
      cases = entryCases;
    } else if (entryCases != null) {
      out.refusals.push({
        index: i,
        entry: entryName,
        reason: "plan-entry-cases-not-an-array",
      });
      continue;
    }
    const child = spawnSync(
      process.execPath,
      [
        opts.engine,
        ...argv,
        ...extra,
        "--repo-root",
        opts.repoRoot,
        "--record",
        opts.record,
        "--json",
      ],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        timeout: opts.engineTimeoutMs ?? ENGINE_TIMEOUT_MS,
        killSignal: "SIGKILL",
      },
    );
    if (child.status === 2 || child.status === null) {
      const timedOut = child.error && child.error.code === "ETIMEDOUT";
      const why = timedOut
        ? `engine timed out after ${(opts.engineTimeoutMs ?? ENGINE_TIMEOUT_MS) / 1000} s`
        : (child.stderr || "").split("\n").find((l) => l.trim()) ||
          (child.error
            ? child.error.message
            : `engine exited ${child.status ?? child.signal}`);
      out.refusals.push({ index: i, entry: entryName, reason: why.trim() });
      continue;
    }
    let res;
    try {
      res = JSON.parse(child.stdout);
    } catch {
      out.refusals.push({
        index: i,
        entry: entryName,
        reason: "engine output was not JSON",
      });
      continue;
    }
    const escapes = Array.isArray(res.escapes) ? res.escapes : [];
    out.runs.push({
      index: i,
      entry: res.entry ?? entryName,
      exit: child.status,
      verdict: res.verdict ?? null,
      executed: res.executed ?? 0,
      escapes: escapes.length,
    });
    for (const e of escapes) {
      out.escapes.push({ index: i, entry: res.entry ?? entryName, ...e });
    }
    if (casesWritten.has(i)) {
      const f = casesWritten.get(i);
      reusable.push({
        argv,
        cases_file: path.basename(f),
        cases_sha256: crypto
          .createHash("sha256")
          .update(fs.readFileSync(f))
          .digest("hex"),
      });
    } else if (entryCases == null) {
      reusable.push({ argv });
    }
    const pool =
      cases ||
      (await corpusCases(res.sink ?? valueOf(argv, "--sink"), engineDir));
    for (const [ids, expected, actual] of [
      [res.reproduced, "rejected", "accepted"],
      [res.overblocked, "accepted", "rejected"],
    ]) {
      for (const id of Array.isArray(ids) ? ids : []) {
        const c = caseFor(pool, id);
        out.probes.push({
          key: `${i}:${id}`,
          control: res.entry ?? entryName,
          id,
          input: c ? c.input : null,
          expected,
          actual,
          reproduced: true,
        });
      }
    }
  }
  // The plan as it ran, with each inline `cases` replaced by the committed cases file it was written
  // to and that file's hash: the next run's `reuse` checks it instead of trusting a retyped copy.
  // Written only when the caller asks and every entry ran, so a partial plan is never offered.
  if (opts.reusablePlan && out.refusals.length === 0 && reusable.length > 0) {
    fs.writeFileSync(
      opts.reusablePlan,
      JSON.stringify(reusable, null, 2) + "\n",
    );
    out.reusable_plan = opts.reusablePlan;
  }
  if (out.runs.length > 0) {
    const r = await readExecuted(opts.record, opts.engine);
    if (r.ok) out.probes_executed = r.executed;
    else {
      out.reason = "record-unreadable";
      out.error = r.error;
    }
  }
  return { exit: 0, out };
}

/**
 * Can a prior run's plan be run again as it stands? (task 269, obs #136 option b.) `{reason:
 * "reusable"|"not-reusable", why?}`. Reusable only when every fact that would make the cases stale
 * is checked and holds: the plan reads, every entry that carries cases names a committed file whose
 * hash is recorded and still matches, and the engine paths are unchanged since the prior record's
 * head. Any doubt is `not-reusable` and the caller plans afresh: a plan that cannot be shown to be
 * the same is a different plan.
 */
export function reusePlan({ priorPlan, priorHead, repoRoot, enginePaths }) {
  const no = (why) => ({ reason: "not-reusable", why });
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(priorPlan, "utf8"));
  } catch {
    return no("plan-unreadable");
  }
  if (!Array.isArray(plan) || plan.length === 0) return no("plan-empty");
  const dir = path.dirname(path.resolve(priorPlan));
  for (const e of plan) {
    if (!e || typeof e !== "object") return no("plan-entry-invalid");
    if (e.cases != null) return no("inline-cases");
    if (e.cases_file === undefined) continue;
    if (typeof e.cases_sha256 !== "string") return no("no-recorded-hash");
    const r = resolveCasesFile(e.cases_file, dir);
    if (!r.ok) return no(`cases-file-${r.why}`);
    if (r.sha256 !== e.cases_sha256) return no("cases-file-hash-mismatch");
  }
  if (!Array.isArray(enginePaths) || enginePaths.length === 0)
    return no("no-engine-paths");
  if (typeof priorHead !== "string" || !/^[0-9a-zA-Z._/-]+$/.test(priorHead))
    return no("bad-prior-head");
  const rev = spawnSync(
    "git",
    [
      "-C",
      repoRoot,
      "rev-parse",
      "--verify",
      "--quiet",
      `${priorHead}^{commit}`,
    ],
    { encoding: "utf8" },
  );
  if (rev.status !== 0) return no("git-unreadable");
  const diff = spawnSync(
    "git",
    [
      "-C",
      repoRoot,
      "diff",
      "--quiet",
      priorHead,
      "HEAD",
      "--",
      ...enginePaths,
    ],
    { encoding: "utf8" },
  );
  if (diff.status === 1) return no("engine-changed");
  if (diff.status !== 0) return no("git-unreadable");
  return { reason: "reusable" };
}

function reuseMain(argv) {
  const o = { enginePaths: [], json: false };
  const map = {
    "--prior-plan": "priorPlan",
    "--prior-head": "priorHead",
    "--repo-root": "repoRoot",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (
      a === "--engine-path" ||
      Object.prototype.hasOwnProperty.call(map, a)
    ) {
      const v = argv[++i];
      if (v === undefined || v === "") {
        process.stderr.write(`${a} needs a value\n`);
        return 2;
      }
      if (a === "--engine-path") o.enginePaths.push(v);
      else o[map[a]] = v;
    } else {
      process.stderr.write(`unknown argument: ${a}\n`);
      return 2;
    }
  }
  for (const k of ["priorPlan", "priorHead", "repoRoot"]) {
    if (!o[k]) {
      process.stderr.write(
        `reuse needs --${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}\n`,
      );
      return 2;
    }
  }
  const r = reusePlan(o);
  process.stdout.write(
    o.json
      ? JSON.stringify(r, null, 2) + "\n"
      : `${r.reason}${r.why ? `: ${r.why}` : ""}\n`,
  );
  return 0;
}

async function main(argv) {
  if (argv[0] === "reuse") return reuseMain(argv.slice(1));
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    return 2;
  }
  const { exit, out } = await runPlan(opts);
  if (opts.json) process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  else {
    process.stdout.write(
      `probe plan: ${out.reason} — executed ${out.probes_executed ?? 0}, ` +
        `reproduced ${(out.probes || []).length}, refused ${(out.refusals || []).length}\n`,
    );
  }
  return exit;
}

// Compare REAL paths: Step 3b.1 invokes this through the `.agents/skills` symlink, and a plain
// resolve() would see two different paths, run nothing and exit 0 (obs #126).
function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (invokedDirectly()) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
