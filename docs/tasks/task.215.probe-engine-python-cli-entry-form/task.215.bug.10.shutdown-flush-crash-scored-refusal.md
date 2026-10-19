---
type: bug
status: ready-for-qa
severity: 'Minor'
priority: 'Medium'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'A Python CLI whose stdout flush fails at interpreter shutdown exits 120 after the bootstrap wrote its answer record, and the engine scores the case rejected — a false pass the stated limit says cannot happen.'
tags: [task.215, security-probe, python]
---

# Bug Report: Task 215 — a crash at shutdown flush is scored as a refusal

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 6: diff reviewer CR-2, confirmed by engine run)
**Date Found**: 2026-10-19

## Description

The bootstrap writes `answer <nonce>` when the body returns. If flushing `sys.stdout` then fails at
interpreter shutdown, Python prints `Exception ignored while flushing sys.stdout` with an `OSError`
and exits **120**. `runCliCase` scores a non-zero exit with an answer record as `rejected`. A CLI
that crashes this way on hostile input therefore reads as a control that refuses it: verdict
`engages`, a false pass.

`probe-boundary-rule.md` (the false-alarm limit), `security-probe.mjs:788` and `CHANGELOG.md:23`
each state that a failure outside the main frame is "never a pass". Exit 120 contradicts that.

## Steps to Reproduce

1. A CLI that prints the host, then calls `os.close(1)` when the host contains `@`.
2. Probe it with `--sink url-authority` and a hostile `a@b` case.
3. Every hostile case is `rejected`, exit 120, and the verdict is `engages`.

The QA cycle 6 run record holds the run: [task.215.qa.6.security.run.json](./task.215.qa.6.security.run.json)
(fixture `cli-shutdown-flush-crash.py`, QA scratch).

## Expected Behavior

`errored` (the engine could not tell). Two acceptable fixes: a `.py` exit 120 is `errored`,
because 120 is the status CPython reserves for a failed flush at finalisation. Or the limit is
narrowed to say exit 120 is the exception.

## Actual Behavior

`rejected`, exit 120. Verdict `engages`.

## Impact

False-pass direction on a security probe. The trigger is contrived: the script must break its own
stdout. So this is MEDIUM, not HIGH. The measured verdict and the contradicted written claim keep it
above LOW.

## Recommendation

In `runCliCase`, for a `.py` entry, treat exit 120 as `errored` ("the interpreter failed at
shutdown"). Add a fixture and a test. Narrow the limit's "never a pass" to the shapes Python
swallows with the exit status unchanged.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: `runCliCase` treated every non-crash exit after an answer record as the script's own status. CPython's exit 120 is its shutdown-flush failure, not a status the script chose.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: For a `.py` entry, exit 120 (`PYTHON_FINALIZE_STATUS`) is `errored` ("the CLI answered, then python3 failed at shutdown"), checked before `expected` and the plain exit status. A script that calls `sys.exit(120)` itself is `errored` too, which is the safe direction and is stated. The limit text in `probe-boundary-rule.md`, the bootstrap comment and CHANGELOG now name it.

**Files Modified**:

- `shared/resources/security-probe.mjs` (and its bundled copies)
- `shared/resources/tests/security-probe.test.mjs`, fixture `cli-shutdown-flush-crash.py`
- `shared/resources/probe-boundary-rule.md` (and its bundled copies), `CHANGELOG.md`

**Testing**: New test `a failed flush at shutdown (exit 120) is errored, never a refusal`. Mutation: drop the exit-120 branch → that test red.

**Verification Steps for QA**: Probe `cli-shutdown-flush-crash.py`: every hostile case `errored`, detail `failed at shutdown (exit 120 …`, verdict not `engages`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 6 |
| 2026-10-19 | In Progress | qa-fix | QA-fix cycle 6 |
| 2026-10-19 | Ready for QA | qa-fix | QA-fix cycle 6 |
