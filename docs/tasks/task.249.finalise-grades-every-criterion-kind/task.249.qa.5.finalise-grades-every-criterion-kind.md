# QA Report: Task 249 - /finalise grades every kind of criterion fairly

**Task**: [task.249.finalise-grades-every-criterion-kind.md](./task.249.finalise-grades-every-criterion-kind.md)
**Gate File**: [task.249.gate.5.finalise-grades-every-criterion-kind.yml](./task.249.gate.5.finalise-grades-every-criterion-kind.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: PASS

---

## Re-Review Context

The previous gate was [task.249.gate.4](./task.249.gate.4.finalise-grades-every-criterion-kind.yml): PASS 95/100, with one open LOW. This review is scoped to the cycle 4 fix, `1ed99a9b..84f2b448` (84-line diff).

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T249-QA-10: a skip beside this run's own merged result | ✅ FIXED | Action 2a now HALTs and names DOC_DIR. Fence test added; mutating the HALT out turns 1 test red. The foreign-file skip test still passes as the control |

---

## Executive Summary

The QA loop has fixed all ten findings it raised. The cycle 5 reviewer traced all three branches of action 2a against Step 3c's writer and the bug-mode skip, and found no correctness defect. It returned two non-blocking cleanups, which are recorded as future recommendations. **Gate: PASS (97/100).**

---

## Testing Scope

- `npm run ci:fast` at `84f2b448`: 7040 tests, 0 fail. `bundle:check`: 0 problems.
- CI on `84f2b448` was pending at the read; `/finalise` Step 6 takes the deciding reading.
- One read-only Explore reviewer: 2 cleanups in 107 s, both verified at the lines they cite.
- `criteria-drift.js`: clean.
- `ciResolution` probe: 13 executed, 0 reproduced, 0 escaped. Record: [task.249.qa.5.security.run.json](./task.249.qa.5.security.run.json).

---

## Issues Found

HIGH 0 · MEDIUM 0 · LOW 0.

Future recommendations (cleanups):
- Add two skip tests for the no-record HALT's other two conditions: a different DOD_N, and a reason other than `merged`.
- Bind `OWN_RUN` once, beside `OWN_DOC`.
- Carried from cycle 4: normalise backslash paths before the basename cut.

---

## NFR Assessment

| NFR | Result |
| --- | --- |
| Performance | PASS |
| Reliability | PASS |
| Security | PASS (measured) |
| Maintainability | PASS |

---

## Recommendations

Exit the QA loop to the 5c PR review.
