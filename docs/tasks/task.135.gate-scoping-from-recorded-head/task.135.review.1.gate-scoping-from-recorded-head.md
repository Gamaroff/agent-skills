# Task Review Report: Task 135 - Gate scoping from a recorded head, not a typed timestamp

**Reviewed:** 2026-09-30
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 important recommendations implemented — 2026-09-30

---

## Executive Summary

The design is sound: a gate records the commit it judged, and the next cycle's scope and the re-review trigger are derived from that commit rather than from a hand-typed timestamp. Every technical claim about the readers was verified in the tree, but the document's file list missed a parity test that pins the old guard literally, pointed one edit at a file that does not carry the sentence, and would have rewritten a 5c conformance row whose subject is the work document, not the gate. All six were fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 3 questions resolved autonomously (develop-next pipeline run — recommended/best-evidenced answer taken, recorded below)
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous pipeline run (develop-task Step 2, invoked by develop-next): no user prompt. Each question below was resolved with the best-evidenced answer.

### Question Point 1: Structure & Scope

**Q1: The `qa-gate` skill writes the same gate template (`schema: 1`, typed `updated:` — `skills/qa-gate/SKILL.md:475-480`). The task's Out of Scope says "include only if it emits the same template (grep first)". Include it?**
- **Decision**: Include. The grep condition the task set is met, and `qa-story` names `qa-gate` as an alternative gate writer ("Output 2 (or `qa-gate`)"), so a gate written there would silently stay schema 1 and force the next cycle unscoped.
- **Impact**: `skills/qa-gate/SKILL.md` template added to Phase 1 and Files Summary.

### Question Point 2: Technical & Implementation

**Q2: The plan's snippet uses `mapfile` (bash-only; zsh spelling in a comment). Both skills already carry a `while IFS= read -r` array loop that splits identically under bash and zsh (obs #76, #110). Which form?**
- **Decision**: The existing `while read` array form. One snippet that runs in both shells beats a bash snippet with a comment describing the zsh one.
- **Impact**: Phase 2 snippet instruction changed; the shared resource's snippet (today a scalar `$FILES`, already divergent from the skills) is rewritten to the same form.

**Q3: pr-conformance-prompt § D's row `updated: older than the newest artifact beside it` sits under CONSISTENCY ("the three views of the same work disagree") — its subject is the work document's `updated:`. Task.130's gate-7 finding (PC-2 of the re-check) was filed as category `trail`. Rewrite the § D row, or add a gate row?**
- **Decision**: Keep the § D document row unchanged; add a gate row under the trail section comparing each gate's `updated:` to its `head:` author time.
- **Impact**: Phase 3's 5c bullet rewritten; no existing check is removed.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; frontmatter carries `type: task`, `description`, `tags`, `github_issue: 444`; body link `[#444](…/issues/444)` matches.
- Card preflight: `No problems found. 3 card blocks resolve` (Breaking Changes `+5 more`).
- `doc-links.js`: 1 relative link resolves.
- Sign-off: not enabled in `skills-config.yaml` — not checked. Change Log present; a review row is appended by this review.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (0 hallucinations)

Verified: `qa-task` Phase 0 step 3 (`GATE_DATE`/`DOC_DATE`/`CODE_MOVED`, `skills/qa-task/SKILL.md:185-190`); both Step 3b blocks (`qa-task:390-409`, `qa-story:898-917`); shared snippet (`qa-re-review-scope.md:175-183`) and table row (`:28`); gate templates (`qa-task:876-882`, `qa-story:1618-1624`); corpus = 466 gates, all `schema: 1`, none `schema: 2`; CI `test.yml` checks out with `fetch-depth: 0` (so `cat-file -e` / `merge-base` on old heads resolve in CI); `shared/resources/tests/*.test.mjs` is already in `npm test`. Released shape (check 12): at `v0.52.0` the gate template is `schema: 1` with no `head:` — the task's legacy rule ("no head ⇒ unscoped / re-review") covers exactly that shape. Invariant (check 11): `Date.parse` on a `%aI` offset timestamp compares correctly against a `Z` stamp (`command node -e 'console.log(Date.parse("2026-09-20T13:12:00+02:00") <= Date.parse("2026-09-20T11:20:00Z"))'` → `true`).

#### Important
- **I1 — parity test not in scope.** `evals/shared/tests/qa-re-review-scope-parity.test.mjs:187` asserts the literal guard `if [ "$PRIOR_GATES" -ge 2 ] && [ -n "$LAST_GATE_DATE" ] && …` in both skills, and `:240` requires the text `Re-review scope: since`. Both go red under the new snippet. Added to Files Summary and Phase 2.
- **I2 — `mapfile` vs the existing both-shell array loop**, and the shared snippet already diverges from the skills (scalar `$FILES`). Resolved per Q2.
- **I3 — the 5c § D row's subject is the document, not the gate.** Resolved per Q3.
- **I4 — `qa-story` has no clock-based Phase 0 trigger.** Its step 3 keys on gate status and issue count only; the `GATE_DATE`/`CODE_MOVED` block exists in `qa-task` alone. The document said "both skills' … Phase 0". Scoped to `qa-task`; `qa-story`'s missing freshness trigger is noted as out of scope.
- **I5 — the step-5-6 sentence does not exist there.** `grep -n 'updated:' shared/resources/develop-pipeline-step-5-6-qa-loop.md` has no hit on a gate date; the sentence "files changed since the last gate's `updated:` date" is the Step 3b lead-in of `qa-task:381` and `qa-story:889`. Files Summary item 5 retargeted.
- **I6 — recording lines use the date.** `Re-review scope: since {LAST_GATE_DATE}` at `qa-task:1016`, `qa-story:331`, and the example at `qa-re-review-scope.md:222`. Added to Phase 2.

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes). Three phases, each with files and checkboxes; Phase 2 is the only medium-risk one and has its own executed test.

## 4. Consistency & Completeness

#### Optional
- **O1 — the empty-file-list HALT is near-unreachable.** The gate and QA report land in a commit after `head:`, so `git diff --name-only <head>..HEAD` always lists at least them. Kept (harmless); a "no code change" cycle is already a HALT in the develop pipeline's qa-fix step.
- **O2 — eval replay fixtures need no change.** Every replay gate under `evals/develop-task/step-isolation/*/replay/` is `schema: 1` and stays valid; re-record only where an assertion reads the template.
- **O3 — schema-1 PASS gate now always re-reviews in `qa-task` Phase 0** (no head ⇒ `CODE_MOVED=1`). Fails toward re-review by design; one extra review for consumers holding pre-upgrade PASS gates.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Rebase-orphaned head HALT has a named remedy; partial rollbacks per phase are stated. Shallow-clone risk checked: CI uses `fetch-depth: 0`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 6 (all applied)
1. Add `qa-re-review-scope-parity.test.mjs` to scope (I1)
2. Use the both-shell `while read` array form; rewrite the shared snippet to it (I2)
3. Keep the § D document row; add a gate trail row (I3)
4. Phase 0 trigger change is `qa-task` only (I4)
5. Retarget the "since the last gate's `updated:`" sentence edit to the two Step 3b lead-ins (I5)
6. Update the three `Re-review scope: since …` recording lines (I6)
7. Include `qa-gate`'s template (Q1)

### Consider (Optional) - 3
O1–O3 above — recorded, no change required.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the six important gaps were file-list and targeting errors, all corrected in the document.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, develop-next → develop-task Step 2)
- **Review Date:** 2026-09-30
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.135.gate-scoping-from-recorded-head/task.135.gate-scoping-from-recorded-head.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load)
- **Pre-pass:** Agents B and C not dispatched — both passes performed inline by the reviewer (independence lost; recorded per develop-pipeline-autonomous-defaults § Subagents)
