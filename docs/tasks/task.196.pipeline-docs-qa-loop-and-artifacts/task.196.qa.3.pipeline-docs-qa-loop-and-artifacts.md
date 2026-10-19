# QA Report: Task 196 - Pipeline docs: QA loop, resume and artifacts (cycle 3)

**Task**: [Link to task document](./task.196.pipeline-docs-qa-loop-and-artifacts.md)
**Gate File**: [task.196.gate.3.pipeline-docs-qa-loop-and-artifacts.yml](./task.196.gate.3.pipeline-docs-qa-loop-and-artifacts.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 re-reviewed the cycle-2 fix: 6 files changed since gate 2's head. All 7 gate-2 findings are fixed. The gate fork label, the halt and pause snapshot fields and the audit "partially resolved" line match their sources. The rewritten `no-code-moved` row raised one medium. It tells the operator to commit an untracked fix and re-invoke, but by then the orchestrator has already restored at Step 7, and a plain re-invoke no longer offers QA re-entry. Two low findings remain: the route 2c cycle floor, and the word "mechanical" for `qa-story`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL. Fix CR3-1 first.

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 route 2c trigger | ✅ FIXED | The row names the 5a fix, HIGH 0, and MEDIUM falling or 0. The cycle floor is still missing (CR3-2, low) |
| CR-2 no-code-moved row | ⚠️ PARTIAL | It names the untracked files, but the remedy's timing is wrong (CR3-1) |
| CR-3 S6half label | ✅ FIXED | Names the conditions (cycle floor: CR3-2) |
| CR-4 fork label | ✅ FIXED | "no active waiver" matches step-5-6 doc :426-434 |
| CR-5 snapshot fields | ✅ FIXED | HALT and pause field sets in both READMEs and pipeline-artifacts.md |
| CR-6 day-3 lines | ✅ FIXED | Lines 41, 58 and 77 agree. The new wording overstates `qa-story` (CR3-3, low) |
| CR-7 audit status | ✅ FIXED | Partially resolved, with the deferral named |

---

## New Findings This Cycle

- **[medium]** `docs/reference/troubleshooting.md:252` (CR3-1): the remedy timing for `no-code-moved` is wrong. The source contract has the same contradiction (:706 vs :206-208), recorded as a follow-up.
- **[low]** `docs/reference/troubleshooting.md:201`, both README S6half labels (CR3-2): no cycle ≥ 3 floor.
- **[low]** `docs/runbooks/first-week/day-3-messy-path.md:41,77` (CR3-3): "mechanical" misdescribes `qa-story`.

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head bbc1a4e0a4f4; 6 files). This is the default; `SAFETY_REPROBE` is false, because the prior gate has security PASS and its evidence is `reasoned`.

One read-only Explore reviewer was given the scoped diff and asked to falsify each added claim, and to look for unchanged lines the fix had made contradictory. It returned in 96539 ms (`duration_ms`). CR3-1 and CR3-2 were confirmed in-line against `develop-pipeline-resume-contract.md:200-209` and `qa-diminishing-returns.js:618-624`. `finding-anchors.js` returned `ok` for all 3 anchors. Step 4b does not apply: there is no runnable prose in the change set.

---

## Implementation Verification

7/7 phases complete. Phase 2 (troubleshooting.md) and Phase 3 (day-3) carry this cycle's findings.

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC-1 | PASS | 31/31 |
| SC-2 no changed doc states the old behaviour | CONCERNS | CR3-1 |
| SC-5 doc-links | PASS | ok on all 5 changed docs |
| SC-7 validate:all | PASS | 128 passed (cycle 2; no SKILL.md changed since) |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2. All are documentation wording, carried in the gate for `/qa-fix`. No bug-report files.

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (boundary: false. The diff adds no function.)

### Maintainability — CONCERNS
CR3-1.

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `docs/reference/troubleshooting.md:252`: the `no-code-moved` remedy comes after the Step 7 restore (CR3-1, confirmed in-line, in the gate)
- [low/high] `docs/reference/troubleshooting.md:201`: route 2c cycle floor (CR3-2, promoted)

**Cleanups (1):**
- `docs/runbooks/first-week/day-3-messy-path.md:77`: "mechanical" for `qa-story` (CR3-3)

Mutation proof: not applicable. No test guards a fix made in cycle 2.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` @ 7f8294ab | PASS: 5969 tests, 0 failed |
| Mermaid label check | PASS (valid) |

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR3-1 fixed.

**Next Steps**: `/qa-fix` on gate 3, then QA cycle 4.
