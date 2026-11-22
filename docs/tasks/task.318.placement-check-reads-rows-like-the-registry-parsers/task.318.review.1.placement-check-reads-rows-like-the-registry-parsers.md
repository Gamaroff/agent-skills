# Task Review Report: Task 318 - Placement check reads rows like the registry parsers

**Reviewed:** 2026-11-22
**reviewed_blob:** aa2bc1516a2a21660f75be6bf631a25b1fc70e6e
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development by this review)
**Overall Assessment:** GOOD

---

## Executive Summary

A small, well-scoped test-helper task. Both divergences it names were reproduced during this review and hold. One Important gap was fixed in the document: the Testing Strategy lists a third case (a fenced table above the real header) that Phase 1 and the plan never added.

**Critical Issues:** 0
**Important Issues:** 1 (fixed)
**Optional Improvements:** 1

**User Clarifications:** 0 questions asked (pipeline-invoked, non-interactive)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

Pre-pass Agents B and C were not dispatched: the review ran them inline (independent review did not run). Architecture alignment: the task touches one test file and no architecture concept. Implementation status: `placementOf` still has the trim and fence gap, so the task is not already done.

---

## User Decisions & Clarifications

None. Pipeline mode, so no question was asked.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References present. `type: task`, `description` and `tags` present.
- Tracker card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, no findings.
- No `github_issue` / `jira_key`: no tracker linkage to check (a purely local follow-up task).
- Relative links: `doc-links.js` reports 3 links, all resolve.

---

## 2. Technical Accuracy

**Status:** ACCURATE

- Anchors verified: `placementOf` at `task-registry-drift.test.mjs:367`, the `parseRegistry` import at line 45, `parseRegistry` at `select-next.mjs:1358`, its fence regex at 1380, `findHeader` at `registry-tick.js:1013`.
- **Check 11 (invariant, run not read).** The task's two divergence claims were run:
  - `node -e 'console.log(/^\|\s*(\d+)\s*\|/.test("  | 3 | c |"))'` → `false`.
  - `parseRegistry` (eight-column header, linked rows) returned rows `[1,3]` for an indented row after `## Notes`, and `[1]` for a fenced sample row (backtick and tilde). Both divergences hold.
- **Important (fixed):** a first attempt with unlinked rows returned 0 rows and 2 malformed. A comparison input needs a `[title](task.N.x/task.N.x.md)` link and at least five cells, or the parser reports the row malformed rather than read. The plan now says so.
- Checks 15, 18, 25 not applicable: no literal is removed, no test file is added, no new member of an enumerated class.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after one fix

- **Important (fixed):** Testing Strategy lists four cases, including "a fenced table above the real header does not become the header", but Phase 1 and the plan added two inputs. Phase 1 and the plan now add `fencedHeader` as a third input, with its expected result on the old helper.
- **Optional:** the mutation proof in the plan now also reverts the header-search fence skip and the row-scan fence skip separately, so each skip is held by a named case.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Success criteria 1 and 2 name the QA report as the record. The CI-state criterion (`ci:fast`) is graded from CI. No criterion can only be met after merge.
- Non-vacuity floor (`PLACEMENT_MIN_ROWS`, `g.rows.length === 2`) is kept by the plan.
- `CHANGELOG.md`: the task says to add a line only if warranted. The change is test-only; `[Unreleased]` is at line 5 above the first release heading (line 20) if one is wanted.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. One Low risk (the two readers drift again), a mitigation, a revert-the-commit rollback.

---

## Summary of Recommendations

### Must Fix (Critical) - 0
### Should Fix (Important) - 1, applied
1. Add the fenced-table-above-header case to Phase 1 and the plan.
### Consider (Optional) - 1, applied
1. Mutation-prove each fence skip separately.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 8/10 (before the fix)
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Both divergences were reproduced, the one plan gap was closed, and the change is confined to one test helper.

---

## Review Metadata

- **Reviewer:** review-task (pipeline-invoked)
- **Review Date:** 2026-11-22
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.318.placement-check-reads-rows-like-the-registry-parsers/task.318.placement-check-reads-rows-like-the-registry-parsers.md
- **Architecture Docs Consulted:** none needed (one test file)
