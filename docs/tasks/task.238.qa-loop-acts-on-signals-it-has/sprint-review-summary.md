# Sprint Review Summary - QA loop acts on the signals it already has

**Story/Task ID:** task.238
**Completed Date:** 2026-10-28
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#770](https://github.com/Gamaroff/agent-skills/pull/770)

---

## Summary

The QA loop (Steps 5–6) now acts on four signals it already held: a red CI result on the PR, a red fast gate that produced no result, a red gate log, and a 5c coverage finding that `/finalise` was certain to fail.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-1: every fast-gate block keeps its log on a red exit and removes it only on exit 0
- [x] SC-2 (amended): 5b step 0a classifies a red gate as *not measured* or *attributable red*, and never compares it with the PR base
- [x] SC-3 / SC-3a: `/qa-task` and `/qa-story` read the PR's CI once at Step 10 (GitHub and Bitbucket), and the PR Existence Check works on Bitbucket
- [x] SC-4 / SC-4a / SC-4b: a 5c `CONCERNS` with an open coverage finding goes back to 5b, `/qa-fix` has a ladder row for it, and resume follows the same split
- [x] SC-5 / SC-6: no CI wait and no second gate run
- [x] SC-7 to SC-12: ci:fast, bundle:check and validate pass; every guard is mutation-proved; the CHANGELOG entry and the restatement sweep are done

### Key Features Implemented

- **Gated log cleanup**: a red gate log survives for triage instead of being deleted with the green one (obs #41)
- **Red-gate classification** (`fast-gate-outcome.sh`): a killed or timed-out run is *not measured* and gets one re-run; any other red is attributable (obs #14)
- **One-time CI read** (`qa-ci-read.sh`): a failing check that is green on the base becomes a medium gate entry; one also red on the base is advisory (obs #45)
- **Coverage route**: 5c `CONCERNS` with an open `category: coverage` finding spends a QA cycle rather than reaching a certain `/finalise` HALT (obs #8)

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b step 0a outcomes, 5c verdict table and open-coverage reader
- `shared/resources/fast-gate-outcome.sh`, `shared/resources/qa-ci-read.sh` (new): the classifier and the CI reader
- `shared/resources/develop-pipeline-resume-contract.md`: the 5c `CONCERNS` resume split
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`: VCS-branched PR Existence Check, Step 10 CI read
- `skills/qa-fix/SKILL.md`: the coverage priority row
- `skills/develop/SKILL.md`, `skills/develop-bug/…`, `test-failure-triage-prompt.md`: gated cleanup
- Tests: `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`, `shared/resources/tests/qa-ci-read.test.mjs`, `evals/shared/tests/pr-review-loop-parity.test.mjs`, qa-task/qa-story suites

### Architecture/Design Decisions

QA cycle 6 deleted the *pre-existing red* outcome at the third strike: three gates each found another `node --test` log shape that it misread. A replacement must compare structured results from runs it controls. That is recorded in Deferred Work.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** No API change. Three pipeline behaviours change; none needs migration (task § 5)

---

## Testing & Quality Assurance

### Test Coverage

- **Tests:** 6535 in the suite at gate 10. The new suites are listed above
- **QA cycles:** 10 (gate 10 CONCERNS 90, no open entry). 19 bug reports, all closed

### Code Review

- **Reviewers:** pipeline `/review-pr` (5c), 4 passes; the latest is APPROVE (`task.238.pr-review.4`)
- **Approval Status:** ✅ Approved (5c); the host requires no review
- **Review Comments Addressed:** doc-only PC-4 and PC-5 fixed; PC-1 and PC-2 in the implementation report at Step 8; PC-3 recorded

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Caller-supplied values allow-listed (`--vcs`, `--pr`, `--exit`)
- [x] No hardcoded secrets; the Bitbucket credential comes from `bitbucket-auth.sh`
- [x] Probe run: 119 cases, 0 escaped. 1 reproduced, CR10-1 (low), deferred by the owner to task.240
- [x] No dependency changes

### Compliance Review

✅ **Not applicable**: internal tooling with no personal, payment or health data and no UI.

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` entry citing task 238
- [x] develop-task and develop-story README flow diagrams
- [x] Skill prose for qa-task, qa-story, qa-fix, develop, develop-bug, review-pr, and the shared loop and resume docs

### Documentation Links

- [Task document](./task.238.qa-loop-acts-on-signals-it-has.md)
- [DoD run 2](./task.238.dod.2.qa-loop-acts-on-signals-it-has.md)

---

## Demo Notes

### How to Verify

1. `command node --test evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs shared/resources/tests/qa-ci-read.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs`
2. `bash shared/resources/fast-gate-outcome.sh --log <a red gate log> --exit 1` prints `GATE_OUTCOME=attributable`; `--exit 137` prints `not-measured`
3. Expected outcome: all green

---

## Impact & Value

### User Impact

Pipeline runs stop wasting a QA cycle or a `/finalise` HALT on signals the loop already had: a red CI lane, a killed gate run, a deleted log, or a coverage gap.

### Technical Impact

Two small, tested engines replace prose rules that drifted. The 5c verdict table now routes on what the review found, not on the verdict token alone.

---

## Known Limitations & Future Work

### Current Limitations

- CR10-1: the §5c open-coverage awk reads a count for a second `findings:` list cut short, where `unreadable` is correct (low; 0 of 185 tracked reports)

### Suggested Follow-Up Stories

- task.240 (#771): replace the open-coverage awk with a fail-closed parser
- A structured pre-existing comparison for the fast gate (task Deferred Work; no task document yet)

---

## Metrics _(if applicable)_

- **Estimated effort:** 13 hours
- **Commits:** 19
- **Lines Changed:** +15691 / −323 across 178 files (most of the volume is QA records and generated `references/` copies)

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
