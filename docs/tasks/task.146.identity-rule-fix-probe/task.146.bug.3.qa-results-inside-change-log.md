# Bug Report: Task 146 - QA Testing Results sits inside the change-log marker block

**Task**: [Link](./task.146.identity-rule-fix-probe.md)
**Bug ID**: TASK-146-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2 refute pass, CR-1)
**Date Found**: 2026-09-25

## Description

In the task document, `## QA Testing Results` sits inside `<!-- change-log-start -->` … `<!-- change-log-end -->`,
between the `## Change Log` heading and the log table. QA cycle 1's insert was anchored on the
`## Change Log` heading line, but the start marker sits above that heading, and the next
`change-log.js` upsert re-rendered the block with the heading first.

## Steps to Reproduce

`sed -n 305,350p docs/tasks/task.146.identity-rule-fix-probe/task.146.identity-rule-fix-probe.md`

## Expected Behavior

`## QA Testing Results` sits above the start marker, and the Change Log heading is directly followed
by its table.

## Actual Behavior

The marker, then the Change Log heading, then the whole QA Testing Results section, then the log table.

## Impact

The Change Log heading renders empty. A whole-section replace (qa-task Step 12) would run to
`## Progress Tracking` and delete the log table and the end marker. (obs #178: Step 12 has no engine.)

## Recommendation

Move the section above `<!-- change-log-start -->`. Verify that the marker block then holds only
`## Change Log` and its table.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-25

**Root Cause**: The cycle-1 insert was anchored on the `## Change Log` heading line, not on the `<!-- change-log-start -->` marker above it. `change-log.js` then re-rendered its block with the heading first (obs #178: qa-task Step 12 has no section engine).

**Fix Description**: `## QA Testing Results` moved above the marker pair, matching task.145's layout (section, `---`, start marker, `## Change Log`, table). The move was checked structurally: the file's line multiset is identical before and after, ignoring blank lines, and the marker block now holds exactly one `## ` heading. No corpus test guards foreign content inside the markers. That systemic fix belongs to obs #178, not this task.

**Files Modified**: `docs/tasks/task.146.identity-rule-fix-probe/task.146.identity-rule-fix-probe.md`

| Date       | Status       | Changed By | Notes               |
| ---------- | ------------ | ---------- | ------------------- |
| 2026-09-25 | Ready for QA | qa-fix     | Fixed in QA cycle 2 |
| 2026-09-25 | Closed       | QA         | Verified — qa.3 |

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-25

**Result**: Fixed. Verified in qa.3 — the marker block holds exactly one `## ` heading and there is one `## QA Testing Results`, above `<!-- change-log-start -->`; re-checked in qa.4. Closed after the 5c PR review flagged the status as stale (PC-1).
