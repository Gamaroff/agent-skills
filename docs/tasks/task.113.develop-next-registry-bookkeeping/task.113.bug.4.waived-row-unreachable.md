# Bug Report: Task 113 - the merge matrix's `WAIVED → merge` row can never fire

**Task**: [Link](./task.113.develop-next-registry-bookkeeping.md)
**Bug ID**: TASK-113-BUG-4
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (Step 3b code review, CR-3)
**Date Found**: 2026-09-12

## Description

Step 3's new open-entry definition says an entry is open when its `status:` is absent or `open`.
`qa-gate`'s own WAIVED schema keeps the waived finding in `top_issues[]` **without** a `status:`
field, and no skill stamps `status: waived` (`qa-task`/`qa-story` write only `open|closed`). So every
WAIVED gate matches the `CONCERNS / WAIVED | **yes** → HALT` row, and the `accepted | WAIVED | no →
merge` row — the one that says a waiver is a recorded human decision — is unreachable. The
develop-batch mirror carries the same text.

## Expected Behavior

A `WAIVED` gate with `waiver.active: true` merges: its listed entries are the waived findings, not
open ones.

## Actual Behavior

HALT on every waived gate — the inversion observation #52 named, still present after the fix.

## Recommendation

State in the open-entry definition, in both orchestrators: *when `gate: WAIVED` and
`waiver.active: true`, entries without a `status:` are treated as waived, not open*. Add a shape
assertion for the clause in both suites.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: as described above — confirmed by re-running the reproduction before the change.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**: Both matrices now state: under `gate: WAIVED` with `waiver.active: true`, entries without a `status:` are the waived findings and count as waived, not open. Shape assertions in both suites key on `waiver.active: true` and the clause text.

**Files Modified**: skills/develop-next/SKILL.md · skills/develop-batch/SKILL.md · both shape suites

**Testing**: Mutation: replacing the field name in both files reds both suites by name.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Filed (QA cycle 1)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |
