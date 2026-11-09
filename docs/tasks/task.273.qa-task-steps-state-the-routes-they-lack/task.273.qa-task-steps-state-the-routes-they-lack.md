---
id: task.273
title: "qa-task steps state the routes they lack"
type: task
description: "Add the missing routes to qa-task Steps 3b and 3c (docs-only review, reproduced medium finding, reviewer scratch directory, no mutation beside a running suite) and a vacuous-tool-criterion probe, so each QA cycle stops improvising them."
tags: [qa-task, qa-story, review-task, create-task, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-09
estimated_effort_hours: 8
---

# Task 273: qa-task steps state the routes they lack

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.273.review.1.qa-task-steps-state-the-routes-they-lack.md` implemented 2026-11-09

---

## 1. Overview

Five situations recur in QA cycles that `qa-task` Steps 3b and 3c do not cover, so each cycle improvises (obs #64, #74, #78, #116, #125). This task states the route for each, in `qa-task` and its sibling `qa-story`.

**Scope**: prose in `qa-task`, `qa-story`, `code-review-prompt.md` and `mutation-proving.md`, plus the review-time half of obs #78.

---

## 2. Motivation

### Current Problems

1. **Mutation beside a running suite** (obs #64). On task.189 cycle 6 mutation proofs ran on the working tree while `npm run ci:fast` ran in the background; the suite reported one failure (`tests/bundle-missing-source.test.js` at 53012 ms against a 20000 ms budget) that passed alone in 3145 ms.
2. **No docs-only review path** (obs #74). Task 196 changed 15 Markdown docs and no code; all four cycles improvised a substitute for Step 3b's code review, each with its own scope.
3. **A reproduced medium finding has no route** (obs #125). Step 3b promotes only `category: bug` with `confidence: high`; on task.242 cycle 7 QA reproduced a medium-confidence finding by execution and the skill said nothing.
4. **The reviewer can overwrite the caller's probes** (obs #116). On task.238 cycle 9 a "read-only" reviewer prepended a line to QA's extracted probe script; 18 probes read `unreadable` and only a calibration case showed the instrument had changed.
5. **A criterion that cannot fail** (obs #78). task.198's SC-5, `prettier --check` on Markdown, passed in three QA cycles because `.prettierignore` excludes `*.md`, `*.yml`, `*.yaml` and `*.json`.

### Benefits

1. Each cycle takes the stated route, so cycles are comparable.
2. A false green from a changed instrument or a vacuous criterion is caught.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`; line numbers re-measured on 2026-11-09 at `develop` `22f13cce` by review (they drift within days, so re-grep the heading text, not the number).

- `skills/qa-task/SKILL.md:444` `### Step 3b: Diff Code Review` and `:882` `### Step 3c: Mutation-Proof Spot Check`; `skills/qa-story/SKILL.md:945` `#### Phase 1.6: Diff Code Review`.
- `:890`: "Run the proofs after the Step 3b diff reviewer has returned, or in a scratch worktree" covers a live reviewer, not a backgrounded suite or fast gate (obs #64).
- `:456` and `:678` use `mktemp` for QA's own files; nothing gives the reviewer its own directory. Confirmed 2026-11-09: `grep -n "scratch\|mktemp" shared/resources/code-review-prompt.md` returns no hits.
- `grep -n -E "confidence: high" skills/qa-task/SKILL.md` shows the promotion rule (`:867`); `:1430` states code-review findings do not enter `top_issues` by default.
- `ci.docsOnly.patterns` is defined in `docs/reference/configuration.md:297`; default `["**/*.md", "docs/**"]`. A `skills-config.yaml` anywhere in the delta, a path in an unusual form and a submodule pointer are never docs, whatever the patterns say (same file, `:423`).
- Obs #78: `.prettierignore` excludes the four types (stated by the observation).

### Target Architecture

- **Step 3c**: a mutation runs only when no other process reads the tree (no reviewer, no backgrounded suite or gate); otherwise wait or mutate in a scratch worktree (`git worktree add --detach`); a suite result that overlapped a mutation window is re-run before it is recorded. Also in `mutation-proving.md`.
- **Step 3b docs-only branch**: when every changed path matches `ci.docsOnly.patterns`, dispatch a fixed claim-verification prompt that checks each changed claim against the source it names and returns the same findings YAML; record the branch in Review Methodology.
- **Reproduced finding**: a code-review finding QA reproduces by execution enters `top_issues[]` as a QA finding whatever the reviewer's confidence; confidence stays recorded unchanged; reproduction and control go in the QA report; the entry names its origin. Unreproduced medium stays advisory.
- **Reviewer scratch**: when the reviewer may execute anything, give it its own `mktemp -d` named in the prompt and forbid writes outside it; any probe the caller runs while a reviewer is live starts with a known-good calibration case.
- **Vacuous criterion**: `qa-task` confirms a "tool X passes on files Y" criterion by one probe that X processes Y (a deliberately malformed copy, or the tool's file count) before recording PASS; `review-task` and `create-task` flag a criterion naming a tool on a file type an ignore file excludes.

### Important Clarifications

- Task 267 also adds `review-task` checks; the obs #78 review-side check is added there by number. Task 267 is `accepted` and merged (checked 2026-11-09), so Phase 3 starts from `develop` and takes the next free check number after 267's.
- **Docs-only test.** The docs-only branch reuses the `ci.docsOnly` rule as `docs/reference/configuration.md` states it, including its never-docs exceptions; it does not write a second glob matcher. With the key unset it applies the documented default patterns. A change set that touches `skills-config.yaml` is not docs-only.
- **Tests that react to the edited prose and the new file.** Run, and edit only where a pinned phrase moves: `evals/shared/tests/mutation-proving-pointers-parity.test.mjs`, `qa-execution-step-parity.test.mjs`, `probes-executed-population.test.mjs`, `qa-re-review-scope-parity.test.mjs`, `qa-gate-preconditions-parity.test.mjs`, `shared/resources/tests/payload-heredoc-ratchet.test.mjs`, `tests/explore-prompts-no-write.test.js`, `skills/qa-task/tests/status-vocabulary.test.js`. The new `shared/resources/qa-docs-only-review-prompt.md` must be cited from `qa-task` and `qa-story` or `bundle --check` reports it `UNREACHED`; found by `git grep -l -E "qa-task/SKILL|qa-story/SKILL|code-review-prompt|mutation-proving" -- '*.test.*' 'tests/**' 'evals/**'`.
- A reviewer's confidence is never edited (the existing rule).

---

## 4. Scope

### In Scope

✅ **qa-task and qa-story** prose for the five routes.
✅ **`code-review-prompt.md`** scratch rule.
✅ **`mutation-proving.md`** overlap rule.
✅ **review-task / create-task** one check for obs #78.
✅ **Behavioural evidence** with controls.

### Out of Scope

❌ **Engine changes** (task 274).
❌ **Gate wording** (task 275).

---

## 5. Breaking Changes

None - prose only. A docs-only change set takes a new review branch instead of an improvised one.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.273.plan.qa-task-steps-state-the-routes-they-lack.md](task.273.plan.qa-task-steps-state-the-routes-they-lack.md)

### Phase 1: Step 3c and the reviewer

**Risk Level**: Low

**Files**:
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`
- `shared/resources/mutation-proving.md`, `shared/resources/code-review-prompt.md`

**Changes**:
- [x] The no-overlap rule and the re-run rule (obs #64).
- [x] The reviewer's own scratch directory and the calibration-first rule (obs #116). The reviewer creates its own `mktemp -d` (no new placeholder, so `review-code` and `review-pr`, which also dispatch this prompt, need no change).

**Dependencies**: none.

---

### Phase 2: The two Step 3b routes

**Risk Level**: Medium

**Files**:
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`
- a new fixed prompt under `shared/resources/` for the docs-only branch

**Changes**:
- [x] Docs-only branch and its prompt (obs #74).
- [x] Reproduced-finding route (obs #125).

**Dependencies**: none.

---

### Phase 3: The vacuous criterion

**Risk Level**: Low

**Files**:
- `skills/qa-task/SKILL.md`
- `skills/review-task/SKILL.md`, `skills/create-task/SKILL.md`

**Changes**:
- [x] The "tool X processes Y" probe and the review-time flag (obs #78).

**Dependencies**: task 267 merged, or a merge of `develop`.

---

### Phase 4: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Fixtures with controls (§ 8); `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-task/SKILL.md` - Step 3b, 3c, criterion probe
2. ✅ `skills/qa-story/SKILL.md` - Phase 1.6 mirror
3. ✅ `shared/resources/mutation-proving.md` - overlap rule
4. ✅ `shared/resources/code-review-prompt.md` - scratch rule
5. ✅ a new docs-only claim-verification prompt under `shared/resources/`
6. ✅ `skills/review-task/SKILL.md`, `skills/create-task/SKILL.md` - one check each

### Files to Modify (Generated)

7. ✅ bundled copies under `skills/*/references/`

### Files to Modify (Tests)

None authored; the shared prompt-contract tests are run, not edited, unless a pinned phrase moves.

---

## 8. Testing Strategy

### Behavioural Evidence

**Scope**: each route is taken on its shape and not on a control.

**Actions**:
- [ ] Step 3c: a cycle with a backgrounded suite waits or uses a worktree; **control**: a cycle with no background process mutates in place.
- [ ] Docs-only: a change set of Markdown only takes the branch; a set with one code file does not.
- [ ] Reproduced finding: a medium finding QA reproduces enters `top_issues[]` with origin and unchanged confidence; an unreproduced medium stays advisory.
- [ ] Reviewer scratch: a reviewer told it may execute is given a `mktemp -d` and does not write outside it.
- [ ] Criterion probe: `prettier --check` on a `.md` file is flagged; a check that processes the file is not.

**Command**: a fresh session running the step on each fixture; results in the QA report.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] Each of the five routes is present in `qa-task` and `qa-story` (where it applies), citing its observation; the list is in the QA report.
- [ ] Each fires on its fixture and not on its control, recorded per route in the QA report.
- [ ] The docs-only prompt returns the same findings YAML shape as `code-review-prompt.md`, shown by a run recorded in the QA report.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, taken on the PR's head commit and recorded in the QA report.

### Code Quality

- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `python skills/create-skill/scripts/quick_validate.py` passes for qa-task, qa-story, review-task and create-task.

### Migration

- [ ] No QA report written after the change improvises a docs-only substitute (checked on the next docs-only task's QA report).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The reproduced-finding route inflates the gate**
- **Risk**: reviewer findings reach `top_issues[]` too easily.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: only a finding QA reproduces by execution with a control enters; unreproduced stays advisory.
- **Rollback**: revert the route.

### Low Risk Areas

**1. A fixed docs-only prompt misses a claim kind**
- **Risk**: less coverage than the improvised review.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: it checks each changed claim against its named source; forward fix on a miss.
- **Rollback**: forward fix.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a skill fails `quick_validate.py`
- `bundle --check` is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one route misbehaves.

**Steps**:
1. Remove that route and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- red `develop` caused by the edit

**Non-Critical (Forward Fix)**:
- a route's wording

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-09
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.273.qa.3.qa-task-steps-state-the-routes-they-lack.md](./task.273.qa.3.qa-task-steps-state-the-routes-they-lack.md)
- **Gate File**: [task.273.gate.3.qa-task-steps-state-the-routes-they-lack.yml](./task.273.gate.3.qa-task-steps-state-the-routes-they-lack.yml)

### Test Coverage Summary
- **Tests Executed**: 3
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 1's CHANGELOG finding and cycle 2's gating-rule finding are fixed. Cycle 3 (scoped re-review) found one MEDIUM: six more restatements of the gating rule in `qa-task` and `qa-story` (the gate-mapping step and the report templates) still contradict step 5d. Three advisory review findings stay in the gate's future recommendations.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                     | Author      |
| ---------- | ------- | --------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #64, #74, #78, #116, #125 | create-task |
| 2026-11-09 | 1.1     | Review passed (8/10) — re-measured anchors, resolved two `(unverified)` claims, added docs-only fallback, pinned-test list and Phase 3 dependency note | review-task |
| 2026-11-09 |         | Status → ready-for-development                                  | review-task |
| 2026-11-09 |         | Implemented — 4 phases; 7 sources, 1 new prompt, 1 test allowlist entry, bundled copies; ci:fast green | develop |
| 2026-11-09 |         | QA gate CONCERNS (90/100) — 1 finding                           | qa-task     |
| 2026-11-09 |         | QA findings fixed — CHANGELOG entry added, 1 iteration          | qa-fix      |
| 2026-11-09 |         | QA gate CONCERNS (90/100) — 1 finding (cycle 2 refute pass)     | qa-task     |
| 2026-11-09 |         | QA findings fixed — gating-rule restatements aligned with 5d, 2 iterations | qa-fix      |
| 2026-11-09 |         | QA gate CONCERNS (90/100) — 1 finding (cycle 3)                 | qa-task     |
| 2026-11-09 |         | QA findings fixed — remaining gating-rule restatements qualified, 3 iterations | qa-fix      |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Step 3c and the reviewer
- [x] Overlap and scratch rules

### Phase 2: The two Step 3b routes
- [x] Docs-only branch, reproduced route

### Phase 3: The vacuous criterion
- [x] Probe and review flag

### Phase 4: Evidence, bundle and sweep
- [ ] Fixtures run, bundle clean

---

## References

- Observation #64 — Step 3c mutations must not overlap a background suite run over the same tree
- Observation #74 — qa-task Step 3b has no docs-only path; each cycle improvises its substitute review
- Observation #78 — Success criterion ran prettier on Markdown that .prettierignore excludes — vacuous PASS across 3 QA cycles
- Observation #116 — Read-only code reviewer can overwrite the caller's scratch probes
- Observation #125 — qa-task has no route for a medium-confidence review bug QA reproduces by execution

---

## Notes

### Important Reminders

Task 268 edits `qa-fix`, not `qa-task`; 273 and 274 and 275 all edit `qa-task` at different steps.

### Future Improvements

None.

---

**Status:** Ready for Review
