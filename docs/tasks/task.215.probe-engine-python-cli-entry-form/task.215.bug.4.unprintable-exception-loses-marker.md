---
type: bug
status: new
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
**Status**: New
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

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 3 |
