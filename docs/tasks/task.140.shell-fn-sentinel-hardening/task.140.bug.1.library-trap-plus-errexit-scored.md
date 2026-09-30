# Bug Report: Task 140 - A library that installs its own EXIT trap and then fails under set -e is scored, not declined

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✔️ Closed
**Found By**: QA Engineer (QA cycle 1, code review CR-1)
**Date Found**: 2026-09-30

## Description

The shadowed `exit` intercepts an explicit `exit` call, but **errexit does not call the `exit` function** — it ends the shell directly and the EXIT trap decides the status. A library that replaces the harness's EXIT trap and then fails a top-level command under `set -e` therefore ends the harness with that command's status (1), every case mismatches, and the verdict is a scored `absent` — the task.125 shape this task exists to remove. It is a **regression on bash 5 and zsh** for one of the two shapes below: the `||`-form body task.140 replaced declined it (97).

## Steps to Reproduce

Harness body run as `sh -c "$BODY" harness <lib> f` (the bodies are `SHELL_FN_BODY` at `origin/develop` and at `30fbfa13`):

| Library | bash 5.3 base → branch | bash 3.2 base → branch | zsh 5.9 base → branch |
| --- | --- | --- | --- |
| `trap true EXIT; set -e; false; f(){…}` | 0 → 1 | 1 → 1 | 0 → 1 |
| `f(){…}; trap true EXIT; set -e; false` | 97 → **1** | 1 → 1 | 97 → **1** |

## Expected Behavior

Both libraries decline `entry-not-probeable` (exit 97), executed 0, on every shell — §5 of `probe-boundary-rule.md` and the CHANGELOG already say so.

## Actual Behavior

Exit 1; scored.

## Impact

A consumer library of this shape is reported as a missing control rather than "could not look".

## Recommendation

For the duration of the source, also shadow `trap` so a library cannot displace the harness's EXIT trap (drop, or re-arm as ours, any `EXIT`/`0` installation; pass everything else to `builtin trap`), and `unset -f trap` before the harness's own `trap - EXIT`. Add a row for the combined own-trap + errexit library, both orderings.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root cause**: errexit terminates the shell without calling the shadowed `exit` function; the EXIT trap alone decides the exit status, and a library that installed its own trap had replaced the harness's. In the task.136 body the `||` suspended errexit, so the second ordering reached `|| exit 97`; the task.140 simple-command status re-enabled errexit and exposed the gap.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

`SHELL_FN_BODY` also shadows `trap` for the duration of the source: any installation naming `EXIT`, `0` or `SIGEXIT` is dropped, every other trap passes to `builtin trap`. The harness arms its own trap with `builtin trap`, and `unset -f trap` runs before its `trap - EXIT` (which the shadow would otherwise swallow). Verified before editing on bash 5.3, bash 3.2 and zsh 5.9: both orderings 97; own-trap, errexit, last-command-fails, top-level-exit 97; clean 0; function-97 collision 99; a library `trap … INT` still installs.

**Files Modified**:

- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md` §5 (and bundled copies)

**Testing**: New row "a library that replaces the EXIT trap and then fails under set -e is declined, in both orderings" (plus an INT-trap library still scored); red before, green after. Mutant F1 (remove the trap shadow) → that row red (`before.sh`) → covered.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-30 | New | QA (cycle 1) | Filed from code review CR-1 |
| 2026-09-30 | Ready for QA | qa-fix (cycle 1) | Fix + row; mutation-proved |
| 2026-09-30 | Closed | QA (cycle 2) | Verified: the fix row is green on bash + zsh and its mutant reds it; see qa.2 Re-Review Context |
