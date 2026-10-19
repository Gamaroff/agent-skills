---
type: bug
status: closed
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
**Status**: ✅ Closed
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: A forked daemon kept fd 3 open (non-inheritable closes on `exec`, not `fork`), so `spawnSync` waited on the pipe until the timeout. The bootstrap comment claimed no started process could hold the pipe.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**:

- `os.register_at_fork(after_in_child=…)` closes fd 3 in every forked child, so the pipe closes when the script exits.
- The bootstrap comment now says the fd is closed on fork and not inherited across exec.

**Files Modified**:

- `shared/resources/security-probe.mjs` (+ 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs`
- New fixture: `cli-fork-daemon.py` — a refuser that forks a detached daemon outliving the answer by 4 s

**Testing**: New test at `timeoutMs: 2000`: every case answers (0 / 3), none times out, verdict `engages`. Mutation red: `register_at_fork` removed (every case killed at the timeout). `npm run ci:fast` green (QA fix cycle 3).

**Verification Steps for QA**: probe `cli:shared/resources/tests/fixtures/security-probe/cli-fork-daemon.py` with a 2 s timeout; no case is `errored`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 3 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented (QA fix cycle 3) |
| 2026-10-19 | Closed | qa-task | Verified by task.215.qa.4.probe-engine-python-cli-entry-form.md |
