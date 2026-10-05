# Bug Report: Task 185 - repeat.mjs counts a skipped run as a pass

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, code review CR-1)
**Date Found**: 2026-10-05

## Description

`evals/shared/repeat.mjs` counts every runner exit 0 as a pass. The runner also exits 0 when it
**skips**: the driver reports itself unavailable (`claude` not on PATH), or a scenario that requires a
live driver runs under replay. So the live pass rate can report a full pass with no agent run at all.

## Steps to Reproduce

```bash
N=$(command node -p process.execPath)
env PATH="$(dirname "$N"):/usr/bin:/bin" DRIVER=claude-cli "$N" \
  evals/shared/repeat.mjs evals/review-pr/scenarios/03-unanchored --runs 2 --min-pass 2
```

## Expected Behavior

A skipped run is not a pass. With no `claude` binary, the command reports that it could not run the
scenario and exits non-zero.

## Actual Behavior

```
[claude-cli] skipped: `claude` binary not found on PATH
run 1/2: pass
run 2/2: pass
03-unanchored: passed 2/2 (min 2)
```

Exit 0.

## Impact

`npm run eval:review-pr:cli` is the only layer that judges the skill. On a machine without `claude`
it reports every scenario green. A success criterion recorded from that output would be false.

## Recommendation

Let `repeat.mjs` tell a skip from a pass. One option: the runner exits with a distinct status for a
skip when the caller asks for it (an env flag), keeping exit 0 for `eval:all`, where a replay skip is
correct. `repeat.mjs` then counts a skip as a failed run, or stops with a could-not-run error. Add a
test that runs `repeat.mjs` with a driver that is unavailable.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-05

**Root cause**: `runner.mjs` exits 0 on both skip paths (driver unavailable; `requiresLiveDriver`
under replay). `eval:all` depends on that, because a replay skip must not fail CI. `repeat.mjs`
read every exit 0 as a pass, and nothing told the two apart.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-05

**Fix**: the runner takes an opt-in `EVAL_SKIP_EXIT` (a code in 3–125; anything else is ignored) and
exits with it on either skip path. `repeat.mjs` sets it to 3. On the first skipped run it prints
`run i/N: skipped`, says it could not run, and exits 3. Nothing counts as a pass. `eval:all` sets
nothing, so it still exits 0 on a skip.

**Files Modified**:

- `evals/shared/runner.mjs` — `skipExitCode()`, used on both skip paths
- `evals/shared/repeat.mjs` — sets `EVAL_SKIP_EXIT=3`; exit 3 on a skip
- `evals/shared/tests/repeat.test.mjs` — skip under replay → exit 3; no `claude` on PATH → exit 3
- `evals/shared/tests/runner-setup.test.mjs` — skip exits 0, or `EVAL_SKIP_EXIT` when it is in range

**Testing**: the reproduction above now exits 3 with `run 1/2: skipped`. Mutants: removing the
env request from `repeat.mjs` turns 2 tests red, and restoring `exit(0)` on the runner's
unavailable-driver path turns 1 red.

**Verification Steps for QA**: re-run the reproduction; expect exit 3 and no `passed` line.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-05 | New | QA Engineer | QA cycle 1, CR-1 |
| 2026-10-05 | In Progress | qa-fix | Investigation |
| 2026-10-05 | Ready for QA | qa-fix | Fix + regression tests, mutation-proven |
| 2026-10-05 | Closed | QA Engineer | QA cycle 2: reproduction re-run → `run 1/2: skipped`, exit 3 |
