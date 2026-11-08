# Sprint Review Summary - finalise names its preconditions and standalone routes

**Story/Task ID:** task.272
**Completed Date:** 2026-11-08
**Pull Request:** [#860](https://github.com/Gamaroff/agent-skills/pull/860)

---

## Summary

`/finalise` now lists every missing input, with the route to supply it, before any agent runs. A bug finalised after its PR merged has a defined route: the acceptance commit goes on a docs-only branch off the base, with its own PR.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The preflight names every missing input and route for the task 208/209 shape.
- [x] A post-merge bug run completes the 7.7 and 6a steps on the defined route.
- [x] A run with all inputs present behaves as before.
- [x] `npm test` wall time is within 10% of develop (+0.5%).
- [x] Each check has a mutation proof in the QA report.
- [x] `finalise-bug-mode.test.mjs` passes under `CI=true`.
- [x] `bundle --check` reports 0 problems; the full suite passes.
- [x] The bug-mode table and markers agree for the new `preconditions` key.

### Key Features Implemented

- **Preconditions preflight (Step 0b)**: `finalise-preconditions.js` checks gate or waiver, pr-review or review decision, and PR state.
- **Post-merge bug route**: the linked-issue rung in `resolve-pr-number.sh` and the docs-branch acceptance commit in 6a.
- **Waiver parser**: YAML comments are not values (found by the security probe plan, fixed twice).

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-preconditions.js` - the preflight engine
- `shared/resources/resolve-pr-number.sh` - linked-issue rung
- `skills/finalise/SKILL.md` - Step 0b, bug-mode row, 6a route
- `evals/shared/tests/finalise-preconditions.test.mjs`, `shared/resources/tests/finalise-post-merge-bug-route.test.mjs` - tests with mutation proofs

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- Full `CI=true npm test`: 8102 pass, 0 fail. QA gate 3: PASS 95/100.
- DoD security probes: 54 executed, 0 reproduced on the final head.
