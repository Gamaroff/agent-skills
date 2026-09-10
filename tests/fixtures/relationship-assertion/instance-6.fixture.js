// FIXTURE — task 89, instance 6.  Found INSIDE the fix for instance 5.  Closed by 18dd5b5.
// The containment fix was correct; its pattern was not. `--stage ready-for-merge`
// is a strict PREFIX of `--stage ready-for-merge-RELOCATED`, so a renamed call
// satisfies the match. Caught by mutating the fix itself, in the same edit —
// the substring trap that produced five findings, one level down.
// The shipped version needed the negative lookahead: /--stage ready-for-merge(?![-\w])/
// EXPECT: flagged (rule B) — unbounded literal ending on a renameable token.
"use strict";
const assert = require("node:assert/strict");

test("ready-for-merge sits inside 5c, after the review clears", () => {
  assert.match(
    section5c(),
    /--stage ready-for-merge/,
    "ready-for-merge must sit INSIDE 5c, and it must be THAT stage that fires there",
  );
});
