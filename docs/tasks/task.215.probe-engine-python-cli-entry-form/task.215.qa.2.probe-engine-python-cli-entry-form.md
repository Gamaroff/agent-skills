# QA Report: Task 215 — security-probe: run a Python CLI under the cli: entry form

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Gate File**: [task.215.gate.2.probe-engine-python-cli-entry-form.yml](./task.215.gate.2.probe-engine-python-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Re-Review Context

Previous gate: [task.215.gate.1.probe-engine-python-cli-entry-form.yml](./task.215.gate.1.probe-engine-python-cli-entry-form.yml), FAIL 70/100, two findings. Fix commit `e6894a47`.

| Finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-215-QA1-1: three crash shapes read as refusals | HIGH | ✅ FIXED | `isPythonCrash` no longer reads the last line; the multi-line, ExceptionGroup and atexit shapes are tests. This cycle's probe added 11 new real crash shapes, and all were detected. Bug 1 closed. |
| TASK-215-CR-2: flags test has no non-vacuity floor | LOW | ✅ FIXED | The test asserts `interpreter.name` and the executed count. Dropping `.py` routing now reds the flags test (mutation below). |

---

## Executive Summary

Both cycle 1 findings are fixed, and the fixes hold under mutation. The refute pass then found a
wider false-pass class that cycle 1 did not reach. `isPythonCrash` reads only the traceback that the
default `sys.excepthook` writes to stderr. A crash reported any other way exits 1 with no frame and
is scored `rejected`: a replaced excepthook (as rich and Typer install), stderr redirected to stdout,
or stderr set to `None`. SC4 is still unmet.

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
- [x] Code Review (Step 3b, refute pass)

### Review Methodology

Direct tools, plus one Explore reviewer for Step 3b. Cycle 2 is a full refute pass, and
`SAFETY_REPROBE` is true: clause 1 is false (security CONCERNS, `measured`), but clause 2 holds (the
prior HIGH concerned a classifier) and so does clause 3 (gate FAIL, and SC4 says *never*). Both
directives were appended.

Re-review scope: unscoped (cycle 2 refute pass; safety re-probe, clauses 2–3). Whole
`origin/develop...HEAD` diff (1102 patch lines, 20 files), excluding the bundled copies under
`skills/*/references/` and the task's own documents. Reviewer dispatched 11:01:31Z, `duration_ms`
337634.

Mutation proofs ran in a scratch worktree (`git worktree add --detach`), not in the tree the reviewer
was reading. The worktree was removed afterwards.

Step 4b: `qa-execute-snippets.mjs --diff-base <merge-base>` reported `changed.total: 0` for all six
changed prose files. The edits are prose outside fences.

---

## New Findings This Cycle

- **[high]** `shared/resources/security-probe.mjs:2317`: a crash that does not reach stderr through
  the default excepthook exits 1 and is scored `rejected` → detect the exception out of band
  (TASK-215-QA2-1).
- **[medium]** `shared/resources/probe-boundary-rule.md:397`: the limitation note names one shape and
  understates the class → correct it with the fix (TASK-215-QA2-2).
- **[low, advisory]** `shared/resources/security-probe.mjs:988`: `probePython` runs with the engine's
  HOME and cwd, not the case child's (CR-3).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Steps 1-3: extension map, sandbox, run record | FAIL | 12/12 green | Routing, flags, sandbox and record hold; crash detection misses the excepthook class (TASK-215-QA2-1) |
| Steps 4-5: docs, bundle, CHANGELOG | CONCERNS | Verified | Bundle in sync; the limitation note understates the class (TASK-215-QA2-2) |

**Overall Phase Completion**: 0/2 phases passed outright.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC1: a `.py` cli entry runs with `executed > 0` and the expected verdicts | `cli entry (python): a refusing .py CLI engages under python3…` | PASS |
| SC2: a `.py` entry is no longer declined for its extension | `cli entry (python): a .py entry with no --argv is bad-argv`, plus the decline-text test | PASS |
| SC3: `interpreter` on the result and record, `null` otherwise | `cli entry (python): the record entry carries the interpreter, and null for a Node CLI` | PASS |
| SC4: a Python crash is `errored`, never `rejected` | Fixed for every stderr shape probed (17/17). Unmet for a crash outside the default excepthook: reproduced, exit 1, `isPythonCrash` false | **FAIL** |

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Tests passing | 100% | 314/314 affected suites; 12/12 python tests with `TMPDIR` set to a scratch directory | PASS |
| `npm run validate` on changed skills | 0 errors | finalise, qa-story, qa-task, review-security ✓ | PASS |
| Bundle freshness | 0 problems | 0 problems, 128 skills | PASS |

---

## Breaking Changes Validation

None declared, and none found.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: a crash outside the default excepthook is scored a refusal**
- **Severity**: HIGH
- **Category**: Security / Functional
- **Bug Report**: [task.215.bug.2.crash-outside-default-excepthook.md](./task.215.bug.2.crash-outside-default-excepthook.md)
- **Observation**: a custom `sys.excepthook`, `sys.stderr = sys.stdout` and `sys.stderr = None` each
  exit 1 after an uncaught exception, with `isPythonCrash` false. Reproduced by QA on python3 3.14.
- **Impact**: an input-dependent crash of this shape yields `engages`. That is a false pass, and Typer
  CLIs install a replacement excepthook by default.
- **Recommendation**: a `runpy` bootstrap that catches the exception before any excepthook runs, and
  reports it on a channel the script cannot write.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: the limitation note understates the class**
- **Severity**: MEDIUM
- **Category**: Documentation
- **Bug Report**: [task.215.bug.3.limit-note-understates-class.md](./task.215.bug.3.limit-note-understates-class.md)
- **Observation**: `probe-boundary-rule.md` names only `sys.tracebacklimit = 0`, and calls it
  unavoidable.
- **Recommendation**: drop it once the HIGH is fixed, or list every remaining shape.
- **Priority**: P2

### LOW Severity Issues (1)

- **CR-3** (advisory, low confidence): `probePython` runs with the engine's environment, so under a
  pyenv or asdf shim the recorded interpreter could differ from the one the case ran. Not reproduced:
  the host uses `/usr/bin/python3`.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
There is one `python3 --version` per process and one spawn per case. The new regexes stay under 50 ms
on 1e6-character pathological input (measured in the cycle 1 fix pass).

### Reliability — PASS
An uncaught `KeyboardInterrupt` dies by SIGINT and is `errored` via `neverRan`, so the exit-1 gate
loses no crash that Python reports by its exit status.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 17, copied from `task.215.qa.2.security.run.json` `totals.executed`.
- Boundary: **true**. Probed `shared/resources/security-probe.mjs#isPythonCrash` with
  `task.215.qa.2.security.cases.json`: 11 real crash shapes captured this cycle from
  `python3 -E -s -B` (nested ExceptionGroup, `raise … from`, an exception during handling,
  RecursionError, IndentationError, TabError, ModuleNotFoundError, a Unicode message, a bare class, a
  multi-line note, OSError then atexit), and 6 refusal shapes (a header with no frame, a frame at
  column 0, a tab-indented frame, an argparse error, an unquoted `File` line, empty). Verdict
  `engages`, and every case was as required.
- The open defect is outside the predicate's input: the crash never reaches stderr. It was reproduced
  by hand (3 shapes), and those runs do not count toward `probes_executed`.

### Maintainability — PASS
The crash rule is stated once, in `probe-boundary-rule.md`, and the bundled copies match it.

---

## Code Review

Blocking under `code_review_blocking=true` (pipeline run-level override).

**Correctness bugs (3):**
- [high/high] `shared/resources/security-probe.mjs:2317`: `isPythonCrash` sees only a crash that the
  default excepthook prints. A replaced excepthook, stderr redirected to stdout, or stderr `None` is
  scored `rejected`. **Promoted** to `TASK-215-QA2-1`.
- [medium/high] `shared/resources/probe-boundary-rule.md:397`: the limitation note understates the
  class. **Promoted** to `TASK-215-QA2-2`.
- [low/low] `shared/resources/security-probe.mjs:988`: platform variance; `probePython` uses the
  engine's HOME and cwd. Advisory; routed to `recommendations.future`.

**Cleanups (0).**

Anchors: all 3 `ok` (`finding-anchors.js --rev HEAD`).

Provenance: `isPythonCrash` does not exist on `origin/develop`, and SC4 names this class, so it is in
scope.

Platform variance: the python tests pass with `TMPDIR` set to a non-`/tmp` scratch directory (12/12).
CR-3 is not reproducible on this host.

Mutation spot checks (cycle 1 fixes, scratch worktree):
- `mutation-proven: last-line rule restored → "isPythonCrash reads the traceback, not the last line" + "an uncaught exception and a SyntaxError are errored" → covered`
- `mutation-proven: exit-1 gate dropped → "a traceback on a non-1 exit is not a crash" → covered`
- `mutation-proven: ".py" dropped from CLI_INTERPRETERS → eight python tests, including "the child runs as python3 -E -s -B, never -I" → covered`

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
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, the 11 `.py`
fixtures, `probe-boundary-rule.md`, `CHANGELOG.md`, the prose routing sites.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/probe-boundary-signals.test.mjs \
  evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/qa-evidence-integrity.test.js \
  skills/review-security/tests/review-security.test.js                 # 314 pass, 0 fail
TMPDIR=<scratch dir> command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs   # 12/12
npm run validate -- skills/{finalise,qa-story,qa-task,review-security}/   # all ✓
npm run bundle:check                                                   # 0 problems
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.2.security.cases.json \
  --entry 'shared/resources/security-probe.mjs#isPythonCrash' --record docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.2.security.run.json --json   # 17 executed
python3 -E -s -B <script>   # custom excepthook / stderr=stdout / stderr=None: exit 1, isPythonCrash false
```

### Coverage Report
Not measured. This repository's test runner reports no coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-215-QA2-1: detect an uncaught exception out of band, not from stderr.
2. TASK-215-QA2-2: correct the limitation note.

### Short-term Actions (Non-Blocking)
1. CR-3: probe the interpreter version under the case child's environment.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: SC4 is the task's central safety claim, and it is still false for a crash reported
outside the default excepthook.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-215-QA2-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.215.qa.2.probe-engine-python-cli-entry-form.md`
**Gate File**: co-located at `task.215.gate.2.probe-engine-python-cli-entry-form.yml`
**Next Steps**: `/qa-fix`, then QA cycle 3.
