---
id: task.117
title: "[Task 117] The card preflight passes a Success Criteria block that renders as a bold label with nothing under it — 15 of 106 task docs"
type: task
description: "card-preflight.js exits 0 with zero findings on a document whose Success Criteria card block resolves to the 14-character string **Functional** and nothing else, because summariseSection classifies a section that opens with a bold sub-heading as prose and stops at that line. Measured 2026-09-10: 15 of 106 task documents publish that block. The preflight's vocabulary is missing/empty — it cannot say 'present but useless' (#49). Separately, its clean ok: true reads as a structural all-clear when it checks three headings of eleven; task.103 reached review missing two mandatory sections (#43)."
tags: [card-preflight, jira-sync, create-task, tracker]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 4
---

# Technical Task: The card preflight passes a Success Criteria block that renders as a bold label with nothing under it — 15 of 106 task docs

**Status:** Planned

---

## 1. Overview

The authoring-time card preflight (task.102) catches a *missing* or *empty* card section. It does
not catch a section that resolves to a label with no body — which is what a board reader sees as
the same failure — and it says nothing about the eight mandatory sections it does not check.

## 2. Motivation

### Current Problems

1. **`heading-only` is not a finding.** `summariseSection` (`shared/resources/jira-sync.js`) takes a
   leading bold-only line as the section's prose and stops; the list under it never reaches the
   card. **15 of 106** task docs (task.3–15, 105, 106) publish `**Functional**` as their whole
   Success Criteria block, `omitted` 3–8 each (#49). The preflight's `empty`/`no-body` rules do not
   fire because the block is non-empty.
2. **A clean result from a narrow check reads as a clean document.** `ok: true`, zero findings, and
   task.103 reached `review-task` with ten sections of eleven (#43). The preflight is the only
   automated check at that moment.

### Benefits

1. Thin cards are caught where they are introduced, for the shape that is 14% of the corpus.
2. The preflight's success message names its scope, so authors stop hearing it as an all-clear.

## 3. Technical Background

- `shared/resources/jira-sync.js` — `summariseSection` (kind classification: prose vs list),
  `CARD_SECTIONS_BY_KIND` (defined once; all four `sync-jira-*` re-export), `checkCardSections`.
- `shared/resources/card-preflight.js` — CLI; exits 0 even with findings (advisory at authoring).
- `shared/resources/authoring-card-preflight.md` — the contract; `docs/reference/anti-patterns.md`
  §"Never fix N call sites without a population check" — which already argues the one-definition
  property for these sections.
- `countMandatorySections` exists for `review-task`'s use.

## 4. Scope

### In Scope

✅ `summariseSection`: bold-only line + following list ⇒ the list is the content
✅ `heading-only` finding kind, defined by property; corpus test with a floor (expects 15 today, 0 after)
✅ Preflight output states scope, or counts mandatory sections (decide in the plan; the second is better if authoring gaps keep reaching review)
✅ `create-task` / `create-story` / `create-epic` step 4.6 text updated to match

### Out of Scope

❌ Re-syncing the 15 cards to Jira (a consumer decision) · ❌ changing which sections are card sections

## 5. Breaking Changes

None; the preflight stays advisory at authoring. Cards synced after the change render the list.

## 6. Implementation Plan

1. Corpus test first (population form): walk `docs/tasks/*/task.*.md`, run `checkCardSections`,
   count `heading-only`; assert the count and a floor of ≥ 100 docs visited.
2. `summariseSection` fix; `heading-only` kind; re-run → 0.
3. Scope statement / mandatory-section count in the CLI output; update the three `create-*` steps.
4. Mutation: revert the summariser fix → the corpus test reds at 15.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `shared/resources/jira-sync.js`, `shared/resources/card-preflight.js` | summariser + finding kind + scope line |
| `shared/resources/tests/card-preflight-corpus.test.mjs` (new) | population check |
| `shared/resources/authoring-card-preflight.md`; `skills/create-{task,story,epic}/SKILL.md` step 4.6 | contract + prose |
| `CHANGELOG.md` | Fixed |

## 8. Testing Strategy

Unit fixtures for the summariser (bold label + list; bold label alone; prose + list); corpus test;
the four `sync-jira-*` suites unchanged and green.

## 9. Success Criteria

1. `heading-only` is a finding kind and the corpus test reports 0 after the fix (15 before, recorded)
2. `summariseSection` renders the list under a bold label
3. The preflight's clean output names its scope (or counts mandatory sections)
4. The one-definition property test still passes; bundled copies match
5. Observations #43, #49 close naming this PR

## 10. Risk Assessment

**Low.** The summariser change alters card bodies for existing synced documents on their next sync
— which is the fix, but it will show as a body diff on 15 cards; note it in the CHANGELOG.

## 11. Rollback Plan

`git revert` + bundle; the corpus test would then fail at 15, which is the honest state.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 observation review | create-task |

---

## Progress Tracking

### Phase 1: measure
- [ ] Corpus scan committed as a test: count task docs whose Success Criteria card block renders as a bold label only (expected 15 of 106 on 2026-09-10)
### Phase 2: fix
- [ ] `summariseSection` treats a leading bold-only line followed by a list as a label, not the prose
- [ ] Preflight gains a `heading-only` finding kind, defined by property (no sentence, no list item)
- [ ] Preflight's clean result states its scope ("3 card blocks resolve — not a template-completeness check"), or counts mandatory sections
### Phase 3: prove
- [ ] Corpus test goes to 0; mutation restores one instance → red

---

## References

- **Plan**: [`task.117.plan.card-preflight-heading-only.md`](task.117.plan.card-preflight-heading-only.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #43, #49
- **Canonical**: `shared/resources/jira-sync.js` (`summariseSection`, `CARD_SECTIONS_BY_KIND`, `checkCardSections`); `shared/resources/card-preflight.js`; `shared/resources/authoring-card-preflight.md`
- **Predecessor**: task.102 (the preflight)

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.117.card-preflight-heading-only/task.117.card-preflight-heading-only.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
