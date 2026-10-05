---
id: task.171
title: "[Task 171] Deferred Work placement and qa-results engine residuals"
type: task
description: "Follow-up to task.155. Give the develop pipelines' loop-exit Deferred Work record its own `## Deferred Work` section outside the QA Testing Results section, which is the source fix for REL-030. Close the qa-results.js residuals task.155 recorded. Make create-bug-report's Bug Reports check match the heading it writes."
tags: [qa-task, qa-story, develop-task, develop-story, create-bug-report, engine, follow-up]
category: refactoring
status: accepted
completed_date: 2026-10-05
pr_number: 568
priority: Medium
created: 2026-10-01
updated: 2026-10-05
assignee:
estimated_effort_hours: 16
github_issue: 538
---

# Technical Task: Deferred Work placement and qa-results engine residuals

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.171.review.1.deferred-work-placement-and-qa-results-residuals.md` implemented 2026-10-05

**GitHub Issue**: [#538](https://github.com/Gamaroff/agent-skills/issues/538)

---

## 1. Overview

task.155 (PR #537, merged as `52faad19`) gave the `## QA Testing Results` section one writer,
`shared/resources/qa-results.js`. Its QA loop ran 10 cycles. At the end it recorded a list of
residuals in its `## Deferred Work` section and named this follow-up. One of them, REL-030, is a
deletion path that the operator accepted on condition that its source is fixed here. The develop
pipelines' loop-exit step records carried finding ids "on the work item under **Deferred Work**".
It names no heading and no position, so the record can land inside the QA section, where a replace
removes it.

**Scope:** three units, delivered as phases of one task. The operator asked for one follow-up task;
§ 6 names the seams if it is ever split.

**Key deliverables:**

1. The loop-exit step writes its record to a `## Deferred Work` H2 section that sits outside
   `## QA Testing Results`, and states that position once (REL-030 at source).
2. `qa-results.js` closes the recorded residuals: REL-007/008, REL-024/025/027/028, setext headings,
   CRLF seams, CR-4/CR-5 and PR-review-5 CR-1/2/3. Each one is closed either by refusing the write
   or by carrying the content, never by guessing.
3. `create-bug-report` (task mode) checks for the heading it actually writes (obs #240).

**Expected outcome:** no shape recorded in task.155's Deferred Work silently deletes or duplicates
content. Each one either writes correctly or refuses with a reason that names the repair.

---

## 2. Motivation

### Current Problems

1. **The loop-exit record has no stated home (REL-030's source).**
   `shared/resources/develop-pipeline-step-5-6-qa-loop.md:685` and `:737` both say "record the same
   ids on the work item under **Deferred Work**". Nothing says which heading level to use or where it
   goes. task.141 put it inside its QA section as `### Deferred Work`; task.155 now carries that shape.
   A bold `**Deferred Work**` label inside the section is not carried, and a replace deletes it.
2. **Engine residuals that can delete content.** REL-007 and REL-008 drop log rows in a misplaced
   section (gates 3–10, `recommendations.future`). REL-008 is the worst case: a log whose header is
   not Date-first loses all of its rows. REL-027 drops a Bug Reports list under a non-standard label.
   Setext H1/H2 headings are not structure to the guard. All of these have 0 corpus instances, and
   every one of them deletes.
3. **Engine residuals that duplicate or mislead.** REL-028: a nested carried block doubles on every
   write. REL-024: a trailing HTML comment is peeled as a separator on every write. REL-025: a
   `#### Bug Reports` block over-carries QA's later `####` subsections. CR-4: a folded block loses
   its heading line. CRLF documents get LF seams. PR review 5 CR-1: `bad-section` carries no detail,
   so the Step 12 halt cannot tell the reader what to fix.
4. **create-bug-report checks one heading and writes another (obs #240).**
   `skills/create-bug-report/SKILL.md:291` checks whether `## Bug Reports` exists. `:294` writes
   `### Bug Reports`. A second filing can therefore open a second list, which is the REL-020 shape
   that task.155 had to fold.

### Benefits of Solution

- The loop-exit record lands where no QA write can reach it. REL-030 then has no source, rather than
  needing a third carry rule.
- Every residual shape either writes correctly or refuses, and the refusal names which rule fired.
- The `bad-section` and `unbounded` halts point at the actual repair.

---

## 3. Technical Background

### Current Architecture

- **Loop-exit writer:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:685` (route 2,
  Diminishing-returns exit, *On exit* step 4) and `:737` (route 2b, Cosmetic-residue exit, step 3).
  Both say "record the same ids on the work item under **Deferred Work**". This file is bundled into
  `skills/develop-story/references/` and `skills/develop-task/references/`.
- **Engine:** `shared/resources/qa-results.js`. These are the symbols this task touches, each at
  the line the grep found:
  - `CARRIED_SUBSECTIONS` (`:128`, `["Bug Reports", "Deferred Work"]`)
  - `collectBlocks` (`:140`, a block ends at an unprotected `^#{1,3}` line or `RE_QA_FIELD`)
  - `linksIn` (`:171`, dead since `5322ba05`)
  - `mergeCarried` (`:181`)
  - `removesStructure` (`:199`) and `RE_STRUCTURAL` (`:101`): change-log markers, ATX H1/H2 and
    log headings, scanned fence-blind
  - `trimSeparator` (`:214`, which peels any trailing HTML comment block)
  - `lastTableStart` (`:280`) and `RE_LOG_HEADER` (`:80`, first cell `Date`)
  - `canonicalOffset` (`:415`)
  - `normaliseSection` (`:446`, which returns `null` and so `bad-section`, with no detail)
  - `upsertQaResults` (`:484`)
  - `collectBlocks`' `end` field (`:164`, dead)
- **Change-log primitives:** `shared/resources/change-log.js:80` `RE_ENTRY_ROW` and `:82`
  `isEntryRow` both recognise a dated log row whatever the table's header is. They are already
  exported.
- **Bug Reports writer:** `skills/create-bug-report/SKILL.md:289–299` (task mode, Step 5).
- **Step 12 callers:** `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`, in the
  `# QA Testing Results writer (task 155)` blocks.

### Target Architecture

- **Deferred Work has one home.** The step doc states it once: a `## Deferred Work` H2, created on
  first use immediately before the change-log block, or before `## Progress Tracking` /
  `## Dev Agent Record` when the document has no change log. It is never placed inside
  `## QA Testing Results`. Later exits append their ids to that same section. Both route paragraphs
  point at this single statement and do not restate it. Because a H2 ends the QA section's span, the
  engine never reaches it.
- **Refuse what cannot be cut safely (REL-007/008).** `removesStructure` also treats a dated log row
  as structure (`isEntryRow`, imported, header-agnostic). It treats setext H1/H2 headings as
  structure too, once task.118's accidental setext underline is repaired. *Amended in QA cycle 4:*
  the setext check is fence-blind, like the H1/H2 check; three cycles of fence exemptions (CR2-2,
  CR3-1, CR4-1) each let a mis-paired fence hide a setext section that a replace then deleted. A misplaced section
  whose span holds a dated row that is not part of the log is refused, so no row can be lost. REL-007
  is the same rule.
- **Carry precisely.**
  - Carried blocks are collected across all carried names, and a block nested inside a kept block is
    dropped (REL-028).
  - A `####` block ends at the next heading of its own level or shallower (REL-025).
  - Labels are recognised as bold `**Bug Reports**` / `**Deferred Work**` lines and as the singular
    `Bug Report` (REL-027, plus legacy REL-030 documents).
  - A folded block keeps its heading text as a bold line (CR-4).
- **Peel only what is a separator (REL-024).** A trailing HTML comment is peeled only when the next
  thing after it is a change-log block or heading (the template lead-in). Otherwise it is section
  content. *Amended in QA cycle 1 (CR-6):* the narrowed peel deleted a legacy lead-in above a non-log
  heading, so the peel is unchanged and REL-024 is closed by refusing a render that ends in a comment
  (`trailing-comment`).
- **CRLF:** every seam the engine writes uses the document's own line ending.
- **CR-5:** a section stranded between a `## Change Log` heading and its marker block (written by an
  older engine) is treated as misplaced and relocated above the heading.
- **Refusals carry detail (PR review 5 CR-1).** `upsertQaResults` returns
  `{ reason, detail }`. The `detail` values are `not-a-section`, `unclosed-fence`,
  `structural-line:<line>`, `carried-block:<name>` and `multiple:<n>`. Both Step 12 halts print the
  detail.
- **Dead code removed (CR-2),** and test N2 pins the order (CR-3).
- **create-bug-report** task mode checks for the `### Bug Reports` heading it writes. The engine
  carries the bold-label and `####` forms, so the check accepts those too. *Amended in QA cycle 2
  (CR2-1):* the older H2 `## Bug Reports` lists (18 tracked documents) count as existing as well.

### Same-class mechanism inventory (obs #103)

- `collectBlocks` and `mergeCarried` are the only carry mechanism. This task **extends** them and
  does not add a second one.
- `removesStructure` is the only structural guard. This task **extends** its pattern list with
  `isEntryRow` and setext headings, imported or defined beside the existing entries.
- `trimSeparator` is the only separator peel. This task **narrows** it.
- `isEntryRow` / `RE_ENTRY_ROW` already exist in `change-log.js` and are **reused**, not
  re-derived.

---

## 4. Scope

### In Scope

- ✅ The Deferred Work placement statement in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
  plus its bundled copies
- ✅ The `qa-results.js` residuals listed in § 3, plus their unit tests and mutation proofs
- ✅ `bad-section` / `unbounded` detail, printed by both Step 12 halts
- ✅ create-bug-report task-mode Step 5 heading check, plus a test that the check and the write
  agree
- ✅ Repair of task.118's accidental setext underline (one line), so setext can count as structure
- ✅ CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ obs #242 (`review-task` checking for other writers inside a region a plan replaces). This is
  related context, but it changes the review skills, not this engine. It needs its own task.
- ❌ Moving existing `### Deferred Work` blocks out of QA sections across the corpus. The engine
  keeps carrying them, and a document moves its record only when the loop exit next writes it.
- ❌ Story-mode create-bug-report. Its `## Bug Reports` H2 already ends the QA span.

---

## 5. Breaking Changes

None to any public contract. `upsertQaResults` adds a `detail` field, and callers that read only
`reason` are unaffected. A small number of writes that task.155's engine performed are now refused,
each with a named detail: a misplaced section spanning a dated log row, and setext structure inside
a span. That is the intended direction, since the engine refuses rather than guesses. CHANGELOG states
it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.171.plan.deferred-work-placement-and-qa-results-residuals.md](task.171.plan.deferred-work-placement-and-qa-results-residuals.md)

The phases follow the seams the splitting test (create-task § 1.2) would cut along. Phase 1 is
independently shippable, and so is Phase 3. Phase 2 depends on neither. They are kept as one task at
the operator's request.

### Phase 1: Deferred Work has one home (Risk: Low)

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md` and its bundled copies (generated)

- [x] One statement of the record's heading (`## Deferred Work`) and position (immediately before the
      change-log block, otherwise before `## Progress Tracking` / `## Dev Agent Record`, never inside
      `## QA Testing Results`). The `:685` and `:737` paragraphs point at it instead of restating it
- [x] The statement carries one fenced `markdown` worked example of the record. The Phase 1 test
      extracts that fence by the subsection's own heading, not by the shared token `Deferred Work`
      (obs #135), so the test executes the documented shape rather than a copy of it
- [x] A test that executes the stated placement: it applies the documented write to a fixture that
      has a QA section, then runs `upsertQaResults` three times, and asserts the record survives
      unchanged
- [x] `npm run bundle`, `npm run bundle:check`

### Phase 2: engine residuals (Risk: Medium)

**Files**: `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`, bundled
copies (generated), `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`,
`docs/tasks/task.118.probes-executed-from-engine/task.118.probes-executed-from-engine.md` (one-line
repair)

- [x] `removesStructure` adds dated log rows (`isEntryRow`, imported) and setext H1/H2. Before
      committing, measure both on the 155 tracked sections: 0 false refusals is the bar, after the
      task.118 repair (REL-007/008, setext)
- [x] Carry: cross-name nesting dedupe (REL-028), level-bounded `####` blocks (REL-025), bold-label
      and singular forms (REL-027, legacy REL-030), folded heading kept as a bold line (CR-4)
- [x] REL-024 closed: a render ending in an HTML comment is refused (`trailing-comment`); the
      `trimSeparator` peel is unchanged (QA cycle 1, CR-6)
- [x] Write seams follow the document's line ending (CRLF)
- [x] A section stranded between a `## Change Log` heading and its marker block is treated as
      misplaced and relocated (CR-5)
- [x] Refusals return `detail`, and both Step 12 halts print it (PR review 5 CR-1). `multiple:<n>`
      replaces the halt's current `(<n> sections)` suffix, so the count is printed once
- [x] Remove `linksIn` and the unused `end` field (CR-2). N2 asserts the order (CR-3)
- [x] One unit test per residual, each mutation-proved, with the results recorded in the
      implementation report
- [x] `tests/qa-results-corpus.test.js` gains a write survey (the plan's measurement) asserting 0
      false refusals, 0 deletions and 0 non-idempotent writes over the tracked tree, with a
      non-vacuity floor

### Phase 3: create-bug-report heading check (Risk: Low)

**Files**: `skills/create-bug-report/SKILL.md`, `tests/create-bug-report-bug-reports-heading.test.js`

- [x] Task-mode Step 5 checks for the heading it writes (`### Bug Reports`, or the `####` / bold forms
      the engine carries), so a second filing appends to the existing list (obs #240)
- [x] A test asserts that the heading Step 5 checks is the heading Step 5 writes

### Phase 4: docs and validation (Risk: Low)

**Files**: `CHANGELOG.md`

- [x] CHANGELOG `[Unreleased]` cites `(task 171)` and states the new refusals
- [x] task.155's `## Deferred Work` items closed here are marked resolved with a link to this task
- [x] `npm run ci:fast`, `npm run bundle:check`, and `npm run validate` for qa-task, qa-story,
      create-bug-report, develop-task and develop-story

---

## 7. Files Summary

### Files to Modify

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the Deferred Work home
2. ✅ `shared/resources/qa-results.js`: the residuals
3. ✅ `shared/resources/tests/qa-results.test.mjs`: one test per residual
4. ✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`: halts print `detail`
5. ✅ `skills/create-bug-report/SKILL.md`: the Step 5 heading check
6. ✅ `docs/tasks/task.118.probes-executed-from-engine/task.118.probes-executed-from-engine.md`: the
   setext underline becomes a separator (one blank line)
7. ✅ `CHANGELOG.md`
8. ✅ `docs/tasks/task.155.qa-results-section-engine/task.155.qa-results-section-engine.md`: the
   `## Deferred Work` items closed here link to this task
9. ✅ `tests/qa-results-corpus.test.js`: the write survey (0 / 0 / 0)

### Files to Add

10. ✅ `tests/create-bug-report-bug-reports-heading.test.js`
11. ✅ `tests/deferred-work-placement.test.js`: the Phase 1 executed placement test

### Generated (`npm run bundle`, never edited by hand)

12. `skills/develop-story/references/develop-pipeline-step-5-6-qa-loop.md`,
    `skills/develop-task/references/develop-pipeline-step-5-6-qa-loop.md`,
    `skills/qa-task/references/qa-results.js`, `skills/qa-story/references/qa-results.js`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests (`shared/resources/tests/qa-results.test.mjs`)

- One case per residual, using the shapes the gates recorded. Each asserts both the `reason` and the
  resulting text, and asserts `detail` on every refusal.
- **Command**: `command node --test shared/resources/tests/qa-results.test.mjs`

### Corpus measurement (obs #117, the figures the guard re-measures)

- **Definition**: for every tracked `docs/**/*.md` that carries a section (`findQaResults`), run
  `upsertQaResults` with a probe section, plus the six fault-injection shapes task.155's QA used.
  Count three things: refusals of an unmodified document (false refusals), dated rows, markers or
  H1/H2 lost (deletions), and documents changed by a second identical write (non-idempotent).
- **Command**: the survey script in the plan file, landed as the write survey in
  `tests/qa-results-corpus.test.js`. The bar is 0 / 0 / 0. The test records the numbers, and this
  document does not state them.

### Behaviour tests

- Phase 1: the documented placement is executed against a fixture and survives three QA writes.
- Phase 3: the heading the check looks for equals the heading the write produces.
- The Step 12 wiring test (`tests/qa-results-step12-wiring.test.js`) is extended so that a refused
  write's stderr carries its `detail`.

### Regression

- `npm test`, including `qa-results-corpus.test.js` and `change-log.test.mjs`.

---

## 9. Success Criteria

### Functional

- [x] The step doc states one home for the loop-exit Deferred Work record. The executed placement
      test shows it surviving three QA writes
- [x] Every residual in § 2 either writes correctly or refuses with a `detail`, and the unit tests
      show which
- [x] Both Step 12 halts print the refusal `detail`
- [x] create-bug-report task mode checks for the heading it writes

### Performance

- [x] The engine, wiring and corpus tests run in under two seconds combined. A wall-clock bound no
      per-PR test can assert: measured by `time command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js`,
      with the figure recorded in the implementation report
- [x] No network access. Not applicable as a separate test: `qa-results.js` requires only
      `./change-log.js`, which is itself local and pure

### Code Quality

- [x] Corpus measurement: 0 false refusals, 0 deletions, 0 non-idempotent writes on the tracked tree,
      held by the write survey in `tests/qa-results-corpus.test.js`
- [x] Every new assertion is mutation-proved, and each result is recorded
- [x] `npm run ci:fast`, `npm run bundle:check` and `npm run validate` are clean for the touched skills

### Migration

- [x] CHANGELOG `[Unreleased]` cites `(task 171)` and names the new refusals
- [x] task.155's Deferred Work items closed here are marked resolved by a link to this task

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A new structural rule refuses a real QA cycle.**
   - Risk: dated rows or setext headings inside a QA-owned section would stop Step 12.
   - Probability: Low. task.155's measurement found one setext instance (task.118, repaired here) and
     0 sections with dated rows. · Impact: Medium (one QA cycle halts, with a named detail).
   - Mitigation: the corpus measurement runs before each rule is committed, and the bar is 0 false
     refusals.
2. **The Deferred Work home conflicts with an existing document layout.**
   - Risk: a document that already has `### Deferred Work` inside its QA section gains a second
     record.
   - Probability: Low (1 instance, task.141, accepted). · Impact: Low.
   - Mitigation: the engine keeps carrying the old block. The step doc says to append to an existing
     `## Deferred Work` and to leave an old in-section block in place.

### Low Risk Areas

1. **Bundled-copy drift.** `bundle:check` and the executed wiring test cover it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a QA Step 12 write is refused on a document that should be accepted, or content is
  lost.
- **Steps**: revert the PR. task.155's engine and step doc return unchanged.
- **Validation**: `npm test` is green on the reverted tree.

### Partial Rollback (1–2 hours)

- Each phase reverts independently. Phase 1 is prose plus one test. Phase 3 is one skill line plus
  one test.

### Forward Fix

- A false refusal is answered by narrowing the rule that fired, with a unit test. The refusal's
  `detail` names that rule.

### Rollback Triggers

- **Critical**: lost content, or a refused write on a tracked document.
- **Non-critical**: a duplicate-only shape that the corpus does not contain. Fix it forward.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-05
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.171.qa.5.deferred-work-placement-and-qa-results-residuals.md](./task.171.qa.5.deferred-work-placement-and-qa-results-residuals.md)
- **Gate File**: [task.171.gate.5.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.5.deferred-work-placement-and-qa-results-residuals.yml)

### Test Coverage Summary

- **Tests Executed**: 101
- **Phases Verified**: 4/4
- **Critical Issues**: 0 open
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Five QA cycles closed 13 findings this branch introduced or exposed. The setext check ended fence-blind after three cycles of fence-exemption narrowing. One pre-existing HIGH (the setext paragraph test exempts some paragraph-text lines; identical on origin/develop, 0 corpus instances) is routed to a follow-up task with two lows.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.171.qa.5.deferred-work-placement-and-qa-results-residuals.md` (5 cycles)
**Gate File**: `task.171.gate.5.deferred-work-placement-and-qa-results-residuals.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**Step 5c PR review**: ⚠️ CONCERNS (`task.171.pr-review.1.deferred-work-placement-and-qa-results-residuals.md`) — documentation findings acted on; code findings pre-existing or low, carried below

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 11/11 — functional (one Deferred Work home, residuals write or refuse with a detail, halts print the detail, create-bug-report heading check), performance (measured, see the DoD summary's SC5 note), code quality (corpus 0/0/0, mutation-proved, ci:fast/bundle:check/validate), migration (CHANGELOG, task.155 links)
✅ **Tests:** engine, wiring, corpus, placement and heading suites run per PR; CI `test` SUCCESS on `799b8f53`
✅ **PR:** #568
✅ **Documentation:** CHANGELOG `[Unreleased]`, step doc, three SKILL.md files, task.155 note
✅ **Security Review:** PASS — `boundary: internal` with a valid reason; no secrets or unsafe sinks
⚠️ **Compliance Review:** NOT_APPLICABLE — internal tooling

**Task marked as ACCEPTED on:** 2026-10-05

**Detailed Verification Log:** See `task.171.dod.1.deferred-work-placement-and-qa-results-residuals.md` for complete verification evidence and timestamps.

## Deferred Work

Carried from QA gate 5 `recommendations.future` and the Step 5c PR review
([`task.171.pr-review.1`](./task.171.pr-review.1.deferred-work-placement-and-qa-results-residuals.md)).
All five are gaps in `shared/resources/qa-results.js`; a follow-up task is still to be filed.

- **CR5-1** (HIGH, pre-existing — identical on `origin/develop`, 0 corpus instances) — the setext
  paragraph test exempts lines CommonMark reads as paragraph text (`#538 …`, an autolink, inline
  HTML, an ordered item not starting at 1), so a setext section they head is deleted on replace. This
  task closes the plain-text shape only.
- **5c CR-1** (medium, pre-existing) — a Version-first log (`| Version | Date | … |`) under a marker
  block loses its rows on relocate; count `isUnparsedRow` as a log row under `underLog`.
- **5c CR-2** (low) — a bold-label carried block stops at any heading, so a `####` group under a bold
  `**Bug Reports**` label is dropped on the next replace.
- **CR2-4** (low) — a bold Bug Reports block continues past QA's own `**Recommendations**:` when a
  list follows it, carrying a stale list.
- **CR-7** (low, gate 1) — setext false refusals after a list continuation line or a multi-line
  comment closer.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-01 | 1.0     | Initial draft | create-task |
| 2026-10-05 | 1.1     | Review passed (8/10) — named the corpus write-survey test, measured the performance bound, scoped the no-network criterion, added the worked-example extraction to Phase 1, added task.155 and the corpus test to Files Summary | review-task |
| 2026-10-05 |         | Status → ready-for-development | review-task |
| 2026-10-05 |         | Implemented — 16 files, 20 new tests (14 engine, 4 placement, 2 heading), 4 wiring/corpus assertions | develop |
| 2026-10-05 |         | QA gate CONCERNS (50/100) — 5 findings | qa-task |
| 2026-10-05 |         | QA gate CONCERNS (80/100) — 2 findings | qa-task |
| 2026-10-05 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-10-05 |         | QA gate CONCERNS (90/100) — 1 finding (cycle 4) | qa-task |
| 2026-10-05 |         | QA gate PASS (100/100) — 0 open findings, 1 pre-existing routed to follow-up | qa-task |
| 2026-10-05 |         | QA findings fixed — gate PASS (100/100), 4 iterations | qa-fix |
| 2026-10-05 | 1.2 | DoD verified — accepted (PR #568) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: Deferred Work has one home
- [x] Phase 2: engine residuals
- [x] Phase 3: create-bug-report heading check
- [x] Phase 4: docs and validation

---

## References

- task.155: [`task.155.qa-results-section-engine.md`](../task.155.qa-results-section-engine/task.155.qa-results-section-engine.md), § Deferred Work. Gates 3–10 hold the residuals in `recommendations.future`, and PR reviews 3–5 hold the review findings
- PR #537 (merged `52faad19`)
- Observation #240: create-bug-report checks for an H2 but writes an H3
- Observation #242: related context (review-task has no check for other writers inside a region a plan replaces whole), out of scope here
- `shared/resources/change-log.js`: `isEntryRow` / `RE_ENTRY_ROW`, reused

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.171.qa.{N}.deferred-work-placement-and-qa-results-residuals.md`,
  `task.171.gate.{N}.deferred-work-placement-and-qa-results-residuals.yml`, bug reports `task.171.bug.{N}.{name}.md`.
- This task's own QA Step 12 writes go through the engine it changes, as task.155's did.
