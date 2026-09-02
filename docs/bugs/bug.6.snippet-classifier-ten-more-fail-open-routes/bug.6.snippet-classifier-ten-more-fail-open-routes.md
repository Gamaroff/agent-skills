---
id: bug.6
title: "Ten more fail-open routes past the snippet classifier, plus two over-refusals — found by probe mode"
type: bug
description: "The qa-execute-snippets classifier still lets ten mutating inputs reach `runnable` after commit 0c4c05f closed bug.3's fourteen, and wrongly refuses two read-only `-o` usages. All twelve reproduce deterministically on current HEAD. Found by the probe mode delivered in task.73 — on its first real run."
tags: [qa, security, snippet-engine, fail-open, classifier]
status: open
severity: Major
priority: High
created: 2026-09-02
updated: 2026-09-02
found_by: task.73 probe mode (replay verification)
component: shared/resources/qa-execute-snippets.mjs
---

# Bug Report: Ten more fail-open routes past the snippet classifier

**Status:** Open
**Severity:** Major
**Priority:** High

---

## Summary

`classifyBlock()` in `shared/resources/qa-execute-snippets.mjs` returns `runnable` for ten inputs that
mutate the filesystem, and returns `mutating` for two that are read-only. All twelve reproduce
deterministically on **`0c4c05f`** (the commit that closed bug.3) and on **current HEAD** — the routes
are open in shipped code today.

This was found by the DoD **probe mode** delivered in `task.73`, on its first real run, against a file
that two prior gates had passed. It is the third generation of the same defect: bug-1 found 13 routes,
bug.3 found 14 more, this finds 10 more plus 2 over-refusals.

## How it was found

`task.73`'s Replay Verification dispatched the new probe-mode prompt against `0c4c05f` expecting it to
report nothing. It executed 100 candidates and reported 13, of which 12 were then re-confirmed by a
standalone deterministic script (`classifyBlock` called directly on each input). The prompt reported
only candidates it had actually run, and correctly stayed silent on ~30 controls it ran and passed —
including quoted command names, a Cyrillic homoglyph, `! touch`, `elif touch`, `find -delete`, `tee`,
`rm -rf`, and 20 of 22 legitimate inputs. It is discriminating, not indiscriminate.

## Reproduction

```bash
git show 0c4c05f:shared/resources/qa-execute-snippets.mjs > /tmp/postfix.mjs
node -e '
  const { classifyBlock } = await import("/tmp/postfix.mjs");
  console.log(classifyBlock("if touch /tmp/x; then echo hi; fi"));  // => klass: "runnable"
' --input-type=module
```

## The twelve

### Fail-open — mutating input classified `runnable` (10)

| # | Input | Mechanism |
|---|---|---|
| 1 | `if touch /tmp/x; then echo hi; fi` | `commandWords()` takes only the first token of a segment; `if` is in `SHELL_KEYWORDS`, so the segment is cleared and `touch` is never examined. The segment splitter splits on `do`/`then`/`else` but **not** on `if`. |
| 2 | `while touch /tmp/x; do break; done` | Same keyword swallow via `while`. |
| 3 | `until touch /tmp/x; do break; done` | Same keyword swallow via `until`. (`elif` and `!` are **not** vulnerable — both probed and correctly refused.) |
| 4 | `echo pwned>/tmp/x` | `WRITE_REDIRECT` requires `(?:^\|[^<>&\d\w])` before the operator, so a `>` glued to the preceding word character is missed. |
| 5 | `cat README.md>/tmp/x` | Same no-space redirect gap. |
| 6 | `echo pwned>>/tmp/x` | Same, append form. |
| 7 | `git -C log push origin main` | `commandWords()` resolves the git subcommand as the first token after `git` matching `/^[a-z][a-z-]*$/`, which picks up the `-C` **operand** `log` → `git:log` (allow-listed). `/\bgit\s+push\b/` also misses because of the intervening flag. |
| 8 | `sed -n 's/a/b/w /tmp/x' README.md` | `DENY_PATTERNS` names only `-i` / `--in-place`. sed's `w` flag writes a file with neither. |
| 9 | `sed 'w /tmp/x' README.md` | Same gap, bare `w` command. |
| 10 | `echo "it's fine"; touch /tmp/x; echo "don't"` | `stripNonCode()` blanks `'[^']*'` without tracking double-quote state, so the two apostrophes inside double-quoted strings pair up and erase everything between them — including `touch …` — before the scan. |

A related quote-unaware case also reproduces: a `<<EOF` **inside a quoted string** is treated as a real
heredoc opener by `stripProse()`, discarding every following line as heredoc body:

```
echo "example: cat <<EOF"
touch /tmp/x                 # never scanned; executes under bash
```

### Over-refusal — read-only input classified `mutating` (2)

| # | Input | Why it is wrong |
|---|---|---|
| 11 | `grep -o 'foo' README.md` | `/\s-o\s+\S/` assumes `-o` always means output-file. For `grep`, `-o` is `--only-matching` — read-only. |
| 12 | `find . -name a -o -name b` | For `find`, `-o` is the **OR operator**, not an output file. |

These matter as much as the fail-open ones: a gate that refuses legitimate documented commands trains
its users to bypass it.

## Root causes — four, not twelve

- **A. `commandWords()` segment handling (#1–#3, #7).** First-token-only extraction plus an incomplete
  keyword split list; git subcommand resolution does not skip flag operands.
- **B. `WRITE_REDIRECT` boundary (#4–#6).** The pre-operator character class excludes `\w`, so
  no-space redirects escape.
- **C. Quote handling is not mutually aware (#10, heredoc case).** Single-quote blanking ignores
  double-quote context; heredoc detection ignores quote context.
- **D. `DENY_PATTERNS` flag semantics (#8, #9, #11, #12).** Flags are matched as strings without
  reference to the command they belong to — so `-o` over-matches and sed's `w` under-matches.

Root cause D is the same shape as bug.3's root cause C (flag deny-patterns anchored to position). The
recurring lesson is that a per-command flag table would end this class, where another round of regex
patching will not.

## Impact

`classifyBlock` gates whether a documentation snippet is **executed** during `/qa-task` Step 4b. A
fail-open route means a mutating command in a doc block runs against the developer's working tree.
Severity is Major rather than Critical because the inputs must appear in a repository's own
documentation to be reached.

## Suggested fix

Do not patch the twelve individually. Address A–D:

1. Split segments on the full keyword set including `if`/`while`/`until`, and scan **every** command in
   a segment rather than the first token.
2. Widen the `WRITE_REDIRECT` pre-context to allow a word character before `>`/`>>`.
3. Make `stripNonCode` quote-state aware (single quotes inside double quotes are literal, and vice
   versa), and make heredoc detection skip quoted spans.
4. Replace string-matched flags with a per-command flag table so `-o` resolves per command and sed's
   `w` is covered.

Add each of the twelve inputs to the existing attack-input corpus so the next regression is caught by
`npm test` rather than by the next probe run.

## Change Log

| Date       | Version | Description                                                                 | Author         |
| ---------- | ------- | --------------------------------------------------------------------------- | -------------- |
| 2026-09-02 | 1.0     | Filed — 12 routes found by task.73 probe mode, all reproduced deterministically | develop-task |
