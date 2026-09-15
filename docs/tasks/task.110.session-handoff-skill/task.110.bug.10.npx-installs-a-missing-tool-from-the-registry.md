# Bug Report: Task 110 - `npx <tool>` installs the tool from the registry when it is not in `node_modules`

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
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

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | QA cycle 7 — non-TTY install executed with `cowsay@1.6.0`; the tool list checked against `node_modules/.bin` |
