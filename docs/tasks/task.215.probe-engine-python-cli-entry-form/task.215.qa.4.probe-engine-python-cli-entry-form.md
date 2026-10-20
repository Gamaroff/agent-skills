# QA Report: Task 215 - security-probe: run a Python CLI under the cli: entry form

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Gate File**: [task.215.gate.4.probe-engine-python-cli-entry-form.yml](./task.215.gate.4.probe-engine-python-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Executive Summary

Cycle 4, run after the not-converging escalation and a two-cycle grant. Cycle 3 replaced the crash
signal with a constant token written before the exception is touched, and it holds: eleven crash
shapes behind a silent excepthook are `errored`, and the fork and `__main__` fixes are verified. The
safety re-probe found the channel itself can still be lost — a script that closes fd 3 has its crash
scored `rejected` — and an environment mismatch between the interpreter probe and the cases.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-215-QA3-1 — an exception whose `str()` raises loses the marker | HIGH | ✅ FIXED | new test (unprintable + nameless fixtures); probe cases `crash-str-raises`, `crash-str-exits`, `crash-str-not-str`, `crash-nameless`, `crash-name-not-str`, `crash-bigint` all `errored`; mutation "token write dropped" → covered |
| TASK-215-QA3-2 — a forked child writes the marker | MEDIUM | ✅ FIXED | fork-child test (child reuses fd 3 for a file; parent exits 7 if written); probe `fork-child-crash` `accepted`; mutation "pid check dropped" → covered |
| TASK-215-QA3-3 — a forked daemon holds fd 3 | MEDIUM | ✅ FIXED | fork-daemon test at a 2 s timeout; mutation "register_at_fork dropped" → covered |
| TASK-215-QA3-4 — `runpy` restores `__main__` | LOW | ✅ FIXED | atexit test; mutation "`__main__` restored after body" → covered |
| CR-5 (cycle 3, advisory) — stdlib shadowing of the bootstrap's imports | LOW | ✅ FIXED | the bootstrap imports only `os` and `sys`, both loaded before `sys.path` is read |

Bugs 4, 5 and 6 closed (Step 9b).

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/security-probe.mjs:807` — the crash token goes to whatever fd 3 is at
  crash time, and the engine reads only its presence: a script that closes fd 3 (`os.closerange`)
  loses the marker, or has it written into a file it opened afterwards, and behind a quiet excepthook
  the crash scores `rejected`. → TASK-215-QA4-1, [bug 7](./task.215.bug.7.closed-fd3-loses-crash-marker.md)
- **[MEDIUM]** `shared/resources/security-probe.mjs:1083` — `probePython` checks `python3` under
  the engine's environment while cases run under `caseEnv`, so an interpreter that starts only under
  the real `HOME` scores every case `rejected`. → TASK-215-QA4-2, [bug 8](./task.215.bug.8.interpreter-probe-env-differs.md)
- **[LOW, cleanup]** `shared/resources/security-probe.mjs:2583` — `pythonCrashMarker(child)` computed twice.

Searched unscoped (prior gate: HIGH on a boundary, FAIL with "never" in SC4): full
`origin/develop...HEAD` diff, 63 files, reviewable code in `security-probe.mjs`, its tests and 21
`.py` fixtures. Re-enumerated the crash channel's inputs — how the exception is formatted, how the
script's process tree uses fd 3, what the interpreter's environment is — and tested each.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#692)

### Review Methodology

Direct tools plus one read-only diff reviewer (re-review; high-risk boundary). Re-review scope:
unscoped (prior gate failed on a safety axis — clauses 2 and 3). Reviewer dispatched 12:02:02Z,
`duration_ms` 323955; it reproduced both bugs against scratch copies. Mutation proofs ran in a
scratch worktree while it read the live tree. Step 4b: 6 changed prose files, 0 changed fenced
blocks (3 files note `no-executable-blocks`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Steps 1–3: extension map, sandbox, run record | CONCERNS | Verified | crash channel loses a closed fd 3 (QA4-1); interpreter probe env (QA4-2) |
| Steps 4–5: docs, bundled copies | PASS | Verified | rule doc states the closed-fd-3 limit; bundle in sync |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC1 — `cli:<fixture>.py` returns `executed > 0` with expected verdicts | PASS | `cli entry (python)` suite, 18 tests, per PR |
| SC2 — `.py` no longer `entry-not-probeable` for the extension | PASS | refusing-CLI and no-python3 tests |
| SC3 — `interpreter` on result and record | PASS | record-entry test |
| SC4 — a crash is `errored`, never `rejected`; `sys.exit(1)` stays `rejected` | **FAIL** | probe: 11 of 12 crash shapes `errored`; `crash-closes-fd3` `rejected` (QA4-1). Refusals (`sys.exit(1)`, `sys.exit("msg")`, `os._exit(1)`, exit 3) all `rejected` |

---

## Breaking Changes Validation

None documented; none found.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: a closed fd 3 loses the crash marker**
- **Severity**: HIGH
- **Category**: Security (probe false pass)
- **Bug Report**: [task.215.bug.7.closed-fd3-loses-crash-marker.md](./task.215.bug.7.closed-fd3-loses-crash-marker.md)
- **Observation**: `os.closerange(3, 64)` then a crash behind a silent excepthook → `rejected`
  (probe); with a file reopened on fd 3, the token lands in the script's file and every hostile case
  is `rejected`, verdict `engages` (reviewer).
- **Impact**: SC4's "never" is unmet for scripts that close inherited descriptors.
- **Recommendation**: positive channel (a token on every bootstrap-controlled exit; missing →
  `errored`) plus an fd-identity check; or scope SC4.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: the interpreter probe runs under a different environment from the cases**
- **Severity**: MEDIUM
- **Category**: Reliability (platform variance)
- **Bug Report**: [task.215.bug.8.interpreter-probe-env-differs.md](./task.215.bug.8.interpreter-probe-env-differs.md)
- **Observation**: a `python3` shim that needs the real `HOME` passes `probePython` and fails in
  every case, scored `rejected`.
- **Recommendation**: probe under the case environment.
- **Priority**: P2

### LOW Severity Issues (1)

- CR-3 (cleanup): `pythonCrashMarker(child)` computed twice in `runCliCase`.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
A forked daemon no longer holds a case open (2 s timeout test).

### Reliability — CONCERNS
TASK-215-QA4-2.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 8
- Engine run over the `cli:` arm against a crash-matrix CLI (19 cases; record
  [task.215.qa.4.security.run.json](./task.215.qa.4.security.run.json)). Crash shapes sit on
  legitimate-direction cases, so a crash misread as a refusal shows as `overblocked`, not as a pass.
  11 crash shapes `errored` and declined; 3 answering cases `accepted` (incl. a forked child that
  crashes, a thread that crashes); 4 refusals `rejected`; 1 overblocked — the closed-fd-3 crash.

### Maintainability — PASS
One bootstrap constant, one marker reader; rule stated once; bundle in sync.

---

## Code Review

**Correctness bugs (2):**
- [high/high] `shared/resources/security-probe.mjs:807` ⚠️ unverified anchor (text-mismatch — the line_text differs from the source by one backslash escape; line 807 is the token write) — the crash token is written to whatever fd 3 is and only its presence is read, so a closed or reopened fd 3 hides the crash → positive channel plus an fd-identity check. Promoted: TASK-215-QA4-1.
- [medium/high] `shared/resources/security-probe.mjs:1083` — platform-variance: `probePython` runs under the engine env, cases under `caseEnv` → probe as a case runs. Promoted: TASK-215-QA4-2.

**Cleanups (1):**
- `shared/resources/security-probe.mjs:2583` — `pythonCrashMarker(child)` computed twice → compute once.

Provenance: the base has no Python arm; both bugs are new to this branch.

boundary: true — the `cli:` arm's crash classification (`PYTHON_BOOTSTRAP` + `pythonCrashMarker` +
`isPythonCrash` in `runCliCase`). probes_executed: 8 (run record `totals.executed`).

mutation-proven: token write dropped → "a crash whose exception cannot be printed is errored" → covered
mutation-proven: `register_at_fork` dropped → "a forked daemon does not hold the case open" → covered
mutation-proven: pid check dropped → "a forked child that crashes does not override the script's answer" → covered
mutation-proven: `__main__` restored after the body → "`__main__` is still the script's module" → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Node `cli:` arm, shell arms, record schema | PASS — `security-probe.test.mjs` |
| Boundary signals, finalise DoD contract, QA evidence integrity, review-security | PASS |
| Full fast gate on this head (`npm run ci:fast`, run by cycle 3's fix) | PASS — 5924 tests, 0 failures |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, the `.py`
fixtures, `shared/resources/probe-boundary-rule.md`, the task document.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/probe-boundary-signals.test.mjs \
  evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/qa-evidence-integrity.test.js \
  skills/review-security/tests/review-security.test.js                  # 320 pass, 0 fail
TMPDIR=<scratch dir> command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs   # 18/18
npm run validate -- skills/<each of finalise, qa-story, qa-task, review-security>/    # all ✓
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.4.security.cases.json \
  --entry 'cli:.claude/state/qa4/cli-crash-matrix.py' --argv '["--mode","strict","--host","{input}"]' \
  --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.4.security.run.json --json   # 8 executed, 1 overblocked
```

The crash-matrix fixture is QA scratch (`.claude/state/qa4/`, gitignored); its 19 cases are
committed beside this report.

### Coverage Report
Not measured.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-215-QA4-1: positive crash channel with an fd-identity check — or scope SC4.
2. TASK-215-QA4-2: probe `python3` under the case environment.

### Short-term Actions (Non-Blocking)
1. CR-3: compute the marker once.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a reproduced false pass on the crash channel (HIGH) violates SC4's "never".
**Quality Score**: 50/100 (100 − 20 per HIGH − 10 per MEDIUM − 10 per NFR CONCERNS)

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-215-QA4-1 fixed and re-reviewed, or SC4 scoped by the maintainer.

---

**QA Report**: co-located at `task.215.qa.4.probe-engine-python-cli-entry-form.md`
**Gate File**: co-located at `task.215.gate.4.probe-engine-python-cli-entry-form.yml`
**Next Steps**: the develop pipeline's convergence check reads HIGH 1, 1, 1 across cycles 2–4.
