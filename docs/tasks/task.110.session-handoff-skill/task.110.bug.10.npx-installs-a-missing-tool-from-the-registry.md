# Bug Report: Task 110 - `npx <tool>` installs the tool from the registry when it is not in `node_modules`

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

`npxRule` accepts an optional `--no-install` / `--no` prefix and then one of ten tool names. Of the
ten, this repository installs only `prettier`; `eslint`, `tsc`, `markdownlint`, `markdownlint-cli2`,
`stylelint`, `jest`, `vitest`, `mocha` and `shellcheck` are absent from `node_modules/.bin`. The
runner spawns with `stdio: ["ignore", …]` and `CI=1`, and under a non-TTY stdin npm ≥ 7 does not
prompt before installing a missing package — it prints `npm warn exec The following package was
not found and will be installed` and runs it. **Executed** (QA cycle 7, npm 11.17.0):
`CI=1 npx cowsay@1.6.0 probe </dev/null` installed and ran the package with no prompt. So a handoff
line `npx tsc --noEmit` on a machine without TypeScript downloads and executes the npm package named
`tsc` — which is not TypeScript — and `npx mocha` / `npx stylelint` fetch and run registry code the
repository never vetted.

## Steps to Reproduce

```bash
ls node_modules/.bin | grep -c stylelint                    # 0
CI=1 npx stylelint --version </dev/null                     # installs from the registry, runs
node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(m.isAllowed("npx tsc --noEmit").ok))'   # true
```

## Expected Behavior

A tool absent from the project is refused rather than downloaded: `npxRule` requires the
`--no-install`/`--no` prefix, or the runner injects `--no` into the spawned argv for the `npx` arm.

## Actual Behavior

The verifier fetches and runs a registry package on the reader's machine when the tool is not
installed locally.

## Impact

Network egress to the registry plus execution of code that is not in the repository. The package
name is fixed to a real tool, so this is a registry-trust exposure rather than attacker-chosen
code — except `tsc`, where the registry package is unrelated to the TypeScript compiler.

## Recommendation

Require `--no-install` (or inject `--no`) in the `npx` arm; refused-list test for a bare
`npx stylelint --version` and an allowed test for `npx --no-install prettier --check .`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 7)

**Root Cause**: `npxRule` accepted an optional `--no-install` / `--no` prefix and otherwise let the bare tool name through; the runner spawns non-TTY with `CI=1`, under which npm 11 resolves a missing tool against the registry and installs it without the prompt a TTY would show. Measured on npm 11.17.0 during the fix: `--no-install` is rewritten by `npx-cli.js` to `--yes=false`, and a missing tool then fails with `npx canceled due to missing packages and no YES option`. `--no`, however, is **not** an alias at all on npx 7+ — it is an unknown option that swallows the next token as its value, so `npx --no prettier --check .` ran npm with `no=prettier` and printed npm's own version. Accepting it was a second defect of the same rule.

**Fix**: `isAllowed` **injects** `--no-install` into the argv that runs for every approved `npx` command (`npxArgv`; once — an argv that already carries it is left alone), so a handoff written as `npx prettier --check .` keeps verifying and a missing tool is an exit-1 `stale`, never an install. This is the one place the approved argv and the running argv differ, and only by a flag that removes a capability; SKILL.md says so. `--no` is refused. Residual, documented in SKILL.md: npm still resolves the tool's name against the registry (one manifest GET) before deciding not to install.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `NPX_NO_INSTALL`, `npxRule`, `npxArgv`, `isAllowed`
- `skills/session-handoff/tests/handoff-verify.test.js` — new test `an approved npx argv runs with --no-install, injected once` (deep-equal on the argv for the bare, `command`-prefixed and already-prefixed spellings; `npm`/`git` argv untouched); refused: `npx --no prettier --check .`, a doubled `--no-install`, `npx stylelint --version`; the 2026-09-10 regression stub is keyed on the injected argv and asserts the measurement reached it
- `skills/session-handoff/SKILL.md` — `npx` row; the "argv the rule sees is the argv that runs" sentence names the exception

**Testing**: 29/29. Executed through the verifier in a scratch package with no `tsc` installed, `CI=1`, stdin closed: `npx tsc --noEmit` → `stale: moved: exit 0 → exit 1`, `node_modules` unchanged afterwards. Mutation-proved: removing the injection → the new test and the regression test red; re-accepting `--no` → the refused list red.

**Verification Steps for QA**:
1. `isAllowed("npx prettier --check .").argv` deep-equals `["npx","--no-install","prettier","--check","."]`.
2. In a scratch package with no `cowsay`: a handoff line `npx tsc --noEmit` through read mode with `CI=1 … </dev/null` reads `stale` and `ls node_modules` is unchanged; `~/.npm/_npx` gains no new entry.
3. `isAllowed("npx --no prettier --check .").ok === false`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | QA cycle 7 — non-TTY install executed with `cowsay@1.6.0`; the tool list checked against `node_modules/.bin` |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `--no-install` injected into every approved npx argv; `--no` refused (it is not an alias — it swallows the tool name) |
| 2026-09-15 | Closed | QA Engineer | QA cycle 8 — `npx eslint .` run through the CLI with the registry at a listener: argv carried `--no-install`, one manifest GET (retried once), no tarball, exit 1; `--no` and `npx stylelint --version` refused; injection and the non-alias mutation-proven covered |
