# Bug Report: Task 140 - The trap shadow is bypassed by four library shapes, so an EXIT-trap replacement plus errexit is still scored

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-3
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 2 refute pass, code review CR-1)
**Date Found**: 2026-09-30

## Description

Cycle 1 (TASK-140-BUG-1) shadowed `trap` during the source and dropped installations naming `EXIT` / `0` / `SIGEXIT`. The filter compares names case-sensitively and only intercepts the bare `trap` word. The reviewer verified four shapes that still replace the harness's EXIT trap, after which `set -e; false` ends the harness with exit 1 and the library is scored:

| Shape | Shells |
| --- | --- |
| `trap true exit` (lowercase) | bash 5, bash 3.2 |
| `builtin trap true EXIT` | bash, zsh |
| `command trap true EXIT` | bash |
| a `TRAPEXIT() { … }` function | zsh |

## Expected Behavior

Every way the shell can die during the `source` is the named `entry-not-probeable` decline.

## Recommendation

**Replace the mechanism, do not widen the filter.** Filtering how a library may install a trap is an enumeration over shell syntax that will always have another entry. Instead, have the harness body write a positive "source completed" marker (a per-case file named in the environment) immediately after the source returns successfully; the runner declines `entry-not-probeable` whenever the marker is absent, whatever the exit status. Any exit during the source — explicit, errexit, a replaced trap, `TRAPEXIT` — then leaves no marker. The `trap` shadow becomes unnecessary and can go.

**Provenance.** At `origin/develop` these shapes were also scored, so the verdict is identical at base. Attributed to this change anyway because the diff and rule §5 claim the class ("any exit during the source is the named decline").

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root cause**: the decline was keyed on an exit code, which every trap-install and exit shape can change. Filtering the installations is an open list.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Move (qa-fix Step 2.6, trigger: pipeline offer + repeat subject)**: replace the mechanism — a positive source-completed marker.

The harness body writes `$PROBE_SOURCED` (a per-spawn file under `work/.probe-harness/`, which the escape sentinel skips) only after the source returns 0; the runner declines `entry-not-probeable` whenever the marker is absent, whatever the exit status. The cycle-1 `trap` shadow is removed. A `TRAPEXIT` the library defined is unset (`|| :` — zsh returns 1 for an undefined one, which a library `set -e` turned into an exit).

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md` §5, `CHANGELOG.md`, bundled copies.

**Testing**: Row "any way the shell dies during the source is declined" — lowercase `trap … exit`, `builtin trap`, `command trap`, zsh `TRAPEXIT`, `exec` — red before, green after, no escapes. Mutant G1 (drop the marker check) reds it and the cycle-1 trap row; G5 (drop `|| :`) reds the task.136 set -e row.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-30 | New | QA (cycle 2) | Filed from the refute pass |
| 2026-09-30 | Ready for QA | qa-fix (cycle 2) | Mechanism replaced; mutation-proved |
