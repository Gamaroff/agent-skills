# Bug Report: Task 110 - The `name` kind is a shape, and a reporter name is not one: mocha resolves a bare name against the cwd, and vitest/jest have built-in reporters that write

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-17
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (mocha, executed); reviewer CR-2 (mocha, confirmed) and CR-3 (vitest/jest writing reporters)
**Date Found**: 2026-09-15

## Description

The cycle-9 fix (bug.14) holds a formatter/reporter flag value to the `name` kind —
`[A-Za-z0-9_-]+`, "a built-in or an installed package, never a path" — on the premise that a bare
specifier resolves through Node's module resolution, which never looks in the working directory.
That premise holds for eslint (`eslint-formatter-<name>` or a built-in), jest (`resolve` from
`rootDir` into `node_modules`), stylelint (built-ins only) and shellcheck (built-ins only). It does
**not** hold for mocha. `Mocha.prototype.reporter` (mocha 12, `lib/mocha.cjs:310`) tries the
built-in table, then `require.resolve(name)`, and when that throws it falls back to
`require(path.resolve(name))` — a **cwd-relative** load, resolving `<name>.js`, `<name>.json`,
`<name>/index.js` or `<name>/package.json#main` in the repository root.

**Executed** (QA cycle 10), through the CLI (`--cwd`) against the consumer-shaped scratch project
with mocha installed, under a stripped environment, with `zzrep.js` at the project root whose top
level writes a file:

```
- mocha reporter name **1** <!-- cmd: npx mocha -R zzrep t.js; expect: 1 -->
```

→ `unverifiable: command failed (exit 1)` (the reporter export was not a constructor), and
**`CANARY-REPORTER.txt` was written** — `zzrep.js` ran under mocha's argv before mocha rejected it.
`isAllowed("npx mocha -R zzrep t.js").ok === true`; `npx mocha --reporter=zzrep t.js` the same.

In this repository nothing resolves: the root has no `*.js`, no `*/index.js`, and mocha is not
installed (`--no-install` refuses it). In a consumer with mocha and a root-level `index.js` — the
commonest layout there is — `npx mocha -R index t` runs the consumer's entry point through read
mode (reviewer CR-2, confirmed: `-R index`, `--reporter=scripts`, `-R lib` all admitted).

**The same shape admits reporters that write** (reviewer CR-3, not executed — neither tool is
installed here): vitest's `html` reporter writes `html/` (+ `@vitest/ui` assets) and `blob` writes
`.vitest-reports/blob-*.json` by default, and `npx vitest --run --reporter=html x` /
`--reporter=blob x` are admitted; jest's `--reporters=jest-junit` (an installed package) writes
`./junit.xml`, and is admitted. `name` was meant to mean "a built-in, or a package that is already
installed" — but "built-in" includes reporters whose job is to write a file, and "installed" is not
a property the string carries.

## Steps to Reproduce

```bash
cd /tmp/c9 && npm i --silent mocha
printf 'require("fs").writeFileSync("CANARY.txt","x"); module.exports = function(){};\n' > zzrep.js
printf -- '- x **1** <!-- cmd: npx mocha -R zzrep t.js; expect: 1 -->\n' > /tmp/h.md
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/h9 CI=1 node <repo>/skills/session-handoff/scripts/handoff-verify.mjs /tmp/h.md --json --cwd /tmp/c9
ls CANARY.txt      # present
```

## Expected Behavior

A reporter or formatter value is one of the tool's **stdout-only built-ins**, listed exactly per
tool — mocha `spec` `dot` `nyan` `tap` `landing` `list` `progress` `json` `json-stream` `min`
`markdown` `xunit`; vitest `default` `basic` `verbose` `dot` `tap` `tap-flat` `github-actions`
`json` `junit` (stdout unless `--outputFile`, which is refused); jest `default` `summary`
`github-actions`; eslint and stylelint their built-in formatter names — and nothing else. The
identity principle, applied to the value: a closed set per tool, not a character class.

## Actual Behavior

Any `[A-Za-z0-9_-]+` value is admitted on `-R` / `--reporter=`; mocha resolves a non-built-in,
non-installed name against the working directory and executes the file it finds.

## Impact

An in-repo module executed under a foreign argv through read mode — the bug.14 class, one tool
narrower: it needs mocha installed and a root-level module whose name is a bare word, and the
canary here is what such a module would do. Nil in this repository; real in a consumer with
`index.js`.

## Recommendation

Replace the `name` kind on every reporter/formatter flag with a per-tool `valuePatterns` entry
listing the stdout-only built-ins exactly (mocha without `doc`/`html`, which emit HTML to stdout
but are harmless — include or exclude, but decide; vitest without `html`/`blob`; jest the three
built-ins; eslint/stylelint their documented formatter names) — or drop `name` altogether and make
every loaded value either `data` or a closed set. Refused-list tests for `-R zzrep`,
`--reporter=index`, `-R lib`, `--reporter=html`, `--reporter=blob`, `--reporters=jest-junit`;
allowed for `-R spec`, `--reporter=dot`, `--reporters=default`, `-f json`. The mutation to prove
is the closed set widened back to `BARE_NAME`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 10)

**Root Cause**: the cycle-9 `name` kind (`[A-Za-z0-9_-]+`) stood in for "a built-in or an installed package" — a shape used as a proxy for a set. The proxy fails twice: mocha resolves an unknown reporter name from `node_modules` and then from the working directory (`require(path.resolve(name))`), and "built-in" includes reporters whose job is to write a file (vitest `html`/`blob`, jest via `jest-junit`).

**Fix**: the `name` kind is deleted. Every formatter/reporter flag carries a per-tool `valuePatterns` entry that lists the stdout-only built-ins exactly — `MOCHA_REPORTERS`, `VITEST_REPORTERS` (without `html`/`blob`), `JEST_REPORTERS`, `ESLINT_FORMATS`, `STYLELINT_FORMATTERS`, `SHELLCHECK_FORMATS` / `_SHELLS` / `_SEVERITIES` — checked by `valueOk` as a full answer, joined or spaced. `VALUE_KINDS` keeps only `data`; its comment records why `name` is gone.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — the eight closed sets; `valueKinds: name` replaced by `valuePatterns` on eslint, stylelint, jest, vitest, mocha and shellcheck; `BARE_NAME` removed
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `-R zzrep`, `--reporter=index`, `-R lib`, `-R mocha-junit-reporter`, `--reporter=html`, `--reporter blob`, `--reporters=jest-junit`, `-f eslint-formatter-pretty`, `--formatter=custom`, shellcheck `-f x` / `-s fish` / `-S loud`; allowed: every built-in spelled joined and spaced across the six tools
- `skills/session-handoff/SKILL.md` — npx row lists the sets and the executed counter-example; refused list

**Testing**: 31/31. Mutation-proved red: each of the six sets widened back to the bare-name shape, and vitest's set admitting `html|blob`. Re-executed through the fixed verifier against the consumer-shaped project: `npx mocha -R zzrep t.js` → `unverifiable: not on whitelist: npx`, no canary; `-R spec` still runs.

**Verification Steps for QA**:
1. `isAllowed("npx mocha -R index t").ok === false`; `isAllowed("npx vitest --run --reporter=html x").ok === false`; `isAllowed("npx mocha -R spec t").ok === true`.
2. Through the CLI with a root-level `zzrep.js` in a project with mocha: the `-R zzrep` line reads `unverifiable` and no file appears.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 10 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `name` kind deleted; reporters/formatters are per-tool closed sets of stdout-only built-ins |
| 2026-09-15 | Closed | QA Engineer | QA cycle 11 — `npx mocha -R zzrep t.js` and `-R index t.js` through the CLI against the consumer-shaped project (mocha installed, root-level zzrep.js present) → `unverifiable: not on whitelist: npx`, no canary; `-R spec` still runs. Through the clone's own verifier at `e4d0a8a9`: `npx vitest --run --reporter=html x`, `npx jest --reporters=jest-junit` refused; `shellcheck -f gcc -S warning -s bash <file>` ran. 177+109 in-process spellings re-run: only the intended decisions moved. Mutations M1–M6 (each closed set widened back to the bare-name shape; vitest admitting html/blob) → red — `covered` ×6 |
