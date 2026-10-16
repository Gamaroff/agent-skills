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
 *
 * The plan's argv must not carry --record, --repo-root, --cases-file, --json, --emit-block or
 * --timeout: this script owns them, so a plan cannot redirect the record or the containment root,
 * or lift the engine's per-case time budget. An entry that does is refused (`plan-entry-owns-flag`)
 * and never run. Each engine run is also bounded as a whole (ENGINE_TIMEOUT_MS); one that outlives
 * it is killed and recorded as a refusal, never as executed (task.189 CR2-4).
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
const ENGINE_TIMEOUT_MS = 20 * 60 * 1000;

function parseArgs(argv) {
  const opts = { json: false, engine: path.join(HERE, "security-probe.mjs") };
  const map = {
    "--plan": "plan",
    "--record": "record",
    "--cases-base": "casesBase",
    "--repo-root": "repoRoot",
    "--engine": "engine",
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
  return ownedFlagIn(argv) === null ? argv : null;
}

/** The flag a plan entry may not carry, or null. Matches `--flag` and `--flag=value`. */
export function ownedFlagIn(argv) {
  for (const a of argv) {
    const flag = String(a).split("=")[0];
    if (OWNED_FLAGS.includes(flag)) return flag;
  }
  return null;
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
        reason: `plan-entry-owns-flag: ${ownedFlagIn(argv)}`,
      });
      continue;
    }
    const extra = [];
    let cases = null;
    if (Array.isArray(item.cases)) {
      // Each probe's key is `<index>:<id>`, unique only while ids are unique within the entry
      // (task.189 CR3-2): a repeated id would give two probes one key, and one grade both.
      const seen = new Set();
      const dup = item.cases.find((c) => {
        const id = c && c.id;
        if (seen.has(id)) return true;
        seen.add(id);
        return false;
      });
      if (dup) {
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
      fs.writeFileSync(file, JSON.stringify(item.cases, null, 2) + "\n");
      out.cases_files.push(file);
      extra.push("--cases-file", file);
      cases = item.cases;
    } else if (item.cases != null) {
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

async function main(argv) {
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
