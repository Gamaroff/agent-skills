# Task Review Report: Task 12 — Document the canonical document-status lifecycle

**Reviewed:** 2026-05-06
**Review Depth:** Standard
**Task Status:** 📋 Planned
**Overall Assessment:** GOOD (after fixes — NEEDS REVISION before)

---

## Executive Summary

Task is well-scoped low-risk documentation work. Eight ambiguities resolved via clarifying questions: undefined target lifecycle, `Ready for QA` vs `Ready for Review` collision, missing `develop-story` cross-ref, vague Phase 2 placement, weak testing strategy, and self-contradiction in task.12's own frontmatter. After fixes, ready for implementation.

**Critical Issues:** 0 🚨
**Important Issues:** 8 ⚠️
**Optional Improvements:** 0 💡

**User Clarifications:** 9 questions asked and answered
**Implementation Readiness:** 8/10 (after fixes applied)
**Recommendation:** READY TO IMPLEMENT (post-fix)

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

- **Q1 — Self-drift in frontmatter**: Fix task.12 frontmatter to lowercase (`status: planned`).
- **Q2 — `Ready for QA` vs `Ready for Review`**: Canonical is `Ready for Review`; drop `Ready for QA`.
- **Q3 — `develop-story` missing**: Add to Phase 2 cross-ref list (9 skills total).
- **Q4 — Target lifecycle**: Define now in task. State machine: `Draft → Planned → Ready for Development → In Progress → Ready for Review → Accepted` with `Cancelled` as exit from any non-terminal state.

### Question Point 2: Technical & Implementation

- **Q5 — Cross-ref placement**: Top of each SKILL.md, immediately after frontmatter.
- **Q6 — CLAUDE.md placement**: Subsection under existing "File Naming Conventions".
- **Q7 — Self-migration**: Add explicit Phase 4 to migrate task.12 frontmatter as first migration.

### Question Point 3: Completeness & Safety

- **Q8 — Testing**: Add allow-list grep test (extract all `status:` values from skills, compare against canonical doc).
- **Q9 — Sync-rule AC**: Add measurable acceptance criterion (≥2 worked examples of simultaneous frontmatter+body update).

---

## 1. Template Structure Compliance

**Status:** PASS

All required sections present. Frontmatter complete. Tracker linked (`github_issue: 19`, verified OPEN). Filename correct.

### Issues

#### Important

- **Frontmatter `status: 📋 Planned`** uses emoji+Title — task body's own sync rule says frontmatter must be lowercase, no emoji.
  - **Location:** Frontmatter line 7
  - **Resolution (Q1):** Change to `status: planned`. Add as Phase 4 self-migration step.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

All referenced skills (`create-task`, `review-task`, `develop`, `qa-task`, `finalise`, `create-story`, `review-story`, `qa-story`) verified to exist. `shared/resources/` directory exists. `mermaid stateDiagram` is valid syntax. File paths follow project conventions.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved via decisions)

### Issues

#### Important

- **Target lifecycle undefined** — section 3 says "refine during implementation" with ambiguous arrow `↘ Cancelled` (no source state).
  - **Resolution (Q4):** Commit to: `Draft → Planned → Ready for Development → In Progress → Ready for Review → Accepted`. `Cancelled` reachable from any non-terminal state.

- **`develop-story` missing from Phase 2** — writes status, must be cross-referenced.
  - **Resolution (Q3):** Add to Phase 2 file list (9 skills total).

- **Vague Phase 2 placement** — "add to relevant section of each" without specifying where.
  - **Resolution (Q5):** Top of each SKILL.md, after frontmatter.

- **Phase 4 missing** — no step migrates task.12's own frontmatter.
  - **Resolution (Q7):** Add Phase 4: change `status: 📋 Planned` → `status: planned` in this task's frontmatter.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (resolved)

### Issues

#### Important

- **Internal contradiction**: Phase 2 says "Reconcile any contradictions found in the doc, not in the skills"; Out of Scope forbids renaming `accepted → Accepted` etc. (preserves frontmatter casing). Phase 4 self-migration partially contradicts the Out-of-Scope ban on migrating legacy task documents.
  - **Resolution:** Out of Scope clause refers to *content* migrations of legacy planned/in-progress tasks. Self-fix on task.12 itself (per Q7) is a documentation example, not a content migration. Clarify in Out of Scope.

- **`Ready for QA` vs `Ready for Review`** — flagged in task as TBD.
  - **Resolution (Q2):** Canonical = `Ready for Review`. Doc declares `Ready for QA` as deprecated synonym; skill renaming filed as follow-up.

- **Testing Strategy too weak** — only grep + manual walkthrough.
  - **Resolution (Q8):** Add allow-list test: extract every `status:` value across `skills/`, fail on values not in canonical doc.

- **Success Criteria unmeasurable for sync rule** — "states the rule with examples" is vague.
  - **Resolution (Q9):** Add AC: "Doc includes ≥2 worked examples showing simultaneous frontmatter+body status update".

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low-risk doc-only change. Rollback (delete doc + cross-ref lines) is correct. No additional risks identified.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 8 issues

1. Fix task.12 frontmatter `status: 📋 Planned` → `status: planned` (Q1).
2. Resolve `Ready for QA` vs `Ready for Review` — declare `Ready for Review` canonical, deprecate the other (Q2).
3. Add `develop-story` to Phase 2 cross-ref list (Q3).
4. Replace "refine during implementation" with committed state machine (Q4).
5. Specify Phase 2 cross-ref placement: top of SKILL.md, after frontmatter (Q5).
6. Confirm Phase 3 placement under "File Naming Conventions" in CLAUDE.md (Q6).
7. Add Phase 4 — self-migration of task.12 frontmatter (Q7).
8. Strengthen Testing Strategy with allow-list grep test (Q8); add measurable sync-rule AC (Q9).

### Consider (Optional) — 0 items

---

## Implementation Readiness Assessment

**Score:** 8/10 (post-fix)

| Dimension | Score |
|---|---|
| Template Compliance | 9/10 |
| Technical Accuracy | 10/10 |
| Implementation Clarity | 7/10 (was 5/10 — fixed via Q3-Q7) |
| Consistency | 8/10 |
| Risk Management | 9/10 |

**Confidence:** High (after fixes).

**Recommendation:** ✅ READY TO IMPLEMENT after applying the 8 fixes.

---

## Next Steps

1. Apply Important fixes via Step 8.5.
2. Update status to `Ready for Development` (Step 9).
3. Run `/develop` (or `/develop-task task.12`) to begin Phase 1.

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-06
- **Review Depth:** Standard
- **Task File:** `docs/development/tasks/task.12.document-status-lifecycle/task.12.document-status-lifecycle.md`
- **Architecture Docs Consulted:** `shared/resources/` listing, skills directory listing, GitHub issue #19
