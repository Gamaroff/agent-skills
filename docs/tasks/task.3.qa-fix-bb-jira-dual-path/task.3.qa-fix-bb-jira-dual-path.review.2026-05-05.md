---
type: review
target: task.3.qa-fix-bb-jira-dual-path.md
reviewed: 2026-05-05
depth: standard
---

# Task Review Report: Task 3 — qa-fix BB+Jira dual-path

> **Implementation Status**: ✅ All 4 Important recommendations implemented — 2026-05-05

**Reviewed:** 2026-05-05
**Review Depth:** Standard
**Task Status:** 📋 Planned
**Overall Assessment:** GOOD — small fixable gaps, no blockers

---

## Executive Summary

Scope is tight, line refs into `qa-fix`/`finalise`/`create-pr` are accurate, and the dual-path pattern mirrors a proven block. Three Important issues to resolve before implementation: missing tracker linkage, an undefined `$STORY_OR_TASK_FILE` reference in Phase 4, and an internal contradiction in Success Criteria HTTP-budget. One Optional inaccuracy on `finalise` Jira format claim.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 4 💡
**User Clarifications:** 4 questions asked + answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION (small) — apply listed fixes, then ready to implement.

---

## User Decisions & Clarifications

### Q1 — Tracker linkage
- **Decision:** Create GitHub issue now (agent-skills repo is GitHub-backed; no JIRA_URL).
- **Impact:** Step 8.5 must add `github_issue:` + body cross-ref link.

### Q2 — `$STORY_OR_TASK_FILE` source
- **Decision:** Reuse existing var.
- **Impact:** qa-fix has no canonical `$STORY_FILE` var today (only narrative "story file" + a glob in Step 0). Phase 4 must standardise on a single var (proposed: `$STORY_FILE`) and Phase 0/Step 0 of qa-fix must export it.

### Q3 — Jira ADF vs markdown
- **Decision:** Keep ADF as a documented option alongside markdown.
- **Impact:** Plan must clarify that `finalise` currently sends `contentFormat: "markdown"`; ADF is permitted but not required. Drop the false "per finalise pattern" attribution for ADF.

### Q4 — HTTP round-trip budget
- **Decision:** Drop the budget criterion.
- **Impact:** Remove `≤2 HTTP round-trips` line from Success Criteria → Performance.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Important
- **Tracker linkage missing.** Frontmatter has neither `github_issue` nor `jira_key`; body has no `[#N](url)` cross-ref. Per skill rules → flag Important.
- **Status string non-canonical.** `📋 Planned` includes emoji; canonical set is `[Planned, In Progress, Paused, Completed, Cancelled]`. Strip emoji.
- **`assignee: TBD`.** Placeholder; either set assignee or remove field.

### Optional
- Section numbering (1–11) deviates from template ordering; cosmetic, not blocking.

---

## 2. Technical Accuracy

**Status:** ACCURATE with one imprecision
**Hallucinations Detected:** 0 (1 mis-attribution)

### Verified
- `qa-fix/SKILL.md` line refs **160, 174, 247, 539, 606, 642** all match real `gh pr view`/`gh pr comment` occurrences.
- `finalise/SKILL.md` platform-detect block **exists** (lines 314–325; task says 312–329 — close enough, Optional).
- `addCommentToJiraIssue` MCP usage in `finalise` confirmed at lines 825–832.
- `create-pr/SKILL.md` BB POST `/pullrequests/{id}/comments` shape verified at line 254.
- Bitbucket REST endpoint shapes valid for Cloud REST API v2.

### Important
- **Mis-attribution (Phase 4 + Section 6 risk #3):** Plan says "markdown→ADF or plain text per existing finalise pattern at lines 827-832". `finalise` actually uses `contentFormat: "markdown"`. Fix wording — see Q3.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important
- **Phase 4 references undefined `$STORY_OR_TASK_FILE`.** qa-fix today has no exported `$STORY_FILE` var — Step 0 only narrates "find story file" and globs it ad-hoc. Phase must (a) name the canonical var and (b) require Phase 0 / Step 0 of qa-fix to export it for downstream Phase-4 use.

### Optional
- **No mermaid flowchart.** Dual-path branching with three platform combos (GH-only / BB-only / BB+Jira) would benefit from a small `flowchart` in Section 3 (Technical Background). Add or skip.
- Phase 2 BB query — consider URL-encoding `BRANCH` (handles slashes in branch names like `feature/foo`).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important
- **Performance contradiction (§9):** "≤2 HTTP round-trips" + "1 PR lookup + 1 comment + 1 Jira MCP" = 3. Per Q4: drop the budget line.

### Optional
- Testing Strategy lacks an explicit `unknown remote` case (qa-fix would now `exit 1` instead of skipping gracefully — possible regression for local-only repos). Add a test or a fallback note.
- Files Summary lists `shared/resources/jira-sync.js` as informational; verify whether qa-fix should `require()` it for consistency with sibling skills, or note explicitly that inline curl is preferred.

---

## 5. Risk & Rollback

**Status:** ADEQUATE

- High-risk GH regression mitigation (literal copy of current code into the `if github` branch) is the right call.
- Rollback steps concrete and time-bounded.
- Risk #2 fallback (list all OPEN PRs, match by branch) is sound.

### Optional
- Risk #4 (markdown rendering): add explicit "no `<details>`/HTML, no GH alerts" rule to lock down compatibility.

---

## Summary of Recommendations

### Must Fix (Critical) — 0

(none)

### Should Fix (Important) — 4

1. Create GitHub issue for task.3 → write `github_issue: <N>` to frontmatter + add body cross-ref. (Q1)
2. Phase 4 — replace `$STORY_OR_TASK_FILE` with `$STORY_FILE`; require Step 0 of qa-fix to export it. (Q2)
3. Phase 4 / Risk #3 — strip false "per finalise pattern" ADF attribution; clarify finalise uses `contentFormat: "markdown"`, ADF permitted but optional. (Q3)
4. §9 Performance — drop the `≤2 HTTP round-trips` line. (Q4)

### Consider (Optional) — 4

1. Strip emoji from Status (`📋 Planned` → `Planned`); fill or drop `assignee: TBD`.
2. Add a small mermaid flowchart of the GH / BB / BB+Jira routing in §3.
3. Add explicit `unknown remote` test case to §8.
4. URL-encode `$BRANCH` in Phase 2 BB query to handle slashes.

---

## Implementation Readiness Assessment

**Score:** 7/10

| Dimension | Score |
|---|---|
| Template compliance | 6/10 |
| Technical accuracy | 8/10 |
| Implementation clarity | 7/10 |
| Consistency | 6/10 |
| Risk management | 9/10 |

**Confidence:** Medium-High once the four Important fixes are applied.

**Recommendation:** ⚠️ NEEDS REVISION (light) — apply Important fixes, then promote to Ready for Development.

---

## Next Steps

1. Apply Important fixes (Step 8.5 below will offer to do this automatically).
2. Create GitHub issue + linkage.
3. Promote status `Planned` → `Ready for Development`.
4. Run `/develop-task task.3` to begin implementation.
