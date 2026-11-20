# QA Report: Task 284 - Migrate shipped payload heredocs to the file tool

**Task**: [Link to task document](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Gate File**: [task.284.gate.2.migrate-payload-heredocs-to-file-tool.yml](./task.284.gate.2.migrate-payload-heredocs-to-file-tool.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Testing Completed**: 2026-11-20
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 is a refute pass over the whole branch diff. Both cycle-1 findings are fixed and verified. The refute pass found one new medium defect in the cycle-1 fix itself: a deferred comment whose journal write fails loses its only copy.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed
- [x] Tests passing (full CI-parity gate on the LAN server for the fix commit; PR CI green on the head)
- [x] Code on the feature branch with an open PR (#923)

### Testing Approach

- [x] Automated testing (engine tests, 108 pass under `TMPDIR=/tmp`)
- [x] Regression testing (create-issue guard probed in a temporary directory)
- [x] Code review (refute pass)

### Review Methodology

Direct tools plus one read-only Explore reviewer with the refute directive over `origin/develop...HEAD`, excluding the generated `references/` copies and the task directory (33 files, 88 KB patch).

Diff review: code review.
Step 4b: the changed blocks were exercised in cycle 1; this cycle ran the create-issue pre-flight block directly in a temporary directory (see Regression Testing).
CI on ecb8ba8a258b: green (`CI_SUMMARY=CI on ecb8ba8a258b: green`).
Reviewer time: dispatched 10:47Z, returned in 53,710 ms (`duration_ms` from the completion notice).

Re-review scope: files changed since gate 1 would be the cycle-1 fixes only; this cycle is unscoped by design (cycle 2 is always a full refute pass over the whole branch diff).

### Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-284-CR-1 (create-issue posts a stale body), bug 1 | ✅ FIXED | The pre-flight block halts on a missing file, an empty file, a file naming another document, and an unsubstituted slot or token. Control with a correct body passes (rc 0). |
| TASK-284-CR-2 (tracker-comment sites post a stale body), bug 2 | ✅ FIXED | The engine removes the body file on posted, already and deferred; the new engine tests pass; the qa-task and qa-story blocks halt on a missing file and remove it after the post attempt. One residual is recorded below (reviewer CR-2). |

---

## New Findings This Cycle

- **[medium]** `shared/resources/tracker-comment.js:810` — a deferred outcome with no journal record still removes the body file, so the comment is lost → keep the file unless `payload.record` is set (bug 3, gate issue TASK-284-C2-CR-1).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–5 | PASS | Verified in cycle 1 | Cycle 1 fixes reviewed in this pass; one defect found in the engine fix |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

No criterion changed (`criteria-drift`: clean). The criterion that every changed block still runs under `qa-execute-snippets` holds only for the runnable subset, as recorded in cycle 1; the rest are held by the test suites.

CHANGELOG citation: `cites (task 284)`.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: A deferred comment loses its only copy when the journal write fails**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.284.bug.3.deferred-comment-loses-its-body-when-the-journal-write-fails.md](./task.284.bug.3.deferred-comment-loses-its-body-when-the-journal-write-fails.md)
- **Observation**: Reproduced by execution. With `ACCESS_TRACKER=manual` and an unwritable journal the result is `reason=deferred record=none bodyFileExists=false`. Control with a working journal: `record` set, file removed (correct). Against the base engine the file survives both runs.
- **Impact**: the comment is neither posted nor journalled nor on disk.
- **Recommendation**: consume on `deferred` only when a record id exists.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Measured in cycle 1 (610,751 ms against 631,771 ms on `develop`). Not re-measured; cycle 1 added one unlink.

### Reliability — CONCERNS
The deferred-no-record path above.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No boundary is added and the criteria carry no boundary signal. Every importer of the engine passes a throwaway state file, so the unlink cannot reach a durable file.

### Maintainability — PASS
The rule lives once, in the engine.

---

## Code Review

Route: code review, refute pass. Boundary: false. No predicate-shaped function is added; the engine change is a file removal in `emit`.

**Correctness bugs (3):**
- [medium/high] `shared/resources/tracker-comment.js:810` — deferred with no record still consumes the file → keep it unless `payload.record` is set. **Reproduced by QA; promoted to the gate as TASK-284-C2-CR-1** (origin: code-review, reproduced by QA).
- [low/medium] `shared/resources/tracker-comment.js:581` — a failed or unverifiable post keeps the file at the shared fixed path, so a later call that skips its write posts the stale body. Not reproduced; advisory. Recorded in `recommendations.future`.
- [low/medium] `skills/qa-task/SKILL.md:2033` — the lead is folded into the body file in place, so a re-run after an interruption prepends a second lead. The same applies to `qa-story`. Not reproduced; advisory.

**Cleanups (0):** none.

mutation-proven: consuming set emptied in the engine → three of the four new tests red (cycle 1, run by the developer) → dev-only for this cycle. QA did not re-run the mutation this cycle: not-run.

---

## Regression Testing

- Engine tests under `TMPDIR=/tmp CI=true`: 108 pass, 0 fail (`tracker-comment.test.mjs`, the payload-heredoc ratchet test, the qa-read-back block test).
- create-issue pre-flight block, run in a temporary directory with the slot substituted: correct body → rc 0; missing file, empty file, a body naming another document, an unsubstituted slot, and a token left in the body → rc 1, each with its own HALT line. The first control run failed only because my fixture used backticks inside a `printf`; the rerun with a plain fixture passed.

---

## Test Artifacts

### Test Commands Executed

```bash
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 923
TMPDIR=/tmp CI=true node --test shared/resources/tests/tracker-comment.test.mjs shared/resources/tests/payload-heredoc-ratchet.test.mjs tests/qa-read-back-block.test.js
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
command node .agents/skills/qa-task/references/probe-boundary-signals.mjs --doc <task> --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix bug 3 (TASK-284-C2-CR-1) and add the two tests it names.

### Short-term Actions (Non-Blocking)
1. State the single-use residual in the contract, or add a stage check (reviewer CR-2).
2. Fold the lead into a copy in the qa-task and qa-story post blocks (reviewer CR-3).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one open medium finding, in the cycle-1 engine fix.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix TASK-284-C2-CR-1 before merge.

---

**QA Report**: co-located at `task.284.qa.2.migrate-payload-heredocs-to-file-tool.md`
**Gate File**: co-located at `task.284.gate.2.migrate-payload-heredocs-to-file-tool.yml`
**Next Steps**: `/qa-fix` for bug 3, then the next gate.
