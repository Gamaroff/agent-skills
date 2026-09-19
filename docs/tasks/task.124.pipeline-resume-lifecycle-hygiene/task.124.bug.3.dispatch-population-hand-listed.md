# Bug Report: Task 124 - The dispatch-site population check hand-lists five sources and misses the QA skills' own dispatches

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 1, code review finding CR-3

## Description
`evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` asserts every dispatch site marks its wait, but builds `sources` from a literal list of five files and matches only `subagent_type=|dispatch an Explore subagent|run_in_background|gh pr checks --watch`. The hooks doc names `qa-task`, `qa-story`, `review-pr` and `finalise` as in-loop sub-skills; `skills/qa-story/SKILL.md:566` and `skills/qa-task/SKILL.md` Step 3b ('Dispatch a read-only Explore subagent') both dispatch inside Step 5a with no `set-waiting-on.sh` call, and the pattern's lowercase `dispatch an` cannot see the capitalised 'Dispatch a read-only' form. The population check is the missing piece — every listed site is correct in isolation.

## Steps to Reproduce
`grep -n 'Dispatch a read-only Explore\|subagent_type=' skills/qa-task/SKILL.md skills/qa-story/SKILL.md` — hits with no `set-waiting-on` within 12 lines; the parity test passes.

## Expected Behavior
The parity test enumerates the population the hooks doc names (the step docs, the three orchestrators, develop-bug's references, and the loop's sub-skills) and a case-insensitive dispatch pattern; the two QA skills mark their waits.

## Actual Behavior
Two in-loop dispatches are unmarked and invisible to the test.

## Impact
The Stop hook re-prompts during every qa-task / qa-story code review (observed on this very run before the orchestrator marked it by hand).

## Recommendation
Derive `sources` from the directories the hooks doc names, widen the pattern to `/dispatch (an?|four|the) .*subagent/i`, and add the two `set-waiting-on.sh` calls (qa-task Step 3b, qa-story Phase 1.x) with `--clear` where the findings block is read.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The parity test's `sources` was a literal five-file list and its pattern was lowercase-only, so the population the hooks doc names was never enumerated and 'Dispatch a read-only Explore subagent' never matched. The derived population also surfaced a fourth unmarked site the task's own grep had missed: `develop-bug-step-3-investigate-fix.md:51`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
`qa-loop-lock-fields-parity.test.mjs` now derives the population from directories (`develop-pipeline-step-[1-9]*.md` + the resume contract, every `skills/develop-*/SKILL.md`, `develop-bug-step-[1-9]*.md`, and the four in-loop sub-skills), matches a case-insensitive dispatch pattern, exempts Phase 0 docs and commentary (stated), and requires the SET form with a quoted label (a `--clear` or a citation is not a mark) within 12 lines; a ≥12-site floor guards vacuity. Marks added at qa-task Step 3b, qa-story Step 1a and Step 3b, and develop-bug step-3's triage dispatch.

**Files Modified**:
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`
- bundled: `skills/qa-task/references/set-waiting-on.sh`, `skills/qa-story/references/set-waiting-on.sh`

**Testing**:
- parity test 6/6; mutation: replacing qa-task's mark with a non-mark → `skills/qa-task/SKILL.md:411 dispatches without marking the wait`

**Verification Steps for QA**:
1. `node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` → 6 pass
2. Remove any one `set-waiting-on.sh "…"` mark from a listed source → the test names the file:line

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
| 2026-09-19 | Closed | QA Engineer | Verified fixed in QA cycle 2 |
