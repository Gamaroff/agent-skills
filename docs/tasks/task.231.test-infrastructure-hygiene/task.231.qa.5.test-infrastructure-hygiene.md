# QA Report: Task 231 - Test infrastructure hygiene (cycle 5)

**Task**: [task.231.test-infrastructure-hygiene.md](./task.231.test-infrastructure-hygiene.md)
**Gate File**: [task.231.gate.5.test-infrastructure-hygiene.yml](./task.231.gate.5.test-infrastructure-hygiene.yml)
**Previous Report**: [task.231.qa.4.test-infrastructure-hygiene.md](./task.231.qa.4.test-infrastructure-hygiene.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Gate Status**: PASS

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-231-CR4-1: the test safety net never fires | medium | ✅ FIXED | `190375ff`; subtest-based safety-net test; the cycle-3 read-in-hook code and a wrapper-group-only kill each turn it red → covered |
| CR4-2: reap report wording | low | ✅ FIXED | `190375ff` |
| Gated findings from cycles 1–3 (CR-1, QA-1, CR2-1, CR2-2, CR3-1) | — | ✅ FIXED | verified and mutation-proven in cycles 2–4 |

---

## Executive Summary

Cycle 5 is a scoped re-review of the two files changed since gate 4's head. The cycle-4 fix holds. The reviewer found two low, non-gating test-robustness points and no product defect. Every gated finding from the five cycles is fixed and covered by a test that goes red when the fix is reverted.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

### Review Methodology

Re-review scope: since gate 4's head `d6e33392` (two files, 986-line patch). `SAFETY_REPROBE=false`, `REFUTE_PASS=false`. One read-only Explore reviewer ran the verbatim prompt plus a caller note naming fix commit `190375ff`; it was read at 2026-10-26T08:16:41Z, after running the test file itself (23/23, no strays). Step 4b does not apply.

---

## New Findings This Cycle

- **[low, advisory, confidence medium]** `tests/test-tmpdir.test.js:354`: `child.suitePid()` can return null, and `alive(null)` reads as dead (`process.kill(null, 0)` throws `ERR_INVALID_ARG_TYPE`, verified). A lost pid would let the safety-net and SIGTERM assertions pass vacuously.
- **[low, advisory, confidence low]** `tests/test-tmpdir.test.js:394`: platform-variance. `kill(pid, 0)` succeeds on a zombie, so under a PID 1 that does not reap, the safety-net test would time out.

Neither is `bug` + `high` confidence, so neither gates. Both are carried in `recommendations.future`.

---

## Implementation Verification · Success Criteria · Breaking Changes

All 6 phases are delivered; SC-1 to SC-7 stand as recorded in the cycle-1 report; breaking changes PASS.

---

## Issues Found

**HIGH (0)** · **MEDIUM (0)** · **LOW**: 2 advisory (CR5-1, CR5-2).

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
The wrapper is clean on INT, TERM, HUP and QUIT, and on stop and resume. Leftover processes are reaped before the directory is removed.
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`escaped: 0`), from `task.231.qa.2.security.run.json` `totals`
- **Boundary**: `true`, `scripts/test-tmpdir.mjs#compareRatchet`, unchanged since that probe.
### Maintainability — PASS
CR5-1 and CR5-2 are advisory.

---

## Code Review

Code review is blocking for this run. Nothing was promoted: no finding is `bug` + `high`. Both anchors check `ok` against `190375ff`.

**Correctness bugs (2, advisory):**
- [low/medium] `tests/test-tmpdir.test.js:354`: a lost pid passes as a dead suite.
- [low/low] `tests/test-tmpdir.test.js:394`: a zombie reads as alive under a non-reaping PID 1.

**Cleanups (0)**

**Boundary**: `true`, `probes_executed: 8`, `escaped: 0` (carried).

**Mutation proofs** (Step 3c, the cycle-4 fix, at `190375ff`; the tree was unchanged afterwards):

- mutation-proven: safety net reads the pid file in the hook (cycle-3 code) → "the safety net ends a suite the test left running…" → covered
- mutation-proven: safety net kills the wrapper's group only → the same test → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` @ `190375ff` (local) | PASS: 6,373 tests, 0 failures, ratchet ok, bundle clean |

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no gated finding; every gated finding from cycles 1–4 is fixed and mutation-proven.
**Quality Score**: 95/100
**Deployment Recommendation**: READY
**Next Steps**: Step 5c PR conformance review (`/review-pr --comment`).
