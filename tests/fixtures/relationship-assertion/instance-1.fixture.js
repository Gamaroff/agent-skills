// FIXTURE — task 89, instance 1.  Gate finding CY8-5.  Replaced by 87e5bf9.
// Reconstructed from the record left in place by the commit that replaced it:
//   git show a0ced9b:evals/shared/tests/pr-review-loop-parity.test.mjs  (the
//   v1/v2 comment block), which states this shape verbatim:
//     "v1 — `resume.includes(v)` over the whole file. The artifact-table
//      sentences at ~:82 and ~:92 name every value in passing, so deleting a
//      sub-state row left the suite green."
// EXPECT: flagged (rule A) — a substring test under a message claiming a resume action.
"use strict";
const assert = require("node:assert/strict");

test("every sub-state has a resume action", () => {
  const resume = read("shared/resources/develop-pipeline-resume-contract.md");
  for (const v of [
    "pending — 5c not yet run",
    "REQUEST CHANGES",
    "review failed",
    "not reached",
  ]) {
    assert.ok(
      resume.includes(v),
      `the contract must state where a run resumes at for ${v}`,
    );
  }
});
