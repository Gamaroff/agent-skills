# Task Review Report: Task 35 — Conform document skills, templates, and standards to OKF v0.1

**Reviewed:** 2026-06-28
**Review Depth:** Standard
**Task Status:** Draft
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 Important recommendations (I-1, I-2, I-3) implemented in task.35 + plan — 2026-06-28. Optional items O-1/O-2/O-3 partially folded in (O-3 pipe-escaping applied to the plan skeleton).

---

## Executive Summary

Task 35 is a well-structured, accurately-scoped documentation-conformance task. Its core premise — that the repo's templates and review tooling have drifted from its own standards and from OKF's recommended fields — was verified true against the actual repo, and the external OKF v0.1 spec it rests on was confirmed real and correctly characterised. Three precision gaps (a missing PRD frontmatter schema table, an imprecise `resource` mapping, and slightly mislocated template-emission wording) were resolved via user clarification and are the only changes needed before development.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the 3 Important fixes below are applied)

---

## User Decisions & Clarifications

### Question Point 1: Output Format
**Q1: Comprehensive report or action plan?**
- **User Decision:** Comprehensive report
- **Impact:** This file is the primary artifact.

### Question Point 2: PRD Standard
**Q2: prd-documents.md has no frontmatter schema table — how to handle PRD in Phase 2?**
- **User Decision:** Add a full frontmatter schema table to `prd-documents.md`, bringing it to parity with epic/story/task standards, then include the OKF rows.
- **Impact:** Phase 2 scope for PRD expands from "add rows" to "author a frontmatter schema table + OKF rows." Reflected in recommendation #1.

### Question Point 3: Resource Mapping
**Q3: §3 maps all trackers to `github_url`, but tasks use `github_issue` (a number).**
- **User Decision:** Cover both forms explicitly — `resource` ≡ `jira_url` / `github_url` where present, OR derived from `github_issue` (number) + repo for tasks. Correct the §3 table.
- **Impact:** The OKF mapping doc (Phase 1) and §3 table must distinguish URL fields from the bare `github_issue` number. Reflected in recommendation #2.

### Question Point 4: Spec Verification
**Q4: Verify the OKF v0.1 spec exists?**
- **User Decision:** Yes, verify with WebFetch.
- **Result:** ✅ Confirmed. OKF v0.1 (draft) exists at the cited URL. `type` is the only required field; `title`/`description`/`resource`/`tags`/`timestamp` are recommended (in that priority order); `index.md`/`log.md` are reserved filenames that MUST NOT be concept documents; consumers must preserve unknown keys. **Every technical claim in §3 of the task is accurate.**

---

## 1. Template Structure Compliance

**Status:** PASS (with notes)

The task document itself is OKF-conformant and follows the task template: complete frontmatter (`type: task`, `description`, `tags`, `created`/`updated`, `resource`, `github_issue`), all required sections present, status synced between frontmatter (`draft`) and body (`Draft`). Dog-foods its own goal (Success Criteria §9 SELF-CONSISTENCY). No placeholders or TBDs in core sections (`assignee: TBD` is acceptable).

Tracker linkage present and consistent: `github_issue: 162` in frontmatter, `[#162](...)` body link.

### Issues
None blocking.

---

## 2. Technical Accuracy

**Status:** ACCURATE — verified against repo and external spec
**Hallucinations Detected:** 0

Verified claims:
- ✅ `docs/templates/epic-template.md` omits `type` (confirmed — frontmatter lines 17-25 have no `type`).
- ✅ `docs/standards/epic-documents.md` requires `type: epic` (line 35, 48) → confirms the template-vs-standard drift the task targets.
- ✅ `skills/create-task/resources/task-template.md` uses bold-line headers, no YAML frontmatter (confirmed — lines 3-9).
- ✅ `review-epic` does NOT enforce `type` — its validated-field list (`skills/review-epic/SKILL.md:206`) omits `type`.
- ✅ `documentation-standards-validator` does NOT check `type` (no match in SKILL.md).
- ✅ PRDs already emit `type: prd` + `description` in real docs (`docs/prd/onboarding/prd.onboarding.md`).
- ✅ OKF v0.1 spec real and accurately summarised (WebFetch confirmed).

### Issues

#### Important
- **I-2 — `resource` mapping is imprecise (§3 table + Phase 1 skeleton).** The §3 table (lines 73-80) and the plan's skeleton map epic/story/task `resource` to `github_url`, but **tasks use `github_issue` (a bare number)**, not `github_url`. Verified: this task carries `github_issue: 162` and no `github_url`; epics/stories under `docs/prd/onboarding/**` use `github_url`. Per user decision, the mapping must cover both forms.
  - **Location:** §3 table row `resource`; Phase 1 doc skeleton (plan lines 37-44).
  - **Recommendation:** State `resource ≡ jira_url / github_url where present, OR derived from github_issue (number) for tasks`. Correct the §3 "Task now" cell from `github_url` → `github_issue`.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (2 important)

The 6-phase plan is well-sequenced, risk-rated, and co-located with a detailed plan file. Phases are co-dependent in the right places (standards ↔ templates), and the bundle-drift failure mode is explicitly guarded (Phase 6 / Risk #2) — consistent with the repo's known bundle-drift memory.

### Issues

#### Important
- **I-1 — Phase 2 assumes `prd-documents.md` has a frontmatter schema table; it does not.** `prd-documents.md` documents body sections, file naming, status lifecycle, and sharding — but has **no frontmatter schema table** (unlike epic/story/task standards, which each have one with a `| type | literal | Yes |` row). Phase 2's instruction to "add `description`/`tags`/`resource` rows to each frontmatter schema table" silently no-ops for PRD.
  - **Location:** Task §6 Phase 2; plan Phase 2.
  - **Recommendation (per user decision):** Expand Phase 2 for PRD to **author a frontmatter schema table** in `prd-documents.md` (rows: `name`/`title`/`type`/`description`/`status`/`version`/`created`/`tags`/`resource` — mirror the actual `prd.onboarding.md` frontmatter), then add the OKF rows. Brings PRD to parity with the other three standards.

- **I-3 — Phase 3 mislocates frontmatter emission for story & PRD.** Phase 3 says "`story-template.yaml` emits `type: story`" and "PRD templates already emit `type: prd` + `description`." In fact, in `story-template.yaml` and `prd-tmpl.yaml`/`brownfield-prd-tmpl.yaml`, `type:` is the **DSL element-type** (`type: choice`, `type: bullet-list`, …) — these YAML files describe section structure, not emitted frontmatter. The actual frontmatter (`type: prd`, `description`) is produced by `create-prd` / `create-doc` skill logic and the `template.output` block, not by a frontmatter spec inside the `.yaml`.
  - **Location:** Task §6 Phase 3 / §4 In Scope (story + PRD template bullets); plan Phase 3.
  - **Recommendation:** Reword Phase 3/4 so the story & PRD frontmatter fields (`type`/`description`/`tags`) are added/confirmed in the **emitting skill logic** (`create-story`, `create-prd`, `create-doc`) and/or the `template.output` section — not by editing DSL `type:` lines. Phase 4 already targets the create-* skills, so this is mostly a wording/cross-reference fix to avoid an implementer hunting for a non-existent frontmatter block in the `.yaml`.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Scope (§4), Files Summary (§7), and Implementation Plan (§6) align. Every file named in a phase appears in §7 and vice versa.
- Testing Strategy (§8) is appropriate for a docs-tooling task: scratch-create per type, reviewer-flag assertions, bundle idempotence, catalog diff, regression (no retrofit), eval layers.
- Success Criteria (§9) are measurable and map to the deliverables, including the dog-food self-consistency check.
- Out-of-scope items (§4, §3) correctly match the OKF "strict/reserved features" (`index.md`/`log.md`, bundle-relative links, root `okf_version`) — and the spec confirms these are real OKF features being deliberately deferred.

### Issues

#### Optional
- **O-1 — Task-template conversion completeness.** When converting `task-template.md` to YAML frontmatter (Phase 3), the body still has trailing `**Status**: 📋 Planned` (line 399) and example QA filename patterns (lines 405-408). Ensure the conversion also reconciles the body `**Status:**` line to the kebab↔Title-Case convention and doesn't leave duplicate/contradictory status metadata. (Plan line 116 partially covers this.)
- **O-2 — Catalog/eval steps are conditional.** Phase 6 gates `generate-catalog` on "if any SKILL.md description changed" and evals on "fixtures touched." Fine, but the task should state explicitly whether any SKILL.md `description:` is expected to change (likely yes for review-* skills gaining OKF checks), so the catalog regen isn't skipped by accident.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk register is realistic and repo-aware: template↔standard drift (the exact problem being fixed), bundle drift (a documented repo failure mode), over-strict reviewers rejecting legacy docs, and OKF spec evolution. Mitigations are concrete and tied to specific phases. The severity tiering (only `type` Critical; `description` Important; `tags`/`resource` Optional) is the right call and directly prevents the "hard-fail legacy docs" risk — and matches OKF's permissive intent (consumers tolerate missing optional fields), now spec-confirmed.

Rollback plan is layered (immediate `git revert` + re-bundle; partial = revert Phase 5 only; forward-fix for cosmetic). Triggers are clear and testable.

### Issues

#### Optional
- **O-3 — Mapping-doc table renders ambiguously.** The plan's skeleton row `| resource | resource | github_url | jira_url | tracker URL... |` uses unescaped pipes inside a cell, which will break the markdown table. When authoring `open-knowledge-format.md`, escape (`\|`) or reword to a comma list. (Cosmetic; fold into I-2's rewrite.)

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues
None. Spec verified real; no hallucinations; no blocking gaps.

### Should Fix (Important) — 3 issues
1. **I-1:** Phase 2 — author a frontmatter schema table in `prd-documents.md` (parity with epic/story/task), then add OKF rows. _Per Q2._
2. **I-2:** §3 table + mapping doc — make `resource` cover both `jira_url`/`github_url` (URLs) and `github_issue` (number, for tasks); fix the "Task now" cell. _Per Q3._
3. **I-3:** Phases 3-4 — reword so story/PRD frontmatter fields are added in the emitting skill logic (`create-story`/`create-prd`/`create-doc`) / `template.output`, not by editing DSL `type:` lines in the `.yaml` templates.

### Consider (Optional) — 3 items
1. **O-1:** Ensure task-template conversion reconciles the trailing body `**Status**:` line and removes duplicate status metadata.
2. **O-2:** State explicitly whether any SKILL.md `description:` changes (drives the conditional catalog regen).
3. **O-3:** Escape pipes / reword the `resource` row so the mapping-doc table renders (fold into I-2).

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**
- Template Compliance: 10/10
- Technical Accuracy: 9/10 (one imprecise mapping, now resolved)
- Implementation Clarity: 7/10 (PRD-table gap + mislocated emission wording)
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — no critical issues, external spec verified, and all open decisions resolved. Apply the 3 Important fixes (all are spec/plan wording corrections, not redesigns) and the task is fully developer-ready.

**Justification:** The task correctly diagnoses real drift, targets it with a low-blast-radius additive approach, and is backed by a verified external standard. The remaining gaps are precision fixes the user has already decided, not structural problems.

---

## Next Steps

Address before/at start of implementation:
1. I-1 — add PRD frontmatter schema table to Phase 2 scope.
2. I-2 — correct the `resource` mapping (both forms).
3. I-3 — reword Phase 3-4 emission location.

Then proceed with `/develop-task` (or `/develop`). The phased plan can be followed as written once the above wording is corrected.

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-06-28
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.35.okf-conformance-document-skills/task.35.okf-conformance-document-skills.md
- **Sources Consulted:** epic/story/task/prd standards; epic & task templates; story/prd template YAMLs; review-epic & documentation-standards-validator SKILL.md; real PRD frontmatter; OKF v0.1 SPEC (WebFetch verified)
</content>
</invoke>
