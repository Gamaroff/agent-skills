---
id: story.2.3.review.1.capture-story-messy-path
title: "Story 2.3 Review #1: Capture a story with the messy path"
type: review
status: complete
story: story.2.3.capture-story-messy-path
created: 2026-05-13
---

# Story Review Report: Story 2.3 — Capture a story with the messy path

**Reviewed:** 2026-05-13
**Review Depth:** Standard
**Story Status:** Draft
**Overall Assessment:** NEEDS IMPROVEMENT

---

## Executive Summary

Story structurally sound and aligned with Epic 2 intent. Three substantive issues:
(1) provenance field names drift from the 4-field schema established by Stories 2.1/2.2 — `source_story` is invented, `captured_skill_version` + `captured_date` + `source_path` missing;
(2) FAIL/PASS commit identifiability in AC3 manual test is underspecified;
(3) descope path interaction with Epic 2 DoD checkbox not documented.

**Critical Issues:** 1 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Q1 — Provenance schema drift

- **Decision:** Reuse 2.1/2.2 schema. Replace `source_story` with `source_path`; add `captured_skill_version`, `captured_date`.
- **Impact:** Critical fix; aligns AC3 with established precedent and the equivalence-diff verification used by 2.2 QA gate.

### Q2 — Descope vs Epic 2 DoD

- **Decision:** Descope = mark Epic 2 DoD checkbox N/A with rationale.
- **Impact:** Story descope flow now has a clean exit; Dev Notes should record the DoD-N/A convention so Epic 2 can still reach `accepted`.

### Q3 — FAIL/PASS commit identifiability

- **Decision:** Gate YAML filename pattern. Commits that add/modify `*.gate.{n}.*.yml` with `verdict: FAIL` then `verdict: PASS`.
- **Impact:** AC3 manual test becomes deterministic and machine-verifiable.

---

## 1. Template Structure Compliance

**Status:** PASS

All required sections present (Status, Story Statement, ACs, Dev Notes, Testing, Manual Testing Steps, Tasks, Change Log, Dev Agent Record stub). Filename follows DOT convention. No unfilled placeholders. Frontmatter complete (`github_issue: 94` correct; `epic_file` relative path resolves).

---

## 2. Epic Alignment

**Status:** ALIGNED

### Findings

- AC1 expands epic AC1 by adding "revision diff (or revised story doc)" as a 4th item. Reasonable expansion — captures the *fix*, not just the failure. Justified implicitly by pedagogical goal.
- AC3 adds provenance requirement not explicit in epic. Inherits Story 2.1/2.2 precedent.

#### Optional

- Add one Dev Notes line stating "AC1 extends Epic 2.AC1 with `revision.md` to capture the fix step" — mirrors Story 2.2 review precedent (Q2 of that review).

---

## 3. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (field-name drift)

### Critical

- **Provenance field names invented / dropped**: AC3 names `source_story`, `source_sha`. Established 2.1/2.2 schema is 4-field: `captured_skill_version`, `captured_date`, `source_sha`, `source_path`.
  - **Location:** AC3 (line 32), and implicitly the captured-file frontmatter in File Locations.
  - **Evidence:** `story.2.2.qa.1.*.md` line "Per-file count of `captured_skill_version`/`captured_date`/`source_sha`/`source_path` = 4 each". `story.2.1.plan.*.md` shows `source_sha` + `source_path` usage.
  - **Recommendation (per Q1):** Rewrite AC3 to reference the 4-field schema. Optionally extend with messy-path-specific keys (`source_fail_sha`, `source_pass_sha`) — but only if added explicitly with rationale in Dev Notes.

---

## 4. Completeness & Gaps

**Status:** GAPS FOUND

### Important

- **FAIL/PASS commit identifiability underspecified** (AC3 Manual Test): says "real QA-gate FAIL commit followed by PASS commit" but does not say how to identify them.
  - **Recommendation (per Q3):** Specify "commits that touch `*.gate.{n}.*.yml` files; FAIL commit = file with `verdict: FAIL`, PASS commit = file with `verdict: PASS`."

- **Descope ↔ Epic 2 DoD interaction missing**: Edge case in Manual Testing Steps says "descope this story" but does not address Epic 2 DoD checkbox "Story 2.3 messy-path is real".
  - **Recommendation (per Q2):** Add Dev Notes line: "If descoped, mark Epic 2 DoD checkbox 'Story 2.3 messy-path is real' as N/A with link to the cancellation Change Log entry."

### Optional

- Tasks 1–6 are terse. Plan file is referenced for detail — acceptable, but Task 3 could name the destination files explicitly to match File Locations.

---

## 5. Consistency & Conflicts

**Status:** CONFLICTS FOUND

### Important

- **Field-name drift from previous stories** (same root cause as §3 critical): "Previous Story Insights" claims reuse of 2.1+2.2 patterns, but AC3 fields diverge. Resolving Q1 closes this.

### Optional

- File Locations names captured filenames as `story.<E>.<S>.gate.{n-fail}.<name>.yml`. The `{n-fail}`/`{n-pass}` is a doc-time placeholder, not a real numbering — clarify that `n` is the actual gate iteration number from the source story's directory (e.g. `.gate.1.` then `.gate.2.`).

---

## 6. Quality & Clarity

**Clarity Scores:**
- Story Statement: 9/10
- Acceptance Criteria: 7/10 (AC3 field-name drift)
- Tasks/Subtasks: 8/10 (terse but plan-backed)
- Dev Notes: 8/10
- Testing Guidance: 7/10 (FAIL/PASS identifiability gap)

**Overall Clarity:** 8/10

### Optional

- "Testing" section (line 98) repeats Manual Testing Steps content. Either delete or point to Manual Testing Steps.

---

## 7. Previous Story Context

**Status:** ISSUES FOUND

- Claims pattern reuse from 2.1/2.2 but does not actually reuse the provenance schema. Once Q1 fix applied, this becomes CONSISTENT.

---

## 8. Summary of Recommendations

### Must Fix (Critical) — 1

1. **Rewrite AC3 to use the 4-field provenance schema** (`captured_skill_version`, `captured_date`, `source_sha`, `source_path`) from Stories 2.1/2.2. Per Q1.

### Should Fix (Important) — 2

1. **Specify FAIL/PASS commit identification** in Manual Testing Steps AC3 verification: gate YAML filename pattern + `verdict` field. Per Q3.
2. **Document descope → Epic 2 DoD N/A** convention in Dev Notes (Edge Cases). Per Q2.

### Consider (Optional) — 2

1. Add one-line Dev Notes note that AC1 extends Epic 2.AC1 with `revision.md` (mirrors 2.2 review precedent).
2. Clarify `{n-fail}`/`{n-pass}` placeholder semantics in File Locations.
3. Collapse duplicate "Testing" + "Manual Testing Steps" sections.

---

## Implementation Readiness Assessment

**Score:** 7/10

**Scoring Breakdown:**
- Template Compliance: 9/10
- Epic Alignment: 9/10
- Technical Accuracy: 6/10
- Completeness: 7/10
- Consistency: 7/10
- Quality & Clarity: 8/10
- Previous Story Continuity: 7/10

**Confidence Level for Successful Implementation:** Medium

**Recommendation:** ⚠️ NEEDS REVISION

**Justification:** Critical provenance-schema drift would propagate into captured artifacts and break equivalence-diff verification used by the Story 2.2 QA-gate pattern. Two important gaps (FAIL/PASS identifiability, descope→DoD) leave manual test and edge-case flow incomplete. All resolvable via targeted edits.

---

## Next Steps

Address the 1 critical + 2 important fixes (mechanical, ~10 min). Re-run `/review-story --validate` to confirm GO.

---

## Review Metadata

- **Reviewer:** Claude (review-story skill, interactive mode)
- **Review Date:** 2026-05-13
- **Review Depth:** Standard
- **Story File:** docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.capture-story-messy-path.md
- **Parent Epic:** docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/epic.2.worked-prd-epic-story-examples.md
- **Architecture Docs Consulted:** none required (docs-only story)
- **Tracker:** GitHub issue #94
