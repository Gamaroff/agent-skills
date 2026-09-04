// FIXTURE — task 89, instance 3.  Gate finding CY10-1.  Closed by ef3a0c1.
// Verbatim from git show 8293765:evals/shared/tests/pr-review-loop-parity.test.mjs:137-142.
// The action cell contains "5b's step 7 increments it", so `5b` is present
// wherever the row routes — CY10-1 turned the row green while REQUEST CHANGES
// routed to 5a, to Step 7, and with APPROVE inverted.
// EXPECT: flagged (rule A) — two identifiers joined by a wildcard gap under a routing claim.
"use strict";
const assert = require("node:assert/strict");

test("REQUEST CHANGES returns to 5b and consumes a shared cycle", () => {
  assert.match(
    section5c(),
    /\|[^|\n]*REQUEST CHANGES[^|\n]*\|[^|\n]*5b[^|\n]*\|/,
    "the REQUEST CHANGES table ROW must route back to 5b — not merely prose mentioning both",
  );
});
