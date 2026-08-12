---
id: task.44
title: "Review and edit skills log their document mutations"
type: task
description: "Make every review-*, edit-*, and change-management skill append a Change Log row when it mutates a document, and have review-* grade the section's presence and currency."
tags: [change-log, review, documentation]
category: refactoring
status: accepted
priority: High
created: 2026-08-12
updated: 2026-08-12
completed_date: 2026-08-12
pr_number: 211
assignee:
estimated_effort_hours: 16
github_issue: 203
---

# [Task 44] Review and edit skills log their document mutations

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.44.review.1.change-log-review-and-edit.md` implemented 2026-08-12

**GitHub Issue:** [#203](https://github.com/Gamaroff/agent-skills/issues/203)

---

## 1. Overview

Twelve skills edit a PRD, epic, story, or task document during review or refinement and
leave no trace in the document's own history. `review-epic` and `review-task` get a Change
Log entry only as a side effect of the Jira sync, so the GitHub and no-tracker paths record
nothing at all. `edit-story` merely *suggests* an entry in its closing message. `edit-epic`
says nothing.

This task makes those skills write the row, and makes the four `review-*` skills grade the
section — advisory, per `change-log.enforcement`.

**Scope**: Twelve skills across review, edit, change-management and structural rewriting,
plus the template-compliance checks in the four `review-*` skills and the undefined check (3)
in `documentation-standards-validator`.

**Key deliverables**:

1. Every review/edit mutation writes a row on the document it changed.
2. The four `review-*` skills check the section's presence and currency.
3. `documentation-standards-validator` check (3) is finally defined.

**Expected outcome**: A stakeholder reading a document's Change Log sees every review verdict
and refinement edit, on every tracker path including none.

---

## 2. Motivation

### Current Problems

1. **Review verdicts vanish on the GitHub and no-tracker paths.** `review-epic` Step 11.5
   (`:723`) and `review-task` Step 8.6 (`:1430`) get a Change Log entry only because
   `sync-jira-epic` / `sync-jira-task` append one. There is no GitHub equivalent and no
   local write. A repo on GitHub, or with no tracker, gets a fully reviewed document whose
   history says nothing happened. `review-story` is the exception — Step 10 (`:2097`) writes
   a row directly.

2. **`edit-story` suggests rather than writes.** Step 5 (`:248`) applies arbitrary
   user-directed edits — acceptance criteria (`:439`), status (`:457`), tasks (`:472`) — and
   then at `:272` and `:532` says "Consider updating Change Log section if not already done".
   The edit that most needs recording is the one least likely to be.

3. **`edit-epic` records nothing.** Step 6 (`:366`) applies epic edits with cascade analysis
   across child stories and writes no entry anywhere.

4. **`review-bug` (`:131`) corrects severity and priority** — the two fields that decide who
   gets paged — and writes no Status History row.

5. **`review-prd` writes a 5-column row** (`:771`) into what task.43 makes a 4-column table.

6. **Structural rewrites are invisible.** `shard-doc` / `shard-prd` split a document into
   per-section files; `enforce-standards` renames and moves files; `epic-registry-manager`
   creates epics and registry rows; `correct-course` / `change-management` produce Sprint
   Change Proposals specifying edits to stories, epics, PRDs and architecture docs. None
   leaves a Change Log row on the affected documents.

7. **Nothing checks the section exists.** `documentation-standards-validator/SKILL.md:25`
   lists "(3) Change Log header" among seven mechanical checks and never defines it. None of
   the four `review-*` template-compliance lists includes it except `review-story:540` and
   `review-prd:226`, and neither checks whether the log is *current*.

### Benefits

1. Review history survives regardless of tracker platform — the local file becomes what
   `tracker-card-summary.md:81` already claims it is: "the authoritative log".
2. A refinement edit that changes an AC is visible to whoever reads the document next.
3. Severity and priority corrections on bugs become auditable.
4. `review-*` catching a missing or stale log is what stops the whole scheme decaying.
5. Check (3) stops being a promise.

---

## 3. Technical Background

### Current Architecture

| Skill | Mutation | Change Log today |
|---|---|---|
| `review-story` | Steps 9.5/9.6/10 | ✅ writes a row at `:2097` |
| `review-prd` | Step 12 (`:737`) | ⚠️ writes a 5-column row at `:771` |
| `review-epic` | Steps 10/11 (`:663`, `:679`) | ❌ Jira side-effect only (`:723`) |
| `review-task` | Steps 8.5/9 (`:1388`, `:1455`) | ❌ Jira side-effect only (`:1430`) |
| `review-bug` | Step 6.5 (`:131`) | ❌ none |
| `edit-story` | Step 5 (`:248`) | ❌ suggests only (`:272`, `:532`) |
| `edit-epic` | Step 6 (`:366`) | ❌ none |
| `correct-course` | Steps 3-5 (`:211`) | ❌ none |
| `change-management` | Steps 3-5 (`:135`) | ❌ none |
| `shard-doc` / `shard-prd` | 3B.2 / Step 3 | ❌ none |
| `enforce-standards` | §4.2 (`:368`) | ❌ none |
| `epic-registry-manager` | Steps 4-6 (`:91`) | ❌ none |

### Target Architecture

Every row above writes through the canonical spec from task.42. Two categories:

**Direct writers** — the skill edits the document, so it appends the row in the same edit,
bumping frontmatter `updated`:

```markdown
| 2026-08-12 | 1.1 | Review passed (9/10) — ready for development | review-task |
| 2026-08-12 | 1.2 | AC3 added — offline retry on 5xx              | edit-story  |
| 2026-08-12 |     | Severity Medium → High; priority P3 → P1      | review-bug  |
```

**Proposal writers** — `correct-course` and `change-management` do not apply edits
themselves; they emit a Sprint Change Proposal that a PO or SM applies. The proposal gains
an explicit "Change Log rows to add" block, one row per affected artifact, so the human
applying it has the text to paste.

### Grading

`review-*` gain one compliance check with two parts:

- **Presence** — the document has a Change Log section (skipped when
  `change-log.enabled: false`).
- **Currency** — the newest row is consistent with the document's current `status:`. A story
  at `ready-for-development` whose log stops at `Initial draft` is stale: a review promoted
  it and recorded nothing.

Graded by `change-log.enforcement`, exactly as sign-off is graded
(`shared/resources/sign-off.md:147`):

| `enforcement` | Missing or stale | Effect on the pipeline |
|---|---|---|
| `advisory` (default) | **Important** issue + score deduction | none — verdict may still be GO |
| `blocking` | **Critical** → NO-GO | `develop-*` HALTs at Step 2 via the status gate |
| `off` | not checked | none |

### Important Clarifications

- **Bug documents use `## Status History`.** `review-bug` writes a Status History row, not a
  Change Log row. The columns differ (`Date, Status, Changed By, Notes`) and the section
  already exists at `create-bug-report/assets/bug-report-template.md:119`.
- **`review-bug` must still not change lifecycle `status`.** Its constraint at `:131` stands;
  it records a severity/priority correction, which is not a lifecycle transition.
- **Currency is a heuristic, not a proof.** It compares the newest row against `status:`, not
  against the full diff. A reviewer who edits prose without a row is not caught — that is
  acceptable at `advisory`, and tightening it is a future improvement, not this task.

---

## 4. Scope

### In Scope

✅ `review-epic`, `review-task`, `review-bug` — write the row
✅ `review-prd` — reshape the 5-column row to 4
✅ `review-story` — align format and Author cell
✅ `edit-story` — suggestion becomes a write; `edit-epic` — add
✅ `correct-course`, `change-management` — proposal states the rows to add
✅ `shard-doc`, `shard-prd`, `enforce-standards`, `epic-registry-manager` — log structural rewrites
✅ Template-compliance checks in all four `review-*` — presence + currency, graded per config
✅ `documentation-standards-validator` — define check (3)

### Out of Scope

❌ Spec and engine — task.42 (prerequisite)
❌ Templates and `create-*` — task.43 (prerequisite)
❌ `develop`, QA, `finalise`, sync skills — task.45
❌ Backfilling existing documents
❌ Verifying a Change Log row against the actual diff — heuristic currency only

---

## 5. Breaking Changes

### Breaking Change 1: `review-prd`'s Change Log row loses a column

**Before** (`skills/review-prd/SKILL.md:771`):

```markdown
| Review fixes applied | YYYY-MM-DD | [version] | Applied [N] recommendations from review-prd | Claude |
```

**After**:

```markdown
| YYYY-MM-DD | [version] | Applied [N] recommendations from review-prd | review-prd |
```

**Affected**: brownfield PRDs, whose template task.43 narrows to four columns. Existing
5-column PRD tables are not backfilled, so `review-prd` will append a 4-column row to a
5-column table in an old document — visibly ragged in rendered markdown but not broken.

**Migration path**: none required. The spec states that a document whose table predates the
change keeps its columns, and that widening it is a manual one-time edit. Task.42's engine
never rewrites existing rows.

### Breaking Change 2: `review-*` can now fail a document for a missing Change Log

**Before**: no review skill checked the section, except `review-prd:226` ("Change Log exists
and has at least one entry"), which contributed to a rubric score but raised no issue.

**After**: a missing or stale section is an Important finding with a score deduction under
the default `advisory`, or Critical → NO-GO under `blocking`.

**Affected**: every document written before task.43 — which is all of them, since there is no
backfill.

**Migration path**: `advisory` is the default precisely for this. A legacy document scores
one point lower and reports one extra finding; nothing halts. A repo wanting the stricter
behaviour opts in with `change-log.enforcement: blocking` once its corpus is current. This
mirrors how sign-off shipped (`shared/resources/sign-off.md:135`: "a document written before
the feature was enabled has no section, and `review-*` treats a missing section under
`enforcement: advisory` the same as an unsigned one").

---

## 6. Implementation Plan

> Detailed implementation guide: [task.44.plan.change-log-review-and-edit.md](task.44.plan.change-log-review-and-edit.md)

### Phase 1: Review skills write their verdict row

**Risk**: Low.
**Files**: `skills/review-epic/SKILL.md`, `skills/review-task/SKILL.md`,
`skills/review-prd/SKILL.md`, `skills/review-story/SKILL.md`, `skills/review-bug/SKILL.md`

- [x] `review-epic`: write the row in Step 11 (fix application) and Step 10 (status change),
      independent of the Step 11.5 Jira sync
- [x] `review-task`: same, in Steps 8.5 and 9
- [x] `review-prd`: reshape the Step 12 row to four columns; Author `review-prd`
- [x] `review-story`: align the Step 10 row's Author cell to the skill name
- [x] `review-bug`: Step 6.5 appends a Status History row recording any severity/priority
      correction; lifecycle `status` still untouched
- [x] Every row write bumps frontmatter `updated` in the same edit

### Phase 2: Edit and change-management skills

**Risk**: Low.
**Files**: `skills/edit-story/SKILL.md`, `skills/edit-epic/SKILL.md`,
`skills/correct-course/SKILL.md`, `skills/change-management/SKILL.md`

- [x] `edit-story`: Step 5 writes the row; delete the "Consider…" advisories at `:272`, `:532`
- [x] `edit-epic`: Step 6 writes the row
- [x] Both bump `updated`, and describe *what* changed, not that an edit occurred
- [x] `correct-course` / `change-management`: the Sprint Change Proposal gains a
      "Change Log rows to add" block, one row per affected artifact

### Phase 3: Structural rewrite skills

**Risk**: Low.
**Files**: `skills/shard-doc/SKILL.md`, `skills/shard-prd/SKILL.md`,
`skills/enforce-standards/SKILL.md`, `skills/epic-registry-manager/SKILL.md`

- [x] `shard-doc` / `shard-prd`: the generated `index.md` carries a row recording the shard,
      and each shard notes its origin
- [x] `enforce-standards`: a rename or move writes a row on the affected document
- [x] `epic-registry-manager`: epic creation seeds row one, matching `create-epic` from task.43

### Phase 4: Grading

**Risk**: Medium — changes review verdicts across four skills.
**Files**: the four `review-*` SKILL.md template-compliance steps,
`skills/documentation-standards-validator/SKILL.md`
**Depends on**: Phases 1–3

- [x] Add Change Log to the Section Presence lists: `review-story:540` (already there —
      extend to currency), `review-task:425`, `review-epic` (template baseline at `:177`),
      `review-prd:226`
- [x] Define the currency heuristic: newest row consistent with frontmatter `status`
- [x] Wire both to `change-log.enabled` / `change-log.enforcement`, mirroring the sign-off
      grading table at `shared/resources/sign-off.md:147`
- [x] Add scoring-rubric rows in each skill, matching where sign-off appears
- [x] `documentation-standards-validator`: define check (3) against the canonical spec —
      heading present, four columns, at least one row, `updated` not older than the newest row

### Phase 5: Bundle and verify

**Risk**: Low.
**Depends on**: Phases 1–4

- [x] `npm run bundle`; second run must be a no-op
- [x] `npm test`
- [x] `npm run generate-catalog` if any description changed
- [x] Manual: run `/review-task --validate` on a task.43-created document and confirm the
      Change Log check reports clean; run it on a pre-task.43 document and confirm one
      Important finding, GO verdict preserved

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-epic/SKILL.md` — Steps 10, 11; compliance list; rubric
2. ✅ `skills/review-task/SKILL.md` — Steps 8.5, 9; compliance list at `:425`; rubric at `:1244`, `:1686`
3. ✅ `skills/review-prd/SKILL.md` — Step 12 row at `:771`; check at `:226`; rubric at `:506`
4. ✅ `skills/review-story/SKILL.md` — Step 10 row at `:2097`; compliance list at `:540`
5. ✅ `skills/review-bug/SKILL.md` — Step 6.5 Status History row
6. ✅ `skills/edit-story/SKILL.md` — Step 5 write; remove `:272`, `:532` advisories
7. ✅ `skills/edit-epic/SKILL.md` — Step 6 write
8. ✅ `skills/correct-course/SKILL.md` — proposal block
9. ✅ `skills/change-management/SKILL.md` — proposal block
10. ✅ `skills/shard-doc/SKILL.md` — index row
11. ✅ `skills/shard-prd/SKILL.md` — index row
12. ✅ `skills/enforce-standards/SKILL.md` — rename/move row
13. ✅ `skills/epic-registry-manager/SKILL.md` — seed row one
14. ✅ `skills/documentation-standards-validator/SKILL.md` — define check (3)

### Files to Modify (Tests)

15. ✅ `tests/skill-protocol.test.js` — assert each review skill documents the check and links the spec

### Files to Modify (Documentation)

16. ✅ `CHANGELOG.md`

### Files Added (generated by `npm run bundle` — not hand-authored)

`references/document-change-log.md` materialised into each of the 14 skills above that now cite the spec. These are bundler output: the source of truth stays `shared/resources/document-change-log.md`, and editing a bundled copy is reverted by the next `npm run bundle`.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: skill prose contracts
- **Location**: `tests/skill-protocol.test.js`
- **Command**: `node --test tests/skill-protocol.test.js`
- **Target**: every skill that grades the section mentions `change-log.enabled` and links
  `document-change-log.md`. The precedent is the sign-off config-gate test at
  `tests/skill-protocol.test.js:232`, which asserts exactly this shape for four skills

### Integration Tests

- **Scope**: doc-reference resolution
- **Actions**: `tests/executable-instructions.test.js:189` requires every
  `docs/{standards,reference,…}` path cited in skill prose to resolve. Fourteen skills gain
  new citations here

### Contract Tests

- **Scope**: bundling — `npm run bundle` idempotence, and the spec reaching each skill's
  `references/`

### Performance Tests

Not applicable — prose changes to skill instructions.

### Consumer Tests

- **Scope**: the review gate is what `develop-story` / `develop-task` Step 2 depends on
- **Risk area**: a `blocking`-configured repo halting its pipeline on legacy documents.
  Verify the default is `advisory` and that a missing section produces an Important finding
  with the verdict still GO. `evals/develop-story/step-isolation/02-review-story` and
  `evals/develop-task/step-isolation/02-review-task` exercise this step — confirm both stay green

---

## 9. Success Criteria

### Functional

- [x] `review-epic` and `review-task` write a Change Log row on every tracker path, including none
- [x] `review-prd`'s row is four columns
- [x] `edit-story` and `edit-epic` write a row describing what changed
- [x] `review-bug` records severity/priority corrections in Status History without touching
      lifecycle `status`
- [x] `correct-course` and `change-management` proposals name the rows to add per artifact
- [x] All four `review-*` check presence and currency, graded per `change-log.enforcement`
- [x] `documentation-standards-validator` check (3) is defined

### Performance

- [x] No measurable change to review runtime; the review-step eval scenarios do not slow by
      more than a second

### Code Quality

- [x] `npm test` passes
- [x] `npm run bundle` idempotent; no `references/` file hand-edited
- [x] Every touched skill links `document-change-log.md` rather than restating the format

### Migration

- [x] Default remains `advisory`; a legacy document reviews GO with one Important finding
- [x] `CHANGELOG.md` updated
- [x] `npm run generate-catalog` re-run if descriptions changed

---

## 10. Risk Assessment

### High Risk Areas

1. **A new review check halts pipelines on legacy documents**
   - **Risk**: if the check lands as Critical, or a repo sets `blocking` before its corpus is
     current, `develop-story` / `develop-task` HALT at Step 2 on every existing document.
     The review gate withholds the status promotion, and the pipelines gate on `Status:` —
     so the halt is total, not advisory.
   - **Probability**: Low with `advisory` default; High if the default is wrong
   - **Impact**: Critical
   - **Mitigation**: default `advisory`, asserted in a protocol test alongside the existing
     sign-off default assertion. Verify both review-step eval scenarios stay green.
   - **Rollback**: set `change-log.enforcement: off` in the consumer's config — a
     one-line change requiring no revert.

### Medium Risk Areas

2. **The currency heuristic produces false positives**
   - **Risk**: "newest row consistent with `status`" flags a legitimately quiet document —
     one reviewed with no findings, say — and reviewers learn to ignore the finding.
   - **Probability**: Medium
   - **Impact**: Medium — an ignored check is a check that does not exist
   - **Mitigation**: define currency narrowly. Only flag when `status` has advanced past
     `draft` and no row mentions a review or status change. A no-findings review still writes
     a row ("Review passed (9/10) — no changes required"), so the quiet case is covered by
     Phase 1 rather than exempted here.

3. **Fourteen skills restate the format and drift**
   - **Probability**: High if each embeds the column list
   - **Impact**: Medium — precisely the problem this series exists to fix
   - **Mitigation**: every skill links the spec; the row example in prose is illustrative and
     marked as such. `tests/executable-instructions.test.js` catches a broken link, and the
     protocol test asserts the citation exists.

### Low Risk Areas

4. **`review-prd` appends a 4-column row to a legacy 5-column table**
   - **Probability**: High for existing brownfield PRDs
   - **Impact**: Low — ragged rendering, no data loss
   - **Mitigation**: documented in the spec as expected; widening is a manual one-time edit.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A `develop-*` pipeline HALTs at Step 2 on a document that previously passed
- `review-*` reports Critical for a missing Change Log under the default config
- Either review-step eval scenario red

**Steps**:
1. `git revert` the merge commit.
2. `npm run bundle`.
3. `npm test`.

**Validation**: `/review-task --validate` on a legacy document returns its pre-change verdict
and score.

### Partial Rollback (1-2 hours)

**When to use**: the writers are good and only the grading misbehaves.

**Steps**: revert Phase 4 alone. Phases 1–3 are pure additions — a skill that writes a row
into a section that nothing checks is harmless and still delivers the stakeholder-visible
history. This is the preferred partial: it keeps the value and drops the risk.

### Forward Fix (< 4 hours)

**When to use**: one skill's row is wrong, or the currency heuristic is too eager.

**Approach**: narrow the heuristic or fix the single skill. Reverting fourteen prose edits to
correct one is disproportionate.

### Rollback Triggers

**Critical (revert)**: any pipeline HALT caused by the new check; a review skill corrupting a
document it edits.
**Non-critical (fix forward)**: false-positive currency findings; a wrong Author cell; a
structural-rewrite skill missing its row.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: shared/resources/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                                  | Author      |
| ---------- | ------- | ------------------------------------------------------------ | ----------- |
| 2026-08-12 | 1.0     | Initial draft                                                | create-task |
| 2026-08-12 | 1.1     | Review passed (9/10) — ready for development; Change Log section added, absent since the document predated task.43's template | review-task |
| 2026-08-12 |         | Status → in-progress                                         | develop     |
| 2026-08-12 |         | Implemented — all 5 phases; 16 files, 21 new protocol tests, 1175/1175 passing | develop     |
| 2026-08-12 |         | QA gate CONCERNS (90/100) — 1 medium: review-task Step 8.5 list order | qa-task     |
| 2026-08-12 |         | TASK-44-BUG-1 fixed — Step 8.5 block moved, scope made unconditional | qa-fix      |
| 2026-08-12 |         | QA gate PASS (100/100) after 1 fix cycle                      | qa-task     |
| 2026-08-12 | 1.2     | DoD passed — accepted; CI green on head 75bd814               | finalise    |

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.44.qa.1.change-log-review-and-edit.md`
**Gate File**: `task.44.gate.1.change-log-review-and-edit.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100 (after 1 fix cycle)

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 41/41 checkboxes ticked, each with cited evidence
✅ **CI:** 3/3 checks green (`test`, `link-check`, `validate`) — on the **exact head commit** `75bd814`, not an ancestor
✅ **Tests:** `npm test` 1175/1175; 21 new protocol tests; both review-step eval scenarios green
✅ **PR:** #211 OPEN, MERGEABLE
✅ **Documentation:** `CHANGELOG.md` updated; 14/14 skills link the canonical spec rather than restating it
✅ **Security Review:** PASS — no auth, crypto, secret or dependency surface; the two grep hits were the QA report's own prose asserting the absence
⚠️ **Compliance Review:** NOT_APPLICABLE — skills-library repo, no GDPR/PCI/WCAG/HIPAA surface
✅ **Bundle:** `npm run bundle` idempotent; all 14 bundled copies byte-identical, no hand-edited `references/` file

**The migration risk was verified live, not argued.** This task's own document predated task.43's template, so its Step 2 review exercised exactly the legacy path the change is riskiest for — returning one Important finding with a GO verdict at 9/10 under default config. `advisory` is confirmed correct as the default.

**Detailed Verification Log:** See `task.44.dod.1.change-log-review-and-edit.md` for complete evidence and citations.

**Task marked as ACCEPTED on:** 2026-08-12

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-12
**Quality Score**: 100/100
**Gate Decision**: PASS (after 1 fix cycle)

### QA Report

- **Full Report**: [task.44.qa.1.change-log-review-and-edit.md](./task.44.qa.1.change-log-review-and-edit.md)
- **Gate File**: [task.44.gate.1.change-log-review-and-edit.yml](./task.44.gate.1.change-log-review-and-edit.yml)

### Test Coverage Summary

- **Tests Executed**: 1175 (all passing)
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

The highest-risk element — Phase 4's grading check — is correctly built: `advisory` is genuinely the default and maps to **Important**, never Critical, in all four review skills, and the legacy-document path was confirmed live during this pipeline's own Step 2.

One MEDIUM issue was found and fixed in cycle 1: [TASK-44-BUG-1](./task.44.bug.1.review-task-step-8-5-list-numbering.md) — `review-task` Step 8.5 numbered its new Change Log item out of sequence (1, 2, 4, 3), placing it between the two conditional branches so an unconditional write read as conditional on fixes having been applied. The block was moved after item 3 and the scope made explicit. Re-verified: list order 1-4, suite 1175/1175, bundle idempotent, no regressions across the other four structurally-edited files. **Gate CONCERNS → PASS, 90 → 100/100.**

---

## Implementation Record

**Started**: 2026-08-12 · **Completed**: 2026-08-12 · **Branch**: `feature/task.44.change-log-review-and-edit`

### Implementation Summary

All five phases delivered. Fourteen skills now write a Change Log row when they mutate a document; the four `review-*` skills grade the section's presence and currency per `change-log.enforcement`; and `documentation-standards-validator`'s check (3) is defined. Pure prose work — no runtime code changed.

### Implementation Approach

**Phase 1 — review skills write their verdict row.** `review-epic` gained two writes (a status-transition row in Step 10 with `Version` blank, and the verdict row in Step 11 with a minor bump), `review-task` the same in Steps 8.5 and 9. Keeping the verdict and status rows separate matters: a review can pass without promoting — the sign-off gate can withhold it — so a single row could not say which happened. Both state explicitly that the row is written **regardless of tracker platform**, because the Jira sync row is a sync record rather than a review record. `review-prd` reshaped 5 columns → 4 with `Author` corrected from `Claude`, plus a note that a legacy 5-column table is appended to and never rewritten. `review-story` had the row already; its Author cell moved from `Review-Story` to `review-story`. `review-bug` writes a **Status History** row for severity/priority corrections, holding the `Status` cell at the bug's current lifecycle state.

**Phase 2 — edit and change-management.** `edit-story` Step 5 and `edit-epic` Step 6 write the row as a mandatory sub-step; `edit-story`'s two "Consider updating Change Log" advisories were deleted, since leaving an optional-sounding suggestion next to a mandatory instruction is how an agent concludes the write is optional. `edit-epic`'s row names the cascade when Step 4 found affected child stories. `correct-course` and `change-management` apply no edits themselves, so each proposal gained a "Change Log rows to add" block supplying the row text per artifact.

**Phase 3 — structural rewrites.** `shard-doc`/`shard-prd` put the log on the generated `index.md` and a provenance note on each shard, with an explicit prohibition on copying the source log into all N shards. `enforce-standards` records renames on **documents only** and records the old filename. `epic-registry-manager` seeds row one, since it creates epic files directly and bypasses `create-epic`.

**Phase 4 — grading (built last, as planned).** A `4b` check in each `review-*`, modelled on the sign-off check `4a` it sits beside: presence, plus a narrowly-defined currency heuristic that fires only when `status` has advanced past `draft`/`planned` and no row mentions a review, status change or implementation event. The enforcement table is copied in shape from `sign-off.md`, including the point that under `blocking` it is the withheld status promotion — not the score — that stops the pipeline. `review-prd`'s variant additionally accepts H3 and optional section numbering, since PRDs nest their log under §1.

**Phase 5 — tests and bundle.** 21 protocol tests across three families, plus `npm run bundle` (idempotent; materialises the spec into 14 skills' `references/`).

### Testing Results

| Check | Result |
|---|---|
| `node --test tests/skill-protocol.test.js` | 53/53 pass (21 new) |
| `npm test` (full suite) | **1175/1175 pass**, 0 fail |
| `npm run eval:develop-task` — `02-review-task` | ✅ green |
| `npm run eval:develop-story` — `02-review-story` | ✅ green |
| `npm run bundle` idempotence | ✅ tree identical across consecutive runs |
| Legacy document under default config | ✅ 1 Important finding, verdict GO — see below |

**The legacy-document check was confirmed live, not argued.** The plan named this as the one verification that actually de-risks Phase 4: a pre-task.43 document must yield one Important finding and still return GO, because a NO-GO there would halt every consumer pipeline on its existing corpus. This run supplied the test case by accident and then passed it — task.44's own document was written against the pre-task.43 template and had no Change Log, so Step 2's review produced exactly one Important finding with a GO verdict at 9/10 under default config. `advisory` is confirmed correct as the default, and the assertion is now pinned in the protocol tests for all four skills.

### Deferred Work

None. Two items were consciously left alone rather than deferred: `risk_level:` was not added to this task's frontmatter (it changes pipeline-visible metadata mid-run for no behavioural difference), and no linter was written for `documentation-standards-validator` check (3), because that skill's standing position is that it ships definitions and each consuming repo implements its own gates.

---

## Progress Tracking

### Phase 1: Review skills write their verdict row
- [x] Complete

### Phase 2: Edit and change-management skills
- [x] Complete

### Phase 3: Structural rewrite skills
- [x] Complete

### Phase 4: Grading
- [x] Complete

### Phase 5: Bundle and verify
- [x] Complete

---

## References

- [`shared/resources/document-change-log.md`](../../../shared/resources/document-change-log.md) —
  canonical spec (task.42; hard prerequisite)
- [`shared/resources/sign-off.md`](../../../shared/resources/sign-off.md) lines 141-170 —
  the enforcement table and reviewer-output wording to mirror
- [`tests/skill-protocol.test.js`](../../../tests/skill-protocol.test.js) line 232 — the
  config-gate documentation test to extend
- [`docs/reference/configuration.md`](../../reference/configuration.md) — `change-log.*` keys
- Prior tasks: task.42, task.43. Follow-on: task.45.

---

## Notes

### Important Reminders

- `advisory` is the default and a protocol test must assert it. A wrong default here halts
  every pipeline in every consumer repo.
- `review-bug` writes Status History, not a Change Log, and still must not change lifecycle
  `status`.
- Link the spec; do not restate the columns in fourteen files.

### Known Issues

- `review-task`'s copy of `task-template.md` is byte-locked to `create-task`'s by task.43.
  Any template edit needed here must go through both files.
- Existing brownfield PRDs keep five columns; `review-prd` will append four. Expected.

### Future Improvements

- Verify a Change Log row against the actual diff rather than against `status`. Needs a
  cheap structural diff of the document between two commits — worth its own task.
- A `--check-change-log` preflight mirroring `--check-card`
  (`shared/resources/tracker-card-summary.md:132`) would let `review-*` run the check
  deterministically instead of asking an agent to read the table.
