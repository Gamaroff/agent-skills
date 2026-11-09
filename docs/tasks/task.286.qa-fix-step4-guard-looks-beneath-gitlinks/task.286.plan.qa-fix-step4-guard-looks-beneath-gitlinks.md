---
id: task.286.plan
title: "Implementation Plan: qa-fix Step 4 guard looks beneath gitlinks"
type: plan
task-ref: task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md
---

# Implementation Plan: qa-fix Step 4 guard looks beneath gitlinks

> Requirements and success criteria: [task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md](task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md)

## Overview

Add one loop to the Step 4 block that finds gitlinks at or beneath each changed directory in the index and asks each nested repository for untracked files. Then settle the two small advisories.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce and decide

Scratch reproduction (outside the working tree):

```bash
R=$(mktemp -d) && cd "$R" && git init -q
git init -q pkg2/sm && (cd pkg2/sm && echo x > f && git add f && git -c user.email=a@b -c user.name=n commit -qm i)
echo y > a && git add a pkg2/sm && git -c user.email=a@b -c user.name=n commit -qm base
echo u > pkg2/sm/untr
# extract the Step 4 block, substitute {changed-paths}, run under bash and zsh for: pkg2  pkg2/  pkg2/sm
```

Expected today: `pkg2` and `pkg2/` exit 0, `pkg2/sm` exits 1. Decide look-inside (recommended) versus refuse.

### Phase 2: Close CR-1

**Files to modify:** `skills/qa-fix/SKILL.md` — the Step 4 fenced block (near `NEST=$(git -C "$DIR" rev-parse --show-toplevel …)`) and the paragraph above it.

Sketch (no positional tokens; use a `while read` over the index listing):

```bash
git --literal-pathspecs ls-files -s -- "$p" | awk '$1 == "160000" { sub(/^[^\t]*\t/, ""); print }' |
while IFS= read -r g; do
  [ -z "$(git -C "$g" ls-files --others --exclude-standard 2>/dev/null)" ] || printf '%s\n' "$p"
done
```

A gitlink that is not checked out makes `git -C` fail: treat as "could not look" and refuse, never as clean. Run the whole block under bash and zsh; zsh needs the loop's pipeline to behave the same.

### Phase 3: Hold it with tests

**Files to modify:** `tests/qa-fix-step4-guard.test.js`. Copy the shape of `id: "gitlink-as-path"` (`REFUSED_BY` at the scenario list) for the refused scenarios, add an admitted scenario, and add one entry to the direct-mutants list per new clause. Confirm each mutant turns its named scenario red before committing. Add the case to the probe cases file the QA gate uses.

### Phase 4: Close CR-3 and CR-2

CR-2: replace `"$TOP"/*` with `"${TOP%/}"/*` in the inside test (`LEX` always ends with `/`). CR-3: for an absolute path outside the repository whose physical spelling is inside `TOP`, either rewrite to the physical spelling before listing or add a sentence to the prose saying the route is refused by git on purpose; pick one in Phase 1 and test it.

## Key Patterns and References

- Scenario and mutant conventions in `tests/qa-fix-step4-guard.test.js` (`ADMITTED`, `REFUSED_BY`, `DIRECT_MUTANTS`).
- CI forbids positional `$0`–`$9` tokens in runnable `SKILL.md` fences (`tests/fenced-bash-positional-params.test.js`); read stdin or use named variables.

## Testing Approach

`CI=true node --test tests/qa-fix-step4-guard.test.js`, then the probe engine, then `npm run ci:fast`.
