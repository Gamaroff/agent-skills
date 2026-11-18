# QA Report: Task 281 - The observation log names what it cannot read

**Task**: [Link to task document](./task.281.observation-log-names-what-it-cannot-read.md)
**Gate File**: [task.281.gate.2.observation-log-names-what-it-cannot-read.yml](./task.281.gate.2.observation-log-names-what-it-cannot-read.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-18
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's two findings are closed. The cycle-2 refute pass found one new medium defect that QA reproduced: `doctor`'s `status-legal` check reports "every status is legal" on a log it could not read.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (T281-QA-3 fixed before merge)

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only diff reviewer (Explore subagent), cycle 2, so a **refute pass** over the whole branch diff (663 lines, 7 files; the three generated copies of the engine and contract are byte copies, proved by `bundle:check`).

Diff review: code review. Reviewer dispatched about 11:20Z, returned in 24 s (`duration_ms` 24254).

Re-review scope: whole branch diff (cycle 2 is always a full refute pass).

CI on 7ecdc673c: all five checks SUCCESS (link-check, secret-scan, shellcheck, test, validate, plus the allowed-branch check).

Step 4b: not applicable as a run; the only prose edits since cycle 1 are CHANGELOG and task artifacts, and cycle 1 read the one fenced block.

### Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| T281-QA-1 CHANGELOG entry | ✅ FIXED | `changelog-cites.sh task.281` answers `cites (task 281)`; fix commit 7ecdc673c |
| T281-QA-2 wall time unmeasured | ✅ FIXED | five alternating runs, median 741 s develop vs 735 s branch (-0.8%); table in QA report 1 |
| CR-1 (cycle 1, advisory) reopen keeps `resolved:` | unchanged | stays under `recommendations.future` |

---

## New Findings This Cycle

- **[medium]** `shared/resources/observation-log.js:1504` — T281-QA-3: when every log file is unparseable, `cmdQueue` returns `scan-broken` with no `invalidStatus` field, and `doctor` defaults it to `[]`, so `status-legal` reports ok. → fail the check, naming `scan-broken`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: `invalidStatus` in queue/scan, doctor `status-legal` | CONCERNS | Verified | T281-QA-3: the could-not-read case passes the check |
| 2: `--repair`, parked-only `open` | PASS | Verified | refute probes found no guard combination that skips a refusal |
| 3: review-cycle fifth decision, scoped-review note, SKILL.md row, contract | PASS | Verified | unchanged since cycle 1 |
| 4: bundle, mutation proofs, gate | PASS | Verified | remote `ci:fast` exit 0 on 7ecdc673c: 8600 tests, 8597 pass, 0 fail |

**Overall Phase Completion**: 3/4 clean, 1 with a finding

---

## Success Criteria Verification

All criteria are as recorded in QA report 1 with one change: the wall-time criterion is now **PASS** (741 s develop, 735 s branch, -0.8%, inside the 10% bound; see QA report 1, "Wall-time measurement"). Criteria drift: clean.

---

## Issues Found

### MEDIUM Severity Issues (1)

- **T281-QA-3** `shared/resources/observation-log.js`: the status-legal check passes a log whose statuses could not be read.
  - Origin: code-review CR-1, reproduced by QA.
  - Reproduction: a workspace whose log holds two files with no frontmatter; `doctor --json` reports `status-legal: ok:true, "every status is legal"`. A scratch test asserting `ok:false` and a `scan-broken` detail went red against the committed code.
  - Control: the existing legal-log test (`doctor fails its status-legal check…`) still passes, so the reproduction is specific to the unreadable case.
  - Base check (5b): the check is new in this change, so the base has no `status-legal` to compare; not pre-existing.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance: PASS (measured)
Five alternating runs, median 735 s branch vs 741 s develop.

### Reliability: CONCERNS
T281-QA-3: an instrument that could not look reports a pass.

### Security: PASS (evidence: reasoned, `probes_executed: 0`)
No new input surface. `boundary: false`, `boundary_signals: []`.

### Maintainability: PASS
One definition of the illegal-status rule.

---

## Code Review

Reviewer reviewed 7 files of the diff and verified against the working tree (it ran no code).

**Correctness bugs (3):**
- [medium/high] `shared/resources/observation-log.js:1504` — CR-1: status-legal defaults a scan-broken queue to an empty list → fail the check. Promoted to T281-QA-3 (reproduced by QA, 5d).
- [low/low] `shared/resources/observation-log.js:466` — CR-2: the duplicate check skips invalid-status entries that the queue counts open. On `develop` at line 451, unchanged by this diff: `pre-existing`; routed to `recommendations.future`.
- [low/low] `shared/resources/observation-log.js:1147` — CR-3: `--expect-status` is compared untrimmed. The compare is on `develop` at line 1079, unchanged: `pre-existing`; it fails closed (exit 1, no write); routed to `recommendations.future`.

**Cleanups (0).**

Anchor check (`finding-anchors.js`): `ok`.

mutation-proven: the CR-1 reproduction → scratch test "doctor's status-legal check does not pass a log whose statuses it could not read" went red against the committed code → covered (the test was run red and then discarded: QA leaves no fix in the tree; it is held as a patch for qa-fix).

The working tree was restored with `git checkout --` of the one test file; `git status --porcelain` was empty before this gate was written.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run test:remote   # ci:fast on 7ecdc673c, exit 0, 8600 tests / 8597 pass / 0 fail
CI=true command node --test --test-name-pattern="could not read" shared/resources/tests/observation-log.test.mjs   # red, as intended, on the scratch test
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Make `doctor` `status-legal` fail on a `scan-broken` queue result, with a committed test over an all-unparseable log (T281-QA-3).

### Short-term Actions (Non-Blocking)
1. CR-1 (cycle 1), CR-2, CR-3: see the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The delivered behaviour holds and the suite is green, but one new defect lets a could-not-read state report as clean in the new check.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T281-QA-3 fixed before merge.
