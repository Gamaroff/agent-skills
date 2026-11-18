---
id: task.281
title: "The observation log names what it cannot read"
type: task
description: "Make the observation engine report out-of-enum statuses instead of counting them open, let set-status repair them, give the review cycle a propose-a-task decision, and let a parked entry return to open."
tags: [observe-work, observation]
category: refactoring
status: ready-for-review
pr_number: 920
priority: Medium
created: 2026-11-06
updated: 2026-11-18
estimated_effort_hours: 8
---

# Task 281: The observation log names what it cannot read

**Status:** Ready for Review

---

## 1. Overview

The observation engine and its review cycle have two silent gaps and one missing decision (obs #93, #155). An entry with an illegal status counts as open with no warning and cannot be repaired through the engine. The review cycle has no decision for a cluster that needs an engine change, and a parked entry cannot return to open.

**Scope**: `shared/resources/observation-log.js` (`scan`, `queue`, `doctor`, `set-status`), `skills/observe-work/references/review-cycle.md` and `skills/observe-work/SKILL.md`, their tests and the contract.

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

Verified by `grep` and by running the engine on 2026-11-18 at `develop` `e092cf6eb` (review 1 corrected the 2026-11-06 reading).

- `shared/resources/observation-log.js:733`–`:790` (`cmdQueue`): builds the `statusless` list (`:742`, `:752`, `:781`) from entries with no `status` key. A present-but-illegal value (`status: resolved`) goes to `open` through `statusOf` (`:310`) with no list. `cmdScan` (`:669`) has no `statusless` list; it returns each entry's raw `status`, so an illegal value shows there with nothing flagging it.
- `STATUS_VALUES` (`:98`) holds five values, **including `open`**. `set-status` therefore already accepts `--status open` from any current status with no guard (a dry run on `actioned` and on `parked` entries returns `dry-run`), so "a parked entry cannot return to open" is true only of the prose: `review-cycle.md` and the docs list four statuses. `--expect-status` is validated against the same five values (`:1032`), which is what blocks `--expect-status resolved`.
- `write` and `set-status --status` refuse illegal values (obs #93), so the hole is a hand edit.
- `skills/observe-work/references/review-cycle.md` is an **authored** reference (tracked there; `skills/observe-work/tests/observe-work.test.js` lists it among the five authored references). `shared/resources/review-cycle.md` does not exist. It offers four decisions: apply, decline, park and carry (obs #155).

### Target Architecture

- `queue` and `scan` return a top-level `invalidStatus` list (entry file names) beside `statusless` (in `queue`); the entry is still counted open; `doctor` gains a `status-legal` check that fails, naming the files, when the list is not empty (obs #93 items 1 and 3).
- `set-status` gains a `--repair` flag (obs #93 item 2): `--repair --expect-status <the illegal literal>` repairs an entry reading `resolved`. `--repair` refuses a legal literal and a missing guard (exit 2), and without it an unknown `--expect-status` stays a usage error — the existing test `set-status --expect-status refuses when the entry changed…` pins that, so relaxing `--expect-status` was not an option (review 1 first chose it, then the develop step found the pin). A mistyped literal under `--repair` writes nothing (`status-changed`, exit 1).
- `set-status --status open` is accepted only with `--expect-status parked`; any other use exits 2 `usage`, naming the rule (obs #155). This tightens a transition the engine accepts today without a guard; no existing caller uses it (`git grep -- '--status open'` finds none). No new `reason` value.
- `skills/observe-work/references/review-cycle.md` gains a fifth decision, "propose a task": the entry stays open, the summary names the cut and its ids, and `/create-task --from-observation` runs only on the user's yes; Step 7 says a scoped review records its scope (obs #155). `skills/observe-work/SKILL.md`'s Session Start `doctor` table gains a `status-legal` row.

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
- [x] `invalidStatus` in `scan`/`queue`; `doctor` count.

**Dependencies**: none.

---

### Phase 2: set-status repair and reopen

**Risk Level**: Medium

**Files**:
- `shared/resources/observation-log.js`, its tests

**Changes**:
- [x] Repair path (`--repair --expect-status <illegal literal>`); `open` only from `parked`.

**Dependencies**: none.

---

### Phase 3: The review cycle

**Risk Level**: Low

**Files**:
- `skills/observe-work/references/review-cycle.md` (authored in place; not a bundled copy)
- `skills/observe-work/SKILL.md` (the Session Start `doctor` table)

**Changes**:
- [x] Propose-a-task decision; scoped-review note; `status-legal` row.

**Dependencies**: none.

---

### Phase 4: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] `command npm run bundle`, `command npm run bundle:check`; mutation proofs.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/observation-log.js` - lists, repair, reopen
2. ✅ `shared/resources/observation-log-contract.md` - new fields
3. ✅ `skills/observe-work/references/review-cycle.md` - fifth decision, scoped-review note
4. ✅ `skills/observe-work/SKILL.md` - `status-legal` row in the Session Start `doctor` table

### Files to Modify (Tests)

5. ✅ the observation-log engine tests: `shared/resources/tests/observation-log.test.mjs`

### Files to Modify (Generated)

5. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each engine change and its control.

**Actions**:
- [x] An entry with `status: resolved` appears in `invalidStatus` in `queue` and in `scan`, is still counted open, and makes `doctor`'s `status-legal` check fail naming the file; **control**: a legal-status log has an empty list and a passing check (including an entry with no `status:`, which is `statusless`, not invalid).
- [x] `set-status --repair --expect-status resolved --status actioned` repairs it; **control**: a mistyped literal under `--repair` (`resolvd`) exits 1 `status-changed` and writes nothing; `--repair` with a legal literal or with no guard exits 2; and without `--repair` an unknown `--expect-status` is still exit 2.
- [x] `set-status --status open --expect-status parked` returns the entry to open and clears `parked_until`; **control**: `--status open` on an `actioned` entry, on an `open` entry, and with no guard each exit 2 `usage`, and nothing is written.
- [x] Mutation proofs for each: make `isInvalidStatus` return false, apply the enum check under `--repair`, drop the `parked` requirement on `open`, make the doctor check always pass; each turns its named test red.
- [x] `skills/observe-work/tests/observe-work.test.js` asserts `review-cycle.md` names the fifth decision and the scoped-review rule (a documentation criterion, held by a test that reads the file).

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle:check`.

---

## 9. Success Criteria

### Functional

- [ ] The #44 shape is named and repairable, shown by named tests in the QA report.
- [ ] A parked entry returns to open, and no other status does, shown by named tests in the QA report.
- [ ] `skills/observe-work/references/review-cycle.md` lists five decisions (grep in the QA report).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each change has a mutation proof in the QA report.
- [ ] `command npm run bundle:check` reports 0 problems; `CI=true command npm test` passes.
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
- **Mitigation**: the `--expect-status parked` guard; `open` is refused from every other status.
- **Rollback**: remove the transition.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `scan` or `queue` output breaks a consumer
- the engine suite is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle:check`.

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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-18
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.281.qa.3.observation-log-names-what-it-cannot-read.md](./task.281.qa.3.observation-log-names-what-it-cannot-read.md)
- **Gate File**: [task.281.gate.3.observation-log-names-what-it-cannot-read.yml](./task.281.gate.3.observation-log-names-what-it-cannot-read.yml)

### Test Coverage Summary
- **Tests Executed**: 8601 (remote ci:fast, 8598 pass, 0 fail)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No blocking findings. The cycle-2 finding is closed; one low doc cleanup is recorded as a follow-up.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                         | Author      |
| ---------- | ------- | --------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #93, #155     | create-task |
| 2026-11-18 | 1.1     | Review passed (8/10) after fixes: review-cycle.md path corrected to the skill's authored reference; line anchors moved to cmdQueue; `open` already accepted by set-status, so the task now tightens it to parked-only; repair via relaxed `--expect-status`; `status-legal` doctor check and SKILL.md row added | review-task |
|            |         | Status → ready-for-development                      | review-task |
| 2026-11-18 |         | Implemented — 10 files, 7 engine tests + 3 skill tests; repair route changed from a relaxed `--expect-status` to a `--repair` flag because an existing test pins the usage error | develop |
| 2026-11-18 |         | QA gate CONCERNS (90/100) — 2 medium findings (CHANGELOG entry, wall-time criterion unmeasured) | qa-task |
| 2026-11-18 |         | QA findings fixed — CHANGELOG entry added, wall time measured (741 s develop vs 735 s branch); 1 iteration | qa-fix |
| 2026-11-18 |         | QA gate CONCERNS (90/100) — 1 medium finding (doctor status-legal passes an unreadable log) | qa-task |
| 2026-11-18 |         | QA findings fixed — doctor status-legal fails on an unreadable log; 1 iteration | qa-fix |
| 2026-11-18 |         | QA gate PASS (100/100) — 0 findings; 1 advisory cleanup recorded | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Invalid status is named
- [x] Lists and doctor

### Phase 2: set-status repair and reopen
- [x] Both transitions

### Phase 3: The review cycle
- [x] Fifth decision

### Phase 4: Bundle and sweep
- [x] Bundle clean

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

**Status:** Ready for Review
