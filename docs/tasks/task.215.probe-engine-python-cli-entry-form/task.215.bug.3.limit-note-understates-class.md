---
type: bug
status: closed
severity: 'Minor'
priority: 'Medium'
created: 2026-10-19
related: 'task.215 — security-probe: run a Python CLI under the cli: entry form'
description: 'probe-boundary-rule.md names one undetectable Python crash and calls it unavoidable; the same false-pass class is wider and detectable.'
tags: [task.215, security-probe, python, documentation]
---

# Bug Report: Task 215 — the crash-limit note understates the class

**Task**: [task.215.probe-engine-python-cli-entry-form.md](./task.215.probe-engine-python-cli-entry-form.md)
**Bug ID**: TASK-215-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2: diff reviewer CR-2)
**Date Found**: 2026-10-19

## Description

`shared/resources/probe-boundary-rule.md` says that one Python crash cannot be detected
(`sys.tracebacklimit = 0`) because it matches a refusal byte for byte. A replaced excepthook and a
redirected or `None` `sys.stderr` are scored the same false `rejected` (TASK-215-BUG-2), and all of
them can be detected from the process, though not from stderr.

## Expected Behavior

The rule states the real boundary of the detector.

## Actual Behavior

It names one shape and calls it unavoidable.

## Recommendation

Fix TASK-215-BUG-2 and drop the note. If any shape stays undetectable, list each one and say that an
input-dependent crash of that shape yields `engages`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: TASK-215-BUG-2 closed the class (the bootstrap catches the exception whatever
the script did to stderr or its excepthook, `sys.tracebacklimit = 0` included), so the limitation
note is removed and the crash bullet in `probe-boundary-rule.md` is rewritten around the bootstrap.

**Files Modified**: `shared/resources/probe-boundary-rule.md` (+ 2 bundled copies), `CHANGELOG.md`

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-19 | New | qa-task | Found in QA cycle 2 |
| 2026-10-19 | Ready for QA | qa-fix | Fixed with TASK-215-BUG-2 (QA fix cycle 2) |
| 2026-10-19 | Closed | qa-task | Verified by task.215.qa.3.probe-engine-python-cli-entry-form.md |
