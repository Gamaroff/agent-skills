---
id: task.184
title: "[Task 184] qa-results carried-block and log residuals"
type: task
description: "Follow-up to task.183. Close three content-loss shapes in `shared/resources/qa-results.js` that predate task.183 (all identical on origin/develop): keep a nested Bug Reports block that runs past its outer block, refuse a section under a marker-less log whose table above is not Date-first, and refuse a carried bold block whose list continues past a label and a paragraph. Also correct task.183's stale wording, CHANGELOG over-claim and a duplicate test assertion."
tags: [qa-task, qa-story, engine, follow-up]
category: refactoring
status: planned
priority: Medium
created: 2026-10-05
updated: 2026-10-05
assignee:
estimated_effort_hours: 16
github_issue: 572
---

# Technical Task: qa-results carried-block and log residuals

**Status:** Planned

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
- ✅ The `carried-tail:` detail added to the vocabulary comment and to the `unbounded` hint text in
  the qa-task and qa-story Step 12 writer blocks
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

- [ ] In `carriedBlocks`, when a block starts inside the kept outer block and ends past it, extend the
      outer block's `whole` and `body` to that end
- [ ] Test R5: the CR-1 shape keeps `[a]` and `[b]` exactly once across `replaceThrice`, and
      `**Bug Reports**` appears once
- [ ] Mutation-prove R5 (revert to the plain `continue`)

### Phase 2: refuse a section under an ambiguous marker-less log — 5c CR-2

**Risk:** Medium (changes a tested outcome) · **Files:** `qa-results.js` (`findQaResults`), test file
**Depends on:** none

- [ ] Compute `ambiguousAbove`: marker-less log, section directly under it, and the last Date-column
      table between the log heading and the section is not Date-first
- [ ] When `ambiguousAbove`, skip the cut and include it in `underLog`
- [ ] Test R6: both CR-2 variants (2- and 4-column quoted table) return `unbounded` with a
      `structural-line:` detail naming the quoted row, document unchanged
- [ ] Update R3's CR3-2 case: `unbounded`, `structural-line:| 2026-09-25 | 1.0 | log-row | y |`,
      document unchanged
- [ ] Confirm G1 (REL-004) still `replaced`
- [ ] Rewrite the comment at `:307-314` to state the marker-less rule
- [ ] Mutation-prove R6 (drop `ambiguousAbove` from the cut condition, then from `underLog`)

### Phase 3: refuse a carried list behind a label and a paragraph — gate 6 CR6-1

**Risk:** Medium · **Files:** `qa-results.js` (`collectBlocks`, `upsertQaResults`, vocabulary comment),
test file, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` · **Depends on:** Phase 1 (the same
carried-block path)

- [ ] When a bold-label block stops at a bold label that does not introduce a list, look ahead to the
      next `#{1,3}` heading, QA field line or end of text; record the first list item or table row
- [ ] `upsertQaResults` refuses with `reason: "unbounded"`, `detail: "carried-tail:<line>"`, writing
      nothing
- [ ] Add `carried-tail:<line>` to the detail vocabulary comment
- [ ] Add the cause to the `unbounded` hint string in the Step 12 writer block of
      `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`
- [ ] Test R7: the CR6-1 shape refuses with `carried-tail:- [b](./b.md)`, document unchanged; R4's
      stale-list case (`**Recommendations**:` directly over a list) is still carried once
- [ ] Mutation-prove R7 (remove the look-ahead)

### Phase 4: wording, hygiene, CHANGELOG

**Risk:** Low · **Depends on:** Phases 1–3

- [ ] Drop R2's duplicate `assertCr51Refused()` call (`qa-results.test.mjs:1157`)
- [ ] Rename R4: "keeps its #### groups and every bug list directly under a sub-label"
- [ ] Amend the seven task.183 passages listed in § 4, and append one task.183 Change Log row
      noting that the gate 4 row was written after the cycle 5 rows
- [ ] CHANGELOG: narrow task 183's entry to "directly under a sub-label"; add a `(task 184)` Fixed
      entry naming the two new refusals and the kept nested tail
- [ ] `npm run bundle`; `npm run bundle:check`; `npm run validate -- skills/qa-task/` and
      `skills/qa-story/`

---

## 7. Files Summary

**Core implementation**

1. ✅ `shared/resources/qa-results.js` — Phases 1–3, comments
2. ✅ `skills/qa-task/references/qa-results.js` — bundled copy (generated)
3. ✅ `skills/qa-story/references/qa-results.js` — bundled copy (generated)
4. ✅ `skills/qa-task/SKILL.md` — Step 12 `unbounded` hint (Phase 3)
5. ✅ `skills/qa-story/SKILL.md` — Step 12 `unbounded` hint (Phase 3)

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

- [ ] CR-1: the nested shape keeps `[a]` and `[b]` exactly once across three writes, `replaced` each
      time (Phase 1, R5)
- [ ] CR-2: both variants return `reason: "unbounded"` with `detail` `structural-line:` naming the
      quoted row, document byte-identical (Phase 2, R6)
- [ ] CR3-2 shape: `reason: "unbounded"`, `detail` `structural-line:| 2026-09-25 | 1.0 | log-row | y |`,
      document byte-identical; G1 (REL-004) still `replaced` (Phase 2, R3)
- [ ] CR6-1: returns `reason: "unbounded"` with `detail` `carried-tail:- [b](./b.md)`, document
      byte-identical; R4's directly-under-a-label cases unchanged (Phase 3, R7)

### Performance

- [ ] Engine, wiring and corpus suites under 2 s, with `uptime` load recorded beside the figure in
      the implementation report, re-measured at finalise
- [ ] No network access (`qa-results.js` requires only `./change-log.js`)

### Code Quality

- [ ] Corpus write survey 0 / 0 / 0 on the tracked tree
- [ ] R5, R6, R7 each mutation-proved, each result recorded
- [ ] `npm run ci:fast`, `npm run bundle:check`, `npm run validate -- skills/qa-task/` and
      `skills/qa-story/` clean

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 184)` and names the two new refusals and the kept tail;
      task 183's entry says "directly under a sub-label"
- [ ] The seven task.183 passages in § 4 amended, with one task.183 Change Log row

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

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                       | Author      |
| ---------- | ------- | ------------------------------------------------- | ----------- |
| 2026-10-05 | 1.0     | Initial draft — follow-up to task.183 gate 6 and Step 5c review | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: keep a nested block's tail (5c CR-1)
- [ ] Phase 2: refuse under an ambiguous marker-less log (5c CR-2)
- [ ] Phase 3: refuse a carried list behind a label and a paragraph (gate 6 CR6-1)
- [ ] Phase 4: wording, hygiene, CHANGELOG

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
