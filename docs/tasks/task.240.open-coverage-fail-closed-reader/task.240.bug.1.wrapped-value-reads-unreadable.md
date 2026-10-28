# Bug Report: Task 240 - A wrapped value under a non-deciding key reads unreadable

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1 diff review, CR-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

`shared/resources/open-coverage.js` refuses two valid YAML shapes that the awk it replaced read
correctly. Both put a long value under a key whose value never decides the count, such as
`finding:`. The reader treats any line deeper than an entry's keys as part of the last key's value,
and refuses it unless that value was empty or a block-scalar indicator (`blockValue` returns
`deeper: "refuse"` for a plain or quoted value, `open-coverage.js:153`). A double-quoted value that
does not close on its own line is refused as `an unterminated double-quoted value` (`scalar`).

The task promised that every existing case keeps its value, and listed "a shape the corpus uses that
the new reader refuses" as its first high risk. No tracked report has these shapes today (the corpus
diff is 0 changes), but the reader is fed model-written reports, and a long `finding:` that wraps is
an ordinary thing for one to emit.

## Steps to Reproduce

A review report whose findings block is:

```yaml
reviewed_gate: none
findings:
  - id: PC-1
    category: trail
    finding: a long plain value that
      wraps onto a deeper line
```

| Shape | Old awk (`origin/develop`, §5c) | `open-coverage.js` |
| --- | --- | --- |
| Plain `finding:` value wrapped onto a deeper line, `category: trail` | `0` | `unreadable` (`bad-value: a deeper line under finding:`) |
| Double-quoted `finding:` value wrapped onto a deeper line, `category: coverage` | `1` | `unreadable` (`bad-value: an unterminated double-quoted value`) |

Measured by running the old block (extracted from `origin/develop` at `83aacf7b`) and
`command node shared/resources/open-coverage.js --file <report>` on each fixture.

## Expected Behavior

Both shapes read as YAML reads them: `0` and `1`. A deeper line under a key outside
`category` / `provenance` is text, as it already is after an empty value or a block scalar.

## Actual Behavior

Both read `unreadable`. §5c treats `unreadable` as a review failure: it re-runs `/review-pr` and
escalates on the second refusal, so a clean run is halted.

## Impact

A false `unreadable` costs a 5c re-run and then a halt, the expensive direction the reader's own
header names. The refusal is not needed for safety: neither shape can hide a `category:` key, because
a key is only read at the entry's key indent.

## Recommendation

For keys outside `DECIDING`, accept deeper lines after a plain or quoted value as text, and let a
double-quoted value under such a key continue until its closing quote. Keep the refusal for
`category` and `provenance`. Add a parity row for each shape, plus the trap shape below, which must
stay `unreadable` (or must not read the quoted `category: coverage` as a key):

```yaml
  - id: PC-1
    finding: "text
    category: coverage"
    category: trail
```

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: `blockValue` gave every plain or quoted value `deeper: "refuse"`, whatever its key,
and `scalar` refused a quote that did not close on its own line. Only an empty value or a block
scalar let deeper lines through. The rule was meant for `category` and `provenance`, the two keys
whose values decide the count, and it was applied to every key.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/open-coverage.js`):

- Under a key outside `category`/`provenance`, a plain value may wrap onto deeper lines. A wrapped
  line that reads as `key: ` is refused, as YAML refuses it. A plain value that ends in a comment
  takes no wrapped lines.
- Under the same keys, a quoted value may continue onto deeper lines until its closing quote. A
  `#` inside the quotes is text. A quote still open at the entry's key indent, or at the end of the
  block, is refused. That keeps the trap shape `unreadable`.
- `category` and `provenance` still refuse any wrap.
- The quoted-text scan moved into one helper, `quoted()`, used by both the one-line and the
  wrapped paths.

Each new shape was checked against PyYAML 6.0.3. The reader matches it on every valid shape, and
reads `unreadable` on every shape PyYAML rejects. The trap shape is the one exception by design:
PyYAML reads it as `0`, and the reader refuses it rather than guess.

**Files modified**: `shared/resources/open-coverage.js`,
`shared/resources/tests/open-coverage.test.mjs` (3 accepted and 6 refused cases),
`evals/shared/tests/pr-review-loop-parity.test.mjs` (4 rows run through both the §5c block and the
reader), `CHANGELOG.md` (one sentence), and the bundled copies.

**Testing**: the targeted suites pass (168/168), and `ci:fast` is green (6,618 pass, 0 fail). The
corpus diff against the old awk shows 0 changes over 187 reports. Mutation proofs, run in a scratch
worktree:

- M5 (a wrapped plain value refused again): 2 red.
- M6 (no key-indent check on an open quote): 2 red, including the trap row.
- M7 (no `key: ` check on a wrapped plain line): 1 red.
- M8 (no end-of-block check): 1 red. On its first run it survived because no case ended the block
  with a quote open, so one was added.

**Verification steps for QA**: run `command node shared/resources/open-coverage.js --file <f>` on
the two shapes in Steps to Reproduce. They should print `OPEN_COVERAGE=0` and `OPEN_COVERAGE=1`.
The trap shape should print `OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 1 (task.240.qa.1.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented; mutation-proven (M5–M8) |
