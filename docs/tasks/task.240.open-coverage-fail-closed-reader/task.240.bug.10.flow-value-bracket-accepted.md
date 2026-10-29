# Bug Report: Task 240 - A plain flow value holding a bracket is accepted

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 7 scoped review, CR-1 and CR-2; reproduced by QA)
**Date Found**: 2026-10-28

## Description

In a flow entry (`- {key: value, …}`) the reader takes a plain value up to the next `,` or `}`
(`shared/resources/open-coverage.js:124`, `s.match(/^[^,}]*/)`). It refuses a value that **starts**
with `[` or `{`, but not one that holds `[` or `]` further in. Inside a flow collection YAML reads
either bracket as an indicator, so PyYAML rejects the block. The reader prints a count.

The flow-entry generator in `shared/resources/tests/open-coverage-differential.test.mjs:215` never
puts a bracket inside a flow value, so the differential suite stays green on this (CR-2). The
defect came in with the flow-entry reader (`c054f8f4`). The base branch has no reader.

## Steps to Reproduce

The block is `reviewed_gate: none` / `findings:` followed by one flow entry:

| Flow entry | Reader at `5f69c201` | PyYAML 6.0.3 |
| --- | --- | --- |
| `- {category: coverage, provenance: pre-existing]}` | 1 | ParserError |
| `- {category: coverage, id: a]b}` | 1 | ParserError |
| `- {category: coverage, id: a[b}` | 1 | ParserError |

The first row matters most. A writer meant `pre-existing`, and the stray `]` sits in the deciding
`provenance` value.

## Expected Behavior

The reader prints `unreadable` for each block.

## Actual Behavior

The reader prints `OPEN_COVERAGE=1`.

## Impact

This breaks the reader's contract: print `unreadable` or YAML's count. In row 1 YAML has no value
for `provenance`, but the reader still compares one.

Corpus: in the tracked review reports there are 4 flow entries. One holds a bracket, and that one
is inside a quoted string (`task.130.pr-review.1`, `ref: "CHANGELOG.md [Unreleased] › task 130"`),
which YAML accepts. 0 hold a bracket in a plain flow value. Severity stays at the reviewer's medium,
because review-pr does write flow entries, and an unquoted `ref:` with a bracket is a shape it can
produce.

## Recommendation

- Refuse a plain flow value that contains `[` or `]` anywhere, as a leading `[` or `{` is refused
  already. Pin all three rows in `open-coverage.test.mjs`. A quoted flow value holding a bracket must
  still count.
- CR-2: add risky flow values that carry a bracket mid-value (`pre-existing]`, `a[b`) to the flow
  generator. Mutation-prove both changes: with the reader guard reverted, the suite must go red.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: `scalar()`'s flow branch refused a value that starts with `[` or `{`, but read the rest
of the value up to `,` or `}` without checking for brackets, which are indicators inside a flow
collection.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description**: the generator was widened first (CR-2). The flow-entry risky pool gains
`${w}]` and `a[${w}`. On the unchanged reader it went red: 74 of the 92 wrong counts at seed 240,
N=25,000 came from this shape. In `open-coverage.js` the flow branch now refuses a plain value
holding `[` or `]` anywhere (`bad-value`). Quoted flow values return before this check, and block
plain values never take the flow branch, so both still count.

**Files modified**: `shared/resources/open-coverage.js` and its two bundled copies;
`shared/resources/tests/open-coverage.test.mjs` (3 refused rows; 1 accepted row: a bracket in a
quoted flow value and in a block plain value); `shared/resources/tests/open-coverage-differential.test.mjs`;
`CHANGELOG.md`.

**Testing**:

- All three rows in Steps to Reproduce read `unreadable`.
- `ref: "CHANGELOG.md [Unreleased]"`, the shape of the corpus's only bracketed flow value, still
  counts.
- Differential suite at 7 seeds × 25,000: 0 disagreements.
- Mutation M27 (the guard disabled): 3 unit tests and the differential suite red.

**Verification steps for QA**: run the three rows in Steps to Reproduce through the reader. Each
should print `OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 7 (task.240.qa.7.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented; mutation-proven |
| 2026-10-28 | Closed | qa-task | Verified by task.240.qa.8.open-coverage-fail-closed-reader.md |
