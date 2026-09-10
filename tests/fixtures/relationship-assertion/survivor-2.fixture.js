// NEGATIVE CONTROL — task 89, survivor 2. The shape of
// shared/resources/advance-pipeline-lock.test.sh, rendered in JS so the same
// analyser sees it.
//
// Gate 11 verified this is a real mapping check because it RUNS the script and
// asserts the resulting step, rather than matching prose about it. An
// execution-backed assertion is the strongest form of the property this lint
// exists to protect, and must never be flagged.
//
// EXPECT: NOT flagged.
"use strict";
const assert = require("node:assert/strict");

test("nested commit-changes preserves the lock and does not advance the step", () => {
  for (const step of [4, 5, 6]) {
    writeLock(step);
    run(SCRIPT, ["--skill", "commit-changes"]);
    assert.ok(
      existsSync(LOCK_FILE),
      `nested commit-changes at step ${step} must preserve the lock — the PreCompact and Stop hooks both read it`,
    );
    assert.equal(
      readLock().current_step,
      step,
      `nested commit-changes at step ${step} must not advance the step`,
    );
  }
});
