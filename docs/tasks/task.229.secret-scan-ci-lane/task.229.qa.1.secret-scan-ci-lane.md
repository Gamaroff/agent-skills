# QA Report: Task 229 - Secret-scan CI lane over tracked files

**Task**: [task.229.secret-scan-ci-lane.md](./task.229.secret-scan-ci-lane.md)
**Gate File**: [task.229.gate.1.secret-scan-ci-lane.yml](./task.229.gate.1.secret-scan-ci-lane.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: CONCERNS

---

## Executive Summary

The lane is built as planned and is green on PR #733. The probe engine shows the script's refusal
holds against hostile file names, staged files and commit messages. Two medium defects remain in
`scripts/lint-secrets.sh`: a gitleaks error reads as a leak, and the random self-check plant is missed
about 1 run in 100, which fails clean trees.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 and QA-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (18/18 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#733)

### Testing Approach

- [x] Automated Testing (unit, parity, release-verdict)
- [x] Regression Testing (`npm run ci:fast` at develop)
- [x] Security Review (probe engine, shell-argv form)
- [x] Code Review (independent Explore subagent)

### Review Methodology

Direct tools plus one read-only code-review subagent (first review, 3 phases, single area).
Reviewer dispatched 18:49:29 UTC, returned in 107.8 s (`duration_ms` 107825).
Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or
`shared/resources/*.md` changed). Standards-named validation: `npm run validate` targets changed
skills; none changed, so not run.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: script + npm wiring + test | CONCERNS | Verified | CR-1, QA-1 below |
| Phase 2: workflow + parity tables | PASS | Verified | Lane green on PR; parity test red→green recorded |
| Phase 3: docs | PASS | Verified | All listed docs carry the lane; `release-ci-verdict` classification added |

**Overall Phase Completion**: 3/3 implemented, 1 with concerns.

---

## Success Criteria Verification

**Functional:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| Clean tree exits 0 | `lint-secrets.test.mjs` case 3; probe `secrets.clean`; CI lane green on 8dfb8fac | PASS |
| Staged token exits 1 | case 4; probe `secrets.staged` rejected | PASS |
| Low-entropy self-check exits 1 | case 2 (stub) + recorded real mutation | PASS |
| Binary absent exits 0 with message | case 1 | PASS |
| No tracked files exits 1 | case 6 | PASS |
| Lane green on PR head | run 39834591747, success | PASS |
| Commit-message token exits 1 | case 5; probe `secrets.message` rejected | PASS |
| Per-PR guard for task.228's criteria | tree + messages + body scanned on PR events | PASS (body edits not rescanned — CR-3, advisory) |

**Performance:** lane wall time 21 s (job created 18:48:26, updated 18:48:47). PASS — recorded here;
the implementation report still needs the line (Step 7 criterion).

**Code Quality:**

| Criterion | Actual | Status |
| --- | --- | --- |
| `npm test` incl. parity | 6210 tests, 0 failed (`ci:fast`) | PASS |
| `npm run lint:shell` | clean, 94 sources | PASS |
| `npm run format:check` | clean | PASS |
| No value printed | `--redact` on all 4 calls, case 7 | PASS |

---

## Breaking Changes Validation

None. `npm run ci` gains `lint:secrets`, which skips without a local binary.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue CR-1: a gitleaks error reads as a leak**
- **Severity**: MEDIUM
- **Observation**: `GL_FLAGS` sets `--exit-code 1`. gitleaks also exits 1 on a fatal error: measured
  rc=1 for a missing dir and for a bad report template. The self-check (`scripts/lint-secrets.sh:64`)
  then prints "planted token caught" for a crash, and each later scan reports the crash as a found
  secret.
- **Impact**: fails closed, but the message is wrong and a broken scanner passes the self-check.
- **Recommendation**: a distinct leak exit code (e.g. 99); any other non-zero is a scanner error.

**Issue QA-1: the self-check fails clean trees ~1% of runs**
- **Severity**: MEDIUM
- **Observation**: gitleaks 8.30.1 missed 3 of 300 random plants of the script's shape (measured via
  `gitleaks stdin`, no file writes). The same miss turned one probe case into a false pass until the
  probe fixture was made to keep only caught values.
- **Impact**: about 1 red lane in 100 on a clean PR, and the same locally in `npm run ci`.
- **Recommendation**: retry with fresh plants and fail only when all are missed; add a test case where
  the stub misses the first plant.

### LOW Severity Issues (2, advisory)

- CR-2: after a force-push, the push event's `before` is absent and `git log` errors with a
  "shallow clone?" message.
- CR-3: the `pull_request` trigger omits `edited`, so a body edit is not rescanned until the next push.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
Lane job 21 s on the PR; local scan ~17 s over 6806 files.

### Reliability — CONCERNS
QA-1 flake; CR-2 force-push case (advisory).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 11 (run record `task.229.qa.1.security.run.json`, `totals.executed`); escaped: 0
- Verdict `engages`: tracked, staged, leading-dash, space and command-substitution file names, a
  flag-shaped argument and a commit-message token all rejected; clean, untracked, deleted and
  `gitleaks:allow` cases accepted. No `PWNED` file created. CONCERNS from CR-1.

### Maintainability — PASS
One definition of the file set; tables and tests updated together.

---

## Code Review

boundary: true — `scripts/lint-secrets.sh` refuses on repository state. Probed with the
`shell-argv:` form, `--fixture-setup task.229.qa.1.security.setup.sh`, cases
`task.229.qa.1.security.cases.json`. probes_executed: 11, escaped: 0.

**Correctness bugs (3):**
- [medium/high] `scripts/lint-secrets.sh:64` — `--exit-code 1` collides with gitleaks' fatal-error exit
  → distinct leak exit code. **Promoted to gate as CR-1.**
- [low/medium] `scripts/lint-secrets.sh:110` — missing push base after a force-push → check the base
  exists first.
- [low/medium] `.github/workflows/secret-scan.yml:24` — body edits not rescanned → add `edited`, or
  document.

**Cleanups (0).**

Provenance: all three are in new files; nothing pre-existing.

Mutation proofs: no fixes this cycle, so none required. Development-time proofs (recorded in the
implementation report): self-check, `--redact`, empty-list guard and deleted-file filter each turned
a `lint-secrets.test.mjs` case red → covered.

---

## Regression Testing

`npm run ci:fast` 6210 tests, 0 failed; PR CI green on all five checks. PASS.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast
npm run format:check
bash scripts/lint-shell.sh
command node .agents/skills/qa-task/references/security-probe.mjs --entry shell-argv:scripts/lint-secrets.sh \
  --argv '["{input}"]' --fixture-setup docs/tasks/task.229.secret-scan-ci-lane/task.229.qa.1.security.setup.sh \
  --cases-file docs/tasks/task.229.secret-scan-ci-lane/task.229.qa.1.security.cases.json \
  --name lint-secrets --record docs/tasks/task.229.secret-scan-ci-lane/task.229.qa.1.security.run.json --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two medium findings in the script; everything else holds.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — fix CR-1 and QA-1.
