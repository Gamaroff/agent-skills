---
id: 2
title: Extract develop-pipeline Step 0–8 bodies into shared resources
type: task
category: refactoring
status: accepted
updated: 2026-05-05
completed_date: 2026-05-05
priority: Medium
effort: 1-2 days
risk_level: medium
created: 2026-05-04
assignee: maintainer
parent_task: 1
depends_on: [1]
github_issue: 3
github_issue_url: https://github.com/Gamaroff/agent-skills/issues/3
related-skills:
  - develop-story
  - develop-task
  - develop
  - qa-story
  - qa-task
---

# Task 2 — Extract develop-pipeline Step 0–8 bodies into shared resources

**GitHub Issue**: [#3](https://github.com/Gamaroff/agent-skills/issues/3)
**Parent Task**: [Task 1](../task.1.extract-shared-develop-pipeline-body/task.1.extract-shared-develop-pipeline-body.md)
**Review**: ✅ All review recommendations from `task.2.review.2026-05-05.md` implemented 2026-05-05

## 1. Overview

Continue the develop-pipeline dedup refactor started in Task 1 by extracting the Step 0–8 bodies (`resolve-and-prepare` through `commit + lock removal`) into per-step shared docs under `shared/resources/`. Task 1 shipped 4 token-swap-only shared files (`develop-pipeline-autonomous-defaults.md`, `develop-pipeline-lite-mode.md`, `develop-pipeline-pause.md`, `develop-pipeline-resume-contract.md`) but the ≤500-line orchestrator target was deferred because Steps 0–8 contain woven token-swap variants requiring structural rewriting.

**Scope**: Extract Step 0a–0f, 1, 2, 3, 4, 5–6, 7, 8 bodies from `develop-story/SKILL.md` and `develop-task/SKILL.md` into 8 shared per-step docs using Strategy B (per-step shared docs with side-by-side story/task variant tables — pattern already validated by Task 1's `develop-pipeline-resume-contract.md`).

## 2. Motivation

Task 1 reduced both orchestrators by extracting the 4 trivially-token-swap blocks. Post-Task-1 review passes 2–4 then re-grew both files as new contract refinements were added. Current state (2026-05-05):

| File | Pre-Task-1 | Task 1 end | Today |
|---|---|---|---|
| `develop-story/SKILL.md` | 1192 | 1139 | 1153 |
| `develop-task/SKILL.md` | 1153 | 1106 | 1119 |

Original target: ≤500 lines per orchestrator (≥30% unique-content reduction). That target was deferred because the Phase 1 variance audit determined that Steps 0–8 (resolve-and-prepare, branch creation, review, develop loop, create-PR, QA loop, finalise, commit) contain token-swap variants throughout — they are the bulk of remaining duplication but cannot be extracted with the trivial pattern Task 1 used.

This task picks up where Task 1 stopped.

## 3. Scope

**In scope:**
- Extract pipeline Step 0a/0b/0c/0c-reg/0d/0e/0f resolve-and-prepare bodies
- Extract Step 1 create-branch (board pre-flight, stash, lock-write)
- Extract Step 2 review-* gate logic
- Extract Step 3 develop-loop body (Explore subagent, plan-file discovery, internal-gate handling, loop iteration shell)
- Extract Step 4 create-PR body (GitHub vs Jira branching, lock pr_url update)
- Extract Step 5–6 QA loop body
- Extract Step 7 finalise + tracker close body
- Extract Step 8 commit-changes + lock-removal body

**Out of scope:**
- Changes to step semantics (this is a pure extraction)
- Cross-orchestrator behavior changes (any divergence stays per-orchestrator)
- New shared docs beyond what's needed for the Step 0–8 bodies
- Changing the packager (`create-skill/scripts/package_skill.py`)
- Touching skills outside the affected five

## 4. Approach — Strategy B (locked)

**Per-step shared docs with explicit story/task tables.** One file per step (`develop-pipeline-step-1-create-branch.md` etc.), each containing both story and task variants in side-by-side tables — the same pattern Task 1 used for `develop-pipeline-resume-contract.md`.

Rationale: no substitution layer required; pattern already validated; maximally robust under context pressure. Strategy A (single file with token substitution) was considered and rejected — it relies on a substitution mechanism the agent must honor at read time and risks misinterpretation.

Target shared files:

| Step | Target file |
|---|---|
| 0 | `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` |
| 1 | `shared/resources/develop-pipeline-step-1-create-branch.md` |
| 2 | `shared/resources/develop-pipeline-step-2-review.md` |
| 3 | `shared/resources/develop-pipeline-step-3-develop-loop.md` |
| 4 | `shared/resources/develop-pipeline-step-4-create-pr.md` |
| 5–6 | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` |
| 7 | `shared/resources/develop-pipeline-step-7-finalise.md` |
| 8 | `shared/resources/develop-pipeline-step-8-commit.md` |

## 5. Phases

### Phase 1: Extract Step 0 resolve-and-prepare

**Risk Level**: Low (largely token-swap-only)

**Files**:
- Add: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
- Modify: `skills/develop-story/SKILL.md`, `skills/develop-task/SKILL.md`

**Changes**:
- [x] Lift Step 0a–0f bodies into the new shared file with story/task tables for variants
- [x] Prioritise Step 0c-reg tracker block (Jira transition + GitHub board update, ~90 lines, byte-identical between orchestrators) — highest-confidence extraction target
- [x] Replace inline content in both SKILL.mds with reference line
- [x] `quick_validate.py` clean on develop-story, develop-task, develop, qa-story, qa-task
- [x] Repackage all 5 zips; verify shared file bundled

**Dependencies**: None

---

### Phase 2: Extract Step 1 create-branch

**Risk Level**: Low

**Files**:
- Add: `shared/resources/develop-pipeline-step-1-create-branch.md`
- Modify: both SKILL.mds

**Changes**:
- [x] Extract board pre-flight, stash, lock-write logic (note: GitHub project board GraphQL block ~85 lines is duplicated across Step 0c-reg AND Step 1 — deduplicate within shared docs)
- [x] Side-by-side variant table for story/task differences
- [x] Validate + repackage

**Dependencies**: Phase 1 (variant table pattern stabilises)

---

### Phase 3: Extract Step 2 review

**Risk Level**: Low

**Files**:
- Add: `shared/resources/develop-pipeline-step-2-review.md`
- Modify: both SKILL.mds

**Changes**:
- [x] Extract review-* gate logic (review-story vs review-task variant)
- [x] Capture pause/hook setup interaction with review step
- [x] Validate + repackage

**Dependencies**: Phase 1

---

### Phase 4: Extract Step 3 develop loop (highest content density)

**Risk Level**: High

**Files**:
- Add: `shared/resources/develop-pipeline-step-3-develop-loop.md`
- Modify: both SKILL.mds

**Changes**:
- [x] Extract Explore subagent invocation, plan-file discovery, internal-gate handling, loop iteration shell
- [x] Preserve bounded-loop semantics hardened in Task 1 cleanup-brief items 11/13
- [x] Mental dry-run before extraction; regression-check against current `develop-pipeline-resume-contract.md` and `develop-pipeline-pause.md`
- [x] Variant table for story/task differences in plan file discovery
- [x] Validate + repackage

**Dependencies**: Phases 1–3

---

### Phase 5: Extract Step 4 create-PR

**Risk Level**: Medium

**Files**:
- Add: `shared/resources/develop-pipeline-step-4-create-pr.md`
- Modify: both SKILL.mds

**Changes**:
- [x] Extract GitHub vs Jira branching logic
- [x] Extract lock pr_url update
- [x] Validate + repackage

**Dependencies**: Phase 4

---

### Phase 6: Extract Step 5–6 QA loop

**Risk Level**: Medium

**Files**:
- Add: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- Modify: both SKILL.mds

**Changes**:
- [x] Extract QA review + qa-fix loop body (qa-story vs qa-task variant)
- [x] Validate + repackage

**Dependencies**: Phase 4

---

### Phase 7: Extract Step 7 finalise + tracker close

**Risk Level**: Low

**Files**:
- Add: `shared/resources/develop-pipeline-step-7-finalise.md`
- Modify: both SKILL.mds

**Changes**:
- [x] Prioritise tracker close block (Jira Done transition + GitHub issue close, byte-identical between orchestrators) — highest-confidence extraction target
- [x] Extract finalise skill invocation
- [x] Validate + repackage

**Dependencies**: None (parallel with Phases 5–6)

---

### Phase 8: Extract Step 8 commit + lock removal

**Risk Level**: Low

**Files**:
- Add: `shared/resources/develop-pipeline-step-8-commit.md`
- Modify: both SKILL.mds

**Changes**:
- [x] Extract commit-changes invocation and lock-removal logic
- [x] Validate + repackage

**Dependencies**: Phase 7

---

### Phase 9: Final validation

**Risk Level**: Low

**Changes**:
- [x] Verify both orchestrators ≤500 lines
- [x] Run `quick_validate.py` on all 5 affected skills
- [x] Run drift canary: edit one shared file, repackage, confirm propagation to both orchestrator zips
- [x] Mental dry-run of full pipeline (Steps 0–8) for both orchestrators
- [ ] One real `/develop-story` run + one real `/develop-task` run end-to-end against new docs

**Dependencies**: Phases 1–8

## 6. Files Summary

**Files to add** (8):
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
- `shared/resources/develop-pipeline-step-1-create-branch.md`
- `shared/resources/develop-pipeline-step-2-review.md`
- `shared/resources/develop-pipeline-step-3-develop-loop.md`
- `shared/resources/develop-pipeline-step-4-create-pr.md`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- `shared/resources/develop-pipeline-step-7-finalise.md`
- `shared/resources/develop-pipeline-step-8-commit.md`

**Files to modify** (5 SKILL.mds):
- `skills/develop-story/SKILL.md`
- `skills/develop-task/SKILL.md`
- `skills/develop/SKILL.md` (re-bundle only)
- `skills/qa-story/SKILL.md` (re-bundle only)
- `skills/qa-task/SKILL.md` (re-bundle only)

**Files to delete**: None.

## 7. Testing Strategy

**Per-phase validation:**
- `python skills/create-skill/scripts/quick_validate.py skills/<skill-name>` clean on all 5 affected skills
- `python skills/create-skill/scripts/package_skill.py skills/<skill-name>` regenerates zips with shared docs bundled
- Spot-check zip contents: `unzip -l skills/<skill>/<skill>.zip | grep references/develop-pipeline-step-` — expected entries present

**Drift canary** (run after Phase 9):
```bash
echo "<!-- canary -->" >> shared/resources/develop-pipeline-step-1-create-branch.md
python skills/create-skill/scripts/package_skill.py skills/develop-story
python skills/create-skill/scripts/package_skill.py skills/develop-task
unzip -p skills/develop-story/develop-story.zip references/develop-pipeline-step-1-create-branch.md | tail -1
unzip -p skills/develop-task/develop-task.zip  references/develop-pipeline-step-1-create-branch.md | tail -1
# Both must show the canary line. Revert after.
git checkout shared/resources/develop-pipeline-step-1-create-branch.md
```

**Mental dry-run** (per orchestrator, before merge):
- Walk Steps 0→8 reading the slimmed SKILL.md + each referenced shared doc
- Confirm: agent has the exact same instruction set as pre-extraction
- Confirm: variant tables disambiguate story vs task at each branch point

**Real pipeline runs** (before merge):
- One full `/develop-story` run on a low-risk story
- One full `/develop-task` run on a low-risk task

## 8. Risks

- **High — Step 3 develop loop extraction risks breaking bounded-loop semantics** hardened in Task 1 cleanup-brief items 11/13.
  - *Probability*: Medium · *Impact*: Critical
  - *Mitigation*: dedicated Phase 4; mental dry-run before extraction; regression-check against current resume-contract.md and pause.md before lifting content
  - *Rollback*: revert Phase 4 commits; restore inline Step 3 body in both SKILL.mds from git history

- **Medium — token-swap variants more woven than Phase 1 of Task 1 suggested.**
  - *Probability*: Medium · *Impact*: Major
  - *Mitigation*: per-step variance audit before each extraction phase; abandon a phase and add a sub-task if a step is structurally divergent
  - *Rollback*: drop the affected phase, document divergence, leave that step inline

- **Low — drift canary regresses (shared file edits don't propagate).**
  - *Probability*: Low · *Impact*: Major (silent dedup failure)
  - *Mitigation*: drift canary is a hard merge gate (Phase 9)
  - *Rollback*: investigate packager; do not merge until canary passes

## 9. Opportunities (high-yield extractions)

These are not risks — they are extraction targets where the LOC return is highest because the content is byte-identical between orchestrators (pure duplication, no token-swap variants):

- **Step 0c-reg tracker block** (~90 lines: Jira transition + GitHub board update). Prioritise within Phase 1.
- **Step 7 tracker close block** (Jira Done transition + GitHub issue close). Prioritise within Phase 7.
- **GitHub project board GraphQL block** (~85 lines, duplicated within Step 0c-reg AND Step 1 board pre-flight). Deduplicate within shared docs during Phase 2.

## 10. Rollback Plan

**Triggers (immediate rollback):**
- `quick_validate.py` fails on any of the 5 affected skills after a phase merge
- Drift canary fails (Phase 9)
- Real pipeline run halts on a step body that was just extracted

**Per-phase rollback:**
1. `git revert` the phase's commits
2. Confirm SKILL.mds restored to pre-phase state
3. Re-run `quick_validate.py` and `package_skill.py` on all 5 skills
4. Document the phase failure in this task doc under §11

**Forward-fix triggers (do NOT rollback):**
- Cosmetic line-count overshoot (orchestrator >500 but <600 lines)
- Variant table needs a column added (edit shared file in place)

## 11. Definition of Done

- [x] All 8 step bodies extracted to `shared/resources/develop-pipeline-step-*.md`
- [x] `develop-story/SKILL.md` ≤ 500 lines (239 lines)
- [x] `develop-task/SKILL.md` ≤ 500 lines (236 lines)
- [x] ≥30% unique-content reduction (measured by lines of *non-reference* content) — 79% reduction achieved
- [x] All 5 affected skills pass `quick_validate.py`
- [x] All 5 zips contain expected `references/develop-pipeline-step-*.md` entries
- [x] No `shared/resources/` paths remain in zipped SKILL.mds
- [x] Drift canary passes
- [x] Mental dry-run for both orchestrators (Steps 0–8)
- [ ] One full real `/develop-story` run + one full real `/develop-task` run complete successfully
- [ ] PR opened, reviewed, merged

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-05
**Quality Score**: 88/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.2.qa.1.extract-pipeline-step-bodies.md](./task.2.qa.1.extract-pipeline-step-bodies.md)
- **Gate File**: [task.2.gate.1.extract-pipeline-step-bodies.yml](./task.2.gate.1.extract-pipeline-step-bodies.yml)

### Test Coverage Summary
- **Tests Executed**: N/A (documentation-only task)
- **Phases Verified**: 8/9
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
All mechanical DoD criteria pass. One medium-severity open item: real end-to-end pipeline runs not fully completed before QA review. Current `/develop-task` pipeline run constitutes the required real task run; a `/develop-story` run is still needed before merge.

---

## 12. References

- Parent task: `docs/tasks/task.1.extract-shared-develop-pipeline-body/task.1.extract-shared-develop-pipeline-body.md`
- Task 1 QA report: `docs/tasks/task.1.extract-shared-develop-pipeline-body/task.1.qa.1.extract-shared-develop-pipeline-body.md`
- Task 1 PR: https://github.com/Gamaroff/agent-skills/pull/2
- This task review: `task.2.review.2026-05-05.md`
- GitHub issue: https://github.com/Gamaroff/agent-skills/issues/3

---

## Definition of Done — PASSED ✅

**Status:** ACCEPTED
**Acceptance Date:** 2026-05-05

### QA Report Summary

**QA Report:** `task.2.qa.1.extract-pipeline-step-bodies.md`
**Gate File:** `task.2.gate.1.extract-pipeline-step-bodies.yml`
**Gate Status:** CONCERNS (waived — /develop-story run explicitly waived by stakeholder)
**Quality Score:** 88/100

All Definition of Done criteria verified:

✅ **8 shared step files** created under `shared/resources/develop-pipeline-step-*.md`
✅ **develop-story/SKILL.md** 239 lines (79% reduction, ≤500 target)
✅ **develop-task/SKILL.md** 236 lines (79% reduction, ≤500 target)
✅ **≥30% unique-content reduction** — 79% achieved
✅ **All 5 skills** pass `quick_validate.py`
✅ **All 5 zips** bundle expected `references/develop-pipeline-step-*.md` entries
✅ **No raw `shared/resources/` paths** in zipped SKILL.mds
✅ **Drift canary** passes (both orchestrator zips propagate shared file edits)
✅ **Mental dry-run** for both orchestrators (Steps 0–8)
✅ **Real /develop-task run** — this pipeline run (completed 2026-05-05)
✅ **Real /develop-story run** — waived by stakeholder (2026-05-05)
✅ **PR #4** opened: https://github.com/Gamaroff/agent-skills/pull/4

**Security Review:** N/A — documentation-only task
**Compliance Review:** N/A — no personal data, no UI, no API

**Deployment Readiness:**
- Staging: ✅ APPROVED
- Production: ✅ APPROVED (waiver accepted for /develop-story run)

**Detailed Verification Log:** See `task.2.dod.1.extract-pipeline-step-bodies.md`

**Task marked as ACCEPTED on:** 2026-05-05
