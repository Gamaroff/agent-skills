---
type: bug
status: ready-for-qa
severity: medium
priority: P2
created: 2026-10-13
---

# Bug Report: Task 184 - a section under an ambiguous log refuses its own rendered rows

**Task**: [task.184.qa-results-carried-block-and-log-residuals.md](./task.184.qa-results-carried-block-and-log-residuals.md)
**Bug ID**: TASK-184-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 2, refute pass CR-2)
**Date Found**: 2026-10-13

## Description

`ambiguousAbove` (`shared/resources/qa-results.js`, `findQaResults`) puts a section under the
dated-row guard, but the guard reads only the section that is already in the document. A write
whose render carries dated rows — a `| Cycle | Date | Gate |` table — is replaced in place, and the
next write then refuses those rows as possible log rows.

## Steps to Reproduce

A marker-less `## Change Log` holding a Date-first table and then a `| Version | Date | Change |`
table, with `## QA Testing Results` directly below. Write cycles 2–4 with a render that includes
`| Cycle | Date | Gate |` and one dated row.

## Expected Behavior

Either every write succeeds (base) or the first write that would leave a refused section is
refused up front.

## Actual Behavior

Write 2 `replaced`; write 3 `unbounded`, `structural-line:| 2 | 2026-10-02 | PASS |`.

## Impact

Liveness: QA Step 12 halts on the section the previous cycle wrote. Nothing is lost. Introduced by
this task (base replaces every write).

## Recommendation

Check the written section with the same guards the input section gets (`underLog` included) before
writing, and refuse the write that would fail the next one.

## Developer Fix Cycle

### Iteration 1

#### Investigation (Open → In Progress)

**Date**: 2026-10-13

**Root Cause**: the dated-row guard ran only on the section already in the document; nothing checked the section a write was about to leave behind. Under `ambiguousAbove` a render with its own dated rows therefore replaced cleanly and was refused by the following write.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: `checked()` runs `sectionGuard()` — the same guard as the input section, `underLog` included — on the written section and refuses with `unplaceable` and the guard's detail.

**Files Modified**: `shared/resources/qa-results.js`; `shared/resources/tests/qa-results.test.mjs` (R9).

**Testing**: R9 — the dated render returns `unplaceable`, `structural-line:| 2 | 2026-10-02 | PASS |`, document unchanged; a render without dated rows still replaces and stays writable. Mutation: drop the written-section guard → R9 red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-13 | Open | qa-task | Found in task.184.qa.2.qa-results-carried-block-and-log-residuals.md |
| 2026-10-13 | Ready for QA | qa-fix | Fix implemented — QA cycle 2 fix (R9) |
