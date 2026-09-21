# Bug Report: Task 136 - A top-level `exit` in a sourced library ends the harness shell before the exit-97 sentinel, scoring `absent` with a full count

**Task**: [Link](./task.136.shell-fn-probe-entry-form.md)
**Bug ID**: TASK-136-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2 refute pass, CR-1; CR-3 of the same pass is the sibling errexit case)
**Date Found**: 2026-09-21

## Description

`SHELL_FN_BODY` guards the source with `source "$1" || exit 97`, but `source` runs the library in the harness shell itself, so a top-level `exit N` inside the library terminates the harness with `N` before the `||` is ever reached. Every case then mismatches (`exit N ≠ 0`, empty stdout) and the verdict is a **scored** `absent` with a full count — the task.125 shape this form exists to end — while the engine's own comment claims "an `exit` in the library" is caught by the 97 sentinel. The sibling (CR-3): a library that sets `set -e` at top level makes errexit fire on the non-zero subshell before `rc=$?` and the 97/98→99 remap run, so the cycle-1 collision fix is inert for exactly the libraries that use errexit.

## Steps to Reproduce

```bash
printf 'f() { echo hi; }\nexit 1\n' > /tmp/lib-exit.sh
printf 'set -e\nf() { return 97; }\n' > /tmp/lib-sete.sh
BODY='source "$1" || exit 97; shift; fn="$1"; shift; typeset -f "$fn" >/dev/null 2>&1 || exit 98; ( "$fn" "$@" ); rc=$?; case $rc in 97|98) exit 99;; esac; exit $rc'
bash -c "$BODY" probe /tmp/lib-exit.sh f x; echo $?   # 1 — want 97
bash -c "$BODY" probe /tmp/lib-sete.sh f x; echo $?   # 97 — want 99
```

Reproduced under bash and zsh.

## Expected Behavior

A top-level `exit` in the library → exit 97 (source failed, one named decline). A function's own 97/98 under `set -e` → 99, scored.

## Actual Behavior

rc = the library's exit (scored as a mismatch on every case → `absent`); rc = 97 (declined as a broken library).

## Impact

A library shaped `source x || exit 1` at top level — an ordinary guard — probes as `absent` behind a full count, which is a false finding that Step 8a cannot fix inside the task. The errexit case turns a scorable rejection into a decline.

## Recommendation

Verified under bash and zsh by QA: `trap 'exit 97' EXIT; source "$1" || exit 97; trap - EXIT; …; ee=; case $- in *e*) ee=1;; esac; set +e; ( [ -n "$ee" ] && set -e; "$fn" "$@" ); rc=$?; …` — the EXIT trap re-maps an exit inside the sourced file to the sentinel; errexit is snapshotted from `$-`, switched off in the harness so `rc=$?` always runs, and re-enabled inside the subshell so the function keeps the semantics its library set. Add two rows: a library ending in `exit 1` → `entry-not-probeable`; `set -e` + `return 97` → scored `exit 99 ≠ 0`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 2)

**Root Cause Analysis**: `source` executes the library in the harness shell, so an `exit` at the library's top level is the harness's own exit; `|| exit 97` is never reached. Separately, errexit inherited from a `set -e` library fires on the non-zero status of `( "$fn" "$@" )` before `rc=$?` runs, so the cycle-1 remap never executes.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: the QA-verified body — `trap 'exit 97' EXIT; source "$1" || exit 97; trap - EXIT; …; ee=; case $- in *e*) ee=1;; esac; set +e; ( [ -n "$ee" ] && set -e; "$fn" "$@" ); rc=$?; case $rc in 97|98) exit 99;; esac; exit $rc` — the EXIT trap re-maps a top-level exit to the sentinel and is disarmed after a normal return; errexit is snapshotted from `$-`, off in the harness, on inside the subshell.

**Files Modified**:
- `shared/resources/security-probe.mjs` — `SHELL_FN_BODY`; comment at the exit-97 branch corrected
- `shared/resources/tests/security-probe.test.mjs` — rows "a library that exits at top level is declined via the EXIT trap" (executed 0, `source … failed (exit 97)`) and "under set -e the function's own 97 is still re-mapped and scored" (`exit 99 ≠ 0`; and errexit still stops `false; printf` inside the function)
- `shared/resources/probe-boundary-rule.md` §5 — states the trap and the errexit restore

**Testing**: suite 66/66; mutation-proven — EXIT trap removed → BUG-2 row red; errexit snapshot removed → CR-3 row red.

**Verification Steps for QA**:
1. A library ending in `exit 1` → `unverifiable` / `entry-not-probeable`, `executed 0`
2. `set -e` + `return 97` → the case's detail reads `exit 99 ≠ 0`, `declined.length 0`

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Found in QA cycle 2 refute pass (CR-1 + CR-3) |
| 2026-09-21 | In Progress | Claude (qa-fix) | Investigation started |
| 2026-09-21 | Ready for QA | Claude (qa-fix) | EXIT trap + errexit snapshot, two rows |
| 2026-09-21 | Closed | QA Engineer | Verified by execution on a99f881f (QA cycle 3): top-level exit → entry-not-probeable executed 0; set -e + return 97 → exit 99 ≠ 0, declined 0; mutants (trap removed; disarm removed) red their rows |

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**Result**: FIXED — a library ending `exit 1` → `unverifiable` / `entry-not-probeable`, `executed 0`, detail `source … failed (exit 97)`; `set -e` + `return 97` → the hostile case's detail reads `exit 99 ≠ 0`, `declined 0`, executed 20. Mutation: EXIT trap removed → BUG-2 row red; trap disarm removed → the green row goes red (a normal return would exit 97). Residual limit recorded as cycle-3 CR-1 (a library that installs its *own* EXIT trap displaces the guard) — advisory, `future`.
