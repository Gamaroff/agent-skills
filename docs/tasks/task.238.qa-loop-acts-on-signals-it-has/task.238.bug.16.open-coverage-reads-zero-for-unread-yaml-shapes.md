# Bug Report: Task 238 - Open-coverage check reads 0 for YAML shapes it did not read

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-16
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 7 diff review, CR7-2; reproduced by the probe engine)
**Date Found**: 2026-10-28

## Description

The §5c open-coverage check prints `unreadable` when it cannot account for an entry
(`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1552`). Its non-vacuity floor counts only
entries opened by `- ` at the first item's indent. A `category: coverage` line outside any opened
entry is ignored, so two valid YAML shapes read `0` ("found none") rather than `unreadable`:

- a bare `-` item with its keys on the following lines;
- a flow sequence on the line after `findings:`.

`CHANGELOG.md` says the check "reads every YAML spelling of a finding and prints `unreadable` for a
block it cannot account for". For these shapes, that claim is false.

## Steps to Reproduce

1. Probe cases `oc-bare-dash-item` and `oc-flow-sequence-next-line` in
   `task.238.qa.7.security.cases.3.json`.
2. Run the fence control `open-coverage-shapes` (record `task.238.qa.7.security.run.json`).

## Expected Behavior

`OPEN_COVERAGE=1`, or `unreadable`. Never `0` for a block that holds a coverage finding.

## Actual Behavior

Both cases are `reproduced`: the fence prints `OPEN_COVERAGE=0`.

## Impact

As with bug.15, a `CONCERNS` review with an open coverage finding exits to Step 7. These shapes are
rarer than bug.15's, since review-pr writes block style, but `0` is the one answer nobody questions.

## Recommendation

Count every `category:` key seen while inside `findings:`. Print `unreadable` when that count differs
from the number of entries categorised, or when a non-blank, non-comment line arrives under
`findings:` while no entry is open. Add both shapes to the open-coverage fixtures.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: the awk skipped any line it did not recognise. A bare `-` opened no entry, and a
flow sequence on the next line opened none either. The non-vacuity floor (`e != c`) therefore
compared 0 with 0 and passed.

**Repeat subject** (qa-fix Step 2.6): as bug.15, one change. Move: **consolidate**. The check now
accepts only the shapes it can read and refuses every other line.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, §5c open-coverage
check): under `findings:`, a line must be one of:

- an entry opened by `- key:` or `- {…}` at the first item's indent;
- a key of the open entry;
- a deeper line of text.

Any other non-blank, non-comment line prints `unreadable`. So does a flow entry the reader cannot
tokenise.

**Testing** (`evals/shared/tests/pr-review-loop-parity.test.mjs`): four new cases, each reading
`unreadable`:

- a bare dash;
- a flow sequence on the next line;
- a key at an indent no entry owns;
- a flow entry with an escaped quote.

Each is red against `ad6fef33`. The existing open-coverage cases still pass, and all 183 tracked PR
review reports read the same value as before, so no shape the corpus uses is refused.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found by QA cycle 7 (`task.238.qa.7.qa-loop-acts-on-signals-it-has.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA cycle 7 fix) |
| 2026-10-28 | Ready for QA | qa-fix | Allow-list of line shapes; any other line reads `unreadable` |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.8.qa-loop-acts-on-signals-it-has.md |
