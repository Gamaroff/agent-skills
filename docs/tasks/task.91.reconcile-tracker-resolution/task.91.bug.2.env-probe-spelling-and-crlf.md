# Bug Report: Task 91 - the `.env` probe misses `export` and false-positives on CRLF

**Task**: [Link](./task.91.reconcile-tracker-resolution.md)
**Bug ID**: TASK-91-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-05

## Description

`_rp_dotenv_has_jira` tests `grep -qE '^JIRA_URL=.+' .env`. Three spellings are graded wrongly.

## Steps to Reproduce

Write each line into a repo-root `.env` with no `tracker:` key and source `resolve-platform.sh`:

| `.env` content | Resolved | Expected |
|---|---|---|
| `JIRA_URL=https://x.atlassian.net` | `jira` | `jira` ✅ |
| `export JIRA_URL=https://x.atlassian.net` | **`github`** | `jira` ❌ |
| `JIRA_URL=` + CRLF | **`jira`** | `github` ❌ |
| `JIRA_URL=""` | **`jira`** | `github` ❌ |

## Expected Behavior

`export JIRA_URL=…` is an extremely common `.env` spelling and means the same thing. An emptied
`JIRA_URL=` means *not set*, whatever the line ending.

## Actual Behavior

As tabled above — verified by execution.

## Impact

The **`export`** miss reproduces the original bug class exactly: a shell that sourced such a `.env` has
`JIRA_URL` exported and resolves `jira`, while the installer and any un-sourced shell resolve `github`.
That is install-one-platform-run-as-the-other, which is the defect this task exists to close.

The **CRLF** false-positive is worse in context: a trailing `\r` satisfies `.+`, so an explicitly
emptied key resolves `jira`. CRLF is the precise spelling task 83 was written to fix, reintroduced on
the other side of the same decision.

`JIRA_URL=""` also contradicts the comment shipped directly above the code, which claims "an empty
`JIRA_URL=` is not set on either side".

## Recommendation

Normalise before testing rather than widening the pattern indefinitely — strip a trailing `\r`,
optional leading `export`, and surrounding quotes, then test for a non-empty value. Update the comment,
which currently overstates the equivalence with the environment probe. Add each spelling to the parity
table so the grading is pinned rather than assumed.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-05

**Root Cause**: `grep -qE '^JIRA_URL=.+'` anchors on the bare key and treats *any* remaining character
as a value. It cannot see an `export` prefix, and a lone `\r` or a pair of quotes satisfies `.+`.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: replaced the grep with a small `awk` parser that accepts an optional
`export` prefix, strips a trailing `\r` and one surrounding quote pair, trims whitespace, and only then
asks whether anything is left. The quote class is built with `-v q="'"` because a literal single quote
cannot appear inside a single-quoted awk program — the usual place this kind of parser breaks.

**Files Modified**: `shared/resources/resolve-platform.sh` (+ `npm run bundle` → 38 skills)

**Testing**: a 10-row `DOTENV_CASES` table, each row asserting the two resolvers **agree** before
asserting what they agree on — plain, `export`, indented `export`, double-quoted value, CRLF-empty,
`""`, `''`, empty, commented-out, and `MYJIRA_URL=` (the prefix trap).

**Mutation-proven**: yes, and the proof corrected an earlier claim. Reverting the `export` clause turns
2 tests red. Reverting the **quote-stripping** turns 2 more red. Reverting the explicit `sub(/\r$/,"")`
alone turns **none** red — the whitespace trim already handles `\r`, so that line is redundant belt-and-
braces rather than load-bearing. Recorded as measured, not as assumed.
