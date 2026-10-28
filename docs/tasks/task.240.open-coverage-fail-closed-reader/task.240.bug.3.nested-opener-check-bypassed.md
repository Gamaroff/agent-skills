# Bug Report: Task 240 - The nested opener check misses an opener behind a prefix

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-3
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 3 scoped review, CR-1 and CR-2; reproduced by QA)
**Date Found**: 2026-10-28

## Description

Cycle 2 (bug.2) added `nestedLine()`. Under an empty key, it requires a quoted scalar or flow
collection to close on the line where it opens. It only looks at the first character of the line,
after stripping one `- ` and one simple `key:`. Any opener that this does not reach is missed. Such
an opener still runs, in YAML, over the key-indent lines below, and the reader reads those lines as
keys.

The reader's header claims that every such opener closes on its line. For these shapes that claim
is false.

## Steps to Reproduce

Each block follows `  - id: PC-1` / `    category: coverage` / `    evidence:`, and is followed by
`    provenance: pre-existing` and a closing line.

| Shape | Line under `evidence:` | Reader at `46146a35` | Old awk | PyYAML 6.0.3 |
| --- | --- | --- | --- | --- |
| A quote open inside a closed flow collection | `[a, "b]` | 0 | 0 | 1 |
| A nested dash | `- - "open` | 0 | 0 | 1 |
| An anchor | `- &a "open` | 0 | 0 | 1 |
| A key containing a space | `- sub key: "open` | 0 | 0 | 1 |

A second, smaller issue, CR-3 (low): cycle 2 also introduced a false `unreadable`. In
`- [a, "see #12"]`, the comment strip cuts the line at ` #`, inside the quote. The old awk and
PyYAML both read 1.

## Expected Behavior

`OPEN_COVERAGE=1` or `unreadable`. It must never read 0.

## Actual Behavior

`OPEN_COVERAGE=0`: a false 0.

## Impact

A false 0 on a coverage finding is the direction this task exists to remove.

**Severity re-rated from high to medium on a measurement.** None of the 187 tracked review reports
has a nested value under an empty key at all (`grep` over each report's YAML block: 0). No writer or
template emits one. The reviewer's confidence (high) is unchanged.

## Recommendation

Stop tracking openers. This is the third MEDIUM on the same mechanism (quote handling in
`open-coverage.js`), so a fourth patch to the scan would repeat the narrowing pattern. Replace the
scan with a character rule. A nested line under an empty key may not contain:

- a double quote;
- a flow opener (`[` or `{`);
- a single quote, unless it sits between two word characters (an apostrophe, `it's`).

Without those characters, YAML cannot open anything at the nested level that crosses a key-indent
line. A plain scalar cannot, and neither can a block scalar. A closed quoted or flow nested value
then reads `unreadable` too, which is fail-closed and has no corpus cost.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: cycle 2 scanned for an opener at one position, the first character after one dash
and one simple key. YAML can open a quote in other positions: behind a nested dash, an anchor, a
tag or a key with a space, and inside a flow collection. Any scan that lists positions has this
gap.

**Structural move**: replace. This is the second narrowing-residue offer in a row on the same
mechanism, so the fix takes the third-strike menu's replace move rather than adding positions to
the scan. The opener scan is gone.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/open-coverage.js`): `nestedLine()` is now one test against
`NESTED_OPENER`. A line nested under an empty key is refused if it contains, anywhere on the line:

- a double quote;
- `[` or `{`;
- a single quote that is not an apostrophe between two letters or digits.

Only a quoted scalar or a flow collection can run over a key-indent line, and each needs one of
those characters. A rule over characters therefore has no position to miss.

**Behaviour**:

- The four shapes in Steps to Reproduce now read `unreadable`. They read a false 0 before.
- CR-3's `- [a, "see #12"]` reads `unreadable` by design. Every nested quote and flow collection is
  now refused, closed or not.
- Plain nested values (`- a.md`, `- c: d`, `it's plain`) still read as before, and so does
  block-scalar content.

**Files modified**:

- `shared/resources/open-coverage.js`
- `shared/resources/tests/open-coverage.test.mjs`: 8 refused cases (the 4 shapes and 4 closed forms) and the accepted nested-list case, rewritten as plain text with apostrophes.
- `evals/shared/tests/pr-review-loop-parity.test.mjs`: 4 rows, one per shape.
- `CHANGELOG.md`
- The bundled copies.

**Testing**:

- Targeted suites: 184/184. `ci:fast`: green, 6,634 pass and 0 fail.
- `bundle:check` and `validate` (3 skills): all pass.
- Corpus: 0 changes across 187 reports.
- Mutation proofs:

| Mutant | Change | Result |
| --- | --- | --- |
| M9 | no `nestedLine` call | 15 red |
| M12 | no double-quote arm | 8 red |
| M13 | no flow arm | 3 red |
| M14 | single quotes always allowed | 2 red |
| M15 | apostrophes refused | 1 red |

**Verification steps for QA**: run the reader on each shape in Steps to Reproduce. Each should
print `OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 3 (task.240.qa.3.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Opener scan replaced by a character rule; M9, M12–M15 mutation-proven |
| 2026-10-28 | Closed | develop-task | Verified by task.240.qa.4.open-coverage-fail-closed-reader.md; superseded by the version 1.2 one-line-per-key reader (gate 9). Closed at 5c (PR review PC-2) |
