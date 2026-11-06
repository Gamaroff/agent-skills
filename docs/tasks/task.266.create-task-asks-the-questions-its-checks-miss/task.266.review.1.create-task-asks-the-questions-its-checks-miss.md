# Task Review Report: Task 266 - create-task asks the questions its checks miss

**Reviewed:** 2026-11-06
**reviewed_blob:** 730b63a86f188f9b33fa15716809041a6f5bb764
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-11-06

---

## Executive Summary

A prose-only task adding five authoring checks to `create-task` § 3.5 and one clause to the finalise AC prompt. Every cited line anchor resolves against the tree (`SKILL.md:543/558/559/560/562/564`, `finalise-dod-ac-prompt.md:72`, `lib.js:339`). The card preflight and link check pass. Five defects were found and fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️ (all fixed)
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions (pipeline run: autonomous defaults; no ambiguity needed a decision)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

Pre-pass subagents (architecture alignment, codebase scan) did not run: the pre-pass was performed inline. Independent review did not occur. `prepass-axes.js` reported source `architecture`; the architecture axes were applied by reading the cited files.

---

## User Decisions & Clarifications

None asked. Pipeline defaults applied: output format = comprehensive report; Step 8.5 = apply all critical and important fixes; tracker sync offer (check 5) = skip, because creating a remote issue is an outward-facing action no one authorised.

---

## 1. Template Structure Compliance

**Status:** PASS (one Important gap)

- Eleven mandatory sections present; Change Log, Progress Tracking and References present. Card preflight: 3 card blocks resolve. `type: task` and `description` present.
- **Important (not fixed, by design):** no `github_issue:`. Tracker sync was offered by default rule and skipped. A later `/sync-github-task` links it.
- Sign-off and Change Log checks: `sign-off` not enabled; Change Log present and now current.

## 2. Technical Accuracy

**Status:** ONE INACCURATE CLAIM (fixed)

- **Important — false claim about `review-task`.** § 3 Target Architecture said `review-task` check 10 catches obs #134 and check 21 catches obs #122. Check 10 is outcome reachability (obs #168); check 21 is field names from another skill (obs #296). `grep -n -E "obs #(134|122|31|156)" skills/review-task/SKILL.md` returns nothing. Fixed: the sentence now states there is no twin and points at task 267.
- Verified: line anchors above; `grep -n -iE "median|sample size|classifier|scratch copy" skills/create-task/SKILL.md` returns no hit for the five shapes; `finalise-dod-prompt-contract.test.mjs` pins nothing about the wall-clock sentence.
- Check 14 (call-site population), 15 (removed literal: the task only adds text), 16, 17, 18 (no test file added), 19, 20: not applicable. The task's `git grep` for restatements carries its search.
- Cited date: `develop bdd755c7` is older than the current tip `1f014f1c`; the anchors were re-verified at the current tip. (Optional.)

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- **Important — two more tests read the finalise prompt.** `tests/review-task-measured-criterion.test.js` and `tests/lib/count-of-kinds.js` read `finalise-dod-ac-prompt.md`; the plan ran only the eval contract test. Fixed: Phase 2 and the Code Quality criterion now include both, and Phase 2 states that the clause adds no criterion kind.

## 4. Consistency & Completeness

- **Important — item count.** § 1 and § 4 said "five Critical items"; § 6 and § 10 put item 1 in Should Add. Fixed: four Critical, one Should Add, stated at each site.
- **Important — missing controls.** Success Criteria require a control draft per item, but § 8 named controls for items 1, 2 and 3 only. Fixed: controls added for items 4 and 5, and the QA report is to carry one row per item showing the flagged and the control draft.

## 5. Risk & Rollback

Adequate for a prose change. Rollback is a revert plus `npm run bundle -- --check`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 5, all applied

1. Correct the false `review-task` twin claim.
2. State "four Critical and one Should Add" at every site.
3. Add controls for items 4 and 5 to § 8.
4. Add the two further tests that read the finalise prompt.
5. (Open by design) Link a tracker issue later with `/sync-github-task`.

### Consider (Optional) - 2

1. Re-date the `develop` SHA in § 3.
2. The "within 10%" wall-time criterion for a prose-only change cannot move; it is cheap to keep but low value.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (after the false claim is fixed)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ **READY TO IMPLEMENT**

---

## Review Metadata

- **Reviewer:** review-task (inline, pipeline run)
- **Review Date:** 2026-11-06
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.266.create-task-asks-the-questions-its-checks-miss/task.266.create-task-asks-the-questions-its-checks-miss.md
- **Architecture Docs Consulted:** docs/architecture concepts (via prepass-axes.js)
