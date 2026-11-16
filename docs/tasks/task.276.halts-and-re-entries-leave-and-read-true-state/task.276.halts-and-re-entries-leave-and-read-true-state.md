---
id: task.276
title: "Halts and re-entries leave and read true state"
type: task
description: "Make every pipeline HALT snapshot and clear its lock mechanically, stop a restore consuming the snapshot a re-entry needs, give the re-entry refusal one remedy, count QA cycles once, and check a resume prompt against run state."
tags: [develop-task, finalise, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-16
estimated_effort_hours: 16
---

# Task 276: Halts and re-entries leave and read true state

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.276.review.1.halts-and-re-entries.md` implemented 2026-11-15

---

## 1. Overview

Several recovery paths in the develop pipeline leave the lock and snapshot in a state the next command refuses, or read the run's state wrongly (obs #46, #49, #75, #95, #135). Each cost a hand-written snapshot, a contradictory instruction or a miscounted budget.

**Scope**: `advance-pipeline-lock.sh`, `reenter-qa-after-finalise.sh`, the QA-loop escalation block, the resume rules, and tests. Obs #130 and #114 are already fixed by task 244 and are closed.

---

## 2. Motivation

### Current Problems

1. **`--restore` consumes the snapshot a re-entry needs** (obs #46). On task.203, after a `finalise-dod-gaps` halt the natural resume `advance-pipeline-lock.sh --restore` rebuilt the lock and deleted the snapshot; `reenter-qa-after-finalise.sh` then refused `lock-present` and needed the snapshot. Recovery was a hand-built snapshot. The step-8 advance on a gaps outcome has since been fixed (task 222); the `--restore` guard has not.
2. **An escalation HALT leaves the lock and no snapshot** (obs #49). Three occurrences: task.205, task.238 (a `/finalise` DoD-gaps HALT) and task.242. `grant-qa-cycles.sh` coped each time; the resume session wrote the snapshot by hand.
3. **The `no-code-moved` refusal gives two remedies that conflict** (obs #75): "resume at step 7 with `--restore`" and, appended, "commit it and run this script again".
4. **The budget base counts two heading sets** (obs #135). On task.246 `reenter-qa-after-finalise.sh` set `qa_max_cycles=10 (base 8)` after four cycles because `grep -c '^### QA Cycle'` counted both the Decisions Log and the QA Iteration History headings. It also routed `lock-present` toward step 7 over an ungated head.
5. **A stale resume prompt can re-run a finished cycle** (obs #95). On task.217 a "resume qa-fix cycle 2" prompt arrived twice after cycle 2 had finished; nothing marks the step and cycle a prompt was issued for.

### Benefits

1. A HALT is resumable without hand-built state.
2. The re-entry's refusal says one thing, and its budget is the real one.
3. A stale prompt is reported, not acted on.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `shared/resources/advance-pipeline-lock.sh:26` `--restore <doc-dir>` rebuilds the lock from the halt snapshot and consumes it (`:76`–`:98`); `--restore --which` prints the path it would consume (`:111`). `grep -n "finalise-dod-gaps" advance-pipeline-lock.sh` returns nothing, so the restore has no check on `halt_reason`.
- `shared/resources/reenter-qa-after-finalise.sh:138` refuses `lock-present`; `:262`–`:266` build `UNTRACKED_NOTE` and refuse `no-code-moved` with the step-7 route first and the commit-and-re-run note appended; `:271` `DONE=$(grep -c '^### QA Cycle' "$REPORT" ...)` is the doubled count. `grant-qa-cycles.sh:163` has the same `grep -c` on the same report.
- `grep -n -- "--halt" shared/resources/advance-pipeline-lock.sh shared/resources/develop-pipeline-step-5-6-qa-loop.md` returns nothing: there is no HALT helper; the Loop Escalation block is a copied `jq`/`rm` fence (obs #49).
- `shared/resources/develop-pipeline-resume-contract.md:215` covers a session that continues after a pause or HALT; it does not compare a received resume prompt to run state.
- Tests: `advance-pipeline-lock.test.sh`, `reenter-qa-after-finalise.test.sh`, `grant-qa-cycles.test.sh`.

### Target Architecture

- `--restore` refuses when the candidate snapshot is a DoD-gaps halt, naming `reenter-qa-after-finalise.sh` as the entry point (obs #46 option 1). **A DoD-gaps halt is recognised the way the re-entry script recognises it**: `halt_step` is 7 and the newest DoD file for the work item reads `**Final Status:** ❌ GAPS`. It is not recognised by a `halt_reason` token: `git grep -n 'finalise-dod-gaps'` finds no writer, so a guard on that literal would never fire (review 1, C1). The refusal is bypassed only by `--restore --allow-dod-gaps`, which `reenter-qa-after-finalise.sh` passes at its restore step (`:276`) and which is also the one remedy for a document-only fix. `--restore --which` writes nothing and is never guarded; `grant-qa-cycles.sh` and `accept-qa-residual.sh` restore step-5 snapshots and are unaffected (review 1, C2).
- A `--halt` mode (or sibling script) that snapshots the lock and removes it in one call; every HALT fence calls it; the HALT checklist asserts the lock is absent and the snapshot present before the message shows (obs #49). The fences live in three hand-edited sources found by `git grep -n 'halted_at: \$ts' -- 'skills/*/SKILL.md'`: `skills/develop-story/SKILL.md`, `skills/develop-task/SKILL.md`, `skills/develop-bug/SKILL.md` (the step docs point at them). A test extracts each fence and asserts it calls `advance-pipeline-lock.sh --halt`.
- `no-code-moved` gives one ordered route (obs #75). **Decision at develop (2026-11-15), amending the obs #75 wording:** the script does not refuse on untracked files, because `reenter-qa-after-finalise.test.sh` pins that a document-only fix beside a held-aside untracked file is `no-code-moved`, not `uncommitted-fix` (task.170 QA cycle 4, CR-2: Step 4 restores held-aside files, so an untracked file is the normal state of a branch). What obs #75 objects to is two remedies whose order destroys the first: the step-7 restore consumes the snapshot the commit-and-re-run route needs. So: a clean tree gets only the step-7 route, `advance-pipeline-lock.sh --restore --allow-dod-gaps`, and no note; with untracked files the message names them and gives the commit-and-re-run route **first**, "nothing was consumed", and the step-7 route second, conditioned with "Otherwise". Nothing is consumed on a refusal, so the order is safe. The resume contract's reason table matches. Before editing the message, `git grep -n 'resume at step 7' -- '*.test.*' evals tests` lists every test that pins it.
- The budget base counts distinct `{N}` in the QA Iteration History section only (obs #135), in both scripts (`grep -n '^### QA Cycle' <report>` shows the two heading sets). `lock-present` with the lock live at step 7, the newest DoD reading GAPS and code moved since the gate refuses with a message that says to remove the stale lock with `--halt` and run this script again; it never routes to step 7.
- Before acting on a resume instruction, an executable check, `resume-prompt-check.sh <doc-dir> <step> <cycle>`, compares the named step and cycle to the artefacts on disk (that cycle's gate via `qa-cycle.sh`, the report's QA Cycle heading); if complete, it prints `already complete: {step} {cycle}` and exits 1, and the resume contract tells the orchestrator to stop (obs #95).

### Important Clarifications

- These are shell scripts with `.test.sh` files; mutation proofs follow the repository rule.
- The heading-count fix must agree with task 277's lint (a report holds one H3 per cycle); the count reads distinct N so it is correct either way.

---

## 4. Scope

### In Scope

✅ **Lock and snapshot** changes in `advance-pipeline-lock.sh` and the HALT blocks.
✅ **Re-entry** refusal wording and order, and the budget base in two scripts.
✅ **Resume-prompt check** in the resume contract.
✅ **Tests** per change.

### Out of Scope

❌ **The report lint** (task 277).
❌ **Where `reenter_at` lands** (task 244, merged).

---

## 5. Breaking Changes

### Breaking Change 1: `--restore` refuses a gaps snapshot

**What Changed**: `advance-pipeline-lock.sh --restore` exits non-zero on a DoD-gaps snapshot (`halt_step` 7 and the newest DoD reading ❌ GAPS) unless given `--allow-dod-gaps`.

**Before**: it rebuilt the lock and consumed the snapshot.

**After**: it refuses and names `reenter-qa-after-finalise.sh`.

**Impact**: anything calling `--restore` after a DoD-gaps halt. The caller audit (`git grep -n -- '--restore' -- shared skills ':!docs'`) found: `reenter-qa-after-finalise.sh:276` (passes `--allow-dod-gaps`), `grant-qa-cycles.sh:216` and `accept-qa-residual.sh:101` (step-5 snapshots, unaffected), the `--which` calls at `reenter-qa-after-finalise.sh:141` and `grant-qa-cycles.sh:190` (read-only, never guarded), and operator-facing prose in the resume contract and the SKILL.md files.

**Migration Path**: call the re-entry script, which restores itself; a document-only fix uses `--restore --allow-dod-gaps`.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.276.plan.halts-and-re-entries-leave-and-read-true-state.md](task.276.plan.halts-and-re-entries-leave-and-read-true-state.md)

### Phase 1: HALT helper and the restore guard

**Risk Level**: High

**Files**:
- `shared/resources/advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-step-7-finalise.md`
- `skills/develop-story/SKILL.md`, `skills/develop-task/SKILL.md`, `skills/develop-bug/SKILL.md` (the HALT fences; hand-edited, not bundled)

**Changes**:
- [x] `--halt` snapshot-and-remove; every HALT fence calls it, and a test extracts each fence.
- [x] `--restore` refusal on a DoD-gaps snapshot (`halt_step` 7 + newest DoD ❌ GAPS), with `--allow-dod-gaps` as the one bypass; `--which` stays unguarded.

**Dependencies**: none.

---

### Phase 2: The re-entry script

**Risk Level**: Medium

**Files**:
- `shared/resources/reenter-qa-after-finalise.sh`, its test
- `shared/resources/grant-qa-cycles.sh`, its test
- `shared/resources/develop-pipeline-resume-contract.md`

**Changes**:
- [x] Ordered route per `no-code-moved` message (amended from "untracked-first refusal": task.170 CR-2 pins untracked as never refused on); reason table updated.
- [x] Budget base from distinct N in the QA Iteration History, in both scripts.
- [x] `lock-present` routing at step 7 over a GAPS DoD (names `--halt` then the script; the moved-code half is left to the script's own later measure).

**Dependencies**: none.

---

### Phase 3: The resume-prompt check

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-resume-contract.md`
- `shared/resources/resume-prompt-check.sh`, `resume-prompt-check.test.sh` (new; the test is added to the hand-kept list in `package.json`)

**Changes**:
- [x] `resume-prompt-check.sh` compares a named step and cycle to run state and artefacts; the contract tells the orchestrator to report and stop if complete.

**Dependencies**: none.

---

### Phase 4: Tests, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] Tests with mutation proofs (§ 8); `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/advance-pipeline-lock.sh` - `--halt`, restore guard
2. ✅ `shared/resources/reenter-qa-after-finalise.sh` - refusal order, base, routing
3. ✅ `shared/resources/grant-qa-cycles.sh` - base
4. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-step-7-finalise.md`, `develop-pipeline-resume-contract.md`
4a. ✅ `skills/develop-story/SKILL.md`, `skills/develop-task/SKILL.md`, `skills/develop-bug/SKILL.md` - the HALT fences
4b. ✅ `shared/resources/resume-prompt-check.sh` (new)

### Files to Modify (Tests)

5. ✅ `advance-pipeline-lock.test.sh`, `reenter-qa-after-finalise.test.sh`, `grant-qa-cycles.test.sh`
5a. ✅ `resume-prompt-check.test.sh` (new), registered in the `package.json` test list

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each change and its control.

**Actions**:
- [ ] `--restore` on a `finalise-dod-gaps` snapshot refuses and leaves the snapshot; **control**: a `not-converging` snapshot restores as before.
- [ ] `--halt` leaves no lock and one snapshot; a second call is idempotent.
- [ ] `no-code-moved` on a clean tree prints the step-7 route (`--restore --allow-dod-gaps`) and no commit-and-re-run note; with an untracked file it names the file and prints the commit-and-re-run route before the step-7 route, which is introduced by "Otherwise". **Control**: the held-aside untracked case still reads `no-code-moved`, never `uncommitted-fix` (the existing test).
- [ ] A report holding both heading sets gives base 4 after four cycles, not 8; **controls**: a report with one heading set keeps its base, and a gate ahead of the report keeps the gate's number (the max rule).
- [ ] The re-entry script itself still restores from a DoD-gaps snapshot (it passes `--allow-dod-gaps`), and `--restore --which` still prints the candidate.
- [ ] Each of the three SKILL.md HALT fences, extracted by a test, calls `advance-pipeline-lock.sh --halt`; **mutation**: revert one to the old `jq`/`rm` fence and the test goes red.
- [ ] `resume-prompt-check.sh` on a finished cycle prints `already complete` and exits 1; on the next cycle it exits 0.
- [ ] Mutation proofs for each.

**Command**: `bash shared/resources/advance-pipeline-lock.test.sh` and the two siblings.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] After each HALT path the lock is absent and the snapshot present, shown by the `--halt` test and by the fence-extraction test over the three SKILL.md files, both named in the QA report.
- [ ] `--restore` refuses a gaps snapshot and the re-entry script succeeds from it, shown by a test that runs the two in order and recorded in the QA report.
- [ ] The budget base equals the number of distinct QA cycles on a report with both heading sets, shown by a test.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each change has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `shellcheck` is clean on the changed scripts (`command npm run lint:shell`).

### Migration

- [ ] Every caller of `--restore` is listed with its `git grep` and each is correct under the guard.

---

## 10. Risk Assessment

### High Risk Areas

**1. The lock scripts gate every pipeline run**
- **Risk**: a defect strands every run.
- **Probability**: Medium
- **Impact**: Critical
- **Mitigation**: additive modes, existing `.test.sh` suites run first, mutation proofs, and the `--restore` callers audited before the guard.
- **Rollback**: revert the merge.

### Medium Risk Areas

**1. Base count disagrees with a hand-edited report**
- **Risk**: distinct-N misses a malformed section.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: take max(highest gate, distinct N), as today.
- **Rollback**: revert Phase 2.

### Low Risk Areas

**1. Resume check false-positive**
- **Risk**: a legitimate resume reads as stale.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: it reports and stops; the operator can override by naming the next step.
- **Rollback**: remove the check.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a pipeline run cannot start or resume after the change
- a lock suite is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one phase misbehaves.

**Steps**:
1. Revert that phase's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording or one refusal message.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- a pipeline cannot resume a halted run

**Non-Critical (Forward Fix)**:
- message wording

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-16
**Quality Score**: 92/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.276.qa.3.halts-and-re-entries-leave-and-read-true-state.md](./task.276.qa.3.halts-and-re-entries-leave-and-read-true-state.md)
- **Gate File**: [task.276.gate.3.halts-and-re-entries-leave-and-read-true-state.yml](./task.276.gate.3.halts-and-re-entries-leave-and-read-true-state.yml)

### Test Coverage Summary
- **Tests Executed**: 8504
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
T276-QA-5 is fixed and mutation-proven, and the wall-time criterion is measured at +0.8% (median of five alternating pairs, bound 10%). Two low edge cases in the new relative-lock guard are open and advisory; no writer in the pipeline produces the lock values that trigger them.

## Deferred Work

- **T276-QA-6** (LOW) — carried to gate 3 `recommendations.future` (route 2b, cycle 3): a `./` lock directory is called unresolvable by the relative-lock guard in `resume-prompt-check.sh`; no writer emits it
- **T276-QA-7** (LOW) — carried to gate 3 `recommendations.future` (route 2b, cycle 3): a stale relative lock directory answers `cannot tell` with a message that blames the cwd; the strip expression is written twice

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                          | Author      |
| ---------- | ------- | -------------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #46, #49, #75, #95, #135       | create-task |
| 2026-11-15 | 1.1     | Review passed (8/10 after fixes) — guard re-keyed on halt_step 7 + DoD GAPS (no writer emits `finalise-dod-gaps`); `--allow-dod-gaps` bypass for the re-entry script; HALT sites and resume-prompt check made executable | review-task |
| 2026-11-15 |         | Status → ready-for-development                                       | review-task |
| 2026-11-15 |         | Status → ready-for-review (develop complete; remote CI-parity suite green) |             |
| 2026-11-15 |         | QA gate CONCERNS (80/100) — 4 findings                               | qa-task     |
| 2026-11-15 |         | QA findings fixed, iteration 1 — 3 of 4 closed; wall-time criterion left open | qa-fix      |
| 2026-11-15 |         | QA gate CONCERNS (85/100) — 2 findings                               | qa-task     |
| 2026-11-15 |         | QA findings fixed, iteration 2 — T276-QA-5 closed; wall-time criterion left open | qa-fix      |
| 2026-11-16 |         | QA gate PASS (92/100) — 2 findings; wall-time criterion measured, +0.8% | qa-task     |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: HALT helper and the restore guard
- [ ] `--halt`, restore refusal

### Phase 2: The re-entry script
- [ ] Refusal order, base, routing

### Phase 3: The resume-prompt check
- [ ] Contract text

### Phase 4: Tests, bundle and sweep
- [ ] Mutation proofs, bundle clean

---

## References

- Observation #46 — Lock restore consumes the snapshot the finalise QA re-entry needs
- Observation #49 — QA-loop escalation HALT left the pipeline lock in place with no halt snapshot
- Observation #75 — reenter-qa no-code-moved refusal gives two conflicting remedies
- Observation #95 — Pipeline resume prompts are not checked against run state
- Observation #135 — reenter-qa/grant-qa-cycles count QA Cycle headings across two report sections, doubling the base

---

## Notes

### Important Reminders

Obs #130 and #114 were closed as fixed by task 244.

### Future Improvements

None.

---

**Status:** Ready for Review
