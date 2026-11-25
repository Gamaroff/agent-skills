# Sprint Review Summary - Pipelines spend a CI run only where a run can answer something

**Story/Task ID:** task.319
**Completed Date:** 2026-11-25
**Completed By:** Lorien Gamaroff
**Pull Request:** [#937](https://github.com/Gamaroff/agent-skills/pull/937)

---

## Summary

The develop pipelines no longer push after every step. A commit that holds only records goes out with the next push that needs CI, or once at the end. In the simulated five-cycle run, 9 pushes became 6.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every push site asks `push-policy.sh`, held by a scan test with a non-vacuity case
- [x] The batched and eager push counts of the simulated run
- [x] The pause hook leaves the remote unmoved and says so
- [x] `ci.skipMarker` is never applied to a commit with code
- [x] A command listed in `finalise.rerunAtHead` is run at the head and recorded in the DoD
- [x] The security probe scores an `eslint:` entry
- [x] `finalise-ci-poll.sh` writes the same result line on Bitbucket as on GitHub
- [x] `developNext.tickVia: pr` ticks through a PR merged by the merge gate
- [x] The push counts before and after are in the QA report, with the command
- [x] `npm test` passes under `CI=true`, and every new test was red before its change
- [x] `npm run bundle` leaves no diff
- [x] The four keys are in the configuration reference
- [x] CHANGELOG `[Unreleased]` names each part

### Key Features Implemented

- **Push less:** `push-policy.sh` decides each push; `push-held.sh` sends commits that were held back.
- **Skip marker:** an opt-in `ci.skipMarker` on a record-only head.
- **Two finalise halts removed:** commands re-run at the head, and an `eslint:` entry for the security probe.
- **Bitbucket:** the CI poll and a develop-next tick that goes through a PR.

---

## Technical Details

### Files Modified/Created

- `shared/resources/push-policy.sh`, `push-held.sh`, `finalise-rerun-at-head.js`, `tick-pr.sh` - new engines
- `shared/resources/ci-tree-equivalence.js`, `security-probe.mjs`, `finalise-ci-poll.sh`, `pr-read.sh` - extended
- The pipeline step documents, `finalise`, `develop-next` and `develop-batch` - call the new engines
- `docs/reference/configuration.md` and `CHANGELOG.md` - the four keys and the push rule

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** the default is now `pipeline.pushRecordCommits: batched`; `eager` restores the old behaviour

---

## Testing & Quality Assurance

- **Tests:** `ci:fast` 8890 run, 8887 pass, 0 fail, 3 skipped
- **QA:** nine cycles; gate 9 PASS 100/100; three bugs filed and closed
- **PR review:** APPROVE (review 3)
- **CI:** all six checks green on the final code head

---

## Security & Compliance

- Security probe: 201 candidates over 10 controls, none reproduced
- Compliance: not applicable (no personal data, payment, interface or health surface)

---

## Documentation

- [Configuration reference](../../reference/configuration.md)
- [Docs-only CI skip runbook](../../runbooks/ci-docs-only-skip.md)

---

## Demo Notes

### How to Verify

1. Run `command node --test shared/resources/tests/push-policy.test.mjs`
2. Read its performance line: `pushes before (eager): 9; after (batched): 6`

---

## Known Limitations & Future Work

- Seven low findings are under Deferred Work in the task document.
- `ci.skipMarker` refuses every format character, so an emoji that holds a zero-width joiner is refused.
- A second `pipeline` block spelled with an escaped key is not refused; the owner decides whether it should be.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
