---
id: task.283
title: "Authoring and fix steps state the rules they keep missing"
type: task
description: "Add four missing rules: verify a plan's CHANGELOG placement claim, a documented multi-task path for create-task, an importer audit when a fix widens a shared parser, and the command-node-under-wrapper trap."
tags: [create-task, review-task, develop-bug, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 16
---

# Task 283: Authoring and fix steps state the rules they keep missing

**Status:** Planned

---

## 1. Overview

Four observation entries were left after the cluster review because each is a single missing rule (obs #30, #34, #36, #146). They are grouped as one task of four independent phases, one per rule. Obs #69 (the Skill tool resolving to user-level synced copies) stays open: it is environmental.

**Scope**: `review-task` check 2 and the CHANGELOG fix point, `create-task` § 1.2 and an issue-body renderer, `develop-bug`/`qa-fix` fix step, and `docs/contributing/traps.md`.

---

## 2. Motivation

### Current Problems

1. **A CHANGELOG placement claim went unchecked** (obs #30). task.184's plan said to edit task 183's bullet "in `[Unreleased]` › Fixed". It had shipped under `## [v0.53.0]` (`grep -n "^## \["` read `[Unreleased]` at :5, `[v0.53.0]` at :319, the bullet at :934). Review checked line anchors, not placement; 5c caught it (PC-1, medium) but `CHANGELOG.md` is outside `ci.docsOnly.patterns`, so 5c could only record it, and `/finalise` HALTed at AC10 over a one-line move (`task.184.dod.1`, 2026-10-13).
2. **No path for the N-task outcome of § 1.2** (obs #34). On 2026-10-13 a plan split into tasks 202–207; create-task writes one document per run, so six forks each wrote one task and a single pass added the registry rows. The issue bodies came from an ad-hoc script whose `\s*` crossed newlines and dropped `estimated_effort_hours` ("Effort —h") and left `../../../` links that 404 in an issue.
3. **Widening a shared parser is treated as local** (obs #36). bug.19 (2026-10-14, `f81d9642`) made `parseRegistry` accept a plain-title registry with a `Document` column; `registry-tick.js --annotate` imports the same parser and appends `· PR #n merged` to the row's last cell, so the fix alone would have let annotate write prose into the path cell.
4. **`timeout command node` exits 127** (obs #146). `timeout`, `xargs`, `env`, `nice` and `nohup` exec their first argument as a program and `command` is a builtin. Hit on task.249 and again on task.256 (`timeout: failed to run command 'command'`).

### Benefits

1. A placement claim is verified where anchors already are.
2. A split has a documented path and a tested issue-body renderer.
3. A parser fix names every writer it affects.
4. The trap is written where the rule it qualifies is.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/create-task/SKILL.md:268` `### 1.2 One Task or Several?` states the split test and the registry note but no multi-task procedure.
- `docs/contributing/traps.md` carries the `command node`/`command npm`/`command npx` rule (around `:20`–`:28`); `grep -n "timeout" docs/contributing/traps.md` for the wrapper case is the plan's first read.
- `review-task` check 2 ("anchors resolve") and the 5c/finalise CHANGELOG handling: `(unverified: the plan greps skills/review-task/SKILL.md for the check and shared/resources/develop-pipeline-step-5-6-qa-loop.md for docsOnly)`.
- `ensure-task-github-issue` builds its body from a hand-filled heredoc (obs #34); task 265 migrates payload heredocs, so the renderer should be a script, not a new heredoc.

### Target Architecture

- **#30**: review-task check 2 extends to structural claims about CHANGELOG placement (verify "under `[Unreleased]`" against the file). The pre-finalise fix point is an owner decision (Phase 1): allow a CHANGELOG-only relocation at 5c, or have Step 3 check a new entry lands under `[Unreleased]`.
- **#34**: a documented multi-task path in § 1.2: pre-allocate the number range, each writer produces only its own task directory, one registry pass at the end (rows, note, counter). A script renders the issue body from the task file (Overview paragraph, first 5 criteria with an exact "+N more", Breaking Changes headings, metadata, relative links made absolute).
- **#36**: develop-bug's fix step and qa-fix require, when a fix widens what a shared parser or validator accepts, a pass over every importer that writes based on its output, listing each and why newly accepted input is safe.
- **#146**: one line beside the `command node` rule in `traps.md` and the project memory: under any exec-wrapper, resolve node once with `NODE=$(command -v node)` and call `timeout N "$NODE" …`.

### Important Clarifications

- Phase 1's fix-point choice is the owner's; the plan implements the chosen one only.
- This task overlaps 266 and 267 (both edit review-task/create-task text); land after them or merge `develop` first.
- The renderer is a script with tests, never a heredoc (task 265's rule).

---

## 4. Scope

### In Scope

✅ **Four rules**, one phase each, and the renderer script with tests.

### Out of Scope

❌ **Obs #69** (environmental).
❌ **Rewriting past issue bodies.**

---

## 5. Breaking Changes

None - each phase adds a rule or a script.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.283.plan.authoring-and-fix-steps-state-the-rules-they-keep-missing.md](task.283.plan.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)

### Phase 1: CHANGELOG placement (obs #30)

**Risk Level**: Medium

**Files**:
- `skills/review-task/SKILL.md`, the QA-loop step doc

**Changes**:
- [ ] Placement check in review-task check 2.
- [ ] Fix point (decided 2026-11-06): Step 3 checks that a new CHANGELOG entry lands under `[Unreleased]`. No 5c CHANGELOG exception: it would widen the docs-only gate.

**Dependencies**: none (fix point decided).

---

### Phase 2: Multi-task path and renderer (obs #34)

**Risk Level**: Medium

**Files**:
- `skills/create-task/SKILL.md`
- a renderer script under `shared/resources/` and its test
- `skills/ensure-task-github-issue/SKILL.md`

**Changes**:
- [ ] Documented path; renderer; skill calls it.

**Dependencies**: none.

---

### Phase 3: Parser-widening audit (obs #36)

**Risk Level**: Low

**Files**:
- `skills/develop-bug/SKILL.md` fix step, `skills/qa-fix/SKILL.md`

**Changes**:
- [ ] The importer-audit rule.

**Dependencies**: none.

---

### Phase 4: The wrapper trap (obs #146)

**Risk Level**: Low

**Files**:
- `docs/contributing/traps.md`

**Changes**:
- [ ] One line and the `NODE=$(command -v node)` form.

**Dependencies**: none.

---

### Phase 5: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] `command npm run bundle`, `command npm run bundle -- --check`; mutation proofs.

**Dependencies**: Phases 1 to 4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-task/SKILL.md`, `skills/create-task/SKILL.md`, `skills/develop-bug/SKILL.md`, `skills/qa-fix/SKILL.md`
2. ✅ `skills/ensure-task-github-issue/SKILL.md` and a new renderer script
3. ✅ `docs/contributing/traps.md`

### Files to Modify (Tests)

4. ✅ a renderer test under `shared/resources/tests/`

### Files to Modify (Generated)

5. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the renderer and the placement check.

**Actions**:
- [ ] The renderer keeps `estimated_effort_hours` and absolute links on a fixture task whose frontmatter has a multi-line `description`; **control**: the old `\s*` pattern drops the field on the same fixture (mutation proof).
- [ ] The first 5 criteria and an exact "+N more" for a task with 8.
- [ ] A plan claiming `[Unreleased]` for a released bullet is flagged; **control**: a correct claim passes.

**Command**: `CI=true command node --test` on the named files.

### Behavioural Evidence

Phases 1 to 4 prose rules: a fresh session on each motivating shape, with a control where the rule does not apply.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The renderer output for the task.202 shape keeps effort and absolute links, shown by a named test in the QA report.
- [ ] The four rules are present in their files (greps in the QA report).
- [ ] The placement check flags the task.184 shape, shown by the fixture session in the QA report.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] The renderer has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `shellcheck` is clean if the renderer is shell (`command npm run lint:shell`).

### Migration

- [ ] No existing issue body changes; the renderer applies to issues created after the change.

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The Step 3 check false-positives**
- **Risk**: a legitimate edit to a released entry is blocked.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the check applies only to new entries; Phases 2 to 4 are independent.
- **Rollback**: drop Phase 1.

**2. Overlap with 266 and 267**
- **Risk**: merge conflicts in review-task and create-task text.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: land after them.
- **Rollback**: rebase.

### Low Risk Areas

**1. Renderer disagrees with the old bodies**
- **Risk**: formatting drift.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: fixture comparison.
- **Rollback**: revert Phase 2.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- issue creation fails after the renderer lands
- the suites are red on `develop`

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
- issue creation broken

**Non-Critical (Forward Fix)**:
- wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #30, #34, #36, #146 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: CHANGELOG placement
- [ ] Check and fix point

### Phase 2: Multi-task path and renderer
- [ ] Path, script, tests

### Phase 3: Parser-widening audit
- [ ] Rule

### Phase 4: The wrapper trap
- [ ] Line

### Phase 5: Bundle and sweep
- [ ] Bundle clean

---

## References

- Observation #30 — A plan's CHANGELOG placement claim went unverified and 5c could not fix it
- Observation #34 — create-task has no path for the N-task outcome of its own split step
- Observation #36 — Widening a shared parser's accepted input needs an audit of every writer that imports it
- Observation #146 — 'command node' under timeout/xargs/env exits 127

---

## Notes

### Important Reminders

Obs #69 stays open. Phases are independent; ship in any order.

### Future Improvements

None.

---

**Status:** Planned
