---
id: task.20.review
title: "Review Report: qa-story traceability mapper subagent"
type: review
task-ref: task.20.qa-story-traceability-mapper-subagent.md
reviewed: 2026-05-09
review_depth: standard
---

# Task Review Report: Task 20 — Pre-`/qa-story` traceability mapper subagent

**Reviewed:** 2026-05-09
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD — minor revisions needed

---

## Executive Summary

Task is coherent, scoped tight, and additive (no breaking changes). Two substantive defects: a wrong file path in §7, and an unspecified mechanism for passing the matrix path into `/qa-story` (a Skill, not a CLI binary, so `--flag` syntax is misleading). Plan also misnames matrix location as `<task-dir>/.summaries/` when stories are the unit being reviewed.

**Critical Issues:** 1 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 3 questions answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION (minor — fixes mechanical)

---

## User Decisions & Clarifications

### Q1: Pipeline file path
- **User Decision**: Fix task §7 to point at `shared/resources/develop-pipeline-step-5-6-qa-loop.md`.
- **Impact**: Phase 3 + Files Summary updated to real path.

### Q2: Matrix output location
- **User Decision**: `<story-dir>/.summaries/qa-traceability-matrix.md`.
- **Impact**: Plan Phase 1 corrected; matches story-level review unit.

### Q3: Arg-passing mechanism
- **User Decision**: Skill arg in invocation (e.g. `Skill(qa-story, args="traceability_matrix=<path>")`).
- **Impact**: Drop `--traceability-matrix` CLI-flag framing; document Skill `args` field instead.

---

## 1. Template Structure Compliance

**Status:** PASS

All required sections present. Frontmatter complete. `github_issue: 38` linked and verified open.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND

### Critical
- **Wrong path** in §7 Files Summary: `skills/develop-story/references/develop-pipeline-step-5-6-qa-loop.md` does not exist. Real location: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`.
  - **Location:** §7 entry 1; plan §"Phase 3 — Orchestrator wiring"
  - **Fix:** Replace path; per project convention, shared cross-skill docs live under `shared/resources/` and packager auto-bundles into skill zips.

### Important
- **Misleading CLI-flag framing**: `--traceability-matrix <path>` implies argv. `/qa-story` is a Claude Skill invoked via the Skill tool, which accepts an `args` string. Document the actual mechanism.
  - **Location:** §6 Phase 1 + Phase 4; plan Phase 4
  - **Fix:** Replace with Skill `args` convention: `args="traceability_matrix=<path>"`.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important
- **Matrix output path mismatch**: Plan Phase 1 writes matrix to `<task-dir>/.summaries/`, but `/qa-story` reviews stories. Should be `<story-dir>/.summaries/qa-traceability-matrix.md`.
  - **Fix:** Update plan Phase 1.

### Optional
- Phase 2 mapper prompt could specify how it discovers spec/src files when story File List is missing or stale. Currently relies on grep keywords only.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Phases align with goal. Testing strategy maps to success criteria (golden case comparison covers stability claim).

### Optional
- Performance criterion "Step 5 main reads reduced ≥40%" is hard to measure objectively — no baseline counter defined. Consider rewording to qualitative ("mapping no longer occurs in main context") or specifying the measurement method.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk (false-clear coverage) identified with mitigation (uncertainty column). Rollback is genuinely trivial — drop arg, behaviour reverts. No hidden coupling.

---

## Summary of Recommendations

### Must Fix (Critical) — 1
1. Correct §7 path to `shared/resources/develop-pipeline-step-5-6-qa-loop.md`.

### Should Fix (Important) — 2
2. Replace `--traceability-matrix` CLI-flag wording with Skill `args="traceability_matrix=<path>"`.
3. Update plan Phase 1 matrix path to `<story-dir>/.summaries/qa-traceability-matrix.md`.

### Consider (Optional) — 2
4. Reword the ≥40% reads-reduction criterion to be measurable, or qualitative.
5. Phase 2 prompt: handle missing/stale File List in story.

---

## Implementation Readiness

**Score:** 7/10

- Template Compliance: 9/10
- Technical Accuracy: 6/10 (wrong path, misleading flag)
- Implementation Clarity: 7/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ⚠️ NEEDS REVISION — fixes are mechanical. Promote to Ready for Development once applied.

---

## Next Steps

1. Apply Critical + Important fixes (1, 2, 3).
2. Optionally tighten performance criterion (4).
3. Update status `planned → ready-for-development`.

---

## Review Metadata

- Reviewer: Claude (review-task skill)
- Review Date: 2026-05-09
- Task File: `docs/tasks/task.20.qa-story-traceability-mapper-subagent/task.20.qa-story-traceability-mapper-subagent.md`
- Plan File: `task.20.plan.qa-story-traceability-mapper-subagent.md`
- Architecture Docs Consulted: AGENTS.md (shared/resources convention), `skills/qa-story/SKILL.md` (traceability section)
