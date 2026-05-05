# Task Review Report: Task 2 — Extract develop-pipeline Step bodies into shared resources

**Reviewed:** 2026-05-05
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT (pre-fix); READY TO IMPLEMENT (post-fix)

---

## Executive Summary

Task captures the right strategic intent (continuing where Task 1 stopped, picking Strategy B) but ships with stale numerics, an inconsistent step range, sparse frontmatter, terse phases, and missing template sections (Files Summary, Testing Strategy, Rollback Plan). After applying the user-validated fixes from this review, the task is ready for implementation.

**Critical Issues:** 3 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 8 questions asked and answered (2 question points)
**Implementation Readiness:** 6/10 pre-fix → 8/10 post-fix
**Recommendation:** NEEDS REVISION (pre-fix); READY TO IMPLEMENT (post-fix)

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

- **Q1 (line counts):** Update to current actuals (develop-story=1153, develop-task=1119) and note post-Task-1 re-growth. *Impact: Motivation rewritten with correct measurements.*
- **Q2 (block count):** Change "5" → "4" (Task 1 shipped 4 shared files: autonomous-defaults, lite-mode, pause, resume-contract). *Impact: Motivation factual fix.*
- **Q3 (step range):** Steps 0–8 (pipeline ends at Step 8 commit + lock removal). *Impact: Title, Section 1, scope unified to 0–8.*
- **Q4 (strategy):** Lock in Strategy B; drop Pre-Phase A-vs-B spike. *Impact: Removes open question and one phase; Section 3 collapses to chosen approach.*

### Question Point 2: Detail, Tests, Risks, Frontmatter

- **Q5 (phase detail):** Full expansion — add Files / Changes / Risk Level / Dependencies per phase. *Impact: Section 4 becomes actionable for develop loop.*
- **Q6 (missing sections):** Add Testing Strategy + Rollback Plan + Files Summary. *Impact: Three new sections.*
- **Q7 (risk taxonomy):** Move ex-risks 3–4 to a new Opportunities subsection. *Impact: Risks section purified; high-yield extractions surfaced as priorities.*
- **Q8 (frontmatter):** Add priority+effort, depends_on:[1], github_issue (create + link), assignee. *Impact: Frontmatter brought to Task-1 parity.*

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Critical
- **Missing sections:** Files Summary, Testing Strategy, Rollback Plan (template §7, §8, §11). Required for an 8-phase refactor touching 5 skill packages.

### Important
- **Sparse frontmatter:** No `priority`, `effort`, `github_issue`, `depends_on`, `assignee`. Task 1 set the bar; Task 2 dropped below it.
- **Per-phase structure absent:** Phases 1–8 are one-liners; no Files / Changes / Risk Level / Dependencies blocks (template §6).
- **Risks lack structure:** No Probability / Impact / Mitigation / Rollback per risk (template §10).

### Optional
- No Progress Tracking section per phase (template §12) — Section 8 "Definition of Done" partially covers.

### Recommendations (per user decisions)
1. Add Files Summary, Testing Strategy, Rollback Plan — _Q6_.
2. Expand frontmatter with priority/effort/depends_on/github_issue/assignee — _Q8_.
3. Expand each phase with Files / Changes / Risk Level / Dependencies — _Q5_.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 2 (numeric drift, not invented tech)

### Critical
- **Stale line counts:** Motivation states `develop-story 1192→1139` and `develop-task 1153→1106`. Current repo: develop-story=1153, develop-task=1119 (post-Task-1 review passes 2–4 added lines back). _Q1 → update to actuals._
- **Block count wrong:** "5 token-swap-only contract blocks" — repo state has 4 shared files (autonomous-defaults, lite-mode, pause, resume-contract). _Q2 → change to 4._

### Important
- **Step range inconsistency:** Title & Section 1 say "Steps 0–9"; scope and phases enumerate up to Step 8. _Q3 → Steps 0–8._
- **Step 0 sub-naming:** Section 2 lists `0a/0b/0c/0c-reg/0d/0e/0f` — verify these exact sub-step labels exist in current SKILL.mds. (Not blocking; spot-check during Phase 1.)

### Recommendations (per user decisions)
1. Rewrite Motivation with verified numbers and 4-file count — _Q1, Q2_.
2. Unify all references to Steps 0–8 — _Q3_.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Critical
- **Phases too terse:** Each phase needs target shared file path, concrete change checkboxes, risk level, and inter-phase dependencies. Without this, develop loop has no actionable plan.
- **Pre-Phase spike unresolved:** Strategy A-vs-B left as a spike. _Q4 → drop spike, lock Strategy B._

### Important
- **No file naming scheme:** No explicit names for the 8 new shared docs (e.g. `develop-pipeline-step-1-create-branch.md`). Assumed but not stated.
- **No drift-canary procedure spec:** Success criterion mentions "drift canary" without defining the verification command.

### Recommendations (per user decisions)
1. Drop Pre-Phase; commit to Strategy B — _Q4_.
2. Expand each Phase with Files/Changes/Risk/Dependencies — _Q5_.
3. Specify target file names per phase.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Critical
- **No Testing Strategy:** Success criteria reference quick_validate + mental dry-run + real pipeline runs but no test plan section ties them together.
- **No Rollback Plan:** 8-phase refactor across 5 skill packages with no documented revert procedure.

### Important
- **No Files Summary:** Reader cannot enumerate the change surface in one place.
- **`depends_on` absent:** Frontmatter has `parent_task: 1` but not `depends_on: [1]`. Inconsistent with Task 1's frontmatter style.

### Optional
- **No body cross-link to Task 1:** References section links Task 1 file, but no header-line "Parent: Task 1" matching Task 1's body style.

### Recommendations (per user decisions)
1. Add Testing Strategy + Rollback Plan + Files Summary — _Q6_.
2. Add `depends_on: [1]` — _Q8_.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

### Critical
- **No rollback plan at all** — see §4. _Q6 → add._

### Important
- **Risk taxonomy mixed:** Risks #3 (GraphQL block) and #4 (tracker code) describe extraction *opportunities*, not risks. Tagged "Low" but the wording is "highest-confidence extraction candidates" — that's a priority signal, not a hazard. _Q7 → move to Opportunities subsection._
- **Risk #2 (Step 3 develop loop) lacks Probability/Impact:** Marked "Medium" but no explicit mitigation timeline.

### Optional
- **No rollback trigger criteria** — when does drift-canary fail count as a rollback signal vs. a forward fix?

### Recommendations (per user decisions)
1. Add structured Rollback Plan — _Q6_.
2. Reclassify Risks #3–4 as Opportunities — _Q7_.

---

## 6. Mermaid Diagrams

**Status:** N/A — no diagrams present, none required. The task is a content-extraction refactor; prose conveys structure adequately.

---

## Summary of Recommendations

### Must Fix (Critical) — 3
1. Add Files Summary + Testing Strategy + Rollback Plan sections.
2. Fix Motivation numerics (line counts + 4-file count).
3. Unify Step range to 0–8 across title, motivation, scope.

### Should Fix (Important) — 6
1. Expand frontmatter: priority, effort, depends_on:[1], github_issue, assignee.
2. Expand each Phase with Files / Changes / Risk Level / Dependencies.
3. Lock in Strategy B; drop Pre-Phase spike.
4. Specify target shared-file names per phase.
5. Reclassify Risks #3–4 as Opportunities.
6. Define drift-canary verification command.

### Consider (Optional) — 2
1. Add per-phase Progress Tracking checklists.
2. Add body-level Parent link to Task 1.

---

## Implementation Readiness Assessment

**Pre-fix Score:** 6/10
**Post-fix Score (projected):** 8/10

| Dimension | Pre | Post |
|---|---|---|
| Template compliance | 4/10 | 8/10 |
| Technical accuracy | 5/10 | 9/10 |
| Implementation clarity | 5/10 | 8/10 |
| Consistency | 6/10 | 9/10 |
| Risk management | 4/10 | 8/10 |

**Recommendation:** ⚠️ NEEDS REVISION (pre-fix) → ✅ READY TO IMPLEMENT (post-fix).

**Justification:** The strategic content is sound and Strategy B is the correct call (already validated by Task 1). All gaps are mechanical — numerics, missing sections, terse phases. Once user-decided fixes are applied, the document is implementation-ready.

---

## Next Steps

After fixes:
1. Run `/develop-task` against the updated document.
2. Begin with Phase 1 (Step 0 resolve-and-prepare) per the locked Strategy B.
3. Drift-canary check after each phase merge.

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-05
- **Review Depth:** Standard
- **Task File:** `docs/development/tasks/task.2.extract-pipeline-step-bodies/task.2.extract-pipeline-step-bodies.md`
- **Architecture Docs Consulted:** Task 1 doc, `shared/resources/develop-pipeline-*.md` listing, current SKILL.md line counts
