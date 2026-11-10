# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.7.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.7.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Gate 7 ran on a second owner-granted extra cycle, scoped to routes that keep the substitution text in the source. The independent reviewer ran about 20 probes and found a direct neighbour of the gate-6 fix: `inSubscriptWord` stops at a paren, so a paren inside the subscript hides the `[`. QA reproduced it under bash 5.3; the control is clean.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

Direct tools plus one read-only Explore subagent for the diff review (code route; gate 7, whole branch diff of 4919 lines, safety re-probe; the prior gate failed on security). The reviewer finished in under a minute (measured from its completion notice); its independent review ran. CI on 069892fa22e3: pending at the read.

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-9 array compound subscript | FIXED |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3146` — the backward scan stops at a paren (T293-QA-10).

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T293-QA-10, paren inside the subscript**
- **Observation**: `a=([0+(1)'$(touch W)']=1); echo hi` and `a=([(0)+'$(touch W)']=1); echo hi` classify runnable and create W. Control `a=([0+(1)'5']=1); echo hi`: runnable, no write.
- **Recommendation**: track bracket depth backwards, or refuse a quoted substitution literal with an unclosed `[` earlier in the same segment.
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

- **Performance**: PASS. **Reliability**: PASS. **Security**: FAIL (31 probes, 0 escaped; one reproduced bypass). **Maintainability**: CONCERNS.

---

## Code Review

**Correctness bugs (1):** [high/high] `shared/resources/qa-execute-snippets.mjs:3146` — promoted to T293-QA-10, reproduced by QA.

Reproduction (bash 5.3.20, scratch directory per case): calibration `x=5; echo $((x + 1))` runnable, no write; `a=([0'$(touch W)']=1); echo hi` mutating, writes. Findings: two forms runnable, wrote W. Control: runnable, no write.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced in-scope bypass; the extra cycle is spent.
**Quality Score**: 85/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: owner decision
