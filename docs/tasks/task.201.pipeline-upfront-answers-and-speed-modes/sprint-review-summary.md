# Sprint Review Summary - Pipeline up-front answers and speed modes

**Story/Task ID:** task.201
**Completed Date:** 2026-10-11
**Completed By:** Lorien Gamaroff (with Claude)
**Pull Request:** [#632](https://github.com/Gamaroff/agent-skills/pull/632)

---

## Summary

The develop pipelines now take their setup answers and their speed up front: a developer can answer
Phase 0d's questions with flags, choose a speed mode, and skip steps the project allows, and every
skip is recorded as a `WAIVED` gate with its reason and approver. Per-step timestamps make the effect
measurable.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] No flags and no policy leaves behaviour unchanged
- [x] `--defaults` asks nothing; each answer's source is shown in the pre-flight summary and logged
- [x] A flag that contradicts the epic's `branch_model` or Q1/Q2 agreement is asked about, not applied
- [x] A `--skip` outside `develop.skippable` is refused with its reason, and the run continues unskipped
- [x] A skipped step makes the gate `WAIVED` with reason and approver, and the DoD shows it
- [x] No floor step (branch, PR, finalise, commit, tracker signals) can be skipped
- [x] A resumed run reuses the persisted answers and asks nothing already answered
- [x] Step 2 is skipped and logged when a current review exists (`reviewed_blob:`)
- [x] Implementation reports carry a UTC timestamp per step
- [x] No consumer-specific names; every limit comes from `skills-config.yaml`
- [x] Bundle clean, copies regenerated, CI green
- [x] `develop-next` and `develop-batch` pass `--defaults` instead of restating the question set

### Key Features Implemented

- **Answer resolution engine** (`shared/resources/pipeline-answers.js`): flag → policy → recommendation → ask, with conflicts stated rather than settled.
- **Speed modes and skips**: `--mode standard|lite|fast` and `--skip`, bounded by `develop.defaultMode` / `develop.skippable`; a skip turns the gate `WAIVED`, never `PASS`.
- **Step 2 reuse**: `review-report-freshness.js` matches a review on the document's git blob.
- **Per-step timestamps**: a `Completed (UTC)` column in every Pipeline Progress table.

---

## Technical Details

### Files Modified/Created

33 source files outside the bundled copies and the work-item directory (see the task's § 7 Files
Summary): two engines (`pipeline-answers.js`, `record-reviewed-blob.js`), the Phase 0 / lite-mode /
Step 2 / QA-loop / resume / Step 8 contracts, the implementation-report template, `develop-next`,
`develop-batch` and `finalise` skill files, and new tests `pipeline-answers.test.mjs`,
`pipeline-answers-docs.test.mjs`, `pipeline-answers-generic.test.mjs`.

### Architecture/Design Decisions

The decision lives in one engine that every orchestrator calls, so the question set is never restated
in prose; orchestrators pass `--defaults` and the engine derives each answer per item (the fix for the
bug.18 class).

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None — no flags and no policy reproduces the previous behaviour

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 173 tests across the six task.201 test files; full fast gate 5305 tests, 0 failed
- **Test Coverage:** every success criterion held by a test that runs per PR

### Code Review

- **Reviewers:** none required by the host; Step 5c `/review-pr` APPROVE (`task.201.pr-review.3`)
- **QA:** 8 cycles, final gate PASS 100/100

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — no secrets, no shell spawns in shipped code; the ref-name boundary
`pipeline-answers.js#isRefName` probed with 72 candidates, 0 reproduced.

### Compliance Review

⚠️ **Not applicable** — developer pipeline tooling (no PII, payments, UI or PHI).

---

## Documentation

- [x] `CHANGELOG.md` `[Unreleased]` entry
- [x] `docs/reference/configuration.md` — `develop.defaultMode`, `develop.skippable`
- [x] `docs/operations/workflows.md` — "Up-front answers and speed modes"

---

## Demo Notes

### How to Verify

1. Run `/develop-task <task> --defaults` and confirm the pre-flight summary shows a source for each answer and nothing is asked.
2. Run with `--skip review` while `develop.skippable` is empty; confirm the skip is refused with its reason and the run continues.
3. Add `review` to `develop.skippable` and repeat; confirm the QA gate reads `WAIVED` with an approver.

---

## Known Limitations and Future Work

- Deferred: re-measure step timings in the reporting consumer over its first ~15 items.
- Low QA advisories on docs test 2d (awk tier not proven to run; python tier not pinned; env not allow-listed) — gate 8 `recommendations.future`.
