# Bug Report: Task 146 - The shared cycle-2 description omits the Identity rules probe

**Task**: [Link](./task.146.identity-rule-fix-probe.md)
**Bug ID**: TASK-146-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 1, from code review CR-1)
**Date Found**: 2026-09-25

## Description

`shared/resources/code-review-prompt.md` § cycle 2 (line 236, bundled into six skills) describes the
refute pass: "Probe the four transitions … **teardown · in-flight · error path · reconnect**". Task 146
added an Identity rules paragraph to the directive it describes, and the description was not updated.

## Steps to Reproduce

`sed -n 228,242p shared/resources/code-review-prompt.md`, then compare it with the `REFUTE PASS.` block
in `skills/qa-task/SKILL.md`.

## Expected Behavior

The description names both probes the refute pass carries.

## Actual Behavior

The description lists only the lifecycle transitions.

## Impact

A reader of the shared contract is told the refute pass is lifecycle-only. This is the "what did this
edit make false elsewhere?" defect class that qa-fix Step 3.5's documentation probe names (obs #21).

## Recommendation

Add one clause naming the identity pair to that bullet, then run `npm run bundle`. Keep the identity
probe out of the general reviewer's checks; the task scopes that out.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-25

**Root Cause**: The task changed the directive, and nothing enumerated the statements that describe it. Four sites describe what the refute pass probes: the refute blocks in qa-task and qa-story, qa-fix Step 3.5, and the shared contract. Found with `grep -rn 'four transitions\|probe these four'` plus a `teardown` search of `docs/` and `shared/resources/`. The shared contract was the one missed.

**Fix Description**: `shared/resources/code-review-prompt.md`'s cycle-2 section gains a bullet naming the identity pair (one pair that must be the same and one that must differ), citing the qa-fix table and obs #169. `npm run bundle` refreshed the 6 copies. The bullet sits outside the Prompt Template fence, so the general reviewer's checks are unchanged. A new test holds both refute probes in that description and holds the identity probe out of the template fence. It is mutation-proved: dropping the identity bullet, dropping the transitions, leaking the probe into the template, and renaming the template's output heading each turned it red.

**Files Modified**: `shared/resources/code-review-prompt.md` (+6 bundled copies), `tests/identity-rule-probe.test.js`

| Date       | Status       | Changed By | Notes               |
| ---------- | ------------ | ---------- | ------------------- |
| 2026-09-25 | Ready for QA | qa-fix     | Fixed in QA cycle 1 |
