// FIXTURE — task 89, instance 4.  Gate finding CY11-1.  Closed by 18dd5b5.
// Verbatim shape from git show ef3a0c1:evals/shared/tests/pr-review-loop-parity.test.mjs.
// The guard promises at least 5 parsed rows; the enumeration names 4. The fifth
// is `APPROVE`/`CONCERNS` — the loop's EXIT arm — and it received only the
// generic key/action non-emptiness check while the comment above claimed
// "Each value resumes somewhere specific, so each is asserted specifically."
// Repointing that row to `re-enter at **5a**`, and deleting it outright, were
// both 20/0 green.
// EXPECT: flagged (rule D) — 4 enumerated against a >= 5 non-vacuity guard.
"use strict";
const assert = require("node:assert/strict");

test("every sub-state resumes somewhere specific", () => {
  assert.ok(
    subStateRows.length >= 5,
    `expected the sub-state table to parse into at least 5 rows, got ${subStateRows.length} — if this drops, the parse broke and every assertion below is vacuous`,
  );

  // Each value resumes somewhere specific, so each is asserted specifically.
  for (const v of [
    "pending — 5c not yet run",
    "REQUEST CHANGES",
    "review failed",
    "not reached",
  ]) {
    const row = subStateRows.find((r) => r.key.includes("`" + v + "`"));
    assert.ok(row, `the sub-state table must carry a row keyed on ${v}`);
  }
});
