# Bug Report: Task 182 - the qa_phase rule is "stated once" but the contract restates it

**Task**: [task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md](./task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md)
**Bug ID**: TASK-182-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 3, code review CR-1/CR-2 / TASK-182-004)
**Date Found**: 2026-10-13

## Description

QA cycle 2's fix consolidated the `qa_phase` writer rule into the pause reference's lock-schema row, which now says it is "the one statement of which value each writes", and the parity test's comment says no other describer restates a value. Neither holds: `develop-pipeline-resume-contract.md:634-635` still says "the grant writes `5a`" and "the grant writes `5b`". The test's `VALUE_CLAIM` needs the literal `grant-qa-cycles.sh` on one physical line, so it misses "the grant" and a claim that wraps; and its describer list is the hand-kept `FILES` map, which omits other describers such as `develop-pipeline-step-7-finalise.md`.

## Steps to Reproduce

`sed -n 632,636p shared/resources/develop-pipeline-resume-contract.md`; run `qa-loop-lock-fields-parity.test.mjs` — green.

## Expected Behavior

Either the contract cites the pause row, or the row does not claim to be the only statement; and the guard reads every describer, whatever the spelling.

## Actual Behavior

A second statement exists, and the guard passes over it.

## Impact

The values are correct today, so nothing reads wrongly yet; the defect is that the guard built to stop the next drift cannot see this one. The next edit to the grant's behaviour would leave the contract stale with the test green — the failure the consolidation was meant to end.

## Recommendation

Contract cites the row and keeps only the rationale; `VALUE_CLAIM` matches "the grant" on whitespace-collapsed text; the describer population is derived by grep; the row's claim is scoped to the grant's halt-dependent value.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-13

**Root Cause**: cycle 2's consolidation claimed the pause row was the one statement of *every* re-entry writer's value, while `reenter-qa-after-finalise.sh`'s constant `5a` is legitimately restated at its call sites and the contract's grant paragraph still carried the grant's values. The guard keyed on one spelling (`grant-qa-cycles.sh`, one physical line) over the hand-kept `FILES` map.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-13

**Fix Description** (qa-fix Step 2.6 — scope the claim):
- `develop-pipeline-pause.md`: the row is the one statement of **the value the grant writes, which depends on the halt**; the other describers cite it.
- `develop-pipeline-resume-contract.md`: the grant paragraph cites the row and keeps only the reason (loop-limit ran its last 5b; not-converging fired before 5b).
- `develop-pipeline-hooks.md`: "the value the grant writes depends on the halt and is stated once, in the `qa_phase` row…".
- `qa-loop-lock-fields-parity.test.mjs`: the describer population is derived (`git grep` over `:(glob)shared/resources/*.md` and `:(glob)skills/*/SKILL.md` for the grant), the text is whitespace-collapsed, and `VALUE_CLAIM` takes "the grant" and needs a writes/sets verb before the value — measured against every historic false statement (origin/develop, `b7d7661e`, `4eb35d36`, `93539f1b`); in today's tree it matches only the pause row.

**Testing**: parity 7/7, refusal parity 5/5, relationship-assertion lint clean, `ci:fast` 5424/0. Mutation-proven: a wrapped "the grant writes `5a`" restored in the contract → red; a restatement appended to `develop-pipeline-step-7-finalise.md` (outside `FILES`) → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-13 | New | qa-task | Filed by task.182.qa.3 |
| 2026-10-13 | In Progress | qa-fix | Investigation (QA cycle 3 fix) |
| 2026-10-13 | Ready for QA | qa-fix | Claim scoped to the grant; contract cites the row; guard derived and widened |
| 2026-10-13 | Closed | qa-task | Verified by task.182.qa.4 — contract cites the pause row; guard population derived |
