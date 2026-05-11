# Task Review Report: Task 22 — `/finalise` DoD parallel checks

> **Implementation Status**: ✅ All 4 important recommendations implemented — 2026-05-09

**Reviewed:** 2026-05-09
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD (needs minor revision)

---

## Executive Summary

Task is well-scoped, technically grounded, and traces cleanly to the source plan. Main gaps are template completeness (3 missing sections), an unmeasured baseline behind the headline performance criterion, a thin rollback plan, and an unstated scope expansion (docs/changelog becomes a new 4th DoD check, not a refactor of an existing one). No hallucinations detected — file paths and the parallel-Explore pattern align with current `skills/finalise/SKILL.md` and repo conventions.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION (small, targeted)

---

## User Decisions & Clarifications

### Q1 — Missing template sections
- **Decision**: Add all three (Progress Tracking, References, Notes)
- **Impact**: Recommendation 1 below applies all three.

### Q2 — Docs/changelog subagent
- **Decision**: New 4th check (scope expansion, not extraction)
- **Impact**: Motivation + Scope must call this out explicitly so reviewers/devs understand the DoD surface grows.

### Q3 — `~40` writes baseline
- **Decision**: Estimated — measure first
- **Impact**: Add Phase 0 baseline measurement; rephrase success criterion to reference measured value.

### Q4 — Rollback completeness
- **Decision**: Add prompt-file deletion + packager note
- **Impact**: Rollback Plan extended with explicit cleanup steps.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Important
- **Missing sections** vs `skills/review-task/resources/task-template.md`:
  - `## Progress Tracking`
  - `## References`
  - `## Notes`
- Frontmatter `assignee: TBD` — acceptable but unset.

### Optional
- Frontmatter `depends_on: —` uses an em-dash; convention elsewhere is empty list or omission.

### Recommendations
1. **Add Progress Tracking, References, Notes sections** — _Per Q1_. Progress Tracking should mirror Phase 1–4 checkboxes; References should list `skills/finalise/SKILL.md`, `.agents/plans/purrfect-whisper.md`, `references/definition-of-done-checklist.md`.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Verified:
- `skills/finalise/SKILL.md` exists; current Steps 3 (AC), 4 (Security), 5 (Compliance) confirmed at lines 300/396/499.
- Idempotent marker pattern referenced at SKILL.md:786 (canonical PR comment marker) — pattern exists, plan reuse valid.
- `shared/resources/` is the correct home for cross-skill prompt files (CLAUDE.md / AGENTS.md confirms packager auto-bundles + path-rewrites).
- `.agents/plans/purrfect-whisper.md` exists locally — frontmatter `source_plan` resolves.

### Important
- **Docs/changelog is a *new* check, not a refactor** — _Per Q2_. Current SKILL.md has no discrete docs subagent; doc verification is implicit in Step 3 AC pass. Task should make this scope expansion explicit.

### Recommendations
1. **Update §2 Motivation and §4 Scope** to state: "Adds a 4th DoD check (docs/changelog) as part of this refactor; previously implicit in AC step."

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important
- **No baseline measurement phase** — `~40 writes` is estimated, not observed. Headline success criterion depends on it.
- **"3 representative tasks"** in Phase 4 undefined — which tasks/stories?
- **Story-type → security checklist mapping** not enumerated in plan (api/ui/data/auth/infrastructure listed in plan file but no source-of-truth pointer to existing checklist contents in `references/definition-of-done-checklist.md`).

### Optional
- Phase 1 prompts in `task.22.plan.*.md` are sketched — should specify YAML schema fields explicitly (status enum values, citation format).
- No mermaid diagram of parallel fan-out; one would clarify aggregation/failure semantics.

### Recommendations
1. **Insert Phase 0 — Baseline Measurement** — _Per Q3_: instrument current `/finalise` on one representative completed task, count actual DoD writes, record number. Rephrase success criterion: "writes reduced ≥80% from measured baseline" (or use actual number once captured).
2. **Name the 3 validation tasks** in Phase 4 (e.g. cite specific story.X.Y or task.N IDs accepted in last 2 sprints).
3. **Reference the security-checklist mapping** in `references/definition-of-done-checklist.md` from each prompt file.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important
- **Scope mismatch with current SKILL.md** — task implies "4 currently-serial checklists" but SKILL.md has 3. Aligned with Q2 decision: this is the new docs check.
- **Testing Strategy** lacks unit-level coverage — golden-run comparisons only. Acceptable for skill-level changes but should explicitly state "skill-level integration tests only — no unit tests applicable."

### Optional
- Idempotent re-run criterion good; add explicit assertion that prompt-file changes don't break catalog generation (`npm run generate-catalog`).

### Recommendations
1. **Clarify in Motivation** that current state has 3 checks, target is 4 parallel.
2. **Add Testing Strategy preamble**: "No unit tests — skill is markdown + prompt files. Validation via golden-run comparison + scenario simulation."

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

### Important
- **Rollback plan thin** — only mentions reverting SKILL.md. New prompt files in `shared/resources/` and packaging artifacts not addressed.

### Recommendations
1. **Extend Rollback Plan** — _Per Q4_:
   ```
   1. git revert commit modifying skills/finalise/SKILL.md
   2. rm shared/resources/finalise-dod-{ac,security,compliance,docs}-prompt.md
   3. python skills/create-skill/scripts/package_skill.py skills/finalise
   4. npm run generate-catalog
   5. Verify finalise.zip no longer references the deleted prompt files
   ```

---

## Summary of Recommendations

### Must Fix (Critical) — 0
_None._

### Should Fix (Important) — 4
1. Add Progress Tracking + References + Notes sections (Q1).
2. Update Motivation/Scope to flag docs/changelog as a new 4th check (Q2).
3. Insert Phase 0 baseline measurement; rephrase write-reduction criterion against measured value (Q3).
4. Extend Rollback Plan with prompt-file deletion + packager regen (Q4).

### Consider (Optional) — 3
1. Name the 3 representative validation tasks in Phase 4.
2. Add a mermaid flowchart of parallel fan-out + aggregation/failure semantics.
3. Spell out YAML schema (status enum, citation format) in each prompt file.

---

## Implementation Readiness Assessment

**Score:** 7/10

| Dimension | Score |
|---|---|
| Template Compliance | 6/10 |
| Technical Accuracy | 9/10 |
| Implementation Clarity | 7/10 |
| Consistency | 7/10 |
| Risk Management | 6/10 |

**Confidence:** Medium-High
**Recommendation:** ⚠️ NEEDS REVISION — fixes are mechanical, no design rework required. After applying the 4 important fixes the task is READY TO IMPLEMENT.

---

## Next Steps

1. Apply fixes from Step 8.5 (offer follows).
2. After fixes, status promotes Planned → Ready for Development.
3. Run `/develop` (or develop-task pipeline) to begin implementation.

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.22.finalise-dod-parallel-checks/task.22.finalise-dod-parallel-checks.md`
- **Architecture Docs Consulted:** `skills/finalise/SKILL.md`, `skills/review-task/resources/task-template.md`, `AGENTS.md`
- **Tracker:** GitHub issue #40 (OPEN, verified)
