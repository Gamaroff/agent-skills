/**
 * Protocol checks for the orchestrator stall + finalise/cleanup regressions
 * caught by the live-github-test run on 2026-05-11.
 *
 * Regressions covered:
 *   #1  Phase 0 silently dropped Q1.1 (epic-branch creation) and Q1.2
 *       (story branch base). Only Q2 (PR target) + an undocumented
 *       "Run mode" question fired.
 *   #2  Orchestrator went silent for 5+ min after Step 3 (develop) returned,
 *       never advancing to Step 4 (create-pr).
 *   #3  Implementation report stuck at "**Final Status:** In Progress" /
 *       "**Finished:** —" after the pipeline reported "accepted".
 *   #4  .claude/state/develop-pipeline.lock not removed after Step 8.
 *
 * Each regression has corresponding documentation now; these tests guard
 * against future drift that removes the guard.
 *
 * Run via: node --test evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const STORY_SKILL   = path.join(REPO_ROOT, "skills", "develop-story", "SKILL.md");
const TASK_SKILL    = path.join(REPO_ROOT, "skills", "develop-task",  "SKILL.md");
const DEVELOP_SKILL = path.join(REPO_ROOT, "skills", "develop",       "SKILL.md");
const STEP0_SHARED  = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-0-resolve-and-prepare.md");
const STEP3_SHARED  = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-3-develop-loop.md");
const STEP8_SHARED  = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-8-commit.md");

// ── Regression #2: Step Transition Protocol present in both orchestrators ──

test("#2 — develop-story SKILL.md documents Step Transition Protocol", async () => {
  const content = await readFile(STORY_SKILL, "utf-8");
  assert.match(content, /Step Transition Protocol/, "Step Transition Protocol heading missing");
  assert.match(content, /lock-update Bash call is the binding signal/i, "binding-signal rationale missing");
  assert.match(content, /do NOT print "Returning to pipeline orchestrator"/, "explicit forbidden-prose list missing");
});

test("#2 — develop-task SKILL.md documents Step Transition Protocol", async () => {
  const content = await readFile(TASK_SKILL, "utf-8");
  assert.match(content, /Step Transition Protocol/, "Step Transition Protocol heading missing");
  assert.match(content, /lock-update Bash call is the binding signal/i, "binding-signal rationale missing");
});

test("#2 — develop SKILL.md mandates silent return to orchestrator", async () => {
  const content = await readFile(DEVELOP_SKILL, "utf-8");
  assert.match(
    content,
    /Return to caller silently/,
    "develop SKILL.md must mandate silent return when invoked from orchestrator",
  );
  assert.match(
    content,
    /do NOT emit "Pipeline bypass: skipping \/finalise"/,
    "develop SKILL.md must explicitly forbid the 'Pipeline bypass' closing message",
  );
});

test("#2 — step-3 doc requires immediate lock-update before any prose after /develop returns", async () => {
  const content = await readFile(STEP3_SHARED, "utf-8");
  assert.match(
    content,
    /Step Transition Protocol/,
    "step-3 doc must cross-reference the Step Transition Protocol",
  );
  assert.match(
    content,
    /Bash lock-update advancing.*current_step.*to 4/,
    "step-3 doc must explicitly require the lock-update tool call as the first action after /develop returns",
  );
});

// ── Regression #1: Required-question count check ──

test("#1 — step-0 doc has Required-question count check table", async () => {
  const content = await readFile(STEP0_SHARED, "utf-8");
  assert.match(content, /Required-question count check/, "count-check heading missing");
  // The three-question case is the regression scenario.
  assert.match(
    content,
    /EPIC_BRANCH_EXISTS=false.*\*\*3\*\*/s,
    "EPIC_BRANCH_EXISTS=false row must require 3 questions",
  );
  assert.match(
    content,
    /Do NOT invent additional questions/,
    "doc must explicitly forbid inventing undocumented questions (e.g. 'Run mode?')",
  );
});

// ── Regressions #3 + #4: Step 8 Completion Checklist with BLOCKING post-conditions ──

test("#3+#4 — step-8 doc has BLOCKING post-condition checklist", async () => {
  const content = await readFile(STEP8_SHARED, "utf-8");
  assert.match(content, /Step 8 Completion Checklist.*BLOCKING/i, "BLOCKING checklist heading missing");
  // Lock absence check
  assert.match(
    content,
    /\[\s*!\s*-f\s+\.claude\/state\/develop-pipeline\.lock\s*\]/,
    "lock-absence post-condition assertion missing",
  );
  // Final Status post-condition
  assert.match(
    content,
    /Final Status:\\\*\\\*\s*\(Completed\|Accepted\)/,
    "Final Status post-condition assertion missing",
  );
  // Finished timestamp post-condition
  assert.match(
    content,
    /Finished:\\\*\\\*\s*\[0-9\]/,
    "Finished-timestamp post-condition assertion missing",
  );
});

test("#3+#4 — step-8 references the live-github-test regressions for context", async () => {
  const content = await readFile(STEP8_SHARED, "utf-8");
  assert.match(
    content,
    /regressions #3 and #4 from the live-github-test/i,
    "step-8 should cite the source regressions so future maintainers know why the assertions exist",
  );
});
