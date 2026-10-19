---
type: bug
status: new
severity: 'Minor'
priority: 'Medium'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'A forked child that raises unwinds into the bootstrap and writes the crash marker, overriding the parent's answer.'
tags: [task.215, security-probe, python, crash-detection]
---

# Bug Report: Task 215 — a forked child's exception overrides the parent's answer

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (cycle 3 safety re-probe: diff reviewer CR-2, reproduced by QA)
**Date Found**: 2026-10-19

## Description

fd 3 survives `os.fork()`, and a forked child runs the same bootstrap frames. When the child raises,
it unwinds into the bootstrap's `except` clause and writes the marker. The engine then reads the
case as a crash, whatever the parent's exit status was.

## Steps to Reproduce

A script that forks, whose child raises, and whose parent prints `accepted` and exits 0. Run
directly, it exits 0; under the engine the case is `errored`.

## Impact

A hostile input the boundary accepts is hidden as `errored` instead of being reported as
reproduced.

## Recommendation

Record `os.getpid()` first and write the marker only when it is unchanged, or close fd 3 in forked
children with `os.register_at_fork(after_in_child=...)`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 3 |
