/**
 * Asserts that the QA execution step is actually wired into both QA skills, and
 * wired at the right place, with the obligations the rule document imposes.
 *
 * WHY THIS EXISTS
 * ---------------
 * The step being tested is itself the fix for "prose that is never executed is
 * prose that is never verified" — so shipping its trigger as prose that nothing
 * checks would reproduce the defect inside the remedy. The engine
 * (`qa-execute-snippets.mjs`) is thoroughly unit-tested; the TRIGGER is not code,
 * it is an instruction an agent reads, and this is the layer that holds it.
 *
 * Three things drift independently and all three are invisible when they do:
 *
 *   1. **Placement.** `qa-task` is step-numbered and `qa-story` is phase-numbered.
 *      A copy-paste of "Step 4b" into qa-story would land a heading that file's
 *      own structure has no place for, and nothing would fail.
 *   2. **The rule staying in one file.** Both skills must POINT at
 *      `qa-runnable-prose-detection.md`, not restate it. A restatement is how two
 *      copies of a safety rule start disagreeing.
 *   3. **The obligations.** Recording every skip with a reason, and treating a
 *      zero-executed run as a finding, are the two rules that stop the step
 *      silently doing nothing — which is the exact shape of the defect it exists
 *      to catch.
 *
 * Run: node --test evals/shared/tests/qa-execution-step-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const read = (p) => readFileSync(join(repoRoot, p), "utf-8");

const qaTask = read("skills/qa-task/SKILL.md");
const qaStory = read("skills/qa-story/SKILL.md");
const rule = read("shared/resources/qa-runnable-prose-detection.md");
const loopDoc = read("shared/resources/develop-pipeline-step-5-6-qa-loop.md");

/** Line index of the first line matching `re`, or -1. */
function lineOf(text, re) {
  return text.split("\n").findIndex((l) => re.test(l));
}

// ── 1. Placement: each file's own convention, not a copy of the other's ───────

test("qa-task carries Step 4b between Step 4 and Step 5", () => {
  const step4 = lineOf(qaTask, /^### Step 4: Run Tests/);
  const step4b = lineOf(qaTask, /^### Step 4b: /);
  const step5 = lineOf(qaTask, /^### Step 5: Verify Success Criteria/);

  assert.ok(step4 > -1, "Step 4 heading must exist");
  assert.ok(
    step4b > -1,
    "Step 4b must exist — this is the trigger the task adds",
  );
  assert.ok(step5 > -1, "Step 5 heading must exist");
  assert.ok(
    step4 < step4b && step4b < step5,
    `Step 4b must sit between Step 4 (${step4}) and Step 5 (${step5}), found at ${step4b}`,
  );
});

test("qa-story carries Phase 1.7 after Phase 1.6 — it is phase-numbered, not step-numbered", () => {
  const p16 = lineOf(qaStory, /^#### Phase 1\.6: Diff Code Review/);
  const p17 = lineOf(qaStory, /^#### Phase 1\.7: /);
  const p2 = lineOf(qaStory, /^#### Phase 2: Comprehensive Analysis/);

  assert.ok(p16 > -1, "Phase 1.6 must exist");
  assert.ok(
    p17 > -1,
    "Phase 1.7 must exist — the qa-story half of the trigger",
  );
  assert.ok(p2 > -1, "Phase 2 must exist");
  assert.ok(
    p16 < p17 && p17 < p2,
    `Phase 1.7 must sit between Phase 1.6 (${p16}) and Phase 2 (${p2}), found at ${p17}`,
  );

  // The failure this guards against: pasting qa-task's heading into a file that
  // has no Step 4 to hang it from.
  assert.equal(
    lineOf(qaStory, /^#### Step 4b: |^### Step 4b: /),
    -1,
    "qa-story must not carry a Step 4b heading — that file is phase-numbered",
  );
});

// ── 2. The rule lives in exactly one file ────────────────────────────────────

test("the rule document exists and covers every part of the contract", () => {
  assert.ok(
    existsSync(
      join(repoRoot, "shared/resources/qa-runnable-prose-detection.md"),
    ),
  );
  for (const [what, re] of [
    ["when the rule fires", /^## 1\. When the rule fires/m],
    ["classification", /^## 2\. Block classification/m],
    ["fail-closed boundary", /fails closed/im],
    ["dual-shell execution", /^## 3\. Dual-shell execution/m],
    ["sandbox sentinel", /sandbox sentinel/im],
    ["zsh guard", /command -v zsh/m],
    ["zero blocks executed", /zero blocks executed is itself a finding/im],
    ["reporting", /^## 5\. Reporting/m],
  ]) {
    assert.match(rule, re, `the rule document must cover: ${what}`);
  }
});

test("both QA skills point at the rule rather than restating it", () => {
  for (const [name, src] of [
    ["qa-task", qaTask],
    ["qa-story", qaStory],
  ]) {
    assert.match(
      src,
      /qa-runnable-prose-detection\.md/,
      `${name} must reference the rule document by name`,
    );
    // A restatement is how two copies of a safety rule start disagreeing. The
    // rationale — why the boundary is an allow-list — belongs in one file only.
    const allowListMentions = (src.match(/allow-list/g) || []).length;
    assert.ok(
      allowListMentions <= 2,
      `${name} mentions "allow-list" ${allowListMentions}x — the rationale belongs in the rule document, not restated here`,
    );
  }
});

test("the orchestrator's step 5-6 doc cross-references the rule without restating it", () => {
  assert.match(loopDoc, /qa-runnable-prose-detection\.md/);
  assert.match(loopDoc, /not\*\* restated|not restated/i);
});

// ── 3. The obligations that stop the step silently doing nothing ─────────────

test("both skills require the not-applicable case to be RECORDED, not silently skipped", () => {
  for (const [name, src] of [
    ["qa-task", qaTask],
    ["qa-story", qaStory],
  ]) {
    assert.match(
      src,
      /not applicable — no runnable prose in the change set/,
      `${name} must specify the exact string recorded when the rule does not fire`,
    );
  }
});

test("both skills require every skipped block to carry a line number and a reason", () => {
  for (const [name, src] of [
    ["qa-task", qaTask],
    ["qa-story", qaStory],
  ]) {
    assert.match(
      src,
      /[Ee]very skipped block[^.]*reason/,
      `${name} must require every skip to be recorded with its reason`,
    );
    assert.match(
      src,
      /silent skip/i,
      `${name} must say why: a silent skip recreates the defect this step prevents`,
    );
  }
});

test("both skills carry the zero-blocks-executed rule and forbid suppressing it", () => {
  for (const [name, src] of [
    ["qa-task", qaTask],
    ["qa-story", qaStory],
  ]) {
    assert.match(src, /zero-blocks-executed/, `${name} must name the finding`);
    assert.match(
      src,
      /do not suppress it/i,
      `${name} must forbid suppressing the zero-executed finding`,
    );
    // zsh being absent must never be conflated with "nothing ran".
    assert.match(
      src,
      /zsh[^.]*absent[^.]*not that case|zsh-unavailable/i,
      `${name} must distinguish a missing interpreter from a zero-executed run`,
    );
  }
});

test("both skills name the engine invocation, and name it consistently", () => {
  for (const [name, src] of [
    ["qa-task", qaTask],
    ["qa-story", qaStory],
  ]) {
    assert.match(
      src,
      /qa-execute-snippets\.mjs --file/,
      `${name} must show how to invoke the engine`,
    );
  }
});

test("the engine the skills invoke actually exists and exports what the rule promises", async () => {
  // The cheapest possible drift: the prose names a script that was renamed or
  // never landed. Nothing else in the suite crosses that boundary.
  const enginePath = join(repoRoot, "shared/resources/qa-execute-snippets.mjs");
  assert.ok(
    existsSync(enginePath),
    "the engine named in both SKILL.md files must exist",
  );

  const mod = await import(enginePath);
  for (const fn of [
    "extractBlocks",
    "classifyBlock",
    "runBlock",
    "executeFile",
    "main",
  ]) {
    assert.equal(typeof mod[fn], "function", `engine must export ${fn}()`);
  }
});
