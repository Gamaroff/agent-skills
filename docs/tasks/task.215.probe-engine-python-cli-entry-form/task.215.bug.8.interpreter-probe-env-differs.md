---
type: bug
status: new
severity: 'Minor'
priority: 'Medium'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'probePython checks python3 under the engine environment, while every case runs under caseEnv, so an interpreter that starts only in the first scores every case rejected.'
tags: [task.215, security-probe, python, platform-variance]
---

# Bug Report: Task 215 — the interpreter probe runs under a different environment from the cases

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (cycle 4 safety re-probe: diff reviewer CR-2)
**Date Found**: 2026-10-19

## Description

`probePython` runs `python3 --version` under the engine's own `process.env` — the real `HOME`, any
`PYTHON*` variables. Every case runs `python3` under `caseEnv`, with a sandbox `HOME` and no
`PYTHON*` variables. A `python3` that starts only under the real `HOME` (an asdf or mise shim) or only
with `PYTHONHOME` passes the probe and then never reaches `PYTHON_BOOTSTRAP` in a case: no marker,
no frame, and a non-zero exit, so every case is scored `rejected` (`rejects-every-input`) instead of
the entry being declined `entry-not-probeable`. One verdict, `rejected`, is reached from two states:
"the control refused" and "the interpreter never started". Cycle 2 raised the same root as advisory
CR-3 (low); this cycle reproduced it.

## Steps to Reproduce

Reviewer CR-2: put on `PATH` a `python3` shim that exits 126 unless `HOME` is the real home, then
run `cli:shared/resources/tests/fixtures/security-probe/cli-crasher.py` — every case `rejected`.

## Expected Behavior

An interpreter that cannot start under the case environment declines the entry once,
`entry-not-probeable`, naming `python3`.

## Actual Behavior

Every case `rejected`.

## Recommendation

Probe the interpreter the way a case runs it: `caseEnv`-shaped environment, `PYTHON_FLAGS` and a
trivial `-c` body. A start token written by the bootstrap (see BUG-7's recommendation) would also
turn this into `errored`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 4 |
