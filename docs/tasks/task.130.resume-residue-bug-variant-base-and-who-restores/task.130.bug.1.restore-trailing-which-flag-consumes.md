# Bug Report: Task 130 - `--restore <doc-dir> --which` silently performs a consuming restore

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (Step 3b diff code review CR-1, reproduced by QA)
**Date Found**: 2026-09-20

## Description

The new `--restore` flag parser in `shared/resources/advance-pipeline-lock.sh` (dispatch `case`, `--restore)` arm) consumes `--which` / `--accept-legacy` only while they precede the positional; the loop breaks at the first non-flag argument and the arm then checks only `[ $# -ge 1 ]`, so a trailing flag is ignored. `--restore <doc-dir> --which` — a natural operator spelling, and the query the docs describe as "no writes, nothing consumed" — performs a full restore: the lock is written and the candidate is consumed.

## Steps to Reproduce

```bash
T=$(mktemp -d); mkdir -p "$T/doc" "$T/state"
printf '{"task_or_story_directory":"%s","current_step":5,"halt_step":5}\n' "$T/doc" > "$T/state/snap.json"
PIPELINE_LOCK="$T/state/lock" PIPELINE_HALT_SNAPSHOT="$T/state/snap.json" \
  bash shared/resources/advance-pipeline-lock.sh --restore "$T/doc" --which
ls "$T/state"
```

## Expected Behavior

Either the `--which` query runs (path printed, nothing written, nothing consumed) or the invocation is refused as a usage error.

## Actual Behavior

`advance-pipeline-lock: lock restored from …/snap.json at step 5` — exit 0, `lock` created, `snap.json` consumed. Reproduced by QA on 2026-09-20.

## Impact

The read-only query that `grant-qa-cycles.sh`'s never-lower guard depends on can turn into the very write the guard is meant to precede. The bundled callers pass the flag first, so the pipeline path is unaffected today; an operator or a future caller spelling it last consumes a snapshot with no warning.

## Recommendation

After the flag loop require exactly one remaining positional — `[ $# -eq 1 ] || usage` — so any trailing argument is an error naming the usage, and add a scenario to `advance-pipeline-lock.test.sh` for the trailing-flag spelling (exit 1, no lock, snapshot kept).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 1)

**Root Cause Analysis**: the `--restore)` dispatch arm parsed flags with `while … case … *) break` and then checked `[ $# -ge 1 ]`, which accepts any number of trailing arguments. `restore_lock "$1"` then ran on the directory and silently ignored `--which`/`--accept-legacy` behind it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: after the flag loop, require exactly one remaining positional — `[ $# -eq 1 ] || { echo "advance-pipeline-lock: --restore takes flags BEFORE the <doc-dir>, and exactly one <doc-dir>; got: $*" >&2; usage; }` — so a trailing flag is a usage error (exit 1, nothing written, nothing consumed). The usage text now states the flag order (CR-7 collapsed the duplicate `--restore` lines in the same edit). Also in this file, from the same cycle's advisory findings: the `--which` lock-present notice goes to stderr so stdout is a path or empty (CR-4); `ACCEPT_LEGACY=0` is initialised unconditionally so an exported variable cannot raise it (CR-6).

**Files Modified**:
- `shared/resources/advance-pipeline-lock.sh` — positional-count check; stderr notice; `ACCEPT_LEGACY=0`; usage
- `shared/resources/advance-pipeline-lock.test.sh` — three scenarios: trailing flag → exit 1 / no lock / snapshot kept; `--which` with lock present → empty stdout, exit 0; exported `ACCEPT_LEGACY=1` ignored
- bundled `skills/*/references/advance-pipeline-lock.sh` regenerated

**Testing**: `advance-pipeline-lock.test.sh` 81/81 (bash + zsh). Mutation: `-eq 1` reverted to `-ge 1` → "[bash]/[zsh] --restore trailing flag" red; restored → green.

**Verification Steps for QA**:
1. Re-run the bug's reproduction: exit 1, usage on stderr, no lock, snapshot kept.
2. `--restore --which <dir>` with a lock present prints nothing on stdout.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 1 (CR-1) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 2 (reproduction re-run under bash and zsh; mutation covered) |
