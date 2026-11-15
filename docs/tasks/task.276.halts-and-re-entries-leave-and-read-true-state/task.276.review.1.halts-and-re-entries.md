# Task Review Report: Task 276 - Halts and re-entries leave and read true state

**Reviewed:** 2026-11-15
**reviewed_blob:** 3d06513c5bf102ce78b37efc83a93932b355641e
**Review Depth:** Standard
> **Implementation Status**: ✅ All 8 critical + important recommendations implemented — 2026-11-15
**Task Status:** planned (promoted to ready-for-development after the fixes)
**Overall Assessment:** NEEDS IMPROVEMENT (before fixes) → GOOD (after the fixes below)

---

## Executive Summary

The task targets five real recovery defects, and its file and line citations mostly hold. But the plan's central change (a `--restore` guard) would break the re-entry script it exists to protect, and it keys on a token no writer emits. Both were found by reading the callers and running `git grep`, then fixed in the task document in Step 8.5.

**Critical Issues:** 2 🚨 (both fixed)
**Important Issues:** 6 ⚠️ (all fixed)
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (pipeline run; every choice below was made by the reviewer and is logged)
**Implementation Readiness:** 6/10 before fixes, 8/10 after
**Recommendation:** READY TO IMPLEMENT (after the fixes applied in Step 8.5)

---

## User Decisions & Clarifications

Pipeline run under `develop-next --defaults`; no question was put to a human. Decisions made autonomously:

- **Tracker sync:** skipped, task left unlinked. Tasks 273 to 275 carry no `github_issue:`, so this repository does not link tasks.
- **Pre-pass agents B and C:** not dispatched; the three scripts and their callers were read directly (independent review did not run).
- **Guard bypass design (C2 / I1):** a `--allow-dod-gaps` flag on `--restore`, passed by `reenter-qa-after-finalise.sh` and named as the one remedy for a document-only fix. Alternative considered: a separate `--reenter` mode. Rejected: it adds a second restore path where task 124 made exactly one.

---

## 1. Template Structure Compliance

**Status:** PASS (Change Log present, frontmatter `type: task` present, `description` present; no `github_issue`, which matches the repository's convention).

`doc-links.js` on the task: exit 0. No placeholders found.

#### Optional
- `estimated_effort_hours: 16` against five phases and three scripts: within the rubric's range; no finding.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND — 2 Critical, 3 Important, 1 Optional.

### Critical

- **C1. The guard keys on a token nothing writes.** The task and plan say `--restore` refuses when the snapshot's `halt_reason` is `finalise-dod-gaps`. `git grep -n 'finalise-dod-gaps'` returns only the task's own text, a link label in `docs/reference/troubleshooting.md` and a task 201 report: no script, SKILL.md or step doc emits that value. `halt_reason` is whatever the orchestrator substitutes into `{halt_reason}` at the HALT. The re-entry script itself recognises a DoD-gaps halt by `halt_step == 7` plus a newest DoD reading `**Final Status:** ❌ GAPS` (`reenter-qa-after-finalise.sh:149`–`:165`). A guard keyed on the literal would never fire. **Fix:** key the guard on the same two facts, reading them the way the re-entry script does.
- **C2. The guard would refuse its own entry point.** `reenter-qa-after-finalise.sh:276` restores with `bash "$ADVANCE" --restore "$DOC_DIR"`. A guard that refuses `--restore` on a DoD-gaps snapshot refuses that call, so Success Criterion 2 ("the re-entry script succeeds from it") could not be met. `--restore --which` (`reenter-qa-after-finalise.sh:141`, `grant-qa-cycles.sh:190`) must also stay unguarded: it writes nothing. `grant-qa-cycles.sh:216` and `accept-qa-residual.sh:101` restore loop-limit snapshots (`halt_step` 5) and are unaffected. **Fix:** `--restore --allow-dod-gaps`, passed only by the re-entry script; the guard's refusal names the re-entry script.

### Important

- **I1. The document-only route contradicts the guard.** The `no-code-moved` refusals (`:264`–`:265`) tell the operator to "resume at step 7 with `advance-pipeline-lock.sh --restore`". After the guard, that command is refused for exactly this snapshot. **Fix:** the document-only remedy becomes `--restore --allow-dod-gaps` (one remedy, stated once); the untracked-file case keeps "commit it, then run this script again". The resume contract's reason table and the header comment at `:29` change with it.
- **I2. The HALT-site list is incomplete, and has no search beside it (check 20).** The task names the "Loop Escalation block and the DoD-gaps HALT". The snapshot-and-remove fence that writes `halted_at`/`halt_reason` lives in `skills/develop-story/SKILL.md:336`, `skills/develop-task/SKILL.md:324` and `skills/develop-bug/SKILL.md:353` (`git grep -n 'halted_at: \$ts' -- 'skills/*/SKILL.md'`); the step docs point at it. These three are hand-edited sources, not bundled copies. **Fix:** the plan lists the three sites with that search, and the replacement edits all three.
- **I3. "Both HALT paths call `--halt`" has no test that can hold it (behaviour fix in prose).** The fences are prose in SKILL.md files. **Fix:** a test extracts each SKILL.md's HALT fence and asserts it calls `advance-pipeline-lock.sh --halt`; mutation proof: revert one SKILL.md to the old `jq`/`rm` fence and the test goes red.
- **I4. The resume-prompt check (Phase 3) is prose only.** "A resume naming a finished cycle reports and stops" cannot be tested if the comparison is a paragraph. **Fix:** put the comparison in an executable script (`resume-prompt-check.sh`, reading `qa-cycle.sh`'s highest gate and the report's distinct QA Cycle numbers) and test it; add its test to the `package.json` test list (check 18: this repository's `package.json` lists suites by hand).
- **I5. `lock-present` routing is under-specified.** The bullet "`lock-present` ... does not route to step 7" does not say what the refusal at `:138` should say instead. **Fix:** the message states: a live lock at step 7 with a GAPS DoD and code moved since the gate needs `grant`-style lowering by this script after the lock is removed (`--halt`), never a step-7 resume.
- **I6. The budget-base test needs a control.** "A report holding both heading sets gives base 4" is one case. **Fix:** add a report with a single heading set (base unchanged) and one with a gate ahead of the report (max rule keeps the gate).

### Optional

- **O1.** Line anchors have drifted: `:271` is `:273` and `:262`–`:266` is `:260`–`:266`. The claims are true; the coordinates moved (obs #22).
- **O2.** Heading-count agreement with task 277's lint is asserted in Important Clarifications; add the command that shows the two heading sets (`grep -n '^### QA Cycle' <report>`) so the claim can be re-measured.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases are small, dependency-free except Phase 4, and name exact files. Phase 1 is rated High risk and is the right one to land first.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes.

- Check 9 (config keys): no new config keys.
- Check 10 (outcome reachability): `no-code-moved` with an untracked file now refuses `uncommitted-fix`, an existing reason (`reenter-qa-after-finalise.sh` header table). Reachable.
- Check 15 (removed literals): the plan changes the refusal text "resume at step 7 with advance-pipeline-lock.sh --restore". `git grep -n 'resume at step 7' -- '*.test.*' 'evals' 'tests'` is run in Phase 2 before the edit; the plan now says so.
- Check 18: no new test file except `resume-prompt-check.test.sh` (I4), which the plan now registers.
- Check 19 (reconstruction states): the re-entry's states are: lock present; snapshot absent; snapshot for another document; `halt_step` not 7; no DoD; DoD not GAPS; code moved; docs only; untracked files. All have a refusal reason already; the new tests cover the two that change.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The one High-risk area (lock scripts gate every run) names additive modes, mutation proofs and a caller audit; this review ran that audit (C2). Rollback by `git revert` is realistic.

---

## Summary of Recommendations

### Must Fix (Critical) - 2

1. Key the `--restore` guard on `halt_step == 7` plus a newest DoD reading ❌ GAPS, not on a `halt_reason` token (C1).
2. Add `--allow-dod-gaps`, passed only by `reenter-qa-after-finalise.sh`; leave `--restore --which` unguarded (C2).

### Should Fix (Important) - 6

1. One remedy for a document-only fix: `--restore --allow-dod-gaps` (I1).
2. List the three SKILL.md HALT sites with their search (I2).
3. A test that extracts the HALT fences (I3).
4. An executable resume-prompt check and its test, registered in `package.json` (I4).
5. State the `lock-present` message (I5).
6. Controls for the budget-base test (I6).

### Consider (Optional) - 2

1. Refresh the line anchors (O1).
2. Record the heading-set command (O2).

---

## Implementation Readiness Assessment

**Score:** 8/10 (after fixes)

- Template Compliance: 9/10
- Technical Accuracy: 7/10 before fixes, 9/10 after
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ✅ **READY TO IMPLEMENT** once the Step 8.5 fixes are applied.

**Justification:** The two Critical findings were plan-level contradictions that would have failed the task's own success criterion at develop; both are fixed in the document.

---

## Next Steps

Develop Phase 1 first (HALT helper, guarded restore with `--allow-dod-gaps`), running the existing `.test.sh` suites before any edit.

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline mode)
- **Review Date:** 2026-11-15
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.276.halts-and-re-entries-leave-and-read-true-state/task.276.halts-and-re-entries-leave-and-read-true-state.md
- **Architecture Docs Consulted:** none needed (shell scripts and pipeline docs read directly); pre-pass agents not dispatched
