/**
 * Protocol checks: assert epic-branch rules are correctly documented.
 *
 * Parses shared/resources/develop-pipeline-step-1-create-branch.md to verify:
 *   - Step 1a (create-epic-branch) documents base=develop
 *   - Only-if-missing semantics are present
 *   - Naming pattern feature/epic.{n}.{name} is documented
 *
 * Parses shared/resources/develop-pipeline-step-4-create-pr.md to verify:
 *   - PR creation targets epic branch (not hardcoded develop)
 *
 * Run via: node --test evals/develop-story/protocol/epic-branch-rules.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const STEP1_PATH = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-1-create-branch.md");
const STEP4_PATH = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-4-create-pr.md");
const SKILL_PATH = path.join(REPO_ROOT, "skills", "develop-story", "SKILL.md");

test("step-1 file exists and is non-empty", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.ok(content.length > 200, "develop-pipeline-step-1-create-branch.md is unexpectedly short");
});

test("step-1: documents create-epic-branch label (Step 1a)", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.match(
    content,
    /create-epic-branch|Step 1a/i,
    "step-1 must label epic branch creation as Step 1a / create-epic-branch",
  );
});

test("step-1: documents base=develop for epic branch", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.match(
    content,
    /from develop|base.*develop|checkout develop/i,
    "step-1 must specify base branch = develop for epic branch creation",
  );
});

test("step-1: documents only-if-missing semantics", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.match(
    content,
    /pre-existing|already.exists|EPIC_BRANCH_EXISTS|only.if.missing/i,
    "step-1 must document only-if-missing semantics for epic branch creation",
  );
});

test("step-1: documents feature/epic naming pattern", async () => {
  const content = await readFile(STEP1_PATH, "utf-8");
  assert.match(
    content,
    /feature\/epic\.\{n\}|feature\/epic\.\{EPIC_NUM\}|feature\/epic\.\d+\./i,
    "step-1 must document the feature/epic.{n}.{name} naming pattern",
  );
});

test("step-4: exists and is non-empty", async () => {
  const content = await readFile(STEP4_PATH, "utf-8");
  assert.ok(content.length > 100, "develop-pipeline-step-4-create-pr.md is unexpectedly short");
});

test("step-4: PR creation targets epic branch (not hardcoded develop)", async () => {
  const content = await readFile(STEP4_PATH, "utf-8");
  assert.match(
    content,
    /--base.*EPIC_BRANCH|--base.*feature\/epic|epic.branch/i,
    "step-4 must document PR creation targeting the epic branch",
  );
  assert.doesNotMatch(
    content,
    /--base develop\b/,
    "step-4 must NOT hardcode --base develop for story PRs",
  );
});

test("SKILL.md: story PRs target epic branch (not develop)", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.match(
    content,
    /epic.branch|EPIC_BRANCH|feature\/epic/i,
    "SKILL.md must mention epic branch as PR target",
  );
});

test("resume contract: exist and documents per-step table", async () => {
  const resumePath = path.join(
    REPO_ROOT, "shared", "resources", "develop-pipeline-resume-contract.md",
  );
  const content = await readFile(resumePath, "utf-8");
  assert.ok(content.length > 200, "resume-contract.md is unexpectedly short");
  assert.ok(
    content.includes("Step") && (content.includes("artifact") || content.includes("branch")),
    "resume-contract.md missing step/artifact table",
  );
});
