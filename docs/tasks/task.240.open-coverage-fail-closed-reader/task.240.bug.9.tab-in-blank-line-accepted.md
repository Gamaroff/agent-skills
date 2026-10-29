# Bug Report: Task 240 - A whitespace-only line holding a tab is skipped as blank

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 7 hand probe; reproduced against PyYAML 6.0.3)
**Date Found**: 2026-10-28

## Description

Cycle 6 (commit `5f69c201`) refuses a tab anywhere outside a block scalar's content. The header and
the CHANGELOG say so. But the line loop skips every whitespace-only line first
(`shared/resources/open-coverage.js:291`, `if (/^[ \t]*$/.test(line)) continue;`), so a line made
only of spaces and a tab never reaches the tab rule. PyYAML rejects such a line wherever it sits:
between entries, between keys, and between a block scalar's content lines.

The differential generator emits no whitespace-only lines, so the suite cannot see this. That is
the BUG-8 class again, for a new shape.

## Steps to Reproduce

The block is `reviewed_gate: none` / `findings:` / `  - id: PC-1` / `    category: coverage`, then:

| Line after the entry | Reader at `5f69c201` | PyYAML 6.0.3 |
| --- | --- | --- |
| `  ⇥` (two spaces, a tab), then `  - id: PC-2` / `    category: coverage` | 2 | ScannerError |
| `⇥` alone, at the end of the block | 1 | ScannerError |
| `⇥` between two content lines of `finding: \|` | 1 | ScannerError |

`⇥` is a tab character.

## Expected Behavior

The reader prints `unreadable`, as it does for every other line YAML rejects.

## Actual Behavior

The reader prints a count, so `OPEN_COVERAGE=2` in the first row, where YAML gives no count at all.

## Impact

The count is the one the writer meant, and no deciding key is misplaced. It still breaks the
reader's contract: print `unreadable` or YAML's count. It also makes cycle 6's stated rule false.

Corpus: 0 tracked review reports have a whitespace-only line with a tab. Severity stays medium, as
for BUG-6 and BUG-7: review-pr is a model writer, and trailing whitespace is a shape a writer can
emit.

## Recommendation

- In the line loop, refuse a whitespace-only line that holds a tab before skipping it as blank. A
  tab-only line inside an open quoted value would then be refused too. That is fail-closed, and
  YAML's reading of it is not needed.
- Let the generator emit a whitespace-only line (`""`, `"  "`, and rarely `"  \t"`) between
  lines, so the suite covers blank lines at all.
- Mutation-prove both changes: with the reader guard reverted, the widened suite must go red.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: the line loop's blank skip (`/^[ \t]*$/` → `continue`) ran before both tab rules,
so a whitespace-only line never reached them.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description**: the generator was widened first. A `blank(ind)` helper in
`open-coverage-differential.test.mjs` now emits whitespace-only lines between keys and between the
deeper lines of a value, and 10% of them hold a tab. On the unchanged reader it went red: seed 240,
N=25,000 gave 92 wrong counts, 18 of them from this shape. In `open-coverage.js` the blank skip now
refuses a whitespace-only line that holds a tab (`bad-line`) before it skips the line.

**Files modified**: `shared/resources/open-coverage.js` and its two bundled copies;
`shared/resources/tests/open-coverage.test.mjs` (3 refused rows; 1 accepted row: a blank line of
spaces only is still blank); `shared/resources/tests/open-coverage-differential.test.mjs`;
`CHANGELOG.md`.

**Testing**:

- All three rows in Steps to Reproduce read `unreadable`.
- Differential suite at seeds 1, 2, 3, 7, 11, 42 and 240 × 25,000: 0 disagreements.
- The 34-shape hand probe: 0 wrong.
- Mutation M26 (the guard disabled): 3 unit tests and the differential suite red.

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
