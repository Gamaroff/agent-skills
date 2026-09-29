# Sprint Review Summary - Close task.163's deferred follow-ups

**Story/Task ID:** task.164
**Completed Date:** 2026-09-28
**Completed By:** develop-task pipeline (Claude)
**Pull Request:** [#508](https://github.com/Gamaroff/agent-skills/pull/508)

---

## Summary

This task closes the five follow-ups task.163 deferred. The Remaining Work Status banner doc no longer restates the Stop hook's lock-8 wording, which had already drifted from the hook; it defers to the hook and says how to render the list. A HALT status block now names the step that halted, not the lock's `current_step`. Two guards were tightened: the hook's `--complete` floor now counts code lines only, and scenario 4b's missing and builtin arms each have a committed test.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The banner doc's re-prompt exception carries neither the hook's lock-8 position nor its list text, and a test goes red if either returns.
- [x] The exception tells the orchestrator to resolve the reason's list into `- Step N:` lines, pinned by a test.
- [x] The `--complete` population test fails when the hook has fewer than 2 non-comment `--complete` lines.
- [x] The HALT rule names the halting step, with the Step 7-tail at lock 8 case stated, pinned by a test.
- [x] A missing 4b command makes the lock test exit 1 naming it; a builtin exits 0 with a `SKIP` line. Committed tests assert both.
- [x] `ci:fast`, `lint:shell`, `bundle:check` pass; each mutation behaves as stated; the CHANGELOG cites (task 164).
- [~] No measurable performance change beyond the 4b test's three runs: met by measurement (13–16s per run), accepted as a recorded deviation because there is no test for it.

### Key Features Implemented

- **Two named exceptions in the banner derivation rule.** Exception 1 is the Stop-hook re-prompt, which defers to the hook's `POSITION` / `STEPS_AHEAD`. Exception 2 says a HALT names the step that halted and lists it first, and it cites `advance-pipeline-lock.sh`'s `--skill` mapping rather than enumerating it.
- **Tests that compare against the source of truth.** The banner test cuts its forbidden fragments from the rendered hook reason. The HALT pin reads the Step 7 names off the hook and the mapping off the lock script.
- **Scenario 4b test seam.** `ADVANCE_LOCK_TEST_4B_CMDS` reaches the missing and builtin arms, prints a NOTE when set, and is driven by `advance-pipeline-lock-4b-setup.test.mjs`.

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-remaining-work-banner.md`: the two exceptions and the HALT row
- `shared/resources/tests/step-8-completion-checklist.test.mjs`: banner test, HALT pin, non-comment hook floor
- `shared/resources/advance-pipeline-lock.test.sh`: 4b seam, `SKIP` and `NOTE` lines
- `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs` (new): 4b's missing, builtin and default arms
- `CHANGELOG.md` and the three bundled `references/` copies of the banner doc

### Architecture/Design Decisions

QA cycles 1 and 2 each found the banner doc restating a fact owned elsewhere: first the hook's wording, then the lock script's list of self-advancing skills. Cycle 2's fix took qa-fix Step 2.6's **consolidate** move. The doc cites the owner, and a test refuses the restatement.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. The HALT position line changes on one path (a Step 7-tail HALT at lock 8), in printed output only.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 2 rewritten, 1 new (HALT pin), and 1 new file with 3 cases (4b meta-test)
- **Mutation proofs:** 13 (M1–M6, F1–F4, G1–G3), each red with a `cmp`-checked restore
- **CI:** SUCCESS on `bd401f36` (5 checks)

### QA Review

- **QA gate:** 3 cycles: CONCERNS 90, then CONCERNS 90, then PASS 100. The loop left through the cosmetic-residue exit with four LOW carried.
- **PR review:** `task.164.pr-review.1`, ✅ APPROVE (4 LOW; PC-2 fixed)

### Code Review

- **Reviewers:** a per-cycle Explore diff review (cycle 2 as a refute pass), plus the `/review-pr` code and conformance lenses
- **Approval Status:** ✅ APPROVE (advisory; no formal GitHub review is submitted by the pipeline)

---

## Security & Compliance

### Security Review

- [x] No secrets, no unsafe execution (`spawnSync` takes an argv array; the seam is quoted throughout)
- [x] Not a boundary deliverable (`boundary: false`)

### Compliance Review

- [x] Not applicable: internal pipeline tooling

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` › Fixed, citing (task 164)
- [x] Remaining Work Status banner doc and its bundled copies

### Documentation Links

- `docs/tasks/task.164.task-163-deferred-follow-ups/task.164.dod.1.task-163-deferred-follow-ups.md`

---

## Demo Notes

### How to Verify

- `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`
- `node --test shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`
- `bash shared/resources/advance-pipeline-lock.test.sh`

---

## Impact & Value

### Technical Impact

The banner doc has one statement of each fact it depends on, so it can no longer drift from the hook or the lock script unnoticed. A HALT during Step 7's tail now tells the user which step did not finish.

---

## Known Limitations & Future Work

### Current Limitations

- Four LOW findings are carried in `task.164.gate.3` `recommendations.future` (QA-164-10..13), plus PR review CR-1 and CR-2.
- The 4b meta-test re-runs the whole lock test file three times (about 45s in `npm test`).
- `advance-pipeline-lock.sh` maps `review-task` → 3, but `review-task` never self-advances.
- The finalise AC prompt has no path for a measured non-functional criterion (AC7 deviation).

### Suggested Follow-Up Stories

- A task to close the carried LOW items and the finalise AC-prompt gap.

---

**Status:** ✅ **ACCEPTED**
