# QA Report: Task 140 - Harden the shell-fn: sentinels and the fake-gh coverage (cycle 3)

**Task**: [Link to task document](./task.140.shell-fn-sentinel-hardening.md)
**Gate File**: [task.140.gate.3.shell-fn-sentinel-hardening.yml](./task.140.gate.3.shell-fn-sentinel-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: FAIL

---

## Re-Review Context

| Cycle 2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 / [TASK-140-BUG-3](./task.140.bug.3.trap-shadow-bypassed.md) — trap shadow bypassed | FIXED (Closed) | source-completed marker; the trap-shapes row (lowercase `exit`, `builtin`/`command trap`, `TRAPEXIT`, `exec`) green; G1 reds it |
| CR-2, CR-3 / [TASK-140-BUG-4](./task.140.bug.4.gh-detector-open-ended.md) — gh spellings missed | FIXED (Closed) for PATH-resolved calls | trip-wire; the run-time row green; G2, G3 red it |
| CR-5 (advisory) — missing path under symlinked root | FIXED | ancestor realpath row green; G4 reds it |

---

## Executive Summary

Re-review of `8e739a7e` (qa-fix cycle 2, which replaced both open-ended mechanisms). The replacements are the right shape and every cycle-2 finding is closed. The safety re-probe found two defects in the new trip-wire's plumbing: its decline throws away the run's escape evidence (HIGH, reproduced), and a `gh` call under `env -i` is not recorded (medium, reproduced).

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — BUG-5 and BUG-6

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (112/112)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#527)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (boundary re-probe)
- [x] Code Review (safety re-probe)

### Review Methodology

Direct tools plus one read-only Explore reviewer over the whole `origin/develop...HEAD` diff (23 files, 2,703 lines; bundled copies excluded). Cycle 3 would normally narrow to files changed since gate 2; the **safety re-probe** was applied instead, by judgement on gate 2's security finding (a host-`gh` bypass). Step 4b: `no-executable-blocks` (one `mutating` block in `probe-boundary-rule.md`).

Re-review scope: unscoped (safety re-probe by judgement on gate 2 CR-2)

---

## New Findings This Cycle

- **[high]** `shared/resources/security-probe.mjs:1250` — the run-time `needs-fake-gh` decline drops escapes, shells and cases → [TASK-140-BUG-5](./task.140.bug.5.tripwire-decline-drops-escapes.md). Reproduced: a library that writes `$HOME` in every case and reaches `gh` via `X=gh; "$X"` reports **0** escapes, `shells: null`, 0 cases; without the `gh` call it reports **20** escapes.
- **[medium]** `shared/resources/security-probe.mjs:597` — the stub reads its marker path from the environment, lost under `env -i` → [TASK-140-BUG-6](./task.140.bug.6.tripwire-marker-lost-under-env-i.md). Reproduced: `env -i PATH="$PATH" "$X" api` → scored, executed 20.
- **[medium/medium conf]** `shared/resources/security-probe.mjs:1653` — a script that prepends a directory holding a real `gh` to `PATH` reaches it past the trip-wire; rule §5 names the absolute path as the *one* limit (advisory → future).
- **[medium/medium conf]** `shared/resources/security-probe.mjs:1056` — `--fake-gh` accepts a fixture whose `gh` is a symlink to the host binary; identical at base (advisory → future).
- **[low/medium conf]** `shared/resources/security-probe.mjs:707` — zsh `zshexit` / `zshexit_functions` not unset beside `TRAPEXIT` (advisory → future).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the red rows | PASS | Verified | 12 task.140 rows green |
| Phase 2: the body and the gates | FAIL | Partial | BUG-5 (HIGH), BUG-6 |
| Phase 3: the lint lanes | PASS | Verified | unchanged |
| Phase 4: rule, bundle, CHANGELOG | PASS | Verified | §5 updated for cycle 2 |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Own EXIT trap / `set -e` declines on bash + zsh | PASS | any death during the source, via the marker |
| `shell:` names gh → needs-fake-gh; spellings detected | CONCERNS | trip-wire works, but BUG-6 (env -i) and the prepend limit |
| Symlink refused | PASS | re-probe unchanged |
| task.136 green path; pre-existing rows | PASS | engages 20; 112/112; `shell:qa-cycle.sh` still engages 28 |
| Wall-clock within noise | PASS | |
| Mutation proofs; gates green | PASS | G1–G5 covered |
| Lanes byte-identical; rule once; CHANGELOG | PASS | |

---

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the trip-wire decline discards escape evidence (CR-1)**
- **Severity**: HIGH · **Category**: Security · **Priority**: P0
- **Bug Report**: [task.140.bug.5.tripwire-decline-drops-escapes.md](./task.140.bug.5.tripwire-decline-drops-escapes.md)
- **Observation**: measured above. New to this change (the trip-wire is cycle 2 code).
- **Recommendation**: carry the evidence; non-vacuous row.

### MEDIUM Severity Issues (1)

**Issue: `env -i` loses the trip-wire marker (CR-2)**
- **Bug Report**: [task.140.bug.6.tripwire-marker-lost-under-env-i.md](./task.140.bug.6.tripwire-marker-lost-under-env-i.md) — new to this change.

### LOW / advisory (3)
CR-3, CR-4, CR-5 — `recommendations.future`.

**Total Issues**: HIGH: 1, MEDIUM: 1 (+2 medium-confidence advisory), LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS (BUG-6)
### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 21 (copied from `task.140.qa.3.security.run.json` `totals.executed`)
- Re-probe unchanged (only pre-existing `encoded-traversal`). FAIL for BUG-5.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (5):**
- [high/high] `shared/resources/security-probe.mjs:1250` — run-time decline drops evidence (**CR-1**, gate)
- [medium/high] `shared/resources/security-probe.mjs:597` — marker path lost under `env -i` (**CR-2**, gate)
- [medium/medium] `shared/resources/security-probe.mjs:1056` — fake-gh `gh` may symlink to the host binary (CR-3, future)
- [medium/medium] `shared/resources/security-probe.mjs:1653` — PATH prepend reaches a real gh (CR-4, future)
- [low/medium] `shared/resources/security-probe.mjs:707` — zsh exit hooks (CR-5, future)

mutation-proven: G1 (drop the marker check) → trap-shapes row + cycle-1 trap row → covered
mutation-proven: G2 (no trip-wire on PATH) → run-time gh row → covered
mutation-proven: G3 (ignore the trip) → run-time gh row → covered
mutation-proven: G4 (lexical missing path) → ancestor row → covered
mutation-proven: G5 (drop `|| :`) → task.136 set -e row → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` | PASS 112/112 |
| `TMPDIR=/tmp` shell rows | PASS 53/53 |
| task.136 green path | engages, 20 |
| task.128 `shell:shared/resources/qa-cycle.sh` | engages, 28 |

---

## Test Artifacts

### Test Commands Executed
```bash
TMPDIR=/tmp command node --test --test-name-pattern='task\.140|symlink|fake-gh|shell-fn|shell entry' shared/resources/tests/security-probe.test.mjs   # 53/53
command node shared/resources/security-probe.mjs --sink filename --entry 'shell-fn:shared/resources/gh-labels.sh#gh_labels_filter' --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --fake-gh tests/fixtures/fake-gh --json   # engages 20
command node shared/resources/security-probe.mjs --sink filename --entry 'shell:shared/resources/qa-cycle.sh' --json   # engages 28
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-5 — P0
2. BUG-6 — P1

### Short-term Actions (Non-Blocking)
1. CR-4 — state the PATH-prepend limit (or strip gh-holding dirs)
2. CR-3, CR-5

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH (rule 1).
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.140.qa.3.shell-fn-sentinel-hardening.md`
**Gate File**: co-located at `task.140.gate.3.shell-fn-sentinel-hardening.yml`
**Next Steps**: fix BUG-5 and BUG-6 (both small), then re-review
