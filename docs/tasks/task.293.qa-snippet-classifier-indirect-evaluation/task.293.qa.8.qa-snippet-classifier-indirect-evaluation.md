# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.8.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.8.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Gate 8 ran on a third owner-granted extra cycle, scoped to routes that keep the substitution text in the source. The independent reviewer ran about 35 probes and found a neighbour of the gate-7 fix: the bracket depth resets at a separator character even inside a quoted span, so a quoted semicolon before the literal loses the open bracket. QA reproduced it under bash 5.3; the control is clean.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

Direct tools plus one read-only Explore subagent for the diff review (code route; gate 8, whole branch diff of 5147 lines, safety re-probe; the prior gate failed on security). The reviewer finished in under a minute (measured from its completion notice); its independent review ran. CI on 5c905cd40215: pending at the read.

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-10 paren inside the subscript | FIXED |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3155` — depth reset at a separator inside a quoted span (T293-QA-11).

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T293-QA-11, quoted separator resets the depth**
- **Observation**: `a=([';'0'$(touch W)']=1); echo hi` and `a=(["0;"'$(touch W)']=1); echo hi` classify runnable and create W. Control `a=([';'0'5']=1); echo hi`: runnable, no write.
- **Recommendation**: never reset the depth; an unclosed bracket earlier in the block refuses a quoted substitution literal.
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

- **Performance**: PASS. **Reliability**: PASS. **Security**: FAIL (31 probes, 0 escaped; one reproduced bypass). **Maintainability**: CONCERNS.

---

## Code Review

**Correctness bugs (1):** [high/high] `shared/resources/qa-execute-snippets.mjs:3155` — promoted to T293-QA-11, reproduced by QA.

Reproduction (bash 5.3.20, scratch directory per case): calibration `x=5; echo $((x + 1))` runnable, no write; `a=([0+(1)'$(touch W)']=1); echo hi` mutating, writes. Findings: two forms runnable, wrote W. Control: runnable, no write.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced in-scope bypass; the extra cycle is spent.
**Quality Score**: 85/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: owner decision
