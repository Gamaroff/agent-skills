---
id: task.272
title: "finalise names its preconditions and standalone routes"
type: task
description: "Make finalise state up front what it needs (gate, PR review, open PR) and say what a standalone or post-merge run does, for hand-built work and for a bug fixed outside develop-bug, so a missing input is a one-line answer instead of a mid-run HALT."
tags: [finalise, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 8
---

# Task 272: finalise names its preconditions and standalone routes

**Status:** Planned

---

## 1. Overview

`/finalise` assumes it runs inside `/develop-task`, `/develop-story` or `/develop-bug`, pre-merge. Work built by hand, and a bug fixed outside `/develop-bug` or finalised after merge, hit a mid-run HALT or a silent skip that the skill never warned about (obs #38, #40).

**Scope**: a preflight that lists what is missing before any agent is dispatched, and a defined route for the standalone and post-merge cases.

---

## 2. Motivation

### Current Problems

1. **Hand-built work cannot be accepted** (obs #40). Tasks 208 and 209 were built by hand and merged as PRs #657 and #659. `reviewDecision` was empty and neither task directory had a `*.gate.*.yml` or `*.pr-review.*.md`; Step 6 treats the null decision with no pr-review as a gap, and Step 7's 6b block HALTs with no gate file.
2. **Bug mode assumes a pre-merge develop-bug run** (obs #38). On bug.19, fixed on a plain bugfix branch and finalised after PR #651 merged: `resolve-pr-number.sh` found nothing on `develop` so `--pr` had to be passed by hand; the 7.7 PR-comment block HALTs with no implementation report (no `**Verdict**:` line), observed on DoD run 2; and 6a's acceptance commit would push to the base branch.

### Benefits

1. The user is told what is missing in one line before any agent runs.
2. A standalone or post-merge run has a stated route instead of an improvised one.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/finalise/SKILL.md:87` `#### What bug mode runs and skips` is a key/step table, bound to inline `**Bug mode (\`key\`):**` markers by `evals/shared/tests/finalise-bug-mode.test.mjs`. `pr-comment` is `run` for bugs at `:115` ("`FINAL_GATE` from the verify-loop verdict").
- `skills/finalise/SKILL.md:480` documents the PR-number resolver order (explicit `--pr`, the PR whose head is the current branch via `pr-read.sh`, then the rest); `skills/finalise/references/resolve-pr-number.sh` implements it.
- `:249`–`:358` read QA reports and gate files if present; `:442` is the message when none exist; `:345` handles a `WAIVED` gate (`approved_by`); `:1110` is the "Tests & PR Approved?" column rule using the newest `*.pr-review.*.md`.
- `grep -n -i "preflight" skills/finalise/SKILL.md` shows only `record-preflight` (`:103`, `:536`–`:548`, `finalise-record-preflight.js`), which checks criteria, not these inputs.

### Target Architecture

- **A preconditions preflight** at Step 0 (before any subagent is dispatched): checks a gate file exists or a `WAIVED` record with `approved_by` is present; a pr-review report or a required review decision; the PR state (open or merged). It prints what is missing and the named route: run `/review-pr` and `/qa-task` before merge, or record a `WAIVED` gate with `approved_by` (obs #40).
- **A standalone / post-merge bug route** stated in the bug-mode section: take the PR from the bug's linked PR or require `--pr`; accept the bug file's `#### QA Verification` `**Verification Result**: ✅ Fixed` as the verdict when no implementation report exists; and say where the acceptance commit goes when the branch is already merged (obs #38).

### Important Clarifications

- The preflight informs; it does not waive. A missing gate is not made acceptable.
- `finalise-bug-mode.test.mjs` requires every table key and marker to agree. A new row (`preconditions`) needs both.
- Where the acceptance commit goes post-merge is a design decision: the plan's Phase 1 asks the user.

---

## 4. Scope

### In Scope

✅ **The preflight** and its output.
✅ **The standalone / post-merge bug route** prose and the code it needs (PR from linked issue, verdict from the bug file).
✅ **Tests.**

### Out of Scope

❌ **Auto-waiving** a gate.
❌ **Changing develop-task / develop-story**, which already produce the inputs.

---

## 5. Breaking Changes

None - a run that had every input behaves as before; one that lacked an input halted later, and now stops earlier with a clearer message.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.272.plan.finalise-names-its-preconditions-and-standalone-routes.md](task.272.plan.finalise-names-its-preconditions-and-standalone-routes.md)

### Phase 1: Decide where the post-merge acceptance commit goes

**Risk Level**: Low

**Changes**:
- [ ] Ask the user; record the answer (a branch off `develop` with a PR, or a direct docs commit by policy).

**Dependencies**: none.

---

### Phase 2: The preflight

**Risk Level**: Medium

**Files**:
- `skills/finalise/SKILL.md` Step 0
- a preflight script beside `finalise-record-preflight.js`, with tests

**Changes**:
- [ ] Check the gate / WAIVED, the pr-review or required review, and the PR state; list what is missing and the named route; exit non-zero with a `reason`.

**Dependencies**: none.

---

### Phase 3: Bug standalone / post-merge route

**Risk Level**: High

**Files**:
- `skills/finalise/SKILL.md` bug-mode section and the 7.7 / 6a blocks
- `skills/finalise/references/resolve-pr-number.sh`
- `evals/shared/tests/finalise-bug-mode.test.mjs`

**Changes**:
- [ ] PR from the bug's linked issue or `--pr`.
- [ ] Verdict from `**Verification Result**` when no implementation report exists.
- [ ] Acceptance commit target per Phase 1.

**Dependencies**: Phase 1.

---

### Phase 4: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Tests with mutation proofs; `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 2 and 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/finalise/SKILL.md` - preflight call, bug route
2. ✅ a new preconditions preflight script under `skills/finalise/references/` or `shared/resources/`
3. ✅ `skills/finalise/references/resolve-pr-number.sh` - linked-PR rung

### Files to Modify (Tests)

4. ✅ `evals/shared/tests/finalise-bug-mode.test.mjs` - new table row and marker
5. ✅ a new test for the preflight

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the preflight and the route.

**Actions**:
- [ ] A merged-PR task directory with no gate and no pr-review: the preflight lists both and the named route, exit non-zero. **Control**: the same directory with a `WAIVED` gate holding `approved_by` passes; one with a gate lacking `approved_by` does not.
- [ ] A bug with no implementation report and `**Verification Result**: ✅ Fixed` yields a verdict for 7.7; one with `❌` does not.
- [ ] `resolve-pr-number.sh` finds a bug's PR from its linked issue on `develop` post-merge.
- [ ] Mutation proofs: drop each check; each turns one named test red.

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The preflight names every missing input and the route for the task 208/209 shape, shown by a named test recorded in the QA report.
- [ ] A post-merge bug run completes 7.7 and 6a on the Phase 1 route, shown by a fixture run recorded in the QA report.
- [ ] A run with all inputs present behaves as before (an existing fixture passes unchanged).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each check has a mutation proof in the QA report.
- [ ] `CI=true command node --test evals/shared/tests/finalise-bug-mode.test.mjs` passes.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.

### Migration

- [ ] The bug-mode table and markers agree for the new key (the bug-mode test).

---

## 10. Risk Assessment

### High Risk Areas

**1. The post-merge route weakens acceptance**
- **Risk**: a bug accepted on a verdict line that no pipeline wrote.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: only `✅ Fixed` counts, the PR must be found and merged, and the basis is recorded in the DoD.
- **Rollback**: revert Phase 3.

### Medium Risk Areas

**1. The preflight blocks a valid run**
- **Risk**: a check is stricter than Step 6.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: the preflight reuses Step 6's own rules; the control cases pin it.
- **Rollback**: revert Phase 2.

### Low Risk Areas

**1. Message wording**
- **Risk**: unclear route text.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: forward fix.
- **Rollback**: n/a.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a pipeline finalise run stops on the new preflight
- the bug-mode test is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: only the bug route misbehaves.

**Steps**:
1. Revert Phase 3's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- a healthy pipeline run is blocked

**Non-Critical (Forward Fix)**:
- message text

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                       | Author      |
| ---------- | ------- | ------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #38, #40    | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Decide where the post-merge acceptance commit goes
- [ ] Answer recorded

### Phase 2: The preflight
- [ ] Script, tests, Step 0 call

### Phase 3: Bug standalone / post-merge route
- [ ] PR rung, verdict, commit target

### Phase 4: Evidence, bundle and sweep
- [ ] Mutation proofs, bundle clean

---

## References

- Observation #38 — finalise --bug has no defined path for a bug fixed outside develop-bug or run post-merge
- Observation #40 — finalise cannot accept hand-built work merged outside the pipeline

---

## Notes

### Important Reminders

Tasks 269–271 also edit `skills/finalise/SKILL.md`, at different steps.

### Future Improvements

None.

---

**Status:** Planned
