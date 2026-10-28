# Bug Report: Task 238 - The Stop hook still sends every CONCERNS to Step 7

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 1 diff review, CR-2)
**Date Found**: 2026-10-28

## Description

This task changed the 5c exit rule: a `CONCERNS` whose review holds an open coverage finding now
returns to 5b. The step doc, the resume contract, the report template, the autonomous defaults and
four SKILL.md files were updated.

The Stop hook's re-prompt was not. At `shared/resources/develop-pipeline-on-stop.sh:204`, the
`qa_phase 5c` arm still reads: "on APPROVE or CONCERNS mark Step 5 ✅ … and advance the lock to 7".

The SC-12 sweep's grep missed this site because it covered only `*.md`. Other copies of the rule may
remain: `shared/resources/develop-pipeline-step-7-finalise.md:147` and
`skills/finalise/SKILL.md:900` (that one was a recorded exclusion).

## Expected Behavior

Every statement of the 5c exit rule names the coverage exception. That includes the Stop hook's
re-prompt and its assertion in `develop-pipeline-on-stop.test.sh`.

## Actual Behavior

A run re-prompted by the Stop hook after a `CONCERNS` with an open coverage finding is told to
advance to Step 7.

## Impact

The hook is the backstop that re-drives a stalled orchestrator. On this path it contradicts the step
doc and undoes the new route.

## Recommendation

Update the `5c` `THEN_WHAT` and its test. Then re-run the sweep over every tracked file type (`*.md`,
`*.sh`, `*.js`, `*.mjs`) for `APPROVE or CONCERNS` and `APPROVE`/`CONCERNS` spellings, and record
what was searched and each exclusion.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The SC-12 sweep searched `*.md` only. The Stop hook states the 5c exit rule in a
shell string, so the sweep could not see it. Its test pinned the old sentence verbatim, so both
stayed green together.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- The `5c` `THEN_WHAT` now reads: "on APPROVE, or on CONCERNS whose review holds no open coverage
  finding (§5c's OPEN_COVERAGE check), mark Step 5 ✅ … and advance the lock to 7; on REQUEST
  CHANGES, or on CONCERNS with an open coverage finding, write `qa_phase` 5b and re-enter 5b; if the
  check prints unreadable, HALT as a failed review — the lock stays at 5". The hook's two comments
  were qualified to match.
- The test fails if the unconditional sentence returns, and it asserts all three arms.
- The sweep was re-run over every tracked type (`git grep` with no extension filter, `docs/` and
  CHANGELOG excluded). Its hits:
  - updated: the develop-task and develop-story READMEs (flowchart edges, sequence `alt` arms,
    and the stage table row for Step 5c, now "loop-exit verdict").
  - unaffected: finalise SKILL:900, step-7-finalise:147, and step-5-6 :1569/:1592/:2122, which
    read a verdict that has already exited; step-5-6 :484 (the token list); and test fixtures.

**Files Modified**:

- `shared/resources/develop-pipeline-on-stop.sh`
- `shared/resources/develop-pipeline-on-stop.test.sh`
- `skills/develop-task/README.md`, `skills/develop-story/README.md`

**Testing**: The new assertion was red on the old hook (51/1) and is green after (52/0).

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 1 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 1 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.2.qa-loop-acts-on-signals-it-has.md |
