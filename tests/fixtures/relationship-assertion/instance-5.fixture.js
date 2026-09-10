// FIXTURE — task 89, instance 5.  Gate finding CY11-2.  Closed by 18dd5b5.
// Verbatim from git show ef3a0c1:evals/shared/tests/pr-review-loop-parity.test.mjs:296-311.
// §5c is the LAST section before `## Loop Escalation`, so "after the 5c heading"
// and "inside 5c" are not the same predicate. Gate 11 relocated the whole stage
// call into Loop Escalation — signalling a card merge-ready from the path taken
// by a run that FAILED to converge — and the suite stayed 20/0 green.
// EXPECT: flagged (rule C) — an ordering comparison sold as containment.
"use strict";
const assert = require("node:assert/strict");

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
});
