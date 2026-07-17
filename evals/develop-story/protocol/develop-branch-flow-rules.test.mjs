/**
 * Protocol checks: assert the flat develop-branch flow is correctly documented.
 *
 * Story development uses standard Gitflow feature branches: story branches are
 * cut from `develop` and PR back to `develop`. There is NO epic integration
 * branch — epics are an organisational construct (Jira/docs) only.
 *
 * Parses shared/resources/develop-pipeline-step-1-create-branch.md to verify:
 *   - Step 1 creates the story branch (no Step 1a / create-epic-branch)
 *   - No epic-branch creation machinery remains (EPIC_BRANCH, EPIC_BRANCH_EXISTS)
 *
 * Parses shared/resources/develop-pipeline-step-4-create-pr.md to verify:
 *   - Story PR base is the Q2 answer (default develop), not an epic branch
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

test("step-0: develop-story Q1/Q2 default to develop, no epic-branch prompt", async () => {
  const content = await readFile(STEP0_PATH, "utf-8");
  assert.doesNotMatch(
    content,
    /EPIC_BRANCH|create epic branch|EPIC_BRANCH_EXISTS/i,
    "step-0 must NOT prompt to create or target an epic branch",
  );
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
