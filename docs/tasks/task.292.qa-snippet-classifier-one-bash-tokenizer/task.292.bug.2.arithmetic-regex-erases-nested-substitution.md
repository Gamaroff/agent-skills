---
id: task.292.bug.2
title: "The arithmetic-removal regex erases a command substitution inside $(( )), hiding a write from the classifier"
type: bug
status: ready-for-qa
severity: high
priority: P0
created: 2026-11-10
updated: 2026-11-10
---

# Bug Report: Task 292 - Arithmetic-removal regex erases a nested substitution

**Task**: [Link](./task.292.qa-snippet-classifier-one-bash-tokenizer.md)
**Bug ID**: TASK-292-BUG-2
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, diff code review CR-1, reproduced by execution)
**Date Found**: 2026-11-10

## Description

`commandInvocations` in `shared/resources/qa-execute-snippets.mjs` (line 2557) removes arithmetic expansion with `.replace(/\$\(\([^)]*\)\)/g, " ")`. The class `[^)]*` stops at the first `)`, so a command substitution or a backtick inside the arithmetic body is deleted with it, and the command scan never sees the inner command. The tokenizer reads the inner `$(` correctly; the regex is a second, wrong copy of bash's paren-matching rule, which is the kind of copy this task exists to remove.

## Steps to Reproduce

`classifyBlock` on each block below returns `runnable`; real bash runs `touch W` and creates `W`:

```
echo $((1+$(touch W)))
x=$((1+$(touch W)))
echo $((1+`touch W`))
echo "$((1+$(touch W)))"
```

Heredoc body form (bash expands `$(( ))` in an unquoted heredoc body): `cat <<z`, `$((1+$(touch W)))`, `z`.

Controls: `echo $((1))` and `echo $((1+2)); touch W` (the writer is outside the arithmetic) classify as expected (`runnable` and `mutating`). `echo $(( (1) + $(touch W) ))` and `echo $((a[$(touch W)]))` are already `mutating`.

## Expected Behavior

`mutating`: a command substitution inside arithmetic is a command.

## Actual Behavior

`runnable`. A write is classified safe.

## Impact

QA would execute a block that writes. Same class as T290-QA-3 and bug 1. `develop`'s engine gives the same verdict, and no tracked Markdown contains the shape (checked with a grep for `$((` bodies holding `$(` or a backtick). The differential's `arith` set cannot reach it: it has no operator atom, so `$((` never meets `+` before a `$(`.

## Recommendation

Drive arithmetic removal from the tokenizer instead of `[^)]*`, or refuse in the lexer a `$((` body that holds `$(` or a backtick (a verdict only moving towards `mutating`; confirm the docs scan shows 0 newly runnable). Add rows for the four blocks above plus the heredoc form, add an operator atom (`+`) to the `arith` set so the random run can reach the shape, and mutation-prove the fix.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-10

**Root cause**: `commandInvocations` removed arithmetic expansion with `/\$\(\([^)]*\)\)/g`, a second copy of bash's paren-matching rule. `[^)]*` stops at the first `)`, so a `$( )` or backtick inside the body went with it and the command scan never saw the inner command.

**Fix** (`shared/resources/qa-execute-snippets.mjs`, `lexBash`): `openSubst` now calls `refuseArithSubst` for a `$((` and refuses when the body, matched by paren depth, holds `$(` or a backtick. The check sits in `openSubst`, so the code, double-quote, heredoc-body and `${…}` paths all pass through it. Every caller of the tokenizer fails closed, and the stop-at-first-hit scan stays linear on a run of `$((`. The regex at the old site is left in place: with the lexer refusing, it only ever sees bodies it handles correctly.

**Class sweep** (the second HIGH on this file): every `.replace(/…/)` in the engine was read. The two that blank `(( … ))` and `[[ … ]]` (`blankConditionalSpans`) use the same stop-at-first-closer pattern but feed the write-redirection path only; the command scan reads the original text. Probed: `(( x = $(touch W) ))`, ``(( 1 + `touch W` ))``, `[[ $(touch W) ]]`, `[[ -n ${x[1]} || $(touch W) ]]`, `(( 1 + $((2)) )); touch W` all classify `mutating` already. The `WORD` and assignment regexes stay a follow-up (documented in gate 2 `recommendations.future`).

**Tests**: seven blocks in `T292_ARITH_SUBST` (plain, assignment, backtick, double quotes, unquoted heredoc body, `${x:-…}`, nested), a control row (plain arithmetic stays runnable), a tokenizer unit row. Suite 371/371.

**Mutation proof**: removing the `refuseArithSubst` call turns eight tests red (the seven rows and the tokenizer row); restored from a `cp` snapshot, `cmp` clean.

**Instrument**: the `arith` set gained `+`, `$(touch out)` and a backtick writer. Calibration: the pre-fix engine (`aac91b15`) shows a write at seed 51 (`echo <<z $((`touch out`;))<<z`); the fixed engine shows 0 writes at seeds 51, 52, 53 (60000 blocks each) and across all six sets at seed 54 (30000 each).

**Docs scan**: 3445 blocks, runnable 257 → 257, 0 newly runnable, 1 newly refused (`task.45…bug.1…md:76`, a `$(( $(grep -c …) % 2 ))` check). That is an over-refusal towards `mutating`, which the policy allows.

**Verification steps for QA**: `command node scripts/qa-snippets-differential.mjs --atoms arith --count 60000 --seed 61`; `command node scripts/qa-snippets-docscan.mjs`; `CI=true npm run ci:fast`.

### Status History

| Date       | Status       | Changed By | Notes                                      |
| ---------- | ------------ | ---------- | ------------------------------------------ |
| 2026-11-10 | New          | qa-task    | Found by cycle 2 refute pass, CR-1         |
| 2026-11-10 | Ready for QA | qa-fix     | Lexer refuses a substitution in `$(( ))`   |
