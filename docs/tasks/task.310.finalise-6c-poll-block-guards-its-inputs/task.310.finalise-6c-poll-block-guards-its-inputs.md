---
id: task.310
title: "The finalise 6c poll block guards its inputs"
type: task
description: "Follow-up to task.309 (CR-1): the /finalise step 6c poll block reads CI_HEAD_2 and PR_NUMBER without binding them, so a fresh shell runs it on empty values; the block opens with a named-HALT guard and a test runs the shipped guard with each input unbound."
tags: [finalise, ci, tests, pipeline]
category: testing
status: planned
priority: Low
created: 2026-11-15
updated: 2026-11-15
estimated_effort_hours: 2
---

# Technical Task: The finalise 6c poll block guards its inputs

**Status:** Planned

Follow-up to [task.309](../task.309.pin-6c-head-writer-position-and-clear-stale-head-file/task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md) (PR #909, issue #908, merged 2026-11-15). The finding is CR-1 of that task's 5c PR review (`task.309.pr-review.1.*`); it was pre-existing, so task.309 left it alone.

---

## 1. Overview

The 6c poll block in `skills/finalise/SKILL.md` reads `$CI_HEAD_2` and `$PR_NUMBER` and binds neither. Every fenced block runs as its own shell, so a run that does not carry both values in from 6a and Step 3a executes the block on empty strings. This task opens the block with a guard that HALTs by name before the block writes or launches anything, and holds the guard with a test that runs the shipped line.

**Scope**: the first 6c block in `skills/finalise/SKILL.md` and one test in `evals/shared/tests/finalise-publish-boundary.test.mjs`. The later-turn reader block already recovers `CI_HEAD_2` from a file and is not changed.

---

## 2. Motivation

### Current Problems

1. **The block runs on empty values without saying so.** `PR_HEAD=$(gh pr view "$PR_NUMBER" …)` and the `nohup bash "$POLL" "$PR_NUMBER" "$CI_HEAD_2" …` launch both take the two names as given. With `CI_HEAD_2` empty the head comparison HALTs on a message that prints an empty acceptance head (`≠ pushed acceptance head `), and the writer would have recorded an empty head. With `PR_NUMBER` empty, what `gh pr view ""` does is not recorded anywhere (unverified, measured in Phase 1).
2. **A sibling block already does it right.** The wait block binds its inputs with `: "${CI_ROLLUP:?bind CI_ROLLUP from the rollup read above}" "${PR_NUMBER:?bind PR_NUMBER}"` (`skills/finalise/SKILL.md:1470`). The 6c block, written later, does not follow that precedent.
3. **The finding sits in a closed task's review.** It is in `task.309.pr-review.1.*` and the task.309 sprint review's Known Limitations, and nowhere a future session looks.

### Benefits of This Task

1. **A missing input stops the run with its name on it.** The HALT says which value to bind and where it comes from.
2. **Nothing is written or launched on a bad run.** The guard sits above the `rm -f` line, so a HALT leaves the state directory as it found it.
3. **No change on the happy path.** A run that carries both values passes through unchanged.

---

## 3. Technical Background

### Current Architecture

Names below were grepped on 2026-11-15 from the repository root (`git grep -n 'CI_HEAD_2\|PR_NUMBER' -- skills/finalise/SKILL.md`).

- `CI_HEAD_2` is set once, at the end of 6a: `skills/finalise/SKILL.md:2143` (`CI_HEAD_2=$(git rev-parse HEAD)`).
- `PR_NUMBER` is set in Step 3a from the resolver: `skills/finalise/SKILL.md:520` (`PR_NUMBER=$(printf '%s' "$PR_JSON" | jq -r '.pr // empty')`).
- The 6c poll block reads both without binding: `skills/finalise/SKILL.md:2243` (`gh pr view "$PR_NUMBER" …`), `:2244` (`${CI_HEAD_2:0:12}`), `:2277` (the head writer) and `:2279` (`nohup bash "$POLL" "$PR_NUMBER" "$CI_HEAD_2" …`).
- The later-turn reader recovers `CI_HEAD_2` from the recorded file and HALTs when it is empty: `skills/finalise/SKILL.md:2300`–`:2302`. It does not read `PR_NUMBER`.
- The precedent guard is `skills/finalise/SKILL.md:1470` (`: "${CI_ROLLUP:?bind CI_ROLLUP …}" "${PR_NUMBER:?bind PR_NUMBER}"`).
- The 6c tests extract the block with `between(finalise, "6c. **Second CI reading", "6d. **CHANGELOG citation check", FINALISE)` and `codeLines(...)`: `evals/shared/tests/finalise-publish-boundary.test.mjs:625` onward. Task.309's order assertion finds the `rm -f` line, the writer line and the `nohup` line by their own patterns (`:640`–`:655`).
- `skills/finalise/SKILL.md` is a source, not a bundled copy. Whether a bundled copy carries the 6c block is measured in Phase 3 (`git grep -l 'finalise-ci-head-2' -- skills`).

### Target Architecture

- The first 6c block opens with one guard line in the precedent's form, naming the source of each value: `CI_HEAD_2` from 6a's `git rev-parse HEAD` after the push, and `PR_NUMBER` from Step 3a.
- The guard sits above the `PR_HEAD=$(gh pr view …)` line and above `rm -f`, so a HALT precedes every write.
- One test runs the shipped guard line in a scratch repository, once with `CI_HEAD_2` unbound, once with `PR_NUMBER` unbound, once with both bound, and asserts: non-zero exit and the variable's name in stderr for the first two, exit 0 and nothing on stderr for the third.
- The existing order assertion gains the guard: guard line before the `rm -f` line.

### Important Clarifications

- **Guard, not re-derive.** The reader recovers `CI_HEAD_2` from a file because the file records what the poll was started on. The first block has no such file yet, and re-deriving the head there with `git rev-parse HEAD` is the wrong source: a PreCompact pause commit can leave local HEAD ahead of the PR head (task.308). A named HALT is the only safe response to a missing value.
- **`CI_CHECKS_1` is left alone.** The launch line reads `"${CI_CHECKS_1:-0}"`, a default of zero that turns the poll's check floor off. That is a separate decision, recorded in Phase 1 for the owner and out of scope here.

---

## 4. Scope

### In Scope

✅ **The guard line** at the top of the first 6c block, and a comment naming where each value comes from.
✅ **A behaviour test** that runs the shipped guard line with each input unbound and with both bound.
✅ **An order assertion** that the guard precedes `rm -f`.
✅ **`CHANGELOG.md`**: one line under `[Unreleased]`.

### Out of Scope

❌ **The later-turn reader block.** Its recovery of `CI_HEAD_2` is held by task.308's tests.
❌ **`CI_CHECKS_1`'s zero default.** See Important Clarifications.
❌ **The redundant half of task.309's clear test** (CR-2). An optional trim of a passing test.
❌ **Other blocks' unbound reads** in `skills/finalise/SKILL.md`. Phase 1 lists any it finds; each is its own task.

---

## 5. Breaking Changes

None - API stable. The change is internal pipeline prose and one test. A run that carried both values before still does.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.310.plan.finalise-6c-poll-block-guards-its-inputs.md](task.310.plan.finalise-6c-poll-block-guards-its-inputs.md)

### Phase 1: Premise check

**Risk Level**: Low

**Files**:
- none changed

**Changes**:
- [ ] Re-run the greps in Technical Background and confirm the line numbers and that neither name is bound in the first 6c block.
- [ ] Measure what the block does today with each input unbound: run `gh pr view ""` (read-only) and the head comparison with an empty head, and record both outcomes in the implementation report.
- [ ] List any other fenced block in `skills/finalise/SKILL.md` that reads `CI_HEAD_2` or `PR_NUMBER` without a binding or a guard (`git grep -n`), and record them as out of scope.

**Dependencies**: none

---

### Phase 2: The guard and its test

**Risk Level**: Low

**Files**:
- `skills/finalise/SKILL.md`
- `evals/shared/tests/finalise-publish-boundary.test.mjs`

**Changes**:
- [ ] Add the guard line and comment at the top of the first 6c block, above `PR_HEAD=`.
- [ ] Add the test: extract the guard by its own pattern, run it under `bash -c` with each of the three bindings, assert exit status and stderr.
- [ ] Extend the order assertion: guard line before the `rm -f` line.
- [ ] Mutation-prove it: delete the guard line and confirm the test is red; move it below `rm -f` and confirm the order assertion is red. Revert each with Edit.

**Dependencies**: Phase 1.

---

### Phase 3: Bundle, docs and gate

**Risk Level**: Low

**Files**:
- bundled copies under `skills/*/references/`, if `npm run bundle` changes any
- `CHANGELOG.md`

**Changes**:
- [ ] Run `npm run bundle` and `npm run bundle:check`; commit any regenerated copies.
- [ ] Add the CHANGELOG line citing `(task 310)`.
- [ ] Run `npm run validate -- skills/finalise/` and the fast gate (`npm run test:remote`).

**Dependencies**: Phase 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. `skills/finalise/SKILL.md` - the guard line and comment at the top of the first 6c block

### Files to Modify (Tests)

2. `evals/shared/tests/finalise-publish-boundary.test.mjs` - guard behaviour test, order assertion

### Files to Modify (Documentation)

3. `CHANGELOG.md` - one line under `[Unreleased]` › Fixed

### Generated

4. Bundled copies under `skills/*/references/`, only if `npm run bundle` changes any (measure with `git status` after the run)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the new test in `evals/shared/tests/finalise-publish-boundary.test.mjs`, which runs the shipped guard line.

**Actions**:
- [ ] `CI_HEAD_2` unbound: non-zero exit, stderr names `CI_HEAD_2`.
- [ ] `PR_NUMBER` unbound: non-zero exit, stderr names `PR_NUMBER`.
- [ ] Both bound: exit 0, empty stderr.
- [ ] The order assertion and task.309's tests stay green.

**Command**: `command node --test evals/shared/tests/finalise-publish-boundary.test.mjs`

### Mutation Proof

- [ ] Delete the guard line: the guard test is red.
- [ ] Move the guard below `rm -f`: the order assertion is red.
- [ ] Each mutation is reverted and the tests re-run green.

### Integration Tests

**Scope**: the fast gate. **Command**: `npm run test:remote` (LAN server first; `TEST_LOCAL=1` only when it is down), then `CI=true` for the touched suite before pushing.

---

## 9. Success Criteria

### Functional

- [ ] Running the shipped guard line with `CI_HEAD_2` unbound exits non-zero and names `CI_HEAD_2`.
- [ ] Running it with `PR_NUMBER` unbound exits non-zero and names `PR_NUMBER`.
- [ ] Running it with both bound exits 0.
- [ ] The guard precedes `rm -f` in the block, and deleting the guard turns the test red.
- [ ] The later-turn reader is unchanged and its existing tests stay green.

### Performance

- [ ] No timing criterion. The change adds one `:` line to an existing block.

### Code Quality

- [ ] `npm run bundle:check` is clean.
- [ ] The fast gate passes with 0 not ok; the figure is recorded in the QA report.
- [ ] `npm run validate -- skills/finalise/` passes (`SKILL.md` changes).

### Migration

- [ ] `CHANGELOG.md` cites `(task 310)`.
- [ ] No consumer change is needed.

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

None.

### LOW RISK

1. **A guard that HALTs a run that used to pass.**
   - Risk: a host that reaches the 6c block with `PR_NUMBER` or `CI_HEAD_2` set in a way the guard does not see (for example a host that exports them under another name).
   - Probability: Low. Impact: Low (a named HALT, with the fix stated in its message).
   - Mitigation: Phase 1 lists every route that reaches the block; the message names the step that binds each value.
2. **Line-position assertions are brittle to a reflow.**
   - Risk: the order assertion compares the positions of four lines.
   - Probability: Low. Impact: Low (a red test with a clear message).
   - Mitigation: match each line by its own pattern and assert each is found before comparing, as task.309's assertion does.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a finalise run that HALTs on the new guard with both values bound, or a red `finalise-publish-boundary` test on `develop` after merge.
- **Steps**: `git revert` the merge commit; run `npm run bundle` if copies changed; push through a PR.
- **Validation**: `command node --test evals/shared/tests/finalise-publish-boundary.test.mjs` is green.

### Partial Rollback

- **When to use**: the guard is right and the test is brittle.
- **Steps**: revert the test commit only; keep the guard.

### Forward Fix

- **When to use**: the guard's message misnames the source of a value.
- **Approach**: edit the message and the test's stderr assertion together.

### Rollback Triggers

- **Critical**: a finalise run blocked with both values bound.
- **Non-critical**: a wording defect in the HALT message, fixed forward.

---

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-11-15 | 1.0 | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Premise check
- [ ] Phase 2: The guard and its test
- [ ] Phase 3: Bundle, docs and gate

## References

- [task.309](../task.309.pin-6c-head-writer-position-and-clear-stale-head-file/task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md) and its 5c review, finding CR-1
- [task.308](../task.308.pause-commits-cancel-the-step-7-ci-poll/task.308.pause-commits-cancel-the-step-7-ci-poll.md), which added the recorded-head mechanism
- Issue #908 and PR #909

## Notes

Cut from a review finding, not from an observation. Single shippable unit: the guard and its test are one outcome.
