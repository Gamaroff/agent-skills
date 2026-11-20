# Bug Report: Task 283 - Wall-time criterion unmeasured

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-11-19

## Description
The Performance criterion needs the median of five alternating `develop`/branch runs of `CI=true npm run test:remote -- --run test` on the LAN server, with `uptime` beside each. None is paired with `develop`.

## Steps to Reproduce
Look for the table in any QA report for task 283: there is none.

## Expected Behavior
A five-pair table and median within 10%.

## Actual Behavior
Unmeasured. The server was saturated (load about 23) during the branch-only runs.

## Impact
One success criterion cannot be marked verified.

## Recommendation
Run the pairs in a quiet window using the task 282 QA-2 procedure, and record them in the QA report.
