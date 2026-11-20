# Bug Report: Task 283 - CHANGELOG block passes vacuously on other heading and bullet styles

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-7
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (code-review CR-2, reproduced)
**Date Found**: 2026-11-20

## Description
A CHANGELOG with no `## [v` heading (a `## [1.0.0]` style) sets the first-release threshold to 999999999, the same value as "heading not found", so the scan passes vacuously. The bullet filter `^+- ` also ignores `* ` bullets. The block ships to consumer repositories, which may use either style.

## Steps to Reproduce
Misplaced new entry below a `## [1.0.0] - date` heading: exit 0. Misplaced `* ` bullet below `## [v1.0]`: exit 0.

## Expected Behavior
A heading of either style is found, and a `* ` bullet is checked. When no release heading exists at all, the block says so instead of passing silently.

## Actual Behavior
Exit 0 with no output in both cases.

## Impact
An empty result that means "could not look" reads the same as "nothing misplaced".

## Developer Fix Cycle (qa-fix cycle 2)

The heading match is now `## [` followed by `v` or a digit, the bullet match covers `-` and `*` with optional indent, and a file with no release heading prints a note that placement was not checked. Three new tests per shell (digit-style heading, `*` bullet, no-heading note), each mutation-proven red. `review-task/SKILL.md` restated the heading rule and was updated to match.

## Recommendation
Match `## [` followed by `v` or a digit. Widen the bullet match to `^+[[:space:]]*[-*] `. Print a note when `## [Unreleased]` exists and no release heading follows. One test per case, mutation-proven.
