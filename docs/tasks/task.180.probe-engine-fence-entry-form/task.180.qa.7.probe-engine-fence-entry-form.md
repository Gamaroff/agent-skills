# QA Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.7.probe-engine-fence-entry-form.yml](./task.180.gate.7.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 7, the granted cycle, reviews qa-fix cycle 6 (`cba2750b`). Both cycle-6 findings are fixed. This is the first gate of the loop with no HIGH. The safety re-probe found one MEDIUM: a default-path lookup (`command -p gh`, `env -u PATH gh`) in a fixture script skips the PATH guard on hosts whose `gh` is `/usr/bin/gh`, and the docs overclaim. It also found one LOW advisory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-180-017: the `gh` text check misses fixture content | high | FIXED | `ghFreePath` shadows every PATH directory holding `gh`; the BASH_ENV stand-in test is green; QA mutation Q1 red |
| TASK-180-018: a kill after a side effect scores errored | medium | FIXED | `absent` checked first; regression test green (5b mutation red) |

Bugs 10 and 11 → Closed.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore code reviewer, dispatched 2026-10-12T16:55:37Z, `duration_ms` 362487. No orientation note about stated limits was given this cycle.

Re-review scope: unscoped (prior gate: HIGH on a boundary, `SAFETY_REPROBE` clause 2). Whole `origin/develop...HEAD` diff, with the SAFETY RE-PROBE directive. Mutations ran in scratch worktrees.

Step 4b: no new fenced blocks in the in-scope docs since cycle 5.

---

## New Findings This Cycle

- **[MEDIUM]** `shared/resources/security-probe.mjs:2529`: platform-variance. `command -p gh` / `env -u PATH gh` in a fixture script reach `/usr/bin/gh` past the guard (TASK-180-019, bug 12). Mechanism confirmed here with `ls` (`command -p -v ls` → `/bin/ls` under `PATH=/nonexistent`); this host has no `/usr/bin/gh`. → Add fixture content to the text check; state the default-path lookup as a limit.
- **[LOW]** `shared/resources/security-probe.mjs:2364`: a relative PATH entry is kept unresolved, so a `fixture.env` PATH of `../../…/.local/bin` can point at a host directory (CR-2, low/medium, advisory).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Tests first | PASS | 32 fence and `ghFreePath` tests |
| Phase 2: The entry form | CONCERNS | TASK-180-019 |
| Phase 3: Routing and proof | PASS | task.167 proof holds |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC1 `fence:` probes a block, scored per `scoreFenceRun` | CONCERNS | TASK-180-019 (host-dependent) |
| SC2–SC5, Performance | PASS | committed tests; `ci:fast` green |

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: a default-path lookup bypasses the gh PATH guard**
- **Bug Report**: [task.180.bug.12.default-path-lookup-bypasses-gh-guard.md](./task.180.bug.12.default-path-lookup-bypasses-gh-guard.md)

### LOW Severity Issues (1)

- CR-2: a relative PATH entry is not resolved before the `gh` test (advisory).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26 (`task.180.qa.7.security.run.json` `totals.executed`)
- Both controls engage, 0 reproduced, 0 escapes. TASK-180-019 open.

### Performance — PASS · Reliability — PASS · Maintainability — PASS

---

## Code Review

boundary: true. probes_executed: 26.

**Correctness bugs (2):**
- [medium/high] `shared/resources/security-probe.mjs:2529`: default-path lookup bypasses the guard. Promoted to TASK-180-019.
- [low/medium] `shared/resources/security-probe.mjs:2364`: relative PATH entry not resolved. Advisory.

**Cleanups (0).** Provenance: both are new to this branch.

mutation-proven: `ghFreePath` keeps every directory → both TASK-180-017 tests → covered (the unit test red at once; the fence test red only after its 120.9 s per-case timeout, because this host's `gh` is a bash wrapper that re-sources the `BASH_ENV` fixture and recurses)
mutation-proven: `ghFreePath` returns the host directory on reuse → not-run (the 100 s run was terminated by the same recursion before reporting)

---

## Test Artifacts

```bash
npm run ci:fast   # in 5b, at cba2750b
npm run bundle:check
npm run lint:shell
npm run validate -- skills/qa-task/   # also qa-story, review-security, finalise
node shared/resources/security-probe.mjs … --record task.180.qa.7.security.run.json --json   # the two controls
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; one open MEDIUM (TASK-180-019).
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — TASK-180-019 fixed or its limit stated.
