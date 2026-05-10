---
id: task.31.review
title: "Review: Develop-task pipeline Phase 0 parallel fan-out"
type: review
task-ref: task.31.develop-task-pipeline-phase-0-parallel-fanout.md
review_date: 2026-05-10
review_depth: standard
---

# Task Review Report: Task 31 — Develop-task pipeline Phase 0 parallel fan-out

**Reviewed:** 2026-05-10
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** MAJOR ISSUES — work already implemented upstream

> **Implementation Status**: ✅ All 5 critical+important recommendations implemented — 2026-05-10

---

## Executive Summary

Task.31 proposes refactoring `skills/develop-task/SKILL.md` Phase 0 to parallel-dispatch resolver + tracker poller + lite-mode detector. Investigation shows task.25 (accepted 2026-05-10) already implemented this in the shared resource `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, which `skills/develop-task/SKILL.md:46` delegates to entirely. develop-task has no own Phase 0 to refactor.

User decision: **rescope task.31 to verification** (validate develop-task wall-clock reduction, no skill edits).

**Critical Issues:** 2 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 2 questions answered
**Implementation Readiness:** 4/10 (as written) → 8/10 (after rescope)
**Recommendation:** NEEDS REVISION — apply rescope per user decisions

---

## User Decisions & Clarifications

### Q1: Disposition given task.25 already implemented this
- **User Decision**: Rescope to verification — reduce task.31 to verify develop-task wall-clock reduction matches story, add explicit acceptance test for develop-task path. No SKILL.md edit.
- **Impact**: Removes Phase 2 (Refactor dispatch); retains Phase 1 (Independence audit — already done) and Phase 3 (Validation). Drops "Replace serial Phase 0" from plan.md.

### Q2: Files Summary path inaccuracy
- **User Decision**: Update Files Summary to `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`.
- **Impact**: Frontmatter/body file references point to actual implementation site.

---

## 1. Template Structure Compliance — PASS

All required sections present. Filename uses correct DOTS-and-hyphens convention. Metadata complete: status=planned, priority=Medium, effort=~0.25 day, depends_on=[task.23, task.25], github_issue=49.

### Optional
- Plan file frontmatter `task-ref:` value lacks the directory prefix vs convention — cosmetic only.

---

## 2. Technical Accuracy — ISSUES FOUND

### Critical (Hallucination — by omission)
- **Phantom Phase 0 in develop-task SKILL**: Task body §3 claims "`skills/develop-task/SKILL.md` Phase 0 mirrors develop-story's serial pattern". Verification (`skills/develop-task/SKILL.md:44–46`) shows Phase 0 is a single-line delegation to `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`. There is no serial pattern in the file to refactor.
  - **Recommendation (per Q1)**: Rewrite §3 to: "develop-task delegates Phase 0 to the shared resource, which task.25 already converted to parallel dispatch. This task verifies the develop-task code path benefits from that change."

### Critical (Already-implemented)
- **Implementation already shipped**: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:99` defines section `0a-parallel. Parallel Phase 0 Fan-out` dispatching 3 Explore agents in a single parallel message (resolver + tracker poller + lite-mode/board detector). Both `skills/develop-story/SKILL.md` and `skills/develop-task/SKILL.md` reference this shared resource.
  - **Evidence**: grep `develop-pipeline-step-0-resolve` matches both skill files; shared doc line 3 description: "Phase 0 (resolve-and-prepare) shared by develop-story and develop-task."
  - **Recommendation (per Q1)**: Rescope task to verification only.

### Important
- **Files Summary inaccurate**: lists `skills/develop-task/SKILL.md` (Q2 → fix to shared resource path).

---

## 3. Implementation Plan Completeness — GAPS

### Critical
- **Phase 2 obsolete**: "Refactor dispatch — Single message, 3 parallel tool calls" cannot be applied where there is no serial code to replace. Plan.md Phase 2 instructs replacing serial Phase 0 in develop-task SKILL.md with a markdown block — content already exists in shared resource.
  - **Recommendation (per Q1)**: Drop Phase 2 entirely. Replace with verification phase.

### Important
- **Phase 1 Independence audit**: Already performed in task.25 Phase 1 (checkboxes complete). Either mark inherited or remove.
- **Phase 3 success criteria**: "Wall-clock reduced ≥50%" untested for develop-task path. This is the legitimate residual work — keep, expand to specify measurement protocol.

---

## 4. Consistency & Completeness — ISSUES

### Important
- **Success Criteria mismatch with rescope**: "3 dispatches in single block" and "Lock-file unchanged" are properties of task.25's deliverable, not task.31's. Under rescope, success criteria should be: (a) develop-task path empirically uses parallel dispatch (single tool-call block at runtime); (b) wall-clock reduction measured; (c) one regression test guarding against develop-task drifting from shared resource.
- **Testing Strategy thin**: "Real run on representative task. Compare wall-clock." — needs concrete baseline source (which task to re-run, what timing instrument). Plan.md §Testing references injecting `gh` 403 — good; carry into task body.

### Optional
- **Mirrors note**: `mirrors: task.25` in frontmatter is accurate; under rescope, restate body §1 to clarify task.31 *verifies* rather than *mirrors* implementation.

---

## 5. Risk & Rollback Assessment — ADEQUATE (post-rescope)

Risk Low; Rollback "Revert SKILL.md change" no longer applicable under rescope (no edit). Update rollback to: "N/A — verification-only task; no production changes."

---

## Summary of Recommendations

### Must Fix (Critical) — 2

1. **Rescope task to verification** (per Q1). Update §1 Overview, §3 Technical Background, §6 Implementation Plan (drop Phase 2), §9 Success Criteria, §11 Rollback. Source-of-truth implementation = task.25 via shared resource.
2. **Correct Files Summary path** (per Q2): `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (read-only reference; no modifications).

### Should Fix (Important) — 3

3. Mark Phase 1 inherited from task.25; expand Phase 3 with explicit measurement protocol (which task to time, baseline reference).
4. Rewrite Success Criteria to verification-shaped outcomes.
5. Strengthen Testing Strategy: name the representative task and timing method; carry over `gh` 403 injection from plan.md.

### Consider (Optional) — 1

6. Reword §1 from "Mirror of task.25" to "Verification of task.25 develop-task path" to avoid implying duplicate implementation.

---

## Implementation Readiness Assessment

**Score (as written):** 4/10 — primary deliverable already exists; plan would produce no-op or duplicate logic.
**Score (after rescope):** 8/10 — narrow, well-defined verification task.

**Scoring Breakdown (as written):**
- Template Compliance: 9/10
- Technical Accuracy: 2/10 (misstates current state of develop-task)
- Implementation Clarity: 4/10 (Phase 2 actionable but wrong target)
- Consistency: 5/10
- Risk Management: 7/10

**Recommendation:** ⚠️ NEEDS REVISION — apply rescope edits, then ready to implement.

---

## Next Steps

1. Apply Critical fixes to task body and plan (rescope, file path).
2. Apply Important fixes (Phase 1 inheritance note, Success Criteria rewrite, Testing Strategy detail).
3. Status remains `planned` until rescope is reviewed; then promote to `ready-for-development`.

---

## Review Metadata

- **Reviewer**: Claude (Opus 4.7)
- **Review Date**: 2026-05-10
- **Task File**: docs/development/tasks/task.31.develop-task-pipeline-phase-0-parallel-fanout/task.31.develop-task-pipeline-phase-0-parallel-fanout.md
- **Architecture Docs Consulted**: shared/resources/develop-pipeline-step-0-resolve-and-prepare.md; task.25 task doc + plan
- **Review Depth**: Standard
