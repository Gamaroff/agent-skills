# Bug Report: Task 140 - The trip-wire's needs-fake-gh decline drops the run's escapes, shells and cases

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-5
**Severity**: HIGH
**Priority**: P0
**Status**: Closed
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: the run-time trip-wire branch returned `decline()`, which spreads `base` — `escapes: []`, `cases: []`, `shells: null`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: the branch now returns the decline plus `cases`, `escapes`, `shells`, `fakeGh` and `args`, the same fields `entry-not-probeable` keeps. `executed` stays 0 — nothing is scored.

**Files Modified**:
- `shared/resources/security-probe.mjs` (+ 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md` §5 (+ 2 bundled copies)

**Testing**: new row: a library that writes `$HOME` and reaches `gh` declines `needs-fake-gh` and reports the same escape count as the same library without `gh` (control > 0); shells and cases are carried. Red on the cycle-2 engine, green on the fix.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-30 | New | QA Engineer | QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in cycle 3 5b |
| 2026-09-30 | Closed | QA Engineer | Verified cycle 4; mutation-proven |
