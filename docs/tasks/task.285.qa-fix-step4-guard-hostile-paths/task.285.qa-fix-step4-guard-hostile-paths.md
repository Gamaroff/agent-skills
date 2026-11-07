---
id: task.285
title: "qa-fix Step 4 guard survives hostile paths"
type: task
description: "Close the two deferred task 268 findings in the qa-fix Step 4 untracked-files guard (shell metacharacters in a path, nested-repo or symlinked paths) and the advisory gaps beside them."
tags: [qa-fix, develop-task, security, deferred-work]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-07
updated: 2026-11-07
estimated_effort_hours: 4
github_issue: 855
---

# Task 285: qa-fix Step 4 guard survives hostile paths

**Status:** Ready for Review
**GitHub Issue**: [#855](https://github.com/Gamaroff/agent-skills/issues/855)

---

## 1. Overview

Task 268 shipped a Step 4 guard in `skills/qa-fix/SKILL.md` that refuses to run the fast gate while a changed path is untracked. QA gate 5 (budget spent) left two MEDIUM edge cases open, and the final review left two advisories. This task closes all four so the guard fails closed on every path shape it can be handed.

**Scope**: the Step 4 fenced block and its prose in `skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, and the one prose line in `shared/resources/develop-pipeline-step-3-develop-loop.md` that describes the same check.

---

## 2. Motivation

### Current Problems

1. **T268-QA-10 — metacharacters execute.** The slot is substituted into a double-quoted assignment (`skills/qa-fix/SKILL.md:849`, `CHANGED_PATHS="{changed-paths}"`). A path holding a command substitution, a backtick or a variable reference is executed or expanded by the shell. Gate 5 reproduced it: the substitution ran and created a file. A bare double quote is a syntax error and fails closed. The prose excludes only spaces and braces.
2. **T268-QA-11 — "could not look" reads as "clean".** A path inside a nested repository, or behind a symlinked directory, exists on disk, so the existence check at `SKILL.md:856` passes, while the outer `git ls-files` lists nothing for it. The guard exits 0. The reviewer ran this; it has not been re-run by the author of this task (Phase 1 reproduces it first).
3. **Advisory — the admitted cases are thin.** `tests/qa-fix-step4-guard.test.js` admits only a path inside an ignored directory. There is no tracked, deleted-tracked or intent-to-add case, and no mutant on the `--error-unmatch` branch, so that branch can be removed with every test still green.
4. **Advisory — a second description of the check.** `shared/resources/develop-pipeline-step-3-develop-loop.md:233` tells the reader to "stop while `git ls-files --others --exclude-standard` lists any". That is the bare unguarded form the Step 4 block exists to replace.

### Benefits

1. A hostile path can no longer run code in the agent's shell.
2. Every path the guard cannot judge is refused, never admitted.
3. The guard's three branches (existence, `--error-unmatch`, untracked listing) are each held by a test that goes red without them.
4. One description of the check, not two.

---

## 3. Technical Background

### Current Architecture

The Step 4 block (`skills/qa-fix/SKILL.md:832`, heading `### Step 4: Validate`) takes the space-separated changed paths through the `{changed-paths}` slot and does, in order:

1. refuses an empty, blank or brace-holding value (`SKILL.md:850-854`);
2. splits with `tr` and refuses any path that is neither on disk nor tracked (`SKILL.md:855-858`, uses `git --literal-pathspecs ls-files --error-unmatch`);
3. lists untracked files under the paths with `git --literal-pathspecs ls-files --others --exclude-standard` through `xargs` (`SKILL.md:859`) and refuses on any.

`tests/qa-fix-step4-guard.test.js` drives the block through `shared/resources/security-probe.mjs` (`fence:` entry) under bash and zsh. It holds ten cases, four mutants (`MUTANTS`) and a no-repo fail-closed test.

### Target Architecture

- The slot reaches the shell as data, never as shell syntax: the value is substituted into a **single-quoted heredoc** (a distinctive delimiter, e.g. `QA_FIX_CHANGED_PATHS_END`), so `$`, backticks and `"` stay inert. A refusal on its own cannot do this job, because the slot is substituted into the assignment text before any line of the block runs; the two mechanisms are therefore **layered, not alternatives**. The block then also refuses a value holding `\`, `'` or `"`, and a value equal to the delimiter. Why the refusal stays even with the heredoc: `xargs` (no `-0`) treats quotes and backslashes as syntax. Measured in this review: `printf '%s\n' "a'b" | xargs echo` exits with `unmatched single quote` (loud), but `printf '%s\n' 'a\' | xargs echo` prints `a`: the backslash is silently consumed, so the guard would judge path `a` while the file on disk is `a\`, and read clean where it should refuse. The alternative that removes the cause (`tr '\n' '\0' | xargs -0`) is portable to GNU and BSD `xargs`; Phase 2 may use it instead of the refusal for `\`, `'` and `"`, but must then hold the same hostile case with a test.
- The block refuses a path it cannot judge: a path whose resolved parent leaves this repository's tree (a `.git` boundary below the root, or a symlink along the way). Refusing is the chosen remedy; documenting the limit alone would keep "found nothing" and "could not look" indistinguishable.
- The loop doc line points at the Step 4 block instead of restating the bare command.

### Important Clarifications

- Gate 5 is `docs/tasks/task.268.qa-fix-finds-the-whole-defect-the-first-time/task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml`, `top_issues` T268-QA-10 and T268-QA-11. The task 268 document's `## Deferred Work` records both.
- Generated copies of `shared/resources/develop-pipeline-step-3-develop-loop.md` exist under `skills/*/references/` (for example `skills/develop-story/references/develop-pipeline-step-3-develop-loop.md:234`). Edit the source; `npm run bundle` regenerates the copies.
- `skills/qa-fix/SKILL.md` is a skill source, not a bundled copy: edit it directly.

---

## 4. Scope

### In Scope

✅ **Step 4 block**: metacharacter handling; nested-repo and symlink refusal; prose that says what is refused.
✅ **Tests**: hostile metacharacter cases, nested-repo and symlink cases, tracked / deleted-tracked / intent-to-add admitted cases, and a mutant for each new refusal plus one for `--error-unmatch`.
✅ **Loop doc**: the one line at `develop-pipeline-step-3-develop-loop.md:233`, plus regenerated bundles.

### Out of Scope

❌ **Supporting paths with spaces or braces** — already documented as unsupported; the guard refuses them.
❌ **Other fenced blocks in `qa-fix`** — only Step 4 is reported.
❌ **The fresh-reader fixture inputs from task 268** — a separate advisory about task 268's own record, not this guard.

---

## 5. Breaking Changes

None - API stable. A path that used to pass and now is refused (a metacharacter, a nested-repo or symlinked path) was an unsafe or unjudged input; the refusal message names the path and the reason.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.285.plan.qa-fix-step4-guard-hostile-paths.md](task.285.plan.qa-fix-step4-guard-hostile-paths.md)

### Phase 1: Reproduce both findings

**Risk Level**: Low

**Files**:
- `tests/qa-fix-step4-guard.test.js`

**Changes**:
- [x] Add a hostile case whose path holds a command substitution that would create a marker file, and assert the marker is absent (expect red on today's block).
- [x] Add a nested-repository case (`inner/f` under a directory holding `.git`) and a symlinked-directory case (`link/f`, `link -> real`) (expect red: today's block exits 0 on both; reproduced in this review with the block's own commands: `--error-unmatch` exits 1, `[ -e ]` passes, the untracked listing prints nothing). The nested-repo directory itself and the symlink itself are already listed as untracked (`inner/`, `link`) and refused today; only paths *below* them read clean.
- [x] Add a `backslash-mutation` case: a file `a\` exists beside a tracked clean file `a`, input `a\`; hostile, refused (expect red: `xargs` turns `a\` into `a`).
- [x] Any symlink or directory a case creates outside the engine's own fixture directory is removed in a `finally` or `t.after`.
- [x] Record the red output in the QA report (captured now in the implementation report's Decisions Log; QA copies it).

**Dependencies**: none.

---

### Phase 2: Close T268-QA-10

**Risk Level**: Medium

**Files**:
- `skills/qa-fix/SKILL.md`

**Changes**:
- [x] Substitute the slot through a single-quoted heredoc, then refuse a value holding `\`, `'` or `"` and a value equal to the delimiter (or feed `xargs -0`; see Target Architecture). Run the Phase 1 `meta-substitution` and `backslash-mutation` cases under bash and zsh.
- [x] State the refused characters in the prose beside the block, and remove the now-false sentence that says only spaces and braces are unsupported.

**Dependencies**: Phase 1.

---

### Phase 3: Close T268-QA-11

**Risk Level**: Medium

**Files**:
- `skills/qa-fix/SKILL.md`

**Changes**:
- [x] Refuse a path with a `.git` boundary below the repository root, or a symlink anywhere along its parents, naming the path.
- [x] State the refusal in the prose beside the block.

**Dependencies**: Phase 1.

---

### Phase 4: Hold every branch with a test

**Risk Level**: Low

**Files**:
- `tests/qa-fix-step4-guard.test.js`

**Changes**:
- [x] Add admitted cases: a tracked path, a deleted tracked path, an intent-to-add path.
- [x] Add a mutant that removes the `--error-unmatch` branch and one per new refusal; each must turn a named test red.
- [x] Make the no-repo test assert the refusal reason, not only the outcome.

**Dependencies**: Phases 2 and 3.

---

### Phase 5: One description of the check

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-step-3-develop-loop.md`
- generated copies under `skills/*/references/`

**Changes**:
- [x] Replace the bare command at line 233 with a pointer to the qa-fix Step 4 block.
- [x] Run `npm run bundle`.
- [x] Run the tests that pin this document by pattern (found by file name: `git grep -l develop-pipeline-step-3-develop-loop -- '*.test.*' 'tests/**' 'evals/**'`): `evals/shared/tests/fast-gate-precondition.test.mjs`, `qa-loop-fast-gate-outcomes.test.mjs`, `optional-file-lookups.test.mjs`, `transition-protocol-parity.test.mjs`, `qa-gate-preconditions-parity.test.mjs`, `ci-gate-parity.test.mjs` and the two `pipeline-shape` / `step-contract` protocol suites. No test pins the literal `stop while` (searched: 0 hits outside the doc and its bundled copies).

**Dependencies**: none.

---

## 7. Files Summary

**Definition of the list**: files this task edits; command `git diff --name-only develop...HEAD` at acceptance.

Core Implementation:
1. ✅ `skills/qa-fix/SKILL.md` - Step 4 block and prose

Tests:
2. ✅ `tests/qa-fix-step4-guard.test.js` - new cases and mutants

Documentation:
3. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` - line 233
4. ✅ `skills/*/references/develop-pipeline-step-3-develop-loop.md` - regenerated by `npm run bundle`
5. ✅ `CHANGELOG.md` - entry for task 285
6. ✅ `docs/tasks/task.268.qa-fix-finds-the-whole-defect-the-first-time/task.268.qa-fix-finds-the-whole-defect-the-first-time.md` - `## Deferred Work` entries marked closed by task 285

---

## 8. Testing Strategy

### Unit Tests

- Scope: the Step 4 block under bash and zsh through the probe engine.
- Command: `CI=true command node --test tests/qa-fix-step4-guard.test.js`
- Mutation: revert each new refusal and the `--error-unmatch` branch; a named test must go red for each. Tests that only pass through the first layer (the brace refusal) do not count for the new refusals.

### Integration Tests

- `npm run bundle -- --check` reports 0 problems; `python skills/create-skill/scripts/quick_validate.py skills/qa-fix` passes.

### Performance Tests

- Suite wall time: median of five alternating `CI=true npm test` runs on `develop` and the branch, within 10%, load read from `uptime` beside each run, outliers reported not dropped. Recorded in the QA report.

### Consumer Tests

- The develop-task, develop-story and develop-bug loops read Step 4; none restates the block.

---

## 9. Success Criteria

### Functional

- [ ] A path holding `$(…)`, a backtick or a variable reference is refused and executes nothing, shown by a test whose marker file stays absent.
- [ ] A path in a nested repository or behind a symlinked directory is refused with its path named, shown by a fixture each.
- [ ] A tracked, a deleted-tracked and an intent-to-add path are admitted.
- [ ] The loop doc no longer shows the bare `git ls-files --others` command as the check.

### Performance

- [ ] Suite median within 10% of `develop` (five alternating pairs, load recorded), figure recorded in the QA report.
- [ ] No new test takes longer than one second on its own. Measured with `CI=true command node --test --test-reporter=spec tests/qa-fix-step4-guard.test.js`, reading each new case's reported `(…ms)` (bound 1000 ms), with `uptime` recorded beside the run; the figure goes in the QA report.
- [ ] A path holding a backslash, single quote or double quote is refused (a named test per character class, bash and zsh), and a path `a\` beside a clean `a` is not judged as `a`.

### Code Quality

- [ ] Reverting each new refusal, and the `--error-unmatch` branch, turns a named test red (mutation list in the QA report).
- [ ] `npm run bundle -- --check` and `quick_validate` on `qa-fix` pass.
- [ ] `CI=true npm test` passes.

### Migration

- [ ] `CHANGELOG.md` cites task 285.
- [ ] The two task 268 findings are marked closed by task 285 in task 268's Deferred Work.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Over-refusal**
   - Risk: a legitimate path is refused (a path with `$` in a directory name).
   - Probability: Low. Impact: Medium (the loop halts, loudly).
   - Mitigation: the refusal names the character; the admitted-case tests cover ordinary paths.
   - Rollback: revert the Step 4 edit.
2. **Zsh and bash disagree**
   - Risk: the new check passes under one shell only.
   - Mitigation: the probe engine runs both; a case must hold under both.

### Low Risk Areas

1. Bundle drift from the loop-doc edit — mitigated by `npm run bundle -- --check` in the success criteria.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- Triggers: the guard refuses ordinary paths in a real run.
- Steps: revert the merge commit of the task's PR; run `npm run bundle`.
- Validation: `CI=true npm test`.

### Partial Rollback (1-2 hours)

- When to use: one refusal over-fires.
- Steps: revert that phase's edit and its tests together.

### Forward Fix (< 4 hours)

- When to use: the refusal message is unclear.
- Approach: fix forward.

### Rollback Triggers

- Critical: the guard admits a hostile path, or halts ordinary work.
- Non-critical: wording of a refusal.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                          | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------------ | ----------- |
| 2026-11-07 | 1.0     | Initial draft — cut from task 268 gate 5 T268-QA-10, T268-QA-11 and two advisories | create-task |
| 2026-11-07 |         | GitHub issue created (#855)                                                          | sync-github-task |
| 2026-11-07 | 1.1     | Review passed (8/10) — mechanisms layered (heredoc + refusal of `\ ' "` because `xargs` reads them as syntax), anchors fixed, bound command and Phase 5 pinned suites named | review-task |
| 2026-11-07 |         | Status → ready-for-development                                                        | review-task |
| 2026-11-07 |         | Implemented — 8 files, 15 new tests (17 in the file) | develop |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: Reproduce both findings
- [x] Phase 2: Close T268-QA-10
- [x] Phase 3: Close T268-QA-11
- [x] Phase 4: Hold every branch with a test
- [x] Phase 5: One description of the check

---

## References

- Task 268 gate 5: `docs/tasks/task.268.qa-fix-finds-the-whole-defect-the-first-time/task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml`
- Task 268 QA report 5, Code Review section (the two advisories)
- PR #854 (merged as `a1e9fd6e`)

---

## Notes

QA artifacts will be created in this directory: `task.285.qa.{N}.*.md`, `task.285.gate.{N}.*.yml`, bug reports `task.285.bug.{N}.*.md`.
