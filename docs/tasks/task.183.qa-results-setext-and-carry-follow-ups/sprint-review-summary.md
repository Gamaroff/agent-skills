# Sprint Review Summary - qa-results setext and carry follow-ups

**Story/Task ID:** task.183
**Completed Date:** 2026-10-05
**Completed By:** develop-task pipeline (dispatched by develop-next)
**Pull Request:** [#571](https://github.com/Gamaroff/agent-skills/pull/571)

---

## Summary

`qa-results.js` — the engine that writes a work item's `## QA Testing Results` section — no longer
deletes a section headed by paragraph text over a setext underline, refuses rather than corrupts a
section placed in a Version-first change log, and keeps the `####` groups and grouped bug lists
under a bold `**Bug Reports**` label. Three of task.171's five Deferred Work items are closed; two
(CR-7, CR2-4) are deferred after QA showed every attempt to fix them deleted content.

---

## What Was Delivered

### Success Criteria Met

- [x] The six CR5-1 setext shapes are refused with a `structural-line:` detail, document unchanged (R1)
- [x] The two CR-7 shapes stay refused (deferred), as do 14 shapes that beat the removed inference (R2)
- [x] A misplaced section in a change log whose `Date` column is not first is refused; a Date-less quoted table stays writable (R3)
- [x] A bold Bug Reports block keeps its `####` groups and every bug list grouped directly under a sub-label (R4); CR2-4 deferred
- [x] Engine, wiring and corpus suites run in 1.50 s / 1.52 s warm at load 3.49 (2 s bound)
- [x] Corpus write survey 0 / 0 / 0; every new assertion mutation-proved
- [x] CHANGELOG `[Unreleased]` and task.171's Deferred Work updated

### Key Changes

- **`notParagraph()`** replaces `RE_NOT_PARAGRAPH`: a line over an underline is a heading candidate unless it is certainly not paragraph text, so the check leans toward refusal.
- **`hasDateColumn()`**: inside a change-log marker block, any table with a `Date` column is a log table.
- **Bold-label block boundary**: stops at a heading of level 3 or shallower, not at any heading; no QA-label stop.
- **Corpus survey pre-filter**: documents that never name the section are skipped.

---

## Technical Details

### Files Modified

- `shared/resources/qa-results.js` (+ bundled copies in `skills/qa-task/references/` and `skills/qa-story/references/`) — the four rules above
- `shared/resources/tests/qa-results.test.mjs` — tests R1–R4
- `tests/qa-results-corpus.test.js` — survey pre-filter
- `CHANGELOG.md`, task.171 — Deferred Work outcomes

### Design Decision

Every HIGH finding across six QA cycles came from inferring Markdown block structure line by line
(list continuations, HTML comments, QA labels). Each such inference was removed rather than
narrowed: a false refusal is safe and recoverable by hand, a deletion is not.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none — more shapes are refused, each with a `detail`

---

## Testing & Quality Assurance

- **Tests:** R1–R4 in `shared/resources/tests/qa-results.test.mjs`; qa-results suites 98/98; CI `test`, `validate`, `link-check`, `shellcheck` SUCCESS
- **QA:** 6 cycles (two operator-approved escalations, one granted cycle after the loop limit); final gate PASS 100/100
- **Step 5c PR review:** CONCERNS — two medium findings, both pre-existing (identical on `origin/develop`, 0 corpus instances), two lows

---

## Security & Compliance

- **Security:** PASS — `boundary: internal` (the engine judges only pipeline-written documents); no secrets, unsafe calls or new dependencies
- **Compliance:** not applicable — internal developer tooling

---

## Known Limitations & Future Work

- Deferred (task.183 `## Deferred Work`): CR-7 (two setext false refusals), CR2-3, CR4-4, CR2-4 (a stale QA list is carried as a duplicate)
- Pre-existing content-loss shapes to file as a follow-up: a bug list under a sub-label with a paragraph first (gate 6 CR6-1); a bold Bug Reports block nested in `#### Bug Reports` (5c CR-1); a marker-less Version-first log (5c CR-2)
- Advisory: a few task.183 narrative passages and the Change Log row order still read as if CR-7 / CR2-4 were fixed

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
