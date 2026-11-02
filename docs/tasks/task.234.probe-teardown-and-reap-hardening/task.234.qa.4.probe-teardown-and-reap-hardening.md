# QA Report: Task 234 - Probe sandbox teardown and process-group reap

**Task**: [task.234.probe-teardown-and-reap-hardening.md](./task.234.probe-teardown-and-reap-hardening.md)
**Gate File**: [task.234.gate.4.probe-teardown-and-reap-hardening.yml](./task.234.gate.4.probe-teardown-and-reap-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-234-QA-7: the leashed case's argv0 became the resolved path | medium | ✅ FIXED | The `leashed:` test asserts argv0 `bash`. Passing the resolved path as the program turns it red. |
| TASK-234-QA-8: the leash shell inherited the case environment | medium | ✅ FIXED | The same test asserts the exact environment and an empty stderr under `SHELLOPTS=xtrace`. Giving the case's environment to the leash shell turns it red. |

## Executive Summary

Both cycle-3 fixes hold. The QA-8 fix narrowed the leash shell's `PATH`, which removed the host `PATH` the watcher relied on to find `sleep` and `ps`. That is one medium finding.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

- Direct tools plus one Explore diff reviewer (`duration_ms` 79488).
- Re-review scope: the files changed since gate 3 (head `7646e7bec206`), which is the default scope.
- CI `Test` (Node 22) passed on `7646e7be`. The run on `3820a0de` is pending.
- Step 4b does not apply: the change adds no fenced bash.
- Tests:
  - Node 22.23.4: 272/272 security-probe tests.
  - `npm run ci:fast`: 6922 tests, 0 failed.

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:1068`: `LEASH_ENV` drops the host `PATH`. Where `sleep` lives outside `/usr/bin:/bin`, the watcher loop spins. → Append the probe's own `PATH`. (TASK-234-QA-9)
- **[low]** The QA-8 stderr assertion only bites where `/bin/sh` is bash; this host is `/usr/bin/bash`, while Debian's dash ignores `SHELLOPTS`. The test also calls `leashed()` directly, not through a spawn site. → `recommendations.future`.
- **[low, cleanup]** The watcher's `PATH=/usr/bin:/bin:$PATH` now repeats the same two directories. → Fold into the QA-9 fix.

---

## Issues Found

### MEDIUM Severity Issues (1)

**TASK-234-QA-9: the watcher may not find `sleep` under `LEASH_ENV`**
- **Reasoned**:
  - `sleep 0.2` failing does not end `while :`, which is deliberate so that a failed sleep cannot kill the case.
  - An empty `ps` result falls through to `kill -0`, which keeps succeeding while the probe lives.
  - The loop therefore forks without pause for the case's whole run.
- **Hosts affected**: hosts that keep only `sh` and `env` in `/usr/bin` and `/bin`, such as NixOS and Guix. Arch and Ubuntu are unaffected.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. `leashed` and `onPath` accept or refuse no input.

### Performance — CONCERNS (TASK-234-QA-9)

### Reliability — PASS

### Maintainability — PASS

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `shared/resources/security-probe.mjs:1068`: the leash `PATH` no longer covers the host's `sleep`/`ps`. **TASK-234-QA-9**
- [low/medium] `shared/resources/tests/security-probe.test.mjs:7731`: the QA-8 guard depends on `/bin/sh`. → recommendations.future

**Cleanups (1):**
- [low] `shared/resources/security-probe.mjs:1052`: the redundant `PATH` prefix. Folded into QA-9.

Mutations run in qa-fix cycle 3, against the content committed as `3820a0de`:

mutation-proven: resolved path passed as the program → `leashed:` test → covered
mutation-proven: case env passed to the leash shell → `leashed:` test → covered

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding, introduced by the QA-8 fix; there are no high findings.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL. Fix TASK-234-QA-9.

---

**Next Steps**: `/qa-fix` cycle 4, then QA cycle 5.
