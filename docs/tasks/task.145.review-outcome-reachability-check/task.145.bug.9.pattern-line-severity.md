# Bug Report: Task 145 - Reachability pattern line inherits the hallucination protocol's Critical severity

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 4, CR4-1, confirmed by QA)
**Date Found**: 2026-09-25

## Description

In review-task (line 883) and review-story (line 976), the reachability rule is restated in *Common
Hallucination Patterns to Detect*. Each skill's Anti-Hallucination Protocol says "When hallucination
detected: #### Critical (Hallucination)", so a reviewer who takes the finding from the list reports
Critical. Check 10 and check 7 say Important. In review-story a Critical finding forces NO-GO.

## Recommendation

Attach "→ Important (check 10/7), not Critical" to the pattern line at both sites, and hold it in the test.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Fix Description**: Both pattern lines now end "Report it as **Important** under check 10 (review-task) / check 7 (review-story), not as a Critical hallucination". The test's PATTERN_LINE hold requires that sentence.

**Files Modified**: skills/review-task/SKILL.md, skills/review-story/SKILL.md, tests/outcome-reachability-check.test.js

**Testing**: Removing the severity sentence at either site → red (2/2).

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 4 |
| 2026-09-25 | Ready for QA | qa-fix | cycle 4 fix |
