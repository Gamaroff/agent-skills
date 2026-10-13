---
id: task.184
title: "[Task 184] qa-results carried-block and log residuals"
type: task
description: "Follow-up to task.183. Close three content-loss shapes in `shared/resources/qa-results.js` that predate task.183 (all identical on origin/develop): keep a nested Bug Reports block that runs past its outer block, refuse a section under a marker-less log whose table above is not Date-first, and refuse a carried bold block whose list continues past a label and a paragraph. Also correct task.183's stale wording, CHANGELOG over-claim and a duplicate test assertion."
tags: [qa-task, qa-story, engine, follow-up]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-05
updated: 2026-10-13
assignee:
estimated_effort_hours: 16
github_issue: 572
---

# Technical Task: qa-results carried-block and log residuals

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.184.review.1.qa-results-carried-block-and-log-residuals.md` implemented 2026-10-13

**GitHub Issue**: [#572](https://github.com/Gamaroff/agent-skills/issues/572)

---

## 1. Overview

Task.183 closed three of task.171's five `qa-results.js` residuals and deferred two. Its own QA
gate 6 and its Step 5c PR review then found three more content-loss shapes. Each one reproduces
identically on `origin/develop`, so none was introduced by task.183, and none occurs in the tracked
`docs/` tree today. This task closes all three, and cleans up the wording task.183 left behind.

**Scope:** one task in four phases. Phases 1–3 each change one rule in `shared/resources/qa-results.js`
and add one test; Phase 4 is documentation and test hygiene. The three engine fixes share one file,
one test file and one bundle run, and none is valuable enough alone to justify its own QA loop.

**Key deliverables:**

1. A bold `**Bug Reports**` block nested in a `#### Bug Reports` block keeps all of its content (5c CR-1).
2. A section under a marker-less change log whose table above the section is not Date-first is
   refused, never relocated with quoted rows left in the log (5c CR-2).
3. A carried bold block whose list continues past a stopping label and a paragraph is refused,
   never cut (gate 6 CR6-1).
4. task.183's narrative, the CHANGELOG entry and test R2/R4 say what the code does.

**Expected outcome:** every one of the three shapes either keeps its content or refuses with a
`detail`; no write deletes or misplaces content. Direction carried over from task.183: refusal is
always safe; a deletion never is. No rule may *exempt* lines from a refusal by inferring Markdown
block structure line by line.

---

## 2. Motivation

### Current Problems

- **5c CR-1 — a nested block's tail is deleted.** `#### Bug Reports` / `- [a]` / `**Bug Reports**` /
  `#### From cycle 2` / `- [b]` loses `[b]` on replace. The `####` block stops at the `####` heading;
  the bold block runs past it, but `carriedBlocks` drops any block that starts inside an earlier one,
  so the part of the bold block past the outer block's end is never carried.
- **5c CR-2 — quoted rows are left inside the log.** A marker-less `| Version | Date | … |` log
  followed by a QA section that quotes a `| Date | Note |` table is treated as a table-less log; the
  section is cut at the quoted table and relocated, and the quoted rows stay under `## Change Log`.
  The comment at `qa-results.js:311` says a Version-first log "is seen and the write refused" — true
  only inside a marker block.
- **gate 6 CR6-1 — a grouped list behind a paragraph is deleted.** `**Bug Reports**` / `- [a]` /
  `**Critical Issues**` / `Found in cycle 2:` / `- [b]` loses `[b]`. The bold block stops at a bold
  label that does not *immediately* introduce a list, and everything after it is replaced.
- **Stale wording.** Four task.183 passages, its § 3 clause count and its CHANGELOG entry still read
  as if CR-7 and CR2-4 were fixed or as if every grouped list is carried; test R4's name says "every
  grouped bug list"; test R2 repeats R1's full assertion set.

### Benefits of Solution

- No known shape in the carried-block or change-log logic loses or misplaces content (provenance and
  reproduction for all three: `task.183.pr-review.1.qa-results-setext-and-carry-follow-ups.md`,
  `task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml`).
- The engine's comments, the CHANGELOG and task.183 describe the behaviour that ships.
- Faster test feedback on R2 (one duplicated assertion set removed).

---

## 3. Technical Background

### Current Architecture

All citations are `path:line` at `develop` `9ca5f9d9`, paired with the identifier.

- `collectBlocks` (`shared/resources/qa-results.js:168`) finds each carried block — a `###`/`####`
  heading or a bold label alone on its line — and ends it at the first line `stops` (`:191`) accepts.
  For a bold-label block that is a heading of level 3 or shallower, or a bold label for which
  `introducesList` (`:183`) is false (`:199`): `introducesList` looks only at the **next non-blank
  line**.
- `carriedBlocks` (`:231`) sorts every block by start and keeps outermost only: a block whose start
  lies inside an earlier kept block is skipped (`:238`,
  `if (outer && b.start < outer.start + outer.whole.length) continue;`). It never looks at where the
  skipped block **ends**.
- `hasDateColumn` (`:319`) says whether a row has a `Date` cell anywhere; `RE_LOG_HEADER` (`:315`)
  says whether the row is Date-first; `lastTableStart` (`:465`) finds the last header row a predicate
  accepts; `dateFirstAt` (`:486`) asks the Date-first question of a table found that way.
- In `findQaResults` (`:520`), `underTablelessLog` (`:563`) is true for a section directly under a marker-less
  log with **no Date-first table** between the log heading and the section (task.183 QA cycle 3,
  CR3-2 chose Date-first here). When it is true the section is cut at the last Date-column table in
  its own span when that table is Date-first (`:581` onward), and the cut makes it `insideChangeLog`,
  so it is relocated.
- `logAbove` (`:579`) is the marker-block counterpart: when the block's own table sits above the
  section, no cut is made and the dated-row guard refuses. There is no marker-less counterpart.
- Refusals are `reason: "unbounded"` with a `detail` from the vocabulary at `:29-38`
  (`structural-line:<line>` from `removesStructure`, `:330`).

**Reproductions** (each run against `HEAD` and against `git show origin/develop:shared/resources/qa-results.js`,
identical output on both; recorded in `task.183.pr-review.1` and `task.183.qa.6`):

| Shape | Result today |
| --- | --- |
| CR-1 nested `#### Bug Reports` + bold block + `#### From cycle 2` | `replaced ×3`, `[a]` 1, `[b]` 0 |
| CR-2 marker-less Version-first log + quoted `| Date | Note |` | `relocated`, quoted row left in the log |
| CR6-1 bold block + `**Critical Issues**` + paragraph + list | `replaced ×3`, `[a]` 1, `[b]` 0 |

### Target Architecture

- **CR-1 (keep).** When `carriedBlocks` meets a block that starts inside the kept outer block but
  ends **past** it, extend the outer block to the inner block's end instead of discarding the tail.
  This adds no inference: it unions two spans the engine already found. A scratch-copy simulation of
  this change (2026-10-05) kept `[a]` and `[b]` once each across four writes and left all 85 engine
  tests green.
- **CR-2 (refuse).** On the marker-less path, when the last Date-column table between the log
  heading and the section is **not** Date-first, the log is ambiguous: do not cut, and set
  `underLog` so the dated-row guard refuses. The scratch-copy simulation returned
  `unbounded`/`structural-line:` for both CR-2 variants (2- and 4-column quoted table) and for the
  CR3-2 shape, and left G1 (REL-004 — a section after a finished Date-first log is `replaced`) green.
  **The CR3-2 shape changes from `relocated` to refused** (operator decision, 2026-10-05): the engine
  cannot tell a Version-first log above from a quoted `| Reviewer | Date |` table above, and refusing
  both is the safe direction. R3's CR3-2 assertion is updated accordingly — it is the only existing
  assertion the simulation turned red.
- **CR6-1 (refuse).** When a carried bold-label block stops at a bold label that does not
  immediately introduce a list, look ahead from that label to the next line `stops` would take on
  its own terms (a heading of level 3 or shallower, or a QA field line) or the end of the removed
  text. If a list item or table row appears there, refuse the write with a new detail
  `carried-tail:<line>` (the first such line, trimmed, at most 60 chars — the same shape as
  `structural-line:`). This **adds** a refusal; it exempts nothing. Operator decision, 2026-10-05:
  refuse rather than carry past the paragraph, so no stale QA text is ever carried by it.
- **Comments and docs.** The comment at `:307-314` states the marker-less rule as it now is.

No new mechanism beside an existing one: CR-1 extends `carriedBlocks`' own outermost rule; CR-2
reuses `lastTableStart`, `dateFirstAt` and the existing `underLog` guard; CR6-1 reports through the
existing `unbounded` reason and the `detail` vocabulary.

---

## 4. Scope

### In Scope

- ✅ The three engine fixes above, each with one test and a recorded mutation proof
- ✅ R3's CR3-2 assertion: `relocated` → refused (`unbounded`, `structural-line:`), row kept
- ✅ The `carried-tail:` detail added to the vocabulary comment, to the `unbounded` hint text in
  the qa-task and qa-story Step 12 writer blocks, and to the prose paragraph in each skill that lists
  what `unbounded` refuses (sites: `grep -n unbounded skills/qa-task/SKILL.md skills/qa-story/SKILL.md`
  — the hint string and that paragraph in each file)
- ✅ Comment at `qa-results.js:307-314` made accurate
- ✅ Test hygiene: drop R2's duplicate `assertCr51Refused()` call (`qa-results.test.mjs:1157`); rename
  R4 so it claims lists *directly* under a sub-label
- ✅ task.183 wording (below) and one appended Change Log row noting its out-of-order rows
- ✅ CHANGELOG: task 183's entry narrowed to "directly under a sub-label"; a new `(task 184)` entry
- ✅ Bundled copies regenerated (`npm run bundle`)

task.183 passages to amend (line numbers at `9ca5f9d9`):

| Where | Says | Becomes |
| --- | --- | --- |
| § 2, `:100-101` | lists "stop carrying QA's own stale text" | CR2-4 deferred: a stale list is carried once |
| § 3, `:154` | "This task **changes** two of its clauses" | one clause (the heading stop); the `QA_LABELS` clause was added and removed |
| Phase 4, `:232` | "any sub-label survives" | a list directly under a sub-label survives |
| Phase 5, `:241`, `:258` | "Deferred Work items marked resolved" | three resolved, two deferred |
| § 9, `:310` | "carried whole" under "any sub-label" | directly under a sub-label |
| § 9, `:330` | "names … the newly written shapes" | names the new refusals and the deferrals |
| Progress Tracking, `:480` | "Phase 4: bold-label boundaries (5c CR-2, CR2-4)" | "(5c CR-2; CR2-4 deferred)" |

### Out of Scope

- ❌ CR-7, CR2-3, CR4-4, CR2-4 — task.183's `## Deferred Work`, unchanged by this task
- ❌ Reordering task.183's Change Log rows — the log is append-only; a note row records the order
  instead (operator decision, 2026-10-05)
- ❌ task.183's implementation report (`:80` says "all five items marked ✅ resolved") — a run record,
  left as written
- ❌ Any other `qa-results.js` rule, and any change to the QA renders

---

## 5. Breaking Changes

None to any public contract: `upsertQaResults` keeps its signature and its reason set. Two
behaviour changes, both toward refusal:

1. **A marker-less log with a non-Date-first Date table above the section** (CR-2 and the CR3-2
   shape) now refuses (`unbounded`, `structural-line:<row>`) where it relocated. Migration: the Step
   12 HALT names the row; move the QA section above `## Change Log` by hand, or make the log's header
   Date-first, then re-run. 0 tracked documents have this shape today.
2. **A carried bold block whose list continues past a label and a paragraph** (CR6-1) now refuses
   (`unbounded`, `carried-tail:<line>`) where it lost the list. Migration: the HALT names the line;
   put the list directly under its label, or move it out of the QA section, then re-run.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.184.plan.qa-results-carried-block-and-log-residuals.md](task.184.plan.qa-results-carried-block-and-log-residuals.md)

### Phase 1: keep a nested block's tail — 5c CR-1

**Risk:** Low · **Files:** `shared/resources/qa-results.js` (`carriedBlocks`), `shared/resources/tests/qa-results.test.mjs`

- [x] In `carriedBlocks`, when a block starts inside the kept outer block and ends past it, extend the
      outer block's `whole` and `body` to that end
- [x] Test R5: the CR-1 shape keeps `[a]` and `[b]` exactly once across `replaceThrice`, and
      `**Bug Reports**` appears once
- [x] Mutation-prove R5 (revert to the plain `continue`)

### Phase 2: refuse a section under an ambiguous marker-less log — 5c CR-2

**Risk:** Medium (changes a tested outcome) · **Files:** `qa-results.js` (`findQaResults`), test file
**Depends on:** none

- [x] Compute `ambiguousAbove`: marker-less log, section directly under it, and the last Date-column
      table between the log heading and the section is not Date-first
- [x] When `ambiguousAbove`, skip the cut and include it in `underLog`
- [x] Test R6: both CR-2 variants (2- and 4-column quoted table) return `unbounded` with a
      `structural-line:` detail naming the quoted row, document unchanged
- [x] Update R3's CR3-2 case: `unbounded`, `structural-line:| 2026-09-25 | 1.0 | log-row | y |`,
      document unchanged
- [x] Confirm G1 (REL-004) still `replaced`
- [x] Rewrite the comment at `:307-314` to state the marker-less rule
- [x] Mutation-prove R6 (drop `ambiguousAbove` from the cut condition, then from `underLog`)

### Phase 3: refuse a carried list behind a label and a paragraph — gate 6 CR6-1

**Risk:** Medium · **Files:** `qa-results.js` (`collectBlocks`, `upsertQaResults`, vocabulary comment),
test file, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` · **Depends on:** Phase 1 (the same
carried-block path)

- [x] When a bold-label block stops at a bold label that does not introduce a list, look ahead to the
      next `#{1,3}` heading, QA field line or end of text; record the first list item or table row
- [x] `upsertQaResults` refuses with `reason: "unbounded"`, `detail: "carried-tail:<line>"`, writing
      nothing
- [x] Add `carried-tail:<line>` to the detail vocabulary comment
- [x] Add the cause to the `unbounded` hint string in the Step 12 writer block of
      `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`, and to the prose paragraph below each
      block that lists what `unbounded` refuses (search: `grep -n unbounded skills/qa-task/SKILL.md
      skills/qa-story/SKILL.md`; four hits, two per file)
- [x] Test R7: the CR6-1 shape refuses with `carried-tail:- [b](./b.md)`, document unchanged; R4's
      stale-list case (`**Recommendations**:` directly over a list) is still carried once
- [x] Mutation-prove R7 (remove the look-ahead)

### Phase 4: wording, hygiene, CHANGELOG

**Risk:** Low · **Depends on:** Phases 1–3

- [x] Drop R2's duplicate `assertCr51Refused()` call (`qa-results.test.mjs:1157`)
- [x] Rename R4: "keeps its #### groups and every bug list directly under a sub-label"
- [x] Amend the seven task.183 passages listed in § 4, and append one task.183 Change Log row
      noting that the gate 4 row was written after the cycle 5 rows
- [x] CHANGELOG: narrow task 183's entry to "directly under a sub-label"; add a `(task 184)` Fixed
      entry naming the two new refusals and the kept nested tail
- [x] `npm run bundle`; `npm run bundle:check`; `npm run validate -- skills/qa-task/` and
      `skills/qa-story/`

---

## 7. Files Summary

**Core implementation**

1. ✅ `shared/resources/qa-results.js` — Phases 1–3, comments
2. ✅ `skills/qa-task/references/qa-results.js` — bundled copy (generated)
3. ✅ `skills/qa-story/references/qa-results.js` — bundled copy (generated)
4. ✅ `skills/qa-task/SKILL.md` — Step 12 `unbounded` hint and the `unbounded` prose paragraph (Phase 3)
5. ✅ `skills/qa-story/SKILL.md` — Step 12 `unbounded` hint and the `unbounded` prose paragraph (Phase 3)

**Tests**

6. ✅ `shared/resources/tests/qa-results.test.mjs` — R5, R6, R7; R3 and R4 updated; R2 trimmed

**Documentation**

7. ✅ `CHANGELOG.md`
8. ✅ `docs/tasks/task.183.qa-results-setext-and-carry-follow-ups/task.183.qa-results-setext-and-carry-follow-ups.md`

The two `SKILL.md` hint strings are pinned by `tests/qa-results-step12-wiring.test.js`, which runs
both writer blocks; it needs no change unless it asserts the hint's text (it asserts the
`unclosed-fence` detail today, `:145`).

---

## 8. Testing Strategy

**Unit tests** — `command node --test shared/resources/tests/qa-results.test.mjs`. R5, R6 and R7 use
the existing `markerDoc`, `section` and `replaceThrice` helpers; each new assertion is
mutation-proved with the `cp`-snapshot method task.183 used, results recorded in the implementation
report.

**Regression** — the whole qa-results suite (engine, `tests/qa-results-corpus.test.js`,
`tests/qa-results-step12-wiring.test.js`, `tests/deferred-work-placement.test.js`,
`tests/create-bug-report-bug-reports-heading.test.js`). The corpus write survey must stay
0 false refusals / 0 deletions / 0 non-idempotent: the two new refusals must not fire on any tracked
document.

**Performance** — engine, wiring and corpus suites under 2 s, measured with
`/usr/bin/time -p command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js`,
`uptime` load recorded beside each figure.

**Fast gate** — `npm run ci:fast`. `tests/bundle-missing-source.test.js` and
`tests/test-clean-checkout.test.js` exceed their per-file 10 s budgets under load (LOAD-SENSITIVE);
re-run each alone before reading a failure as real.

---

## 9. Success Criteria

### Functional

- [x] CR-1: the nested shape keeps `[a]` and `[b]` exactly once across three writes, `replaced` each
      time (Phase 1, R5)
- [x] CR-2: both variants return `reason: "unbounded"` with `detail` `structural-line:` naming the
      quoted row, document byte-identical (Phase 2, R6)
- [x] CR3-2 shape: `reason: "unbounded"`, `detail` `structural-line:| 2026-09-25 | 1.0 | log-row | y |`,
      document byte-identical; G1 (REL-004) still `replaced` (Phase 2, R3)
- [x] CR6-1: returns `reason: "unbounded"` with `detail` `carried-tail:- [b](./b.md)`, document
      byte-identical; R4's directly-under-a-label cases unchanged (Phase 3, R7)

### Performance

- [x] Engine, wiring and corpus suites under 2 s, with `uptime` load recorded beside the figure in
      the implementation report, re-measured at finalise
- [x] No network access — documentation criterion: `shared/resources/qa-results.js` contains exactly
      one `require(`, of `./change-log.js` (`grep -c 'require(' shared/resources/qa-results.js` → `1`)

### Code Quality

- [x] Corpus write survey 0 / 0 / 0 on the tracked tree
- [x] R5, R6, R7 each mutation-proved, each result recorded
- [x] `npm run ci:fast`, `npm run bundle:check`, `npm run validate -- skills/qa-task/` and
      `skills/qa-story/` clean

### Migration

- [x] CHANGELOG `[Unreleased]` cites `(task 184)` and names the two new refusals and the kept tail;
      task 183's entry says "directly under a sub-label"
- [x] The seven task.183 passages in § 4 amended, with one task.183 Change Log row

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

1. **A new refusal fires on a real document.**
   - Risk: CR-2's or CR6-1's refusal halts a Step 12 write on a document that writes cleanly today
   - Probability: Low — 0 tracked documents carry either shape (the corpus survey is the check)
   - Impact: a QA run halts with a named line; nothing is lost
   - Mitigation: corpus survey 0/0/0; the HALT names the line and the § 5 migration
2. **CR-1's union carries too much.**
   - Risk: extending the outer block pulls in text that a later block or QA's own render owns
   - Probability: Low — the union ends where the inner block already ends
   - Impact: a duplicate on the next write, never a deletion
   - Mitigation: R5 runs three writes and counts every carried line

### LOW RISK

1. **Hint-string drift between qa-task and qa-story.** Mitigation: edit both in one commit; the
   wiring test runs both writer blocks.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a Step 12 HALT with `carried-tail:` or `structural-line:` on a document the corpus
  survey did not cover; any `qa-results` test red on `develop`
- **Steps:** `git revert` the merge commit; `npm run bundle`; `npm run bundle:check`
- **Validation:** the qa-results suites green; the corpus survey 0/0/0

### Partial Rollback

Each phase is one rule. Revert Phase 3 alone (the look-ahead and its detail) or Phase 2 alone
(`ambiguousAbove`) if only one refusal misfires; Phase 1 adds no refusal and stays.

### Forward Fix

A refusal that fires on a legitimate shape is fixed forward by narrowing that refusal's trigger,
never by exempting lines from the structural guard.

---

## Implementation Summary

**Completed:** 2026-10-13 · **Branch:** `feature/task.184.qa-results-carried-block-and-log-residuals`

**Approach.** Implemented inline from the plan by `/develop-task` Step 3; each phase changes one rule
in `shared/resources/qa-results.js` and adds one test, and no rule exempts a line from a refusal.

- **Phase 1 (5c CR-1, keep).** `collectBlocks` records each block's `labelLen`; `carriedBlocks` extends
  a kept outer block to the end of a nested block that runs past it, instead of dropping the tail.
- **Phase 2 (5c CR-2, refuse).** `findQaResults` computes `ambiguousAbove` — a section directly under a
  marker-less log whose last `Date`-column table above it is not Date-first. It skips the cut and puts
  the span under the dated-row guard. The CR3-2 `| Reviewer | Date |` shape now refuses (R3 updated).
  R6 also holds a third shape the plan did not list: a Date-first log table **followed by** a
  Version-first table above the section. There `underTablelessLog` is false, so only `ambiguousAbove`
  refuses it; the case was added because mutation M2b survived without it.
- **Phase 3 (gate 6 CR6-1, refuse).** A bold-label block that stops at a bold label not introducing a
  list looks ahead to the next `#{1,3}` heading or QA field; the first list item or table row there is
  its `tail`. `upsertQaResults` refuses with `carried-tail:<line>`, reading `tail` from every
  collected block, not only the ones `carriedBlocks` keeps (review O2). A stopping label that opens a
  carried block of its own (`**Bug Reports**`, `**Deferred Work**`) records no tail: that block already
  collects the list, and the engine writes two carried blocks side by side (QA cycle 1, CR-1; R7, R8).
  More generally a tail inside a span a kept block carries is not a cut (the nested-block union, QA
  cycle 2 CR-1), and the scan ends at the next carried label so it stays bounded (CR-3, R10). The detail is in the vocabulary
  comment and in both QA skills' Step 12 hint string and `unbounded` paragraph.
- **QA cycles 1–2 (consolidation).** `sectionGuard()` is the one definition of "a section this engine
  refuses to rewrite" (unclosed fence, structural line, uncarried tail). It runs on the section a write
  replaces (`unbounded`) and on the section it writes (`unplaceable`), so the engine never writes a
  document its next write refuses (QA cycle 2 CR-1, CR-2; R8 property over 343 shapes, R9).
- **Phase 4.** R2's duplicate `assertCr51Refused()` dropped; R4 renamed; CHANGELOG task 183 entry
  narrowed and a `(task 184)` entry added; seven task.183 passages amended, with one Change Log note row.

**Testing results.** Engine suite 88/88 (R5, R6, R7 new; R3 updated). Engine + corpus + wiring:
101/101 in 1.08 s (`time -p`, load 0.55; `/usr/bin/time` is not installed on the host, so bash's
`time` keyword was used). Corpus write survey 0 / 0 / 0. Mutation proofs (snapshot, one split/join
edit, suite, restore + `cmp`): M1 (R5) red; M2a (R3, R6) red; M2b (R6) red after the mixed-log case;
M3 (R7) red. `bundle:check` 0 problems; `validate` qa-task, qa-story clean.

**Deferred Work.** None new. task.183's CR-7, CR2-3, CR4-4 and CR2-4 remain deferred there.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-13
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.184.qa.4.qa-results-carried-block-and-log-residuals.md](./task.184.qa.4.qa-results-carried-block-and-log-residuals.md)
- **Gate File**: [task.184.gate.4.qa-results-carried-block-and-log-residuals.yml](./task.184.gate.4.qa-results-carried-block-and-log-residuals.yml)

### Test Coverage Summary
- **Tests Executed**: 104 (engine, corpus, wiring)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No open findings. Four QA cycles closed the write-then-refuse class (one section guard for the replaced and the written section), a cubic tail scan, and a performance regression. Two cosmetic cleanups are recorded as future work in gate 4.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-05 | 1.0     | Initial draft — follow-up to task.183 gate 6 and Step 5c review | create-task |
| 2026-10-13 | 1.1     | Review passed (9/10) — added the `unbounded` prose paragraph in each QA skill to Phase 3; restated "no network access" as a documentation criterion | review-task |
| 2026-10-13 |         | Status → ready-for-development | review-task |
| 2026-10-13 |  | Implemented — 7 source files (+2 bundled copies), 3 new tests, 3 updated; 4 mutation proofs | develop |
| 2026-10-13 |  | QA gate CONCERNS (80/100) — 1 finding (medium), 2 advisory cleanups | qa-task |
| 2026-10-13 |  | QA findings fixed — cycle 1, 2 findings (CR-1 medium, CR-2 cleanup); R7 case + R8 property test | qa-fix |
| 2026-10-13 |  | QA gate CONCERNS (70/100) — 3 findings (2 medium, 1 low) | qa-task |
| 2026-10-13 |  | QA findings fixed — cycle 2, 3 findings (CR-1, CR-2 medium; CR-3 low): one section guard for input and written section; R8 widened, R9, R10 | qa-fix |
| 2026-10-13 |  | QA gate CONCERNS (80/100) — 1 finding (medium, PERF-1); bugs 1–2 closed | qa-task |
| 2026-10-13 |  | QA findings fixed — cycle 3, 1 finding (PERF-1 medium) + 1 cleanup: blocks collected once per guard; R8 trimmed | qa-fix |
| 2026-10-13 |  | QA gate PASS (100/100) — 0 findings (2 advisory cleanups) | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: keep a nested block's tail (5c CR-1)
- [x] Phase 2: refuse under an ambiguous marker-less log (5c CR-2)
- [x] Phase 3: refuse a carried list behind a label and a paragraph (gate 6 CR6-1)
- [x] Phase 4: wording, hygiene, CHANGELOG

---

## References

- task.183: [`task.183.qa-results-setext-and-carry-follow-ups.md`](../task.183.qa-results-setext-and-carry-follow-ups/task.183.qa-results-setext-and-carry-follow-ups.md) — § Deferred Work; QA gate 6 `recommendations.future`; Step 5c PR review 1 (CR-1, CR-2, CR-3, PC-1)
- PR #571 (merged `9e1e3409`)
- Observation #271: `/review-pr`'s verdict counts findings the change did not introduce

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.184.qa.{N}.qa-results-carried-block-and-log-residuals.md`,
  `task.184.gate.{N}.qa-results-carried-block-and-log-residuals.yml`, bug reports `task.184.bug.{N}.{name}.md`.
- Every earlier HIGH in task.171 and task.183 came from inferring Markdown block structure line by
  line to *exempt* lines from a refusal. Phases 2 and 3 add refusals; neither may exempt anything.
