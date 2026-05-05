---
id: task.4
title: "finalise: route warning-path PR comments through PLATFORM branch"
type: task
category: refactoring
priority: Medium
status: 📋 Planned
created: 2026-05-05
assignee: TBD
effort: 0.5 day
depends_on: —
---

# Task 4 — finalise: route warning-path PR comments through PLATFORM branch

## 1. Overview

`skills/finalise/SKILL.md` already has a fully dual-pathed primary PR-comment block at lines 783-784 (GitHub `gh pr comment` ↔ Bitbucket REST). However, four follow-up warning/notification paths still hard-call `gh pr comment` regardless of platform: lines 882, 915, 1057, 1100. On a Bitbucket project these warnings silently fail.

**Scope**: Refactor those four call sites to reuse the `$PLATFORM` branch already established earlier in the skill body.

**Key deliverables**:

- Lines 882, 915, 1057, 1100 routed through the existing platform branch
- Inline helper or reusable snippet so future warnings stay DRY
- Updated SKILL.md
- Repackaged `finalise.zip`

**Expected outcome**: Every PR-comment side-effect in `finalise` lands on the correct platform's PR.

## 2. Motivation

**Current Problems**:

- Warning paths fire on edge cases (issue close failure, board-mutation retry failure, DoD gaps, post-completion gaps) and produce silent failures on Bitbucket.
- Inconsistency: primary path is dual-pathed but four secondary paths are not — confusing for maintainers and breaks the "do the same thing on both platforms" contract that the rest of the pipeline now upholds.

**Benefits**:

- Removes a quiet correctness gap where Bitbucket teams miss warnings.
- Locks in the convention: any `gh pr comment` outside an `if PLATFORM=github` block is a bug.

## 3. Technical Background

**Current** (`skills/finalise/SKILL.md`):

- Lines 312-329: platform detection block (correct)
- Lines 783-784: primary PR comment, dual-pathed (correct)
- Line 882: `Use \`gh pr comment <pr-number>\` to notify about gaps` (warning text — needs platform branch)
- Line 915: failure path of project-board mutation (`gh pr comment` hard-coded)
- Line 1057: gap notification (`gh pr comment <pr-number>`)
- Line 1100: post-condition (`gh pr comment <number>`)

**Target**: each of those four sites becomes either (a) an inline `if PLATFORM=github / elif PLATFORM=bitbucket` block, or (b) a call to a documented helper snippet defined once near line 783-784.

## 4. Scope

**In scope**:

- ✅ `skills/finalise/SKILL.md` lines 882, 915, 1057, 1100
- ✅ Optional: factor a reusable "post PR comment" snippet near the top of the skill body for reuse

**Out of scope**:

- ❌ Refactoring already-dual-pathed sections
- ❌ Jira MCP transitions (already correct)
- ❌ Behavior changes — output text is identical, only routing changes

## 5. Breaking Changes

None. Output text unchanged. Behavior on GitHub unchanged.

## 6. Implementation Plan

> Detailed implementation guide: [task.4.plan.finalise-platform-route-warning-paths.md](task.4.plan.finalise-platform-route-warning-paths.md)

**Phase 1 — Audit current call sites (Low risk)**

- Files: `skills/finalise/SKILL.md`
- Changes:
  - [ ] Confirm all four lines (882, 915, 1057, 1100) and any others surfaced by `grep -n 'gh pr comment' skills/finalise/SKILL.md`
  - [ ] Confirm `$PLATFORM` is in scope at each call site (it should be — set in Step 6 of the skill workflow which runs before any of the warning paths)

**Phase 2 — Replace each call site (Low risk)**

- Files: `skills/finalise/SKILL.md`
- Changes:
  - [ ] Line 882 (gap notification text): rewrite the prose to instruct platform-aware comment ("GitHub: `gh pr comment ...`; Bitbucket: REST POST as in Step 6")
  - [ ] Line 915 (board mutation retry failure): replace the inline `gh pr comment` with a platform branch
  - [ ] Line 1057 (gaps notification): same
  - [ ] Line 1100 (post-condition checklist): rewrite the checklist item from "GitHub PR comment posted via `gh pr comment <number>`" to "PR comment posted on the active platform"

**Phase 3 — Validate and repackage (Low risk)**

- Files: build artifact
- Changes:
  - [ ] `python skills/create-skill/scripts/quick_validate.py skills/finalise`
  - [ ] `python skills/create-skill/scripts/package_skill.py skills/finalise`
  - [ ] Final grep: every `gh pr comment` in SKILL.md must sit inside `if [ "$PLATFORM" = "github" ]`

## 7. Files Summary

**Core implementation**:

1. ✅ `skills/finalise/SKILL.md` — patch four warning-path call sites

**Build artifacts**:

2. ✅ `skills/finalise/finalise.zip` — regenerate

## 8. Testing Strategy

**Static**:

- `grep -nE '^\s*gh pr comment' skills/finalise/SKILL.md` returns only matches inside platform branches
- `quick_validate.py` passes

**Dual-env smoke** (manual):

- Trigger one of the warning paths (e.g., simulate a board-mutation failure by pointing to a non-existent project) on both GH and BB scratch repos. Verify the warning comment posts to the correct PR on each.

## 9. Success Criteria

**Functional**:

- [ ] All four call sites route through `$PLATFORM`
- [ ] GitHub-path warnings still post correctly
- [ ] Bitbucket-path warnings now post (previously silent)

**Code quality**:

- [ ] No `gh pr comment` outside platform branches (grep clean)
- [ ] `quick_validate.py` passes

**Migration**:

- [ ] No external doc changes — purely internal correctness fix

## 10. Risk Assessment

**LOW**

1. **Scope of change is small and mechanical**
   - Probability: Low risk of regression
   - Mitigation: Each call site changed in isolation, output identical

**MEDIUM**

2. **`$PLATFORM` not yet defined at one of the call sites**
   - Probability: Low (Step 6 of skill runs early)
   - Impact: Medium (warning silently fails)
   - Mitigation: Phase 1 explicitly verifies scope; if any site is upstream of detection, hoist the detection block earlier

## 11. Rollback Plan

**Immediate rollback (< 30 min)**: `git revert` the patch, regenerate zip. Behavior returns to current (broken on Bitbucket warnings, correct on GitHub).

**Forward fix**: any edge case in the BB REST snippet can be tightened in-place — no rollback needed.

**Triggers**: GitHub regression on any of the four warning paths.
