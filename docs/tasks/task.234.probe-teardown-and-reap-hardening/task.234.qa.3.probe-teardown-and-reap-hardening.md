# QA Report: Task 234 - Probe sandbox teardown and process-group reap

**Task**: [task.234.probe-teardown-and-reap-hardening.md](./task.234.probe-teardown-and-reap-hardening.md)
**Gate File**: [task.234.gate.3.probe-teardown-and-reap-hardening.yml](./task.234.gate.3.probe-teardown-and-reap-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-234-QA-3: a group-killed probe leaves its case running | high | ✅ FIXED | The leash is in place. The new test group-kills the probe mid-case and the case's late write never lands. Disabling the leash turns that test red. No orphans were left after a killed suite run. |
| TASK-234-QA-4: `chmod -R` follows a symlinked root | medium | ✅ FIXED | `forceRemoveTree` lstats the root first. With the guard removed, the test goes red. |
| TASK-234-QA-5: EPERM aborts the run | low | ✅ FIXED | EPERM is treated like ESRCH. This is reasoned only: it is not reproducible here. |
| TASK-234-QA-6: the B test has no positive control | low | ✅ FIXED | The case chain ends in `|| exit 9`, and B asserts the rows are `rejected`. A broken plant turns B red. |

## Executive Summary

The cycle-2 fixes hold. The leash that fixed QA-3 is new code, and the scoped review found two ways it changes what a case observes. Both are confirmed, and both are medium.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

- Direct tools plus one Explore diff reviewer, dispatched at 09:46:15Z (`duration_ms` 161090).
- Re-review scope: the files changed since gate 2 (head `3cd1bc62e49c`; 13 files) — default. The reviewer read the four source files, `base...HEAD`, with cycle 2's own delta first.
- `CI on 7646e7bec206: pending`. On `3cd1bc62`, CI `Test` (Node 22) passed, which confirms TASK-234-QA-1 on CI.
- Step 4b is not applicable: the change set adds no fenced bash.
- Tests:
  - On Node 22.23.4: 271/271 security-probe tests.
  - `npm run ci:fast` on Node 26: 6921 tests, 0 failed.
  - The task.234 tests pass 8/8 on Node 22 and on Node 26.

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:1093`: the leash passes `env` the resolved path, so bash's argv0 becomes `/usr/bin/bash`. `isLaunchFailure` then misses an open failure and the case is scored as a real run. → Pass the original command name. (TASK-234-QA-7)
- **[medium]** `shared/resources/security-probe.mjs:1083`: the leash shell inherits the case environment, so `SHELLOPTS=xtrace` traces the leash onto the case's stderr. → Give the leash shell a minimal environment. (TASK-234-QA-8)
- **[low]** `reapGroup` EPERM is ambiguous between a zombie-only group and unsignalable live members. Routed to `recommendations.future`.
- **[low]** The watcher keys on the case pid, which could be reused. Routed to `recommendations.future`.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Deep tree removed (A) | PASS | Node 22 CI `Test` passed on `3cd1bc62`; locally 8/8 on Node 22 and 26 |
| No mode change outside the sandbox (B) | PASS | B with its positive control; the QA-4 test |
| Late background write killed (D) | PASS | Both D tests |
| Case does not outlive a killed probe | PASS | The QA-3 test |
| Wall time | PASS (amended) | +1.7 to +3.2 s on the 265 pre-existing tests, recorded in the criterion |

---

## Issues Found

### MEDIUM Severity Issues (2)

**TASK-234-QA-7: a fence-script launch failure is no longer recognised**
- **Measured**:
  - `exec /usr/bin/env -i -- PATH=… /usr/bin/bash /nonexistent-script` prints `/usr/bin/bash: /nonexistent-script: No such file or directory`.
  - With `bash` as the program, it prints `bash: /nonexistent-script: …`, which `isLaunchFailure` (`security-probe.mjs:2229`) expects.
- **Impact**: a launch failure is scored as the target's answer, which can report a false reproduction.

**TASK-234-QA-8: the case environment reaches the leash shell**
- **Measured**: `env -i SHELLOPTS=xtrace /bin/sh -c 'p=1; exec true'` prints `+ p=1` and `+ exec true` to stderr.
- **Impact**: a case's `expected.stderr` would compare against the leash's own trace.

### LOW Severity Issues (2)

These are advisory, the reviewer's CR-3 and CR-4. Both are in `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS

### Reliability — CONCERNS (TASK-234-QA-8)

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The four new or changed functions are `leashed`, `onPath`, `forceRemoveTree` and `reapGroup`. Each one spawns, resolves, removes or kills; none accepts or rejects an input. TASK-234-QA-7 affects how the probe scores fence cases.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `shared/resources/security-probe.mjs:1093`: the argv0 change breaks `isLaunchFailure`. **TASK-234-QA-7**
- [medium/high] `shared/resources/security-probe.mjs:1083`: the leash shell runs under the case environment. **TASK-234-QA-8**
- [low/medium] `shared/resources/security-probe.mjs:1030`: EPERM is ambiguous. → recommendations.future
- [low/low] `shared/resources/security-probe.mjs:1057`: the case pid could be reused. → recommendations.future

**Cleanups (0)**

These mutations were run in qa-fix cycle 2 against the content committed as `7646e7be`:

mutation-proven: leash disabled → TASK-234-QA-3 test → covered
mutation-proven: root lstat guard removed → TASK-234-QA-4 test → covered
mutation-proven: watcher keeps the extra fd → suite hangs (rc 124) → covered
mutation-proven: B plant broken → task.234 B → covered

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: there are two medium findings, both in the leash that cycle 2 added, and no high.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL. Fix TASK-234-QA-7 and TASK-234-QA-8.

---

**Next Steps**: `/qa-fix` cycle 3, then QA cycle 4.
