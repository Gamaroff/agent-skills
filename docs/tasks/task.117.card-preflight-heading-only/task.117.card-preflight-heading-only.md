---
id: task.117
title: "[Task 117] The card preflight passes a Success Criteria block that renders as a bold label with nothing under it — 15 of 106 task docs"
type: task
description: "card-preflight.js exits 0 with zero findings on a document whose Success Criteria card block resolves to the 14-character string **Functional** and nothing else, because summariseSection classifies a section that opens with a bold sub-heading as prose and stops at that line. Measured 2026-09-10: 15 of 106 task documents publish that block. The preflight's vocabulary is missing/empty — it cannot say 'present but useless' (#49). Separately, its clean ok: true reads as a structural all-clear when it checks three headings of eleven; task.103 reached review missing two mandatory sections (#43)."
tags: [card-preflight, jira-sync, create-task, tracker]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-17
assignee:
estimated_effort_hours: 4
github_issue: 415
---

# Technical Task: The card preflight passes a Success Criteria block that renders as a bold label with nothing under it — 15 of 106 task docs

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.117.review.1.card-preflight-heading-only.md` implemented 2026-09-17
**GitHub Issue**: [#415](https://github.com/Gamaroff/agent-skills/issues/415)

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
- `countMandatorySections` exists in `skills/create-task/scripts/lib.js` (task-only: it counts the
  eleven numbered `## N.` headings by string match). No review skill consumes it, and it is not
  reachable from `shared/resources/` without a `shared → skill` dependency.

## 4. Scope

### In Scope

✅ `summariseSection`: bold-only line + following list ⇒ the list is the content
✅ `heading-only` finding kind, defined by property; corpus test with a floor (expects 15 today, 0 after)
✅ Preflight output states its scope (decided at review 2026-09-17: a scope statement, not a mandatory-section count — the count is task-only and would need a second copy of the heading list, see §3)
✅ `create-task` §4.6 / `create-story` §6.2a / `create-epic` §"Card Preflight" text updated to match

### Out of Scope

❌ Re-syncing the 15 cards to Jira (a consumer decision) · ❌ changing which sections are card sections

## 5. Breaking Changes

None; the preflight stays advisory at authoring. Cards synced after the change render the list.

## 6. Implementation Plan

1. Corpus test first (population form): walk `docs/tasks/*/task.*.md`, run `checkCardSections`,
   count `heading-only`; assert the count and a floor of ≥ 100 docs visited.
2. `summariseSection` fix — a bold-only line on its own paragraph (`**Label**` / `**Label**:`) is
   dropped the way `dropHeadingLines` drops `###`, **every** such line and not only a leading one
   (the 15 documents carry `**Functional**:` … `**Code Quality**:` in sequence); `heading-only`
   kind, defined by property (summary has no sentence terminator and no list item); re-run → 0.
3. Scope statement in the CLI's clean output ("N card blocks resolved — not a template-completeness
   check"); update the three `create-*` preflight steps.
4. Mutation: revert the summariser fix → the corpus test reds at 15.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `shared/resources/jira-sync.js`, `shared/resources/card-preflight.js` | summariser + finding kind + scope line |
| `shared/resources/tests/card-preflight-corpus.test.mjs` (new) | population check (floor 100, count 0) |
| `shared/resources/tests/jira-sync-card-summary.test.mjs`, `shared/resources/tests/card-preflight.test.mjs` | summariser fixtures (C2), finding/scope fixtures (H), `--json` scope |
| `shared/resources/tracker-card-summary.md`; `skills/review-{task,story,epic}/SKILL.md` | finding vocabulary gains `heading-only` |
| `docs/tasks/task.{42,43,44,104}.…/*.md` | Breaking Changes given a lead sentence (each block resolved to `**Before** (…):` and stopped) |
| `skills/sync-jira-{task,story,epic,bug}/scripts/*.js` | `--check-card --json` carries `scope` |
| `shared/resources/authoring-card-preflight.md`; `skills/create-task/SKILL.md` §4.6, `skills/create-story/SKILL.md` §6.2a, `skills/create-epic/SKILL.md` §"Card Preflight" | contract + prose |
| `CHANGELOG.md` | Fixed |

## 8. Testing Strategy

Unit fixtures for the summariser (bold label + list; bold label alone; prose + list); corpus test;
the four `sync-jira-*` suites unchanged and green.

## 9. Success Criteria

1. `heading-only` is a finding kind and the corpus test reports 0 after the fix (15 before, recorded)
2. `summariseSection` renders the list under a bold label
3. The preflight's clean output names its scope
4. The one-definition property test still passes; bundled copies match
5. Observations #43, #49 close naming this PR

## 10. Risk Assessment

**Low.** The summariser change alters card bodies for existing synced documents on their next sync
— which is the fix, but it will show as a body diff on 15 cards; note it in the CHANGELOG.

## 11. Rollback Plan

`git revert` + bundle; the corpus test would then fail at 15, which is the honest state.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-17
**Quality Score**: 85/100 (cycle 5)
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.117.qa.5.card-preflight-heading-only.md](./task.117.qa.5.card-preflight-heading-only.md) (earlier: [qa.1](./task.117.qa.1.card-preflight-heading-only.md), [qa.2](./task.117.qa.2.card-preflight-heading-only.md), [qa.3](./task.117.qa.3.card-preflight-heading-only.md), [qa.4](./task.117.qa.4.card-preflight-heading-only.md))
- **Gate File**: [task.117.gate.5.card-preflight-heading-only.yml](./task.117.gate.5.card-preflight-heading-only.yml) (earlier: [gate.1](./task.117.gate.1.card-preflight-heading-only.yml), [gate.2](./task.117.gate.2.card-preflight-heading-only.yml), [gate.3](./task.117.gate.3.card-preflight-heading-only.yml), [gate.4](./task.117.gate.4.card-preflight-heading-only.yml))

### Test Coverage Summary
- **Tests Executed**: 515 (eight suites) + 161 boundary probes + 2 mutation proofs
- **Phases Verified**: 5/5
- **Critical Issues**: 0 (cycle 5: 1 medium — CR5-1; cycles 1–4 closed)
- **NFR Status**: Security: PASS (measured, 161 probes), Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
Cycles 1–4 are closed ([bug.1](./task.117.bug.1.label-property-overbroad.md) … [bug.6](./task.117.bug.6.heading-only-omitted-starves-card-pointer.md)); the card path is correct on every shape reviewed. Cycle 5 found the cycle-4 `beneath` counter imprecise — not fence-aware, counts label paragraphs, `omitted` differs from the prose path — which mis-words the preflight advisory on two shapes ([bug.7](./task.117.bug.7.beneath-count-not-fence-aware.md), CR5-1..3); plus two cleanups.

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
| 2026-09-17 | 1.1     | Review passed (9/10) — GitHub issue #415 linked; create-* step refs corrected; scope-statement decision recorded | review-task |
| 2026-09-17 |         | Status → ready-for-development | review-task |
| 2026-09-17 |         | Implemented — 15 files (+ bundled copies), 16 new tests; corpus 29 → 0 | develop |
| 2026-09-17 |         | QA gate CONCERNS (70/100) — 3 medium findings (CR-1, CR-2, CR-3), 4 low | qa-task |
| 2026-09-17 |         | QA findings fixed — CR-1/CR-3 (label property on pre-collapse lines, label by shape), CR-2 (transform after the drop), CR-4/CR-5; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (80/100) — cycle 2 refute pass: cycle-1 findings closed; 1 medium (CR2-1), 3 low, 3 cleanups | qa-task |
| 2026-09-17 |         | QA findings fixed — CR2-1 (trailing terminator only), CR2-2 (beneath count), CR2-3 (create-* prose), CR2-4 (bare bold alone is content), CR2-5/6/7; 3 more docs given a lead sentence; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (80/100) — cycle 3: cycle-2 findings closed; 2 medium (CR3-1 colon-inside-bold, CR3-2 change-log rows in fenced examples), 2 low, 2 cleanups | qa-task |
| 2026-09-17 |         | QA findings fixed — CR3-1 (colon inside bold), CR3-2/3 (real Change Log sections in task.42/43; task.44 row into its table), CR3-4 (label anchored at column 0), CR3-5/6; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (85/100) — cycle 4: cycle-3 findings closed; 1 medium (CR4-1 heading-only omitted starves the card pointer), 2 cleanups | qa-task |
| 2026-09-17 |         | QA findings fixed — CR4-1 (honest `omitted` + separate `beneath`), CR4-2/3 (test hygiene); 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (85/100) — cycle 5: cycle-4 findings closed; 1 medium (CR5-1 beneath not fence-aware), 2 low, 2 cleanups | qa-task |
| 2026-09-17 |         | QA findings fixed — CR5-1..3 (fence-aware `splitBlocks`, non-label `beneath`, `omitted` matches the prose path), CR5-4/5; 1 iteration | qa-fix |

---

## Progress Tracking

### Phase 1: measure
- [x] Corpus scan committed as a test: count task docs whose Success Criteria card block renders as a bold label only (expected 15 of 106 on 2026-09-10 — **measured 29 of 120 on 2026-09-17** by the test itself: the 15, plus 11 whose label sat directly above its bullets and was joined into a run-on, plus 3 Breaking Changes blocks)
### Phase 2: fix
- [x] `summariseSection` treats a leading bold-only line followed by a list as a label, not the prose (every bold-only line, via `dropHeadingLines`; `RE_BOLD_LABEL` excludes sentence terminators so `**None.**` stays content)
- [x] Preflight gains a `heading-only` finding kind, defined by property — `isLabelOnly(paragraph)`: one line, no sentence terminator, no list item on any line, and a label's shape (bold-only, or ≤ 4 words with a trailing colon); plus the by-construction case where a section is nothing but labels/sub-headings. (QA cycle 1 tightened this from "no sentence, no list item", which called any terse lead a label.)
- [x] Preflight's clean result states its scope ("3 card blocks resolve — not a template-completeness check") — `describeCardScope`, in the display and as `scope` in `--json`
### Phase 3: prove
- [x] Corpus test goes to 0; mutation (revert the bold-label drop) → red at 28 of 120; second mutation (property check inert) → optional-block fixture red

---

## References

- **Plan**: [`task.117.plan.card-preflight-heading-only.md`](task.117.plan.card-preflight-heading-only.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #43, #49
- **Canonical**: `shared/resources/jira-sync.js` (`summariseSection`, `CARD_SECTIONS_BY_KIND`, `checkCardSections`); `shared/resources/card-preflight.js`; `shared/resources/authoring-card-preflight.md`
- **Predecessor**: task.102 (the preflight)

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.117.card-preflight-heading-only/task.117.card-preflight-heading-only.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
