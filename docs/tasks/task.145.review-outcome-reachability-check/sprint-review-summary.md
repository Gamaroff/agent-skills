# Sprint Review Summary - review-task: trace a criterion's stated outcome through the function that decides it

**Story/Task ID:** task.145
**Completed Date:** 2026-09-25
**Completed By:** develop-task pipeline (Claude), for the repository maintainer
**Pull Request:** [#485](https://github.com/Gamaroff/agent-skills/pull/485)

---

## Summary

Review skills now check that a success criterion's stated outcome is one its named function can
return for the stated input. They walk the input through the function's branches as the plan leaves
them. A criterion that cannot be met is caught at review, not discovered at develop (obs #168).

---

## What Was Delivered

### Acceptance Criteria Met

- [x] review-task Step 3 check 10, "Outcome reachability", with the task.144 worked example, Important/Optional severities and a hallucination-pattern line
- [x] create-task 3.5, review-story Step 4 (check 7) and review-bug Step 3 carry the check
- [x] A population test fails, naming the section or element, when the check or an element is removed
- [x] The test runs well under one second with no network access
- [x] Every new assertion is mutation-proven
- [x] `ci:fast`, `format:check` and `bundle --check` are clean
- [x] CHANGELOG `[Unreleased]` cites task 145
- [x] Hand run against task.144's pre-fix criterion recorded (reported as Important, check 10)

### Key Features Implemented

- **Planned-state reachability**: an outcome that a named phase (or task) produces is reachable even when today's code cannot return it, as long as that phase states the condition and the outcome.
- **Author, not auto-fix**: create-task puts an unreachable outcome to the author and never rewrites the criterion to match what today's code returns.
- **review-bug variant**: the check asks whether the Expected outcome can be returned after the fix. If the named function already returns it, the bug is routed to STALE.

---

## Technical Details

### Files Modified/Created

- `skills/review-task/SKILL.md` - check 10 and hallucination-pattern line
- `skills/create-task/SKILL.md` - 3.5 Critical bullet
- `skills/review-story/SKILL.md` - Step 4 check 7 and pattern line
- `skills/review-bug/SKILL.md` - Step 3 bullet; STALE routing and precedence
- `tests/outcome-reachability-check.test.js` - population test (heading-bounded, fence-aware section and item readers)
- `CHANGELOG.md` - `[Unreleased]` entry

### Architecture/Design Decisions

- Elements are held per citing item, not per section, so a sibling item cannot satisfy the test on the item's behalf.
- Reachability is judged against the planned state (QA cycle 2), not today's code.

### Dependencies

None.

---

## Testing & Quality Assurance

### Test Coverage

4003 tests, 0 failures. The population test is mutation-proven each cycle.

### Code Review

Six QA cycles (80, 60, 70, 90, 90, 90). The final gate is CONCERNS, with one test-strength residual. The Step 5c `/review-pr` returned CONCERNS (advisory).

---

## Security & Compliance

### Security Review

PASS. The change is prose and a test; nothing in it accepts or rejects input.

### Compliance Review

Not applicable.

---

## Documentation

### Updated Documentation

The four SKILL.md files are the deliverable, plus the CHANGELOG entry.

### Documentation Links

- [Task document](./task.145.review-outcome-reachability-check.md)
- [DoD summary](./task.145.dod.1.review-outcome-reachability-check.md)

---

## Demo Notes

### How to Verify

`command node --test tests/outcome-reachability-check.test.js`. Then delete check 10 from `skills/review-task/SKILL.md` and re-run; the test goes red and names the site.

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

A reviewer catches a criterion like task.144's (`present-but-inert` promised for a fixture that `computeVerdict` scores `absent`) before develop starts.

### Technical Impact

The review family gains a behavioural check alongside the existence checks.

---

## Known Limitations & Future Work

### Current Limitations

- `NAMED_PHASE` holds the naming sentence by verb only, and its noun is site-agnostic (bug 11 / CR6-1, 5c CR-2).
- review-bug's walk-only STALE trigger can override a pre-pass `reproduces: likely` (5c CR-1).

### Suggested Follow-Up Stories

- Per-site `NAMED_PHASE` hold (bug 11).
- Constrain review-bug's walk-only STALE trigger by the pre-pass, and record the precedence change in scope (5c CR-1, PC-2).
- QA Testing Results section write engine: task.155 (#486).

---

**Status:** ✅ **ACCEPTED**
