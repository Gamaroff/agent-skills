# QA Report: Task 160 - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones (cycle 5)

**Task**: [task.160.step-8-check-4-allowlists-finished-rows.md](./task.160.step-8-check-4-allowlists-finished-rows.md)
**Gate File**: [task.160.gate.5.step-8-check-4-allowlists-finished-rows.yml](./task.160.gate.5.step-8-check-4-allowlists-finished-rows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4's three findings are fixed and test-held. The refute pass found that the step-8 rule now overreaches the other way. `/finalise` advances the lock to 8 before Step 7's remaining work (DoD body to the PR, tracker update, Step 7 checklist) is done, so "re-run Step 8 whatever the rows read" can skip an unfinished Step 7. The rest are wording gaps. No new mechanism is needed. The core deliverable (check 4) remains measured correct.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR4-1 (medium): claim overstated the record's window | FIXED | `66d7802d`; guard holds; the step doc names the real remover |
| CR4-2 (medium): recovery sites continued from `recommended_step` | FIXED, but see CR5-1 and CR5-2 | exception in 3 orchestrators; guard holds |
| CR4-3 (medium): Cleanup test modelled an unreal lock | FIXED | real lock helper and real Cleanup; mutation of the helper's step-8 arm goes red |

---

## Testing Scope

### Review Methodology

Direct tools, plus one independent read-only reviewer (Explore, about 2.5 minutes).

Re-review scope: since 2026-09-27T14:50:38Z (default; checked against `date -u`). 18 files, 1037-line diff (`66d7802d`, excluding `docs/tasks`).

Step 4b: the three orchestrator `SKILL.md` files, seeded with `--copy-as`, had 0 findings.

---

## New Findings This Cycle

- **[medium]** **CR5-1**, `develop-pipeline-resume-contract.md` and the 3 SKILL.md exceptions. `/finalise` sets the lock to 8 before Step 7's remaining work finishes, so a record at step 8 can mean "Step 7 unfinished" too. Verified: finalise SKILL.md § Pipeline Lock Cooperation, and `advance-pipeline-lock.sh` `finalise) NEXT=8`. This is new to this branch: the "whatever the rows read" wording overrides the Step 7 row as well. → Scope the rule to the Step 8 row only.
- **[medium]** **CR5-2**. A lock that survived at 8 (crash, or no hook installed) is not named in the rule. → Name the lock whether restored or surviving.
- **[low]** **CR5-3**. "A HALT anywhere in Step 8 leaves none" is false for a lint-failed HALT, which skips the commit and keeps the lock at 8.
- **[low]** **CR5-4**. The step-0 Shared Resume Logic does not point at the rule.
- Cleanup: the lifecycle test's final lock assertion is redundant.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | 78/78 |
| Phase 2 | PASS | Probe engages 21/21 |
| Phase 3 | CONCERNS | Resume rule overreaches past Step 7 (CR5-1) |
| Phase 4 | PASS | Gates and CI green on `66d7802d` |

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
The regression is carried in `top_issues`.
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21 (from `task.160.qa.5.security.run.json` `totals.executed`)
### Maintainability — PASS

---

## Code Review

**Correctness bugs (4):** CR5-1 [medium/medium, QA-verified, gated], CR5-2 [medium/medium, gated], CR5-3 [low], CR5-4 [low]. None was high-confidence, so none was auto-promoted; QA verified and gated the four.
**Cleanups (1):** redundant final lock assertion.

**Mutation proofs (cycle-4 fix):** contract overclaim → covered. develop-bug exception removed → covered. Lock helper keeps the lock at step 8 → covered. Step doc "Cleanup removes the lock last" → covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Checklist suite | PASS 78/78 |
| CI on `66d7802d` | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
gh pr checks 499
sed -n 2770,2782p skills/finalise/SKILL.md; grep -n 'finalise)' shared/resources/advance-pipeline-lock.sh   # CR5-1 verification
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry '.claude/state/t160-probe-wrapper.mjs#check4Admits' --cases-file .claude/state/t160-probe-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.qa.5.security.run.json --json
```

### Coverage Report
Not applicable.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL (CR5-1..4 fixed)

---

**QA Report**: co-located at `task.160.qa.5.step-8-check-4-allowlists-finished-rows.md`
**Gate File**: co-located at `task.160.gate.5.step-8-check-4-allowlists-finished-rows.yml`
**Next Steps**: `/qa-fix` (cycle 5 of 5)
