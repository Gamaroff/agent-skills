# QA Report: Task 231 - Test infrastructure hygiene (cycle 3)

**Task**: [task.231.test-infrastructure-hygiene.md](./task.231.test-infrastructure-hygiene.md)
**Gate File**: [task.231.gate.3.test-infrastructure-hygiene.yml](./task.231.gate.3.test-infrastructure-hygiene.yml)
**Previous Report**: [task.231.qa.2.test-infrastructure-hygiene.md](./task.231.qa.2.test-infrastructure-hygiene.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-231-CR2-1: SIGTERM reaches only the direct child | medium | ✅ FIXED | `1bd49777`; grandchild and background-process tests; mutations `detached:false`, direct-child forwarding and no reap each red → covered |
| TASK-231-CR2-2: lowercase inner suffix splits the prefix | low | ✅ FIXED | `1bd49777`; `prefixOf` case plus ratchet fixed-point test; rule off → red → covered |
| CR2-3: unguarded retry `rmSync` | low | ✅ FIXED | `1bd49777`; read-only parent test; guard removed → red → covered |
| CR2-4, CR2-5, CR2-6, gate-1 CR-2 | low | ⏸ OPEN, advisory | carried in `recommendations.future` |

---

## Executive Summary

Cycle 3 is a scoped re-review of the files changed since gate 2's head: `scripts/test-tmpdir.mjs` and `tests/test-tmpdir.test.js`. The cycle-2 fixes hold, but they introduced a regression. Starting the suite in its own session (`detached: true`) cut it off from terminal signals, and the wrapper forwards only SIGINT and SIGTERM. A SIGHUP or SIGQUIT now orphans the suite and leaves its directory behind.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR3-1 fixed and covered by a test)

### Review Methodology

Re-review scope: since gate 2's head `e1a76d6b` (two files; patch = their `origin/develop...HEAD` diff, 802 lines). `SAFETY_REPROBE=false`: clause 1 from gate 2 read `false`, and gate 2 failed on no safety axis. `REFUTE_PASS=false`. One read-only Explore reviewer ran the verbatim code-review prompt plus a caller note naming the cycle-2 fix commit. It was read at 2026-10-26T07:43:52Z. Step 4b does not apply.

---

## New Findings This Cycle

- **[medium]** `scripts/test-tmpdir.mjs:249` (`detached: true`): setsid removes the suite from the terminal's session, and only SIGINT and SIGTERM are forwarded. Reproduced with `hup-probe.js` against `1bd49777`: SIGTERM → suite gone, directory gone; SIGHUP → `suiteAlive: true, tmpdirLeft: true`; SIGQUIT → the same. **Promoted: TASK-231-CR3-1.**
- **[low, advisory]** `tests/test-tmpdir.test.js:185`: the safety-net `process.kill(-child.pid)` reaches the wrapper's group, not the suite's own group (confidence medium).
- **[low, advisory]** `scripts/test-tmpdir.mjs:186`: `signalGroup` treats EPERM like ESRCH, so a group it cannot signal reads as gone (confidence low).
- **[cleanup]** `scripts/test-tmpdir.mjs:271`: `reapGroup`'s result is discarded, so a surviving group goes unreported.

Provenance: CR3-1 and CR3-3/4 come from the cycle-2 fix, CR3-2 from its tests.

---

## Implementation Verification

All 6 phases are still delivered. Phase 1 (the wrapper) carries CR3-1.

## Success Criteria Verification

SC-1 to SC-7 stand as recorded in the cycle-1 report. CR3-1 is a gap beside SC-1 (the directory is removed on a forwarded signal; an unforwarded one leaves it).

## Breaking Changes Validation

Unchanged: PASS.

---

## Issues Found

**HIGH (0)**

**MEDIUM (1)**: TASK-231-CR3-1.

**LOW (0 gated, 2 advisory, 1 cleanup)**: CR3-2, CR3-3, CR3-4.

---

## NFR Assessment

### Performance — PASS
`reapGroup` adds at most 2 s, and only when the suite leaves processes behind.

### Reliability — CONCERNS
CR3-1 (SIGHUP/SIGQUIT orphan the suite); CR3-3 and CR3-4 are advisory.

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`escaped: 0`), from `task.231.qa.2.security.run.json` `totals`
- **Boundary**: `true`, `scripts/test-tmpdir.mjs#compareRatchet`. It is unchanged since that probe; this cycle's diff touches no verdict boundary.

### Maintainability — PASS
CR3-2 is test-hygiene only.

---

## Code Review

Code review is blocking for this run. Promoted: CR3-1 → `TASK-231-CR3-1`. Every anchor checks `ok` against `1bd49777`.

**Correctness bugs (3):**
- [medium/high] `scripts/test-tmpdir.mjs:249`: terminal signals other than INT/TERM orphan the suite (promoted).
- [low/medium] `tests/test-tmpdir.test.js:185`: the safety net misses the suite's group.
- [low/low] `scripts/test-tmpdir.mjs:186`: EPERM reads as gone.

**Cleanups (1):**
- `scripts/test-tmpdir.mjs:271`: report a group that survives the reap.

**Boundary**: `true`, `probes_executed: 8`, `escaped: 0` (carried; the boundary is unchanged).

**Mutation proofs** (Step 3c, the cycle-2 fixes, run against committed tests at `1bd49777`; the tree was unchanged afterwards):

- mutation-proven: `detached: true` → `false` → three signal/reap tests → covered
- mutation-proven: group forwarding → `child.kill(sig)` → "a signal reaches the suite's grandchildren too…" → covered
- mutation-proven: `await reapGroup(...)` removed → "a background process the suite leaves behind…" → covered
- mutation-proven: `eval-` rule off → "prefixOf strips the random suffix…" → covered
- mutation-proven: retry guard removed → "removeDir reports a directory it cannot remove…" → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` @ `1bd49777` (local) | PASS: 6,368 tests, 0 failures, ratchet ok, bundle clean |
| Signal probe @ `1bd49777` | SIGTERM clean; SIGHUP and SIGQUIT leak the suite and its directory |

### Test Commands Executed
```bash
command node hup-probe.js scripts/test-tmpdir.mjs SIGTERM|SIGHUP|SIGQUIT   # CR3-1 reproduction
npm run ci:fast
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium reliability regression (CR3-1) from the cycle-2 fix. No high findings.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` for CR3-1 (fold in CR3-2/3/4), then cycle 4.
