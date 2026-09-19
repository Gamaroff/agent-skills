# Bug Report: Task 123 - The snapshot-ownership check refuses an absolute doc-dir against the lock's relative path

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-14
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 4, CR-4 — verified)
**Date Found**: 2026-09-19

## Description
The ownership check compares strings after stripping only `./` and trailing slashes. The real lock holds a relative `task_or_story_directory` (`docs/tasks/task.123…`) while the orchestrator's `{task-directory}` is often the resolver's absolute path — reproduced: an absolute `<doc-dir>` against a relative snapshot value for the same directory is refused as "for another document".

## Steps to Reproduce
See the QA report (`task.123.qa.4.qa-loop-exits-and-re-entry.md`, Code Review section, CR-4).

## Expected Behavior
Both sides are canonicalised (`cd … && pwd -P`) before comparison, so relative and absolute spellings of one directory match.

## Actual Behavior
String comparison after a cosmetic normalisation.

## Impact
The grant is refused on the real pipeline's own inputs.

## Recommendation
Canonicalise both paths; add a suite row with a relative snapshot value and an absolute `<doc-dir>` (and the reverse).

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 4 (CR-4) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 4 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The ownership check compared strings after cosmetic normalisation only; the pipeline's lock path is relative while the orchestrator's argument is often absolute.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- `canon()` strips `./` and trailing slashes, then resolves with `cd && pwd -P`, falling back to the stripped string when the directory does not exist; both sides go through it. A snapshot with no `task_or_story_directory` (pre-task.123 shape) is accepted and the header says so (C4-CR-7). Suite rows: relative-vs-absolute both ways, and a prefix-sharing other directory still refused.

**Files Modified**:
- `shared/resources/grant-qa-cycles.sh`, `shared/resources/grant-qa-cycles.test.sh`

**Testing**:
- suite 41/41; mutation: string compare without `cd` → 2 red.

**Verification Steps for QA**:
1. From the repo root with a snapshot holding `docs/tasks/x`, run the script with the absolute path of that directory → restored.
