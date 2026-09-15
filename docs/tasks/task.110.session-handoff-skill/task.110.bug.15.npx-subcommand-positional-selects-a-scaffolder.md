# Bug Report: Task 110 - A positional under `npx mocha` / `npx vitest` is a subcommand, and `init` scaffolds files into the tree

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-15
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

The `NPX_TOOLS` specs allow-list each tool's flags and treat every positional as a `POS.PATHS`
file or pattern. Two of the ten tools also read their first positional as a **subcommand**:
mocha has `mocha init <path>` ("create a client-side mocha setup at `<path>`"), and vitest has
`run | watch | dev | bench | typecheck | related | list | init`. The specs refuse every tool's
`--init` **flag** (`jest --init`, `eslint --init`, `tsc --init` are all refused) but not the
subcommand spelling of the same thing, because the subcommand has no leading dash and passes
the path rule.

**Executed** (QA cycle 9), through the CLI (`--cwd`) against a consumer-shaped scratch project
with `mocha` and `prettier@3` installed, under a stripped environment:

```
- mocha init **1** <!-- cmd: npx mocha init out9; expect: 1 -->
```

→ verdict `stale`, exit 0, and **four files written**: `out9/index.html`, `out9/mocha.css`,
`out9/mocha.js` (484 KB), `out9/tests.spec.js`. `npx mocha init .` writes the same four names
into the repo root, overwriting any `index.html` / `tests.spec.js` already there.

`npx vitest init browser` is admitted by the same rule (`isAllowed(...).ok === true`); it was not
executed — vitest is not installed in the scratch project, and in **this** repository neither
tool is installed, so the cycle-7 `--no-install` injection refuses both (`npx vitest init browser`
here → `npm error 404 … GET /vitest`, one manifest request to the registry, the documented
residual). The write is therefore nil in this checkout and real in any consumer that has mocha or
vitest as a devDependency — which is who `.agents/skills/session-handoff` is installed for.

## Steps to Reproduce

```bash
mkdir -p /tmp/c9 && cd /tmp/c9 && git init -q && echo x > README.md && npm i --silent mocha
printf -- '- x **1** <!-- cmd: npx mocha init out9; expect: 1 -->\n' > /tmp/h.md
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/h9 CI=1 \
  node <repo>/skills/session-handoff/scripts/handoff-verify.mjs /tmp/h.md --json --cwd /tmp/c9
ls out9        # index.html mocha.css mocha.js tests.spec.js
```

## Expected Behavior

A positional under a tool that has subcommands is never a subcommand name. Under the identity
principle: mocha and vitest positionals are held to a pattern that refuses their subcommand
vocabulary (`init`, `run`, `watch`, `dev`, `bench`, `typecheck`, `related`, `list`), or the two
tools are dropped from `NPX_TOOLS` — this repository uses `node --test`, and a handoff that cites
a mocha or vitest figure can cite it through `npm test`, whose script is the repo's.

## Actual Behavior

`npx mocha init <dir>` and `npx vitest init browser` are admitted; mocha's scaffolder writes four
files at a path the document chose.

## Impact

A write to the working tree through read mode, executed in a consumer-shaped project; refused in
this repository only by the absence of the tool. Bounded (new files, four fixed names) but the
invariant is the one SKILL.md opens with, and the `--init` flags were refused for exactly this
reason.

## Recommendation

Drop `mocha` and `vitest` from `NPX_TOOLS` (neither is used here; `jest` too if the same standard
is applied — it has no subcommands, so it may stay), or add `positionalPattern` on both that
refuses the subcommand vocabulary and require `--run` on vitest the way `tsc` requires `--noEmit`.
Refused-list tests for `npx mocha init out`, `npx mocha init .`, `npx vitest init browser`,
`npx vitest watch`; the mutation to prove is the pattern's removal.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 9)

**Root Cause**: mocha and vitest read their first positional as a subcommand when it is one of their vocabulary; the specs treated every positional as a `POS.PATHS` file or pattern, so `init` (a scaffolder) passed the path rule the way any bare word does, while the `--init` *flag* on jest/eslint/tsc had been refused since gate 1.

**Fix**: `positionalPattern` on both tools refuses the subcommand vocabulary — mocha `init`; vitest `run` `watch` `dev` `bench` `typecheck` `related` `list` `init` — and vitest gains `requireFlag: ["--run"]` the way tsc requires `--noEmit`, so a bare `npx vitest` (watch mode outside CI) is refused as well as `npx vitest init browser` with or without `--run`. File positionals (`npx mocha test`, `npx vitest --run x.test.ts`) are unchanged. Dropping the two tools was the alternative; a consumer with either as a devDependency has a legitimate `--run`/`-R spec` figure to record, so the vocabulary is refused instead.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `NPX_TOOLS.vitest.positionalPattern` + `requireFlag`, `NPX_TOOLS.mocha.positionalPattern`; header comment on the npx specs
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `npx mocha init out9`, `npx mocha init .`, `npx vitest init browser`, `npx vitest --run init browser`, `npx vitest watch`, `npx vitest --run dev`, `npx vitest`, `npx vitest x.test.ts`; allowed: `npx mocha test`, `npx vitest --run --reporter=dot x.test.ts`
- `skills/session-handoff/SKILL.md` — npx row names the subcommand rule and the `--run` requirement; refused list

**Testing**: 31/31. Mutation-proved red: the vitest pattern removed; `--run` no longer required; the mocha pattern removed. Re-executed through the fixed verifier against the consumer-shaped project with mocha installed: `npx mocha init out9` → `unverifiable: not on whitelist: npx`, no `out9/`.

**Verification Steps for QA**:
1. `isAllowed("npx mocha init out").ok === false`; `isAllowed("npx vitest init browser").ok === false`; `isAllowed("npx vitest").ok === false`; `isAllowed("npx mocha test").ok === true`.
2. Through the CLI with `--cwd <project with mocha>`: the `init` line reads `unverifiable` and no files appear.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 9 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `init` and the vitest subcommand vocabulary refused as positionals; vitest requires --run |
