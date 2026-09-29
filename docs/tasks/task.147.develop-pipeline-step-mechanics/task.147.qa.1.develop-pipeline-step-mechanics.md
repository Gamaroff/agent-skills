# QA Report: Task 147 - develop pipeline: five steps that fail or overreach on correct input

**Task**: [Link to task document](./task.147.develop-pipeline-step-mechanics.md)
**Gate File**: [task.147.gate.1.develop-pipeline-step-mechanics.yml](./task.147.gate.1.develop-pipeline-step-mechanics.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: FAIL

---

## Executive Summary

All seven phases are implemented and all of the task's own tests pass: `ci:fast` 4068/0, PR CI 5/5 green, and the new suites 58/58, also under `TMPDIR=/tmp`. The independent diff review and QA's own execution found defects that the tests cannot see, because each test binds or injects the very thing the shipped block leaves unbound. The worst is CR-1: a failed develop-next merge on a dirty tree deletes the unmerged PR's head branch. The other HIGH is CR-2: scoped Step 8 staging silently drops develop-bug's general-bug registry close. Four MEDIUM defects were also found. Every promoted finding was reproduced by execution.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`, 7/7 phases ticked)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (§ 5; CHANGELOG `Changed`)
- [x] Code on feature branch with open PR (#489)

### Testing Approach

- [x] Automated Testing: `npm run ci:fast` (symlink moved aside), the six new suites, and `verify-push-state.test.sh`
- [x] Regression Testing: full `npm test` and PR CI (test, link-check, shellcheck, validate)
- [x] Security Review: boundary classification (below)
- [x] Code Review: an independent adversarial diff review (Step 3b)
- [x] Execution: hostile path names against `verify-push-state.sh --scope`, plus reproductions of CR-1, CR-5 and CR-6

### Review Methodology

Hybrid. There were 7 phases across multiple modules, so the Step 3b diff review ran as one independent read-only subagent over the whole branch diff (3737 lines, 38 files; first review). It returned in about 5 minutes and was waited for before the gate, as the Step 10 precondition requires. QA verified each high-confidence finding by execution before promoting it, and applied the provenance check (5b) to the rest. The traceability mapper was skipped because there is no Success Criteria table.

Step 4b ran over the 7 changed runnable-prose files:

- step-4, step-8, commit-changes, develop-next and develop-batch: `no-executable-blocks` (information). Every block is a git or `gh` mutation or a write redirection, refused by design.
- step-5-6: 1 runnable block, which ran clean under bash and zsh.
- step-3: `zero-blocks-executed`, because its 2 placeholder blocks use `{template}` slots. The diff adds no fences to step-3. The engine's `--bind` sets shell variables and cannot fill a `{template}` slot, so those blocks can never run under 4b.

The changed blocks are instead executed by the task's own executed-prose suites, whose `bind()` fills template slots. That is recorded as a future note.

Platform variance: `TMPDIR=/tmp node --test <six suites>` → 58/58, exit 0.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Step 8 check 3 (obs #173) | PASS | Verified | Template-derived reports pass; mutation-proved |
| 2: Step 4 leak check (obs #141) | CONCERNS | Partial | The parse is fixed, but the block reads an array bound in another shell (CR-4) |
| 3: QA loop stage-before-gate (obs #171) | PASS | Verified | Ordering and staging are both executed |
| 4: scoped staging and verify (obs #142) | FAIL | Partial | CR-2 (registry close lost), CR-6 (committed deletion aborts staging), QA-1 (rename source skipped), CR-7, CR-8 |
| 5: merge guard (obs #142) | FAIL | Partial | CR-1 (HALT is not a function: a failed merge deletes the branch), CR-5 (delete status is the block status) |
| 6: Step 3 inline branch (obs #162) | PASS | Verified | Statement-level, as the task's Honest limit says |
| 7: bundle, docs, validation | PASS | Verified | bundle:check, lint:shell, validate and CI are clean |

**Overall Phase Completion**: 4/7 passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Check 3 passes template-built reports | pass/fail as specified | 17/17 | PASS |
| Leak check OK / LEAK under bash + zsh | as specified | Passes in the test, but **only with an injected SCOPE_PATHS** | CONCERNS (CR-4) |
| §5b evidence staged before the gate | as specified | 3/3 | PASS |
| `--scope X` leaves outside edits unstaged | as specified | 10/10 | PASS; the Step 8 caller regression is CR-2 |
| verify-push-state `--scope` 0/1 split | cases 10–13 | 13/13, but the rename source is skipped | CONCERNS (QA-1) |
| Dirty tree merges without `--delete-branch`, deletes the remote | both sites | Passes with a success stub; **a failed merge deletes the branch** | FAIL (CR-1) |
| develop-next re-sync is its own step | as specified | Verified | PASS |
| Step 3 inline branch cites resolving labels | as specified | 6/6 | PASS |
| Each new test file < 10s | < 10s | 0.1–8.0s | PASS |
| Every fix mutation-proved | recorded | Recorded in the Implementation Record | PASS |

---

## Breaking Changes Validation

### Breaking Change: `/commit-changes --scope` stages inside the scope only

- Documented: Yes (task § 5, CHANGELOG `Changed`)
- Migration Path Provided: Yes (pass an extra `--scope`)
- Migration Tested: Partial
- Consumer Code Updated: **No, for one consumer.** develop-bug's general-bug Step 8 relies on the old sweep for `docs/bugs/bug-registry.md` (CR-2). Step 4 was updated.

**Overall Breaking Changes Assessment:** FAIL, because one in-repo consumer was not migrated.

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: A failed merge deletes an unmerged PR's head branch (CR-1)**
- **Bug Report**: [task.147.bug.1.failed-merge-deletes-unmerged-branch.md](./task.147.bug.1.failed-merge-deletes-unmerged-branch.md)
- **Observation**: Reproduced on a dirty tree with a `gh pr merge` stub exiting 1. The block exits 0, and `ls-remote` shows `feature/x` deleted.
- **Recommendation**: Use real exit bodies, and remove the test's injected `HALT()`.

**Issue: A general-bug registry close is left uncommitted by scoped Step 8 (CR-2)**
- **Bug Report**: [task.147.bug.2.general-bug-registry-close-uncommitted.md](./task.147.bug.2.general-bug-registry-close-uncommitted.md)
- **Observation**: `skills/develop-bug/references/develop-bug-step-7-close-bug.md:83` says the registry edit "is committed atomically with the bug file in Step 8", and `skills/develop-bug/SKILL.md:244` runs `/commit-changes --scope {bug-directory}`.

### MEDIUM Severity Issues (4)

- **CR-4**: The leak check reads an array bound in another shell. [bug.3](./task.147.bug.3.leak-check-reads-unbound-scope.md)
- **CR-5**: The remote delete status is the merge block's status. Reproduced: exit 1 after a successful merge. [bug.4](./task.147.bug.4.remote-delete-failure-reads-as-merge-failure.md)
- **CR-6**: A committed deletion aborts scope staging. Reproduced: exit 128. [bug.5](./task.147.bug.5.committed-deletion-aborts-scope-stage.md)
- **QA-1** (the reviewer's CR-10): A rename's source side is skipped by scoped check 3. Reproduced under bash 5 and 3.2. [bug.6](./task.147.bug.6.rename-source-skipped-in-scope-check.md)

### LOW Severity Issues (3)

- **CR-7**: Scoped check 3 discards the `mktemp` and `git status` exit statuses.
- **CR-8**: A `./`-prefixed or absolute `--scope` matches nothing, so check 3 passes vacuously.
- **QA-2**: The Step 4 prose says "every file … committed or not", but the derivation reads tracked diffs only.

**Total Issues**: HIGH: 2, MEDIUM: 4, LOW: 3

---

## NFR Assessment

### Performance — PASS
The suites take 0.1–8.0s each, and `ci:fast` is green.

### Reliability — FAIL
CR-1 destroys a branch on a refused merge. CR-2 loses a registry write. CR-5 misreports a successful merge. CR-6 aborts Step 4 staging.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `classifyBoundaryText` found no boundary signal in the Success Criteria or in the `verify-push-state.sh` header, so `boundary: false`. The `--scope` classifier decides report accuracy, not access. Hostile path names were executed against it directly, outside the probe engine: a sibling prefix `task.1x`, a space, an embedded newline, `--` and `-dash.txt`, and renames both ways. All were classified correctly except the rename source (QA-1).

### Maintainability — PASS
One shared harness, mutation-proved fixes, and deviations recorded in the task.

---

## Code Review

Findings from the Step 3b independent review. Under `code_review_blocking=true`, the high-confidence bugs are promoted. CR-7 and CR-8 were promoted by QA as LOW after reading. Provenance was checked against `origin/develop`.

**Correctness bugs (10):**
- [high/high] `skills/develop-next/SKILL.md:271` — HALT is prose, so a failed merge deletes the branch → **T147-QA1-CR1** (reproduced)
- [high/high] `shared/resources/develop-pipeline-step-8-commit.md:65` — the develop-bug registry close is uncommitted → **T147-QA1-CR2** (confirmed in develop-bug Step 7/8)
- [high/high] `shared/resources/develop-pipeline-step-4-create-pr.md:39` — a new untracked file in a new dir is held out of the PR → **pre-existing** (CR-3). The base derivation reads committed diffs only, and its guard holds the same file. Routed to `recommendations.future`. The overclaiming prose is new and is QA-2.
- [medium/high] `step-4-create-pr.md:132` — the leak check reads an unbound array → **T147-QA1-CR4**
- [medium/medium] `skills/develop-batch/SKILL.md:451` — the delete status is the block's status → **T147-QA1-CR5** (reproduced)
- [medium/medium] `step-4-create-pr.md:45` — a committed deletion aborts staging → **T147-QA1-CR6** (reproduced)
- [medium/medium] `verify-push-state.sh:135` — mktemp and status exit codes are discarded → **T147-QA1-CR7** (LOW)
- [medium/medium] `verify-push-state.sh:55` — scope normalisation → **T147-QA1-CR8** (LOW)
- [low/medium] `step-8-commit.md:187` — `PR_NUMBER` is never bound → **pre-existing** (CR-9). The base line is identical. Routed to future.
- [low/low] `verify-push-state.sh:135` — the rename source is skipped → the same defect as QA-1 (reproduced), promoted as MEDIUM

**Cleanups (1):**
- `step-4-create-pr.md:48` — the dedupe matches on a space-joined string (CR-11) → future

**Why the tests missed CR-1 and CR-4.** Both tests inject the value the shipped block leaves unbound: `HALT()` in the merge test's PRELUDE, and `SCOPE_PATHS` in the leak test. A binder that fills *every* name makes the executed-prose test agree with the harness rather than with an agent running the block. The fix for each has to run the block with only its documented placeholders bound.

Mutation proofs from development are all `covered` (Implementation Record table). They prove each test goes red when the fix is reverted, not that the block runs correctly in a fresh shell, which is the gap above.

---

## Regression Testing

- `npm run ci:fast` (`.agents/skills` symlink moved aside): 4068 passed, 0 failed, 1 skipped — PASS
- PR #489 CI: test, link-check, shellcheck, validate — all SUCCESS
- `bundle:check`, `lint:shell` and `quick_validate` ×5 — clean

---

## Test Artifacts

### Test Commands Executed

```bash
git diff origin/develop...HEAD > .claude/state/t147-qa1-difffile.diff
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed .md> --json
TMPDIR=/tmp command node --test shared/resources/tests/{step-8-completion-checklist,step-4-leak-check,qa-loop-stage-before-gate,commit-changes-scope-mode,merge-delete-branch-guard,develop-loop-inline-branch}.test.mjs
gh pr view 489 --json statusCheckRollup
```

Reproductions ran through the task's own harness (`fixtureRepo`, `ghStub`, `run`), using the shipped block with **no** injected names:

- CR-1: the develop-next block, a dirty tree, and a `pr merge` stub exiting 1 → exit 0, origin `feature/x` deleted
- CR-5: the develop-batch block, a dirty tree, and origin already without `feature/x` → exit 1 after one merge call
- CR-6: `git rm package.json` committed, then derivation + scope stage → `fatal: pathspec 'package.json' did not match any files`, exit 128
- QA-1: `git mv docs/tasks/task.1/move.md moved-out.md`, then `verify-push-state.sh --base main --scope docs/tasks/task.1` → exit 0 under bash 5 and /bin/bash 3.2

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 and CR-2 (HIGH)
2. CR-4, CR-5, CR-6 and QA-1 (MEDIUM)
3. CR-7, CR-8 and QA-2 (LOW), which are cheap and sit in files already being edited

### Short-term Actions (Non-Blocking)
1. CR-3 and CR-9 (pre-existing), and CR-11 (cleanup)

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Two HIGH reliability defects were introduced by the change set and reproduced (rule 1). The reliability NFR is FAIL (rule 3).
**Quality Score**: 20/100 (100 − 2×20 − 4×10)

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.147.qa.1.develop-pipeline-step-mechanics.md`
**Gate File**: co-located at `task.147.gate.1.develop-pipeline-step-mechanics.yml`
**Next Steps**: `/qa-fix` cycle 1, then QA cycle 2 (a refute pass over the whole branch diff)
