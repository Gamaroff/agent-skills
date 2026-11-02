# QA Report: Task 234 - Probe sandbox teardown and process-group reap

**Task**: [task.234.probe-teardown-and-reap-hardening.md](./task.234.probe-teardown-and-reap-hardening.md)
**Gate File**: [task.234.gate.7.probe-teardown-and-reap-hardening.yml](./task.234.gate.7.probe-teardown-and-reap-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-234-QA-11: CI red, because `ci-tool-skips` read test stand-ins as tools | high | ✅ FIXED | CI `Test` passes on `f9040a87`, and so do the other five checks. Under `CI=true`, the guard no longer lists any stand-in. |
| TASK-234-QA-12: the QA-10 test could pass without the leash | medium | ✅ FIXED | `leashUnderHostPath` asserts the leash. Skipping the leash turns both tests red. |

## Executive Summary

Both cycle-6 fixes hold, and CI is green on the head this gate judged. The scoped review found one low cleanup in a test helper; it is carried to `recommendations.future`. Every finding from cycles 1–6 is closed.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Testing Scope

### Review Methodology

- I used direct tools plus one Explore diff reviewer (`duration_ms` 34431), scoped to the changes since gate 6 (`1d98769c`). Only the test file changed.
- CI on `f9040a87` passed all six checks: Test, ShellCheck, Secret scan, Docs link check, Branch Policy and Validate Skills. I read this after the run completed, not while it was still pending.
- Step 4b does not apply, because the change adds no fenced bash.
- Test runs:
  - Node 22: 274/274 passed.
  - `ci:fast`: 6924 tests, 0 failed.
  - `CI=true node --test tests/ci-tool-skips.test.js` lists only `zsh`. That tool is missing on the dev laptop alone, and CI installs it.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| A deep tree is removed (A) | PASS | CI Node 22 is green |
| No mode change outside the sandbox (B) | PASS | B passes with its positive control; QA-4 test |
| A late background write is killed (D) | PASS | Both D tests |
| A case does not outlive a killed probe | PASS | QA-3 test |
| The leash is invisible to the case and cannot be subverted by it | PASS | QA-7/8, QA-9 and QA-10 tests |
| Wall time | PASS (amended) | Recorded in the criterion |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (advisory, carried to `recommendations.future`)

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. No input is refused or accepted by the changed code.

### Performance — PASS

### Reliability — PASS

### Maintainability — PASS

---

## Code Review

**Correctness bugs (0)**

**Cleanups (1):**
- [low] `shared/resources/tests/security-probe.test.mjs:7789`: the `l.command` assertion cannot fail. → recommendations.future

These mutations were run in qa-fix cycle 6 against the content committed as `f9040a87`:

mutation-proven: leash skipped → QA-9 and QA-10 tests → covered
mutation-proven: unfiltered host PATH → QA-10 test → covered

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: READY

---

**Next Steps**: Step 5c `/review-pr`.
