---
id: task.282
title: "review-task resolves the right task and reports every review"
type: task
description: "Resolve an all-digits review argument as a task id before a GitHub issue number, and key the review-task tracker comment by review number so a second review's verdict reaches the tracker."
tags: [review-task, review-story, tracker-comment, observation]
category: refactoring
status: ready-for-review
pr_number: 921
priority: Medium
created: 2026-11-06
updated: 2026-11-19
estimated_effort_hours: 8
---

# Task 282: review-task resolves the right task and reports every review

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.282.review.1.review-task-resolves-the-right-task-and-reports-every-review.md` implemented 2026-11-18

---

## 1. Overview

Two defects in `review-task` (obs #128, #129): a bare number is read as a GitHub issue, not a task; and a second review's comment is swallowed by the first review's marker, reported as success.

**Scope**: `review-task` and `develop-task` Step 0a (the two that take a bare task number) Input Resolution, and the `review-task`/`review-story`/`review-bug` stage key in `tracker-comment.js`.

---

## 2. Motivation

### Current Problems

1. **`/review-task 243` HALTs on the wrong document** (obs #128, 2026-10-29). The skill treats an all-digits argument as a GitHub issue number. Issue #243 here is an unrelated merged PR, so the lookup found no document and HALTed "No local document found". The user meant `task.243`, which existed only on `feature/task.243.wireframe-component-mapping` in a linked worktree.
2. **A second review cannot report** (obs #129, 2026-10-29, task.243 / #784). `tracker-comment.js` builds its marker from `--stage` alone, so review 2's `--stage review-task` returned `reason: already` (exit 0), and its verdict never reached the tracker. Following the Step 2 rule "skip the `review` comment when the review skill reported `posted` or `already`" literally would have left only review 1's NEEDS REVISION on the issue.

### Benefits

1. A task number resolves to the task, even on another branch.
2. Every review's verdict reaches the tracker.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/review-task/SKILL.md:80` `## Input Resolution`; `:141` lists `# Bare number: 297` as the issue form.
- `shared/resources/tracker-comment.js:100`–`:111`: only cycle-scoped stages (`qa-cycle-N`, `qa-fix-N`) and `pipeline-paused-N` carry a numeric suffix; "every other stage fires at most once per run", which is false for `review-task`.
- The develop pipelines' Step 2 skip rule treats `already` as "this event was posted".

### Target Architecture

- **Resolution**: an all-digits argument resolves as a task id first: `docs/tasks/task.{N}.*/task.{N}.*.md`, then the registry row, then `git worktree list` / `git log --all -- 'docs/tasks/task.{N}.*'` to name the branch or worktree holding it; only then as an issue number. A document found elsewhere is reported and the review runs there. `#297` and URLs stay the unambiguous issue forms (obs #128).
- **Marker**: `review-task`, `review-story` and `review-bug` join `CYCLE_SCOPED_STAGES` (`tracker-comment.js`) and `CYCLE_SCOPED_LEAD_STAGES` (`stakeholder-summary.js`), so `review-task-N` is a known stage. **Call sites always pass `review-task-N`**, where N is the review report number (`next_numbered`, Step 8), and the engine's `canonicalStage()` reads `-1` as the bare marker (`FIRST_ROUND_IS_BARE_STAGES`), so review 1 keeps the bare key an existing marker on a live issue carries and still reads `already`. Passing `-N` everywhere is what lets the call-site guard hold with no exception for review 1. A standalone action-plan-only review writes no report, so it passes the next unused N and a second one reuses that N and dedupes. The Step 2 skip rule treats `already` as posted only for the key this run's report number produced (obs #129).

### Important Clarifications

- The stage list in `tracker-comment.js` is validated and has a lead-catalogue peer (`stakeholder-summary.js`); the new suffix form must be registered in both so the lead test stays green.
- Verified 2026-11-18 (`call-sites.js --engine tracker-comment.js`): `review-story` (`skills/review-story/SKILL.md:2624`) and `review-bug` (`skills/review-bug/SKILL.md:201`) have the same defect; `review-epic` posts no review comment stage. A bare marker does not match a suffixed one (the marker ends at `-->`), so `review-task-2` cannot hit review 1's marker.
- **Bare-number sites**, defined by `git grep -n -i "bare issue number\|all digits" -- shared/resources skills ':!*/references/*'`: in scope `skills/review-task/SKILL.md:91` and `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:99` (develop-task Step 0a). Out of scope: story (ids are `P.E.S`, no flat number), epic (refuses a bare number), PR (a bare number is a PR number by contract).

---

## 4. Scope

### In Scope

✅ **Bare-number resolution** in `review-task` and `develop-task` Step 0a.
✅ **Numbered review stage** for `review-task`, `review-story` and `review-bug`, and the Step 2 skip rule.
✅ **Tests** for both.

### Out of Scope

❌ **Other stages' marker rules.**
❌ **Resolving or replying to existing threads.**

---

## 5. Breaking Changes

None - the engine reads `review-<kind>-1` as the bare stage key, so an existing marker on a live issue still reads `already` for review 1 (held by a test, § 9 Migration). Only review N>=2 gets a marker of its own.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.282.plan.review-task-resolves-the-right-task-and-reports-every-review.md](task.282.plan.review-task-resolves-the-right-task-and-reports-every-review.md)

### Phase 1: Numbered review stage

**Risk Level**: Medium

**Files**:
- `shared/resources/tracker-comment.js`, its tests
- `shared/resources/stakeholder-summary.js`, `tracker-comment-contract.md`
- the comment call sites: `skills/review-task/SKILL.md` (two, Jira and GitHub arms), `skills/review-story/SKILL.md`, `skills/review-bug/SKILL.md`
- prose that states the old rule: the `CYCLE_SCOPED_STAGES` doc comment (`tracker-comment.js`, "Every other stage fires at most once per run") and the `tracker-comment-contract.md` table row for once-per-issue stages (it says a suffix is exit 2 for `review-story` / `review-task`)

**Changes**:
- [x] Add `review-task`, `review-story`, `review-bug` to `CYCLE_SCOPED_STAGES` and `CYCLE_SCOPED_LEAD_STAGES`; call sites always pass `review-task-N` with the report number from `next_numbered`, and `canonicalStage()` maps `-1` to the bare key.

**Dependencies**: none.

---

### Phase 2: Skip rule and bare-number resolution

**Risk Level**: Medium

**Files**:
- `shared/resources/develop-pipeline-step-2-review.md` (the paragraph found by `git grep -n "one event, one writer" -- shared`; edit the shared source only, never a bundled copy)
- `skills/review-task/SKILL.md` Input Resolution
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` develop-task Step 0a (bare issue number)

**Changes**:
- [x] Skip rule keyed to this run's report; task-id-first resolution in both `review-task` and develop-task Step 0a.

**Dependencies**: Phase 1.

---

### Phase 3: Tests, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] Tests with controls (§ 8); `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/tracker-comment.js`, `stakeholder-summary.js`, `tracker-comment-contract.md`
2. ✅ `skills/review-task/SKILL.md` and the pipeline Step 2 doc
3. ✅ `review-story` and `review-bug` call sites; develop-task Step 0a (`develop-pipeline-step-0-resolve-and-prepare.md`)

### Files to Create

3a. ✅ `shared/resources/resolve-bare-task.sh` (the task-id-first resolver the bare-number block runs) and `shared/resources/tests/resolve-bare-task.test.mjs` (resolver and delivered-block tests). Added during implementation and hardened in QA cycles 1 and 2.

### Files to Modify (Tests)

4. ✅ Tests that enumerate or pin the stage list, by name: `shared/resources/tests/tracker-comment.test.mjs` (`isKnownStage` and the exact `CYCLE_SCOPED_STAGES` list assertion, near `:1623`–`:1642`), `shared/resources/tests/stakeholder-summary.test.mjs` (the two-lists-one-rule test, near `:594`), `shared/resources/tests/comment-slot-coverage.test.mjs` (derives from the list; must stay green), `evals/shared/tests/transition-protocol-parity.test.mjs` (marker helper parity, near `:807`). New tests go under `shared/resources/tests/`, which `test:suite` globs; `skills/review-task/tests/` is not in the `test:suite` list and a suite there would run nowhere.

### Files to Modify (Generated)

5. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each change and its control.

**Actions**:
- [x] Two reviews on one issue post two comments; the first review's re-run reads `already`; **control**: before the change the second read `already` (mutation proof).
- [x] `243` resolves to `task.243` when a task document exists, and to an issue only when none does; **control**: `#243` and a URL stay issue forms.
- [x] A task present only on another branch is named with that branch.

**Command**: `CI=true command node --test` on the named files.

### Behavioural Evidence

The resolution rule is prose; evidence is a fresh `/review-task 243`-shaped session on a fixture repo with the task on a side branch.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] A second review's verdict is posted, shown by a named test in the QA report.
- [ ] A bare task number resolves to the task, shown by the fixture session in the QA report.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each code change has a mutation proof in the QA report; a prose-only edit that no test can fail on (the Step 2 skip rule) is named in the report as unprovable instead — amended 2026-11-19, approved by Lorien Gamaroff.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `comment-slot-coverage.test.mjs` passes with the new stage form.

### Migration

- [ ] An existing review marker on a live issue still reads `already` for review 1 (fixture).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. Duplicate comments on re-runs**
- **Risk**: the suffix makes a resume of the same review post twice.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the suffix is the report number, so a resume of review N hits review N's marker.
- **Rollback**: revert Phase 1.

### Low Risk Areas

**1. Resolution order surprises**
- **Risk**: a task and an issue share a number.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: the skill names which it chose; `#N` stays the issue form.
- **Rollback**: revert the wording.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- review comments duplicate on a resume
- the comment suites are red on `develop`

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

**When to Use**: wording.

**Approach**: edit and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- reviews stop reaching the tracker

**Non-Critical (Forward Fix)**:
- wording

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-19
**Quality Score**: 96/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.282.qa.3.review-task-resolves-the-right-task-and-reports-every-review.md](./task.282.qa.3.review-task-resolves-the-right-task-and-reports-every-review.md)
- **Gate File**: [task.282.gate.3.review-task-resolves-the-right-task-and-reports-every-review.yml](./task.282.gate.3.review-task-resolves-the-right-task-and-reports-every-review.yml)

### Test Coverage Summary
- **Tests Executed**: 8614 (full CI run, LAN server; 8611 pass, 0 fail, 3 skipped)
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
The cycle 2 finding (T282-QA-4, the bare-number block's script path) is fixed and verified: two tests run the delivered block from a consumer-shaped checkout and go red when the fix is reverted. No new gating findings; one low advisory item is recorded for later.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                         | Author      |
| ---------- | ------- | --------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #128, #129    | create-task |
| 2026-11-18 | 1.1     | Review passed (8/10) — review-1 key pinned, siblings and tests named, skip-rule grep corrected, review-bug added | review-task |
| 2026-11-18 |         | Status → ready-for-development                      | review-task |
| 2026-11-18 |         | Implemented: numbered review stages, Step 2 skip rule, task-id-first bare-number resolution; `ci:fast` green | develop |
| 2026-11-18 |         | Status → ready-for-review                           | develop |
| 2026-11-18 |         | QA gate CONCERNS (90/100) — 3 medium findings       | qa-task |
| 2026-11-18 |         | QA findings fixed — resolver digit cap, document reconciled, wall time measured (-0.3%), 1 iteration | qa-fix |
| 2026-11-18 |         | QA gate CONCERNS (90/100) — 1 medium finding (cycle 2, refute pass) | qa-task |
| 2026-11-18 |         | QA finding fixed — the bare-number block runs the script by its installed path, 1 iteration | qa-fix |
| 2026-11-19 |         | QA gate PASS (96/100) — no gating findings (cycle 3, scoped re-review) | qa-task |
| 2026-11-19 |         | Success criterion "each change has a mutation proof" amended to "each code change", prose-only edits named as unprovable — approved by Lorien Gamaroff (DoD run 1, AC #4) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Numbered review stage
- [x] Stage, lead, call sites

### Phase 2: Skip rule and bare-number resolution
- [x] Both rules

### Phase 3: Tests, bundle and sweep
- [x] Bundle clean

---

## References

- Observation #128 — /review-task treats a bare number as a GitHub issue, never a task id
- Observation #129 — A second review of the same issue cannot report its outcome: the review-task marker is stage-only

---

## Notes

### Important Reminders

Shares `tracker-comment.js` with other comment tasks; check the registry Notes for ordering.

### Future Improvements

None.

---

**Status:** Ready for Review
