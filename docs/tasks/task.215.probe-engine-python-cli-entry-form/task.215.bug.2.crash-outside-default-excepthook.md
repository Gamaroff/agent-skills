---
type: bug
status: closed
severity: 'Major'
priority: 'High'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'A Python crash whose traceback never reaches stderr through the default excepthook exits 1 and is scored rejected, so a boundary that crashes on hostile input reads as one that refuses it.'
tags: [task.215, security-probe, python, crash-detection]
---

# Bug Report: Task 215 — a crash outside the default excepthook is scored a refusal

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass: diff reviewer CR-1, reproduced by QA)
**Date Found**: 2026-10-19

## Description

`isPythonCrash` reads the traceback that CPython's default `sys.excepthook` writes to stderr. A script
that changes where or how an uncaught exception is reported still exits 1, but leaves no frame on
stderr, so the `cli:` arm scores the case `rejected`.

| Shape (Python 3.14, `python3 -E -s -B`) | Exit | `isPythonCrash` |
| --- | --- | --- |
| `sys.excepthook` replaced (what `rich.traceback.install()` and Typer's pretty exceptions do) | 1 | `false` |
| `sys.stderr = sys.stdout`, then an uncaught exception | 1 | `false` |
| `sys.stderr = None`, then an uncaught exception | 1 | `false` |
| `sys.tracebacklimit = 0` (documented in cycle 1 as a limit) | 1 | `false` |

The first three were reproduced by QA with plain scripts. `rich` and `typer` are not installed on
the QA host, so the claim about those two libraries rests on their documented behaviour; the custom
excepthook reproduces the shape.

## Steps to Reproduce

```bash
printf 'import sys\nsys.stderr = None\nraise ValueError("boom")\n' > /tmp/none.py
python3 -E -s -B /tmp/none.py; echo "exit $?"     # exit 1, nothing on stderr
```

As a `cli:` entry, a script that does this on hostile inputs and exits 0 on legitimate ones gets
verdict `engages`.

## Expected Behavior

Success Criterion 4: a Python crash is `errored`, **never** `rejected`.

## Actual Behavior

These crashes are `rejected`.

## Impact

The false pass the task exists to rule out. A Typer-based CLI is a common shape for a Python
boundary, and it installs a replacement excepthook by default.

## Recommendation

Detect the exception out of band. Run the entry through a `python3 -E -s -B -c` bootstrap that sets
`sys.argv` and `sys.path[0]`, runs `runpy.run_path(entry, run_name="__main__")`, and catches every
`BaseException` other than `SystemExit` before any excepthook runs, then reports it on a channel the
script cannot write (a reserved exit status or a dedicated fd). This also closes
`sys.tracebacklimit = 0`. Check that a sibling import, `__file__` and `-B` still behave as now.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: the crash was read off stderr, which is the script's to change. A replaced
`sys.excepthook`, a redirected or `None` `sys.stderr`, and `sys.tracebacklimit = 0` each leave no
frame there, and the exit status (1) is the one a refusal uses.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**:

- A `.py` entry now runs as `python3 -E -s -B -c PYTHON_BOOTSTRAP <entry> ...argv`. The bootstrap
  runs the script as `python3 <entry>` would (`sys.argv[0]` the entry, `sys.path[0]` its
  directory, `run_name="__main__"`), catches any exception but `SystemExit` before an excepthook
  runs, writes its first line to fd 3, calls the script's own excepthook (traceback trimmed to the
  entry's frames) and exits 1. fd 3 is made non-inheritable.
- `runCliCase` gives a Python child a fourth pipe and reads a line on fd 3 as a crash
  (`pythonCrashMarker`), and names the exception from it. The stderr traceback reader stays as a
  second signal on exit 1.
- `probe-boundary-rule.md` and `CHANGELOG.md` restate the rule; the limitation note is gone
  (TASK-215-BUG-3).

**Files Modified**:

- `shared/resources/security-probe.mjs` (+ 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs`: an input-dependent excepthook crash, the
  `sys.stderr = None` and `sys.tracebacklimit = 0` crashes, and a `__main__`/argv/sys.path check
- New fixtures: `cli-crasher-excepthook.py`, `cli-crasher-stderr-none.py`,
  `cli-crasher-tracebacklimit.py`, `cli-main-guard.py`
- `shared/resources/probe-boundary-rule.md` (+ 2 bundled copies), `CHANGELOG.md`

**Testing**: 14 python tests green. 7 mutations each red: the pre-fix engine; no marker check; no
fd 3; `run_name` not `__main__`; no `sys.path[0]`; argv not shifted; `SystemExit` treated as a
crash. `npm run ci:fast`: 5920 tests, 0 failures.

**Verification Steps for QA**: probe `cli:shared/resources/tests/fixtures/security-probe/cli-crasher-excepthook.py`
with `--argv '["--mode","strict","--host","{input}"]'`; no hostile case may be `rejected`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 2 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented (QA fix cycle 2) |
| 2026-10-19 | Closed | qa-task | Verified by task.215.qa.3.probe-engine-python-cli-entry-form.md |
