# Bug Report: Task 124 - The shared resume sources still state the grant exception for develop-bug, contradicting develop-bug's own Step 0-lock

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 5 (narrowed), code review finding CR-1

## Description
The cycle-4 fix for bug 12 removed the `loop-limit|not-converging` grant exception from `skills/develop-bug/SKILL.md` and stated that develop-bug restores on every halt snapshot. But the two shared sources develop-bug bundles and cites — the resume contract's "Restore the lock (both resume paths)" (`shared/resources/develop-pipeline-resume-contract.md:61-65`) and step-0 §0b (`develop-pipeline-step-0-resolve-and-prepare.md:253`, whose command line names `{develop-story|develop-task|develop-bug}`) — still state the exception unconditionally for all three pipelines. The contradiction was moved, not removed.

## Steps to Reproduce
1. `grep -n 'loop-limit|not-converging' shared/resources/develop-pipeline-resume-contract.md shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` → the exception, with no pipeline qualifier
2. `grep -n 'no re-entry grant' skills/develop-bug/SKILL.md` → develop-bug says the exception does not apply to it
3. develop-bug's verify loop HALTs at MAX_ITER=5 with "not converging" (`develop-bug-step-5-6-verify-loop.md:266`, halts table `SKILL.md:284`) and a free-form `{halt_reason}` an agent will plausibly write as `loop-limit` or `not-converging`

## Expected Behavior
One rule per pipeline: the shared sources scope the exception to develop-task/develop-story in the sentence that states it, and name develop-bug as the pipeline that restores on every snapshot.

## Actual Behavior
A develop-bug re-invocation after its loop-limit HALT reads "restore now" in its SKILL.md and "do not restore here — the grant restores" in the two bundled shared docs it is told to follow; the grant prompt does not exist in develop-bug, so a run that follows the shared text has no lock and fails at its first numeric `advance-pipeline-lock.sh <n>`.

## Impact
Executed prose with two rules for the same moment; the failing branch is the rarest one (bug loop exhausted, then resumed), which is exactly where it will not be noticed until it bites.

## Recommendation
In both shared sources, qualify the exception inline: "in `develop-task` and `develop-story` — `develop-bug` has no grant prompt and restores on every snapshot". Bundle; the develop-bug copies then agree with develop-bug's SKILL.md.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The cycle-4 fix edited only the site the finding named (develop-bug's SKILL.md) and left the two shared sources that state the same rule — and that develop-bug bundles — saying it for all three pipelines. Same enumeration class as bug 12, one level up.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
Both shared sources now scope the exception in the sentence that states it: the resume contract's Phase 0a bullet reads `loop-limit|not-converging` **in `develop-task` or `develop-story`** and adds that `develop-bug` has no grant prompt, so a develop-bug snapshot takes the restore bullet whatever its `halt_reason` reads; the second bullet lists "any `develop-bug` snapshot" explicitly; the Phase 0b deferral paragraph and step-0 §0b carry the same qualifier. develop-bug's SKILL.md (cycle 4) and the two sources it bundles now agree.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` (Phase 0a bullets, Phase 0b paragraph)
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (§0b)
- bundled `references/` copies via `npm run bundle`

**Testing**:
- prose; `grep -n 'loop-limit|not-converging' shared/resources/develop-pipeline-resume-contract.md shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` → every statement carries the develop-task/develop-story qualifier or the develop-bug carve-out
- `npm run ci:fast` 3512 tests, 0 fail; `eval:develop-task` 16/16; `bundle:check` 0 problems

**Verification Steps for QA**:
1. Read the resume contract's "Restore the lock (both resume paths)": bullet 1 is scoped to develop-task/develop-story and names develop-bug's carve-out; bullet 2 lists any develop-bug snapshot
2. `grep -c 'develop-bug' skills/develop-bug/references/develop-pipeline-resume-contract.md` → the bundled copy carries the carve-out
3. develop-bug SKILL.md:69 and both bundled sources state the same rule

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 5 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 6 |
