# Bug Report: Task 141 - SKILL.md still says only a fail moves an accepted row

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Bug ID**: TASK-141-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA cycle 2 (refute pass — documentation-transition probe)
**Date Found**: 2026-09-22

## Description

The cycle-1 fix for TASK-141-BUG-1 made `untested` move an accepted row, which is the documented
demotion. Two sentences in `skills/qa-next/SKILL.md` still say the opposite:

- `:185` (Step 4, after the per-verdict note table) — "Only a `fail` moves it, and it moves it from
  any state."
- `:243` (*What this skill never does*) — "Re-litigate an `✅` on a pass. Only a failure moves an
  accepted row."

`skills/qa-next/README.md:99` carries the same sentence but follows it immediately with "To demote
one deliberately, `--set <id> untested --note "<why>"` first", so it is incomplete rather than
contradictory.

## Expected Behavior

The skill's own statement of the rule matches the tool: a `pass`, `blocked` or `na` leaves `✅`; a
`fail` and an explicit `untested` demotion both move it.

## Actual Behavior

Two flat contradictions in executed prose. An agent following Step 4 would believe
`--set <id> untested` is a no-op against an accepted row — the belief the cycle-1 fix exists to
correct.

## Impact

`SKILL.md` is executed, not merely read: its steps are the protocol. A false statement about the
tool's state machine, at the point in Step 4 where the agent decides what to send, is the shape that
produces a wrong call rather than a confused reader.

## Recommendation

Amend both sentences to name the demotion beside the fail, in the shape the README already uses.

## Notes

This is the documentation-transition probe from the refute pass — *what did this edit make false
elsewhere?* — finding exactly what it is for. The diff shows the changed lines and not their
neighbours, so the contradiction was invisible to a diff review and visible to a grep of the file for
other statements about the same subject.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-22 | New          | qa-task    | Found in QA cycle 2 |
| 2026-09-22 | In Progress  | qa-fix     | Fixed in QA cycle 2 |
| 2026-09-22 | Ready for QA | qa-fix     | Cycle-2 fix committed; verification pending |
| 2026-09-23 | Closed       | qa-task    | Verified FIXED in QA cycle 3 ([qa.3](./task.141.qa.3.qa-next-targeted-item.md)); closure recorded late, prompted by PR review 1 PC-1 |
