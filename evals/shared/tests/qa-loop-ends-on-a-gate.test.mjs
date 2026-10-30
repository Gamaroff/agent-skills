// qa-loop-ends-on-a-gate.test.mjs — the QA loop's budget counts gates, and the loop always ends on
// one (task.244).
//
// The defect this closes: the budget was tested AFTER 5b (§5b step 7), so a budget of N spent N fixes
// and the Nth fix landed on a head no gate read. Route 2c (the "gate-the-last-fix half-cycle") was
// built to patch that outcome case by case; obs #112, #139 and #300 tuned its conditions three
// times. The rule now sits where the loop routes to 5b: a fix runs only when a gate will read it
// within the budget, and §5b step 7 always increments and returns to 5a.
//
// This file reads the step doc by section, as pr-review-loop-parity.test.mjs does, and holds:
//
//   1. the rule is stated ONCE, in Loop Setup (a second statement would drift from the first)
//   2. both arms that route to 5b — the Outcome branching's budget test and §5c's two
//      fix-bound verdict rows — name QA_MAX_CYCLES and Loop Escalation
//   3. §5b step 7 carries NO budget test: it increments and returns to 5a (the mutation this file
//      is proven against restores the old test there)
//   4. no `Gate-the-last-fix` section remains
//   5. develop-bug's verify loop holds the same rule with MAX_ITER, before 5b
//
// Mutation proof: QA_LOOP_DOC / DEVELOP_BUG_LOOP_DOC point the reader at a copy. Restore the old step 7
// in a copy and this file goes red (test 3); the in-file control below does the same in memory, so
// the proof holds in CI without a copy on disk.
//
// Run: node --test evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const LOOP_PATH =
  process.env.QA_LOOP_DOC ||
  join(ROOT, "shared", "resources", "develop-pipeline-step-5-6-qa-loop.md");
const BUG_PATH =
  process.env.DEVELOP_BUG_LOOP_DOC ||
  join(
    ROOT,
    "skills",
    "develop-bug",
    "references",
    "develop-bug-step-5-6-verify-loop.md",
  );

const loopDoc = readFileSync(LOOP_PATH, "utf8");
const bugDoc = readFileSync(BUG_PATH, "utf8");

/** The text between two markers; both must exist, or nothing below is being tested. */
function between(doc, start, end) {
  const i = doc.indexOf(start);
  assert.ok(i > -1, `marker not found, so nothing below is tested: ${start}`);
  const j = doc.indexOf(end, i + start.length);
  assert.ok(
    j > -1,
    `end marker not found after ${JSON.stringify(start)}: ${end}`,
  );
  return doc.slice(i, j).replace(/\s+/g, " ");
}

/** §5b step 7: from its numeral to the section rule that closes 5b. */
function step7(doc) {
  return between(doc, "\n7. ", "\n### 5c. PR Conformance Review (shared)");
}

/** What step 7 must not do: test the budget, or escalate. Empty on a correct doc. */
function step7Violations(doc) {
  const s = step7(doc);
  const out = [];
  if (/QA_MAX_CYCLES/.test(s)) out.push("names QA_MAX_CYCLES");
  if (/escalat/i.test(s)) out.push("escalates");
  if (!/return to 5a/i.test(s)) out.push("does not return to 5a");
  return out;
}

const RULE = "A fix runs only when a gate will read it within the budget";

test("the rule is stated once, in Loop Setup", () => {
  const hits = loopDoc.split(RULE).length - 1;
  assert.equal(hits, 1, `"${RULE}" must appear exactly once (found ${hits})`);
  const setup = between(loopDoc, "## Loop Setup (shared)", "\n## ");
  assert.ok(setup.includes(RULE), "the rule must sit in Loop Setup");
  assert.match(setup, /5b is entered only when `N < QA_MAX_CYCLES`/);
  assert.match(setup, /The loop always ends on a gate\./);
});

test("both arms that route to 5b test the budget and name Loop Escalation", () => {
  // The Outcome branching's budget test: the last resolution before 5b.
  const budgetTest = between(
    loopDoc,
    "**The budget test — the last resolution before 5b.**",
    "> **5b is entered on an open finding",
  );
  assert.match(budgetTest, /`N == QA_MAX_CYCLES`/);
  assert.match(budgetTest, /\*\*Loop Escalation\*\*/);

  // §5c's two fix-bound verdict rows (REQUEST CHANGES, and CONCERNS with an open coverage finding).
  const verdicts = between(
    loopDoc,
    "#### Verdict branching",
    "| ✅ **APPROVE**",
  );
  const rc = verdicts.split("| ⚠️ **CONCERNS**")[0];
  const concerns = verdicts.split("| ⚠️ **CONCERNS**")[1];
  for (const [name, row] of [
    ["REQUEST CHANGES", rc],
    ["CONCERNS with open coverage", concerns],
  ]) {
    assert.match(
      row,
      /`?N == QA_MAX_CYCLES`?/,
      `${name} row must test the budget`,
    );
    assert.match(
      row,
      /Loop limit via review/,
      `${name} row must name the escalation`,
    );
  }
});

test("§5b step 7 carries no budget test: it increments and returns to 5a", () => {
  assert.deepEqual(step7Violations(loopDoc), []);
});

test("control: the old step 7 (a budget test after 5b) is caught by the same predicate", () => {
  // The calibration the project rules ask for: a guard proves nothing until it has failed on the
  // case it exists for. This is the pre-task.244 step 7, spliced over the new one.
  const OLD_STEP7 =
    "\n7. **If the counter reads `QA_MAX_CYCLES`, the budget is spent: do not return to 5a.** Go to\n" +
    "   **Loop Escalation** with the *Loop limit* trigger — which evaluates the half-cycle.\n" +
    "   Otherwise increment the cycle counter and return to 5a.\n\n---\n";
  const start = loopDoc.indexOf(
    "\n7. Increment the cycle counter and return to 5a.",
  );
  assert.ok(
    start > -1,
    "the new step 7 must start with its numeral and 'Increment'",
  );
  const end = loopDoc.indexOf(
    "\n### 5c. PR Conformance Review (shared)",
    start,
  );
  const mutant =
    loopDoc.slice(0, start) + OLD_STEP7 + "\n" + loopDoc.slice(end);
  const violations = step7Violations(mutant);
  assert.ok(
    violations.includes("names QA_MAX_CYCLES") &&
      violations.includes("escalates"),
    `the old step 7 must be flagged (got ${JSON.stringify(violations)})`,
  );
});

test("no Gate-the-last-fix section or route remains", () => {
  assert.doesNotMatch(loopDoc, /^#{2,4} .*Gate-the-last-fix/im);
  assert.doesNotMatch(loopDoc, /^\d+\. \*\*\(route 2c\)\*\*/m);
  assert.doesNotMatch(loopDoc, /set-qa-phase\.sh 5a[^\n]*half-cycle/i);
  // Any surviving mention is a removal note, never a live instruction.
  for (const line of loopDoc.split("\n")) {
    if (/gate-the-last-fix|half-cycle|route 2c/i.test(line)) {
      assert.match(
        line,
        /removed|was removed|no longer|legacy|readers accept|task\.244|route 2c, the gate/i,
        `a surviving mention must be a removal/legacy note: ${line.trim()}`,
      );
    }
  }
});

test("develop-bug's verify loop holds the same rule with MAX_ITER, before 5b", () => {
  const setup = between(bugDoc, "## Loop Setup", "### Signal the `in-qa`");
  assert.match(setup, /5b is entered only when `N < MAX_ITER`/);
  assert.match(setup, /the loop always ends on one/i);
  // The test sits at the end of 5a's FAIL branch — before 5b is reached.
  const fail = bugDoc.split("\n").find((l) => /^- \*\*FAIL\*\*/.test(l)) || "";
  assert.match(fail, /`N == MAX_ITER`.*Loop Limit Escalation/);
  assert.match(fail, /otherwise go to \*\*5b\*\*/);
  // 5b's last step increments and returns, with no test of its own.
  const five = between(
    bugDoc,
    "\n5. Increment the counter",
    "\n6. **Emit the Remaining",
  );
  assert.doesNotMatch(five, /MAX_ITER/);
  assert.match(five, /return to \*\*5a\*\*/);
  assert.match(
    bugDoc,
    /## Loop Limit Escalation \(verify failed on cycle MAX_ITER\)/,
  );
});
