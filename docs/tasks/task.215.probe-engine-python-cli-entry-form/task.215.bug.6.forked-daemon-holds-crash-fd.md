---
type: bug
status: new
severity: 'Minor'
priority: 'Medium'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'A forked daemon keeps fd 3 open, so spawnSync waits for the full timeout and a refusal becomes errored.'
tags: [task.215, security-probe, python, crash-detection]
---

# Bug Report: Task 215 — a forked daemon holds the crash fd open

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (cycle 3 safety re-probe: diff reviewer CR-3, reproduced by QA)
**Date Found**: 2026-10-19

## Description

`os.set_inheritable(3, False)` closes fd 3 on `exec`, not on `fork`. A script that forks a daemon
(even one that closes fds 0–2) leaves fd 3 open in the daemon. `spawnSync` then waits on the pipe
until the timeout. The `PYTHON_BOOTSTRAP` comment claims that no process the script starts can hold
the pipe open.

## Steps to Reproduce

A script that forks a child which closes fds 0–2 and sleeps 5 s, while the parent exits 3. Directly
it returns in about 100 ms. Under the engine with a 2 s timeout, every case is `errored` (`never
ran: spawnSync python3 ETIMEDOUT`) after the full timeout.

## Impact

A refusal reads as `errored`, the safe direction but the wrong verdict, and every case costs the
full timeout.

## Recommendation

Close fd 3 in forked children with `os.register_at_fork(after_in_child=...)`, and correct the
comment.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 3 |
