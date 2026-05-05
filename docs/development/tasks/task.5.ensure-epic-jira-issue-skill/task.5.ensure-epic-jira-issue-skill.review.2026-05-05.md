---
type: task-review
task-ref: task.5.ensure-epic-jira-issue-skill.md
reviewed: 2026-05-05
depth: standard
---

# Task Review Report: Task 5 — Add ensure-epic-jira-issue skill and dual-path the call sites

> **Implementation Status**: ✅ All 6 critical + important recommendations implemented — 2026-05-05

**Reviewed:** 2026-05-05
**Review Depth:** Standard
**Task Status:** 📋 Planned
**Overall Assessment:** NEEDS REVISION

---

## Executive Summary

Task is conceptually sound and well-motivated, but rests on one factual error: it claims `create-story` already invokes `ensure-epic-github-issue`. It does not — only `review-story` does, and `create-story` Step 5.2a explicitly skips tracker creation. This kills Phase 3 as written. Second issue: the new skill's I/O contract drifts from the existing GitHub sibling (slash-command-with-stdout vs in-context sub-routine), breaking symmetry the task explicitly aims for.

**Critical Issues:** 2 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 6/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Q1 — Phase 3 Mismatch
- **Asked:** Task claims create-story calls `ensure-epic-github-issue`, but only review-story does. How to resolve?
- **User Decision:** Drop Phase 3 entirely
- **Impact:** Remove create-story from In Scope, Files Summary, Phase 6 packaging list. Update Overview & Motivation prose. Renumber phases (Phase 4 → 3, Phase 5 → 4, Phase 6 → 5).

### Q2 — Skill Contract Symmetry
- **Asked:** Existing GitHub sibling is in-context sub-routine (`EPIC_FILE_PATH` in, `EPIC_ISSUE_NUM` out). Plan uses slash-command-stdout pattern. Which contract?
- **User Decision:** Mirror GitHub sibling (sub-routine)
- **Impact:** Rewrite Phase 2 + plan to: `type: internal`, input `EPIC_FILE_PATH`, output `EPIC_JIRA_KEY` set in caller scope. Drop `EPIC_TRACKER_REF`/`EPIC_TRACKER_KIND` shell-variable indirection in Phase 4.

### Q3 — GitHub Issue Linkage
- **Asked:** Task lacks `github_issue:` frontmatter field. Create now?
- **User Decision:** Yes, create now
- **Action Taken:** Created [#9](https://github.com/Gamaroff/agent-skills/issues/9), wrote `github_issue: 9` to frontmatter.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Critical
- None.

### Important
- **Missing tracker linkage** — frontmatter had no `github_issue:` field. **Fixed** during review (issue [#9](https://github.com/Gamaroff/agent-skills/issues/9) created, frontmatter updated).
- **No body cross-reference** to GitHub issue — task body has no `[#9](url)` link. Add one near top of Overview.

### Optional
- `status: 📋 Planned` uses an emoji prefix; template uses plain `Planned`. Cosmetic.
- `assignee: TBD` — set to `gamaroff` or self-assign in GH issue when picked up.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (functional, not invented)

### Critical
- **Phase 3 premise is false.** Task §1 Overview: *"called from `create-story` and `review-story`"* — false for `create-story`.
  - **Evidence:** `grep -rn "ensure-epic-github-issue" skills/` returns one match: `skills/review-story/SKILL.md:522`. `skills/create-story/SKILL.md` Step 5.2a (lines 339-347) explicitly forbids tracker creation during story creation.
  - **Fix (per Q1):** drop `create-story` from scope.

### Important
- **Contract drift between plan and sibling.** Plan Phase 3 uses `EPIC_TRACKER_REF=$(/ensure-epic-jira-issue $EPIC_FILE)` — slash-command stdout capture. Existing sibling at `skills/ensure-epic-github-issue/SKILL.md` is `type: internal`, takes `EPIC_FILE_PATH`, sets `EPIC_ISSUE_NUM` in calling skill's variable scope (no slash invocation, no stdout capture).
  - **Fix (per Q2):** rewrite new skill to mirror sub-routine contract.
- **Variable naming inconsistency.** Plan uses `EPIC_FILE`; sibling uses `EPIC_FILE_PATH`.
  - **Fix:** standardize on `EPIC_FILE_PATH`.

### Optional
- Plan §"Key Patterns and References" mentions `jira-epic-creator` as alternative; main task body uses `sync-jira-epic`. Both skills exist. Pick one (recommend `sync-jira-epic` — it's the one already cited in §3 and §"Reuse").

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (driven by Q1, Q2)

### Critical
- **Phase 3 has no call site** — see §2 Critical above. Drop the phase.

### Important
- **Phase 4 (review-story patch) is the only real call-site change** but is described as "Same conditional pattern as Phase 3." After dropping Phase 3, Phase 4 becomes the load-bearing call-site phase and needs its own self-contained spec. Concretely: locate `review-story/SKILL.md:522`, change "invoke the `ensure-epic-github-issue` sub-routine" to a `JIRA_URL`-conditional block that invokes the right sibling; downstream sub-issue linking block (lines 549-563) is GitHub-only and must be gated on `EPIC_TRACKER_KIND=github` (or equivalent).
- **`jira_url` write contract under-specified.** Plan §"Workflow" says "writes `jira_key` + `jira_url`" but doesn't specify the `jira_url` shape (`{JIRA_URL}/browse/{KEY}`) or whether sync-jira-epic already writes it. Verify and document.
- **Failure-mode handling underspecified.** Plan §"Failure handling" says "All failures non-blocking, return empty" but the body distinguishes 404 (critical, return empty) from "other error" (return current `jira_key`). Reconcile.

### Optional
- Add a current-vs-target diagram (Mermaid `flowchart`) showing the conditional dispatch — would clarify the dual-path intent more than prose.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important
- **§4 In Scope** lists `create-story/SKILL.md` update (✅ checkbox); §7 Files Summary lists it as Modified; §6 Phase 6 packages it. All three propagate the Phase 3 error and need updating in lockstep.
- **§9 Success Criteria** has `create-story branches correctly on $JIRA_URL` — drop after Q1.
- **§8 Testing Strategy** dual-env smoke step 1 & 2 use `/create-story` to trigger the ensure call, but `create-story` doesn't call it. Tests must run via `/review-story` instead.

### Optional
- §10 Risk #3 ("Call-site refactor breaks GitHub path") still applies but for a single skill (review-story), not two.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

### Important
- **Idempotency risk well-handled** — §10 Risk #2 captures the orphan-on-transient-error concern; plan §"Workflow" step 2 mitigates it.

### Optional
- **Add explicit risk:** delegating to `/sync-jira-epic` means the new skill inherits sync-jira-epic's full state machine (concurrent-edit guard, status transitions, change log). Worth calling out — wrapper skill becomes thicker than "thin" if it has to deal with sync-jira-epic side effects (e.g. it advances Jira status from frontmatter, updates change log) when caller only wanted "ensure exists." Consider whether ensure should pass a `--no-status-transition` or similar flag to sync-jira-epic, or accept the broader behavior. Document the trade-off.

---

## Summary of Recommendations

### Must Fix (Critical) — 2

1. **Drop Phase 3 (create-story patch).** Update §1 Overview, §1 Scope bullets, §4 In Scope (✅ bullet 2), §6 (delete Phase 3, renumber Phases 4→3, 5→4, 6→5), §7 Files Summary (remove modified entry 2 and build artifact 7), §8 Testing Strategy (re-route smoke tests through `/review-story`), §9 Success Criteria (drop create-story bullet).
2. **Mirror GitHub sibling's sub-routine contract.** Rewrite plan §"Phase 2: Author SKILL.md" frontmatter and body skeleton: `type: internal`, input `EPIC_FILE_PATH`, output `EPIC_JIRA_KEY` set in caller scope, no slash-command stdout capture. Plan §"Phase 3: Patch create-story call site" → delete; §"Phase 4: Patch review-story call site" → flesh out as the sole call-site phase with the conditional invocation pattern.

### Should Fix (Important) — 4

1. Add cross-reference link to GH issue [#9](https://github.com/Gamaroff/agent-skills/issues/9) in task body (near top of Overview).
2. Standardize on `EPIC_FILE_PATH` (input) and define both `EPIC_TRACKER_KIND` ("jira"|"github") and the appropriate output variable in caller scope. Document downstream consumer guard (lines 549-563 in review-story).
3. Specify `jira_url` write shape and confirm whether `sync-jira-epic` already writes it (so the wrapper doesn't double-write).
4. Reconcile failure-handling spec between top-level "all failures non-blocking" and step-2's nuanced 404-vs-other handling.

### Consider (Optional) — 3

1. Drop emoji from `status:` field; use plain `Planned`.
2. Pick one delegation target (`sync-jira-epic`) and remove `jira-epic-creator` mention from plan.
3. Add a Mermaid flowchart of the conditional dispatch to §3 Technical Background.

---

## Implementation Readiness Assessment

**Score:** 6/10

| Dimension | Score |
|---|---|
| Template Compliance | 8/10 |
| Technical Accuracy | 5/10 |
| Implementation Clarity | 5/10 |
| Consistency | 6/10 |
| Risk Management | 8/10 |

**Confidence Level:** Medium

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** Premise error in scope (Phase 3 has no call site) and contract drift from existing sibling are both load-bearing. Once corrected, this is a small, low-risk task — likely back to 8+/10 readiness after the revisions.

---

## Next Steps

1. Apply Critical fixes (drop Phase 3, fix sub-routine contract).
2. Apply Important fixes (cross-ref link, variable naming, jira_url shape, failure-handling reconciliation).
3. Re-run `/review-task task.5` (or `/validate-task` if available) to confirm readiness.
4. Then `/develop-task task.5` to begin implementation.

---

## Review Metadata

- **Reviewer:** Claude (Opus 4.7)
- **Review Date:** 2026-05-05
- **Review Depth:** Standard
- **Task File:** docs/development/tasks/task.5.ensure-epic-jira-issue-skill/task.5.ensure-epic-jira-issue-skill.md
- **Plan File:** docs/development/tasks/task.5.ensure-epic-jira-issue-skill/task.5.plan.ensure-epic-jira-issue-skill.md
- **Source Files Verified:** skills/ensure-epic-github-issue/SKILL.md, skills/create-story/SKILL.md, skills/review-story/SKILL.md, skills/sync-jira-epic/SKILL.md, skills/jira-epic-creator/SKILL.md, shared/resources/jira-sync.js, skills/create-skill/scripts/{init_skill.py,quick_validate.py,package_skill.py}
- **GitHub Issue Created:** [#9](https://github.com/Gamaroff/agent-skills/issues/9)
