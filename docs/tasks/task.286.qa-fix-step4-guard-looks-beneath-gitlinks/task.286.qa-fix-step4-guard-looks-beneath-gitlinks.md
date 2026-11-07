---
id: task.286
title: "qa-fix Step 4 guard looks beneath gitlinks"
type: task
description: "Close the residual false clean left by task 285: a changed directory that contains a gitlink holding an untracked file reads clean in the qa-fix Step 4 guard. Fold in two small advisories from the same QA gate."
tags: [qa-fix, develop-task, security, deferred-work]
category: refactoring
status: planned
priority: Medium
created: 2026-11-07
updated: 2026-11-07
estimated_effort_hours: 4
---

# Task 286: qa-fix Step 4 guard looks beneath gitlinks

**Status:** Planned

---

## 1. Overview

Task 285 replaced the Step 4 parent walk in `skills/qa-fix/SKILL.md` with a physical-identity decision. Its final QA gate (gate 5, cycle 5 of 5) left one reproduced false clean that the cycle budget could not absorb, plus two small advisories. This task closes all three so the guard fails closed on every path shape it can be handed.

**Scope**: the Step 4 fenced block and its prose in `skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, and the probe cases file the QA gate uses for the block.

**Key deliverables**:

1. A changed directory whose subtree holds a gitlink with an untracked file beneath it is reported, as the gitlink path itself already is (CR-1).
2. An absolute path that reaches a repository subdirectory through an external symlink is either rewritten to its physical spelling or documented as intentionally refused (CR-3).
3. A repository rooted at `/` no longer disables the inside test (CR-2).

---

## 2. Motivation

### Current Problems

1. **CR-1: a directory above a gitlink reads clean.** QA reproduced it on head `4fc3b848` in bash and zsh. With `pkg2/sm` a tracked gitlink and `pkg2/sm/untr` untracked, the inputs `pkg2` and `pkg2/` exit 0 with no output, while `pkg2/sm` exits 1. The nested-repository probe runs `git -C "$DIR" rev-parse --show-toplevel` on the path's own directory only (`skills/qa-fix/SKILL.md:911`, `NEST=$(git -C "$DIR" rev-parse --show-toplevel …)`), and the outer `git ls-files --others` (`SKILL.md:918`) does not descend into a gitlink. The reviewer rated it high severity at medium confidence, so gate 5 recorded it as advisory.
2. **CR-3: a legitimate external-symlink route is refused.** An absolute path such as `/tmp/x/toSub/s`, where `toSub` is an external symlink to `repo/sub`, is refused by git as "outside repository", while the route through the repository root is admitted. The refusal is fail-loud and safe, but it is neither tested nor described (`SKILL.md:903`, `case "$LEX/" in "$TOP"/*) INSIDE=1 ;;`). Reported by the reviewer; not reproduced by QA.
3. **CR-2: a root repository disables the check.** When `TOP` is `/`, the pattern `"$TOP"/*` becomes `//*`, which no normalised path matches, so `INSIDE` is always empty (`SKILL.md:903`). Reported at low confidence; a repository at the filesystem root was not available to QA.

### Benefits

- The guard has no known input that reads an untracked file as absent.
- Each of the three shapes is held by a scenario and a mutant, so a later edit that reintroduces one turns a test red.

---

## 3. Technical Background

### Current Architecture

The Step 4 block (`skills/qa-fix/SKILL.md`, the fenced block under `### Step 4: Validate`) takes a list of changed paths and, per path: skips one not on disk (the earlier `--error-unmatch` check at `SKILL.md:890` demands it is tracked), compares a lexical spelling of the path (the working directory's physical path joined with the path, `.` and `..` folded in text) with its physical spelling, and refuses a path whose spelling is inside the repository and differs (`INSIDE`, `SKILL.md:903`). A nested repository is found when `git -C "$DIR" rev-parse --show-toplevel` (`SKILL.md:911`) differs from `TOP` (`SKILL.md:893`). The surviving paths go to `git ls-files --others --exclude-standard` (`SKILL.md:918`).

The block is held by `tests/qa-fix-step4-guard.test.js` (37 tests with `CI=true`). A gitlink as the path itself is held (`id: "gitlink-as-path"`, `tests/qa-fix-step4-guard.test.js:643`, refused at `:788`). No scenario covers a gitlink beneath a changed directory: `git grep -n gitlink -- tests/qa-fix-step4-guard.test.js` returns only the as-path case.

### Target Architecture

For each changed path that is a directory, the block lists gitlinks at or beneath it from the index (`git --literal-pathspecs ls-files -s -- "$p"`, entries with mode `160000`) and, for each, asks the nested repository whether it holds untracked files (`git -C "$g" ls-files --others --exclude-standard`). Any untracked file, or a gitlink that cannot be looked into (not checked out), makes the block refuse the changed path and print it, exactly as the existing refusals do. A clean gitlink is admitted.

### Important Clarifications

- **Property claimed, then run.** The false clean was reproduced in this session before being written down: in a scratch repository with tracked gitlink `pkg2/sm` and untracked `pkg2/sm/untr`, `pkg2` exits 0 and `pkg2/sm` exits 1 under both bash and zsh.
- **Refuse versus look.** Refusing every gitlink beneath a changed directory is simpler but over-refuses a clean submodule. Phase 1 decides; the recommendation is to look inside and refuse only on an untracked file or on "could not look".
- **Boundary.** The block is a boundary (it refuses or admits), so QA runs the probe engine against it (`fence:` form). The probe corpus has no gitlink-under-a-directory case; Phase 3 adds one.

---

## 4. Scope

### In Scope

✅ The gitlink-beneath-a-directory refusal, with a scenario and a mutant under bash and zsh.
✅ The external-symlink absolute-path decision (rewrite or document) and the `TOP` equal to `/` comparison.
✅ A gitlink-under-a-directory case in the probe cases file.

### Out of Scope

❌ Any change to the mechanisms task 285 already settled (the lexical-versus-physical compare, the metacharacter refusal).
❌ Memoising the physical-path check per parent directory (recorded in gate 5 as a future item).

---

## 5. Breaking Changes

None. The guard becomes stricter only for an input it previously admitted wrongly.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.286.plan.qa-fix-step4-guard-looks-beneath-gitlinks.md](task.286.plan.qa-fix-step4-guard-looks-beneath-gitlinks.md)

### Phase 1: Reproduce and decide

**Risk**: Low

- [ ] Reproduce CR-1 in a scratch repository under bash and zsh (`pkg2`, `pkg2/`, `pkg2/sm`).
- [ ] Try CR-3 and CR-2 (a `TOP` of `/` cannot be made on this host; test the comparison on the extracted `case` line instead) and record whether each reproduces.
- [ ] Decide look-inside versus refuse for CR-1, and rewrite versus document for CR-3.

### Phase 2: Close CR-1

**Risk**: Medium

- [ ] Add the gitlink listing and the nested untracked check to the Step 4 block.
- [ ] Keep the block free of positional `$0`–`$9` tokens (the CI guard fails on them).
- [ ] Update the prose paragraph above the block.

### Phase 3: Hold it with tests

**Risk**: Low

- [ ] Add refused scenarios: gitlink with an untracked file beneath a directory, with and without a trailing slash, and from a subdirectory.
- [ ] Add admitted scenarios: a clean gitlink beneath a directory; a gitlink that is not checked out is refused as "could not look".
- [ ] Add one mutant per new clause and confirm each turns a test red.
- [ ] Add the gitlink-under-a-directory case to the probe cases file.

### Phase 4: Close CR-3 and CR-2

**Risk**: Low

- [ ] Apply the CR-3 decision and add its scenario.
- [ ] Compare against `${TOP%/}/` for CR-2 and test the comparison with a `TOP` of `/`.

---

## 7. Files Summary

Population measured with `git grep -ln 'Step 4: Validate' -- skills shared tests` at authoring time; the test records the count, not this prose.

Core implementation:
1. `skills/qa-fix/SKILL.md` — Step 4 block and prose.

Tests:
2. `tests/qa-fix-step4-guard.test.js` — scenarios and mutants.

Bundled copies: run `npm run bundle` after the change; commit any `references/` copy it touches.

Documentation:
3. `CHANGELOG.md` — an `[Unreleased]` entry citing (task 286).

---

## 8. Testing Strategy

### Unit Tests

- Scope: the Step 4 block run under bash and zsh by `tests/qa-fix-step4-guard.test.js`.
- Command: `CI=true node --test tests/qa-fix-step4-guard.test.js`
- Target: every new branch held by a scenario and a mutant that turns it red.

### Integration Tests

- The probe engine against the block: `command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file <cases.json> --repo-root "$(git rev-parse --show-toplevel)" --json`.
- `npm run ci:fast`.

### Performance Tests

None.

### Consumer Tests

- `npm run bundle:check` for bundled copies.

---

## 9. Success Criteria

### Functional

- [ ] A changed directory whose subtree holds a gitlink with an untracked file is refused in bash and zsh (`pkg2`, `pkg2/`), held by a committed scenario.
- [ ] A changed directory over a clean, checked-out gitlink is admitted, held by a committed scenario.
- [ ] The CR-3 route behaves as decided in Phase 1 and a scenario holds it.
- [ ] The inside test works when `TOP` is `/`, held by a committed test of the comparison.

### Performance

- [ ] No performance criterion; the block runs once per fix cycle.

### Code Quality

- [ ] Each new clause has a mutant that turns a committed test red.
- [ ] `npm run validate -- skills/qa-fix/` and `npm run ci:fast` pass.

### Migration

- [ ] CHANGELOG.md has an `[Unreleased]` entry citing (task 286).

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Over-refusing a clean submodule.**
   - Risk: a project with submodules is blocked on a changed directory above one.
   - Probability: Medium. Impact: Medium.
   - Mitigation: look inside the gitlink and refuse only on an untracked file or "could not look"; hold the clean case with an admitted scenario.
   - Rollback: revert the commit.

### Low Risk Areas

1. **Another neighbouring shape.** Five QA cycles on task 285 each found a neighbour. Mitigation: the probe corpus gains the gitlink case, and QA's safety re-probe applies as before.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- Triggers: the guard refuses a legitimate path in a consumer repository.
- Steps: revert the task's commit; re-run `npm run bundle`.
- Validation: `CI=true node --test tests/qa-fix-step4-guard.test.js` passes.

### Partial Rollback (1-2 hours)

- Revert the CR-3 and CR-2 change alone; they are independent of CR-1.

### Forward Fix (< 4 hours)

- Narrow the gitlink check if only the over-refusal is wrong.

### Rollback Triggers

- Critical: a legitimate fix cycle is blocked by the guard.
- Non-critical: a documentation gap; fix forward.

---

## Change Log

<!-- change-log-start -->
| Date       | Version | Description    | Author      |
| ---------- | ------- | -------------- | ----------- |
| 2026-11-07 | 1.0     | Initial draft — cut from task 285 QA gate 5 (CR-1 reproduced, CR-2 and CR-3 advisory) | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Reproduce and decide
- [ ] Phase 2: Close CR-1
- [ ] Phase 3: Hold it with tests
- [ ] Phase 4: Close CR-3 and CR-2

---

## References

- [Task 285](../task.285.qa-fix-step4-guard-hostile-paths/task.285.qa-fix-step4-guard-hostile-paths.md)
- [Task 285 gate 5](../task.285.qa-fix-step4-guard-hostile-paths/task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml) (`recommendations.future`)
- [Task 285 QA report 5](../task.285.qa-fix-step4-guard-hostile-paths/task.285.qa.5.qa-fix-step4-guard-hostile-paths.md)

---

## Notes

QA artifacts will be created in this directory: `task.286.qa.{N}.*.md`, `task.286.gate.{N}.*.yml`, bug reports `task.286.bug.{N}.*.md`.
