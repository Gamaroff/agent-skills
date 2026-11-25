---
id: task.322.plan
title: "Implementation Plan: QA lists every new test, and reviewers end only their own processes"
type: plan
task-ref: task.322.review-evidence-is-complete-and-clean.md
---

# Implementation Plan: QA lists every new test, and reviewers end only their own processes

> Requirements and success criteria: [task.322.review-evidence-is-complete-and-clean.md](task.322.review-evidence-is-complete-and-clean.md)

## Overview

A small pure checker, one procedure that both QA skills cite, and one sentence in two prompts.

## Phase-by-Phase Implementation Guide

### Phase 1: The check

**`shared/resources/red-first.js`**, CommonJS, a peer of `finalise-record-preflight.js` (same exit codes,
same `--json` `reason`). Set `process.exitCode`, and never call `process.exit()` after a write.

Row form, one per new test, in a table of the QA report:

```markdown
| File | Test | On the merge base | Why | Proof |
| :-- | :-- | :-- | :-- | :-- |
| `tests/a.test.mjs` | refuses an empty list | red | asserts | |
| `tests/b.test.mjs` | keeps the order | green | passes without the change | drop the sort → `keeps the order` → covered |
```

- The key is the file and the test name. Compare them after trimming, and after undoing `\|`.
- A newline in a name is written as a space, by the procedure and by the reader.
- A proof counts when its last token is `covered`, by the table in `mutation-proving.md`. Import no
  second list of tokens: the one word is enough here.
- `makeFenceTracker` of `criteria-section.js` skips fenced lines. Task 320 exports it. If that task has
  not landed, add the same one-line export.

### Phase 2: The procedure and its callers

**`mutation-proving.md`**, new section before "Recording it". The listing, as run in the trial:

```bash
git worktree add -q --detach "$W" "$MERGE_BASE"
cd "$W"
# per file of: git diff --name-only --diff-filter=AM "$MERGE_BASE" "$HEAD_SHA" -- <the test globs>
#   base names: run it as it is here, when it exists here
#   then: git checkout -q "$HEAD_SHA" -- "$f", run it, and keep names and results
```

TAP lines: `^ *(not )?ok [0-9]+ - <name>`. Drop a trailing ` # SKIP` or ` # TODO` part. A skipped test
is neither red nor green: give it a `green` row, so it needs a proof.

A file that fails at load reports one failure under the file's own name and none of its tests. Detect it
by that name. Take the names from the head's own tree instead, with the result `load-failure`.

State plainly: use a scratch worktree, never the working tree; remove it with `git worktree remove`; the
suite's dependencies may have to be linked in.

**`qa-task` and `qa-story`**: one paragraph each, after the mutation-proof record form. When a criterion
asks that new tests were red before the change, run the procedure
(`references/mutation-proving.md#…`, a citation) and `references/red-first.js check`. A `missing` or
`unproven` answer is a gate finding.

`gating-rule-restatements.test.mjs` and `qa-re-review-scope-parity.test.mjs` read these two files. Run
both.

### Phase 3: The process rule

Beside "Reading is unrestricted; the scratch directory is the only place you write." in both prompts:

> A process you start (a server, a watcher, a `sleep`) is shared state too. Record its pid or process
> group when you start it, and end it by that number. Never end a process by name or pattern (`pkill`,
> `killall`, `kill $(pgrep …)`): other sessions run on this machine. The same holds for a port or a
> container.

**Population test**: every `shared/resources/*prompt*.md` that contains `If you EXECUTE anything` must
contain the rule. Assert at least two members, so an empty population is not a pass. Key the test on the
permission to execute, and not on `pkill`: `develop-pipeline-on-precompact.test.sh` uses that command on
its own stub, and is not a prompt.

### Phase 4: Records and bundle

`CHANGELOG.md` under `### Added` and `### Changed`. Then `npm run bundle` and `npm run bundle:check`.
Look at each skill's `closure M (±K)` line: `red-first.js` may be added to the two QA skills, and to none
of the other four that bundle `mutation-proving.md`.

## Key Patterns and References

- `finalise-record-preflight.js`: the shape of the CLI.
- `mutation-proving.md` § "What a mutation run can tell you": the outcome tokens.
- `tests/explore-prompts-no-write.test.js`: a population read from the tree, with control cases.

## Testing Approach

Temporary repositories only, with `GIT_CONFIG_GLOBAL=/dev/null`. Mutations: drop the file from the key;
accept any proof token; drop the fence rule; return `ok` on an empty list. Name the test each turns red.
