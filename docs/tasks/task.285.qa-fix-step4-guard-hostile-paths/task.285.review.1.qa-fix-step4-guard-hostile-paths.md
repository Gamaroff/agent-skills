# Task Review Report: Task 285 - qa-fix Step 4 guard survives hostile paths

**Reviewed:** 2026-11-07
**reviewed_blob:** 4c62b16317c3ea19192b176ab906cff2906e2532
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and its claims check out against the tree, including the two reported defects, which this review reproduced with the block's own commands. Two plan shapes needed fixing: the "heredoc or refusal" choice was not a real choice, and a third defect (backslash silently consumed by `xargs`) sits beside the two reported ones. All findings were applied to the task and plan.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️ (all applied)
**Optional Improvements:** 2 💡 (applied)

**User Clarifications:** 0 questions (autonomous pipeline run; no ambiguity needed a user decision)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the applied fixes)

---

## User Decisions & Clarifications

None. Pipeline run with `--defaults`; every finding had one defensible fix, applied directly.

---

## 1. Template Structure Compliance

**Status:** PASS

- Eleven mandatory sections present; `type: task`, `description`, `tags` present.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve.
- Relative links: `doc-links.js` clean on the task and the plan.
- Change Log present and current (rows appended by this review).
- Sign-off not enabled; skipped.

---

## 2. Technical Accuracy

**Status:** ACCURATE with one wrong alternative

### Verified

- `skills/qa-fix/SKILL.md:849` is `CHANGED_PATHS="{changed-paths}"`; Step 4 heading at `:832`.
- `shared/resources/develop-pipeline-step-3-develop-loop.md:233` carries the bare command; 3 bundled copies exist (`develop-bug`, `develop-story`, `develop-task`, line 234).
- `tests/qa-fix-step4-guard.test.js` holds 10 cases and `MUTANTS` at `:198`; `tests/*.test.js` is in the `test:suite` glob, so the file is reached by the runner (check 18).
- T268-QA-11 reproduced (check 11, executed, not reasoned): in a scratch repo, `link/f` (`link -> real`) and `inner/f` (`inner/.git`): `--error-unmatch` exits 1, `[ -e ]` passes, the untracked listing prints nothing and exits 0, so the guard reads clean. The directory `inner` and the symlink `link` themselves are already listed (`inner/`, `link`) and refused today.

### Important

- **I-1: "Either heredoc or refusal" is not a choice.** The slot is substituted into the assignment text before any line runs, so a refusal inside the block cannot protect the assignment. Option A in the plan already used a heredoc. Fixed: the two are layered.
- **I-2: A third defect beside QA-10 and QA-11 (check 11).** `xargs` without `-0` reads `'`, `"` and `\` as syntax. `printf '%s\n' 'a\' | xargs echo` prints `a`: the guard would judge `a` while the file is `a\`. A quote fails loudly (`unmatched single quote`); a backslash fails silently. A heredoc alone (the plan's "Option B") leaves this open. Fixed: refuse `\`, `'`, `"`, or feed `xargs -0`; new case `backslash-mutation`; new success criterion.
- **I-3: Phase 5 edits a document that tests pin by pattern (check 15).** No test pins the literal `stop while` (0 hits), but nine suites pin the loop doc by file name. Fixed: Phase 5 names them and runs them after the bundle.
- **I-4: The 1-second bound had no command (Step 6 check 4).** Fixed: the `node --test` spec reporter's per-case `(…ms)`, with `uptime` beside it.

### Optional

- **O-1:** Anchors `850-853` and `854-858` were off by one; corrected to `850-854` and `855-858`.
- **O-2:** The Files Summary omitted the task 268 document that Migration criterion 2 edits. Added.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. A temp-directory removal line was added to Phase 1 for any symlink or directory a case creates outside the engine's fixture directory (check 28).

---

## 4. Consistency & Completeness

**Status:** CONSISTENT. Success criteria map to phases; each behaviour criterion names a test or a measured command. The performance criterion (median within 10% over five alternating pairs) is a heavy measurement for a change this size; it is kept because the task states it, and it is non-blocking for review.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Over-refusal is rated Medium with a named mitigation; widening a guard's refusals has an obvious differential check (the admitted-case tests in Phase 4). Rollback is a revert of the PR.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 4, all applied (I-1 to I-4)

### Consider (Optional) - 2, applied (O-1, O-2)

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (before fixes), 9/10 after
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the four important findings are applied and the two reported defects are reproduced, so Phase 1's "expect red" is a measured claim.

---

## Review Metadata

- **Reviewer:** review-task (autonomous pipeline run)
- **Review Date:** 2026-11-07
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.qa-fix-step4-guard-hostile-paths.md
- **Pre-pass:** the two Explore pre-pass agents were not dispatched; the architecture and implementation-status passes were done inline (independent review did not run). Inline result: no existing implementation of the fix; the change lives in a skill source, so architecture alignment is by `tests/*.test.js` convention.
- **Architecture Docs Consulted:** none needed beyond the repository's own standards in CLAUDE.md
