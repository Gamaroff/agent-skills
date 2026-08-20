/**
 * Protocol checks: the implementation report's FIRST commit belongs at Step 4,
 * and only its UPDATES are deferred thereafter.
 *
 * The regression these pin. The pipeline used to hold the report out of every
 * commit until Step 8, on the reasonable-sounding ground that a document still
 * being written should not land in a `fix(...)` commit. That rationale is sound
 * for *updates* and wrong for the file's first commit, because it produced two
 * costs — one merely unfortunate, one genuinely expensive:
 *
 *   - the audit trail was absent from the branch for the whole QA loop, which is
 *     the stretch of the run a reviewer most wants to read;
 *   - any document linking to the report acquired a dangling relative link that
 *     FAILS ONLY IN CI. The file is present in the working tree but untracked, so
 *     a link checker run locally resolves it and passes, while CI checks out only
 *     tracked files and goes red. A red build that cannot be reproduced by running
 *     the same command in the same directory is the most expensive shape a defect
 *     takes, and it survives every local gate.
 *
 * So these tests pin a DISTINCTION, not merely a wording: Step 4 commits the file;
 * Steps 5–6 defer changes to a file that by then already exists. An editor who
 * collapses the two back together reintroduces the bug, which is why the "not a
 * licence to withhold the first commit" guard rail is asserted explicitly rather
 * than left to prose that reads fine either way.
 *
 * Run via: node --test evals/develop-story/protocol/implementation-report-first-commit.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const read = (...p) => readFile(path.join(REPO_ROOT, ...p), "utf8");

/**
 * Collapse whitespace before matching.
 *
 * These documents are hand-wrapped (`.prettierignore` excludes Markdown on
 * purpose), so a sentence this test cares about is routinely split across a line
 * break and an indent. Matching the raw text makes the assertion fail on
 * re-wrapping rather than on meaning — which trains the next person to loosen the
 * assertion instead of reading it. Normalise first, assert on the sentence.
 */
const flat = (s) => s.replace(/\s+/g, " ");

const STEP4 = ["shared", "resources", "develop-pipeline-step-4-create-pr.md"];
const STEP56 = ["shared", "resources", "develop-pipeline-step-5-6-qa-loop.md"];
const COMMIT_CHANGES = ["skills", "commit-changes", "SKILL.md"];
const CREATE_PR = ["skills", "create-pr", "SKILL.md"];

test("Step 4 states that the report IS committed there", async () => {
  const s = flat(await read(...STEP4));
  assert.match(
    s,
    /implementation report IS committed here/i,
    "Step 4 must state plainly that the report is staged in this commit — the previous wording only said its final state landed at Step 8, which read as 'not here' and was followed as such",
  );
});

test("Step 4 explains the CI-only failure mode, so the rule is not silently reverted", async () => {
  const s = flat(await read(...STEP4));
  assert.match(
    s,
    /dangling relative link/i,
    "Step 4 must name the failure, not just assert the rule — a rule without its reason gets optimised away",
  );
  assert.match(
    s,
    /only in CI|fails only in CI|not locally/i,
    "the asymmetry (passes locally, fails in CI) is the whole reason this is hard to diagnose and must be stated",
  );
  assert.match(
    s,
    /git worktree add --detach/,
    "Step 4 must give the diagnosis: check the tracked tree via a detached worktree, since a dirty working tree hides this class of failure",
  );
});

test("Steps 5–6 defer UPDATES, and say so in the heading", async () => {
  const s = flat(await read(...STEP56));
  assert.match(
    s,
    /Exclude the implementation report's \*updates\* from this commit/,
    "the step-5–6 heading must scope the exclusion to updates; 'exclude the report' is the wording that grew back into withholding the file",
  );
  assert.match(
    s,
    /already tracked \(Step 4 committed it\)/,
    "Steps 5–6 must state why deferring is safe here: the file exists, so no link can dangle",
  );
});

test("Steps 5–6 carry an explicit guard against re-extending the rule to the first commit", async () => {
  const s = flat(await read(...STEP56));
  assert.match(
    s,
    /Do not extend this to the report's first commit/i,
    "without this guard rail the two cases read as one rule and get merged back together by the next editor",
  );
});

test("commit-changes step 3a scopes its rule to updates and warns about dangling links", async () => {
  const s = flat(await read(...COMMIT_CHANGES));
  assert.match(
    s,
    /Implementation report \*updates\*/,
    "step 3a must scope to updates rather than to the file",
  );
  assert.match(
    s,
    /not a licence to withhold the file's first commit/i,
    "step 3a is where a reader decides what to unstage; the boundary must be stated at the decision point, not only in the pipeline docs",
  );
  assert.match(
    s,
    /If a document you are committing links to a file, commit the file with it/i,
    "the generalised rule — not just the report-specific case — is what stops the next instance of this bug",
  );
});

test("create-pr no longer claims the orchestrator excludes the report", async () => {
  const s = flat(await read(...CREATE_PR));
  assert.doesNotMatch(
    s,
    /implementation report path is passed so it is never staged/i,
    "this claim contradicted Step 4 once the report began being committed there; two documents disagreeing about the same flag is how the flag gets used wrongly",
  );
  assert.match(
    s,
    /do \*\*not\*\* pass the implementation report here/i,
    "create-pr must say what the pipelines actually do, since its --exclude section is where an orchestrator author looks",
  );
});

test("Step 8 still owns the report's final state", async () => {
  const s = flat(
    await read("shared", "resources", "develop-pipeline-step-8-commit.md"),
  );
  assert.match(
    s,
    /implementation report/i,
    "Step 8 must still stage the finalised report — this change moves the FIRST commit earlier, it does not remove the last one",
  );
});
