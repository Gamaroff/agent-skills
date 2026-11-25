---
id: task.315.plan
title: "Implementation Plan: qa-fix Step 4 guard reads quoted gitlink paths"
type: plan
task-ref: task.315.qa-fix-step4-guard-reads-quoted-gitlink-paths.md
---

# Implementation Plan: qa-fix Step 4 guard reads quoted gitlink paths

> Requirements and success criteria: [task.315.qa-fix-step4-guard-reads-quoted-gitlink-paths.md](task.315.qa-fix-step4-guard-reads-quoted-gitlink-paths.md)

## Overview

Replace the line-delimited, C-quoted gitlink listing in the Step 4 block with a NUL-delimited one, so every gitlink path reaches `cd -P` as its real bytes. Then hold it with three scenarios and one mutant.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce and decide

Scratch repository, `GIT_CONFIG_GLOBAL=/dev/null`, a gitlink made with `git init -q pkg/sé`, one commit inside, `git add -f pkg`. Run `git ls-files -s -- pkg`, the `core.quotePath=false` form and the `-z` form under bash and zsh. Confirm the table in the task's Technical Background. Decide `-z`.

### Phase 2: Read the listing NUL-delimited

**Files to modify:**
- `skills/qa-fix/SKILL.md` — the gitlink look inside the Step 4 block (find it by `GLIST=$(git --literal-pathspecs ls-files -s -- "$p")`), and the prose paragraph above the block.
- `tests/qa-fix-step4-guard.test.js` — the listing mutant's `from` string.

**Exact changes** (shape, not a patch; keep the existing `GLBAD` structure and its `echo 1; break` exits):

```bash
GLBAD=$(git --literal-pathspecs ls-files -s -z -- "$p" 2>/dev/null \
  | while IFS= read -r -d '' rec; do
      case "$rec" in 160000\ *) ;; *) continue ;; esac
      g=${rec#*"$(printf '\t')"}
      …existing per-gitlink look, unchanged…
    done)
```

The listing's failure fallback today is `|| { printf '%s\n' "$p"; continue; }` on the command substitution. A pipe hides the left side's exit status, so keep a separate `GLIST=$(… -z …) || { printf …; continue; }` and feed the loop from it with a here-string or a temp variable; do not move the listing into the pipe. A NUL cannot live in a shell variable, so read the NUL-delimited output through `printf '%s' "$GLIST"` only if the shell keeps the NULs; if it does not (bash drops them with a warning), run the listing inside the pipe and test its status with `set -o pipefail` scoped to that subshell. Phase 1 settles which under bash and zsh before this edit is written.

Rewrite the listing mutant's `from` (`grep -E '^160000 '`, `tests/qa-fix-step4-guard.test.js:907`) to the new filter line, in the same edit.

### Phase 3: Hold it with tests

**Files to modify:**
- `tests/qa-fix-step4-guard.test.js` — scenarios beside `clean-gitlink-under-dir` (`:506`) and the refused ones (`:633` onward), and one entry in the mutant table after `:890`.

**Exact changes:**

```js
{
  id: "clean-gitlink-non-ascii-under-dir",
  setup: (d) => gitlinkAt(d, "pkg2/sé"),
  input: () => "pkg2",
},
{
  id: "clean-gitlink-quote-in-name-under-dir",
  setup: (d) => gitlinkAt(d, 'pkg2/a"b'),
  input: () => "pkg2",
},
```

and a refused scenario `gitlink-non-ascii-under-dir` built with `gitlinkAt(d, "pkg2/sé", { untracked: true })`. The mutant restores the newline-delimited, C-quoted read (`from` the new `-z` listing, `to` the old one) and its `broken` predicate is `r.status !== 0` against the admitted non-ASCII scenario.

## Key Patterns and References

- `gitlinkAt(d, rel, opts)` at `tests/qa-fix-step4-guard.test.js:480` takes any relative path.
- `skills/develop-story/references/qa-re-review-scope.md:291` reads `diff --name-only -z` the same way, in a `while read -d ''` loop.
- The block must stay free of positional `$0`–`$9` tokens.

## Testing Approach

`CI=true node --test tests/qa-fix-step4-guard.test.js` (bash and zsh), then the probe engine with the task 286 cases file, then `npm run test:remote` for `ci:fast`. Mutation-prove: revert the `-z` read and confirm the admitted non-ASCII scenario goes red.
