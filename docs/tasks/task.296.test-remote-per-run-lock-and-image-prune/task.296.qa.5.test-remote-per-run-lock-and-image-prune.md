# QA Report: Task 296 - test:remote per-run lock and image-tag prune

**Task**: [Link to task document](./task.296.test-remote-per-run-lock-and-image-prune.md)
**Gate File**: [task.296.gate.5.test-remote-per-run-lock-and-image-prune.yml](./task.296.gate.5.test-remote-per-run-lock-and-image-prune.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Gate Status**: PASS

---

## Executive Summary

Nothing in the shipped code changed since gate 4. This cycle exists because the Step 5c PR review returned CONCERNS with one open coverage finding (PC-3): the live two-run overlap the task asked for had never been reproduced. It has now been run, and I checked it against its saved logs. The trail rows the review flagged are corrected.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY once CI is green on the final head

---

## Testing Scope

### Review Methodology

- Direct tools only. The change set since gate 4 is documentation only (the implementation report, the task document, the PR review report and QA artifacts), so Step 3b takes the claim-check route: `Diff review: docs-only claim check`. I checked the changed claims inline against their sources and did not dispatch a reviewer. **Independent review did not run this cycle**; the claims are few, each has a log or a command behind it, and the previous cycle's reviewer returned nothing in 9 seconds.
- Re-review scope: files changed since gate 4 (head 2f9f1db9): 7 paths, all under the task directory. `SAFETY_REPROBE` false. `CODE_MOVED` 0.
- Step 4b: not applicable, no runnable prose in the change set.
- CI on 891786345c16: pending when the gate was written (recorded, not waited on). `CI_SUMMARY` read once.

---

## Re-Review Context

| Previous finding | Status |
| --- | --- |
| PC-3 (Step 5c review, coverage): live two-run overlap not reproduced | FIXED by execution; recorded below |
| PC-1, PC-2 (trail): stale Pipeline Progress row; cycle 4 entry in the wrong wording | FIXED: the row names cycle 4 and the 5c verdict, the entry uses the spec's values |
| PC-4 (success criteria unticked), PC-5 (`pr_number:` absent) | Not for this loop: `/finalise` verifies the criteria and writes `pr_number:`. They are `consistency` findings and do not route |

## New Findings This Cycle

None. Searched: the whole change set since gate 4 (7 paths, documentation only), each changed claim against its source; the code diff since gate 4 over `scripts/` and `tests/` is empty.

---

## Live Two-Run Overlap on the Server

The criterion asks for this to be recorded here. It was run after the PR review, on `ci@192.168.1.249`, and I read the saved logs rather than the summary.

| Step | Observed |
| --- | --- |
| Run A: `npm run test:remote -- --run lint:shell`, background | lock seen on the server about 1 s later: `~/agent-skills-test-feature-task-296-test-remote-per-run-loc-a0464742.lock`, owner file `owner=tachyon-/pid-3110783`, `timeout_min=30` |
| Container check at that moment | `docker ps -a` showed no `agent-skills-test` container (count 0), so the container-name layer could not have caught the second run |
| Run B: the same command, started once A's lock existed | exit **1**, before its sync: `another run holds the lock … owner tachyon-/pid-3110783, age 0m.` then `Wait for it to finish.` |
| Run A | exit **0**, `shellcheck: clean`: undisturbed |
| Afterwards | no `*.lock` on the server |
| Load (`uptime`) | server 0.26 before, 0.56 after; laptop 2.87 before, 2.74 after |

This is the lock layer refusing an overlap that the container-name layer cannot see, which is the whole reason the lock exists. The first live attempt reached the container layer first and could not show it.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The lock | PASS | Verified | code identical to gate 4; overlap reproduced live |
| Phase 2: The image prune | PASS | Verified | unchanged |
| Phase 3: Tests and acceptance | PASS | Verified | 48/48 under `CI=true`; server `ci:fast` 8431 pass on this code; live overlap recorded above |
| Phase 4: Docs | PASS | Verified | unchanged and accurate |

**Overall Phase Completion**: 4/4 PASS

---

## Success Criteria Verification

`criteria-drift` clean, CHANGELOG cites task 296, shellcheck clean, 48 of 48 offline tests pass. The Success Criteria checkboxes in the task document are still unticked: `/finalise` verifies and ticks them (PR review PC-4), and the evidence for each is now in this report and the earlier ones.

---

## Breaking Changes Validation

None. **Assessment:** PASS (not applicable).

---

## Issues Found

None. **Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged; load recorded around the live runs.

### Reliability — CONCERNS (advisory)
CR-3 to CR-6 from cycle 1, not reproduced, in the gate's `recommendations.future`.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`task.296.qa.4.security.run.json`: 0 reproduced, 0 escaped). No code changed since that run, so it stands.

### Maintainability — PASS
One server-side file, shellcheck clean, documented.

---

## Code Review

Diff review: docs-only claim check. Each claim the change set added was checked against its source: the overlap's exit codes, owner string, age, lock path and loads against the saved logs; "the shipped files are byte-identical to 2f9f1db9" against `git diff` (empty); the Pipeline Progress row and the cycle 4 entry against the spec's value set. All hold.

**Correctness bugs (0).** **Cleanups (0).**

No mutation proof applies: no code changed this cycle. The proofs for the guards are in QA reports 3 and 4.

---

## Regression Testing

48 offline tests pass under `CI=true`; shellcheck clean.

---

## Test Artifacts

```bash
git diff --stat 2f9f1db9..HEAD -- scripts tests            # empty
CI=true command node --test tests/test-remote-runner.test.js  # 48 pass
npm run test:remote -- --run lint:shell                    # twice, overlapping (see above)
qa-ci-read.sh --vcs github --pr 891                        # CI_SUMMARY pending
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Advisory CR-3 to CR-6 as a follow-up task if wanted.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 96/100
**Deployment Recommendation**: READY once CI is green on the final head.

**QA Report**: co-located at `task.296.qa.5.test-remote-per-run-lock-and-image-prune.md`
**Gate File**: co-located at `task.296.gate.5.test-remote-per-run-lock-and-image-prune.yml`
**Next Steps**: `/review-pr` (Step 5c) again on this gate.
