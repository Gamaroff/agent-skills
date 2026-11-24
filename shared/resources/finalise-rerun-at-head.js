#!/usr/bin/env node
"use strict";

/**
 * Re-run the commands a work item's criteria name, at the head /finalise is judging (task.319).
 *
 * A criterion such as "`npm run audit:links` reports 0 broken links" was graded on the run QA recorded.
 * When a later commit moved the head, that run is of another commit, and /finalise halted on it: not a
 * defect, only an old measurement. A project lists the commands it allows to be run for this, and this
 * engine runs each listed command a criterion names, once, and saves what it printed.
 *
 *   finalise:
 *     rerunAtHead:
 *       - npm run audit:links
 *
 * WHAT IS RUN, AND WHY IT CANNOT BE SOMETHING ELSE. A criterion names a command only when one of its
 * code spans, whole, EQUALS a listed entry (leading and trailing space aside). Nothing is matched by
 * prefix, substring or pattern, and nothing the document says is ever executed: the text that runs is
 * the configuration's own entry. The list is read from skills-config.yaml at the HEAD commit, as the
 * docs-only rule reads its own; a working-tree edit cannot add a command. A list the reader cannot read
 * whole is refused, never read as shorter or absent: every row of the `finalise` block is accounted for,
 * and an entry the YAML subset would change (a `#`, a partial quote, a block scalar) is refused by name.
 *
 * "AT THE HEAD" IS CHECKED before each command and after the last. An uncommitted path — staged,
 * unstaged or untracked — is refused (`dirty-tree`) unless it is documentation by ci.docsOnly.patterns:
 * /finalise's own records are uncommitted at this point by design, and they are documentation. A run
 * over edited code would be reported as the head's. A command that writes code, or a head that moves
 * while they run, refuses too and leaves no run.json. The uncommitted documentation is listed in the
 * record, because a command that reads documentation read that. The rule and its code are the docs-only
 * check's own (dirtyNonDocsPaths), less `.claude/state/`, the pipelines' own state, which a consumer need
 * not ignore, and less this engine's own output.
 *
 * THE RUN IS DATA, NEVER A VERDICT. A command's non-zero exit does not change this engine's: the
 * criterion says what the command must do, and the AC agent grades the saved run against it.
 *
 * WHAT BOUNDS IT. --timeout-seconds is the budget of the WHOLE run, not of each command: a command that
 * reaches it is killed, and one that would start after it is recorded as not started. A stream past
 * --max-output-bytes stops its command. A kill reaches the command's process group; a descendant in a
 * session of its own (`setsid`, a daemon) is outside it and outlives the bound.
 *
 * Usage:
 *   finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>]
 *                             [--timeout-seconds <n>] [--max-output-bytes <n>] [--json]
 *
 *   --out-dir is emptied of an earlier run's record first, so a file in it is always this run's.
 *   It writes <n>.stdout, <n>.stderr, run.json: { head, uncommitted_docs, runs: [{ command, criteria,
 *   exit_code, timed_out, not_started, output_capped, stdout, stderr }] }, and run.md, the block for the
 *   DoD running summary.
 *
 * reason / exit:
 *   ran             0  at least one command was run
 *   none-named      0  the list is set and no criterion names an entry of it
 *   not-configured  0  finalise.rerunAtHead is absent or an empty list
 *   dirty-tree      1  the working tree is not the head, or stopped being it; no record is kept
 *   scan-broken     1  the document or its criteria section could not be read
 *   failed          1  the engine itself failed (a file it could not write, git); no record is kept
 *   usage           2  bad arguments, or a configuration that cannot be read as a list of commands
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseYamlSubset } = require("./yaml-subset.js");
const { readCriteriaEntries } = require("./criteria-section.js");
const {
  UsageError,
  assertBlockRows,
  assertMapping,
  configTextAtCommit,
  dirtyNonDocsPaths,
  killProcessGroup,
  parseConfig,
  spawnCheck,
} = require("./ci-tree-equivalence.js");

const DEFAULT_TIMEOUT_SECONDS = 1500;
const DEFAULT_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const PIPELINE_STATE_DIR = ".claude/state/";
const OWN_FILE = /^(\d+\.(stdout|stderr)|run\.(json|md))$/;
const EXCERPT_LINES = 20;
const EXCERPT_CHARS = 4000;
const EXCERPT_BYTES = 64 * 1024;
const USAGE =
  "usage: finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>] [--timeout-seconds <n>] [--max-output-bytes <n>] [--json]";

const normKey = (k) => String(k).toLowerCase().replace(/[-_]/g, "");

/** The entries of finalise.rerunAtHead as written, one per row, dash removed. */
function rawEntries(text) {
  const out = [];
  let inFinalise = false;
  let inList = false;
  for (const l of text.split(/\r?\n/)) {
    const t = l.trim();
    if (t === "" || t.startsWith("#")) continue;
    if (/^\S/.test(l)) {
      inFinalise = /^finalise\s*:/.test(l);
      inList = false;
      continue;
    }
    if (!inFinalise) continue;
    if (/^\s+(["']?)rerunAtHead\1\s*:/.test(l)) {
      inList = true;
      continue;
    }
    const m = /^\s*-\s+(.*)$/.exec(l);
    if (inList && m) out.push(m[1].trim());
    else inList = false;
  }
  return out;
}

/**
 * Why the YAML subset would not read this entry as it is written, or "". The subset cuts an unquoted
 * `#` anywhere, keeps escapes as text and reads a block scalar's marker as the value, so an entry it
 * would change is refused: the command that runs is the one the project wrote.
 */
function entryProblem(raw) {
  if (/^["']/.test(raw))
    return /^("[^"\\]*"|'[^']*')(\s+#.*)?$/.test(raw)
      ? ""
      : "quote the whole entry, with no escapes inside";
  if (/^[[\]{}&*!|>%@`?,]/.test(raw))
    return "starts with a character YAML reserves: quote the whole entry";
  const hash = raw.indexOf("#");
  if (
    hash >= 0 &&
    (!/\s/.test(raw[hash - 1] || "") || /["']/.test(raw.slice(0, hash)))
  )
    return "holds a # that is not a plain trailing comment: quote the whole entry";
  return "";
}

/** The listed commands. Throws UsageError on anything that is not a plain list of non-empty strings. */
function parseRerunList(rawText) {
  const text = String(rawText).replace(/^﻿/, "");
  const parsed = parseYamlSubset(text) || {};
  assertMapping(text, parsed);
  for (const k of Object.keys(parsed)) {
    if (k !== "finalise" && normKey(k) === "finalise")
      throw new UsageError(
        `${k} looks like finalise; the key is exactly "finalise"`,
      );
  }
  const block = parsed.finalise;
  if (block && typeof block === "object" && !Array.isArray(block))
    for (const k of Object.keys(block)) {
      if (k !== "rerunAtHead" && normKey(k) === "rerunathead")
        throw new UsageError(
          `finalise.${k} looks like finalise.rerunAtHead; the key is exactly "rerunAtHead"`,
        );
    }
  assertBlockRows(text, parsed, "finalise");
  if (block === undefined) return [];
  if (block === null || typeof block !== "object" || Array.isArray(block))
    throw new UsageError(
      "finalise must be a block mapping (remove the key when it holds nothing)",
    );
  const list = block.rerunAtHead;
  if (list === undefined) return [];
  if (!Array.isArray(list))
    throw new UsageError(
      'finalise.rerunAtHead must be a block list, one "- <command>" per line, indented under its key (write [] for none)',
    );
  const raw = rawEntries(text);
  if (raw.length !== list.length)
    throw new UsageError(
      `finalise.rerunAtHead has ${raw.length} row(s) but the parse reads ${list.length} entries`,
    );
  const out = [];
  list.forEach((entry, i) => {
    const problem = entryProblem(raw[i]);
    if (problem)
      throw new UsageError(
        `finalise.rerunAtHead entry ${i + 1} (${raw[i]}) ${problem}`,
      );
    if (typeof entry !== "string" || entry.trim() === "")
      throw new UsageError(
        "finalise.rerunAtHead entries must be non-empty command strings",
      );
    if (!out.includes(entry.trim())) out.push(entry.trim());
  });
  return out;
}

/** The code spans of a criterion, each whole: `x`, ``y``. */
function codeSpans(text) {
  const out = [];
  const re = /(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[2].trim());
  return out;
}

/** [{ command, criteria: ["#1 text", …] }] in list order, only for commands a criterion names. */
function namedCommands(list, criteria) {
  return list
    .map((command) => ({
      command,
      criteria: criteria
        .map((text, i) => ({ index: i + 1, text }))
        .filter((c) => codeSpans(c.text).includes(command)),
    }))
    .filter((r) => r.criteria.length > 0);
}

async function runOne(
  { command, criteria },
  n,
  { root, outDir, deadline, maxBytes },
) {
  const stdout = path.join(outDir, `${n}.stdout`);
  const stderr = path.join(outDir, `${n}.stderr`);
  const out = fs.openSync(stdout, "w");
  const err = fs.openSync(stderr, "w");
  const left = deadline - Date.now();
  const tooBig = () =>
    [out, err].some((fd) => fs.fstatSync(fd).size > maxBytes);
  let r = null;
  let capped = false;
  try {
    if (left > 0) {
      // spawnCheck owns the command's process group: a timeout, a stop, or a signal to this engine, ends
      // what the command started and not only its shell.
      r = await spawnCheck("sh", ["-c", command], {
        cwd: root,
        stdio: ["ignore", out, err],
        timeout: left,
        stopWhen: () => (tooBig() ? "output over the bound" : ""),
      });
      killProcessGroup(r.pid);
    }
    capped = tooBig();
  } finally {
    fs.closeSync(out);
    fs.closeSync(err);
  }
  const stopped = Boolean(r && r.error && r.error.code === "ESTOPPED");
  if (stopped)
    for (const f of [stdout, stderr])
      if (fs.statSync(f).size > maxBytes) fs.truncateSync(f, maxBytes);
  return {
    command,
    criteria,
    // null: it did not finish by itself (a timeout, a stop, a signal, a failed spawn), so there is no
    // status.
    exit_code:
      r === null || r.error || typeof r.status !== "number" ? null : r.status,
    timed_out: Boolean(r && r.error && r.error.code === "ETIMEDOUT"),
    not_started: r === null,
    output_capped: capped,
    stdout,
    stderr,
  };
}

/** The last lines of a file, reading no more than its last EXCERPT_BYTES. */
function excerpt(file) {
  const fd = fs.openSync(file, "r");
  let text;
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, EXCERPT_BYTES);
    const buf = Buffer.alloc(len);
    const got = fs.readSync(fd, buf, 0, len, size - len);
    text = buf.toString("utf8", 0, got).trimEnd();
  } finally {
    fs.closeSync(fd);
  }
  if (text === "") return "";
  const tail = text.split("\n").slice(-EXCERPT_LINES).join("\n");
  return tail.length > EXCERPT_CHARS ? tail.slice(-EXCERPT_CHARS) : tail;
}

function statusOf(r) {
  if (r.not_started) return "not started: the run's time budget was spent";
  if (r.timed_out) return "timed out";
  if (r.output_capped && r.exit_code === null)
    return "stopped: its output passed the bound";
  return r.exit_code === null ? "did not finish" : `exit ${r.exit_code}`;
}

/** The DoD block: each run, with the tail of what it printed, fenced by more backticks than it holds. */
function markdown(result) {
  const lines = [
    "### Commands re-run at the head",
    "",
    `Head: \`${result.head}\` (\`finalise.rerunAtHead\`)`,
  ];
  if (result.uncommitted_docs && result.uncommitted_docs.length > 0)
    lines.push(
      "",
      `Uncommitted documentation the commands could read: ${result.uncommitted_docs.map((f) => `\`${f}\``).join(", ")}`,
    );
  for (const r of result.runs) {
    const ids = r.criteria.map((c) => `#${c.index}`).join(", ");
    lines.push("", `- \`${r.command}\` — criteria ${ids} — **${statusOf(r)}**`);
    for (const [label, file] of [
      ["stdout", r.stdout],
      ["stderr", r.stderr],
    ]) {
      const tail = excerpt(file);
      if (tail === "") continue;
      const longest = Math.max(
        2,
        ...[...tail.matchAll(/`+/g)].map((m) => m[0].length),
      );
      const fence = "`".repeat(longest + 1);
      lines.push("", `  ${label} (last lines):`, "", fence, tail, fence);
    }
  }
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const o = {
    doc: "",
    outDir: "",
    root: process.cwd(),
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    maxBytes: DEFAULT_MAX_OUTPUT_BYTES,
    json: false,
  };
  const take = (i, flag) => {
    if (argv[i + 1] === undefined || argv[i + 1] === "")
      throw new UsageError(`${flag} needs a value`);
    return argv[i + 1];
  };
  const positive = (i, flag, digits) => {
    const v = take(i, flag);
    if (!new RegExp(`^[1-9]\\d{0,${digits - 1}}$`).test(v))
      throw new UsageError(`${flag} must be a positive integer`);
    return Number(v);
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--doc") o.doc = take(i++, a);
    else if (a === "--out-dir") o.outDir = take(i++, a);
    else if (a === "--workspace-root") o.root = take(i++, a);
    else if (a === "--timeout-seconds") o.timeoutSeconds = positive(i++, a, 6);
    else if (a === "--max-output-bytes") o.maxBytes = positive(i++, a, 10);
    else throw new UsageError(`unknown argument: ${a}`);
  }
  if (!o.doc) throw new UsageError("--doc is required");
  if (!o.outDir) throw new UsageError("--out-dir is required");
  return o;
}

/**
 * What the working tree holds that the head does not: { why, docs }. `why` is "" when the tree is the
 * head as far as code goes, else the sentence to refuse with.
 */
function compareWithHead({ git, root, head, patterns, outDir }) {
  let now;
  try {
    now = git("rev-parse", "--verify", "HEAD^{commit}");
  } catch {
    now = "unreadable";
  }
  if (now !== head)
    return {
      why: `HEAD moved from ${head.slice(0, 12)} to ${now.slice(0, 12)}`,
      docs: [],
    };
  const code = dirtyNonDocsPaths(execFileSync, root, patterns);
  const all = dirtyNonDocsPaths(execFileSync, root, []);
  if (code === null || all === null)
    return {
      why: "git status could not be read, so the working tree cannot be shown to be the head",
      docs: [],
    };
  const top = fs.realpathSync(git("rev-parse", "--show-toplevel"));
  const outPrefix = `${path.relative(top, fs.existsSync(outDir) ? fs.realpathSync(outDir) : outDir)}/`;
  const own = (f) =>
    f.startsWith(PIPELINE_STATE_DIR) ||
    (f.startsWith(outPrefix) && OWN_FILE.test(f.slice(outPrefix.length)));
  const dirty = code.filter((f) => !own(f));
  return {
    why:
      dirty.length > 0
        ? `the working tree is not the head: ${dirty.slice(0, 5).join(", ")}`
        : "",
    docs: all.filter((f) => !own(f) && !code.includes(f)),
  };
}

async function run(argv) {
  try {
    const o = parseArgs(argv);
    const root = path.resolve(o.root);
    const outDir = path.resolve(root, o.outDir);
    const git = (...a) =>
      execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();
    let head;
    try {
      head = git("rev-parse", "--verify", "HEAD^{commit}");
    } catch {
      throw new UsageError(`${root} is not a git checkout with a commit`);
    }
    // Only this engine's own files: a wrong --out-dir must not lose anything else.
    if (fs.existsSync(outDir))
      for (const f of fs.readdirSync(outDir))
        if (OWN_FILE.test(f)) fs.unlinkSync(path.join(outDir, f));
    const text = configTextAtCommit(execFileSync, root, head);
    const list = text === null ? [] : parseRerunList(text);
    const base = { head, runs: [] };
    if (list.length === 0)
      return { reason: "not-configured", exitCode: 0, ...base };

    let body;
    try {
      body = fs.readFileSync(path.resolve(root, o.doc), "utf8");
    } catch (e) {
      return {
        reason: "scan-broken",
        exitCode: 1,
        message: `cannot read ${o.doc}: ${e.code}`,
        ...base,
      };
    }
    const entries = readCriteriaEntries(body);
    if (entries === null || entries.length === 0)
      return {
        reason: "scan-broken",
        exitCode: 1,
        message: "the document has no criteria the reader can find",
        ...base,
      };
    const named = namedCommands(
      list,
      entries.map((e) =>
        [e.line, ...e.continuation].filter(Boolean).join(" ").trim(),
      ),
    );
    if (named.length === 0)
      return { reason: "none-named", exitCode: 0, ...base };

    const { patterns } = parseConfig(text);
    const docs = new Set();
    const refusal = (when) => {
      const { why, docs: found } = compareWithHead({
        git,
        root,
        head,
        patterns,
        outDir,
      });
      for (const f of found) docs.add(f);
      return why === ""
        ? null
        : {
            reason: "dirty-tree",
            exitCode: 1,
            message: `${when}: ${why}`,
            ...base,
          };
    };
    const deadline = Date.now() + o.timeoutSeconds * 1000;
    const runs = [];
    for (const [i, r] of named.entries()) {
      const no = refusal(`before \`${r.command}\``);
      if (no) return no;
      fs.mkdirSync(outDir, { recursive: true });
      runs.push(
        await runOne(r, i + 1, {
          root,
          outDir,
          deadline,
          maxBytes: o.maxBytes,
        }),
      );
    }
    const moved = refusal(`after \`${named[named.length - 1].command}\``);
    if (moved) return moved;
    const result = {
      reason: "ran",
      exitCode: 0,
      head,
      uncommitted_docs: [...docs].sort(),
      runs,
    };
    const { uncommitted_docs } = result;
    fs.writeFileSync(path.join(outDir, "run.md"), markdown(result));
    fs.writeFileSync(
      path.join(outDir, "run.json"),
      `${JSON.stringify({ head, uncommitted_docs, runs }, null, 2)}\n`,
    );
    return result;
  } catch (e) {
    // A configuration error reported by ci-tree-equivalence.js is the same class as one found here.
    const usage = e instanceof UsageError;
    return {
      reason: usage ? "usage" : "failed",
      exitCode: usage ? 2 : 1,
      message: e && e.message ? e.message.split("\n")[0] : String(e),
      head: null,
      runs: [],
    };
  }
}

async function main(argv) {
  const result = await run(argv);
  if (argv.includes("--json"))
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else
    process.stdout.write(
      `${result.reason}${result.message ? `: ${result.message}` : ""}\n`,
    );
  if (result.exitCode !== 0)
    process.stderr.write(
      `finalise-rerun-at-head: ${result.reason}: ${result.message}\n${result.reason === "usage" ? `${USAGE}\n` : ""}`,
    );
  process.exitCode = result.exitCode;
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  codeSpans,
  namedCommands,
  parseRerunList,
  markdown,
  run,
  USAGE,
};
