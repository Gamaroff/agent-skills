# QA Report: Task 161 - Step 8 keeps its resume record until the Completion Checklist passes

**Task**: [Link to task document](./task.161.step-8-resume-record-survives-commit.md)
**Gate File**: [task.161.gate.2.step-8-resume-record-survives-commit.yml](./task.161.gate.2.step-8-resume-record-survives-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: CONCERNS

---

## Executive Summary

This is the cycle-2 re-review, run as a full-diff refute pass over `origin/develop...a9b30f56`. Cycle 1's fixes hold: `--complete` removes the lock without `jq`, the no-op `commit-changes` arm survives a corrupt lock, and both are mutation-proven. The refute pass found one medium problem in cycle 1's own new text. The conditional Stop-hook step-8 line acknowledges that the lock reads 8 before Step 7's tail has run, and still sends that stall to Step 8's report update. That update ticks row 7 without the tail ever running (CR-1).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix CR-1)

---

## Re-Review Context

| Previous issue (gate 1) | Status | Evidence |
| --- | --- | --- |
| CR-1 `--complete` gated on `jq` | FIXED | `advance-pipeline-lock.test.sh` "without jq, --complete removes the lock" (PATH stripped of jq). Mutation (move `--complete` back behind the gate) → red → covered |
| CR-2 (advisory) Stop hook asserted "row already ✅" | FIXED, and its replacement text raised CR-1 below | on-stop 5b: "is already ✅" absent, "Final Implementation Report Update" named |
| CR-3 (cleanup) the no-op arm parsed the lock | FIXED | "commit-changes on a corrupt lock is a no-op" (exit 0, bytes untouched) |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#501)

### Review Methodology

Direct tools, plus one read-only Explore subagent for the diff review. It returned in 3 min 2 s. **Cycle 2 → REFUTE PASS over the full branch diff**: 22 files and 1826 lines, with the bundled copies excluded (`bundle:check` confirms they match their sources). `SAFETY_REPROBE=false`, because gate 1's security axis read `PASS reasoned`.

```
Re-review scope: unscoped (cycle 2 refute pass — full branch diff)
```

Step 4b: not applicable to this cycle's changes. Cycle 1 touched shell and test files only; the prose files were executed in cycle 1.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-on-stop.sh:241`: the conditional step-8 line names the window "before Step 7's tail and before any Step 8 work" and routes it to the step-8 doc's Final Implementation Report Update. That update sets every row ✅, including row 7. An orchestrator that stopped during Step 7's tail therefore skips the tail, and check 4 passes on an unearned row. This contradicts the resume contract's "an unfinished Step 7 row still wins". → Route an unfinished Step 7 row to Step 7's tail first, and test it. **Gated (CR-1).**
- **[low/medium]** `shared/resources/develop-pipeline-on-stop.sh:253`: at step 8 the hook's fixed text still says "invoke /commit-changes" and "If Step 8 has genuinely already finished … advance the lock yourself". For Step 8, advancing is `--complete`, which the new line forbids running by hand. → Make both step-aware. Advisory (CR-2).
- **[cleanup]** `shared/resources/advance-pipeline-lock.test.sh:131`: the no-jq `commit-changes` sub-assertion also passes on the pre-fix code, because the `jq` gate exits 0 and leaves the lock alone. → Assert the pre-gate arm's own stderr line (CR-3).
- **[cleanup]** `shared/resources/advance-pipeline-lock.test.sh:8`: the header still says "Only the Step 8 invocation may remove the lock" (CR-4).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | CONCERNS | Verified | Lock lifetime correct and holds without `jq`; Stop-hook step-8 routing (CR-1) |
| Phase 2 | PASS | Verified | HALT-at-8 snapshot and restore, under bash and zsh |
| Phase 3 | PASS | Verified | Detector clamp, recovery order, population tests |
| Phase 4 | PASS | Verified | Gates green; mutations proven |

---

## Success Criteria Verification

Unchanged from gate 1 (all PASS on the stated tests), with one addition: "the Stop hook's reason at step 8 names the Completion Checklist as Step 8's completion" still holds, but the route it gives for an unfinished Step 7 is wrong (CR-1).

| Code Quality | Target | Actual | Status |
| --- | --- | --- | --- |
| `ci:fast` (`.agents/skills` aside) at `a9b30f56` | 0 fail | 4331 pass / 0 fail | PASS |
| `advance-pipeline-lock.test.sh` | 0 fail | 95/0 | PASS |
| `develop-pipeline-on-stop.test.sh` | 0 fail | 35/0 | PASS |
| `lint:shell`, `bundle:check` | 0 | 0 | PASS |

---

## Breaking Changes Validation

Unchanged from gate 1. PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: the Stop hook routes a Step 7-tail stall past the tail (CR-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: none filed. The finding is carried in gate 2's `top_issues[]` for `/qa-fix`.
- **Observation**: `COMPLETION_LINE` at `NEXT=8` names the pre-Step-7-tail window and sends it to Step 8's report update.
- **Provenance**: text written by this change, in cycle 1's CR-2 fix. On `origin/develop` the step-8 reason was the generic "invoke /commit-changes … mark Step 8 ✅", which also skipped Step 7's tail. This line is the one that names the window, and it is the line task.161 is responsible for.
- **Recommendation**: send an unfinished Step 7 row to Step 7's tail first.
- **Priority**: P1

### LOW Severity Issues (3, advisory)

CR-2, CR-3 and CR-4, described above.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
No change.

### Reliability — CONCERNS
CR-1, plus the advisory CR-2.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Cycle 1 moved two arms that parse nothing above the `jq` gate: `--complete` removes unconditionally, and `commit-changes` prints a line. The Stop hook's `elif` picks message text. None of them accepts or rejects input.

### Maintainability — PASS
CR-3 and CR-4 are test hygiene.

---

## Code Review

Refute-pass reviewer (Explore), full branch diff. `code_review_blocking` resolved true.

**Correctness bugs (2):**
- [medium/high] `shared/resources/develop-pipeline-on-stop.sh:241`: Step 7-tail stall routed to Step 8's report update → route an unfinished Step 7 row to the tail first. **Promoted to gate `top_issues[]` as CR-1.**
- [low/medium] `shared/resources/develop-pipeline-on-stop.sh:253`: the fixed text at step 8 says invoke `/commit-changes` and advance the lock yourself → make it step-aware (CR-2).

**Cleanups (2):**
- `shared/resources/advance-pipeline-lock.test.sh:131`: the no-jq `commit-changes` assertion cannot fail → assert the arm's own stderr (CR-3)
- `shared/resources/advance-pipeline-lock.test.sh:8`: stale header (CR-4)

**Step 3c: mutation proofs for cycle 1's fixes:**
- mutation-proven: `--complete` moved back behind the `jq` gate → "without jq, --complete removes the lock" red → covered
- mutation-proven: Stop hook restored to the unconditional "already ✅" line → on-stop step-8 cases ×3 red → covered
- mutation-proven: `commit-changes` arm moved back behind the parse. Not run as a mutation, but the arm now sits before the gate and the corrupt-lock test asserts exit 0 on a lock `require_parsable_lock` would refuse → not-run (reasoned only). The no-jq sub-assertion does **not** cover it (CR-3).

---

## Regression Testing

`ci:fast` at `a9b30f56`: 4331 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
git diff origin/develop...HEAD -- . ':(exclude)skills/*/references/*' > <scratch>/t161-qa2.diff   # 1826 lines
mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills   # 4331/0 (at a9b30f56)
bash shared/resources/advance-pipeline-lock.test.sh      # 95/0
bash shared/resources/develop-pipeline-on-stop.test.sh   # 35/0
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: route an unfinished Step 7 row to Step 7's tail at step 8.

### Short-term Actions (Non-Blocking)
1. CR-2: make the step-8 invoke target and the "advance the lock yourself" sentence step-aware.
2. CR-3 and CR-4: test hygiene.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium, high-confidence routing defect in text cycle 1 introduced.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: co-located at `task.161.qa.2.step-8-resume-record-survives-commit.md`
**Gate File**: co-located at `task.161.gate.2.step-8-resume-record-survives-commit.yml`
**Next Steps**: `/qa-fix` cycle 2 for CR-1, with CR-2 to CR-4 alongside; then cycle 3.
