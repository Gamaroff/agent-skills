/**
 * Asserts that Step 5c — the PR conformance review — is wired into the shared
 * QA loop, wired at the right PLACE, and routes the way the contract says.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three things drift independently, and none of them is caught by the protocol
 * evals (which only check that a keyword appears somewhere in the step file):
 *
 *   1. THE ROUTING. `REQUEST CHANGES` must return to 5b and consume a cycle
 *      from the shared 5-cycle budget; `APPROVE` and `CONCERNS` must exit to
 *      Step 7. A file can name review-pr and still describe the wrong graph.
 *   2. THE ORDER OF `ready-for-merge`. It moved out of 5a's outcome branching
 *      and into 5c with task 77, because signalling merge-readiness the moment
 *      a gate read PASS advertised a card as mergeable while the run could
 *      still loop back into qa-fix. A later edit that moves it back would be
 *      invisible to every other test — transition-protocol-parity only asserts
 *      the stage appears SOMEWHERE in this file.
 *   3. THE ADVISORY CONTRACT. 5c is legitimate only because /review-pr reports
 *      a verdict and the ORCHESTRATOR acts on it. If the step file ever gives
 *      5c the power to write a gate, the wiring becomes the thing task 66
 *      deliberately refused to build.
 *
 * Run: node --test evals/shared/tests/pr-review-loop-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const read = (p) => readFileSync(join(repoRoot, p), "utf-8");

const loopDoc = read("shared/resources/develop-pipeline-step-5-6-qa-loop.md");
const reviewPr = read("skills/review-pr/SKILL.md");
const liteMode = read("shared/resources/develop-pipeline-lite-mode.md");
const defaults = read(
  "shared/resources/develop-pipeline-autonomous-defaults.md",
);

/** Line index of the first line matching `re`, or -1. */
function lineOf(text, re) {
  return text.split("\n").findIndex((l) => re.test(l));
}

/**
 * The 5c section ONLY — from its heading to the next H2.
 *
 * Two failure modes this closes, both of which made assertions silently weaker:
 *   - `indexOf` returns -1 when the section is absent, and `slice(-1)` then yields the file's LAST
 *     CHARACTER rather than an empty string. Comparisons against that index (`x > s5c`) are then
 *     trivially true.
 *   - Slicing to end-of-file swept in the whole Loop Escalation section, so a regex like
 *     /REQUEST CHANGES.*5b/s matched prose there and would have passed even if the verdict table
 *     said the opposite.
 */
function section5c() {
  const start = loopDoc.indexOf("### 5c. ");
  assert.ok(
    start > -1,
    "the 5c section must exist — every assertion below is about it",
  );
  const end = loopDoc.indexOf("\n## ", start);
  return loopDoc.slice(start, end > -1 ? end : undefined);
}

// ── 1. Placement: 5c sits after 5b and before Loop Escalation ────────────────

test("the QA loop carries a 5c section between 5b and Loop Escalation", () => {
  const s5a = lineOf(loopDoc, /^### 5a\. /);
  const s5b = lineOf(loopDoc, /^### 5b\. /);
  const s5c = lineOf(loopDoc, /^### 5c\. /);
  const esc = lineOf(loopDoc, /^## Loop Escalation /);

  assert.ok(s5a > -1, "5a heading must exist");
  assert.ok(s5b > -1, "5b heading must exist");
  assert.ok(s5c > -1, "5c must exist — this is the exit gate task 77 adds");
  assert.ok(esc > -1, "Loop Escalation heading must exist");
  assert.ok(
    s5a < s5b && s5b < s5c && s5c < esc,
    `expected 5a(${s5a}) < 5b(${s5b}) < 5c(${s5c}) < escalation(${esc})`,
  );
});

// ── 2. The gate hands to 5c, rather than exiting on its own ──────────────────

test("a clean QA gate routes to 5c, not straight to Step 7", () => {
  const branching = loopDoc.slice(
    loopDoc.indexOf("### Outcome branching (shared)"),
    loopDoc.indexOf("### Convergence check"),
  );
  assert.ok(branching.length > 0, "outcome branching section must exist");

  for (const gate of ["PASS", "WAIVED"]) {
    const arm = branching
      .split("\n")
      .find((l) => l.startsWith(`- \`${gate}\``));
    assert.ok(arm, `${gate} arm must exist in outcome branching`);
    assert.match(
      arm,
      /proceed to 5c/i,
      `the ${gate} arm must hand to 5c — a clean gate is no longer the loop's exit`,
    );
  }
});

// ── 3. Verdict routing — the graph, not just the vocabulary ──────────────────

test("REQUEST CHANGES returns to 5b and consumes a shared cycle", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /\|[^|\n]*REQUEST CHANGES[^|\n]*\|[^|\n]*5b[^|\n]*\|/,
    "the REQUEST CHANGES table ROW must route back to 5b — not merely prose mentioning both",
  );
  assert.match(
    s5c,
    /budget is \*\*shared\*\*, not additional/i,
    "a review-driven fix must consume a cycle from the shared budget, not extend it",
  );
  assert.match(
    s5c,
    /re-enters 5b, not 5a/i,
    "entering at 5a would re-run QA against an unchanged tree",
  );
});

test("APPROVE and CONCERNS exit the loop, and CONCERNS does not block", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /\|[^|\n]*APPROVE[^|\n]*\|[^|\n]*(exit the loop|Step 7)[^|\n]*\|/,
    "the APPROVE table ROW must exit the loop",
  );
  assert.match(
    s5c,
    /CONCERNS.*\*\*Do not block\.\*\*/s,
    "CONCERNS records findings without blocking",
  );
});

test("the 5-cycle bound covers 5c rather than being extended by it", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /budget is \*\*shared\*\*, not additional/i,
    "5c must share the existing 5-cycle budget, never add to it",
  );
});

// ── 4. ready-for-merge fires AFTER the review, not on the QA gate ────────────

test("ready-for-merge sits inside 5c, after the review clears", () => {
  const s5c = loopDoc.indexOf("### 5c. ");
  const stage = loopDoc.indexOf("--stage ready-for-merge");

  assert.ok(
    s5c > -1,
    "the 5c section must exist for this comparison to mean anything",
  );
  assert.ok(stage > -1, "the ready-for-merge stage call must still exist");
  assert.ok(
    stage > s5c,
    "ready-for-merge must sit INSIDE 5c. Before task 77 it fired in 5a's " +
      "outcome branching, which advertised a card as merge-ready while the " +
      "run could still loop back into qa-fix.",
  );

  // And it must not have been left behind in the outcome branching too.
  const branching = loopDoc.slice(
    loopDoc.indexOf("### Outcome branching (shared)"),
    loopDoc.indexOf("### Convergence check"),
  );
  assert.doesNotMatch(
    branching,
    /--stage ready-for-merge/,
    "outcome branching must no longer signal ready-for-merge",
  );
});

test("ready-for-merge is not signalled on REQUEST CHANGES", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /never on REQUEST CHANGES/i,
    "a run still inside the loop must not be advertised as merge-ready",
  );
});

// ── 5. The advisory contract survives the wiring ─────────────────────────────

test("5c consults /review-pr; it does not let it gate", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /writes no gate/i,
    "the step file must restate that /review-pr writes no gate",
  );
  assert.match(
    reviewPr,
    /Being consulted by a pipeline is not the same as gating one/,
    "review-pr's own SKILL.md must keep the consulted-vs-gating distinction",
  );
  assert.match(
    reviewPr,
    /Gate files remain the exclusive output of `\/qa-story` and `\/qa-task`/,
  );
});

// ── 6. Lite mode degrades, never skips ───────────────────────────────────────

test("lite mode degrades 5c to --effort low and never skips it", () => {
  assert.match(liteMode, /Step 5c \(review-pr\)/, "lite mode must name 5c");
  assert.match(liteMode, /--effort low/);
  assert.match(
    liteMode,
    /never skipped|never skips/i,
    "skipping would remove the conformance check entirely, not shorten it",
  );
});

// ── 7. --comment is passed explicitly, because the pipeline cannot prompt ────

test("the autonomous defaults record the explicit --comment", () => {
  assert.match(
    defaults,
    /`--comment`/,
    "the pipeline passes --comment explicitly — /review-pr otherwise asks first",
  );
  assert.match(defaults, /Step 5c/);
});

// ── 8. The prose names a skill that actually exists ──────────────────────────

test("the skill 5c invokes is installed and named as this file expects", () => {
  // The existsSync + frontmatter pair are preconditions, not claims about task 77 — /review-pr
  // shipped before this change. They are kept so that a rename or deletion fails HERE with a
  // clear message rather than as a confusing mismatch below.
  assert.ok(
    existsSync(join(repoRoot, "skills/review-pr/SKILL.md")),
    "5c invokes /review-pr — its SKILL.md must exist",
  );
  assert.match(
    reviewPr,
    /^name: review-pr$/m,
    "frontmatter name must match the invocation",
  );

  // This is the assertion that is actually about 5c.
  assert.match(
    section5c(),
    /\/review-pr --effort \{medium\|low\} --comment/,
    "the invocation line must carry both flags the contract depends on",
  );
});

test("the REQUEST CHANGES path can actually deliver its findings to qa-fix", () => {
  // The regression this pins: 5c runs on a PASS/WAIVED gate, so a REQUEST CHANGES verdict has no
  // gate `top_issues[]` to travel in. If the ingester does not glob the pr-review report AND 5c
  // does not pass its path, qa-fix reads a clean gate, changes nothing, and the loop HALTs
  // reporting the findings as unfixable when they were never delivered.
  const ingester = read("shared/resources/qa-findings-ingester-prompt.md");
  assert.match(
    ingester,
    /pr-review\.\*\.md/,
    "the findings ingester must glob the PR review report",
  );
  assert.match(
    section5c(),
    /pr_review=/,
    "5c must pass the PR review report path into the qa-fix invocation",
  );
});

test("Loop Setup does not still claim a clean gate exits the loop", () => {
  // The highest-value contradiction: Loop Setup is the first section an agent reads, and if it
  // says a clean PASS exits immediately, 5c is never entered and the whole feature is a silent
  // no-op. Scope to Loop Setup so 5c's own prose cannot satisfy this.
  const start = loopDoc.indexOf("## Loop Setup");
  assert.ok(start > -1, "Loop Setup section must exist");
  const setup = loopDoc.slice(start, loopDoc.indexOf("\n## ", start));
  assert.doesNotMatch(
    setup,
    /clean PASS on any[^.]*exits the loop immediately/i,
    "Loop Setup must not say a clean PASS exits the loop — it hands to 5c",
  );
  assert.match(
    setup,
    /hands to \*\*5c\*\*/,
    "Loop Setup must name 5c as where a clean gate goes",
  );
});

test("the cycle counter is incremented in exactly one place", () => {
  // 5b step 7 increments on exit. If 5c ALSO increments, one review-driven fix pass burns two of
  // the five cycles and resume desynchronises (it reconstructs the count from `### QA Cycle`
  // headings, which the extra increment does not write).
  assert.match(
    section5c(),
    /Do not increment the counter here/i,
    "5c must defer the increment to 5b step 7, not perform its own",
  );
});
