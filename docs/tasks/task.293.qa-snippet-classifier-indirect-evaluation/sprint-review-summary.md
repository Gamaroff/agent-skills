# Sprint Review Summary - QA snippet classifier refuses indirect evaluation

**Story/Task ID:** task.293
**Completed Date:** 2026-11-10
**Completed By:** Lorien Gamaroff (pipeline run by `/develop-next`)
**Pull Request:** [#870](https://github.com/Gamaroff/agent-skills/pull/870)

---

## Summary

The QA snippet classifier no longer lets a shell block run when bash would evaluate quoted or assembled text as code. It refuses the whole class instead of one spelling at a time. Three narrow shapes remain open by the owner's decision and are documented.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every spelling in the task's section 2 classifies `mutating`, checked under real bash.
- [x] The control instance classifies `mutating` and the safe blocks stay `runnable`.
- [x] The differential run writes nothing (4000 blocks per family, 0 writes).
- [x] Docs scan median +2.3% against the +10% bound; differential slice median 6.9 s against 10 s.
- [x] Suite green, `bundle:check` clean, every change mutation-proven, `CHANGELOG.md` cites `(task 293)`.
- [x] The one docs-scan block newly refused is listed with its reason.

### Key Features Implemented

- **Indirect-evaluation refusal**: array subscripts, `printf -v`, `read`, `test -v`, `PS4`, `${x@P}`, `$((x))` and similar routes classify `mutating`.
- **Default-deny rules**: a quoted substitution literal, a loose `$(` text, an assembled value and an open bracket are refused when the block can evaluate them.
- **Differential `indirect` atoms**: a new generator set that checks the classifier against real bash.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs` - the classifier rules
- `shared/resources/tests/qa-execute-snippets.test.mjs` - real-bash shape table, decider table, safe controls
- `scripts/qa-snippets-differential.mjs` - `indirect` atom sets
- `shared/resources/qa-runnable-prose-detection.md` - the documented rules and residuals
- `CHANGELOG.md`, bundled `references/` copies

### Architecture/Design Decisions

Default-deny over detection: nine QA gates showed a detector of hazardous text cannot be exhaustive. The owner narrowed the task at gate 5 and moved the allow-list redesign into its own task.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. Some prose blocks that were `runnable` are now refused (one in the docs corpus).

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 383 tests in `shared/resources/tests/qa-execute-snippets.test.mjs`
- **Differential:** 4000 blocks per family against real bash, 0 writes

### Code Review

- **Reviewers:** independent QA reviewer at nine gates; `/review-pr` conformance lens
- **Approval Status:** ✅ APPROVE
- **Review Comments Addressed:** all

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] The boundary was probed: 31 candidates executed, 0 reproduced, 0 escaped
- [x] No secrets or `eval` introduced
- Three known residual shapes are documented, not hidden

### Compliance Review

Not applicable: no data, payment, UI or health scope.

---

## Documentation

- [x] `shared/resources/qa-runnable-prose-detection.md` updated
- [x] `CHANGELOG.md` entry

---

## Known Limitations & Future Work

### Current Limitations

- A value built with `printf` octal escapes, a `[` or `$` that arrives by expansion, and a literal split across quote tokens are not refused.
- An unbalanced `[` in earlier text refuses a later quoted substitution literal (over-refusal by design).

### Suggested Follow-Up Stories

- Allow-list design: run only blocks whose every word is a known-safe literal (closes the residuals).
- Two advisory test cleanups recorded in gate 9.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
