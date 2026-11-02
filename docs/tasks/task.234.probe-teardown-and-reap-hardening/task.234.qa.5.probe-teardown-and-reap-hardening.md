# QA Report: Task 234 - Probe sandbox teardown and process-group reap

**Task**: [task.234.probe-teardown-and-reap-hardening.md](./task.234.probe-teardown-and-reap-hardening.md)
**Gate File**: [task.234.gate.5.probe-teardown-and-reap-hardening.yml](./task.234.gate.5.probe-teardown-and-reap-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-234-QA-9: the leash `PATH` dropped the host `PATH` | medium | ✅ FIXED | The QA-9 test finds a host-only tool under the leash environment. Dropping the host `PATH` turns it red. |

## Executive Summary

QA-9 holds. The review of its fix found one medium issue (QA-10). It applies only on hosts that meet both conditions:

- the probe's `PATH` holds a relative or empty entry;
- `sleep` and `ps` are not in `/usr/bin` or `/bin`.

This is gate 5, the last in the QA budget. QA-10 is recorded for a follow-up rather than fixed without a gate.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: READY for staging; CONDITIONAL for production on the QA-10 follow-up

---

## Testing Scope

### Review Methodology

- Direct tools plus one Explore diff reviewer (`duration_ms` 34947).
- Re-review scope: the files changed since gate 4 (head `3820a0de25db`).
- CI `Test` (Node 22) passed on `3820a0de`. The run on `a32dd8f0` was pending at this read.
- Step 4b does not apply: the change adds no fenced bash.
- Tests:
  - Node 22.23.4: 273/273 security-probe tests.
  - `npm run ci:fast`: 6923 tests, 0 failed.

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:1075`: `leashEnv()` keeps relative and empty `PATH` entries. The leash shell's `cwd` is the case's sandbox. (TASK-234-QA-10)

---

## Issues Found

### MEDIUM Severity Issues (1)

**TASK-234-QA-10: a relative entry on the probe's `PATH` reaches the leash shell**

- **How it happens**: `["/usr/bin:/bin", process.env.PATH].filter(Boolean)` removes only an unset or empty `PATH`. Entries such as `.` or `::` pass through.
- **Who can exploit it**: on a host with no `sleep` in `/usr/bin:/bin`, a case could plant `./sleep` in its own sandbox, which the watcher would then run.
- **Effect**: the planted tool can blind or stall the case's own leash.
- **Hosts affected**: none checked here. On Arch and Ubuntu, `/usr/bin` is searched first.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. TASK-234-QA-10 is conditional on how the host is set up.

### Performance — PASS

### Reliability — PASS

### Maintainability — PASS

---

## Code Review

**Correctness bugs (1):**
- [medium/medium] `shared/resources/security-probe.mjs:1075`: `leashEnv()` keeps relative `PATH` entries. **TASK-234-QA-10**

**Cleanups (0)**

This mutation was run in qa-fix cycle 4, against the content committed as `a32dd8f0`:

mutation-proven: host PATH dropped from leashEnv → QA-9 test → covered

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding with narrow preconditions; no high findings. This is the final gate in the budget.
**Quality Score**: 90/100
**Deployment Recommendation**: READY for staging; CONDITIONAL for production on the QA-10 follow-up.

---

**Next Steps**:
1. Step 5c `/review-pr`.
2. File QA-10 as a follow-up. It is a one-line filter plus a test.
