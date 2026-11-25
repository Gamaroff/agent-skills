---
id: task.316
title: "qa-fix Step 4 guard looks inside nested gitlinks"
type: task
description: "Close the pre-existing false clean in the qa-fix Step 4 guard: a gitlink nested inside a checked-out gitlink is not looked into, so an untracked file two levels down reads clean."
tags: [qa-fix, develop-task, security, deferred-work]
category: refactoring
status: planned
priority: Low
created: 2026-11-21
updated: 2026-11-21
estimated_effort_hours: 4
---

# Task 316: qa-fix Step 4 guard looks inside nested gitlinks

**Status:** Planned

---

## 1. Overview

Task 286 made the qa-fix Step 4 guard look into each gitlink beneath a changed directory. It looks one level: a gitlink nested inside a checked-out gitlink is not listed, so an untracked file below it reads clean. QA gate 1 reproduced this and recorded it as pre-existing (the base had no gitlink look at all) and outside task 286's scope.

**Scope**: the gitlink look in the Step 4 fenced block of `skills/qa-fix/SKILL.md`, its prose, and `tests/qa-fix-step4-guard.test.js`.

**Key deliverables**:

1. Decide recursion versus a stated one-level limit, and record the decision.
2. If recursing: a changed directory over a gitlink that itself holds a gitlink with an untracked file is refused, with the path named.
3. Scenarios and mutants hold the decision.

**Depends on task 315.** Both edit the same gitlink look; this task recurses over the NUL-delimited read that task 315 introduces.

---

## 2. Motivation

### Current Problems

1. **One level is judged.** With an outer repository whose index holds gitlink `mid`, `mid` holding gitlink `inner`, and an untracked `mid/inner/untracked.txt`: `git -C mid ls-files --others --exclude-standard` lists nothing, and `git -C mid/inner ls-files --others --exclude-standard` lists `untracked.txt`. The guard asks only the first question of `mid` (`skills/qa-fix/SKILL.md:945`, `GU=$(git -C "$g" ls-files --others --exclude-standard …)`), so a changed directory above `mid` is admitted. Reproduced 2026-11-21 in a scratch repository; QA gate 1 reproduced it the same way.
2. **The gate's first remedy does not work on the shape the tests build.** Gate 1 offers `git submodule foreach --recursive`. In the scratch repository, whose gitlinks are plain nested repositories with no `.gitmodules` entry (the shape `gitlinkAt` builds at `tests/qa-fix-step4-guard.test.js:480`), it fails with `fatal: No url found for submodule path 'mid' in .gitmodules`. It visits registered submodules only, so on an unregistered gitlink it either errors or skips, and a skip reads clean. Reproduced 2026-11-21.

### Benefits

- The guard has no known input, at any depth it can reach, that reads an untracked file as absent.
- Or, if the decision is the stated limit, the prose says what is and is not judged, so no reader assumes more.

---

## 3. Technical Background

### Current Architecture

For each changed directory whose own top level is the repository's, the block lists gitlinks beneath it from the index (`GLIST=$(git --literal-pathspecs ls-files -s -- "$p")`, `skills/qa-fix/SKILL.md:939`) and, per gitlink, refuses when it is not its own top level (`:944`) or when `git -C "$g" ls-files --others --exclude-standard` lists a file (`:945`). The listing inside a gitlink is never taken, so a gitlink one level further down is invisible. The prose already says "each is looked into" for the outer level only (`skills/qa-fix/SKILL.md:892`).

The block is held by `tests/qa-fix-step4-guard.test.js` (47 tests with `CI=true`). `git grep -n 'nested' -- tests/qa-fix-step4-guard.test.js` shows the nested-repository scenarios hold a nested repository as the path itself or beneath it, and none holds a gitlink inside a gitlink.

### Verified remedy (run 2026-11-21, scratch repository, `GIT_CONFIG_GLOBAL=/dev/null`)

| Command | Result |
| --- | --- |
| `git ls-files -s` in the outer repository | `160000 … mid` |
| `git -C mid ls-files -s` | `160000 … inner` (the nested gitlink is listed, so a second listing finds it) |
| `git -C mid ls-files --others --exclude-standard` | nothing |
| `git -C mid/inner ls-files --others --exclude-standard` | `untracked.txt` |
| `git submodule foreach --recursive 'echo x'` | `fatal: No url found for submodule path 'mid' in .gitmodules` |

So recursion works by listing the gitlinks inside each gitlink and applying the same two questions; `foreach --recursive` does not reach an unregistered gitlink.

### Target Architecture

A function (or loop) applied to a gitlink `g`: confirm it is its own top level; refuse on an untracked file; then list `git -C "$g" ls-files -s -z`, and apply the same function to each `160000` entry it holds, at a depth cap (a number the plan fixes, for example 8). Exceeding the cap refuses with "could not look". Phase 1 may instead decide to document the one-level limit; the success criteria below name both outcomes.

### Important Clarifications

- **Property claimed, then run.** Both the false clean and the failure of `foreach --recursive` were reproduced before being written down (table above).
- **Pre-existing.** The base guard had no gitlink look at all, so this is not a regression of task 286.
- **Boundary.** The block is a boundary, so QA runs the probe engine against it (`fence:` form) with task 286's cases file. A case fixture holds text files only and cannot hold a gitlink (task 286 Phase 3), so the nested case is held by the Node scenarios.

---

## 4. Scope

### In Scope

✅ The recursion (or the stated one-level limit) in the gitlink look, and the prose.
✅ A nested-gitlink refused scenario, a clean nested-gitlink admitted scenario and a depth-cap refusal scenario.
✅ One mutant per new clause.

### Out of Scope

❌ The quoted-path read (task 315, which lands first).
❌ Following a symlink out of a gitlink, which the existing boundary refusal already covers.

---

## 5. Breaking Changes

None. The guard becomes stricter only for an input it previously admitted wrongly.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.316.plan.qa-fix-step4-guard-looks-inside-nested-gitlinks.md](task.316.plan.qa-fix-step4-guard-looks-inside-nested-gitlinks.md)

### Phase 1: Reproduce and decide

**Risk**: Low

- [ ] Re-run the table in Technical Background under bash and zsh.
- [ ] Decide recursion with a depth cap, or a stated one-level limit, and record the decision and the cap. Recommendation: recurse; the cost is one more listing per gitlink.

### Phase 2: Recurse into nested gitlinks

**Risk**: Medium

- [ ] Apply the two existing questions to each gitlink found inside a gitlink, to the depth cap, refusing on an untracked file, on "not its own top level" and on the cap.
- [ ] Keep the block free of positional `$0`–`$9` tokens.
- [ ] Update the literal copies the mutants revert by exact match in the same edit (`from:` strings in `tests/qa-fix-step4-guard.test.js` after `:890`).
- [ ] Update the prose paragraph above the block.

### Phase 3: Hold it with tests

**Risk**: Low

- [ ] Add a refused scenario: `mid` holding `inner` holding an untracked file, beneath a changed directory, with and without a trailing slash.
- [ ] Add an admitted scenario: the same shape, clean.
- [ ] Add a refused scenario for a chain deeper than the cap.
- [ ] Add one mutant per new clause and confirm each turns a test red.
- [ ] Re-run the probe engine with the task 286 cases file; the verdict stays `engages`.

---

## 7. Files Summary

Population measured with `git grep -ln 'Step 4: Validate' -- skills shared tests` at authoring time; the test records the count, not this prose.

Core implementation:
1. `skills/qa-fix/SKILL.md` — Step 4 block and prose.

Tests:
2. `tests/qa-fix-step4-guard.test.js` — scenarios and mutants.

Bundled copies: run `npm run bundle` after the change; commit any `references/` copy it touches.

Documentation:
3. `CHANGELOG.md` — an `[Unreleased]` entry citing (task 316).

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

- [ ] A changed directory over a gitlink that holds a gitlink with an untracked file is refused in bash and zsh, naming the path, held by a committed scenario. (If Phase 1 decides the one-level limit instead, this criterion is replaced by one stating the limit in the prose, with the decision recorded in the Change Log.)
- [ ] The same shape, clean, is admitted, held by a committed scenario.
- [ ] A chain deeper than the cap is refused as "could not look", held by a committed scenario.

### Performance

- [ ] No performance criterion applies; the block runs once per fix cycle. (Not applicable: no bound to meet.)

### Code Quality

- [ ] Each new clause has a mutant that turns a committed test red.
- [ ] `npm run validate -- skills/qa-fix/` and `npm run ci:fast` pass.

### Migration

- [ ] CHANGELOG.md has an `[Unreleased]` entry citing (task 316).

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Over-refusing a deep clean submodule tree.**
   - Risk: a project with nested submodules is blocked on a changed directory above them.
   - Probability: Low. Impact: Medium.
   - Mitigation: refuse only on an untracked file, on "not its own top level" and on the cap; hold the clean nested case with an admitted scenario.
   - Rollback: revert the commit.

### Low Risk Areas

1. **Another neighbouring shape.** Task 285 took five QA cycles, each finding a neighbour. Mitigation: the probe corpus is re-run and QA's safety re-probe applies as before.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- Triggers: the guard refuses a legitimate path in a consumer repository.
- Steps: revert the task's commit; re-run `npm run bundle`.
- Validation: `CI=true node --test tests/qa-fix-step4-guard.test.js` passes.

### Partial Rollback (1-2 hours)

- Revert the depth-cap clause alone and keep the recursion.

### Forward Fix (< 4 hours)

- Raise the cap, or narrow the recursion to refuse only on an untracked file.

### Rollback Triggers

- Critical: a legitimate fix cycle is blocked by the guard.
- Non-critical: a documentation gap; fix forward.

---

## Change Log

<!-- change-log-start -->
| Date       | Version | Description    | Author      |
| ---------- | ------- | -------------- | ----------- |
| 2026-11-21 | 1.0     | Initial draft — cut from task 286 QA gate 1 `recommendations.future` (nested gitlink); the `foreach --recursive` remedy measured and rejected | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Reproduce and decide
- [ ] Phase 2: Recurse into nested gitlinks
- [ ] Phase 3: Hold it with tests

---

## References

- [Task 286](../task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md)
- [Task 286 gate 1](../task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml) (`recommendations.future`)
- [Task 286 QA report 1](../task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa.1.qa-fix-step4-guard-looks-beneath-gitlinks.md)
- [Task 315](../task.315.qa-fix-step4-guard-reads-quoted-gitlink-paths/task.315.qa-fix-step4-guard-reads-quoted-gitlink-paths.md)

---

## Notes

QA artifacts will be created in this directory: `task.316.qa.{N}.*.md`, `task.316.gate.{N}.*.yml`, bug reports `task.316.bug.{N}.*.md`.
