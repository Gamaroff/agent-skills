# QA Report: Task 301 - PreCompact pause comment names the cycle and the pause count

**Task**: [Link to task document](./task.301.precompact-pause-comment-names-cycle-and-count.md)
**Gate File**: [task.301.gate.1.precompact-pause-comment-names-cycle-and-count.yml](./task.301.gate.1.precompact-pause-comment-names-cycle-and-count.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Testing Completed**: 2026-11-12
**Gate Status**: CONCERNS

---

## Executive Summary

First QA cycle on PR #886. All four phases are implemented and every success criterion is met and held by committed tests. The diff review found one real gap: the new Step 1 collision block reads a `{start-fresh}` placeholder that no document tells the orchestrator to fill, so "Start fresh" on a paused lock for the same document would HALT.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix T301-CR-1)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#886)

### Testing Approach

- [x] Automated Testing: `npm run test:remote` (`ci:fast`) green on this code, 8401 tests, 0 failed (the run before commit 75a2020f; no code has changed since)
- [x] Regression Testing: the whole precompact suite re-run at QA, 35 passed
- [x] Code Review (diff, read-only subagent)
- [x] Mutation spot check (two proofs, below)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (Step 3b). The reviewer dispatched and returned within one minute (`duration_ms` 26246). The diff given to it excluded the bundled `skills/*/references/` copies (identical to `shared/resources/`, checked by `bundle:check`) and `docs/`.

Diff review: code review. First review, so the whole branch diff.

CI on 75a2020fd7d0: pending (read once; nothing mapped).

Step 4b: ran `qa-execute-snippets.mjs` on `develop-pipeline-step-1-create-branch.md`: 0 blocks executable (8 mutating, 2 placeholder), so `zero-blocks-executed` and `changed-blocks-not-executed` fired. The changed block is exercised instead by `step-1-paused-lock.test.mjs`, which runs it for real in temp repositories.

---

## New Findings This Cycle

First review: all findings below are new.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: comment body (`pause_counts`, cycle, text) | PASS | Verified | Scenarios 20-21; hook now calls `qa-cycle.sh` |
| 2: Step 1 block + test | CONCERNS | Verified | 8 cases pass; placeholder gap, T301-CR-1 |
| 3: fixture counter | PASS | Verified | Scenario 22; `next_n` → `echo 0` goes red |
| 4: bundle and docs | PASS | Verified | `bundle:check` clean; `pause_counts` row; CHANGELOG cites task 301 |

**Overall Phase Completion**: 3/4 clean, 1 with a finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Two pauses at one step name the second cycle and `pause 2`; one issue comment | Scenario 21 | PASS |
| The three Step 1 cases each have a test | `step-1-paused-lock.test.mjs` A, B/B2, C (plus A2, D, E) | PASS |
| Two steps leave two kept comments and two `pr comment` lines; `echo 0` goes red | Scenario 22; re-run in the develop step: red | PASS |
| No added network call: exact `gh` count held | Scenario 22 constant, 6 | PASS |
| `bundle:check`, `lint:shell`, `ci:fast` pass | all run, green | PASS |
| CHANGELOG entry | present, cites (task 301) | PASS |

`criteria-drift`: clean (reviewed-blob base). `changelog-cites`: cites (task 301). Standards validation (`npm run validate -- skills/<skill>/`) for develop, develop-bug, develop-story, develop-task, review-pr: all pass.

---

## Breaking Changes Validation

None. The comment marker is unchanged.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T301-CR-1: the `{start-fresh}` placeholder has no writer**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `develop-pipeline-step-1-create-branch.md:25` reads `START_FRESH="{start-fresh}"`. Phase 0b asks the operator "Start fresh" but no doc says it substitutes `{start-fresh}` into this block. Unsubstituted, the value is the literal text and never equals `yes`.
- **Impact**: a paused lock for the same document always HALTs, even after the operator chose Start fresh. Before task 301 this exception was prose the orchestrator applied directly, so this is a regression in reach, though it fails closed.
- **Recommendation**: say in Phase 0b and beside the block who substitutes it, and make the block refuse an unsubstituted `{doc-directory}` or `{start-fresh}`. Add a test case for the refusal.
- **Priority**: P1

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Exactly 6 `gh` calls per pause, as on the unchanged hook.

### Reliability — PASS
A failed count bump is reported on stderr and the count is omitted (see CR-2 under Code Review for the stale-count corner).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: not credited
- The new Step 1 block is a state guard. `boundary: internal`: its decision depends only on the lock and snapshot the pipeline writes, and the substituted directory is compared for equality, never parsed. No corpus sink models a lock-collision guard. The probe engine was run once with the `filename` corpus (26 candidates, 0 escaped) and read `absent`, because that corpus expects a printed gate number. That result is not credited and its record was not kept. The behaviour is held by the committed test, which also runs the guard against hostile states (another document's lock, an unpaused lock, a stale lock, a non-precompact snapshot).

### Maintainability — PASS
One definition of the QA cycle (`qa-cycle.sh`); `pause_counts` documented in the lock-schema table.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `shared/resources/develop-pipeline-step-1-create-branch.md:25` — T301-CR-1 above; promoted to the gate (`code_review_blocking`).
- [low/medium] `shared/resources/develop-pipeline-on-precompact.sh:310` — CR-2: when `bump_pause_count` fails, a count left from an earlier pause at the same step is still read, so the comment can show a stale "pause N-1". Not reproduced by execution (it needs a failing `mktemp`), medium confidence, so advisory; recorded in `recommendations.future`.

**Cleanups (0).**

mutation-proven: Start fresh no longer removes the lock → `step-1-paused-lock.test.mjs` cases B, B2 and E went red → covered
mutation-proven: pause-comment count text dropped → `develop-pipeline-on-precompact.test.sh` "first pause at Step 5 names pause 1 and QA cycle 1" went red → covered

Two of the nine proofs recorded in the develop step were re-run here; the rest are in the implementation report. Tree restored after each (`cmp` clean).

---

## Regression Testing

The precompact suite (35 tests) and the new Step 1 test (8) pass. `tests/qa-cycle.test.js` (56) passes; it caught the hook's first, duplicate gate-number derivation in the develop step.

---

## Test Artifacts

### Files Reviewed
`shared/resources/develop-pipeline-on-precompact.sh`, `…on-precompact.test.sh`, `develop-pipeline-step-1-create-branch.md`, `develop-pipeline-pause.md`, `tests/step-1-paused-lock.test.mjs`, `CHANGELOG.md`.

### Test Commands Executed
```bash
bash shared/resources/develop-pipeline-on-precompact.test.sh
command node --test shared/resources/tests/step-1-paused-lock.test.mjs
npm run -s validate -- skills/<changed-skill>/
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T301-CR-1: define who substitutes `{start-fresh}`, refuse an unsubstituted placeholder, add a test.

### Short-term Actions (Non-Blocking)
1. CR-2: leave the count empty when the bump did not land.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding, no high.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T301-CR-1 fixed

---

**QA Report**: co-located at `task.301.qa.1.precompact-pause-comment-names-cycle-and-count.md`
**Gate File**: co-located at `task.301.gate.1.precompact-pause-comment-names-cycle-and-count.yml`
**Next Steps**: qa-fix cycle 1 for T301-CR-1, then re-review.
