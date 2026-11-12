# QA Report: Task 301 - PreCompact pause comment names the cycle and the pause count

**Task**: [Link to task document](./task.301.precompact-pause-comment-names-cycle-and-count.md)
**Gate File**: [task.301.gate.2.precompact-pause-comment-names-cycle-and-count.yml](./task.301.gate.2.precompact-pause-comment-names-cycle-and-count.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Testing Completed**: 2026-11-12
**Gate Status**: CONCERNS

---

## Executive Summary

Second QA cycle on PR #886, a refute pass over the whole branch diff. Cycle 1's finding is fixed. The refute pass found one real defect in the hook: when the pause-count write fails, the comment still shows the previous pause number as the latest.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix T301-CR-2)

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T301-CR-1 (Step 1 block reads an unsubstituted `{start-fresh}`) | FIXED | Commit `b8a0b6a3`: the block HALTs on an unsubstituted or invalid `{start-fresh}` and an unsubstituted `{doc-directory}`; Phase 0b says who fills it. Tests F to F4 in `step-1-paused-lock.test.mjs` (12 pass). |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#886)

### Testing Approach

- [x] Automated Testing: `npm run test:remote` green on this code, 8405 tests, 0 failed (run before commit `b8a0b6a3`; only docs have changed since)
- [x] Code Review (diff, read-only subagent, refute pass)
- [x] Mutation proofs from the cycle 1 fix re-read, not re-run (covered below)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (Step 3b), dispatched 07:17:46Z (duration `(not measured)`; it returned within a few minutes). Cycle 2 is a refute pass over the whole branch diff. The reviewer was given `shared/resources/` sources and tests; the generated `skills/*/references/` copies are held by `bundle:check`.

Diff review: code review. Re-review scope: unscoped (cycle 2 refute pass; `SAFETY_REPROBE=false`).

CI on `b8a0b6a3fde9`: pending (read once; nothing mapped).

Step 4b: not re-run. The changed block is exercised by `step-1-paused-lock.test.mjs`, which runs it for real in temp repositories (cycle 1 recorded 0 executable blocks from the engine).

---

## New Findings This Cycle

- **[medium/high]** `shared/resources/develop-pipeline-on-precompact.sh:293` — a failed `bump_pause_count` leaves the lock unchanged, but `PAUSE_COUNT` (line 310) is re-read from the lock, so after the first pause at a step the comment shows the previous pause number as the latest, while the stderr message says the count is omitted. Promoted to gate entry T301-CR-2. Origin: code review, high confidence; confirmed by reading the code path (the bump and the read are the only two writers/readers of `pause_counts`).
- **[low/medium]** `shared/resources/develop-pipeline-step-1-create-branch.md:44` — identity check is raw string equality; `docs/x` and `docs/x/` read as different documents. Advisory (gate `recommendations.future`).
- **[low/medium]** `shared/resources/develop-pipeline-step-1-create-branch.md:29` — the `{doc-directory}` guard refuses any `{`. Advisory.
- **[medium confidence]** `skills/develop-bug/SKILL.md:206` — the develop-bug substitution list does not name the two placeholders. Advisory: the shared step doc now states both must be substituted and the block refuses otherwise.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: comment body (`pause_counts`, cycle, text) | CONCERNS | Verified | Scenarios 20-21; stale count on a failed bump (T301-CR-2) |
| 2: Step 1 block and tests | PASS | Verified | 12 tests, cycle 1 fix included |
| 3: fixture counter | PASS | Verified | Scenario 22 |
| 4: bundle and docs | PASS | Verified | `bundle:check` clean; CHANGELOG entry; `pause_counts` row |

**Overall Phase Completion**: 3/4 passed, 1 with a concern.

---

## Success Criteria Verification

All nine criteria are met as in QA report 1; nothing in the cycle 1 fix touches them. `criteria-drift.js` reports `clean`. `changelog-cites.sh` reports `cites (task 301)`. The criteria classifier found no boundary signals.

---

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T301-CR-2 stale pause count after a failed count write**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: see New Findings.
- **Impact**: the PR comment can name pause N-1 when pause N happened; the comment is a status surface, not a log.
- **Recommendation**: report whether the bump landed and omit the count when it did not; add a failing-bump hook scenario.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
One pause makes exactly 6 `gh` calls, the same as the unchanged hook; held by a test constant.

### Reliability — CONCERNS
T301-CR-2.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- {The Step 1 block is a state guard; `boundary: internal` (inputs are the pipeline's own lock and snapshot plus two placeholders compared for equality; no corpus sink models it). Held by the committed 12-case test.}

### Maintainability — PASS
The cycle comes from the one definition, `qa-cycle.sh`.

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `shared/resources/develop-pipeline-on-precompact.sh:293` — stale count after a failed bump → T301-CR-2.
- [low/medium] `shared/resources/develop-pipeline-step-1-create-branch.md:44` — raw string identity compare.
- [low/medium] `shared/resources/develop-pipeline-step-1-create-branch.md:29` — guard refuses any brace.
- [medium/medium] `skills/develop-bug/SKILL.md:206` — substitution list incomplete.

**Cleanups (2):**
- `shared/resources/tests/step-1-paused-lock.test.mjs:234` — F4 covers only flat paths.
- `shared/resources/develop-pipeline-step-1-create-branch.md:40` — stale-branch path leaves a precompact snapshot.

Promoted to the gate: T301-CR-2.

mutation-proven: accept-any-value guard in the Step 1 block → `step-1-paused-lock` F and F2 → covered (proved in the cycle 1 fix, committed tests)
mutation-proven: drop the `{doc-directory}` guard → `step-1-paused-lock` F3 → covered (cycle 1 fix)

---

## Regression Testing

The precompact suite (35 scenarios) and the Step 1 suite (12) pass; the whole fast gate passed, 8405 tests.

---

## Test Artifacts

### Files Reviewed
`shared/resources/develop-pipeline-on-precompact.sh`, its test, `develop-pipeline-step-1-create-branch.md`, `develop-pipeline-step-0-resolve-and-prepare.md`, `step-1-paused-lock.test.mjs`, `develop-pipeline-pause.md`.

### Test Commands Executed
```bash
npm run test:remote
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T301-CR-2.

### Short-term Actions (Non-Blocking)
1. The advisory items in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One real reliability defect in the hook, confirmed by reading.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T301-CR-2 fixed

---

**QA Report**: co-located at `task.301.qa.2.precompact-pause-comment-names-cycle-and-count.md`
**Gate File**: co-located at `task.301.gate.2.precompact-pause-comment-names-cycle-and-count.yml`
**Next Steps**: qa-fix cycle 2, then QA cycle 3.
