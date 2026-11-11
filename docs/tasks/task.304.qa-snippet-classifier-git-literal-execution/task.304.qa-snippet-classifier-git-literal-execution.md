---
id: task.304
title: "QA snippet classifier refuses git literal execution"
type: task
description: "Refuse the git forms that execute a plain literal string (-c key=value, --config-env, GIT_* environment prefixes, --upload-pack and --exec-path), which the classifier admits as runnable today and which write under bash."
tags: [qa-task, security, follow-up-294]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-11
updated: 2026-11-11
estimated_effort_hours: 8
github_issue:
---

# Technical Task: QA snippet classifier refuses git literal execution

**Status:** Ready for Review

Follow-up to [task 294](../task.294.qa-snippet-classifier-allow-list/task.294.qa-snippet-classifier-allow-list.md) (PR #874). Its QA gate recorded this gap under `recommendations.future` (`task.294.gate.1.qa-snippet-classifier-allow-list.yml`, `provenance: pre-existing`): the verdict is identical on `origin/develop`, and it sits outside that task's word-shape scope.

---

## 1. Overview

The QA snippet runner executes a documentation block only when `classifyBlock` calls it `runnable`. A `git` invocation whose arguments are plain literals passes every layer, including task 294's allow-list, because `git` is in `NON_EVALUATING_COMMANDS` and its subcommand is read from a closed list. But git itself runs some literal strings as commands. A block that looks like a read therefore executes a program and writes under bash.

**Scope**: refuse the git forms below in `shared/resources/qa-execute-snippets.mjs`, hold each refusal with a test that runs the form under real bash, and measure what the refusal costs on the repository's own documentation. It changes no other command's rule.

---

## 2. Motivation

### Current Problems

Each form below was run in a scratch repository on 2026-11-11, under bash, from the working tree at `develop` `cbaaf0e9`, and classified by `classifyBlock` from the same tree:

| Form (plain literal, no quotes) | `classifyBlock` | What bash did |
| --- | --- | --- |
| `git -c core.fsmonitor=./hook.sh status` | `runnable` | ran `hook.sh`, which created a file |
| `git ls-remote --upload-pack=touch\ X .` | `runnable` | ran the `touch` |
| `GIT_TRACE=/abs/path git status` | `runnable` (same verdict as the other `GIT_*` forms below) | created `/abs/path` (a relative value does not write: git needs an absolute path) |
| `GIT_EXTERNAL_DIFF=./hook.sh git diff` | `runnable` | runs the program when a diff has content (not shown in the run above: the scratch repo's diff was empty) |
| `git -c alias.zz=!touch\ X zz` | `mutating` | ran the alias, but the unknown subcommand `zz` is refused, so this shape is already held |
| `git log -1 --output=FILE`, `git diff --output=FILE` | `mutating` | wrote the file; already held |

1. **A read-looking block executes code.** The first four rows are admitted today. `core.fsmonitor`, `core.pager`, `core.sshCommand`, `GIT_SSH_COMMAND`, `GIT_PAGER`, `GIT_EXTERNAL_DIFF` and `GIT_CONFIG_COUNT`/`KEY`/`VALUE` belong to the same class: git treats the value as a command.
2. **`--upload-pack` is a new finding, not in the QA gate's list.** `git ls-remote --upload-pack=<command>` executes it, and `classifyBlock` calls the block runnable.
3. **The inherited cost estimate was wrong.** The gate said `git -c core.quotePath=false diff` appears in shipped runnable blocks, so a blanket refusal would cost real blocks. Measured below, no runnable block in the tracked Markdown carries a git global flag or a `GIT_*` assignment. The 24 lines that mention `git -c` are prose, plans and bug reports, not blocks the runner executes.
4. **The class is pre-existing and silent.** The task 294 differential's `residual` atom set never forms these shapes, so it cannot see them.

### Benefits of the Solution

1. **A block that mentions git config or env can no longer run code.** The rule is a refusal on the form, not on a list of spellings.
2. **Zero measured cost** on the documentation corpus, to be re-measured by the scan, not trusted from this document.
3. **The differential instrument sees the class**, with an atom set that forms it.
4. **The verdict stays explainable**: each refusal carries the `not-allow-listed: <class>` style reason task 294 introduced.

---

## 3. Technical Background

### Current Architecture

`classifyBlock` runs layers in order and the allow-list layer (`allowListViolation`) comes last. For `git`, the engine resolves the subcommand and compares it with a closed list:

- `SAFE_GIT_SUBCOMMANDS`, a `Set` of eleven read subcommands (`shared/resources/qa-execute-snippets.mjs:531`).
- `GIT_FLAGS_WITH_OPERAND`, the global flags that take a separate operand, `-C`, `-c`, `--git-dir`, `--work-tree`, `--namespace`, `--exec-path`, `--config-env`, `--super-prefix` (`:2521`). It exists so the operand is never read as the subcommand (BUG-6 #7). It skips the flag and its operand and judges only the subcommand.
- `gitSubcommand(tokensAfterGit)` (`:2536`) returns the subcommand, and the caller builds the word `git:<sub>` (`:2700`). A word `git:<sub>` is refused unless `<sub>` is in `SAFE_GIT_SUBCOMMANDS` (`:4011`).
- `NON_EVALUATING_COMMANDS` includes `git` (`:3348`), so the operands of `git` skip the plain-text check.

So `-c`, its value and a `GIT_*=` prefix are consumed or skipped before anything judges them. The forms in § 2 are admitted for exactly that reason.

(Each name above was found by `grep -n` on 2026-11-11; line numbers decay, so find them by the identifier.)

### Target Architecture

The engine refuses a block when any `git` invocation in it carries:

- a global `-c <value>`, or `--config-env`, or `--exec-path` (the three global flags that supply something git runs or loads; `-C`, `--git-dir`, `--work-tree`, `--namespace` and `--super-prefix` stay as they are, they select a path and execute nothing);
- any assignment to a name starting `GIT_`, in any position: a prefix on the command, a bare `GIT_X=value` line, `export GIT_X=…` or `env GIT_X=…` (refused by name in every position because `export`, `declare -x` and a bare assignment after `set -a` make the variable live for a later git command; measured under real bash, see the plan's Phase 1);
- a subcommand option that names a program to run: `--upload-pack`, `--exec` (the `ls-remote` spelling pair).

The refusal lands as one more class in `allowListViolation`, with a reason of the form `not-allow-listed: git ...`. The existing `-C` operand rule is unchanged.

### Measurements behind the design

- **Population**: every fenced block of every tracked `*.md` file, extracted with the engine's own `extractBlocks`, classified with `classifyBlock`. `command node` script over `git ls-files '*.md'`; 251 blocks are `runnable` on `develop` (agrees with `scripts/qa-snippets-docscan.mjs`, which reports `runnable on develop 251`).
- **The cost**: of those 251, the number whose code has a line matching `\bgit\s+(-[A-Za-z]|--[a-z-]+)` or `(^|\s)GIT_[A-Z_]+=` is **0**. The scan, not this sentence, is the record: Phase 1 puts the command and its count in the QA report.
- **Scope of the evidence**: tracked Markdown only. Blocks in untracked or generated files are not counted.

### Important Clarifications

- A **relative** `GIT_TRACE=file` does not write (git wants an absolute path), so a test of that form must use an absolute one, or it proves nothing.
- The refusal is on the form. It does not try to judge the value, because a value is a literal string git will run, which is the hazard.

---

## 4. Scope

### In Scope

✅ **Engine**: `git` global `-c`, `--config-env`, `--exec-path`; `GIT_*` environment prefixes; `--upload-pack` and `--exec` on `ls-remote`.
✅ **Tests**: a table of shapes run under real bash, controls that must stay `runnable`, and mutation proofs.
✅ **Instrument**: a `git` atom set for the differential, so the old engine writes and the new one does not.
✅ **Measurement**: docs-scan cost and timing, recorded in the QA report.
✅ **Docs**: `qa-runnable-prose-detection.md` §2a-iii and the `CHANGELOG.md` entry; `npm run bundle`.

### Out of Scope

❌ **Other commands' options** that execute a program (`curl`, `ssh`, `tar --to-command` and the like). Those have their own task if a measured hole exists.
❌ **Judging the value** of a `-c` option. The form is refused whatever the value is.
❌ **Config already on disk** (`.git/config` in the working directory): git reading its own repository's config is the same state any git command has.

---

## 5. Breaking Changes

None to the engine's API: `classifyBlock` and `isRunnableBlock` keep their signatures and return shapes.

### Behaviour change: git blocks that carry the refused forms stop running

**What Changed**: a block with `git -c …`, `--config-env`, `--exec-path`, a `GIT_*=` prefix, `--upload-pack` or `--exec` goes from `runnable` to `mutating`.

**Before**: `classifyBlock("git -c core.quotePath=false diff")` returns `{ klass: "runnable", reason: null }`.

**After**: it returns `{ klass: "mutating", reason: "not-allow-listed: git ..." }` (exact wording fixed in Phase 2).

**Impact**: measured 0 documentation blocks (§ 3). An author who needs one of these forms in a runnable example rewrites it without the flag; the refusal reason names the form.

**Migration Path**: none needed for the shipped corpus; the QA report lists any block the scan reports as newly refused.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.304.plan.qa-snippet-classifier-git-literal-execution.md](task.304.plan.qa-snippet-classifier-git-literal-execution.md)

### Phase 1: Calibrate the forms and the cost

**Risk Level**: Low

**Files**:
- `shared/resources/tests/qa-execute-snippets.test.mjs`

**Changes**:
- [x] Re-run each § 2 form under real bash in a scratch repository (absolute path for `GIT_TRACE`), and record which write or execute. Drop any that do not. (Dropped: `-ccore…` joined, `core.pager`, `--exec-path=`, a plain bare `GIT_X=`; these run nothing. Kept: `-c core.fsmonitor`, `--config-env`, `--upload-pack`/`--exec` and unambiguous prefixes, `GIT_*` prefix/`export`/`set -a`.)
- [x] Add the table as tests asserting both facts per row: bash writes, and the classifier's verdict. These tests go red on the old engine, which is the calibration.
- [x] Add a control table of git blocks that must stay `runnable` (`git log -1`, `git diff --name-only`, `git -C dir status`, `git rev-parse HEAD`, a block with no git).
- [x] Run the docs-scan measurement of § 3 and put the command and count in the QA report.

**Dependencies**: none

---

### Phase 2: Refuse the forms

**Risk Level**: Medium

**Files**:
- `shared/resources/qa-execute-snippets.mjs`

**Changes**:
- [x] Add the global-flag refusal where the `git` invocation is resolved, for `-c` and `--config-env` (`--exec-path` dropped: measured, it runs nothing for the safe subcommands), in both the `-c value` and `-cvalue` / `--config-env=value` spellings.
- [x] Add the `GIT_*=` refusal for any assignment to a `GIT_` name (prefix, bare, `export`, `declare`; `env` is refused earlier as a runner). It reads the scan's tokens, not raw text (task 292's rule: one tokenizer).
- [x] Flip the existing assertion `classifyBlock("git -c user.name=x log")` to `mutating` in the test `BUG-6: resolving git's subcommand past global flags keeps safe ones safe` (`shared/resources/tests/qa-execute-snippets.test.mjs`); it pins the old behaviour.
- [x] Add the `--upload-pack` / `--exec` refusal for `ls-remote`, the only safe subcommand that accepts them (`log --exclude`/`--encoding` start with `--e` and stay runnable).
- [x] Give each refusal a `not-allow-listed:` reason so the docs-scan can print it.

**Dependencies**: Phase 1

---

### Phase 3: Make the instrument see the class

**Risk Level**: Low

**Files**:
- `scripts/qa-snippets-differential.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`

**Changes**:
- [x] Add a `git` atom set to the differential (whole shapes plus separators), so the random run forms these shapes. Calibrate on the old engine first: it must write on some blocks of the set, as task 294 did for `residual`.
- [x] Add the set to `BARE_SETS` if it needs the bare form, and a slice test whose wall-clock stays under the existing bound.

**Dependencies**: Phase 2

---

### Phase 4: Measure, document, bundle

**Risk Level**: Low

**Files**:
- `shared/resources/qa-runnable-prose-detection.md`
- `CHANGELOG.md`
- generated `skills/*/references/` copies (bundler output only)

**Changes**:
- [x] Run `scripts/qa-snippets-docscan.mjs`: newly runnable must be 0; list each newly refused block with its reason. (3466 blocks; runnable 251 → 251; newly runnable 0, newly refused 0.)
- [x] Time the docs scan, five runs with `uptime`, against `develop`. (Medians: develop 428 ms, now 406 ms; load 3.3 beside each; no outliers dropped.)
- [x] Add a paragraph to §2a-iii naming the git forms and why they are refused; add the CHANGELOG entry citing `(task 304)`.
- [x] `npm run bundle`, then `npm run bundle:check`.

**Dependencies**: Phases 1 to 3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-execute-snippets.mjs` - the refusals (`allowListViolation` and the `git` resolution site)
2. ✅ `scripts/qa-snippets-differential.mjs` - the `git` atom set

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs` - bash-run table, controls, mutation-held refusals, slice

### Files to Modify (Documentation)

4. ✅ `shared/resources/qa-runnable-prose-detection.md` - §2a-iii
5. ✅ `CHANGELOG.md` - `(task 304)`
6. ✅ `skills/*/references/qa-execute-snippets.mjs`, `skills/*/references/qa-runnable-prose-detection.md` - regenerated by `npm run bundle`, never hand-edited

### Files to Delete

None.

Count command for the bundled copies: `git ls-files 'skills/*/references/qa-execute-snippets.mjs' | wc -l`, run by the developer at Phase 4 and recorded in the QA report.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `classifyBlock` and `isRunnableBlock` on each form, under both `-c value` and `-cvalue` spellings.

**Actions**:
- [x] Table: each § 2 form asserts that real bash writes or executes AND that the classifier refuses it. The bash half is the premise check, so the test fails if a form stops being a hazard.
- [x] Controls: the safe git blocks stay `runnable`.
- [x] **Defeat the first layer**: the `git:<sub>` check already refuses unknown subcommands, so a test uses a SAFE subcommand (`status`, `log`) with the hazard flag so only the new rule decides.
- [x] Non-vacuity: assert the table has at least the rows the document names.

**Command**: `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`

**Target**: the file stays green; the new rows red on the old engine.

### Mutation proofs

Each is applied with Edit to a snapshot of the engine, run, then restored from the snapshot (`cmp` and `git diff --quiet`):

- [x] Disable the `-c` refusal: the `-c` rows red. (Red: BUG-6 flip, the bash table, defeat-the-first-layer.)
- [x] Disable the `--config-env` refusal (`--exec-path` is not refused): those rows red. (Red: the bash table.)
- [x] Disable the `GIT_*=` refusal: the env rows red. (Red: the bash table, defeat-the-first-layer.)
- [x] Disable the `--upload-pack` / `--exec` refusal: those rows red. (Red: the bash table.)
- [x] Say in the QA report which test **only** the new layer turns red, and why the first layer cannot catch it. (`task.304 defeat the first layer …`: `status` and `log` are on `SAFE_GIT_SUBCOMMANDS`, so the `git:<sub>` check admits them and only the git rule refuses the hazard form.)

### Integration Tests

**Scope**: the docs-scan over the repository's tracked Markdown (`node scripts/qa-snippets-docscan.mjs`): exit 0, newly runnable 0.

### Performance Tests

**Metrics**: docs-scan wall-clock. **Baseline**: `develop`, measured in the same session. **Rule**: median of at least five runs per side, `uptime` beside each, outliers reported not dropped; recorded in the QA report.

---

## 9. Success Criteria

### Functional

- [x] `git -c <anything> <safe subcommand>`, `--config-env`, a `GIT_*=` prefix (plain, `export`, `set -a`) and `--upload-pack` / `--exec` classify `mutating`, each row shown to write or execute under real bash first (Phase 1 table, run on the old engine). `--exec-path` was measured to run nothing and is not refused.
- [x] The control table of safe git blocks stays `runnable`.
- [x] The differential run writes nothing on the new `git` atom set (600 blocks: 142 runnable, 0 writes), and the engine without the rule writes on some blocks of it (10 of 600; calibration), recorded in the QA report.
- [x] `node scripts/qa-snippets-docscan.mjs` reports `newly runnable: 0`, and every newly refused block is listed in the QA report with its reason (none: newly refused 0).

### Performance

- [x] Docs-scan median within +10% of `develop`: at least five runs per side, `uptime` beside each, outliers reported, recorded in the QA report. (Medians 428 ms develop, 406 ms now; load 3.3.)

### Code Quality

- [x] `CI=true` run of `shared/resources/tests/qa-execute-snippets.test.mjs` green (397 pass), and `npm run format:check` clean.
- [x] `npm run bundle:check` reports 0 problems.
- [x] Every refusal in § 8 is mutation-proven, the red tests named in the QA report.

### Migration

- [x] `CHANGELOG.md` cites `(task 304)`.
- [x] `qa-runnable-prose-detection.md` §2a-iii names the git forms and why they are refused.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

**1. A refusal that fails a safe block**
- **Risk**: matching `-c` or `GIT_` too loosely refuses blocks like `git log --oneline -c` (`-c` is a diff flag there, not the global flag) or a variable named `GIT_DIFF_EXCLUDES` (`skills/create-pr/SKILL.md`).
- **Probability**: Medium
- **Impact**: Minor (a block stops running; it never runs extra)
- **Mitigation**: the global `-c` is only the flag BEFORE the subcommand; `GIT_*=` is only an assignment prefix on a git command or an `export`; controls in Phase 1 include both near-misses.
- **Rollback**: revert the engine commit.

**2. A form the list misses**
- **Risk**: another git option or variable runs a string (`core.editor`, `GIT_ASKPASS`, `GIT_SSH`, `--receive-pack` on other subcommands).
- **Probability**: Medium
- **Impact**: Major (same hazard class)
- **Mitigation**: `GIT_*=` is refused wholesale, not by name; `-c` is refused wholesale. Only the subcommand options are named. Phase 1 checks each named option against git's manual for the eleven safe subcommands, and records any other option that runs a program.
- **Rollback**: forward fix.

### Low Risk Areas

**1. Docs-scan timing** — one more pass over the words; measured in Phase 4.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A previously runnable documentation block is refused and the owner needs it to run.
- The docs-scan shows `newly runnable` above 0.

**Steps**:
1. `git revert` the engine commit.
2. `npm run bundle`.
3. Re-run the docs-scan.

**Verification**: `node scripts/qa-snippets-docscan.mjs` reports `runnable on develop` equal to `now`.

---

### Partial Rollback (1-2 hours)

**When to Use**: one form's refusal misfires and the others hold.

**Steps**:
1. Revert only that refusal in the engine; keep the test rows for the others.
2. Re-run the suite and the docs-scan.

---

### Forward Fix (< 4 hours)

**When to Use**: a missed form (Risk 2). Add the form to the table, then the refusal.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- `newly runnable` above 0 on the docs-scan.

**Non-Critical (Forward Fix)**:
- A safe block refused by a loose match; narrow the match.

---

## Progress Tracking

- [x] Phase 1: Calibrate the forms and the cost
- [x] Phase 2: Refuse the forms
- [x] Phase 3: Make the instrument see the class
- [x] Phase 4: Measure, document, bundle

---

## References

- [task 294](../task.294.qa-snippet-classifier-allow-list/task.294.qa-snippet-classifier-allow-list.md) and its gate, `task.294.gate.1.qa-snippet-classifier-allow-list.yml`, `recommendations.future`
- `shared/resources/qa-runnable-prose-detection.md` §2a-iii
- `scripts/qa-snippets-docscan.mjs`, `scripts/qa-snippets-differential.mjs`

---

## Implementation Summary

**Completion Date:** 2026-11-11

**Approach:** the scan in `commandInvocations` now records every `GIT_*=` assignment it steps over (`words.gitEnv`), and `gitLiteralExecution` judges that list plus each `git` invocation's arguments (`-c`, `--config-env`, `ls-remote --upload-pack`/`--exec` and their unambiguous prefixes) and `export`/`declare`/`typeset`/`readonly`/`local` operands. `classifyBlock` calls it right after the word allow-list, gated by the same `allowList` switch, so `beforeAllowList` still shows the old verdict. The refusal is on the form, never the value.

**Calibration (real bash, 2026-11-11):** `-c core.fsmonitor`, `--config-env`, `--upload-pack` (separate and `=`), `--exec=`, `--upl=`, `--exe=`, `GIT_TRACE`/`GIT_EXTERNAL_DIFF` prefixes, `export GIT_SSH_COMMAND`, `declare -x`, bare `GIT_SSH_COMMAND` after `set -a` and `GIT_CONFIG_COUNT/KEY/VALUE` all ran code. Not hazards, so not rows: joined `-ccore…`, `-c core.pager` (no tty), `--exec-path=`, a plain bare `GIT_X=` (not exported), `--ex=` (ambiguous with `--exit-code`). The review's rationale for refusing bare assignments was corrected: the hazard is `export`/`declare -x`/`set -a`, not the bare line itself.

**Testing results:** `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs` 397 pass, 0 fail; `npm run ci:fast` 8376 pass, 0 fail. Docs-scan: 3466 blocks, runnable 251 before and now, newly runnable 0, newly refused 0; medians 428 ms (develop) vs 406 ms (now), load 3.3. Differential `git` set, 600 blocks: 142 runnable and 0 writes now; the engine without the rule wrote on 10. Mutation proofs: each of the four refusals disabled in turn turned the bash table red (the `-c` one also the BUG-6 flip and the defeat-the-first-layer test; `GIT_*` also defeat-the-first-layer), engine restored from a snapshot each time (`cmp`).

**Deferred Work:** none. `--exec-path` is not refused (measured: runs nothing for the safe subcommands); revisit only if a measured hole appears.

**Files:** `shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`, and the bundled copies under `skills/*/references/` (7 engine copies; regenerated, never hand-edited).

---

## Notes

- Effort estimate (8 hours) is the rubric's value, not an owner's choice: 9 success criteria, 4 phases, 6 files, medium risk.
- No tracker issue was created; run `/sync-github-task` to add one.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-11 | 1.0 | Initial draft | create-task |
| 2026-11-11 | 1.1 | Review passed (8/10); fixed: GIT_*= rule decided (any position, wholesale), existing BUG-6 test that pins `git -c … log` runnable named for the flip | review-task |
|  |  | Status → ready-for-development | review-task |
| 2026-11-11 | 1.2 | Implemented all four phases: git refusals, tests, differential `git` set, docs, bundle; status → ready-for-review | develop |
<!-- change-log-end -->
