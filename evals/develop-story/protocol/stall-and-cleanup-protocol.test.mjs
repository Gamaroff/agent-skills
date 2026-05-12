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

const STORY_SKILL    = path.join(REPO_ROOT, "skills", "develop-story", "SKILL.md");
const TASK_SKILL     = path.join(REPO_ROOT, "skills", "develop-task",  "SKILL.md");
const DEVELOP_SKILL  = path.join(REPO_ROOT, "skills", "develop",       "SKILL.md");
const STORY_ON_STOP  = path.join(REPO_ROOT, "skills", "develop-story", "scripts", "on-stop.sh");
const TASK_ON_STOP   = path.join(REPO_ROOT, "skills", "develop-task",  "scripts", "on-stop.sh");
const STORY_INSTALL  = path.join(REPO_ROOT, "skills", "develop-story", "scripts", "install-hooks.sh");
const TASK_INSTALL   = path.join(REPO_ROOT, "skills", "develop-task",  "scripts", "install-hooks.sh");
const STEP0_SHARED   = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-0-resolve-and-prepare.md");
const STEP3_SHARED   = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-3-develop-loop.md");
const STEP8_SHARED   = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-step-8-commit.md");

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

// ── Regression #2b: Stop-hook structural backstop ──
// Prose-only "never stop between steps" rules failed under context pressure
// (observed during story 2.2 dogfood run on 2026-05-12). The Stop hook is the
// structural defence: when the orchestrator tries to yield mid-pipeline, the
// hook reads the lock and returns `decision: "block"` forcing continuation.

test("#2b — develop-story Setup section registers both PreCompact and Stop hooks", async () => {
  const content = await readFile(STORY_SKILL, "utf-8");
  assert.match(content, /"PreCompact":/,           "Setup section must register PreCompact hook");
  assert.match(content, /"Stop":/,                 "Setup section must register Stop hook");
  assert.match(content, /on-stop\.sh/,             "Setup section must reference on-stop.sh");
  assert.match(content, /stop_hook_active/,        "Setup section must mention stop_hook_active loop protection");
  assert.match(content, /decision:\s*"block"/i,    "Setup must document decision:'block' contract");
});

test("#2b — develop-task Setup section registers both PreCompact and Stop hooks", async () => {
  const content = await readFile(TASK_SKILL, "utf-8");
  assert.match(content, /"PreCompact":/,           "Setup section must register PreCompact hook");
  assert.match(content, /"Stop":/,                 "Setup section must register Stop hook");
  assert.match(content, /on-stop\.sh/,             "Setup section must reference on-stop.sh");
});

test("#2b — develop-story on-stop.sh exists and honours stop_hook_active loop protection", async () => {
  const content = await readFile(STORY_ON_STOP, "utf-8");
  assert.match(content, /stop_hook_active/,                       "must read stop_hook_active flag");
  assert.match(content, /develop-pipeline\.lock/,                 "must reference pipeline lock file");
  assert.match(content, /current_step/,                           "must check current_step field");
  assert.match(content, /decision.*block/i,                       "must emit decision:'block' when blocking");
  assert.match(content, /set -uo pipefail/,                       "must use safe bash defaults");
});

test("#2b — develop-task on-stop.sh is byte-identical to develop-story on-stop.sh", async () => {
  const storyHook = await readFile(STORY_ON_STOP, "utf-8");
  const taskHook  = await readFile(TASK_ON_STOP,  "utf-8");
  assert.equal(taskHook, storyHook, "Both on-stop.sh scripts must be identical (the lock's `skill` field selects branch)");
});

test("#2b — install-hooks.sh exists and is byte-identical between story and task", async () => {
  const storyScript = await readFile(STORY_INSTALL, "utf-8");
  const taskScript  = await readFile(TASK_INSTALL,  "utf-8");
  assert.equal(taskScript, storyScript, "install-hooks.sh must be byte-identical across develop-{story,task}");
  // Core contract assertions
  assert.match(storyScript, /set -euo pipefail/,                    "must use safe bash defaults");
  assert.match(storyScript, /command -v jq/,                        "must check for jq prerequisite");
  assert.match(storyScript, /\.agents\/skills\/develop-story/,      ".agents path candidate (npx skills add)");
  assert.match(storyScript, /\.claude\/skills\/develop-story/,      ".claude path candidate (symlink/monorepo)");
  assert.match(storyScript, /already registered/,                   "must be idempotent (skip on duplicate)");
  assert.match(storyScript, /--dry-run/,                            "must support --dry-run flag");
  assert.match(storyScript, /PreCompact/,                           "must register PreCompact hook");
  assert.match(storyScript, /Stop/,                                 "must register Stop hook");
});

test("#2b — SKILL.md Setup section advertises install-hooks.sh as quick install", async () => {
  const storyContent = await readFile(STORY_SKILL, "utf-8");
  const taskContent  = await readFile(TASK_SKILL,  "utf-8");
  for (const [label, content] of [["story", storyContent], ["task", taskContent]]) {
    assert.match(
      content,
      /install-hooks\.sh/,
      `${label}: Setup section must reference install-hooks.sh`,
    );
    assert.match(
      content,
      /Quick install/i,
      `${label}: Setup section must label the script as the recommended install path`,
    );
  }
});

test("#2b — Step Transition Protocol lists Bash lock-update as action #1 (not #2)", async () => {
  const storyContent = await readFile(STORY_SKILL, "utf-8");
  const taskContent  = await readFile(TASK_SKILL,  "utf-8");
  // Action #1 = Bash; action #2 = Edit. Reordered 2026-05-12 to anchor the model
  // into the next step before the natural turn-boundary heuristic can fire.
  for (const [label, content] of [["story", storyContent], ["task", taskContent]]) {
    assert.match(
      content,
      /1\.\s*\*\*Bash tool call\*\*\s*advancing the lock/,
      `${label}: Step Transition action #1 must be the Bash lock-update call`,
    );
    assert.match(
      content,
      /2\.\s*\*\*Edit the implementation report\*\*/,
      `${label}: Step Transition action #2 must be the implementation-report Edit`,
    );
  }
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
