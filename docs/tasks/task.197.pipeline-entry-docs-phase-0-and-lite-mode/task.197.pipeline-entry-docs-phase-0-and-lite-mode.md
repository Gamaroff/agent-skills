---
id: task.197
title: "Pipeline entry docs: Phase 0, lite mode and invocation"
type: task
description: "Correct how the docs describe starting a pipeline: Phase 0 asks two questions, lite mode is auto-detected and QA-only, the epic branch is opt-in, and the entry point is develop-task/develop-story: 16 findings from the 2026-10-07 doc-drift audit."
tags: [docs, phase-0, lite-mode, branch-model, doc-drift]
category: documentation
status: ready-for-review
priority: Medium
created: 2026-10-07
updated: 2026-10-20
assignee:
estimated_effort_hours: 8
github_issue: 600
---

# Technical Task: Pipeline entry docs: Phase 0, lite mode and invocation

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.197.review.1.pipeline-entry-docs-phase-0-and-lite-mode.md` implemented 2026-10-20
**GitHub Issue**: [#600](https://github.com/Gamaroff/agent-skills/issues/600)

---

## 1. Overview

Correct how the docs describe starting a pipeline: Phase 0 asks two questions, lite mode is auto-detected and QA-only, the epic branch is opt-in, and the entry point is develop-task/develop-story.

**Scope**: 16 confirmed findings (14 medium, 2 low) across 13 docs, from the 2026-10-07 doc-drift audit ([report](../../../.agents/plans/doc-drift-audit-2026-10-07.md)). The plan file lists every finding with its evidence and fix.

**Key deliverables**:

1. Each listed doc says what the current sources do, finding by finding.
2. A re-check of every finding before it is edited, so a finding fixed since the audit is closed rather than re-edited.
3. Link and format checks green on every changed doc.

---

## 2. Motivation

### Current Problems

1. Several docs still describe a `--lite` flag that skips context-gathering, a Phase 0 that prompts for lite mode, PRs that always target an epic branch, a `depends_on` key that blocks the pipeline, `/develop` as the pipeline entry point, and a `git worktree add` without `-b` that fails because the branch does not exist yet.
2. The docs predate most of the 401 commits since `v0.52.0`, so a reader following them is misled even where nothing fails outright.
3. Each finding was confirmed by an auditor and a second agent that tried to refute it, against `develop` at `a0e135a6`; none is fixed yet.

### Benefits

1. A reader following these docs gets the behaviour the skills have today.
2. The next release ships docs that match it.
3. Fewer support questions caused by docs describing behaviour that changed.

---

## 3. Technical Background

### Current Architecture

The docs below restate behaviour defined in the skill sources. They drifted because each behaviour change updated its `SKILL.md` and shared resource but not every doc that restates it.

Docs in scope (finding count):

- `docs/concepts/architecture.md` (1)
- `docs/concepts/quickstart-story.md` (1)
- `docs/reference/anti-patterns.md` (1)
- `docs/reference/glossary.md` (2)
- `docs/reference/troubleshooting.md` (1)
- `docs/runbooks/create-parallel-stories.md` (1)
- `docs/runbooks/first-week.md` (1)
- `docs/runbooks/first-week/day-4-parallel.md` (1)
- `docs/runbooks/story-development.md` (1)
- `docs/runbooks/task-development.md` (2)
- `docs/standards/story-documents.md` (1)
- `docs/standards/task-documents.md` (2)
- `skills/develop-task/README.md` (1)

Sources of truth: `shared/resources/develop-pipeline-lite-mode.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (Q1/Q2, `branch_model`), `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`. Every finding's evidence is a `path:line` into these, recorded in the plan and the audit report.

### Target Architecture

Lite mode is described as auto-detected in Phase 0 and as changing QA depth only — with no `--lite` flag, while `--mode lite` may request it (honoured only when the triggers hold) and `--mode fast` / `develop.defaultMode` exist (task.201); Phase 0 is described as two questions (base, PR target), asked only where no flag (`--base`, `--target`, `--defaults`) or recorded answer settles them; branch prose matches the opt-in epic integration model; invocation examples use `/develop-task` and `/develop-story`; `depends_on` is described as what it is.

### Important Clarifications

- **Findings are from 2026-10-07 at `a0e135a6`.** Phase 0 re-checks each against the tree at the time of work: a finding fixed since then is marked closed, not re-edited, and one whose source moved is re-cited.
- **Sources changed after the audit (task.201, merged 2026-10-19).** `shared/resources/develop-pipeline-lite-mode.md` §"Speed Modes and Skips" (`--mode standard|lite|fast`, `develop.defaultMode`, `--skip`) and `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0d "Answer resolution" (`--defaults`, `--base`, `--target`) postdate the audit. A fix must not say "there is no flag" or "never prompted" without naming them; cite those sections rather than restating the rule. The plan's fix wording is updated accordingly (review 1, I-1).
- **Edit sources, not copies.** `skills/*/references/` files are generated by `npm run bundle`; no finding points at one.
- **Sibling tasks.** task.196, task.198, task.199 cover the rest of the audit. They touch different findings; where two tasks edit the same file the edits are in different sections.

---

## 4. Scope

### In Scope

✅ The 16 findings listed in the plan, in the 13 docs named above
✅ Prettier and link checks on every changed doc

### Out of Scope

❌ The 12 high-severity findings (fixed in PR #598)
❌ Findings assigned to task.196, task.198, task.199
❌ Changing skill behaviour to match a doc — where a doc and a skill disagree, the skill is the reference
❌ `docs/contributing/`, `docs/architecture/`, `AGENTS.md` (not audited)

---

## 5. Breaking Changes

None — documentation only. No API, script, config key or skill behaviour changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.197.plan.pipeline-entry-docs-phase-0-and-lite-mode.md](task.197.plan.pipeline-entry-docs-phase-0-and-lite-mode.md)

### Phase 0: Re-verify (Risk: Low)

- [x] For each finding, open the doc line and the cited source; mark it open, closed (already fixed) or moved (re-cite)
- [x] Record the result per finding in the implementation report

**Dependencies**: PR #598 merged (it edits some of the same files).

### Phase 1: Overview (README, concepts, operations, examples) (Risk: Low)

**Files**: `docs/concepts/architecture.md`, `docs/concepts/quickstart-story.md`

- [x] Apply the plan's fix for each open finding in these files
- [x] Prettier and link check the changed files

**Dependencies**: Phase 0.

### Phase 2: Reference (Risk: Low)

**Files**: `docs/reference/anti-patterns.md`, `docs/reference/glossary.md`, `docs/reference/troubleshooting.md`

- [x] Apply the plan's fix for each open finding in these files
- [x] Prettier and link check the changed files

**Dependencies**: Phase 0.

### Phase 3: Runbooks (Risk: Low)

**Files**: `docs/runbooks/create-parallel-stories.md`, `docs/runbooks/first-week.md`, `docs/runbooks/first-week/day-4-parallel.md`, `docs/runbooks/story-development.md`, `docs/runbooks/task-development.md`

- [x] Apply the plan's fix for each open finding in these files
- [x] Prettier and link check the changed files

**Dependencies**: Phase 0.

### Phase 4: Standards (Risk: Low)

**Files**: `docs/standards/story-documents.md`, `docs/standards/task-documents.md`

- [x] Apply the plan's fix for each open finding in these files
- [x] Prettier and link check the changed files

**Dependencies**: Phase 0.

### Phase 5: Skill READMEs (Risk: Low)

**Files**: `skills/develop-task/README.md`

- [x] Apply the plan's fix for each open finding in these files
- [x] Prettier and link check the changed files

**Dependencies**: Phase 0.

### Phase 6: Close-out (Risk: Low)

- [x] Grep each changed doc for the old wording the findings name (the old behaviour, not only the edited sentence)
- [x] Update the audit report's entries for these findings to fixed / closed

**Dependencies**: Phases 1–5.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `docs/concepts/architecture.md`
2. ✅ `docs/concepts/quickstart-story.md`
3. ✅ `docs/reference/anti-patterns.md`
4. ✅ `docs/reference/glossary.md`
5. ✅ `docs/reference/troubleshooting.md`
6. ✅ `docs/runbooks/create-parallel-stories.md`
7. ✅ `docs/runbooks/first-week.md`
8. ✅ `docs/runbooks/first-week/day-4-parallel.md`
9. ✅ `docs/runbooks/story-development.md`
10. ✅ `docs/runbooks/task-development.md`
11. ✅ `docs/standards/story-documents.md`
12. ✅ `docs/standards/task-documents.md`
13. ✅ `skills/develop-task/README.md`

### Files to Modify (Tests)

None — the checks are `prettier --check` and the CI link checker (`.github/workflows/docs-link-check.yml`).

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

14. ✅ `.agents/plans/doc-drift-audit-2026-10-07.md` (mark findings fixed)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

Not applicable — no code changes.

### Integration Tests

- Every command a changed doc tells a user to run is run once (or its source line is cited where running it would write to a tracker).
- Link check: `command npx --yes markdown-link-check@3 --quiet --config .github/markdown-link-check.json <file>` on **every** changed file, run locally (the CI checker and version; it also checks `#anchors`). Local, because the CI workflow's changed-file filter covers only `docs/`, `examples/` and root Markdown — it never sees `skills/develop-task/README.md` or `.agents/plans/doc-drift-audit-2026-10-07.md`.
- Existing tests that read the edited docs, run after Phases 2 and 3: `tests/restricted-access-docs.test.js` (glossary, troubleshooting) and `evals/shared/tests/pr-review-loop-parity.test.mjs` (story- and task-development runbooks).

### Performance Tests

Not applicable.

### Consumer Tests

- A reader check: for each finding, the edited sentence matches the cited source line.

---

## 9. Success Criteria

### Functional

- [x] **SC-1** Every finding in the plan is either fixed, or closed in Phase 0 with the reason recorded.
- [x] **SC-2** No changed doc still states the old behaviour a finding names (grep of the old wording, recorded per finding).
- [x] **SC-3** Every command a changed doc shows is run once, or its source is cited where running it would write to a tracker.

### Performance

- [x] **SC-4** Not applicable — documentation only; recorded as N/A in the DoD.

### Code Quality

- [x] **SC-5** `prettier --check` passes on every changed doc.
- [x] **SC-6** The CI link checker (`markdown-link-check@3`, the CI config) passes on every changed file, including anchors — run locally on each, since CI's filter does not reach `skills/` or `.agents/plans/`.
- [x] **SC-9** `tests/restricted-access-docs.test.js` and `evals/shared/tests/pr-review-loop-parity.test.mjs` pass on the branch.
- [x] **SC-7** `quick_validate.py` passes for every skill whose README changed.

### Migration

- [x] **SC-8** The audit report marks each finding of this task fixed or closed.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A fix restates the source wrongly.** Mitigation: each edit is checked against the cited `path:line`; QA re-reads the source, not the plan.
2. **Merge conflicts with sibling tasks or PR #598.** Mitigation: start after #598 merges; siblings edit different findings.

### Low Risk Areas

1. **The source changes again while this is open.** Phase 0 re-verifies.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a changed doc gives a command that fails, or the link check goes red on `develop`.
- **Steps**: 1) `git revert` the merge commit. 2) Re-run the link check.
- **Validation**: the reverted docs match `develop` before the merge.

### Partial Rollback (1-2 hours)

- **When to use**: one doc's edit is wrong. Revert that file's hunk only.

### Forward Fix (< 4 hours)

- **When to use**: a wording problem with no wrong outcome. Fix forward.

### Rollback Triggers

- **Critical**: a doc that now tells users to run a failing command.
- **Non-critical**: wording.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-20
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.197.qa.1.pipeline-entry-docs-phase-0-and-lite-mode.md](./task.197.qa.1.pipeline-entry-docs-phase-0-and-lite-mode.md)
- **Gate File**: [task.197.gate.1.pipeline-entry-docs-phase-0-and-lite-mode.yml](./task.197.gate.1.pipeline-entry-docs-phase-0-and-lite-mode.yml)

### Test Coverage Summary
- **Tests Executed**: 5969
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
`--mode fast` is described as forcing lite at four sites, but it is refused unless `develop.skippable` allows it (QA1-CR-1, medium). The task-development Q1 recommendation omits the `feature/*` case (QA1-CR-2, low).

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                        | Author      |
| ---------- | ------- | ------------------------------------------------------------------ | ----------- |
| 2026-10-07 | 1.0     | Initial draft — cut from the 2026-10-07 doc-drift audit | create-task |
| 2026-10-20 | 1.1     | Review passed (8/10) — fixes re-worded for task.201's `--mode`/answer flags; link check made local (CI filter misses `skills/`, `.agents/plans/`); SC-9 adds the two doc-reading tests | review-task |
| 2026-10-20 |         | Status → ready-for-development | review-task |
| 2026-10-20 |         | Implemented — 16 findings fixed across 13 docs, 1 same-family primer line (day-4), audit report marked; no tests added (docs only) | develop |
| 2026-10-20 |         | QA gate CONCERNS (90/100) — 2 findings | qa-task |
| 2026-10-20 |         | QA findings fixed — QA1-CR-1 (`--mode fast` wording, 4 sites), QA1-CR-2 (Q1 recommendation), advisory CR-4 (worktree base); 1 iteration | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Re-verify

- [x] Complete

### Phase 1: Overview (README, concepts, operations, examples)

- [x] Complete

### Phase 2: Reference

- [x] Complete

### Phase 3: Runbooks

- [x] Complete

### Phase 4: Standards

- [x] Complete

### Phase 5: Skill READMEs

- [x] Complete

### Phase 6: Close-out

- [x] Complete

---

## References

- Audit report: [`.agents/plans/doc-drift-audit-2026-10-07.md`](../../../.agents/plans/doc-drift-audit-2026-10-07.md)
- PR #598 — the 12 high-severity fixes

---

## Notes

- QA report: `task.197.qa.{n}.pipeline-entry-docs-phase-0-and-lite-mode.md`
- Quality gate: `task.197.gate.{n}.pipeline-entry-docs-phase-0-and-lite-mode.yml` (co-located)
- Siblings: task.196, task.198, task.199. One shippable unit each, independent; all start after PR #598 merges.
