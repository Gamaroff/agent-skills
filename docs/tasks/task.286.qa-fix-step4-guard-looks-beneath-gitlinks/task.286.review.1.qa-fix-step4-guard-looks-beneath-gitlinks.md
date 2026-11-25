# Task Review Report: Task 286 - qa-fix Step 4 guard looks beneath gitlinks

**Reviewed:** 2026-11-20
**reviewed_blob:** d97a6bfbcd0f6d8805e6686fe9ab626fab278601
**Review Depth:** Standard
**Task Status:** Planned (now Ready for Development)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-11-20

---

## Executive Summary

The task is well scoped: one reproduced defect (CR-1) and two advisories, each with a named test and mutant. Technical claims hold against the tree except five drifted `SKILL.md` line numbers, and the plan missed one test pin that the CR-2 edit would break. All three findings are fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions (pipeline run, no interactive questions; CR-3 rewrite-versus-document stays a Phase 1 decision by the task's own design)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. The review ran inside `/develop-task --defaults`, which auto-answers the output format ("Comprehensive report") and the fix offer ("apply all critical + important").

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; frontmatter carries `type: task` and `description`.
- Card preflight (`sync-jira-task.js --check-card`): 3 blocks resolve (Summary, Success Criteria, Breaking Changes); +N more counts are information only.
- `doc-links.js`: 4 relative links resolve.
- Change Log present with the four columns.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)

### Important

- **Test pin the plan does not name (check 15).** The CR-2 fix rewrites `case "$LEX/" in "$TOP"/*) INSIDE=1 ;; …` to compare against `"${TOP%/}"/*`. `tests/qa-fix-step4-guard.test.js:730-731` holds that line as `INSIDE_LINE`, which a direct mutant reverts by exact match. `git grep -nF '"$TOP"/*' -- tests` returns that one hit. After the edit the `from` string is absent and the mutant stops mutating anything, so its scenario can no longer turn red for the right reason. `COMPARE_CLAUSE` and `NEST_CLAUSE` (`:728-733`) are the same shape and the CR-1 edit may touch them. **Fixed:** Phase 4 now has a task to update `INSIDE_LINE` in the same edit and re-check the other two.
- **Probe cases file unnamed (criterion 22).** Phase 3 said "the probe cases file the QA gate uses" without a location. The only such file is task 285's `task.285.dod.1.security.cases.json`, an artifact of a finished task. **Fixed:** the task now names `task.286.dod.1.security.cases.json` beside this document, seeded from task 285's.

### Optional

- **Drifted line anchors.** The five `SKILL.md` anchors were stale (`:890 :893 :903 :911 :918`); measured with `grep -nE 'error-unmatch|TOP=|INSIDE=1|NEST=|ls-files --others' skills/qa-fix/SKILL.md` they are now `:906 :909 :919 :927 :934`. The test-file anchors (`:643`, `:788`) and the count (37 tests under `CI=true`, 37 pass) are correct. **Fixed:** re-anchored, with a note to locate by quoted text.

Other checks: the 285 gate and QA report links exist; `skills/qa-fix/SKILL.md` has the cited `### Step 4: Validate` heading; the test file is already reached by the runner (check 18 not applicable); CHANGELOG has an `## [Unreleased]` heading (check for placement is a develop-time step, not a plan claim).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with risk, files and checkboxes. The plan sketch for CR-1 uses a `while read` loop and no positional tokens, which matches the `fenced-bash-positional-params` guard. One implementer note, not a finding: the sketch prints the path from inside a pipeline subshell, so the block must collect that output the way its neighbours do.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Every success criterion names a held scenario or mutant (criterion 22 satisfied; the "no performance criterion" line is an explicit not-applicable). The CR-3 criterion, "behaves as decided in Phase 1 and a scenario holds it", is satisfiable either way the decision falls.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The over-refusal risk has a named mitigation (look inside, refuse only on an untracked file or could-not-look) and an admitted scenario. Rollback is a revert plus `npm run bundle`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 2 (done)

1. Add the `INSIDE_LINE` / `COMPARE_CLAUSE` / `NEST_CLAUSE` mutant-literal update to Phase 4.
2. Name the probe cases file.

### Consider (Optional) - 1 (done)

1. Re-anchor the five drifted `SKILL.md` line numbers.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the two important findings are fixed in the document.

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline run)
- **Review Date:** 2026-11-20
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `concepts/coding-standards.md` (axes via `prepass-axes.js`, source `architecture`)
- **Pre-pass:** Agents B and C not dispatched; performed inline (independent review not run).
