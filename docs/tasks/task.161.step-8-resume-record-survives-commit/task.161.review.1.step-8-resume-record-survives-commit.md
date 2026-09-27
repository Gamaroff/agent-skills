# Task Review Report: Task 161 - Step 8 keeps its resume record until the Completion Checklist passes

**Reviewed:** 2026-09-27
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 important recommendations implemented — 2026-09-27

---

## Executive Summary

The task's core claims hold against the tree: the `commit-changes)` arm removes the lock at `current_step` ≥ 8 (`shared/resources/advance-pipeline-lock.sh`), Cleanup ends with `rm -f` on the lock, check 1 asserts it absent, and the detector's `LOCK_STEP + 1` can name step 9. Five gaps are about **population**: restatements and tests the scope did not name, and one of them turns the Stop hook's step-8 prompt into a way past the checklist.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0. Run inside `/develop-task` Step 2, so the decisions below were taken autonomously per the pipeline defaults and are recorded here.
**Implementation Readiness:** 8/10 after fixes
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were asked (pipeline mode). Autonomous decisions:

- **D1 — Stop-hook step-8 reason is in scope.** The alternative (leave the hook text alone) keeps a prompt that tells an orchestrator to `--complete` once `/commit-changes` returns, which skips the checklist the task exists to protect. The fix is one line plus a test.
- **D2 — `develop-pipeline-hooks.md` drift is fixed here.** It is pre-existing, but the task's Benefit 3 rests on the hook guarding step 8, and the reference says it does not.

Pre-pass agents B and C were **not dispatched**; both passes ran inline. The review therefore had no independent reader.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Progress Tracking, References and a Change Log are present. OKF `type: task` and `description` are set. No placeholders. Card preflight: 3 blocks resolve (`+N more` on Summary 7, Success Criteria 8, Breaking Changes 5). `doc-links.js`: 1 relative link resolves. Tracker: #500 is OPEN; the board Priority field was set to P2 by the self-heal. Sign-off is not configured. The Change Log is current for `planned`.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND. No hallucinations.

Verified:

- `advance-pipeline-lock.sh` `commit-changes)` arm: `if [ "$CUR" -ge 8 ]; then rm -f "$LOCK"`, as stated.
- Step 8 doc: Cleanup's final `rm -f .claude/state/develop-pipeline.lock`, check 1, and the "What the record covers" / "What it does not cover" paragraphs all exist as described.
- Detector: line `recommended_step = LOCK_STEP + 1` and the schema's `(1–8)`. The "no `Subagent summary ref` column" table row **also** yields `LOCK_STEP + 1`. Success criterion "no row of its summary table can yield 9" already covers it.
- Resume contract Phase 0b carries both the step-9 aside and the post-commit-gap sentence.
- The PreCompact hook fires at every step, including 8, so the task's "Important Clarifications" holds.

#### Important

- **I-1 — The Stop hook's step-8 prompt names the wrong completion condition.** `develop-pipeline-on-stop.sh` blocks at `current_step` 8 (it uses `-gt 8`, deliberately) and tells the orchestrator: "Only once commit-changes has actually completed: mark Step 8 ✅ … and advance the lock … (or `--complete` if that was Step 8)". Once the lock outlives the commit, an orchestrator that yields during the push or the checklist gets told to run `--complete` as soon as `/commit-changes` returns. Followed literally, that removes the lock without checks 2–5, which is the bypass this task exists to close. **Fix:** at step 8, the hook's completion line names the Completion Checklist: "Only once Step 8's Completion Checklist has passed: `--complete`". Add a case to `develop-pipeline-on-stop.test.sh`.
- **I-2 — `develop-pipeline-hooks.md` documents the Stop hook as inert at step 8.** It gives the trigger condition as `current_step` in `[1, 7]` and lists `current_step >= 8` as an escape valve. The script does the opposite (`-gt 8`, with a comment explaining why `-ge 8` was wrong). Benefit 3 depends on the script's behaviour. **Fix:** correct both lines and bring the file into scope.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

#### Important

- **I-3 — Existing tests pin the behaviour this task removes, and the plan says "add".**
  - `advance-pipeline-lock.test.sh` Scenario 4 asserts "terminal commit-changes at step 8 removes lock". Phase 2 says "add a case". It has to **invert** Scenario 4, or the suite contradicts itself.
  - `step-8-completion-checklist.test.mjs` test "the step document names the resume record, not the row or git, as Step 8's evidence" asserts `/What it does not cover \(a known gap, older than this rule\)/` and `/A HALT whose report fails lint skips that commit/`. Phase 1 deletes both sentences.
  - The plan names the executed test at "[sh] the Step 8 commit ends the record and Cleanup removes this run's snapshot" as needing inversion. The two above are not named.
  - **Fix:** list all three in Phase 1/2 as updated, not added.
- **I-4 — A fourth orchestrator restatement is missing from scope.** Each of `skills/develop-{task,story,bug}/SKILL.md` has "For Step 8 → completion: `... advance-pipeline-lock.sh --complete` (removes the lock)" in the "Lock file `current_step` update" paragraph. That is separate from the Step Transition Protocol's action 1, which the plan does name. Leaving it tells the orchestrator to `--complete` after Step 8 **returns**, which is a harmless no-op only once Step 8's own checklist has run it. **Fix:** rewrite it alongside action 1 and add it to the Phase 1 checklist.
- **I-5 — The enumerating test covers Pipeline Progress lines only, and I-4 is the same class.** The CR-1 test enumerates "update the Pipeline Progress" instructions. The `--complete` restatements are the other population (the orchestrator's post-Step-8 actions). **Fix:** extend the Phase 3 test, or add a sibling, so that every orchestrator instruction naming `--complete` after Step 8 says Step 8 already ran it. Floor: 3 files × 2 sites.

---

## 4. Consistency & Completeness

**Status:** MINOR ISSUES

#### Optional

- **O-1 — Where the population check is recorded.** The task says "record, in the plan"; the plan says "in the task's implementation report". Use the implementation report, because it is the run's audit trail.
- **O-2 — The known-readers list is shorter than the grep.** `grep -rln develop-pipeline.lock skills/*/SKILL.md skills/*/scripts shared/resources` also hits `develop`, `finalise`, `create-pr`, `create-branch`, `review-story`, `develop-bug` and `review-pipeline-step-0a-branch-setup.md`. They are cooperation callers, not presence readers. The Phase 1 check will classify them, so this is informational only.

Scope (4 phases, about 11 files) fits one task, so no split is needed.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The risks are named and the rollback is concrete. I-1 is the one risk the task did not list, and the fix above closes it.

---

## Summary of Recommendations

### Should Fix (Important) - 5 issues

1. The Stop hook's step-8 completion line names the Completion Checklist, and it gets a test (I-1, per D1)
2. Correct `develop-pipeline-hooks.md`'s step-8 trigger condition and escape valve (I-2, per D2)
3. Invert or update the three tests that pin the old lifetime (I-3)
4. Add the "For Step 8 → completion" restatements to scope (I-4)
5. Enumerate the `--complete` restatements as well as the Pipeline Progress lines (I-5)

### Consider (Optional) - 2 items

1. Record the population check in the implementation report (O-1)
2. Treat the extra grep hits as cooperation callers (O-2)

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ **READY TO IMPLEMENT** once the Important fixes are folded into the task. They were applied in Step 8.5.

---

## Review Metadata

- **Reviewer:** review-task (inside /develop-task Step 2)
- **Review Date:** 2026-09-27
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.161.step-8-resume-record-survives-commit/task.161.step-8-resume-record-survives-commit.md
- **Sources checked:** `advance-pipeline-lock.sh` and its test, `develop-pipeline-step-8-commit.md`, `develop-pipeline-on-stop.sh`, `develop-pipeline-on-precompact.sh`, `develop-pipeline-hooks.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-resume-contract.md`, `step-8-completion-checklist.test.mjs`, and `skills/develop-{task,story,bug}/SKILL.md`
