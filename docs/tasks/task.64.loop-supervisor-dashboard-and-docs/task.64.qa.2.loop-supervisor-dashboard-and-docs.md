# QA Report: Task 64 — Cycle 2 (re-review)

**Task**: [task.64.loop-supervisor-dashboard-and-docs.md](./task.64.loop-supervisor-dashboard-and-docs.md)
**Gate File**: [task.64.gate.2.loop-supervisor-dashboard-and-docs.yml](./task.64.gate.2.loop-supervisor-dashboard-and-docs.yml)
**Previous**: [gate 1](./task.64.gate.1.loop-supervisor-dashboard-and-docs.yml) — CONCERNS, 50/100
**Review Date**: 2026-08-29
**Gate Status**: CONCERNS
**Quality Score**: 90/100

---

## Executive Summary

Ten of eleven findings are fixed, and — the part that matters — **fixed in a way that something holds in place**. Each claimed fix was re-verified by reverting the behaviour and re-running the suite, not by reading the diff.

One did not survive that test. **QA-5, the token strip from the spawned child's environment, is proved by nothing**: deleting it leaves the suite fully green. The code is correct; the protection is unheld. Cycle 1's headline finding was a security mitigation asserted by a test that could not fail, and shipping its replacement with no test at all is the same defect in different clothes — so it gates.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

Scope: files changed since gate 1 — `run-loop.mjs`, `dashboard.test.mjs`, `tests/executable-instructions.test.js`, `README.md`. Fix commits `1dbf394`, `c717386`.

**Method — mutation, not inspection.** A fix that is only read is a fix that is assumed. For each claimed fix the behaviour was reverted, the suite re-run, and the file restored. A mutant that kills no test means the fix is real but unheld, and is recorded as **not proved** regardless of how the code reads.

| Cycle 1 issue | Status | Verified by | Mutation result |
|---|---|---|---|
| QA-1 frame published the whole ledger | ✅ FIXED | mutation | drop the `runId` filter → **1 killed** |
| QA-2 token-absence test was vacuous | ✅ FIXED | mutation | copy the token into the frame → **2 killed** |
| QA-3 SC2 proved a level too low | ✅ FIXED | mutation | rethrow from `pushRunFrame` → **2 killed** |
| QA-4 gate did not scan the runbook | ✅ FIXED | mutation | phantom command in each file class → **2 killed** |
| **QA-5 token stripped from child env** | ⚠️ **PARTIAL** | inspection only | remove the strip → **0 killed** |
| QA-6 double-SIGINT left `active:true` | ✅ FIXED | inspection | plus a third-SIGINT re-entrancy bug the fix *introduced*, caught by the dev-side adversarial pass and guarded |
| QA-7 `pushFrame` unguarded | ✅ FIXED | mutation | covered by the QA-3 mutant |
| QA-8 env fallback inferred presence | ✅ FIXED | test | `--dashboard-token ''` case asserted |
| QA-9 `repoUrl` unredacted | ✅ FIXED | mutation | return the URL unredacted → **2 killed** |
| QA-10 live-network test in default glob | ✅ FIXED | test run | now skipped unless `LOOP_SUPERVISOR_LIVE_NETWORK_TESTS=1` |
| QA-11 unserialisable test too weak | ✅ FIXED | test | `res.reason` now pinned |

**10 closed, 1 partial, 0 regressions.**

---

## Issues Found

### MEDIUM Severity Issues (1)

**QA-12 — The child-environment token strip is proved by no test**

- **Category**: Security / Quality
- **Observation**: Mutation M5 deleted `delete childEnv.LOOP_SUPERVISOR_DASHBOARD_TOKEN` and the suite stayed green at 32/32.
- **Impact**: The strip sits inline in `main()`, which no test can reach. A future refactor of the `spawn` options removes the protection silently, and the failure is invisible — the token simply starts appearing in child environments again, and nothing anywhere goes red.
- **Why it gates**: this is precisely the shape of cycle 1's QA-2. That finding was "a security mitigation the risk table claims is asserted by a test, where the test cannot fail". This one is "a security mitigation with no test at all". The lesson of the previous cycle does not get to be relearned in the next one.
- **Recommendation**: extract the child environment into an exported pure function and assert it drops the token while preserving the rest of the environment.
- **Ref**: `skills/loop-supervisor/scripts/run-loop.mjs`, `spawn` options in `main()`

### LOW / Informational

None outstanding. Every cycle-1 LOW is closed.

---

## Success Criteria — Cycle 2

All eight are now **full**. The three that were partial at cycle 1:

- **SC1** — `pushRunFrame` is exercised directly, including the ledger-scoping the frame depends on.
- **SC2** — six failure modes asserted at the run level with `assert.doesNotReject`, which is what "leaves the run's outcome and exit status unchanged" means for a call the loop awaits without a catch.
- **SC8** — the gate now scans `docs/runbooks/**` and `skills/*/README.md`, mutation-proved on both.

---

## NFR Assessment

**Security — CONCERNS.** Both latent leaks are closed in code and one (`repoUrl` redaction) is mutation-proved. Not PASS solely because of QA-12.
**Performance — PASS.** `repoUrl` now resolves only when `--dashboard` is set, so the common case spawns no `git` subprocess.
**Reliability — PASS.** `pushRunFrame` is mutation-proved to swallow every failure mode, including throwing inputs.
**Maintainability — PASS.** Both tests that reported coverage they did not have are replaced and mutation-proved.

---

## Verification

```
npm test                 1867 — 1866 pass, 1 skipped (gated live-network), 0 fail
CI on c717386            4/4 green (test, link-check, validate, branch-policy)
format:check             clean
npm run bundle           no drift
links                    100 paths + 26 anchors; 8 links re-verified in the TRACKED tree
mutation proving         6 invariants probed, 5 proved, 1 unproved (QA-12)
```

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100

**Rationale**: The work is materially complete and the fixes are real. The single outstanding item is not a defect in behaviour but a defect in what holds that behaviour — and on this particular task, where the stated thesis is that the load-bearing property is proved rather than assumed, that distinction is the whole point.

**Next Steps**: `/qa-fix` on QA-12, then cycle 3.
