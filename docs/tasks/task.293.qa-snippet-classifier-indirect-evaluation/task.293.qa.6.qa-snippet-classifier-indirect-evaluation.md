# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.6.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.6.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Gate 6 ran on one owner-granted extra cycle, scoped to routes that keep the substitution text in the source (the three documented residuals were excluded). The independent reviewer ran about 100 probes and found one in-scope route: a quoted substitution inside an indexed-array compound-assignment subscript (`a=([0'$(touch W)']=1)`). QA reproduced it under bash 5.3; the control is clean.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

Direct tools plus one read-only Explore subagent for the diff review (code route; gate 6, whole branch diff of 4489 lines, safety re-probe; the prior gate failed on security). The reviewer ran about 6 minutes (measured from its completion notice); its independent review ran. No engine change since gate 5. CI on 6add0f42ac31: pending at the read.

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-8 split literal | ACCEPTED AS DOCUMENTED RESIDUAL (owner, 2026-11-10) |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3285` — the quote-after-bracket rule misses a quote that follows a character after the bracket, and a bracket after an open paren has no `name[` for the live-expansion rule (T293-QA-9).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | 383/383 tests |
| Phase 2: refuse | CONCERNS | Partial | One bracket-rule gap |
| Phase 3: prove | PASS | Verified | Differential, docs scan |

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T293-QA-9, array compound assignment**
- **Observation**: `a=([0'$(touch W)']=1); echo hi`, its backtick form, and a letter for the digit each classify runnable and create W. Control `a=([0'5']=1); echo hi`: runnable, no write.
- **Recommendation**: refuse a substitution literal inside an unclosed bracket in `name=(` or `name+=(`; add table and decider rows.
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## Code Review

**Correctness bugs (1):** [high/high] `shared/resources/qa-execute-snippets.mjs:3285` — promoted to T293-QA-9, reproduced by QA.

**Cleanups (1):** [low/medium] `shared/resources/tests/qa-execute-snippets.test.mjs:5290` — a test titled "keeps its pinned reason" asserts only `mutating`, so it cannot fail on the ordering it names. Advisory.

Reproduction (bash 5.3.20, scratch directory per case): calibration `x=5; echo $((x + 1))` runnable, no write; `[[ a\[\$\(touch\ W\)\] -eq 1 ]]` mutating, writes. Findings: three forms runnable, wrote W. Control: runnable, no write.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced in-scope bypass; the extra cycle is spent.
**Quality Score**: 85/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: owner decision (one more cycle, or accept as a documented residual)
