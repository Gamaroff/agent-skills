# QA Report: Task 281 - The observation log names what it cannot read

**Task**: [Link to task document](./task.281.observation-log-names-what-it-cannot-read.md)
**Gate File**: [task.281.gate.1.observation-log-names-what-it-cannot-read.yml](./task.281.gate.1.observation-log-names-what-it-cannot-read.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-18
**Gate Status**: CONCERNS

---

## Executive Summary

The change does what the task says, and every behaviour has a committed test with a control. Two medium findings keep the gate at CONCERNS: no CHANGELOG entry, and the suite wall-time criterion was never measured.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CHANGELOG entry, and the wall-time measurement or an amended criterion)

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only diff reviewer (Explore subagent), first review, whole branch diff. The diff excluded `docs/tasks` and the three generated copies of the engine and contract, which `npm run bundle:check` proves are byte copies.

Diff review: code review. Reviewer dispatched 08:29Z, returned about 08:30Z (29 s, from the completion notice's `duration_ms`).

CI on 4260b4932: pending (link-check, secret-scan, shellcheck, test, validate were IN_PROGRESS when read). Nothing recorded in the gate; `/finalise` gates CI once on the final commit.

Step 4b: not applicable as a run. The change set edits `SKILL.md` and `review-cycle.md`, but the one fenced bash block added (the `set-status` example in `review-cycle.md`) is a placeholder invocation (`--id N`) and needs a live log, so it was read, not executed. Its flags (`--repair --expect-status resolved --status actioned --resolution`) are the ones the committed repair test runs against a scratch log.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: `invalidStatus` in queue/scan, doctor `status-legal` | PASS | Verified | 3 tests with controls; scan filter does not narrow the list |
| 2: `--repair`, parked-only `open` | PASS | Verified | 3 tests with controls; mistyped literal writes nothing |
| 3: review-cycle fifth decision, scoped-review note, SKILL.md row, contract | PASS | Verified | 3 skill tests; SKILL.md row is checked against the engine's own doctor checks |
| 4: bundle, mutation proofs, gate | PASS | Verified | `bundle:check` 0 problems; remote `ci:fast` green |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| `status: resolved` entry named in queue and scan, still open, doctor fails naming the file; legal and statusless controls clean | PASS | tests "queue and scan name an entry…", "…empty invalidStatus…", "doctor fails its status-legal check…" |
| `--repair --expect-status resolved` repairs; mistyped literal exits 1 `status-changed`; legal literal / no guard / no `--repair` each exit 2 | PASS | tests "set-status --repair … repairs the entry…", "… cannot be used to skip the guard…" |
| Parked → open clears `parked_until`; open from actioned/open/no guard exits 2, nothing written | PASS | test "set-status --status open returns a parked entry to open…" |
| Fifth decision and scoped-review rule in `review-cycle.md`, held by a test | PASS | observe-work tests "lists five decisions…", "Step 7 states the scope…" |
| Existing `--json` consumers still parse; existing tests unchanged | PASS | engine suite 62/62; no pre-existing test edited (`git diff` adds tests only) |
| `doctor` clean against the live log | PASS | `status-legal: every status is legal`, `invalidStatus: []` |
| `bundle:check` 0 problems; `CI=true npm test` passes | PASS | `bundle:check` run; remote `ci:fast` exit 0 on rerun |
| Each change has a mutation proof | PASS | see Code Review |
| `CI=true npm test` wall time within 10% of `develop` (median of five alternating runs, `uptime` beside each) | PASS (measured in qa-fix cycle 1) | median 735 s on the branch vs 741 s on `develop` (-0.8%); see "Wall-time measurement" below |

The CHANGELOG citation check (`changelog-cites.sh task.281`) answered `missing (task 281)`: finding T281-QA-1.

Criteria drift: clean (`criteria-drift.js`, base review-commit). Boundary signals in the criteria: none.

---

## Issues Found

### MEDIUM Severity Issues (2)

- **T281-QA-1** `CHANGELOG.md`: no `[Unreleased]` entry cites (task 281); `/finalise` 6d halts on it.
- **T281-QA-2** task document: the wall-time criterion is unmeasured; run the five alternating runs on the LAN server and record them, or the owner amends the criterion.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0 (CR-1 below is advisory)

---

## NFR Assessment

### Performance: PASS (reasoned only)
One extra enum check per entry in `scan` and `queue`, one queue pass in `doctor`. The task's own measured criterion is not run (T281-QA-2).

### Reliability: PASS
The `status-changed` guard compares against the file being written; a wrong `--repair` literal writes nothing. `doctor`'s `reason` and exit code are unchanged. New JSON fields are additive.

### Security: PASS (evidence: reasoned, `probes_executed: 0`)
No path, shell or network input added. `boundary: false`, `boundary_signals: []`. Candidates named: `isInvalidStatus` (reports, refuses nothing); the `--status open` and `--repair` guards (refuse a flag combination from a small enumerated set, not hostile string input; each refusal and its control is a committed test).

### Maintainability: PASS
The illegal-status rule has one definition (`isInvalidStatus`), read by scan, queue and doctor. Contract, SKILL.md and review-cycle.md updated.

---

## Code Review

Reviewer reviewed 6 files (engine, contract, two test files, SKILL.md, review-cycle.md).

**Correctness bugs (1, advisory):**
- [low/low] `shared/resources/observation-log.js:1165` — CR-1: reopening via `--repair` from an illegal status leaves any `resolved:` date or `resolution:` text in place. Not promoted: confidence low, reviewer did not reproduce it, and it is harmless today (the archive gate needs a resolved-set status; a later resolve overwrites the date). Recorded under `recommendations.future`, `remedy: unverified`.

**Cleanups (0).**

Anchor check (`finding-anchors.js`): `ok`.

Platform variance: `TMPDIR=/tmp` run of both suites: 96/96 pass.

mutation-proven: `isInvalidStatus` forced false → "queue and scan name an entry…" and "doctor fails its status-legal check…" → covered (develop step)
mutation-proven: scan-only `invalidStatus` push removed → "queue and scan name an entry whose status is outside the enum…" → covered
mutation-proven: legal-literal refusal under `--repair` disabled → "set-status --repair cannot be used to skip the guard…" → covered
mutation-proven: non-`set-status` `--repair` rejection disabled → "set-status --repair cannot be used to skip the guard…" → covered (same test holds both guards, so each is red for its own assertion; they share one test)
mutation-proven: enum check applied under `--repair` → "set-status --repair … repairs the entry…" → covered (develop step)
mutation-proven: `open` guard disabled → "set-status --status open returns a parked entry…" → covered (develop step)
mutation-proven: doctor check forced ok → "doctor fails its status-legal check…" → covered (develop step)
mutation-proven: SKILL.md `status-legal` row removed → "Session Start table has a row for every check…" → covered (develop step)
mutation-proven: fifth-decision bullet un-bolded → "lists five decisions…" → covered (develop step)

The two QA mutations were made against a `cp` snapshot and restored from it; `cmp` printed nothing and `git status --porcelain` for `shared/` and `skills/` was empty afterwards.

---

## Wall-time measurement (qa-fix cycle 1, T281-QA-2)

Five alternating runs of `npm run test:remote -- --run test` on the LAN server, from clean detached worktrees at `origin/develop` (e092cf6eb) and the branch commit (4260b4932). `uptime` load averages were read on the server just before each run. Every run exited 0.

| Run | develop (s) | branch (s) | load before develop | load before branch |
| --- | --- | --- | --- | --- |
| 1 | 802 | 775 | 7.46, 11.04, 12.51 | 1.62, 3.04, 7.22 |
| 2 | 805 | 734 | 2.61, 1.96, 4.37 | 0.38, 1.71, 3.45 |
| 3 | 735 | 733 | 1.10, 1.47, 2.63 | 0.80, 1.19, 2.10 |
| 4 | 736 | 735 | 0.40, 1.01, 1.75 | 0.68, 1.09, 1.64 |
| 5 | 741 | 762 | 0.31, 1.00, 1.56 | 2.36, 1.61, 1.75 |

Median develop 741 s, median branch 735 s: the branch is 0.8% faster, inside the 10% bound. Run 1 was taken while the server was busy (load 7.5 before develop), so it is the noisiest pair; the median does not depend on it.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/observation-log.test.mjs skills/observe-work/tests/observe-work.test.js
TMPDIR=/tmp CI=true command node --test shared/resources/tests/observation-log.test.mjs skills/observe-work/tests/observe-work.test.js
npm run bundle:check
npm run validate -- skills/observe-work/
npm run test:remote   # ci:fast, exit 0 on rerun
```

Results: 96/96 on both TMPDIR values; `bundle:check` 129 skills, 0 problems; `validate` observe-work clean; remote `ci:fast` exit 0.

---

## Recommendations

### Immediate Actions (Blocking)
1. Add the CHANGELOG `[Unreleased]` entry citing (task 281).
2. Measure the wall-time criterion on the LAN server, or have the owner amend it.

### Short-term Actions (Non-Blocking)
1. CR-1: clear `resolved:` / `resolution:` on reopen, or document that they stay.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The implementation is sound and held by tests; two medium findings are process gaps, both closable without touching the engine.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
