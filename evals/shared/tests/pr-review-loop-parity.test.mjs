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
  const s5c = loopDoc.slice(loopDoc.indexOf("### 5c. "));
  assert.match(
    s5c,
    /REQUEST CHANGES.*5b/s,
    "REQUEST CHANGES must route back to 5b",
  );
  assert.match(
    s5c,
    /increment the shared QA cycle counter/i,
    "a review-driven fix must consume a cycle from the shared budget",
  );
  assert.match(
    s5c,
    /re-enters 5b, not 5a/i,
    "entering at 5a would re-run QA against an unchanged tree",
  );
});

test("APPROVE and CONCERNS exit the loop, and CONCERNS does not block", () => {
  const s5c = loopDoc.slice(loopDoc.indexOf("### 5c. "));
  assert.match(s5c, /APPROVE.*exit the loop|APPROVE.*proceed to Step 7/s);
  assert.match(
    s5c,
    /CONCERNS.*\*\*Do not block\.\*\*/s,
    "CONCERNS records findings without blocking",
  );
});

test("the 5-cycle bound covers 5c rather than being extended by it", () => {
  const s5c = loopDoc.slice(loopDoc.indexOf("### 5c. "));
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
  const s5c = loopDoc.slice(loopDoc.indexOf("### 5c. "));
  assert.match(
    s5c,
    /never on REQUEST CHANGES/i,
    "a run still inside the loop must not be advertised as merge-ready",
  );
});

// ── 5. The advisory contract survives the wiring ─────────────────────────────

test("5c consults /review-pr; it does not let it gate", () => {
  const s5c = loopDoc.slice(loopDoc.indexOf("### 5c. "));
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
  assert.ok(
    existsSync(join(repoRoot, "skills/review-pr/SKILL.md")),
    "5c invokes /review-pr — its SKILL.md must exist",
  );
  assert.match(
    reviewPr,
    /^name: review-pr$/m,
    "frontmatter name must match the /review-pr invocation in the step file",
  );
  assert.match(
    loopDoc.slice(loopDoc.indexOf("### 5c. ")),
    /\/review-pr --effort \{medium\|low\} --comment/,
    "the invocation line must carry both flags the contract depends on",
  );
});
