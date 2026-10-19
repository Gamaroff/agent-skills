---
type: bug
status: ready-for-qa
severity: 'Major'
priority: 'High'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'An exception whose str() raises escapes PYTHON_BOOTSTRAP before the crash marker is written, so behind a replaced excepthook the crash is scored rejected.'
tags: [task.215, security-probe, python, crash-detection]
---

# Bug Report: Task 215 — an unprintable exception loses the crash marker

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-4
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe: diff reviewer CR-1, reproduced by QA)
**Date Found**: 2026-10-19

## Description

`PYTHON_BOOTSTRAP` builds the fd-3 marker line with `f'{type(e).__name__}: {e}'` outside any
`try`. When `str(e)` raises (a custom `__str__` that raises, or `KeyError(10**5000)`, which hits the
int-digits limit), a second exception escapes the `except` clause before `os.write` runs. No marker
is written. If the script also replaced `sys.excepthook`, set `sys.stderr = None` or set
`sys.tracebacklimit = 0`, stderr holds no frame either, and the case is scored `rejected`.

## Steps to Reproduce

A CLI that answers bare hosts and, on any other input, raises an exception whose `__str__` raises,
after `sys.excepthook = lambda *a: None`. Probed under `cli:` with
`--argv '["--host","{input}"]'`: the hostile case is `rejected` (exit 1) and the verdict is
`engages`.

## Expected Behavior

SC4: a Python crash is `errored`, never `rejected`.

## Actual Behavior

`rejected`, verdict `engages`: a false pass.

## Recommendation

Write the marker before formatting anything the script controls: the class name first, then the
message, best-effort, in its own `try/except BaseException`. Add a fixture with an unprintable
exception behind a replaced excepthook.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: `PYTHON_BOOTSTRAP` built the fd-3 marker from the exception's text (`f'{type(e).__name__}: {e}'`) outside any `try`, so the crash signal depended on the exception being printable. When formatting raised, nothing was written.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**:

- Struck mechanism (third strike on `security-probe.mjs`, cycles 1–3): crash detection that depends on rendering the exception as text. Move: **replace** — the signal is now a constant token (`PYTHON_CRASH_TOKEN`, `crash`) written on fd 3 as the first act of the `except` branch, before the exception is touched. Its `Class: message` follows on the next line, best-effort, for the detail only; formatting the class name and the message each sit in their own `try/except BaseException`.
- `pythonCrashMarker` reads presence, never text: anything on fd 3 is a crash; the detail is the line after the token when there is one, else the stderr reader's exception line, else `uncaught exception`.

**Files Modified**:

- `shared/resources/security-probe.mjs` (+ 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs`
- New fixtures: `cli-crasher-unprintable.py` (`__str__` raises), `cli-crasher-nameless.py` (the class's metaclass raises on `__name__`)

**Testing**: New test: both fixtures, behind an excepthook that prints nothing, are `errored` on every hostile case; the detail names `UnprintableError`, and `uncaught exception` when the class has no readable name. Mutations red: no token written (nameless fixture); `str()` failure not caught (unprintable fixture); reader treats the token line as the detail (4 tests). `npm run ci:fast` green (QA fix cycle 3).

**Verification Steps for QA**: probe `cli:shared/resources/tests/fixtures/security-probe/cli-crasher-unprintable.py` (and `cli-crasher-nameless.py`) with `--argv '["--mode","strict","--host","{input}"]'`; no hostile case may be `rejected`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 3 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented (QA fix cycle 3) |
