---
id: task.276
title: "Halts and re-entries leave and read true state"
type: task
description: "Make every pipeline HALT snapshot and clear its lock mechanically, stop a restore consuming the snapshot a re-entry needs, give the re-entry refusal one remedy, count QA cycles once, and check a resume prompt against run state."
tags: [develop-task, finalise, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 16
---

# Task 276: Halts and re-entries leave and read true state

**Status:** Planned

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

- `--restore` refuses when the candidate snapshot's `halt_reason` is `finalise-dod-gaps`, naming `reenter-qa-after-finalise.sh` as the entry point (obs #46 option 1).
- A `--halt` mode (or sibling script) that snapshots the lock and removes it in one call; the Loop Escalation block and the DoD-gaps HALT call it; the HALT checklist asserts the lock is absent and the snapshot present before the message shows (obs #49).
- `no-code-moved` checks untracked files first: with any, refuse `uncommitted-fix`-style (commit, then re-run) and give no step-7 route; only a clean tree gets the step-7 route (obs #75). The resume contract's reason table matches.
- The budget base counts distinct `{N}` in the QA Iteration History section only (obs #135), in both scripts; `lock-present` with the lock live at step 7 and the newest DoD reading GAPS with code moved does not route to step 7.
- Before acting on a resume instruction, compare its step and cycle to the run-state file and the artefacts on disk (that cycle's gate, the report's QA Cycle heading); if complete, report that and stop (obs #95).

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

**What Changed**: `advance-pipeline-lock.sh --restore` exits non-zero on a `finalise-dod-gaps` snapshot.

**Before**: it rebuilt the lock and consumed the snapshot.

**After**: it refuses and names `reenter-qa-after-finalise.sh`.

**Impact**: anything calling `--restore` after a DoD-gaps halt.

**Migration Path**: call the re-entry script, which restores itself; the plan greps every `--restore` caller first.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.276.plan.halts-and-re-entries-leave-and-read-true-state.md](task.276.plan.halts-and-re-entries-leave-and-read-true-state.md)

### Phase 1: HALT helper and the restore guard

**Risk Level**: High

**Files**:
- `shared/resources/advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-step-7-finalise.md`

**Changes**:
- [ ] `--halt` snapshot-and-remove; both HALT blocks call it.
- [ ] `--restore` refusal on `finalise-dod-gaps`.

**Dependencies**: none.

---

### Phase 2: The re-entry script

**Risk Level**: Medium

**Files**:
- `shared/resources/reenter-qa-after-finalise.sh`, its test
- `shared/resources/grant-qa-cycles.sh`, its test
- `shared/resources/develop-pipeline-resume-contract.md`

**Changes**:
- [ ] Untracked-first refusal; one remedy per message; reason table updated.
- [ ] Budget base from distinct N in the QA Iteration History, in both scripts.
- [ ] `lock-present` routing at step 7 with GAPS and moved code.

**Dependencies**: none.

---

### Phase 3: The resume-prompt check

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-resume-contract.md`

**Changes**:
- [ ] Compare a named step and cycle to run state and artefacts before acting; report and stop if complete.

**Dependencies**: none.

---

### Phase 4: Tests, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Tests with mutation proofs (§ 8); `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/advance-pipeline-lock.sh` - `--halt`, restore guard
2. ✅ `shared/resources/reenter-qa-after-finalise.sh` - refusal order, base, routing
3. ✅ `shared/resources/grant-qa-cycles.sh` - base
4. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-step-7-finalise.md`, `develop-pipeline-resume-contract.md`

### Files to Modify (Tests)

5. ✅ `advance-pipeline-lock.test.sh`, `reenter-qa-after-finalise.test.sh`, `grant-qa-cycles.test.sh`

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each change and its control.

**Actions**:
- [ ] `--restore` on a `finalise-dod-gaps` snapshot refuses and leaves the snapshot; **control**: a `not-converging` snapshot restores as before.
- [ ] `--halt` leaves no lock and one snapshot; a second call is idempotent.
- [ ] `no-code-moved` with an untracked file never prints the step-7 route; with a clean tree it does, and never both.
- [ ] A report holding both heading sets gives base 4 after four cycles, not 8.
- [ ] A resume naming a finished cycle reports and stops; one naming the next cycle proceeds.
- [ ] Mutation proofs for each.

**Command**: `bash shared/resources/advance-pipeline-lock.test.sh` and the two siblings.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] After each HALT path the lock is absent and the snapshot present, shown by tests for both paths named in the QA report.
- [ ] `--restore` refuses a gaps snapshot and the re-entry script succeeds from it, shown by a test that runs the two in order.
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

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                          | Author      |
| ---------- | ------- | -------------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #46, #49, #75, #95, #135       | create-task |
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

**Status:** Planned
