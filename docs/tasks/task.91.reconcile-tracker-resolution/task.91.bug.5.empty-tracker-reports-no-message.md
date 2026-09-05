# Bug Report: Task 91 - an empty-but-successful resolution aborts with no message

**Task**: [Link](./task.91.reconcile-tracker-resolution.md)
**Bug ID**: TASK-91-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-05

## Description

`_resolve_install_tracker` folds `-z "$_t"` into the same branch as a non-zero return. The branch then
re-runs the resolver **without** swallowing stderr, on the assumption that it will reprint its error.
That assumption only holds when the resolver actually failed.

## Steps to Reproduce

Point `_locate_resolver` at a readable file that sources cleanly and sets nothing (a zero-length or
truncated `resolve-platform.sh` under `.agents/skills/*/references/`, as an interrupted previous
install leaves behind — `_locate_resolver` checks only `-r`, never that the file is a resolver).

## Expected Behavior

A message naming what went wrong.

## Actual Behavior

The first subshell returns rc 0 with empty output, the branch fires, the re-run prints nothing, and the
caller emits "…see the message above" with no message above, then aborts the install.

## Impact

An operator gets an install that stops with no diagnosis at all. Low frequency, but the failure mode is
maximally unhelpful.

## Recommendation

Split the conditions. On rc 0 with an empty `TRACKER`, emit a distinct message naming the resolver path
that was used: `"$_res sourced cleanly but set no TRACKER"`.

---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-05

**Root Cause**: the empty-`TRACKER` case shared a branch with a hard failure, and that branch's
diagnosis strategy — re-run the resolver so it reprints its own error — only works when the resolver
actually failed.

**Fix Description**: the two causes are now separated. A resolver that *failed* still has its stderr
replayed. A resolver that succeeded and set nothing gets its own message naming the file:
`sourced cleanly but set no TRACKER — the file may be truncated or not a resolver`.

**Files Modified**: `scripts/setup-consumer.sh`

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-09-05

**QA cycle 2 reopening reason**: the iteration-1 message exists in source but its branch was
**unreachable**. `printf "%s\n%s" "$?" "$TRACKER"` with an empty `TRACKER` emits `"0\n"`, and command
substitution strips the trailing newline — so the payload collapsed to one field, both halves of the
split returned `"0"`, the success branch fired, and the function returned the literal string `"0"` as a
tracker.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: the separator is now a **tab**, and the possibly-empty field comes **first**
(`printf "%s\t%s" "${TRACKER:-}" "$_s"`), so the separator survives command substitution and is present
even when the value is empty. Split with `%%` for the value and `##` for the status, so a tab inside
`TRACKER` truncates the value while leaving the status correct — the safe way round.

**Files Modified**: `scripts/setup-consumer.sh`

**Testing**: `a resolver that sources cleanly but sets no TRACKER is refused, not believed`, plus its
non-zero sibling and a **positive control** (a planted resolver that does set `TRACKER` must be
believed) — without the control, both negative tests would pass against an implementation that simply
never finds a planted resolver.

**Mutation-proven**: yes — reverting to the newline payload turns exactly that test red.
