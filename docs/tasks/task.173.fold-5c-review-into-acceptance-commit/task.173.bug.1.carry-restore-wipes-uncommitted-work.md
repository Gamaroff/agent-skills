# Bug Report: Task 173 - The 5c carry restore wipes uncommitted work, including the implementation report

**Task**: [task.173.fold-5c-review-into-acceptance-commit.md](./task.173.fold-5c-review-into-acceptance-commit.md)
**Bug ID**: TASK-173-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-1)
**Date Found**: 2026-10-08

## Description

The carry stage block in `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (the line under
"NOT CARRIED", `:1474`) restores a refused path with `git checkout HEAD -- "$p"`, falling back to
`git rm --cached` + `rm -f`. That discards **every** uncommitted change in the file, not only the 5c
edit. The implementation report is uncommitted by design at 5c (qa-fix keeps its updates out of
every commit; Step 8 owns it), and it classifies as doc-only (`docs/**`, `**/*.md`). A `/review-pr`
`trail` finding can name it as its `ref`.

## Steps to Reproduce

1. At 5c, the implementation report carries uncommitted QA Cycle entries.
2. `/review-pr` returns CONCERNS with a finding whose `ref` is the implementation report.
3. The classifier prints `doc-only`; the orchestrator edits the report and lists it in `CARRY_FIXED`.
4. The edit leaves a dead link anywhere in the report → `doc-links.js` fails → `git checkout HEAD -- <report>`.

## Expected Behavior

The implementation report (and the PR review report itself) is never carried or restored by 5c. A
refused path's restore removes only the 5c edit, or HALTs when the file held other uncommitted work.

## Actual Behavior

Every report entry written since Step 4 is lost. On the passing branch, the report is staged and
rides the 6a acceptance commit, breaking "Step 8 alone commits the report".

## Impact

Loss of the pipeline's audit trail mid-run; the report's ownership rule broken.

## Recommendation

Refuse `*.implementation.*` and `$PR_REVIEW` in the classifier and the stage loop. Before restoring a
path, check it was clean against `HEAD` before 5c's edit; if it was not, HALT rather than restore.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-08

**Root Cause**: the stage block restored any refused path with `git checkout HEAD`, and nothing
stopped a file holding other uncommitted work — the implementation report above all — from being
classified doc-only.

**Fix Description**:

- The classify block's second test clears a `doc-only` path only when it is tracked, clean against
  `HEAD`, not `*.implementation.*` and not the review report; cleared paths go to
  `.claude/state/5c-carry-eligible.txt`.
- The stage block HALTs, touching nothing, on any path not in that list; `git checkout HEAD` now runs
  only on a cleared path, where it undoes exactly the 5c edit. The `git rm` / `rm -f` fallback is gone.

**Files Modified**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`;
`shared/resources/tests/acceptance-commit-carries-5c.test.mjs` (classify and not-cleared cases).

**Testing**: the not-cleared test edits the implementation report, a dirty doc and a code file, and
asserts each HALTs with the file byte-identical and unstaged; mutation-proved (eligibility check
removed → red; clean/tracked test removed → red; implementation exclusion removed → red).

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-08 | New | qa-task | QA cycle 1, CR-1 |
| 2026-10-08 | Ready for QA | qa-fix | Fixed in QA cycle 1 fix pass |
