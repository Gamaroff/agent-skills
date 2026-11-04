# Sprint Review Summary - finalise checks record criteria before the DoD run

**Story/Task ID:** task.259
**Completed Date:** 2026-11-04
**Pull Request:** [#833](https://github.com/Gamaroff/agent-skills/pull/833)

---

## Summary

`/finalise` now checks, before it dispatches the DoD agents, that every success criterion asking for a record has that record in a committed artifact. A missing record is fixed in minutes instead of costing a failed DoD pass.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Task 257's criterion 14 lists with `artifacts`, and a criterion naming only the implementation report reads `implementation-report-only`.
- [x] A record criterion naming a committed QA report, gate or DoD reads `ok`.
- [x] Step 3a runs the check before the dispatch, and `SKILL.md` states the action for each state and the confirm step.
- [x] The three mutations each turn the named test red, recorded in the QA report's mutation table.
- [x] The engine is pure: `check()` takes lists as arguments and spawns nothing.
- [x] `CI=true` over the new test file passes and `npm run bundle:check` is clean.
- [x] `validate` passes for `skills/finalise/` and `skills/review-task/`.
- [x] CHANGELOG entry present and cited.
- [x] The trap in `traps.md` points at the check.

### Key Features Implemented

- **`finalise-record-preflight.js`**: a pure engine that finds record criteria and classifies each as `ok`, `no-location`, `implementation-report-only`, `location-uncommitted` or `location-absent`.
- **Step 3a check**: runs before the dispatch, with an action per state and a step that opens each named artifact to confirm the record is in it.
- **One trigger-word definition**: the words are held equal to `review-task` check 22 by a test.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-record-preflight.js` - the engine (new), with a bundled copy under `skills/finalise/references/`
- `shared/resources/tests/finalise-record-preflight.test.mjs` - 17 tests (new)
- `skills/finalise/SKILL.md` - Step 3a check and the `record-preflight` bug-mode skip row
- `skills/review-task/SKILL.md` - check 22 note
- `evals/shared/tests/finalise-bug-mode.test.mjs` - the new skip key
- `docs/contributing/traps.md`, `CHANGELOG.md`

### Architecture/Design Decisions

The engine stays content-blind and lists the artifacts; a Step 3a confirm step reads them. A lexical content probe was rejected because it would have passed task 257's own QA report.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 17 tests in `shared/resources/tests/finalise-record-preflight.test.mjs`
- **Mutation proof:** three mutations, each turning its named test red

### Code Review

- **Reviewers:** QA gate PASS (95/100); PR review APPROVE
- **Approval Status:** ✅ Approved

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**: `boundary: false`. The engine is read-only, spawns `git` with an argument vector and no shell, and exits 0 on findings.

### Compliance Review

Not applicable: internal tooling with no personal data, payments, UI or health data.

---

## Documentation

- [x] `skills/finalise/SKILL.md` and `skills/review-task/SKILL.md` updated
- [x] `docs/contributing/traps.md` reworded to point at the check
- [x] CHANGELOG entry added

---

## Known Limitations & Future Work

### Current Limitations

- A mixed set of committed and untracked QA reports is listed rather than resolved (LOW, advisory).

### Suggested Follow-Up

- Make `readListings` resolve paths against the repository root when `--cwd` is not the root (the gate's future recommendation).

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
