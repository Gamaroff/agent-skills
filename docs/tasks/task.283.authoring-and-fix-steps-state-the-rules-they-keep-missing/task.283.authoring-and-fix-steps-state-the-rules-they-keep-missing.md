---
id: task.283
title: "Authoring and fix steps state the rules they keep missing"
type: task
description: "Add four missing rules: verify a plan's CHANGELOG placement claim, a documented multi-task path for create-task, an importer audit when a fix widens a shared parser, and the command-node-under-wrapper trap."
tags: [create-task, review-task, develop-bug, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-20
estimated_effort_hours: 16
---

# Task 283: Authoring and fix steps state the rules they keep missing

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.283.review.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.md` implemented 2026-11-19

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
- `review-task` Step 3 check 2 ("File Path Accuracy") holds the bullet "Line anchors resolve, not only paths" (`git grep -n "Line anchors resolve" -- skills/review-task/SKILL.md`); the placement check goes beside it. The docs-only gate is at `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1667` (`ci.docsOnly.patterns`; `CHANGELOG.md` is outside it). Re-verified 2026-11-19 at `develop` `96a59c58c`.
- `ensure-task-github-issue` builds its body from a hand-filled unquoted heredoc (obs #34). Task 265 (accepted) migrated payload heredocs and left `shared/resources/tests/payload-heredoc-ratchet.test.mjs`, which pins the literal `cat > .claude/state/issue-body.md <<EOF` per site, so replacing the heredoc changes that ratchet's count.
- The card-summary contract already has one definition in code: `shared/resources/jira-sync.js` (`extractBodySections`, `buildCardSections`, `CARD_SECTIONS_BY_KIND`, `parseFrontmatter`). The renderer imports it and re-implements none of the caps.
- Nine skills write `.claude/state/issue-body.md` (`git grep -ln "issue-body.md" -- 'skills/*/SKILL.md'`): `ensure-{bug,epic,story,task}-github-issue`, `sync-github-{bug,epic,story,task}` and `finalise`. Two of them build a **task** issue body: `ensure-task-github-issue` and `sync-github-task`.

### Target Architecture

- **#30**: review-task Step 3 check 2 extends to structural claims about CHANGELOG placement (verify "under `[Unreleased]`" with `grep -n "^## \[" CHANGELOG.md`). The fix point is decided (2026-11-06): the develop loop's Step 3 doc (`shared/resources/develop-pipeline-step-3-develop-loop.md`) gains a fenced shell block that fails when a new CHANGELOG entry sits below the first `## [v` heading. The block is held by a test that extracts and runs it on a fixture CHANGELOG.
- **#34**: a documented multi-task path in § 1.2: pre-allocate the number range, each writer produces only its own task directory, one registry pass at the end (rows, note, counter). A script renders the issue body from the task file by calling `jira-sync.js` `buildCardSections` (Overview paragraph, first 5 criteria with an exact "+N more", Breaking Changes headings, metadata, relative links made absolute); the Jira and GitHub cards then share one definition of the caps.
- **#36**: develop-bug's fix step (`skills/develop-bug/SKILL.md` Step 3) and qa-fix (`skills/qa-fix/SKILL.md` Step 3) require, when a fix widens what a shared parser or validator accepts, a pass over every importer that writes based on its output, listing each and why newly accepted input is safe.
- **#146**: one line beside the `command node` rule in `docs/contributing/traps.md`: under any exec-wrapper, resolve node once with `NODE=$(command -v node)` and call `timeout N "$NODE" …`. Measured 2026-11-19: `timeout 5 command node -e 1` exits 127 (`timeout: failed to run command 'command'`); the resolved form exits 0.

### Important Clarifications

- Phase 1's fix point is decided (Step 3 check, no 5c exception); the plan implements that one only.
- Tasks 266 and 267 (both edited review-task/create-task text) are accepted and merged; this branch is cut from a `develop` that holds them.
- The renderer is a script with tests, never a heredoc (task 265's rule).
- The project memory note on `command node` lives outside the repository (a user's private memory) and is not a deliverable of this task.

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
- `skills/review-task/SKILL.md` (Step 3 check 2)
- `shared/resources/develop-pipeline-step-3-develop-loop.md` (the Step 3 block; the bundled copies under `skills/*/references/` are regenerated, never edited)
- a test under `shared/resources/tests/` that extracts the block and runs it

**Changes**:
- [ ] Placement check in review-task Step 3 check 2: a claim that a bullet sits "under `[Unreleased]`" is verified with `grep -n "^## \[" CHANGELOG.md`.
- [ ] Fix point (decided 2026-11-06): a fenced shell block in the Step 3 doc fails when a new CHANGELOG entry lands below the first `## [v` heading. No 5c CHANGELOG exception: it would widen the docs-only gate.
- [ ] The block is held by a test that extracts it and runs it on a fixture CHANGELOG (a released-section entry fails; **control**: an `[Unreleased]` entry passes). Use the fenced-block extractor the existing evals use (`git grep -n "function fencedBlocks" -- 'evals/shared/tests/*.mjs'`).

**Dependencies**: none (fix point decided).

---

### Phase 2: Multi-task path and renderer (obs #34)

**Risk Level**: Medium

**Files**:
- `skills/create-task/SKILL.md`
- a renderer script under `shared/resources/` and its test under `shared/resources/tests/` (that glob is in the `package.json` test script, so the runner reaches it)
- `skills/ensure-task-github-issue/SKILL.md`
- `skills/sync-github-task/SKILL.md` (the second task-body writer; decide carried or out of scope and say which)
- `shared/resources/tests/payload-heredoc-ratchet.test.mjs` (its pinned `issue-body.md` heredoc count drops by one)

**Changes**:
- [ ] Documented path; renderer; `ensure-task-github-issue` calls it.
- [ ] The renderer calls `jira-sync.js` `buildCardSections` and `parseFrontmatter`; it carries no cap, heading list or frontmatter regex of its own (one definition of the card contract).
- [ ] The new `shared/resources/*.js` file passes the tests that scan every shared resource: `shared/resources/tests/pipeline-answers-generic.test.mjs` (generic text, no branch or consumer literals) and `command npm run bundle -- --check`.

**Dependencies**: none.

---

### Phase 3: Parser-widening audit (obs #36)

**Risk Level**: Low

**Files**:
- `skills/develop-bug/SKILL.md` Step 3 (Investigate & Fix), `skills/qa-fix/SKILL.md` Step 3 (Apply Changes)

**Changes**:
- [ ] The importer-audit rule: when a fix widens what a shared parser or validator accepts, `git grep -l "<function>"` lists the importers, those that write based on its output are named, and each gets a line on why newly accepted input is safe.

**Dependencies**: none.

---

### Phase 4: The wrapper trap (obs #146)

**Risk Level**: Low

**Files**:
- `docs/contributing/traps.md`

**Changes**:
- [ ] One line and the `NODE=$(command -v node)` form beside the `command node` rule (`docs/contributing/traps.md:25`), with the reason: `timeout`, `xargs`, `env`, `nice` and `nohup` exec their first argument as a program, and `command` is a shell builtin.

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
2. ✅ `skills/ensure-task-github-issue/SKILL.md`, `skills/sync-github-task/SKILL.md` (if carried) and a new renderer script
3. ✅ `docs/contributing/traps.md`
4. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md`

### Files to Modify (Tests)

5. ✅ a renderer test and a Step 3 CHANGELOG-block test under `shared/resources/tests/`
6. ✅ `shared/resources/tests/payload-heredoc-ratchet.test.mjs` (count update)

### Files to Modify (Generated)

7. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the renderer and the Step 3 CHANGELOG block.

**Actions**:
- [ ] The renderer keeps `estimated_effort_hours` and absolute links on a fixture task whose frontmatter has a multi-line `description`; **control**: the old `\s*` pattern drops the field on the same fixture (mutation proof).
- [ ] The first 5 criteria and an exact "+N more" for a task with 8; **control**: a task with 5 gets no "+N more" line.
- [ ] The renderer's caps come from `buildCardSections`: a test asserts the renderer file holds no cap constant of its own.
- [ ] The Step 3 CHANGELOG block, extracted from the doc and run on a fixture CHANGELOG, fails for a new entry below the first `## [v` heading (the task.184 shape); **control**: an `[Unreleased]` entry passes.

**Command**: `CI=true command node --test` on the named files.

### Behavioural Evidence

The prose rules of Phases 1 (review-task claim check), 3 and 4: a fresh session on each motivating shape, with a control where the rule does not apply (a plan whose `[Unreleased]` claim is true; a fix that widens nothing; a command run without a wrapper). Phase 1's block and Phase 2's renderer are held by the unit tests above, not by this section.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The renderer output for the task.202 shape keeps effort and absolute links, shown by a named test in the QA report.
- [ ] The four rules are present in their files (greps in the QA report).
- [ ] The Step 3 CHANGELOG block fails the task.184 shape and passes its control, shown by the named test in the QA report; review-task's placement claim check flags the same shape in the fixture session recorded in the QA report.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, taken on one host (the LAN server via `command npm run test:remote`, not the laptop) and recorded in the QA report.

### Code Quality

- [ ] The renderer has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `shellcheck` is clean if the renderer is shell (`command npm run lint:shell`).

### Migration

- [ ] No existing issue body changes: the renderer is called only on `ensure-task-github-issue`'s create path, shown by a grep of its call sites in the QA report.

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

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-19
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.283.qa.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.md](./task.283.qa.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
- **Gate File**: [task.283.gate.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml](./task.283.gate.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml)

### Test Coverage Summary
- **Tests Executed**: 15 new (full run 8629 tests, 0 failed)
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: CONCERNS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Five medium findings: no CHANGELOG entry citing task 283, `sync-github-task` calls the renderer against the Migration criterion, wall time unmeasured, the render block leaves its inputs unbound, and the CHANGELOG block fails open on an unfetched base.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #30, #34, #36, #146 | create-task |
| 2026-11-19 | 1.1     | Review 1 (8/10): renderer reuses `jira-sync.js` card builder; Step 3 CHANGELOG check is a tested block; `sync-github-task`, payload-heredoc ratchet and shared-resource tests named; memory-note edit dropped; Phase 3 steps named | review-task |
| 2026-11-19 |         | Status → ready-for-development                            | review-task |
| 2026-11-19 |         | Implemented — 4 rules, 1 renderer script, 2 new test files (15 tests) | develop     |
| 2026-11-19 |         | QA gate CONCERNS (90/100) — 5 medium findings, 1 low | qa-task     |
| 2026-11-20 |         | QA findings fixed — 4 of 5 medium and the low; wall-time criterion left open, 1 iteration | qa-fix      |
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

**Status:** Ready for Review
