# Bug Report: Task 124 - `--restore` picks the wrong candidate on GNU coreutils (stat -f is filesystem mode)

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 1, code review finding CR-1

## Description
`shared/resources/advance-pipeline-lock.sh` `restore_lock` reads each candidate's mtime with `stat -f %m "$c" 2>/dev/null || stat -c %Y "$c"`. On BSD/macOS `stat -f %m` is the file's mtime. On GNU coreutils `-f` means *file-system* status: it prints filesystem fields (and on the reviewing container exits 1 after printing them), so `$m` is not an integer, `[ "$m" -gt "$newest" ]` fails, and the first candidate — always `last-halt.json` — wins regardless of age. The 'newest candidate for this document' rule (task.120 bug.5) is therefore not honoured on Linux, which is where CI runs.

## Steps to Reproduce
`docker run --rm -v "$PWD:/mnt" -w /mnt alpine:3 sh -c 'apk add -q bash coreutils jq; bash shared/resources/advance-pipeline-lock.test.sh'` → `FAIL [bash] --restore: orphaned claim` (39 passed, 1 failed). On macOS the same suite is 59/59.

## Expected Behavior
The newest candidate by mtime for this document wins on every platform; the suite is green on Linux CI.

## Actual Behavior
On Linux the older `last-halt.json` is restored over a newer `.pausing.<pid>` claim; the CI lane for this PR will be red.

## Impact
A resume after a PreCompact pause interrupted between claim and snapshot restores stale state; blocks the merge (red CI).

## Recommendation
Read the mtime with one portable form: try `stat -c %Y` first (GNU) and fall back to `stat -f %m` (BSD), validate the result is all digits before comparing, and treat a non-numeric read as 0 with a stderr warning rather than aborting the comparison. Add a numeric guard so a bad read can never silently pick the first candidate.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
`stat -f %m || stat -c %Y` was written for BSD stat and never run on GNU coreutils, where `-f` selects filesystem status. The `||` fallback assumed the BSD form fails on GNU; it prints filesystem fields instead, so the mtime was text and the numeric comparison aborted, leaving the first candidate selected.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
New `mtime_of()` helper in `advance-pipeline-lock.sh`: tries `stat -c %Y` first (GNU), falls back to `stat -f %m` (BSD, where `-c` is an illegal option), and validates the result is all digits — a non-numeric read becomes 0 with a stderr warning rather than an aborted comparison. `newest` starts at -1 so a 0 mtime still selects a candidate.

**Files Modified**:
- `shared/resources/advance-pipeline-lock.sh` — `mtime_of()`, header note
- `shared/resources/advance-pipeline-lock.test.sh` — GNU-shaped `stat` shim scenario (runs on every host) and a garbage-`stat` guard scenario, both under bash and zsh

**Testing**:
- `advance-pipeline-lock.test.sh`: 65/65 on macOS; under real GNU coreutils (`docker run alpine:3` + coreutils) 43/43 — was 39/40
- Mutation: restoring the pre-fix `stat -f … || stat -c …` order turns the GNU-shim scenario red in both shells

**Verification Steps for QA**:
1. `docker run --rm -v "$PWD:/mnt" -w /mnt alpine:3 sh -c 'apk add -q bash coreutils jq; bash shared/resources/advance-pipeline-lock.test.sh'` → 0 failed
2. `bash shared/resources/advance-pipeline-lock.test.sh` on macOS → the two new scenarios pass in bash and zsh

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
| 2026-09-19 | Closed | QA Engineer | Verified fixed in QA cycle 2 |
