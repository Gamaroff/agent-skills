# Bug Report: Task 125 - tracker-issue.js pipes stderr only in `gh()`; the `withStdin` path every `--body-file` create takes still ignores it

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Diff code review CR-1 (verified by reading lines 843–856)
**File**: `shared/resources/tracker-issue.js:849`

## Description
`GH_EXEC_STDIO` is applied inside `gh()` (line 314), but `perform()` routes `create` and `edit` through a separate `withStdin()` closure whenever `--body-file` is passed, and that closure still spawns with `stdio: ["pipe","pipe","ignore"]`. `ensure-bug-github-issue` Step B5 always passes `--body-file`, so on the exact call site obs #65 describes gh's stderr line is still dropped and the failure message still names only the argv.

## Steps to Reproduce
1. `execImpl` stub that throws with `e.stderr` set on `issue create`.
2. Run `--kind create --title T --repo acme/repo --body-file body.md`.
3. Observe the warning carries only `Command failed: gh …` — no stderr line.
The §9 tests all omit `--body-file`, which is why they pass.

## Expected Behavior
Every kind, on every path (`plain` and `withStdin`), reports gh's first non-empty stderr line ahead of the argv.

## Actual Behavior
Only the `plain` path does; the `--body-file` path — the one the bug pipeline uses — is unchanged.

## Impact
Success criterion 4 ("Any `tracker-issue.js` failure message carries gh's own first line") is not met on the path that motivated the task.

## Recommendation
Spawn `withStdin` with stderr piped (`stdio: ["pipe","pipe","pipe"]`) so `e.stderr` is attached; add a §9 case that creates with `--body-file` against the fake gh (in-process and end-to-end) — mutation: revert the stdio and that case must go red.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: `GH_EXEC_STDIO` was applied inside `gh()` only; `perform()` builds a separate `withStdin` closure for every `--body-file` create/edit, spawned with `stdio: ["pipe","pipe","ignore"]`. The §9 tests exercised the argv-only path, so the fix was green on the path the bug pipeline never takes.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: Hoisted both stdio constants beside `GIT_EXEC_OPTS` (`GH_EXEC_STDIO` for argv calls, `GH_EXEC_STDIO_STDIN` — stdin, stdout and stderr all piped — for the body-file closure) and pointed `withStdin` at the second. `ghFailureArgv()` trims `execFileSync`'s message to its first line so the stderr line is not printed twice once stderr is piped.

**Files Modified**:
- `shared/resources/tracker-issue.js` — `GH_EXEC_STDIO_STDIN`, `withStdin` uses it, `ghFailureArgv()`
- `shared/resources/tests/tracker-issue.test.mjs` — §9b: body-file create asserts the spawn stdio and the surfaced line; body-file end-to-end with a fake gh that drains stdin; body-file edit
- 20 bundled `references/tracker-issue.js` copies

**Testing**: §9b ×3 green; mutation: `GH_EXEC_STDIO_STDIN` stderr reverted to `ignore` → 3 red; `ghFailureArgv` trimming dropped → 2 red. Full `npm run ci:fast` 3685/3685.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 1 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
