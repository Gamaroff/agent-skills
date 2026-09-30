# Bug Report: Task 140 - The trip-wire's needs-fake-gh decline drops the run's escapes, shells and cases

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-5
**Severity**: HIGH
**Priority**: P0
**Status**: New
**Found By**: QA Engineer (QA cycle 3, code review CR-1)
**Date Found**: 2026-09-30

## Description

When the run-time trip-wire fires, `runProbeSpec` returns `decline("needs-fake-gh", …)`, which spreads `base` — so the escapes the sentinel recorded during the run are replaced by `[]`, and `cases` and `shells` are dropped. The `entry-not-probeable` branch keeps them deliberately (task.136 cycle 4, CR-3: "a side effect observed during runs that then errored is still a side effect"). A library that both writes outside the sandbox and reaches `gh` therefore loses its escape evidence. The cycle-2 row's `assert.deepEqual(r.escapes, [])` passes for this very reason and cannot catch it.

## Steps to Reproduce

Library `f() { : > "$HOME/escaped"; X=gh; "$X" api x >/dev/null 2>&1; printf '%s\n' "$1"; }`, no `--fake-gh`, the label cases: result `needs-fake-gh`, executed 0, **escapes 0, shells null, cases 0**. The same library without the `gh` call reports **20** escapes.

## Expected Behavior

The decline carries `escapes`, `shells`, `cases` and `fakeGh`, as `entry-not-probeable` does.

## Recommendation

Return the collected evidence in the run-time decline; replace the vacuous `escapes: []` assertion with a row whose library writes `$HOME` and reaches `gh`, asserting the escapes are reported.
