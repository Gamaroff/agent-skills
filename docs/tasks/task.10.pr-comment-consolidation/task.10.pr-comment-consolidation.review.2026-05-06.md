# Task Review Report: Task 10 — Consolidate PR-comment fan-out under finalise

**Reviewed:** 2026-05-06
**Review Depth:** Standard
**Task Status:** 📋 Planned
**Overall Assessment:** NEEDS IMPROVEMENT

> **Implementation Status**: ✅ All 7 recommendations (1 critical + 4 important + 2 optional) implemented — 2026-05-06

---

## Executive Summary

Task is well-structured and motivated, but its core premise mislabels `create-pr` as a PR-comment author when it actually posts an issue comment (already non-blocking). Two implementation details — QA cycle count extraction and finalise summary idempotency — are vague and need concrete contracts. After applying user-decided fixes, scope shrinks from 4 skills to 3 and idempotency becomes deterministic.

**Critical Issues:** 1 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 6 questions asked and answered
**Implementation Readiness:** 6/10 (will be 9/10 after fixes)
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Question Point 1: Technical & Scope

**Q1: create-pr Step 6b mislabel**
- **User Decision:** Drop create-pr from scope.
- **Impact:** Technical Background table, Phase 1, Phase 3, Files Summary, Success Criteria all narrow to 3 skills (qa-task, qa-fix, finalise). Comment-chain math updates (best case ~2 PR comments per cycle pair + 1 finalise summary).

**Q2: QA cycle count mechanism**
- **User Decision:** Grep `### QA Cycle` headings in implementation report.
- **Impact:** Phase 2 spec becomes deterministic; finalise needs to locate the implementation report path (already known via `develop-task` contract) and run `grep -c '^### QA Cycle' <report>`.

**Q3: finalise summary idempotency**
- **User Decision:** Detect + edit existing.
- **Impact:** Phase 2 must implement marker-based detection and use `gh pr comment --edit-last` (GitHub) or PATCH on Bitbucket REST. Risk Assessment needs to add a Low risk for edit-last selecting the wrong comment.

**Q4: Comment Authorship subsection placement**
- **User Decision:** Inside the comment step.
- **Impact:** Phase 3 spec becomes concrete — embed an authorship table inside the existing comment step in each skill. No new top-level section.

### Question Point 2: Specs & Testing

**Q5: Idempotency marker format**
- **User Decision:** HTML comment (`<!-- finalise-canonical-summary -->`).
- **Impact:** Phase 2 marker spec is now concrete. finalise greps PR comments for marker; if found, edit; else, post new.

**Q6: Idempotency testing**
- **User Decision:** Yes, add manual test.
- **Impact:** Testing Strategy gains: "Run `/finalise` twice on same PR; verify exactly one comment bearing the marker exists; verify second run edited, not duplicated."

---

## 1. Template Structure Compliance

**Status:** PASS (with linkage notes)

### Issues

#### Optional
- `depends_on: —` — em-dash placeholder. Acceptable but `null` or omission is more conventional.
- No `jira_key`/`jira_url` fields — fine because `TRACKER=github` for this repo.

### Verifications passed
- File naming `task.10.pr-comment-consolidation.md` — ✅
- Required sections present (Overview through Rollback Plan) — ✅
- `github_issue: 17` exists, OPEN, title matches — ✅
- No unfilled placeholders (`[TBD]`, `[TODO]`, etc.) — ✅

### Recommendations
1. None required for template compliance.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1

### Issues

#### Critical (Hallucination / Inaccuracy)
- **`create-pr` Step 6b mislabelled as PR-comment**
  - **Location:** §3 Technical Background, table row 1; §6 Phase 1 file list
  - **Issue:** Task states `create-pr Step 6b: BLOCKING — verify comment posted` and lists `skills/create-pr/SKILL.md` for demotion. Verified file: Step 6b is titled "Comment on Linked Issue (graceful — non-blocking)" and uses `gh issue comment`, not `gh pr comment`. There are zero `gh pr comment` invocations in `skills/create-pr/SKILL.md`. It is already non-blocking and addresses a different audience (issue, not PR).
  - **Evidence:** `grep -nE "gh pr comment" skills/create-pr/SKILL.md` returns no matches. Step 6b at line 298 reads "graceful — non-blocking".
  - **Recommendation (per Q1):** Drop create-pr from scope. Update §3 table, §6 Phase 1, §7 Files Summary, §9 Success Criteria.

#### Important
- **Comment-chain volume claim "≥6 PR comments" / "4–6 in best case"**
  - **Location:** §1 Overview, §5 Breaking Changes
  - **Issue:** Math conflates issue and PR comments. Actual PR-comment count for 3-cycle run = 3 (qa-task) + 3 (qa-fix) + 1 (finalise) = 7. Best case 1-cycle = ~3. create-pr does not contribute.
  - **Recommendation:** Restate as "Up to 2N+1 PR comments for N QA cycles; goal is N+1 (intermediate non-blocking, finalise canonical)."

### Recommendations (Based on User Decisions)
1. Rewrite §3 table to list only qa-task / qa-fix / finalise. _Per Q1._
2. Update overview comment-count math. _Per Q1._

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important
- **Phase 2 — QA cycle count source is vague**
  - **Location:** §6 Phase 2, bullet 2
  - **Issue:** "Read QA cycle count from the implementation report" but no path / pattern / fallback.
  - **Recommendation (per Q2):** Specify: `grep -c '^### QA Cycle' <implementation-report-path>`; resolve report path from `develop-task` contract (or env var); fallback to omitting count if grep returns 0 or report missing.

- **Phase 2 — Idempotency contract is "best effort"**
  - **Location:** §6 Phase 2, bullet 3
  - **Issue:** "Keep the comment idempotent ... best effort" — no detection mechanism, no edit path.
  - **Recommendation (per Q3 + Q5):** Specify:
    - Marker: `<!-- finalise-canonical-summary -->` at start of body.
    - Detection: `gh pr view <pr> --json comments -q '.comments[] | select(.body | startswith("<!-- finalise-canonical-summary -->")) | .url'`.
    - Action: if found → `gh pr comment --edit-last` (or platform REST PATCH); else → `gh pr comment` new.

- **Phase 3 — Authorship subsection format unspecified**
  - **Location:** §6 Phase 3
  - **Issue:** "Add a 'Comment Authorship' subsection" — no template, no anchor.
  - **Recommendation (per Q4):** Embed authorship table inside the existing PR-comment step in each of qa-task / qa-fix / finalise. Use the same 2-column table (Skill | Owns) so all three skills carry identical contract text.

### Recommendations (Based on User Decisions)
1. Add concrete grep pattern + path resolution to Phase 2. _Per Q2._
2. Add marker spec + detection + edit commands to Phase 2. _Per Q3, Q5._
3. Specify authorship table embedded in comment step. _Per Q4._

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important
- **Files Summary stale after Q1**
  - **Location:** §7 Files Summary
  - **Issue:** Lists 4 skills; user dropped create-pr.
  - **Recommendation:** Remove `skills/create-pr/SKILL.md`.

#### Optional
- **Testing Strategy missing idempotency case**
  - **Location:** §8 Testing Strategy
  - **Recommendation (per Q6):** Add: "Re-run `/finalise` against same PR; assert exactly one comment containing `<!-- finalise-canonical-summary -->` exists; assert second run produced an edit (not a new comment)."

- **Success Criteria reads "Authorship table present in all 4 skills"**
  - **Location:** §9
  - **Recommendation:** "in all 3 affected skills" after dropping create-pr.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (one addition)

### Issues

#### Optional
- **`--edit-last` could edit the wrong comment**
  - **Location:** §10 Risk Assessment
  - **Issue:** If a non-finalise comment is the most recent (e.g. a stray reviewer comment), `--edit-last` overwrites it.
  - **Recommendation:** Add Low risk: "Marker-based detection must locate the comment by marker, not rely solely on `--edit-last` ordering. Use the comment URL/ID returned from the marker search to target the edit."

---

## Summary of Recommendations

### Must Fix (Critical) — 1 issue
1. Drop `create-pr` from §3 Technical Background table, §6 Phase 1, §7 Files Summary, §9 Success Criteria. _Per Q1._

### Should Fix (Important) — 4 issues
1. Rewrite §1 / §5 PR-comment count math (2N+1 → N+1). _Per Q1._
2. Replace Phase 2 cycle-count bullet with concrete grep + path. _Per Q2._
3. Replace Phase 2 idempotency bullet with marker + detection + edit commands. _Per Q3, Q5._
4. Replace Phase 3 authorship bullet with embedded table inside comment step. _Per Q4._

### Consider (Optional) — 2 items
1. Add idempotency manual test to §8. _Per Q6._
2. Add `--edit-last` selection risk to §10.

---

## Implementation Readiness Assessment

**Score:** 6/10 (now); 9/10 after applying decisions.

**Scoring Breakdown:**
- Template Compliance: 10/10
- Technical Accuracy: 4/10 (one critical mislabelling)
- Implementation Clarity: 6/10 (vague Phase 2 specs)
- Consistency: 7/10 (post-Q1 cleanup needed)
- Risk Management: 7/10

**Confidence Level for Successful Implementation:** Medium (High after fixes).

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** Core premise misidentifies one of the four skills, and Phase 2 has two underspecified contracts (cycle count, idempotency). All issues have user-validated fixes — applying them produces a ready-to-implement task.

---

## Next Steps

Address in order:
1. Drop create-pr from scope (table, phases, files, criteria).
2. Restate comment-count math.
3. Concretise Phase 2 (grep + marker + edit-last with marker-based targeting).
4. Concretise Phase 3 (embedded authorship table).
5. Add idempotency test to §8.
6. Add `--edit-last` risk to §10.

After fixes, run `/develop` (or resume `/develop-task`).

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-06
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.10.pr-comment-consolidation/task.10.pr-comment-consolidation.md`
- **Architecture Docs Consulted:** `skills/create-pr/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/qa-fix/SKILL.md`, `skills/finalise/SKILL.md`
- **Tracker:** GitHub issue #17 (verified OPEN)
