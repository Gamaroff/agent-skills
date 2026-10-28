# Bug Report: Task 240 - The differential generator cannot produce the shapes that break the reader

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 6 scoped review, CR-3)
**Date Found**: 2026-10-28

## Description

`shared/resources/tests/open-coverage-differential.test.mjs` generates findings blocks and asserts
that the reader prints `unreadable` or PyYAML's count. Its grammar has three gaps:

- The `wrap` form always emits exactly one deeper line (line 163), so no comment can sit between
  two wrapped lines (BUG-6).
- No value starts with `` ` ``, `@`, `%`, `, ` or `- ` (BUG-7).
- No key is followed by a tab (CR-4, low).

The suite is green at seed 240 and passes CI, yet BUG-6 and BUG-7 both reproduce by hand.

## Steps to Reproduce

1. `node --test shared/resources/tests/open-coverage-differential.test.mjs`: it passes at the default
   seed 240, N=4000 (it passed in this cycle's `ci:fast`). Commit `22bdc3e9` records 10 seeds × 25,000 with no disagreement.
2. Run the BUG-6 and BUG-7 blocks through `countOpenCoverage`: each prints 1, and PyYAML rejects each.

## Expected Behavior

Any disagreement in the classes the suite claims to cover can be produced by its generator.

## Actual Behavior

The suite's guarantee covers only the shapes the generator happens to produce.

## Impact

The test that was meant to end hand-picked findings has the same blind spot: it finds only the
shapes someone thought to generate.

## Recommendation

- Let `wrap` and `plain` emit 1–3 deeper lines, with a `# c` line or a ` # c` suffix between them.
- Add indicator-leading values and a tab after the colon to the risky pool.
- Mutation-prove the change: with the BUG-6 and BUG-7 fixes reverted, the suite must go red.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: the grammar was written from the five shapes bugs 1–5 named. A shape class it
cannot emit is one it cannot test.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/tests/open-coverage-differential.test.mjs`). The generator
changed first, before any reader fix:

- `wrap` emits 1–3 deeper lines. When risky they include `# c` and `more # c`.
- Risky nested items include `plain # c` and `# c`.
- A new risky `indicator` form covers `` `x` y ``, `@foo`, `%x`, `, x`, `- x`, `? x`, `: x` and `|x`.
- `separator()` puts a tab, or a space then a tab, after a key's colon 3% of the time, in block and
  flow entries.

Gate 6 CR-5 is fixed in the same edit: the test asserts `N >= 1000`, because its floors are shares
of N.

**Red before the reader fix**: at seed 240, N=4000, the widened suite failed on the unchanged
reader with 90 wrong counts. At N=25,000 there were 542, covering all three classes (tab,
indicator, comment in a wrap). `OPEN_COVERAGE_DIFF_N=10` now fails with "too small".

**Green after**: seeds 1, 2, 3, 7 and 240, each at 25,000 blocks, show 0 disagreements. Every reader
guard added for BUG-6, BUG-7 and CR-4, when reverted (M19–M24), turns the targeted suites red.

**Files modified**: `shared/resources/tests/open-coverage-differential.test.mjs`.

**Verification steps for QA**: revert any one reader guard from this cycle and run the suite. It
should report wrong counts.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 6 (task.240.qa.6.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented; mutation-proven |
| 2026-10-28 | Closed | qa-task | Verified by task.240.qa.7.open-coverage-fail-closed-reader.md |
