# Bug Report: Task 110 - tsc's `-p` / `--project` are declared bare, so `npx tsc -p --noEmit` satisfies the required flag while tsc reads `--noEmit` as the project path

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-23
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (reviewer CR-1, confirmed by execution)
**Date Found**: 2026-09-15

## Description

The tsc spec lists `-p` and `--project` in `flags` — bare, value-less — and requires `--noEmit`
somewhere on the line. tsc's own parser (`parseOptionValue`, `case "string"`) consumes the token
after `-p` **unconditionally** as the project path. So `npx tsc -p --noEmit` passes `checkArgs`
(`-p` bare, `--noEmit` bare) and `requireFlag` (`--noEmit` present), while tsc parses it as
`project: "--noEmit"` with `noEmit` never set. The only flag the tsc arm requires is consumed by a
flag the spec misdescribes. `--project --noEmit` is the same. (SKILL.md's data-kind list names `-p`,
which is markdownlint's ignore-path; the tsc spec has no value flag at all.)

**Executed** (QA cycle 16), through the clone's own verifier at `9cf723a6` against the
consumer-shaped project with a directory `./--noEmit/` holding `a.ts` and a `tsconfig.json` with
`outDir: zzout`, under `env -i … CI=1`:

```
- tsc p noEmit <!-- cmd: npx tsc -p --noEmit; expect: exit 0 -->
- tsc project noEmit <!-- cmd: npx tsc --project --noEmit; expect: exit 0 -->
```

→ both **`confirmed`**, and `./--noEmit/zzout/a.js` was emitted into the tree through read mode
(typescript 7.0.2). Without such a directory tsc exits 1 ("Cannot find a tsconfig.json file at
the specified directory: '--noEmit'") — no emit; the line reads `stale`.

## Steps to Reproduce

```bash
cd /tmp/c9 && npm i --silent typescript && mkdir -- --noEmit
printf 'export const a = 1;\n' > ./--noEmit/a.ts
printf '{"compilerOptions":{"outDir":"zzout"},"files":["a.ts"]}\n' > ./--noEmit/tsconfig.json
printf -- '- x <!-- cmd: npx tsc -p --noEmit; expect: exit 0 -->\n' > /tmp/h.md
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/h9 CI=1 node <repo>/skills/session-handoff/scripts/handoff-verify.mjs /tmp/h.md --json --cwd /tmp/c9
ls ./--noEmit/zzout/a.js   # present
```

## Expected Behavior

Every value-taking option of every admitted tool is declared as a value flag, so the verifier
consumes what the tool consumes: `-p` / `--project` take a **data** value (`tsconfig.json`,
`tsconfig.build.json`), and `-p --noEmit` is refused because the value begins with `-`.

## Actual Behavior

`-p` consumes nothing in the verifier and one token in tsc; the required `--noEmit` is that token.

## Impact

Held at MEDIUM, not HIGH: the emit needs a repository directory literally named `--noEmit`
with a tsconfig inside — a model no real project matches (gate 11 held its dotfile finding at
LOW on the same ground) — but the defect underneath is a misdeclared grammar that voids the
tsc arm's one required flag, and it is the value-flag class bug.19 and bug.21 already paid for.

## Recommendation

Move `-p` / `--project` to tsc `valueFlags` with `valueKinds: data` (a `..`-free relative
`.json`); drop the dead `--pretty=` (tsc has no `--opt=value` form — `Unknown compiler option
'--pretty=false'`, exit 1; reviewer CR-3). Refused: `npx tsc -p --noEmit`, `npx tsc --project
--noEmit`, `npx tsc --noEmit -p --noEmit`, `npx tsc -p ../x.json --noEmit`; allowed: `npx tsc -p
tsconfig.json --noEmit`, `npx tsc --project tsconfig.build.json --noEmit`. Mutation: `-p` back to
bare. Audit: every remaining bare flag on every tool against its parser's value-taking set.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 16)

**Root Cause**: the tsc spec declared `-p` / `--project` in `flags` (bare) while tsc's `parseOptionValue` consumes the following token unconditionally as the project path; the verifier's model consumed nothing, so the required `--noEmit` could be the token tsc ate.

**Fix**: `-p` / `--project` moved to tsc `valueFlags` with `valueKinds: data` — the verifier consumes what tsc consumes, a `-`-prefixed value is refused before the kind is asked, and the value is held to a `..`-free relative data file (`tsconfig.json`, `tsconfig.build.json`). `--pretty=` dropped (tsc has no `--opt=value` form; CR-3). Audit of every remaining bare flag on every npx tool against its parser: one more value-taking flag was bare — shellcheck's `-e` (getopt consumes the next token whatever it is; consequence-free, shellcheck has no writing option) — now a value flag held, with `--exclude=`, to a list of `SC` codes. jest/vitest `-t` are string options whose parsers do **not** consume a `-`-prefixed token, so a bare `-t` was no bypass — but it consumed a token the verifier judged as a positional; cycle 17 (gate 17 QA-1) declared it the pattern value flag it is. The prettier string-config residual (CR-2) is documented in SKILL.md and the prettier spec comment beside the tsbuildinfo residual.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — tsc spec, shellcheck spec, `SHELLCHECK_CODES`, prettier comment
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `-p --noEmit`, `--project --noEmit`, `--noEmit -p --noEmit`, `-p ../x.json`, `-p x.mjs`, `-p /etc/tsconfig.json`, trailing `-p`, `--pretty=false`, shellcheck `-e --format=json`, `-e ./x`, `--exclude=./x`; allowed: `-p tsconfig.json --noEmit`, `--project tsconfig.build.json --noEmit`, `--noEmit --project packages/a/tsconfig.json`, `--noEmit --pretty`, `-e SC2086,SC2046`, `--exclude=2086`
- `skills/session-handoff/SKILL.md` — npx row (tsc `-p` as data; prettier string-config residual; shellcheck `-e`), refused list
- `CHANGELOG.md` — figures

**Testing**: 33/33. Mutation-proved red (five): `-p`/`--project` back to bare; `--pretty=` re-admitted; shellcheck `-e` back to bare; `SHELLCHECK_CODES` widened; tsc project value kind dropped. Re-executed through the fixed verifier in consumer9 with the `--noEmit/` directory present: `-p --noEmit`, `--project --noEmit`, `--pretty=false --noEmit` → `unverifiable: not on whitelist: npx`, no emit; `-p tsconfig.json --noEmit` → `confirmed` (exit 0).

**Verification Steps for QA**:
1. `isAllowed("npx tsc -p --noEmit").ok === false`; `isAllowed("npx tsc -p tsconfig.json --noEmit").ok === true`.
2. Through the CLI in a project carrying a `--noEmit/` directory with a tsconfig: the line reads `unverifiable`; nothing is emitted.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 16 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `-p`/`--project` are data value flags; `--pretty=` dropped; shellcheck `-e` a value flag; prettier string-config residual documented |
| 2026-09-15 | Closed | QA Engineer | QA cycle 17 — through the clone's verifier at ce15f7c7 in consumer9 with `./--noEmit/{a.ts,tsconfig.json}` present: `npx tsc -p --noEmit`, `--project --noEmit`, `--noEmit -p` → `unverifiable: not on whitelist: npx`, nothing emitted; `-p tsconfig.json --noEmit` → `confirmed`. M1 (`-p`/`--project` back to bare), M5 (value kind dropped) → red — `covered` ×2 |
