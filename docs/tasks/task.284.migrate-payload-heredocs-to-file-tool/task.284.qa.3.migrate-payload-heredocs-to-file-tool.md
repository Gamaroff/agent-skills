# QA Report: Task 284 - Migrate shipped payload heredocs to the file tool

**Task**: [Link to task document](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Gate File**: [task.284.gate.3.migrate-payload-heredocs-to-file-tool.yml](./task.284.gate.3.migrate-payload-heredocs-to-file-tool.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Testing Completed**: 2026-11-20
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 verifies the cycle-2 fix for bug 3. The fix holds: a deferred outcome whose journal write failed keeps its body file, and one with a journal record removes it. All three bugs are closed.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools plus one light read-only Explore review of the cycle-2 fix (commit 9cbd6f57a).

Diff review: code review.
CI on 9cbd6f57ae17: pending (`CI_SUMMARY=CI on 9cbd6f57ae17: pending`). Recorded, not waited on; CI is gated once at finalise.
Reviewer time: dispatched 11:05Z, returned in 46,370 ms (`duration_ms` from the completion notice).

Re-review scope: files changed since gate 2 (head ecb8ba8a2; 5 non-generated files) — default.

### Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-284-C2-CR-1 (a deferred comment loses its body when the journal write fails), bug 3 | ✅ FIXED | Reproduction on the head: with a working journal `record=7f2f51ea bodyFileExists=false`; with an unwritable journal `record=none bodyFileExists=true`. Cycle 2 showed `bodyFileExists=false` for the second case. |

---

## New Findings This Cycle

None. Searched files changed since gate 2: `tracker-comment.js`, its test file, the contract, file-write-rules and the CHANGELOG. The review enumerated every site that emits `deferred`, the Jira helper and the pause hook, and found no case that is consumed wrongly. Three low advisories are recorded under Code Review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–5 | PASS | Verified | No change since cycle 2 |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

No criterion changed (`criteria-drift`: clean). The criterion that every changed block still runs under `qa-execute-snippets` holds only for the runnable subset, as recorded in cycle 1.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Measured in cycle 1; not re-measured.

### Reliability — PASS
Bug 3 is fixed and verified on the head.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No boundary is added and the criteria carry no boundary signal.

### Maintainability — PASS
One stale comment remains (advisory).

---

## Code Review

Route: code review, scoped. Boundary: false; the change is a boolean guard on a file removal, not an input gate.

**Correctness bugs (1):**
- [low/low] `shared/resources/tracker-comment.js:586` — a kept body file at the fixed path can be re-posted by a later call that skips its write. Not reproduced; the QA blocks check a cycle-specific line first. Advisory.

**Cleanups (2):**
- `shared/resources/tracker-comment.js:573` — the comment above `CONSUMING_REASONS` still says any deferred outcome consumes the file → reword.
- `shared/resources/file-write-rules.md:52` — the edited line is long and uses different words from the contract → rewrap, one phrase.

mutation-proven: guard replaced by `true` in `emit` → "a deferred outcome whose journal write failed keeps the body file" went red (85 pass, 1 fail) → covered. The proof was run by the developer in cycle 2 and by the reviewer in a scratch copy in cycle 3; QA did not re-run it on the working tree.

---

## Regression Testing

Engine test file under `TMPDIR=/tmp CI=true`: 86 pass, 0 fail. The full CI-parity gate on the LAN server for the fix commit exited 0.

---

## Test Artifacts

### Test Commands Executed

```bash
node <scratchpad>/repro-cr1.cjs
TMPDIR=/tmp CI=true node --test shared/resources/tests/tracker-comment.test.mjs
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 923
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
```

---

## Recommendations

### Short-term Actions (Non-Blocking)
1. Reword the stale comment above `CONSUMING_REASONS`.
2. Say in the contract that a kept body file relies on the pre-post freshness assertion.
3. Fold the lead into a copy in the qa-task and qa-story post blocks.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding; all three bugs closed.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.284.qa.3.migrate-payload-heredocs-to-file-tool.md`
**Gate File**: co-located at `task.284.gate.3.migrate-payload-heredocs-to-file-tool.yml`
**Next Steps**: Step 5c `/review-pr` as the exit gate.
