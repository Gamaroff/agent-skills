# Bug Report: Task 114 - The applied-check snippet aborts under set -e on the APPLIED branch

**Task**: [Link](./task.114.mutation-proving-outcomes.md)
**Bug ID**: TASK-114-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass, CR-1)
**Date Found**: 2026-09-12

## Description

Cycle 1 replaced `diff a b || echo APPLIED` with `diff -q a b >/dev/null 2>&1` followed by `case $? in …`. Under `set -e` a bare command exiting non-zero terminates the shell, so on the one reading that means the mutation landed (diff exit 1) nothing is printed and the script dies with status 1. The one-liner it replaced was set -e safe because `||` consumes the status. Same shape in the Validate-the-probe block.

## Steps to Reproduce

```bash
set -e; cp x /tmp/pre; echo change >> x; diff -q /tmp/pre x >/dev/null 2>&1; case $? in 1) echo APPLIED;; esac; echo reached
# → exits 1 before 'APPLIED'
```

## Expected Behavior

Prints APPLIED and continues under set -e as well as without it.

## Actual Behavior

Shell exits 1 on the APPLIED case; the reader sees a dead run and no reading.

## Impact

A cycle-1 fix that is correct in the steady state and wrong in a transition — the class the refute pass exists for.

## Recommendation

`rc=0; diff -q a b >/dev/null 2>&1 || rc=$?; case $rc in 1) … ;; 0) … ;; *) … ;; esac` — in both snippets.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: a bare `diff -q` exiting 1 under `set -e` terminates the shell before `case $?` runs.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**:
- Both snippets: `rc=0; diff … || rc=$?` then `case $rc` — `||` consumes the status, so `set -e` never sees a failing bare command.

**Files Modified**: see the cycle-2 fix commit.

**Testing**: executed under `bash -c 'set -e …'` and `zsh -c 'set -e …'` for all three paths — NO SNAPSHOT / NOT APPLIED / APPLIED — each reaching the end of the script.

## Status History

| Date       | Status       | Changed By | Notes                     |
| ---------- | ------------ | ---------- | ------------------------- |
| 2026-09-12 | New          | QA         | Found (cycle 2 refute)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started     |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented           |
| 2026-09-12 | Closed       | QA         | Verified in cycle 3       |
