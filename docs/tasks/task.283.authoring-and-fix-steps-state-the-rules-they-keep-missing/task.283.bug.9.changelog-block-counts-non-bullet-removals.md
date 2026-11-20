# Bug Report: Task 283 - CHANGELOG block counts every removed line, not only bullets

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-9
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (code-review CR-1, reproduced; CR-2 and CR-3 folded in)
**Date Found**: 2026-11-20

## Description
The per-hunk rule takes `old` from the hunk header, which counts every removed line. A new bullet that replaces a heading, a blank line or a prose line has `extra = nb - old <= 0` and passes. The diff is also taken against the base tip, not the merge-base, so a base that has moved inflates `old` further. This is the third consecutive gate to name this block (QA-5, QA-7 and QA-8, now QA-10).

## Steps to Reproduce
Base CHANGELOG with a bullet under the first `## [v` heading and a prose line. Replace `### Fixed` plus the blank line below it with a bullet, or replace the prose line with a bullet, then run the block with `{base}` set to `develop`.

## Expected Behavior
Exit 1 with the HALT, as the pure-insertion control does.

## Actual Behavior
Exit 0, no output.

## Impact
A misplaced entry still reaches `/finalise`.

## Developer Fix Cycle (qa-fix cycle 3)

Narrowing residue: the CHANGELOG block (trigger: repeat subject). Move: narrow the contract. The per-hunk rule guessed which diff lines were new, and each fix opened the next edge, so the block now asks one question: does the region from the first release heading to the end hold more bullets than the same region at the merge base? A one-for-one edit keeps the count; an added bullet raises it, whatever line it replaced. The diff base is the merge base. Stated limits: a removal that offsets an addition is not seen, and a change that cuts a release will HALT.

Tests: three non-bullet-replacement shapes (heading plus blank, blank line, prose line), a moved base, and a CHANGELOG new in the branch, each under bash and zsh; the string-presence test was dropped. Mutation proofs, each red then restored: base tip in place of the merge base, a count that never trips, dash-only bullets, a v-only heading, no new-file branch. Every earlier reproduction (bugs 6 and 7 and this one) now HALTs, and the block still passes on this repository's CHANGELOG.

## Recommendation
Replace the hunk heuristic: compare the bullet count from the first release heading to the end of the file, merge-base copy against working copy, and HALT when the working copy has more. List the added bullets from a diff of the two regions. Tests for the three non-bullet-replacement shapes and a moved base; mutation-prove.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-20 | Closed | qa-task | Verified by task.283.qa.4 |
