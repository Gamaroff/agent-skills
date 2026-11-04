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
 *     "artifactPaths": ["docs/tasks/task.1.x/task.1.qa.2.x.md"],   // optional: co-located .md pipeline
 *                                               // artifacts of that document — inside scope only through
 *                                               // isCoLocatedArtifact (task.152, obs #155)
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
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The one definition of a document id (task 202). Every id decision below is a
// doc-id parse — this file declares no id grammar of its own (task 206).
const require = createRequire(import.meta.url);
const docId = require("./doc-id.js");
// The one glob matcher (task 257): a Files Summary entry is read as a pathspec
// through it, never through a second matcher written here.
const { matchesAnyGlob } = require("./glob-match.js");

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

/** The most patterns one Files Summary entry may expand to (task 257). */
const MAX_BRACE_EXPANSIONS = 256;

/**
 * `a/{b,c}/d` → ["a/b/d", "a/c/d"]. Innermost group first, one group per pass,
 * so nesting works; an unbalanced brace stays literal. Returns null when the
 * expansion would exceed MAX_BRACE_EXPANSIONS — a long list of groups is
 * 2^N patterns, and refusing it is the safe direction (the entry admits
 * nothing, which takes the existing Step 8 halt).
 */
function expandBraces(entry) {
  let results = [entry];
  for (;;) {
    const next = [];
    let expanded = false;
    for (const s of results) {
      const m = /\{([^{}]*)\}/.exec(s);
      if (!m) {
        next.push(s);
        continue;
      }
      expanded = true;
      for (const alt of m[1].split(",")) {
        next.push(s.slice(0, m.index) + alt + s.slice(m.index + m[0].length));
      }
      if (next.length > MAX_BRACE_EXPANSIONS) return null;
    }
    results = next;
    if (!expanded) return results;
  }
}

/**
 * A repo-relative path a PATTERN may admit. glob-match.js does not resolve `..`
 * (and `**` crosses `/`), strips a trailing line break, and reads a leading `/`
 * as relative — so without this guard `skills/*\/references/` would admit
 * `skills/a/references/../../../etc/passwd`, an absolute path or `x.js\n`. An
 * exact Files Summary entry is not subject to it: the author wrote that path.
 */
const isPlainRelativePath = (p) =>
  typeof p === "string" &&
  !p.startsWith("/") &&
  !/[\0\r\n]/.test(p) &&
  !p.split("/").includes("..");

/** A path with at least one segment that is neither empty nor a wildcard. */
const hasLiteralSegment = (p) =>
  p.split("/").some((s) => s !== "" && !/[*?]/.test(s));

/**
 * The glob patterns one Files Summary entry stands for (task 257, obs #132).
 * The notation authors use: an exact path; a trailing `/` for a directory
 * prefix; `*` and `**` as glob-match.js reads them; `{a,b}` alternatives. An
 * entry whose wildcards leave no literal path segment (`*`, `**`, `**\/*`) is
 * not a scope — it would admit every path — and stands for nothing.
 */
function entryPatterns(entry) {
  if (typeof entry !== "string") return [];
  const expanded = expandBraces(entry.trim());
  if (expanded === null) return [];
  return expanded
    .map((p) => (p.endsWith("/") ? `${p}**` : p))
    .filter(hasLiteralSegment);
}

/** The kinds a pipeline work item can be. A PRD is a document, not a work item. */
const WORK_ITEM_KINDS = Object.freeze(["task", "story", "epic", "bug"]);

/**
 * A path's basename read as a work-item name — the document or one of its
 * artifacts — or null. The id is doc-id's, never a local pattern: a hand-written
 * `story\.\d+\.\d+` stemmed `story.1.2.3.x` as `story.1.2` and admitted every
 * sibling story's artifacts (task 206). A legacy `story.{E}.{S}` name does not
 * parse, so it is not a work item here: it is migrated first (task 203).
 */
export const parseWorkItemName = (p) => {
  if (typeof p !== "string") return null;
  const id = docId.parse(p.slice(p.lastIndexOf("/") + 1));
  return id.ok && WORK_ITEM_KINDS.includes(id.kind) ? id : null;
};

// A pipeline artifact beside the document (its QA report, gate, DoD, plan,
// review, sprint-review summary…) shares the stem and is NOT the document.
// Exported because it is the ONE definition of the set: the doc-links corpus
// guards import it rather than restating it, so "what CI checks beside a
// document" and "what 8a may admit" cannot drift apart (task.152 QA-1 — they had:
// `sprint-review-summary` was in the guard and not here). The words are doc-id's
// ARTIFACTS vocabulary, so the two cannot disagree either (task 206).
export const WORK_ITEM_ARTIFACT_RE = new RegExp(
  `\\.(${docId.ARTIFACTS.join("|")})\\.`,
);

/** A repo-relative path to a task / story / epic / bug document under docs/. */
export const isWorkItemDocument = (p) =>
  typeof p === "string" &&
  p.startsWith("docs/") &&
  p.endsWith(".md") &&
  parseWorkItemName(p)?.artifact === null &&
  !WORK_ITEM_ARTIFACT_RE.test(p.slice(p.lastIndexOf("/") + 1)) &&
  !p.includes("..") &&
  // A null byte is not `/`, so the regex alone accepts `task.1.x.md\0.md`. A raw
  // LF/CR is the same shape for every line-oriented reader: one string here, two
  // paths to `git`, `xargs` or a log (task.152 finalise DoD security probe).
  !/[\0\r\n]/.test(p);

/**
 * A co-located `.md` pipeline artifact of `documentPath` — its QA report, DoD,
 * implementation report, review or PR review — which CI's docs-link-check reads
 * as it reads the document (task.152, obs #155). Anchored to the document, so it
 * can admit nothing outside that document's own directory and id stem:
 *   1. `documentPath` is a work item document (isWorkItemDocument);
 *   2. `p` is in the same directory — not a subdirectory, not a sibling tree;
 *   3. its basename starts with the document's id and a dot (`task.139.`,
 *      `story.1.2.1.`, `epic.1.2.`, `bug.14.`) — the id is doc-id's, so `task.1.`
 *      never admits `task.10.` and `story.1.2.3.` never admits `story.1.2.30.`,
 *      `story.1.2.4.` or the sub-story `story.1.2.3A.`;
 *   4. it is a pipeline artifact (WORK_ITEM_ARTIFACT_RE) but not a `.bug.` report,
 *      which is a work item with its own lifecycle and its own `/finalise --bug`;
 *   5. it ends in `.md` (docs-link-check reads nothing else — a gate `.yml` is out);
 *   6. it carries no `..` and no NUL.
 */
/**
 * Artifacts the pipeline writes beside a work item WITHOUT the id prefix — the
 * basename alone. finalise Step 7 saves `{document-directory}/sprint-review-summary.md`
 * (112 tracked; only 5 legacy files carry an id). One definition, imported by the
 * doc-links artifact corpus guard, so the walk and the admission rule read the
 * same set (task.152 QA cycle 2, CR-2).
 */
export const UNPREFIXED_ARTIFACTS = Object.freeze(["sprint-review-summary.md"]);

export const isCoLocatedArtifact = (documentPath, p) => {
  if (!isWorkItemDocument(documentPath) || typeof p !== "string") return false;
  if (p.includes("..") || /[\0\r\n]/.test(p) || !p.endsWith(".md"))
    return false;
  const dir = documentPath.slice(0, documentPath.lastIndexOf("/") + 1);
  if (!p.startsWith(dir)) return false;
  const base = p.slice(dir.length);
  if (base.includes("/")) return false;
  if (UNPREFIXED_ARTIFACTS.includes(base)) return true;
  const id = parseWorkItemName(documentPath);
  if (!id || !base.startsWith(`${id.id}.`)) return false;
  return WORK_ITEM_ARTIFACT_RE.test(base) && !/\.bug\./.test(base);
};

/**
 * A red line of a recorded run, split into its marker and its SUBJECT: a TAP
 * `not ok 2 - <title>`, the runner's `✖ <title> (3ms)`, or a harness's
 * `FAIL <name>`. `ℹ fail N` is deliberately NOT here — a count names no test,
 * so it cannot prove one (task 257).
 */
const RED_SUBJECT = /^\s*(?:not ok\b(?:\s+\d+)?(?:\s+-)?|✖|FAIL\b)\s*(.*)$/;

/** node:test prints this heading on a ✖ line of its own, before the failures. */
const RUNNER_HEADINGS = new Set(["failing tests:"]);

/** A trailing duration or TAP directive, which is not part of the test's name. */
const DURATION_TAIL = /\s\(\d+(?:\.\d+)?\s?m?s\)\s*$/;

/**
 * A mutationProof.test shaped like a test FILE (`x.test.js`, `y.spec.ts`,
 * `z.test.sh`). A file appears on a `test at <file>` line beside ANY failure in
 * it, so it cannot show that one particular test went red; on task.207 a broken
 * revert reddened two unrelated tests and was accepted as `mutation-proved`
 * (obs #61). A `.md` path is the docs-link clause's proof and is not a test file.
 */
const TEST_FILE_SHAPE = /\.(?:test|spec)\.(?!md$)[A-Za-z0-9]+$/;

/**
 * Does a red line's subject name `test`? It must START the subject and end at a
 * boundary: the end of the line, a duration `(3ms)`, a TAP directive `# SKIP`,
 * or `:<digits>` — the docs-link clause's `✖ <file>:<line> → …`. So a title
 * that is a prefix of a failing title does not match, and neither does one that
 * only ends it (task 257).
 */
function subjectNames(subject, test) {
  if (!subject.startsWith(test)) return false;
  const rest = subject.slice(test.length);
  return /^(?:\s*$|\s\(\d+(?:\.\d+)?\s?m?s\)\s*$|\s#\s|:\d)/.test(rest);
}

/**
 * Read a recorded run against the test it is meant to prove. `named` is true
 * only when ONE red line carries that test's name (CR-4, tightened by task 257:
 * the old rule accepted any red line within three lines of a line that merely
 * mentioned the name, so a green test sitting beside a failing neighbour was
 * "proved"). `otherRed` is every other failing subject, once each — node:test
 * prints each failure twice, inline and again in its failing-tests summary.
 */
function analyseRun(text, test) {
  let named = false;
  const other = new Set();
  for (const line of text.split("\n")) {
    const m = RED_SUBJECT.exec(line);
    if (!m) continue;
    const subject = m[1].trimEnd();
    if (subject === "" || RUNNER_HEADINGS.has(subject)) continue;
    if (subjectNames(subject, test)) named = true;
    else other.add(subject.replace(DURATION_TAIL, ""));
  }
  return { named, otherRed: [...other] };
}

/** The recorded run's text, or null when it cannot be read. */
function readProofRun(m) {
  if (!m || typeof m !== "object" || typeof m.run !== "string") return null;
  try {
    return readFileSync(m.run, "utf8");
  } catch {
    return null;
  }
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
    // `artifactPaths` extends that one path to the document's co-located `.md`
    // pipeline artifacts — a path listed there is admitted only when
    // isCoLocatedArtifact holds for it, so listing a file is never enough
    // (task.152, obs #155).
    // An entry is read as a pathspec (task 257, obs #132): the exact string
    // still admits itself, and the notation authors write admits the rest.
    const patterns = f.filesSummary.flatMap(entryPatterns);
    const inScope = (p) =>
      f.filesSummary.includes(p) ||
      (isPlainRelativePath(p) && matchesAnyGlob(p, patterns)) ||
      (isWorkItemDocument(f.documentPath) && p === f.documentPath) ||
      (isList(f.artifactPaths) &&
        f.artifactPaths.includes(p) &&
        isCoLocatedArtifact(f.documentPath, p));
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
    // A test FILE is not a test (task 257): see TEST_FILE_SHAPE.
    if (TEST_FILE_SHAPE.test(m.test.trim())) {
      return `mutationProof.test is ${m.test}, a test file — name the test by its title`;
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
    if (!analyseRun(text, m.test.trim()).named) {
      return `mutationProof.run ${m.run} shows no failing test for ${m.test} (no "not ok" / ✖ / FAIL line that starts with the test's name)`;
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
  // The other failing tests in the recorded run (task 257). More than one red
  // can be legitimate; the rule is that the NAMED test is among them. Reported,
  // never a precondition: Step 8a records it in the DoD for a reader to weigh.
  const proofMeta = finding.mutationProof;
  const proofText = readProofRun(proofMeta);
  const otherRed =
    proofText !== null && typeof proofMeta.test === "string"
      ? analyseRun(proofText, proofMeta.test.trim()).otherRed
      : [];
  return { proceed: uniq.length === 0, checked, failed: uniq, otherRed };
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
  if (!json && result.otherRed.length > 0) {
    process.stdout.write(
      `other red in the recorded run (record in the DoD): ${result.otherRed.join("; ")}\n`,
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
