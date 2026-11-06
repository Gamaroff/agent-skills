---
id: task.282
title: "review-task resolves the right task and reports every review"
type: task
description: "Resolve an all-digits review argument as a task id before a GitHub issue number, and key the review-task tracker comment by review number so a second review's verdict reaches the tracker."
tags: [review-task, review-story, tracker-comment, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 8
---

# Task 282: review-task resolves the right task and reports every review

**Status:** Planned

---

## 1. Overview

Two defects in `review-task` (obs #128, #129): a bare number is read as a GitHub issue, not a task; and a second review's comment is swallowed by the first review's marker, reported as success.

**Scope**: `review-task` (and siblings that take a bare number) Input Resolution, and the `review-task`/`review-story` stage key in `tracker-comment.js`.

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
- **Marker**: the `review-task` (and `review-story`) stage takes the review report number as its suffix, like the cycle-scoped stages; the Step 2 skip rule treats `already` as posted only when the marker it hit belongs to this run's report (obs #129).

### Important Clarifications

- The stage list in `tracker-comment.js` is validated and has a lead-catalogue peer (`stakeholder-summary.js`); the new suffix form must be registered in both so the lead test stays green.
- Whether `review-story`, `review-bug` and `review-epic` have the same defect is `(unverified: the plan greps their stage use)`.

---

## 4. Scope

### In Scope

✅ **Bare-number resolution** in `review-task` and the siblings that share the wording.
✅ **Numbered review stage** and the Step 2 skip rule.
✅ **Tests** for both.

### Out of Scope

❌ **Other stages' marker rules.**
❌ **Resolving or replying to existing threads.**

---

## 5. Breaking Changes

None - the first review's stage key may change shape; the plan checks that an existing marker on a live issue still reads `already` for review 1.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.282.plan.review-task-resolves-the-right-task-and-reports-every-review.md](task.282.plan.review-task-resolves-the-right-task-and-reports-every-review.md)

### Phase 1: Numbered review stage

**Risk Level**: Medium

**Files**:
- `shared/resources/tracker-comment.js`, its tests
- `shared/resources/stakeholder-summary.js`, `tracker-comment-contract.md`
- the `review-task` and `review-story` comment call sites

**Changes**:
- [ ] Stage suffix; lead catalogue entry; call sites pass the report number.

**Dependencies**: none.

---

### Phase 2: Skip rule and bare-number resolution

**Risk Level**: Medium

**Files**:
- `shared/resources/develop-pipeline-step-2-review.md` (or the file `git grep -n "reported .posted. or .already."` names)
- `skills/review-task/SKILL.md` Input Resolution

**Changes**:
- [ ] Skip rule keyed to this run's report; task-id-first resolution.

**Dependencies**: Phase 1.

---

### Phase 3: Tests, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Tests with controls (§ 8); `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/tracker-comment.js`, `stakeholder-summary.js`, `tracker-comment-contract.md`
2. ✅ `skills/review-task/SKILL.md` and the pipeline Step 2 doc
3. ✅ `review-story` call site

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/comment-slot-coverage.test.mjs` and the `tracker-comment` tests

### Files to Modify (Generated)

5. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each change and its control.

**Actions**:
- [ ] Two reviews on one issue post two comments; the first review's re-run reads `already`; **control**: before the change the second read `already` (mutation proof).
- [ ] `243` resolves to `task.243` when a task document exists, and to an issue only when none does; **control**: `#243` and a URL stay issue forms.
- [ ] A task present only on another branch is named with that branch.

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

- [ ] Each change has a mutation proof in the QA report.
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

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                         | Author      |
| ---------- | ------- | --------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #128, #129    | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Numbered review stage
- [ ] Stage, lead, call sites

### Phase 2: Skip rule and bare-number resolution
- [ ] Both rules

### Phase 3: Tests, bundle and sweep
- [ ] Bundle clean

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

**Status:** Planned
