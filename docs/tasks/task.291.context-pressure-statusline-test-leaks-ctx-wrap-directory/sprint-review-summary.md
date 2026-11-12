# Sprint Review Summary - The context-pressure statusline test leaks a ctx-wrap- temp directory

**Story/Task ID:** task.291
**Completed Date:** 2026-11-12
**Completed By:** develop-next pipeline
**Pull Request:** [#883](https://github.com/Gamaroff/agent-skills/pull/883)

---

## Summary

A test that sometimes left a `ctx-wrap-` folder in the temp directory, which made CI fail now and then, no longer does. The fix is in the test's cleanup and a new test holds it.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The leak count is 0 in 100 runs after the fix (it was 1 unloaded and 3 under load before)
- [x] A new test fails when the fix is reverted
- [x] The full test suite and the temp-leak check pass without listing `ctx-wrap` as an allowed leak
- [x] The five existing tests run no slower than before (median 335 ms against 421 ms on develop); the new test's deliberate 150 ms is recorded separately
- [x] The changelog cites the task and the bundle check reports 0 problems

### Key Features Implemented

- **Cleanup that waits for the recorder**: the test's cleanup waits, up to 3 seconds, for the background recorder's file before it removes the folder, so the recorder cannot recreate it.
- **Regression test**: runs a deliberately slow recorder and checks no `ctx-wrap-` folder survives.

---

## Technical Details

### Files Modified/Created

- `shared/resources/tests/lib/tmp-state-cleanup.mjs` - new cleanup helper
- `shared/resources/tests/context-pressure-statusline.test.mjs` - uses the helper; new regression test
- `CHANGELOG.md` - entry for task 291

### Architecture/Design Decisions

The cause was a background process outliving its directory, so the fix waits for the process rather than retrying the removal. The recorder and the wrapper script were not changed.

---

## Testing & QA

- QA gate: PASS (100/100) after two cycles. The first cycle's one finding was a performance bound that could not hold while the new test sleeps on purpose; the owner amended it.
- PR review: APPROVE.
- CI: green on the final code.

## Known Limitations and Future Work

- The new test is red on revert only while cleanup runs before its 150 ms stand-in finishes; on a heavily loaded machine a revert could read green. The fix is unaffected.
- `TEST_LOCAL=1 npm run test:remote` makes 14 tests in `tests/test-remote-runner.test.js` fail (19 of 19 pass without it). Unrelated; worth its own task.
