---
id: task.285.plan
title: "Implementation Plan: qa-fix Step 4 guard survives hostile paths"
type: plan
task-ref: task.285.qa-fix-step4-guard-hostile-paths.md
---

# Implementation Plan: qa-fix Step 4 guard survives hostile paths

> Requirements and success criteria: [task.285.qa-fix-step4-guard-hostile-paths.md](task.285.qa-fix-step4-guard-hostile-paths.md)

## Overview

Prove both findings red in the existing probe harness, fix the block, then hold each branch with a test and a mutant.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce

**Files to modify:**
- `tests/qa-fix-step4-guard.test.js` — add cases to `CASES` (each is `{ id, input, why, correct, direction, fixture: { files }, expected }`, same shape as `magic-pathspec-dir`).

**Exact changes:**
- `meta-substitution`: input holds a command substitution that would `touch` a marker; `direction: "hostile"`, `correct: "refused"`. Assert the marker is absent after the run (read it from the case's fixture directory).
- `nested-repo`: fixture holds `inner/.git/HEAD` plus `inner/f`; input `inner/f`; hostile, refused.
- `symlinked-dir`: fixture symlink `link -> real`, input `link/f`; hostile, refused. Check the engine's fixture format supports a symlink; if not, create it in a `before` step and say so.

### Phase 2: T268-QA-10

**Files to modify:**
- `skills/qa-fix/SKILL.md` — the assignment at line 849 and the prose above it.

**Exact changes:**
- Layered, not a choice (decided at review): nothing can inspect the value before the assignment evaluates it, because the slot is substituted into the assignment text itself. So the value goes through a single-quoted heredoc with a distinctive delimiter (`CHANGED_PATHS=$(cat <<'QA_FIX_CHANGED_PATHS_END' … QA_FIX_CHANGED_PATHS_END)`), which makes `$`, backticks and `"` inert.
- Then a new `case` refuses a value holding `\`, `'` or `"` (`*'\\'*|*"'"*|*'"'*`) and a value equal to the delimiter. The heredoc does not make these safe: `xargs` without `-0` reads them as syntax (`'a\'` silently becomes `a`; reproduced in review). The alternative is `tr '\n' '\0' | xargs -0`, portable to GNU and BSD; if chosen, hold `backslash-mutation` with a test.
- Run `meta-substitution` and `backslash-mutation` under bash and zsh before and after.

### Phase 3: T268-QA-11

**Exact changes:**
- After the existence check, for each path walk its parents up to the repository root: refuse when a parent is a symlink (`[ -L ]`) or holds a `.git` entry (directory or file) other than the root's. Only parents need walking: the path itself, when it is a nested repo or a symlink, is already listed as untracked (`inner/`, `link`) by the existing listing (reproduced in review).

### Phase 4: Tests

- Admitted cases: `tracked` (fixture commits the file — a bare repository cannot hold one, so build the index with `git add` in the case's setup), `deleted-tracked`, `intent-to-add` (`git add -N`).
- Mutants: add to `MUTANTS` — the `--error-unmatch` branch (`from` the `git --literal-pathspecs ls-files --error-unmatch -- "$p" >/dev/null 2>&1` fragment, `to` `false`) and one per new refusal.
- No-repo test: assert the stdout names the reason.

### Phase 5: Loop doc

- `shared/resources/develop-pipeline-step-3-develop-loop.md:233` — rewrite the sentence to point at the qa-fix Step 4 block, then `npm run bundle`, then run the pattern-pinning suites the task document lists under Phase 5.

## Key Patterns and References

- Probe harness: `shared/resources/security-probe.mjs`, entry form `fence:<file>#<heading>`.
- Run with `CI=true command node --test tests/qa-fix-step4-guard.test.js`.

## Testing Approach

Mutation-prove every refusal: revert it, confirm a named test goes red, restore it.
