# Bug Report: Task 149 - The read-back blocks' one input has no writer in the block

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 4)
**Date Found**: 2026-09-26

## Description

Step 12b reads `${TASK_DIR:?}` and item 3e reads `${STORY_FILE:?}`. Nothing in either block assigns
them, and no `{placeholder}` substitutes them (cycle-4 review CR-1, CR-2; cycle-2 CR-6 raised the same
point at low). Every fenced block runs as its own shell, so a block run as delivered halts on its own
guard. The `:?` makes that loud rather than silent, but it is still a halt on the normal path.
`tests/qa-read-back-block.test.js` injects the variable through `env`, so it cannot see this. That
is the blind spot the code-review standard's rule E names.

## Recommendation

Bind the input in the block with the placeholder the agent substitutes (`TASK_DIR="{task-directory}"`,
`STORY_FILE="{story-file}"`). Halt when the placeholder is unsubstituted. Have the test substitute the
placeholder in the block text, as an agent does, instead of injecting an env var.

## Developer Fix Cycle

### Iteration 1

**Move: consolidate the contract** (qa-fix Step 2.6, taken on the pipeline's narrowing-residue offer:
every MEDIUM on gates 3 and 4 named `skills/qa-task/SKILL.md`). The read-back logic moved out of two
fenced blocks into one bundled script, `shared/resources/qa-read-back.js`, tested directly by
`shared/resources/tests/qa-read-back.test.mjs` (14 cases, task- and story-shaped fixtures, five mutations
red). Each SKILL.md block is now one call.

The block reads no shell variable. Its one input is a `{placeholder}` in the call
(`--doc "{task-file}"` / `--doc "{story-file}"`), and the script refuses an unsubstituted one with
exit 2. `tests/qa-read-back-block.test.js` now substitutes the placeholder in the block **text** and runs
the block (bash + zsh). It also asserts the block reads no `$VAR`, and that the raw block exits 2. The
`STORY_FILE` INPUTS entry in `unbound-default-reads.test.js` is removed, because no such read remains.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 4 |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 4 |
