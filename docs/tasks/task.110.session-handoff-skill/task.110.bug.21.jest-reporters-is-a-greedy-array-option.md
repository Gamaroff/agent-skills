# Bug Report: Task 110 - jest's `--reporters` is a greedy yargs array option, so a following "test path" positional is loaded as a reporter module

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-21
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (reviewer CR-1, confirmed by execution)
**Date Found**: 2026-09-15

## Description

The jest spec holds `--reporters` to the closed set `default|summary|github-actions` and lets any
further positional through as a test-path pattern. But `--reporters` is declared to yargs as
`type: 'array'`, and yargs-parser's default `greedy-arrays` keeps consuming every following
non-dash token into that array. So `npx jest --ci --reporters default ./zzrep.js` parses as
`reporters: ['default', './zzrep.js']` with no positional at all, and jest
`requireOrImportModule`s `./zzrep.js` as a custom reporter — an in-repo module executed under
jest's argv before any test runs (the bug.14 / bug.17 class). The joined `--reporters=default
./zzrep.js` behaves the same.

**Executed** (QA cycle 15), through the clone's own verifier at `72bf03b4` against the
consumer-shaped project with jest declared, under `env -i … CI=1`:

```
- jest reporters greedy <!-- cmd: npx jest --ci --reporters default ./zzrep.js; expect: /pass/ -->
```

→ verdict **`confirmed`** (`PASS __tests__/zz.test.js`), and `CANARY-JEST-REPORTER.txt` was written
by `./zzrep.js`'s top level. (A bare `zzrep.js` is refused by jest itself — "Could not resolve a
module for a custom reporter" — because jest resolves reporter names as modules; the `./` form is
the executable one, and `./x` passes `POS.PATHS`.)

Reviewer verified the parse on the installed jest-cli 30.3.0 + yargs-parser 21.1.1:
`reporters: ['default','./evil-reporter.js']`, positional `[]`.

## Steps to Reproduce

```bash
cd /tmp/c9 && npm i --silent jest
printf 'require("fs").writeFileSync("CANARY.txt","x"); module.exports = class { onRunComplete(){} };\n' > zzrep.js
mkdir -p __tests__ && printf 'test("t",()=>{expect(1).toBe(1)});\n' > __tests__/zz.test.js
printf -- '- x <!-- cmd: npx jest --ci --reporters default ./zzrep.js; expect: /pass/ -->\n' > /tmp/h.md
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/h9 CI=1 node <repo>/skills/session-handoff/scripts/handoff-verify.mjs /tmp/h.md --json --cwd /tmp/c9
ls CANARY.txt   # present
```

## Expected Behavior

No admitted flag is greedy: a value flag consumes exactly one token in the verifier's model, so
the model must match the tool's. For jest that means `--reporters` is not admitted at all (the
default reporter is what a handoff figure reads anyway), or it must be the last token on the
line. Identity principle: drop it.

## Actual Behavior

`--reporters <name>` consumes one token in the verifier and every following non-dash token in
jest; the surplus is loaded as reporter modules.

## Impact

An in-repo module executed through read mode, on a consumer with jest — the same class as
bug.14/bug.17, executed. HIGH by the same measure.

## Recommendation

Remove `--reporters` / `--reporters=` from the jest spec (and `JEST_REPORTERS`), or refuse any
positional after it. Refused-list tests for `npx jest --ci --reporters default ./x.js` and
`--reporters=default ./x.js`; allowed for `npx jest --ci -t x`. Audit: no other admitted flag on
any tool is an array/greedy option (mocha's array options — `--spec`, `--require`, `--file`,
`--global`, `--extension`, `--ignore` — are already refused; vitest's cac is not greedy).

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 15)

**Root Cause**: `--reporters` is declared to jest's yargs as an array option; yargs-parser's greedy-arrays default consumes every following non-dash token into it, while the verifier's model consumed exactly one. The surplus — judged as a test path — was loaded as a reporter module.

**Fix**: `--reporters` / `--reporters=` removed from the jest spec (and `JEST_REPORTERS` with it) — the identity principle: jest's default reporter is what a handoff figure reads. No other admitted flag on any tool is an array/greedy option (mocha's are already refused; vitest's cac and prettier's minimist are not greedy).

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — jest spec; comment
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `npx jest --ci --reporters default ./zzrep.js`, `--reporters=default ./x.js`, `--reporters=default`; allowed shapes rewritten without a reporter flag
- `skills/session-handoff/SKILL.md` — npx row

**Testing**: 33/33. Mutation-proved red: `--reporters=` re-admitted. Re-executed through the fixed verifier in consumer9 with jest: the greedy spelling → `unverifiable: not on whitelist: npx`, no canary; `npx jest --ci --silent` → `confirmed` (exit 0).

**Verification Steps for QA**:
1. `isAllowed("npx jest --ci --reporters default ./x.js").ok === false`; `isAllowed("npx jest --ci -t x").ok === true`.
2. Through the CLI in a project with jest and a root-level module: the greedy line reads `unverifiable`; no module runs.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 15 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `--reporters` removed from the jest spec (greedy yargs array) — identity principle |
| 2026-09-15 | Closed | QA Engineer | QA cycle 16 — through the clone's verifier at 9cf723a6 in consumer9 with jest and a root-level `zzrep.js`: `npx jest --ci --reporters default ./zzrep.js` → `unverifiable: not on whitelist: npx`, no canary; `npx jest --ci --silent` → `confirmed`. The five `--reporters` spellings of the 3,653-spelling regression set moved to refused, nothing else moved. M1 (`--reporters=` re-admitted) → red — `covered` |
