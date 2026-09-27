# QA Report: Task 160 - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones (cycle 4)

**Task**: [task.160.step-8-check-4-allowlists-finished-rows.md](./task.160.step-8-check-4-allowlists-finished-rows.md)
**Gate File**: [task.160.gate.4.step-8-check-4-allowlists-finished-rows.yml](./task.160.gate.4.step-8-check-4-allowlists-finished-rows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's fix holds where it applies. From the start of Step 8 until `/commit-changes`, a resume record at step 8 exists, and a resume re-runs Step 8. That is now tested against the real PreCompact hook. The step document overstates the fix, though: `/commit-changes` removes the lock at step 8, so there is no record after the commit. That gap pre-dates this branch and goes to a follow-up. The claim must say so, and the other resume sites must carry the rule.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR3-1 (high): git cannot tell a paused Step 8 from a finished one | FIXED for the pre-commit window | `a5dc82c3`: the resume record decides. A hook test drives the real hook at step 8, which commits and pushes and leaves a snapshot at step 8 that `--restore` restores to a lock at step 8 |
| CR3-2 (medium): vacuous resume tests | FIXED | replaced by the real-hook test and a guard. The Cleanup test models an unreal state (CR4-3) |

---

## Testing Scope

### Review Methodology

Direct tools, plus one independent read-only reviewer (Explore, about 3 minutes).

Re-review scope: since 2026-09-27T11:36:56Z (default, from gate 3's clock-stamped `updated:`, checked against `date -u`). 15 files, 886-line diff (`a5dc82c3`, excluding `docs/tasks`).

Step 4b: `develop-pipeline-resume-contract.md` 0 findings (2 runnable); `develop-pipeline-step-8-commit.md` `no-executable-blocks` (informational).

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-8-commit.md` — **CR4-1.** The doc claims that Cleanup removes the lock last, and that a HALT inside Step 8 is caught by the record. In fact `advance-pipeline-lock.sh --skill commit-changes` removes the lock at `current_step >= 8`, at the end of the Step 8 commit. The record therefore covers the window from the start of Step 8 to that commit, not the push, Cleanup or checklist that follow it. → Scope the claim.
- **[medium]** `skills/develop-{task,story,bug}/SKILL.md` Context Compression Recovery — **CR4-2.** These sections still continue from `recommended_step`, which is 9 for a record at step 8. → Cite the step-8 rule at each site.
- **[medium]** `shared/resources/tests/step-8-completion-checklist.test.mjs` — **CR4-3.** The Cleanup test seeds a lock that `/commit-changes` has already removed by the time Cleanup runs. → Model the real removal sequence.
- **Pre-existing, routed to future (provenance step):** the reviewer's high and medium findings about the post-commit window (a pause, crash or HALT after the Step 8 commit leaves no record, and the HALT rule's snapshot guard finds no lock). **Measurement:** the `commit-changes` removal arm at step ≥ 8 dates from `a284dfdd` (2026-06-08) and is present on `origin/develop`, so the same pause on `develop` also leaves no record. The finding is not new to this branch, so it is not gated and is named for a follow-up task. What is new here is only the false claim that the gap is closed (CR4-1).
- CR-5 (cleanup): a re-run writes a new Finished value and leaves the hook's pause section in place.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | 75/75 |
| Phase 2 | PASS | Probe engages 21/21 |
| Phase 3 | CONCERNS | Rule correct in its window; claim overstated; resume sites not carried (CR4-1, CR4-2) |
| Phase 4 | PASS | Gates and CI green on `a5dc82c3` |

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
A pause or HALT before the Step 8 commit now resumes into Step 8, where `develop` recommended step 9. The post-commit window is unchanged from `develop` (future).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21 (from `task.160.qa.4.security.run.json` `totals.executed`)

### Maintainability — PASS
The claim scoping and site propagation are carried in `top_issues`.

---

## Code Review

**Correctness bugs (4):**
- [high/high] post-commit window has no record — **pre-existing** (see above), routed to future
- [medium/medium] Step 8 HALT snapshot is skipped after `/commit-changes` — **pre-existing**, routed to future
- [medium/high] the recovery sites use `recommended_step` → **CR4-2**
- [medium/high] the tests seed an unreal lock → **CR4-3**. This reviewer finding also motivates **CR4-1** (the claim)

**Cleanups (1):** CR-5.

**Mutation proofs (cycle-3 fix, made during `/qa-fix`):** Cleanup keeps the lock → covered. Cleanup keeps the snapshot → covered. Hook snapshots the wrong step → covered. Resume contract back to the git check → covered. `❌ Failed` rule re-added → covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Checklist suite | PASS 75/75 |
| CI on `a5dc82c3` | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
gh pr checks 499
git show origin/develop:shared/resources/advance-pipeline-lock.sh    # provenance: commit-changes removal arm present on base
git log -S'commit-changes at step $CUR' -- shared/resources/advance-pipeline-lock.sh   # a284dfdd, 2026-06-08
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry '.claude/state/t160-probe-wrapper.mjs#check4Admits' --cases-file .claude/state/t160-probe-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.qa.4.security.run.json --json
```

### Coverage Report
Not applicable.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the fix is correct in its window. Three medium findings concern its claim, its propagation and one test. The post-commit gap is pre-existing.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR4-1, CR4-2, CR4-3 fixed

---

**QA Report**: co-located at `task.160.qa.4.step-8-check-4-allowlists-finished-rows.md`
**Gate File**: co-located at `task.160.gate.4.step-8-check-4-allowlists-finished-rows.yml`
**Next Steps**: `/qa-fix` (cycle 4 of 5); file the post-commit-window follow-up task
