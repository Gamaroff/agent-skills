# Task Review Report: Task 117 - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it — 15 of 106 task docs

**Reviewed:** 2026-09-17
**Review Depth:** Standard
**Task Status:** Planned (pre-review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-09-17

---

## Executive Summary

The task is well-scoped, its central claim is reproducible (the corpus measurement was re-run during
this review: **15 of 120** task documents publish a label-only Success Criteria block — the count is
unchanged since the 2026-09-10 measurement, the corpus has grown from 106), and every file it names
exists where it says. Two things needed correcting before development: the task had no linked tracker
issue, and the Files Summary cited a step number (`4.6`) that is correct for `create-task` only. One
design choice the task deliberately left open — scope statement vs mandatory-section count — was
resolved here in favour of the scope statement.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 3 questions (auto-answered — autonomous pipeline run via `/develop-next`)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

**IMPORTANT**: This review ran inside `/develop-task` (dispatched by `/develop-next`). Every
question below was auto-answered with the recommended option per the pipeline's autonomous
defaults, and logged in the implementation report's Decisions Log.

### Question Point 1: Structure & Scope

**Q1: This task has no linked GitHub issue. Create and link one now?**
- **User Decision**: Sync to GitHub (recommended; precedent tasks 110–115)
- **Impact**: Dedup search for `[Task 117]` returned 0 matches → issue #415 created, added to the
  "Agent Skills" board, Priority P2. `github_issue: 415` and the body link written. The board has no
  `Estimate` field, so `estimated_effort_hours` was not mirrored (non-blocking, same as prior tasks).

### Question Point 2: Technical & Implementation

**Q2: §4/§6 leave open whether the preflight's clean output should state its scope or count the
mandatory sections. Which?**
- **User Decision**: Scope statement (recommended)
- **Impact**: `countMandatorySections` lives in `skills/create-task/scripts/lib.js` (task-only,
  keyed on the eleven numbered `## N.` headings). The preflight is kind-agnostic (task/story/epic/bug)
  and lives in `shared/resources/`; a count would need either a `shared → skill` dependency or a
  second copy of the heading list — the enumeration trap in `docs/reference/anti-patterns.md`. A
  scope statement needs neither and answers the actual defect (#43: a clean result read as an
  all-clear). §6 step 3 and §9 criterion 3 now say so.

**Q3: The plan's Phase 2 skips *one* leading bold label before a list. The 15 affected documents carry
several (`**Functional**:` … `**Code Quality**:`). Drop only the first, or all bold-only label lines?**
- **User Decision**: All — treat a bold-only line on its own paragraph exactly as `dropHeadingLines`
  treats `###` (recommended)
- **Impact**: One mechanism, one rationale, already in the file. Dropping only the first label would
  leave the second label inside the list text on the card. Recorded in §6 step 2.

### Question Point 3: Completeness & Safety

No questions — testing, rollback and risk sections are adequate for a low-risk change (see §4–5).

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (fixed)

### Issues

#### Critical
- None.

#### Important
- **No tracker issue linkage** — frontmatter had no `github_issue:`. **Fixed:** issue #415 created and
  linked (Q1).

#### Optional
- None. All eleven numbered sections present; `type`, `description`, `tags` present (OKF); Change Log
  present and current; no placeholders; filename convention correct.

### Card preflight

`sync-jira-task.js --check-card` on this document: **ok** — Summary (prose, 287 chars), Success
Criteria (list, 355 chars, 0 omitted), Breaking Changes (prose, 95 chars). Nothing omitted.

### Recommendations (Based on User Decisions)

1. **Link the GitHub issue** — _done, per Q1_.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Every symbol and path named in §3 and §7 was verified against the tree:
`summariseSection` (`shared/resources/jira-sync.js:1324`), `checkCardSections` (`:1658`),
`CARD_SECTIONS_BY_KIND` (`:1564`), `dropHeadingLines`, `shared/resources/card-preflight.js`,
`shared/resources/authoring-card-preflight.md`, `docs/reference/anti-patterns.md`. The defect
reproduces as described: `summariseSection("**Functional**:\n\n- a\n- b")` returns
`{ kind: "prose", text: "**Functional**:", omitted: 1 }`.

### Issues

#### Critical (Hallucinations)
- None.

#### Important
- **Wrong step reference**: §7 Files Summary said `skills/create-{task,story,epic}/SKILL.md step 4.6`.
  Only `create-task` numbers it 4.6; `create-story` has it at §6.2a and `create-epic` under an
  unnumbered `## Card Preflight (offline, advisory)` heading. **Fixed** in §4 and §7.

#### Optional
- `countMandatorySections` is described in §3 as existing "for `review-task`'s use"; it is actually
  in `skills/create-task/scripts/lib.js:122` and not consumed by any review skill. **Fixed** — §3 now
  names the real location, which is also what decided Q2.

### Recommendations (Based on User Decisions)

1. **Correct the three step references** — _done_.
2. **Name where `countMandatorySections` lives** — _done, and it grounds Q2_.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four steps, each naming its file and its proof. The population-form ordering (corpus test first,
then the fix, then the mutation check) matches `feedback_mutation_prove_every_fix` and the shape of
`jira-sync-card-summary.test.mjs` test H, which already walks the task corpus with a floor.

### Issues

#### Critical
- None.

#### Important
- None.

#### Optional
- `estimated_effort_hours: 4` — rubric check: 5 criteria, 4 plan steps, low risk → ~4h. Consistent.

### Recommendations (Based on User Decisions)

1. **Drop every bold-only label line, not just the first** — _recorded in §6 step 2, per Q3_.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- §1 Overview ↔ §6 plan ↔ §9 criteria map one-to-one (label-only → criterion 2; finding kind and
  corpus 15→0 → criterion 1; scope line → criterion 3; one-definition + bundle parity → criterion 4).
- §8 Testing names the four `sync-jira-*` suites as a regression guard, which is right: the
  summariser is on the sync path, not only the preflight path.
- Criterion 5 (observations #43/#49 closed naming the PR) is an observation-log action, executable
  once the PR number exists (Step 4 or later).
- Scope/complexity: 3 phases, one shared module plus prose in three skills — one task, no split.

### Issues

- **Optional**: "15 of 106" in the title and description is a dated measurement; the corpus is 120
  today. Left as-is — the title is the observation's own figure, and the corpus test's floor (≥100)
  is what carries the requirement, not the headline number.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low risk, correctly stated: the only behavioural change on the sync path is that 15 existing cards
gain their criteria list on next sync (a body diff, which §10 says to note in the CHANGELOG). The
rollback (`git revert` + bundle) is complete and honest — it names the test that would go red.

### Issues

- None.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues

1. Link a GitHub issue — **done** (#415).
2. Correct the `create-*` step references in §7 — **done**.

### Consider (Optional) - 2 items

1. Name `countMandatorySections`' real location — **done**.
2. Headline "15 of 106" is dated (corpus 120) — left; the test floor carries the requirement.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10 (tracker link was missing; fixed)
- Technical Accuracy: 9/10 (one wrong step reference; fixed)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 10/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Reproducible defect, verified paths, a plan whose first step is the measurement
that proves the last, and the one open design choice resolved without adding an enumeration.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Follow §6 in order — corpus test first, record 15, then the summariser fix and `heading-only` kind
2. Add the scope line to the CLI's clean output and update the three `create-*` prose sites
3. `npm run bundle` and confirm the bundled-copy parity test stays green
4. Revert the summariser fix once to confirm the corpus test reds at 15, then restore it

---

## Pre-pass summaries

**Agent B (architecture alignment)** — dispatched 06:38 → returned 06:39:
```yaml
alignment: aligned
findings:
  - area: pattern
    severity: low
    note: New `.test.mjs` under shared/resources/tests matches repo practice, not coding-standards `*.test.js` wording
```

**Agent C (already-implemented scan)** — dispatched 06:38 → returned 06:39:
```yaml
implementation_status: not-implemented
findings:
  - symbol: summariseSection
    found_at: shared/resources/jira-sync.js:1324
    note: Exists; bold-only lead line still classified as prose, list under it dropped
  - symbol: heading-only finding kind
    found_at: not found
    note: Only "missing"/"empty"/"no-body" codes exist in checkCardSections (jira-sync.js:1658)
  - symbol: shared/resources/tests/card-preflight-corpus.test.mjs
    found_at: not found
    note: Only card-preflight.test.mjs exists; no corpus population test
  - symbol: card-preflight CLI scope statement / mandatory-section count
    found_at: shared/resources/card-preflight.js:157-176
    note: Clean output prints "No problems found." with no scope statement or section count
  - symbol: countMandatorySections
    found_at: skills/create-task/scripts/lib.js:122
    note: Exists in create-task lib only; not wired into card-preflight output
```

---

## Review Metadata

- **Reviewer:** Claude (review-task, inside /develop-task pipeline run 1)
- **Review Date:** 2026-09-17
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.117.card-preflight-heading-only/task.117.card-preflight-heading-only.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/source-tree.md (via pre-pass Agent B)
- **Corpus measurement:** `checkCardSections` over 120 `docs/tasks/*/task.N.name.md` → 15 label-only Success Criteria blocks (task.3–15, 105, 106)
