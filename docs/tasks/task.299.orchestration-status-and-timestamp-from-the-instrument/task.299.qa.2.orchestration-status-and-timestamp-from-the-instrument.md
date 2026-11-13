# QA Report: Task 299 - Orchestration reads status and time from the instrument

**Task**: [Link to task document](./task.299.orchestration-status-and-timestamp-from-the-instrument.md)
**Gate File**: [task.299.gate.2.orchestration-status-and-timestamp-from-the-instrument.yml](./task.299.gate.2.orchestration-status-and-timestamp-from-the-instrument.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's three findings are fixed and held by committed tests. A refute pass over the whole branch diff found two more edge classes in the status matcher, both about quoted strings. Remote `ci:fast` was green on the fix commit (exit 0).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus one read-only Explore reviewer, refute pass (cycle 2): whole branch diff, bundled copies excluded, 1460 lines. Diff review: code review. Re-review scope: unscoped, refute pass (cycle 2 always takes the whole diff). CI on 07a9b8a189dc: not read this cycle beyond the pending state at gate 1 (never gates).

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T299-QA-1 status matcher misses claimed shapes | ✅ FIXED (fixtures for each shape; reviewer confirmed the identity pair) |
| T299-QA-2 no `&&` / `||` | ✅ FIXED (reproduced red by mutation in the fix cycle) |
| T299-QA-3 no status non-vacuity floor | ✅ FIXED (strip-and-rescan assertion; red under a dead matcher) |

## New Findings This Cycle

- **[medium]** `tests/orchestration-instrument-reads.test.js:44` — a `>` inside a quoted string counts as a redirect (T299-QA-4)
- **[medium]** `tests/orchestration-instrument-reads.test.js:35` — capture splits on `;`, `&`, `|` inside quotes; single `&` / `|` operators absent (T299-QA-5)
- **[low]** time regex matches any brace group holding "timestamp" (CR-3, advisory)
- **[low]** instrument pairing unanchored and file-level (CR-4, advisory; file-level pairing disclosed)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Measure | PASS | Verified | |
| Phase 2: Fix | PASS | Verified | |
| Phase 3: Guard | CONCERNS | Partial | Quoted-string edges, see above |

---

## Success Criteria Verification

Unchanged from cycle 1 (all PASS except the guard's own claim, CONCERNS). `criteria-drift.js`: clean.

---

## Issues Found

### MEDIUM Severity Issues (2)

T299-QA-4 and T299-QA-5, both reproduced by execution with a control (`cmd; echo "rc=$?"` flagged; `cmd > l 2>&1; echo "TEST_EXIT=$?" >> l` passes). Both are one subject, one file, one root cause: quoted content is not blanked before the line is parsed.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

---

## NFR Assessment

Performance PASS. Reliability CONCERNS. Security PASS (reasoned, `boundary: false`). Maintainability PASS.

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `tests/orchestration-instrument-reads.test.js:44` — quoted `>` read as a redirect (promoted: T299-QA-4)
- [medium/high] `tests/orchestration-instrument-reads.test.js:35` — split inside quotes; single `&` / `|` (promoted: T299-QA-5)
- [low/high] `tests/orchestration-instrument-reads.test.js:55` — time regex matches a bash brace group (advisory)
- [low/medium] `tests/orchestration-instrument-reads.test.js:56` — unanchored instrument pairing (advisory)

**Cleanups (0).**

Reviewer calibration: identity pair holds; matcher linear (71 ms at N=1e6).

mutation-proven: not re-run by QA this cycle; the developer's two proofs from cycle 1 are `dev-only`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — fix T299-QA-4 and T299-QA-5.

---

**Next Steps**: `/qa-fix` both in one change (blank quoted content, then parse), fixtures per shape.
