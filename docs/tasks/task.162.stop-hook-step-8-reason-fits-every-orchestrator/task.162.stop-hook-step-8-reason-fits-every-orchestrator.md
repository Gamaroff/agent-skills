---
id: task.162
title: "[Task 162] The Stop hook's step-8 reason fits every orchestrator"
type: task
description: "At current_step 8 the Stop hook describes Step 7's tail in develop-story/develop-task terms and asserts 'Step 7/8 ✅ complete' before its own routing; make both skill- and step-aware, drop an unreachable --complete clause, and tighten task.161's no-jq test PATH."
tags: [develop-pipeline, stop-hook, step-8, develop-bug, follow-up]
category: infrastructure
status: ready-for-review
priority: Low
created: 2026-09-27
updated: 2026-09-27
assignee:
estimated_effort_hours: 4
github_issue: 502
---

# Technical Task: The Stop hook's step-8 reason fits every orchestrator

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.162.review.1.stop-hook-step-8-reason-fits-every-orchestrator.md` implemented 2026-09-27

**GitHub Issue**: [#502](https://github.com/Gamaroff/agent-skills/issues/502)

---

## 1. Overview

Task.161 (PR #501) made the pipeline lock outlive the Step 8 commit, and changed the Stop hook's step-8 reason so it names the Completion Checklist, not `/commit-changes` returning, as the end of Step 8. Two readers flagged the new reason's wording as advisory: task.161 gate.3 CR-2 and pr-review.1 CR-1.

The reason is shared by all three orchestrators, but its description of Step 7's tail only fits develop-story and develop-task. It also opens with a status block that asserts "Step 7/8 ✅ complete", a claim a lock at 8 does not support. That assertion predates task.161: the output is identical on `develop` before it. This task makes the reason accurate for every orchestrator at step 8, and cleans up two small defects task.161 left in the same files.

**Scope**:
- The `NEXT=8` branches of `shared/resources/develop-pipeline-on-stop.sh`: the Step 7-tail wording and the status-block position line.
- The unreachable `--complete` clause in the generic completion line.
- The `--complete` population scan in `shared/resources/tests/step-8-completion-checklist.test.mjs`, widened to cover the hook script.
- The no-jq `PATH` fixture in `shared/resources/advance-pipeline-lock.test.sh` scenario 4b.

**Key deliverables**:

1. At `current_step` 8 the Stop hook names develop-bug's Step 7 tail (Part B, the bug-close routine) for a develop-bug lock, and develop-story/develop-task's tail otherwise.
2. At `current_step` 8 the status block does not assert that Step 7 is complete.
3. No line of the hook script tells the orchestrator to run `--complete` itself. A population test now covers the script as well as the Markdown.
4. Scenario 4b's no-jq `PATH` holds only absolute links to the commands the pre-gate arms run.

---

## 2. Motivation

### Current Problems

1. **develop-bug gets a story/task description of Step 7.** `develop-pipeline-on-stop.sh`'s `NEXT=8` `COMPLETION_LINE` says an unfinished Step 7 means finishing "the DoD body to the PR, the tracker update, the Step 7 checklist". That is the develop-story/develop-task tail (`develop-pipeline-step-7-finalise.md`). A develop-bug run's Step 7 has a different tail: Part B of `skills/develop-bug/references/develop-bug-step-7-close-bug.md`, the bug-close routine. It writes `## Resolution Summary`, flips the bug to `closed`, and updates the parent linkage or the bug registry. The lock reaches 8 when `/finalise --bug` self-advances, so a develop-bug stall between Part A and Part B is told to finish work that does not close the bug. Test 5b in `develop-pipeline-on-stop.test.sh` asserts only the generic phrases, so it holds this wording in place for develop-bug.
2. **The status block asserts what the rule denies.** Before any routing, the reason tells the orchestrator to emit a Remaining Work Status block with the position "`Step $((NEXT - 1))/8 ✅ complete`". At `NEXT=8` that reads "Step 7/8 ✅ complete". Two lines later the completion line says a lock at 8 is **not** evidence that Step 7 finished. The block and the rule contradict each other in one message.
3. **An unreachable `--complete` instruction.** The generic `COMPLETION_LINE` still ends "(or `--complete` if that was Step 8)". Since task.161, `NEXT=8` takes its own branch, so the clause never renders, and it contradicts "never run `--complete` on your own". The task.161 population test ("every orchestrator mention of `--complete` names the Step 8 Completion Checklist") scans `.md` files only, so it cannot see the clause.
4. **A no-jq fixture that over-links.** Scenario 4b symlinks `bash rm cat dirname date mktemp mv printf` into a stripped `PATH`. `printf` is a bash builtin, so `command -v printf` returns the bare word `printf` and `ln -sf printf …` creates a self-referencing link. The pre-gate arms under test run only `rm`, `echo` and the builtins.

### Benefits

1. A develop-bug stall at step 8 is sent back to the bug-close routine, the work that actually closes the bug.
2. The Stop hook's reason stops contradicting itself about Step 7.
3. The `--complete` population guard covers every orchestrator-facing file that can say `--complete`, not just the Markdown ones.
4. Scenario 4b's `PATH` states exactly what the tested arms need, so a future arm that needs a new command fails the test visibly.

---

## 3. Technical Background

### Current Architecture

`develop-pipeline-on-stop.sh` builds one `REASON` from three pieces:

- `NEXT_NAME` and `NEXT_SKILL`, set per skill (`develop-bug` has its own `case`) and overridden at `NEXT=8` to "Step 8 per the step-8 doc (…)";
- a status-block instruction whose position is `Step $((NEXT - 1))/8 ✅ complete`, the same text at every step;
- `COMPLETION_LINE`, with three branches: the QA-loop `THEN_WHAT` at `NEXT=5`, the step-8 line at `NEXT=8`, and the generic line otherwise.

The step-8 line is the same for all three `SKILL` values. `ALREADY_DONE` was made step-aware by task.161 (CR-2), so it already branches on `NEXT=8` and does not need changing here.

`develop-bug`'s Step 7 is two parts (`develop-bug-step-7-close-bug.md`):

- **Part A:** `/finalise --bug`, whose lock cooperation advances the lock to 8.
- **Part B:** B1 Resolution Summary, B2 status `closed`, B3 parent linkage (story or task Bug Reports table, or the general bug registry), B4 tracker-close verification.

### Target Architecture

- `NEXT=8`: the Step 7-tail parenthetical is chosen by `SKILL`:
  - develop-bug names Part B (Resolution Summary, status `closed`, parent/registry linkage, tracker-close verification) and cites `develop-bug-step-7-close-bug.md`;
  - develop-story/develop-task keep today's text.
- `NEXT=8`: the status-block position does not claim Step 7 complete. It names Step 8 as pending and Step 7 as unverified. The exact wording is chosen in Phase 1 against the position forms `develop-pipeline-remaining-work-banner.md` already uses.
- Generic `COMPLETION_LINE`: the "(or `--complete` if that was Step 8)" clause is deleted.
- `step-8-completion-checklist.test.mjs`: the `--complete` population test also reads `shared/resources/develop-pipeline-on-stop.sh`, and requires every line naming `--complete` to name the Completion Checklist.
- `advance-pipeline-lock.test.sh` 4b: links only `rm` and `dirname`, and skips any name `command -v` does not resolve to an absolute path.

### Important Clarifications

- **The rule for where Step 8 resumes is not changing.** The resume contract's step-8 rule (Phase 0b) stays the one statement: an unfinished row at or below Step 7 is finished first. This task changes only how the hook *describes* Step 7's tail. The hook must keep stating that rule rather than a finer one (task.161 QA cycle 2 consolidated onto it).
- Item 2 is **pre-existing**: `origin/develop` before task.161 rendered the same "Step 7/8 ✅ complete" at lock 8, as measured in task.161 QA cycle 3. It is in scope because the same message now carries the rule it contradicts.

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-on-stop.sh`: the skill-aware Step 7-tail text at `NEXT=8`, a step-aware status-block position at `NEXT=8`, and deletion of the generic line's `--complete` clause
✅ `shared/resources/develop-pipeline-on-stop.test.sh`: Scenario 5b asserts the develop-bug Part B wording and the develop-story/develop-task wording separately; a new case asserts the position line at 8 does not claim Step 7 complete; a step-3 case keeps the generic position
✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: the `--complete` population scan includes the hook script
✅ `shared/resources/advance-pipeline-lock.test.sh`: the scenario 4b `PATH` fixture
✅ `shared/resources/develop-pipeline-hooks.md`: the trigger-condition paragraph, only if its description of the step-8 reason is no longer accurate (a probe decides)
✅ Bundled `references/` copies regenerated; a CHANGELOG `[Unreleased]` entry citing (task 162)

### Out of Scope

❌ The resume contract's step-8 rule, the Step 8 checklist and the lock lifecycle. task.161 settled these.
❌ develop-bug's Step 7 procedure itself (`develop-bug-step-7-close-bug.md`). This task only makes the hook describe it correctly.
❌ Task.160's CR6-1 and CR6-2 advisories (the Phase 2 Commit field and the before-commit test). They remain separate.

---

## 5. Breaking Changes

None to any interface. At `current_step` 8 the Stop hook's reason text changes: the Step 7-tail wording for develop-bug, and the status-block position for all three orchestrators. The reason is a prompt to the orchestrator, not a parsed contract. Nothing reads its text except `develop-pipeline-on-stop.test.sh`, which this task updates.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.162.plan.stop-hook-step-8-reason-fits-every-orchestrator.md](task.162.plan.stop-hook-step-8-reason-fits-every-orchestrator.md)

### Phase 1: The step-8 reason fits every orchestrator

**Risk**: Low. The change is message text inside one `case`, pinned by tests.

**Files**: `shared/resources/develop-pipeline-on-stop.sh`, `shared/resources/develop-pipeline-on-stop.test.sh`

- [x] At `NEXT=8`, choose the Step 7-tail parenthetical by `SKILL`. develop-bug names Part B (Resolution Summary, status `closed`, parent/registry linkage, tracker-close verification) and cites `develop-bug-step-7-close-bug.md`. develop-story/develop-task keep the DoD body, tracker update and Step 7 checklist.
- [x] At `NEXT=8`, make the status-block position step-aware: it names Step 8 as pending and Step 7 as unverified, and never "Step 7/8 ✅ complete". Other steps keep `Step $((NEXT - 1))/8 ✅ complete`.
- [x] Delete "(or `--complete` if that was Step 8)" from the generic `COMPLETION_LINE`.
- [x] Test 5b: split the assertions by skill. develop-bug requires the Part B wording and forbids the DoD-body wording. develop-story and develop-task require the DoD-body wording.
- [x] New case: at lock 8 the reason does not contain "Step 7/8 ✅ complete" for any orchestrator. The existing step-3 case (5c) gains an assertion that the position reads "Step 2/8 ✅ complete".

### Phase 2: Guards and fixture

**Risk**: Low.

**Files**: `shared/resources/tests/step-8-completion-checklist.test.mjs`, `shared/resources/advance-pipeline-lock.test.sh`

- [x] Widen the "every orchestrator mention of `--complete` names the Step 8 Completion Checklist" test to also scan `shared/resources/develop-pipeline-on-stop.sh`. Record the widened population in the test comment. It must be red on the pre-Phase-1 hook (the generic clause) and green after.
- [x] Reword the hook's shell comments that name `--complete` without "Completion Checklist" on the same line, so the scan needs no comment exemption. On `develop` these are lines 82, 237, 239 (a quotation of the deleted generic clause) and 257 (the phrase wraps to 258). Without this the widened test stays red after Phase 1 (review.1, check 10).
- [x] Scenario 4b: link only `rm` and `dirname`; skip any name whose `command -v` is not an absolute path. The two assertions and the corrupt-lock case stay as they are.

### Phase 3: Proof and gates

**Risk**: Low.

- [x] Probe (qa-fix Step 3.5): find every executed document that restates the Stop hook's step-8 reason or its status-block position; update `develop-pipeline-hooks.md` only if it is now inaccurate.
- [x] Mutation-prove under bash, with `cp` snapshots of a real `FILES` array and restore checked by `cmp`. Four mutations:
  - restore the shared (skill-blind) Step 7-tail text → 5b's develop-bug case red;
  - restore `Step $((NEXT - 1))/8 ✅ complete` at 8 → the new position case red;
  - restore the generic `--complete` clause → the widened population test red;
  - re-add `printf` to the 4b link list → the absolute-path skip must keep 4b green (a mutation the fixture absorbs by design, recorded as such).
- [x] `npm run bundle`, then `npm run ci:fast` with `.agents/skills` moved aside, `npm run lint:shell` and `npm run bundle:check`. CHANGELOG `[Unreleased]` entry citing (task 162).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-on-stop.sh`: the skill-aware Step 7 tail at 8, the step-aware position at 8, and the generic clause deleted

### Files to Modify (Tests)

2. ✅ `shared/resources/develop-pipeline-on-stop.test.sh`: 5b split by skill; a position-at-8 case
3. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: the `--complete` population scan includes the hook script
4. ✅ `shared/resources/advance-pipeline-lock.test.sh`: the 4b `PATH` fixture

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`: `[Unreleased]` entry
6. ✅ `shared/resources/develop-pipeline-hooks.md`: only if the Phase 3 probe finds its step-8 description inaccurate
7. ✅ Bundled `references/` copies, regenerated by `npm run bundle` (never edited by hand)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the Stop hook's reason at `current_step` 8 for each of develop-story, develop-task and develop-bug, and at step 3 (generic)
- **Command**: `bash shared/resources/develop-pipeline-on-stop.test.sh`
- **Target**: the develop-bug case names Part B and not the DoD body; the story and task cases name the DoD body; no case at 8 renders "Step 7/8 ✅ complete"

### Integration Tests

- **Scope**: the `--complete` population across the orchestrator Markdown and the hook script
- **Command**: `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`

### Contract Tests

- The widened population test is the contract: no orchestrator-facing line tells the orchestrator to run `--complete` except as the Completion Checklist's own last action

### Performance Tests

Not applicable. The change is message text and test fixtures.

### Consumer Tests

- `bash shared/resources/advance-pipeline-lock.test.sh` passes with the tightened 4b fixture
- `develop-pipeline-on-precompact.test.sh` is unaffected (it does not read the Stop hook's reason)

---

## 9. Success Criteria

### Functional

- [x] At `current_step` 8 with `skill: develop-bug`, the Stop hook's reason names the bug-close routine (Resolution Summary, status `closed`, parent/registry linkage) and does not name "the DoD body to the PR" (Phase 1)
- [x] At `current_step` 8 with `skill: develop-story` or `develop-task`, the reason names the DoD body, the tracker update and the Step 7 checklist (Phase 1)
- [x] At `current_step` 8, no orchestrator's reason contains "Step 7/8 ✅ complete"; at step 3 the position still reads "Step 2/8 ✅ complete" (Phase 1)
- [x] No line of `develop-pipeline-on-stop.sh` mentions `--complete` without naming the Completion Checklist (Phase 2 population test)

### Performance

- [x] No measurable change: the change is text selection inside an existing `case`

### Code Quality

- [x] `npm run ci:fast` passes with `.agents/skills` moved aside; `lint:shell` and `bundle:check` pass
- [x] Each Phase 3 mutation behaves as stated under bash, with restore checked by `cmp`

### Migration

- [x] CHANGELOG `[Unreleased]` entry cites (task 162)
- [x] `develop-pipeline-hooks.md` agrees with the hook's step-8 reason (Phase 3 probe recorded)

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

None identified.

### Low Risk Areas

1. **A new wording that breaks a test pinned to the old one.**
   - **Risk**: `develop-pipeline-on-stop.test.sh` 5b and 5c pin phrases from task.161's wording, and a reword could fail them for the wrong reason.
   - **Mitigation**: update 5b and 5c in the same phase, keep the rule-stating sentence intact, and run the file after each edit.
2. **The status-block position loses information a reader needs.**
   - **Risk**: an orchestrator uses the position to emit its Remaining Work Status block.
   - **Mitigation**: the step-8 position still names the step (8/8) and says what is unverified. It is chosen against the banner doc's existing position forms.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: at any step the Stop hook emits a malformed reason (JSON invalid, or an empty `REASON`), or `develop-pipeline-on-stop.test.sh` fails on `develop`
- **Steps**: revert the task's merge commit on `develop`, run `npm run bundle`, then `npm run ci:fast`
- **Validation**: `bash shared/resources/develop-pipeline-on-stop.test.sh` passes on the reverted tree

### Partial Rollback (1-2 hours)

- **When**: the Phase 2 population widening flags a legitimate line that cannot be reworded
- **Steps**: keep Phase 1, and narrow the scan back to `.md` with the reason recorded in the test comment

### Forward Fix (< 4 hours)

- **When**: a wording is inaccurate but the reason is well-formed
- **Approach**: reword and update the pinning test; no revert needed

### Rollback Triggers

- **Critical**: a malformed or empty Stop-hook reason at any step
- **Non-critical**: wording nuance (fix forward)

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-27
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.162.qa.1.stop-hook-step-8-reason-fits-every-orchestrator.md](./task.162.qa.1.stop-hook-step-8-reason-fits-every-orchestrator.md)
- **Gate File**: [task.162.gate.1.stop-hook-step-8-reason-fits-every-orchestrator.yml](./task.162.gate.1.stop-hook-step-8-reason-fits-every-orchestrator.yml)

### Test Coverage Summary
- **Tests Executed**: 226 (43 hook scenarios, 95 lock scenarios, 88 checklist tests)
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Three LOW advisories (CR-1, CR-2, QA-L1) recorded as future recommendations in the gate.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-27 | 1.0     | Initial draft | create-task |
| 2026-09-27 | 1.1     | Review passed (9/10) — Phase 2 names the hook's four `--complete` comment lines to reword; 5c gains the Step 2/8 position assertion | review-task |
| 2026-09-27 |         | Status → ready-for-development | review-task |
| 2026-09-27 |         | Implemented — 8 source files (hook, 3 tests, resume contract, CHANGELOG), 6 new test assertions; bundled copies regenerated | develop |
| 2026-09-27 |         | QA gate PASS (100/100) — 0 blocking findings, 3 LOW advisories | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The step-8 reason fits every orchestrator
- [x] Skill-aware Step 7 tail at 8
- [x] Step-aware status position at 8
- [x] Generic `--complete` clause deleted
- [x] 5b split by skill; position case

### Phase 2: Guards and fixture
- [x] `--complete` population scan covers the hook script
- [x] 4b `PATH` fixture tightened

### Phase 3: Proof and gates
- [x] Probe recorded; hooks doc updated if needed
- [x] Mutation proofs
- [x] Gates and CHANGELOG

---

## References

- **Source**: task.161 (`docs/tasks/task.161.step-8-resume-record-survives-commit/`):
  - `gate.3` `recommendations.future`: CR-2 (develop-bug wording), CR-1 (pre-existing status line), CR-3 (no-jq PATH);
  - `pr-review.1` CR-1 (develop-bug wording) and CR-2 (the unreachable `--complete` clause).
- **develop-bug Step 7**: `skills/develop-bug/references/develop-bug-step-7-close-bug.md` (Part A / Part B)
- **Related**: `shared/resources/develop-pipeline-hooks.md`, `shared/resources/develop-pipeline-remaining-work-banner.md`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, then run `npm run bundle`. Never edit the `skills/*/references/` copies.
- The hook's step-8 line must keep stating the resume contract's rule, not a finer one of its own (task.161 QA cycle 2).
- Run mutation proofs under `bash` with a real array.

### Future Improvements

- task.160 CR6-1 and CR6-2 (separate advisories)

---

**Status:** Ready for Review

**Next Steps**:
1. (done) `/develop-task docs/tasks/task.162.stop-hook-step-8-reason-fits-every-orchestrator/task.162.stop-hook-step-8-reason-fits-every-orchestrator.md`
2. QA artifacts will be co-located: `task.162.qa.{N}.*.md`, `task.162.gate.{N}.*.yml`, `task.162.bug.{N}.*.md`
