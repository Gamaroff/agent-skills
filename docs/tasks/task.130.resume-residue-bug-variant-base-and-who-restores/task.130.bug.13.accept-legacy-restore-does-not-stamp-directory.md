# Bug Report: Task 130 - `--restore --accept-legacy` rebuilds the lock without stamping `task_or_story_directory`, so the recovery does not stick

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: Step 5c `/review-pr` code lens CR-1 (confirmed by reading the rebuild)
**Date Found**: 2026-09-20

## Description

`advance-pipeline-lock.sh --restore --accept-legacy <doc-dir>` rebuilt the lock with the same jq filter as an ordinary restore (`:251`), which never sets `task_or_story_directory`. The flag is the operator asserting which document a pre-task.123 snapshot belongs to; discarding that assertion means the rebuilt lock is itself directory-less, and the next PreCompact pause or HALT snapshots a legacy-shaped file again — refused by the next `--restore`, unmatched by the detector's directory filter, and eligible for Step 8's sole-legacy delete from *any other* document's completed run.

## Steps to Reproduce

```bash
printf '{"current_step":7,"halt_step":7}\n' > .claude/state/develop-pipeline.last-halt.json
bash shared/resources/advance-pipeline-lock.sh --restore --accept-legacy docs/tasks/task.X
jq -r '.task_or_story_directory // "ABSENT"' .claude/state/develop-pipeline.lock   # → ABSENT (before the fix)
```

## Expected Behavior

The restored lock carries `task_or_story_directory: <doc-dir>`; a snapshot of it restores again **without** the flag. A candidate that already names a directory keeps its own.

## Actual Behavior

The field is absent; the recovery has to be repeated with the flag on every resume, and the snapshot is exposed to the legacy-cleanup delete in between.

## Impact

Medium. Confined to pre-task.123 snapshots, and the operator sees a refusal rather than a silent loss on the next resume — but the interval between exposes the snapshot to a delete the flag was meant to end.

## Recommendation

Stamp the directory in the rebuild jq when the candidate carries none; assert the stamp and the second flag-less restore in the shell suite.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 7 — after 5c CONCERNS, operator chose to spend the last granted cycle)

**Root Cause Analysis**: the `--accept-legacy` flag gated the *selection* of a directory-less candidate but the *rebuild* was shared with the ordinary path and never wrote the field the flag stands for.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: the rebuild jq takes `--arg dir "$doc_dir"` and sets `.task_or_story_directory` when it is absent or empty (`//` fill, never an overwrite). Three scenarios added: the rebuilt lock is stamped; a snapshot of that lock restores again without the flag (the recovery sticks, proven end to end); a matched candidate keeps its own directory under the flag. Hooks troubleshooting row says the flag is needed once.

**Files Modified**:
- `shared/resources/advance-pipeline-lock.sh` — stamp in the rebuild
- `shared/resources/advance-pipeline-lock.test.sh` — +3 scenarios per shell (91/91)
- `shared/resources/develop-pipeline-hooks.md` — troubleshooting row
- bundled `skills/*/references/` regenerated

**Testing**: 91/91 under bash and zsh; mutation: stamp line removed → "directory stamp" and "recovery sticks" red under both shells (4 red), the no-overwrite scenario green as designed. `ci:fast` 3574/3574; `eval:develop-task` 13/13; grant suite 42/42; shellcheck clean; `bundle:check` 0.

**Verification Steps for QA**: run the reproduction above → the field reads `docs/tasks/task.X`; snapshot the lock and `--restore` without the flag → exit 0.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | review-pr (5c) | Code lens CR-1, confirmed |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
