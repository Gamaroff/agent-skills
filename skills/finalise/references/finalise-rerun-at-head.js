#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-rerun-at-head.js. Regenerate via `npm run bundle`.
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
 * docs-only rule reads its own; a working-tree edit cannot add a command.
 *
 * "AT THE HEAD" IS CHECKED. An uncommitted path — staged, unstaged or untracked — is refused
 * (`dirty-tree`) unless it is documentation by ci.docsOnly.patterns: /finalise's own records are
 * uncommitted at this point by design, and they are documentation. A run over edited code would be
 * reported as the head's. The rule and its code are the docs-only check's own (dirtyNonDocsPaths),
 * less `.claude/state/`, the pipelines' own state, which a consumer need not ignore.
 *
 * THE RUN IS DATA, NEVER A VERDICT. A command's non-zero exit does not change this engine's: the
 * criterion says what the command must do, and the AC agent grades the saved run against it.
 *
 * Usage:
 *   finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>]
 *                             [--timeout-seconds <n>] [--json]
 *
 *   --out-dir is emptied of an earlier run's record first, so a file in it is always this run's.
 *   It writes <n>.stdout, <n>.stderr, run.json: { head, runs: [{ command, criteria, exit_code,
 *   timed_out, stdout, stderr }] }, and run.md, the block for the DoD running summary.
 *
 * reason / exit:
 *   ran             0  at least one command was run
 *   none-named      0  the list is set and no criterion names an entry of it
 *   not-configured  0  finalise.rerunAtHead is absent or empty
 *   dirty-tree      1  nothing was run: the working tree is not the head
 *   scan-broken     1  the document or its criteria section could not be read
 *   usage           2  bad arguments, or a configuration that cannot be read as a list of commands
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseYamlSubset } = require("./yaml-subset.js");
const { readCriteriaEntries } = require("./criteria-section.js");
const {
  configTextAtCommit,
  dirtyNonDocsPaths,
  killProcessGroup,
  parseConfig,
  spawnCheck,
} = require("./ci-tree-equivalence.js");

const DEFAULT_TIMEOUT_SECONDS = 1500;
const PIPELINE_STATE_DIR = ".claude/state/";
const EXCERPT_LINES = 20;
const EXCERPT_CHARS = 4000;
const USAGE =
  "usage: finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>] [--timeout-seconds <n>] [--json]";

class UsageError extends Error {}

const normKey = (k) => String(k).toLowerCase().replace(/[-_]/g, "");

/** The listed commands. Throws UsageError on anything that is not a plain list of non-empty strings. */
function parseRerunList(rawText) {
  const parsed = parseYamlSubset(String(rawText).replace(/^﻿/, "")) || {};
  for (const k of Object.keys(parsed)) {
    if (k !== "finalise" && normKey(k) === "finalise")
      throw new UsageError(
        `${k} looks like finalise; the key is exactly "finalise"`,
      );
  }
  const block = parsed.finalise;
  if (block === undefined || block === null) return [];
  if (typeof block !== "object" || Array.isArray(block))
    throw new UsageError("finalise must be a block mapping");
  for (const k of Object.keys(block)) {
    if (k !== "rerunAtHead" && normKey(k) === "rerunathead")
      throw new UsageError(
        `finalise.${k} looks like finalise.rerunAtHead; the key is exactly "rerunAtHead"`,
      );
  }
  const list = block.rerunAtHead;
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list))
    throw new UsageError(
      'finalise.rerunAtHead must be a block list, one "- <command>" per line',
    );
  const out = [];
  for (const entry of list) {
    if (typeof entry !== "string" || entry.trim() === "")
      throw new UsageError(
        "finalise.rerunAtHead entries must be non-empty command strings",
      );
    if (!out.includes(entry.trim())) out.push(entry.trim());
  }
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
  { root, outDir, timeoutSeconds },
) {
  const stdout = path.join(outDir, `${n}.stdout`);
  const stderr = path.join(outDir, `${n}.stderr`);
  const out = fs.openSync(stdout, "w");
  const err = fs.openSync(stderr, "w");
  let r;
  try {
    // spawnCheck owns the command's process group: a timeout, or a signal to this engine, ends what
    // the command started and not only its shell.
    r = await spawnCheck("sh", ["-c", command], {
      cwd: root,
      stdio: ["ignore", out, err],
      timeout: timeoutSeconds * 1000,
    });
    killProcessGroup(r.pid);
  } finally {
    fs.closeSync(out);
    fs.closeSync(err);
  }
  return {
    command,
    criteria,
    // null: it did not finish by itself (a timeout, a signal, a failed spawn), so there is no status.
    exit_code: r.error || typeof r.status !== "number" ? null : r.status,
    timed_out: Boolean(r.error && r.error.code === "ETIMEDOUT"),
    stdout,
    stderr,
  };
}

function excerpt(file) {
  const text = fs.readFileSync(file, "utf8").trimEnd();
  if (text === "") return "";
  const tail = text.split("\n").slice(-EXCERPT_LINES).join("\n");
  return tail.length > EXCERPT_CHARS ? tail.slice(-EXCERPT_CHARS) : tail;
}

/** The DoD block: each run, with the tail of what it printed, fenced by more backticks than it holds. */
function markdown(result) {
  const lines = [
    "### Commands re-run at the head",
    "",
    `Head: \`${result.head}\` (\`finalise.rerunAtHead\`)`,
  ];
  for (const r of result.runs) {
    const ids = r.criteria.map((c) => `#${c.index}`).join(", ");
    const status = r.timed_out
      ? "timed out"
      : r.exit_code === null
        ? "did not finish"
        : `exit ${r.exit_code}`;
    lines.push("", `- \`${r.command}\` — criteria ${ids} — **${status}**`);
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
    json: false,
  };
  const take = (i, flag) => {
    if (argv[i + 1] === undefined || argv[i + 1] === "")
      throw new UsageError(`${flag} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--doc") o.doc = take(i++, a);
    else if (a === "--out-dir") o.outDir = take(i++, a);
    else if (a === "--workspace-root") o.root = take(i++, a);
    else if (a === "--timeout-seconds") {
      const v = take(i++, a);
      if (!/^[1-9]\d{0,5}$/.test(v))
        throw new UsageError("--timeout-seconds must be a positive integer");
      o.timeoutSeconds = Number(v);
    } else throw new UsageError(`unknown argument: ${a}`);
  }
  if (!o.doc) throw new UsageError("--doc is required");
  if (!o.outDir) throw new UsageError("--out-dir is required");
  return o;
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
        if (/^(\d+\.(stdout|stderr)|run\.(json|md))$/.test(f))
          fs.unlinkSync(path.join(outDir, f));
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

    const found = dirtyNonDocsPaths(
      execFileSync,
      root,
      parseConfig(text).patterns,
    );
    // The pipelines keep their own state here, this engine's output included, and a consumer need
    // not ignore it.
    const dirty =
      found && found.filter((f) => !f.startsWith(PIPELINE_STATE_DIR));
    if (dirty === null || dirty.length > 0)
      return {
        reason: "dirty-tree",
        exitCode: 1,
        message:
          dirty === null
            ? "git status could not be read, so the working tree cannot be shown to be the head"
            : `the working tree is not the head: ${dirty.slice(0, 5).join(", ")}`,
        ...base,
      };
    fs.mkdirSync(outDir, { recursive: true });
    const runs = [];
    for (const [i, r] of named.entries())
      runs.push(
        await runOne(r, i + 1, {
          root,
          outDir,
          timeoutSeconds: o.timeoutSeconds,
        }),
      );
    const result = { reason: "ran", exitCode: 0, head, runs };
    fs.writeFileSync(
      path.join(outDir, "run.json"),
      `${JSON.stringify({ head, runs }, null, 2)}\n`,
    );
    fs.writeFileSync(path.join(outDir, "run.md"), markdown(result));
    return result;
  } catch (e) {
    // A configuration error reported by ci-tree-equivalence.js is the same class as one found here.
    return {
      reason: "usage",
      exitCode: 2,
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
