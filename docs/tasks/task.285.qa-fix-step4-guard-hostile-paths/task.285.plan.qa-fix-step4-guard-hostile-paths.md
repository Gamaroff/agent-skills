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
- Option A (refuse): before the assignment is evaluated nothing can inspect the value, because the slot is substituted into the assignment itself. So the refusal must be on the substitution path: write the value through a single-quoted heredoc into a variable, then run the existing `case` plus a new `case` on `*'$'*|*'`'*|*'"'*|*'\\'*`.
- Option B (heredoc only): `CHANGED_PATHS=$(cat <<'EOF' … EOF)`. The delimiter line must not appear in a path; refuse a value equal to the delimiter.
- Pick by running both on `meta-substitution` under bash and zsh.

### Phase 3: T268-QA-11

**Exact changes:**
- After the existence check, for each path walk its parents up to the repository root: refuse when a parent is a symlink (`[ -L ]`) or holds a `.git` entry other than the root's.

### Phase 4: Tests

- Admitted cases: `tracked` (fixture commits the file — a bare repository cannot hold one, so build the index with `git add` in the case's setup), `deleted-tracked`, `intent-to-add` (`git add -N`).
- Mutants: add to `MUTANTS` — the `--error-unmatch` branch (`from` the `git --literal-pathspecs ls-files --error-unmatch -- "$p" >/dev/null 2>&1` fragment, `to` `false`) and one per new refusal.
- No-repo test: assert the stdout names the reason.

### Phase 5: Loop doc

- `shared/resources/develop-pipeline-step-3-develop-loop.md:233` — rewrite the sentence to point at the qa-fix Step 4 block, then `npm run bundle`.

## Key Patterns and References

- Probe harness: `shared/resources/security-probe.mjs`, entry form `fence:<file>#<heading>`.
- Run with `CI=true command node --test tests/qa-fix-step4-guard.test.js`.

## Testing Approach

Mutation-prove every refusal: revert it, confirm a named test goes red, restore it.
