---
id: task.230
title: "Keep foreign sections out of the change-log block"
type: task
description: "change-log.js lifts any sibling section it finds inside the change-log markers back above them, the placement rules anchor on the marker, and a corpus guard holds the tree clean."
tags: [develop-task, finalise, observation, change-log]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-22
updated: 2026-10-23
assignee:
estimated_effort_hours: 16
github_issue: 734
pr_number: 735
completed_date: 2026-10-23
---

# Technical Task: Keep foreign sections out of the change-log block

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.230.review.1.change-log-block-foreign-sections.md` implemented 2026-10-22
**GitHub Issue**: [#734](https://github.com/Gamaroff/agent-skills/issues/734)

---

## 1. Overview

A section written between `<!-- change-log-start -->` and the table ends up inside the Change Log.
On the next row append, `change-log.js` folds it into the log, and nothing warns. On task.229 this
happened to the QA loop's `## Deferred Work` (observation #91). Four accepted tasks already carry
their `## Definition of Done - PASSED ✅` inside the block the same way.

This task fixes both ends and adds a guard:

- **The engine.** When it rebuilds the block, `change-log.js` lifts every sibling section out of
  the markers instead of absorbing it.
- **The placement rule.** The Deferred Work rule names the marker, not the heading.
- **The guard.** A corpus test fails when any tracked document has a foreign section inside its
  markers.

**Scope:** `shared/resources/change-log.js` and its tests; the Deferred Work rule in
`develop-pipeline-step-5-6-qa-loop.md`; the Markers section of `document-change-log.md`; one new
corpus test; a repair of the four affected task documents; CHANGELOG.

**Key deliverables:**

- `liftForeignSections(content)` and `foreignSections(content)` in `change-log.js`, one definition
  of "foreign", and `upsertChangeLog` lifts through it on every write.
- A marker-anchored Deferred Work placement rule in the same words finalise 7.4 uses.
- `evals/shared/tests/change-log-foreign-section-corpus.test.mjs`, with zero offenders and a
  non-vacuity floor. task.166, 170, 175 and 203 are repaired.

**Expected outcome:** no writer can leave a section inside the change-log block for longer than
one write. The corpus guard turns red on any document that holds one.

---

## 2. Motivation

### Current Problems

- **Problem 1: a placement rule anchored on a heading that can sit on either side of the marker.**
  "Where the Deferred Work record goes" says "immediately before the change-log block (before the
  `## Change Log` heading when one sits directly above the marker block)"
  (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:771`, *"Absent → create it"*). The
  canonical heading lives **inside** the markers (`shared/resources/document-change-log.md:88`,
  *"The heading lives inside the markers."*). An author who reads "before the heading" therefore
  writes between the marker and the heading, which is inside the block.
- **Problem 2: the engine absorbs foreign content silently.** `splitCarriedLines`
  (`shared/resources/change-log.js:274`) drops only the first Change Log heading and carries every
  other non-table line, a sibling `##` included, as `before` / `after` prose. `buildChangeLogBlock`
  (`change-log.js:218`) then emits it inside the regenerated block, after the heading
  (`upsertChangeLog`, `change-log.js:607` → `:691`). The write exits normally and reports nothing.
- **Problem 3: rewording alone has already failed once.** Finalise 7.4 was reworded for the DoD
  section to say "never between the markers" (`skills/finalise/SKILL.md:1369`, obs #229). Four
  accepted tasks still carry a DoD section inside the block, and the second writer (the QA loop's
  Deferred Work) reached the same hazard on 2026-10-22.
- **Problem 4: the damage is invisible.** The four affected documents read as well-formed. Their
  DoD summary simply sits under `## Change Log`, above the table. No test reads the layout.

### Benefits of lifting in the engine

- **Convergence instead of discipline.** Every row append repairs the block, whichever writer
  misplaced the section. This is the same shape as the obs #104 heading absorption already in
  `upsertChangeLog` (`change-log.js:651`).
- **Nothing is lost.** The text moves and is never dropped, which keeps the bug.13 rule that a
  machine writer never deletes human text.
- **One definition of "foreign".** It is shared by the write path, the corpus guard and the repair.
  The three cannot disagree about what counts.
- **A standing guard.** The corpus test turns the next misplacement red in CI, not at the next
  finalise.

---

## 3. Technical Background

### Current Architecture

- `findChangeLog(content)` (`shared/resources/change-log.js:494`) locates the block. It picks the
  earliest marker pair (current or one of `LEGACY_MARKER_PAIRS`) and returns
  `{ start, end, level, legacyAuthor, hasMarkers: true }`. Without markers it falls back to a
  hand-written heading, whose span ends at the next heading of the same or shallower level, so a
  sibling section can never sit inside an unmarked log. **The defect exists only on the marker
  path.**
- `splitCarriedLines(content, found)` (`change-log.js:274`) walks the span. It strips the boundary
  markers, drops the first heading matching `RE_HEADING` (`headingSeen`), and classifies pipe-lines
  up to the first nested heading as the table. Everything else is carried: before the table goes
  to `before`, after it to `after`. Fenced and inline-code lines are protected and carried verbatim.
- `upsertChangeLog(content, entry, { docType })` (`change-log.js:599`) rebuilds the block from
  `splitCarriedLines` output. On the marker path it also absorbs a hand-authored Change Log heading
  directly above the start marker (`change-log.js:651`, obs #104).
- **The second mechanism already in the tree (obs #103).** `shared/resources/qa-results.js` moves
  its **own** section out of the block: `upsertQaResults` returns `relocated` for a
  `## QA Testing Results` found inside the change-log block (`qa-results.js:20`). It imports
  `findChangeLog` and the protection helpers from `change-log.js` rather than re-deriving them
  (`qa-results.js:77`). It relocates one named section, at QA time, as part of a replace-in-place
  write.
- **What the corpus shows.** With markers matched only on a line of their own, four tracked task
  documents have a sibling H2 inside the block: task.166, task.170, task.175 and task.203, each a
  `## Definition of Done - PASSED ✅`. task.203 (`:718`–`:763`): start marker, `## Change Log`,
  `## Definition of Done - PASSED ✅`, its body, then the table. Substring matching gives 60 hits;
  most are documents quoting the markers in prose. **The guard records its own count (§8).** This
  figure is how the problem was found, not a number to test against.

### Target Architecture

- **One predicate for "foreign".** Inside a marker block, a foreign section starts at an unprotected
  ATX heading whose level is **at or above the log's own level** (`found.level`) and that is not a
  Change Log heading (`RE_HEADING`). It runs to the end of the side of the table it sits on: from
  the heading to the last `before` line, or from the heading to the last `after` line. A nested
  heading deeper than the log's level is the log's own subsection and stays. That is section I's
  behaviour today (`shared/resources/tests/change-log.test.mjs:1289`).
- **The partition runs before table classification.** `splitCarriedLines` classifies every
  unfenced pipe-line from the first one on as the log's table, so a foreign section that holds its
  own pipe table *before* the log table would have its rows taken into the log (today they are
  emitted as unparsed rows inside it). The split therefore runs inside `splitCarriedLines`, over
  the `[line, fenced]` pairs, before `flags` is computed. Where a foreign section ends, and which
  table is the log's, is stated once, in the header comment of `partitionForeign` in
  `shared/resources/change-log.js`. QA cycle 1 revised it: a document-wide first entry row let a
  foreign dated table win, so the log's table is now chosen among the tables at or after its
  heading, by its header or its entry rows. A pipe table a foreign section holds moves with it.
- **`foreignSections(content)`** returns the foreign sections of the document's change-log block,
  each with its heading line and side (`before` / `after`), or `[]`. It is read-only, and is what
  the guard and the tests call.
- **`liftForeignSections(content)`** returns `{ content, lifted }`. `before`-side sections move to
  directly above the start marker. `after`-side sections move to directly below the end marker.
  Order and text are kept byte for byte, apart from the seam blank lines, which `trimSeam`
  normalises as it already does (`change-log.js:780`).
- **`upsertChangeLog`** uses the same partition on the marker path. It never emits a foreign section
  inside the rebuilt block; it places the lifted text outside the markers in the same write. It
  composes with the obs #104 heading absorption: absorption pops a heading directly above the
  start marker first, and then the lifted `before` sections go between the head content and the
  block.
- **Relationship to `qa-results.js` `relocated`: it sits beside it and replaces nothing.**
  `upsertQaResults` keeps relocating its own section on its own replace-in-place write. Its
  canonical position is the same place this lift puts it, directly before the block, so the two
  agree. After this task a `## QA Testing Results` misplaced inside the block is fixed by whichever
  write comes first. Folding `relocated` into the lift is out of scope: `qa-results.js` also
  replaces the section, a different write rule, and its header explains why the two engines stay
  apart (`qa-results.js:57`).
- **The placement rule** in `develop-pipeline-step-5-6-qa-loop.md` names the marker, in finalise
  7.4's wording: "before a `## Change Log` heading that sits directly above
  `<!-- change-log-start -->`, else before the marker itself — never between the markers".

### Important Clarifications

- **This is a move, never a delete.** Every lifted line appears outside the markers in the output.
  A test asserts that the multiset of non-blank lines is unchanged apart from the appended row.
- **Fenced pictures are not sections.** A `## Example` inside a fence within the block is protected
  and stays put. `foreignSections` uses the same protected ranges as `splitCarriedLines`.
- **An H3 log follows the same rule one level down.** A PRD's nested `### Change Log` treats a
  sibling `### Foo` as foreign and keeps a `#### Note` (`found.level` is 3).
- **Legacy marker pairs** take the same path. A foreign section inside a `jira-sync-changelog`
  block is lifted on the write that migrates it.

---

## 4. Scope

### In Scope

✅ `change-log.js`: `foreignSections`, `liftForeignSections`, and lifting inside `upsertChangeLog`,
on both sides of the table
✅ Tests in `shared/resources/tests/change-log.test.mjs`: red first, plus control cases and
mutation proof
✅ The Deferred Work placement rule in `develop-pipeline-step-5-6-qa-loop.md`, anchored on the marker
✅ The Markers section of `document-change-log.md`: nothing but the log lives inside the markers, and
the engine lifts what it finds
✅ A new corpus guard, `evals/shared/tests/change-log-foreign-section-corpus.test.mjs`
✅ Repair of task.166, task.170, task.175 and task.203 through `upsertChangeLog`
✅ `npm run bundle` for every skill that bundles `change-log.js` or the two edited Markdown files,
and a CHANGELOG entry

### Out of Scope

❌ Folding `qa-results.js`'s `relocated` into the lift. It is a separate write rule; see §3.
❌ A CLI flag for lifting. The repair is a one-off and runs through the engine's own write path.
❌ Changing where finalise 7.4 or 8.4 place their sections. Their wording is already
marker-anchored (`skills/finalise/SKILL.md:1367`, `:2551`).
❌ Content inside a discarded legacy block (`collapseOtherLegacyBlocks`). Only the kept block is
partitioned.

---

## 5. Breaking Changes

### Breaking Change 1: `upsertChangeLog` moves sibling sections out of the block

**What changed:** a document whose marker block holds a sibling heading section used to keep that
section inside the log on every write. Now the section comes out above (or below) the markers on
the first write.

**Before:**

```markdown
<!-- change-log-start -->
## Change Log

## Deferred Work

- CR-1 carried.

| Date | Version | Description | Author |
```

**After:**

```markdown
## Deferred Work

- CR-1 carried.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
```

**Impact:** every caller of `upsertChangeLog`, including `jira-sync.js`, `status-history.js`, the
three `sync-jira-*` scripts, `tracker-reconcile.js` and finalise 7.3's one-liner. (Search:
`git grep -ln upsertChangeLog -- ':!**/references/**' ':!docs/**' ':!*.md'`, which also lists the
engine itself and four test files; finalise 7.3 calls it from a Markdown one-liner.) A document in the
affected shape gets a larger diff on its next write than the one row it earned.

**Migration path:** none required. The output is the documented canonical layout. The four known
documents are repaired in this task (Phase 3), so a later write elsewhere produces no surprise
diff. CHANGELOG names the behaviour.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.230.plan.change-log-block-foreign-sections.md](task.230.plan.change-log-block-foreign-sections.md)

### Phase 1: Engine — partition, lift, test first (Risk: Medium)

**Files:** `shared/resources/change-log.js`, `shared/resources/tests/change-log.test.mjs`

- [x] Write the failing tests first: the observation #91 repro (Deferred Work between the marker
      and the heading) and the task.203 shape (a DoD section between the heading and the table)
      both come out above the start marker
- [x] Add `foreignSections(content)` and `liftForeignSections(content)` with the predicate from §3,
      built on the existing protected ranges and `RE_HEADING`, and export both
- [x] Route `upsertChangeLog`'s marker path through the same partition, so the rebuilt block never
      contains a foreign section; compose with the obs #104 absorption
- [x] Add control cases that must stay put: nested `###` under an H2 log, authoring prose under the
      heading, a fenced `## Example`, a `####` under an H3 log
- [x] Mutation-prove: revert the lift and confirm the Phase 1 tests go red

### Phase 2: Placement rule and spec (Risk: Low)

**Files:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/document-change-log.md`,
`tests/deferred-work-placement.test.js`

- [x] Reword "Absent → create it" to the marker-anchored wording finalise 7.4 uses
- [x] State in the Markers section that only the log lives inside the markers, and that the engine
      lifts a sibling section on the next write (obs #91)
- [x] Update `tests/deferred-work-placement.test.js`: its `place()` comment (`:61`) restates the
      old wording; reword it, and assert the statement contains "never between the markers"
- [x] `npm run bundle` and commit the regenerated `references/` copies

### Phase 3: Repair and corpus guard (Risk: Low)

**Files:** the four task documents, `evals/shared/tests/change-log-foreign-section-corpus.test.mjs`

- [x] Write the guard: every tracked `.md` file with a change-log block returns `[]` from
      `foreignSections`, with a non-vacuity floor on the number of blocks scanned
- [x] Confirm the guard is red on `develop` and names all four documents
- [x] Repair each document through `upsertChangeLog` with one row
      (`Change-log block repaired — DoD section moved above the markers (task.230)`), bumping `updated:`
- [x] Confirm the guard is green, then re-plant one section and confirm it goes red again

### Phase 4: Documentation and validation (Risk: Low)

**Files:** `CHANGELOG.md`

- [x] CHANGELOG entry under Unreleased naming the lift and the guard (task 230)
- [x] `npm run ci` green, with the `.agents/skills` symlink moved aside first

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/change-log.js` — `foreignSections`, `liftForeignSections`, lift inside `upsertChangeLog`

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/change-log.test.mjs` — red-first cases, controls, a composition case
   with obs #104, an idempotence case
3. ✅ `evals/shared/tests/change-log-foreign-section-corpus.test.mjs` *(new)* — the corpus guard

### Files to Modify (Dependencies)

None. No package changes.

### Files to Modify (Documentation)

4. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the Deferred Work placement rule
5. ✅ `shared/resources/document-change-log.md` — the Markers section
5a. ✅ `tests/deferred-work-placement.test.js` — the restated wording, plus an assertion on the new one
6. ✅ `CHANGELOG.md` — Unreleased entry
7. ✅ `docs/tasks/task.166.measured-non-functional-criteria/task.166.measured-non-functional-criteria.md` — repaired
8. ✅ `docs/tasks/task.170.qa-reentry-after-finalise-gaps/task.170.qa-reentry-after-finalise-gaps.md` — repaired
9. ✅ `docs/tasks/task.175.finalise-pr-number-from-branch/task.175.finalise-pr-number-from-branch.md` — repaired
10. ✅ `docs/tasks/task.203.migrate-doc-numbering/task.203.migrate-doc-numbering.md` — repaired
11. ✅ `skills/*/references/change-log.js`, `develop-pipeline-step-5-6-qa-loop.md` and
    `document-change-log.md` copies — generated by `npm run bundle`, never edited by hand

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** `foreignSections`, `liftForeignSections` and `upsertChangeLog` in
  `shared/resources/tests/change-log.test.mjs`.
- **Cases that must lift:** Deferred Work between the marker and the heading (obs #91); a DoD
  section between the heading and the table (task.203); a foreign section that holds its own pipe
  table before the log table (its table moves with it, and the log keeps only its own rows); a
  sibling section after the table (lifted below the end marker); two foreign sections, order kept; a foreign section inside a legacy
  `jira-sync-changelog` block; a sibling `###` inside an H3 log.
- **Controls that must stay (obs #176):** nested `###` under an H2 log with its own table; an
  authoring note directly under the heading; a fenced `## Example` inside the block; a `####`
  under an H3 log; a document whose block holds only the table.
- **Properties:** a second write lifts nothing (idempotent); the non-blank lines of input plus the
  new row equal the non-blank lines of the output (a move, not a delete); a hand-authored heading
  directly above the marker is still absorbed when a foreign section is also lifted.
- **Command:** `command node --test shared/resources/tests/change-log.test.mjs`.

### Integration Tests

- **Corpus guard:** `evals/shared/tests/change-log-foreign-section-corpus.test.mjs` runs over
  `git ls-files '*.md'`. For each document where `findChangeLog` returns a marker block, it asserts
  `foreignSections(content)` is empty. It reports each offender as `path: heading`. **The
  definition is the guard's:** tracked Markdown, marker blocks only, the engine's own protected
  ranges. The guard records the count. A non-vacuity floor fails the test when fewer marker blocks
  than the floor are scanned. Set the floor below the count measured at implementation time, never
  at a number restated here (obs #117).
- **Command:** `command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs`.

### Contract Tests

- The existing callers' suites (`skills/sync-jira-*/tests`, `jira-sync-publishing-fidelity.test.mjs`,
  `status-history` tests) pass unchanged. None of their fixtures should hold a sibling section
  inside a marker block. If one does, its expectation changes, and the change is listed in the
  implementation report.

### Performance Tests

- The corpus guard runs over every tracked `.md` file. Its wall time must stay under 5 s. Measure
  it on the PR head with `uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs`
  and record the figure and the load in the implementation report.

### Consumer Tests

- `npm run ci`: the full suite plus `bundle:check`. A consumer gets the change through the bundled
  `references/change-log.js` copies, and `bundle:check` proves they match the source.

---

## 9. Success Criteria

### Functional

- [x] Given the observation #91 document (Deferred Work between `<!-- change-log-start -->` and
      `## Change Log`), `upsertChangeLog` returns a document where `## Deferred Work` and its body
      sit directly above the start marker, and the block holds only the heading and the table
      (Phase 1 states the lift)
- [x] Given the task.203 shape (a DoD section between the heading and the table), the DoD section
      ends up above the start marker
- [x] A sibling section after the table ends up directly below the end marker
- [x] Nested `###` subsections under an H2 log, an authoring note under the heading, and a fenced
      `## Example` stay inside the block, unchanged
- [x] A second `upsertChangeLog` on the output lifts nothing and changes only the appended row
- [x] No non-blank line is lost: input lines plus the new row equal output lines as multisets
- [x] The Deferred Work placement rule names the marker, in the same words as finalise 7.4 (held by
      `tests/deferred-work-placement.test.js`, which asserts "never between the markers")

### Performance

- [x] The corpus guard completes in under 5 s, measured on the PR head with
      `uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs`
      (load recorded beside the figure in the implementation report)
- [x] `upsertChangeLog` on a document with no foreign section produces byte-identical output to
      today (the existing suite passes unchanged)

### Code Quality

- [x] One definition of "foreign": `upsertChangeLog`, `foreignSections` and the corpus guard all
      read the same partition. Held by two tests: the corpus guard imports `foreignSections` from
      `shared/resources/change-log.js` (no predicate of its own), and a unit test asserts
      `foreignSections(upsertChangeLog(x, row)) === []` for every lifting case, binding the write
      path to the read predicate
- [x] Reverting the lift turns the Phase 1 tests red, and re-planting a section turns the corpus
      guard red (mutation-proven, recorded in the implementation report)
- [x] `npm run ci` passes, including `bundle:check` and `npm run validate`

### Migration

- [x] task.166, task.170, task.175 and task.203 each have their DoD section above the start marker,
      with one repair row and `updated:` bumped
- [x] The corpus guard is green on the PR head
- [x] CHANGELOG states the new lift behaviour

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Lifting something that belongs to the log**
   - **Risk:** a block that legitimately holds a same-level heading would have it moved out.
   - **Probability:** Low. The canonical layout (`document-change-log.md`, Markers) puts nothing but
     the heading and the table inside.
   - **Impact:** Medium. One section moves on a write.
   - **Mitigation:** only headings at or above the log's level count; deeper headings and fenced
     lines are controls in the suite. The corpus guard lists every offender before the repair, so
     a legitimate case shows up there.
   - **Rollback:** revert the engine commit; documents that were already lifted stay valid.
2. **Seam whitespace churn**
   - **Risk:** lifting introduces or removes blank lines around the markers on every write.
   - **Probability:** Medium. bug.13 and obs #104 both had seam regressions.
   - **Impact:** Low. Diff noise.
   - **Mitigation:** the idempotence case and byte-identical output for clean documents.
   - **Rollback:** forward fix in `trimSeam`.

### Low Risk Areas

1. **A caller fixture holding the affected shape**
   - **Risk:** a sync test's expected output changes.
   - **Probability:** Low.
   - **Impact:** Low.
   - **Mitigation:** run every `upsertChangeLog` caller suite in Phase 1 and list any changed
     expectation in the implementation report.
2. **Bundled copies out of date**
   - **Risk:** a consumer runs an old `references/change-log.js`.
   - **Probability:** Low.
   - **Impact:** Low.
   - **Mitigation:** `npm run bundle` in Phase 2; `bundle:check` in CI.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a sync or finalise write drops text, or moves a section that belongs inside the log.
- **Steps:** 1) `git revert` the engine commit; 2) `npm run bundle`; 3) re-run
  `command node --test shared/resources/tests/change-log.test.mjs`.
- **Validation:** the pre-task suite passes; the four repaired documents still read correctly,
  because their sections now sit outside the markers, where the old engine leaves them alone.

### Partial Rollback (1-2 hours)

- **When to use:** the engine is sound but the corpus guard flags a case the team decides to allow.
- **Steps:** keep the engine; give the guard an allowlist entry with a reason, or revert only the
  guard commit.

### Forward Fix (< 4 hours)

- **When to use:** seam whitespace or a missed edge case (for example a setext heading inside the
  block).
- **Approach:** add the failing case to the suite and fix in `liftForeignSections`.

### Rollback Triggers

- **Critical:** any lost line; a Change Log row dropped (`change-log.js --check-append-only` fails).
- **Non-critical:** blank-line churn; a foreign shape the predicate misses (fix forward).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-22
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.230.qa.4.change-log-block-foreign-sections.md](./task.230.qa.4.change-log-block-foreign-sections.md)
- **Gate File**: [task.230.gate.4.change-log-block-foreign-sections.yml](./task.230.gate.4.change-log-block-foreign-sections.yml)

### Test Coverage Summary

- **Tests Executed**: 6251
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No medium or high finding remains after four QA cycles. Two low residuals, on shapes no writer here produces, were carried to the gate's `recommendations.future` (route 2b) and recorded under Deferred Work.

## Deferred Work

- **TASK-230-CR4-1** (LOW): carried to gate 4 `recommendations.future` (route 2b, cycle 4). A log-shaped foreign table outranks a non-log, undated own-section table (position versus shape).
- **TASK-230-CR4-2** (LOW): carried to gate 4 `recommendations.future` (route 2b, cycle 4). A deeper Change Log heading inside a before-side foreign section does not converge on the first write.
## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.230.qa.4.change-log-block-foreign-sections.md`
**Gate File**: `task.230.gate.4.change-log-block-foreign-sections.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 95/100 (4 QA cycles)
**PR Review (Step 5c)**: ✅ APPROVE — `task.230.pr-review.1.change-log-block-foreign-sections.md`

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** All 15 Success Criteria met. Each one cites code and a test that runs per PR, and AC8 was re-measured on the PR head (0.941 s at load 2.35).
✅ **Tests:** `change-log.test.mjs` passes 113/113. The corpus guard passes 2/2 over 120 blocks. A full `npm run ci` is green on d40f6552.
✅ **PR Review:** PR #735. The host requires no reviews, and the Step 5c conformance review returned APPROVE.
✅ **Documentation:** CHANGELOG, the change-log spec's Markers section and the Deferred Work placement rule are all updated.
✅ **Security Review:** PASS. `boundary: internal`, with a valid reason: a pure string engine over pipeline-written documents.
✅ **Compliance Review:** NOT_APPLICABLE (internal tooling).

**Task marked as ACCEPTED on:** 2026-10-23

**Detailed Verification Log:** See `task.230.dod.1.change-log-block-foreign-sections.md` for the complete verification evidence.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-22 | 1.0     | Initial draft — cut from observation #91 | create-task |
| 2026-10-22 | 1.1 | Review passed (8/10) — 6 important fixes applied: partition before table classification, measured bound command, two tests named, PR-head wording, caller search, placement test update | review-task |
| 2026-10-22 |  | Status → ready-for-development | review-task |
| 2026-10-22 |  | Implemented — 12 files, 13 tests (11 engine, 2 corpus guard) plus 1 placement assertion | develop |
| 2026-10-22 |  | QA gate FAIL (60/100) — 2 findings (1 high, 1 medium) | qa-task |
| 2026-10-22 |  | QA findings fixed — log table chosen at or after its heading (CR-1, CR-2, CR-3) + JSDoc; 5 new tests, 1 iteration | qa-fix |
| 2026-10-22 |  | QA gate CONCERNS (70/100) — 4 findings (3 medium, 1 low) | qa-task |
| 2026-10-22 |  | QA findings fixed — log table chosen from its own section first, log-shaped past a foreign heading (CR2-1, CR2-2, CR2-3) + doubled heading converges (CR2-4); 6 new tests, 1 iteration | qa-fix |
| 2026-10-22 |  | QA gate CONCERNS (70/100) — 3 findings (2 medium, 1 low) | qa-task |
| 2026-10-22 |  | QA findings fixed — Date plus Author no longer log-shaped, own-section log-like runs judged first, repeat-heading drop limited to the log level (CR3-1, CR3-2, CR3-4; CR3-3 too); 5 new tests, 1 iteration | qa-fix |
| 2026-10-22 |  | QA gate PASS (95/100) — 2 low findings carried (route 2b) | qa-task |
| 2026-10-23 | 1.2 | DoD verified — accepted (PR #735) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Engine — partition, lift, test first
- [x] Red tests (obs #91 repro, task.203 shape)
- [x] `foreignSections` / `liftForeignSections`
- [x] `upsertChangeLog` lifts; composes with obs #104
- [x] Control cases
- [x] Mutation proof

### Phase 2: Placement rule and spec
- [x] Deferred Work rule anchored on the marker
- [x] Markers section updated
- [x] Bundle

### Phase 3: Repair and corpus guard
- [x] Guard red on develop
- [x] Four documents repaired
- [x] Guard green; re-plant red

### Phase 4: Documentation and validation
- [x] CHANGELOG
- [x] `npm run ci` green

---

## References

- Observation #91 — Deferred Work placement rule lands inside the change-log markers and change-log.js absorbs it silently
- `shared/resources/document-change-log.md` — the change-log spec (Markers)
- `shared/resources/qa-results.js` — the sibling relocation for `## QA Testing Results` (obs #178, task.155)
- `skills/finalise/SKILL.md` 7.4 — the marker-anchored wording (obs #229)
- task.127 — the obs #104 heading absorption this lift composes with
- Handoff: `.agents/handoffs/2026-10-22-fix-obs-91-change-log-placement.md`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources only, then run `npm run bundle`. The `references/` copies are
  generated.
- Patch files with split/join and assert the split count, never `String.replace`.
- Move `.agents/skills` aside before trusting a local `npm run ci`.

### Known Issues

**Open** (Non-blocking):
- ⚠️ task.203's block also ends with a `---` line before the end marker. It is not a heading, so it
  is not foreign, and it stays.

### Future Improvements

- Fold `qa-results.js` `relocated` onto `foreignSections` if the two ever disagree about the
  canonical position.

---
