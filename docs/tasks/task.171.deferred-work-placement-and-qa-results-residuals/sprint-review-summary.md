# Sprint Review Summary - Deferred Work placement and qa-results engine residuals

**Story/Task ID:** task.171
**Epic:** _(standalone task — follow-up to task.155)_
**Completed Date:** 2026-10-05
**Completed By:** Claude (develop-next → develop-task pipeline)
**Pull Request:** [#568](https://github.com/Gamaroff/agent-skills/pull/568)

---

## Summary

The QA loop's carried-findings record now has one stated home outside the QA section, so no QA
write can delete it, and the engine that writes the QA section either writes correctly or refuses
with a named reason for every residual shape task.155 recorded.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] One home for the loop-exit `## Deferred Work` record, executed by a test through three QA writes
- [x] Every recorded residual writes correctly or refuses with a `detail`
- [x] Both QA Step 12 halts print the refusal `detail` and a repair hint
- [x] create-bug-report task mode recognises the Bug Reports list it, or an older filing, opened
- [x] Engine, wiring and corpus tests measured under two seconds (load-sensitive — see Known Limitations)
- [x] Corpus write survey: 0 false refusals, 0 deletions, 0 non-idempotent writes, measured independently of the engine
- [x] Every new assertion mutation-proved; CHANGELOG and task.155 updated

### Key Features Implemented

- **Deferred Work home**: one statement in the develop pipelines' QA-loop step doc, with a worked example the test extracts
- **Refuse, never delete**: dated log rows under a change log, setext headings (fence-blind, like H1/H2), and renders ending in an HTML comment are refused with a `detail`
- **Precise carrying**: level-bounded `####` blocks, bold labels and sub-labelled lists, nested blocks once, self-verifying folds, CRLF-preserving seams, stranded sections relocated

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-results.js` (+ bundled copies) — the engine changes
- `shared/resources/tests/qa-results.test.mjs` — blocks O, P, Q (one case per residual and per QA finding)
- `tests/deferred-work-placement.test.js`, `tests/create-bug-report-bug-reports-heading.test.js` — new
- `tests/qa-results-corpus.test.js` — engine-independent write survey
- `tests/qa-results-step12-wiring.test.js` — detail printed by the halts
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (+ bundled copies), `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/create-bug-report/SKILL.md`
- `CHANGELOG.md`, task.118 (setext repair), task.155 (resolution note)

### Architecture/Design Decisions

The setext check ended fence-blind after three QA cycles of narrowing a "well-paired fence"
exemption, each beaten by a mis-pairing that let a write delete a real section — the same trade
task.155 accepted for H1/H2 (REL-016). REL-024 is closed by refusing a render that ends in a
comment, not by narrowing the separator peel, which deleted legacy lead-ins.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None to a public contract; `upsertQaResults` adds a `detail` field, and some writes are now refused (named in the CHANGELOG)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** ~30 new engine cases, 4 placement, 3 heading, 1 wiring, 2 corpus
- **QA:** 5 cycles; final gate PASS 100/100; Step 5c PR review CONCERNS (documentation findings acted on)
- **CI:** SUCCESS on the acceptance-decision head

---

## Known Limitations & Future Work

Recorded under the task's `## Deferred Work` for a follow-up task (not yet filed):

- CR5-1 (HIGH, pre-existing): setext sections headed by non-plain paragraph text are still deleted
- 5c CR-1 (pre-existing): a Version-first change log under a marker block loses rows on relocate
- 5c CR-2, CR2-4, CR-7 (low): bold-label block stop rules; setext false refusals
- The < 2 s timing is load-sensitive (1.62–1.78 s quiet, 3.7–4.2 s at load average ~5); pre-filtering documents before the survey's `findQaResults` call is a cheap speed-up
