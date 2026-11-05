# Sprint Review Summary - Untrusted-content rule

**Story/Task ID:** task.261
**Completed Date:** 2026-11-05
**Pull Request:** [#839](https://github.com/Gamaroff/agent-skills/pull/839)

---

## Summary

Added one shared rule that says text written by someone else (issue and PR bodies, comments, web pages) is data, never instructions. Every skill that reads such text now cites it, a lint test keeps it that way, and a path taken from an issue body must now stay under `docs/`.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `shared/resources/untrusted-content-rule.md` states six parts in 52 lines
- [x] Six read sites cite the rule by fragment
- [x] A derived path outside `docs/` or climbing out with `..` stops the run, at review-task, review-story and the develop Step 0 doc
- [x] A lint test fails when a citation is removed; mutation-proven
- [x] Full CI, validate and bundle checks green

### Key Features Implemented

- **Rule document**: the six-part rule, bundled into the skills that cite it
- **Citations**: browser-use, explain-simply, review-pr, review-task, review-story and the develop Step 0 doc
- **Path bound**: a shell check with its own heading, run by 60 probe cases with no defect
- **Lint test**: 27 tests, 0.4 s, with a non-vacuity floor and controls

---

## Technical Details

### Files Modified/Created

- `shared/resources/untrusted-content-rule.md` - the rule
- `skills/*/SKILL.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` - citations and the path bound
- `tests/untrusted-content-rule.test.js` - lint and behaviour tests
- `CHANGELOG.md` - entry

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. A task document outside `docs/` now stops a run that derives its path from an issue body.

---

## Testing & Quality Assurance

- **Unit Tests:** 27 in `tests/untrusted-content-rule.test.js`
- **QA:** 3 gates (CONCERNS 90, CONCERNS 80, PASS 95); 2 fix cycles
- **PR Review:** APPROVE

---

## Security & Compliance

Security PASS. Compliance not applicable (internal guardrails task).

---

## Known Limitations & Future Work

- The rule is advice to the model; only the path bound and the lint test are mechanical.
- The `docs/` bound is fixed, not tied to a configured PRD root. A symlink inside `docs/` is not checked.
- Test hardening: CRLF in the fence regex, hostile path cases that do not show which guard fired.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
