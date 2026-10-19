---
type: bug
status: ready-for-qa
severity: 'Minor'
priority: 'Medium'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'An exception outside the main frame (a joined worker thread, an atexit handler) leaves python3 exiting 0 after the bootstrap wrote its answer record, so the case is scored accepted; probe-boundary-rule.md does not state it.'
tags: [task.215, security-probe, python]
---

# Bug Report: Task 215 — a crash outside the main frame is scored as the script's answer

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 5 safety re-probe: diff reviewer CR-1)
**Date Found**: 2026-10-19

## Description

`PYTHON_BOOTSTRAP` writes `answer <nonce>` as soon as the main-thread body returns
(`shared/resources/security-probe.mjs:851`). An exception raised elsewhere does not reach its
`except` clause: in a worker thread the body started and joined (`threading.excepthook` prints
`Exception in thread …`), or in an atexit handler (`Exception ignored in atexit callback …`). In
both, `python3` itself exits 0, so the engine scores the case `accepted`. The second signal
(`isPythonCrash`) reads stderr only on exit 1, so the traceback on stderr is not counted.

## Steps to Reproduce

1. Run the probe on a CLI that does its work in `threading.Thread(...)`, `t.start(); t.join()`, and
   raises in the thread on hostile input, then exits normally.
2. The hostile case scores `accepted`, exit 0, and the verdict is `absent`.

QA cycle 5's crash matrix holds both shapes as legitimate cases: `py-cli.thread-crash-answers` and
`py-cli.crash-in-atexit` score `accepted` (exit 0), as the run record shows
([task.215.qa.5.security.run.json](./task.215.qa.5.security.run.json)).

## Expected Behavior

Either the shape is `errored` ("could not look"), or the rule document states it as a limit, so a
reader of an `absent` verdict knows a worker-thread crash can produce one.

## Actual Behavior

`accepted`, and nothing in `probe-boundary-rule.md` says so.

## Impact

The direction is a **false alarm**, not a false pass: a hostile case scored `accepted` is reported
as a reproduction, and a human investigates. `python3 <entry>` exits 0 here too (measured: a joined
thread raising `ZeroDivisionError`, and an atexit handler raising, each exit 0), so the score matches
the CLI's own exit status, which the `cli:` form's contract makes the verdict. SC4 ("a Python crash
is `errored`, never `rejected`") holds. What is missing is the statement.

## Recommendation

Add the shape to `probe-boundary-rule.md`'s stated limit: an exception the main frame never sees (a
worker thread, an atexit handler, a finaliser) leaves `python3` exiting 0 and is scored by that exit
status, so a hostile case reads `accepted` — a reproduction to investigate, never a pass. Wrapping
`threading.excepthook` and `sys.unraisablehook` (the reviewer's first option) would score a CLI
whose worker logs and recovers as `errored`, which `python3 <entry>` does not do; take it only with
a stated reason.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: The exit record speaks for the body's frame. Python prints and swallows an exception in a worker thread or an atexit handler, and `python3 <entry>` exits 0 (measured), so the bootstrap's `answer` is the truth about the exit status. Nothing said so.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: Took the recommendation, not the hook wrap: the shape is a stated limit in `probe-boundary-rule.md` (scored by the exit status `python3` gives; a hostile case reads `accepted`, a reproduction, never a pass), in the engine's bootstrap comment and in CHANGELOG. Wrapping `threading.excepthook` would score a CLI whose worker logs and recovers as `errored`, which `python3 <entry>` does not do. The limit is pinned by a test, so a change to it is deliberate.

**Files Modified**:

- `shared/resources/probe-boundary-rule.md` (and its bundled copies)
- `shared/resources/security-probe.mjs` (comment only, and its bundled copies)
- `shared/resources/tests/security-probe.test.mjs`, fixture `cli-thread-crash.py`
- `CHANGELOG.md`

**Testing**: New test `a crash outside the main frame is scored by python3's exit status — never a pass`. Mutation: read a traceback on any exit status (not only exit 1) → that test red.

**Verification Steps for QA**: Run the probe on `cli-thread-crash.py`: hostile cases `accepted`, exit 0, verdict not `engages`; `probe-boundary-rule.md` §5 states the limit.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 5 |
| 2026-10-19 | In Progress | qa-fix | QA-fix cycle 5 |
| 2026-10-19 | Ready for QA | qa-fix | QA-fix cycle 5 |
