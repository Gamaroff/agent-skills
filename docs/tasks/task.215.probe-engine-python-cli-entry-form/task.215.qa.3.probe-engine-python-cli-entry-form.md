# QA Report: Task 215 — security-probe: run a Python CLI under the cli: entry form

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Gate File**: [task.215.gate.3.probe-engine-python-cli-entry-form.yml](./task.215.gate.3.probe-engine-python-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Re-Review Context

Previous gate: [task.215.gate.2.probe-engine-python-cli-entry-form.yml](./task.215.gate.2.probe-engine-python-cli-entry-form.yml), FAIL 60/100. Fix commit `39921d48`.

| Finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-215-QA2-1: a crash outside the default excepthook is scored a refusal | HIGH | ✅ FIXED | A replaced excepthook, `sys.stderr = None` and `sys.tracebacklimit = 0` are `errored` (tests, plus a corpus run through the cli arm: 9 hostile cases errored, none rejected). Bug 2 closed. |
| TASK-215-QA2-2: the limitation note understates the class | MEDIUM | ✅ FIXED | Note removed; the crash bullet in `probe-boundary-rule.md` describes the bootstrap. Bug 3 closed. |

---

## Executive Summary

Cycle 2's fixes hold. The safety re-probe went over the new bootstrap and found that the bootstrap
itself can lose its marker. When an exception's `str()` raises, the marker is never written, so
behind a replaced excepthook a crash still reads as a refusal. It also found two defects caused by
fd 3 surviving `fork`, and one difference in how `__main__` behaves after the script body returns.
The HIGH count has been 1, 1, 1 across three cycles, so the pipeline's convergence check stops the
loop here.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (Progress Tracking 2/2)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#692, OPEN)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (engine probe, measured, plus reproductions by hand)
- [x] Code Review (Step 3b, safety re-probe)

### Review Methodology

Direct tools, plus one Explore reviewer for Step 3b. `SAFETY_REPROBE` is true: clause 1 is false,
and clause 2 holds because gate 2's HIGH concerned the crash classifier. Cycle 3 is not a refute
pass, so only the re-probe directive was appended.

Re-review scope: unscoped (prior gate: HIGH on a boundary, clause 2). Whole `origin/develop...HEAD`
diff (1336 patch lines), excluding the bundled copies and the task's own documents. Reviewer
dispatched 11:20:29Z, `duration_ms` 300937. Mutation proofs ran in a scratch worktree.

Step 4b: no fenced block in the change set changed, as in cycle 2. The prose edits this cycle sit
outside fences.

---

## New Findings This Cycle

- **[high]** `shared/resources/security-probe.mjs:772`: an exception whose `str()` raises escapes the
  bootstrap before the marker is written, so behind a replaced excepthook the crash is `rejected`
  (TASK-215-QA3-1).
- **[medium]** `shared/resources/security-probe.mjs:2526`: a forked child that raises writes the
  marker and overrides the parent's answer (TASK-215-QA3-2).
- **[medium]** `shared/resources/security-probe.mjs:761`: a forked daemon holds fd 3 open, so every
  case waits for the full timeout (TASK-215-QA3-3).
- **[low]** `shared/resources/security-probe.mjs:768`: `runpy.run_path` restores the bootstrap's
  `__main__` after the body returns (TASK-215-QA3-4).
- **[low, advisory]** `shared/resources/security-probe.mjs:759`: the bootstrap imports `runpy` while
  `sys.path[0]` is still the cwd, where a fixture file named like a stdlib module could shadow it
  (CR-5, medium confidence).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Steps 1-3: extension map, sandbox, run record | FAIL | 14/14 green | The bootstrap can lose its marker (TASK-215-QA3-1); fd 3 and fork defects |
| Steps 4-5: docs, bundle, CHANGELOG | CONCERNS | Verified | The `PYTHON_BOOTSTRAP` comment's "cannot hold the pipe" claim is false (TASK-215-QA3-3) |

**Overall Phase Completion**: 0/2 phases passed outright.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC1: a `.py` cli entry runs with `executed > 0` and the expected verdicts | `cli entry (python): a refusing .py CLI engages under python3…` | PASS |
| SC2: a `.py` entry is no longer declined for its extension | `cli entry (python): a .py entry with no --argv is bad-argv` | PASS |
| SC3: `interpreter` on the result and record, `null` otherwise | `cli entry (python): the record entry carries the interpreter, and null for a Node CLI` | PASS |
| SC4: a Python crash is `errored`, never `rejected` | Holds for every shape tested and for the corpus run. Fails for an unprintable exception behind a replaced excepthook: reproduced, verdict `engages` | **FAIL** |

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Tests passing | 100% | 316/316 affected suites; 14/14 python tests with `TMPDIR` set to a scratch directory | PASS |
| `npm run validate` on changed skills | 0 errors | finalise, qa-story, qa-task, review-security ✓ | PASS |
| Bundle freshness | 0 problems | 0 problems | PASS |

---

## Breaking Changes Validation

None declared, and none found.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: an unprintable exception loses the crash marker**
- **Severity**: HIGH
- **Category**: Security / Functional
- **Bug Report**: [task.215.bug.4.unprintable-exception-loses-marker.md](./task.215.bug.4.unprintable-exception-loses-marker.md)
- **Observation**: the marker line formats `str(e)` before `os.write`. A raising `__str__` escapes
  first, so nothing is written. Behind a replaced excepthook, the case is `rejected`.
- **Impact**: a false pass, verdict `engages`. Reproduced.
- **Recommendation**: write the class name before anything the script controls, and the message
  best-effort.
- **Priority**: P1

### MEDIUM Severity Issues (2)

**Issue: a forked child's exception overrides the parent's answer**
- **Bug Report**: [task.215.bug.5.forked-child-writes-marker.md](./task.215.bug.5.forked-child-writes-marker.md)
- **Observation**: the parent exits 0, the engine reads `errored`. Reproduced.
- **Recommendation**: write the marker only from the bootstrap's own pid, or close fd 3 at fork.

**Issue: a forked daemon holds the crash fd open**
- **Bug Report**: [task.215.bug.6.forked-daemon-holds-crash-fd.md](./task.215.bug.6.forked-daemon-holds-crash-fd.md)
- **Observation**: a refusal that returns in about 100 ms directly becomes `errored` after the full
  timeout. Reproduced (2 s timeout, 4 s run for two cases).
- **Recommendation**: close fd 3 in forked children, and correct the comment.

### LOW Severity Issues (2)

- **TASK-215-QA3-4**: `__main__` is restored after the body returns, so atexit handlers and threads
  see a different module than under `python3 <entry>`.
- **CR-5** (advisory): a stdlib-named fixture file in the cwd can shadow the bootstrap's imports.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — CONCERNS
A forked daemon makes every case cost the full timeout (TASK-215-QA3-3).

### Reliability — PASS
`SystemExit`, `__main__`, `sys.argv` and `sys.path[0]` behave as under `python3 <entry>` while the
script body runs, and each is mutation-proven.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 17, copied from `task.215.qa.3.security.run.json` `totals.executed`.
- Boundary: **true**. The second signal, `isPythonCrash`, was probed with the 17 cases from
  cycle 2, and all scored as required. The cli arm was also run with the `url-authority` corpus
  against `cli-crasher-excepthook.py`: 9 hostile cases `errored`, none `rejected`, verdict
  `unverifiable` (no-hostile-evidence), not `engages`. Crashes are declined, so that run executes 2,
  and it is not the counted record.
- The open false pass (TASK-215-QA3-1) was reproduced by hand and is not counted.

### Maintainability — PASS
One bootstrap constant and one marker reader. The rule is stated once.

---

## Code Review

Blocking under `code_review_blocking=true`.

**Correctness bugs (5):**
- [high/high] `shared/resources/security-probe.mjs:772`: the marker is lost when `str(e)` raises. **Promoted** to `TASK-215-QA3-1`.
- [medium/high] `shared/resources/security-probe.mjs:2526`: a forked child writes the marker. **Promoted** to `TASK-215-QA3-2`.
- [medium/high] `shared/resources/security-probe.mjs:761`: a forked daemon holds fd 3. **Promoted** to `TASK-215-QA3-3`.
- [low/high] `shared/resources/security-probe.mjs:768`: `__main__` restored after the body. **Promoted** to `TASK-215-QA3-4`.
- [low/medium] `shared/resources/security-probe.mjs:759`: stdlib shadowing from the cwd. Advisory.

**Cleanups (0).**

Anchors: all 5 `ok`. Provenance: the bootstrap is new on this branch, and SC4 names the class.

Mutation spot checks (cycle 2 fixes, scratch worktree):
- `mutation-proven: marker check removed → "a crash behind a replaced excepthook is errored…" + "an uncaught exception and a SyntaxError are errored" → covered`
- `mutation-proven: run_name not __main__ → "the script runs as python3 <path> runs it…" → covered`
- `mutation-proven: SystemExit treated as a crash → eight python tests → covered`

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` (all forms) | PASS |
| `probe-boundary-signals.test.mjs` | PASS |
| `finalise-dod-prompt-contract.test.mjs` | PASS |
| `qa-evidence-integrity.test.js` | PASS |
| `review-security.test.js` | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs` (`PYTHON_BOOTSTRAP`, `pythonCrashMarker`, `watchedSpawn`,
`runCliCase`), the test file, the four new fixtures, `probe-boundary-rule.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/probe-boundary-signals.test.mjs \
  evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/qa-evidence-integrity.test.js \
  skills/review-security/tests/review-security.test.js                  # 316 pass, 0 fail
TMPDIR=<scratch dir> command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs   # 14/14
npm run validate -- skills/{finalise,qa-story,qa-task,review-security}/    # all ✓
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.3.security.cases.json \
  --entry 'shared/resources/security-probe.mjs#isPythonCrash' --record docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.3.security.run.json --json   # 17 executed
command node shared/resources/security-probe.mjs --sink url-authority \
  --entry 'cli:shared/resources/tests/fixtures/security-probe/cli-crasher-excepthook.py' \
  --argv '["--mode","strict","--host","{input}"]' --json                 # 9 hostile errored, 0 rejected
```

### Coverage Report
Not measured.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-215-QA3-1: make the marker unconditional.
2. TASK-215-QA3-2 and QA3-3: scope fd 3 to the bootstrap process.

### Short-term Actions (Non-Blocking)
1. TASK-215-QA3-4: exec the entry in the real `__main__`.
2. CR-5: set `sys.path[0]` before importing `runpy`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: SC4 is still false for one reproduced shape. Each cycle has closed the shapes it was
given and found a narrower one in the new mechanism. HIGH ran 1, 1, 1 across three cycles.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-215-QA3-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.215.qa.3.probe-engine-python-cli-entry-form.md`
**Gate File**: co-located at `task.215.gate.3.probe-engine-python-cli-entry-form.yml`
**Next Steps**: the convergence check escalates; see the implementation report's Issues Log.
