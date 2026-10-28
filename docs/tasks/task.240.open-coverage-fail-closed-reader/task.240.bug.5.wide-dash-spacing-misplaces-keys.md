# Bug Report: Task 240 - Wide spacing after a dash misplaces an entry's keys

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-5
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 5 scoped review, CR-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

The entry parser drops all whitespace after an entry's `-` (`shared/resources/open-coverage.js:342`).
It then assumes the entry's later keys start two columns after the dash (`dash + 2`). When the dash
is followed by two or more spaces, the first key sits further right. A later key placed at `dash + 2`
is then at a column YAML rejects, but the reader still accepts it as one of the entry's keys.

The line has been there since the first implementation commit (`c054f8f4`) and is new on this
branch. The base awk refused this block.

## Steps to Reproduce

| Block under `findings:` | Reader at `0c11216f` | Old awk | PyYAML 6.0.3 |
| --- | --- | --- | --- |
| `  -  category: coverage` / `    provenance: pre-existing` | 0 | unreadable | ParserError |
| `  -   category: coverage` / `    provenance: pre-existing` | 0 | unreadable | ParserError |
| `  -  category: coverage` / `     provenance: pre-existing` (aligned) | unreadable | unreadable | 0 |

## Expected Behavior

The reader should print `unreadable` for a block YAML rejects. For the aligned block, which YAML
accepts, it should print 0.

## Actual Behavior

The reader prints a confident 0 for a block YAML rejects. That is a fail-open regression on the old
awk.

## Impact

A false 0 on an open coverage finding.

**Severity rated medium on a measurement.** None of the 187 tracked review reports has two or more
spaces after a list dash, and review-pr writes `- id:` with one space. This is the same basis as
gates 2–4. Confidence is high.

## Recommendation

Store the entry's first key column (`keyIndent`) when the entry opens, and place every later line
against that column instead of `dash + 2`.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: the entry's key column was taken to be `dash + 2`, not measured. Three checks used
that value: the deeper-line check, the key-line check, and the check for an open quote reaching the
key column.

**Structural move**: patch. This is a separate mechanism (entry layout), and the fix replaces an
assumption with the measured value. It adds no new rule.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description** (`shared/resources/open-coverage.js`): when an entry opens, the reader now
stores `keyIndent = indent + text.length - rest.length`, which is the first key's real column. All
three checks compare against `cur.keyIndent`. The header's two drifted lines (QA-7) were also
reworded.

**Behaviour**: each case below now reads the way PyYAML reads it.

| Case | Reads |
| --- | --- |
| Both blocks in Steps to Reproduce | `unreadable` |
| The aligned block (YAML reads 0) | 0 |
| `-  category: coverage` alone | 1 |
| A one-space dash | unchanged |

**Files modified**: `shared/resources/open-coverage.js`; `shared/resources/tests/open-coverage.test.mjs` (1 accepted case, 2 refused); `evals/shared/tests/pr-review-loop-parity.test.mjs` (2 rows); the bundled copies.

**Testing**:

- Targeted suites: 194/194.
- `ci:fast`: green (6,644 pass, 0 fail).
- `bundle:check` and `validate` (3 skills): green.
- Corpus: 0 changes across 187 reports.
- Mutation proof M18 (keys assumed at `dash + 2` again): 5 tests red.

**Verification steps for QA**: run the reader on both blocks in Steps to Reproduce. Each should
print `OPEN_COVERAGE=unreadable`.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 5 (task.240.qa.5.open-coverage-fail-closed-reader.md) |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Key column measured (keyIndent); M18 mutation-proven |
