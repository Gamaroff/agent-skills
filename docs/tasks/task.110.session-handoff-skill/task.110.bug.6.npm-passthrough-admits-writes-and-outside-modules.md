# Bug Report: Task 110 - The npm `--` passthrough admits a working-tree write and an outside-repo module load

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

`npmRule` forwards everything after `--` with no path rule: for `npm test` every dash token is
accepted as-is and positionals are `POS.ANY` (absolute allowed); for the `NPM_SCRIPTS` set the
same two shapes apply. Two allowed shapes compose into the outcomes the allow-list exists to refuse:

1. **A write, with no precondition.** `npm run format:check -- --write` runs `prettier --check .
   --write`, and prettier honours the `--write`: every file it can parse is rewritten in the
   reader's working tree. The contract lists `npm run format --check` and `npx prettier --write=.`
   as refused by construction; this is the same operation through the one arm that does not look
   at its arguments.
2. **A module load from outside the repo.** `npm test -- -r /tmp/evil.js` reaches the tail of the
   `test` script (`node --test …`), and in `--test` mode node keeps parsing its own options after
   the file patterns, so `/tmp/evil.js` is preloaded. The contract names `node --test x/ -r pre.js`
   as refused and the `node` arm refuses it; the `npm test` arm forwards it. Cycle 3 probed the
   relative form (`-r ./x`) and accepted it as in-repo; the absolute form was never tried.

Both were **executed**, not read (QA cycle 6, scratch fixture with the repo's prettier and node
v26.4.0): the `--write` run reported `Code style issues fixed in 6 files` and the probe file's
content changed; the `-r` run wrote its marker file.

## Steps to Reproduce

```bash
# fixture: package.json {"scripts":{"test":"node --test t.test.js","format:check":"prettier --check ."}}
printf 'const   x  =  1\n' > ugly.js
npm run format:check -- --write      # ugly.js is now `const x = 1;`
echo 'require("fs").writeFileSync(__dirname+"/MARKER","ran")' > /tmp/evil.js
npm test -- -r /tmp/evil.js          # /tmp/MARKER exists afterwards
```

`isAllowed()` returns `ok: true` for both strings (and for `--require=`, `--import=`,
`--test-reporter=`, `--experimental-loader=` with absolute values, and the quoted forms).

## Expected Behavior

Tokens after `--` are held to the same rule as every other arm: dash tokens must be on an
allow-list for the script they reach (or refused outright — `npm test` needs no arguments in a
handoff), and positionals follow `POS.PATHS` (no absolute, no `..`). `npm run format:check`,
`bundle:check`, `validate*` and `ci*` should accept **no** passthrough at all — none of them takes a
useful read-only argument.

## Actual Behavior

Any dash token and any absolute positional after `--` is forwarded to the script.

## Impact

A single committed handoff line rewrites the reader's uncommitted working tree, or preloads
arbitrary code from a path outside the repo — the two invariants the whitelist section of
`SKILL.md` states as the whole design. The write needs no attacker file on disk.

## Recommendation

Drop the `--` passthrough for `run` scripts other than `test`-family ones; for `npm test -- …`
apply `flagTokenOk` against `NODE_FLAGS`/`NODE_FLAG_PATTERN` (the `--test`-mode rule the `node`
arm already enforces) and `POS.PATHS` to positionals. Add all five absolute-value spellings and
`npm run format:check -- --write` to the refused-list test.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 6)

**Root Cause**: `npmRule` had two passthrough branches that never looked at their tokens: the `test` arm accepted any dash token and `POS.ANY` positionals after `--`, and the `NPM_SCRIPTS` arm did the same for every listed script. Everything after `--` is appended to the **last** command of the script, so for `format:check` it lands on `prettier --check .` (which honours `--write`) and for `test` it lands on `node --test …` (which, in test mode, keeps parsing its own options after the patterns). The `node` arm already refused exactly this shape; the `npm` arm reached the same binary through a different door.

**Fix**: `npm test -- …` and `npm run test -- …` are now held to the **same** node `--test`-mode rule the `node` arm applies — `testModeArgsOk()` is one function used by both, with dash tokens checked against `NODE_FLAGS`/`NODE_FLAG_PATTERN` via `flagTokenOk` (so joined values follow the path rule and `--test-reporter=` takes built-in names only) and positionals held to `POS.PATHS`. Every other `run` script takes **no tail at all** (`more.length === 0`); `test` was removed from `NPM_SCRIPTS` since it has its own arm. SKILL.md's whitelist table and refused-by-construction list state the rule.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `makeFlagOk`, `testModeArgsOk`, `npmTestTailOk`; `npmRule` rewritten
- `skills/session-handoff/tests/handoff-verify.test.js` — 17 refused shapes (the write; `-r` absolute and relative; `--require=` `--import=` `--loader=` `--experimental-loader=` `--test-reporter=` with absolute values; both quoted forms; an absolute positional; `run test` variants; a tail on `bundle:check` `validate` `test:platform` `eval:all`) and 3 allowed shapes (`run test -- --test-only`, `test -- skills/x/tests/`, `test -- --test-reporter=spec`)
- `skills/session-handoff/SKILL.md` — whitelist table row for `npm`; refused-by-construction list

**Testing**: 28/28 skill tests; the bug's own reproduction (`npm run format:check -- --write`, `npm test -- -r <abs>/evil.js`) placed in a scratch handoff and run through the CLI → both `unverifiable: not on whitelist: npm`, marker file absent, no working-tree writes. Mutation-proved twice: restoring the `NPM_SCRIPTS` passthrough → `whitelist: mutating shapes … are refused` red; loosening the `test` tail back to `POS.ANY`/any-dash → same test red.

**Verification Steps for QA**:
1. `isAllowed("npm run format:check -- --write").ok === false`; same for `npm test -- -r /tmp/evil.js` and the four joined absolute spellings.
2. `isAllowed("npm test -- --test-name-pattern=x").ok === true` — the read-only tail still works.
3. Re-run the bug's fixture: `ugly.js` unchanged, `/tmp/MARKER` absent.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | QA cycle 6 — executed in a scratch fixture |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | npm tail held to the node --test-mode rule; no tail on other scripts |
