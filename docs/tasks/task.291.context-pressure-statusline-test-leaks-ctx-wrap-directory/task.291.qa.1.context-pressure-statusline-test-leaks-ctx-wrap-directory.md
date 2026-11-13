# QA Report: Task 291 - The context-pressure statusline test leaks a ctx-wrap- temp directory

**Task**: [Link to task document](./task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md)
**Gate File**: [task.291.gate.1.context-pressure-statusline-test-leaks-ctx-wrap-directory.yml](./task.291.gate.1.context-pressure-statusline-test-leaks-ctx-wrap-directory.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Gate Status**: CONCERNS

---

## Executive Summary

The fix works: no `ctx-wrap-` directory survives 100 runs, the new regression test goes red when the wait is removed, the full suite's tmp-leak ratchet is ok and CI on the PR head is green. One success criterion is unmet as written: the file's run time is 22% above `develop`, against a 10% bound, because the regression test sleeps on purpose.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Adaptive strategy override: lite mode, direct tools only. Diff review: code review, done in-line by QA rather than by a dispatched Explore subagent, so there was no independent reviewer on this cycle (independence loss recorded). Step 4b: not applicable, no runnable prose in the change set.

CI on cf682896489b: green.

---

## New Findings This Cycle

First review, so there is no previous finding. New findings:

- **[medium]** the task document, Performance criterion 1 — the file runs 22% slower than `develop` against a 10% bound → amend the criterion with an approver (T291-QA-1).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Reproduce, prove the cause, fix it | PASS | Verified | All four boxes ticked; the diff matches the plan |

**Overall Phase Completion**: 1/1

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Reproduction command prints 0 after the fix | 0 | 0 in 100 unloaded runs (this cycle) | PASS | Before, from the implementation report: 1 in 100 unloaded, 3 in 100 loaded; the slow stand-in left `ctx-wrap-X/s/wrap-1.json` on the unfixed test |
| Regression test fails with the fix reverted | red | red | PASS | See mutation proof below |
| `CI=true npm test` passes with `ctx-wrap` absent from the ratchet | pass | ratchet ok; 8392 tests, 8378 pass, 14 fail (see Regression Testing) | PASS | The 14 failures are an artifact of `TEST_LOCAL=1`; they pass without it |

**Performance**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| File run time no more than 10% above `develop` | at most +10% | +22% | FAIL | Five alternating runs of `time command node --test shared/resources/tests/context-pressure-statusline.test.mjs`, in ms: develop (ec14f2ec) 309, 745, 713, 658, 532 (median 658); branch (cf682896) 608, 1001, 1007, 525, 807 (median 807). `uptime` load average 1.45 before, 1.65 after. The new test alone takes 280 ms. |
| No test waits longer than 3000 ms | at most 3000 ms | longest test 306 ms | PASS | The cleanup's wait is bounded at 3000 ms in total |

**Code Quality**

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| Every state-dir test waits or has its state settled | PASS | Tests 1, 4, 5 (`stateDir()` registers the file; the `after` hook at line 20 settles it). The regression test settles through its own tracker (`own.cleanup()`). Tests 2 and 3 pass no state directory |
| Lint and prettier pass | PASS | Prettier: all matched files use Prettier code style. The repository has no eslint, so lint is not applicable |

**Migration**

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| `CHANGELOG.md` cites this task | PASS | `changelog-cites.sh`: cites (task 291) |
| `npm run bundle:check` reports 0 problems | not run | The change set touches no bundled source; the full suite ran its bundle guards |

---

## Breaking Changes Validation

None documented, none introduced.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: Performance criterion 1 unmet as written (T291-QA-1)**
- **Severity**: MEDIUM
- **Category**: Performance
- **Observation**: +22% median, +149 ms; the new test costs 280 ms, the five existing tests are unchanged.
- **Recommendation**: amend the criterion with an approver, or accept. The stub must keep sleeping longer than the cleanup latency, or a revert could read green.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — CONCERNS
Criterion 1 as above.

### Reliability — PASS
0 leaks in 100 runs; bounded waits.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- Test code and a helper only; no accept-or-reject boundary (`boundary: false`), and the criteria carry no boundary signal (`boundary_signals: []`).

### Maintainability — PASS
One documented helper; shared `stateDir()`.

---

## Code Review

Advisory unless promoted. No `category: bug` finding.

**Correctness bugs (0).**

**Cleanups (1):**
- `shared/resources/tests/context-pressure-statusline.test.mjs` regression test — the red-on-revert result depends on `cleanup()` running before the 150 ms stub ends; on a machine loaded enough to delay it past that, a revert could read green. The fix is unaffected. Advisory.

mutation-proven: the wait loop in `cleanup` removed → "no ctx-wrap- directory survives a slow recorder" went red, the other 5 stayed green → covered. Restored from a `cp` snapshot, `cmp` clean, 6 of 6 green. `probes_executed`: not applicable (`boundary: false`).

---

## Regression Testing

`CI=true TEST_LOCAL=1 npm run test:remote` (the LAN server was unreachable this cycle): 8392 tests, 8376 pass, 14 fail, ratchet ok. All 14 are in `tests/test-remote-runner.test.js`: with `TEST_LOCAL=1` set, 5 pass and 14 fail; without it, 19 of 19 pass. So the failures come from the variable leaking into the runner's own tests, not from this change. On the earlier fast gate on the LAN server (same code): 8389 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/context-pressure-statusline.test.mjs   # 6 of 6
T=$(mktemp -d); for i in $(seq 1 100); do TMPDIR=$T command node --test <file>; done      # 0 leaked
CI=true TEST_LOCAL=1 npm run test:remote
./node_modules/.bin/prettier --check <the two changed code files>
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The fix is held; one performance criterion needs an approver's decision.
**Quality Score**: 90/100

**Deployment Recommendation**: APPROVED

**Next Steps**: qa-fix handles T291-QA-1.
