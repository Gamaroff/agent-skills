# Sprint Review Summary - QA escalation and grant say what will run

**Story/Task ID:** task.239
**Completed Date:** 2026-10-29
**Completed By:** develop-next (autonomous run; acceptance by recorded user override on SC-11)
**Pull Request:** [#779](https://github.com/Gamaroff/agent-skills/pull/779)

---

## Summary

When the QA loop escalates, its message and the re-entry grant now say what the resumed run will do. The option is named by its action. The recommendation only proposes moves the third-strike rule allows. A grant of k cycles now delivers k cycles.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-1: `grant-qa-cycles.sh` writes `convergence_from_cycle` (the grant's base plus 1) in the same atomic write, and prints it
- [x] SC-2: the Convergence check counts only readings from the grant's window. The task.215 case no longer trips, and the control still trips
- [x] SC-3: every live site says "Resume the QA loop with {k} more cycles", and Phase 0b reports `reenter_at`
- [x] SC-4: both escalation templates run the third-strike comparison and recommend only delete, replace or waive for a struck file
- [x] SC-5: the not-converging variant carries a Flat-count reading (stall or discovery). The trip formula is unchanged
- [x] SC-6: the grant is still one script call
- [x] SC-7: each escalation runs the comparisons its halt calls for (reworded twice during finalise to what shipped)
- [x] SC-8 to SC-10: `ci:fast`, `bundle:check` and `validate` are green
- [x] SC-11: every new guard is mutation-proved. M1–M36 are recorded in commit messages; the last three are accepted by override without a sixth DoD run
- [x] SC-12: a lock without the field resumes with today's behaviour
- [x] SC-13: CHANGELOG [Unreleased] entry

### Key Features Implemented

- **Action-named grant**: the Phase 0b option names what the grant does, not a phase
- **Post-grant Convergence window**: `convergence_from_cycle` restarts the three-reading rule, so a grant is not consumed by readings from before it
- **Third-strike-compliant escalation**: the entry lists third-strike files and recommends only the moves the resumed run will accept
- **Stall or discovery reading**: the escalation says whether the same mechanism repeated or new ground was found

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: window clause, worked-example table, both templates, filling rules
- `shared/resources/grant-qa-cycles.sh`: writes and prints `convergence_from_cycle`
- `shared/resources/develop-pipeline-{pause,resume-contract,hooks}.md`, `pipeline-resume-detector-prompt.md`: lock schema and grant step
- `skills/develop-{task,story}/SKILL.md` and `README.md`: Phase 0b label and `reenter_at` report
- `evals/shared/tests/qa-escalation-template.test.mjs` (new), `qa-loop-lock-fields-parity.test.mjs`, `shared/resources/grant-qa-cycles.test.sh`: guards
- `docs/reference/troubleshooting.md`, `CHANGELOG.md`

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. A lock without the new field reads it as 1, which is today's behaviour

---

## Testing & Quality Assurance

### Test Coverage

- Six QA cycles. Gates 1–4 were CONCERNS; gates 5 and 6 were PASS (100). Two task bugs were filed and both are closed
- `ci:fast`: 6742 tests, 0 failed
- 36 recorded mutations, each red and then restored green

### Code Review

- **Reviewers:** Step 5c `/review-pr` (APPROVE); the repository requires no human review
- **Approval Status:** ✅ Approved

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] `grant-qa-cycles.sh` probed as a boundary in each of the five DoD runs: 30 cases per run, none reproduced, no escapes
- [x] No secrets, no `eval`, no jq filter built from strings, no new dependencies

### Compliance Review

✅ Not applicable: internal developer tooling with no personal, payment, health or UI data.

---

## Documentation

- [x] CHANGELOG [Unreleased] entry citing task 239
- [x] `docs/reference/troubleshooting.md` grant entry
- [x] Both develop READMEs: diagrams and write-set notes

---

## Demo Notes

### How to Verify

1. `command node --test evals/shared/tests/qa-escalation-template.test.mjs`. All 8 pass
2. `bash shared/resources/grant-qa-cycles.test.sh`. The output line now ends `convergence_from_cycle=N`
3. Read the escalation templates in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`. Each has a **Third-strike files** field before **Recommended next steps**

---

## Impact & Value

### User Impact

An operator resuming a halted QA loop sees what the grant does. The pipeline then runs the cycles it promised, and it never recommends a fix the resumed run will refuse.

### Technical Impact

The grant and the escalation template agree with the rules that run after them. Each of those rules is held by a test.

---

## Known Limitations & Future Work

### Current Limitations

- SC-11's last three mutation records (M34–M36) were accepted by override, without a sixth DoD run
- Filling rule 2's "previous gate's `high_files` output" wording is not pinned word for word

### Suggested Follow-Up Stories

- Pin filling rule 2's wording in a test
- Factor the two filling-rules row lookups into one bounded helper (QA6-CR-2)
- Look at why each `/finalise` AC run judged the criteria more finely than the last (five runs on this task)

---

## Metrics

- **Lines Changed (outside docs/tasks):** 44 files, +1091 / -144

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
