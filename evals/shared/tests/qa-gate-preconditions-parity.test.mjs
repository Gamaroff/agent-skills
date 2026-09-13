/**
 * Asserts that the QA loop's evidence preconditions (task.116) are wired into BOTH QA
 * skills, at the right place, with the same words — and that the subagent vocabulary
 * they lean on exists once and is pointed at from every dispatch site.
 *
 * WHY THIS EXISTS
 * ---------------
 * Four defects, six observations, one task. Each fix is a sentence an agent reads, not
 * code it runs, so nothing but this file holds it:
 *
 *   1. **The gate waits for its own review.** qa-task Step 3b / qa-story Phase 1.6 must
 *      end with the findings block IN HAND; the gate step and the PR-comment step must
 *      each refuse while a dispatched review is outstanding (obs #56 — task.106's gate 1
 *      was posted minutes before its review returned two confirmed defects).
 *   2. **QA executes boundary deliverables.** Step 3b must apply `probe-boundary-rule.md`
 *      and report `probes_executed` (obs #20 — a 14-star glob passed five green cycles).
 *   3. **Platform variance is named.** The `TMPDIR=/tmp node --test` reproduction must
 *      appear in the diff-review step AND the review prompt (obs #17).
 *   4. **A subagent that never ran has a row.** autonomous-defaults must carry the
 *      unavailable / failed / slow table, the wall-clock budget, and "output-file size is
 *      not a liveness signal"; every dispatch site must point at it (obs #44, #62).
 *
 * Parity is asserted on VERBATIM sentences, not on keywords: two skills that each say
 * "wait for the review" in their own words are two rules, and two rules drift.
 *
 * Run: node --test evals/shared/tests/qa-gate-preconditions-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf-8");

const qaTask = read("skills/qa-task/SKILL.md");
const qaStory = read("skills/qa-story/SKILL.md");
const defaults = read(
  "shared/resources/develop-pipeline-autonomous-defaults.md",
);
const reviewPrompt = read("shared/resources/code-review-prompt.md");

/** Line index of the first line matching `re`, or -1. */
const lineOf = (text, re) => text.split("\n").findIndex((l) => re.test(l));

/** The slice of `text` between the first line matching `startRe` and the next matching `endRe`. */
function between(text, startRe, endRe) {
  const lines = text.split("\n");
  const s = lines.findIndex((l) => startRe.test(l));
  assert.ok(s > -1, `start marker not found: ${startRe}`);
  const e = lines.findIndex((l, i) => i > s && endRe.test(l));
  assert.ok(e > -1, `end marker not found after ${startRe}: ${endRe}`);
  return lines.slice(s, e).join("\n");
}

// The sentences that must be byte-identical in both skills. Each is the load-bearing
// clause of one precondition; the surrounding prose may differ per skill.
const SHARED = {
  postCondition:
    "This step ends when the dispatched reviewer's `code_review:` block is in hand and recorded. A dispatched review that has not returned is **outstanding**, and the pass is not complete",
  gateWrite:
    "> **Precondition — no dispatched review is outstanding.** Do not write a gate while a code review dispatched in this cycle has not returned its `code_review:` block.",
  publish:
    "**Precondition — no dispatched review is outstanding.** Do not publish a gate the gate step could not have written: if a code review dispatched in this cycle is still running, the gate does not exist yet and there is nothing to post.",
  boundary:
    "**Apply the boundary rule — execute, do not only read.** When the reviewer has returned, apply\n   `references/probe-boundary-rule.md`",
  probesExecuted: "**`probes_executed: N`**",
  platformVariance: "**Platform variance — run the other value.**",
  reproduction: "TMPDIR=/tmp node --test 'skills/<skill>/tests/*.test.js'",
  sizeNotLiveness: "**output-file size is not a liveness signal**",
};

// ── 1. The diff-review step: post-condition, boundary rule, platform variance ────

const taskStep3b = between(
  qaTask,
  /^### Step 3b: Diff Code Review/,
  /^### Step 3c: /,
);
const storyPhase16 = between(
  qaStory,
  /^#### Phase 1\.6: Diff Code Review/,
  /^#### Phase 1\.7: /,
);

test("Step 3b / Phase 1.6 end with the findings block in hand — same sentence, both skills", () => {
  for (const [name, sec] of [
    ["qa-task Step 3b", taskStep3b],
    ["qa-story Phase 1.6", storyPhase16],
  ]) {
    assert.ok(
      sec.includes(SHARED.postCondition),
      `${name} must carry the post-condition sentence verbatim`,
    );
    // The post-condition is the STEP's last word: it must sit after the `rm -f` cleanup so
    // a reader executing top-to-bottom reaches it after the dispatch, not before.
    const rm = sec.indexOf('`rm -f "$DIFF_FILE"`');
    const post = sec.indexOf(SHARED.postCondition);
    assert.ok(rm > -1, `${name} must still clean up the diff file`);
    assert.ok(
      post > rm,
      `${name}: the post-condition must come after the cleanup, as the step's last word`,
    );
    assert.match(
      sec,
      /killed at N minutes/,
      `${name}: a reviewer past its budget is recorded as 'killed at N minutes'`,
    );
    assert.doesNotMatch(
      sec.slice(post),
      /\bstalled\b(?![^`]*`\))/,
      `${name}: the post-condition must not offer 'stalled' as a record`,
    );
  }
});

test("Step 3b / Phase 1.6 apply the boundary rule by pointer and report probes_executed", () => {
  for (const [name, sec] of [
    ["qa-task Step 3b", taskStep3b],
    ["qa-story Phase 1.6", storyPhase16],
  ]) {
    assert.ok(
      sec.includes(SHARED.boundary),
      `${name} must apply probe-boundary-rule.md after the reviewer returns`,
    );
    assert.ok(
      sec.includes(SHARED.probesExecuted),
      `${name} must report probes_executed on the finding block`,
    );
    assert.match(
      sec,
      /security-input-corpus\.mjs/,
      `${name} must take candidates from the corpus, not re-invent them`,
    );
    assert.match(
      sec,
      /\*\*run it\*\*/,
      `${name} must EXECUTE the candidates, not reason about them`,
    );
    // The rule lives in one file. A restatement of its signal list here is the drift this
    // test exists to refuse.
    assert.doesNotMatch(
      sec,
      /Signals — any \*\*one\*\* is sufficient/,
      `${name} must point at the boundary rule's signals, not restate them`,
    );
  }
});

test("platform variance: the reproduction command is in the diff-review step, both skills, and the review prompt", () => {
  for (const [name, sec] of [
    ["qa-task Step 3b", taskStep3b],
    ["qa-story Phase 1.6", storyPhase16],
  ]) {
    assert.ok(
      sec.includes(SHARED.platformVariance),
      `${name} must carry the platform-variance item`,
    );
    assert.ok(
      sec.includes(SHARED.reproduction),
      `${name} must carry the one-line reproduction`,
    );
    assert.match(
      sec,
      /zshAvailable\(\)/,
      `${name} must cite the environment-probe precedent`,
    );
  }
  assert.match(
    reviewPrompt,
    /PLATFORM VARIANCE \(report as category: bug/,
    "code-review-prompt.md must name platform variance as a mandatory bug-category check",
  );
  assert.match(
    reviewPrompt,
    /TMPDIR=\/tmp node --test/,
    "code-review-prompt.md must ask the reviewer for the reproduction under the other value",
  );
  // The check is a NOTE on the existing bug category, not a third category: the output
  // contract's `category: bug | cleanup` is unchanged (task.116 scope: no new report schemas).
  assert.match(
    reviewPrompt,
    /category: bug\s+# bug \| cleanup/,
    "the output contract's category set must stay bug | cleanup",
  );
});

test("the platform-variance rule also reaches the mutation-proof spot check, both skills", () => {
  const S =
    "**A green suite is also evidence about the platform it ran on, and only that platform.**";
  const taskSec = between(
    qaTask,
    /^### Step 3c: Mutation-Proof Spot Check/,
    /^### Step 4: /,
  );
  const storySec = between(
    qaStory,
    /^## Mutation-Proof Spot Check/,
    /^## Story Review Process/,
  );
  assert.ok(
    taskSec.includes(S),
    "qa-task Step 3c must carry the platform sentence",
  );
  assert.ok(
    storySec.includes(S),
    "qa-story's Mutation-Proof section must carry the platform sentence",
  );
});

// ── 2. The gate step and the publish step refuse while a review is outstanding ───

test("the gate step refuses to write while a dispatched review is outstanding — both skills", () => {
  const taskGate = between(
    qaTask,
    /^### Step 10: Create Quality Gate File/,
    /^### Step 11: /,
  );
  const storyGate = between(
    qaStory,
    /^#### Output 2: Quality Gate File/,
    /^### Gate Decision Criteria/,
  );
  for (const [name, sec] of [
    ["qa-task Step 10", taskGate],
    ["qa-story Output 2", storyGate],
  ]) {
    assert.ok(
      sec.includes(SHARED.gateWrite),
      `${name} must open with the gate-write precondition verbatim`,
    );
    // It must be the step's FIRST word, not a footnote: a precondition read after the
    // schema has been filled in is a precondition that was not applied.
    const headingEnd = sec.indexOf("\n") + 1;
    const pre = sec.indexOf(SHARED.gateWrite);
    assert.ok(
      sec.slice(headingEnd, pre).trim() === "",
      `${name}: the precondition must be the first thing after the heading`,
    );
    assert.match(
      sec,
      /obs #56/,
      `${name}: the precondition must cite the observation it closes`,
    );
  }
});

test("the publish step refuses to post a gate the gate step could not have written — both skills", () => {
  const taskPost = between(
    qaTask,
    /^### Step 13: Post PR Comment/,
    /^### Step 13b: /,
  );
  assert.ok(
    taskPost.includes(SHARED.publish),
    "qa-task Step 13 must carry the publish precondition verbatim",
  );
  const storyPostLine = lineOf(qaStory, /^6\. \*\*Post QA Summary to PR\*\*/);
  assert.ok(storyPostLine > -1, "qa-story's Post QA Summary step must exist");
  const storyPost = qaStory
    .split("\n")
    .slice(storyPostLine, storyPostLine + 8)
    .join("\n");
  assert.ok(
    storyPost.includes(SHARED.publish),
    "qa-story's Post QA Summary step must carry the publish precondition verbatim, immediately beneath it",
  );
});

// ── 3. Subagent vocabulary: one table, pointed at from every dispatch site ──────

test("autonomous-defaults carries the unavailable / failed / slow table, the budget, and the liveness rule", () => {
  const sec = between(
    defaults,
    /^## Subagents — unavailable, failed, slow/,
    /^If a situation arises/,
  );
  for (const row of ["**Unavailable**", "**Failed**", "**Slow**"]) {
    assert.ok(
      sec.includes(`| ${row}`),
      `the Subagents table must carry a ${row} row`,
    );
  }
  for (const cell of [
    "independence lost",
    "killed at N minutes",
    "pass performed inline",
  ]) {
    assert.match(sec, new RegExp(cell), `every row must record '${cell}'`);
  }
  assert.match(
    sec,
    /\*\*never\*\* `stalled`/,
    "the record must be 'killed at N minutes', never 'stalled'",
  );
  assert.match(
    sec,
    /\*\*Wall-clock budget\.\*\* Ten minutes per dispatch by default/,
    "a wall-clock budget must be stated with its default",
  );
  assert.match(
    sec,
    /subagents\.wallClockMinutes/,
    "the budget must be overridable from skills-config.yaml",
  );
  assert.match(
    sec,
    /\*\*Output-file size is not a liveness signal\.\*\*/,
    "output-file size is not a liveness signal — stated as a rule in the table's own section",
  );
  assert.match(
    sec,
    /Do not poll the file, do not `tail` it/,
    "the liveness rule must forbid the file read outright",
  );
  // Unavailable is NOT failed: the table must keep them as separate rows with separate records.
  assert.match(
    sec,
    /Nothing ran\. There is no output to inspect/,
    "'unavailable' must be defined as nothing-ran, distinct from a failed run",
  );
});

test("every dispatch site points at the Subagents table and repeats the liveness rule", () => {
  const sites = [
    [
      "develop Step 3 (pre-develop map)",
      "shared/resources/develop-pipeline-step-3-develop-loop.md",
      /Before invoking `\/develop`, use the Agent tool/,
    ],
    [
      "review-task Phase 1.5",
      "skills/review-task/SKILL.md",
      /^\*\*Failure handling\*\*: if both agents fail/,
    ],
    [
      "review-story pre-pass",
      "skills/review-story/SKILL.md",
      /^5\. Handle Failures Gracefully/,
    ],
    [
      "qa-task Step 3b",
      "skills/qa-task/SKILL.md",
      /^\*\*Post-condition — the findings block is in hand\.\*\*/,
    ],
    [
      "qa-story Phase 1.6",
      "skills/qa-story/SKILL.md",
      /^\*\*Post-condition — the findings block is in hand\.\*\*/,
    ],
    [
      "qa-fix Step 1a",
      "skills/qa-fix/SKILL.md",
      /^\*\*On subagent failure or error\*\*/,
    ],
  ];
  for (const [name, path, anchor] of sites) {
    const text = read(path);
    const i = lineOf(text, anchor);
    assert.ok(i > -1, `${name}: anchor line not found in ${path}`);
    const line = text.split("\n")[i];
    assert.match(
      line,
      /develop-pipeline-autonomous-defaults\.md` §Subagents/,
      `${name} must point at the Subagents table by section`,
    );
    assert.ok(
      line.includes(SHARED.sizeNotLiveness),
      `${name} must repeat 'output-file size is not a liveness signal' at the dispatch site`,
    );
  }
});
