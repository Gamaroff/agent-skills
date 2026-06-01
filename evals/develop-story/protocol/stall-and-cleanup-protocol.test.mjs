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
import { readFile, access } from "node:fs/promises";
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
// Canonical hook implementations live in shared/resources/ and are bundled into
// each skill's references/ via `npm run bundle`. scripts/<name>.sh are thin
// wrappers that exec the bundled copy — content invariants assert on the canonical.
const SHARED_ON_STOP = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-on-stop.sh");
const SHARED_INSTALL = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-install-hooks.sh");
const HOOKS_DOC      = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-hooks.md");
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

test("#2b — develop-story Setup section names both hooks and points to install script + canonical doc", async () => {
  const content = await readFile(STORY_SKILL, "utf-8");
  assert.match(content, /PreCompact/,                                  "Setup section must name the PreCompact hook");
  assert.match(content, /\bStop\b/,                                    "Setup section must name the Stop hook");
  assert.match(content, /install-hooks\.sh/,                           "Setup section must reference the install script");
  assert.match(content, /references\/develop-pipeline-hooks\.md/,      "Setup section must link the canonical hooks doc");
});

test("#2b — develop-task Setup section names both hooks and points to install script + canonical doc", async () => {
  const content = await readFile(TASK_SKILL, "utf-8");
  assert.match(content, /PreCompact/,                                  "Setup section must name the PreCompact hook");
  assert.match(content, /\bStop\b/,                                    "Setup section must name the Stop hook");
  assert.match(content, /install-hooks\.sh/,                           "Setup section must reference the install script");
  assert.match(content, /references\/develop-pipeline-hooks\.md/,      "Setup section must link the canonical hooks doc");
});

test("#2b — canonical on-stop.sh honours stop_hook_active loop protection", async () => {
  const content = await readFile(SHARED_ON_STOP, "utf-8");
  assert.match(content, /stop_hook_active/,                       "must read stop_hook_active flag");
  assert.match(content, /develop-pipeline\.lock/,                 "must reference pipeline lock file");
  assert.match(content, /current_step/,                           "must check current_step field");
  assert.match(content, /decision.*block/i,                       "must emit decision:'block' when blocking");
  assert.match(content, /set -uo pipefail/,                       "must use safe bash defaults");
});

test("#2b — develop-{story,task} on-stop.sh wrappers are byte-identical and exec the canonical", async () => {
  const storyHook = await readFile(STORY_ON_STOP, "utf-8");
  const taskHook  = await readFile(TASK_ON_STOP,  "utf-8");
  assert.equal(taskHook, storyHook, "Both on-stop.sh wrappers must be identical");
  assert.match(storyHook, /exec .*references\/develop-pipeline-on-stop\.sh/, "wrapper must exec the bundled canonical");
});

test("#2b — canonical install-hooks.sh contract", async () => {
  const script = await readFile(SHARED_INSTALL, "utf-8");
  assert.match(script, /set -euo pipefail/,                    "must use safe bash defaults");
  assert.match(script, /command -v jq/,                        "must check for jq prerequisite");
  assert.match(script, /\.agents\/skills\/develop-story/,      ".agents path candidate (npx skills add)");
  assert.match(script, /\.claude\/skills\/develop-story/,      ".claude path candidate (symlink/monorepo)");
  assert.match(script, /already registered/,                   "must be idempotent (skip on duplicate)");
  assert.match(script, /--dry-run/,                            "must support --dry-run flag");
  assert.match(script, /PreCompact/,                           "must register PreCompact hook");
  assert.match(script, /Stop/,                                 "must register Stop hook");
});

test("#2b — develop-{story,task} install-hooks.sh wrappers are byte-identical and exec the canonical", async () => {
  const storyScript = await readFile(STORY_INSTALL, "utf-8");
  const taskScript  = await readFile(TASK_INSTALL,  "utf-8");
  assert.equal(taskScript, storyScript, "install-hooks.sh wrappers must be byte-identical across develop-{story,task}");
  assert.match(storyScript, /exec .*references\/develop-pipeline-install-hooks\.sh/, "wrapper must exec the bundled canonical");
});

// ── Regression #2d: PostToolUse/on-skill-return hook removed (2026-06-01) ──
// An earlier design shipped a PostToolUse hook (on-skill-return.sh) that advanced
// the pipeline lock when a sub-skill "returned". But the Skill tool executes
// INLINE in the orchestrator's context, so PostToolUse:Skill fires at skill-LOAD
// (before any work runs); Claude Code has no skill-completion hook event. The
// hook therefore mis-fired on every sub-skill call, advancing the pipeline before
// the step did any work. It was removed — lock advancement now relies on sub-skill
// self-advance (inline, after the work) + the Stop hook backstop.

const SETUP_CONSUMER  = path.join(REPO_ROOT, "scripts", "setup-consumer.sh");
const SHARED_LOCK_COOP = path.join(REPO_ROOT, "shared", "resources", "pipeline-lock-cooperation.md");

async function fileAbsent(p) {
  try { await access(p); return false; } catch { return true; }
}

test("#2d — on-skill-return.sh hook scripts are gone (canonical, wrappers, bundled)", async () => {
  const candidates = [
    path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-on-skill-return.sh"),
    path.join(REPO_ROOT, "skills", "develop-story", "scripts",    "on-skill-return.sh"),
    path.join(REPO_ROOT, "skills", "develop-task",  "scripts",    "on-skill-return.sh"),
    path.join(REPO_ROOT, "skills", "develop-story", "references",  "develop-pipeline-on-skill-return.sh"),
    path.join(REPO_ROOT, "skills", "develop-task",  "references",  "develop-pipeline-on-skill-return.sh"),
  ];
  for (const p of candidates) {
    assert.ok(await fileAbsent(p), `obsolete hook script must not exist: ${path.relative(REPO_ROOT, p)}`);
  }
});

test("#2d — canonical install-hooks.sh registers no PostToolUse hook and de-registers the obsolete one", async () => {
  const script = await readFile(SHARED_INSTALL, "utf-8");
  assert.doesNotMatch(script, /POSTTOOLUSE_CMD/,                                "must not define a PostToolUse command");
  assert.match(script, /unpatch_hook "PostToolUse" "on-skill-return/,           "must de-register the obsolete PostToolUse/on-skill-return hook");
});

test("#2d — setup-consumer.sh registers no PostToolUse hook and de-registers the obsolete one", async () => {
  const script = await readFile(SETUP_CONSUMER, "utf-8");
  assert.doesNotMatch(script, /_patch_hook "PostToolUse"/,                      "must not register a PostToolUse hook");
  assert.match(script, /_unpatch_hook "PostToolUse" "on-skill-return/,          "must de-register the obsolete PostToolUse/on-skill-return hook");
});

test("#2d — orchestrator SKILL.md files no longer reference PostToolUse/on-skill-return", async () => {
  for (const [label, skill] of [["story", STORY_SKILL], ["task", TASK_SKILL]]) {
    const content = await readFile(skill, "utf-8");
    assert.doesNotMatch(content, /PostToolUse/,     `${label}: SKILL.md must not mention PostToolUse`);
    assert.doesNotMatch(content, /on-skill-return/, `${label}: SKILL.md must not mention on-skill-return`);
  }
});

test("#2d — Step Transition Protocol lists exactly two structural defences (self-advance + Stop)", async () => {
  for (const [label, skill] of [["story", STORY_SKILL], ["task", TASK_SKILL]]) {
    const content = await readFile(skill, "utf-8");
    assert.match(content, /Two structural defences/,         `${label}: must say 'Two structural defences'`);
    assert.doesNotMatch(content, /Three structural defences/, `${label}: must not claim three structural defences`);
  }
});

test("#2d — pipeline-lock-cooperation.md cooperation order omits the PostToolUse hook", async () => {
  const content = await readFile(SHARED_LOCK_COOP, "utf-8");
  assert.doesNotMatch(content, /PostToolUse/, "cooperation doc must not reference a PostToolUse hook layer");
});

test("#2b — SKILL.md Setup section advertises install-hooks.sh and links the canonical hooks doc", async () => {
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
      /references\/develop-pipeline-hooks\.md/,
      `${label}: Setup section must link the canonical hooks doc`,
    );
  }
});

// ── Regression #2c: Canonical hooks documentation index ──
// Created 2026-05-12 to centralise every hook in one place after the Stop
// hook was added. Replaces ad-hoc per-hook prose in SKILL.md Setup sections.

test("#2c — canonical hooks doc exists and catalogues both hooks", async () => {
  const content = await readFile(HOOKS_DOC, "utf-8");
  // Catalog must mention both events by name
  assert.match(content, /PreCompact/,                            "must catalogue PreCompact hook");
  assert.match(content, /\bStop\b/,                              "must catalogue Stop hook");
  // Both scripts referenced
  assert.match(content, /on-precompact\.sh/,                     "must reference on-precompact.sh");
  assert.match(content, /on-stop\.sh/,                           "must reference on-stop.sh");
  assert.match(content, /install-hooks\.sh/,                     "must reference install-hooks.sh");
  // Stop hook contract elements
  assert.match(content, /stop_hook_active/,                      "must document stop_hook_active loop protection");
  assert.match(content, /decision.*block/i,                      "must document decision:'block' return contract");
  assert.match(content, /current_step/,                          "must document current_step lock field");
  // Required sections (allows for emoji/formatting prefixes before the heading text)
  assert.match(content, /## Hook catalog/,                       "must have a 'Hook catalog' section");
  assert.match(content, /## Interaction model/,                  "must have an 'Interaction model' section");
  assert.match(content, /## Troubleshooting/,                    "must have a 'Troubleshooting' section");
  assert.match(content, /## Authoring contract for new hooks/,   "must define the contract for adding new hooks");
});

test("#2c — pause doc cross-links the canonical hooks index", async () => {
  // Test the source-of-truth file (bundled copies are auto-generated)
  const content = await readFile(path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-pause.md"), "utf-8");
  assert.match(
    content,
    /develop-pipeline-hooks\.md/,
    "pause doc must link the canonical hooks doc so readers find the broader index",
  );
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
