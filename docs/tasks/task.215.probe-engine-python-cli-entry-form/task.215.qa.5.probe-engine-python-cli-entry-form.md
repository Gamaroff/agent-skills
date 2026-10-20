# QA Report: Task 215 - security-probe: run a Python CLI under the cli: entry form

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Gate File**: [task.215.gate.5.probe-engine-python-cli-entry-form.yml](./task.215.gate.5.probe-engine-python-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5 re-review, after the second granted re-entry. Cycle 4 replaced the struck mechanism with a
positive exit record, and every cycle-4 finding is fixed: a script that closes, replaces or reopens
fd 3, leaves by `os._exit` or `exec`, or runs under an interpreter that cannot start, is `errored`
and never scored. The safety re-probe found no crash scored `rejected`. One MEDIUM remains: an
exception outside the main frame leaves `python3` exiting 0 and is scored `accepted`. That is the
false-alarm direction, but the rule document does not state it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-215-QA4-1 — a closed or reopened fd 3 hides the crash | HIGH | ✅ FIXED | Test `a case with no exit record is errored …` (red on the cycle-3 engine); probe cases `crash-closes-fd3`, `crash-reopens-fd3`, `crash-dup2-fd3` errored; mutation "no fd-identity check" → that test red → `covered` |
| TASK-215-QA4-2 — the interpreter probe runs under another environment | MEDIUM | ✅ FIXED | Test `a python3 that answers --version but cannot start a case …` (PATH shim; red on the cycle-3 engine); mutation "missing record read as an answer" → both new tests red → `covered` |
| CR-3 — the marker computed twice | LOW | ✅ FIXED | `runCliCase` reads `pythonExitRecord` once into `pyRecord` |

Bugs 7 and 8 closed (Step 9b).

### Review Methodology

Direct tools, plus one read-only diff reviewer (Explore), dispatched 13:17:16Z, `duration_ms` 352113.
Probe engine run and mutation spot checks made while it ran (the mutations in a scratch worktree).

Re-review scope: unscoped (SAFETY_REPROBE — clause 1 false; clause 2: gate 4's HIGH concerns the
crash/refusal classifier, a boundary; clause 3: gate 4 FAIL and SC4 reads "never"). The SAFETY
RE-PROBE directive was appended; not a refute cycle (four prior gates).

Step 4b: `probe-boundary-rule.md` changed; 0 changed blocks; its one bash block is refused as
`mutating` (write redirection) — `no-executable-blocks`, a note, not a finding.

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:851` — the answer record is written when the
  main-thread body returns, so an exception in a joined worker thread or an atexit handler exits 0
  under `python3` and the case is scored `accepted`; the shape is not a stated limit → state it in
  `probe-boundary-rule.md`, or wrap the thread and unraisable hooks with a stated reason
  (TASK-215-QA5-1, [bug 9](./task.215.bug.9.crash-outside-main-frame-scored-answer.md)).

Searched unscoped: the full `origin/develop...HEAD` diff (the reviewer read the engine, the rule
document, the prompt docs, the SKILL.md hunks, every `.py` fixture and the Python tests). Re-enumerated
the exits a Python child can take — return, `SystemExit`, uncaught exception (plain, unprintable,
nameless, bigint, recursion, `KeyboardInterrupt`), stderr closed, fd 3 closed / reopened / replaced,
a forged record with the real nonce, a fork, a thread, atexit, `os._exit`, `exec`, a signal — and ran
each through the engine.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Steps 1–3: extension map, sandbox, run record | PASS | Verified | 20 python tests |
| Steps 4–5: docs, bundle, CHANGELOG | CONCERNS | Verified | Rule doc lacks the QA5-1 shape |

**Overall Phase Completion**: 2/2 phases implemented, 1 with a concern.

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | `cli:<fixture>.py` returns `executed > 0` with expected verdicts | `cli entry (python): a refusing .py CLI engages …` | PASS |
| 2 | `.py` no longer declined for the extension | same test; `.py entry with no --argv is bad-argv` | PASS |
| 3 | `interpreter` on result and record | `the record entry carries the interpreter …` | PASS |
| 4 | A Python crash is `errored`, never `rejected`; `sys.exit(1)` stays `rejected` | crash-shape tests, `no exit record` test, the plain-refusal control; probe: no crash shape scored `rejected` | PASS |

SC4 holds as worded. TASK-215-QA5-1 is a crash scored `accepted`, which SC4 does not cover. It is the
false-alarm direction.

---

## Breaking Changes Validation

N/A. Additive; `.py` was declined before.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: a crash outside the main frame is scored as the script's answer**
- **Severity**: MEDIUM (reviewer's rating, kept; no measured basis to lower it)
- **Category**: Security / documentation
- **Bug Report**: [task.215.bug.9.crash-outside-main-frame-scored-answer.md](./task.215.bug.9.crash-outside-main-frame-scored-answer.md)
- **Observation**: probe cases `py-cli.thread-crash-answers` and `py-cli.crash-in-atexit` score
  `accepted`, exit 0. `python3 <entry>` also exits 0 for both (measured).
- **Impact**: on a hostile case the result is a reproduction, a false alarm; the reader of an `absent`
  verdict is not told this shape can cause it.
- **Recommendation**: state it as a limit in `probe-boundary-rule.md`.
- **Priority**: P2

### LOW Severity Issues (2)

- Crash-record precedence has no committed test: the mutation "answer wins over crash" reds nothing.
  Only a script that writes `answer <nonce>` itself (the nonce is readable from `sys.orig_argv`) and
  then crashes reaches it. The probe case `py-cli.crash-forged-nonce` shows the right behaviour
  (`errored`). Routed to `recommendations.future`.
- A child killed by a signal it sent itself reads `killed by SIGKILL (timeout 60000ms)`. The timeout
  clause prints for every signal. Pre-existing wording from task.144; routed to
  `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
The fork-daemon test holds the case to the answer (2 s timeout). The record costs one `fstat` per write.

### Reliability — PASS
An interpreter that cannot start a case is declined once, by the missing record.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 7 (from the run record's `totals.executed`)
- Engine run over 26 cases
  ([task.215.qa.5.security.cases.json](./task.215.qa.5.security.cases.json), record
  [task.215.qa.5.security.run.json](./task.215.qa.5.security.run.json)). Crash shapes sit on
  legitimate cases, so a misread shows as overblocked. Result: 7 executed, 7 passed, 0 overblocked,
  0 reproduced. The 19 errored cases are all as required: 11 crash shapes, fd 3 closed / reopened /
  dup2'd, a forged answer with the real nonce (the crash record wins), SIGKILL, and the fail-safe
  limits (`os._exit`, `exec`, a closed fd 3 on an answer). `os-exit-one` (hostile) moved from
  `rejected` in cycle 4 to `errored`, as the stated limit says.
- Concern: TASK-215-QA5-1.

### Maintainability — PASS
One reader, read once; the rule is stated once; the bundle is in sync (pre-commit `bundle` check).

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `shared/resources/security-probe.mjs:851` — the answer record is written when the main
  body returns, so a worker-thread or atexit crash exits 0 and is scored `accepted`, unstated →
  wrap `threading.excepthook` / `sys.unraisablehook`, or state it as a limit. Promoted to the gate as
  TASK-215-QA5-1 (`code_review_blocking`).

**Cleanups (0).**

Anchor check: `finding-anchors.js --rev HEAD` → `ok` (1/1).

Boundary: `boundary: true` — `runCliCase`'s Python classification (accept / reject / could-not-look).
Engine run above; `probes_executed: 7`.

Mutation spot checks (scratch worktree, engine snapshot restored after each, baseline 20/20 green):

- mutation-proven: fd-identity check removed (`if True:`) → `a case with no exit record is errored …` → covered
- mutation-proven: missing record read as an answer → `a case with no exit record …` and `a python3 that answers --version but cannot start a case …` → covered
- mutation-proven: answer record wins over crash record → no test red → no-red-untested (probe case `crash-forged-nonce` shows the behaviour; LOW above)
- mutation-proven: pid check dropped from `record()` → no test red → no-red-untested (unreachable while the at-fork close and the identity check stand; qa-fix recorded the same)

Two of four `covered`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Node `cli:` arm, shell, fence and shell-argv forms (`security-probe.test.mjs`) | PASS |
| Probe-boundary signals, finalise DoD prompt contract, QA evidence integrity, review-security | PASS |
| `TMPDIR` variance: python tests under a scratch `TMPDIR` and under `/tmp` | PASS (20/20 each) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/probe-boundary-rule.md`,
`shared/resources/tests/security-probe.test.mjs`, the two new fixtures, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/probe-boundary-signals.test.mjs \
  evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/qa-evidence-integrity.test.js \
  skills/review-security/tests/review-security.test.js                  # 322 pass, 0 fail
TMPDIR=<scratch dir> command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs   # 20/20
TMPDIR=/tmp command node --test --test-name-pattern=python shared/resources/tests/security-probe.test.mjs           # 20/20
npm run validate -- skills/<each of finalise, qa-story, qa-task, review-security>/    # all ✓
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.5.security.cases.json \
  --sink url-authority --entry 'cli:.claude/state/qa5/cli-crash-matrix.py' --argv '["--mode","strict","--host","{input}"]' \
  --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.5.security.run.json --json   # 7 executed, 7 passed
```

The crash-matrix fixture is QA scratch (`.claude/state/qa5/`, gitignored); its 26 cases are
committed beside this report.

### Coverage Report
Not measured (the repository has no coverage tooling for `shared/resources`).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-215-QA5-1: state the outside-the-main-frame shape as a limit in `probe-boundary-rule.md`.

### Short-term Actions (Non-Blocking)
1. Commit a crash-record precedence test (forged nonce, then crash).
2. Reword the signal-kill detail so the timeout clause prints only on a timeout.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; one MEDIUM from the code review (promoted under `code_review_blocking`); Security NFR CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-215-QA5-1 stated as a limit or fixed.

---

**QA Report**: co-located at `task.215.qa.5.probe-engine-python-cli-entry-form.md`
**Gate File**: co-located at `task.215.gate.5.probe-engine-python-cli-entry-form.yml`
**Next Steps**: the QA loop routes the CONCERNS gate.
