---
id: task.208
title: "Worktrees live inside the repo under a configurable root"
type: task
description: "Move every worktree the skills create from a sibling of the checkout to <repo>/.worktrees/<name>, behind a new developBatch.worktreeRoot key, and keep the generated worktrees out of the searches and copies the skills control."
tags: [worktrees, develop-batch, develop-next, select-next, create-parallel-stories, configuration, gitignore]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-14
updated: 2026-10-14
assignee:
estimated_effort_hours: 4
---

# Technical Task: Worktrees live inside the repo under a configurable root

**Status:** Ready for Review

---

## 1. Overview

Three skills put git worktrees **beside** the repository, and no two of them agree on where:

| Where | Path it uses |
| --- | --- |
| `skills/develop-next/scripts/select-next.mjs` `--batch` | `../tc-wt-<slug>` (`tc-` is a leftover from the project the selector was extracted from) |
| `skills/develop-batch/SKILL.md` Step 0 stale check | `../wt-*` |
| `skills/create-parallel-stories/SKILL.md` | `../worktrees/<story>` |

This task moves every one of them to `<repo>/<worktreeRoot>/<name>`, with a new config key
`developBatch.worktreeRoot` (default `.worktrees`). It also keeps those worktrees out of the
discovery and copying that the skills themselves control.

**Scope**: the selector, `develop-batch`, `create-parallel-stories`, the two runbooks that teach
sibling worktrees, the configuration reference, this repo's `.gitignore`, and the root-wide
searches and copies in shipped skills.

---

## 2. Motivation

### Current Problems

- **The stale-worktree check could never fire.** The selector emitted `../tc-wt-<slug>` and
  `develop-batch` Step 0 looked for `../wt-*`. No worktree the batch created could ever match.
- **A sibling directory is outside the repo's control.** The repo's `.gitignore` cannot cover it,
  and it lands in whatever folder holds the clone, beside unrelated projects.
- **A consumer-specific prefix shipped in a library script.** `skill-shape.test.mjs` banned `tc-wt`
  in `develop-batch`'s own files, but not in the selector that actually emitted it.

### Proposed Benefits

- One location rule, one key, one default, stated in the configuration reference.
- The stale check and the selector share a prefix that a test ties together.
- Worktrees inside the repo are covered by `.gitignore`, so `rg`, Claude's Grep/Glob and prettier
  skip them.

---

## 3. Technical Background

### Current Architecture

`select-next.mjs --batch` takes no config. `develop-batch` reads `skills-config.yaml` and passes
`developBatch.requireTouches` to the selector as the `--require-touches` flag. `worktreeFor(row)`
hard-coded the directory.

### Target Architecture

- `select-next.mjs --batch --worktree-root <dir>`, default `.worktrees`. `normaliseWorktreeRoot`
  refuses an absolute path or any `..` segment, so a root cannot leave the repository. Each
  worktree is `<root>/batch-<slug>`. The `batch-` prefix (`BATCH_WORKTREE_PREFIX`) is what the
  stale check looks for.
- `develop-batch` passes `developBatch.worktreeRoot` through the same way it passes
  `requireTouches`. A new Step 0.3a checks that the root is ignored. If it is not, it adds the root
  to `.git/info/exclude` (local, never committed) and recommends `.gitignore` in the run report.
  Without that, the next run's dirty-tree check would HALT on the batch's own worktrees.
- `create-parallel-stories` and the runbooks use `.worktrees/<name>` and tell the user to gitignore
  the root first.

### Discovery and linting

A sub-audit of every recursive walk in shipped scripts found that most are rooted in a fixed
subtree (`docs/`, `skills/`, a temp directory), skip dot-directories, or read one level only.
These reach `.worktrees/` from the repo root:

| Site | Fix |
| --- | --- |
| `qa-execute-snippets.mjs` `--copy` / `--copy-as` (`cpSync`, then `snapshotTree`) | skip nested **linked worktrees** (a `.git` file whose `gitdir:` points into `worktrees/`). Submodules and the copy root itself are kept |
| `qa-traceability-mapper-prompt.md` `grep -rl … .` (×2) | `--exclude-dir=.worktrees --exclude-dir=node_modules` |
| `test-co-location-enforcer` `find .` (×2) | `-path ./.worktrees -prune` (and the `-o` precedence of the second command is fixed) |
| `railway-postgres-crud` `find .` (×2) | `-not -path "./.worktrees/*"` |
| ripgrep-based tools, prettier | `/.worktrees/` in `.gitignore` |

Consumer test runners and linters that do not read `.gitignore` (Jest, a `tsconfig` `exclude`)
are not the skills' to change. The configuration reference and Step 0.3a tell the user to add the
root to them.

---

## 4. Scope

### In Scope

- `developBatch.worktreeRoot` key, selector flag, `develop-batch` wiring and ignore check
- `create-parallel-stories`, `docs/runbooks/create-parallel-stories.md`,
  `docs/runbooks/first-week/day-4-parallel.md`
- `docs/reference/configuration.md` schema block and key row
- `.gitignore` here, and the root-wide searches and copies listed above
- Tests: selector unit tests, `develop-batch` protocol pins, `qa-execute-snippets` copy tests

### Out of Scope

- `setup-consumer.sh` writing `.worktrees/` (or agent links) into a consumer's `.gitignore`. That
  is undecided (item 4 of the originating request)
- Claude Code's own `.claude/worktrees/` (not created by these skills)
- `story.4.4.plan.day-4-parallel.md`: an accepted story's plan, a historical record

---

## 5. Breaking Changes

- The selector's `worktrees[].dir` changes from `../tc-wt-<slug>` to `.worktrees/batch-<slug>`.
  A batch run in flight across the upgrade resumes from its state file, which records the old
  `dir`. Resume uses the recorded `dir`, so it keeps working. Only new admissions use the new root.
- A dangling `../tc-wt-*` worktree from an old run is no longer matched by the stale check.
  `git worktree list` still shows it, and the operator removes it with `git worktree remove`.

---

## 6. Implementation Plan

Phase detail: [`task.208.plan.worktree-root-config.md`](task.208.plan.worktree-root-config.md).

1. **Selector**: `--worktree-root`, `normaliseWorktreeRoot`, `BATCH_WORKTREE_PREFIX`, `worktreeFor(row, root)`.
2. **develop-batch**: config row, Step 0.3a ignore check, Step 0.4 stale check, Step 1 flag, state example.
3. **create-parallel-stories and runbooks**: `.worktrees/<name>`, gitignore first, `cd ../..` back.
4. **Discovery**: `.gitignore`, `qa-execute-snippets` copy filter, prose searches. `npm run bundle`.
5. **Docs and close-out**: configuration reference, CHANGELOG.

---

## 7. Files Summary

| Category | Files |
| --- | --- |
| Scripts | `skills/develop-next/scripts/select-next.mjs`, `shared/resources/qa-execute-snippets.mjs` (+ bundled copies) |
| Skills | `skills/develop-batch/SKILL.md`, `skills/create-parallel-stories/SKILL.md`, `skills/test-co-location-enforcer/SKILL.md`, `skills/railway-postgres-crud/SKILL.md`, `shared/resources/qa-traceability-mapper-prompt.md` (+ bundled copies) |
| Docs | `docs/reference/configuration.md`, `docs/runbooks/create-parallel-stories.md`, `docs/runbooks/first-week/day-4-parallel.md`, `CHANGELOG.md` |
| Config | `.gitignore` |
| Tests | `evals/develop-next/unit/select-next.test.mjs`, `evals/develop-batch/protocol/skill-shape.test.mjs`, `evals/develop-batch/unit/schedule.test.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs` |

---

## 8. Testing Strategy

- **Selector (behaviour)**: default dir is `.worktrees/batch-<slug>`. `opts.worktreeRoot` is
  honoured. `normaliseWorktreeRoot` accepts relative roots and refuses `..`, absolute, drive and
  empty roots. The CLI flag sets the root, and an escaping root exits 1.
- **develop-batch (protocol)**: the stale-check glob is built from the selector's exported
  `BATCH_WORKTREE_PREFIX`, so the two cannot drift apart again. The selector call passes
  `--worktree-root`, and the ignore check is present. No `../wt-` or `../worktrees/` path remains.
  The `tc-wt` ban now covers the selector too. `worktreeRoot` must appear in both SKILL.md and the
  configuration reference.
- **qa-execute-snippets (behaviour)**: a nested linked worktree is not copied by `--copy` or
  `--copy-as`. A submodule and ordinary files are copied. A copy root that is itself a worktree is
  still copied.
- **Mutation proof**: reverting `worktreeFor` to `../tc-wt-` fails 3 selector tests. Removing the
  copy filter fails the copy test. Dropping the root exemption fails the root test.

---

## 9. Success Criteria

- [ ] No shipped skill, script or runbook creates a worktree outside the repository
- [ ] `developBatch.worktreeRoot` is documented in `docs/reference/configuration.md` and `develop-batch` SKILL.md, default `.worktrees`
- [ ] The selector refuses a root that leaves the repository
- [ ] `develop-batch`'s stale check matches the paths the selector emits, enforced by a test
- [ ] `/.worktrees/` is in this repo's `.gitignore`, and `develop-batch` makes sure the root is ignored before creating a worktree
- [ ] The root-wide searches and copies in shipped skills skip `.worktrees/`
- [ ] `npm test`, `npm run eval:develop-next`, `npm run eval:develop-batch` and `npm run bundle:check` pass

---

## 10. Risk Assessment

- **Medium**: an in-flight batch across the upgrade. Mitigated: resume reads `dir` from the state
  file, never re-derives it.
- **Low**: a consumer whose CI or tests walk the whole tree finds `.worktrees/`. Mitigated by the
  ignore check, the run-report recommendation and the configuration reference note.
- **Low**: `isLinkedWorktree` misclassifies a directory. It requires a `.git` *file* whose `gitdir:`
  ends in `worktrees/<name>`, which a submodule (`modules/<name>`) does not match.

---

## 11. Rollback Plan

- **Immediate**: revert the merge commit. Worktrees already created under `.worktrees/` keep working.
  Remove them with `git worktree remove`.
- **Partial**: set `developBatch.worktreeRoot` to another in-repo path. A root outside the repo is
  refused by design.
- **Trigger**: a batch run that HALTs at Step 0 on its own worktrees, or a consumer test suite that
  starts finding duplicate checkouts.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-14
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.208.qa.1.worktree-root-config.md](./task.208.qa.1.worktree-root-config.md)
- **Gate File**: [task.208.gate.1.worktree-root-config.yml](./task.208.gate.1.worktree-root-config.yml)

### Test Coverage Summary
- **Tests Executed**: 5485 (5467 pass; 4 worktree-only failures, obs #39)
- **Phases Verified**: 5/5
- **Critical Issues**: 0 (1 medium, 1 low)
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
A symlinked worktree root still puts worktrees outside the repository ([TASK-208-BUG-1](./task.208.bug.1.symlinked-worktree-root-escapes-repo.md)). Everything else verified by execution.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-14 | 1.0     | Initial draft | create-task |
| 2026-10-14 |  | QA gate CONCERNS (90/100) — 1 medium, 1 low finding (retroactive QA of PR #657) | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Selector

- [x] Complete

### Phase 2: develop-batch

- [x] Complete

### Phase 3: create-parallel-stories and runbooks

- [x] Complete

### Phase 4: Discovery

- [x] Complete

### Phase 5: Docs and close-out

- [x] Complete

---

## References

- `docs/reference/configuration.md` § Key reference, `developBatch.worktreeRoot`
- `skills/develop-batch/SKILL.md` Step 0.3a, 0.4, Step 1

## Notes

- QA report: `task.208.qa.{n}.worktree-root-config.md`
- Quality gate: `task.208.gate.{n}.worktree-root-config.yml`, co-located in this directory
