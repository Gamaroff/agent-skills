# QA Report: Task 215 — security-probe: run a Python CLI under the cli: entry form

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Gate File**: [task.215.gate.1.probe-engine-python-cli-entry-form.yml](./task.215.gate.1.probe-engine-python-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Executive Summary

The `.py` extension routing, the `-E -s -B` interpreter flags, the missing-python3 decline, the
`interpreter` record field and the doc sweep all hold, and each is backed by a test that goes red when
its behaviour is reverted. The crash detector does not hold. Probing `isPythonCrash` with the engine
found three shapes of real uncaught Python crash that it reads as refusals. The `cli:` arm scores
them `rejected`, which is the false pass Success Criterion 4 forbids.

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

- [x] Automated Testing (unit, integration via child-process runs)
- [x] Regression Testing
- [x] Security Review (engine probe, measured)
- [x] Code Review (Step 3b)

### Review Methodology

Direct tools, plus one Explore subagent for the Step 3b diff review. The strategy is "small task":
two progress phases, one module plus bundled copies, no `risk_level`. The reviewer was dispatched at
10:41:50Z and returned with `duration_ms` 104250. First review, unscoped: the whole
`origin/develop...HEAD` diff, excluding the byte-identical bundled copies under
`skills/*/references/` and the task's own documents (947 patch lines, 19 files).

Step 4b: no fenced bash block in the change set changed. `qa-execute-snippets.mjs --diff-base
<merge-base>` reported `changed.total: 0` for all six changed prose files
(`probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, and the
`qa-task`, `qa-story` and `review-security` `SKILL.md`). The edits are prose lines outside fences.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Steps 1-3: extension map, sandbox, run record | CONCERNS | 11/11 green | Routing, flags, sandbox and record verified; the crash detector misses real crash shapes (TASK-215-QA1-1) |
| Steps 4-5: docs, bundle, CHANGELOG | PASS | Verified | Every site of the review's recorded `Node CLI` search updated; `bundle:check` 0 problems |

**Overall Phase Completion**: 1/2 phases passed outright.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC1: a `.py` cli entry runs with `executed > 0` and the expected verdicts | `cli entry (python): a refusing .py CLI engages under python3…` (committed, per PR) | PASS |
| SC2: a `.py` entry is no longer declined for its extension; other decline reasons unchanged | `cli entry (python): a .py entry with no --argv is bad-argv`, the existing decline-text test, and the full suite green | PASS |
| SC3: `interpreter` on the result and record, `null` otherwise | `cli entry (python): the record entry carries the interpreter, and null for a Node CLI` | PASS |
| SC4: a Python crash is `errored`, never `rejected`; a plain `sys.exit(1)` stays `rejected` | The committed tests cover one uncaught `RuntimeError` and one `SyntaxError`. The engine probe found 3 of 7 measured crash shapes `rejected` | **FAIL** |

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Tests passing | 100% | 313/313 affected suites; `ci:fast` 5917/0 at Step 3 | PASS |
| `npm run validate` on changed skills | 0 errors | finalise, qa-story, qa-task, review-security ✓ | PASS |
| Bundle freshness | 0 problems | 0 problems, 128 skills | PASS |

---

## Breaking Changes Validation

None declared, and none found. A `.py` entry was declined before this change. The decline text was
reworded, and the existing assertion on it (`/\.mjs \/ \.js/`) still matches.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: three shapes of real Python crash are scored as refusals**
- **Severity**: HIGH (the reviewer rated CR-1 medium, high confidence; raised by QA on the measured
  SC4 failure, see below)
- **Category**: Security / Functional
- **Bug Report**: [task.215.bug.1.python-crash-read-as-refusal.md](./task.215.bug.1.python-crash-read-as-refusal.md)
- **Observation**: `isPythonCrash` returns `false` for an uncaught crash whose message spans two
  lines, for an `ExceptionGroup`, and for a crash followed by an `atexit` line on stderr. Each exits 1
  with a full `Traceback` block.
- **Impact**: a Python boundary that crashes on every input reads as one that refuses every hostile
  input. That is a false pass, in the direction the task exists to rule out.
- **Recommendation**: anchor on the Traceback header plus a frame, not on the last line.
- **Priority**: P1

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- **TASK-215-CR-2**: the `-E -s -B, never -I` test has no non-vacuity floor (from Step 3b, promoted
  under `code_review_blocking`).

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
`python3 --version` is resolved once per process (`probePython` caches it). There is one spawn per
case, the same as the Node form.

### Reliability — PASS
With `python3` absent from `PATH`, the entry is declined once by name and nothing spawns (tested with
an empty `PATH`). Every `.py` result path carries the JS form's key set.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 12, copied from `task.215.qa.1.security.run.json` `totals.executed`.
- Boundary: **true**. `isPythonCrash` is an exported predicate that returns a verdict, and SC4 contains
  *never*. Probed as `shared/resources/security-probe.mjs#isPythonCrash` with
  `task.215.qa.1.security.cases.json`. The cases are 7 real crash outputs captured from
  `python3 -E -s -B` (legitimate, must return `true`) and 5 refusal outputs (hostile, must return
  `false`). No corpus sink models Python stderr, so the `markdown-structure` sink name carries the
  cases; the cases themselves are this cycle's.
- Result: the engine verdict was `engages`, with `reproduced: 0`, because a legitimate case scored
  rejected is not a reproduction. The per-case outcomes are the finding: `py-crash.multiline`,
  `py-crash.group` and `py-crash.atexit_after` were `rejected`. All 5 refusal cases were `rejected`,
  as they should be.
- The `.py` sandbox holds. A write to `$HOME` is recorded as an escape inside the sandbox root, and
  the real home directory is unchanged.

### Maintainability — PASS
The interpreter choice is one table (`CLI_INTERPRETERS`), the flags are one constant, and the
documentation and bundled copies are in sync.

---

## Code Review

Advisory, except where promoted under `code_review_blocking=true` (pipeline run-level override).

**Correctness bugs (2):**
- [medium/high] `shared/resources/security-probe.mjs:2307`: `isPythonCrash` requires the last stderr
  line to be the exception line. A multi-line message, an `add_note` and an `ExceptionGroup` end
  otherwise and score `rejected`. **Promoted** to `TASK-215-QA1-1`, raised to high on QA's measurement.
- [low/high] `shared/resources/tests/security-probe.test.mjs:2817`: the flags test loops over
  `r.cases` with no non-vacuity floor. **Promoted** as `TASK-215-CR-2` (low).

**Cleanups (0).**

Anchors: both `ok` (`finding-anchors.js --rev HEAD`).

Provenance: `isPythonCrash` does not exist on `origin/develop`, so both findings are new to this change.

Platform variance: the Python tests pass with `TMPDIR` unset (`os.tmpdir()` = `/tmp`) and with `TMPDIR`
set to a non-`/tmp` scratch directory (11/11 each).

Mutation spot checks (this cycle; the development-time set of 9 is in the task's Implementation
Summary):
- `mutation-proven: crash branch disabled → "an uncaught exception and a SyntaxError are errored" → covered`
- `mutation-proven: ".py" dropped from CLI_INTERPRETERS → six python tests → covered`
- `mutation-proven: -E dropped from PYTHON_FLAGS → "the child runs as python3 -E -s -B, never -I" → covered`

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` (all forms) | PASS |
| `probe-boundary-signals.test.mjs` (routing sites name `cli:`) | PASS |
| `finalise-dod-prompt-contract.test.mjs` | PASS |
| `qa-evidence-integrity.test.js` (`toRecordEntry` fields) | PASS |
| `review-security.test.js` | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, the 9 `.py`
fixtures, `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, the
three `SKILL.md` routing lines, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/probe-boundary-signals.test.mjs \
  evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/qa-evidence-integrity.test.js \
  skills/review-security/tests/review-security.test.js           # 313 pass, 0 fail
TMPDIR=<scratch dir> command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs   # 11/11
npm run validate -- skills/{finalise,qa-story,qa-task,review-security}/   # all ✓
npm run bundle:check                                             # 0 problems
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.1.security.cases.json \
  --entry 'shared/resources/security-probe.mjs#isPythonCrash' --record docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.1.security.run.json --json   # 12 executed
```

### Coverage Report
Not measured. This repository's test runner reports no coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-215-QA1-1: anchor crash detection on the Traceback header plus a frame. Add the three shapes
   as tests, and revisit the unit case that asserts a traceback followed by a refusal line is `false`.

### Short-term Actions (Non-Blocking)
1. TASK-215-CR-2: give the flags test a non-vacuity floor.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: SC4 is the task's central safety claim, and it is measurably false for three crash
shapes.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-215-QA1-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.215.qa.1.probe-engine-python-cli-entry-form.md`
**Gate File**: co-located at `task.215.gate.1.probe-engine-python-cli-entry-form.yml`
**Next Steps**: `/qa-fix`, then QA cycle 2 (a refute pass).
