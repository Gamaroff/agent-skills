# Bug Report: Task 67 — Fourteen more fail-open routes, found at the DoD gate

**Task**: [Link](./task.67.execute-the-skill-qa-gate.md)
**Bug ID**: TASK-67-BUG-3
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Closed
**Found By**: DoD security review (finalise, Step 7)
**Date Found**: 2026-08-31

## Description

After [BUG-1](./task.67.bug.1.classifier-fails-open.md) closed thirteen fail-open holes and QA gate 2
returned PASS, the DoD security review found **fourteen more**, all reproduced and several executed.

The gate 2 verification was not wrong — it re-tested the thirteen known inputs and they were closed.
It simply asked the same question again. The DoD review asked a different one: *what else gets through?*

## The fourteen

| # | Input | Reached |
|---|---|---|
| 1 | `who'am'i` | `runnable` — executed |
| 2 | `to"u"ch /tmp/x` | `runnable` |
| 3 | `t\ouch /tmp/x` | `runnable` |
| 4 | `/usr/bin/[t]ouch /tmp/x` | `runnable` |
| 5 | `/usr/bin/touc? /tmp/x` | `runnable` |
| 6 | `~/../../usr/bin/whoami` | `runnable` |
| 7 | `g\h pr comment 1 --body x` | `runnable` — **an explicitly deny-listed command** |
| 8 | `cu'r'l -X POST https://x/` | `runnable` — **an explicitly deny-listed command** |
| 9 | `cat <<EOF > /tmp/x` | `runnable` |
| 10 | `cat <<'EOF' >> ~/.zshrc` | `runnable` |
| 11 | `sed 's/a/b/' -i file.txt` | `runnable` |
| 12 | `sed -e 's/a/b/' -i file.txt` | `runnable` |
| 13 | `sort --output=/tmp/x file.txt` | `runnable` |
| 14 | `git diff --output=/tmp/x` | `runnable` |

## Root causes — three, not fourteen

**A. The fail-closed fix from cycle 1 was too narrow (#1–#8).**

BUG-1's CR-4 emitted `<unparseable>` only for a token starting with `$ ' " \``. But `stripNonCode`
blanks quote *contents* first, so `who'am'i` arrives as `who''i` — it starts with `w`, fails the
command-name test, and fell through the `break` that means *no command here*.

**A boundary an attacker defeats by adding one quote is not a boundary.** #7 and #8 are the proof: both
are on the deny-list by name, and both ran.

**B. The heredoc opener line was truncated before the redirect check (#9, #10).**

`stripProse` pushed `raw.slice(0, here.index)` — everything before `<<` — so a redirection *after* the
heredoc operator was discarded before `WRITE_REDIRECT` ever saw the line.

**C. Flag deny-patterns were anchored to argument position (#11–#14).**

`sed -i` was matched only immediately after `sed`. `--output=` and `-o` write a file while carrying no
`>` for the redirection rule to catch.

## Fix

| Cause | Fix |
|---|---|
| A | Unquote the token the way a shell does (`\` and `'"` removed) **before** reading the name; then treat **any** remaining unreadable token in command position as `<unparseable>` → `mutating`. A `case` arm pattern is the one exception, recognised by its trailing `)` — which is why the stripper stopped erasing bare parentheses |
| B | Keep the whole heredoc-opening line; only the body is dropped |
| C | `-i` anywhere in a `sed` invocation; `--output=`/`-o` as general write flags |

Two regressions were introduced by these fixes and caught by the existing suite before commit: the
arithmetic placeholder `0` became a "command name", and splitting on `&` left the file descriptor in
`2>&1` sitting in command position. Both fixed; `&` is no longer a split point after `<`/`>`.

## Verification

- **36 attack inputs** (BUG-1's 13 + these 14 + 9 further shapes: `bash -c`, `source`, `eval`, `xargs`,
  `&` backgrounding, `&&` chaining, bare `gh`/`curl`) — **0 reach `runnable`**
- **18 legitimate patterns** still runnable — no over-strictness
- **66 tests** in the module suite (was 61); **5 mutation proofs**, all held
- Deliberate, documented trade: a command name with *embedded* quotes (`l's'`) is refused even when the
  underlying command is safe. Quote contents are blanked before the name is read, so it reconstructs as
  `l`. No real documentation writes that, and a boundary that guesses at a half-erased name is worse
  than one that refuses it.

## Also corrected: an overclaim about the sandbox

The security review was right that the sentinel's radius is only the sandbox root. It detects a block
escaping *upward* out of its working copy; it does **not** see a write to an absolute path, because
there is no OS-level sandbox — `spawnSync` runs a real shell with the real `PATH` and `HOME`.

The rule document now says so. Classification is the primary boundary; the sentinel is a second line
beneath it, not a containment guarantee. The previous wording claimed more than the mechanism delivers.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-08-31 | New | DoD security review | 14 fail-open routes, several executed |
| 2026-08-31 | Closed | qa-fix | All 14 closed; 36/36 attack inputs blocked; 5 mutation proofs held |
