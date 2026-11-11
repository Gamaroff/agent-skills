# QA Report: Task 291 - The context-pressure statusline test leaks a ctx-wrap- temp directory

**Task**: [Link to task document](./task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md)
**Gate File**: [task.291.gate.2.context-pressure-statusline-test-leaks-ctx-wrap-directory.yml](./task.291.gate.2.context-pressure-statusline-test-leaks-ctx-wrap-directory.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Gate Status**: PASS

---

## Executive Summary

Cycle 1's one finding is resolved: the owner amended Performance criterion 1 and the amended bound holds. The refute pass over the whole branch diff found no defect. The code has not changed since gate 1.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Adaptive strategy override: lite mode — direct tools only. Diff review: code review, a refute pass (cycle 2), done in-line by QA with no independent reviewer (independence loss recorded). Step 4b: not applicable, no runnable prose.

Re-review scope: whole branch diff (cycle 2 is always a full refute pass); the code is unchanged since gate 1 (head cf682896); only task documents changed since.

CI on 9f9a8939f200: pending (the change since the last green head, cf682896, is documents only).

---

## Re-Review Context

| Previous issue | Status |
| -------------- | ------ |
| T291-QA-1 — Performance criterion 1 unmet as written | ✅ FIXED — criterion #4 amended by the owner (approved by Lorien Gamaroff, Change Log 1.2); the amended bound is measured below |

## New Findings This Cycle

None. Searched the whole `origin/develop...HEAD` diff (the test file, the new helper `tests/lib/tmp-state-cleanup.mjs`, the CHANGELOG entry) as a refute pass. The four transitions were probed against the code:

- **Bulk teardown**: `cleanup()` removes only directories the tracker made. The recorder's single `mkdirSync` (`shared/resources/context-pressure.mjs:229`) comes before the file is written (`writeAtomic`, `:176`), and the step after it, `prune`, only reads the directory and writes `.pruned` with `writeFileSync`, which does not create parents. So once the file exists nothing can recreate a removed directory.
- **In-flight**: a recorder still running past the 3000 ms bound can still leak; the bound is by design and the wait ends as soon as the file exists. A `rmSync` racing `prune`'s marker write meets ENOTEMPTY and is retried by `maxRetries: 3`.
- **Error path**: a recorder that never writes costs the 3000 ms bound and then the directory is removed; a missing directory is not an error (`force: true`).
- **Reconnect**: not applicable.
- **Identity**: the expected file name `wrap-1.json` is the session id the tests already wait for.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Reproduce, prove the cause, fix it | PASS | Verified | Unchanged since gate 1 |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| Reproduction command prints 0 after the fix | PASS | 0 in 100 unloaded runs (cycle 1); the code is unchanged |
| Regression test fails with the fix reverted | PASS | Cycle 1 mutation proof: wait removed, only the new test red; code unchanged |
| `CI=true npm test` passes with `ctx-wrap` absent from the ratchet | PASS | Cycle 1: ratchet ok; the 14 failures were `TEST_LOCAL=1` leaking into `tests/test-remote-runner.test.js` |
| Five existing tests within 10% of develop (amended) | PASS | Seven alternating runs of `node --test` on the file, sum of the five existing tests, ms: develop (ec14f2ec) 479, 214, 346, 340, 472, 456, 421 (median 421); branch (9f9a8939) 161, 458, 335, 406, 238, 409, 159 (median 335). Load average 0.98 before, 1.20 after. Noise is large; the branch is not above develop |
| Regression test's cost recorded on its own line (amended) | PASS | Median 215 ms over the same seven runs (212 to 334) |
| No test waits longer than 3000 ms | PASS | Longest test about 334 ms |
| Every state-dir test waits or has its state settled | PASS | As in cycle 1 |
| Lint and prettier pass | PASS | Prettier ok (cycle 1); the repository has no eslint |
| `CHANGELOG.md` cites this task | PASS | `changelog-cites.sh`: cites (task 291) |
| `npm run bundle:check` reports 0 problems | not run | No bundled source changed |

Criteria drift: criterion #4 reworded, approved by Lorien Gamaroff (recorded in the gate's `criteria_drift`).

---

## Issues Found

None. **Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

Performance PASS, Reliability PASS, Security PASS (reasoned; `boundary: false`, `boundary_signals: []`), Maintainability PASS.

---

## Code Review

No correctness bugs and no cleanups beyond cycle 1's advisory note (the regression test's red-on-revert depends on `cleanup()` running before the 150 ms stub ends). mutation-proven: carried from cycle 1, code unchanged → covered.

---

## Regression Testing

Cycle 1's full suite stands: the code is unchanged. The `TEST_LOCAL=1` leak into `tests/test-remote-runner.test.js` is recorded in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c PR conformance review, then finalise.
