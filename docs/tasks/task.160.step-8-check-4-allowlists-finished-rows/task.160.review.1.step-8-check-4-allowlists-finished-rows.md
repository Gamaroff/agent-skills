# Task Review Report: Task 160 - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones

**Reviewed:** 2026-09-27
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 recommendations implemented — 2026-09-27

---

## Executive Summary

The task is accurate, well-scoped and its corpus figures reproduce exactly. One reachability defect: the § 3 Target Architecture awk cannot produce the `no Status column in the header row` outcome that § 9 promises. Under BSD awk, `$col` with `col` unset is a fatal error, the command substitution captures nothing, and check 4 **passes**. That is the failure class this task exists to remove. Fixed in the document before development.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (pipeline run, develop-task Step 2 — the fix is unambiguous and within the task's stated intent)
**Implementation Readiness:** 9/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions asked. The review ran inside the `develop-task` pipeline, and both findings have one correct resolution that follows from the task's own § 9 criteria.

Pre-pass agents B and C were **not dispatched**; both passes ran inline in this session (subagents hung in earlier sessions of this repo). Independence loss recorded: the reviewer is the same agent that will develop the task.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References, Notes.
- Frontmatter: `type: task`, `description`, `tags` present (OKF conformant). `github_issue: 498` exists (OPEN); body link `[#498](…/issues/498)` matches.
- `doc-links.js`: 1 relative link resolves.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve; Breaking Changes carries a `+2 more` link (information, not a defect).
- Change Log present and current for `planned`. Sign-off not enabled.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (1)
**Hallucinations Detected:** 0

Verified against the tree:

- Check 4's three parts (`PROGRESS_ROWS` awk, `[ -n … ]` guard, the Pending/Paused `grep -qE`) are at `shared/resources/develop-pipeline-step-8-commit.md` lines 196–207, as described.
- The post-commit `Committed in {hash}` write (line 94) and the post-push `Update Pipeline Progress: ✅ commit-changes.` (line 105) exist as § 2 Problem 3 says. Both are restated only in the three bundled copies; no `SKILL.md` restates them.
- Template headers: Story and Task variants carry Status in cell 2, the Bug variant in cell 3 (`implementation-report-template.md` lines 67, 163, 251).
- The harness helpers (`SHELLS`, `finished`, `setRow`, `setNotes`, `withoutProgressTable`, `setup`, `runChecklist`) exist in `step-8-completion-checklist.test.mjs`.
- Same-class inventory: `PROGRESS_ROWS` appears only in the step document and its bundled copies. The task says it replaces task.159's grep. Correct.
- **Corpus figures re-measured** with the § 3 prototype over `git ls-files '*.implementation.*.md'` filtered to Final Status Completed/Accepted: total 123, allowlist fails 17, today's check fails 17, newly refused 0, bash/zsh disagreements 0. Matches § 3 exactly.

### Important

- **Check 10 (outcome reachability): the `no Status column` criterion is unreachable as written.**
  - **Location:** § 3 Target Architecture; § 9 Functional criterion 5; plan Phase 2.
  - **Walk:** a header with no `Status` cell leaves `col` unset. The row block then evaluates `s = $col`, which is `$""`. BSD awk (macOS) aborts: `awk: illegal field $(), name "col"`. The `END` block never runs, `UNFINISHED` is empty, and `[ -z "$UNFINISHED" ]` passes. Reproduced under bash and zsh on a synthetic report: output `OK`, exit 0.
  - **Second half of the same defect:** `UNFINISHED=$( … | awk … )` ignores awk's exit status. Any awk runtime error reads as "no unfinished rows". That is the `empty` vs `scan-broken` confusion one layer down.
  - **Recommendation (applied):** add a `!col { next }` rule before the row block so the `END` branch is reached, and fail closed on awk's exit status: `UNFINISHED=$( … ) || { echo "❌ Step 8 incomplete: could not read …"; exit 1; }`. Verified: the guarded form prints `no Status column in the header row` and exits 1 under both shells; with the guard removed, the fail-closed capture exits 1 instead of passing; the corpus result is unchanged (17).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are concrete, file-specific and ordered. The mutation table covers every allowlist branch. It lacked a row for the new guard and the fail-closed capture; both are added.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (1 optional)

### Optional

- **The orchestrators' Step Transition Protocol also edits the report after Step 8.** Its action 2 sets the just-completed step's row to `✅ Done` after the sub-step returns. For Step 8 that is after the commit. Once Phase 3 sets the Step 8 row before the commit, that edit is a no-op, but only if the orchestrator writes the same cell value. **Recommendation (applied):** state in Phase 3 that the row is written as `✅ Done` before the commit, so the protocol's later edit changes nothing.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks and rollback are proportionate to a shell-block change in prose. The BSD-awk risk in § 10 was real: it is the Important finding above, and the executed no-Status-column case now covers it.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 1 issue

1. Guard the row block on `col` and fail closed on awk's exit status (§ 3, § 9, plan Phase 2 and Phase 4 mutation table).

### Consider (Optional) - 1 item

1. Phase 3: write the Step 8 row as `✅ Done` before the commit, so the Step Transition Protocol's post-step edit is a no-op.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (one unreachable outcome, now fixed)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues. The one important finding was a concrete code defect with one correct fix, which is applied and verified.

---

## Next Steps

Task is ready for implementation. Follow the plan phase by phase, tests first.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-09-27
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.step-8-check-4-allowlists-finished-rows.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md` (via always-load list); `shared/resources/implementation-report-template.md`; `shared/resources/develop-pipeline-step-8-commit.md`
