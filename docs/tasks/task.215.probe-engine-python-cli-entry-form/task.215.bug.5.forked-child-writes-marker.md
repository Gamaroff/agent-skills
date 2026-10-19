---
type: bug
status: ready-for-qa
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
**Status**: ✅ Ready for QA
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: fd 3 was made non-inheritable, which closes it on `exec` but not on `fork`. A forked child that raised unwound into the bootstrap's `except` branch and wrote the marker on the parent's pipe.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**:

- The bootstrap records its pid first and writes the marker only when `os.getpid()` still matches.
- `os.register_at_fork(after_in_child=…)` closes fd 3 in every forked child (shared with TASK-215-BUG-6). The pid check stays because a child that then opens a file gets fd 3 back, and must not have the marker written into it.

**Files Modified**:

- `shared/resources/security-probe.mjs` (+ 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs`
- New fixture: `cli-fork-child-crash.py` — a refuser whose forked child opens a file (fd 3) and raises; the parent exits 7 if anything was written into it

**Testing**: New test: every case answers with the parent's exit (0 / 3), verdict `engages`. Mutation red: pid check removed (exit 7). `npm run ci:fast` green (QA fix cycle 3).

**Verification Steps for QA**: probe `cli:shared/resources/tests/fixtures/security-probe/cli-fork-child-crash.py`; every case is scored on the parent's exit, none `errored`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 3 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented (QA fix cycle 3) |
