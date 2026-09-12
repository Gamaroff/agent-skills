# Task Review Report: Task 114 - mutation-proving.md documents the false green and the false red, and none of the other seven things a mutation run can tell you

**Reviewed:** 2026-09-12
**Review Depth:** Standard
**Task Status:** Planned (pre-review) → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-09-12

---

## Executive Summary

A well-scoped documentation task with a clear deliverable (one outcomes table, a rule per row, consumers pointed at it without a count) and a co-located plan. Every claim was checked against the live tree: the architecture pre-pass returned `aligned`, and the codebase pre-pass confirmed nothing is implemented yet (no outcomes table, no seventh shape, no parity test, three consumers still say "four shapes"). The defects found are all in the task's *description of the target*, not in its scope: a wrong bundle count, and a "lint over the doc" that does not exist — the real mechanical guard is the bundled-copy parity test.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (pipeline run — no ambiguity required a decision; every finding was verifiable against the tree)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` under `/develop-next` (autonomous). Question points 1–3 collected no questions: each candidate question resolved to a fact checkable in the repository, and was checked instead of asked.

- Output format: Comprehensive report (pipeline auto-answer).
- Tracker linkage: no `github_issue` → **Sync to GitHub** (recommended option, auto-answered). Dedup search for `[Task 114]` returned zero matches; issue **#399** created, added to board 'Agent Skills' (Priority P1), milestone "Technical Tasks (standalone)". Estimate field absent on the board — skipped.
- Step 8.5: apply all critical + important fixes (pipeline auto-answer).
- Step 9: promote (pipeline auto-answer; `sign-off` and `change-log` enforcement both at defaults, no gate withheld).

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections present; Change Log, Progress Tracking and References present; frontmatter carries `type: task`, `description`, `tags`, `updated`. No placeholders. Filename `task.114.mutation-proving-outcomes.md` conforms. Card preflight (`sync-jira-task.js --check-card`): `ok: true` — Summary 536 chars, Success Criteria 4 (0 omitted), Breaking Changes present.

### Issues

#### Important
- **Missing tracker linkage** — no `github_issue:` in frontmatter. → Resolved during review: issue #399 created and linked (frontmatter + body link).

#### Optional
- None.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (the "doc's own lint")

### Issues

#### Important
- **Bundle count wrong** — §3 says "Bundled into five skills"; the source is bundled into **six** (`develop`, `double-check`, `finalise`, `qa-story`, `qa-task`, `review-security`). The References line listed five and omitted `double-check`.
  - **Location:** §3 Technical Background; References.
  - **Recommendation:** State six and name them. _Applied._
- **"Its own lint (`mutation-proving.md:191` anticipates a seventh shape)"** — line 191 is inside the false-RED section; the seventh-shape sentence is at ≈299. More importantly the "lint" is `tests/relationship-assertion-lint.test.js`, which checks shape 6 **in test files** and never reads `mutation-proving.md`. No test, lint or script greps any of the doc's headings (every hit under `tests/`, `evals/`, `shared/resources/tests/`, `skills/*/tests/`, `scripts/` is a comment or README prose). The real mechanical guard is `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (`BUNDLED_REFS`), which asserts bundled copies match the source byte-for-byte.
  - **Location:** §3; §6 step 2; §8; §10; Progress Tracking Phase 4 ("the doc's own lint updated").
  - **Recommendation:** Replace the phantom lint with the actual guard and record that headings are free to rename. _Applied in all five places._

#### Optional
- **Consumer line refs drifted** — `develop:≈653` is 656, `qa-task:≈430` is 474 (`qa-story:≈373` is correct). Step 3c anchors (`qa-task` ≈470, `qa-story` ≈382) were absent. _Applied._

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with named files and a checkable outcome; the plan file orders the table rows by how a reviewer meets them, which is the substantive design decision and it is made. Dependencies are implicit but linear (doc → consumers → bundle → test), which is adequate for a documentation task.

#### Optional
- **Files Summary omitted the bundled copies** — six `skills/*/references/mutation-proving.md` files change on `npm run bundle` and will appear in the PR diff. _Row added, marked "regenerated, never hand-edited"._
- **Effort estimate** — `estimated_effort_hours: 6` vs rubric 2h (base 2 +1 AC −1 documentation; 4 criteria, 4 plan steps, 5–6 files, low risk). >2× divergence. Observed, not changed: the rubric does not weigh reading twelve observations and reconciling their rules, which is where this task's time goes.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

- Overview ↔ Implementation Plan ↔ Files Summary agree on the deliverable.
- Success criteria 1–3 are verifiable against the tree; criterion 4 (observations close naming the PR) is an operator action via `observation-log.js set-status` and is verifiable from the log.
- Testing Strategy previously claimed "existing lint over the doc still green" — no such lint; rewritten to name the bundled-copy parity guard, the mutation proof of the new parity test, and `npm run bundle -- --check`.
- Scope is right-sized: one document, three consumer pointers, one test. Not a split candidate.
- The memory-file item (§4, `feedback_mutation_prove_every_fix`) is user-owned and correctly scoped as "note in the PR for the user to apply".

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (after fixes)

Risk was stated as "the doc's own lint and any test that greps its headings" — neither exists. Rewritten to the real trap: editing the source without `npm run bundle` goes red in CI, and editing a `references/` copy is silently reverted by the next bundle. Rollback (`git revert` + `npm run bundle`) is correct.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues — all applied

1. Link a tracker issue → #399 created and written back.
2. Bundle count five → six, naming the skills (§3, References).
3. Replace the phantom "doc's own lint" with the bundled-copy parity guard; state that no test greps the headings (§3, §6.2, §8, §10, Progress Tracking Phase 4).

### Consider (Optional) - 3 items — 2 applied, 1 observed

1. Consumer line refs corrected; Step 3c anchors added.
2. Bundled copies row added to Files Summary.
3. Effort estimate divergence (6h vs rubric 2h) — left as authored.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10 (tracker linkage missing at start; fixed)
- Technical Accuracy: 8/10 (phantom lint + wrong bundle count; fixed)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every defect was in the task's description of the target, all were verifiable and all are corrected; the deliverable itself is unambiguous and the plan file already fixes the one design decision (row ordering).

---

## Next Steps

Task is ready for implementation. Developer should:

1. Follow the plan phase by phase (table → instrument rules → consumers → bundle + parity test).
2. Run `npm run bundle` after every source edit; never touch `skills/*/references/mutation-proving.md` by hand.
3. Mutation-prove the parity test by restoring "four shapes" in one consumer and confirming red.
4. Note the user-owned memory-file clause in the PR body.

---

## Review Metadata

- **Reviewer:** Claude (review-task, via develop-task pipeline / develop-next)
- **Review Date:** 2026-09-12
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.114.mutation-proving-outcomes/task.114.mutation-proving-outcomes.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md (pre-pass Agent B: aligned)
- **Codebase pre-pass (Agent C):** not-implemented; headings of `shared/resources/mutation-proving.md` enumerated; no heading grep found in any test
- **Review Duration:** ~10 minutes
