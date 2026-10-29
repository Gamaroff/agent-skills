# Bug Report: Task 240 - A value that starts with a YAML indicator is read as plain text

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 6 scoped review, CR-2; reproduced by QA)
**Date Found**: 2026-10-28

## Description

`scalar()` refuses a key-level value that starts with `!`, `&` or `*`
(`shared/resources/open-coverage.js:103`). YAML also reserves `` ` ``, `@` and `%`, and a plain
scalar cannot start with `, ` or `- `. The reader reads all five as plain text. `NESTED_INDICATOR`
already refuses the same set, but only on nested lines.

## Steps to Reproduce

The entry is `- id: PC-1` / `category: coverage`, followed by one more key:

| Extra line | Reader at `22bdc3e9` | PyYAML 6.0.3 |
| --- | --- | --- |
| `` finding: `x` is missing `` | 1 | ScannerError |
| `finding: @foo` | 1 | ScannerError |
| `finding: %x` | 1 | ScannerError |
| `finding: , x` | 1 | ParserError |
| `finding: - x` | 1 | ScannerError |

## Expected Behavior

Either the reader prints `unreadable`, or the shape is a documented leniency that the differential
test models.

## Actual Behavior

The reader prints `OPEN_COVERAGE=1`, and nothing documents or models that.

## Impact

Under a free-text key the count is the one the writer meant. Under `category` or `provenance`, an
indicator-leading value would be compared as text when YAML has no value at all.

Corpus: 0 of 168 readable findings blocks have an indicator-leading value. Severity is kept at
medium because a writer can produce it: review-pr writes `finding:` sentences, and one that opens
with a backtick code span is likely.

**Refusing outright is the wrong fix for free text.** A real review that opens a finding with a
code span would halt 5c on a false `unreadable`.

## Recommendation

Refuse these indicators under `category` and `provenance`, matching `NESTED_INDICATOR`. Under free-
text keys, either refuse them or record them as a leniency like task.238 bug.15's `: `. If it is a
leniency, model it in the differential test's `lenientFreeText` and list it in the header.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: `scalar()` checked only `!`, `&` and `*` at the start of a value.
`NESTED_INDICATOR` already listed YAML's full set, but only nested lines used it.

**Decision: refuse, under every key.** The Impact section above calls an outright refusal the wrong
fix for free text. That was measured before choosing the fix. Across the 187 tracked review reports
there are about 1,140 `finding:`, `suggested_action:` and `evidence:` values. 1,074 are
double-quoted and 18 single-quoted, and every plain one starts with a letter. None starts with an
indicator. A writer that opens a finding with a code span quotes it, as `review-pr`'s example block
does (`"`age > 18` returns false…"`). An unquoted one would halt 5c with `unreadable` and a named
reason. That is the reader's fail-closed direction, and no leniency has to be modelled in the
differential test to allow it.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/open-coverage.js`): `NESTED_INDICATOR` is renamed `INDICATOR`
and is now also checked in `scalar()`. A value starting with it is refused as `bad-value`, under any
key and in flow entries. A block-style value starting with `,` is refused too. In a flow entry a
leading `,` is the separator for an empty value, which YAML reads as null.

**Files modified**: `shared/resources/open-coverage.js` and its two bundled copies;
`shared/resources/tests/open-coverage.test.mjs` (8 refused rows, one per indicator; 1 accepted row:
`-1` and `:x` are not indicators); the CHANGELOG task 240 entry.

**Testing**:

- All five shapes in Steps to Reproduce, plus `? x`, `: x` and `|x`, read `unreadable`.
- A quoted backtick-led value, and an inner backtick, still count.
- Differential suite at 5 seeds × 25,000 blocks: 0 disagreements.
- Corpus: unchanged (the corpus test in `open-coverage.test.mjs` is green).
- Mutation proofs:
  - M19 (`scalar()` back to `!&*`): 9 red.
  - M20 (block `,` allowed): 2 red.

**Verification steps for QA**: run the five blocks in Steps to Reproduce through the reader. Each
should print `OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 6 (task.240.qa.6.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented; mutation-proven |
| 2026-10-28 | Closed | qa-task | Verified by task.240.qa.7.open-coverage-fail-closed-reader.md |
