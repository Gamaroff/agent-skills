---
id: task.183
title: "[Task 183] qa-results setext and carry follow-ups"
type: task
description: "Follow-up to task.171. Work the five items in task.171's `## Deferred Work` section, all in `shared/resources/qa-results.js`: closes the HIGH setext deletion path (CR5-1), a Version-first log lost on relocate and a bold-label `####` boundary; defers the two setext false refusals (CR-7) and the stale QA list carry (CR2-4) after QA showed fixing them deleted content. Also make the corpus survey cheaper and its timing bound honest."
tags: [qa-task, qa-story, engine, follow-up]
category: refactoring
status: accepted
priority: High
created: 2026-10-05
updated: 2026-10-05
assignee:
estimated_effort_hours: 8
github_issue: 569
completed_date: 2026-10-05
pr_number: 571
---

# Technical Task: qa-results setext and carry follow-ups

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.183.review.1.qa-results-setext-and-carry-follow-ups.md` implemented 2026-10-05

**GitHub Issue**: [#569](https://github.com/Gamaroff/agent-skills/issues/569)

---

## 1. Overview

task.171 (PR #568, merged as `dd09f908`) closed task.155's recorded residuals in
`shared/resources/qa-results.js`. Its QA loop and its Step 5c PR review left five items, all recorded
under task.171's `## Deferred Work`. One is HIGH: a setext section headed by certain paragraph text
is still deleted when the QA section above it is replaced. This task closes three of the five, HIGH first, defers two (CR-7, CR2-4 — see `## Deferred Work`), and
makes the corpus write survey cheaper so its timing bound stops depending on machine load.

**Scope:** one task in five phases. The items share one engine and one test file, and none of them
is worth shipping alone, so they are not split (§ 1.2 splitting test).

**Key deliverables:**

1. The setext check leans toward refusal: a non-blank line over an `=`/`-` underline is a heading
   candidate unless it certainly is not paragraph text (CR5-1).
2. **CR-7 deferred** (second QA escalation, operator decision 2026-10-05): both setext false
   refusals stay refused, and the item moves to `## Deferred Work` below — it needs a real CommonMark
   parser, not line-by-line inference.
3. A change log whose header has a `Date` column in any position keeps its rows on relocate (5c CR-1).
4. A bold-label carried block keeps its `####` groups (5c CR-2). CR2-4 is deferred (second QA
   escalation follow-up, cycle 5): stopping at QA-sounding labels dropped grouped bug lists.
5. The corpus write survey pre-filters documents, and the timing criterion records the load it was
   measured under and is re-measured at finalise.

**Expected outcome:** no shape recorded in task.171's Deferred Work deletes content. Each either
writes correctly or refuses with a `detail`, and the setext residual is closed for every shape the
QA cycle 5 review reproduced, not just plain text.

---

## 2. Motivation

### Current Problems

1. **A setext section is deleted on replace (CR5-1, HIGH).** `removesStructure` treats a line over
   an underline as a heading only when `RE_NOT_PARAGRAPH` does not match the line above it
   (`shared/resources/qa-results.js:283`, `RE_NOT_PARAGRAPH`; `:314`, the setext clause). That pattern
   exempts lines CommonMark reads as paragraph text: `#538 Rollout Notes` (no space after `#`, so not
   ATX), an autolink `<https://…>`, inline `<b>…</b>`, a three-backtick code span, an ordered item
   that does not start at 1 (it cannot interrupt a paragraph), and an HTML type-7 line. Measured on
   the merged engine with `command node -e` (the task.171 gate 5 probe, re-run at review 1): all six shapes return
   `replaced` and delete the section's body, under both `-----` and `=====`; plain `Rollout Notes`, the
   control shape, is refused (`unbounded`).
   `origin/develop` before task.171 deleted all six.
2. **A Version-first change log loses its rows on relocate (5c CR-1).** Under a marker block, the
   `underLog` guard counts a row as a log row only when it starts with an ISO date (`isEntryRow`) or
   sits under a header whose first cell is `Date` (`RE_LOG_HEADER`, `:92`; the `logRow` test,
   `:307`). A `| Version | Date | … |` log matches neither, so a relocate deletes its rows.
3. **A bold-label block drops its `####` groups (5c CR-2).** A bold-label carried block stops at any
   heading (`/^#{1,6}[ \t]/` in `collectBlocks`' `stops`, `:196`). A `**Bug Reports**` label over a
   `#### From cycle 2` group therefore carries only the label, and the next replace deletes the
   grouped links. A `###` heading block already runs to the next heading of its own level or
   shallower.
4. **A bold-label block carries QA's stale list (CR2-4).** Since task.171 QA cycle 1, a bold
   sub-label continues the block when a list follows it (`introducesList`, `:183`). A bold
   `**Bug Reports**` block therefore runs on past a QA-owned `**Recommendations**:` label and its
   list, so a stale recommendations list is carried into every later write.
5. **Two setext false refusals (CR-7, low).** A `---` thematic break after a list item's
   continuation line (`- item` / `  continued` / `---`), or after a multi-line HTML comment's closing
   `-->`, is refused as a setext heading. Both refuse with a `detail`; neither deletes.
6. **The timing bound passed on a stale figure.** task.171's criterion "engine, wiring and corpus
   tests under 2 s" measured 1.62–1.78 s quietly but 3.72–4.22 s at load average ~5, and finalise
   passed it on the earlier figure (observation #268). The write survey calls `findQaResults` on every
   tracked document (`tests/qa-results-corpus.test.js:246`), while the stacking test beside it
   pre-filters on `text.includes("QA Testing Results")` (`:98`).

### Benefits of Solution

- The QA writer stops deleting setext sections for every shape QA reproduced (CR5-1 closed, not
  narrowed). Observation #267 recorded how task.171 passed with this open.
- Change logs keep their rows whatever their column order.
- Carried Bug Reports and Deferred Work lists keep their `####` groups and stop carrying QA's own
  stale text.
- The timing criterion records its conditions and is re-measured where it is relied on.

---

## 3. Technical Background

### Current Architecture

- **Setext check:** `RE_SETEXT` (`shared/resources/qa-results.js:282`) and `RE_NOT_PARAGRAPH`
  (`:283`, `/^[ \t]*(?:$|\||[-*+][ \t]|\d+[.)][ \t]|>|#|```|~~~|<)/`), used in `removesStructure`
  (`:291`). The check is fence-blind by design since task.171 QA cycle 4 (the REL-016 trade).
- **Log-row guard:** `removesStructure`'s `logTable` / `logRow` (`:305`–`:312`), active under
  `underLog` only; `RE_LOG_HEADER` (`:92`, first cell `Date`); `isEntryRow` imported from
  `change-log.js`.
- **`change-log.js`:** `isUnparsedRow` (`shared/resources/change-log.js:88`) is **not exported**
  (`module.exports` lists `isEntryRow` and `RE_ENTRY_ROW` only). It also returns `true` for any data
  row of a non-log table (`| Phase 1 | PASS |`), so it is not used here (operator decision, 2026-10-05).
- **Carried blocks:** `collectBlocks` (`:168`), with `RE_BOLD_LABEL` (`:161`), `introducesList`
  (`:183`) and `stops` (`:191`–`:198`). Heading blocks stop at a heading of their own level or
  shallower; bold-label blocks stop at any heading, or at a bold label that does not introduce a list.
- **Corpus survey:** `tests/qa-results-corpus.test.js`, write survey at `:238`, engine-independent
  `allowance()`.

### Target Architecture

- **Setext leans toward refusal.** A non-blank line over an underline is a heading candidate unless
  it is **certainly** not paragraph text: a real ATX heading (`#{1,6}` followed by a space or end of
  line), a valid fence opener (three or more backticks or tildes, and a backtick opener whose rest
  holds no backtick), a list item that can interrupt a paragraph (a bullet, or an ordered item
  starting at `1`), a block quote, a table row, or an HTML comment line. Everything else is a
  candidate, so each CR5-1 shape is refused.
- **CR-7 is deferred, not fixed** (amended twice on 2026-10-05, QA escalations 1 and 2). Both
  false refusals were first fixed by inferring their context line by line — a comment closer, then a
  list continuation — and each inference was beaten by shapes it did not anticipate (a fence, a
  one-line comment opener, a thematic break, an HTML block, a tab), each one deleting a setext
  section `origin/develop` refused. Both shapes keep the safe false refusal; the setext check is
  `origin/develop`'s check with the narrower `notParagraph` exemption. See `## Deferred Work`.
- **A log table is a table with a `Date` column.** Under `underLog`, a table whose header has a cell
  reading `Date` in **any** position is a log table, and each of its data rows is a log row. The
  header row is excluded by the same Date-column test that starts the table, not by `RE_LOG_HEADER`
  (review 1, I2). A QA table with no `Date` column is unaffected.
- **Bold-label boundaries.** A bold-label block stops at a heading of level 3 or shallower, as a `###`
  heading block does, so `####` groups stay inside it. **No QA-label stop** (amended at QA cycle 5):
  a stale QA list after a carried block and a bug list grouped under a sub-label are the same shape,
  and stopping at the label deleted the grouped list (CR4-3, CR5-1). CR2-4 is deferred.
- **Survey pre-filter.** The write survey skips a document that does not mention
  `QA Testing Results` before calling `findQaResults`, as the stacking test already does.

### Same-class mechanism inventory (obs #103)

- `removesStructure` is the only structural guard. This task **narrows** its setext exemption and
  **extends** its log-table recognition; it adds no second guard.
- `collectBlocks`' `stops` is the only block-boundary rule. This task **changes** two of its clauses.
- `RE_QA_FIELD` is the only list of QA-owned lines. (A `QA_LABELS` list beside it was added and
  then removed in QA — see CR2-4 in `## Deferred Work`.)

---

## 4. Scope

### In Scope

- ✅ The five items in task.171's `## Deferred Work` — CR5-1, 5c CR-1 and 5c CR-2 closed; CR-7 and
  CR2-4 deferred to this task's `## Deferred Work` after QA
- ✅ The write-survey pre-filter and the restated timing criterion
- ✅ One unit test per item, each mutation-proved; bundled copies regenerated
- ✅ task.171's `## Deferred Work` items marked resolved or deferred, with a link to this task
- ✅ CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ Making the setext check fence-aware again. task.171 QA cycles 2–4 tried that three times and
  each attempt was beaten by a fence mis-pairing; the fence-blind trade stands.
- ❌ observation #267 (qa-task's provenance rule against a task's own scope). That changes the QA
  skills, not this engine, and needs its own task.
- ❌ Exporting `isUnparsedRow` from `change-log.js` (operator decision: the Date-column rule instead).

---

## 5. Breaking Changes

None to any public contract. More writes are refused, each with a `detail`: a section whose span
holds a setext heading under any paragraph-text line, and a misplaced section spanning a data row
of any table that has a `Date` column. These refuse rather than delete, which is the intended
direction. No shape that was refused is newly written: the CR-7 false refusals are deferred.
CHANGELOG states all of these.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.183.plan.qa-results-setext-and-carry-follow-ups.md](task.183.plan.qa-results-setext-and-carry-follow-ups.md)

### Phase 1: setext leans toward refusal — CR5-1 (Risk: Medium)

**Files**: `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`

- [x] Replace `RE_NOT_PARAGRAPH` with a "certainly not paragraph text" test (ATX heading, valid fence
      opener, interrupting list item, block quote, table row, HTML comment line)
- [x] A test refuses each of the six CR5-1 probe shapes with `structural-line:<line> / -----`, under
      both `-----` and `=====`, and keeps every byte of the document
- [x] Measure on the corpus before committing: 0 false refusals is the bar

### Phase 2: two setext false refusals — CR-7 (deferred at the second QA escalation)

**Files**: `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`

- [x] The context inference (comment closer, list continuation) is removed after four QA cycles
      found deletions through it; CR-7 moves to `## Deferred Work`
- [x] A test refuses both CR-7 shapes and every shape that beat the inference; Phase 1's CR5-1 test
      still refuses every one of its shapes

### Phase 3: a log table is a table with a Date column — 5c CR-1 (Risk: Low)

**Files**: `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`

- [x] Under `underLog`, a table whose header has a `Date` cell in any position is a log table
- [x] `logRow` excludes that header row by the same Date-column test, so the refusal names the first
      data row, not the header
- [x] A test refuses a misplaced section above a `| Version | Date | … |` log with
      `structural-line:<first data row>`, and a QA table with no `Date` column stays writable

### Phase 4: bold-label boundaries — 5c CR-2 (CR2-4 deferred at QA cycle 5)

**Files**: `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`

- [x] A bold-label block stops at a heading of level 3 or shallower
- [x] ~~`QA_LABELS` beside `RE_QA_FIELD`~~ — added, then removed at QA cycle 5 (it dropped grouped
      bug lists); CR2-4 deferred
- [x] Tests: a `####` group under `**Bug Reports**` survives three writes; a bug list grouped under
      any sub-label survives; a stale list is carried once, never doubled

### Phase 5: survey pre-filter, timing and docs (Risk: Low)

**Files**: `tests/qa-results-corpus.test.js`, `CHANGELOG.md`,
`docs/tasks/task.171.deferred-work-placement-and-qa-results-residuals/task.171.deferred-work-placement-and-qa-results-residuals.md`

- [x] The write survey skips documents that do not mention `QA Testing Results`
- [x] Record the timing with `uptime` beside `time`, in the implementation report
- [x] task.171's Deferred Work items marked resolved, with a link to this task
- [x] CHANGELOG `[Unreleased]` cites `(task 183)` and names the new refusals and the two shapes now
      written
- [x] `npm run bundle`, `npm run bundle:check`, `npm run ci:fast`, `npm run validate` for qa-task and
      qa-story

---

## 7. Files Summary

### Files to Modify

1. ✅ `shared/resources/qa-results.js`: Phases 1–4
2. ✅ `shared/resources/tests/qa-results.test.mjs`: one test block per item
3. ✅ `tests/qa-results-corpus.test.js`: survey pre-filter
4. ✅ `CHANGELOG.md`
5. ✅ `docs/tasks/task.171.deferred-work-placement-and-qa-results-residuals/task.171.deferred-work-placement-and-qa-results-residuals.md`:
   Deferred Work items marked resolved

### Generated (`npm run bundle`, never edited by hand)

6. `skills/qa-task/references/qa-results.js`, `skills/qa-story/references/qa-results.js`

### Files to Add

None.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests (`shared/resources/tests/qa-results.test.mjs`)

- One block per item, built from the shapes the task.171 reviews reproduced. Each asserts the
  `reason`, the `detail` on a refusal, and that the document is byte-identical on a refusal.
- **Command**: `command node --test shared/resources/tests/qa-results.test.mjs`

### Corpus measurement

- The write survey in `tests/qa-results-corpus.test.js` holds the tracked tree at 0 false refusals,
  0 deletions and 0 non-idempotent writes, measured by its own line scan. It runs before each
  Phase 1–4 rule is committed, and again at the end.

### Mutation proofs

- Every new assertion is mutation-proved per `references/mutation-proving.md` (snapshot, revert,
  confirm red, restore), and each result is recorded in the implementation report.

### Regression

- `npm run ci:fast`; the existing A–Q engine blocks, the placement test and the wiring test.

---

## 9. Success Criteria

### Functional

- [ ] Each of the six CR5-1 probe shapes is refused with a `detail` under both underlines, and the
      document is unchanged (Phase 1 test)
- [ ] Both CR-7 shapes stay refused (deferred), as do the shapes that beat the removed inference,
      and every CR5-1 shape is still refused (Phase 2 test)
- [ ] A misplaced section above a `| Version | Date | … |` log is refused, never relocated with row
      loss, and a section quoting a table without a `Date` column is still writable (Phase 3 test)
- [ ] A `####` group under a bold `**Bug Reports**` label survives three writes, and a bug list
      grouped under any sub-label is carried whole (Phase 4 tests; CR2-4 deferred)

### Performance

- [ ] Engine, wiring and corpus tests under 2 s combined. A wall-clock bound no per-PR test can
      assert: measured with `time command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js`,
      with `uptime` load recorded beside the figure in the implementation report, and re-measured at
      finalise under the conditions recorded there
- [ ] No network access. Not applicable as a separate test: `qa-results.js` requires only
      `./change-log.js`

### Code Quality

- [ ] Corpus write survey 0 / 0 / 0 on the tracked tree (`tests/qa-results-corpus.test.js`)
- [ ] Every new assertion mutation-proved, each result recorded
- [ ] `npm run ci:fast`, `npm run bundle:check`, and `npm run validate -- skills/qa-task/` and
      `skills/qa-story/` clean

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 183)` and names the new refusals and the newly written
      shapes
- [ ] task.171's `## Deferred Work` items closed here link to this task

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The wider setext rule refuses a real QA cycle.**
   - Risk: a QA render or a tracked section holds a paragraph-text line over `---`, which is now
     refused at Step 12.
   - Probability: Low. A scan of every tracked QA section on 2026-10-05 found 0 non-blank lines over
     an `=`/`-` underline (task.171 QA report 5, provenance). · Impact: Medium (one QA cycle halts with
     a named `detail`).
   - Mitigation: measure with the corpus survey before committing Phase 1. The halt's repair hint
     already names setext.

### Low Risk Areas

1. **CR-7 context reopens a CR5-1 shape.** Mitigation: Phase 2's test re-asserts every CR5-1 shape.
2. **A stale QA list is carried** (CR2-4, deferred). Impact: a duplicate, never a deletion.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a QA Step 12 write is refused on a document that should be accepted, or content is
  lost.
- **Steps**: revert the PR. task.171's engine returns unchanged.
- **Validation**: `npm test` is green on the reverted tree.

### Partial Rollback (1–2 hours)

- Each phase reverts alone; each touches its own clause in `qa-results.js` and its own test block.

### Forward Fix

- A false refusal is fixed by narrowing the rule that fired, with a test. The refusal's `detail`
  names that rule.

### Rollback Triggers

- **Critical**: lost content, or a refused write on a tracked document.
- **Non-critical**: a duplicate-only shape the corpus does not contain. Fix it forward.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-05
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.183.qa.6.qa-results-setext-and-carry-follow-ups.md](./task.183.qa.6.qa-results-setext-and-carry-follow-ups.md)
- **Gate File**: [task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml](./task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml)

### Test Coverage Summary
- **Tests Executed**: 98
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 5's fix holds: CR5-1, CR5-2 and CR5-3 are fixed, and no gating finding remains. Three advisory lows: the "any sub-label" claim over-reaches a pre-existing paragraph-first shape (CR6-1), the Change Log rows are out of order (CR6-2), and § 3 says two `collectBlocks` clauses changed where one did (CR6-3).

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.183.qa.6.qa-results-setext-and-carry-follow-ups.md` (6 cycles)
**Gate File**: `task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**Step 5c PR review**: ⚠️ CONCERNS — `task.183.pr-review.1.qa-results-setext-and-carry-follow-ups.md` (two pre-existing mediums, two lows; advisory)

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 11/11 — functional (CR5-1 shapes refused; CR-7 stays refused, deferred; Version-first log refused; `####` groups and grouped bug lists carried, CR2-4 deferred), performance (1.50 s / 1.52 s warm at load 3.49, re-measured at finalise), code quality (corpus 0/0/0, mutation-proved, ci:fast / bundle:check / validate), migration (CHANGELOG, task.171 links)
✅ **Tests:** engine, wiring and corpus suites run per PR; CI `test` SUCCESS on `3d6f027a`
✅ **PR:** #571
✅ **Documentation:** CHANGELOG `[Unreleased]`, task.171 Deferred Work, bundled qa-task / qa-story copies
✅ **Security Review:** PASS — `boundary: internal` with a valid reason; no secrets or unsafe sinks
⚠️ **Compliance Review:** NOT_APPLICABLE — internal tooling

**Task marked as ACCEPTED on:** 2026-10-05

**Detailed Verification Log:** See `task.183.dod.1.qa-results-setext-and-carry-follow-ups.md` for complete verification evidence and timestamps.

## Deferred Work

Carried from the second QA escalation (gate 4, 2026-10-05, operator decision), QA cycle 5's fix and
gates 2–4 `recommendations.future`. All four are gaps in `shared/resources/qa-results.js`.

- **CR-7** (low, from task.171 gate 1) — setext false refusals after a list continuation line or a
  multi-line comment closer. Not fixed here: inferring either context line by line deleted real
  setext sections through six shapes across QA cycles 1–4 (a thematic break, a fence, one-line and
  item-indented comment openers, an HTML block, a tab). Fix it with a real CommonMark parser, or
  accept the false refusal.
- **CR2-3** (medium, pre-existing — identical on `origin/develop`, 0 corpus hits) — a carried bold
  label with the colon inside the bold (`**Deferred Work:**`) is not recognised as a carried block,
  so its items are deleted on replace.
- **CR2-4** (low, from task.171 5c review) — a bold Bug Reports block carries a QA-owned
  `**Recommendations**:` list that follows it, so a stale list repeats into later writes (a
  duplicate, never a deletion). Not fixed here: a stale QA list and a bug list grouped under a
  sub-label are the same shape, and stopping at QA-sounding labels deleted grouped bug lists in QA
  cycles 4–5 (CR4-3, CR5-1). Needs a marker that tells QA-written text from a carried list.
- **CR4-4** (low) — a QA-owned `####` heading after a carried bold-label block is carried as stale
  text (a duplicate, never a deletion). No QA render emits `####`; 0 of 235 tracked QA documents
  have the shape.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-05 | 1.0     | Initial draft — follow-up to task.171 Deferred Work | create-task |
| 2026-10-05 | 1.1     | Review passed (9/10) — bounded the HTML-comment context (I1), Phase 3 header exclusion (I2), corrected the CR5-1 probe figure | review-task |
| 2026-10-05 |         | Status → ready-for-development | review-task |
| 2026-10-05 |         | Implemented — 9 files (3 generated), 4 tests (R1–R4), 9 mutation proofs held | develop |
| 2026-10-05 |         | QA gate FAIL (70/100) — 3 findings (1 high) | qa-task |
| 2026-10-05 |         | QA gate FAIL (70/100) — 2 findings (1 high), 2 advisory | qa-task |
| 2026-10-05 |         | QA gate FAIL (60/100) — 2 findings (2 high); loop not converging, escalated | qa-task |
| 2026-10-05 |         | Escalation resolved (operator): comment-closer exemption dropped (CR-7 list shape only); marker-less table-above check back to Date-first (CR3-2) — § 1, § 3, § 5, Phase 2, § 9 amended | develop |
| 2026-10-05 |         | Second escalation resolved (operator): list-continuation inference removed, CR-7 deferred to Deferred Work; Critical Issues / Issues Found dropped from QA_LABELS (CR4-3) — § 1, § 3, § 5, Phase 2, § 9 amended | develop |
| 2026-10-05 |         | QA gate CONCERNS (90/100) — 3 findings (0 high) | qa-task |
| 2026-10-05 |         | QA findings fixed — 5 cycles, 3 fix rounds (2 operator escalation fixes); CR-7 and CR2-4 deferred | qa-fix |
| 2026-10-05 |         | QA gate FAIL (50/100) — 3 findings (2 high); loop not converging, escalated again | qa-task |
| 2026-10-05 |         | QA gate PASS (100/100) — 0 findings (3 advisory lows) | qa-task |
| 2026-10-05 | 1.2 | DoD passed — accepted (PR #571) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: setext leans toward refusal (CR5-1)
- [x] Phase 2: two setext false refusals (CR-7) — deferred
- [x] Phase 3: a log table is a table with a Date column (5c CR-1)
- [x] Phase 4: bold-label boundaries (5c CR-2, CR2-4)
- [x] Phase 5: survey pre-filter, timing and docs

---

## References

- task.171: [`task.171.deferred-work-placement-and-qa-results-residuals.md`](../task.171.deferred-work-placement-and-qa-results-residuals/task.171.deferred-work-placement-and-qa-results-residuals.md), § Deferred Work; QA gate 5 `recommendations.future`; Step 5c PR review 1
- PR #568 (merged `dd09f908`)
- Observation #267: qa-task provenance classes an in-scope residual as pre-existing
- Observation #268: measured wall-clock criteria pass at finalise on a stale, load-unqualified figure
- CommonMark: setext headings; list items and HTML blocks that can interrupt a paragraph

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.183.qa.{N}.qa-results-setext-and-carry-follow-ups.md`,
  `task.183.gate.{N}.qa-results-setext-and-carry-follow-ups.yml`, bug reports `task.183.bug.{N}.{name}.md`.
- This task's own QA Step 12 writes go through the engine it changes, as task.171's did.
