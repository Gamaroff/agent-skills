# Bug Report: Task 110 - `node --test <file>` / `npm test -- <file>` runs any in-repo file as a test — read mode launched two `claude -p` sessions

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-11
**Severity**: HIGH
**Priority**: P1
**Status**: New
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

## Status History

| Date       | Status | Changed By  | Notes                                                                                                                                           |
| ---------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-15 | New    | QA Engineer | QA cycle 8 — executed in a scratch clone: `generate-skill-dependencies.mjs` re-created a deleted tracked file; `run-loop.mjs` spawned two `claude -p` sessions |
