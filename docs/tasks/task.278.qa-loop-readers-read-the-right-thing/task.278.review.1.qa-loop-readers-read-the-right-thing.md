# Task Review Report: Task 278 - QA loop readers read the right thing

**Reviewed:** 2026-11-16
**reviewed_blob:** 1b1fafff2b6c2eaa8cafcf1d273c6238993ee9a2
**Review Depth:** Standard
**Task Status:** planned → ready-for-development (after fixes)
**Overall Assessment:** GOOD (7/10 before fixes, 9/10 after)

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-11-16

---

## Executive Summary

The task targets three real defects and its controls are well chosen. The review found no Critical issue. Four Important issues came from checking the plan against the code: one phase would have been a no-op, one dependency claim was false, one phase edited a consumer instead of the producer, and one mapping was left to guesswork. All were fixed in the task and plan documents.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 (autonomous pipeline run, `--defaults`; no question was open)
**Implementation Readiness:** 9/10 after fixes (7/10 before)
**Recommendation:** NEEDS REVISION → fixes applied → READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Run under `/develop-next` with `--defaults`; every finding had one defensible fix, so none needed a decision.

---

## 1. Template Structure Compliance

**Status:** PASS. Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve. `doc-links.js`: all relative links resolve in the task and the plan. OKF frontmatter present (`type: task`, `description`, `tags`). Change Log present. Sign-off not enabled.

## 2. Technical Accuracy

**Pre-pass:** the two Explore pre-pass agents were not dispatched. Both passes were done inline against the code, and **independent review did not run**. Architecture axes came from `prepass-axes.js` (`source: architecture`).

### Important

- **I1. Phase 1 as written would change nothing** (check 11, run, not read). The plan says to "pass only top-level key lines". The line feed is already filtered by indent (`qa-diminishing-returns.js:223`–`:227`). The defect is inside one line: `KEY_RE` scans the whole text. Evidence, from `readTopIssues`:
  - block entry `finding: "the writer read status: waived from this text"` then a real `status: open` → `status: 'waived from this text"'` (FIRST wins);
  - flow entry `{…, finding: "quotes status: waived", status: open}` → `status: 'waived"'`.

  Fixed: task § 3 and Phase 1, plan Phase 1 rewritten to the in-line defect, with a block and a flow test.
- **I2. "`readKeysInto` is shared with other readers" is false** (check 3 / config-key class). `git grep readKeysInto` finds it only in `qa-diminishing-returns.js`. `review-report-freshness.js` is named in a comment, not a caller. The shared surface is `readTopIssues`, consumed by `accept-qa-residual.js` and five suites. The criterion "every other reader of `readKeysInto`" was vacuous. Fixed: § 3 clarification and the Functional criterion now name the real consumers.
- **I3. The `fix_path` field was added only to a consumer** (check 21). `ref` and `suggested_action` are produced by `/review-pr` (`pr-conformance-prompt.md:147`, `skills/review-pr/SKILL.md:792`); `qa-findings-ingester-prompt.md` maps them onward. A field only the ingester knows would never be emitted. Fixed: Phase 3 adds the producer files, their bundled copies and the two suites that read the conformance prompt.
- **I4. Phase 2's file mapping was left to the developer.** The #120 pair lives in two directories (`shared/resources/X.js` and `shared/resources/tests/X-differential.test.mjs`), so "`tests/X-*.test.*` → `X.*`" cannot be applied literally. Fixed: the mapping is stated (strip the `tests/` segment, drop `.test.<ext>` and `-<suffix>`, match by directory and stem). `qa.testArtifactGlobs` is set in this repository (`skills-config.yaml:45`); in an unconfigured consumer nothing folds, as the exit itself stays off. Stated.

### Optional

- **O1.** The Migration criterion counted `git grep` hits, which never exercises the reader. Re-defined as a per-entry before/after run of `readTopIssues` over every committed gate.
- **O2.** The doc sweep carried no search (check 20), and the suites that pin the step document by pattern were not listed (check 15). Both searches added to Phase 4.

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Four phases, each with files, a risk level and a rollback. No phase depends on another except Phase 4. Effort 8h is in line with the rubric.

## 4. Consistency & Completeness

**Status:** CONSISTENT. Every behaviour criterion has a named control test in § 8. The Performance criterion states a bound, the command and the load record (`uptime`). The Migration criterion is now a measured before/after run. No criterion needs a post-merge event.

## 5. Risk & Rollback

**Status:** ADEQUATE. The medium risk (a real status flips) is mitigated by the Migration criterion, which is now a real per-entry diff.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 4, all applied

1. Rewrite Phase 1 to the in-line defect (I1).
2. Correct the `readKeysInto` consumer claim and criterion (I2).
3. Add the `fix_path` producer (I3).
4. State Phase 2's path mapping (I4).

### Consider (Optional) - 2, all applied

1. Re-define the Migration criterion (O1).
2. Record the sweep and pinned-suite searches (O2).

---

## Implementation Readiness Assessment

**Score:** 9/10 after fixes (7/10 before)

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (was 5/10)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** (after the fixes above)

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline run)
- **Review Date:** 2026-11-16
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.278.qa-loop-readers-read-the-right-thing/task.278.qa-loop-readers-read-the-right-thing.md`
- **Architecture Docs Consulted:** `docs/architecture` via `prepass-axes.js`
