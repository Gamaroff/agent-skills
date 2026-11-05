# Task Review Report: Task 261 - Untrusted-content rule

**Reviewed:** 2026-11-05
**reviewed_blob:** f0c3d207ab3893ae558a59096e1ff0138d678ad9
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and its witnesses are accurate: every cited `file:line` read site resolves to the code it names. The review found that the read-site population is wider than the five-row table, and that `LOCAL_PATH` is confirmed unbounded. Both are now recorded in Phase 1. Pre-pass subagents were not dispatched; both passes were done inline, so independent review did not run.

**Critical Issues:** 0
**Important Issues:** 2
**Optional Improvements:** 1

**User Clarifications:** 0 (autonomous pipeline run)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. Output format and fix-application were auto-answered per the develop-task pipeline.

---

## 1. Template Structure Compliance

**Status:** PASS

- Card preflight: 3 card blocks resolve. Relative links resolve (`doc-links.js`).
- Frontmatter has `type`, `description`, `tags`. No `sign-off` or `change-log` keys in `skills-config.yaml`, so the Change Log is on its default (enabled); the log existed and now carries the review rows.
- No tracker issue is linked (`github_issue` absent). Tracker sync was not offered (autonomous run); this is the Important gap noted under tracker linkage, accepted for this run.

## 2. Technical Accuracy

**Status:** ACCURATE

Witnesses checked by reading the cited lines: `skills/review-pr/SKILL.md:391`, `skills/review-task/SKILL.md:150`, `skills/browser-use/SKILL.md:78`, `skills/explain-simply/SKILL.md:72`, the step-0 doc `:126` (the `gh issue view` is at `:127` after edits upstream; within one line), `skills/review-pr/SKILL.md:519`, `shared/resources/probe-boundary-rule.md:52`. All resolve.

- **[Important]** The read-site population is wider than the table (check 20, a site list carries its grep). A grep for the task's own markers also hits `create-issue`, `finalise`, `review-story`, the `ensure-*-jira-issue` and `sync-github-*` skills, `jira-transition-protocol.md`, `tracker-state-poller-subagent.md` and `develop-pipeline-pause.md`. Some are metadata-only or own-content reads. **Fixed:** Phase 1 now requires each hit to be classified with a witness.
- **[Important]** `LOCAL_PATH` is unbounded (Phase 1 asked). `skills/review-task/SKILL.md:156-159` and the step-0 doc `:128` build the path with `sed` from an issue-body URL and open it with no check. **Fixed:** Phase 1 records this, so the Phase 3 bound is required, not conditional.
- **[Optional]** The task's `getJiraIssue` and bare-`body` matcher keys are shared tokens (obs #135); the Risk section already names this, and Phase 1 now repeats it.

## 3. Implementation Plan Completeness

**Status:** COMPLETE. Four phases, each with files, changes and dependencies. `tests/*.test.js` is reached by the runner (`package.json` `test:suite`), so check 18 holds.

## 4. Consistency & Completeness

**Status:** CONSISTENT. Success criteria for the lint test and the bound name a test; the performance bound (under 2 seconds, tree scan) is asserted by a test-run time and has no per-PR assertion. This is acceptable as advisory, noted only.

## 5. Risk & Rollback

**Status:** ADEQUATE. The false-comfort risk is named with mitigation.

---

## Summary of Recommendations

### Must Fix (Critical) - 0
### Should Fix (Important) - 2 (both applied: Phase 1 population classification; LOCAL_PATH required bound)
### Consider (Optional) - 1

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ READY TO IMPLEMENT. No critical issues; the two important findings are applied to the task.

---

## Review Metadata

- **Reviewer:** review-task (inline, autonomous)
- **Review Date:** 2026-11-05
- **Task File:** docs/tasks/task.261.untrusted-content-rule/task.261.untrusted-content-rule.md
- **Pre-pass:** inline, no subagents dispatched
