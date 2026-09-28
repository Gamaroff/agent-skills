# Sprint Review Summary - Close task.162's step-8 follow-ups

**Story/Task ID:** task.163
**Completed Date:** 2026-09-28
**Completed By:** develop-task pipeline (Claude)
**Pull Request:** [#506](https://github.com/Gamaroff/agent-skills/pull/506)

---

## Summary

This task closes the five LOW advisories that task.162 left on the Stop hook's step-8 reason. At lock 8, a develop-bug orchestrator is now told that Step 7's tail ends with the Step 7 Completion Checklist, and every orchestrator is told which steps are still ahead. Both new guards from task.162 now have floors.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] At lock 8 with `skill: develop-bug`, the reason names the Step 7 Completion Checklist after Part B's bug-close routine.
- [x] The resume contract's Phase 0b develop-bug clause says the same, and a parity test goes red if either copy drops it or rewords it.
- [x] At lock 8 the steps-ahead clause reads "the first unfinished row at or below Step 7, if any, then Step 8". At lock 3 it keeps the generic clause.
- [x] The `--complete` population test fails when the hook contributes no line.
- [x] Scenario 4b fails at setup, naming the command, when `command -v` returns empty. A builtin is still skipped.

### Key Features Implemented

- **Step-aware `STEPS_AHEAD`**: the status-block list clause is bound per step, as `POSITION` already is.
- **Hook↔contract parity test**: the test renders the Stop hook at lock 8 and compares each orchestrator's Step 7 tail with the resume contract.
- **Banner-doc deferral**: the Remaining Work Status banner doc defers to the hook's position and list at a Stop-hook re-prompt, and only there.

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-on-stop.sh`: develop-bug `STEP7_TAIL` and the `STEPS_AHEAD` binding
- `shared/resources/develop-pipeline-resume-contract.md`: the Phase 0b develop-bug clause
- `shared/resources/develop-pipeline-remaining-work-banner.md`: the Stop-hook re-prompt exception
- `shared/resources/develop-pipeline-on-stop.test.sh`: scenarios 5b, 5c and 5d
- `shared/resources/tests/step-8-completion-checklist.test.mjs`: the hook floor, the parity test and the banner test
- `shared/resources/advance-pipeline-lock.test.sh`: scenario 4b's three-way case
- `CHANGELOG.md` and the bundled `references/` copies

### Architecture/Design Decisions

QA cycle 2 found that an exception keyed on "a lock at 8" also fired on the ordinary Step 7 → 8 transition, because that transition advances the lock before printing the block. The banner doc therefore no longer restates the hook's lock-8 wording. It defers to the hook's reason at a re-prompt, and a test pins the exception's scope and both halves (position and list).

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. The reason text changes at lock 8 only.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 4 new hook assertions, 2 new tests (parity and banner), and a new floor in the `step-8-completion-checklist.test.mjs` population test
- **Mutation proofs:** 14 (M1–M14), with every restore checked by `cmp`
- **Test Coverage:** every guard is proven red by a committed test, except the 4b empty arm, which has dev-only coverage

### QA Review

- **QA gate:** 3 cycles: PASS 100, then CONCERNS 90, then PASS 100. The loop left through the cosmetic-residue exit.
- **PR review:** `task.163.pr-review.1`, CONCERNS. PC-1 was addressed and CR-1 (LOW) is deferred.

### Code Review

- **Reviewers:** `/review-pr` conformance and code lenses, plus a per-cycle QA diff review (Explore)
- **Approval Status:** ⚠️ CONCERNS (advisory). No formal GitHub review is submitted by the pipeline.
- **Review Comments Addressed:** PC-1 addressed. CR-1 is deferred.

---

## Security & Compliance

### Security Review

- [x] No secrets or unsafe patterns
- [x] The reason is JSON-encoded via `jq --arg`
- [x] The Stop-hook block/allow verdict is unchanged (`boundary: false`)

### Compliance Review

- [x] Not applicable: internal pipeline tooling

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` › Fixed, citing (task 163)
- [x] Resume contract and Remaining Work Status banner doc

### Documentation Links

- `docs/tasks/task.163.stop-hook-step-8-follow-ups/task.163.dod.1.stop-hook-step-8-follow-ups.md`

---

## Demo Notes

### How to Verify

- `bash shared/resources/develop-pipeline-on-stop.test.sh`
- `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`
- `bash shared/resources/advance-pipeline-lock.test.sh`

---

## Impact & Value

### Technical Impact

A develop-bug stall at step 8 is now sent to the whole of Step 7's tail, including the check that decides whether Step 7 finished. The step-8 status block no longer asks for an empty list or one narrower than the rule beside it.

---

## Known Limitations & Future Work

### Current Limitations

- The banner-doc exception restates part of the hook's wording (CR-2 and CR-3, LOW, recorded in gate.3's `recommendations.future`).
- The hook floor is satisfied by comment lines (PR review CR-1, LOW).
- A HALT raised during Step 7's tail at lock 8 renders as a Step 8 HALT. This is pre-existing and not introduced here.

### Suggested Follow-Up Stories

- A task to close the three LOW items above and to name the halting step in a HALT block.

---

**Status:** ✅ **ACCEPTED**
