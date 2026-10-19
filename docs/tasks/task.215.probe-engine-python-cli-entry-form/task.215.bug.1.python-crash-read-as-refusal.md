---
type: bug
status: ready-for-qa
severity: 'Major'
priority: 'High'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'isPythonCrash reads three shapes of real uncaught Python crash as a refusal, so the cli: arm scores them rejected and a control that crashes on every input reads as one that engages.'
tags: [task.215, security-probe, python, crash-detection]
---

# Bug Report: Task 215 — three shapes of real Python crash are scored as refusals

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1: engine probe of `isPythonCrash` and the diff reviewer's CR-1, independently)
**Date Found**: 2026-10-19

## Description

`isPythonCrash` (`shared/resources/security-probe.mjs`) treats stderr as a crash only when its **last
non-empty line** is an exception line. Python does not always end a crash that way. Each of the three
shapes below is an uncaught exception, exits 1 and prints a full `Traceback (most recent call last):`
block, yet `isPythonCrash` returns `false`. The `cli:` arm then scores the case `rejected`.

| Shape (Python 3.14.8, `python3 -E -s -B`) | Last stderr line | `isPythonCrash` |
| --- | --- | --- |
| `raise ValueError("cannot start: no policy\nsee docs at …")`: a multi-line message | `see docs at https://example.invalid/policy` | `false` |
| `raise ExceptionGroup("startup failed", [...])` | `+------------------------------------` | `false` |
| An uncaught `RuntimeError`, then an `atexit` handler that writes to stderr | `cleanup done, bye` | `false` |
| An uncaught `RuntimeError` with an `add_note("hint: set POLICY_PATH")` | `hint: set POLICY_PATH` | `true`, **by accident**: the note happens to be identifier-colon shaped |

## Steps to Reproduce

The run record is committed beside this report: `task.215.qa.1.security.run.json` (12 executed). Its
cases are in `task.215.qa.1.security.cases.json`. Re-run with:

```bash
command node shared/resources/security-probe.mjs \
  --cases-file docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.qa.1.security.cases.json \
  --entry 'shared/resources/security-probe.mjs#isPythonCrash' --repo-root "$(git rev-parse --show-toplevel)" --json
```

`py-crash.multiline`, `py-crash.group` and `py-crash.atexit_after` are `legitimate` cases scored
`rejected`.

## Expected Behavior

Success Criterion 4: a Python crash is `errored`, **never** `rejected`.

## Actual Behavior

Three of the seven measured crash shapes are `rejected`. A fourth is `errored` only by coincidence.

## Impact

This is the false pass the task's Risk Assessment names. A Python boundary that crashes on every
input, for example one whose startup error message spans two lines, reads as a control that refuses
every hostile input. The probe then records it as `engages`. The engine's own verdict on the probe run
was `engages` with `reproduced: 0`, because over-rejection of a legitimate case is not a reproduction.
That is why the defect shows up only in the per-case outcomes.

## Recommendation

Anchor on the traceback, not on the last line. A `Traceback (most recent call last):` header plus a
`File "…", line N` frame is a runtime crash, whatever follows it. A frame plus a `SyntaxError` /
`IndentationError` / `TabError` line is a compile crash. Erring toward `errored` is the documented
safe direction. The current unit case "a traceback followed by a refusal line is false" asserts the
opposite direction and needs rethinking alongside the fix. Add the three shapes as fixtures or unit
inputs, and keep the frameless refusal controls (`sys.exit("refused: …")`, a bare exception-shaped
line, a frame-shaped log line with no header) `rejected`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: `isPythonCrash` required the last non-empty stderr line to be exception-shaped. Python prints
the exception line before a multi-line message's continuation, an `add_note()` hint, an ExceptionGroup's box
drawing and anything an atexit handler writes, so the last line is often not the exception.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**:

- A crash is a `File "…", line N` frame under a `Traceback (most recent call last):` header (an ExceptionGroup's
  `+ Exception Group Traceback` header and `|`-prefixed frames included), or a frame and a SyntaxError-family line,
  whatever follows. The last-line clause is removed.
- `runCliCase` reads stderr this way only on exit 1, the status every uncaught exception exits with, so an
  "Exception ignored" traceback beside a refusal that exits 3 is still an answer.
- The decline detail names the exception (`pythonExceptionLine`), not the last line.
- The unit case asserting "traceback then refusal line is not a crash" now asserts the opposite: `errored`, the
  safe direction.
- Known limit, documented in `probe-boundary-rule.md`: `sys.tracebacklimit = 0` prints no frame, so that crash
  reads as a refusal.

**Files Modified**:

- `shared/resources/security-probe.mjs` (+ 4 bundled copies) — detector, exit-1 gate, decline detail
- `shared/resources/tests/security-probe.test.mjs` — the three shapes, an ExceptionGroup, an imported SyntaxError,
  a column-0 frame control, a non-1-exit traceback test, the CR-2 floor
- `shared/resources/tests/fixtures/security-probe/cli-crasher-multiline.py`, `cli-refuser-unraisable.py` — new
- `shared/resources/probe-boundary-rule.md` (+ 2 bundled copies), `CHANGELOG.md` — the rule restated

**Testing**: 12 python tests green; 9 mutations each red; `npm run ci:fast` 5918 tests, 0 failures; QA's 12 probe
cases re-run against the fix, every case as expected.

**Verification Steps for QA**: re-run the probe command under Steps to Reproduce; `py-crash.*` must be `accepted`
(crash detected) and `py-refusal.*` `rejected`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented (QA fix cycle 1) |
