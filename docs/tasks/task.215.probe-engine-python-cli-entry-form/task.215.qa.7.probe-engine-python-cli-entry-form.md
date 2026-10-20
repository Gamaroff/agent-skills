# QA Report: Task 215 - security-probe: run a Python CLI under the cli: entry form

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Gate File**: [task.215.gate.7.probe-engine-python-cli-entry-form.yml](./task.215.gate.7.probe-engine-python-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: PASS

---

## Executive Summary

Cycle 7, a 1-cycle grant to put a gate on cycle 6's fix. The fix holds. A `.py` exit 120 is now
`errored`: the shutdown-flush crash that read as a false pass at gate 6 no longer does, and neither
does a second route to the same failure (stdout redirected to `/dev/full`). The corrected limit text
is accurate. Three LOW findings remain, and none of them changes a verdict.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-215-QA6-1 — a `.py` exit 120 scored `rejected` | MEDIUM | ✅ FIXED | test `a failed flush at shutdown (exit 120) is errored, never a refusal`; probe `errored`/120 (was `rejected`/120, verdict `engages`); mutation "no exit-120 branch" → that test red → `covered` |
| TASK-215-QA6-2 — worker-thread sentence inaccurate | LOW | ✅ FIXED | `probe-boundary-rule.md` §5 says an exit 1 after the traceback reads as a crash; probe `cli-thread-refuses-exit1` `errored`/1 |
| TASK-215-QA6-3 — thread-crash test gap | LOW | ✅ FIXED | every hostile case is looked up; mutation "fixture never raises" → that test red → `covered` (see QA7-1 for its cwd dependence) |

Bug 10 closed (Step 9b).

### Review Methodology

Direct tools, plus one read-only diff reviewer (Explore), `duration_ms` 122150. Scope: files changed
since gate 6 (head `46f6c7b3`; 22 files), the default. `SAFETY_REPROBE` false: clause 1 is false
(mechanical), gate 6 has no HIGH, and gate 6 is not FAIL.

---

## New Findings This Cycle

- **[low]** `shared/resources/tests/security-probe.test.mjs:3083` — the new direct spawn depends on
  the cwd → spawn from `REPO_ROOT` (TASK-215-QA7-1).
- **[low]** `shared/resources/security-probe.mjs:2653` — the exit-120 detail cannot tell a flush
  failure from `sys.exit(120)` → append stderr (TASK-215-QA7-2).
- **[low]** `CHANGELOG.md:23` — the wording is narrower than the rule doc → match it (TASK-215-QA7-3).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Steps 1–3: extension map, sandbox, run record | PASS | Verified | 23 python tests |
| Steps 4–5: docs, bundle, CHANGELOG | PASS | Verified | QA7-3 wording (LOW) |

**Overall Phase Completion**: 2/2.

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | `cli:<fixture>.py` returns `executed > 0` | python tests; probe (8 executed) | PASS |
| 2 | `.py` no longer declined for the extension | python tests | PASS |
| 3 | `interpreter` on result and record | record test | PASS |
| 4 | A Python crash is `errored`, never `rejected`; `sys.exit(1)` stays `rejected` | crash-shape tests, exit-120 test, plain-refusal control; probe: no crash shape `rejected` | PASS |

---

## Breaking Changes Validation

N/A.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3)

TASK-215-QA7-1 to QA7-3 above. QA7-1 is measured: run from `shared/resources`, 1 test fails and the
other 22 pass.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (run record `totals.executed`)
- Cases: [task.215.qa.7.security.cases.json](./task.215.qa.7.security.cases.json). Record:
  [task.215.qa.7.security.run.json](./task.215.qa.7.security.run.json).
- Four CLIs (QA scratch, `.claude/state/qa7/`), hostile cases:

  | CLI | Hostile cases |
  | --- | --- |
  | shutdown-flush crash | `errored`/120 |
  | stdout to `/dev/full` | `errored`/120 |
  | `sys.exit(120)` refusal | `errored`/120 (stated safe direction) |
  | worker-thread refusal, exit 1 | `errored`/1 |

  Every legitimate case is `accepted`/0. Result: 0 reproduced.

### Performance — PASS / Reliability — PASS / Maintainability — PASS
No change since gate 5.

---

## Code Review

**Correctness bugs (1):** [low/high] QA7-1, test-only.
**Cleanups (2):** QA7-2, QA7-3.

Anchor check: `finding-anchors.js --rev HEAD` → `ok` (3/3).

Mutation spot checks (made in qa-fix cycle 6, recorded in the task document):
- mutation-proven: exit-120 branch dropped → `a failed flush at shutdown (exit 120) is errored …` → covered
- mutation-proven: thread fixture never raises → `a crash outside the main frame …` → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| python tests, `TMPDIR` scratch and `/tmp` | PASS (23/23 each) |
| full suite at `505645df` (qa-fix) | PASS (5929, 0 fail) |

---

## Test Artifacts

### Test Commands Executed
```bash
TMPDIR=<scratch dir> command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs   # 23/23
TMPDIR=/tmp command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs           # 23/23
(cd shared/resources && command node --test --test-name-pattern=python tests/security-probe.test.mjs)               # 22 pass, 1 fail (QA7-1)
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.7.security.cases.json \
  --sink url-authority --entry 'cli:<each CLI>' --argv '["--host","{input}"]' --repo-root "$(git rev-parse --show-toplevel)" \
  --record docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.7.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. TASK-215-QA7-1 to QA7-3.
2. The signal-kill detail prints a timeout clause for every signal (pre-existing).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no HIGH or MEDIUM; Security NFR PASS (measured); 3 LOW findings ride on the pass.
**Quality Score**: 95/100
**Deployment Recommendation**: READY
