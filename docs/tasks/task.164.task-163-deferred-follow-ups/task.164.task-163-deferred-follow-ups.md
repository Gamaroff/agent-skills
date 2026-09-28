---
id: task.164
title: "[Task 164] Close task.163's deferred follow-ups"
type: task
description: "Close the five items task.163 deferred: stop the banner doc restating the Stop hook's lock-8 wording, make the banner test compare what the hook renders, give the --complete hook floor a non-comment count, name the halting step in a HALT status block, and commit a meta-test for scenario 4b's empty command -v arm."
tags: [develop-pipeline, stop-hook, remaining-work-banner, step-8, follow-up]
category: infrastructure
status: ready-for-review
priority: Low
created: 2026-09-28
updated: 2026-09-28
assignee:
estimated_effort_hours: 4
github_issue: 507
---

# Technical Task: Close task.163's deferred follow-ups

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.164.review.1.task-163-deferred-follow-ups.md` implemented 2026-09-28

**GitHub Issue**: [#507](https://github.com/Gamaroff/agent-skills/issues/507)

---

## 1. Overview

Task.163 (PR #506, merged `f73f3cc5`) was accepted with five items deferred. They are recorded in `task.163.gate.3` `recommendations.future`, in `task.163.pr-review.1`, and in the task's Deferred Work. None blocked the merge. This task closes all five.

Two of them are wording and test weaknesses in the banner-doc exception that task.163 added. One is a floor that can pass on comments. One is a pre-existing HALT-rendering gap that task.163's QA found by provenance. One turns dev-only coverage into a committed test.

**Scope**:
- The "One exception: a Stop-hook re-prompt" clause of `shared/resources/develop-pipeline-remaining-work-banner.md`, and the HALT rows of the same file's position table.
- The banner test and the `--complete` population test in `shared/resources/tests/step-8-completion-checklist.test.mjs`.
- Scenario 4b's command loop in `shared/resources/advance-pipeline-lock.test.sh`, plus a new meta-test that drives it.

**Key deliverables**:

1. The banner doc's re-prompt exception defers to the Stop hook's reason without restating its lock-8 wording, and it says to resolve the reason's list into one `- Step N:` line per step.
2. The banner test checks what the doc defers to against what the hook actually renders, not against hard-coded phrases.
3. The `--complete` population test requires at least two **non-comment** `--complete` lines in the hook.
4. A HALT status block names the step that halted, not the step `current_step` names. A HALT during Step 7's tail at lock 8 therefore reads `Step 7/8 … ❌ halted`.
5. A committed test fails when scenario 4b's empty-`command -v` arm stops failing setup, and when its builtin arm stops being skipped.

---

## 2. Motivation

### Current Problems

1. **The banner exception restates the hook's wording and has already drifted from it (gate.3 CR-2).** The clause says the lock-8 list "starts at the first unfinished row at or below Step 7". The hook's `STEPS_AHEAD` reads "…at or below Step 7, if any, then Step 8". The doc omits both "if any" and "then Step 8", so it does not cover a re-prompt where rows 1–7 are all finished. The clause exists to defer to the hook, and restating the hook is what let the two copies disagree.
2. **The banner test compares literals, not the rendered reason (gate.3 CR-3).** `the banner doc defers to the Stop hook's lock-8 position and list, at a re-prompt only` checks the hook's output and the doc against separate hard-coded phrases. It never checks one against the other, so wording the two copies do not share can drift. The doc also does not say to turn the reason's rule sentence into `- Step N:` lines, although the banner Format section expects one step per line.
3. **The hook floor passes on comments (pr-review.1 CR-1).** `(perSkill[STOP_HOOK] || 0) >= 1` counts every hook line that mentions `--complete`, and three of the five are `#` comments. If `COMPLETION_LINE` and `ALREADY_DONE` both stopped naming `--complete`, the floor would still pass. Its failure message claims to pin "the step-8 COMPLETION_LINE".
4. **A HALT in Step 7's tail is reported as a Step 8 HALT (gate.3 future, pre-existing).** `/finalise` moves the lock to 8 as its last action, before the orchestrator runs Step 7's tail. A HALT raised there (for example step-7 doc's `HALT: $DOD_FILE is not tracked`) derives its position from `current_step`, so it renders `Step 8/8 — COMMIT CHANGES ❌ halted`. The HALT row exists "so the user sees what did not run", and here it names the wrong step. The behaviour is identical on `origin/develop` before task.163, so task.163 did not introduce it.
5. **Scenario 4b's empty arm is dev-only coverage (task.163 SC5).** The empty-`command -v` arm and the builtin arm were proven only by development mutations (task.163 M5/M6). The loop's command list is literal, so no committed test can reach either arm.

### Benefits

1. The banner doc has one statement of the lock-8 wording, the hook's, so it can no longer drift from it.
2. The banner test fails on real drift between the doc and the hook, not only on the loss of a phrase.
3. The hook floor measures the two instructions it claims to measure.
4. A HALT block reports the step that actually halted.
5. Every task.163 guard is proven by a committed test.

---

## 3. Technical Background

### Current Architecture

- `develop-pipeline-remaining-work-banner.md` is the format authority for the Remaining Work Status block. Its "Cheap to produce" rule says to derive the position and steps-ahead list from `current_step`. Task.163 added "**One exception: a Stop-hook re-prompt.**", which restates the hook's lock-8 position ("Step 8 pending with Step 7 unverified") and a shortened list. Its position table's HALT row reads `Step {N}/8 — {STEP-NAME} ❌ halted`, and N comes from the same `current_step` rule.
- `develop-pipeline-on-stop.sh` binds `POSITION` and `STEPS_AHEAD` by `NEXT` and interpolates both into the `REASON` heredoc. This task does not change the hook.
- `step-8-completion-checklist.test.mjs` defines `stopHookReasonAt8(skill)` (spawns the hook against a fixture lock). It also holds the banner test, which requires four fixed phrases in the doc's exception, and the `--complete` population test, which has a `perSkill[STOP_HOOK] >= 1` floor.
- `advance-pipeline-lock.test.sh` scenario 4b loops `for c in rm dirname` with a three-arm `case`: empty → `fail "4b setup: …"`, absolute → link, bare name → skip. `NOJQ_SETUP_OK` gates the two no-jq assertions. The file exits 1 when any assertion fails, and runs in about 7s.
- The HALT snapshot records an orchestrator-supplied `halt_step` (develop-{story,task,bug} `SKILL.md`, the HALT `jq` block). The resume contract reads a snapshot at `halt_step` 8 as "a record at step 8".

### Target Architecture

- The banner exception keeps its scope sentence: a Stop-hook re-prompt only, with the ordinary Step 7 → 8 transition and every other firing point following the rule. It tells the orchestrator to emit the position the reason gives and to resolve the reason's steps-ahead instruction into one `- Step N:` line per remaining step. It states no lock-8 wording of its own, apart from pointing at the hook's `POSITION` and `STEPS_AHEAD` bindings by name.
- The banner test renders the hook at lock 8 and asserts four things. The doc's exception is scoped to a Stop-hook re-prompt, keeps the ordinary-transition carve-out, and says to resolve the list into `- Step N:` lines. The doc carries none of the distinctive fragments of the hook's rendered position or list (for example `Step 7 unverified`, `first unfinished row`), derived from the rendered reason rather than typed as literals, so there is no second copy to drift. A whole-string check would pass on task.163's paraphrase. The hook's lock-8 reason still carries both. The test's name says what it checks.
- The population test's floor counts only hook lines that mention `--complete` and are not `#` comments, and requires at least 2 (`COMPLETION_LINE`, `ALREADY_DONE`). The message names both.
- The banner doc's HALT row and derivation rule say that a HALT names **the step being executed when it halted**, not `current_step`, and the steps-ahead list then starts at that step. The rule states the Step 7-tail case explicitly: lock 8, halting step 7. A pinning test holds it.
- Scenario 4b's command list comes from an array seeded by an override variable when set (a test-only seam), else `rm dirname`. The builtin arm prints a visible `SKIP  4b: '<name>' is a builtin, not linked` line, so skipping is observable from outside the file. Without that line nothing outside the file can see the arm: linking a builtin creates a dangling self-link that no no-jq command uses, so the file stays green either way (probed at review: 95 passed, 0 failed with the arm mutated to link). A new `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs` runs the lock test file three times:
  - With a missing command, it expects exit 1, the `4b setup: '<name>' not found on PATH` line, and no "without jq" assertion line.
  - With `printf` added, it expects exit 0, the `SKIP  4b: 'printf' is a builtin, not linked` line, and no `4b setup:` line.
  - With the override removed from the environment, it expects exit 0 and both "without jq" `PASS` lines. This proves an unset override gives `rm dirname` (Risk 3).

### Important Clarifications

- **The Stop hook does not change.** Its reason is the one statement of the lock-8 position and list. This task only stops the banner doc restating it.
- **`halt_step` semantics are out of scope.** Item 4 changes what the HALT **status block** prints, not what the halt snapshot records or how the resume contract reads it. Whether a Step 7-tail HALT should snapshot `halt_step: 7` is a resume-contract question with its own risks. It is named under Out of Scope, not decided here.
- **Item 5's seam is test-only.** The override variable is read only by `advance-pipeline-lock.test.sh` and exists only so a committed test can reach 4b's other arms. It changes no production script.

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-remaining-work-banner.md`: the re-prompt exception defers without restating, and the HALT row and derivation rule name the halting step
✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: banner test compares doc and rendered hook; non-comment hook floor ≥ 2; HALT-step pin
✅ `shared/resources/advance-pipeline-lock.test.sh`: scenario 4b's command list via a test-only override
✅ `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs` (new): drives 4b's empty and builtin arms
✅ Bundled `references/` copies regenerated; a CHANGELOG `[Unreleased]` entry citing (task 164)

### Out of Scope

❌ The Stop hook's `POSITION`, `STEPS_AHEAD` and `COMPLETION_LINE` text (task.163 settled them)
❌ `halt_step` in the halt snapshot and the resume contract's reading of it (a separate resume-contract decision)
❌ Observation #205 (`qa-read-back` presence check), which belongs to qa-task, not this surface

---

## 5. Breaking Changes

None to any interface. The banner doc's HALT rule changes the position line an orchestrator prints on one HALT path, a Step 7-tail HALT at lock 8. The block is printed output, not a parsed contract.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.164.plan.task-163-deferred-follow-ups.md](task.164.plan.task-163-deferred-follow-ups.md)

### Phase 1: The banner doc defers and names the halting step

**Risk**: Low. Prose in one shared resource, pinned by tests in Phase 2.

**Files**: `shared/resources/develop-pipeline-remaining-work-banner.md`

- [x] Rewrite the "One exception: a Stop-hook re-prompt" clause. Keep the scope and the ordinary-transition carve-out. Emit the position the reason gives, and resolve the reason's steps-ahead instruction into one `- Step N:` line per remaining step. State no lock-8 wording of its own; name the hook's `POSITION` / `STEPS_AHEAD` bindings as its source.
- [x] State in the derivation rule and the HALT row that a HALT names the step being executed when it halted, and lists steps ahead from that step. Name the Step 7-tail case (lock 8, halting step 7).

### Phase 2: The tests compare what they claim to compare

**Risk**: Low.

**Files**: `shared/resources/tests/step-8-completion-checklist.test.mjs`

- [x] Banner test: keep the scope, carve-out and `- Step N:` checks. Replace the lock-8 phrase checks with an assertion that the doc carries none of the distinctive fragments of the hook's rendered position or list, derived from the rendered reason. Keep the assertion that the hook's lock-8 reason carries both. Rename the test to what it checks.
- [x] Population test: count hook `--complete` lines that are not `#` comments, and require at least 2, with a message naming `COMPLETION_LINE` and `ALREADY_DONE`.
- [x] New pin: the banner doc's HALT rule names the halting step, and states the Step 7-tail at lock 8 case.

### Phase 3: Scenario 4b's arms are reachable from a committed test

**Risk**: Low.

**Files**: `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs` (new)

- [x] Seed 4b's command list from a test-only override variable when set, else `rm dirname`, as an array. Keep the empty and absolute arms unchanged. Make the builtin arm print `SKIP  4b: '<name>' is a builtin, not linked`. Update the comment.
- [x] New test, missing command: override with a nonexistent name. Expect exit 1, the `4b setup: '<name>' not found on PATH` line, and no `without jq` assertion line.
- [x] New test, builtin: override with `rm dirname printf`. Expect exit 0, the `SKIP  4b: 'printf' is a builtin, not linked` line, and no `4b setup:` line.
- [x] New test, unset override: remove the variable from the child's environment. Expect exit 0 and both `without jq` `PASS` lines.

### Phase 4: Proof and gates

**Risk**: Low.

- [x] Mutation-prove under bash, with `cp` snapshots and `cmp`-checked restore:
  - restore the lock-8 restatement in the banner exception → banner test red;
  - drop the `- Step N:` instruction → banner test red;
  - make one of `COMPLETION_LINE` / `ALREADY_DONE` stop naming `--complete` → population floor red (the old ≥ 1 floor stays green: record that too);
  - revert the HALT rule to `current_step` → HALT pin red;
  - make 4b's empty arm stop failing (e.g. treat `""` as skip) → new missing-command test red;
  - make 4b link a bare name → new builtin test red.
- [x] `npm run bundle`, then `npm run ci:fast` with `.agents/skills` moved aside, `npm run lint:shell`, `npm run bundle:check`. CHANGELOG `[Unreleased]` entry citing (task 164).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-remaining-work-banner.md`: the re-prompt exception defers without restating; the HALT rule names the halting step

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: banner test compares against the rendered hook; non-comment floor ≥ 2; HALT-step pin
3. ✅ `shared/resources/advance-pipeline-lock.test.sh`: 4b command list via a test-only override
4. ✅ `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs` (new): 4b empty and builtin arms

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`: `[Unreleased]` entry
6. ✅ Bundled `references/` copies of the banner doc, regenerated by `npm run bundle` (never edited by hand)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the banner doc's re-prompt exception and HALT rule; the hook floor
- **Command**: `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`
- **Target**: the banner test fails when the doc restates the hook or drops the `- Step N:` instruction. The floor fails when either non-comment `--complete` line goes. The HALT pin fails when the rule reverts to `current_step`.

### Integration Tests

- **Scope**: scenario 4b end to end, through the lock test file itself
- **Command**: `node --test shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`
- **Target**: missing command → exit 1 with the named setup line; builtin → exit 0 with the skip line and no setup line; unset override → exit 0 with both no-jq `PASS` lines

### Contract Tests

- The banner test is a contract between the banner doc and the Stop hook. The doc defers, the hook states, and neither restates the other.

### Performance Tests

Not applicable. The new 4b test runs the lock test file three times (13–16s each, measured with `time node --test` on the new file; the plan's 7s estimate was low).

### Consumer Tests

- `bash shared/resources/advance-pipeline-lock.test.sh` still passes unmodified (95 assertions) with no override set
- `bash shared/resources/develop-pipeline-on-stop.test.sh` is unaffected

---

## 9. Success Criteria

### Functional

- [x] The banner doc's re-prompt exception carries neither the hook's rendered lock-8 position nor its list text, and a test goes red if either returns (Phases 1–2)
- [x] The exception tells the orchestrator to resolve the reason's list into `- Step N:` lines, pinned by a test (Phases 1–2)
- [x] The `--complete` population test fails when the hook has fewer than 2 non-comment `--complete` lines (Phase 2)
- [x] The banner doc's HALT rule names the halting step, with the Step 7-tail at lock 8 case stated, pinned by a test (Phases 1–2)
- [x] With a missing command in 4b's list, `advance-pipeline-lock.test.sh` exits 1 and prints `4b setup: '<name>' not found on PATH`, and a committed test asserts it (Phase 3)
- [x] With a builtin in 4b's list, the file exits 0 and prints `SKIP  4b: '<name>' is a builtin, not linked`, and a committed test asserts it; the test goes red when the arm links the builtin instead (Phases 3–4)

### Performance

- [x] No measurable change beyond the new 4b test's three runs of the lock test file

### Code Quality

- [x] `npm run ci:fast` passes with `.agents/skills` moved aside; `lint:shell` and `bundle:check` pass
- [x] Each Phase 4 mutation behaves as stated under bash, with restore checked by `cmp`

### Migration

- [x] CHANGELOG `[Unreleased]` entry cites (task 164)

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

None identified.

### Low Risk Areas

1. **A "does not carry" assertion that passes on a reworded copy.**
   - **Risk**: the banner doc restates the hook in different words, and an assertion checking for the hook's exact rendered text still passes.
   - **Mitigation**: derive the forbidden fragments from the rendered reason (the position's parenthetical and the list's first words), not from the whole rendered strings. The doc paraphrases the hook, so `!includes(wholeString)` passes on task.163's current text. Also assert the exception names `POSITION` / `STEPS_AHEAD`. The Phase 4 mutation restores the task.163 restatement verbatim, and it must go red.
2. **The HALT rule meets the resume contract's `halt_step`.**
   - **Risk**: an orchestrator reads "a HALT names the halting step" as licence to record `halt_step: 7` for a Step 7-tail HALT, which changes resume behaviour.
   - **Mitigation**: the rule is scoped to the printed block and says so; `halt_step` is named Out of Scope.
3. **The 4b test seam leaks into normal runs.**
   - **Risk**: an override set in a developer's environment silently changes 4b.
   - **Mitigation**: give the variable a test-specific name, read it only in `advance-pipeline-lock.test.sh`, and assert that an unset override gives `rm dirname` (the new test's third case removes the variable from the child's environment, so a value in the developer's shell cannot leak into it).

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: `advance-pipeline-lock.test.sh` or `step-8-completion-checklist.test.mjs` fails on `develop`; the new 4b test is flaky under CI load
- **Steps**: revert the task's merge commit on `develop`, run `npm run bundle`, then `npm run ci:fast`
- **Validation**: both suites pass on the reverted tree

### Partial Rollback (1-2 hours)

- **When**: the 4b meta-test is flaky (timing or environment)
- **Steps**: keep Phases 1–2; remove the new test file and the override seam, and record 4b's arms as dev-only coverage again

### Forward Fix (< 4 hours)

- **When**: a banner-doc wording is inaccurate but the tests are sound
- **Approach**: reword, and keep the pins

### Rollback Triggers

- **Critical**: a red suite on `develop`
- **Non-critical**: wording nuance (fix forward)

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-28
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.164.qa.3.task-163-deferred-follow-ups.md](./task.164.qa.3.task-163-deferred-follow-ups.md)
- **Gate File**: [task.164.gate.3.task-163-deferred-follow-ups.yml](./task.164.gate.3.task-163-deferred-follow-ups.yml)
- **Earlier cycles**: [qa.1](./task.164.qa.1.task-163-deferred-follow-ups.md) / [gate.1](./task.164.gate.1.task-163-deferred-follow-ups.yml), [qa.2](./task.164.qa.2.task-163-deferred-follow-ups.md) / [gate.2](./task.164.gate.2.task-163-deferred-follow-ups.yml)

### Test Coverage Summary

- **Tests Executed**: 97 (step-8 checklist 91, 4b meta-test 3, cycle-2 fix mutations G1–G3 re-run)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Cycle 2's five findings are fixed and proven. Four LOW remain: the mapping refusal is backtick-only (QA-164-10), the mapping citation overstates (QA-164-11), the mapping regex's anchor (QA-164-12), and grammar plus a Steps 5–6 HALT (QA-164-13). One reviewer MEDIUM was rejected with evidence: the ordinary list starts at `current_step`, so the Step 3 loop-continue block at lock 4 lists create-pr correctly.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-28 | 1.0     | Initial draft | create-task |
| 2026-09-28 | 1.1     | Review passed (8/10) — 4b builtin arm made observable (SKIP line), unset-override test added, banner regex anchor named | review-task |
| 2026-09-28 |         | Status → ready-for-development | review-task |
| 2026-09-28 |         | Implemented — 5 files (1 new test file), 5 tests added or rewritten; 6 mutations proven | develop-task |
| 2026-09-28 |         | Status → ready-for-review | develop-task |
| 2026-09-28 |         | QA gate CONCERNS (90/100) — 4 findings (1 medium, 3 low) | qa-task |
| 2026-09-28 |         | QA findings fixed — gate 1 CONCERNS: 4 of 4 (banner exceptions counted, HALT example per pipeline, whole-doc restatement check, spawn timeout reported), 1 iteration | qa-fix |
| 2026-09-28 |         | QA gate CONCERNS (90/100) — 5 findings (1 medium, 4 low) | qa-task |
| 2026-09-28 |         | QA findings fixed — gate 2 CONCERNS: 5 of 5 (HALT rule cites the --skill mapping instead of listing it, halted step listed first, CHANGELOG example, 4b messages, seam NOTE line), 1 iteration | qa-fix |
| 2026-09-28 |         | QA gate PASS (100/100) — 4 low findings carried to recommendations.future (route 2b), 1 reviewer finding rejected | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The banner doc defers and names the halting step
- [x] Re-prompt exception defers without restating
- [x] HALT rule names the halting step

### Phase 2: The tests compare what they claim to compare
- [x] Banner test against the rendered hook
- [x] Non-comment hook floor ≥ 2
- [x] HALT-step pin

### Phase 3: Scenario 4b's arms are reachable from a committed test
- [x] Test-only override seam
- [x] Missing-command and builtin tests

### Phase 4: Proof and gates
- [x] Mutation proofs
- [x] Gates and CHANGELOG

---

## References

- **Source**: task.163 (`docs/tasks/task.163.stop-hook-step-8-follow-ups/`):
  - `gate.3` `recommendations.future`: CR-2 (banner restates the hook), CR-3 (banner test compares literals), the pre-existing Step 7-tail HALT rendering, SC5 dev-only coverage;
  - `pr-review.1` CR-1 (hook floor passes on comments);
  - the task document's Deferred Work.
- **Related**: `shared/resources/develop-pipeline-on-stop.sh` (`POSITION`, `STEPS_AHEAD`), `shared/resources/develop-pipeline-step-7-finalise.md` (Step 7-tail HALTs), `shared/resources/develop-pipeline-resume-contract.md` (`halt_step`)

---

## Notes

### Deferred Work

The QA loop left through the cosmetic-residue exit (route 2b, cycle 3). Four LOW findings are carried to `task.164.gate.3` `recommendations.future`:

- **QA-164-10**: the HALT pin refuses `--skill` mapping names only when backtick-wrapped; refuse plain-prose mentions too.
- **QA-164-11**: the banner doc says the mapping states "which sub-skills advance" the lock; it states where each would move it (`review-task` is mapped but never self-advances).
- **QA-164-12**: the test's mapping regex anchors on the first `--skill)` arm; anchor it on the mapping's own `case`.
- **QA-164-13**: "not at `current_step`" is ungrammatical, and a HALT inside the Steps 5–6 loop has no stated `N`.

Two more follow-ups, not from this task's change: the 4b meta-test re-runs the whole lock test file three times (about 45s in `npm test`); and `advance-pipeline-lock.sh` maps `review-task` → 3 though `review-task` never self-advances.

### Important Reminders

- Edit `shared/resources/` sources, then run `npm run bundle`. Never edit the `skills/*/references/` copies.
- The Stop hook's text is not changed by this task; it is the one statement the banner doc defers to.
- Write patch scripts to files, not inline `node -e` (apostrophes in the prose break shell quoting).

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.164.task-163-deferred-follow-ups/task.164.task-163-deferred-follow-ups.md`
2. QA artifacts will be co-located: `task.164.qa.{N}.*.md`, `task.164.gate.{N}.*.yml`, `task.164.bug.{N}.*.md`
