# Bug Report: Task 145 - Task document has stacked QA Testing Results sections and empty Change Log headings

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 5, CR5-1)
**Date Found**: 2026-09-25

## Description

Between `<!-- change-log-start -->` and the Change Log table, the task document had four empty
`## Change Log` headings, each followed by a `## QA Testing Results` section (gates 4, 3, 2, 1). The
only table sat under cycle 1's Key Findings.

## Root Cause

The orchestrator's QA-results write (qa-task Step 12, performed inline):

- Cycle 1 inserted the section *before* `## Change Log`, which put it after the start marker and
  directly under that heading.
- Cycles 2–4 replaced `slice(indexOf("## QA Testing Results"), indexOf("## Change Log"))`. The
  heading index was already smaller than the section index, so each write duplicated the span
  instead of replacing it.

## Expected Behavior

One `## QA Testing Results`, rendered from the latest gate, outside the change-log markers. One
`## Change Log` heading directly above its table.

## Recommendation

Rebuild the block, and verify with a heading count.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Fix Description**: The QA cycle-5 Step 12 write rebuilt the block. There is now one `## QA Testing Results`, rendered from gate 5, before the change-log start marker, and one `## Change Log` directly above its table. All 14 rows are preserved, and the engine appended the cycle-5 row. The write now anchors on the change-log marker and the table header, not on two independent `indexOf` calls.

**Testing**: Heading counts are 1 and 1. `ci:fast` is green, including the doc-links corpus.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 5 |
| 2026-09-25 | Ready for QA | qa-fix | Block rebuilt and verified |
| 2026-09-25 | Closed | QA Engineer | verified FIXED at QA cycle 6: one heading of each; holds at QA cycle 6 (suite 4002/4003 pass, 0 fail) |
