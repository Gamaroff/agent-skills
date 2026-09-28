---
id: task.163
title: "[Task 163] Close task.162's step-8 follow-ups"
type: task
description: "Close the five LOW advisories task.162 left: name develop-bug's Step 7 Completion Checklist in the Stop hook and resume contract, fix the step-8 'steps still ahead' clause, add a Stop-hook floor to the --complete population test, pin the resume contract's Step 7-tail wording, and make scenario 4b fail loudly on a missing command."
tags: [develop-pipeline, stop-hook, step-8, develop-bug, follow-up]
category: infrastructure
status: ready-for-review
priority: Low
created: 2026-09-28
updated: 2026-09-28
assignee:
estimated_effort_hours: 4
github_issue: 504
---

# Technical Task: Close task.162's step-8 follow-ups

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.163.review.1.stop-hook-step-8-follow-ups.md` implemented 2026-09-28

**GitHub Issue**: [#504](https://github.com/Gamaroff/agent-skills/issues/504)

---

## 1. Overview

Task.162 (PR #503, merged `e5c1f97d`) made the Stop hook's step-8 reason fit every orchestrator. Its QA gate and PR review passed it with five LOW advisories, recorded in `task.162.gate.1` `recommendations.future` and `task.162.pr-review.1`. None blocked the merge. This task closes all five.

Two are accuracy gaps in what the hook and the resume contract tell an orchestrator. Two are holes in the guards task.162 added. One is a test fixture that fails in the wrong place.

**Scope**:
- The develop-bug Step 7-tail text in `shared/resources/develop-pipeline-on-stop.sh` and in `shared/resources/develop-pipeline-resume-contract.md` Phase 0b.
- The step-8 status-block instruction in the hook's `REASON` heredoc.
- The `--complete` population test in `shared/resources/tests/step-8-completion-checklist.test.mjs`.
- A new pin on the resume contract's Step 7-tail wording.
- The scenario 4b fixture in `shared/resources/advance-pipeline-lock.test.sh`.

**Key deliverables**:

1. At lock 8 a develop-bug orchestrator is told Part B ends with its own Step 7 Completion Checklist, in the hook and in the resume contract alike.
2. At lock 8 the status-block instruction does not ask for a list of steps "still ahead through Step 8" when Step 8 is the only one.
3. The `--complete` population test fails if the hook stops contributing lines to it.
4. A test goes red when the resume contract's Step 7-tail wording is reverted.
5. Scenario 4b fails at setup, naming the command, when `rm` or `dirname` does not resolve.

---

## 2. Motivation

### Current Problems

1. **develop-bug's tail omits its checklist (gate.1 CR-1, pr-review.1 CR-1).** The develop-bug `STEP7_TAIL` names Part B's B1–B4 work: Resolution Summary, status `closed`, parent or registry linkage, tracker-close check. It does not name Part B's `## Step 7 Completion Checklist` (`skills/develop-bug/references/develop-bug-step-7-close-bug.md`), which gates marking Step 7 done. The story/task tail names "the Step 7 checklist". The resume contract's Phase 0b sentence has the same gap. A develop-bug orchestrator resuming from the hook is not told to run the check that decides whether Step 7 finished.
2. **The step-8 status instruction asks for an empty list (pr-review.1 CR-2).** The `REASON` heredoc line beginning "Then: emit the Remaining Work Status block" says `(position \`${POSITION}\`, then the steps still ahead through Step 8)`. At lock 8 `POSITION` already names Step 8 as pending, so "the steps still ahead through Step 8" is either empty or repeats Step 8.
3. **The widened population test has no floor for the hook (pr-review.1 CR-3).** The test "every orchestrator mention of --complete names the Step 8 Completion Checklist" now scans `STOP_HOOK`, but its floors cover only the three `SKILL.md` files and a total (`seen >= 6`) the Markdown already meets. If the hook stopped mentioning `--complete`, its part of the check would pass on nothing.
4. **The resume contract's new wording is unpinned (gate.1 QA-L1).** task.162 made the Phase 0b Step 7-tail sentence skill-aware. Reverting it reds no test: the mutation was recorded as `no-red-untested`.
5. **Scenario 4b skips a missing command silently (gate.1 CR-2).** The loop `case "$p" in /*) ln -sf …` skips any name `command -v` does not resolve to an absolute path. That is right for a builtin, which resolves to its bare name. It is wrong for a missing command, which resolves to an empty string: the skip is silent, and the failure surfaces later as a confusing no-jq assertion.

### Benefits

1. A develop-bug stall at step 8 is sent to the whole of Part B, including the check that closes Step 7.
2. The step-8 status instruction matches the position it sits beside.
3. Both new guards from task.162 have a non-vacuity floor.
4. A missing test tool is reported where it is found.

---

## 3. Technical Background

### Current Architecture

- `develop-pipeline-on-stop.sh` binds `STEP7_TAIL` by `SKILL` (develop-bug vs the rest) and `POSITION` by `NEXT` (8 vs the rest), then interpolates both into `COMPLETION_LINE` and the `REASON` heredoc. The "steps still ahead through Step 8" clause is literal text in the heredoc, the same at every step.
- `develop-pipeline-resume-contract.md` Phase 0b carries the step-8 rule. Its sentence "before the orchestrator finishes Step 7's tail (for develop-story and develop-task: …; for develop-bug: …)" restates the two tails.
- `step-8-completion-checklist.test.mjs` already reads `RESUME` (the resume contract) for its Phase 0b tests, and defines `STOP_HOOK` for the `--complete` population test.
- `develop-pipeline-on-stop.test.sh` scenario 5b asserts each skill's Step 7 tail at lock 8; 5d asserts the lock-8 position.
- The same Step 7-tail wording now lives in two places, the hook string and the contract sentence. Nothing checks they agree.

### Target Architecture

- The develop-bug `STEP7_TAIL` and the contract's develop-bug clause both end with Part B's Step 7 Completion Checklist.
- At `NEXT=8` the heredoc's list clause is bound like `POSITION`: a `STEPS_AHEAD` string that reads "then the steps still ahead through Step 8" below 8, and "then the steps still ahead: Step 7's tail first if its row is unfinished, then Step 8" at 8. The step-8 wording must not claim Step 8 is the only step ahead: at lock 8 the hook's own `COMPLETION_LINE` sends an unfinished Step 7 row back to Step 7 first, and the banner doc lists every remaining step (task.163 review.1).
- The population test adds `(perSkill[STOP_HOOK] || 0) >= 1` beside its existing floors.
- A new test in `step-8-completion-checklist.test.mjs` reads the resume contract's Phase 0b paragraph and the rendered hook reason at lock 8 for develop-bug and develop-task, and requires the same tail phrases in both. It is a parity test, so reverting either copy goes red.
- Scenario 4b: an empty `command -v` result fails setup with the command's name; a bare name (a builtin) is skipped as now; an absolute path is linked.

### Important Clarifications

- **The step-8 routing rule does not change.** Only the description of Step 7's tail and the status-block wording change. The hook must keep stating the resume contract's rule, not a finer one (task.161 QA cycle 2).
- **Item 5 keeps task.162's M4 result.** Re-adding `printf` to the 4b loop must still be absorbed: `command -v printf` returns the bare word `printf`, which the new three-way case skips. Only an empty result fails.
- pr-review.1 PC-1 (the resume contract missing from task.162's In Scope list) is moot: task.162 is accepted and its DoD records the file. It is not carried here.

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-on-stop.sh`: develop-bug `STEP7_TAIL` names Part B's Step 7 Completion Checklist; a step-aware `STEPS_AHEAD` clause at `NEXT=8`
✅ `shared/resources/develop-pipeline-resume-contract.md`: the Phase 0b develop-bug clause names the same checklist
✅ `shared/resources/develop-pipeline-on-stop.test.sh`: 5b's develop-bug case requires the checklist; 5d requires the step-8 clause and forbids the generic one; 5c keeps the generic clause at lock 3
✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: the `STOP_HOOK` floor; a hook↔contract Step 7-tail parity test
✅ `shared/resources/advance-pipeline-lock.test.sh`: scenario 4b's three-way `command -v` case
✅ Bundled `references/` copies regenerated; a CHANGELOG `[Unreleased]` entry citing (task 163)

### Out of Scope

❌ The step-8 routing rule, the Step 8 checklist and the lock lifecycle (task.161)
❌ develop-bug's Step 7 procedure itself (`develop-bug-step-7-close-bug.md`)
❌ pr-review.1 PC-1 (moot, see above)

---

## 5. Breaking Changes

None to any interface. The Stop hook's reason text changes at lock 8 (the develop-bug tail and the status-block clause), and one sentence of the resume contract changes. The reason is a prompt to the orchestrator, not a parsed contract; its only other reader is `develop-pipeline-on-stop.test.sh`, which this task updates.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.163.plan.stop-hook-step-8-follow-ups.md](task.163.plan.stop-hook-step-8-follow-ups.md)

### Phase 1: The step-8 text is complete and consistent

**Risk**: Low. Message text, pinned by tests.

**Files**: `shared/resources/develop-pipeline-on-stop.sh`, `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/develop-pipeline-on-stop.test.sh`

- [x] Append Part B's Step 7 Completion Checklist to the develop-bug `STEP7_TAIL`, and to the develop-bug clause of the resume contract's Phase 0b sentence, in the same words.
- [x] Bind `STEPS_AHEAD` before the heredoc: the generic clause below 8; at 8, "then the steps still ahead: Step 7's tail first if its row is unfinished, then Step 8". Interpolate it where the literal clause is now.
- [x] 5b develop-bug: also require the checklist phrase.
- [x] 5d: at lock 8 require the step-8 clause and forbid "then the steps still ahead through Step 8". 5c: at lock 3 still require the generic clause.

### Phase 2: The guards have floors and fail in the right place

**Risk**: Low.

**Files**: `shared/resources/tests/step-8-completion-checklist.test.mjs`, `shared/resources/advance-pipeline-lock.test.sh`

- [x] Add `(perSkill[STOP_HOOK] || 0) >= 1` to the `--complete` population test, with a message naming the hook.
- [x] Add a parity test: render the hook reason at lock 8 for develop-bug and develop-task (spawn the hook with a fixture lock, as `develop-pipeline-on-stop.test.sh` does), read the resume contract's Phase 0b paragraph, and require each tail's phrases in both. Name a floor so a paragraph that cannot be found fails rather than passes.
- [x] Scenario 4b: replace the two-way `case` with three arms. Empty → fail setup naming the command. Absolute path → link. Bare name → skip (builtin). Update the comment.

### Phase 3: Proof and gates

**Risk**: Low.

- [x] Mutation-prove under bash, with `cp` snapshots of a real `FILES` array and restore checked by `cmp`:
  - drop the checklist from the develop-bug `STEP7_TAIL` → 5b develop-bug red and the parity test red;
  - drop it from the contract only → the parity test red;
  - restore the literal "steps still ahead through Step 8" at 8 → 5d red;
  - rename `--complete` out of every hook line → the new `STOP_HOOK` floor red;
  - make `command -v rm` return empty (e.g. a name that does not exist in the loop) → 4b setup fails naming it;
  - re-add `printf` to the 4b loop → 4b stays green (absorbed, as in task.162).
- [x] `npm run bundle`, then `npm run ci:fast` with `.agents/skills` moved aside, `npm run lint:shell` and `npm run bundle:check`. CHANGELOG `[Unreleased]` entry citing (task 163).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-on-stop.sh`: develop-bug tail names the checklist; step-aware `STEPS_AHEAD`
2. ✅ `shared/resources/develop-pipeline-resume-contract.md`: Phase 0b develop-bug clause names the checklist

### Files to Modify (Tests)

3. ✅ `shared/resources/develop-pipeline-on-stop.test.sh`: 5b, 5c, 5d assertions
4. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: `STOP_HOOK` floor; hook↔contract parity test
5. ✅ `shared/resources/advance-pipeline-lock.test.sh`: 4b three-way case

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`: `[Unreleased]` entry
7. ✅ Bundled `references/` copies, regenerated by `npm run bundle` (never edited by hand)
8. ✅ `shared/resources/develop-pipeline-remaining-work-banner.md`: the steps-ahead derivation rule states the lock-8 exception (QA cycle 1, CR-1)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the Stop hook's reason at lock 8 (all three skills) and lock 3
- **Command**: `bash shared/resources/develop-pipeline-on-stop.test.sh`
- **Target**: 5b develop-bug names the checklist; 5d requires the step-8 clause and forbids the generic one; 5c keeps the generic one

### Integration Tests

- **Scope**: hook↔contract Step 7-tail parity; the `--complete` population with its hook floor
- **Command**: `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`

### Contract Tests

- The parity test is the contract: the hook and the resume contract describe each orchestrator's Step 7 tail in the same words

### Performance Tests

Not applicable. The change is message text and test code.

### Consumer Tests

- `bash shared/resources/advance-pipeline-lock.test.sh` passes, and fails at setup naming the command when one is missing
- `develop-pipeline-on-precompact.test.sh` is unaffected

---

## 9. Success Criteria

### Functional

- [x] At lock 8 with `skill: develop-bug`, the reason names Part B's Step 7 Completion Checklist (Phase 1)
- [x] The resume contract's Phase 0b develop-bug clause names the same checklist, and a parity test goes red if either copy drops it (Phases 1–2)
- [x] At lock 8 no reason contains "then the steps still ahead through Step 8"; at lock 3 the reason still does (Phase 1)
- [x] The `--complete` population test fails when the hook contributes no line to it (Phase 2)
- [x] Scenario 4b fails at setup, naming the command, when `command -v` returns empty; a builtin is still skipped (Phase 2)

### Performance

- [x] No measurable change

### Code Quality

- [x] `npm run ci:fast` passes with `.agents/skills` moved aside; `lint:shell` and `bundle:check` pass
- [x] Each Phase 3 mutation behaves as stated under bash, with restore checked by `cmp`

### Migration

- [x] CHANGELOG `[Unreleased]` entry cites (task 163)

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

None identified.

### Low Risk Areas

1. **A parity test that reads prose too loosely or too tightly.**
   - **Risk**: a phrase match on the contract passes on the wrong paragraph, or breaks on harmless rewording.
   - **Mitigation**: locate the Phase 0b paragraph by its "Step 8 is decided by the resume record" anchor, require a floor (paragraph found, both tails found), and match only the short checklist and bug-close phrases the two copies share.
2. **The step-8 status clause loses information.**
   - **Risk**: the orchestrator uses the clause to emit its Remaining Work Status block.
   - **Mitigation**: the step-8 clause still tells it what to list (Step 8 itself); the wording is checked against the banner doc's forms.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the Stop hook emits a malformed or empty reason at any step, or `develop-pipeline-on-stop.test.sh` fails on `develop`
- **Steps**: revert the task's merge commit on `develop`, run `npm run bundle`, then `npm run ci:fast`
- **Validation**: `bash shared/resources/develop-pipeline-on-stop.test.sh` passes on the reverted tree

### Partial Rollback (1-2 hours)

- **When**: the parity test proves brittle against legitimate contract edits
- **Steps**: keep Phase 1 and the other Phase 2 items; narrow the parity test to the checklist phrase alone, with the reason recorded in its comment

### Forward Fix (< 4 hours)

- **When**: a wording is inaccurate but the reason is well-formed
- **Approach**: reword and update the pinning tests; no revert needed

### Rollback Triggers

- **Critical**: a malformed or empty Stop-hook reason at any step
- **Non-critical**: wording nuance (fix forward)

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-28
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.163.qa.2.stop-hook-step-8-follow-ups.md](./task.163.qa.2.stop-hook-step-8-follow-ups.md)
- **Gate File**: [task.163.gate.2.stop-hook-step-8-follow-ups.yml](./task.163.gate.2.stop-hook-step-8-follow-ups.yml)
- **Previous**: [qa.1](./task.163.qa.1.stop-hook-step-8-follow-ups.md) / [gate.1](./task.163.gate.1.stop-hook-step-8-follow-ups.yml) — PASS (100/100), 2 LOW, fixed in cycle 1

### Test Coverage Summary
- **Tests Executed**: 185 (targeted suites) + 9 mutation proofs
- **Phases Verified**: 3/3
- **Critical Issues**: 0 (1 MEDIUM)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
CR-1 (MEDIUM): cycle 1's banner-doc exception keys on "a lock at 8", so it also rewrites the ordinary Step 7 → 8 transition. It should be scoped to a Stop-hook re-prompt. There are three LOW findings on the same subject: CR-2, the checklist is still inside Part B's list; CR-3, the lock-8 list is narrower than the completion rule; CR-4, the banner test checks presence only.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-28 | 1.0     | Initial draft | create-task |
| 2026-09-28 | 1.1     | Review passed (9/10) — step-8 `STEPS_AHEAD` wording fixed to allow an unfinished Step 7 tail | review-task |
| 2026-09-28 |         | Status → ready-for-development | review-task |
| 2026-09-28 |         | Implemented — 5 source files plus bundled copies; 1 new test, 5 new assertions; 7 mutations proved | develop |
| 2026-09-28 |         | QA gate PASS (100/100) — 2 LOW findings | qa-task |
| 2026-09-28 |         | QA gate CONCERNS (90/100) — 1 MEDIUM, 3 LOW (cycle 2 refute pass) | qa-task |
| 2026-09-28 |         | QA findings fixed — banner doc defers to the Stop hook at a re-prompt only; checklist outside Part B's list; lock-8 list worded after the completion rule; 2 iterations | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The step-8 text is complete and consistent
- [x] develop-bug tail names the checklist (hook and contract)
- [x] Step-aware `STEPS_AHEAD`
- [x] 5b, 5c, 5d updated

### Phase 2: The guards have floors and fail in the right place
- [x] `STOP_HOOK` floor
- [x] Hook↔contract parity test
- [x] 4b three-way case

### Phase 3: Proof and gates
- [x] Mutation proofs
- [x] Gates and CHANGELOG

---

## References

- **Source**: task.162 (`docs/tasks/task.162.stop-hook-step-8-reason-fits-every-orchestrator/`):
  - `gate.1` `recommendations.future`: CR-1 (develop-bug tail), CR-2 (4b silent skip), QA-L1 (unpinned contract wording);
  - `pr-review.1` CR-1, CR-2 (step-8 status clause), CR-3 (no hook floor).
- **develop-bug Step 7**: `skills/develop-bug/references/develop-bug-step-7-close-bug.md` (Part B; § Step 7 Completion Checklist)
- **Related**: `shared/resources/develop-pipeline-remaining-work-banner.md`, `shared/resources/develop-pipeline-hooks.md`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, then run `npm run bundle`. Never edit the `skills/*/references/` copies.
- The hook's step-8 line must keep stating the resume contract's rule, not a finer one (task.161 QA cycle 2).
- Run mutation proofs under `bash` with a real array.

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.163.stop-hook-step-8-follow-ups/task.163.stop-hook-step-8-follow-ups.md`
2. QA artifacts will be co-located: `task.163.qa.{N}.*.md`, `task.163.gate.{N}.*.yml`, `task.163.bug.{N}.*.md`
