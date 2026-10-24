# Sprint Review Summary - Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block

**Story/Task ID:** task.227
**Completed Date:** 2026-10-24
**Completed By:** Lorien Gamaroff (develop-next pipeline)
**Pull Request:** [#746](https://github.com/Gamaroff/agent-skills/pull/746)

---

## Summary

The Step 8 Completion Checklist used to mix `rm` lines with must-pass checks, and the host could refuse the whole block. It now runs no `rm`. `advance-pipeline-lock.sh --complete` removes the run's state records itself, keeping the two hold records while Step 4's held files are still unrestored.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `--complete` with a lock removes the five Step 4 / 5c records and the lock. The two hold records are kept while `--hold-state` reads pending.
- [x] `--complete` with no lock removes the same records and exits 0.
- [x] An unrelated file in `.claude/state` survives.
- [x] The Completion Checklist block carries no `rm`, and a guard test fails if one is added.
- [x] `npm run ci` and `bundle:check` pass (the full `npm run ci` re-runs at the merge gate).
- [x] The implementation report records both Phase 2 mutations.
- [x] CHANGELOG and usage text name the change.

### Key Features Implemented

- **`--complete` owns the removals**: both arms remove `step4-scope-paths.txt`, `step4-held-paths.txt`, `step4-hold-dir.txt`, `5c-carry-eligible.txt` and `5c-carry-classified.txt`.
- **`--hold-state`**: a new read-only mode. One `hold_state` rule answers `clear` or `pending: <why>`, and both `--complete` and Step 8 read it.
- **`rm` guard**: `shared/resources/tests/lib/rm-invocation.mjs` (`lineRunsNoRm`) matches `rm` as one word after unquoting. The checklist test applies it to every fenced block that calls `--complete`.

---

## Technical Details

### Files Modified/Created

- `shared/resources/advance-pipeline-lock.sh`: the removals in `--complete`, `hold_state`, `--hold-state`, usage text
- `shared/resources/develop-pipeline-step-8-commit.md`: the checklist's `rm` lines are gone; the held-files check reads `--hold-state`
- `shared/resources/advance-pipeline-lock.test.sh`: scenario 15, both arms and six hold states
- `shared/resources/tests/step-8-completion-checklist.test.mjs`: the guard and the hold-record cases
- `shared/resources/tests/lib/rm-invocation.mjs`: the `rm` matcher
- `CHANGELOG.md`, and 15 bundled copies under `skills/*/references/`

### Architecture/Design Decisions

The rule for keeping the hold records is stated once (`hold_state`), so the removal and the check cannot disagree. Two copies of it disagreed in QA cycle 3.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** Small. `--complete` now removes five records beside the lock. No caller needs a migration.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** lock suite 102/102 and checklist suite 64/64, under bash and zsh
- **Mutation proofs:** 2 in Phase 2, plus 4 in QA cycle 4, all covered

### Code Review

- **Reviewers:** QA code lens in each of 4 cycles; 5c `/review-pr` conformance lens
- **Approval Status:** ✅ APPROVE (5c); the host requires no human review
- **Review Comments Addressed:** all HIGH and MEDIUM fixed; 2 LOW carried

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets, no unsafe patterns, no new dependencies
- [x] Probed `lineRunsNoRm` and `hold_state` (both modes): 30 executed, 0 reproduced, 0 escaped

### Compliance Review

Not applicable: internal pipeline tooling with no personal data, payments or UI.

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` entry (task 227)
- [x] Script header and `usage()`
- [x] Step 8 step doc (source and bundled copies)

---

## Demo Notes

### How to Verify

1. `bash shared/resources/advance-pipeline-lock.test.sh` shows scenario 15 green.
2. `command node --test shared/resources/tests/step-8-completion-checklist.test.mjs` shows the guard green.
3. Add an `rm -f` line to the Step 8 checklist block and re-run step 2: the guard goes red.

---

## Impact & Value

### User Impact

A hands-free pipeline no longer stalls at Step 8 when the host refuses a block that mixes deletes with checks.

### Technical Impact

One owner for the run records' removal, and one rule for the hold records.

---

## Known Limitations & Future Work

### Current Limitations

- TASK-227-QA4-1 (LOW): Step 4's Restore Held Files still decides by its own `ls -A` test. This behaviour predates the task.
- TASK-227-QA4-2 (LOW): a hold dir whose parent cannot be searched reads `clear`.

### Suggested Follow-Up Stories

- Point Step 4 Restore Held Files at `--hold-state`, and remove the hold dir only after `cp` succeeds.
- A halt-snapshot check in the no-lock arm (gate 2 CR-1).

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
