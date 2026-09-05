---
id: bug.6
title: "Ten more fail-open routes past the snippet classifier, plus two over-refusals — found by probe mode"
type: bug
description: "The qa-execute-snippets classifier still lets ten mutating inputs reach `runnable` after commit 0c4c05f closed bug.3's fourteen, and wrongly refuses two read-only `-o` usages. All twelve reproduce deterministically on current HEAD. Found by the probe mode delivered in task.73 — on its first real run."
tags: [qa, security, snippet-engine, fail-open, classifier]
status: ready-for-qa
severity: Major
priority: High
created: 2026-09-02
updated: 2026-09-05
related: 'none — cross-cutting (no single owner)'
found_by: task.73 probe mode (replay verification)
component: shared/resources/qa-execute-snippets.mjs
---

# Bug Report: Ten more fail-open routes past the snippet classifier

**Bug ID**: bug.6
**Related**: None — cross-cutting (no single owner)
**Status:** ✅ Ready for QA
**Severity:** Major
**Priority:** High
**Created**: 2026-09-02
**Found By**: task.73 probe mode (replay verification)

---

## Bug Description

**Summary**: `classifyBlock()` in `shared/resources/qa-execute-snippets.mjs` returns `runnable` for ten
inputs that mutate the filesystem, and returns `mutating` for two that are read-only. All twelve
reproduce deterministically on **`0c4c05f`** (the commit that closed `task.67.bug.3`) and on **current
HEAD** — the routes are open in shipped code today.

This was found by the DoD **probe mode** delivered in `task.73`, on its first real run, against a file
that two prior gates had passed. It is the third generation of the same defect: `task.67.bug.1` found 13
routes, `task.67.bug.3` found 14 more, this finds 10 more plus 2 over-refusals. (Those two predecessors
are **task-scoped bugs under `docs/tasks/task.67.execute-the-skill-qa-gate/`**, not the general
`docs/bugs/bug.1` and `docs/bugs/bug.3`, which are unrelated subjects.)

**Expected Behavior**: `classifyBlock()` returns `mutating` for every input that can write to the
filesystem, and `runnable` for every input that cannot. Both directions are part of the contract — the
classifier gates whether a documentation snippet is *executed*, so a wrong verdict in either direction
is a defect.

**Actual Behavior**: ten mutating inputs are classified `runnable` (so they would execute against the
developer's working tree), one further quoted-heredoc construct hides an arbitrary following command
from the scanner entirely, and two read-only inputs are classified `mutating` (so legitimate documented
commands are refused).

**Impact**: `classifyBlock` gates whether a documentation snippet is **executed** during `/qa-task` and
`/qa-story` Step 4b. A fail-open route means a mutating command in a doc block runs against the
developer's working tree. Severity is Major rather than Critical because the inputs must appear in a
repository's own documentation to be reached. The two over-refusals matter as much in the other
direction: a gate that refuses legitimate documented commands trains its users to bypass it.

## How it was found

`task.73`'s Replay Verification dispatched the new probe-mode prompt against `0c4c05f` expecting it to
report nothing. It executed 100 candidates and reported 13, of which 12 were then re-confirmed by a
standalone deterministic script (`classifyBlock` called directly on each input). The prompt reported
only candidates it had actually run, and correctly stayed silent on ~30 controls it ran and passed —
including quoted command names, a Cyrillic homoglyph, `! touch`, `elif touch`, `find -delete`, `tee`,
`rm -rf`, and 20 of 22 legitimate inputs. It is discriminating, not indiscriminate.

## Reproduction Steps

**Environment**: macOS (Darwin 25.5.0) / Node 20+, repo `agent-skills` at `develop` (`c9a6be3d`).
No special test environment — `classifyBlock` is a pure exported function.

**Steps to Reproduce**:

1. From the repo root, import `classifyBlock` from the engine source:

   ```bash
   node --input-type=module -e '
     const { classifyBlock } = await import("./shared/resources/qa-execute-snippets.mjs");
     console.log(classifyBlock("if touch /tmp/x; then echo hi; fi").klass);   // => "runnable"
     console.log(classifyBlock("echo pwned>/tmp/x").klass);                   // => "runnable"
     console.log(classifyBlock("git -C log push origin main").klass);         // => "runnable"
     console.log(classifyBlock("grep -o \x27foo\x27 README.md").klass);           // => "mutating"
   '
   ```

2. Observe that each of the first three prints `runnable` — every one of those commands writes to the
   filesystem or the remote.
3. Observe that the fourth prints `mutating` — `grep -o` is `--only-matching`, read-only.
4. Repeat for each row of the two tables in **The twelve** below; all reproduce.
5. The same holds against the historical commit that closed the previous generation:

   ```bash
   git show 0c4c05f:shared/resources/qa-execute-snippets.mjs > /tmp/postfix.mjs
   node --input-type=module -e '
     const { classifyBlock } = await import("/tmp/postfix.mjs");
     console.log(classifyBlock("if touch /tmp/x; then echo hi; fi"));  // => klass: "runnable"
   '
   ```

**Frequency**: Always
**Reproducible**: Yes — deterministic; `classifyBlock` is pure, with no I/O, clock or randomness.

## Evidence

**Test Output**: direct invocation of `classifyBlock` on each claimed input, current HEAD
(`c9a6be3d`). `BAD` = misclassified.

```
BAD  FAIL-OPEN 1            want=mutating  got=runnable  :: "if touch /tmp/x; then echo hi; fi"
BAD  FAIL-OPEN 2            want=mutating  got=runnable  :: "while touch /tmp/x; do break; done"
BAD  FAIL-OPEN 3            want=mutating  got=runnable  :: "until touch /tmp/x; do break; done"
BAD  FAIL-OPEN 4            want=mutating  got=runnable  :: "echo pwned>/tmp/x"
BAD  FAIL-OPEN 5            want=mutating  got=runnable  :: "cat README.md>/tmp/x"
BAD  FAIL-OPEN 6            want=mutating  got=runnable  :: "echo pwned>>/tmp/x"
BAD  FAIL-OPEN 7            want=mutating  got=runnable  :: "git -C log push origin main"
BAD  FAIL-OPEN 8            want=mutating  got=runnable  :: "sed -n 's/a/b/w /tmp/x' README.md"
BAD  FAIL-OPEN 9            want=mutating  got=runnable  :: "sed 'w /tmp/x' README.md"
BAD  FAIL-OPEN 10           want=mutating  got=runnable  :: "echo \"it's fine\"; touch /tmp/x; echo \"don't\""
BAD  FAIL-OPEN 11(heredoc)  want=mutating  got=runnable  :: "echo \"example: cat <<EOF\"\ntouch /tmp/x"
BAD  OVER-REFUSE 12         want=runnable  got=mutating  :: "grep -o 'foo' README.md"
BAD  OVER-REFUSE 13         want=runnable  got=mutating  :: "find . -name a -o -name b"
BAD  CTRL elif              want=mutating  got=runnable  :: "elif touch /tmp/x; then echo hi; fi"
OK   CTRL bang              want=mutating  got=mutating  :: "! touch /tmp/x"
OK   CTRL rm -rf            want=mutating  got=mutating  :: "rm -rf /tmp/x"
OK   CTRL find -delete      want=mutating  got=mutating  :: "find . -name a -delete"
OK   CTRL tee               want=mutating  got=mutating  :: "echo hi | tee /tmp/x"
OK   CTRL plain echo        want=runnable  got=runnable  :: "echo hello"
OK   CTRL git status        want=runnable  got=runnable  :: "git status"
```

Every claim in this report reproduces. The controls the original filing named as correctly handled
still are, **except `elif`**, which the filing recorded as safe and is not — see the correction under
Root cause A.

**Related Files**:

- `shared/resources/qa-execute-snippets.mjs` — the engine source (`classifyBlock`, `commandWords`,
  `stripNonCode`, `stripProse`, `WRITE_REDIRECT`, `DENY_PATTERNS`, `SHELL_KEYWORDS`)
- `shared/resources/tests/qa-execute-snippets.test.mjs` — the existing attack-input corpus
- Five bundled copies that the documented invocations actually name, all regenerated by
  `npm run bundle`: `skills/{qa-task,qa-story,develop-task,develop-story,double-check}/references/qa-execute-snippets.mjs`

---

## The twelve

> **Count note (review-bug):** the title says twelve and the tables below total twelve numbered rows,
> but the report also describes an unnumbered quoted-heredoc construct, so **thirteen** distinct inputs
> are claimed and all thirteen reproduce. The `elif` correction under Root cause A makes fourteen. The
> "twelve" naming is kept because the registry, the roadmap and `task.73`'s record all use it.

### Fail-open — mutating input classified `runnable` (10)

| # | Input | Mechanism |
|---|---|---|
| 1 | `if touch /tmp/x; then echo hi; fi` | `commandWords()` takes only the first token of a segment; `if` is in `SHELL_KEYWORDS`, so the segment is cleared and `touch` is never examined. The segment splitter splits on `do`/`then`/`else` but **not** on `if`. |
| 2 | `while touch /tmp/x; do break; done` | Same keyword swallow via `while`. |
| 3 | `until touch /tmp/x; do break; done` | Same keyword swallow via `until`. |
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

  > **Correction (review-bug, 2026-09-05).** The original filing said "`elif` and `!` are **not**
  > vulnerable — both probed and correctly refused". Re-probing the whole keyword family against
  > current HEAD shows that is wrong for `elif`, and that the vulnerable set is larger than the three
  > keywords listed above. The rule is mechanical: a keyword that the segment splitter **splits on**
  > (`then`, `else`, `do`) correctly exposes the command after it; a keyword that is in
  > `SHELL_KEYWORDS` but is **not** a split point swallows the rest of its segment. Verified verdicts
  > for `{keyword} touch /tmp/x`:
  >
  > | Swallows (→ `runnable`, wrong) | Correctly refuses (→ `mutating`) |
  > |---|---|
  > | `if`, `elif`, `while`, `until`, `for`, `case`, `esac`, `done`, `fi`, `function` | `then`, `else`, `do`, `time`, `coproc`, `!`, `{`, `(` |
  >
  > Two further constructs confirm the shape: `case x in a) touch /tmp/x;; esac` → `runnable`, while
  > `for f in a b; do touch /tmp/x; done` → `mutating` (the `do` splits it) and the multi-line
  > `if true; then\n  touch /tmp/x\nfi` → `mutating` (the newline after `then` splits it). The fix
  > must therefore scan **every** command in a segment rather than adding three names to a list —
  > patching `if`/`while`/`until` alone would leave `elif`, `for` and `case` open.
- **B. `WRITE_REDIRECT` boundary (#4–#6).** The pre-operator character class excludes `\w`, so
  no-space redirects escape.
- **C. Quote handling is not mutually aware (#10, heredoc case).** Single-quote blanking ignores
  double-quote context; heredoc detection ignores quote context.
- **D. `DENY_PATTERNS` flag semantics (#8, #9, #11, #12).** Flags are matched as strings without
  reference to the command they belong to — so `-o` over-matches and sed's `w` under-matches.

Root cause D is the same shape as bug.3's root cause C (flag deny-patterns anchored to position). The
recurring lesson is that a per-command flag table would end this class, where another round of regex
patching will not.

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

## Scope & Impact

**Affected area**: `shared/resources/qa-execute-snippets.mjs` and its five bundled copies. The engine is
consumed by `/qa-task` and `/qa-story` Step 4b (documentation snippet execution) and by `/finalise`'s
DoD security probe.

**Why it has no single owner**: the classifier is shared infrastructure. No single story or task owns
it — `task.67` built it, `task.73` built the probe that found these routes, and `task.79`/`task.80` plan
the corpus and probe engine around it. The defect belongs to the shared resource, so it is filed as a
general bug.

**How It Failed**: the classifier's contract is that `runnable` means "safe to execute against the
developer's working tree". For the ten inputs in the first table that guarantee does not hold, and for
the two in the second table the converse guarantee — that a read-only command is not needlessly refused
— does not hold either.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-05
**Developer**: develop-bug

**Reproduction**: `classifyBlock()` was called directly on all thirteen claimed inputs plus seven
controls at HEAD `c9a6be3d`. **All thirteen misclassified**; the seven controls behaved as the filing
described, with one exception — `elif touch /tmp/x; then echo hi; fi` returned `runnable`, though the
filing recorded `elif` as probed and correctly refused. Full output is in `## Evidence`. The same
thirteen also misclassify at `0c4c05f`, so the corpus discriminates across both commits.

**Root Cause Analysis**: four causes, exactly as the filing argued, each localised to a line:

- **A — `commandWords()` stops at a segment's first token** (`:486–524`). The segment splitter
  (`:473–478`) splits on `do`/`then`/`else` but not on `if`, and a keyword in command position ends
  the scan, so the rest of its segment is never examined. That is why `then`/`else`/`do` were never
  vulnerable and `if`/`while`/`until` always were — and why `elif`, `for`, `case`, `esac`, `done`,
  `fi` and `function` were vulnerable too, which the filing did not record. Separately, git's
  subcommand was resolved as the first token matching `/^[a-z][a-z-]*$/` after `git` (`:512–520`),
  which picks up the **operand** of `-C`.
- **B — `WRITE_REDIRECT`'s pre-operator class excluded `\d` and `\w`** (`:303–304`), so a redirection
  glued to the preceding word was invisible. The exclusion was unnecessary: `2>&1` is already held by
  the `(?!&\d)` lookahead.
- **C — quote handling was not mutually aware.** `stripNonCode` ran `'[^']*'` and then `"…"` as two
  independent passes (`:433–437`), so apostrophes inside double-quoted strings paired with each other
  and erased the code between them. `stripProse`'s heredoc detector (`:406`) read raw lines with no
  quote state, so a `<<EOF` inside a string set a terminator that never arrived and every following
  line was discarded as heredoc body — while bash still executed it.
- **D — flags were matched as strings with no reference to their command** (`:273–283`). `-o` was
  read as an output file for every command, over-refusing `grep -o` and `find -o`; sed's `w` write
  flag was named nowhere, under-refusing two real writes.

**Proposed Fix**: address A–D as four changes rather than patching thirteen inputs, and pin all
thirteen plus the `elif`/`case` variants in the existing replay corpus.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-05

**Root Cause**: as above — A) first-token-only segment scanning and flag-blind git subcommand
resolution; B) an over-narrow write-redirect pre-context; C) quote-state-unaware stripping and heredoc
detection; D) command-blind flag semantics.

**Fix Description**:

- **A.** `commandWords()` now tracks whether the next token is in command position and continues
  scanning past a keyword instead of abandoning the segment. Which keywords keep the scan alive is
  made explicit by `COMMAND_INTRODUCING_KEYWORDS` (`if`, `elif`, `while`, `until`, `then`, `else`,
  `do`, `!`) — a keyword followed by a command list keeps it, a keyword followed by a NAME or word
  list (`for`, `select`, `case`, `function`, `in`) or one that terminates a construct (`fi`, `done`,
  `esac`) ends it. A `case` arm's `)` re-opens command position so the arm body is scanned. Keywords
  are now resolved **before** the command-name test, because `[`, `[[` and `!` cannot look like
  command names and would otherwise be reported as unreadable command positions the moment the scan
  stopped halting at `if`. `gitSubcommand()` skips global flags and the operands they consume
  (`-C`, `-c`, `--git-dir`, …) before reading the subcommand.
- **B.** `WRITE_REDIRECT`'s pre-operator class narrowed to `[^<>&]`. Descriptor duplication stays
  runnable via the existing `(?!&\d)` lookahead; `/dev/null` stays exempt via the existing lookahead.
- **C.** A single `blankQuotedSpans()` walker replaces the two independent `.replace()` passes,
  tracking which quote is open and blanking span contents while preserving quote characters, length
  and newlines. An **unterminated** quote blanks nothing: the walker rewinds to where the unclosed
  quote opened and returns the original text from there. Without that rewind the fix for root cause C
  opened a new fail-open route of its own — `echo don't` followed by `touch /tmp/x` on the next line
  has one apostrophe and no closer, so blanking to the end of the block hid the `touch` from the scan
  while bash still ran it. The regex pair this replaced got that case right by accident, because
  `'[^']*'` simply does not match without a closer. The scanner must always see **more** text than
  bash will run, never less. Heredoc openers are still matched against the **raw** line — the quotes in `<<'EOF'`
  are syntax, and blanking them first would erase the terminator and expose the body — then rejected
  if the `<<` itself sat inside a quoted span, using the equal-length blanked copy to test the offset.
- **D.** The generic `-o` rule is scoped by naming the commands for which `-o` is *not* an output file
  (`grep`, `egrep`, `fgrep`, `rg`, `find`), so an unrecognised command still fails closed. A new
  `sed w write` deny pattern covers sed's `w` flag in both its substitute-flag and command spellings.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs` — the four fixes above
- `skills/{qa-task,qa-story,develop-task,develop-story,double-check}/references/qa-execute-snippets.mjs`
  — regenerated by `npm run bundle` (never edited directly)
- `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` — added `BUG6_FAIL_OPEN` (13) and
  `BUG6_OVER_REFUSED` (2) with shrinkage guards, a discriminating pre-fix assertion at `0c4c05f`, and
  shipped-code assertions in both directions
- `shared/resources/tests/qa-execute-snippets.test.mjs` — added five counterweight tests

**Testing**:

- **A new fail-open route introduced by this fix was caught in self-review and closed before commit**
  (the unterminated-quote case above), and is pinned by its own test. It is called out here because a
  fix for a fail-open defect that quietly opens another is the worst outcome available to this change.
- All 13 routes reach `runnable` at `0c4c05f` and none does in the shipped classifier; both
  over-refused inputs are `mutating` at `0c4c05f` and `runnable` in the shipped classifier. The corpus
  therefore discriminates rather than passing vacuously.
- Counterweight tests pin the other direction: `for f in a b; do …`, `if [ -n "$N" ]; …`,
  `if command -v zsh >/dev/null 2>&1; …`, `echo "a > b"`, `git -C /path status`, `2>&1`, `>&2`,
  `cat <<'EOF'` body shielding, `sort -o`, `git diff --output=` — all unchanged.
- **Mutation proofs — each fix reverted individually, with the suites re-run** (baseline 82 pass /
  0 fail): **A → 2 failures, B → 1, C → 1, D → 3**, and the unterminated-quote rewind proven
  separately. No fix is held by assertion alone.
- `bash -n` confirms the six keyword forms that still classify `runnable` (`done`/`fi`/`case`/`esac`/
  `for`/`function` followed directly by a command) are **bash syntax errors**, so they are not
  reachable routes.

**Verification Steps for QA**:

1. `node --test shared/resources/tests/qa-execute-snippets.test.mjs evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs`
   — expect all green, including the pre-fix discriminating half (needs full git history; it skips at
   clone depth 1 by design).
2. Confirm the five bundled copies match the source: `npm run bundle` must produce no diff.
3. Spot-check the accept direction — `grep -o` and `find … -o` must be `runnable`, or the gate is
   still training users to bypass it.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-02 | New | develop-task (task.73) | Filed — 12 routes found by task.73 probe mode, all reproduced deterministically |
| 2026-09-05 | New | review-bug | Fix-readiness review. Severity/priority unchanged (Major/High — confirmed correct). Added Expected/Actual, Environment, Frequency/Reproducible, Evidence, Related Files, Scope & Impact, Developer Fix Cycle, Status History and Resolution Summary sections; added `related` frontmatter and the Bug ID header. Corrected the claim that `elif` is not vulnerable (it is) and widened root cause A to the full swallowing-keyword set. Disambiguated the `bug-1`/`bug.3` citations to `task.67.bug.1`/`task.67.bug.3`. Folded the Change Log into this table — bug reports use Status History, not a Change Log. |
| 2026-09-05 | In Progress | develop-bug | Reproduced all 13 claims by direct execution at HEAD `c9a6be3d`; root causes A–D localised to exact lines; investigation started |
| 2026-09-05 | Ready for QA | develop-bug | Fix implemented as 4 changes (A–D) + regression corpus (13 fail-open, 2 over-refusal) + 5 counterweight tests. 82 pass / 0 fail. Two self-inflicted regressions caught and fixed before commit |

---

## Resolution Summary

[To be completed when the bug is closed]
