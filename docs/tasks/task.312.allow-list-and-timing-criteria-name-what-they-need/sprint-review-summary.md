# Sprint Review Summary - Allow-list and timing criteria name what they need

**Story/Task ID:** task.312
**Completed Date:** 2026-11-23
**Completed By:** develop-task pipeline
**Pull Request:** [#932](https://github.com/Gamaroff/agent-skills/pull/932)

---

## Summary

Two review gaps are closed. `review-task` now checks that an allow-list replacing a deny-list covers the whole set it gates, and the authoring and review prompts steer wall-clock bounds to a measurable statistic.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `review-task` check 32 states its trigger, coverage rule and Important severity; removing the coverage rule turns its test red
- [x] Check 32 requires a write-by-operand probe for each unaudited member, with `uniq in out` as the fixture
- [x] `create-task` 3.5 and `review-task` carry the same timing-statistic rule, held by a parity test
- [x] `bundle:check`, `format:check` and `ci:fast` pass; `quick_validate.py` passes for the three skills
- [x] `CHANGELOG.md` entry citing task 312

### Key Features Implemented

- **Allow-list coverage check**: a table must list every member of the set or state the count and its command, and each member left open is probed for a write by operand
- **Timing statistic rule**: a wall-clock bound names where it is measured and how load is controlled, and prefers a paired, interleaved ratio or CPU time over a ratio of medians on a shared host

---

## Technical Details

### Files Modified/Created

- `skills/review-task/SKILL.md` - check 32, its pattern bullet, Issues to Flag clause, Anti-Hallucination rule 16, timing sentence
- `skills/review-story/SKILL.md` - sibling check 20
- `skills/create-task/SKILL.md` - timing sentence
- `tests/review-allow-list-timing-checks.test.js` - 9 presence tests, one executes the `uniq` probe

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Unit Tests:** 9 new tests in `tests/review-allow-list-timing-checks.test.js`; 60 of 60 neighbouring review-check tests pass
- **Mutation proofs:** both rules turn a committed test red when reverted
- **Fast gate:** 8733 pass, 0 fail on the LAN server; all 6 CI checks green on the PR head
- **QA:** 1 cycle, gate PASS 95/100; PR review APPROVE

---

## Security & Compliance

Security review passed: no boundary function added. Compliance is not applicable.

---

## Documentation

- [x] CHANGELOG `[Unreleased]` entry added

---

## Known Limitations & Future Work

- Both checks are presence-tested only: whether a reviewer applies them is a behaviour no CI layer exercises.
- Optional: reword criterion Functional 3 to name Step 6 check 4 instead of check 22.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done._
