# QA Report: Task 308 - Pause commits cancel the step 7 CI poll

**Task**: [Link to task document](./task.308.pause-commits-cancel-the-step-7-ci-poll.md)
**Gate File**: [task.308.gate.2.pause-commits-cancel-the-step-7-ci-poll.yml](./task.308.gate.2.pause-commits-cancel-the-step-7-ci-poll.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-14
**Testing Completed**: 2026-11-14
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 is the refute pass over the whole branch diff against `develop`, at head `7c088725`. Both gate-1 findings are fixed and verified. The refute reviewer found no defect, only two low-confidence cleanups, which stay advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#907)

### Review Methodology

Direct tools plus one read-only refute reviewer (Explore subagent) over the full `origin/develop...HEAD` diff (1274 lines). Diff review: code review (the change set holds a shell hook, a test file and `SKILL.md` runnable prose). Reviewer dispatched 22:18Z; the returned block is in hand (reviewer reported `duration_ms` 28095).

CI on 7c088725b133: pending (read once, never waited on; CI is gated at `/finalise`).

Re-review scope: unscoped, cycle 2 is always the whole branch diff, reviewed to refute.

Step 4b: not applicable to the cycle-2 delta beyond what cycle 1 ran. The change since gate 1 edits prose wording and one test; no fenced block's behaviour changed.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T308-QA-1: 6c writer line held by no test | ✅ FIXED | New test `6c poll block records the acceptance head it starts on, for the later turn to read` runs the shipped writer line and asserts the file content. |
| T308-QA-2: carrier of a held step-7 pause misnamed | ✅ FIXED | Wording names finalise for a pause before 6a and Step 8 for a pause during the 6c wait, at 9 sites in 6 files. Population grep over `shared`, `skills/*/SKILL.md`, `docs` and `CHANGELOG.md` finds no remaining finalise-carries claim; the remaining "own commit carries" hits are task.303's step-8 wording, which is correct. |

## New Findings This Cycle

None blocking. Searched unscoped (cycle 2 refute): full `origin/develop...HEAD` diff, 14 non-generated files. Probed the transitions (teardown, in-flight, error path, reconnect) against the hold, the recorded head and the reader. Two low-confidence cleanups are listed under Code Review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Hook hold at step 7 | PASS | Verified | 17h and 17i green (40/40 hook scenarios) |
| Phase 2: Reader and writer of the recorded head | PASS | Verified | Reader tests plus the new writer test |
| Phase 3: Docs, CHANGELOG, bundles | PASS | Verified | `bundle:check` 0 problems |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

The criteria are unchanged since cycle 1 (`criteria-drift: clean`). The criterion that a pause at step 7 does not push is held by scenario 17h. The criterion that the later turn reads the acceptance head from a recorded file is held by the reader tests and, since this cycle, the writer test. The CHANGELOG citation check passes (`(task 308)`).

---

## Breaking Changes Validation

None.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0. Both cycle-1 bug reports are verified fixed and are closed this cycle.

---

## NFR Assessment

### Performance — PASS
Saves one cancelled CI run per step-7 pause.

### Reliability — PASS
A missing recorded head HALTs; the writer overwrites the file on each poll launch.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No input boundary (a hold/push decision and a state-file presence check). `boundary: false`; `boundary_signals: []`.

### Maintainability — PASS
Writer and reader are both held by committed tests; the wording is consistent.

---

## Code Review

Diff review: code review.

**Correctness bugs (0):** none.

**Cleanups (2):**
- `evals/shared/tests/finalise-publish-boundary.test.mjs:635` — the writer test does not pin the writer's position before the `nohup` launch or run it under every shell in `SHELLS`. Not a defect today. Advisory, recorded in the gate's `recommendations.future`.
- `skills/finalise/SKILL.md:2274` — the head file is not removed beside the result and pid files. Not a defect today: the writer overwrites it before every launch, and the `PR_HEAD` comparison at the top of the block HALTs before an empty `CI_HEAD_2` can be written. Advisory.

mutation-proven: the 6c writer line deleted from `skills/finalise/SKILL.md` → `6c poll block records the acceptance head it starts on, for the later turn to read` → covered (restored with `cmp`, file green, working tree clean).

---

## Regression Testing

The fast gate (`npm run test:remote`) ran green on the fix tree: 8178 ok, 0 not ok. The hook tests pass 40/40; `prettier --check` and `bundle:check` are clean.

---

## Test Artifacts

### Files Reviewed
`shared/resources/develop-pipeline-on-precompact.sh`, its `.test.sh`, `skills/finalise/SKILL.md` (6a, 6c), `evals/shared/tests/finalise-publish-boundary.test.mjs`, `develop-pipeline-hooks.md`, `develop-pipeline-pause.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test evals/shared/tests/finalise-publish-boundary.test.mjs
bash shared/resources/develop-pipeline-on-precompact.test.sh
npm run bundle:check
npm run test:remote
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. The two low cleanups above, if the team wants the writer pinned more tightly.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both findings fixed and verified; the refute pass found no defect.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.308.qa.2.pause-commits-cancel-the-step-7-ci-poll.md`
**Gate File**: co-located at `task.308.gate.2.pause-commits-cancel-the-step-7-ci-poll.yml`
**Next Steps**: review the PR (Step 5c), then `/finalise`.
