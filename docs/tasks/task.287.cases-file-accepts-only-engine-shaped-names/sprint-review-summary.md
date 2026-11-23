# Sprint Review Summary - cases_file accepts only engine-shaped names

**Story/Task ID:** task.287
**Completed Date:** 2026-11-23
**Pull Request:** [#933](https://github.com/Gamaroff/agent-skills/pull/933)

---

## Summary

The security probe plan's `cases_file` route now refuses any file name the engine does not itself write, so a plan cannot point the runner at an arbitrary JSON array in the work-item directory.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Engine-shaped names (`…security.cases.json`, `…security.cases.<n>.json`) are accepted
- [x] Plain and near-miss names are refused as `plan-entry-cases-file-bad-name-shape`, and the reuse check names `cases-file-bad-name-shape`
- [x] Task 269's committed plans still reuse; task.304's plan, which names a non-engine file, stays not-reusable
- [x] A bad-shape name never reaches `lstat`
- [x] Mutation proof recorded, no new test over one second
- [x] CI green, bundle check clean, CHANGELOG entry and wording updated

### Key Features Implemented

- **Name-shape refusal**: `resolveCasesFile` in `shared/resources/security-probe-plan.mjs` answers `bad-name-shape` after the confinement check and before any filesystem call.
- **Tests**: five new tests, four of which go red when the check is disabled; a corpus control over 31 committed plans.
- **Wording**: the DoD security prompt and `skills/finalise/SKILL.md` state the accepted shape.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe-plan.mjs` - the named pattern and the refusal
- `shared/resources/tests/security-probe-plan-cases-file.test.mjs` - fixtures re-pointed, five tests added
- `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md` - shape wording, plus three generated copies
- `CHANGELOG.md` - Fixed entry citing task 287

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** A hand-named cases file is now refused. Migration: name it in the engine shape, or put the cases inline.

---

## Testing & Quality Assurance

- **Unit Tests:** 16 in the changed file (5 new); fast gate 8741 tests, 0 fail
- **Security probe:** 8 candidates executed against the boundary, 0 reproduced
- **QA gate:** PASS, 95/100; review report: APPROVE

---

## Known Limitations and Future Work

- The pattern also accepts the bare name `.security.cases.json` and zero-padded indices (QA advisory CR-1, in the gate's `recommendations.future`).
- A probe of `casesFileAccepted` with the stock `path` corpus now reads `unverifiable`; supply a cases file.
