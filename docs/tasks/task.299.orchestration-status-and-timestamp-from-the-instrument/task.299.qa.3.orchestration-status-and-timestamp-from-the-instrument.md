# QA Report: Task 299 - Orchestration reads status and time from the instrument

**Task**: [Link to task document](./task.299.orchestration-status-and-timestamp-from-the-instrument.md)
**Gate File**: [task.299.gate.3.orchestration-status-and-timestamp-from-the-instrument.yml](./task.299.gate.3.orchestration-status-and-timestamp-from-the-instrument.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's two findings are fixed. The reviewer scanned all 192 population files with the new matcher: zero shipped lines flagged, and both shipped background forms pass. One new medium: an apostrophe in prose is read as a quote opener.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus one read-only Explore reviewer. Diff review: code review. Re-review scope: files changed since gate 2 (head 07a9b8a189dc; 5 files, one of them code) — default. The review patch was `tests/orchestration-instrument-reads.test.js` against the PR base. Remote `ci:fast` was green on the fix commit (exit 0).

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T299-QA-4 quoted `>` read as a redirect | ✅ FIXED (quoted text masked once; fixture and mutation proof) |
| T299-QA-5 split inside quotes; single `&` / `|` | ✅ FIXED (same; reviewer re-probed) |

## New Findings This Cycle

- **[medium]** `tests/orchestration-instrument-reads.test.js:63` — every apostrophe opens a quote, so `Don't write cmd; echo "rc=$?"` passes (T299-QA-6)
- **[low]** `tests/orchestration-instrument-reads.test.js:77` — REDIRECT drops `&>` and `1>`, flags a captured `x=$(cmd; echo $?)` (CR-2, advisory)

---

## Implementation Verification

Phases 1 and 2 PASS. Phase 3 CONCERNS (one edge in the guard).

## Success Criteria Verification

Unchanged: all PASS except the guard's own claim. `criteria-drift.js`: clean.

---

## Issues Found

### MEDIUM Severity Issues (1)

T299-QA-6, reproduced by execution; controls: `Do not write cmd; echo "rc=$?"` flagged, the shipped background form passes.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

Performance PASS. Reliability CONCERNS. Security PASS (reasoned, `boundary: false`). Maintainability PASS.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `tests/orchestration-instrument-reads.test.js:63` — apostrophe opens a quote (promoted: T299-QA-6)

**Cleanups (1):**
- `tests/orchestration-instrument-reads.test.js:77` — REDIRECT exclusion is wider than `2>` and `N>&M`

Reviewer calibration: identity pair holds; population scan clean (192 files, the only shipped `echo ...$?` lines are the two background forms).

mutation-proven: not re-run by QA this cycle; the developer's cycle 2 proofs are `dev-only`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — fix T299-QA-6.

---

**Next Steps**: `/qa-fix` T299-QA-6 (open single quotes at a word boundary only) with fixtures in both directions.
