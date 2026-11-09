---
id: task.290.plan
title: "Implementation Plan: QA snippet runner reads a # after an escaped space as a comment"
type: plan
task-ref: task.290.qa-snippet-runner-comment-after-escaped-space.md
---

# Implementation Plan: QA snippet runner reads a # after an escaped space as a comment

> Requirements and success criteria: [task.290.qa-snippet-runner-comment-after-escaped-space.md](task.290.qa-snippet-runner-comment-after-escaped-space.md)

## Overview

Give the classifier one rule for "this `#` starts a comment", make `closingParen` non-recursive, and add a differential test that runs what the classifier trusts under real bash.

## Phase-by-Phase Implementation Guide

### Phase 1: One comment rule, an iterative `closingParen`, a differential test

**Files to modify:**
- `shared/resources/qa-execute-snippets.mjs` - the comment rule, `closingParen`, a fail-closed catch
- `shared/resources/tests/qa-execute-snippets.test.mjs` - gap rows, controls, the differential test
- `shared/resources/qa-runnable-prose-detection.md` - one sentence

**Exact changes:**

1. Reproduce first, on the unchanged engine, and keep the output for the QA report:
   `echo a\ # ; touch out` → `runnable`, and `bash -c` on it creates `out`.
2. In `stripNonCode`'s line scan (the loop around `c === "#" && !single && !double`), skip the character after a backslash when outside single quotes. The loop today handles `\` only when `double` is set.
3. Add `startsComment(text, i)`: true when `text[i] === "#"` and `i === 0` or the previous character is unquoted whitespace, `;`, `&`, `|`, `(` or a newline **and was not consumed by a backslash**. Use it in `closingParen`, in place of its inline test. Check `sedScan`'s `#` case against bash's `sed` grammar and change it only if it disagrees.
4. `closingParen`: replace the recursion on a double-quoted `$(` with an explicit stack, or count depth and return -1 above a bound. Return -1 means unreadable, which the caller already refuses.
5. Wrap the body of `classifyInternal` (or its exported entry points) in a try/catch that returns `mutating` with reason `unrecognised-command: <unparseable> (fail-closed)`.
6. Tests, beside the task.289 rows in `T289_GAPS` and `T289_CONTROLS`: the gap rows and controls named in the task's section 8.
7. Differential test: build blocks from a writer list crossed with a context list, keep those `classifyBlock` calls `runnable`, run each with `bash -c` in a `mktemp -d` directory seeded with an input file, and assert the directory's file list is unchanged. Remove the directory in a `finally`. Assert the generated count and the executed count are above floors (200 and 1).

## Key Patterns and References

- `maskSubstitutions` and `closingParen` from task.289 are the code under change; the comment before `closingParen` explains why quotes and comments hide a paren.
- The mutation method used in task.289: snapshot with `cp`, split-replace the change out, run the suite, restore, `cmp`.
- The docs-scan comparison used in task.289 compares `develop`'s engine with the new one over every fenced block; the requirement is 0 newly runnable.

## Testing Approach

Run `CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs` for the unit rows, then `CI=true npm run ci:fast`. Mutation-prove: put the escaped-space behaviour back and name the red test; put the recursion back and name the red test.
