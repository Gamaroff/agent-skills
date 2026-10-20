# Bug Report: Task 200 - create-epic's PRD-link block reads a path no line in it binds

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2, refute pass)
**Date Found**: 2026-10-20

## Description

The PRD-link block in `skills/create-epic/SKILL.md` (from line 156) passes `--doc "${PRD_SOURCE_PATH}"` to the resolver at line 164 (GitHub) and line 167 (Bitbucket). Only the earlier parent-PRD block assigns `PRD_SOURCE_PATH` (line 131). Each fenced block runs as its own shell, so in a fresh shell the resolver gets `--doc ""`, exits 2 (`--doc is required`), and the `:?` guard stops the block on both arms.

This is the shape TASK-200-002 fixed at the eight GitHub sites. Cycle 1 migrated create-epic onto the resolver and added the guard, which made the unbound read fatal, but did not bind the path. `tests/doc-link-branch-sites-execute.test.js` cannot see it, because the create-epic test supplies its own `PRD_SOURCE_PATH=` line before the block. (Code review CR-1, cycle 2.)

## Steps to Reproduce

1. Copy create-epic's PRD-link block (the `source` line through the `:?` guard) into a script, with `VCS=github` and no `PRD_SOURCE_PATH`.
2. Run it under bash with the bundled resolver in place.

## Expected Behavior

The block binds the PRD path itself, or names the `{placeholder}` that fills it, and prints a branch.

## Actual Behavior

`doc-link-branch.js --doc is required` (exit 2), then `BRANCH: doc-link-branch.js resolved no branch …`. The block aborts before `PRD_URL` is built.

## Impact

An epic created by running the block as written gets no PRD link: the block fails loudly where the old one built `blob/<branch>/`.

## Recommendation

Add `PRD_SOURCE_PATH="{prd_source path from the parent-PRD block}"` to the block before the `if`. Make the execute test take that binding from the block rather than supplying it, so an unbound read fails the test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 2)

**Root Cause Analysis**: Cycle 1 moved create-epic's PRD link onto the resolver and added a `:?` guard, but the block reads `PRD_SOURCE_PATH`, which only the parent-PRD block assigns. Each fenced block is its own shell, so the read was empty. The execute test wrote its own `PRD_SOURCE_PATH=` line before the block, so it could not see the gap.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: The block binds `PRD_SOURCE_PATH="{PRD_SOURCE_PATH from the parent-PRD block}"` after its `source` line. The create-epic execute test now asserts that the block itself binds the path before the call, instead of supplying it.

**Files Modified**:

- `skills/create-epic/SKILL.md`
- `tests/doc-link-branch-sites-execute.test.js`

**Testing**: Mutation: deleting the binding turns the create-epic execute test red. Baseline green before and after.

**Verification Steps for QA**:

1. `command node --test tests/doc-link-branch-sites-execute.test.js`: all pass.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 2 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 2) |
