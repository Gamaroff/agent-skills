# QA Report: Task 234 - Probe sandbox teardown and process-group reap

**Task**: [task.234.probe-teardown-and-reap-hardening.md](./task.234.probe-teardown-and-reap-hardening.md)
**Gate File**: [task.234.gate.6.probe-teardown-and-reap-hardening.yml](./task.234.gate.6.probe-teardown-and-reap-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: FAIL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-234-QA-10: relative `PATH` entries reach the leash shell | medium | ✅ FIXED | The QA-10 test, with a positive control, passes. Without the filter, the test goes red. |

## Executive Summary

QA-10 holds. However, CI has been red since `a32dd8f0`.

The QA-9 test, and now the QA-10 test, spell `command -v <stand-in>` literally. The repository guard `tests/ci-tool-skips.test.js` reads each such line as a tool that CI must install. That guard runs only when `CI` is set, and every local `ci:fast` in this run left `CI` unset. So the local runs read green while CI failed.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED until CI is green

---

## Testing Scope

### Review Methodology

- Direct tools plus one Explore diff reviewer (`duration_ms` 38012), scoped to the changes since gate 5 (`a32dd8f0`).
- **CI**: the `Test` job failed on `e21adc05` (run 41191890806) with `not ok 6510 - under CI, every tool a suite skips without is on PATH` and the message `CI is missing t234-host-tool`.
  - The test was introduced in `a32dd8f0`.
  - Gate 5 recorded that commit's run as pending.
- **Local reproduction**: `CI=true node --test tests/ci-tool-skips.test.js` fails with `CI is missing t234-host-tool, t234-planted, zsh`.
  - `zsh` is missing only on this laptop, and CI installs it.
- **Tests**:
  - Node 22: 274/274.
  - `ci:fast`: 6924, 0 failed. That run had `CI` unset, so it skipped the guard.

---

## Issues Found

### HIGH Severity Issues (1)

**TASK-234-QA-11: CI is red. The guard reads the stand-in tools as missing CI tools.**

- **Where**: `shared/resources/tests/security-probe.test.mjs`, in the QA-9 and QA-10 tests.
- **Fix**: pass the stand-in name through argv (`command -v "$1"`).

### MEDIUM Severity Issues (1)

**TASK-234-QA-12: the QA-10 test can pass vacuously.**

- **Problem**: the test never asserts that the case was leashed. On a host with no `true` in `/usr/bin:/bin`, `leashEnv()` is never reached, yet the test still passes.
- **Fix**: assert `l.command === "/bin/sh"`.

### LOW Severity Issues (2)

These are the reviewer's CR-2 and CR-3, sent to `recommendations.future`:
- The positive control only exercises the `.` spelling of the plant.
- The test mishandles a host with no `PATH`.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`.

### Performance — PASS

### Reliability — FAIL (TASK-234-QA-11)

### Maintainability — PASS

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `shared/resources/tests/security-probe.test.mjs:7804`: the QA-10 test never asserts the leash. **TASK-234-QA-12**

**Cleanups (2):**
- [low] `shared/resources/tests/security-probe.test.mjs:7816`: the control covers only the `.` spelling. → recommendations.future
- [low] `shared/resources/tests/security-probe.test.mjs:7805`: no handling for an unset `PATH`. → recommendations.future

The CI finding (TASK-234-QA-11) came from the CI read, not from the reviewer.

The following mutation was run in qa-fix cycle 5 against the content committed as `1d98769c`:

mutation-proven: unfiltered host PATH in leashEnv → QA-10 test → covered

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: CI is red (high), caused by this task's tests.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED.

---

**Next Steps**: this is gate 6, the last gate in the granted budget. The run escalates to the user.
