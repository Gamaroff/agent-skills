---
type: bug
status: ready-for-qa
severity: medium
priority: P2
updated: 2026-10-19
---

# Bug Report: Task 192 - A status row after the verdict row halts a correct document

**Task**: [task.192](./task.192.read-back-checks-this-cycles-verdict.md)
**Bug ID**: TASK-192-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2 regression testing; also raised by code review CR-2)
**Date Found**: 2026-10-19

## Description

`verdictProblems` takes the newest Change Log row authored `qa-task` or `qa-story` as the verdict
row (`shared/resources/qa-read-back.js:147–150`). On a FAIL cycle the document moves to
`in-progress`, and QA runs have written a `Status → in-progress | qa-task` row after the verdict
row. The newest qa-* row is then the status row, so the read-back halts a correct document. Its
remedy, which is to append the `QA gate <TOKEN>` row, then duplicates a row in an append-only log.

## Steps to Reproduce

Gate 1 reads `gate: FAIL`. The section reads `**Gate Decision**: FAIL`. The rows are `QA gate FAIL
(40/100) — 1 finding | qa-task`, then `Status → in-progress | qa-task`. `qa-read-back.js` exits 1
on this branch and 0 on `origin/develop`. Corpus: 8 such `Status → … | qa-task` rows, the newest in
task.160 (2026-09-27, line 404).

## Expected Behavior

Exit 0. A row that only records a status is not the verdict row.

## Actual Behavior

Exit 1: "the newest QA Change Log row reads "Status → in-progress" but this cycle's gate … says FAIL".

## Impact

The QA loop halts on the FAIL path, the one path where a fix cycle must follow, and only for
documents carrying a row the corpus shows QA runs do write. This is the task's own Medium Risk 1.

## Recommendation

Choose the newest qa-* row whose description starts with `QA gate`, and keep "no such row" as its
own problem. Add a FAIL-path control case with a status row after the verdict row.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: the verdict row was chosen by author alone, and QA runs also author `Status →` rows.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: `verdictProblems` takes the newest qa-task/qa-story row whose description starts with `QA gate`. With
no such row, it reports "no qa-task/qa-story Change Log row naming a QA gate verdict".

**Files Modified**:

- `shared/resources/qa-read-back.js` — `verdictProblems`
- `shared/resources/tests/qa-read-back.test.mjs`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — read-back item 5; `CHANGELOG.md`

**Testing**: control `{task,story}: a status row and a finalise row after the QA gate row still read clean`; VERDICT_HALTS `only a status row written by QA`. Mutation that drops the `QA gate` filter → all three red → covered.

**Verification Steps for QA**: The QA cycle 2 reproduction (FAIL verdict row, then `Status → in-progress | qa-task`) now exits 0.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-19 | New | qa-task | Raised by task.192.qa.2.read-back-checks-this-cycles-verdict.md |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fixed in verdictProblems |
