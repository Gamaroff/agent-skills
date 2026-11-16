# Sprint Review Summary - Halts and re-entries leave and read true state

**Story/Task ID:** task.276
**Completed Date:** 2026-11-16
**Completed By:** develop-next (autonomous run, `--defaults`)
**Pull Request:** [#913](https://github.com/Gamaroff/agent-skills/pull/913)

---

## Summary

A pipeline HALT now writes its snapshot and removes its lock in one checked call. The restore path no longer destroys the snapshot a QA re-entry needs. The re-entry gives one ordered remedy, counts QA cycles once, and a stale resume prompt is caught before it re-runs a finished cycle.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] After each HALT path the lock is absent and the snapshot present (`--halt` test, plus a test that extracts and runs each of the three SKILL.md HALT fences).
- [x] `--restore` refuses a DoD-gaps snapshot and the re-entry script succeeds from it, shown by one test that runs the two in order.
- [x] The budget base equals the number of distinct QA cycles on a report that holds both heading sets.
- [x] `npm test` wall time within 10% of `develop`: +3.4% wall, -1.7% suite time (median of five alternating pairs, uptime recorded).
- [x] Every change has a named mutation proof in a QA report.
- [x] `bundle --check` 0 problems and CI `test` green; shellcheck clean on 145 scripts.
- [x] Every `--restore` caller is listed with its `git grep` and each is correct under the guard.

### Key Features Implemented

- **`advance-pipeline-lock.sh --halt`**: writes the snapshot first, removes the lock after, checks the result.
- **DoD-gaps restore guard**: `--restore` refuses a step-7 halt over a DoD that reads GAPS; `--allow-dod-gaps` is the one bypass, used by `reenter-qa-after-finalise.sh`.
- **Ordered `no-code-moved` route**: untracked files name commit-and-re-run first; a clean tree names step 7 alone.
- **`qa-report-cycles.sh`**: one count of distinct QA cycles, used by the re-entry and `grant-qa-cycles.sh`.
- **`resume-prompt-check.sh`**: compares a named step and cycle to run state and artefacts.

---

## Technical Details

### Files Modified/Created

- `shared/resources/advance-pipeline-lock.sh` - `--halt`, `--newest-dod`, the restore guard
- `shared/resources/reenter-qa-after-finalise.sh` - ordered refusal routes, distinct budget base
- `shared/resources/grant-qa-cycles.sh` - distinct budget base
- `shared/resources/qa-report-cycles.sh`, `resume-prompt-check.sh` - new, each with a test suite
- three SKILL.md HALT fences (`develop-story`, `develop-task`, `develop-bug`), the resume contract, and three behaviour docs
- `tests/halt-fence.test.js` - extracts and runs each fence

### Architecture/Design Decisions

- Decision made for the user (obs #75): the task text said to refuse `no-code-moved` on untracked files. That contradicts a test-pinned earlier behaviour, so the refusal became an ordered route instead.
- The guard is keyed on `halt_step` 7 plus the newest DoD reading GAPS, because no writer emits a `finalise-dod-gaps` token.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

### Test Coverage

- **Shell suites:** `advance-pipeline-lock`, `reenter-qa-after-finalise` (83), `qa-report-cycles`, `resume-prompt-check`, `set-qa-phase`, `set-waiting-on`, and `tests/halt-fence.test.js`.
- **Remote CI-parity suite:** 8,500+ tests pass.
- **QA gates:** CONCERNS 80, CONCERNS 85, PASS 92, PASS 92, PASS 92 (five QA cycles).

### Code Review

- **PR review:** APPROVE (`task.276.pr-review.2`), after a CONCERNS conformance review at cycle 3.
- **Independent review:** did not run in cycles 4 and 5 (the delta was read inline or was documentation only).

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] The restore, re-entry, grant and resume-check scripts were probed: 44 hostile or legitimate inputs executed, 0 reproduced.
- [x] No hardcoded secrets, no new eval or exec patterns.

### Compliance Review

Not applicable: pipeline shell scripts and documentation only, no personal data, payments, UI or health data.

---

## Documentation

### Updated Documentation

- [x] Resume contract, pause and hooks docs, resume-detector prompt
- [x] CHANGELOG entry citing `(task 276)`

---

## Demo Notes

### How to Verify

1. Run `bash shared/resources/advance-pipeline-lock.test.sh` and `bash shared/resources/reenter-qa-after-finalise.test.sh`.
2. Run `command node --test tests/halt-fence.test.js`.
3. Expected: all pass; reverting the restore guard reds the "ordered" tests.

---

## Impact & Value

### Technical Impact

Five recurring recovery failures (observations #46, #49, #75, #95, #135) stop costing hand-written snapshots, contradictory remedies and miscounted budgets.

---

## Known Limitations & Future Work

### Current Limitations

- T276-QA-6 and T276-QA-7 (low): the relative-lock guard in `resume-prompt-check.sh` calls a `./` lock directory unresolvable, and a stale relative lock message blames the cwd. No writer in the pipeline emits either.

### Suggested Follow-Up Stories

- A test that `grant-qa-cycles.sh` and `accept-qa-residual.sh` relay the DoD-gaps refusal.
- Harden the relative-lock tests (fresh temporary cwd, more path shapes).

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
