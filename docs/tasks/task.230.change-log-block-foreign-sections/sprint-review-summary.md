# Sprint Review Summary - Keep foreign sections out of the change-log block

**Story/Task ID:** task.230
**Completed Date:** 2026-10-23
**Completed By:** Lorien Gamaroff (develop-task pipeline, via /develop-next)
**Pull Request:** [#735](https://github.com/Gamaroff/agent-skills/pull/735)

---

## Summary

Before this change, a section written inside a document's change-log markers stayed inside the log on every later write. `change-log.js` now lifts any such section out of the markers: above them if it sat before the log, below them if it sat after. A corpus guard keeps every tracked document clean.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The obs #91 document's Deferred Work lands directly above the start marker
- [x] The task.203 shape: a DoD section between the heading and the table moves above the marker
- [x] A sibling section after the table moves directly below the end marker
- [x] Nested `###` subsections, an authoring note and a fenced `## Example` stay put
- [x] A second write lifts nothing and changes only its own row, and no non-blank line is lost
- [x] The Deferred Work placement rule names the marker, in finalise 7.4's words
- [x] The corpus guard runs in under 5 s on the PR head (0.941 s at load 2.35)
- [x] Clean documents are byte-identical, and there is one definition of "foreign"
- [x] task.166, task.170, task.175 and task.203 are repaired; the CHANGELOG states the lift

### Key Features Implemented

- **`foreignSections` / `liftForeignSections`**: report and repair sibling sections inside the markers. `upsertChangeLog` applies the same partition on every write.
- **Log-table choice**: the log's table is picked from its own section first, by position and then by shape. This was hardened over three QA cycles: a heading-anchored run, the own section first, and the rule that a sign-off table is not a log.
- **Corpus guard**: `evals/shared/tests/change-log-foreign-section-corpus.test.mjs` fails CI on any tracked document with a foreign section in its block. It has a floor of 100 blocks and a standing positive control.

---

## Technical Details

### Files Modified/Created

- `shared/resources/change-log.js` — the `partitionForeign` engine, its two exports, and the lift inside `upsertChangeLog`
- `shared/resources/tests/change-log.test.mjs` — K1–K27
- `evals/shared/tests/change-log-foreign-section-corpus.test.mjs` *(new)* — the corpus guard
- `tests/deferred-work-placement.test.js` — asserts the marker-anchored wording
- `shared/resources/document-change-log.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the spec and the placement rule
- task.166, task.170, task.175, task.203 — repaired change-log blocks
- `CHANGELOG.md` — an Unreleased entry

### Architecture/Design Decisions

One partition decides what is foreign, and both the write path and the guard read it. The rule is stated once, in `partitionForeign`'s header comment.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** A document with a foreign section gets a larger diff on its next write, because the section moves out. This is documented in the CHANGELOG.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** `change-log.test.mjs` passes 113/113. The caller suites pass 564/0.
- **Corpus property check:** all 120 tracked blocks, 0 problems.
- **Full CI:** `npm run ci` is green on d40f6552 (6237 pass, 0 fail).

### Code Review

- **QA:** 4 cycles, ending in gate PASS 95. 16 engine mutations were proven across the cycles.
- **PR conformance review (5c):** ✅ APPROVE
- **Carried:** two low findings, TASK-230-CR4-1 and CR4-2, under the task's `## Deferred Work`

---

## Security & Compliance

✅ **Security Review Completed**: a pure string-in, string-out engine with no new secrets or unsafe patterns. `boundary: internal`, with a recorded reason.

✅ **Compliance**: not applicable (internal tooling, no user data).

---

## Demo Notes

### How to Verify

1. Put a `## Deferred Work` section between `<!-- change-log-start -->` and the log's table in any task document.
2. Run `command node -e 'const CL=require("./shared/resources/change-log.js"); …liftForeignSections(doc)'`, or append a row through `upsertChangeLog`.
3. Expected outcome: the section sits directly above the start marker, and the block holds only the heading and the table.
