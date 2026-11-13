# Sprint Review Summary - review-task runs a plan's command and checks CI parity

**Story/Task ID:** task.298
**Completed Date:** 2026-11-13
**Pull Request:** [#897](https://github.com/Gamaroff/agent-skills/pull/897)

---

## Summary

`review-task` now runs a plan's own transfer or build command once, in a safe form, and `create-task` asks for a CI-parity line whenever a task runs CI scripts somewhere new.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `review-task` check 31 states its trigger, safe form (dry-run or scratch target), the `unrun — no safe form` fallback and its severity.
- [x] `create-task` § 3.5 "Should Add" carries the CI-parity item.
- [x] The check adds no network call or write to a real target.
- [x] `bundle:check`, `format:check` and `ci:fast` pass.
- [x] `CHANGELOG.md` entry.

### Key Features Implemented

- **Check 31 in review-task**: the reviewer runs the plan's command once against a scratch target, and never improvises a flag.
- **Parity item in create-task**: compares user, base image, shells, awk variants and tool versions with the CI workflow.
- **Presence test**: seven tests hold both rules at their sites.

---

## Technical Details

### Files Modified/Created

- `skills/review-task/SKILL.md` - check 31, pattern bullet, Issues to Flag text, Anti-Hallucination rule 15
- `skills/create-task/SKILL.md` - parity bullet in § 3.5
- `tests/review-run-and-parity-checks.test.js` - new, 7 tests
- `CHANGELOG.md` - Unreleased entry

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Unit Tests:** 7 tests in `tests/review-run-and-parity-checks.test.js`
- **Mutation proof:** removing the safe-form clause, the bullet or renaming the check turns tests red
- **QA:** gate 1 CONCERNS 90, one fix, gate 2 PASS 100
- **PR review:** APPROVE (conformance lens)

---

## Security & Compliance

Not applicable: skill prose and a test file, no boundary, no personal data.

---

## Known Limitations & Future Work

- The tests prove each rule is stated, not that a reviewer applies it.
- Advisory cleanups: an assertion that cannot fail, and a typed floor of 31 (PC-1).

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done._
