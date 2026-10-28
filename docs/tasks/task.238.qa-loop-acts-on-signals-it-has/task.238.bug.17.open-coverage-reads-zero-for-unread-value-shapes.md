# Bug Report: Task 238 - Open-coverage check reads 0 for value shapes it did not read

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-17
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 8 diff review, CR8-1; reproduced by the probe engine)
**Date Found**: 2026-10-28

## Description

The cycle 7 fix (`d51a9dca`, bug.16) made the §5c open-coverage check read an allow-list of **line**
shapes (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551`). It does not allow-list
**value** shapes. `key()` takes any non-empty `category:` value as a readable category, and any
`provenance: pre-existing` value as an exemption, whatever follows it. Three valid YAML shapes and
one malformed one therefore read `0` ("found none") for an entry that holds a coverage finding:

- `category:` with a block scalar (`category: >-` with `coverage` on the next line), a tag
  (`category: !!str coverage`) or an anchor (`category: &c coverage`). The indicator is read as
  the value, so the entry counts as categorised but not coverage.
- `provenance: pre-existing` continued on a deeper line (`on the base only`). YAML reads the value as
  `pre-existing on the base only`. The check skips the deeper line as text and exempts the entry.
- A flow entry whose plain value carries ` #` (`- {id: PC-1, category: coverage #x}`). That is a
  comment that swallows the closing brace, so the entry is malformed. The tokeniser reads
  `coverage #x` as the value and prints `0` rather than `unreadable`.

The check's own comment says "a shape it does not know is never read as 'no coverage'". The
`CHANGELOG.md` entry says it "reads every YAML spelling of a finding and prints `unreadable` for a
block it cannot account for". For these shapes, both claims are false.

## Steps to Reproduce

1. Probe cases `oc8-category-block-scalar`, `oc8-category-tagged`, `oc8-category-anchor`,
   `oc8-provenance-continued` and `oc8-flow-unclosed-comment` in
   `task.238.qa.8.security.cases.1.json`.
2. Run the fence control `open-coverage-shapes-8` (record `task.238.qa.8.security.run.json`).

## Expected Behavior

`OPEN_COVERAGE=unreadable`, or `1`. Never `0` for a block that holds a coverage finding.

## Actual Behavior

All five cases are `reproduced`: the fence prints `OPEN_COVERAGE=0`. The reviewer reproduced the
category variants independently, under GNU Awk 5.4.1.

## Impact

A `CONCERNS` review with an open coverage finding exits to Step 7, and `/finalise`'s acceptance
agent then fails it after a full DoD pass. Plausibility, measured: none of the 183 tracked PR review
reports uses an indicator on `category:` or `provenance:` (one carries a `provenance:` line at all).
review-pr's template emits plain scalars only. The defect is in a claim the check makes about
itself, and it is the same class as bug.16.

## Recommendation

Allow-list values as well as lines:

- A `category:` value must be one of review-pr's emitted tokens (`coverage`, `scope`, `trail`,
  `consistency`, `bug`, `cleanup`). Any other value, including one that starts with `>`, `|`, `!`,
  `&` or `*`, prints `unreadable`.
- A line deeper than the open entry's keys that directly follows a `provenance:` or `category:` key
  prints `unreadable`: it continues the value the check just read.
- A flow plain value containing ` #` prints `unreadable`.

Add each probe case to the open-coverage fixtures.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: cycle 7's allow-list stopped at the line. `pair()` handed whatever followed the
colon to `key()`, and `key()` treated any non-empty category as readable. So a tag, an anchor or a
block-scalar indicator counted as "a category, not coverage". A deeper line was skipped as text even
when it continued the value just read.

**Narrowing residue** (qa-fix Step 2.6, pipeline offer): gates 7 and 8 put every MEDIUM in this
check. Move: **consolidate**. The line allow-list is completed with a value allow-list, so the check
accepts exactly the shape review-pr writes and refuses everything else. That is the claim its
comment and the CHANGELOG already make. No YAML parser is copied, and nothing new is read.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, §5c open-coverage
check). Each of the following prints `unreadable`:

- a `category:` value outside review-pr's six tokens (`coverage`, `scope`, `trail`, `consistency`,
  `bug`, `cleanup`);
- a deeper line directly after a `category:` or `provenance:` key, since it continues that value;
- `category:` or `provenance:` given twice in one entry;
- a plain flow value that carries ` #`.

`CHANGELOG.md` now says the check reads "an allow-list of the line and value shapes review-pr
writes". One deliberate behaviour change: `category: coverage-gap` now reads `unreadable` where it
read `0`. The case is updated in `pr-review-loop-parity.test.mjs`, and probe case
`oc-coverage-prefix-only` (cycle 5) now prints `unreadable`.

**Testing** (`evals/shared/tests/pr-review-loop-parity.test.mjs`): 7 new cases plus the one updated
case.

- Mutation-proven, each red when its guard is removed:
  - enum: tagged, anchored, `coverage-gap`;
  - continuation: provenance continued (it also holds the block-scalar case);
  - duplicate key: provenance twice;
  - flow ` #`: comment before a readable category.
- All 183 tracked PR review reports read the same `OPEN_COVERAGE` before and after: 125 × `0`,
  35 × `1`, 4 × `2`, 19 × `unreadable`.
- Re-running the probe cases (cycles 5, 7 and 8): no case reads `0` for a coverage entry.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found by QA cycle 8 (`task.238.qa.8.qa-loop-acts-on-signals-it-has.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA cycle 8 fix) |
| 2026-10-28 | Ready for QA | qa-fix | Value allow-list: unknown category token, continued value, duplicate key, flow comment read unreadable |
