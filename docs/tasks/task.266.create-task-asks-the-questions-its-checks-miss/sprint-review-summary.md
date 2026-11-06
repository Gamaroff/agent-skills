# Sprint Review Summary - create-task asks the questions its checks miss

**Story/Task ID:** task.266
**Completed Date:** 2026-11-06
**Completed By:** Lorien Gamaroff
**Pull Request:** [#851](https://github.com/Gamaroff/agent-skills/pull/851)

---

## Summary

`create-task` now asks five more questions while a task is being written, so five known plan mistakes fail at the author's desk and not one review later. `finalise` also grades a timing bound on at least five runs.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Five items in `create-task` § 3.5, each firing on its motivating shape
- [x] Each item leaves its control draft unflagged
- [x] `finalise-dod-ac-prompt.md` names run count and statistic for a wall-clock bound
- [x] `npm test` wall time within 10% of `develop` (median 733.2 s vs 737.1 s)
- [x] Contract tests, `bundle --check` and `quick_validate` pass
- [x] No item restates a section list

### Key Features Implemented

- **Four Critical items**: a rule specified from one example; a classifier and a writer that read the input differently; a second defence with no test of its own; a seeded remedy that overrides a decision the tests hold (`--from-observation` only).
- **One Should Add item**: a timing bound that names one run.
- **Finalise clause**: a wall-clock bound is graded on the median of at least five runs, each with load recorded.

---

## Technical Details

### Files Modified/Created

- `skills/create-task/SKILL.md` - five § 3.5 items
- `shared/resources/finalise-dod-ac-prompt.md` - run-count clause
- `skills/finalise/references/`, `skills/review-story/references/`, `skills/review-task/references/` - regenerated bundled copies
- `CHANGELOG.md` - entry citing task 266

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Behavioural evidence:** eleven drafts against the new and the unchanged § 3.5 (one run per arm).
- **Contract tests:** 50 of 50 pass.
- **QA gate:** PASS, 97/100, after three cycles.
- **PR review:** APPROVE.

---

## Security & Compliance

Not applicable: prose only, no input boundary, no regulated data.

---

## Demo Notes

### How to Verify

1. Open `skills/create-task/SKILL.md` § 3.5 and find the four new Critical items and the timing-bound item.
2. Read `task.266.qa.1` for the eleven-draft table and `task.266.qa.3` for the timing table.

---

## Known Limitations & Future Work

- The behavioural evidence is one run per arm, written by the implementer.
- `tests/bundle-missing-source.test.js` runs near its 20 s budget and failed once under load.
- Task 267 holds the matching `review-task` checks. Observation #34 stays open.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
