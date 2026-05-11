# Task Review Report: Task 11 — Add tracker-issue dedup guard in review-task and review-story

> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-05-06

**Reviewed:** 2026-05-06
**Review Depth:** Standard
**Task Status:** 📋 Planned
**Overall Assessment:** GOOD

---

## Executive Summary

Task is well-scoped, motivated, and bounded. Implementation plan is clear at the rule level but needs sharper anchors (line numbers will drift) and a few decisions resolved before code: Jira search mechanism, closed-issue handling, and how Phase 2 reconciles review-story's different Jira-create path.

**Critical Issues:** 1 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION (small, targeted edits — not rework)

---

## User Decisions & Clarifications

### Q1 — Jira search mechanism
- **Decision:** Use Atlassian MCP `searchJiraIssuesUsingJql`.
- **Impact:** Phase 1 Jira branch must call MCP, not curl. Inconsistent with review-task's existing curl-based create/verify — flag as a follow-up but acceptable scoped split (search via MCP, create via REST).

### Q2 — Closed matching issue
- **Decision:** Link to closed issue.
- **Impact:** Search across all states (`--state all` for GitHub; no status filter for Jira JQL). Single match wins regardless of state.

### Q3 — Phase 2 review-story mirror
- **Decision:** Same pre-search, then skip the sub-routine on 1-match.
- **Impact:** When dedup finds an existing Jira/GitHub issue, review-story bypasses `ensure-epic-jira-issue` / `ensure-epic-github-issue` and `/create-story` 5.2a entirely. Does **not** auto-link to parent epic on match (existing issue assumed to already have its parent linkage).

### Q4 — Phase 3 doc placement
- **Decision:** Inline in Step 2 (review-task) / Step 5 (review-story), within Tracker Issue Linkage section.
- **Impact:** No new top-level section. Subsection sits adjacent to the create blocks.

---

## 1. Template Structure Compliance

**Status:** PASS

All required sections present. Frontmatter complete (`github_issue: 18` linked). Filename follows `task.{n}.{name}.md` convention. No placeholders.

### Optional
- Effort field uses `0.5 day` — fine; some other tasks use `0.5d` shorthand. Either works.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

### Critical
- **Line-number drift:** Task cites `~line 416 (Jira create), ~line 463 (GitHub create)` in `skills/review-task/SKILL.md`. Actual lines: **428** (Jira create comment) and **478** (`gh issue create`). Lines will drift further as the skill is edited. Anchor by section heading + landmark text, not line numbers.
  - **Recommendation:** Replace `~line 416` with `"Step 2 → Tracker Issue Linkage → Jira path → 'If user confirms, create via Jira REST API v2'"`. Same pattern for GitHub.

### Important
- **Mechanism mismatch (Jira):** Task lists search criteria via `searchJiraIssuesUsingJql` (Atlassian MCP), but review-task's existing Jira branch uses curl REST. Per Q1, the search will use MCP; the create will keep curl REST. Document this split explicitly so the next reader doesn't "fix" it.
- **review-story Jira mechanism:** review-story (line 503-513) uses `ensure-epic-jira-issue` sub-routine + `/create-story` Step 5.2a, not curl. Task's Phase 2 says "mirror review-task" — which would imply REST. Per Q3, dedup search runs **before** the sub-routine and skips it on match. Make this explicit in the implementation plan.
- **Story title pattern unverified:** Task specifies `[Story {epic}.{story}] {title}` for Phase 2 search. This format is not currently codified in `create-story` or `sync-jira-story`. Either (a) confirm by reading the actual issue-creation block in `/create-story` Step 5.2a at implementation time, or (b) add a sub-task to standardise the title format before Phase 2 lands.

### Optional
- **Search-failure fallback:** Risk Assessment mentions "log warning and fall through to create" on tracker outage — good. Make this explicit in the implementation steps too (currently only in §10).

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Critical
- None.

### Important
- **Frontmatter write-back mechanism unspecified.** When the dedup guard finds an existing issue, how is `jira_key` / `github_issue` written? Inline `sed`? `yq`? Manual prompt? Pick one and document it. Recommend a small helper or the same pattern `create-task` uses (it should already have one — verify).
- **Jira `jira_url` write-back missing.** review-task expects both `jira_key` AND `jira_url` in frontmatter (Step 2 URL consistency check). Phase 1 changes must write `jira_url: ${JIRA_URL}/browse/${jira_key}` too.
- **GitHub: body cross-reference link.** review-task Step 2 also flags missing body links (`[#N](url)`). After dedup-link, the document body should be updated with the cross-reference link, or this will be flagged as Important on the next review pass.
- **Closed-issue logging.** Per Q2, link to closed issues. Add an explicit log line on closed match: `"Linked existing closed tracker issue #N — verify intent before continuing."` Otherwise users may not notice.

### Optional
- **Phase 3 docs**: per Q4, place inline. Add to checklist: "Insert Tracker dedup subsection inside Step 2 (review-task) / Step 5 (review-story), immediately above the create block."

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important
- **Testing Strategy gap — closed-issue path.** Q2 decision (link to closed) needs a manual test scenario:
  > Create issue, close it, manually delete `github_issue` from frontmatter, run `/review-task`. Confirm closed issue is linked, log warns about closed state.
- **Testing Strategy gap — search failure.** Add a scenario simulating tracker outage (e.g., invalid `JIRA_URL`) and confirm fall-through to create with warning log.
- **Success Criteria missing log-line check.** §9 lists "Multiple-match case logs a warning" but not "Linked existing #N" or "Linked existing closed #N". Add both.

### Optional
- **Mermaid diagram opportunity:** A small flowchart of the lookup → match → branch logic would clarify Phase 1/2 behaviour. Optional given the task's small scope.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

### Optional
- **Rollback specificity:** §11 says "revert the search-step additions" — fine. Consider noting that frontmatter values written by an aborted Phase 1 run remain valid (they point at real issues), so no schema-level rollback needed.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. **Replace line-number anchors** in §3 and §6 with section/landmark anchors. Suggested wording:
   - Phase 1 step 1: "In `skills/review-task/SKILL.md` Step 2 → Tracker Issue Linkage → **Jira path**, immediately before the `JIRA_AUTH=...` curl block under 'If user confirms, create via Jira REST API v2:' (currently line ~428)…"
   - Phase 1 step 2: "…immediately before the `gh issue create` block under **GitHub path** (currently line ~478)…"

### Should Fix (Important) — 6

1. **Document mechanism split** in §3: search uses MCP `searchJiraIssuesUsingJql`; create still uses curl REST. Note the asymmetry as intentional (per Q1).
2. **Specify Phase 2 short-circuit** explicitly: "On 1-match, skip `ensure-epic-jira-issue`/`ensure-epic-github-issue` and `/create-story` 5.2a entirely; write only frontmatter + body cross-reference link." (Per Q3.)
3. **Verify story title pattern** at implementation time: read the actual title format from `/create-story` Step 5.2a / `sync-jira-story`. If `[Story X.Y] {title}` isn't yet codified there, either standardise it first or use whatever format that skill emits.
4. **Add frontmatter write-back spec** to Phase 1 changes: e.g., "Use the same write-back pattern as `create-task` (sed-based or yq) to insert `jira_key`, `jira_url` (or `github_issue`) into frontmatter."
5. **Write `jira_url` alongside `jira_key`** on link-existing path; for GitHub, add the body cross-reference link `[#N](url)`.
6. **Add closed-issue log line and test scenario.** Log on link-closed: `"⚠️  Linked existing CLOSED tracker issue #N — verify intent."` Add to Testing Strategy.

### Consider (Optional) — 3

1. Inline a tiny Mermaid flowchart (3-4 nodes) showing the lookup → match-count → branch decision.
2. Add tracker-outage test scenario to §8.
3. Note in §11 that frontmatter writes from an aborted run remain valid (no rollback needed).

---

## Implementation Readiness Assessment

**Score:** 7/10

| Dimension | Score |
|---|---|
| Template Compliance | 10/10 |
| Technical Accuracy | 6/10 (line-number anchors, mechanism asymmetry undocumented) |
| Implementation Clarity | 6/10 (frontmatter write-back, jira_url, body link missing) |
| Consistency | 7/10 (test scenarios incomplete) |
| Risk Management | 8/10 |

**Confidence Level for Successful Implementation:** Medium — small, well-bounded task; revisions are scoped corrections, not rework.

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** Direction is correct and decisions are made; the task needs anchoring fixes (line numbers → section landmarks), explicit mechanism notes (MCP-search + REST-create), and three small additions (jira_url write-back, body link, closed-issue handling) before /develop runs.

---

## Next Steps

Address the 1 critical + 6 important items above. Then re-run `/review-task task.11` (or proceed directly to `/develop` if you accept the revisions inline).

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-06
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.11.review-task-tracker-dedup/task.11.review-task-tracker-dedup.md`
- **Architecture Docs Consulted:** `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`, `skills/ensure-epic-github-issue/SKILL.md`
- **Review Duration:** ~10 min
