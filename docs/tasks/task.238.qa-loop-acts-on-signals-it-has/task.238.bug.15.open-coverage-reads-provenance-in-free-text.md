# Bug Report: Task 238 - Open-coverage check reads provenance in free text

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-15
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 7 diff review, CR7-1; reproduced by the probe engine)
**Date Found**: 2026-10-28

## Description

The §5c open-coverage check decides whether a `CONCERNS` review holds an open coverage finding.
It treats a finding as pre-existing when a line of the entry matches
`provenance: pre-existing` (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551`). The test
matches the token anywhere on any line of the entry, so it also fires on another key's value. A real
coverage finding whose `finding:` or `suggested_action:` text quotes `provenance: pre-existing,` is
dropped. The check then prints `OPEN_COVERAGE=0`, and the `CONCERNS` verdict exits to Step 7 past an
open coverage finding: the gap SC-4 closes.

## Steps to Reproduce

1. Probe case `oc-provenance-in-free-text` in `task.238.qa.7.security.cases.3.json`: a
   `category: coverage` entry whose `finding:` reads
   `QA filed its CI red with provenance: pre-existing, which hid it`.
2. Run the fence control `open-coverage-shapes` (record `task.238.qa.7.security.run.json`).

## Expected Behavior

`OPEN_COVERAGE=1`: the entry carries no `provenance:` key.

## Actual Behavior

The fence prints `OPEN_COVERAGE=0` (the case is `reproduced`; the reviewer reproduced the same).

## Impact

A `CONCERNS` review with an open coverage finding leaves the QA loop for `/finalise`, whose AC agent
then fails the criterion. That is the task.203 / task.236 path this task exists to close. It needs a
finding whose free text quotes the token, which a review of this very feature is likely to write.

## Recommendation

Match `provenance:` (and `category:`) only in key position: the first key after the entry's `- `, an
indented key at the entry's key indent, or after `{` or `,` in flow form. Never match inside another
key's value. Add the free-text case to the open-coverage fixtures in `pr-review-loop-parity.test.mjs`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: the awk matched `provenance:` and `category:` wherever a space, `{` or `,` preceded
them on any line of an entry. That included a `finding:` value, a block scalar's continuation lines,
and a quoted flow value.

**Repeat subject** (qa-fix Step 2.6): bug.8 patched the same awk. Move: **consolidate**. The deny
rules over the line give way to an allow-list of line shapes, and anything else reads `unreadable`.
This fix and bug.16 are one change.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, §5c open-coverage
check): a key is read only where a key can stand:

- the first key after an entry's `- `;
- a key two columns deeper than the dash;
- a key inside a one-line flow entry, whose quoted values are consumed whole, so a comma or a
  `provenance:` inside one is text.

Lines deeper than the key indent are text and are never read for a key.

**Testing** (`evals/shared/tests/pr-review-loop-parity.test.mjs`): four new cases.

- `provenance: pre-existing` in a plain `finding:` reads 1.
- `provenance: pre-existing` in a quoted flow value reads 1.
- `provenance: pre-existing` in a block scalar reads 1.
- `category: coverage` in another entry's free text reads 0.

Each is red against `ad6fef33` and green after. All 183 tracked PR review reports read the same
value before and after the change.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found by QA cycle 7 (`task.238.qa.7.qa-loop-acts-on-signals-it-has.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA cycle 7 fix) |
| 2026-10-28 | Ready for QA | qa-fix | Keys read only in key position, through an allow-list of line shapes |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.8.qa-loop-acts-on-signals-it-has.md |
