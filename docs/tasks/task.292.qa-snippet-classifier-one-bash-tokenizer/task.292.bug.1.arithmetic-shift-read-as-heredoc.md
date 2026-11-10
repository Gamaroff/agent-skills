---
id: task.292.bug.1
title: "A left shift inside $[ ] is read as a heredoc, hiding a write from the classifier"
type: bug
status: ready-for-qa
severity: high
priority: P0
created: 2026-11-10
updated: 2026-11-10
---

# Bug Report: Task 292 - A left shift inside `$[ ]` is read as a heredoc

**Task**: [Link](./task.292.qa-snippet-classifier-one-bash-tokenizer.md)
**Bug ID**: TASK-292-BUG-1
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer (diff code review CR-1, reproduced by execution)
**Date Found**: 2026-11-10

## Description

`tokenize` reads every `<<` in code position as a heredoc opener (`shared/resources/qa-execute-snippets.mjs`, the `readHeredocOpener` call in the lexer). Inside the legacy arithmetic form `$[ ... ]`, bash reads `<<` as a left shift. The tokenizer then treats the lines up to a line equal to the word after `<<` as heredoc body and hides them, while bash runs them.

## Steps to Reproduce

Block (three lines, the last is `z`):

```
echo $[1<<z]
touch /tmp/qa292-a
z
```

1. `classifyBlock(block)` on this branch returns `{klass: "runnable"}`.
2. `bash` run on the same text creates `/tmp/qa292-a` (`z` is then reported as a command not found).

Control: `echo $((1<<z))` with the same lines classifies `mutating` (unparseable, fail-closed), and a real heredoc (`cat <<z`, `hi`, `z`) stays `runnable`.

## Expected Behavior

The classifier refuses the block (`mutating`). The task's own rule: a shape the tokenizer does not model throws, and arithmetic is out of scope, so it must be refused rather than read as something else.

## Actual Behavior

`runnable`. A write is classified safe.

## Impact

QA would execute a block that writes. Same class as T290-QA-3, which this task exists to close. `develop`'s engine gives the same verdict for the `$[` shape (and also for `$((1<<z))`), so the shape is not new, but the task's expected outcome ("the next random probe finds no neighbour") does not hold while it is open. No tracked Markdown contains the shape.

## Recommendation

In the lexer, throw (refuse) when `<<` is met inside a `$[` body, and add `$[` as an unmodelled arithmetic opener (throw on `$[` itself is the simplest fail-closed choice). Add rows for `$[1<<z]` and `$((1<<z))` with a trailing writer, and add `$[` / `<<` to the differential atom sets so the random run can find it.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-10

**Root cause**: the lexer read every `<<` in code position as a heredoc opener. Bash reads it as a left shift inside `$[ ]`, inside an arithmetic command `(( ))` and inside an assignment subscript `name[ ]=`, so the lines up to a line equal to the delimiter were hidden while bash ran them.

**Fix** (`shared/resources/qa-execute-snippets.mjs`, `lexBash`): `$[` is refused; a `<<` inside an open `(( ))` is refused (tracked with `arith` and `arithInner`; a plain subshell `( cat <<z … )` stays a heredoc); a `<<` in a word with an unclosed `[` is refused. All three refuse, so every verdict moves towards `mutating`.

**Found on the way**: the first fix (refuse `$[` only) left `echo ;(($()$()<<z))` plus a writer runnable. The new `arith` differential atom set found it (seed 11, writes 1). Fixed in the same cycle; seeds 11, 12, 13 now show 0 writes over 60000 blocks each.

**Tests**: `T292_SHIFTS` rows (9 shapes, all `mutating`), a control row (real heredoc, quoted `$[`, subshell heredoc, closed bracket stay `runnable`), two tokenizer unit rows. Mutation: reverting the `$[` refusal reds 3 tests; removing the `(( ))` refusal reds 2; removing the subscript refusal reds the tokenizer unit row only (the classify-level `a[1<<z]=1` row is also refused by the command allow-list, so it does not isolate the refusal).

**Verification steps for QA**: `node scripts/qa-snippets-differential.mjs --atoms arith --count 60000 --seed 11`; `node scripts/qa-snippets-docscan.mjs` (0 newly runnable, 0 newly refused); `CI=true npm run ci:fast`.

### Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-11-10 | New          | qa-task    | Found by diff review CR-1      |
| 2026-11-10 | Ready for QA | qa-fix     | Refusals added, tests, bundles |
