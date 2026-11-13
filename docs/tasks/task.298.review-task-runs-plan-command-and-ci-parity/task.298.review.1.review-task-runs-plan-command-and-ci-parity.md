# Task Review Report: Task 298 - review-task runs a plan's command and checks CI parity

**Reviewed:** 2026-11-13
**reviewed_blob:** 26f29bfa8525bb16d921181439babf7894160e3e
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

The task is small, well scoped and structurally complete (all 11 sections, Change Log, card preflight clean, links resolve). The plan named no test file and pointed at an existing test whose structure would have forced a `review-story` change. Two criteria promised more than a CI test can hold, and the new check had no answer for a command with no safe form. All were fixed in the document.

**Critical Issues:** 0
**Important Issues:** 5 (all fixed)
**Optional Improvements:** 2

**User Clarifications:** 0 (pipeline run, `--defaults`; no question was left open)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. Autonomous run: Step 0 output = Comprehensive report; Step 8.5 = apply all critical + important fixes; Step 9 = promote.

**Independence note:** the Phase 1.5 pre-pass subagents (architecture, codebase) were not dispatched; both passes were done inline. Independent review did not run.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References. No placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve.
- Sign-off and tracker linkage: no `github_issue`; no tracker issue to link in this run (not offered; pipeline run).

---

## 2. Technical Accuracy

**Status:** ACCURATE, with plan-shape findings

- Highest numbered Step 3 check is 30 (`grep -nE '^[0-9]+\. \*\*' skills/review-task/SKILL.md`); the new one is 31. The task already told the developer to read it at edit time. Confirmed.
- `skills/create-task/SKILL.md` § 3.5 "Should Add" exists and is the right home.
- No existing check covers running a plan's command (grep for `dry-run`, `scratch target`). Check 23 is a different thing (a parity claim about a sibling mechanism's guards); the plan now says so.
- `doc-links.js` on the task: 0 dead links.

### Important

- **I-1 (check 18/25): no named test.** Phase 3 said "find the test that holds the check list". There is none: `tests/review-plan-shape-checks.test.js` loops every check over both `review-task` and `review-story` (`first: 15` / `first: 11`), so extending it would have forced a `review-story` change the task rules out of scope. Fixed: one new file `tests/review-run-and-parity-checks.test.js`, under the `tests/*.test.js` glob of `test:suite`; nine existing tests that read `skills/review-task/SKILL.md` are re-run.
- **I-2 (check 10): a criterion promised a behaviour no CI layer holds.** "The new review check fires on a fixture plan…" cannot be run; the sibling tests state they hold presence only. Fixed: the criterion now names what the test reads (trigger, safe form, fallback, severity) and the mutations that turn it red.
- **I-3 (Step 6 check 4): a Performance criterion with no bound and no test.** "No new network or long-running step" was reworded to a clause in the check text that a test asserts.
- **I-4 (design): no answer for a command with no safe form.** A deploy script or an in-place build has no dry-run flag and no scratch target. Fixed: the check says not to run it and to record `unrun — no safe form` (Optional).
- **I-5 (check 25-adjacent): the check is listed in three places.** Step 3's hallucination-pattern bullets, its "Issues to Flag" line and the Anti-Hallucination Protocol each list checks; check 30 is in none of them. Phase 1 now adds the new check to all three.

### Optional

- O-1: the create-task item now says how it differs from check 23 (environments vs a sibling mechanism).
- O-2: `review-story` has the same review step (obs #163 `siblings_checked`); left out of scope as the task states. Worth a follow-up if `review-story` runs plans' commands too.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Three phases, each with files and concrete checkboxes. Dependencies: none between phases beyond Phase 3 reading Phases 1 and 2.

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes. Overview, Files Summary and Success Criteria now name the same test file. Controls: the test asserts the new item is not a copy of check 23.

## 5. Risk & Rollback

**Status:** ADEQUATE. The Medium risk (a check that runs a command could touch a real target) now has both clauses in its mitigation and a test holding them. Rollback unchanged: revert and re-bundle.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues, all applied

1. Name the test file and why the sibling test is not extended (I-1)
2. Reword the functional criteria to what a test can hold (I-2)
3. Give the Performance criterion a test (I-3)
4. Add the no-safe-form fallback (I-4)
5. Add the check to the three list sites (I-5)

### Consider (Optional) - 2 items

1. Distinguish the create-task item from check 23 (applied)
2. A `review-story` follow-up (not applied)

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical findings; every important finding was fixed in the document.

---

## Next Steps

Follow the three phases in order: the review-task check, the create-task item, then the test file, bundle and CHANGELOG. Run `ci:fast` before the PR.

---

## Review Metadata

- **Reviewer:** Claude (review-task, inside `develop-task`)
- **Review Date:** 2026-11-13
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.298.review-task-runs-plan-command-and-ci-parity/task.298.review-task-runs-plan-command-and-ci-parity.md
- **Architecture Docs Consulted:** none (pre-pass not dispatched)
