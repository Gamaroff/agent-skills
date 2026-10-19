---
type: bug
status: closed
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
**Status**: ✅ Closed
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: The bootstrap wrote a token only on a crash, to whatever fd 3 was at the time, and the engine read a missing token as an answer. A script that closed fd 3 lost the token; one that then opened a file got the token written into it. Behind a quiet excepthook the crash exited 1 and scored `rejected`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: Replaced the negative signal (third strike): the bootstrap writes `answer <nonce>` on return or `SystemExit` and `crash <nonce>` on any other exception, and writes only while `os.fstat(3)` matches the st_dev/st_ino recorded at boot. The engine reads a case with no record as `errored` (`pythonExitRecord`, read once per case).

**Files Modified**:

- `shared/resources/security-probe.mjs` (and its bundled copies)
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md` (and its bundled copies)

**Testing**: New fixtures `cli-closes-record-fd.py` (closerange, own file at fd 3, quiet excepthook; exit 7 if anything is written into its file) and `cli-forged-record.py` (nonce-less lines, `os._exit`); new test `a case with no exit record is errored …`. Red on the cycle-3 engine (`engages`, exit 7); 8 mutations red.

**Verification Steps for QA**: Run the probe on `cli-closes-record-fd.py`: every case `errored` with "without the bootstrap's exit record", verdict `unverifiable` / `entry-not-probeable`, no case exits 7.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 4 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented (QA fix cycle 4) |
| 2026-10-19 | Closed | qa-task | Verified by task.215.qa.5.probe-engine-python-cli-entry-form.md |
