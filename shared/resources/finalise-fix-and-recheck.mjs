#!/usr/bin/env node
/**
 * finalise-fix-and-recheck — evaluate the fix-and-recheck preconditions for
 * /finalise Step 8a (task.128, obs #121).
 *
 * Usage:
 *   node <this-file> --finding <path.json> [--git-base <ref>] [--json]
 *
 * `--git-base <ref>` (BUG-6, task.128 QA cycle 2): derive `commits` and
 * `touched` from git — `git rev-list --count <ref>..HEAD` and
 * `git diff --name-only <ref>..HEAD` — and REFUSE a finding whose recorded
 * values disagree with what git says. Without it the licence to push is
 * issued on the plan ("commits": 1 typed before any commit exists; touched =
 * "every path the fix WILL change"); with it, Step 8a's post-commit run is
 * issued on the record.
 *
 * The finding file carries the five inputs the preconditions read:
 *   {
 *     "severity": "low",                       // from the agent YAML; absent = not low
 *     "commits": 1,                             // commits the fix takes
 *     "touched": ["lib/x.sh"],                  // paths the fix changes
 *     "filesSummary": ["lib/x.sh"],             // the work item's Files Summary / File List
 *     "documentPath": "docs/tasks/task.1.x/task.1.x.md",   // optional: the work item document —
 *                                               // always inside its own scope (finalise 8a docs-link clause)
 *     "mutationProof": { "test": "tests/x.test.js", "redOnRevert": true,
 *                        "run": ".claude/state/mutation-proof.log" },   // the recorded red run
 *     "otherFindingsOpen": []                   // medium+ findings, or other FAIL sections
 *   }
 *
 * Exit codes (repository convention):
 *   0  every precondition holds — proceed through fix-and-recheck
 *   1  at least one does not — take the existing Step 8 halt; `failed[]` names them
 *   2  usage error (missing/unreadable finding file, malformed JSON)
 *
 * WHY A TABLE AND NOT A JUDGEMENT. On task.121 the finalise security agent found
 * a one-line fail-closed defect in the very script the task delivered, and
 * finalise had two exits: accept, or halt a hands-free run for a human. The run
 * fixed it inline and recorded a deviation. The next run has the same choice and
 * had no rule. The preconditions in finalise-fix-and-recheck-preconditions.json
 * are each checkable from the record; this file checks them, and nothing else
 * decides. A missing input is a failed precondition, never a pass.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// bundle-dependency: shared/resources/finalise-fix-and-recheck-preconditions.json
const TABLE_URL = new URL(
  "./finalise-fix-and-recheck-preconditions.json",
  import.meta.url,
);

/** The pinned table, read once. Exported so a test asserts the ids, not a copy. */
export const PRECONDITIONS = Object.freeze(
  JSON.parse(readFileSync(TABLE_URL, "utf8")).preconditions.map((p) =>
    Object.freeze({ ...p }),
  ),
);

const isList = (v) => Array.isArray(v);

/** A repo-relative path to a task / story / epic / bug document under docs/. */
const WORK_ITEM_DOC_RE =
  /^docs\/(?:[^/]+\/)*(?:task\.\d+|story\.\d+\.\d+|epic\.\d+|bug\.\d+)\.[^/]+\.md$/;
// A pipeline artifact beside the document (its QA report, gate, DoD, plan,
// review…) shares the stem and is NOT the document.
const WORK_ITEM_ARTIFACT_RE =
  /\.(qa|gate|bug|implementation|review|dod|plan|handover|pr-review|risk|test-design)\./;
const isWorkItemDocument = (p) =>
  typeof p === "string" &&
  WORK_ITEM_DOC_RE.test(p) &&
  !WORK_ITEM_ARTIFACT_RE.test(p.slice(p.lastIndexOf("/") + 1)) &&
  !p.includes("..");

/** What a recorded red run looks like from node:test, bash test harnesses, or a
 *  hand-run assertion: a TAP `not ok`, the runner's ✖, or a `fail` count > 0. */
const RED_MARKER = /^\s*(not ok\b|✖|ℹ fail [1-9]|FAIL\b)/;

/** How far a red line may sit from a line naming the test and still count. */
const RED_WINDOW = 3;

/**
 * A red marker TIED to the named test (cycle 2, CR-4). Checking "the log
 * mentions the test" and "the log has a red line" independently let a
 * whole-suite log pass on an unrelated failure while the named test was
 * green. node:test prints a failing test as `✖ <name>` followed within a
 * few lines by `test at <file>:<line>`, so a red line within RED_WINDOW of
 * a line naming the test is the shape of a real red run; a green test's name
 * appears only on a `✔` line with no red neighbour.
 */
function redNamesTest(text, test) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes(test)) continue;
    const lo = Math.max(0, i - RED_WINDOW);
    const hi = Math.min(lines.length - 1, i + RED_WINDOW);
    for (let j = lo; j <= hi; j += 1) {
      if (RED_MARKER.test(lines[j])) return true;
    }
  }
  return false;
}

/**
 * What git says about the fix, for --git-base (BUG-6). Returns null when git
 * cannot answer — and null is a FAILED precondition, never a skipped one.
 */
export function gitFacts(base, cwd = process.cwd()) {
  const run = (args) =>
    spawnSync("git", args, { cwd, encoding: "utf8", input: "" });
  const count = run(["rev-list", "--count", `${base}..HEAD`]);
  const names = run(["diff", "--name-only", `${base}..HEAD`]);
  if (count.status !== 0 || names.status !== 0) return null;
  const commits = Number.parseInt(count.stdout.trim(), 10);
  if (!Number.isInteger(commits)) return null;
  const touched = names.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .sort();
  return { commits, touched };
}

/**
 * One check per precondition id. The keys of this map ARE the evaluator's
 * vocabulary; the test asserts they equal the table's ids exactly, in both
 * directions, so a precondition cannot be added to the table without a check
 * or checked without a row.
 */
const CHECKS = Object.freeze({
  "severity-low": (f) =>
    f.severity === "low"
      ? null
      : f.severity === undefined || f.severity === null
        ? "finding carries no `severity` — not low (the agent did not answer)"
        : `severity is "${f.severity}", not low`,
  "single-commit": (f) =>
    Number.isInteger(f.commits) && f.commits === 1
      ? null
      : `fix is ${f.commits === undefined ? "an unknown number of" : f.commits} commit(s), not 1`,
  "inside-files-summary": (f) => {
    if (!isList(f.touched) || f.touched.length === 0) {
      return "no `touched` paths recorded";
    }
    if (!isList(f.filesSummary)) return "no `filesSummary` recorded";
    // The work item's own document is inside its own scope by construction —
    // a Files Summary lists what the work changes, not the file it lives in —
    // so a record that names it as `documentPath` may touch it (8a docs-link
    // clause, task.139 QA cycle 3 CR-5). Only that one path; anything else
    // still has to be listed.
    // `documentPath` admits ONE path, and only a path shaped like a work item
    // document under docs/ — a record naming README.md as its "document" is a
    // declaration, not a fact, and the precondition would be satisfied by
    // saying so (task.139 QA cycle 4, CR-2).
    const inScope = (p) =>
      f.filesSummary.includes(p) ||
      (isWorkItemDocument(f.documentPath) && p === f.documentPath);
    const outside = f.touched.filter((p) => !inScope(p));
    return outside.length === 0
      ? null
      : `outside the Files Summary: ${outside.join(", ")}`;
  },
  "mutation-proved": (f) => {
    const m = f.mutationProof;
    if (!m || typeof m !== "object") return "no `mutationProof` recorded";
    if (typeof m.test !== "string" || m.test.trim() === "") {
      return "mutationProof names no test";
    }
    if (m.redOnRevert !== true) {
      return `${m.test} did not go red on revert (redOnRevert: ${m.redOnRevert})`;
    }
    // The statement says "the run that showed it is recorded". A boolean the
    // agent flips by hand is not a record (task.128 QA cycle 1, BUG-4): the run
    // is a file this check opens, and it must be non-empty, name the test, and
    // carry a red marker. Absent, empty or silent → not proved.
    if (typeof m.run !== "string" || m.run.trim() === "") {
      return "mutationProof names no `run` — the red run must be recorded to a file";
    }
    let text;
    try {
      text = readFileSync(m.run, "utf8");
    } catch (e) {
      return `mutationProof.run ${m.run} cannot be read (${e.code ?? e.message})`;
    }
    if (text.trim() === "") return `mutationProof.run ${m.run} is empty`;
    if (!text.includes(m.test)) {
      return `mutationProof.run ${m.run} does not mention ${m.test}`;
    }
    if (!redNamesTest(text, m.test)) {
      return `mutationProof.run ${m.run} shows no failing test for ${m.test} (no "not ok" / ✖ / fail line within ${RED_WINDOW} lines of the test's name)`;
    }
    return null;
  },
  "no-other-finding-open": (f) =>
    !isList(f.otherFindingsOpen)
      ? "no `otherFindingsOpen` recorded"
      : f.otherFindingsOpen.length === 0
        ? null
        : `${f.otherFindingsOpen.length} other finding(s) open: ${f.otherFindingsOpen.join("; ")}`,
});

/** The ids the evaluator knows. Exported for the parity test. */
export const CHECK_IDS = Object.freeze(Object.keys(CHECKS));

/**
 * Evaluate a finding against every precondition.
 *
 * @returns {{proceed: boolean, checked: string[], failed: Array<{id: string, detail: string}>}}
 */
export function evaluateFixAndRecheck(finding, { git } = {}) {
  if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
    throw new TypeError("evaluateFixAndRecheck: finding must be an object");
  }
  const failed = [];
  const checked = [];
  // --git-base: the record must agree with git, or the licence is refused.
  // Compared BEFORE the table so a disagreement is named as itself, not as
  // "commits is 2" — the reader needs to know the record was wrong, not only
  // which way.
  if (git !== undefined) {
    if (git === null) {
      failed.push({
        id: "single-commit",
        detail:
          "--git-base: git could not answer (bad ref, or not a repository)",
      });
      failed.push({
        id: "inside-files-summary",
        detail:
          "--git-base: git could not answer (bad ref, or not a repository)",
      });
    } else {
      if (finding.commits !== git.commits) {
        failed.push({
          id: "single-commit",
          detail: `record says commits: ${finding.commits}, git says ${git.commits}`,
        });
      }
      const recorded = Array.isArray(finding.touched)
        ? [...finding.touched].sort()
        : null;
      if (
        recorded === null ||
        recorded.length !== git.touched.length ||
        recorded.some((p, i) => p !== git.touched[i])
      ) {
        failed.push({
          id: "inside-files-summary",
          detail: `record's touched [${(recorded ?? []).join(", ")}] ≠ git's [${git.touched.join(", ")}]`,
        });
      }
    }
  }
  for (const p of PRECONDITIONS) {
    const check = CHECKS[p.id];
    if (!check) {
      // A row with no check is a precondition nothing enforces; refuse rather
      // than skip it, because skipping reads as "held".
      failed.push({
        id: p.id,
        detail: "no check implemented for this precondition",
      });
      continue;
    }
    checked.push(p.id);
    const detail = check(finding);
    if (detail !== null) failed.push({ id: p.id, detail });
  }
  // One entry per id: a git disagreement above and the table's own check on
  // the same id are the same precondition failing, reported once (first wins).
  const seen = new Set();
  const uniq = failed.filter((f) => !seen.has(f.id) && seen.add(f.id));
  return { proceed: uniq.length === 0, checked, failed: uniq };
}

export function main(argv = process.argv.slice(2)) {
  let findingPath;
  let gitBase;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--git-base") {
      const operand = argv[i + 1];
      if (operand === undefined || operand.startsWith("--")) {
        process.stderr.write("--git-base requires a ref\n");
        return 2;
      }
      gitBase = operand;
      i += 1;
    } else if (a === "--finding") {
      const operand = argv[i + 1];
      if (operand === undefined || operand.startsWith("--")) {
        process.stderr.write("--finding requires a path\n");
        return 2;
      }
      findingPath = operand;
      i += 1;
    } else {
      process.stderr.write(`unknown argument: ${a}\n`);
      return 2;
    }
  }
  if (!findingPath) {
    process.stderr.write("--finding <path.json> is required\n");
    return 2;
  }
  let finding;
  try {
    finding = JSON.parse(readFileSync(findingPath, "utf8"));
  } catch (e) {
    process.stderr.write(`cannot read --finding: ${e.message}\n`);
    return 2;
  }
  let result;
  try {
    result = evaluateFixAndRecheck(
      finding,
      gitBase === undefined ? {} : { git: gitFacts(gitBase) },
    );
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    return 2;
  }
  const reason = result.proceed ? "proceed" : "halt";
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ reason, exitCode: result.proceed ? 0 : 1, ...result }, null, 2)}\n`,
    );
  } else if (result.proceed) {
    process.stdout.write(
      `proceed — all ${result.checked.length} preconditions hold\n`,
    );
  } else {
    process.stdout.write(
      `halt — ${result.failed.length} precondition(s) fail:\n` +
        result.failed.map((f) => `  ${f.id}: ${f.detail}\n`).join(""),
    );
  }
  return result.proceed ? 0 : 1;
}

// Resolve BOTH sides through realpath: `.agents/skills` is a symlink to
// `../skills` here and in every consumer install, so argv[1] arrives symlinked
// while import.meta.url is already real. Compared raw, main() never ran through
// the documented path — no output, exit 0, which Step 8a reads as "proceed"
// (task.128 QA cycle 1, BUG-1; same class as bug.4 in qa-execute-snippets.mjs).
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) {
  process.exitCode = main();
}
