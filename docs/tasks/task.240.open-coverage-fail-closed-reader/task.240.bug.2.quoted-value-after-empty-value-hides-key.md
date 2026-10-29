# Bug Report: Task 240 - A quoted value opened after an empty value hides a key line

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute pass, CR-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

After a non-deciding key with an empty value (`finding:`), `open-coverage.js` reads every deeper
line as text with no quote tracking (`blockValue` returns `deeper: "text"`,
`open-coverage.js:162`). When the first deeper line opens a quoted scalar, YAML keeps reading the
following lines as part of that scalar until the quote closes, including a line at the entry's key
indent. The reader instead reads that line as a key.

Cycle 1's fix (bug.1) refuses a quote that is still open at the key indent, but only when the quote
opens on the key's own line. This is the same trap one line lower. The reader's header now claims
that "a quote still open at the entry's key indent is refused", and for this shape that claim is
false.

## Steps to Reproduce

```yaml
reviewed_gate: none
findings:
  - id: PC-1
    category: coverage
    finding:
      "open
    provenance: pre-existing
    note: end"
```

| Reader | Result |
| --- | --- |
| `open-coverage.js` at `a98f5470` | `OPEN_COVERAGE=0` |
| Old awk (`origin/develop` §5c) | `OPEN_COVERAGE=0` |
| PyYAML 6.0.3 | 1 open coverage finding (`provenance` and `note` are quoted text inside `finding`) |

## Expected Behavior

`OPEN_COVERAGE=1`, or `unreadable`. It must never read 0.

## Actual Behavior

`OPEN_COVERAGE=0`: a false 0, which exits the loop to Step 7.

## Impact

A false 0 on a coverage finding is the expensive direction the task exists to remove. `/finalise`
fails the gap after a full DoD pass.

**Severity re-rated from high to medium on a measurement.** The shape (an empty value followed by a
quoted line) appears in 0 of the 187 tracked review reports. review-pr's template writes
`finding: {one sentence}` on one line, so no writer or template in the repository produces it. The
reviewer's confidence (high) is unchanged.

## Recommendation

After an empty value, treat a deeper line that opens with `"` or `'` as the start of a quoted value,
using the same rule as cycle 1: it runs to its closing quote, and it is refused if still open at the
key indent or at the end of the block. Refuse a deeper line that opens a flow collection (`[` or
`{`) after an empty value. Add the shape above as a parity row.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: an empty value under a non-deciding key returned `deeper: "text"`, the same mode as
a block scalar's content, so nothing looked at the lines inside a nested value. Cycle 1 tracked a
quote opened on the key's own line and nowhere else.

**Structural move (qa-fix Step 2.6, pipeline offer)**: consolidate. This is the second MEDIUM in
the same file, and both are quote handling. A second round of quote tracking would be the
narrowing pattern again, so the fix is an allow-list instead: in a nested value under an empty key,
a quoted scalar or flow collection that opens on a line must close on that line. Anything else is
refused.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/open-coverage.js`):

- An empty value now returns a new mode, `deeper: "nested"`. A block scalar keeps `"text"`, because
  its content is literal in YAML.
- A new function, `nestedLine()`, reads each deeper line in nested mode. It strips a list dash and
  a nested `key:`. It refuses a quoted value that does not close on the line, and a `[`/`{` flow
  value that does not end on the line.

**Behaviour**:

- The shape in Steps to Reproduce now reads `unreadable` (it read a false 0).
- Two valid but unclosed nested shapes that the awk read as 1 also read `unreadable`. Neither
  appears in the 187 tracked reports.
- Closed nested values still read as before (a list of quoted, keyed, flow and plain items, and the
  pinned nested list). So do apostrophes in plain text and block-scalar content.

**Files modified**: `shared/resources/open-coverage.js`,
`shared/resources/tests/open-coverage.test.mjs` (1 accepted and 2 refused cases),
`evals/shared/tests/pr-review-loop-parity.test.mjs` (1 row), `CHANGELOG.md`, and the bundled
copies.

**Testing**:

- Targeted suites: 172/172. `ci:fast`: green (6,622 pass, 0 fail).
- Corpus: 0 changes across 187 reports.
- Mutation proofs:
  - M9, the `nestedLine` call removed: 3 red.
  - M10, the quote check removed: 2 red.
  - M11, the flow check removed: 1 red.

**Verification steps for QA**: run the reader on the shape in Steps to Reproduce. It should print
`OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 2 (task.240.qa.2.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (consolidate: allow-list for nested openers); M9–M11 mutation-proven |
| 2026-10-28 | Closed | develop-task | Verified by task.240.qa.3.open-coverage-fail-closed-reader.md; the shape still reads unreadable under the version 1.2 reader (gate 9). Closed at 5c (PR review PC-1) |
