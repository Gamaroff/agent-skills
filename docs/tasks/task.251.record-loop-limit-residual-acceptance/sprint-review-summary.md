# Sprint Review Summary - Record loop-limit residual acceptance

**Story/Task ID:** task.251
**Completed Date:** 2026-11-03
**Completed By:** Lorien Gamaroff (owner acceptance of the loop-limit residual); pipeline run by Claude
**Pull Request:** [#815](https://github.com/Gamaroff/agent-skills/pull/815)

---

## Summary

When the owner accepts the residual after a QA loop-limit escalation, one writer now records that decision as a gate waiver and returns the run to Step 5c. The conformance lens, `/finalise`, `develop-next` and `develop-batch` then all read the same fact.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A task.250-shaped gate is accepted: gate `WAIVED`, entries `waived`, head unchanged, report moved to `Proceeding to 5c`.
- [x] Six refusal states write nothing; an empty approver exits 2.
- [x] A second run answers `already`; a run resumed after a Stop finishes the report.
- [x] The writer holds in the reconstruction states.
- [x] The lock reads `qa_phase: 5c` afterwards and restores from the right snapshot.
- [x] Both HALT messages and both Phase 0b prompts name the accept path.
- [x] `develop-next` and `develop-batch` read the written gate as mergeable; the hand-edited control still halts.
- [x] The lens raises no trail finding on a processed report and still raises it on the control.
- [x] The writer runs in 0.057 s; `npm run ci` is +1.3% against develop.

### Key Features Implemented

- **`accept-qa-residual`**: one engine plus a shell wrapper that records the owner's acceptance in the gate and the report, then re-enters at 5c.
- **Flow-entry safety**: one scanner (`flowSpan`) defines the extent of a flow-style gate entry; shapes it cannot read are refused with nothing written.
- **Pipeline wiring**: HALT option 2 and the Phase 0b prompts offer "Accept the residual" for loop-limit halts only.

---

## Technical Details

### Files Modified/Created

- `shared/resources/accept-qa-residual.js` and `.sh` - the writer (bundled copies under `skills/develop-{task,story}/references/`)
- `shared/resources/tests/accept-qa-residual.test.mjs` and `accept-qa-residual.test.sh` - 31 engine tests and the lock suite
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-resume-contract.md`, three SKILL.md files - the HALT, resume and merge-rule prose
- `evals/` - two replay fixtures and the develop-next merge-rule unit test

### Architecture/Design Decisions

The accepted run leaves the loop on the existing `WAIVED → 5c` route, so no reader needed a new rule. The writer is the single place that records the decision.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 31 engine tests, a lock suite and a merge-rule unit test; full `npm test` 7147 tests, 0 failed
- **Test Coverage:** every refusal state and both reconstruction states

### Code Review

- **Reviewers:** QA code review each of five cycles; Step 5c conformance review
- **Approval Status:** gate 5 WAIVED by the owner; PR review CONCERNS (3 documentation findings, fixed)
- **Review Comments Addressed:** all except bug 7, accepted

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] The accept/refuse decision is a boundary: 9 probes executed, 0 reproduced, 0 escapes
- [x] No secrets, no new dependencies

### Compliance Review

✅ **Not applicable** - internal pipeline tooling

---

## Documentation

### Updated Documentation

- [x] CHANGELOG entry (task 251)
- [x] Pipeline prose and the three SKILL.md files

---

## Demo Notes

### How to Verify

1. Take a gate with `CONCERNS` and an open finding after a loop-limit halt.
2. Run `accept-qa-residual.sh <doc-dir> <report> "<approver>" "<reason>"`.
3. The gate reads `WAIVED`, the report reads `Proceeding to 5c`, and the lock reads `qa_phase: 5c`.

---

## Impact & Value

### Technical Impact

The loop-limit option 2 now has a working writer. Before it, option 2 was refused twice by the lens and the acceptance was hand-edited on task.250.

---

## Known Limitations & Future Work

### Current Limitations

- Bug 7 (accepted): an empty status value in a flow-style entry is edited to `status:waived` with no space. The pipeline writes block style, so it never occurs.
- Two low advisories remain: no timeout on the `qa-cycle.sh` spawn, and a re-run log that reads "none newly waived".
