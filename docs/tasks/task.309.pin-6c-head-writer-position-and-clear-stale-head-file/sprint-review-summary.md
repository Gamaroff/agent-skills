# Sprint Review Summary - Pin the 6c head writer position and clear the stale head file

**Story/Task ID:** task.309
**Completed Date:** 2026-11-15
**Pull Request:** [#909](https://github.com/Gamaroff/agent-skills/pull/909)
**Tracker issue:** [#908](https://github.com/Gamaroff/agent-skills/issues/908)

---

## Summary

`/finalise` step 6c now clears the previous run's recorded-head file along with the result and pid files, and a test pins that the head writer sits after that clear and before the poll launch. Both were advisory follow-ups from task.308.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Moving the writer below the poll launch turns the order test red (mutation-proved)
- [x] A stale `finalise-ci-head-2.txt` is gone after the shipped `rm` line (mutation-proved)
- [x] The later-turn reader is unchanged; its tests stay green
- [x] Bundle clean, `validate` passes, CHANGELOG cites `(task 309)`, fast gate 0 not ok

### Key Features Implemented

- **Stale head cleared**: `.claude/state/finalise-ci-head-2.txt` added to the 6c `rm -f`, so an aborted run leaves no head and the later turn HALTs "not recorded" instead of reading an old one.
- **Order pinned**: an assertion holds `rm` before the writer before the `nohup` launch.

---

## Technical Details

### Files Modified/Created

- `skills/finalise/SKILL.md` - head file added to the `rm -f`, explanatory comment
- `evals/shared/tests/finalise-publish-boundary.test.mjs` - order assertion and a clear test over the shipped lines
- `shared/resources/develop-pipeline-hooks.md` (+ three bundled copies) - one clause
- `CHANGELOG.md` - entry citing task 309

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Tests:** 48 in `finalise-publish-boundary.test.mjs`; fast gate 8477 tests, 8474 pass, 0 fail, 3 skipped
- **QA gate:** PASS, 100/100 (one cycle); 5c PR review CONCERNS, no open coverage finding
- **Security:** PASS (not a boundary). **Compliance:** not applicable.

---

## Known Limitations & Future Work

- CR-1: the 6c poll block reads `CI_HEAD_2` and `PR_NUMBER` without binding them in-block (pre-existing; separate task).
- CR-2: the rerun half of the clear test is redundant (optional trim).
