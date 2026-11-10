# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.5.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.5.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Cycle 4's default-deny on the loose literal held. The independent safety re-probe found a fifth route: a substitution literal split across adjacent quote tokens, which has no dollar-paren or backtick text in the source. QA reproduced it under bash 5.3 for a here-string to `read`, `printf -v`, and a mixed-quote split. All three classify `runnable` and write a file; controls stay clean. This was the last permitted gate.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

Direct tools plus one read-only Explore subagent for the diff review (code route; cycle 5, whole branch diff of 4186 lines, safety re-probe directive; the prior gate failed on security). The reviewer ran about 60 variants in about 6 minutes (measured from its completion notice); its independent review ran. It timed five growth patterns to N=32000 (linear) and did not check shipped helpers for over-refusal.

Re-review scope: unscoped (prior gate failed on security). CI on d98862398214: green.

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-7 escaped unquoted word | FIXED |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3300` — a literal split across adjacent quote tokens carries no substitution text in the source (T293-QA-8).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | Real-bash table, 383/383 tests |
| Phase 2: refuse | CONCERNS | Partial | A fifth carrier |
| Phase 3: prove | PASS | Verified | Differential, docs scan, mutations |

**Overall Phase Completion**: 3/3 ticked, 2 of 3 verified clean.

---

## Success Criteria Verification

Unchanged except that the differential atoms do not contain the split-literal shapes. CHANGELOG cites `(task 293)`. Criteria drift: clean.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T293-QA-8, split literal**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: `read x <<< "a[$""(touch W)]"; echo $((x))`, `printf -v x "%s" "a[$""(touch W)]"; echo $((x))` and a mixed double/single-quote split each classify runnable and create W. Controls (a number for the command): runnable, no write.
- **Impact**: a documented block can run a command the classifier promised to refuse.
- **Recommendation**: see the gate. The budget is spent, so this is a decision for the owner: waive with the residual recorded, or narrow T293 and design the remainder differently (allow-list of known-safe words rather than detection of hazardous text).
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

- **Performance**: PASS (linear to N=32000; docs scan +1.3%).
- **Reliability**: PASS (CI green; `ci:fast` 8346 tests, 0 fail at the cycle-4 fix).
- **Security**: FAIL (measured; 31 probes, 0 escaped; one reproduced bypass beyond the corpus).
- **Maintainability**: CONCERNS (five gates, five new routes; text-level detection of the literal has been widened four times).

---

## Code Review

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:3300` — a split literal has no `$(` in the source → promoted to T293-QA-8, reproduced by QA (origin: code-review, reproduced by QA).

**Cleanups (0).**

Reproduction (bash 5.3.20, scratch directory per case): calibration `x=5; echo $((x + 1))` runnable, no write; calibration `[[ a\[\$\(touch\ W\)\] -eq 1 ]]` mutating, writes. Findings: three forms runnable, wrote W. Controls: runnable, no write.

---

## Regression Testing

Not re-run in full this cycle; CI on the head is green.

---

## Recommendations

### Immediate Actions (Blocking)
1. Owner decision: waive with the residual recorded, or narrow T293 and file the remainder as a new task with an allow-list design.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced bypass; the QA budget (5 gates) is spent.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.293.qa.5.qa-snippet-classifier-indirect-evaluation.md`
**Gate File**: co-located at `task.293.gate.5.qa-snippet-classifier-indirect-evaluation.yml`
**Next Steps**: HALT per the loop limit; owner decides
