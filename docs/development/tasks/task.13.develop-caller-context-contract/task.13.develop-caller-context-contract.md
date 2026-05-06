---
id: task.13
title: "Document caller-supplied context contract in /develop"
type: task
category: documentation
priority: Low
status: ready-for-review
created: 2026-05-06
assignee: TBD
effort: 0.25 day
depends_on: none
github_issue: 20
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #7)
---

# Task 13 — Document caller-supplied context contract in `/develop`

**Status:** Ready for Review
**Review:** ✅ All review recommendations from `task.13.develop-caller-context-contract.review.2026-05-06.md` implemented 2026-05-06

## 1. Overview

`develop-task` Step 3 prepends a "Pre-develop surface map" (Explore subagent output) when invoking `/develop`. The `/develop` skill itself has no documentation for this — it's effectively orchestrator-private context that works only because `/develop` reads anything in its prompt. Fine in practice, but undocumented and brittle to future edits.

**Scope**: add a one-paragraph "Caller-supplied context" note to `/develop` SKILL.md explaining that orchestrators may prepend a file-surface map (and a plan summary) that should be treated as authoritative for that run.

**Key deliverables**:

- New "Caller-Supplied Context" subsection in `develop/SKILL.md`
- Cross-reference from `develop-task` and `develop-story` step-3 references

**Expected outcome**: future `/develop` edits don't accidentally break the orchestrator interface.

## 2. Motivation

**Current Problems**:

- Orchestrator/leaf interface is implicit; a future `/develop` refactor could regress the pipeline silently
- Readers of `/develop` cannot tell what its callers depend on

**Benefits**:

- Explicit interface contract = safer refactors
- New orchestrators (e.g. a future `/develop-epic`) have a documented attach point

## 3. Technical Background

**What `develop-task` currently passes** (per `shared/resources/develop-pipeline-step-3-develop-loop.md`):

- A "Pre-develop surface map" — Explore agent output: max 20 file paths + 1-line descriptions
- Optionally a plan-file path (`task.{id}.plan.*.md`) included as context
- An iteration hint: "Resuming from partial completion" on iteration 2+

**Target**: document these as the supported caller-supplied context types. `/develop` should treat them as authoritative for that run (no re-Explore, no re-read).

## 4. Scope

**In Scope**:

- ✅ "Caller-Supplied Context" subsection in `develop/SKILL.md`
- ✅ List of supported context types: surface map, plan file path, iteration hint
- ✅ Cross-references from `develop-pipeline-step-3-develop-loop.md`

**Out of Scope**:

- ❌ Adding a structured envelope (e.g. JSON header) — current free-text prepend is fine
- ❌ Changing what `develop-task` actually passes (already correct)

## 5. Breaking Changes

None. Documentation-only.

## 6. Implementation Plan

### Phase 1 — Add subsection to develop SKILL.md (Risk: Low)

Files:

- `skills/develop/SKILL.md`

Changes:

- [x] Add "Caller-Supplied Context" subsection near the top of the workflow section
- [x] Enumerate the three supported context types with examples
- [x] State the rule: "If a caller prepends one of these, treat as authoritative — do not re-Explore or re-read"

### Phase 2 — Cross-reference from pipeline refs (Risk: Low)

Files:

- `shared/resources/develop-pipeline-step-3-develop-loop.md`

Changes:

- [x] Add a one-line link: "See `develop` skill's Caller-Supplied Context section for the contract"

## 7. Files Summary

**Modified**:

- `skills/develop/SKILL.md`
- `shared/resources/develop-pipeline-step-3-develop-loop.md`

## 8. Testing Strategy

- **Manual**: re-run `/develop-task` against a small task; verify `/develop` honours the prepended map (does not re-run Explore on iteration 1).
- **Review**: confirm the documented contract matches what `develop-pipeline-step-3-develop-loop.md` actually passes.

## 9. Success Criteria

**Functional**:

- [x] `develop/SKILL.md` documents the caller-supplied context types
- [x] `develop-pipeline-step-3-develop-loop.md` cross-references the contract

**Code Quality**:

- [ ] No behaviour changes — pure docs

## 10. Risk Assessment

**Low Risk** — None. Documentation-only change.

## 11. Rollback Plan

**Immediate**: revert the doc edits. No state changes.
