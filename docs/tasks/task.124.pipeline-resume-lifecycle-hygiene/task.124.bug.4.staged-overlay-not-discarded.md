# Bug Report: Task 124 - The dirty-tree probe reports 'overlay discarded' for a staged overlay entry it did not discard

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 1, code review finding CR-4

## Description
In `develop-pipeline-resume-contract.md` Phase 0b, a tracked entry is classified (a) when `git diff --quiet $BASE_REF -- $p` passes — a working-tree comparison. The discard is `git checkout -- <paths>`, which restores from the **index**. For an entry that is staged (`M ` in the first porcelain column) the index holds the overlay, so the checkout is a no-op, the tree stays dirty and staged, the probe prints 'overlay discarded: N tracked …', and Step 3's `git add -u` commits the reverted overlay — the task.116 failure with a success line in front of it.

## Steps to Reproduce
On a feature branch that changed `docs/README.md`: `git show origin/develop:docs/README.md > docs/README.md && git add docs/README.md`; run the probe: it prints 'overlay discarded: 1 tracked' and `git status --porcelain` still shows `M  docs/README.md`.

## Expected Behavior
An overlay entry is discarded from index and working tree alike, and the probe re-reads `git status --porcelain` afterwards, halting if anything it claimed to discard remains.

## Actual Behavior
A staged overlay survives the probe under a success message.

## Impact
The one shape the probe exists to stop (a bundled-copy overlay reverting the branch's own work) still reaches a commit when the overlay was staged.

## Recommendation
Discard with `git checkout HEAD -- <paths>` (index + worktree from HEAD) or `git restore --source=HEAD --staged --worktree -- <paths>`, then re-run `git status --porcelain` over the discarded paths and HALT on any survivor; add a replay-fixture variant with a staged entry.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
`git checkout -- <path>` restores the working tree from the index; a staged overlay lives in the index, so the checkout was a no-op and the success line followed unconditionally.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
The probe discards with `git checkout HEAD -- <paths>` (index and worktree from the branch's committed state), then re-reads `git status --porcelain` over the discarded paths and HALTs if any survived; the success line now carries `(porcelain re-read: clean)`. The (a) row of the classification table and the rationale paragraph say why.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` (Phase 0b probe)
- `evals/develop-task/step-isolation/13-resume-overlay-discarded-path-scoped` (a staged entry among the overlay; asserts the HEAD form and the re-read line, and that the bare form is absent)
- `CHANGELOG.md`, task doc §6

**Testing**:
- fixture 13: 12/12 assertions; `eval:develop-task` 16/16 scenarios

**Verification Steps for QA**:
1. Stage an overlay entry (`git show origin/develop:<f> > <f> && git add <f>`) on a branch that changed `<f>`; run the probe → the entry is gone from index and worktree and the success line reads `porcelain re-read: clean`
2. Replace `git checkout HEAD --` with `git checkout --` and repeat → the probe HALTs on the survivor instead of printing success

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
