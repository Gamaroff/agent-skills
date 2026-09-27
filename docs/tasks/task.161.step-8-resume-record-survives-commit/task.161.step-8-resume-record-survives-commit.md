---
id: task.161
title: "[Task 161] Step 8 keeps its resume record until the Completion Checklist passes"
type: task
description: "/commit-changes removes the pipeline lock at the Step 8 commit, so a pause, crash or HALT during Step 8's push, Cleanup or Completion Checklist leaves no resume record, and a Step 8 HALT writes no snapshot. Keep the lock until the checklist passes, make the resume detector recommend step 8 for a record at step 8, and fix two orchestrator restatements that task.160's review found."
tags: [develop-pipeline, step-8, resume, pipeline-lock, follow-up]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-27
updated: 2026-09-27
assignee:
estimated_effort_hours: 8
github_issue: 500
---

# Technical Task: Step 8 keeps its resume record until the Completion Checklist passes

**Status:** Planned

**GitHub Issue**: [#500](https://github.com/Gamaroff/agent-skills/issues/500)

---

## 1. Overview

The develop pipelines resume from a **record**: the pipeline lock, a halt snapshot, or an orphaned PreCompact claim. Task.160 made that record the only evidence of whether Step 8 finished. The record ends too early. `/commit-changes`' lock cooperation removes the lock at the Step 8 commit, so everything Step 8 does after that commit leaves nothing to resume from: the push, Cleanup, and the blocking Completion Checklist. This task keeps the lock alive until the checklist passes, so the lock's last remover is Step 8's own `--complete`. A Step 8 HALT then leaves a snapshot. The resume detector stops recommending a step 9 that does not exist.

**Scope**: the `commit-changes` arm of `shared/resources/advance-pipeline-lock.sh`; the Step 8 step document's Cleanup and Completion Checklist ordering and its record paragraphs; `commit-changes`' lock-cooperation prose; the resume detector's `recommended_step` rule for a record at step 8; and two orchestrator restatements in `skills/develop-{task,story,bug}/SKILL.md`. Tests are in `shared/resources/advance-pipeline-lock.test.sh` and `shared/resources/tests/step-8-completion-checklist.test.mjs`. Sources: task.160 `gate.4`, `gate.5` and `gate.6` `recommendations.future` (the pre-existing post-commit window), and task.160 `pr-review.1` CR-1 and CR-2.

**Depends on task.160 (PR #499) merging first.** Its step-8 record paragraphs, recovery exceptions and resume-contract rule are what this task narrows. Cut this task's branch from `develop` after #499 lands.

**Key deliverables**:

1. At step 8, the lock survives `/commit-changes`. It is removed only by `advance-pipeline-lock.sh --complete`, which runs after the Completion Checklist's checks pass
2. A HALT anywhere in Step 8 leaves a halt snapshot with `halt_step: 8`, and a resume from it re-runs Step 8
3. The resume detector recommends step 8, never 9, for a record at step 8
4. Every orchestrator instruction that updates the Pipeline Progress table after a step carries the Step 8 exception, and a test enumerates them. The recovery exception for a record at step 8 comes before the items it overrides

---

## 2. Motivation

### Current Problems

1. **No record after the Step 8 commit.** `advance-pipeline-lock.sh --skill commit-changes` removes the lock when `current_step` ≥ 8 (the `commit-changes)` arm, added in `a284dfdd`, 2026-06-08). Step 8's push, Cleanup and Completion Checklist all run after that. A pause, a crash or a HALT there leaves no lock, no snapshot and no claim. The next `/develop-task` sees a completed run, even when the push failed or the checklist refused.
2. **A Step 8 HALT writes no snapshot.** The HALT rule (`skills/develop-task/SKILL.md` § Error Recovery Principles, "Snapshot then remove the lock file before every terminal HALT") first commits the report through `/commit-changes`, then snapshots `if [ -f .claude/state/develop-pipeline.lock ]`. At step 8 that commit has just removed the lock, so the snapshot is skipped. The only HALT that stays resumable is one whose report fails lint, because that HALT skips the commit (task.160 CR5-3).
3. **The Stop hook goes inert for the rest of Step 8.** `develop-pipeline-on-stop.sh` acts only on an existing lock. Once the lock is gone, an orchestrator that yields during the push or the checklist is not re-prompted, and the "Never stop between steps" rule has no backstop for the final actions.
4. **The detector names a step that does not exist.** `pipeline-resume-detector-prompt.md` sets `recommended_step = LOCK_STEP + 1` when every expected summary is present. For a record at step 8 that is 9, while its own schema says `recommended_step` is 1–8. Task.160 had to add an exception at three recovery sites to override it.
5. **Two restatements task.160 did not reach** (task.160 `pr-review.1`). CR-1 is a generic line in all three orchestrators: "After each step: update the Pipeline Progress table …" (`skills/develop-task/SKILL.md` *After each step: update the Pipeline Progress table*; the same line in develop-story and develop-bug). It still tells the orchestrator to edit the report after Step 8, and the task.160 tests check only named lines. CR-2 is the order of the recovery items: the "Exception — a record at step 8" comes after Context Compression Recovery items 2 and 3, so recovery first verifies Step 8 and prints "Resuming from recommended step 9", and only then does the exception override both.

### Benefits

1. **Resume covers all of Step 8.** A record at step 8 means Step 8 did not pass its checklist. The task.160 rule ("the record, not the row, decides") then holds for the whole step instead of stopping at its commit.
2. **Step 8 HALTs are resumable.** They leave a snapshot like every other step's HALT, with no special case for lint failures.
3. **The Stop hook guards the final actions.** An orchestrator that yields before the checklist passes is re-prompted.
4. **Three recovery exceptions become one rule.** The detector returns 8. The exceptions shrink to a pointer, or disappear.
5. **Row edits after Step 8 are enforced by an enumeration.** The task.160 guard checks named lines. This task's guard checks every instruction in the population.

---

## 3. Technical Background

### Current Architecture

```
Step 8 today (lock timeline)
  finalise ─► lock current_step=8
  Final Implementation Report Update   (lock: 8)
  lint report                          (lock: 8)
  /commit-changes ─► --skill commit-changes at ≥8 ─► rm lock     ◄── record ends here
  git push                             (no lock)
  Cleanup: logs, this run's snapshot, rm -f lock (already gone)
  Completion Checklist checks 1–5      (no lock; check 1 asserts it absent)
```

- `shared/resources/advance-pipeline-lock.sh`, `commit-changes)` arm: `if [ "$CUR" -ge 8 ]; then rm -f "$LOCK"`. The comment explains why only the Step 8 invocation removes the lock. The nested invocations at Step 4 and in each `/qa-fix` cycle must preserve it.
- `shared/resources/develop-pipeline-step-8-commit.md`:
  - § Final Implementation Report Update, in "What the record covers" and "What it does not cover", states today's window and names this gap as a known one.
  - § Cleanup Transient State ends with `rm -f .claude/state/develop-pipeline.lock` and the comment "must be last so a crash mid-cleanup still leaves the lock available for resume". That comment is false today: the lock is already gone.
  - § Step 8 Completion Checklist check 1 asserts the lock is absent.
- `skills/commit-changes/SKILL.md` § Pipeline Lock Cooperation and `shared/resources/pipeline-lock-cooperation.md` describe the removal at step 8.
- `shared/resources/pipeline-resume-detector-prompt.md`: Step 3's `recommended_step = LOCK_STEP + 1`, plus its table row "Every summary … present and valid → LOCK_STEP + 1", against the schema line `recommended_step … (1–8)`.
- The readers of lock presence:
  - `develop-next` (lock present means re-enter the run)
  - `develop-batch` (tiebreak on the worktree lock)
  - `loop-supervisor` (polls `current_step`)
  - the PreCompact and Stop hooks
  - `grant-qa-cycles.sh`, `set-qa-phase.sh` and `set-waiting-on.sh`

  None of them treats "lock absent" as proof that Step 8's checklist passed. Phase 1 re-verifies this.

### Target Architecture

```
Step 8 target (lock timeline)
  Final Implementation Report Update   (lock: 8)
  lint report                          (lock: 8)
  /commit-changes ─► --skill commit-changes at ≥8 ─► no-op        (lock: 8)
  git push                             (lock: 8)
  Cleanup: logs, this run's snapshot   (lock: 8)
  Completion Checklist checks 2–5      (lock: 8)
  advance-pipeline-lock.sh --complete ─► rm lock                  ◄── record ends here
  check 1: lock absent
```

- The `commit-changes)` arm never removes the lock. At step 8 it is a no-op, as it already is at steps 4 and 5–6. `--complete` is the lock's only terminal remover, and Step 8 calls it once checks 2–5 have passed.
- The HALT rule's snapshot now finds the lock at step 8, so a Step 8 HALT leaves `halt_step: 8` with no change to the HALT rule itself.
- The detector clamps: when `LOCK_STEP` is 8, `recommended_step` is 8, re-run Step 8. The schema's 1–8 range then holds.
- CR-1: each generic "After each step: update the Pipeline Progress table" line carries the Step 8 exception, or points at action 2. A test enumerates every such instruction (the population), not named lines.
- CR-2: the step-8 exception moves ahead of Context Compression Recovery items 2 and 3, or those items defer to it. Recovery then never prints a verified Step 8 or a step 9.

### Important Clarifications

- **Re-running Step 8 stays safe.** A resume at step 8 now re-runs a step that may already have committed and pushed. The step-8 doc already states it is re-runnable. It writes a new Finished value (one more docs commit), `/commit-changes` commits only what changed, the push is a no-op when nothing is new, and Cleanup and the checklist are idempotent. This task adds no new idempotency requirement. It makes more paths reach an existing one.
- **The PreCompact hook can now fire after the Step 8 commit.** It commits and pushes a `## Pipeline Paused` entry. A resume then re-runs Step 8, whose report update and commit absorb that entry. This is the same pause-and-resume behaviour the hook has at every other step.

---

## 4. Scope

### In Scope

✅ `shared/resources/advance-pipeline-lock.sh`: the `commit-changes)` arm stops removing the lock; the header comment and usage text are updated
✅ `shared/resources/develop-pipeline-step-8-commit.md`: Cleanup no longer removes the lock; the checklist runs checks 2–5, then `--complete`, then check 1; the "What the record covers" paragraph is rewritten to cover the whole step; the "What it does not cover" paragraph is deleted
✅ `skills/commit-changes/SKILL.md` § Pipeline Lock Cooperation and `shared/resources/pipeline-lock-cooperation.md`: the step-8 removal is described as `--complete`'s
✅ `shared/resources/pipeline-resume-detector-prompt.md`: `recommended_step` is 8 for a record at step 8, in both the Step 3 rules and the summary table
✅ `skills/develop-{task,story,bug}/SKILL.md`: CR-1 (the generic post-step Pipeline Progress line); CR-2 (the order of the recovery exception); the step-8 exception reduced to what the detector no longer covers
✅ `shared/resources/develop-pipeline-resume-contract.md` Phase 0b: the sentence naming the post-commit gap is removed; the step-8 rule's `LOCK_STEP + 1` aside is removed
✅ Tests in `shared/resources/advance-pipeline-lock.test.sh` and `shared/resources/tests/step-8-completion-checklist.test.mjs`; a CHANGELOG `[Unreleased]` entry citing (task 161)

### Out of Scope

❌ Changing how the PreCompact hook edits the report at step 8 (task.160 option 3, declined). The record makes it unnecessary
❌ The Phase 2 completion templates' missing Commit field (task.160 CR6-1), a separate advisory
❌ Replacing task.160's non-discriminating before-commit test (task.160 CR6-2), a separate advisory
❌ `develop-next` / `develop-batch` / `loop-supervisor` behaviour changes. Phase 1 verifies that they need none

---

## 5. Breaking Changes

None to any public interface. One behaviour changes: the pipeline lock now outlives the Step 8 commit and is removed by `--complete` after the Completion Checklist passes. A reader that polls the lock (`loop-supervisor`, `develop-next`, `develop-batch`) sees a pipeline as in flight for the extra seconds of push, Cleanup and checklist. That is the correct answer for a run that could still fail its checklist. A consumer with an older orchestrator and a newer `advance-pipeline-lock.sh` would keep a lock after Step 8, because the older Step 8 doc removes it in Cleanup (`rm -f`). The combination is safe.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.161.plan.step-8-resume-record-survives-commit.md](task.161.plan.step-8-resume-record-survives-commit.md)

### Phase 1: The lock survives the Step 8 commit

**Risk**: Medium, because it changes the lock's lifetime, which the hooks read.

**Files**: `shared/resources/advance-pipeline-lock.sh`, `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/develop-pipeline-step-8-commit.md`, `shared/resources/pipeline-lock-cooperation.md`, `skills/commit-changes/SKILL.md`

- [ ] Population check first. List every reader of `develop-pipeline.lock` presence or absence (`grep -rln develop-pipeline.lock skills/*/SKILL.md skills/*/scripts shared/resources`) and record, in the plan, what each does when the lock lives until `--complete`. Proceed only when none reads "lock absent" as "Step 8's checklist passed"
- [ ] `commit-changes)` arm: at `current_step` ≥ 8, leave the lock in place. It no-ops at every step. Update the arm's comment and the file's header usage
- [ ] Step 8 doc § Cleanup Transient State: drop `rm -f .claude/state/develop-pipeline.lock`, and keep the log and this-run snapshot sweeps
- [ ] Step 8 doc § Step 8 Completion Checklist: run checks 2, 2b, 3, 4 and 5; on pass, `advance-pipeline-lock.sh --complete`; then check 1 (lock absent). The "BLOCKING" semantics are unchanged: a failed check exits before `--complete`, so the lock survives for resume
- [ ] Step 8 doc § Final Implementation Report Update: rewrite "What the record covers" so the record spans Step 8 from `/finalise`'s advance to the checklist pass, and delete "What it does not cover". Rewrite the Step Transition Protocol's `--complete` mention in the three SKILL.md files as a no-op after Step 8, since Step 8 already called it
- [ ] `skills/commit-changes/SKILL.md` and `pipeline-lock-cooperation.md`: at step 8 the cooperation call is a no-op, and `--complete` ends the run

### Phase 2: A Step 8 HALT is resumable

**Risk**: Low. It follows from Phase 1 with no change to the HALT rule.

**Files**: `shared/resources/tests/step-8-completion-checklist.test.mjs`, `shared/resources/develop-pipeline-step-8-commit.md`

- [ ] Executed test: set up a lock at step 8, run the real commit-changes cooperation call, then the HALT rule's snapshot block verbatim, cut from `skills/develop-task/SKILL.md`. Assert a snapshot exists with `halt_step` = 8 and the lock is gone. Under bash and zsh
- [ ] Executed test: a failing checklist check (for example an unfinished row) exits before `--complete`, and the lock survives at 8
- [ ] Executed test: a lock at step 8 restored from that snapshot by `advance-pipeline-lock.sh --restore` reads `current_step` 8

### Phase 3: Resume names step 8, and the orchestrators say so once

**Risk**: Low.

**Files**: `shared/resources/pipeline-resume-detector-prompt.md`, `shared/resources/develop-pipeline-resume-contract.md`, `skills/develop-{task,story,bug}/SKILL.md`, `shared/resources/tests/step-8-completion-checklist.test.mjs`

- [ ] Detector: when `LOCK_STEP` is 8, `recommended_step` is 8, in Step 3's rules and in the summary table. The schema's (1–8) now holds for every row
- [ ] Resume contract Phase 0b: delete the "(the detector's `LOCK_STEP + 1` would name a step 9 …)" aside and the post-commit-gap sentences
- [ ] CR-2: in each orchestrator's Context Compression Recovery, state the step-8 exception before items 2–3, or have items 2–3 defer to it. With the detector fixed, the exception reduces to "an unfinished row at or below Step 7 still wins"
- [ ] CR-1: give each "After each step: update the Pipeline Progress table" line (develop-task, develop-story, develop-bug) the Step 8 exception, or a pointer to action 2
- [ ] Enumerating test (CR-1's missing population check): scan `skills/develop-*/SKILL.md` and `shared/resources/develop-pipeline-*.md` for every instruction that updates the Pipeline Progress table. The pattern and its exclusions are recorded in the test. Assert each carries the Step 8 exception or a pointer to action 2. Non-vacuity floor: the scan finds at least the three known lines

### Phase 4: Proof and gates

**Risk**: Low.

- [ ] Mutation-prove each branch under bash, with `cp` snapshots of a real array and restore checked with `cmp`:
  - restore the `rm -f "$LOCK"` in the `commit-changes` arm (Phase 1 lock-survives test red)
  - move `--complete` before check 4 (failing-checklist test red)
  - restore `LOCK_STEP + 1` for step 8 (detector prose guard red)
  - drop one orchestrator's Step 8 exception (enumerating test red)
- [ ] `npm run bundle`; then `npm run ci:fast` with `.agents/skills` moved aside, `npm run lint:shell`, `npm run bundle:check`, `npm run check:generated`, and `npm run validate -- skills/<skill>/` for commit-changes and develop-{task,story,bug}
- [ ] CHANGELOG `[Unreleased]` entry citing (task 161)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/advance-pipeline-lock.sh`: the `commit-changes` arm stops removing the lock at step 8
2. ✅ `shared/resources/develop-pipeline-step-8-commit.md`: Cleanup, checklist order, record paragraphs
3. ✅ `shared/resources/pipeline-lock-cooperation.md`: step-8 removal is `--complete`'s
4. ✅ `shared/resources/pipeline-resume-detector-prompt.md`: `recommended_step` 8 for a record at step 8
5. ✅ `shared/resources/develop-pipeline-resume-contract.md`: gap and step-9 asides removed
6. ✅ `skills/commit-changes/SKILL.md`: Pipeline Lock Cooperation prose
7. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`: CR-1, CR-2, the Step Transition Protocol's `--complete` note

### Files to Modify (Tests)

8. ✅ `shared/resources/advance-pipeline-lock.test.sh`: the `commit-changes` arm at step 8 leaves the lock
9. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: lock lifecycle through the checklist, Step 8 HALT snapshot, restore, detector guard, enumerating CR-1 test

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md`: `[Unreleased]` entry
11. ✅ Bundled `references/` copies, regenerated by `npm run bundle` (never edited by hand)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `advance-pipeline-lock.sh`'s `commit-changes` arm at steps 4, 5 and 8, and `--complete`
- **Command**: `bash shared/resources/advance-pipeline-lock.test.sh`
- **Target**: every arm exercised; the step-8 case asserts the lock survives

### Integration Tests

- **Scope**: the Step 8 lock lifecycle run from the step document's own blocks (Cleanup, the checklist, `--complete`), the HALT rule's snapshot block cut verbatim from `skills/develop-task/SKILL.md`, and `--restore`
- **Command**: `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`, under bash and zsh wherever zsh is installed

### Contract Tests

- The enumerating CR-1 test is the contract: every post-step Pipeline Progress instruction carries the Step 8 exception. The detector's `recommended_step` for `LOCK_STEP` 8 is guarded in prose, the way task.160 guarded the resume contract

### Performance Tests

Not applicable. No loop or I/O is added.

### Consumer Tests

- `develop-pipeline-on-stop.test.sh` and `develop-pipeline-on-precompact.test.sh` still pass. A lock that now exists during the last actions of Step 8 must be handled as at any other step
- The Phase 1 population check records the lock readers' behaviour

---

## 9. Success Criteria

### Functional

- [ ] `advance-pipeline-lock.sh --skill commit-changes` on a lock at `current_step` 8 exits 0 and leaves the lock in place (Phase 1 changes the arm)
- [ ] The Step 8 checklist, run on a correct fixture, removes the lock only through `--complete` after checks 2–5 pass. Check 1 then passes (Phase 1)
- [ ] A Step 8 checklist that fails (an unfinished row) exits before `--complete`, and the lock remains at `current_step` 8 (Phase 1)
- [ ] The HALT rule's snapshot block, run at step 8 after the commit-changes cooperation call, writes a snapshot with `halt_step` 8 under bash and zsh (Phase 2 test; the behaviour comes from Phase 1)
- [ ] The detector prompt states `recommended_step` 8 for a record at step 8, and no row of its summary table can yield 9 (Phase 3)
- [ ] Every post-step Pipeline Progress instruction in `skills/develop-*/SKILL.md` and `shared/resources/develop-pipeline-*.md` carries the Step 8 exception (Phase 3 enumerating test, with a floor of 3)
- [ ] Context Compression Recovery in all three orchestrators states the step-8 exception before the items it overrides (Phase 3)

### Performance

- [ ] No measurable change. Step 8 gains one `--complete` call and loses one `rm -f`

### Code Quality

- [ ] `npm run ci:fast` passes with `.agents/skills` moved aside; `lint:shell`, `bundle:check` and `check:generated` pass
- [ ] `npm run validate -- skills/<skill>/` passes for commit-changes and develop-{task,story,bug}
- [ ] Each Phase 4 mutation is proven red under bash, with restore checked by `cmp`

### Migration

- [ ] CHANGELOG `[Unreleased]` entry cites (task 161) and names the new lock lifetime
- [ ] The step-8 doc no longer names the post-commit window as a known gap

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

1. **A lock reader assumes the lock is gone once the Step 8 commit lands.**
   - **Risk**: `develop-next`, `develop-batch` or `loop-supervisor` might read the lock during the final seconds of Step 8 and re-enter a run that is about to finish
   - **Probability**: Low. `develop-next` step 2 and `develop-batch`'s tiebreak read presence as "in flight", which is now the correct answer
   - **Impact**: Medium. A double resume re-runs an idempotent Step 8
   - **Mitigation**: the Phase 1 population check comes first; Step 8 is re-runnable
2. **The Stop hook re-prompts during the push or the checklist.**
   - **Risk**: an orchestrator waiting on a slow push is re-prompted
   - **Mitigation**: that is the intended backstop. `set-waiting-on.sh` exists for long waits
3. **Nested `/commit-changes` calls at step ≥ 8 outside Step 8's main commit** (the HALT commit, a Step 8 re-run).
   - **Mitigation**: with no removal in the arm, every such call leaves the lock, which is what a HALT needs for its snapshot

### Low Risk Areas

1. **Prose drift across 3 orchestrators and the bundled copies.** The enumerating test and `bundle:check` cover it

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a pipeline completes Step 8 but leaves a lock behind, or the Stop hook loops after a successful run
- **Steps**: revert the task's merge commit on `develop`, run `npm run bundle`, then `npm run ci:fast`
- **Validation**: `advance-pipeline-lock.test.sh` passes on the reverted tree

### Partial Rollback (1-2 hours)

- **When**: Phase 3 is fine and Phase 1 misbehaves
- **Steps**: restore the `commit-changes` arm's step-8 removal and the Cleanup `rm -f`. Keep the detector and orchestrator prose

### Forward Fix (< 4 hours)

- **When**: a lock reader missed by the population check misreads the longer lock
- **Approach**: teach that reader `current_step` 8 semantics and add it to the population list

### Rollback Triggers

- **Critical**: a completed run leaves `.claude/state/develop-pipeline.lock` behind
- **Non-critical**: prose inconsistency among the orchestrators (fix forward)

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-27 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The lock survives the Step 8 commit
- [ ] Population check recorded
- [ ] `commit-changes` arm no-ops at step 8
- [ ] Cleanup and checklist reordered; `--complete` after checks 2–5
- [ ] Record paragraphs rewritten; commit-changes prose updated

### Phase 2: A Step 8 HALT is resumable
- [ ] HALT-at-8 snapshot test
- [ ] Failing-checklist keeps-lock test
- [ ] Restore test

### Phase 3: Resume names step 8
- [ ] Detector clamp
- [ ] Resume contract asides removed
- [ ] CR-2 order; CR-1 lines; enumerating test

### Phase 4: Proof and gates
- [ ] Mutation proofs
- [ ] Gates and CHANGELOG

---

## References

- **Source**: task.160 (`docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/`), `gate.4`/`gate.5`/`gate.6` `recommendations.future` and `pr-review.1` CR-1/CR-2
- **Origin of the gap**: `a284dfdd` (2026-06-08), "fix(pipeline-lock): preserve lock when commit-changes runs nested (only remove at step 8)"
- **Related**: `shared/resources/develop-pipeline-hooks.md`, `shared/resources/develop-pipeline-pause.md`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, then run `npm run bundle`. Never edit the `skills/*/references/` copies
- In `shared/resources/*.md`, cite siblings by bare filename in prose
- Run mutation proofs under `bash` with a real array. Under zsh a scalar `$FILES` is not word-split

### Future Improvements

- task.160 CR6-1 (a Commit field in the Phase 2 templates) and CR6-2 (a discriminating before-commit test)

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.161.step-8-resume-record-survives-commit/task.161.step-8-resume-record-survives-commit.md`
2. QA artifacts will be co-located: `task.161.qa.{N}.*.md`, `task.161.gate.{N}.*.yml`, `task.161.bug.{N}.*.md`
