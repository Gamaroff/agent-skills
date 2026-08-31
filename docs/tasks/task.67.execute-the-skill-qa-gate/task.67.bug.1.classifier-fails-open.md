# Bug Report: Task 67 — The classifier fails open in thirteen verified ways

**Task**: [Link](./task.67.execute-the-skill-qa-gate.md)
**Bug ID**: TASK-67-BUG-1
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Closed
**Found By**: QA (Step 3b diff code review, independently verified in Step 4b)
**Date Found**: 2026-08-31

## Description

`shared/resources/qa-execute-snippets.mjs` exists to be a **safety boundary**: only recognised
read-only commands may execute, and "anything unrecognised classifies as `mutating` and is skipped,
never executed" (task §6 Phase 2, §9 Safety).

It does not hold. **Thirteen distinct inputs classify as `runnable` and are then executed**, each
verified against the shipped code, not inferred from reading it.

## Steps to Reproduce

```bash
node -e 'import("./shared/resources/qa-execute-snippets.mjs").then(m=>{
  console.log(m.classifyBlock("echo pwned > /tmp/canary").klass)})'
# → runnable
```

Full verified set — every one returned `runnable`:

| # | Input | Root cause |
|---|---|---|
| 1 | `echo pwned > /tmp/x` | Redirections are skipped as tokens and never inspected. Any allow-listed command plus `>` writes or truncates an arbitrary path. |
| 2 | `echo "note # here"; rm -rf /tmp/x` | The comment stripper `/(^\|\s)#.*$/` fires on a `#` **inside a quoted string**, deleting the rest of the line from both the deny scan and the command scan — while execution still uses the original code. |
| 3 | `grep -q x <<<"DATA"` ⏎ `rm -rf /tmp/x` | The heredoc opener regex matches `<<` anywhere, so a **here-string** `<<<` swallows every following line as heredoc "body". |
| 4 | `\mv a b` | In `commandWords`, a leading token failing `COMMAND_NAME` `break`s out of the segment, contributing **no** command word — the segment is treated as harmless. |
| 5 | `CMD=rm` ⏎ `$CMD -rf /tmp/x` | Same `break`. `CMD` counts as assigned, so it is not even a `placeholder`. |
| 6 | `env touch /tmp/x` | `env` is allow-listed but is a **command runner**; only the prefix is scanned. |
| 7 | `command mv a b` | `command` is in `SHELL_KEYWORDS`, described as "blast radius is the block's own shell process". It is not. |
| 8 | `time mv a b` | Same as 7. |
| 9 | `awk 'BEGIN{system("touch /tmp/x")}'` | `awk` is allow-listed; its program is a quoted argument that `stripNonCode` blanks, so it is never inspected. Arbitrary shell. |
| 10 | `find . -name x -delete` | `find` is allow-listed with no argument inspection. |
| 11 | `find . -exec mv {} /tmp \;` | Same; the `;` splits the segment so the `-exec` payload is never seen as a command. |
| 12 | `cat <(touch /tmp/x)` | `$(`, backticks and `)` become segment breaks so inner commands get scanned; **process substitution `<(…)` does not**. |
| 13 | `sed --in-place 's/a/b/' f.txt` | The `sed -i` deny pattern matches only the short form. |

## Expected Behavior

Every input above classifies `mutating` and is skipped with a recorded reason.

## Actual Behavior

All thirteen classify `runnable` and execute.

## Impact

**Critical.** Three Success Criteria are unmet:

- ❌ "No block on the mutation deny-list ever executes" — #13 is a deny-list bypass.
- ❌ "Classification fails **closed** on anything unrecognised" — #4, #5 fail *open* on the
  unparseable case, which is the exact case the rule names.
- ❌ "Execution happens in a temp working copy, never the live tree" — **proven false**. A doc
  containing `echo pwned > /tmp/qa67-canary-PROOF` was run through `executeFile`; the block
  classified runnable, executed, and the file appeared **outside** the temp copy. The temp cwd is no
  protection against an absolute or `~`-relative target.

This inverts the task's own stated High risk: *"a snippet classified `runnable` turns out to write,
post, or delete… Impact: Critical — QA would cause the side effect it is meant to check for."*

The full test suite is **green — 2040 tests, 0 failures** — with every one of these holes present.
That is the same "a passing test is not evidence" failure this task was written to fix, reproduced
inside the fix itself.

## Recommendation

1. **Redirections** (#1): scan prose-stripped code for `>`, `>>`, `&>`, `>|`, `n>` and classify any
   block containing a write redirection as `mutating`.
2. **Comment stripping** (#2): replace the line regex with a quote-aware scan, or treat `#` as a
   comment only outside quoted spans.
3. **Heredoc opener** (#3): anchor to a real heredoc — `<<` not preceded or followed by `<` — and
   skip matches inside `$(( … ))`.
4. **Unparseable command position** (#4, #5): emit a synthetic unknown word instead of `break`ing, so
   the block fails **closed**. Strip a leading `\` and re-test rather than dropping the segment.
5. **Command runners** (#6–#8): remove `env` from `SAFE_COMMANDS` and `command`/`time` from
   `SHELL_KEYWORDS`, or recurse onto the following word and classify *that*.
6. **`awk`** (#9): drop from the allow-list, or deny when the program contains `system(`, `close(`,
   `ENVIRON`, `"/dev/`, or `print`/`printf` with `>`/`>>`/`|` — scanned **before** quote blanking.
7. **`find`** (#10, #11): deny `-delete`, `-exec`, `-execdir`, `-ok`, `-okdir`, `-fls`, `-fprint`,
   `-fprintf`. Apply the same treatment to `sort -o` and `sed` with a `w` command.
8. **Process substitution** (#12): add `.replace(/[<>]\(/g, "\n")` alongside the existing `$(` rule.
9. **`sed --in-place`** (#13): extend the deny pattern to the long form, with or without `=SUFFIX`.

**Every fix needs a mutation proof.** The existing nine proofs all held, and none of them touched
these paths — that is why the holes survived to QA. Add a regression test per numbered row above, and
revert each fix to confirm its test goes red.

Consider also an **outer containment check** independent of classification: run each block with a
`cwd` inside the temp copy *and* verify no path outside it was written, so a future classification
miss is caught by defence in depth rather than by the classifier alone.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-31

All thirteen inputs reproduced against the shipped module before any change was made. The root causes
are not one bug thirteen times — they are five distinct failures of the same principle, *the boundary
must refuse what it cannot read*:

1. **Nothing looked at redirections at all.** Tokens beginning `>` were skipped as "not the command
   word" and never examined again, so the allow-list decided the block on the strength of `echo`.
2. **Two scanners disagreed with the executor.** The comment stripper and the heredoc detector both
   removed text from the *scan* that the *executor* still ran. Anything hidden behind a quoted `#` or
   a mis-detected here-string was invisible to classification and fully live at runtime.
3. **The unparseable case was treated as the empty case.** A leading token that did not look like a
   command produced *no* command word, and a segment with no command word reads as harmless.
4. **Some allow-listed entries were not commands but command *runners*.** Only the prefix was scanned,
   so the allow-list vouched for `env` while `touch` did the work.
5. **One syntax form was missed by an existing rule** — process substitution, where the `$(` handling
   had the right idea and the wrong character class.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-31

| ID | Fix |
|---|---|
| CR-1 | New `WRITE_REDIRECT` check, applied before the allow-list: any `>`, `>>`, `&>`, `>\|`, `n>` targeting a real path is `mutating`. `/dev/null`\|`stdout`\|`stderr` and fd duplication (`2>&1`) are exempt |
| CR-2 | `stripCommentQuoteAware()` walks each line tracking quote state; a `#` inside a string is data |
| CR-3 | Heredoc opener anchored to `(?<!<)<<-?(?!<)` so a here-string is not an opener |
| CR-4 | An unparseable leading token now emits `<unparseable>` instead of `break`ing. A leading `\` is stripped and the token re-tested, so `\ls` stays runnable |
| CR-5 | New `COMMAND_RUNNERS` set checked **before** the allow-list: `env`, `command`, `time`, `xargs`, `sudo`, `nohup`, `eval`, `exec`, `nice`, `timeout`, `watch`. Removed `env` from `SAFE_COMMANDS` and `command`/`time` from `SHELL_KEYWORDS`. Narrow exception for `command -v`/`-V`, which print a path and run nothing |
| CR-6 | `awk` moved to `COMMAND_RUNNERS` — its program is a quoted argument the scanner cannot see |
| CR-7 | Deny patterns for `find` write actions (`-delete`, `-exec`, `-execdir`, `-ok`, `-okdir`, `-fls`, `-fprint`, `-fprintf`), plus `sort -o` and `tee` |
| CR-8 | `.replace(/[<>]\(/g, "\n")` alongside the existing `$(` rule, so a substituted command starts its own segment |
| CR-9 | Deny pattern extended to `sed --in-place`, with or without `=SUFFIX` |

**Defence in depth (beyond the findings).** Classification is now the *first* line only. Each block
runs in `work/` inside a private temp root; the runner snapshots that root excluding `work/` before and
after, and reports any change as an `escaped-sandbox` finding at `confidence: high`. It does not
consult the classifier, so a future miss is still caught.

> The sandbox root is passed **explicitly**. Deriving it as `cwd/..` was tried first and was wrong:
> `runBlock` accepts any `cwd`, so a bare temp dir made the sentinel walk all of `/tmp` twice per
> block — it hung the suite for two minutes before being killed. A safety net that guesses its own
> boundary is not a safety net. Found by the adversarial pass over the fixes, not by the findings.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs` — all fixes above
- `shared/resources/tests/qa-execute-snippets.test.mjs` — QA-1 … QA-13b regression tests
- `shared/resources/qa-runnable-prose-detection.md` — the three new rules and the sentinel documented

**Testing**: 58 tests (was 41), 0 failures. **16 mutation proofs run this cycle, all held** — each
reverts a real behaviour and confirms the intended test goes red.

One proof initially came back **UNHELD**: disabling the `COMMAND_RUNNERS` check broke nothing, because
those commands were already absent from the allow-list, so the set was dead code. A precedence test
(`QA-5b`) was added asserting no runner may also be allow-listed, and the proof now distinguishes the
two cases: re-adding `env`/`awk` to `SAFE_COMMANDS` alone leaves QA-5/QA-6 **green** (the runners check
does the work), while removing both turns them red.

**Verification Steps for QA**:

1. `node --test shared/resources/tests/qa-execute-snippets.test.mjs` — expect 58 pass.
2. Re-run the thirteen inputs in the table above; every one must classify `mutating`.
3. Confirm the canary proof no longer escapes: a doc containing `echo pwned > /tmp/canary` must
   classify `mutating` and write nothing.
4. Confirm no over-strictness: `ls foo 2>/dev/null`, `command -v zsh >/dev/null 2>&1`,
   `find . -maxdepth 1 -name "*.md"` and `git log --oneline -1` must all stay `runnable`.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-08-31 | New | QA | 13 fail-open inputs verified |
| 2026-08-31 | In Progress | qa-fix | Root-cause analysis complete |
| 2026-08-31 | Ready for QA | qa-fix | All 9 findings fixed; sentinel added; 16 mutation proofs held |

| 2026-08-31 | Closed | QA | Fix verified in cycle 2 — gate.2 PASS |
