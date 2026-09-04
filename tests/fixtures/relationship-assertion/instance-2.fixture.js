// FIXTURE — task 89, instance 2.  Gate finding CY9-3.  Replaced by 8293765.
// The fix for instance 1, carrying the same defect one level down.
// Reconstructed from the same v1/v2 record:
//     "v2 — same `includes`, haystack narrowed to the table. `not reached`
//      appears backticked inside the `pending` row's own prose, so deleting the
//      `not reached` row STILL left it green — and `not reached` is the table's
//      default arm."
// EXPECT: flagged (rule A) — narrowing the haystack does not turn a mention into a mapping.
"use strict";
const assert = require("node:assert/strict");

test("every sub-state has a resume action", () => {
  const subState = resume.slice(tableStart, tableEnd);
  for (const v of [
    "pending — 5c not yet run",
    "REQUEST CHANGES",
    "review failed",
    "not reached",
  ]) {
    assert.ok(
      subState.includes(v),
      `the sub-state table must give ${v} a resume action`,
    );
  }
});
