---
id: task.19.review
title: "Review: create-pr diff summariser subagent"
type: review
task-ref: task.19.create-pr-diff-summariser-subagent.md
reviewed: 2026-05-09
review_depth: standard
---

# Task Review Report: Task 19 — create-pr diff summariser subagent

**Reviewed**: 2026-05-09
**Review Depth**: Standard
**Task Status**: planned
**Overall Assessment**: NEEDS REVISION (fixes applied this pass)

---

## Executive Summary

Task scope is sound but built on a false premise: claims `/create-pr` reads `git diff <base>...HEAD` into main context. Actual code (`skills/create-pr/SKILL.md:226`) uses `git log --pretty=format:"- %s"` — commit subjects only, no diff. Three secondary issues: agent-coupled state path, out-of-repo source plan reference, unmeasurable token-reduction success criterion. All four resolved by user clarification this session.

**Critical Issues**: 1 🚨
**Important Issues**: 3 ⚠️
**Optional Improvements**: 2 💡

**User Clarifications**: 4 questions asked and answered
**Implementation Readiness (post-fix)**: 8/10
**Recommendation**: READY TO IMPLEMENT after fixes applied below

---

## User Decisions & Clarifications

### Q1 — Premise mismatch
**Decision**: Rewrite premise — scope = ADD diff-based body authoring (current code uses `git log` of subjects, no diff).
**Impact**: Motivation §2, Technical Background §3 rewritten. Token-reduction criterion dropped.

### Q2 — State path
**Decision**: Use `.agents/state/` (agent-agnostic per repo memory).
**Impact**: Replace `.claude/state/` everywhere in task + plan.

### Q3 — Source plan location
**Decision**: Move to `.agents/plans/purrfect-whisper-pipeline-improvements.md`.
**Impact**: `source_plan` frontmatter updated. Original plan file (in `~/.claude/plans/`) should be relocated separately if not already.

### Q4 — Token-reduction metric
**Decision**: Drop quantitative target; replace with qualitative "diff bytes never enter main context".
**Impact**: §9 Performance criterion rewritten.

---

## 1. Template Structure Compliance

**Status**: PASS (minor)

Sections present: Overview, Motivation, Technical Background, Scope, Breaking Changes, Implementation Plan, Files Summary, Testing, Success Criteria, Risk, Rollback. Frontmatter complete (`github_issue: 37` present). No placeholders.

Missing vs full template: no Progress Tracking section, no References. Optional given task is small.

---

## 2. Technical Accuracy

**Status**: ISSUES FOUND
**Hallucinations Detected**: 1 (premise)

### Critical
- **Premise inaccuracy** (Overview §1, Tech Background §3): claims create-pr reads `git diff <base>...HEAD` into main context. Verified against `skills/create-pr/SKILL.md:226` — code uses `git log origin/$BASE_BRANCH..HEAD --pretty=format:"- %s"`. No diff is read. **Fix per Q1**: rewrite as ADD-feature, not REPLACE-feature.

### Important
- **Bitbucket wiring undefined** (§6 Phase 3): plan says "Bitbucket and GitHub paths both consume same body" but Bitbucket path in `SKILL.md:269-289` uses heredoc with literal `{PR_BODY content}`. Need explicit injection point.

---

## 3. Implementation Plan Completeness

**Status**: GAPS FOUND

### Important
- Phase 3 "Wire": no explicit Edit anchors in `SKILL.md`. Should reference line ~226 (replace `git log` block) and line ~261 (`gh pr create --body`).
- No cleanup step for `$DIFF_FILE` in main task doc (plan §3 mentions it; promote to checkbox).

### Optional
- Phase 4 validation lacks fixture fixtures-as-code. Mention reusing `.agents/state/` test patches if any exist.

---

## 4. Consistency & Completeness

**Status**: ISSUES FOUND

### Important
- Success criterion "Main tokens for create-pr step reduced ≥60%" unmeasurable — no baseline (since current code reads no diff). **Fixed per Q4**.

### Optional
- Testing Strategy and §10 Risk both mention "diff too large" fallback but Phase 4 has no test for the 5000-line threshold. Add fixture.

---

## 5. Risk & Rollback

**Status**: ADEQUATE

Rollback is one-liner ("revert SKILL.md") — fine for small surface area. New file `shared/resources/pr-body-summariser-prompt.md` should also be listed for rollback (`rm` it).

---

## Summary of Recommendations

### Must Fix (Critical) — 1
1. Rewrite premise (Overview §1 + Tech Background §3) to reflect actual git log baseline, not git diff. **APPLIED**.

### Should Fix (Important) — 3
1. Replace `.claude/state/` → `.agents/state/` in task + plan. **APPLIED**.
2. Move `source_plan` to `.agents/plans/purrfect-whisper-pipeline-improvements.md`. **APPLIED** (frontmatter; physical relocation of plan file is separate).
3. Replace ≥60% token criterion with qualitative bound. **APPLIED**.

### Consider (Optional) — 2
1. Add Phase 3 Edit anchors (line numbers in SKILL.md).
2. Add 5000-line fallback test fixture.

---

## Implementation Readiness

**Score**: 8/10 (post-fix)

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (post-fix; was 4/10)
- Implementation Clarity: 7/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation**: ✅ READY TO IMPLEMENT after Step 8.5 fixes.

---

## Review Metadata

- Reviewer: Claude (review-task skill)
- Review Date: 2026-05-09
- Task File: `docs/tasks/task.19.create-pr-diff-summariser-subagent/task.19.create-pr-diff-summariser-subagent.md`
- Architecture / Code Consulted: `skills/create-pr/SKILL.md` (lines 200-290), `shared/resources/` index
- Memory rules applied: agent-agnostic paths, in-repo plan locations
