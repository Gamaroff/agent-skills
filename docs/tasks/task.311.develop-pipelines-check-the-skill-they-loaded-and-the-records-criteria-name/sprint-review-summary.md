# Sprint Review Summary - Develop pipelines check the skill they loaded and the records criteria name

**Task ID:** task.311
**Completed Date:** 2026-11-17
**Pull Request:** [#916](https://github.com/Gamaroff/agent-skills/pull/916)

---

## Summary

The develop pipelines now check, with a script, that every sub-skill they load is this repository's copy, and they hand the success criteria that name a record location to the QA step.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `skill-resolution.js check` classifies a synced base directory as shadowed and a repository path as repo; each case has a test and a mutation record.
- [x] The three develop orchestrators cite the rule, and a test runs the cited command from each.
- [x] The QA dispatch passes `record_criteria`, and a test compares the listing with `finalise-record-preflight.js`.
- [x] `skills/qa-task/SKILL.md` lists `record_criteria` and tells QA to write each record.
- [x] The identity check takes a median of 117 ms against a 1 s limit.
- [x] Bundle, format, shell lint and the fast gate pass; the four skills validate.
- [x] CHANGELOG entry and bundled copies are in place.

### Key Features Implemented

- **Skill identity check**: `shared/resources/skill-resolution.js` and its rule document `skill-resolution.md`, run after every sub-skill load.
- **Record hand-off**: a task-only block in the QA-loop step document saves the record criteria and passes them to `qa-task`.

---

## Technical Details

### Files Modified/Created

- `shared/resources/skill-resolution.js`, `skill-resolution.md` - the check and its rule
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - the record hand-off
- `shared/resources/tests/skill-resolution.test.mjs`, `skill-resolution-reach.test.mjs`, `record-criteria-dispatch.test.mjs` - 18 tests
- `skills/develop-task`, `develop-story`, `develop-bug`, `qa-task` - `SKILL.md` and bundled copies
- `CHANGELOG.md`

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none; `record_criteria` is optional

---

## Testing & Quality Assurance

- **Unit Tests:** 18 new tests; fast gate 8554 tests, 0 failed
- **QA Gate:** PASS 100/100 (1 cycle)
- **PR Review:** `/review-pr` conformance review APPROVE
- **Security:** 9 probes, 0 reproduced

---

## Known Limitations and Future Work

- The rule document does not say what to do when a Skill result has no `Base directory` line (it reads `usage`). Low advisory, left for a follow-up.
