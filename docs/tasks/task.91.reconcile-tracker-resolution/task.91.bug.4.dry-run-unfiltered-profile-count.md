# Bug Report: Task 91 - on rc 3 the dry run prints an unfiltered profile count

**Task**: [Link](./task.91.reconcile-tracker-resolution.md)
**Bug ID**: TASK-91-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-05

## Description

On rc 3 the dry-run branch sets `_dry_tracker=""` and announces "tracker NOT RESOLVED" — then passes
that empty string straight through as `--tracker ""` when computing the profile count
(`setup-consumer.sh:1190`).

`arg("tracker")` in `resolve-skill-set-cli.mjs` treats the empty string as falsy and
`trackerPredicate("")` filters nothing.

## Expected Behavior

Either no count, or a count labelled as unfiltered.

## Actual Behavior

The line immediately after "tracker NOT RESOLVED" reports "profile 'X' resolves to N skills", where N
is the **unfiltered** total.

## Impact

The preview overstates the install by the 11 Jira-only or 6 GitHub-only skills, with nothing saying so
— in the one branch whose entire purpose is to tell the operator what will happen.

## Recommendation

On rc 3 skip the profile count, or annotate it: "(no tracker filter applied; the real run will remove
up to N platform-specific skills)".

---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-05

**Root Cause**: an empty `--tracker` is falsy to `resolve-skill-set-cli.mjs`, so it filtered nothing —
and the count was printed one line below "tracker NOT RESOLVED".

**Fix Description**: on rc 3 the profile count is **skipped**, with a line saying why. A number that
cannot be computed honestly is worse than no number, in the one branch whose whole purpose is to
predict the install.

**Files Modified**: `scripts/setup-consumer.sh`
