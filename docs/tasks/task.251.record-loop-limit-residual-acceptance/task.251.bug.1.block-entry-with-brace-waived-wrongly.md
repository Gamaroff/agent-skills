# Bug Report: Task 251 - A block-style gate entry containing a brace is waived wrongly, and the writer reports accepted

**Task**: [Link](./task.251.record-loop-limit-residual-acceptance.md)
**Bug ID**: TASK-251-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-03

## Description

`waiveEntry` in `accept-qa-residual.js` takes the flow-style branch whenever a `{` appears anywhere on
an entry's first line. A block-style entry whose first value holds a brace, such as
`- id: "X {y}"`, gets `status: waived` spliced inside the quoted string. The entry's real
`status: open` line is left alone. The post-write read-back goes through `readTopIssues`, which reads
the same first line the same way, so it sees `waived` and the writer returns `accepted`.

## Steps to Reproduce

Call `acceptResidual` on a gate whose only entry is `- id: "X {y}"` with `status: open` and a report
whose QA Cycle entry reads `Escalating — loop limit reached`.

## Expected Behavior

The entry reads `status: waived`, or the writer refuses and writes nothing.

## Actual Behavior

The gate is `WAIVED` with an active waiver, the id reads `"X {y, status: waived }"`, and
`status: open` is still on the entry. `develop-next` Step 3 then reads an open finding under a waiver.

## Impact

The accepted gate is not mergeable, which is the obs #150 failure this task closes. The id is
corrupted. The window is narrow (a brace in the first value of a block-style entry).

## Recommendation

Take the flow branch only when the text after the dash starts with `{`. Add a control test, and make
the read-back compare entry ids and statuses against the pre-edit entries, not only the one reader.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-03 (QA cycle 1 fix)

**Root cause**: `waiveEntry` took the flow branch on any `{` found on the entry's first line.

**Fix**: the flow branch now requires the text after the dash to start with `{`
(`/^[ \t]*-[ \t]*\{/`). The gate read-back also compares each entry's id before and after the edit.

**Files**: `shared/resources/accept-qa-residual.js` (+ bundled copies), `shared/resources/tests/accept-qa-residual.test.mjs`.

**Test**: "a brace inside a block-style value is text" (go red when the fix is reverted: proven).

**Note for QA**: the shared reader `readKeysInto` stops a quoted value at `}`, so it reads this id as
`"X {y`. That is pre-existing and outside this change; the writer's output is correct (checked as raw text).

## Status History

| Date       | Status       | Changed By | Notes                         |
| ---------- | ------------ | ---------- | ----------------------------- |
| 2026-11-03 | New          | QA         | Found in QA cycle 1           |
| 2026-11-03 | Ready for QA | qa-fix     | Fixed with a mutation-proven test |
