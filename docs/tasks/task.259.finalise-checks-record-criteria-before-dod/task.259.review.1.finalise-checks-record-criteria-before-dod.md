# Task Review Report: Task 259 - finalise checks record criteria before the DoD run

**Reviewed:** 2026-11-04
**reviewed_blob:** 3761641a2b678c7aa6cbd0a5278dd281f01c27d7
**Review Depth:** Standard
**Task Status:** Planned (before review)
**Overall Assessment:** GOOD (after fixes)

---

## Executive Summary

The task is well scoped and its facts hold: `finalise-rerun-scope.js`, `changelog-cites.sh`, review-task check 22 and the Step 3a heading all exist, the card preflight passes, relative links resolve, and `shared/resources/tests/*.test.mjs` is reached by `test:suite`. One Critical flaw: the engine as specified could not catch the incident that motivated it. It was fixed in the document.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 3 ⚠️ (fixed)
**Optional Improvements:** 1 💡

**User Clarifications:** 0 asked (pipeline mode, `--defaults`; decisions below were made by the reviewer and are logged)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The pipeline runs unattended. One decision was made for the user and is flagged here for review:

- **Engine scope after the Critical finding.** Chosen: keep the engine deterministic and content-blind, make it list every record criterion with its committed `artifacts`, and move the "is the record in the file" reading to a Step 3a confirm step run by the main context. Rejected: a lexical content probe, because task 257's QA report already contained the word "mutation" 5 times and would have passed it.

---

## 1. Template Structure Compliance

**Status:** PASS. Card preflight: 3 blocks resolve. No placeholders. Change Log present and now current.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)

#### Critical

- **The first success criterion is unattainable.** The task said the task 257 case "reads `implementation-report-only`". Task 257's criterion 14 reads "Every mutation in § 8 turns a test red, recorded in the QA report" (verified: `git show 95f58307^:…task.257…md`, line 302). It names the QA report, and committed QA reports existed, so a content-blind engine returns `ok`. The task also says the engine "does not judge content", so the two statements contradict. A test built from the real criterion would have failed, or been bent to pass.
  - **Fix applied:** § 3 now says `ok` means a committed place exists, not that the record is in it; the engine returns `artifacts`; Phase 1's first test uses the verbatim criterion and expects `ok`; a second test covers the real `implementation-report-only` shape; Phase 2 adds a confirm step where the main context opens each artifact.

#### Optional

- Check 22's trigger words ("recorded", "logged", "listed in", "documented") are prose in `skills/review-task/SKILL.md`. The parity test must parse that sentence. Plan note only; the task already schedules the parity test.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Files are named, phases have risk and dependencies.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **"Step 3a runs the check before the dispatch" named no test.** A behaviour criterion whose fix lands in a skill document must put it in a fenced block a test can extract. Fixed: Phase 2 now puts the call in a fenced `bash` block and adds a test that extracts it and asserts it calls the engine and precedes `#### Step 3b`.
- **The Performance criterion ("reads one document and one directory listing") had no bound a test holds.** Fixed: the engine is pure, takes lists as arguments, and a test stubs `child_process` to throw.
- **Mutation 1 named the wrong test** after the Critical fix. Now names the `implementation-report-only` test.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Medium risks have mitigations, rollback is stated.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (before fix), 9/10 (after)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The one Critical defect was a contradiction inside the document, now resolved. The remaining plan matches the repository as measured.

---

## Review Metadata

- **Reviewer:** review-task (pipeline run, develop-next)
- **Review Date:** 2026-11-04
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.259.finalise-checks-record-criteria-before-dod/task.259.finalise-checks-record-criteria-before-dod.md
- **Pre-pass agents:** not dispatched; the architecture and codebase checks were done inline (independent review did not run)
