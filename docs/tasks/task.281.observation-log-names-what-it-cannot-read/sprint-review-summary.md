# Sprint Review Summary - The observation log names what it cannot read

**Story/Task ID:** task.281
**Completed Date:** 2026-11-18
**Completed By:** Claude (develop-next pipeline)
**Pull Request:** [#920](https://github.com/Gamaroff/agent-skills/pull/920)

---

## Summary

The observation log now reports entries whose status it cannot read, instead of counting them as open. `set-status` can repair them, a parked entry can return to open, and the review cycle has a fifth decision, propose a task.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The #44 shape (an illegal status) is named in `queue` and `scan`, flagged by `doctor`, and repairable with `set-status --repair`.
- [x] A parked entry returns to open with `--expect-status parked`, and no other status does.
- [x] `review-cycle.md` lists five decisions.
- [x] `CI=true npm test` wall time is within 10% of `develop`: median 729 s against 737 s (+1.1%), five alternating runs with the load recorded.
- [x] Each change has a mutation proof in the QA report.
- [x] `bundle:check` reports 0 problems and the suite passes.
- [x] `doctor --json` runs clean against the live log.
- [x] Existing `--json` consumers still parse the output; no existing test line was edited.

### Key Features Implemented

- **`invalidStatus` reporting**: `queue` and `scan` list the files whose status is outside the enum; the entry still counts as open.
- **`doctor` `status-legal` check**: fails naming the files, and fails with `scan-broken` on a log it could not read.
- **`set-status --repair`**: writes a legal status over an illegal one; refuses a legal literal or a missing one.
- **Reopen from parked**: `--status open` is accepted only with `--expect-status parked` or `--repair`.
- **Review cycle**: a fifth decision, propose a task, taken only on the user's yes.

---

## Technical Details

### Files Modified/Created

- `shared/resources/observation-log.js` - the engine changes
- `shared/resources/tests/observation-log.test.mjs`, `skills/observe-work/tests/observe-work.test.js` - new tests
- `shared/resources/observation-log-contract.md`, `skills/observe-work/SKILL.md`, `skills/observe-work/references/review-cycle.md` - documentation
- `CHANGELOG.md` - entry citing task 281
- Generated bundle copies under `skills/*/references/`

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none (new fields are additive)

---

## Testing & Quality Assurance

- **Tests:** 97 in the two changed suites; remote `ci:fast` 8601 tests, 8598 pass, 0 fail; CI green on the PR head.
- **QA:** three cycles, gate PASS 100/100 on cycle 3. Cycle 1 found a missing CHANGELOG entry and an unmeasured wall-time criterion; cycle 2 found `doctor` passing an unreadable log.
- **PR review:** `/review-pr` verdict APPROVE, no findings.

## Security & Compliance

- Security review PASS. The `set-status` guards were probed with 10 cases in both directions, 0 reproduced.
- Compliance: not applicable (internal tooling).

---

## Follow-ups

- Tighten the `status-legal` row in `skills/observe-work/SKILL.md`, which gives two actions in one row (recorded in the gate).
- The task text says `--status open` needs `--expect-status parked`; `--repair` is a second route. Worth stating in the task and contract.
