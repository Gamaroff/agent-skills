# Bug Report: Task 180 - emitBlock renders two fence: controls on one block as one

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-14
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 8, code review CR-2 / TASK-180-021)
**Date Found**: 2026-10-12

## Description

`controlKey` and `toRecordEntry` keep two unnamed `fence:` controls on one block (different slots) apart (TASK-180-002), but `emitBlock` prints `argv` for `cli:` and nothing for `slot`. The two render with the same default name (`sink:heading`), entry and sink, and read as one control counted twice. The default name also takes `split('#').pop()`, which cuts a heading that contains `#`.

## Recommendation

Print `slot` in `emitBlock` as `argv` is printed, and take the default name from the text after the first `#`. List every reader of a record entry (controlKey, toRecordEntry, dedupeByKey, the replace report, emitBlock) and check each handles `fence:`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 8

**Fix**: `emitBlock` prints `slot` beside `argv`. `defaultControlName` takes the text after the FIRST `#` and appends the slot for a `fence:` control.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`.

**Testing**: New test: two unnamed `fence:` controls on a `## C# and F#` block record as two, render with two distinct names that keep the heading, and print both slots. Mutations (slot line dropped; last-`#` split) each red.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 8 — confirmed on ffaa7c23 |
| 2026-10-12 | Ready for QA | qa-fix      | Slot rendered; name from the first #; mutation-proven |
