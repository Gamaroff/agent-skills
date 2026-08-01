/**
 * Protocol checks: assert the develop-branch flow is correctly documented.
 *
 * Story development defaults to standard Gitflow feature branches: story
 * branches are cut from `develop` and PR back to `develop`, and an epic is an
 * organisational construct (Jira/docs) with no branch of its own.
 *
 * Since v0.25.0 an epic may OPT IN to an integration branch by declaring
 * `branch_model: epic-integration`. That is a per-epic exception, not a return
 * to the pre-v0.24.0 model, and these tests pin the difference:
 *
 *   - the MANDATORY machinery stays gone — no Step 1a, no `create-epic-branch`
 *     step, nothing that runs for every epic regardless of declaration;
 *   - `develop` remains the recommended base whenever an epic declares nothing;
 *   - the opt-in path is documented where an agent will actually meet it.
 *
 * Also pins the namespace split, which is the thing most likely to be got wrong
 * by someone editing this later: an integration branch is `epic/{n}.{name}`;
 * `feature/epic.{n}.{name}` is an ordinary short-lived branch for epic-DOCUMENT
 * work (what /review-epic creates). One name must never be used for the other.
 *
 * Run via: node --test evals/develop-story/protocol/develop-branch-flow-rules.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const STEP1_PATH = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "develop-pipeline-step-1-create-branch.md",
);
const STEP4_PATH = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "develop-pipeline-step-4-create-pr.md",
);
const STEP0_PATH = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "develop-pipeline-step-0-resolve-and-prepare.md",
);
const SKILL_PATH = path.join(REPO_ROOT, "skills", "develop-story", "SKILL.md");
const CREATE_BRANCH_PATH = path.join(
  REPO_ROOT,
  "skills",
  "create-branch",
  "SKILL.md",
);

test("step-1 file exists and is non-empty", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.ok(
    content.length > 200,
    "develop-pipeline-step-1-create-branch.md is unexpectedly short",
  );
});

test("step-1: creates the story branch", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.match(
    content,
    /create-story-branch|Create Story Branch/i,
    "step-1 must document creating the story branch",
  );
});

test("step-1: no epic-branch machinery remains", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.doesNotMatch(
    content,
    /create-epic-branch|Step 1a|EPIC_BRANCH_EXISTS|Ensure Epic Branch Exists/,
    "step-1 must NOT create or reference an epic integration branch",
  );
});

test("step-4: exists and is non-empty", async () => {
  const content = await readFile(STEP4_PATH, "utf-8");
  assert.ok(
    content.length > 100,
    "develop-pipeline-step-4-create-pr.md is unexpectedly short",
  );
});

test("step-4: story PR base is the Q2 answer, defaulting to develop", async () => {
  const content = await readFile(STEP4_PATH, "utf-8");
  assert.match(
    content,
    /--base \{Q2_answer\}/,
    "step-4 must pass the resolved Q2 answer as the PR base",
  );
  assert.doesNotMatch(
    content,
    /EPIC_BRANCH|feature\/epic/,
    "step-4 must NOT target an epic branch for story PRs",
  );
});

test("step-0: develop recommended whenever the epic declares nothing", async () => {
  const content = await readFile(STEP0_PATH, "utf-8");
  assert.match(
    content,
    /nothing, or `develop-direct`[^|]*\|[^|]*\|\s*`develop` \(unchanged\)/,
    "step-0 must state that an epic declaring nothing keeps develop as the recommendation",
  );
  assert.match(
    content,
    /"develop" \(Recommended\)/,
    "step-0 must still present develop as Recommended in the undeclared case",
  );
});

test("step-0: the epic-integration path is opt-in, never automatic", async () => {
  const content = await readFile(STEP0_PATH, "utf-8");
  assert.match(
    content,
    /EPIC_BRANCH/,
    "step-0 must document the epic-integration pre-check",
  );
  assert.match(
    content,
    /never guess, never block/i,
    "step-0 must fail open when the epic cannot be resolved",
  );
  assert.match(
    content,
    /side-effect-free|Do not create it here/i,
    "step-0 must not create branches — Phase 0 stays side-effect-free",
  );
});

test("step-0/step-1: no mandatory epic-branch machinery returns", async () => {
  for (const p of [STEP0_PATH, STEP1_PATH]) {
    const content = await readFile(p, "utf-8");
    assert.doesNotMatch(
      content,
      /create-epic-branch|Step 1a\b|EPIC_BRANCH_EXISTS|Ensure Epic Branch Exists/,
      `${path.basename(p)} must not reinstate the pre-v0.24.0 mandatory epic-branch step`,
    );
  }
});

test("integration branches use the epic/* namespace", async () => {
  for (const p of [STEP0_PATH, CREATE_BRANCH_PATH]) {
    const content = await readFile(p, "utf-8");
    assert.match(
      content,
      /`epic\/\{n\}\.\{(name|slug)\}`|`epic\/\d+\./,
      `${path.basename(p)} must name integration branches in the epic/ namespace`,
    );
  }
});

// Asserted POSITIVELY — that the disambiguation is present — rather than by
// hunting prose for a bad phrasing. The first attempt at this test did the
// latter and flagged the very sentence that draws the distinction correctly;
// a guard that cries wolf gets disabled, which is worse than no guard.
test("the epic/* vs feature/epic.* distinction is spelled out where it is used", async () => {
  for (const p of [STEP0_PATH, CREATE_BRANCH_PATH]) {
    const content = await readFile(p, "utf-8");
    assert.match(
      content,
      /feature\/epic/,
      `${path.basename(p)} introduces epic/* but never mentions feature/epic.* — ` +
        `a reader cannot tell which of the two similar names they need`,
    );
    assert.match(
      content,
      /(not|never|different)[^\n]{0,80}`?feature\/epic|`?feature\/epic[^\n]{0,80}(is not|are different|not an integration)/i,
      `${path.basename(p)} must state explicitly that feature/epic.* is NOT the integration branch ` +
        `(it is epic-DOCUMENT work, what /review-epic creates)`,
    );
  }
});

test("SKILL.md: story PRs target develop, not an epic branch", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.doesNotMatch(
    content,
    /create-epic-branch|target the epic branch|EPIC_BRANCH/i,
    "SKILL.md must not describe the epic-branch flow",
  );
});

test("resume contract: exists and documents per-step table", async () => {
  const resumePath = path.join(
    REPO_ROOT,
    "shared",
    "resources",
    "develop-pipeline-resume-contract.md",
  );
  const content = await readFile(resumePath, "utf-8");
  assert.ok(content.length > 200, "resume-contract.md is unexpectedly short");
  assert.ok(
    content.includes("Step") &&
      (content.includes("artifact") || content.includes("branch")),
    "resume-contract.md missing step/artifact table",
  );
});
