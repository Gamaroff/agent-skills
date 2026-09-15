# Bug Report: Task 110 - The `npx` arm admits a `--config=` / `--format=` / `--reporter=` value that names an in-repo module, and the tool imports and runs it

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-14
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (the accepted PRB-6 / CR-2 boundary, re-decided on measurement)
**Date Found**: 2026-09-15

## Description

Gate 3 (PRB-6) accepted, and gates 4–8 carried forward as "the trust boundary", that a value on a
module-loading flag — prettier `--config=`, eslint `--config=`/`-c`/`--format=`/`-f`, stylelint
`--config=`/`--formatter=`, mocha `--reporter=`/`-R`, jest `--reporters=`, vitest `--reporter=`,
markdownlint `-c`/`--config=` — may name any **relative, in-repo path**, on the reasoning that
in-repo code is trusted. The handoff for this cycle asked QA to decide explicitly whether that
stands. It does not, for two reasons the cycle measured:

1. **The mechanism executes.** Prettier 3 resolves a `--config=` value by extension and `import()`s
   a `.js`/`.mjs`/`.cjs` one. Through read mode in a clone of this branch, with a canary module
   whose top level writes a file: `npx prettier --check --config=zz-canary.mjs
   skills/session-handoff/scripts/handoff-verify.mjs` → `CANARY-IMPORTED.txt` written, verdict
   `stale`, exit 0. (`README.md` as the target does **not** trigger it — `*.md` is in
   `.prettierignore`, so prettier never loads the config; a `.mjs` target does.)
2. **This repository ships modules whose import is a run.** A static scan of the 208 tracked
   `.js`/`.mjs`/`.cjs` modules for a top-level `main()` with no main-guard finds two:
   `shared/resources/generate-prd-epic-index.mjs` (`main();` at line 278, argv-driven —
   `--check` is read from `process.argv`, which under this spelling is **prettier's** argv) and
   `shared/resources/registry-tick.js` (`main().catch(...)` at line 627). The cycle-8 identity
   principle — "runnable code is named by identity, never by shape" — was adopted for the `node`
   arm precisely because in-repo code run under a *foreign* argv is not the code its author
   tested. The `npx` arm still names runnable code by shape, one arm over.

**Executed** (QA cycle 9), through the CLI in a scratch clone of `cb3ddd63` under a stripped
environment (`env -i`, no `claude` on PATH, throwaway HOME), with a consumer-shaped PRD tree
(`docs/prd/prd.zz/prd.zz.md` + `epics/epic.1.zz/epic.1.zz.md`) placed in the clone:

```
- prd index via prettier config **1** <!-- cmd: npx prettier -l --config=shared/resources/generate-prd-epic-index.mjs skills/session-handoff/scripts/handoff-verify.mjs; expect: 1 -->
```

→ verdict **`confirmed`**, measured `added    docs/prd/prd.zz/prd.zz.md  (1 epics)`, and
`prd.zz.md` was **rewritten** (md5 `cf74e1c5…` → `742a4918…`) with an `<!-- epics-index-start -->`
block inserted. The document's own "1" satisfied the expect. In this checkout the PRD directory is
laid out as `docs/prd/onboarding/prd.onboarding.md`, which the module's `prd.<name>/prd.<name>.md`
rule skips, so the same line writes nothing *here* — the write is one directory rename away, and a
consumer laid out as the module expects gets it on the first read.

`isAllowed` decisions (in-process, nothing spawned):

```
npx prettier --check --config=skills/loop-supervisor/scripts/run-loop.mjs .      → ok
npx eslint -c shared/resources/registry-tick.js --max-warnings=0 .               → ok
npx eslint -f shared/resources/registry-tick.js .                                → ok
npx mocha -R shared/resources/registry-tick.js test                              → ok
npx stylelint --formatter=shared/resources/registry-tick.js src                  → ok
npx markdownlint -c shared/resources/registry-tick.js docs                       → ok
npx prettier --check --config=/tmp/x.mjs .   → refused (absolute)   ← the gate-3 rule
npx prettier --check --config=../x.mjs .     → refused (dot-dot)    ← the gate-3 rule
```

## Steps to Reproduce

```bash
git clone -q --branch feature/task.110.session-handoff-skill . /tmp/c && ln -s "$PWD/node_modules" /tmp/c/node_modules && cd /tmp/c
mkdir -p docs/prd/prd.zz/epics/epic.1.zz
printf -- '---\ntitle: zz\n---\n# PRD zz\n\nbody\n' > docs/prd/prd.zz/prd.zz.md
printf -- '---\nepic_number: 1\ntitle: "[Epic 1] ZZ"\nstatus: draft\n---\n' > docs/prd/prd.zz/epics/epic.1.zz/epic.1.zz.md
printf -- '- x **1** <!-- cmd: npx prettier -l --config=shared/resources/generate-prd-epic-index.mjs skills/session-handoff/scripts/handoff-verify.mjs; expect: 1 -->\n' > /tmp/h.md
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/h9 CI=1 node skills/session-handoff/scripts/handoff-verify.mjs /tmp/h.md --json
grep -c epics-index-start docs/prd/prd.zz/prd.zz.md    # 1 — the document was rewritten by a read
```

## Expected Behavior

A flag whose value the tool **loads as code** never takes a path to a code file. Under the
identity principle the `npx` arm already claims for itself, either:

- hold `--config=`/`-c`/`--ignore-path=` values to a **data** file — `.json`, `.jsonc`, `.yaml`,
  `.yml`, `.toml`, or a dotfile name with no extension (`.prettierrc`, `.eslintrc`,
  `.markdownlint.jsonc`) — and hold `--format=`/`-f`/`--formatter=`/`--reporter=`/`-R`/
  `--reporters=` values to a **name** (`[A-Za-z0-9_-]+`: a built-in or an installed package, never
  a path); or
- drop the module-loading flags from `NPX_TOOLS` altogether — every one of these tools discovers
  its own config, and no handoff line in this repository passes one.

Either is a mechanism change, not a list edit: a `.mjs` config is refused because of what it *is*,
not because of where it sits.

## Actual Behavior

`--config=<relative path>` on prettier/eslint/stylelint/markdownlint and a formatter/reporter path
on eslint/stylelint/mocha/jest/vitest are admitted whenever the path is relative and contains no
`..`; the tool imports the module; the module's top level runs under the tool's argv. One shipped
module rewrites PRD documents on that path.

## Impact

A write to a tracked document through read mode, executed — the same class as bug.6 (gate 6),
bug.8 (gate 7) and bug.11 (gate 8), and the fourth HIGH on `handoff-verify.mjs`. This is not a
regression of the cycle-8 fix, which holds and is mutation-proven; it is the arm the identity
principle had not yet been applied to, and the boundary the operator asked to have re-decided.
The bytes here are an index block; the mechanism is "any in-repo module, under any argv", and the
scan that found two unguarded modules today is not a guarantee about tomorrow's.

## Recommendation

Under the strike rule: replace the mechanism, not the list. Value classes, not path shapes —
`valueKind: data | name` per flag in the npx specs, checked in `valueOk` beside the existing
`valuePatterns`, so `--config=x.mjs` and `-f ./x.js` are refused by kind. Refused-list tests for the
executed spelling and for each tool's loader flag with a `.js`/`.mjs`/`.cjs`/`.ts` value; allowed
tests for `--config=.prettierrc`, `--config=.eslintrc.json`, `-f json`, `-R spec`. Correct the
SKILL.md npx row and retire the PRB-6 "accepted boundary" note wherever it is restated.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 9 — under the fourth strike, halt waived by the operator)

**Root Cause**: `NPX_TOOLS` held every flag *value* to the path rule (relative, no `..`) regardless of what the tool does with it. For `--config=`, `-c`, `--ignore-path=`, `-p` (a config the tool *loads*) and `--format=`, `-f`, `--formatter=`, `--reporter=`, `-R`, `--reporters=` (a module the tool *requires*) the value is code, and the interpreter arms' cycle-8 principle — runnable code is named by identity, never by shape — had not been applied to it. Worse, the spaced forms (`-c x`, `-f x`, `-R x`, `-p x`) were bare flags whose value fell through as an ordinary positional, so it was never judged by the flag it belonged to at all.

**Strike move — replace the mechanism.** A loaded value is now judged by **kind**, not by path: each such flag declares `valueKinds` — `data` (a file the tool parses: `.json` `.jsonc` `.json5` `.yaml` `.yml` `.toml`, or an extensionless dotfile such as `.prettierrc` / `.eslintrc` / `.prettierignore`, relative, no `..`) or `name` (`[A-Za-z0-9_-]+` — a built-in formatter/reporter or an installed package, never a path). `valueOk` checks the kind first of all and it is a full answer; the spaced forms are `valueFlags`, so the value is consumed and judged by its flag (the gate-7 `gh -R` mechanism). `.prettierrc.js`, `eslint.config.mjs`, `-f ./x.js`, `-R shared/…/x.js` are refused for what they are, wherever they sit. Deleting the loader flags was the alternative and was not taken: `--config=.prettierrc.json` and `-f json` are legitimate handoff spellings, and the kind rule keeps them.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `DATA_FILE`, `BARE_NAME`, `VALUE_KINDS`; `valueOk` checks `spec.valueKinds[name]` first; `NPX_TOOLS` prettier/eslint/markdownlint/markdownlint-cli2/stylelint/jest/vitest/mocha/shellcheck carry `valueFlags` + `valueKinds` (`-c`/`-f`/`-R`/`-p`/`-S`/`-s` moved from bare flags to value flags); the gate-3 PRB-6 comment replaced
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: the executed spelling (assembled from parts), `--config=<in-repo .mjs>`, `.prettierrc.js`, `.prettierrc.cjs`, `--config=` (empty), `--ignore-path=x.js`, `-c shared/…/registry-tick.js`, `eslint.config.mjs`, `-f <path>`, `--format=./x.js`, `-f=json`, `-R <path>`, `--reporter=./rep.cjs`, `--formatter=<path>`, `stylelint.config.js`, `-c <js>` on markdownlint, `.markdownlint-cli2.mjs`, `--reporters=./x.js`, `--reporter=../x.js`, `-f /x` and `-s ./sh` on shellcheck; allowed: `.prettierrc`, `.prettierrc.json`, `config/prettier.yaml`, `.prettierignore`, `.eslintrc.json`/`.yml`, `-f json`, `--format=stylish`, `.stylelintrc` + `--formatter=json`, `.markdownlint.json` + `-p .markdownlintignore`, `.markdownlint-cli2.jsonc`, `--reporters=default`, `-R spec --reporter=dot`, `--reporter=dot`, shellcheck `-f gcc -S warning -s bash --shell=sh --severity=error`
- `skills/session-handoff/SKILL.md` — npx row (kinds, the executed evidence, the retired "in-repo code is trusted" acceptance); refused-by-construction list

**Testing**: 31/31. Mutation-proved red: the kind check removed; `data` admitting `.js`; `name` admitting a path — each turned the refused-list test red. Re-executed through the fixed verifier in the scratch clone (stripped env): the PRD spelling, the canary-import spelling and `npx eslint -c <shipped .js> .` all `unverifiable: not on whitelist: npx`; the consumer-shaped PRD's md5 unchanged; no canary file; `--config=.prettierrc.json` (a data value) ran.

**Verification Steps for QA**:
1. `isAllowed("npx prettier --check --config=x.mjs .").ok === false`; `isAllowed("npx eslint -f ./x.js .").ok === false`; `isAllowed("npx prettier --check --config=.prettierrc .").ok === true`; `isAllowed("npx eslint -f json .").ok === true`.
2. In a scratch clone with a `docs/prd/prd.zz/` tree, the bug's own spelling through read mode reads `unverifiable` and the PRD's md5 is unchanged.
3. Mutation: change `DATA_FILE` to admit `js` → the refused-list test goes red.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 9 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Fourth strike (halt waived by the operator): mechanism replaced — a loaded flag value is judged by kind (data file / bare name), never by path; spaced forms consume their value |
| 2026-09-15 | Closed | QA Engineer | QA cycle 10 — through the clone's own verifier at `efcd3ae3` (stripped env, listener up): the PRD spelling, the canary-import spelling, `npx eslint -c <shipped .js> .` and `npx mocha -R <shipped .js> x` all `unverifiable: not on whitelist: npx`; the consumer-shaped PRD's md5 unchanged; no canary file; `--config=.prettierrc` (a data value) ran and `confirmed`. 177 fresh kind spellings in-process (every loader flag × js/mjs/cjs/ts, joined and spaced, dot-dot, absolute, empty) refused; 109 data/name spellings admitted. Mutations M1 (kind check removed), M2 (`data` admits .js), M3 (`name` admits a path), M12 (spaced `-c` no longer consumed) each turned the named test red — `covered` ×4. One residual of the `name` premise filed separately as bug.17 (mocha resolves a bare reporter name against the cwd) |
