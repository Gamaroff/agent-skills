// NEGATIVE CONTROL — task 89, survivor 1. The parsed-row keying that closed
// instances 3 and 4, taken verbatim from
// evals/shared/tests/pr-review-loop-parity.test.mjs at 18dd5b5 (:159-198).
//
// Gate 11 attacked this nine ways — decoy verdict row, merged cells, table
// relocated out of 5c, blank line inserted mid-table, right-destination /
// wrong-verdict swap — and every one was caught BY NAME. It is the mechanism
// this lint's suggested replacement recommends, so flagging it would mean the
// lint punishes the fix it asks for.
//
// EXPECT: NOT flagged.
"use strict";
const assert = require("node:assert/strict");

/** The single row whose verdict cell names `v`. */
function verdictRow(v) {
  const matches = verdictRows().filter((r) => r.verdict.includes(v));
  assert.equal(
    matches.length,
    1,
    `expected exactly ONE verdict row for "${v}", found ${matches.length}`,
  );
  return matches[0].action;
}

test("each 5c verdict maps to ONE destination, read off its own row", () => {
  const rc = verdictRow("REQUEST CHANGES");
  assert.match(
    rc,
    /Return to \*\*5b\*\*/,
    "REQUEST CHANGES must route back to 5b as a DIRECTIVE — a clause elsewhere in the cell mentioning 5b is not a destination",
  );
  assert.doesNotMatch(
    rc,
    /exit the loop|proceed to Step 7|Return to \*\*5a\*\*/,
    "REQUEST CHANGES is still inside the loop — it must not exit, and must not re-enter at 5a",
  );
});
