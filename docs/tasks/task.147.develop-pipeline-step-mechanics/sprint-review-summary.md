# Sprint Review Summary - develop pipeline: five steps that fail or overreach on correct input

**Story/Task ID:** task.147
**Completed Date:** 2026-09-25
**Completed By:** develop-task pipeline (Claude). Dispatched by /develop-next, then resumed by the maintainer after the QA loop limit with 2 extra cycles
**Pull Request:** [#489](https://github.com/Gamaroff/agent-skills/pull/489)

---

## Summary

Five mechanical defects in the develop pipeline's shared step documents made correct runs fail or reach too far (obs #141, #142, #162, #171, #173):

- Step 8 misread a filled Completion block.
- The Step 4 leak check could not read a one-line commit.
- §5b staged the gate after the fast gate.
- `/commit-changes --scope` swept a whole-tree `add -u` into scoped commits.
- Merges deleted the branch on a dirty tree.

Each is fixed and held by an executed-prose test. A new `verify-push-state.sh --scope` lets Step 8 judge only the run's own paths, and QA hardened its scope gate into a single predicate shared with the check it guards.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Step 8 check 3 passes both Completion templates and fails an unfilled placeholder
- [x] Step 4 leak check: `OK` for in-scope multi-line and one-line commits, `LEAK: <path>` otherwise
- [x] §5b tracks the gate and QA report before the fast gate runs
- [x] `/commit-changes --scope X` stages inside `X` only
- [x] `verify-push-state.sh --scope X`: outside dirt → a warning and exit 0; inside dirt → exit 1
- [x] Step 8 check 5 scoped to the work-item directory
- [x] A dirty tree merges without `--delete-branch` and deletes the remote branch separately (two sites)
- [x] develop-next re-syncs as its own step, not chained to a commit
- [x] Both Step 3 loop bodies offer the inline branch with its precondition
- [x] Tests under 10 s, with `spawnBudget()` timeouts and no network
- [x] Every fix mutation-proved; ci:fast, format and bundle clean; CHANGELOG cites task 147

### Key Features Implemented

- **Scoped staging**: `/commit-changes --scope` now uses a pathspec `git add` only, so a checkout another session is editing no longer leaks into this commit. This is a behaviour change, and it is noted under CHANGELOG › Changed.
- **Scoped push-state check**: `verify-push-state.sh --scope` (repeatable). Its gate refuses any scope that names no path git knows, using the same `path_under()` predicate as check 3, so no spelling can pass vacuously.
- **Pre-flight guard (Step 4)**: foreign dirt is held and restored around the PR commit, and Step 8 fails on a hold that was never restored.
- **Dirty-tree merge**: `--delete-branch` is dropped when the tree is dirty, and the remote branch is deleted as its own step.

---

## Testing & Quality Assurance

- 6 QA cycles: 5 budgeted, then 1 of 2 granted after the loop-limit halt. Gate 6: **PASS 100/100**. Bugs 1–14 are closed.
- Step 5c PR review: **APPROVE** (4 LOW advisory findings).
- New suites under `shared/resources/tests/` plus `verify-push-state.test.sh` (32 cases). QA cycle 6 ran `ci:fast` on a clean checkout: 4105 tests green.
- Boundary evidence: 38 executed `--scope` candidates, 0 vacuous passes, under both bash 3.2 and bash 5.

## Security & Compliance

- Security: PASS. There are no secrets and no eval or shell-string execution, and the boundary was probed by execution. Compliance: not applicable (internal tooling).

## Documentation

- `CHANGELOG.md` `[Unreleased]` (Changed :91, Fixed :196); `skills/commit-changes/SKILL.md`; the shared step docs for Steps 3, 4, 5–6 and 8; the `develop-next` and `develop-batch` SKILL.md files.

---

## Demo Notes

### How to Verify

1. `bash shared/resources/verify-push-state.test.sh`: 32 passed.
2. In a repo with a dirty file outside `docs/`, run `verify-push-state.sh --base develop --scope docs/x`. It warns and exits 0. `--scope 'docs/*'` exits 2.
3. `command node --test shared/resources/tests/commit-changes-scope-mode.test.mjs`

---

## Known Limitations & Future Work

- PC-2: the CHANGELOG does not name the QA-cycle additions (Step 8 `{extra-scope-paths}`, the Step 4 hold records, two new Step 8 failure modes).
- CR-1: a guard retry that reuses the hold directory can overwrite or nest a re-appeared held path.
- CR-2 and gate-6 CR-1: the scope gate scans a duplicated path list once per scope.
- Obs #189: the probe engine has no entry form for a multi-flag shell script, so this boundary can only be probed by hand.
- Obs #184: finalise's PR-number fallback can pick up an unrelated `PR #N` (it recurred here).
