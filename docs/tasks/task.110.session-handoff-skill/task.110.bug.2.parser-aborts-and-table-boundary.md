# Bug Report: Task 110 - Parser aborts on a malformed expect: and does not end a table on a blank line

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

Two `parseHandoff` defects from the diff review (CR-3, CR-4; also CR-9):

- `new RegExp(rx[1], rx[2])` is unguarded. `<!-- cmd: …; expect: /usr/bin/node -->` matches the
  `/…/flags` shape (`flags` = `node`) and throws `Invalid flags supplied`; a malformed regex throws
  too. Either aborts the whole run with a stack trace instead of yielding one `unverifiable` line —
  the exact outcome the verdict vocabulary exists to prevent.
- A blank line does not reset the table state, so a second table that follows the header table after
  only a blank line has its header, separator and body rows emitted as `command=null` figures.
- A row whose Result cell is empty yields `figures: [""]` and is reported `stale — moved:` instead
  of `unverifiable: no figure`.

## Expected Behavior

One bad line → one `unverifiable` verdict with a reason; a blank line ends a table; an empty Result
cell is `no figure`.

## Actual Behavior

Process-level abort; spurious `no command` rows; a false `stale`.

## Impact

Reliability of the per-line contract: a single authoring slip in the handoff turns read mode from a
report into a crash.

## Recommendation

try/catch the RegExp and surface `unverifiable: bad expect regex`; reset `headerCols` /
`sawHeaderSeparator` on an empty line; drop figures whose normalised form is empty.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: `new RegExp` was constructed inside the parser with no guard; the table-end condition excluded blank lines; empty Result cells produced a figure of `""`.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: `parseExpect()` wraps the RegExp in try/catch and returns `{ badRegex, error }`, which `verify()` reports as `unverifiable: bad expect regex: …` for that line only; any non-table line, blank included, now ends the table; table figures whose normalised form is empty are dropped so the existing `no figure` branch fires (CR-9). Also CR-8: the snake_case underscore rule was removed from `stripEmphasis`.

**Files Modified**: `skills/session-handoff/scripts/handoff-verify.mjs`, `skills/session-handoff/tests/handoff-verify.test.js`.

**Testing**: three new tests (CR-3, CR-4, CR-9) + CR-8; 23/23.

**Verification Steps for QA**: a handoff line `x **y** <!-- cmd: git status; expect: /usr/bin/node -->` yields one `unverifiable` line, exit 0, no stack trace.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | CR-3, CR-4, CR-9 |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Guarded RegExp; blank line ends table; empty cell → no figure |
| 2026-09-15 | Closed | QA Engineer | Verified in QA cycle 2 (gate 2): shape refused / behaviour proved; corpus 0/73 hostile accepted |
