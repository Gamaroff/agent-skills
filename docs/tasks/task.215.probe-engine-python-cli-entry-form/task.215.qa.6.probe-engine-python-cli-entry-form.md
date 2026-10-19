# QA Report: Task 215 - security-probe: run a Python CLI under the cli: entry form

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Gate File**: [task.215.gate.6.probe-engine-python-cli-entry-form.yml](./task.215.gate.6.probe-engine-python-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 6, the last in the granted budget. The cycle-5 fix holds: the outside-the-main-frame shape is
stated, and both new tests are mutation-proven. The new limit text is not fully accurate, though. A
crash at shutdown flush exits 120 and is scored `rejected`, which is a measured false pass against
the text's "never a pass" (MEDIUM). Separately, a worker-thread refusal that exits 1 is scored
`errored`, not by its exit status as the text says (LOW, the safe direction).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-215-QA5-1 — a crash outside the main frame is scored as the answer, unstated | MEDIUM | ✅ FIXED (as a stated limit) | `probe-boundary-rule.md` §5 states it; test `a crash outside the main frame is scored by python3's exit status — never a pass`; mutation "traceback read on any exit status" → that test red → `covered` |
| Gate 5 advisory — crash-record precedence untested | LOW | ✅ FIXED | test `a forged answer record does not outrank the crash that follows it`; mutation "answer outranks crash" → red → `covered` |

Bug 9 closed (Step 9b). The inaccuracies found in its limit text are new findings (QA6-1, QA6-2),
not a reopen: the shape bug 9 asked to state is now stated and pinned.

### Review Methodology

Direct tools, plus one read-only diff reviewer (Explore), `duration_ms` 140483.

Re-review scope: files changed since gate 5 (head `0aff23d7`; 21 files), the default. `SAFETY_REPROBE`
false: clause 1 is false (mechanical); clause 2 is false (gate 5 has no HIGH); clause 3 is false
(gate 5 is CONCERNS, not FAIL).

Commit `46f6c7b3` (wording only: names the two limits by direction) landed after the reviewer was
dispatched, at the maintainer's request. The reviewer's anchors quote the post-commit text, so it
read the working tree with the commit in place. All three anchors check `ok` at `HEAD`.

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs` (`runCliCase`) — a `.py` exit 120 (a failed
  stdout flush at shutdown, after the answer record) is scored `rejected` → score it `errored`
  (TASK-215-QA6-1, [bug 10](./task.215.bug.10.shutdown-flush-crash-scored-refusal.md)).
- **[low]** `shared/resources/probe-boundary-rule.md:418` — "probed through the exit status its main
  thread chooses" is false when the main thread exits 1 after a worker traceback (that case is
  `errored`) → qualify it (TASK-215-QA6-2).
- **[low]** `shared/resources/tests/security-probe.test.mjs:3044` — the thread-crash test skips
  hostile cases found in `declined`, and shows no evidence that the thread raised → tighten it
  (TASK-215-QA6-3).

Searched: the scoped diff (cdbb8ab4, 46f6c7b3). Exit paths after an answer record re-enumerated:
worker thread (exit 0 / exit 1), atexit raise, atexit `sys.exit`, finaliser, shutdown flush.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Steps 1–3: extension map, sandbox, run record | CONCERNS | Verified | QA6-1 (exit 120) |
| Steps 4–5: docs, bundle, CHANGELOG | CONCERNS | Verified | Limit text: QA6-1, QA6-2 |

**Overall Phase Completion**: 2/2 phases implemented, 2 with a concern.

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | `cli:<fixture>.py` returns `executed > 0` | python tests; probe run (10 executed) | PASS |
| 2 | `.py` no longer declined for the extension | python tests | PASS |
| 3 | `interpreter` on result and record | record test | PASS |
| 4 | A Python crash is `errored`, never `rejected` | crash-shape tests; probe | PASS as worded (uncaught exception or `SyntaxError`) — QA6-1 is a shutdown-flush failure, outside SC4's two named shapes but inside the doc's own claim |

---

## Breaking Changes Validation

N/A.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: a crash at shutdown flush is scored as a refusal**
- **Severity**: MEDIUM. The reviewer rated it low (medium confidence). I raised it because the false
  pass is measured (verdict `engages`). It is not HIGH because the trigger is contrived: the script
  must break its own stdout.
- **Bug Report**: [task.215.bug.10.shutdown-flush-crash-scored-refusal.md](./task.215.bug.10.shutdown-flush-crash-scored-refusal.md)
- **Recommendation**: a `.py` exit 120 is `errored`; add a fixture and a test; narrow the wording.
- **Priority**: P2

### LOW Severity Issues (2)

- TASK-215-QA6-2: the worker-thread sentence (safe direction; the text is inaccurate).
- TASK-215-QA6-3: the thread-crash test's coverage gap.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 10 (run record `totals.executed`)
- Cases: [task.215.qa.6.security.cases.json](./task.215.qa.6.security.cases.json). Record:
  [task.215.qa.6.security.run.json](./task.215.qa.6.security.run.json). Three CLIs, 4 cases each:
  - a worker-thread refusal that exits 1: hostile cases `errored`/1 (verdict `unverifiable`, the safe direction);
  - `cli-thread-crash.py`: hostile cases `accepted`/0 (verdict `absent`, as the limit states);
  - a shutdown-flush crash: hostile cases `rejected`/120 (verdict `engages`, a false pass, QA6-1).

  The two QA fixtures are scratch, in `.claude/state/qa6/` (gitignored).

### Performance — PASS / Reliability — PASS / Maintainability — PASS
No change since gate 5.

---

## Code Review

**Correctness bugs (2):**
- [low/medium → gate medium] `shared/resources/probe-boundary-rule.md:416` — "never a pass" has a
  counter-example at exit 120 → TASK-215-QA6-1 (anchored in the gate at `security-probe.mjs`, where
  the fix goes).
- [low/high] `shared/resources/probe-boundary-rule.md:418` — the worker-thread sentence is wrong for
  an exit 1 → TASK-215-QA6-2.

**Cleanups (1):**
- [low] `shared/resources/tests/security-probe.test.mjs:3044` → TASK-215-QA6-3.

Anchor check: `finding-anchors.js --rev HEAD` → `ok` (3/3).

Mutation spot checks: both were made by qa-fix in cycle 5 and are recorded in the task document.
1. Answer record outranks the crash record → the forged-answer test went red → covered.
2. A traceback is read on any exit status → the thread-crash test and 3 others went red → covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| python tests, `TMPDIR` scratch and `/tmp` | PASS (22/22 each) |
| probe-boundary signals, DoD prompt contract, bundled links | PASS (56) |
| full suite at cdbb8ab4 (qa-fix) | PASS (5928, 0 fail) |

---

## Test Artifacts

### Test Commands Executed
```bash
TMPDIR=<scratch dir> command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs   # 22/22
TMPDIR=/tmp command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs           # 22/22
command node --test shared/resources/tests/probe-boundary-signals.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/bundled-links.test.js  # 56
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.6.security.cases.json \
  --sink url-authority --entry 'cli:<each CLI>' --argv '["--host","{input}"]' --repo-root "$(git rev-parse --show-toplevel)" \
  --record docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.6.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-215-QA6-1: a `.py` exit 120 is `errored`; add a fixture and a test; narrow "never a pass".

### Short-term Actions (Non-Blocking)
1. TASK-215-QA6-2: qualify the worker-thread sentence.
2. TASK-215-QA6-3: tighten the thread-crash test.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; one MEDIUM (a measured false pass); Security NFR CONCERNS.
**Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-215-QA6-1 fixed or stated as a limit.

---

**Next Steps**: the QA loop routes the gate. Cycle 6 is the last in the granted budget.
