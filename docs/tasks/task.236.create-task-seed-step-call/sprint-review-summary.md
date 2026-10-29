# Sprint Review Summary - create-task seeds on the first attempt

**Story/Task ID:** task.236
**Completed Date:** 2026-10-27
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#763](https://github.com/Gamaroff/agent-skills/pull/763)

---

## Summary

`create-task --from-observation` § 1.1 step 3 described the call to `seedFromObservations` in prose
and left out the `taskId` argument the function requires. An agent that followed the step exactly
got an error on its first call. Step 3 is now one runnable block. It reads the task id from the
registry, checks both values, and passes `{ taskId }`, so the seed works on the first attempt.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Exactly one fenced `bash` block in `SKILL.md` calls `seedFromObservations`, and it passes `{ taskId }`
- [x] Two open fixtures produce one seed: both ids, `multiple-entries`, and park conditions naming `task.<TASK_ID>`
- [x] A pair whose frontmatter id disagrees with its file prefix makes the block exit non-zero
- [x] § 1.1 says the task id is read from the registry before the seed
- [x] The new test runs in under 5 s locally on the PR head (4.504 s at load 5.15)
- [x] `from-observation.test.js` is untouched
- [x] `node:test` + `node:assert` only; Prettier clean
- [x] Each Phase 3 mutation turns a named test red
- [x] `validate` and `bundle:check` clean
- [x] CHANGELOG `[Unreleased]` records the change
- [x] No other skill restates the call

### Key Features Implemented

- **Runnable seed block**: § 1.1 steps 3 to 6 now share one heading, and step 3 is a block that single-quotes and validates both values before passing them to node as argv.
- **Executed test**: `seed-step-block.test.js` extracts the block from `SKILL.md` and runs it on fixtures in a consumer-shaped tree.
- **Probe harness**: `seed-block-probe.js` builds the security probe's fence cases from the shipped code. QA and finalise both use it.

---

## Technical Details

### Files Modified/Created

- `skills/create-task/SKILL.md` - § 1.1 step 3 rewritten as a runnable block, plus the registry line
- `skills/create-task/tests/seed-step-block.test.js` - new
- `skills/create-task/tests/seed-block-probe.js` - new (QA cycle 1)
- `CHANGELOG.md` - `[Unreleased]` entry

### Architecture/Design Decisions

The step runs the call instead of describing it, and a test executes that same block. A future edit
that drops the argument therefore fails a test, not a user's first run. The probe counts each case
once per shell, because the engine runs fence cases under bash and, when present, zsh.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 6 tests in `seed-step-block.test.js`; create-task suite 50/50
- **Test Coverage:** every success criterion held by a named test or a recorded measurement; `ci:fast` 6422/0 with the skills symlinks moved aside

### Code Review

- **Reviewers:** QA cycle 1–4 diff reviewers; Step 5c `/review-pr` conformance lens
- **Approval Status:** ✅ Approved (gate 4 PASS 100/100; PR review APPROVE)
- **Review Comments Addressed:** QA cycles 1 and 2 fixed 4 findings; the first finalise gap (CI `36 !== 18`) was fixed by `1689d7cb`; 5c notes PC-1 to PC-4 were applied

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] The seed guard was probed as a boundary (fence form): 18 executed, 0 reproduced, 0 escaped
- [x] No secrets or unsafe patterns introduced
- [x] No dependency changes

### Compliance Review

✅ **Compliance Requirements Met**: not applicable (internal skill docs and tests; no personal data, payments, UI or health data)

---

## Documentation

### Updated Documentation

- [x] `skills/create-task/SKILL.md`
- [x] `CHANGELOG.md`

---

## Demo Notes

### How to Verify

1. `command node --test skills/create-task/tests/seed-step-block.test.js`
2. All 6 tests pass. The block runs on two fixtures and prints one seed whose park conditions name the task id.

---

## Impact & Value

### User Impact

`/create-task --from-observation` seeds a task from observations on the first call, instead of failing and needing the agent to work out the missing argument.

### Technical Impact

A step doc's call to a library is now held by a test that runs the doc's own block.

---

## Known Limitations & Future Work

### Current Limitations

- Performance margin: the test takes about 4.5 s locally against a 5 s bound. The probe test alone takes about 12 s in CI under two shells.
- CR-2 (low): a single quote in a value would end the quotes. Only the step's digits, commas and spaces rule forbids it.

### Suggested Follow-Up Stories

- Move the probe test to its own file, or trim the closure each case embeds.
- Observation #107: `qa-task` could read the PR's latest finished CI result for the head it judges.

---

## Metrics _(if applicable)_

- **Lines of Code Changed:** +760/−7 across 4 files (SKILL.md +50, two new test files +703)

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
