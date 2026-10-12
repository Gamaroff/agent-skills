# Bug Report: Task 180 - a substituted $(…) that writes to an absolute path outside the sandbox is unseen

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 5 safety re-probe, code review CR-2 / TASK-180-016)
**Date Found**: 2026-10-12

## Description

Under `fence:` the slot is source substitution, so a `$(…)` in a hostile input runs. The engine watches the sandbox root, the work dir and the doc's own directory. A write to an absolute path anywhere else is not seen, and `expected.absent` cannot name it (it takes separator-free names only). A hostile case whose injection ran before the guard refused therefore scores `rejected`, and the verdict reads `engages` with no escape. `probe-boundary-rule.md` §5, added on this branch, says "a write anywhere else is an escape".

## Steps to Reproduce

Block: `X='<slot>'` then `case "$X" in ok) ;; *) echo REFUSED; exit 1 ;; esac`. Hostile input `'$(touch <abs>/pwned)'`, expected `{exit: 1, stdout: "REFUSED\n"}`.

## Expected Behavior

The write is recorded, or the documentation states the limit instead of claiming every outside write is an escape.

## Actual Behavior

`<abs>/pwned` is created. The verdict is `engages` and `escapes` is empty (reproduced on f21c0552).

## Recommendation

State the absolute-path limit in the engine header and `probe-boundary-rule.md` §5. Or let a `fence:` case name an outside path to check after the run (an absolute form of `expected.absent`).

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 5

**Root cause**: the engine watches the sandbox root, the work dir and the doc directory; nothing else is in reach without a filesystem-wide watch.

**Fix**: the limit is stated instead of the overclaim — engine header, `probe-boundary-rule.md` §5, the task doc's clarification and `CHANGELOG.md` now say a write to an absolute path outside the sandbox is not observed. A test pins the limit, so closing it later forces the statements to change with it.

**Files Modified**: `shared/resources/security-probe.mjs` (header), `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`, the task doc.

**Testing**: New test: `'$(touch <abs>/pwned)'` creates the file and `escapes` stays empty — the stated limit, asserted.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 5 — reproduced on f21c0552 |
| 2026-10-12 | Ready for QA | qa-fix      | Limit stated and pinned by a test |
| 2026-10-12 | Closed       | QA Engineer | QA cycle 6 — verified on 243bc237; regression test and QA mutations red |
