# Bug Report: Task 124 - The stale-snapshot rule deletes a live halt snapshot as soon as the document reads `status: accepted`

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 2 (refute pass), code review finding CR-

## Description
The detector's Step 1 item 2 deletes a same-document `last-halt.json` when the document's frontmatter reads `status: accepted` **or** the PR is MERGED. But `/finalise` writes `status: accepted` at Step 7 action 6a, before its CI reading 2 (which has a documented `ci-not-green-on-acceptance-head` HALT) and before Step 8. A HALT or PreCompact pause between 6a and the end of Step 8 leaves a snapshot for a document that already reads accepted — a live resume record — and the next invocation deletes it and falls to `source: none`, `recommended_step: 1`.

## Steps to Reproduce
Run a task to Step 7 6a; HALT on `ci-not-green-on-acceptance-head` (snapshot written, halt_step 7); re-invoke: the detector reports `stale-snapshot … deleted` and offers a fresh start.

## Expected Behavior
Only evidence that the run FINISHED deletes a snapshot: the PR is MERGED (or the snapshot was left by a run whose Step 8 completed). `status: accepted` alone is a Step 7 state, not a completion.

## Actual Behavior
A post-acceptance halt or pause loses its resume record.

## Impact
The one class of resume this task hardened (a snapshot that outlives its run) now destroys the one class it should protect (a snapshot from a run still in Step 7–8).

## Recommendation
Key the rule on `gh pr view <pr_url> --json state` = MERGED only; drop the `status: accepted` disjunct. Step 8's same-document deletion already covers the completed-run case.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
'A snapshot that outlives its run' was implemented as 'a snapshot for an accepted document', but `accepted` is a Step 7 state written before CI reading 2 and Step 8 — not evidence the run finished.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
The detector's stale-snapshot rule keys on the PR being MERGED only; a paragraph states why `status: accepted` must not fire it and that an accepted document with an unmerged PR keeps its snapshot as an ordinary candidate. The decision table gains the accepted-but-unmerged row. Resume contract and CHANGELOG say the same.

**Files Modified**:
- `shared/resources/pipeline-resume-detector-prompt.md`, `develop-pipeline-resume-contract.md`, `CHANGELOG.md`
- `evals/develop-task/step-isolation/16-…` (concern text and description keyed on MERGED)

**Testing**:
- fixture 16: 8/8; the fast gate green

**Verification Steps for QA**:
1. `grep -n 'status: accepted' shared/resources/pipeline-resume-detector-prompt.md` → appears only in the sentence forbidding it as a trigger
2. Fixture 16's detector output names 'PR merged; deleted'

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
| 2026-09-19 | Closed | QA Engineer | Verified fixed in QA cycle 3 |
