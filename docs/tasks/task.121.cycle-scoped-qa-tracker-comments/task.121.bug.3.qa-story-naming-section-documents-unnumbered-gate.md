# Bug Report: Task 121 - qa-story's File Naming Conventions still instruct an un-numbered gate filename the cycle derivation cannot parse

**Task**: [Link](./task.121.cycle-scoped-qa-tracker-comments.md)
**Bug ID**: TASK-121-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (refute pass, cycle 2 — reviewer finding CR-2, verified)
**Date Found**: 2026-09-18

## Description

`skills/qa-story/SKILL.md` ~:2884 ("File Naming Conventions") and the three directory-tree examples
near :2903 / :2909 / :2922 instruct `story.[epic].[story].gate.[descriptive-name].yml` and
`task.[number].gate.[descriptive-name].yml` — no cycle number. The same file documents the numbered
form at :101 and :1521–1522, and every writer (`qa-gate`, `qa-task`, `qa-story`) produces numbered
gates. After task.121 the number is load-bearing: it is the stage suffix. An agent following the
un-numbered instruction produces exactly the input that trips BUG-2's fallback. The cycle-1 bug
report cited this section and the fix left it unchanged.

## Expected Behavior

One filename convention in the file: `story.{epic}.{story}.gate.{number}.{descriptive-name}.yml` /
`task.{number}.gate.{number}.{descriptive-name}.yml`, in the section and in the tree examples.

## Actual Behavior

Two conventions in one file; the older one contradicts the writers and the new derivation.

## Impact

Documentation defect with a runtime consequence via BUG-2. Cheap to fix; bundled copies follow.

## Recommendation

Update the section and the three tree examples to the numbered form; grep the file for
`gate.[descriptive-name]` afterwards to confirm no instance remains.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-18 · **Developer**: qa-fix (QA cycle 2)

**Fix Description**: the File Naming Conventions section now documents the numbered form for both
QA reports and gates, states that the number after `gate.` is the QA cycle and is load-bearing (the
stage suffix, read by `references/qa-cycle.sh`), and names the un-numbered form as invalid. All
three directory-tree examples (co-located, and the legacy `docs/qa/gates` tree) show
`…gate.1.…yml` / `…qa.1.…md`; the co-located example's task path is `docs/tasks/` (the tasks tree
migrated there on 2026-05-11).

**Files Modified**: `skills/qa-story/SKILL.md` (~:2895–2940)

**Testing**: `grep -n 'gate\.[a-z-]*\.yml\|gate\.\[descriptive' skills/qa-story/SKILL.md` excluding
the numbered forms → no matches.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-18 | New | QA Engineer | Refute pass, cycle 2 (CR-2) |
| 2026-09-18 | Ready for QA | qa-fix | Section + three tree examples rewritten |
| 2026-09-18 | Closed | QA Engineer | Verified in cycle 3 — section + three trees numbered; zero un-numbered forms remain (tree layout note → CR-6, low) |
