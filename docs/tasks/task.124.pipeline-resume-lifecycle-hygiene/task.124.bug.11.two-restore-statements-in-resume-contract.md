# Bug Report: Task 124 - The resume contract carries two statements of who restores, and the Phase 0b one is still unconditional

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 4 (narrowed), code review finding CR-1

## Description
The cycle-3 fix added the `halt_reason` branch under Phase 0a ('Restore the lock (both resume paths)', :55–72), but the same file's Phase 0b paragraph 'Restoring the lock — on either resume path' (:178–194) still says 'Restore first, then continue' for every snapshot. A reader following Phase 0b restores and consumes a loop-limit snapshot before the grant's never-lower guard runs — the bug-9 ordering, re-created by the second statement.

## Steps to Reproduce
`grep -n 'Restore first, then continue' shared/resources/develop-pipeline-resume-contract.md` → :184, unconditional.

## Expected Behavior
One statement of who restores; the Phase 0b paragraph defers to the Phase 0a section (or states the same exception).

## Actual Behavior
Two statements; one of them is the pre-fix rule.

## Impact
An executed document with two rules for the same moment: whichever the reader lands on wins.

## Recommendation
Rewrite :178–194 to defer to the branch under Phase 0a and state the loop-escalation exception inline.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The cycle-3 fix added the `halt_reason` branch under Phase 0a but left the older Phase 0b paragraph ("Restore first, then continue") in place, so the contract stated who restores twice — and the second statement was the pre-cycle-3 unconditional one.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
The Phase 0b paragraph now defers to "Restore the lock (both resume paths)" under Phase 0a as the single statement of who restores, and carries the loop-escalation exception inline (grant restores after its never-lower guard; every other halt or pause runs `--restore` first). The unconditional "Restore first, then continue" sentence is gone. While there, the Working-tree probe's Cost sentence (CR-4) now lists the `git cat-file -e` precondition and the per-arm compare (`git diff --quiet` tracked / `git show | cmp` untracked) that the probe actually runs.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` (+ bundled `references/` copies via `npm run bundle`)

**Testing**:
- prose; `grep -c 'Restore first, then continue' shared/resources/develop-pipeline-resume-contract.md` → 0
- `npm run ci:fast` 3512 tests, 0 fail; `npm run eval:develop-task` 16/16 fixtures green; `bundle:check` 0 problems

**Verification Steps for QA**:
1. Read the resume contract's Phase 0b "Restoring the lock — on either resume path" paragraph: it names Phase 0a as the one statement and restates the `loop-limit|not-converging` exception rather than an unconditional restore
2. `grep -n 'Restore first' shared/resources/develop-pipeline-resume-contract.md` → no match
3. Cost sentence under the Working-tree probe names `git cat-file -e`

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 4 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
