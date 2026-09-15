# Bug Report: Task 110 - `node --test <file>` / `npm test -- <file>` runs any in-repo file as a test — read mode launched two `claude -p` sessions

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-11
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

bug.8 closed the `node <script>` spelling: the script positional is now an exact allow-list
(`NODE_SCRIPTS`) with a per-entry spec. The **`--test`-mode** positional was left as it was —
`interpreterRule` treats every positional after `--test` as a pattern (`isSafePositional(a,
POS.PATHS)`), and the code comment says so: *"In test mode the positionals are patterns, not a
script."* To Node that is not true. An explicit file path given to `node --test` is executed as a
test file **regardless of its name** — the test runner spawns `node <file>` and reports its exit
code — so `node --test <any relative .js/.mjs/.cjs>` runs that file bare, and `npm test --
<file>` reaches the same runner through the `npm` arm (`testModeArgsOk` is the one rule for both).

That is the bug.8 class through the one spelling bug.8 did not hold. Two in-repo entry points act
when run bare, and both were **executed through read mode** in a scratch clone of this branch:

- `scripts/generate-skill-dependencies.mjs` — `isMain()` is true under the test runner's child
  (`process.argv[1]` is the file), so it **wrote** `shared/resources/skill-dependencies.json`. With
  the file deleted beforehand, the verifier line read `confirmed` with `measured:
  skill-dependencies.json: 128 skills, 71 edges …` and the file was back (`npm run
  generate-skill-deps`, the same action, is refused by the `npm` arm).
- `skills/loop-supervisor/scripts/run-loop.mjs` — `parseArgs` defaults the subcommand to **`run`**,
  so bare it starts the supervisor loop: it resolved `claude`, selected roadmap item T111 and
  **spawned two `claude -p` iterations** (`runs.jsonl`: `spawned: true`, two session ids, two
  transcripts written under `~/.claude/projects/…`, `.claude/state/loop-supervisor/` created in the
  tree). Each exited at turn 0 only because the scratch clone had no `.claude/skills` link
  (`Unknown command: /develop-next`); in a checkout where the skill is installed this is the
  autonomous `/develop-next` pipeline — a billed agent with Edit, Bash and push — launched from a
  read. The `claude` start-up also ran `npx` for a configured MCP server, which the local listener
  saw as `GET /@google-cloud%2fgcloud-mcp` ×4 with the registry pointed at it.

The verifier line for the `run-loop.mjs` spelling read **`confirmed`** (exit 0).

## Steps to Reproduce

```bash
git clone -q . /tmp/fx && ln -s "$PWD/node_modules" /tmp/fx/node_modules && cd /tmp/fx
rm shared/resources/skill-dependencies.json
printf -- '- x <!-- cmd: node --test scripts/generate-skill-dependencies.mjs; expect: /./ -->\n' > /tmp/p.md
command node skills/session-handoff/scripts/handoff-verify.mjs /tmp/p.md --json | jq '.lines[0].verdict'   # "confirmed"
ls shared/resources/skill-dependencies.json                                                         # back
printf -- '- y <!-- cmd: node --test skills/loop-supervisor/scripts/run-loop.mjs; expect: /./ -->\n' > /tmp/p.md
command node skills/session-handoff/scripts/handoff-verify.mjs /tmp/p.md --json | jq '.lines[0].verdict'   # "confirmed"
cat .claude/state/loop-supervisor/runs.jsonl                                                        # two spawned iterations
command node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(m.isAllowed("npm test -- skills/loop-supervisor/scripts/run-loop.mjs").ok))'   # true
```

## Expected Behavior

A `--test`-mode positional names something Node's own discovery would have run: a directory, or a
file matching the test-file patterns (`*.test.{js,mjs,cjs}`, `*-test.*`, `*_test.*`, `test.*`,
under `test/` or `tests/`). Anything else is a script, and a script is held to `NODE_SCRIPTS` —
the discipline bug.8 established — or refused. `npm test -- <file>` follows, because it is the same
rule.

## Actual Behavior

Any relative file the reader's tree contains runs bare under `node --test`, and its exit code is
the line's measurement.

## Impact

Read mode executes arbitrary in-repo entry points with their bare-invocation defaults. In this
repository that is a generated-file write and an autonomous agent launch; in a consumer repository
it is whatever `scripts/*.mjs` does when run with no arguments — build, seed, publish, deploy.

## Recommendation

Hold the `--test`-mode positional (in `testModeArgsOk`, so the `node` and `npm test --` arms move
together) to a directory or a test-file name per Node's default patterns; refused-list tests for
`node --test scripts/generate-skill-dependencies.mjs`, `node --test
skills/loop-supervisor/scripts/run-loop.mjs`, `npm test -- scripts/generate-skill-dependencies.mjs`
and `node --test node_modules/prettier/bin/prettier.cjs`; allowed tests for `node --test
skills/x/tests/`, `node --test skills/x/tests/y.test.js` and `npm test -- skills/x/tests/`. Correct
the code comment that calls test-mode positionals "patterns, not a script".

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 8 — under the third strike)

**Root Cause**: `interpreterRule` (and `npmTestTailOk`, the same rule through `npm test --`) judged a `--test`-mode positional by its *form* — relative, no `..` — on the belief that test-mode positionals are patterns. To node they are files: an explicitly named file is executed as a test whatever its name, and on node ≥ 22 a directory is not recursed at all (executed during the fix: `node --test scripts/` and `node --test skills/session-handoff/tests/` each fail as one test, running nothing). So the only positional that ever *worked* under current node was an explicit file — the dangerous form — and directories were dead weight.

**Third-strike move — replace the mechanism.** `handoff-verify.mjs` carried a HIGH in gates 6, 7 and 8, each for the same mechanism: admitting a path that reaches an interpreter by its shape (bug.6 `npm test -- /tmp/pre.js`; bug.8 `node node_modules/prettier/bin/prettier.cjs`; bug.11 `node --test <file>`). Each cycle held one more positional to a list. This cycle replaced the rule: **runnable code is named by identity, never by shape** — a path that would be executed is admitted only when an exact-list entry point matches it (`NODE_SCRIPTS` / `PY_SCRIPTS`, which held under gate 8's seven executed spellings), and a path that would be *discovered* is not admitted at all: in `--test` mode there is **no positional**; `node --test` alone is node's own discovery (`*.test.*` patterns, `node_modules` excluded), which is what `npm test` runs. Deleting the artifact was not available (the verifier is the task's deliverable) and waiving was not (a `claude -p` launch from a read is not a tolerable residual). What a handoff loses is `node --test <one file>`; it keeps `node --test`, `npm test`, `--test-name-pattern=` and every listed script.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `testModeArgsOk` admits flags only; `interpreterRule` refuses a positional in test mode and admits bare `--test` (`return testMode`); the arm's header comment records the three strikes and the replacement
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: both executed spellings, the `npm test --` forms, `node --test node_modules/prettier/bin/prettier.cjs`, a `*.test.js` file, a directory, `.`, `--experimental-strip-types scripts/x.ts`, bare `--test-only`; allowed: `node --test`, `node --test --test-only`, `--test-reporter=spec --test`, `--test-name-pattern=… --test`, `npm run test -- --test-name-pattern=x`, `npm test -- --test-concurrency=1` (the three directory/file positionals removed from the allowed list)
- `skills/session-handoff/SKILL.md` — `node` and `npm` rows; refused-by-construction list

**Testing**: 30/30. Executed through the fixed verifier in the scratch clone with the listener up: both gate-8 spellings, `npm test -- skills/loop-supervisor/scripts/run-loop.mjs` and the `next-id` / `remote show` spellings all `unverifiable: not on whitelist`; the deleted `skill-dependencies.json` stayed deleted, no `.claude/state` appeared, no request reached the listener. Mutation-proved: positionals re-admitted in `testModeArgsOk` → refused list red; `interpreterRule` running a test-mode positional → red; bare `--test` refused again → allowed list red.

**Verification Steps for QA**:
1. `isAllowed("node --test scripts/generate-skill-dependencies.mjs").ok === false`; same for `npm test -- <file>` and `node --test skills/x/tests/y.test.js`.
2. `isAllowed("node --test").ok === true` and `isAllowed("node --test --test-name-pattern=x").ok === true`.
3. In a scratch clone, the two gate-8 lines through read mode read `unverifiable`; the tree and `.claude/state` are untouched.

## Status History

| Date       | Status | Changed By  | Notes                                                                                                                                           |
| ---------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-15 | New    | QA Engineer | QA cycle 8 — executed in a scratch clone: `generate-skill-dependencies.mjs` re-created a deleted tracked file; `run-loop.mjs` spawned two `claude -p` sessions |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Third strike: mechanism replaced — no positional in `--test` mode through either arm; runnable code named by identity only |
| 2026-09-15 | Closed | QA Engineer | QA cycle 9 — executed through the CLI in a scratch clone (stripped env, no `claude` on PATH): `node --test scripts/generate-skill-dependencies.mjs`, `node --test skills/loop-supervisor/scripts/run-loop.mjs`, `npm test -- <file>` and `npm run test -- <file>` all `unverifiable: not on whitelist`; the deleted `skill-dependencies.json` stayed deleted, no `.claude/state`, nothing under the throwaway HOME. `node --test` and `--test-name-pattern=` still admitted (261-line allowed list). Three mutations (positional re-admitted in `testModeArgsOk`; `interpreterRule` running a test-mode positional; bare `--test` refused) each turned the named test red — `covered` ×3 |
