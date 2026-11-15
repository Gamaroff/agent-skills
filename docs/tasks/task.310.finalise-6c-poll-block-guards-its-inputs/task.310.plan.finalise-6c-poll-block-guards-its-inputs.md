---
id: task.310.plan
title: "Implementation Plan: The finalise 6c poll block guards its inputs"
type: plan
task-ref: task.310.finalise-6c-poll-block-guards-its-inputs.md
---

# Implementation Plan: The finalise 6c poll block guards its inputs

> Requirements and success criteria: [task.310.finalise-6c-poll-block-guards-its-inputs.md](task.310.finalise-6c-poll-block-guards-its-inputs.md)

## Overview

Open the first 6c block with one `: "${VAR:?…}"` guard in the form the wait block already uses, and hold it with a test that runs the shipped line with each input unbound. Task.309 edited the same block, so read it as it now stands on `develop` before editing.

## Phase-by-Phase Implementation Guide

### Phase 1: Premise check

**Commands** (read-only, from the repository root):

```bash
git grep -n 'CI_HEAD_2\|PR_NUMBER' -- skills/finalise/SKILL.md
git grep -n -- '"\${CI_ROLLUP:?' -- skills/finalise/SKILL.md
git grep -l 'finalise-ci-head-2' -- skills shared
```

Record in the implementation report, for each of the two names, whether the first 6c block binds it, and what the block does with it empty. To measure the empty `PR_NUMBER` case, run `gh pr view "" --json headRefOid` from a branch with an open PR and from one without, and record both results. Do not assume either.

### Phase 2: The guard and its test

**Files to modify:**
- `skills/finalise/SKILL.md` — insert after the 6c opening sentence's bash fence opens, above the `# Confirm the PR head IS the commit just pushed` comment:

```bash
# INPUTS, bound in an earlier step and not in this block: CI_HEAD_2 is 6a's `git rev-parse HEAD`
# after the push, PR_NUMBER is Step 3a's resolver result. A fresh shell has neither, and an empty
# value here would run the comparison, the writer and the poll launch on nothing (task.310).
: "${CI_HEAD_2:?HALT: bind CI_HEAD_2 from 6a (the commit just pushed) — never git rev-parse HEAD here}" "${PR_NUMBER:?HALT: bind PR_NUMBER from Step 3a}"
```

- `evals/shared/tests/finalise-publish-boundary.test.mjs` — add a test after task.309's clear test, and extend the order assertion.

**Test shape** (match the guard line by its own pattern, so a rename reads as a missing line):

```js
test("6c poll block guards CI_HEAD_2 and PR_NUMBER with a named HALT", () => {
  const sixC = between(finalise, "6c. **Second CI reading", "6d. **CHANGELOG citation check", FINALISE);
  const guard = codeLines(sixC).find((l) => /^\s*: "\$\{CI_HEAD_2:\?/.test(l));
  assert.ok(guard, "6c poll block: the CI_HEAD_2 / PR_NUMBER guard line is missing");
  const run = (env) => spawnSync("bash", ["-c", guard.trim()], { encoding: "utf8", env });
  // unset both names, then bind one at a time; keep PATH so bash starts
  // ... three cases per the task's Testing Strategy
});
```

Run the guard with a minimal environment (`{ PATH: process.env.PATH }`) so a `CI_HEAD_2` or `PR_NUMBER` in the developer's shell cannot make an unbound case pass. The test needs no scratch directory because the guard writes nothing; if the order assertion's scratch helper is reused, remove it in a `finally` (see the tmp-leak ratchet in `scripts/test-tmpdir.mjs`).

**Order assertion:** add `guardAt = at(/^\s*: "\$\{CI_HEAD_2:\?/)` beside `rmAt`, `writeAt` and `launchAt`, and assert `guardAt >= 0` and `guardAt < rmAt` in the existing assertion, extending its message.

**Mutations to run with Edit, then revert with Edit:**
1. Delete the guard line from `SKILL.md`: the guard test must be red.
2. Move the guard below the `rm -f` line: the order assertion must be red.

### Phase 3: Bundle, docs and gate

- `npm run bundle`, then `npm run bundle:check`. Edit sources under `shared/resources/` only, never a `references/` copy; `skills/finalise/SKILL.md` itself is a source.
- `CHANGELOG.md`, under `[Unreleased]` › Fixed: one line citing `(task 310)`.
- `npm run validate -- skills/finalise/`, then `npm run test:remote`; then `CI=true command node --test evals/shared/tests/finalise-publish-boundary.test.mjs` before pushing.

## Key Patterns and References

- The precedent guard: `skills/finalise/SKILL.md:1470`.
- Task.309's order assertion and its line-by-pattern matching: `evals/shared/tests/finalise-publish-boundary.test.mjs:640`–`:655`.
- Task.308's reasoning for never re-deriving the head from local HEAD: the comment above the writer in the 6c block.

## Testing Approach

One behaviour test that runs the shipped guard with three bindings, plus the order assertion. Both are mutation-proved in Phase 2. The fast gate runs on the LAN server first.
