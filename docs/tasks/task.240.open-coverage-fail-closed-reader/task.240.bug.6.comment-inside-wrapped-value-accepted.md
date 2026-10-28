# Bug Report: Task 240 - A comment inside a wrapped plain value is accepted

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 6 scoped review, CR-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

Commit `22bdc3e9` added a rule that a comment line ends a block scalar
(`shared/resources/open-coverage.js:351`). The rule covers only `cur.deeper === "text"`. A plain
value that wraps onto deeper lines can also be cut by a comment, but the reader keeps reading the
lines after it as more of the value. YAML rejects both shapes below. The reader prints a count.

## Steps to Reproduce

The entry is `- id: PC-1` / `category: coverage`, followed by:

| Lines after the entry | Reader at `22bdc3e9` | PyYAML 6.0.3 |
| --- | --- | --- |
| `finding: a` / `  # c` (deeper) / `  more` (deeper) | 1 | ParserError |
| `finding: a` / `  b # c` (deeper) / `  more` (deeper) | 1 | ParserError |

## Expected Behavior

The reader prints `unreadable` for both blocks, because YAML gives them no count.

## Actual Behavior

The reader prints `OPEN_COVERAGE=1`.

## Impact

The count the reader prints is the one the writer evidently meant. No deciding key is misplaced. It
still breaks the reader's stated contract: print `unreadable` or YAML's count. The differential test
cannot see it (BUG-8).

Corpus: 0 of 168 readable findings blocks in the 187 tracked review reports have a comment inside a
wrapped value. Severity is kept at the reviewer's medium: review-pr is a model writer, so "no writer
emits it" cannot be claimed.

## Recommendation

When a comment line follows a value whose `deeper` is `plain`, or a wrapped plain line holds ` #`,
set `deeper` to `refuse`, as the block-scalar rule does. Pin both shapes in `open-coverage.test.mjs`.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: the comment-line rule set `deeper` to `refuse` only for a block scalar
(`deeper === "text"`). A wrapped plain value (`plain`) and a nested plain scalar (`nested`, kind
`plain`) are also ended by a comment in YAML, and a trailing ` # c` on a wrapped line ends them the
same way. PyYAML 6.0.3 confirms it: `a: x` / `  # c` / `  more` is a ParserError, while a comment
between nested list items ends nothing.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/open-coverage.js`): a new `endsAtComment(cur)` names the
three values a comment ends: a block scalar, a wrapped plain value, and a nested plain scalar. Two
places use it. A comment line sets `deeper` to `refuse`. A deeper line holding ` #` does the same,
except in a block scalar, where `#` is content.

**Files modified**: `shared/resources/open-coverage.js` and its two bundled copies;
`shared/resources/tests/open-coverage.test.mjs` (4 refused rows, 2 accepted rows: a comment between
nested list items, and a wrap, comment, then next key);
`shared/resources/tests/open-coverage-differential.test.mjs` (BUG-8).

**Testing**:

- Both shapes in Steps to Reproduce read `unreadable`.
- 14 shapes YAML accepts still read YAML's count; 0 are over-refused.
- Differential suite at seeds 1, 2, 3, 7 and 240 × 25,000 blocks: 0 disagreements.
- `ci:fast`: 6,680 pass, 0 fail.
- Mutation proofs:
  - M21 (comment line ends only a block scalar again): 3 red.
  - M22 (trailing-comment rule removed): 2 red.
  - M23 (nested plain not ended): 2 red.
  - M25 (a trailing `#` ends a block scalar too): 1 red.

**Verification steps for QA**: run both blocks in Steps to Reproduce through the reader. Each should
print `OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 6 (task.240.qa.6.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented; mutation-proven |
| 2026-10-28 | Closed | qa-task | Verified by task.240.qa.7.open-coverage-fail-closed-reader.md |
