---
id: task.304.plan
title: "Implementation Plan: QA snippet classifier refuses git literal execution"
type: plan
task-ref: task.304.qa-snippet-classifier-git-literal-execution.md
---

# Implementation Plan: QA snippet classifier refuses git literal execution

> Requirements and success criteria: [task.304.qa-snippet-classifier-git-literal-execution.md](task.304.qa-snippet-classifier-git-literal-execution.md)

## Overview

Refuse, in `shared/resources/qa-execute-snippets.mjs`, the git forms that make git run a literal string. Prove each against real bash first, refuse by form (not by value), and measure the cost on the tracked documentation, which was 0 blocks when this plan was written.

## Phase-by-Phase Implementation Guide

### Phase 1: Calibrate the forms and the cost

**Files to modify:**
- `shared/resources/tests/qa-execute-snippets.test.mjs`: add a `git literal execution` table next to task 294's residual table. Reuse the helper that runs a block under real bash in a temp directory (the residual table's runner), and reuse `beforeAllowList` only if a row needs both verdicts.

**Exact changes:**

Run each row in a scratch repository (`git init`, one empty commit, a `hook.sh` that `touch`es a marker). The 2026-11-11 session measured:

```
git -c core.fsmonitor=./hook.sh status           runnable; bash ran hook.sh
git ls-remote --upload-pack=touch\ X .           runnable; bash ran touch
GIT_TRACE=/abs/path git status                   runnable; bash created /abs/path (relative path: nothing)
GIT_EXTERNAL_DIFF=./hook.sh git diff             runnable; runs only when the diff has content
git -c alias.zz=!touch\ X zz                     mutating (unknown subcommand) — already held
git log -1 --output=FILE                         mutating — already held
```

Confirm `--exec-path=<dir>` and `--exec=` before listing them: the 2026-11-11 session did not run either. A row that does not write or execute is dropped from the refusal list and noted in the QA report.

Measure the cost with a `command node` script over `git ls-files '*.md'`: `extractBlocks` each file, `classifyBlock` each block, count the `runnable` ones whose code has a line matching `\bgit\s+(-[A-Za-z]|--[a-z-]+)` or `(^|\s)GIT_[A-Z_]+=`. It returned `runnable 251, with git global flag or GIT_ env: 0` on `develop` `cbaaf0e9`.

Control rows that must stay `runnable`: `git log -1`, `git diff --name-only`, `git -C dir status`, `git rev-parse HEAD`, and `git log --oneline -c` (a `-c` after the subcommand is a diff flag, not the global flag).

**Decided at review (2026-11-11), measure to confirm:** refuse **every** assignment to a name starting `GIT_`, wholesale by name, in any position: a command prefix, a bare assignment, `export` and `env`. Measured at develop (2026-11-11, real bash): a plain bare `GIT_SSH_COMMAND=./hook.sh` then `git ls-remote ssh://…` does **not** run the program (a shell variable is not exported), but `export GIT_X=…`, `declare -x GIT_X=…`, and a bare assignment after `set -a` do, so a rule on the prefix form alone is open to the `export`/`declare -x`/`set -a` family. Refusing by name in every position closes that family without enumerating it. The cost is that `skills/create-pr/SKILL.md`'s ordinary variable `GIT_DIFF_EXCLUDES=""` would also be refused; Phase 1 confirms the block holding it is already non-runnable (it ends in `eval git diff …`), so the cost is 0 measured blocks. A closed list of git's variables was rejected because it misses any variable git adds later. Put a row for the bare-assignment form (`GIT_PAGER=./hook.sh` then `git log`, run under bash) in the table, and a row recording the `GIT_DIFF_EXCLUDES` verdict, and say in the QA report why the closed list lost.

**An existing test pins the old behaviour.** `shared/resources/tests/qa-execute-snippets.test.mjs` asserts `classifyBlock("git -c user.name=x log").klass === "runnable"` in the test titled `BUG-6: resolving git's subcommand past global flags keeps safe ones safe` (search by that title; the line was 1561 on 2026-11-11, found with `git grep -nE 'git -c ' -- '*.test.*'`). Phase 2 flips that one assertion to `mutating` and moves the `-c` case into the new table; the other two assertions in that test (`-C`, `--git-dir`) stay. `shared/resources/tests/qa-scope-from-head.test.mjs` quotes a `git -c core.quotePath=false` line as text (`canon.includes`), so it does not classify it and needs no change.

### Phase 2: Refuse the forms

**Files to modify:**
- `shared/resources/qa-execute-snippets.mjs`: the `git` resolution site (search `tok === "git"`, where the word `git:<sub>` is built) and `allowListViolation`.

**Exact changes:**

1. At the `git` resolution site, read the tokens between `git` and the subcommand. A token equal to `-c`, `--config-env` or `--exec-path`, or starting `-c` followed by more text, `--config-env=` or `--exec-path=`, produces a refused word (for example `git:-c`), so the existing `git:` word check in the unknown-word list refuses it. Keep `GIT_FLAGS_WITH_OPERAND` as it is: it still skips the operand so it is not read as the subcommand.
2. `GIT_*=` prefix: assignments before a command are skipped by the invocation scan (the code that handles `P=$(git …)`); add the check there on the tokenizer's words, for a prefix on a command or `export`/`env`.
3. Options: for the safe subcommands, an option word equal to `--upload-pack`, `--upload-pack=…` or `--exec`, `--exec=…` refuses.
4. Reason text: follow task 294's `not-allow-listed: <class>` form; add a class name per rule so the docs-scan prints something a reader can act on.

Do not read raw text. Task 292 made one tokenizer the only lexical reader.

### Phase 3: Make the instrument see the class

**Files to modify:**
- `scripts/qa-snippets-differential.mjs`: add a `git` atom set beside `residual` (whole shapes plus separators). Look at how `residual` is declared (`:214` when this was written) and copy the structure.
- `shared/resources/tests/qa-execute-snippets.test.mjs`: a slice test, reusing the existing bound.

**Exact changes:**

Calibrate first: on the OLD engine the set must make real bash write on some blocks. If it forms none, the instrument is blind, as the mixed `indirect` set was for task 294's residuals. Fix the atoms before trusting the new engine's zero.

### Phase 4: Measure, document, bundle

**Files to modify:**
- `shared/resources/qa-runnable-prose-detection.md` §2a-iii: one paragraph naming the git forms and the reason.
- `CHANGELOG.md`: entry citing `(task 304)`.
- `npm run bundle` regenerates `skills/*/references/` copies. Never edit them.

**Exact changes:**

Run `node scripts/qa-snippets-docscan.mjs` (exit 0 means nothing newly runnable). Time it five runs per side with `uptime` beside each, against `develop`. Put the command, the counts, the timings and every newly refused block with its reason in the QA report, which is committed before `/finalise` grades the criteria.

## Key Patterns and References

- Task 294's procedure for mutation proofs: snapshot the engine, disable one behaviour with Edit, run the suite, restore from the snapshot, `cmp` and `git diff --quiet`.
- Task 294's residual table, its `beforeAllowList` helper and its docs-scan reason lookup (`classifyBlock` returns `{ klass, reason }`).
- Task 292: one tokenizer. Task 293: default-deny rules, not a list of spellings.

## Testing Approach

- `CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs` for the file; the heavy suites go to the LAN server with `npm run test:remote`.
- The file is load-flaky (multi-second assertion times under load): re-run it alone before believing a timing failure.
