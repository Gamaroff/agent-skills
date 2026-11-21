---
id: task.316.plan
title: "Implementation Plan: qa-fix Step 4 guard looks inside nested gitlinks"
type: plan
task-ref: task.316.qa-fix-step4-guard-looks-inside-nested-gitlinks.md
---

# Implementation Plan: qa-fix Step 4 guard looks inside nested gitlinks

> Requirements and success criteria: [task.316.qa-fix-step4-guard-looks-inside-nested-gitlinks.md](task.316.qa-fix-step4-guard-looks-inside-nested-gitlinks.md)

## Overview

Make the per-gitlink look recursive: after judging a gitlink, list the gitlinks inside it and judge each the same way, down to a depth cap. This lands after task 315, which changes how the listing is read.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce and decide

Scratch repository: outer `git init`, `mid` a nested repository with one commit, `mid/inner` a nested repository with one commit and an untracked `mid/inner/untracked.txt`, `git -C mid add -f inner`, `git -C mid commit`, then `git add -f mid` in the outer repository. Confirm the table in the task's Technical Background under bash and zsh. Decide the recursion and the cap.

### Phase 2: Recurse into nested gitlinks

**Files to modify:**
- `skills/qa-fix/SKILL.md` — the gitlink look inside the Step 4 block (find it by `GLBAD=$(`), and the prose paragraph above the block ("each is looked into").
- `tests/qa-fix-step4-guard.test.js` — the `from` strings of the gitlink mutants after `:890`.

**Exact changes** (shape, not a patch). A fenced block shares no function with the next one, so define the helper inside the block that uses it. It must not use positional `$0`–`$9`; name its arguments with `local`-free assignments to named variables:

```bash
look_gitlink() {   # reads GL_PATH and GL_DEPTH; prints 1 when the gitlink must refuse the directory
  GP=$(cd -P -- "$GL_PATH" 2>/dev/null && pwd -P) || GP=""
  GT=$(cd -P -- "$GL_PATH" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null) || GT=""
  if [ -z "$GP" ] || [ "$GT" != "$GP" ]; then echo 1; return; fi
  GU=$(git -C "$GL_PATH" ls-files --others --exclude-standard 2>/dev/null) || { echo 1; return; }
  if [ -n "$GU" ]; then echo 1; return; fi
  if [ "$GL_DEPTH" -ge "$GL_CAP" ]; then …refuse only when a deeper gitlink exists…; fi
  …list `git -C "$GL_PATH" ls-files -s -z`, and for each 160000 entry set GL_PATH and GL_DEPTH+1 and recurse…
}
```

The depth cap is a literal in the block (name it `GL_CAP`), so a mutant can change it. A chain deeper than the cap refuses ("could not look"), never admits. Keep the existing per-gitlink questions byte-identical to what task 315 left, so the mutants' `from` strings change only where this edit changes them.

Update each mutant `from` string the edit touches, in the same edit; a `from` that no longer occurs makes its mutant stop mutating anything.

### Phase 3: Hold it with tests

**Files to modify:**
- `tests/qa-fix-step4-guard.test.js` — `gitlinkAt` (`:480`) builds one level; add a `nestedGitlinkAt(d, outerRel, innerRel, opts)` beside it that builds the inner repository, adds it to the outer one with `git add -f`, commits, and then adds the outer one to the top repository. Scenarios beside the existing gitlink ones (`:506`, `:633` onward); mutants after `:890`.

**Exact changes:** a refused scenario `nested-gitlink-untracked` (inner holds `untr`), its trailing-slash twin, an admitted `nested-gitlink-clean`, and a refused `nested-gitlink-beyond-cap` built from a chain one longer than `GL_CAP`. One mutant per clause: the recursion call (`to: ":"`, broken when `nested-gitlink-untracked` exits 0) and the cap test.

## Key Patterns and References

- `git -C mid ls-files -s` lists `inner` as `160000`; `git submodule foreach --recursive` does not reach an unregistered gitlink (measured, see the task).
- A case fixture holds text files only, so the probe corpus cannot hold a gitlink; the Node scenarios hold this case (task 286, Phase 3).
- The block must stay free of positional `$0`–`$9` tokens.

## Testing Approach

`CI=true node --test tests/qa-fix-step4-guard.test.js` (bash and zsh), then the probe engine with task 286's cases file, then `npm run test:remote` for `ci:fast`. Mutation-prove: remove the recursion call and confirm `nested-gitlink-untracked` goes red.
