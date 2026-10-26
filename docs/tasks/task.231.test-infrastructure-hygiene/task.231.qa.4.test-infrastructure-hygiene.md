# QA Report: Task 231 - Test infrastructure hygiene (cycle 4)

**Task**: [task.231.test-infrastructure-hygiene.md](./task.231.test-infrastructure-hygiene.md)
**Gate File**: [task.231.gate.4.test-infrastructure-hygiene.yml](./task.231.gate.4.test-infrastructure-hygiene.yml)
**Previous Report**: [task.231.qa.3.test-infrastructure-hygiene.md](./task.231.qa.3.test-infrastructure-hygiene.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-231-CR3-1: SIGHUP/SIGQUIT orphan the suite | medium | ✅ FIXED | `d6e33392`; SIGHUP and Ctrl-Z tests; mutations (SIGHUP dropped, no suspend, no resume) each red → covered; probe clean on INT/TERM/HUP/QUIT |
| CR3-3: EPERM read as gone | low | ✅ FIXED | EPERM test (premise asserted); mutation → red → covered |
| CR3-4: reap result discarded | low | ✅ FIXED | report added; untested (needs a process that survives SIGKILL) |
| CR3-2: test safety net misses the suite's group | low | ❌ NOT EFFECTIVE | the new hook never fires (CR4-1 below) |

---

## Executive Summary

Cycle 4 is a scoped re-review of the same two files. The wrapper's runtime behaviour is now clean on every forwarded signal and on stop and resume. The remaining defect is in the tests: the safety net added in cycle 3 reads a pid file that the scratch-directory cleanup has already deleted, so it is inert.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR4-1 fixed)

### Review Methodology

Re-review scope: since gate 3's head `1bd49777` (two files, 932-line patch). `SAFETY_REPROBE=false`, `REFUTE_PASS=false`. One read-only Explore reviewer ran the verbatim prompt plus a caller note naming fix commit `d6e33392`; it was read at 2026-10-26T08:05:11Z. Step 4b does not apply.

---

## New Findings This Cycle

- **[medium]** `tests/test-tmpdir.test.js:187`: `node:test` runs `t.after` hooks in registration order. `scratch(t)` registers its `rmSync` before `spawnWrapper` registers the safety net, so `suite.pid` is gone when the net reads it. Verified against the source order (`scratch` at line 44 registers first) and by the reviewer's probe; the same FIFO order was hit earlier in this session. **Promoted: TASK-231-CR4-1.**
- **[cleanup]** `scripts/test-tmpdir.mjs:292`: an EPERM group and a group that survived SIGKILL produce the same report, and the wording names only the second.

Provenance: both come from the cycle-3 fix.

---

## Implementation Verification · Success Criteria · Breaking Changes

All 6 phases are still delivered; SC-1 to SC-7 stand as recorded; breaking changes PASS.

---

## Issues Found

**HIGH (0)** · **MEDIUM (1)**: TASK-231-CR4-1 · **LOW**: 1 cleanup (CR4-2).

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
The wrapper is clean on INT, TERM, HUP and QUIT, and on stop and resume.
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`escaped: 0`), from `task.231.qa.2.security.run.json` `totals`
- **Boundary**: `true`, `scripts/test-tmpdir.mjs#compareRatchet`, unchanged since that probe.
### Maintainability — CONCERNS
CR4-1 makes the test safety net inert.

---

## Code Review

Code review is blocking for this run. Promoted: CR4-1 → `TASK-231-CR4-1`. Both anchors check `ok` against `d6e33392`.

**Correctness bugs (1):**
- [medium/high] `tests/test-tmpdir.test.js:187`: the safety net reads a deleted pid file.

**Cleanups (1):**
- `scripts/test-tmpdir.mjs:292`: separate the EPERM report from the survived-SIGKILL one.

**Boundary**: `true`, `probes_executed: 8`, `escaped: 0` (carried).

**Mutation proofs** (Step 3c, the cycle-3 fixes, at `d6e33392`; the tree was unchanged afterwards):

- mutation-proven: SIGHUP dropped from `FORWARDED_SIGNALS` → "a SIGHUP to the wrapper reaches the suite…" → covered
- mutation-proven: SIGTSTP listener removed → "Ctrl-Z stops the suite with the wrapper…" → covered
- mutation-proven: SIGCONT listener removed → the same test → covered
- mutation-proven: `signalGroup` catch → `return false` → "signalGroup reads EPERM as a group that still exists…" → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` @ `d6e33392` (local) | 6,372 tests, 1 failure: `bundle-missing-source.test.js` LOAD-SENSITIVE budget (20,413 ms against 20,000), passes alone 7/7; ratchet ok |
| Signal probe @ `d6e33392` | INT, TERM, HUP, QUIT: suite gone, directory gone |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding in the test cleanup path (CR4-1). The wrapper itself is clean.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` for CR4-1 (fold in CR4-2), then cycle 5.
