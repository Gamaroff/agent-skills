# Task Review Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Reviewed:** 2026-09-21
**Review Depth:** Standard
**Task Status:** Planned (pre-review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-09-21

---

## Executive Summary

The task is well-grounded: every defect it names was verified against the code — `tracker-issue.js`'s `gh()` runs with `stdio: ["ignore","pipe","ignore"]` (stderr genuinely dropped), `ensure-bug-github-issue` Step B5 passes `priority:${PRIORITY}` / `severity:${SEVERITY}` verbatim to a repo whose labels are lowercase `priority:*` only, `develop-bug` Step 7 line 28 carries the "cannot process … fall back" paragraph, and `qa-fix` derives `FIX_CYCLE` from `qa-cycle.sh` in two blocks with no override. Three phases are independent and each has a named mutation proof. The only defects in the document are two wrong source paths and one change already present in the code.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 2 questions (auto-answered — autonomous pipeline run)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside `/develop-task` dispatched by `/develop-next` (autonomous). Each question point was resolved with the recommended option and is recorded here so the decision is auditable.

### Question Point 1: Structure & Scope

**Q1: The task cites `shared/resources/develop-bug-step-7-close-bug.md` and `shared/resources/develop-bug-step-5-6-verify-loop.md`, but neither exists — the develop-bug step docs live only at `skills/develop-bug/references/develop-bug-step-*.md` and are not bundled from `shared/`. Correct the paths, or move the docs to `shared/`?**
- **User Decision (auto)**: Correct the paths to `skills/develop-bug/references/…` — the docs have a single consumer and moving them is out of scope.
- **Impact**: §1 Scope, §6 Phase 1 and Phase 3 Files, §7 Files Summary rows 2 and 5 updated.

### Question Point 2: Technical & Implementation

**Q2: Phase 2 lists "Severity into the body Metadata table" as a change, but Step B5's issue body already renders `| Severity | ${SEVERITY} |` in its Metadata table (SKILL.md ~line 130). Keep the item as a change, or mark it as already satisfied?**
- **User Decision (auto)**: Mark it as already present — the change is "retain it; severity stops being a label and the table becomes its only carrier".
- **Impact**: Phase 2 checkbox reworded; Target Architecture line unchanged (it describes the end state, which holds).

### Question Point 3: Completeness & Safety

No questions — pre-pass C found no other portion already implemented, and the testing/rollback sections cover all three phases.

---

## 1. Template Structure Compliance

**Status:** PASS

### Issues

#### Critical
- None

#### Important
- None

#### Optional
- Progress Tracking uses `[N]` placeholders for the QA/gate filenames — template convention, not a gap.

### Notes
- All 11 mandatory sections present; filename `task.125.develop-bug-finalise-mode-and-issue-create.md` conforms.
- OKF: `type: task`, `description`, `tags` list all present.
- Change Log present and current (two rows; status `planned`).
- Sign-off: `sign-off.enabled` absent → not checked.
- Tracker: `github_issue: 425` (OPEN); body link `[#425](…/issues/425)` matches; board Priority self-healed to P2.
- Card preflight: 3 card blocks resolve (Summary +1 more, Success Criteria +3 more, Breaking Changes).

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

### Issues

#### Critical (Hallucinations)
- None

#### Important
- **Wrong source paths for the develop-bug step docs**: `shared/resources/develop-bug-step-7-close-bug.md` and `shared/resources/develop-bug-step-5-6-verify-loop.md` do not exist.
  - **Location:** §1 Scope; §6 Phase 1 Files, Phase 3 Files; §7 rows 2, 5
  - **Evidence:** `git ls-files shared/resources | grep develop-bug` → empty; the files are at `skills/develop-bug/references/` with no AUTO-GENERATED header.
  - **Recommendation:** Correct the four citations. _Per Q1_

#### Optional
- **`tracker-issue.js` fix location**: the stderr drop is `GIT_EXEC_OPTS.stdio = ["ignore","pipe","ignore"]` (line 77) shared by every `gh()` call (line 298), and the catch at line 1311 formats `e.message` only. The fix is to pipe stderr and surface the first non-empty line of `e.stderr` in that one catch — one edit covers "all kinds", as §4 asks. The test harness already injects `execImpl`, so a fake that throws with `.stderr` set is the natural test.
- **Sibling label mapping is smaller than "a mapping"**: `ensure-task-github-issue` only lowercases `priority` (its doc line 32) and carries no severity label at all. The existence check via `gh label list` is new to this task, not reused.

### Verified claims
- `develop-bug-step-7-close-bug.md:28` — the fallback paragraph exists verbatim; line 97 checklist echoes it.
- `qa-fix/SKILL.md:836` and `:939` — the two `FIX_CYCLE=$(bash … qa-cycle.sh "$DOC_DIR")` blocks; `qa-cycle.sh` refuses (exit 1, empty stdout) on a gate-less directory.
- `tests/qa-cycle.test.js:241` — "every fenced block that passes a cycle-scoped stage derives the cycle in that block" is the guard Phase 3 must keep green.
- `status-history.js` exists beside `change-log.js`.
- `finalise/SKILL.md` has no `--bug` handling today (0 matches for `--bug`/`bug mode`).
- bug.13 / bug.14 DoD files share the shape: Step 1 QA Report Review (none — no gate) → Step 2 Fix Evidence (expected behaviour, regression test fails-without/passes-with, bundled copies, suite+lint, Documentation) → Step 3 Security → Step 4 Compliance → Step 4b Docs & Changelog → Step 5 Acceptance Decision → Verification Complete.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

### Issues

#### Critical
- None

#### Important
- **Phase 2 lists an already-present change** ("Severity into the body Metadata table"). _Per Q2_ — reworded to "retained".

#### Optional
- Phase 1 could name where in `finalise` the mode branches (Step 1 document read; Step 2 QA reports; Steps 3–5 parallel checks; Step 7 accepted/CL/sprint-review/registry-tick) so the skip list maps to headings the mode test will assert against. Not blocking — the developer will find them.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Target Architecture, Scope, Phases, Files Summary, Testing and Success Criteria agree with each other (after the path fix).
- Testing covers each phase with a unit test and a mutation proof; the contract test (finalise reads `document-change-log.md` §Exclusions rather than restating it) is the right anti-enumeration shape.
- Scope: 3 phases, ~9h, one developer — not a split candidate.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Risks proportionate (no schema, no API); mitigation for mode drift is the SKILL.md-heading-anchored test.
- Rollback per phase is a `git revert` + `npm run bundle`; triggers named.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues

1. Correct the two `shared/resources/develop-bug-step-*` paths to `skills/develop-bug/references/…` (4 citations). — _Q1_ ✅
2. Reword the Phase 2 "Severity into the body Metadata table" item as already present / retained. — _Q2_ ✅

### Consider (Optional) - 3 items

1. Anchor the `tracker-issue.js` fix at `GIT_EXEC_OPTS` (line 77) + the catch at line 1311. ✅ (added to Phase 2 Changes)
2. Note that the sibling mapping is "lowercase priority" only; the existence check is new.
3. Name finalise's branching points in Phase 1.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every named defect reproduces in the code at the cited location; the two Important findings were documentation errors, fixed in this pass.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Follow the three phases in order (independent — order is convenience)
2. Run `npm run bundle` after editing `shared/resources/tracker-issue.js` and the `qa-fix` skill
3. Prove each mutation named in §6 before marking the phase done

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous via develop-task/develop-next)
- **Review Date:** 2026-09-21
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.125.develop-bug-finalise-mode-and-issue-create/task.125.develop-bug-finalise-mode-and-issue-create.md
- **Architecture Docs Consulted:** docs/architecture/concepts/source-tree.md (skill/shared layout); skills/finalise/SKILL.md; skills/ensure-bug-github-issue/SKILL.md; skills/ensure-task-github-issue/SKILL.md; shared/resources/tracker-issue.js; skills/qa-fix/SKILL.md; shared/resources/qa-cycle.sh; tests/qa-cycle.test.js; skills/develop-bug/references/develop-bug-step-{5-6,7}-*.md; docs/bugs/bug.13, bug.14 DoD files
- **Pre-pass:** performed inline by the orchestrator (no Explore subagents dispatched — independence loss recorded)
