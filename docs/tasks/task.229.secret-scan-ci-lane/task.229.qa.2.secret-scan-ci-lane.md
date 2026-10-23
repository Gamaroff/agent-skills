# QA Report: Task 229 - Secret-scan CI lane over tracked files (cycle 2)

**Task**: [task.229.secret-scan-ci-lane.md](./task.229.secret-scan-ci-lane.md)
**Gate File**: [task.229.gate.2.secret-scan-ci-lane.yml](./task.229.gate.2.secret-scan-ci-lane.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's fixes hold: a scanner error no longer reads as a leak, and the self-check survives one
missed plant. The cycle-2 refute pass found that the lane can be switched off by the change it scans:
a `.gitleaks.toml` committed in the PR replaces the rules for the tree scan, and the self-check runs
outside that tree. The tracked QA probe fixture also turns the shellcheck lane red.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED (CR-1, CR-2, QA2-1)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (cycle 1): gitleaks error exit read as a leak | ✅ FIXED | `LEAK_RC=99` + `scanner_ran`; stub error cases; mutation `LEAK_RC=1` → 2 red (`covered`) |
| QA-1: self-check missed ~1% of plants | ✅ FIXED | three plants; second-plant case; mutation `for _ in 1` → 2 red (`covered`) |
| CR-2 (cycle 1, advisory): force-push base | ✅ FIXED, but see new CR-2 | the guard over-reaches onto PR events |
| CR-3 (cycle 1, advisory): `edited` trigger | ✅ FIXED | `pull_request.types` includes `edited` |

---

## New Findings This Cycle

- **[high]** `scripts/lint-secrets.sh:121` — a PR-committed `.gitleaks.toml` silences the tree scan
  while the self-check passes (CR-1) → pin the config.
- **[medium]** `scripts/lint-secrets.sh:140` — a missing range base skips the message scan on PR events
  too (CR-2) → skip only on a push-event range.
- **[medium]** `docs/tasks/task.229.secret-scan-ci-lane/task.229.qa.1.security.setup.sh:27` — SC2034,
  shellcheck lane red (QA2-1) → `for _ in`.
- **[low]** `scripts/lint-secrets.sh:135` — a range without `..` scans all history (CR-3, advisory).

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only code-review subagent, cycle 2 refute pass over the full
`origin/develop...HEAD` diff (24 files). Reviewer dispatched 19:03:59 UTC, `duration_ms` 187914.
Re-review scope: unscoped — cycle 2 refute pass (one prior gate); `SAFETY_REPROBE=false` (clause 1:
prior security status CONCERNS). Step 4b: not applicable — no runnable prose in the change set.
Standards-named validation: no skill changed, `npm run validate` not applicable.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: script + npm wiring + test | FAIL | Verified | CR-1, CR-2 |
| Phase 2: workflow + parity tables | CONCERNS | Verified | shellcheck lane red (QA2-1) |
| Phase 3: docs | PASS | Verified | "misses three of them" in CHANGELOG and CONTRIBUTING |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Clean tree exits 0 | real `lint:secrets` at 4f547771: clean; test case 3 | PASS |
| Staged/tracked token exits 1 | probe `secrets.tracked`, `secrets.staged` rejected | PASS, but bypassable (CR-1) |
| Self-check proves the scanner | `scripts/lint-secrets.sh` self-check loop; second-plant and three-miss cases | PASS for the binary, not for the config (CR-1) |
| Commit-message token exits 1 | probe `secrets.message` rejected | PASS, but skipped when the base is absent (CR-2) |
| Lane green on PR head | shellcheck red, test pending @ 4f547771 | FAIL (QA2-1) |
| `npm run lint:shell` clean | rc 1, SC2034 in the probe fixture | FAIL (QA2-1) |

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue CR-1: a PR can switch the tree scan off with a `.gitleaks.toml`**
- **Observation**: `GL_FLAGS` has no `--config`; gitleaks loads `.gitleaks.toml` from the scanned
  directory. Reproduced with 8.30.1 in a throwaway repo: tracked token → rc 1; same token plus a tracked
  allow-all `.gitleaks.toml` → `gitleaks: clean`, rc 0. `GITLEAKS_CONFIG` in the environment is caught
  by the self-check (it scans under the same environment). A relative `.gitleaksignore` fingerprint did
  not suppress (rc 99), and the absolute path is random.
- **Impact**: the guard can be disabled by the PR it guards, and the green result reads as a real scan.
- **Recommendation**: pass a `--config` the PR cannot change, or plant inside the scanned tree.

### MEDIUM Severity Issues (2)

**Issue CR-2: a missing range base skips the message scan on PR events** — see the gate.

**Issue QA2-1: the QA probe fixture breaks the shellcheck lane** — SC2034; QA's own artifact, tracked in
the cycle-1 fix commit without a full `lint:shell` run.

### LOW Severity Issues (1, advisory)

- CR-3: malformed `SECRET_SCAN_RANGE` values are not rejected.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
At most two extra sub-second self-check scans.

### Reliability — CONCERNS
CR-2.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 11 (`task.229.qa.2.security.run.json`, `totals.executed`); escaped: 0
- The probe engages (11/11), but its corpus has no config-file case; CR-1 was found by the refute pass
  and reproduced by hand with the real binary.

### Maintainability — PASS

---

## Code Review

boundary: true — shell-argv probe re-run, probes_executed: 11, escaped: 0.

**Correctness bugs (3):**
- [high/high] `scripts/lint-secrets.sh:121` — no `--config`: a PR-supplied `.gitleaks.toml` silences
  the tree scan → pin the config. **Promoted: CR-1.**
- [medium/high] `scripts/lint-secrets.sh:140` — force-push guard also skips PR events → skip only on
  push ranges. **Promoted: CR-2.**
- [low/medium] `scripts/lint-secrets.sh:135` — a range with no `..` scans all history → validate the
  range shape. Advisory.

**Cleanups (0).**

Provenance: all in files new to this branch.

mutation-proven: `LEAK_RC=99` → `LEAK_RC=1` → lint-secrets scanner-error cases → covered
mutation-proven: three plants → one → lint-secrets second-plant and three-miss cases → covered

---

## Regression Testing

Fast gate at 4f547771: 6215 tests, 0 failed. `npm run lint:shell`: rc 1 (QA2-1).

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test evals/shared/tests/lint-secrets.test.mjs
npm run lint:shell
command node .agents/skills/qa-task/references/security-probe.mjs --entry shell-argv:scripts/lint-secrets.sh \
  --argv '["{input}"]' --fixture-setup docs/tasks/task.229.secret-scan-ci-lane/task.229.qa.1.security.setup.sh \
  --cases-file docs/tasks/task.229.secret-scan-ci-lane/task.229.qa.1.security.cases.json \
  --name lint-secrets --record docs/tasks/task.229.secret-scan-ci-lane/task.229.qa.2.security.run.json --json
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high finding (CR-1) and two medium.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED — fix CR-1, CR-2 and QA2-1.
