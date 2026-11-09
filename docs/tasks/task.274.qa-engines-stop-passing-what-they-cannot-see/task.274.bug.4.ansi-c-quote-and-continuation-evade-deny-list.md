# Bug Report: Task 274 - ANSI-C quoting and line continuation still evade the deny-list

**Task**: [Link](./task.274.qa-engines-stop-passing-what-they-cannot-see.md)
**Bug ID**: TASK-274-BUG-4
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-09

## Description

`classifyBlock` in `shared/resources/qa-execute-snippets.mjs` judges the deny-list twice: as written, and with `'`, `"` and `\` removed ("as the command receives them"). That second reading is false for two forms, and both classify `runnable`:

- ANSI-C quoting: `find w $'-delete'` strips to `$-delete`, which no deny pattern matches. The variable-argument rule (shape 4) does not catch it either, because `$'` is not `$` followed by a name character.
- Backslash-newline continuation: `find w -dele\` then `te` on the next line strips only the backslash, leaving `-dele` + newline + `te`.

## Steps to Reproduce

Run `classifyBlock` on each block, then run the block under bash in a scratch directory:

- `find w $'-delete'`
- `find w -dele\<newline>te`

Controls: `find w -delete` classifies `mutating` (correct); `find docs -name x` classifies `runnable` (correct).

## Expected Behavior

Both hostile blocks are refused as `mutating`. The task's scope names `find docs "-delete"` "and its quote variants" (obs #67).

## Actual Behavior

Both classify `runnable` (`{klass:"runnable", reason:null}`), on this branch and on `origin/develop`. Executed under bash in a scratch directory, each one deleted its target directory.

## Impact

A skill doc could hide `find ... -delete` behind `$'-delete'` or a line continuation and Step 4b would execute it. Same class as TASK-274-BUG-2, in a quote form that fix did not cover.

## Recommendation

Fold backslash-newline (and CRLF) continuations before classification. Treat `$'...'` and `$"..."` as an unanalysable argument to a deny-listed command and refuse it, or decode it before the deny-list pass. Add both hostile blocks to the base-scan shape table with the two controls, and mutation-prove each.

Origin: code-review CR-1, reproduced by QA (confidence `high` as returned, unchanged). Provenance: identical output on base, but the task's scope names this class, so it is unfinished work and not pre-existing.

## Developer Fix Cycle

### Iteration 1

**Root cause**: the "as the command receives them" reading removed `'`, `"` and `\` but the shell also decodes `$'…'` and `$"…"` and removes a backslash-newline before it reads a word, so neither form ever reached a deny pattern.

**Move** (Step 2.6, trigger: repeat subject): narrow the contract. A deny-list over shell text cannot decode every quote form, so the scan refuses the ambiguous ones instead of adding a decoder. `hasDecodedQuote` refuses an unquoted `$'…'` or `$"…"` argument to a deny-listed command; a backslash-newline is folded (odd runs only) before every scan.

**Fix**: `classifyInternal` folds continuations right after `stripProse`; `variableArgumentToDenyListed` calls `hasDecodedQuote` on each argument. The reason text now names the general rule. `qa-runnable-prose-detection.md` and the CHANGELOG entry state it.

**Tests**: five hostile rows in the base-scan shape table (ANSI-C, ANSI-C hex, locale quote, flag split by continuation, variable split by continuation) and four controls (`'cost$'`, `"a$"`, a continuation before `-type f`, `git` split from `log`). Mutation proof: dropping the fold turns two tests red, dropping the `hasDecodedQuote` call turns three red, and widening the opener to any `$` turns the controls red.

**Probe**: population of the rule's restatements: `qa-runnable-prose-detection.md` (updated), `CHANGELOG.md` (updated), task document (cites the shapes, restates no rule). Real docs: 3,435 shell blocks classified before and after, 0 newly refused, 0 newly runnable. Regex timing on 320,000 backslashes: 125 ms, linear.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-09 | New | qa-task | Found in QA cycle 2 refute pass |
| 2026-11-09 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix; regression tests and mutation proofs added |
| 2026-11-09 | Closed | qa-task | Verified by task.274.qa.3.qa-engines-stop-passing-what-they-cannot-see.md |
