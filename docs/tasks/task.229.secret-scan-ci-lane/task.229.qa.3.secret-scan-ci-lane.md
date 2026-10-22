# QA Report: Task 229 - Secret-scan CI lane over tracked files (cycle 3)

**Task**: [task.229.secret-scan-ci-lane.md](./task.229.secret-scan-ci-lane.md)
**Gate File**: [task.229.gate.3.secret-scan-ci-lane.yml](./task.229.gate.3.secret-scan-ci-lane.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fixes hold. The unscoped safety re-probe set the threat model: on `pull_request` a PR runs
its own workflow and script, so the lane can stop accidental leaks but cannot stop a hostile author.
Under that model three medium findings remain: a tracked `.gitleaksignore` silences the PR-text scans,
the limit is stated nowhere, and the default path allowlist skips some tracked paths unannounced.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1, CR-3, CR-4)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (cycle 2): PR-committed `.gitleaks.toml` silenced the tree scan | ✅ FIXED | `--config` pinned; real binary rc 1; dropping `--config` turns the pinned-rules case red (`covered`) |
| CR-2 (cycle 2): missing base skipped the message scan on PR events | ✅ FIXED | `SECRET_SCAN_EVENT=push` required; two outside-a-push cases |
| QA2-1: probe fixture SC2034 | ✅ FIXED | shellcheck lane pass @ 98205b89; `lint:shell` clean |
| CR-3 (cycle 2, advisory): malformed range | ✅ FIXED | three malformed-range cases |

---

## New Findings This Cycle

Searched unscoped (prior gate: security FAIL): full `origin/develop...HEAD` diff, 29 files. The
reviewer enumerated the script's inputs itself (repository files gitleaks and git read, attributes,
symlinks, environment, the workflow's own execution) and tested them with gitleaks 8.30.1.

- **[medium, reviewer high]** `scripts/lint-secrets.sh:74` — `--gitleaks-ignore-path` not pinned: a
  tracked `.gitleaksignore` silences the PR-body and commit-message scans (CR-1, reproduced).
- **[medium]** `.github/workflows/secret-scan.yml:72` — the PR runs its own scanner; the threat model
  is unstated and the CHANGELOG overclaims (CR-3).
- **[medium]** `scripts/lint-secrets.sh:73` — `useDefault` keeps the global path allowlist (CR-4).
- **[medium/medium, advisory]** `scripts/lint-secrets.sh:99` — no self-check for the stdin scans (CR-5).
- **[low, advisory]** `scripts/lint-secrets.sh:122` — tracked symlinks are skipped (CR-6).
- **[not reproduced]** `scripts/lint-secrets.sh:131` — working-tree-encoding (CR-2): rc 1 in QA's repro.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only code-review subagent. Re-review scope: unscoped (prior gate failed on
security) — `SAFETY_REPROBE=true` from clause 1. Reviewer dispatched 19:24:46 UTC, `duration_ms`
198116. Step 4b: not applicable — no runnable prose in the change set.

**Re-rating CR-1 (high → medium).** Measured: 0 tracked `.gitleaksignore` files; 0 writers of one in
`scripts/`, `shared/resources/` or `skills/*/scripts/`. A stdin fingerprint (`:generic-api-key:1`) is
written only on purpose, and CR-3 shows that a deliberate author controls the scanning script and
workflow anyway. Confidence is unchanged (high). Cycle 2's CR-1 was rated before CR-3 established
this; it also had an accidental route (a contributor adding a `.gitleaks.toml` for one false positive
changes the rules for every file).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: script + npm wiring + test | CONCERNS | Verified | CR-1, CR-4 |
| Phase 2: workflow + parity tables | CONCERNS | Verified | CR-3; shellcheck green |
| Phase 3: docs | CONCERNS | Verified | CR-3 threat model unstated; CHANGELOG overclaim |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Clean tree exits 0 | real `lint:secrets` clean at 98205b89 | PASS |
| Tracked/staged token exits 1 | probe 11/11; pinned-rules test | PASS |
| Self-check proves the scanner | three-plant loop, `dir` only (CR-5 advisory) | PASS |
| Commit-message and body tokens exit 1 | probe `secrets.message`; repro control rc 1 | PASS, silenced by a tracked `.gitleaksignore` (CR-1) |
| Lane green on PR head | shellcheck, secret-scan, link-check pass; test pending | PASS so far |

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

CR-1, CR-3, CR-4 — see the gate.

### LOW Severity Issues (advisory)

CR-5 (medium confidence), CR-6, CR-2 (not reproduced).

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW/advisory: 3

---

## NFR Assessment

### Performance — PASS

### Reliability — PASS
Cycle-2 CR-2 and CR-3 verified with the real binary.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 11 (`task.229.qa.3.security.run.json`, `totals.executed`); escaped: 0
- CR-1 reproduced by hand with gitleaks 8.30.1; the stub-based suite cannot see ignore-file effects.

### Maintainability — PASS

---

## Code Review

boundary: true — shell-argv probe, probes_executed: 11, escaped: 0.

**Correctness bugs (6):**
- [high→medium/high] `scripts/lint-secrets.sh:74` — unpinned `.gitleaksignore` → pin
  `--gitleaks-ignore-path`. **Promoted: CR-1 (re-rated, see Review Methodology).**
- [high/high, not reproduced] `scripts/lint-secrets.sh:131` — working-tree-encoding hides a blob
  secret → scan blobs. QA's repro: rc 1 (caught). Recorded under `recommendations.future`.
- [medium/high] `.github/workflows/secret-scan.yml:72` — the PR runs its own scanner → state the
  threat model. **Promoted: CR-3.**
- [medium/high] `scripts/lint-secrets.sh:73` — global path allowlist kept → surface or document.
  **Promoted: CR-4.**
- [medium/medium] `scripts/lint-secrets.sh:99` — no stdin self-check → advisory.
- [low/medium] `scripts/lint-secrets.sh:122` — symlinks skipped → advisory.

**Cleanups (0).**

mutation-proven: `--config` dropped → pinned-rules case → covered

---

## Regression Testing

Fast gate at 98205b89: 6221 tests, 0 failed (qa-fix cycle 2). Probe: engages, 11/11.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — fix CR-1, CR-3 and CR-4.
