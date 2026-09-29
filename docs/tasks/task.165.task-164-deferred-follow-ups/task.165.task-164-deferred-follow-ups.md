---
id: task.165
title: "[Task 165] Close task.164's deferred follow-ups"
type: task
description: "Close the eight LOW items task.164 carried: tighten the banner doc's Exception 2 wording (mapping citation, Step {N+1} contrast, grammar, Steps 5–6 HALT), make the HALT pin and hook floor match what they claim, cut the 4b meta-test's cost, give review-task the lock-cooperation block its --skill mapping assumes, and gate both review skills' advance on a passing review."
tags: [develop-pipeline, remaining-work-banner, stop-hook, advance-pipeline-lock, review-task, follow-up]
category: infrastructure
status: planned
priority: Low
created: 2026-09-28
updated: 2026-09-28
assignee:
estimated_effort_hours: 8
github_issue: 509
---

# Technical Task: Close task.164's deferred follow-ups

**Status:** Planned

**GitHub Issue**: [#509](https://github.com/Gamaroff/agent-skills/issues/509)

---

## 1. Overview

Task.164 (PR #508) was accepted with eight LOW items carried forward. Four are in `task.164.gate.3` `recommendations.future` (QA-164-10..13). Two are from `task.164.pr-review.1` (CR-1, CR-2). Two more are named in the task's Deferred Work: the 4b meta-test's runtime, and `review-task`'s missing lock cooperation. None blocked acceptance. This task closes all eight.

Six items are wording or guard-reach gaps in what task.164 shipped. The seventh is test cost. The eighth is a pre-existing mismatch between `advance-pipeline-lock.sh`'s `--skill` mapping and the skills that actually self-advance.

**Scope**:
- Exception 2 of `shared/resources/develop-pipeline-remaining-work-banner.md`
- The HALT pin and the hook `--complete` floor in `shared/resources/tests/step-8-completion-checklist.test.mjs`
- Scenario 4b's early exit in `shared/resources/advance-pipeline-lock.test.sh`, and `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`
- `skills/review-task/SKILL.md` § Pipeline Lock Cooperation (new), and `skills/review-story/SKILL.md` § Pipeline Lock Cooperation (gated)

**Key deliverables**:

1. Exception 2 cites the `--skill` mapping as *where a sub-skill that advances the lock moves it*, contrasts only with blocks derived from `current_step`, reads grammatically, and says what a HALT inside the Steps 5–6 loop lists first.
2. The HALT pin refuses a relisting of the mapping in plain prose as well as in backticks, and reads the mapping from its own `case`, not from the first `--skill)` arm in the script.
3. The hook floor checks the `COMPLETION_LINE=` and `ALREADY_DONE=` bindings by name.
4. The 4b meta-test no longer re-runs the whole lock test file three times.
5. `review-task` advances the lock as its last action, so the mapping `review-story|review-task → 3` is true for both skills. Both review skills advance only on a passing review, so a lock never reaches 3 on a review the orchestrator is about to HALT on.

---

## 2. Motivation

### Current Problems

1. **The mapping citation overstates (QA-164-11).** Exception 2 says the `--skill` mapping states "which sub-skills advance" the lock. The mapping says where each skill *would* move it. `review-task → 3` is mapped, but `skills/review-task/SKILL.md` never calls `--skill review-task`. `create-branch → 2` cannot fire inside a pipeline, because Step 1 writes the lock after `/create-branch` returns.
2. **Exception 2's contrast covers Exception 1 (PR review CR-1).** "…where every other block starts at `Step {N+1}`" includes the Stop-hook re-prompt block. At lock 8 that block's list starts at the first unfinished row at or below Step 7, not at Step 9.
3. **Grammar, and an unstated case (QA-164-13).** "the step being executed when it halted, not at `current_step`" is ungrammatical, and the HALT pin pins the phrase. The rule gives no `N` for a HALT inside the Steps 5–6 loop, whose position line is `Steps 5–6/8 — QA LOOP`.
4. **The HALT pin can be evaded by formatting (QA-164-10).** It refuses a mapped skill name only when it is wrapped in backticks. "/develop (→ 4) and /create-pr (→ 5)" in plain prose would pass, and that relisting is exactly the regression the pin exists for (QA-164-5).
5. **The pin's mapping regex reads the wrong span (QA-164-12).** `/\n {2}--skill\)\n([\s\S]*?)\n {4}esac/` matches the first `  --skill)` arm in `advance-pipeline-lock.sh` (the commit-changes early exit) and spans about 266 lines to the mapping's `esac`. The floor catches a zero parse, but its message would then misname the cause.
6. **The hook floor counts lines, not bindings (PR review CR-2).** It counts non-comment hook lines that mention `--complete`. A new `echo` carrying `--complete` could stand in for `ALREADY_DONE` while its message claims to measure `COMPLETION_LINE` and `ALREADY_DONE`.
7. **The 4b meta-test is expensive.** It runs the whole lock test file, zsh passes included, three times. That is 13–16s per run on an idle host and 37–42s under load, measured with `time node --test` on task.164. It reaches a ten-line setup loop.
8. **`review-task` breaks the `--skill` mapping's assumption.** Every other mapped pipeline sub-skill (`create-branch`, `review-story`, `develop`, `create-pr`, `finalise`, `commit-changes`) ends with a `## Pipeline Lock Cooperation` block. `review-task` does not, so in a `/develop-task` run the Step 2 → 3 advance depends on the orchestrator alone. `review-story`'s block, meanwhile, is unconditional: it advances to 3 even on a NO-GO review, after which `/develop-story` Step 2 HALTs (`develop-pipeline-step-2-review.md`, "review-story left it Draft — log as issue, HALT") with the lock already pointing at Step 3.

### Benefits

1. Exception 2 makes no claim the mapping or the Format contradicts.
2. The HALT pin fails on the regression it names, in any formatting, and reads the right span.
3. The hook floor measures the two instructions it claims to.
4. `npm test` sheds about two full runs of the lock test file.
5. The `--skill` mapping describes what every mapped skill actually does.

---

## 3. Technical Background

### Current Architecture

- `shared/resources/develop-pipeline-remaining-work-banner.md`, "Cheap to produce" bullet: "Two firing points are exceptions…", then **Exception 1: a Stop-hook re-prompt.** and **Exception 2: a HALT names the step that halted.** (task.164, as merged by PR #508).
- `shared/resources/tests/step-8-completion-checklist.test.mjs`:
  - `a HALT status block names the step that halted, not current_step`: parses `advance-pipeline-lock.sh` for `name) NEXT=N` arms and refuses each name except `finalise` inside Exception 2, matching `` `name` `` or `` `/name` `` only.
  - `every orchestrator mention of --complete names the Step 8 Completion Checklist`: `hookCode` counts non-comment lines that include `--complete` and requires ≥ 2.
- `shared/resources/advance-pipeline-lock.sh`, `--skill` case: `create-branch) NEXT=2`, `review-story|review-task) NEXT=3`, `develop) NEXT=4`, `create-pr) NEXT=5`, `finalise) NEXT=8`. The QA skills exit 0. The first `  --skill)` arm in the file is an earlier commit-changes early exit.
- `shared/resources/advance-pipeline-lock.test.sh`: scenario 4b reads `ADVANCE_LOCK_TEST_4B_CMDS`, prints a `NOTE` when it is set, and continues through scenarios 5–14 (the zsh passes of 13–14 included).
- `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`: three `spawnSync("bash", [SCRIPT])` runs of the whole file: missing command, `printf` builtin, and seam unset.
- `skills/review-story/SKILL.md` ends with `## Pipeline Lock Cooperation (when invoked by /develop-story or /develop-task)`, which runs `advance-pipeline-lock.sh --skill review-story`. `skills/review-task/SKILL.md` has no such section.

### Target Architecture

- Exception 2 reads, in substance:
  - The position of a HALT block is the step being executed when it halted, not `current_step`. That step is listed first. Inside the QA loop that is `- Steps 5–6:`.
  - It contrasts with blocks **derived from `current_step`**, which start at `Step {N+1}`; Exception 1 is excluded.
  - The halting step and `current_step` differ when a sub-skill has advanced the lock as its last action and its step's tail then halts. **Where** such a sub-skill moves the lock is the `--skill` mapping of `advance-pipeline-lock.sh`.
- The HALT pin:
  - reads the mapping from the `case "$SKILL_NAME" in` block that follows `SKILL_NAME="$2"`;
  - refuses each mapped name except `finalise` in any form: backticked, slash-prefixed, or plain;
  - uses a boundary so `develop` does not match `develop-story`, `develop-task` or `develop-bug`.
- `skills/review-story/SKILL.md`'s existing block is gated the same way: it advances only on a GO outcome (story promoted to Ready for Development).
- The hook floor requires a `COMPLETION_LINE=` assignment and an `ALREADY_DONE=` assignment that each carry `--complete`, and names whichever is missing.
- The lock test file honours a second test-only seam, `ADVANCE_LOCK_TEST_4B_ONLY`. When set, it prints a `NOTE`, prints the summary, and exits after scenario 4b. The meta-test sets it in all three cases. The unset case keeps asserting the default `rm dirname` list.
- `skills/review-task/SKILL.md` gains the same `## Pipeline Lock Cooperation` section `review-story` carries, gated on the review outcome. It advances only when the outcome is READY TO IMPLEMENT and the task was promoted, and never on NEEDS REVISION or REQUIRES REWORK, which HALT the pipeline at Step 2.

### Important Clarifications

- **The Stop hook does not change.** Its `POSITION` / `STEPS_AHEAD` stay the one statement Exception 1 defers to.
- **Only the doc's wording changes.** Exception 2's rule already gives the right answer at lock 3 (Step 2's tail) once `review-task` self-advances. A HALT in Step 2's tail then reads `Step 2/8 … ❌ halted` at lock 3.
- **Both review skills' advance is outcome-gated.** The orchestrators' Step 2 HALTs on a failed review. A lock already at 3 would let the Stop hook, or a resume, send the run to Step 3 (develop) on work that failed review. `review-story` has that exposure today; `review-task` would acquire it with an ungated copy. The Risk Assessment names this.

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-remaining-work-banner.md`: Exception 2 wording (items 1–3)
✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: HALT pin (plain-prose refusal, anchored mapping parse, new phrases); hook floor by binding name
✅ `shared/resources/advance-pipeline-lock.test.sh`: the `ADVANCE_LOCK_TEST_4B_ONLY` early exit and its `NOTE`
✅ `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`: sets the early-exit seam; asserts the NOTE
✅ `skills/review-task/SKILL.md`: `## Pipeline Lock Cooperation`, outcome-gated
✅ `skills/review-story/SKILL.md`: gate the existing `## Pipeline Lock Cooperation` block on a GO outcome
✅ Bundled `references/` copies regenerated; CHANGELOG `[Unreleased]` entry citing (task 165)

### Out of Scope

❌ The Stop hook's text (task.163 settled it)
❌ `halt_step` in the halt snapshot and the resume contract's reading of it (task.164 Out of Scope, unchanged)
❌ Observation #206, measured non-functional criteria (task.166)

---

## 5. Breaking Changes

None to any interface. With `review-task`'s cooperation block, a `/develop-task` run's lock can reach 3 before the orchestrator's Step 2 tail (outcome detection and the tracker comment) finishes. That is the same shape `develop` (→ 4) and `create-pr` (→ 5) already have. Exception 2 prints the correct HALT position for it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.165.plan.task-164-deferred-follow-ups.md](task.165.plan.task-164-deferred-follow-ups.md)

**Depends on task.164 being merged** (PR #508): every file this task edits except `skills/review-task/SKILL.md` carries task.164's text.

### Phase 1: Exception 2 says only what is true

**Risk**: Low. Prose in one shared resource, pinned in Phase 2.

**Files**: `shared/resources/develop-pipeline-remaining-work-banner.md`

- [ ] Replace "not at `current_step`" with "not `current_step`".
- [ ] Replace "where every other block starts at `Step {N+1}`" with a contrast limited to blocks derived from `current_step`.
- [ ] State that a HALT inside the QA loop lists `- Steps 5–6:` first.
- [ ] Reword the mapping citation: "Where a sub-skill that advances the lock moves it is stated once, in the `--skill` mapping…". Keep "this file does not list them" and the `/finalise` example.

### Phase 2: The pins measure what they claim

**Risk**: Low.

**Files**: `shared/resources/tests/step-8-completion-checklist.test.mjs`

- [ ] Anchor the mapping parse on `SKILL_NAME="$2"` followed by `case "$SKILL_NAME" in`, up to its `esac`. Keep the ≥ 5 / `finalise → 8` floor, and make its message name the anchor.
- [ ] Refuse each mapped name except `finalise` in any form, with a boundary-aware match: `(^|[^A-Za-z0-9-])/?name(?![A-Za-z0-9-])`. The negative lookahead keeps `develop` from matching `develop-story`, `develop-task` or `develop-bug`.
- [ ] Update the HALT pin's phrases: "not `current_step`", the Steps 5–6 sentence, and the "blocks derived from `current_step`" contrast.
- [ ] Hook floor: require a line matching `^\s*COMPLETION_LINE=.*--complete` and a line matching `^\s*ALREADY_DONE=.*--complete`, each named in its failure message. Keep the population test's other checks.

### Phase 3: The 4b meta-test runs only 4b

**Risk**: Low.

**Files**: `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`

- [ ] After scenario 4b's block, when `ADVANCE_LOCK_TEST_4B_ONLY` is set: print `NOTE  4b-only: …`, print the `Results:` line, and exit with the file's usual 0/1 rule.
- [ ] The meta-test sets `ADVANCE_LOCK_TEST_4B_ONLY=1` in all three cases, asserts the `4b-only` NOTE, and keeps its current assertions. The unset-seam case deletes only `ADVANCE_LOCK_TEST_4B_CMDS`.
- [ ] Measure the meta-test before and after with `time node --test` on the file, and record both in the implementation report.

### Phase 4: Both review skills cooperate with the lock, on a passing review only

**Risk**: Medium. See Risk Assessment.

**Files**: `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`

- [ ] Add `## Pipeline Lock Cooperation (when invoked by /develop-story or /develop-task)` at the end, in `review-story`'s shape.
- [ ] Gate the advance on the outcome: advance only when the recommendation is READY TO IMPLEMENT and Step 9 promoted the task; otherwise leave the lock alone, and say why.
- [ ] Gate `review-story`'s existing block the same way: advance only on a GO outcome (Draft → Ready for Development); never on NO-GO.
- [ ] Confirm the bundler ships `references/advance-pipeline-lock.sh` and `references/pipeline-lock-cooperation.md` into `skills/review-task/references/` (`npm run bundle`, `bundle:check`).

### Phase 5: Proof and gates

**Risk**: Low.

- [ ] Mutation-prove under bash, with `cp` snapshots and `cmp`-checked restore:
  - Exception 2 relists `develop` and `create-pr` in plain prose → HALT pin red;
  - Exception 2 reverts to "every other block" → HALT pin red;
  - `ALREADY_DONE` drops `--complete` while a new `echo "… --complete"` line is added → hook floor red;
  - the mapping regex reverts to the first-`--skill)` anchor, with a decoy `x) NEXT=9` line in the early-exit arm of a scratch copy → the anchored parse ignores the decoy and the old one reads it;
  - the 4b early exit is removed → the meta-test's `4b-only` NOTE assertion goes red.
- [ ] `npm run bundle`, `npm run ci:fast` with `.agents/skills` moved aside, `npm run lint:shell`, `npm run bundle:check`, `npm run validate -- skills/review-task/`.
- [ ] CHANGELOG `[Unreleased]` entry citing (task 165).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-remaining-work-banner.md`: Exception 2 wording
2. ✅ `skills/review-task/SKILL.md`: `## Pipeline Lock Cooperation`, outcome-gated
3. ✅ `skills/review-story/SKILL.md`: existing block gated on a GO outcome

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: HALT pin and hook floor
5. ✅ `shared/resources/advance-pipeline-lock.test.sh`: the `ADVANCE_LOCK_TEST_4B_ONLY` early exit
6. ✅ `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`: uses the early exit

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

7. ✅ `CHANGELOG.md`: `[Unreleased]` entry
8. ✅ Bundled `references/` copies (banner doc in develop-bug/story/task; `advance-pipeline-lock.sh` and `pipeline-lock-cooperation.md` in review-task), regenerated by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the HALT pin, the hook floor, and the banner test (unchanged; it must stay green)
- **Command**: `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`
- **Target**: each Phase 5 mutation against these goes red; baseline green

### Integration Tests

- **Scope**: scenario 4b through the lock test file, with the early exit
- **Command**: `node --test shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`
- **Target**: the three cases pass, each asserting the `4b-only` NOTE; runtime recorded before and after

### Performance Tests

- **Metric**: the 4b meta-test's wall-clock, before and after, measured with `time node --test shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs` on the same host in one session. The bound is below in Success Criteria.

### Consumer Tests

- `bash shared/resources/advance-pipeline-lock.test.sh` with no seam set still runs every scenario and reports 95/0.
- `bash shared/resources/develop-pipeline-on-stop.test.sh` is unaffected.
- `review-task` and `review-story` standalone (no lock): the cooperation blocks are no-ops.

---

## 9. Success Criteria

### Functional

- [ ] Exception 2 contains "not `current_step`", limits its `Step {N+1}` contrast to blocks derived from `current_step`, states the Steps 5–6 HALT, and cites the mapping as *where* a sub-skill moves the lock. The HALT pin pins each (Phases 1–2).
- [ ] The HALT pin goes red when Exception 2 relists a mapped skill other than `finalise` in plain prose, and does not go red on `develop-story`, `develop-task` or `develop-bug` (Phase 2).
- [ ] The HALT pin parses the mapping from the `case "$SKILL_NAME" in` block. A decoy `NEXT=` arm elsewhere in the script is not read (Phase 2).
- [ ] The hook floor fails, naming the binding, when `COMPLETION_LINE` or `ALREADY_DONE` stops carrying `--complete`, even if another line in the hook does (Phase 2).
- [ ] `skills/review-task/SKILL.md` advances the lock with `--skill review-task` on a READY outcome only, and `skills/review-story/SKILL.md` with `--skill review-story` on a GO outcome only. Each says why it does not advance on a failed review (Phase 4).

### Performance

- [ ] The 4b meta-test's wall-clock is at most half its pre-change value, measured on the same host in one session with `time node --test` on the file. Both figures are recorded in the implementation report.

### Code Quality

- [ ] `npm run ci:fast` passes with `.agents/skills` moved aside; `lint:shell`, `bundle:check` and `npm run validate -- skills/review-task/` pass
- [ ] Each Phase 5 mutation behaves as stated under bash, with restore checked by `cmp`

### Migration

- [ ] CHANGELOG `[Unreleased]` entry cites (task 165)

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

1. **A review skill advancing the lock on a failed review.**
   - **Risk**: an unconditional block moves the lock to 3 on NEEDS REVISION, REQUIRES REWORK or NO-GO. The orchestrator then HALTs at Step 2 with the lock at 3, and a Stop-hook re-prompt or a resume sends the run to Step 3 (develop) on work that failed review. `review-story` carries this today; a copied `review-task` block would too.
   - **Probability**: Medium (the exposure exists now, and the natural edit is a copy). **Impact**: High (develops unreviewed work).
   - **Mitigation**: gate both blocks on a passing outcome, stated in each block. The Phase 4 checklist names the gate.
   - **Rollback**: delete the review-task block and restore review-story's; the orchestrator's own Step 2 → 3 advance remains.

### Low Risk Areas

1. **A plain-prose refusal that over-matches.** A boundary-less `develop` matches `develop-task`, which Exception 2 names legitimately. Mitigation: the lookahead in Phase 2, and a negative case in the Success Criteria.
2. **The early-exit seam leaks.** An exported `ADVANCE_LOCK_TEST_4B_ONLY` would silently shorten the direct `npm test` run of the lock test file. Mitigation: the `NOTE` line, as task.164 did for `ADVANCE_LOCK_TEST_4B_CMDS`.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: `step-8-completion-checklist.test.mjs` or `advance-pipeline-lock.test.sh` red on `develop`; a `/develop-task` run whose lock advances past Step 2 on a failed review
- **Steps**: revert the merge commit on `develop`, run `npm run bundle`, run `npm run ci:fast`
- **Validation**: both suites green on the reverted tree

### Partial Rollback (1-2 hours)

- **When**: only the `review-task` block misbehaves
- **Steps**: remove the `## Pipeline Lock Cooperation` section from `skills/review-task/SKILL.md` and restore `review-story`'s previous block; re-bundle, and keep Phases 1–3

### Forward Fix (< 4 hours)

- **When**: a wording nuance in Exception 2, or a pin phrase that needs adjusting
- **Approach**: reword, keep the pins

### Rollback Triggers

- **Critical**: a red suite on `develop`; a develop run started on a task that failed review
- **Non-critical**: wording (fix forward)

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-28 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Exception 2 says only what is true

- [ ] Grammar, contrast, Steps 5–6 HALT, mapping citation

### Phase 2: The pins measure what they claim

- [ ] Anchored mapping parse; plain-prose refusal; phrases
- [ ] Hook floor by binding name

### Phase 3: The 4b meta-test runs only 4b

- [ ] Early-exit seam and NOTE
- [ ] Meta-test uses it; runtime before/after recorded

### Phase 4: Both review skills cooperate with the lock, on a passing review only

- [ ] review-task block (outcome-gated); review-story block gated; bundle ships the references

### Phase 5: Proof and gates

- [ ] Mutation proofs
- [ ] Gates and CHANGELOG

---

## References

- **Source**: task.164 (`docs/tasks/task.164.task-163-deferred-follow-ups/`):
  - `task.164.gate.3` `recommendations.future`: QA-164-10..13, the 4b runtime, the review-task mapping
  - `task.164.pr-review.1`: CR-1 (Exception 2's contrast), CR-2 (hook floor by binding)
  - the task document's Deferred Work
- **Related**: `shared/resources/advance-pipeline-lock.sh` (`--skill` case), `skills/review-story/SKILL.md` (§ Pipeline Lock Cooperation), `shared/resources/pipeline-lock-cooperation.md`, `shared/resources/develop-pipeline-step-2-review.md` (the post-review HALT tables), `shared/resources/develop-pipeline-on-stop.sh`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, then run `npm run bundle`. Never edit the `skills/*/references/` copies.
- Start from `develop` after PR #508 has merged.
- Write patch scripts to files, not inline `node -e`: the prose carries apostrophes and backticks.

---

**Status:** Planned

**Next Steps**:

1. `/develop-task docs/tasks/task.165.task-164-deferred-follow-ups/task.165.task-164-deferred-follow-ups.md`
2. QA artifacts will be co-located: `task.165.qa.{N}.*.md`, `task.165.gate.{N}.*.yml`, `task.165.bug.{N}.*.md`
