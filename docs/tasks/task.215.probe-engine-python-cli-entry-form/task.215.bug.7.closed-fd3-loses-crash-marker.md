---
type: bug
status: new
severity: 'Major'
priority: 'High'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'A script that closes the inherited fds above stderr loses the crash marker (or has it written into its own file), so behind a quiet excepthook a crash is scored rejected.'
tags: [task.215, security-probe, python, crash-detection]
---

# Bug Report: Task 215 — a script that closes fd 3 loses the crash marker

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-7
**Severity**: HIGH
**Priority**: P1
**Status**: New
**Found By**: QA Engineer (cycle 4 safety re-probe: diff reviewer CR-1, and the cycle-4 probe run)
**Date Found**: 2026-10-19

## Description

`PYTHON_BOOTSTRAP` writes the crash token to whatever fd 3 is when the exception reaches it. The
signal is the token's *presence*, so anything that stops it reaching the engine's pipe reads as "no
crash":

- a script that runs `os.closerange(3, N)` in its own process and then crashes: the write fails
  with `EBADF`, nothing reaches the pipe;
- the same, followed by opening a file: the file takes fd 3, and the token is written into the
  script's own file.

Behind a replaced excepthook (or `sys.stderr` closed, or `tracebacklimit = 0`) stderr holds no
frame, so the stderr reader cannot catch it either, and the exit-1 crash is scored `rejected`.

## Steps to Reproduce

1. QA cycle 4 probe run (`task.215.qa.4.security.run.json`): the case `py-cli.crash-closes-fd3`
   (`os.closerange(3, 64)`, then `raise ValueError`, behind `sys.excepthook = lambda *a: None`) on a
   legitimate input is `rejected` (exit 1) — `overblocked: 1`.
2. Diff reviewer CR-1: a CLI that closes fds 3–255, opens `run.log` and crashes on hostile input
   behind a replaced excepthook. The token lands in `run.log`, fd 3 reads empty, every hostile case
   is `rejected` and the verdict is `engages`.

## Expected Behavior

SC4: a Python crash is `errored`, never `rejected`.

## Actual Behavior

`rejected`; on hostile inputs, verdict `engages` — a false pass.

## Impact

A boundary whose CLI closes inherited descriptors (daemon-style start-up code run in the main
process) and reports errors through its own excepthook can read as a control that refuses every
hostile input when it actually crashes. The shape needs both conditions at once; `probe-boundary-rule.md`
currently records it as a stated limit, which SC4's "never" does not allow.

## Recommendation

Make the channel positive (reviewer CR-1, CR-2): the bootstrap writes a token on every exit it
controls — an answer (`SystemExit`, normal return) as well as a crash — and the engine reads a
missing token as `errored`, so a lost write fails toward "could not look". Check that fd 3 is still
the engine's pipe (`os.fstat` identity recorded at boot) before writing. Or scope SC4 to scripts
that leave fd 3 open, as the maintainer's decision.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 4 |
