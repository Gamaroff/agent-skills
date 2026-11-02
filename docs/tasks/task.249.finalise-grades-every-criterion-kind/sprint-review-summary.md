# Sprint Review Summary - /finalise grades every kind of criterion fairly

**Story/Task ID:** task.249
**Completed Date:** 2026-11-01
**Completed By:** Lorien Gamaroff (pipeline: /develop-next → /develop-task)
**Pull Request:** [#805](https://github.com/Gamaroff/agent-skills/pull/805)

---

## Summary

`/finalise` used to fail or mis-grade criteria whose only evidence is a CI state, a process, or a record. It also failed probe cases that are stricter than the specification. It now grades each kind on its own terms. `review-task` and `review-story` also catch a criterion that demands a record but does not say where the record lives.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] #1: `computeOverall` never returns PASS while any criterion is `DEFERRED-CI`. A mutation-proven test pins this.
- [x] #2: Finalise Step 6 action 2a grades `DEFERRED-CI` from CI reading 1: SUCCESS → PASS, FAILURE → FAIL, anything else stays deferred. It then rebinds `AC_OVERALL`.
- [x] #3: The AC prompt defines the process and CI-state kinds (five test-free kinds), and a measured criterion cites the QA report, the gate or the DoD.
- [x] #4: The security prompt requires `spec_ref` on each inline case and defines `spec_challenges[]`. Step 3b.1 item 3a moves a case that contradicts its specification to `spec_questions[]`.
- [x] #5: `review-task` and `review-story` flag, as Important, a criterion that demands a record but does not say where it lives.
- [x] #6: `npm run ci` passes, and `npm run test:clean-checkout` passes. This was graded from CI reading 1 by the mechanism above.
- [x] #7: `npm run bundle:check` reports 0 problems.
- [x] #8: CHANGELOG `[Unreleased]` cites task 249.

### Key Features Implemented

- **DEFERRED-CI end to end**: the AC agent defers a CI-state criterion. Step 3c folds it as not met. Step 6 grades it from CI reading 1 and re-folds the verdict. The verdict is re-graded on every run, never carried.
- **Record-gated action 2a**: this run's AC record is the signal that Step 3c merged. If the merged result belongs to another work item or another run, the action HALTs.
- **Spec-tied probe verdicts**: every inline probe case names the specification line it rests on. A case that contradicts its line is a question for the owner, not a security FAIL.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-rerun-scope.js`: `isCiState`, `ciResolution`, the `resolve-ci` command, and re-grading of CI-state entries
- `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-dod-security-prompt.md`: the new criterion kinds, and `spec_ref` / `spec_challenges[]`
- `skills/finalise/SKILL.md`: Step 3b.1 item 3a, Step 6 action 2a, and the render templates
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`, `skills/create-story/SKILL.md`: the record-location check
- `shared/resources/tests/finalise-deferred-ci.test.mjs`, `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`: engine and fence tests

### Architecture/Design Decisions

The CI-state verdict belongs to a single head's reading, so it is never carried between runs. Step 6, not the AC agent, grades it, because only Step 6 holds a CI reading.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 33 tests in `finalise-deferred-ci.test.mjs`, plus the AC-kinds tests. `ci:fast` ran 7040 tests with 0 failures.
- **Mutation proofs:** every QA fix went red on revert.

### Code Review

- **Reviewers:** the QA loop's code reviewer (5 cycles, blocking), and the Step 5c `/review-pr` review
- **Approval Status:** ✅ Approved (`task.249.pr-review.1…`, APPROVE)
- **Review Comments Addressed:** 10 of 10 QA findings fixed

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets, and no new unsafe patterns
- [x] The `ciResolution` boundary was probed: 20 cases, 0 reproduced, 0 escaped
- [x] No dependency changes

### Compliance Review

✅ Not applicable: internal tooling, with no regulated data.

---

## Documentation

- [x] CHANGELOG entry (task 249)
- [x] Skill and shared-prompt docs updated
- [x] DoD summary: `task.249.dod.1.finalise-grades-every-criterion-kind.md`

---

## Demo Notes

### How to Verify

1. Read this task's own DoD summary. Criterion #6 came back `DEFERRED-CI` from the AC agent.
2. Step 6 action 2a graded it PASS from CI reading 1 and re-folded `AC_OVERALL` from PARTIAL to PASS.
3. Expected outcome: `task.249.dod.1.ac.json` records #6 as PASS, with the CI head in its note.

---

## Impact & Value

### User Impact

A green CI no longer stops a work item at `/finalise`, and a hand-set stop rule no longer has to override it. Process and record criteria get a fair grade.

### Technical Impact

Fewer re-runs of `/finalise`, and probe verdicts tied to the specification rather than to the agent's own judgement.

---

## Known Limitations & Future Work

### Suggested Follow-Up Stories

- Two more skip-path tests for the no-record HALT (gate 5, future)
- Bind `OWN_RUN` once, beside `OWN_DOC`
- Normalise backslash paths before the ownership basename cut

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
