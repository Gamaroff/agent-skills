# QA Report: Task 203 - Migrate documents to hierarchical numbering (cycle 3)

**Task**: [Link to task document](./task.203.migrate-doc-numbering.md)
**Gate File**: [task.203.gate.3.migrate-doc-numbering.yml](./task.203.gate.3.migrate-doc-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline, cycle 3)
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Bug | Status this cycle | Evidence |
| --- | --- | --- | --- |
| CR-1: revert erases uncommitted work | [bug 2](./task.203.bug.2.revert-hint-does-not-revert.md) | ✅ FIXED (closed) | Tests `cycle 2 CR-1: a dirty file …` and `cycle 2 CR-1/CR-7: the revert touches only …` (real git) green; the in-place dirty check, the scoped restore and the rooted `cd` are each mutation-proven |
| CR-2: story-number collision passes the dry run | [bug 5](./task.203.bug.5.story-number-collision-unblocked.md) | ✅ FIXED (closed) | Test `cycle 2 CR-2` green; mutation → red |
| CR-3: an apply failure strands the tree | [bug 6](./task.203.bug.6.apply-failure-strands-tree.md) | ✅ FIXED (closed) | Test `cycle 2 CR-3` green; try/catch removed → red; progress ignored → red |
| CR-4 to CR-7 (advisory) | — | ✅ FIXED | Root, `.git` and `node_modules` refused; realpath containment; the untracked monolith is edited; the revert is rooted. All mutation-proven |

---

## Executive Summary

Every cycle-2 fix holds. The reviewer found no high-confidence defect in the cycle-2 changes. It recorded two medium- or low-confidence edge cases in the revert of untracked files and of a part-way failure, neither reachable in this repository, plus two cleanups.

The boundary probe still engages, and the migrated repository still checks clean.

**Overall Assessment**: CONCERNS (advisory only; the queue is empty)
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (44/44 engine; `ci:fast` 5648 at `954bd33b`)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#671)

### Review Methodology

Direct tools plus one dispatched reviewer, dispatched at 08:21Z and returned in 149 s (`duration_ms` 149282). Step 4b is not applicable (no runnable prose).

Re-review scope: files changed since gate 2 (head b210c0bb5819; 14 files) — default. The reviewable code among them is `shared/resources/migrate-doc-numbering.mjs` and its test; the other 12 are this task's QA evidence.

**Gate head**: `954bd33bf3d1fe182cdc027f8078159ec1a94b8a`.

---

## New Findings This Cycle

- **[medium/medium]** `shared/resources/migrate-doc-numbering.mjs:1455` — an untracked file the run both moves and rewrites is named for moving back by hand, but nothing says its text was changed. Advisory: every moved file in this repository is tracked.
- **[low/medium]** `shared/resources/migrate-doc-numbering.mjs:1267` — after a part-way failure the revert does not name the empty directories already created for moves that never ran. Advisory.
- Two cleanups: CR-3, a dead `inPlace.includes` guard; CR-4, a re-parse where `newShort` already holds the id.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Dependency gate | PASS | Verified | |
| Phase 1: Discover and plan | PASS | Verified | `id-collision` blocker added |
| Phase 2: Blockers and verification | PASS | Verified | `dirty-path` covers every changed path |
| Phase 3: Apply and the CLI | PASS | Verified | Touch record, scoped revert, wrapped apply |
| Phase 4: Migrate this repository | PASS | Verified | `--check` answers `already`, corpus ok |

**Overall Phase Completion**: 5/5.

---

## Success Criteria Verification

The cycle-1 table (`task.203.qa.1.migrate-doc-numbering.md`) holds. The criterion that failed at cycle 2 now passes:

| Criterion | Evidence | Status |
| --- | --- | --- |
| No partial apply ("none writes until all have passed") | `id-collision` blocks the dry run (`cycle 2 CR-2`); a part-way failure returns `post-check-failed` with a revert (`cycle 2 CR-3`) | PASS |
| Rollback is safe | The revert names only the run's own paths and keeps unrelated dirty work (`cycle 2 CR-1/CR-7`, real git) | PASS |

---

## Breaking Changes Validation

The task's § 10 and § 11 now describe the scoped revert and the widened `dirty-path`. **Overall**: PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0 (gating), LOW: 0. Two advisory edge cases and two cleanups are listed above.

---

## NFR Assessment

### Performance — PASS
The dry run answers `already` in 0.3 s on head, and the migration-pending run measured 2.248 s.

### Reliability — CONCERNS
These are advisory only, CR-1 and CR-2 above, and are not reachable here.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (copied from `task.203.qa.3.security.run.json` `totals.executed`)
- **Boundary**: `true`, probed through `shared/resources/migrate-doc-numbering.mjs#checkPrdRoot` with `--sink path`. Verdict `engages`: 0 reproduced, 0 escapes.

### Maintainability — PASS
There are 44 tests, and every fix in both cycles is mutation-proven.

---

## Code Review

`code_review_blocking=true`; nothing qualified (no `bug` + `high` confidence). Every anchor checked `ok`.

**Correctness bugs (2, advisory):**
- [medium/medium] `shared/resources/migrate-doc-numbering.mjs:1455` — untracked moved-and-rewritten files are not flagged in the revert. Fix: mark them, or refuse them.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:1267` — the new empty directories are not named in a partial revert. Fix: track the `mkdirp` calls.

**Cleanups (2):**
- `shared/resources/migrate-doc-numbering.mjs:1428` — dead guard. Fix: remove it.
- `shared/resources/migrate-doc-numbering.mjs:575` — re-parse. Fix: key on `newShort`.

**Boundary**: `true`, `probes_executed: 11`, verdict `engages`.

**Mutation proofs** (re-run by QA this cycle against the committed tests, with snapshot restore; no tracked file was modified before or after):

```
mutation-proven: in-place dirty check off → cycle 2 CR-1: a dirty file … → covered
mutation-proven: root re-added to the restore → cycle 2 CR-1/CR-7 … → covered
mutation-proven: top-level cd removed → cycle 2 CR-1/CR-7 … → covered
mutation-proven: id-collision disabled → cycle 2 CR-2 … → covered
mutation-proven: progress ignored → cycle 2 CR-3 … → covered
mutation-proven: apply try/catch removed → cycle 2 CR-3 … → covered
mutation-proven: repository root accepted → QA-1: checkPrdRoot refuses … → covered
mutation-proven: .git accepted → QA-1: checkPrdRoot refuses … → covered
mutation-proven: lexical containment → QA-1: checkPrdRoot refuses … → covered
mutation-proven: move sources not candidates → cycle 2 CR-6 … → covered
```

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Engine | `node --test` | PASS (44/44) |
| Full hermetic suite | `ci:fast` at `954bd33b` | PASS (5648) |
| The migrated repository | `--check` | PASS (`already`) |

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: flag untracked moved-and-rewritten files in the revert.
2. CR-2: name the created directories in a partial revert.
3. CR-3 and CR-4: cleanups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No open finding. Reliability CONCERNS records two advisory edge cases that are not reachable in this repository.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL. The conditions are in the gate.

---

**QA Report**: co-located at `task.203.qa.3.migrate-doc-numbering.md`
**Gate File**: co-located at `task.203.gate.3.migrate-doc-numbering.yml`
**Next Steps**: hand to Step 5c (`/review-pr`), the loop's exit gate.
