# Bug Report: Task 128 - the `mutation-proved` precondition reads a hand-set boolean, not the recorded run its statement requires

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (from diff code review CR-3, verified by reading the check)
**Date Found**: 2026-09-20

## Description
The precondition table states: "a named test goes red when the fix is reverted, **and the run that showed it is recorded**". The check (`finalise-fix-and-recheck.mjs`, `mutation-proved`) reads only `mutationProof.test` (non-empty) and `mutationProof.redOnRevert === true` — a flag Step 8a tells the agent to flip by hand after running the proof. Nothing in the finding record carries the run, so the evaluator cannot distinguish a proof that ran from one that was asserted. This is the self-report class the task itself was written to remove (obs #121: "a count from a harness is the self-report this step removed").

## Expected Behavior
The check requires a recorded artefact — e.g. `mutationProof.run` naming a captured log that shows the named test failing — and fails closed when it is absent or does not show a red result for that test.

## Actual Behavior
A boolean satisfies the precondition.

## Impact
The one precondition meant to be evidence is a checkbox; under time pressure at 07:00 it is the one most likely to be ticked.

## Recommendation
Add a required `run` field (path to the captured proof output) to the finding record; the check verifies the file exists, is non-empty, and contains a failing-test line naming `mutationProof.test`. Update Step 8a's record template and the fixture test's GOOD finding accordingly.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)
**Date**: 2026-09-20 · **Root cause**: the check read only `mutationProof.redOnRevert === true`; the finding record had no field for the run, so the statement's "is recorded" was unenforced.

#### Fix Implementation (In Progress → Ready for QA)
**Fix**: `mutationProof.run` is required — a file the evaluator opens; it must be non-empty, name `mutationProof.test`, and carry a red marker (`not ok` / `✖` / `ℹ fail N` / `FAIL`). Each failure names its reason. Step 8a's record template names the file and the proof step captures the test output to it; the JSON statement and input list say so.
**Files**: `shared/resources/finalise-fix-and-recheck.mjs`, `finalise-fix-and-recheck-preconditions.json`, `skills/finalise/SKILL.md` (Step 8a), test `mutation-proved reads the RECORDED run, not the boolean (BUG-4)` (no run / missing file / green run / wrong test / empty file / the real thing).
**Mutation proof**: run check skipped → test red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | In Progress | qa-fix | Investigation |
| 2026-09-20 | Ready for QA | qa-fix | recorded run required |
