# Bug Report: Task 238 - The Bitbucket base reading uses any pipeline on the base

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-7
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 4 safety re-probe, CR-3)
**Date Found**: 2026-10-28

## Description

For a failed head pipeline, `shared/resources/qa-ci-read.sh:164` takes the base reading from the
newest completed pipeline on the base branch, whatever its selector. A failed custom or deploy
pipeline on the base therefore makes a real head failure read "red on the base too". It is then
recorded as `pre-existing` and kept out of `/qa-fix`.

## Steps to Reproduce

Run the embedded Python (lines 149–181) on these pipelines, newest first:

- #42, `develop`, `custom: nightly-deploy`, FAILED
- #41, head, `**`, FAILED
- #40, `develop`, `**`, SUCCESSFUL

Observed: `pipeline #41 (**)|…|red|red on develop too (pipeline #42)`, as the reviewer reproduced it.

## Expected Behavior

The head's `**` pipeline is compared with the base's `**` pipeline (#40, green), so the result is
`top_issue`.

## Actual Behavior

The result is `pre-existing`, read from an unrelated pipeline.

## Impact

On Bitbucket a real CI regression stays out of the fix loop. The `/finalise` gate is the only thing
that catches it.

## Recommendation

Pick the base pipeline with the same selector type and pattern as the failed head pipeline. When
there is no such pipeline, report none (the base evidence is absent).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The Bitbucket branch took the newest completed pipeline on the base, of any kind,
as the base reading for every failed head pipeline. The low finding CR4-8 had a related cause: every
head pipeline for the SHA counted, so a FAILED run superseded by a green rerun still reported a
failure.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/qa-ci-read.sh`, the Bitbucket python):

- A pipeline is identified by its selector, `key(p) = (type, pattern)`.
- The base reading for a failed head pipeline is the newest completed base pipeline with the **same
  key**. With none, the reading is `none` ("no completed run of the same pipeline on {base}"), so
  the finding stays a `top_issue`.
- CR4-8: the head runs are reduced to the newest per key before any failure is counted, so a rerun
  supersedes the run before it.

**Testing**:

- **Red before**: the two bug.7 cases and the CR4-8 case fail on `adff39e2`.
- **Green after**: 25/25 in `qa-ci-read.test.mjs`.
- **Mutations**:
  - Dropping the key match turned both bug.7 cases red.
  - Dropping `newest_per_key` on the head runs turned the CR4-8 case red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 4 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 4 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.5.qa-loop-acts-on-signals-it-has.md |
