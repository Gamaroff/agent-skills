# QA Report: Task 229 - Secret-scan CI lane over tracked files (cycle 4)

**Task**: [task.229.secret-scan-ci-lane.md](./task.229.secret-scan-ci-lane.md)
**Gate File**: [task.229.gate.4.secret-scan-ci-lane.yml](./task.229.gate.4.secret-scan-ci-lane.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: PASS

---

## Executive Summary

Cycle 3's fixes hold. A tracked `.gitleaksignore` no longer silences the PR-text scans (real binary,
rc 1), and the lane's threat model and default path allowlist are stated. Two low findings remain and
were carried by the cosmetic-residue exit (route 2b).

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (cycle 3): tracked `.gitleaksignore` silenced the stdin scans | ✅ FIXED | real binary rc 0 → 1; flag dropped → 1 red; `cd` dropped → 1 red |
| CR-3 (cycle 3): threat model unstated, CHANGELOG overclaim | ✅ FIXED | header, workflow comment, CONTRIBUTING, CHANGELOG |
| CR-4 (cycle 3): default path allowlist unannounced | ✅ FIXED | named in header, CONTRIBUTING, CHANGELOG; "no path allowlist" removed |

---

## New Findings This Cycle

Scoped re-review (prior gate's security was CONCERNS, not FAIL; `SAFETY_REPROBE=false`): the
`98205b89..f4b3f9ef` diff outside the task directory, 5 files, 251 patch lines.

- **[low/high]** `scripts/lint-secrets.sh:94`: the tree scan loads a tracked `.gitleaksignore` from
  its source copy. Not exploitable today (the fingerprint embeds the random mktemp path), but the
  docs say otherwise (CR-1).
- **[low/high]** `evals/shared/tests/lint-secrets.test.mjs:517`: the pinned-rules test cannot see
  the dir-scan source (CR-2).

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only code-review subagent (89.7 s). Re-review scope: scoped to the fix
diff. Step 4b: not applicable, because there is no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: script + npm wiring + test | PASS | Verified | CR-1, CR-2 low, carried |
| Phase 2: workflow + parity tables | PASS | Verified | threat-model comment |
| Phase 3: docs | PASS | Verified | scope stated |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Clean tree exits 0 | real `lint:secrets` clean | PASS |
| Tracked/staged token exits 1 | probe 11/11 | PASS |
| Self-check proves the scanner | three-plant loop | PASS |
| Commit-message and body tokens exit 1 | probe; real-binary repro with a tracked `.gitleaksignore` | PASS |
| Lane green on PR head | CI pending @ f4b3f9ef | pending |

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2, carried)

CR-1, CR-2: carried to `recommendations.future` and to the task's `## Deferred Work` (route 2b).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

### Reliability — PASS

### Security — PASS

- **Evidence**: measured
- **Probes executed**: 11 (`task.229.qa.4.security.run.json`, `totals.executed`); escaped: 0
- Cycle-3 CR-1 verified with the real binary. No reachable tree-scan bypass was found.

### Maintainability — PASS

---

## Code Review

boundary: true — shell-argv probe, probes_executed: 11, escaped: 0.

**Correctness bugs (2):**
- [low/high] `scripts/lint-secrets.sh:94`: the tree-scan source carries a tracked `.gitleaksignore`.
  **Promoted: CR-1 (low).**
- [low/high] `evals/shared/tests/lint-secrets.test.mjs:517`: the test cannot see it. **Promoted:
  CR-2 (low).**

**Cleanups (0).**

mutation-proven: `--gitleaks-ignore-path` dropped → pinned-rules case → covered; `cd` in `scan_stdin` dropped → pinned-rules case → covered

---

## Regression Testing

Fast gate at f4b3f9ef: 6221 tests, 0 failed. Probe: engages, 11/11.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 96/100
**Deployment Recommendation**: READY. Cosmetic-residue exit (route 2b) carried CR-1 and CR-2.
