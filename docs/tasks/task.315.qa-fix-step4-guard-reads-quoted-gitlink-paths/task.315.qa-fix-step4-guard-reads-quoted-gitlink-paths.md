---
id: task.315
title: "qa-fix Step 4 guard reads quoted gitlink paths"
type: task
description: "Stop the qa-fix Step 4 guard refusing a clean, checked-out gitlink for the wrong reason when its path holds a non-ASCII byte, a double quote or a backslash: git C-quotes such a path and cd cannot follow it."
tags: [qa-fix, develop-task, deferred-work]
category: refactoring
status: planned
priority: Low
created: 2026-11-21
updated: 2026-11-21
estimated_effort_hours: 2
---

# Task 315: qa-fix Step 4 guard reads quoted gitlink paths

**Status:** Planned

---

## 1. Overview

Task 286 made the qa-fix Step 4 guard look beneath gitlinks. Its QA gate 1 recorded one finding it introduced: `git ls-files -s` prints a gitlink path in C-quoted form when the path holds a non-ASCII byte, so the guard's `cd -P` cannot find the directory and a clean, checked-out gitlink is refused as "not checked out". The refusal is on the safe side but states the wrong reason, and a consumer with such a submodule is blocked.

**Scope**: the gitlink listing in the Step 4 fenced block of `skills/qa-fix/SKILL.md`, and `tests/qa-fix-step4-guard.test.js`.

**Key deliverables**:

1. A clean, checked-out gitlink whose path holds a non-ASCII byte, a double quote or a backslash beneath a changed directory is admitted.
2. A gitlink with such a path and an untracked file inside it is still refused.
3. Scenarios and a mutant hold both.

---

## 2. Motivation

### Current Problems

1. **A quoted path cannot be entered.** With a gitlink at `pkg/sé`, `git ls-files -s -- pkg` prints `"pkg/s\303\251"` (quotes and octal escape in the text), and `cd -P -- "pkg/s\303\251"` fails with "No such file or directory". The loop then reads the gitlink as not checked out and refuses the directory (`skills/qa-fix/SKILL.md:939`, `GLIST=$(git --literal-pathspecs ls-files -s -- "$p")`; `:942`, `GP=$(cd -P -- "$g" …)`). Reproduced 2026-11-21 in a scratch repository.
2. **The gate's remedy is partial.** Gate 1 proposes `git -c core.quotePath=false ls-files -s`. That fixes a non-ASCII path, and does not fix a path holding a double quote or a backslash: with a gitlink at `pkg/a"b`, `core.quotePath=false` still prints `"pkg/a\"b"`. Only `-z` prints every path raw. Reproduced 2026-11-21.

### Benefits

- A consumer repository with a submodule named in a non-English language, or with an unusual character, is no longer blocked by a refusal that names the wrong cause.
- The refusal reason stays truthful: "could not look" means git could not look.

---

## 3. Technical Background

### Current Architecture

For each changed path that is a directory and whose own top level is the repository's, the block lists the index beneath it and keeps entries of mode `160000`: `GLIST=$(git --literal-pathspecs ls-files -s -- "$p")` (`skills/qa-fix/SKILL.md:939`), then `grep -E '^160000 ' | cut -f2- | while IFS= read -r g` (`:940`). Per gitlink it asks `cd -P -- "$g"` for the physical path (`:942`) and the nested top level (`:943`), refuses on a mismatch (`:944`), and refuses when `git -C "$g" ls-files --others --exclude-standard` lists anything (`:945`).

The block is held by `tests/qa-fix-step4-guard.test.js` (47 tests with `CI=true`). `gitlinkAt(d, rel, opts)` builds a gitlink at any relative path (`tests/qa-fix-step4-guard.test.js:480`); the gitlink scenarios are at `:506` (admitted), `:633`, `:640`, `:647`, `:661` (refused). The gitlink mutants are four entries after `:890`; the listing mutant's `from` string is `grep -E '^160000 '` (`:907`).

### Verified remedies (run 2026-11-21, scratch repository, `GIT_CONFIG_GLOBAL=/dev/null`)

| Command | Gitlink `pkg/sé` | Gitlink `pkg/a"b` |
| --- | --- | --- |
| `git ls-files -s -- pkg` | `"pkg/s\303\251"` (cd fails) | `"pkg/a\"b"` (cd fails) |
| `git -c core.quotePath=false ls-files -s -- pkg` | `pkg/sé` (cd works) | `"pkg/a\"b"` (cd fails) |
| `git ls-files -s -z -- pkg` | `pkg/sé` + NUL | `pkg/a"b` + NUL |
| `git ls-files -s -z … \| grep -zE '^160000 ' \| cut -z -f2-` | n/a | `pkg/a"b` + NUL (pipeline keeps the NUL) |

So the gate's `core.quotePath=false` is a partial remedy and `-z` is the complete one. The same `core.quotePath=false` form is already used elsewhere in the repository (`git grep -n quotePath -- skills`: `skills/develop-story/references/qa-re-review-scope.md:231`, which also uses `diff --name-only -z` at `:291`).

### Target Architecture

Read the gitlink list NUL-delimited: `git --literal-pathspecs ls-files -s -z -- "$p"` piped into `while IFS= read -r -d '' rec`, then split each record in the shell: the mode is `${rec%% *}`, and the path is everything after the first tab. Test the mode with `case`, so the block needs no `grep -z` or `cut -z` (the GNU-only form measured in the last table row; Phase 1 confirms the shell split under bash and zsh). Everything after the read is unchanged. A path holding a newline is then read whole, as well.

### Important Clarifications

- **Property claimed, then run.** The wrong refusal was reproduced and the three remedies measured before being written down (table above).
- **Not the changed-path list.** `CHANGED_PATHS` already refuses a backslash, single quote or double quote in a path the fix names (`skills/qa-fix/SKILL.md:911`). This task concerns the names of gitlinks found beneath a changed directory, which the fix did not name.
- **Boundary.** The block is a boundary, so QA runs the probe engine against it (`fence:` form) and the committed cases file for task 286 is reused.

---

## 4. Scope

### In Scope

✅ Reading the gitlink listing NUL-delimited in the Step 4 block, and the prose paragraph above it.
✅ A non-ASCII admitted scenario, a quote-in-name admitted scenario, and a refused scenario for an untracked file inside such a gitlink.
✅ One mutant for the NUL-delimited read.

### Out of Scope

❌ Recursing into a gitlink nested inside a gitlink (task 316).
❌ Any change to the changed-path metacharacter refusal.

---

## 5. Breaking Changes

None. The guard admits a clean gitlink it previously refused with the wrong reason; it refuses nothing new.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.315.plan.qa-fix-step4-guard-reads-quoted-gitlink-paths.md](task.315.plan.qa-fix-step4-guard-reads-quoted-gitlink-paths.md)

### Phase 1: Reproduce and decide

**Risk**: Low

- [ ] Re-run the three listing forms in a scratch repository under bash and zsh and confirm the table in Technical Background.
- [ ] Decide `-z` (complete) over `core.quotePath=false` (partial) and record it.

### Phase 2: Read the listing NUL-delimited

**Risk**: Medium

- [ ] Change the listing, filter, cut and read at `skills/qa-fix/SKILL.md:939-947` to the `-z` form.
- [ ] Keep the block free of positional `$0`–`$9` tokens (the CI guard fails on them).
- [ ] Update the literal copies the mutants revert by exact match (the listing mutant's `from` string at `tests/qa-fix-step4-guard.test.js:907`) in the same edit.
- [ ] Update the prose paragraph above the block.

### Phase 3: Hold it with tests

**Risk**: Low

- [ ] Add admitted scenarios: a clean gitlink at `pkg2/sé` and at `pkg2/a"b`, beneath `pkg2`.
- [ ] Add a refused scenario: a gitlink at `pkg2/sé` holding an untracked file.
- [ ] Add one mutant that restores the newline-delimited read and confirm the admitted scenarios turn red under it.
- [ ] Re-run the probe engine against the block with the task 286 cases file; the verdict stays `engages`.

---

## 7. Files Summary

Population measured with `git grep -ln 'Step 4: Validate' -- skills shared tests` at authoring time; the test records the count, not this prose.

Core implementation:
1. `skills/qa-fix/SKILL.md` — Step 4 block and prose.

Tests:
2. `tests/qa-fix-step4-guard.test.js` — scenarios and mutant.

Bundled copies: run `npm run bundle` after the change; commit any `references/` copy it touches.

Documentation:
3. `CHANGELOG.md` — an `[Unreleased]` entry citing (task 315).

---

## 8. Testing Strategy

### Unit Tests

- Scope: the Step 4 block run under bash and zsh by `tests/qa-fix-step4-guard.test.js`.
- Command: `CI=true node --test tests/qa-fix-step4-guard.test.js`
- Target: every new branch held by a scenario and a mutant that turns it red.

### Integration Tests

- The probe engine against the block: `command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file <cases.json> --repo-root "$(git rev-parse --show-toplevel)" --json`, with the cases file from task 286.
- `npm run ci:fast`.

### Performance Tests

None.

### Consumer Tests

- `npm run bundle:check` for bundled copies.

---

## 9. Success Criteria

### Functional

- [ ] A clean, checked-out gitlink at a non-ASCII path beneath a changed directory is admitted, in bash and zsh, held by a committed scenario.
- [ ] A clean gitlink whose path holds a double quote is admitted, held by a committed scenario.
- [ ] A gitlink at a non-ASCII path holding an untracked file is refused, held by a committed scenario.

### Performance

- [ ] No performance criterion applies; the block runs once per fix cycle. (Not applicable: no bound to meet.)

### Code Quality

- [ ] The NUL-delimited read has a mutant that turns a committed scenario red.
- [ ] `npm run validate -- skills/qa-fix/` and `npm run ci:fast` pass.

### Migration

- [ ] CHANGELOG.md has an `[Unreleased]` entry citing (task 315).

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A NUL-aware pipeline breaks on a shell or tool that lacks `-z`.**
   - Risk: `grep -z` or `cut -z` is a GNU option; BSD and busybox variants differ.
   - Probability: Medium. Impact: Medium.
   - Mitigation: read the list with `git ls-files -s -z` and filter in the `read` loop (`case "$mode" in 160000`), which needs no `-z` on `grep` or `cut`; run the scenarios under bash and zsh on the CI image.
   - Rollback: revert the commit.

### Low Risk Areas

1. **Another neighbouring path shape.** Mitigation: the probe corpus is re-run and QA's safety re-probe applies as before.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- Triggers: the guard refuses a legitimate gitlink, or a fix cycle hangs on the read.
- Steps: revert the task's commit; re-run `npm run bundle`.
- Validation: `CI=true node --test tests/qa-fix-step4-guard.test.js` passes.

### Partial Rollback (1-2 hours)

- Keep the scenarios, revert the block change, and mark the admitted scenarios as expected failures until a fix lands.

### Forward Fix (< 4 hours)

- Fall back to `core.quotePath=false` for the non-ASCII case alone if the NUL read proves unportable.

### Rollback Triggers

- Critical: a legitimate fix cycle is blocked by the guard.
- Non-critical: a documentation gap; fix forward.

---

## Change Log

<!-- change-log-start -->
| Date       | Version | Description    | Author      |
| ---------- | ------- | -------------- | ----------- |
| 2026-11-21 | 1.0     | Initial draft — cut from task 286 QA gate 1 `recommendations.future` (non-ASCII gitlink path); remedy widened to `-z` after measurement | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Reproduce and decide
- [ ] Phase 2: Read the listing NUL-delimited
- [ ] Phase 3: Hold it with tests

---

## References

- [Task 286](../task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md)
- [Task 286 gate 1](../task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml) (`recommendations.future`)
- [Task 286 QA report 1](../task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa.1.qa-fix-step4-guard-looks-beneath-gitlinks.md)
- PR #927 (the change that introduced the finding)

---

## Notes

QA artifacts will be created in this directory: `task.315.qa.{N}.*.md`, `task.315.gate.{N}.*.yml`, bug reports `task.315.bug.{N}.*.md`.
