# QA Report: Task 234 - Probe sandbox teardown and process-group reap

**Task**: [task.234.probe-teardown-and-reap-hardening.md](./task.234.probe-teardown-and-reap-hardening.md)
**Gate File**: [task.234.gate.2.probe-teardown-and-reap-hardening.yml](./task.234.gate.2.probe-teardown-and-reap-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: FAIL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-234-QA-1: on Node 22, the teardown fails on a deep tree | high | ✅ FIXED | `ENAMETOOLONG` is now handled, and `rm -rf` removes by relative path. The task.234 A test passes on Node 22.23.4, 24.21.0 and 26.8.2. Both mutations (drop `ENAMETOOLONG`; `rm -rf` → `rmSync`) turn A red on Node 22. |
| TASK-234-QA-2: the D tests had no positive control | low | ✅ FIXED | Both D tests assert the `started` file. Removing either grandchild's write turns that test red ("never started"). |

## Executive Summary

Cycle 2 was a full-diff refute pass, reviewed by an independent subagent. Both cycle-1 fixes hold. The pass found a defect in the original design: with `detached: true`, a case runs in its own session. When the probe is killed as a group (Ctrl-C, or a tool or CI timeout), the case survives, and its timeout dies with the parent that held it. QA reproduced this. The pass also found that the new `chmod -R` follows a symlinked sandbox root.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] The task document exists, with status `ready-for-review`
- [x] All implementation phases are ticked
- [x] The tests pass: Node 22 probe suite 269/269; `npm run ci:fast` 6919 tests, 0 fail (qa-fix cycle 1, same content as `3cd1bc62`)
- [x] Breaking changes are documented
- [x] PR #800 is open

### Review Methodology

The re-review used direct tools plus one Explore subagent for the diff review. **Cycle 2 is a refute pass over the whole branch diff, not a narrowed one.**

- Re-review scope: unscoped. Cycle 2 refutes the whole `origin/develop...HEAD` diff, excluding docs and bundled copies: 9 files, 896 patch lines.
- Diff reviewer: dispatched at 09:17:48Z. The completion notice gave `duration_ms` 132772.
- CI: `CI on 3cd1bc62e49c: pending`. This is recorded only; it is not a precondition.
- Step 4b: not applicable. The change set has no fenced bash block; `probe-boundary-rule.md` changes prose only.
- Standards-named validation: `npm run validate -- skills/<s>/` exited 0 for `finalise`, `qa-story`, `qa-task` and `review-security`.

## New Findings This Cycle

- **[high]** `shared/resources/security-probe.mjs:1947`: `detached: true` puts each case in a new session.
  - A group kill of the probe no longer reaches the case.
  - The case's timeout is enforced only by the parent, so it dies with the parent.
  - Fix: bound the case independently of the parent, and test a group kill mid-case. (TASK-234-QA-3)
- **[medium]** `shared/resources/security-probe.mjs:986`: `chmod -R u+rwx -- root` follows a root that is itself a symlink. GNU chmod 9.12 traverses a symlink given as a command-line argument.
  - Fix: lstat the root, refuse a non-directory, and do not follow the argument. (TASK-234-QA-4)
- **[low]** `shared/resources/security-probe.mjs:1003`: `reapGroup` throws on EPERM. (TASK-234-QA-5)
- **[low]** `shared/resources/tests/security-probe.test.mjs:7556`: the B test has no positive control. (TASK-234-QA-6)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Teardown past PATH_MAX (A, B) | CONCERNS | A green on 22, 24 and 26 | A symlinked root is followed (TASK-234-QA-4) |
| Phase 2: QA2-1 hardening (C) | PASS | Verified | Unchanged since cycle 1 |
| Phase 3: Process-group reap (D) | FAIL | D green | A group kill orphans the case (TASK-234-QA-3) |
| Phase 4: Docs and validation | PASS | Verified | Section 5 and CHANGELOG updated in cycle 1 |

**Overall Phase Completion**: 2/4 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Deep tree with a mode-000 leaf no longer crashes; sandbox removed | PASS | A test on Node 22.23.4, 24.21.0 and 26.8.2 |
| Teardown never changes a mode outside the sandbox | FAIL | A symlinked root is followed by `chmod -R` (measured below). Reachable only through a setsid grandchild's race, but the claim is false |
| A late background write is killed before `absent`/`removed` are read | PASS | Both D tests with `started` controls |
| Fixes mutation-proven | PASS | See Code Review |
| `npm run ci`, `bundle:check`, lint-shell | PASS (pending CI) | `ci:fast` and the Node 22 suite were green on this content; CI on `3cd1bc62` was pending at read |

---

## Breaking Changes Validation

### Breaking Change: background children of a case or setup no longer outlive the spawn

- Documented: Yes.
- Migration Path Provided: Yes (none is needed).
- Migration Tested: Yes.
- Consumer Code Updated: N/A.
- Notes: the opposite direction is now broken. The case itself outlives a killed probe (TASK-234-QA-3).

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: a group-killed probe leaves its case running with no time limit**
- **Severity**: HIGH (the reviewer rated CR-2 medium severity, medium confidence. QA reproduced it and promoted it on that measurement.)
- **Gate id**: TASK-234-QA-3
- **Observation**: `detached: true` makes the case a session leader. Measured with `spawnSync("sh", ["-c", "sleep 2; touch M"], {detached, timeout: 60000})`, run under `setsid`, then `kill -TERM -<pgid>` at 0.5 s:
  - `detached: true`: `M` was written after the parent died.
  - `detached: false`, as on base: `M` was not written.
- **Provenance**: new to this change. On base the case shares the probe's group and dies with it.
- **Impact**: when a QA or finalise run is interrupted or times out, the hostile case it was running keeps going, with no bound.
- **Recommendation**: bound each case independently of the parent, and test a group kill mid-case.

### MEDIUM Severity Issues (1)

**Issue: `chmod -R` follows a symlinked sandbox root**
- **Gate id**: TASK-234-QA-4 (reviewer CR-1, medium/medium; QA reproduced it).
- **Observation**: GNU chmod 9.12 was given `chmod -R u+rwx -- <root>` where `<root>` is a symlink to a 500/500 tree. The target tree became 700/700.
- **Reach**: the first `rmSync` unlinks a symlinked root without error. The fallback therefore sees a symlink only if the root is swapped after that `rmSync` fails, which takes a setsid grandchild, the residual the reap leaves.
- **Provenance**: new to this change. On base the lstat walk did not follow the root.

### LOW Severity Issues (2)

- TASK-234-QA-5 (reviewer CR-3, low/low): `reapGroup` rethrows EPERM.
- TASK-234-QA-6 (reviewer CR-4, low/medium): the B test has no positive control.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

Unchanged from cycle 1.

### Reliability — FAIL

TASK-234-QA-3.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Neither `removeSandbox` (a teardown) nor `reapGroup` (a kill) refuses an input, so neither is a predicate-shaped candidate. TASK-234-QA-4 changes modes outside the sandbox on a raced root.

### Maintainability — PASS

---

## Code Review

Reviewer: an Explore subagent, independent of the implementation. It made a refute pass over the whole diff.

**Correctness bugs (4):**
- [medium/medium] `shared/resources/security-probe.mjs:986`: `chmod -R` follows a symlink given as the command-line root. → Lstat the root and do not follow it. **Reproduced; TASK-234-QA-4.**
- [medium/medium] `shared/resources/security-probe.mjs:1947`: `detached: true` lets a case survive a group kill of the probe, unbounded. → Bound the case independently. **Reproduced and promoted to high; TASK-234-QA-3.**
- [low/low] `shared/resources/security-probe.mjs:1003`: an EPERM from `reapGroup` aborts the run. → Treat it like ESRCH. TASK-234-QA-5.
- [low/medium] `shared/resources/tests/security-probe.test.mjs:7556`: the B test has no positive control. → Assert the outcome and that the fallback was taken. TASK-234-QA-6.

**Cleanups (0)**

Mutation proofs: these ran in qa-fix cycle 1 against the content committed as `3cd1bc62`.

mutation-proven: `ENAMETOOLONG` dropped from the fallback → task.234 A (Node 22) → covered
mutation-proven: `rm -rf` replaced by `rmSync` → task.234 A (Node 22) → covered
mutation-proven: shell grandchild's `started` touch removed → task.234 D (watchedSpawn) → covered
mutation-proven: module grandchild's `started` write removed → task.234 D (module runner) → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Security-probe suite on Node 22.23.4 | PASS (269/269) |
| `npm run ci:fast` on Node 26 | PASS (6919, 0 fail) |
| task.234, QA2-1 and QA1-4 tests on Node 22, 24 and 26 | PASS (6/6 each) |

---

## Test Artifacts

### Test Commands Executed

```bash
setsid bash -c "node -e '<spawnSync detached sh -c sleep 2; touch M>' & sleep 0.5; kill -TERM -\$\$"   # detached true vs false
chmod -R u+rwx -- <symlink-to-500-tree>; stat -c '%a' <tree> <tree>/sub                                # GNU chmod 9.12
npm run -s validate -- skills/{finalise,qa-story,qa-task,review-security}/
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 800
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH. A killed probe leaves its case running with no limit, a regression from the base this task introduced.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

---

**Next Steps**: `/qa-fix` cycle 2 for TASK-234-QA-3 to QA-6, then cycle 3 (scoped re-review).
