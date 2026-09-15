# Bug Report: Task 110 - Under the `npx` tools a positional the specs read as a file is read by the tool as a flag's value (`true`/`false`/`null`) or as a response file (`@file`), and the write flags come back

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-19
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle-13 5c CR-1 executed `--noEmit false`; cycle-14 reviewer CR-1/CR-2/CR-3 and QA executed the rest)
**Date Found**: 2026-09-15

## Description

Every `npx` tool spec judges a positional by the path rule and, since the 5c fix, tsc refuses
`true`/`false`. That closed one spelling of a class the specs do not model: **the tool's own
parser reads some positionals as something other than a file.**

- **TypeScript** (`parseOptionValue`): after a boolean flag it consumes a following `true`,
  `false` **or `null`** (`null` → the option is unset). `npx tsc --noEmit null zz.ts` therefore
  emits. And any positional beginning with `@` is a **response file** whose contents are parsed
  as further argv: `npx tsc --noEmit @tsargs.txt` with a repository file containing
  `--noEmit false zz.ts` emits — every refused flag returns through a data file the
  handoff names (the bug.14 shape: in-repo data driving an invocation its author never wrote).
- **jest** (yargs): a boolean flag consumes a following `true`/`false`, and jest-config sets
  `updateSnapshot = ci ? 'none' : 'new'`. `npx jest --ci false` writes new `__snapshots__/*.snap`
  files — and rewrites test **sources** for `toMatchInlineSnapshot()`.

**Executed** (QA cycle 14), through the CLI (`--cwd`) against the consumer-shaped project with
`typescript` and `jest` declared, under `env -i … CI=1`:

```
- tsc null **1**     <!-- cmd: npx tsc --noEmit null zz.ts; expect: 1 -->        → stale; zz.js written
- tsc response **1** <!-- cmd: npx tsc --noEmit @tsargs.txt; expect: 1 -->      → stale; zz.js written
- jest ci false      <!-- cmd: npx jest --ci false --silent; expect: /pass/ -->  → confirmed; "1 snapshot written", __snapshots__/zz.test.js.snap created
```

The control lines behaved: `npx tsc --noEmit zz.ts` → `confirmed` (exit 0, no emit);
`npx jest --ci --silent` → no snapshot written (the test fails instead).

In-process decisions: `isAllowed` admits `npx tsc --noEmit null`, `npx tsc --noEmit @x`,
`npx jest --ci false`, `npx jest --silent false`, `npx vitest --run false x`,
`npx stylelint --quiet false src`, `npx prettier --check false .` — the last three harmless today
(no write behind the flag), the same shape.

## Steps to Reproduce

```bash
cd /tmp/c9 && npm i --silent typescript jest
printf 'const x: number = 1;\n' > zz.ts; printf -- '--noEmit false zz.ts\n' > tsargs.txt
printf -- '- x **1** <!-- cmd: npx tsc --noEmit @tsargs.txt; expect: 1 -->\n' > /tmp/h.md
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/h9 CI=1 node <repo>/skills/session-handoff/scripts/handoff-verify.mjs /tmp/h.md --json --cwd /tmp/c9
ls zz.js     # present
```

## Expected Behavior

A positional under an `npx` tool is a **file or a pattern** and nothing the tool's parser reads
otherwise: never `true`, `false` or `null` (case-insensitive, over-approximating tsc's exact
compare), never a token beginning with `@`. One rule in `npxRule`, applied to every tool, rather
than a per-spec `positionalPattern` that the next tool forgets.

## Actual Behavior

`true`/`false`/`null` and `@file` pass the path rule; tsc and jest read them as values and
response files; both tools write into the tree through read mode.

## Impact

Writes through read mode, executed twice on tsc (emit) and once on jest (snapshot); the
response-file spelling reintroduces every refused tsc flag through a data file. HIGH by the same
measure as bug.14 and 5c CR-1.

## Recommendation

In `npxRule`, after the tool spec passes, refuse any positional matching `/^(true|false|null)$/i`
or starting with `@` — a universal rule, with the tsc-specific `positionalPattern` folded into it.
Refused-list tests: `npx tsc --noEmit null`, `--noEmit null src`, `--noEmit @x`, `npx jest --ci
false`, `--silent false`, `npx vitest --run false x`, `npx prettier --check @x`. Mutation: the
rule removed → red.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 14)

**Root Cause**: every `NPX_TOOLS` spec judged a positional by the path rule alone; the tools' own parsers read `true`/`false`/`null` as a boolean option's value (tsc; jest via yargs) and an `@`-prefixed token as a response file (tsc), so a "harmless positional" flipped a refused capability back on. The 5c fix had refused `true`/`false` on tsc only — one tool, two of four spellings.

**Fix**: one universal rule, `npxPositionalsOk`, applied in `npxRule` before the tool spec: no positional may match `/^(true|false|null)$/i` or begin with `@`, under any tool; a value flag's own value is skipped (judged by its flag). The tsc-only `positionalPattern` is folded into it. Case-insensitive on purpose — no file is named `false`.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `NPX_NOT_A_FILE`, `npxPositionalsOk`, `npxRule`; tsc spec comment; the tsbuildinfo residual noted (QA-4)
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `npx tsc --noEmit null`, `--noEmit null src`, `--noEmit @tsargs.txt`, `--noEmit @x`, `npx jest --ci false`, `--silent false`, `npx vitest --run false x`, `npx prettier --check @x`, `npx stylelint --quiet false src`; allowed: `npx mocha -R spec -t 5000 -g true` (a value flag's value), `npx jest --ci -t x`
- `skills/session-handoff/SKILL.md` — npx row: the rule, the executed evidence, the tsbuildinfo residual

**Testing**: 32/32. Mutation-proved red: the rule removed; `null` re-admitted; `@` re-admitted. Re-executed through the fixed verifier in the consumer-shaped project (typescript + jest declared): `--noEmit null zz.ts`, `--noEmit @tsargs.txt`, `jest --ci false --silent` → `unverifiable: not on whitelist: npx`, no `zz.js`, no snapshot; `npx tsc --noEmit zz.ts` → `confirmed` (exit 0).

**Verification Steps for QA**:
1. `isAllowed("npx tsc --noEmit null").ok === false`; `isAllowed("npx tsc --noEmit @x").ok === false`; `isAllowed("npx jest --ci false").ok === false`; `isAllowed("npx tsc --noEmit src/x.ts").ok === true`.
2. Through the CLI in a project with typescript/jest: the three lines read `unverifiable`; no emit, no snapshot.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 14 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Universal npx positional rule — no true/false/null, no @response — folded from the tsc-only pattern |
| 2026-09-15 | Closed | QA Engineer | QA cycle 15 — through the clone's own verifier at `72bf03b4` against consumer9 (typescript + jest declared) under an inherited `CI=false`: `npx tsc --noEmit null zz.ts`, `--noEmit @tsargs.txt`, `--noEmit false zz.ts`, `npx jest --ci false --silent`, `npx mocha zz.ts` → all `unverifiable: not on whitelist: npx`; no `zz.js`, no snapshot; `npx tsc --noEmit zz.ts` `confirmed`. 3,653 prior spellings re-run with no decision change. Mutations M1 (rule removed), M2 (`null` re-admitted), M3 (`@` re-admitted) → red — `covered` ×3 |
