# Bug Report: Task 123 - The grant write targets a lock that no resume path recreates

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2 — refute pass, CR-1 — verified)
**Date Found**: 2026-09-19

## Description
The re-entry rule (resume contract step 3, both SKILL.md Phase 0b) writes the grant into `.claude/state/develop-pipeline.lock` on the strength of the parenthetical "the orchestrator recreates the lock from the snapshot at Step 1 of the resume" — but no such procedure exists: the lock is written only at the end of `/create-branch` (which a resume skips), every terminal HALT removes it, and the pause doc's lifecycle names no restore. On the real re-entry path the `jq` fails with "Could not open file", the grant is never persisted, `set-qa-phase.sh 5a` noops (no lock), Loop Setup reads `qa_max_cycles // 5`, and `NEXT_CYCLE > 5` goes straight back to Loop Escalation. Fixture 12 cannot see this: its replay tree pre-seeds a lock that already carries the grant.

## Steps to Reproduce
See the QA report (`task.123.qa.2.qa-loop-exits-and-re-entry.md`, Code Review section, CR-1) — the reproduction is in the finding.

## Expected Behavior
A grant recorded at re-entry lands on a lock that exists for the rest of the resumed run — restored from the halt snapshot (a superset of the lock) minus the halt-only fields — so the hooks, `set-qa-phase.sh` and Loop Setup all see it.

## Actual Behavior
The write fails on a missing file; the resumed run has no lock and no budget.

## Impact
Phase 3's whole mechanism is inert on the path it was built for; cycle 1's CR-1 fix (`qa_max_cycles`) is correct arithmetic on a file that is not there.

## Recommendation
Fold the grant into a script beside `set-qa-phase.sh` — `grant-qa-cycles.sh <doc-dir> <k>` — that reconstructs the cycle count from disk, restores the lock from the halt snapshot when absent (dropping `halted_at`/`halt_reason`/`halt_step`/`paused_at`/`pause_reason`), and writes both fields atomically; state the restore rule in the resume contract; keep fixture 12's replay tree as the expected end state (replay executes nothing) and pin the restore in the script's own bash suite.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 2 (CR-1) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 2 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The grant's target was assumed to exist; no resume path recreates the lock a HALT removes.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- New `shared/resources/grant-qa-cycles.sh <doc-dir> <k>`: reconstructs the highest gate on disk, **restores the lock from the halt snapshot when absent** (dropping `halted_at`/`halt_reason`/`halt_step`/`paused_at`/`pause_reason`, keeping every pipeline field), writes `extra_cycles_granted` and `qa_max_cycles = QA_CYCLE + k` atomically, removes its temp file on every failure; refuses bad `k`, no gates, no lock + no snapshot, non-object lock.
- Cited from the step doc (bundles into develop-task/develop-story); the resume contract, both SKILL.md Phase 0b blocks call it as one line; the restore is named in the pause doc's lock lifecycle.
- The pre-existing gap (no resume of any kind restores the lock) is recorded in the pause doc and gate 2's `recommendations.future`.

**Files Modified**:
- `shared/resources/grant-qa-cycles.sh` (new), `shared/resources/grant-qa-cycles.test.sh` (new, 23), `package.json`
- `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-pause.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (writer pinned to the script; call sites must not inline jq)

**Testing**:
- `grant-qa-cycles.test.sh` 23/23 (restore from snapshot: halt fields dropped, pipeline fields kept; PreCompact fields dropped; snapshot untouched); mutation: restore disabled → 2 red; `5 + k` → 6 red + parity red.

**Verification Steps for QA**:
1. Remove the lock, leave a `last-halt.json`, run `bash .agents/skills/develop-task/references/grant-qa-cycles.sh <dir with gate.6> 2` → lock exists with `qa_max_cycles: 8`, no `halt_reason`.
2. `grep -rn 'recreates the lock from the' shared skills` → no hits.
| 2026-09-19 | Closed | QA | Verified in QA cycle 3: fix present on `18b5328f`, re-executed (grant restore, stale-count guard, escalation row, CHANGELOG) |
