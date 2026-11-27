# Sprint Review Summary - A measured criterion is re-measured when the head moves

**Story/Task ID:** task.328
**Completed Date:** 2026-11-27
**Completed By:** Lorien Gamaroff (with the develop-task pipeline)
**Pull Request:** [#960](https://github.com/Gamaroff/agent-skills/pull/960)

---

## Summary

A criterion that states a numeric bound ("no test that waits longer than 30 s") is now flagged as `measured`. QA grades its recorded figure the way finalise does: it counts for the current head only when it was taken there, or on a commit whose delta to the head is docs-only. Otherwise QA marks it **unverified** with "re-measure". This closes the gap from task 320, where QA passed a timing that a later config change had invalidated and only DoD run 3 caught it (observation #186).

---

## What Was Delivered

### Acceptance Criteria Met

- [x] #1 Task 320's criterion 10, verbatim, is listed by `finalise-record-preflight.js` with `measured: true`
- [x] #2 The comparatives longer/shorter/faster/slower/larger/smaller/greater, with and without a leading "no", make a record criterion
- [x] #3 A comparison with no number is not listed, and a record criterion with no bound reads `measured: false`
- [x] #4 `qa-task` and `qa-story` cite finalise's Step 3 rule, re-measure, and restate no reason list; a parity test guards this
- [x] #5 Corpus count at head: 375 → 379 newly listed, all four examples given by path (qa.7 addendum)
- [x] #6 Every new test was red before its change; the red-first records are in qa.1–qa.7 and the qa.7 addendum
- [x] #7 Reverting any remedy turns a named test red; the mutation table is in qa.1–qa.7 and the qa.7 addendum
- [x] #8 `npm test` under CI, `npm run bundle` with no diff, and `bundle:check` all green (CI reading 1 SUCCESS @ `8a2b23243`)
- [x] #9 CHANGELOG `[Unreleased]` cites (task 328)

### Key Features Implemented

- **Measured bounds in the preflight**: `NUMERIC_BOUND` recognises comparatives, "or equal to", later/earlier and hedged bounds; `classify` reports `measured`.
- **QA grades a measured figure by finalise's rule**: one paragraph, identical in qa-task and qa-story, cites `finalise-dod-ac-prompt.md` Step 3 rather than restating it.
- **Bundled `finalise-delta.js`** in qa-task and qa-story, so QA runs the same docs-only check finalise does.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-record-preflight.js`: bound regex and `measured` field
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`: the measured-figure paragraph and the `record_criteria` measured sentence
- `skills/qa-{task,story}/references/finalise-delta.js`, `ci-tree-equivalence.js` and other bundled copies
- `shared/resources/tests/finalise-record-preflight.test.mjs`: engine tests
- `evals/shared/tests/qa-measured-figure-parity.test.mjs`: parity tests and 14 calibrations
- `CHANGELOG.md`

### Architecture/Design Decisions

The QA skills cite finalise's rule and do not copy it, so there is still only one definition of "a figure counts for this head". A parity test, calibrated against 14 deliberate breakages, holds the two QA paragraphs identical and the citation intact.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Tests:** engine tests in `shared/resources/tests/finalise-record-preflight.test.mjs` (21) and parity tests in `evals/shared/tests/qa-measured-figure-parity.test.mjs` (21)
- **QA:** 7 gates, the last PASS 100/100. Gates 6 and 7 were owner-approved extra cycles.
- **PR review:** `task.328.pr-review.1…md`, APPROVE
- **DoD:** run 1 found 3 evidence gaps; an owner-approved evidence-only cycle closed them, and run 2 accepted.

---

## Security & Compliance

- **Security:** PASS. The bundled `isDocsPath` and the `finalise-delta.js docs-only` boundary were probed: 48 candidates executed, 0 reproduced.
- **Compliance:** N/A. Internal skill tooling.

---

## Known Limitations and Future Work

- Criterion 5's amendment text still says "only one newly listed criterion exists". The shipped engine lists four. The bound is met, but the owner may want to reword or re-approve the text.
- The calibration tests' red-first records were reconstructed by mutation after the change.
