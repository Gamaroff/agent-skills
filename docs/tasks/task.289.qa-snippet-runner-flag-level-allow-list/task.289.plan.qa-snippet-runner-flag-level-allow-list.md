---
id: task.289.plan
title: "Implementation Plan: QA snippet runner allows flags, not just commands"
type: plan
task-ref: task.289.qa-snippet-runner-flag-level-allow-list.md
---

# Implementation Plan: QA snippet runner allows flags, not just commands

> Requirements and success criteria: [task.289.qa-snippet-runner-flag-level-allow-list.md](task.289.qa-snippet-runner-flag-level-allow-list.md)

## Overview

Add a per-command flag table beside `SAFE_COMMANDS` in `shared/resources/qa-execute-snippets.mjs`, refuse any flag outside it, then add the operator and expansion refusals the table cannot express. Reproduce every gap first.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce and decide

**Files to modify:**
- `shared/resources/tests/qa-execute-snippets.test.mjs` — one table-driven test of seven gap blocks, each expected `mutating`, and a second table of controls expected `runnable`.

**Exact changes:** the seven gap blocks, from the task 274 gate and DoD:

```sh
sort --compress-program=./x f              # runs a program
find docs -fprint0 out                     # writes a file
sed '1e touch x' f                         # sed e command runs a shell command
cat <> out                                 # read-write redirection opens (creates) the file
find docs -de{lete,lete}                   # brace expansion builds -delete
find docs -name x${IFS}-delete             # word-splitting builds -delete
cat() { touch x; }; cat f                  # function shadows an allowed command
```

Run each through `classifyBlock` on the current engine first and record which already classify `mutating` (the gate says none do). The table drives the later phases.

**Owner question (ask, do not default):** accept the 17 refused blocks (`task.274…dod.1…md`) or add value tracking.

### Phase 2: The flag table

**Files to modify:**
- `shared/resources/qa-execute-snippets.mjs` — add `SAFE_FLAGS` next to `SAFE_COMMANDS` (`:407`): `{ sed: Set([...]), find: Set([...]), sort: Set([...]) }`.

**Exact changes:** where `classifyBlock` loops `DENY_PATTERNS` (`:1903`), also walk the flags of each allowed command with a table entry. A flag outside the entry returns `{ klass: "mutating", reason: "flag-not-allowed: <cmd> <flag>" }`. A command without an entry keeps today's behaviour until its audit says otherwise. Record the audit per command in a test (`AUDITED = { grep: "…", jq: "…" }`), and fail the test when a `SAFE_COMMANDS` member has no record.

### Phase 3: Operators and expansions

**Files to modify:**
- `shared/resources/qa-execute-snippets.mjs`

**Exact changes:** refuse `<>`; refuse a function definition `name() {` or `function name` where `name` is in `SAFE_COMMANDS`; refuse an argument of an allowed command that contains an unquoted `{a,b}` brace expansion or an unquoted `${IFS}`. Keep the controls runnable: `find docs/$X -name z` (the shape 4 control from task 274) and a quoted brace in a `grep` pattern.

### Phase 4: Real docs and prose

Re-run the classifier comparison (a scratch script over `git ls-files '*.md'`, comparing the develop engine and the new one) and record the command and its output in the QA report. Update `qa-runnable-prose-detection.md` and `probe-boundary-rule.md`, run `npm run bundle`, and add the CHANGELOG entry.

### Phase 5 (optional): the `ctx-wrap-` leak

`context-pressure-statusline.test.mjs` creates the directory at `:19` and removes `TMP` entries in an `after` hook. Find the path where a directory is created and not pushed, or where the hook does not run, and fix it. Split into its own task if it is not small.

## Key Patterns and References

- Task 274's shape tests are named, table-driven and mutation-proven (`shared/resources/tests/qa-execute-snippets.test.mjs`, the block near `:3806`). Copy that shape.
- Probe with `security-probe.mjs --fixture-copy` and a cases file, as in task 274's QA cycles.

## Testing Approach

Every gap is failing-first. Every phase is mutation-proven: revert the behaviour, confirm a named test goes red. Run `CI=true npm test` before pushing.
