# Bug Report: Task 217 - Step 5's apply-list trusts a findings file the checker never annotated

**Task**: [Link](./task.217.finding-anchors-advisory-follow-ups.md)
**Bug ID**: TASK-217-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1 diff review, CR-1)
**Date Found**: 2026-10-23

## Description

This task added a third consumer of `anchor_check`: the `/review-code` Step 5 apply-list block (`skills/review-code/SKILL.md:272`). It hardened the other two consumers, the `--inline` guards, against unchecked input and left this one unguarded. The block reads `.code_review.findings[]` and skips only the four malformed verdicts.

## Expected Behavior

A findings file without the checker's stamp, with a stale count, with an unknown verdict, or with no findings array HALTs with nothing applied. This is the same contract as the `--inline` guards.

## Actual Behavior

- An un-annotated finding has an empty `CHECK`. It falls through the `case` and prints `apply: CR-1 (a.js)`.
- `{}`, `{"code_review":{}}` and `[]` all print an empty list at exit 0. That output is the same as "nothing to apply".

## Impact

`--fix` edits a line nobody verified, which is the outcome this task exists to prevent.

## Recommendation

Run the `--inline` guard in front of `LIST`, and HALT when it fails. Then add those hostile inputs to the block test and to `task.217.qa.1.review-code-step5-cases.json`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-24
**Developer**: qa-fix (develop-task Step 5b, QA cycle 1)

**Root cause**: the Step 5 block was written as a filter over verdicts, not as a consumer of the
checker's output. It read `anchor_check` and skipped the four malformed verdicts, so a finding with
no `anchor_check` (the checker never ran) fell through the `case` as applicable. The two `--inline`
guards had already been given the stamp contract in the same task; this third consumer was not.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-24

**Fix description**:

- Step 5 runs the Step 4.2 `jq -e` guard before it builds the list: the findings array exists, the
  checker's stamp is present with a count equal to the findings, and every `anchor_check` is one of
  the seven verdicts. When the guard fails, the block HALTs with "nothing applied" (exit 1).
- The Step 5 prose states the rule.

**Files modified**:

- `skills/review-code/SKILL.md` — the guard in the Step 5 block, and the prose above it.
- `skills/review-code/tests/review-code.test.js` — the Step 5 fixture is stamped; eight hostile
  inputs (no stamp, stale count, foreign stamp, unknown verdict, missing verdict, no findings array,
  `{}`, `[]`) must each HALT with no `apply:` line; a stamped empty review is the control.
- `docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.1.review-code-step5-cases.json`
  — fixtures carry the stamp; the eight un-annotated inputs are added as hostile cases (19 total).

**Testing**:

- `review-code.test.js` 18/18 pass. Mutation: the guard replaced by `|| true` turns the Step 5
  test red.
- Probe: `fence:skills/review-code/SKILL.md#Step 5 — \`--fix\` (optional)` with the updated cases —
  `engages`, 19/19. Calibration: the same probe against the guard disabled reports
  `present-but-inert` (10/19 passed).

**Verification steps for QA**:

1. Run the probe command above and confirm `engages` 19/19.
2. Disable the guard and confirm the probe and the Step 5 test both go red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-23 | New | qa-task | Found by task.217.qa.1.finding-anchors-advisory-follow-ups.md |
| 2026-10-24 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-24 | Ready for QA | qa-fix | Step 5 runs the stamp guard; 8 hostile inputs HALT; probe 19/19 |
