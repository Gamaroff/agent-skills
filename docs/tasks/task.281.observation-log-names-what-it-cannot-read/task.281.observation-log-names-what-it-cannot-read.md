---
id: task.281
title: "The observation log names what it cannot read"
type: task
description: "Make the observation engine report out-of-enum statuses instead of counting them open, let set-status repair them, give the review cycle a propose-a-task decision, and let a parked entry return to open."
tags: [observe-work, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 8
---

# Task 281: The observation log names what it cannot read

**Status:** Planned

---

## 1. Overview

The observation engine and its review cycle have two silent gaps and one missing decision (obs #93, #155). An entry with an illegal status counts as open with no warning and cannot be repaired through the engine. The review cycle has no decision for a cluster that needs an engine change, and a parked entry cannot return to open.

**Scope**: `shared/resources/observation-log.js` (`scan`, `queue`, `doctor`, `set-status`), `review-cycle.md`, their tests and the contract.

---

## 2. Motivation

### Current Problems

1. **An out-of-enum status reads as open** (obs #93). The 2026-10-23 review found entry #44 with `status: resolved`, not one of `open | actioned | declined | superseded | parked`. `archive` returned `already`, `queue` counted it open (78 = 77 real + #44) with no warning, and `set-status` could not repair it.
2. **No decision for an engine-change cluster** (obs #155). The 2026-11-04 review of the `finalise` cluster could stage only 3 of 21 entries. Apply means staging, park needs `parked_until` with no value before a task exists, and cutting a task creates a tracker issue. Practice moved to "cut from observations" (tasks 238, 239, 242, 245, 248, 249, 251) without a documented decision.
3. **A parked entry cannot return to open** (obs #155). `set-status` takes `actioned`, `declined`, `superseded` and `parked`; #43's part (b) had to be carried into #32 by hand.
4. **A scoped review quiets the Session Start offer** (obs #155). Step 7 stamps the date for a review scoped to one skill while 87 entries stayed open.

### Benefits

1. A hand-edited illegal status is visible and repairable.
2. The review cycle states how a cluster becomes a task.
3. The review date means what it says.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `shared/resources/observation-log.js:742`–`:781`: `scan` builds a `statusless` list (`:742`, `:752`, `:781`) from entries with no `status` key; there is no list for a present-but-illegal value `(unverified: the plan reads :735–:790 for how queue classifies)`.
- `set-status` accepts four statuses and `--expect-status`; `write` and `set-status` refuse illegal values (obs #93), so the hole is a hand edit.
- `skills/observe-work/references/review-cycle.md` offers apply, decline, park and carry (obs #155); `grep -n -i "propose" shared/resources/review-cycle.md` is the plan's first read.

### Target Architecture

- `scan` and `queue` return an `invalidStatus` list beside `statusless`; they still count the entry open; `doctor` reports its count (obs #93 items 1 and 3).
- `set-status` accepts `--expect-status` with any literal when the current value is outside the enum, or a `--repair` flag (obs #93 item 2).
- `set-status` accepts `open` from `parked` (obs #155), recorded with the same `--expect-status` guard.
- `review-cycle.md` gains a fifth decision, "propose a task": the entry stays open, the summary names the cut and its ids, and `/create-task --from-observation` runs only on the user's yes; Step 7 says a scoped review records its scope (obs #155).

### Important Clarifications

- Treating an illegal status as open stays right; the change is that it is no longer silent.
- The engine's `reason` contract holds: exit codes and `reason` values already in the contract do not change; new fields are additive.

---

## 4. Scope

### In Scope

✅ **`invalidStatus`** in `scan`, `queue`, `doctor`.
✅ **`set-status`** repair and `parked → open`.
✅ **`review-cycle.md`** fifth decision and the scoped-review note.
✅ **Contract and tests.**

### Out of Scope

❌ **Changing the status enum.**
❌ **The scoped-review date logic** beyond stating its scope in the file (the plan decides whether a second date file is needed).

---

## 5. Breaking Changes

None - new fields and a newly accepted transition.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.281.plan.observation-log-names-what-it-cannot-read.md](task.281.plan.observation-log-names-what-it-cannot-read.md)

### Phase 1: Invalid status is named

**Risk Level**: Medium

**Files**:
- `shared/resources/observation-log.js`, its tests
- `shared/resources/observation-log-contract.md`

**Changes**:
- [ ] `invalidStatus` in `scan`/`queue`; `doctor` count.

**Dependencies**: none.

---

### Phase 2: set-status repair and reopen

**Risk Level**: Medium

**Files**:
- `shared/resources/observation-log.js`, its tests

**Changes**:
- [ ] Repair path; `parked → open`.

**Dependencies**: none.

---

### Phase 3: The review cycle

**Risk Level**: Low

**Files**:
- `shared/resources/review-cycle.md`

**Changes**:
- [ ] Propose-a-task decision; scoped-review note.

**Dependencies**: none.

---

### Phase 4: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] `command npm run bundle`, `command npm run bundle -- --check`; mutation proofs.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/observation-log.js` - lists, repair, reopen
2. ✅ `shared/resources/observation-log-contract.md` - new fields
3. ✅ `shared/resources/review-cycle.md` - fifth decision

### Files to Modify (Tests)

4. ✅ the observation-log engine tests under `shared/resources/tests/`

### Files to Modify (Generated)

5. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each engine change and its control.

**Actions**:
- [ ] An entry with `status: resolved` appears in `invalidStatus` and is counted open; **control**: a legal-status log has an empty list.
- [ ] `set-status` repairs it with the guard; **control**: without the guard or on a legal entry it refuses as before.
- [ ] `parked → open` succeeds with `--expect-status parked`; **control**: `actioned → open` still refuses.
- [ ] Mutation proofs for each.

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The #44 shape is named and repairable, shown by named tests in the QA report.
- [ ] A parked entry returns to open, shown by a named test.
- [ ] `review-cycle.md` lists five decisions (grep in the QA report).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each change has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `command node shared/resources/observation-log.js doctor --json` runs clean against the live log.

### Migration

- [ ] Existing `--json` consumers still parse the output (the existing engine tests pass unchanged).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. A new field breaks a strict consumer**
- **Risk**: a reader rejects unknown keys.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: grep every consumer of `scan --json`; fields are additive.
- **Rollback**: revert Phase 1.

### Low Risk Areas

**1. Reopen misused**
- **Risk**: parked work reopened by habit.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the guard and a resolution note.
- **Rollback**: remove the transition.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `scan` or `queue` output breaks a consumer
- the engine suite is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one phase misbehaves.

**Steps**:
1. Revert that phase and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording or one flag.

**Approach**: edit and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- the review cycle cannot read the log

**Non-Critical (Forward Fix)**:
- wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                         | Author      |
| ---------- | ------- | --------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #93, #155     | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Invalid status is named
- [ ] Lists and doctor

### Phase 2: set-status repair and reopen
- [ ] Both transitions

### Phase 3: The review cycle
- [ ] Fifth decision

### Phase 4: Bundle and sweep
- [ ] Bundle clean

---

## References

- Observation #93 — Queue silently counts an out-of-enum status as open, and set-status cannot repair it
- Observation #155 — Review cycle has no decision for a cluster that needs engine changes

---

## Notes

### Important Reminders

The "propose a task" decision documents what this repository already does; it adds no tracker step.

### Future Improvements

None.

---

**Status:** Planned
