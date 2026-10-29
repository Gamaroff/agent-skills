# Bug Report: Task 238 - Open-coverage check reads block keys after a flow entry as that entry's

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-19
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 9 hostile-shape probe; found independently by the diff review as CR-2)
**Date Found**: 2026-10-28

## Description

The §5c open-coverage check (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1582`) leaves
`open` set after a one-line flow entry (`- {…}`). A following line two columns deeper is then read
as a key of that flow entry:

```yaml
findings:
  - {id: PC-1, category: coverage}
    provenance: pre-existing
```

This block is not valid YAML. PyYAML rejects it with `expected <block end>, but found
'<block mapping start>'`. The check reads the `provenance:` line as the flow entry's own key,
exempts the coverage finding, and prints `0`. It should print `unreadable`. The allow-list comment
says a shape the check does not know is never read as "no coverage". For this shape, that claim
is false.

## Steps to Reproduce

1. Probe case `oc9-flow-then-key-exempt` in `task.238.qa.9.security.cases.1.json`.
2. Run the fence control `open-coverage-shapes-9` (record `task.238.qa.9.security.run.json`).

## Expected Behavior

`OPEN_COVERAGE=unreadable`.

## Actual Behavior

`OPEN_COVERAGE=0` (case `reproduced`). It reads the same at gate 8's head `a2a41ca1`, so cycle 8 did
not introduce it. It is in scope because the task names this class (bug.16, bug.17).

## Impact

A malformed review whose flow entry is followed by an indented exemption exits to Step 7 instead of
the Review failed arm. Plausibility, measured: 1 of 184 tracked PR review reports uses flow entries
(task.130, four lines, none followed by an indented key). None uses this shape. It takes review-pr
writing flow style *and* malformed YAML.

## Recommendation

When an entry opens from a flow line, set a flag. Treat any later line deeper than the entry's
indent as `bad = 1` until the next entry opens. Add a `RAW_CASES` fixture for a flow entry followed
by a key line, expecting `unreadable`.

Structural alternative (gate 8 `recommendations.future`): parse the block with a real YAML parser in
a bundled script. This is the seventh shape gap found in this awk.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The line allow-list's `key: value` row ("a key of the open entry, two columns deeper
than its dash") was applied to every open entry, flow-opened ones included. A flow entry has no
such row in YAML, since the mapping closes on its own line.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: The flow-open rule sets `fl`, and `done()` clears it. While `fl` is set, any
line other than the next entry (or a blank/comment line, skipped earlier) sets `bad`. The allow-list
comment now says the flow entry is complete on its line.

Same cycle, same mechanism (CR9-3, low): the check also requires a terminator after `findings:`,
either the closing fence or a top-level `key:`. Otherwise it prints `unreadable`, so a block cut
short by a column-0 `## ` line, or a report cut off mid-block, no longer reads the count of what
survived.

**Files Modified**:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the `fl` flag and rule, the `term`
  terminator, and the comment
- Bundled copies under `skills/develop-task/references/` and `skills/develop-story/references/`
- `evals/shared/tests/pr-review-loop-parity.test.mjs`, which gains 5 cases:
  - a key line after a flow entry;
  - a deeper text line after a flow entry;
  - a flow entry followed by a block entry, which still reads `1`;
  - a list cut short by a heading line;
  - a list with no terminator.

**Testing**:

- Four of the five new cases are red against `51dc912e`. The deeper-text case already read
  `unreadable` through the cycle 8 rule; it is a regression fixture.
- Mutation:
  - removing the `fl` rule turns the key-line case red;
  - removing `!term` turns both truncation cases red.
- Parity suite 82/82.
- The 184 tracked PR review reports read the same before and after.

**Verification Steps for QA**: Probe case `oc9-flow-then-key-exempt` and
`oc9-truncated-by-hash-heading` (`task.238.qa.9.security.cases.1.json`) now print `unreadable`.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found by QA cycle 9 (`task.238.qa.9.qa-loop-acts-on-signals-it-has.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA cycle 9 fix) |
| 2026-10-28 | Ready for QA | qa-fix | Fixed in QA cycle 9 (see Developer Fix Cycle) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.10.qa-loop-acts-on-signals-it-has.md |
