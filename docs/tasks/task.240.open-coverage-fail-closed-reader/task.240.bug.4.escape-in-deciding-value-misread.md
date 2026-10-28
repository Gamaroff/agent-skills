# Bug Report: Task 240 - An escape in a deciding value is misread

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-4
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 4 scoped review, CR-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

`quoted()` (`shared/resources/open-coverage.js:137`) reads a double-quoted backslash escape as the
escaped character taken literally. YAML decodes escapes: `\e` is ESC, `\t` is a tab, and `\x70` is
`p`. A `category:` or `provenance:` value that holds an escape therefore reads differently from
YAML. The count depends on those two values.

The line has been there since the first implementation commit (`c054f8f4`), and it is new on this
branch. The base awk kept the backslash, so it compared `pr\e-existing` against `pre-existing` and
counted the entry as open, which matches YAML.

## Steps to Reproduce

Each row is one entry under `findings:`. The first line of every entry is `- id: PC-1`.

| Entry lines | Reader at `32065fbf` | Old awk | PyYAML 6.0.3 |
| --- | --- | --- | --- |
| `category: coverage`, `provenance: "pr\e-existing"` | 0 | 1 | 1 |
| `category: coverage`, `provenance: "pre-exis\ting"` | 0 | 1 | 1 |
| `category: coverage`, `provenance: "\x70re-existing"` | 1 | 1 | 0 |
| `category: "cover\age"` | 1 | unreadable | 0 |

## Expected Behavior

The reader prints the count YAML reads, or `unreadable`. It must never print a false 0.

## Actual Behavior

The first two rows print a false 0. The last row prints 1 where the old awk refused it.

## Impact

A false 0 on an open coverage finding, introduced by this branch.

**Severity re-rated from high to medium on a measurement.** None of the 187 tracked review reports
has a backslash in a `category:` or `provenance:` value. review-pr writes both values bare (for
example, `category: coverage`), and no writer quotes them. The reviewer's confidence (high) is
unchanged.

## Recommendation

Refuse a backslash escape in a quoted `category:` or `provenance:` value, the same way an escape
inside a flow entry is already refused. Keep the escape handling for non-deciding keys. There, it
only decides where the quote closes, and it does that correctly.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: `quoted()` steps over an escape so that it can find the closing quote, and it never
decodes the escape. That is enough for a value nobody compares. The two values the count does
compare, `category:` and `provenance:`, did not get the escape refusal that flow entries already
had.

**Structural move (qa-fix Step 2.6, pipeline offer)**: consolidate. This is the same file as the
last three findings but a separate mechanism (escape decoding, not nested quote closure). The
existing flow-only refusal became one `strict` rule, and every value the count compares now goes
through it.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/open-coverage.js`):

- `quoted(q, s, strict)` refuses an escape whenever `strict` is set.
- `scalar(s, flow, strict = flow)` passes `strict` on.
- `blockValue` passes `deciding` as `strict`.

Values under non-deciding keys still step over escapes, so they still close at the right quote.

**Behaviour**: the four shapes in Steps to Reproduce now read `unreadable`. The existing case for an
escape under `finding:` still reads 1.

**Files modified**:

- `shared/resources/open-coverage.js`
- `shared/resources/tests/open-coverage.test.mjs`: 3 refused cases
- `evals/shared/tests/pr-review-loop-parity.test.mjs`: 2 rows
- `CHANGELOG.md`
- the bundled copies

**Testing**:

- Targeted suites: 189/189.
- `ci:fast`: green, 6,639 pass and 0 fail.
- `bundle:check` and `validate` (3 skills): green.
- Corpus: 0 changes across 187 reports.
- Mutation proofs:
  - M16, a deciding value not set to strict: 5 red.
  - M17, strict never refuses: 6 red.

**Verification steps for QA**: run the reader on each shape in Steps to Reproduce. Each should
print `OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 4 (task.240.qa.4.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Escape refused in deciding values (consolidate: one strict rule); M16–M17 mutation-proven |
