# Sprint Review Summary - Task registry rows sit under the table header

**Story/Task ID:** task.317
**Completed Date:** 2026-11-21
**Completed By:** Lorien Gamaroff
**Pull Request:** [#928](https://github.com/Gamaroff/agent-skills/pull/928)

---

## Summary

The 32 task registry rows that sat after the `## Notes` section (tasks 286 to 317) are back under the table header. A committed test now fails if any row leaves the table, and the writers' prose says where a new row goes.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every registry row lies in the one table block under the header, held by a committed test with a 317-row floor
- [x] `registry-tick.js --annotate` on a formerly stranded row answers `annotated`, recorded in the QA report
- [x] The placement test fails when one row is moved after `## Notes`, recorded with the test that went red
- [x] No performance criterion applies
- [x] `task-registry-drift.test.mjs` and `npm run ci:fast` pass
- [x] CHANGELOG `[Unreleased]` cites (task 317)

### Key Features Implemented

- **Rows moved:** 32 rows, byte for byte, under the table header.
- **Placement test:** `placementOf` in the drift test, with a non-vacuity floor and a synthetic stranded-row case.
- **Writer prose:** `/create-task` and the registry standard say a new row goes after the last row of the table.

---

## Technical Details

### Files Modified/Created

- `docs/tasks/task-registry.md` - rows 286 to 317 moved under the header
- `evals/shared/tests/task-registry-drift.test.mjs` - placement test
- `docs/standards/task-registry.md` and `skills/create-task/SKILL.md` - the placement rule
- `CHANGELOG.md` - entry for task 317

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Tests:** 2 tests added to the drift file (8 of 8 pass); `ci:fast` 8709 pass
- **QA:** two cycles; gate PASS 100/100; one advisory item kept as a future recommendation
- **PR review:** APPROVE (conformance lens)
- **CI:** all six checks green on the final code head

---

## Security & Compliance

Security review passed with no boundary deliverable. Compliance review not applicable.

---

## Documentation

- [x] CHANGELOG updated
- [x] Registry standard and `/create-task` prose updated

---

## Demo Notes

### How to Verify

1. Run `node --test evals/shared/tests/task-registry-drift.test.mjs`. Expect 8 of 8 pass.
2. Move any registry row below `## Notes` and re-run it. The placement test fails and names the row.

---

## Impact & Value

### Technical Impact

`registry-tick.js --annotate` can find the notes cell again, so `/develop-next` merge steps stop answering `no-cell`.

---

## Known Limitations & Future Work

- `placementOf` does not trim lines or skip code fences. No divergence from the real parsers was reproduced, so it is advisory.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
