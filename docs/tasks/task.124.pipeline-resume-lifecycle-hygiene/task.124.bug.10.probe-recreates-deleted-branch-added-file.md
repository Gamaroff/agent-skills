# Bug Report: Task 124 - The probe classifies an uncommitted deletion of a branch-added file as overlay and re-creates it under a success line

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 3 (narrowed), code review finding CR-2

## Description
`git diff --quiet $BASE_REF -- $p` exits 0 when the path is absent on BOTH sides. A file the branch added and the base never had, deleted but not committed (` D`/`D `), therefore passes the tracked-entry test, is classed (a), and `git checkout HEAD -- $p` re-creates it — the 'resume that discards non-overlay work' the task's rollback plan lists as a Critical trigger. Reproduced: `diff --quiet` rc=0 on such a path; `cat-file -e origin/develop:n` rc=128.

## Steps to Reproduce
Branch adds `n` and commits; `rm n` (uncommitted); run the probe → 'overlay discarded' and `n` is back.

## Expected Behavior
A tracked entry whose path the base lacks is never (a): the tracked arm requires `git cat-file -e "$BASE_REF:$p"` before the diff test, mirroring the `??` arm.

## Actual Behavior
The deletion is reverted silently.

## Impact
Real uncommitted work (a deliberate deletion) is undone by the resume.

## Recommendation
Add the `cat-file -e` precondition to the tracked arm; one sentence in the rationale paragraph; a replay-fixture variant with an uncommitted deletion → HALT.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
`git diff --quiet <commit> -- <path>` exits 0 when the path exists on neither side, so the tracked arm's only test could not distinguish 'identical to base' from 'absent from base'.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
The tracked arm now requires `git cat-file -e "$BASE_REF:$p"` before the diff test — the same precondition the `??` arm already had — so a path the base lacks is class (c). The rationale paragraph and the task doc's Phase 1 bullet say why.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` (probe + rationale)
- task doc §6 Phase 1, §9 Performance criterion

**Testing**:
- reproduction in a scratch repo: branch-added `n`, deleted uncommitted → with the precondition the entry is (c) (HALT); without it, (a)

**Verification Steps for QA**:
1. Branch adds and commits `n`; `rm n`; run the probe → HALT naming ` D n`, and `n` stays deleted

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 3 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
