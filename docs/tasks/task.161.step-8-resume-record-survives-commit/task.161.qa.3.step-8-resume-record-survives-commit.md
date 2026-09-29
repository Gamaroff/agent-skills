# QA Report: Task 161 - Step 8 keeps its resume record until the Completion Checklist passes

**Task**: [Link to task document](./task.161.step-8-resume-record-survives-commit.md)
**Gate File**: [task.161.gate.3.step-8-resume-record-survives-commit.yml](./task.161.gate.3.step-8-resume-record-survives-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: CONCERNS

---

## Executive Summary

This is the cycle-3 re-review, scoped to the files changed since gate 2. Cycle 2's fix holds: at step 8 the Stop hook now states the resume contract's step-8 rule, it invokes the whole step-8 doc, and it never tells the orchestrator to run `--complete`. No gating finding remains. Reliability stays at CONCERNS on two advisory items:

- the develop-bug wording of "Step 7's tail" (medium confidence);
- a status line at lock 8 that reads "Step 7/8 ✅ complete". This is **pre-existing**: it is byte-identical on `origin/develop`.

**Overall Assessment**: CONCERNS (no open gate entry)
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue (gate 2) | Status | Evidence |
| --- | --- | --- |
| CR-1: a Step 7-tail stall was routed to Step 8's report update | FIXED | on-stop 5b requires "at or below Step 7" and "Step 7's tail". Mutation (drop the routing sentence) → 3 cases red → covered |
| CR-2 (advisory): at step 8 the text said "invoke /commit-changes" and "advance the lock yourself" | FIXED | 5b forbids both. A step-3 case pins the generic text elsewhere. Mutation → red → covered |
| CR-3 (cleanup): the no-jq `commit-changes` assertion could not fail | FIXED | now asserts the arm's own stderr. Mutation (arm gated on jq) → red → covered |
| CR-4 (cleanup): stale test header | FIXED | reworded |

---

## Testing Scope

### Review Methodology

Direct tools, plus one read-only Explore subagent over the scoped diff (7 files, 796 lines), which returned in 1 min 13 s.

```
Re-review scope: since 2026-09-27T18:06:05Z (default)
```

Step 4b: not applicable. Cycle 2 changed one prose paragraph in `develop-pipeline-hooks.md` (no fenced block), plus shell and test files.

---

## New Findings This Cycle

- **[medium/high → pre-existing]** `shared/resources/develop-pipeline-on-stop.sh:272`: at lock 8 the reason's status block reads "position `Step 7/8 ✅ complete`" and invokes Step 8 before the routing sentence redirects an unfinished Step 7.
  - **Provenance, measured**: rendered on `origin/develop` and on HEAD for develop-task and develop-bug at `current_step: 8`, both emit the identical "position `Step 7/8 ✅ complete`".
  - The claim predates this change. Not entered in `top_issues[]`; routed to `recommendations.future` as a follow-up.
- **[medium/medium]** `shared/resources/develop-pipeline-on-stop.sh:252`: the shared step-8 line describes Step 7's tail in develop-task/develop-story terms, but develop-bug's Step 7 tail is its bug-close routine (`skills/develop-bug/SKILL.md` Step 7) → make it skill-aware. Advisory (confidence medium).
- **[cleanup]** `shared/resources/advance-pipeline-lock.test.sh:124`: the no-jq PATH links commands the pre-gate arms never run, and `printf` resolves to a builtin name (a self-referencing symlink).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | PASS | Verified | Lock lifetime and no-jq path proven; Stop hook step-8 routing follows the resume contract |
| Phase 2 | PASS | Verified | HALT-at-8 snapshot and restore |
| Phase 3 | PASS | Verified | Detector clamp, recovery order, population tests |
| Phase 4 | PASS | Verified | Gates green; mutations proven |

---

## Success Criteria Verification

All functional, code-quality and migration criteria PASS, as in gates 1 and 2. `ci:fast` at `1774f3f6`: 4331 pass / 0 fail. `develop-pipeline-on-stop.test.sh` 36/0, `advance-pipeline-lock.test.sh` 95/0. `lint:shell`, `bundle:check` and `prettier`: 0.

---

## Breaking Changes Validation

Unchanged. PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0 gated)

None gated. The two medium code-review findings are pre-existing (CR-1) or medium-confidence (CR-2). Both are described above and recorded under `recommendations.future`.

### LOW Severity Issues (1)

CR-3, the test PATH cleanup.

**Total Issues**: HIGH: 0, MEDIUM: 0 gated (2 advisory), LOW: 1

---

## NFR Assessment

### Performance — PASS
No change.

### Reliability — CONCERNS
Advisory CR-2 (develop-bug wording) and pre-existing CR-1 (the status line at lock 8). Neither blocks, but both are message-accuracy defects in the step-8 reason.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The `NEXT=8` branches select message text and accept or reject nothing.

### Maintainability — PASS
CR-3 is test hygiene.

---

## Code Review

Scoped reviewer (Explore). `code_review_blocking` resolved true; no finding met `bug` + `confidence: high` except CR-1, which provenance classified as pre-existing.

**Correctness bugs (2):**
- [medium/high] `shared/resources/develop-pipeline-on-stop.sh:272`: status block at lock 8 claims Step 7 complete → **pre-existing** (identical output on base); `recommendations.future`
- [medium/medium] `shared/resources/develop-pipeline-on-stop.sh:252`: the develop-bug Step 7-tail wording → advisory

**Cleanups (1):**
- `shared/resources/advance-pipeline-lock.test.sh:124`: the no-jq PATH over-links

**Step 3c: mutation proofs for cycle 2's fixes (run in 5b and re-read here):**
- mutation-proven: drop the Step 7 routing sentence → on-stop step-8 cases ×3 red → covered
- mutation-proven: generic "already finished" text at step 8 → on-stop step-8 cases ×3 red → covered
- mutation-proven: `commit-changes` arm gated on jq → "without jq, commit-changes … (its own arm, not the jq gate)" red → covered

---

## Regression Testing

`ci:fast` at `1774f3f6`: 4331 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
git diff origin/develop...HEAD -- <7 files changed since gate 2> > <scratch>/t161-qa3.diff   # 796 lines
# provenance for CR-1: render the Stop hook at current_step 8 from origin/develop and from HEAD
git show origin/develop:shared/resources/develop-pipeline-on-stop.sh > <scratch>/onstop-base.sh
(cd <fixture> && echo '{}' | bash <hook>) | jq -r .reason | grep -o 'position `Step [0-9]/8 ✅ complete`'
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-2: skill-aware Step 7-tail wording in the step-8 reason.
2. CR-1 (pre-existing): step-aware status position at lock 8.
3. CR-3: tighten the no-jq PATH.

---

## Final Assessment

**Gate Status**: CONCERNS (empty queue: §5c route 3)
**Quality Score**: 90/100
**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.161.qa.3.step-8-resume-record-survives-commit.md`
**Gate File**: co-located at `task.161.gate.3.step-8-resume-record-survives-commit.yml`
**Next Steps**: 5c `/review-pr`.
