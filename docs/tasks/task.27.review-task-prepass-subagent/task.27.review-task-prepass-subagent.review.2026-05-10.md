# Task Review Report: Task 27 — `review-task` pre-pass via 2 parallel Explore subagents

**Reviewed:** 2026-05-10
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** NEEDS IMPROVEMENT

---

## Executive Summary

Task 27 is a clean, well-scoped mirror of accepted task.16 but the implementation plan under-specifies a load-bearing detail: the shared prompt file from task.16 is story-specific (variables `{story_path}`/`{epic_path}`, sections "ACs / Dev Notes / Tasks"). Marking it "Reused" with no adaptation phase will fail at dispatch. Other gaps are template-compliance: missing Progress Tracking, References, thin Rollback Plan, and a non-measurable success criterion.

**Critical Issues:** 3 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 5 questions asked and answered
**Implementation Readiness:** 6/10
**Recommendation:** NEEDS REVISION (fixes applied automatically — see Step 8.5 below)

---

## User Decisions & Clarifications

### Question Point 1 — Structure & Scope

**Q1**: Shared prompts use story-specific vars/sections — how to handle for tasks?
- **Decision**: **Fork into new file** `shared/resources/review-task-prepass-prompts.md` with task-adapted Agent B + C prompts.
- **Impact**: Implementation plan needs new Phase 0 to author this file; Files Summary moves the entry from Reused → New.

**Q2**: Phase 1.5 insertion point in `skills/review-task/SKILL.md`?
- **Decision**: **After Step 1, before Step 2** (mirrors task.16 placement).
- **Impact**: Phase 1 description tightened — explicit step boundaries.

**Q3**: Missing sections — which to add?
- **Decision**: **All four** — Progress Tracking, References, Detailed Rollback, Measurable success criteria.

### Question Point 2 — Implementation Plan

**Q4**: Plan updates required?
- **Decision**: Add Phase 0 (author task prompts), add file under New in Files Summary, add fallback test phase, add regression test.

### Question Point 3 — Status

**Q5**: Promote status after fixes?
- **Decision**: **ready-for-development** — fixes will be applied in Step 8.5.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Critical
- None.

### Important
- **Missing Progress Tracking section** — required by task template; task.16 has it.
- **Missing References section** — required by task template; task.16 has it.

### Optional
- Motivation lacks `Current Problems` / `Benefits` subsections (task.16 uses them).
- `assignee: TBD` — minor metadata gap.

### Recommendations
1. Add Progress Tracking with checkboxes mirroring Implementation Plan phases — _per Q3_.
2. Add References block with links to task.16, GitHub issue #45, related skills, source plan — _per Q3_.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (no invented technologies — all references valid)

### Critical
- **C1 — Mismatched prompt reuse**: Task body line 73 marks `shared/resources/review-story-prepass-prompts.md` as **Reused**, but that file's prompts contain `{story_path}`, `{epic_path}` variables and reference story-only sections ("Acceptance Criteria, Tasks, Dev Notes"). Tasks have neither variables nor sections. The dispatcher will substitute task paths into a prompt that asks for story content → degraded subagent output.
  - **Location:** Section 7 (Files Summary) entry 2; Section 6 Phase 1 ("Reference shared prompts from task.16").
  - **Evidence:** Verified contents of `shared/resources/review-story-prepass-prompts.md` lines 16-110 — story-specific throughout.
  - **Fix:** Fork into `shared/resources/review-task-prepass-prompts.md` with task-adapted prompts (Agent B reads architecture + task Implementation Plan / Files Summary; Agent C extracts symbols from task Phases / Files). _Per Q1._

### Important
- None additional in this category.

### Recommendations
1. Add Phase 0 to Implementation Plan: author the task prompt file — _per Q4_.
2. Move prompt-file entry from "Reused" → "New" in Files Summary — _per Q4_.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Critical
- **C2 — Insertion point ambiguous**: Phase 1 says "Add Phase 1.5 between resolution and Q&A". The current `skills/review-task/SKILL.md` has Step 0 (output format) → Step 1 (load) → Step 2 (template) → Question Point 1. "Resolution" and "Q&A" both span multiple steps.
  - **Fix:** Specify "between Step 1 and Step 2" explicitly. _Per Q2._
- **C3 — No phase to author task-specific prompts**: Without Phase 0, the dispatch phase has no prompt source to reference.
  - **Fix:** Insert Phase 0 (author `shared/resources/review-task-prepass-prompts.md`) before current Phase 1. _Per Q4._

### Important
- **I3 — Vague file changes**: Phase 1 says "Reference shared prompts from task.16" — should name the file path explicitly post-fork.
- **I4 — Missing dependencies between phases**: Phase 2 (Q&A consumption) depends on Phase 1 (dispatch wired); not stated.

### Recommendations
1. Renumber phases: Phase 0 (author prompts) → Phase 1 (wire dispatch) → Phase 2 (Q&A consumption) → Phase 3 (validation: catalog + tests).
2. Each phase: explicit file paths, risk level, dependencies, change checkboxes.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important
- **I5 — Non-measurable success criterion**: "Q&A length reduced vs baseline" lacks a baseline reference and metric. _Per Q3._
  - **Fix:** Replace with measurable target, e.g. "Question Point 2 (technical clarifications) reduced ≥1 question on at least one fixture task with architectural conflict".
- **I6 — Testing Strategy missing fallback test**: task.16 explicitly tests 1-agent-fails fallback; task.27 omits this. _Per Q4._
- **I7 — Testing Strategy missing regression test**: task.16 verifies "existing review-task output unchanged"; task.27 omits this. _Per Q4._

### Recommendations
1. Add fallback test scenario: simulate Agent B timeout, confirm Q&A proceeds with Agent C summary only.
2. Add regression test: dispatch on task with no architectural conflict and no existing implementation; confirm output identical to pre-task baseline.
3. Replace "Q&A length reduced" with quantifiable target.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

### Important
- **I8 — Rollback Plan thin**: Currently 1 sentence ("Revert `skills/review-task/SKILL.md`. Pre-pass additive."). Doesn't cover the new prompt file deletion or catalog regen. _Per Q3._
- **I9 — Missing Low-risk areas**: task.16 lists "token overhead" as Low risk; task.27 omits. Same risk applies.

### Recommendations
1. Expand Rollback Plan with: (a) revert `skills/review-task/SKILL.md`, (b) delete `shared/resources/review-task-prepass-prompts.md`, (c) re-run `npm run generate-catalog`, (d) verification via `/review-task` on a known task.
2. Add Low-risk entry for token overhead with mitigation.

---

## Summary of Recommendations

### Must Fix (Critical) — 3 issues
1. Fork shared prompt file → `shared/resources/review-task-prepass-prompts.md` (Files Summary update + Phase 0).
2. Specify Phase 1.5 insertion point as "between Step 1 and Step 2" of `skills/review-task/SKILL.md`.
3. Add Phase 0 (author task prompts) to Implementation Plan.

### Should Fix (Important) — 7 issues
1. Add Progress Tracking section.
2. Add References section.
3. Tighten Phase 1 file/path specificity post-fork.
4. Add explicit phase dependencies.
5. Replace non-measurable success criterion.
6. Add fallback test scenario.
7. Add regression test scenario.
8. Expand Rollback Plan (3 steps + verification).
9. Add Low-risk entry for token overhead.

### Consider (Optional) — 3 items
1. Restructure Motivation with Current Problems / Benefits subsections.
2. Set `assignee` field to a real value or `unassigned`.
3. Add Validation phase (Phase 3) including `npm run generate-catalog` checkbox.

---

## Implementation Readiness Assessment

**Score:** 6/10

| Dimension | Score |
|---|---|
| Template Compliance | 6/10 |
| Technical Accuracy | 5/10 |
| Implementation Clarity | 5/10 |
| Consistency | 6/10 |
| Risk Management | 7/10 |

**Confidence Level for Successful Implementation:** Medium (post-fix: High).

**Recommendation:** ⚠️ **NEEDS REVISION** — fixes will be applied in Step 8.5 per user decision.

**Justification:** Task structure and intent are sound and the mirrored task.16 is a strong reference, but the prompt-reuse claim is structurally wrong and the plan is missing the phase that would make it correct. With the fixes below, score should rise to ≥8.

---

## Next Steps

After auto-fixes (Step 8.5):
1. Verify edits — confirm Phase 0 added, Files Summary updated, missing sections present.
2. Status promoted to `ready-for-development` (Step 9).
3. Run `/develop-task` to begin implementation.

---

## Review Metadata

- **Reviewer:** Claude Code (review-task skill)
- **Review Date:** 2026-05-10
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.27.review-task-prepass-subagent/task.27.review-task-prepass-subagent.md`
- **Architecture Docs Consulted:** N/A (skills-repo task — references skills/, shared/resources/)
- **Reference Task:** `task.16.review-story-prepass-subagent.md` (accepted, PR #52)
- **Shared Resource Verified:** `shared/resources/review-story-prepass-prompts.md` (exists, story-specific)
