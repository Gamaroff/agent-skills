# Bug Report: Task 113 - `--annotate --issue` writes a pipe or newline into the row verbatim, corrupting the table

**Task**: [Link](./task.113.develop-next-registry-bookkeeping.md)
**Bug ID**: TASK-113-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-12

## Description

`registry-tick.js --annotate` validates `--pr` (digits only) but writes `--issue` into the `Issue`
cell **verbatim**. A value containing `|` adds a cell and shifts every later column; a value
containing a newline splits the row in two. Both make the row unparseable by `parseRegistry` —
the registry drift test and the selector then see a malformed row rather than a corrupted value, so
the damage is silent at the point it is done.

Reproduced in a scratch registry: `--issue 'x | y'` produced
`| … | 2026-01-01 | x | y | PR #1 merged |` (nine cells); `--issue $'a\nb'` split the row.

## Steps to Reproduce

```bash
node shared/resources/registry-tick.js --annotate --file docs/tasks/task.5.x/task.5.x.md \
  --pr 1 --issue 'x | y' --json      # → annotated; row now has an extra cell
```

## Expected Behavior

Exit 2 (usage error) — `--issue must not contain "|", "\r" or "\n"` — and nothing written. The
same discipline `--pr` already has.

## Actual Behavior

`reason: annotated`, row corrupted.

## Impact

Any caller passing an unvalidated string (a title, a URL with a `|` in a query string, a two-line
value from a heredoc) corrupts the index. Medium rather than high: the callers this PR ships pass a
`[#N](url)` they construct themselves, and `git diff` shows the damage — but the engine is the
place the guarantee belongs, not each caller.

## Recommendation

Reject `|`, `\r`, `\n` in `--issue` in `parseArgs`/`main` as a usage error; add a fixture test
that each of the three exits 2 and leaves the registry byte-identical.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: as described above — confirmed by re-running the reproduction before the change.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**: `parseArgs` refuses a missing or flag-shaped value for `--pr`/`--issue`; `main` refuses an empty/whitespace `--issue` and any value containing `|`, CR or LF — all exit 2, nothing written.

**Files Modified**: shared/resources/registry-tick.js · shared/resources/tests/registry-tick.test.mjs

**Testing**: Fixture over six cases (missing, empty, whitespace, `|`, LF, CR): each exits 2 and the registry is byte-identical. Mutation: dropping the character check reds it.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Filed (QA cycle 1)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |
| 2026-09-12 | Closed       | QA         | Verified by re-executing the reproduction (QA cycle 2) |
