# QA Report: Task 284 - Migrate shipped payload heredocs to the file tool

**Task**: [Link to task document](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Gate File**: [task.284.gate.1.migrate-payload-heredocs-to-file-tool.yml](./task.284.gate.1.migrate-payload-heredocs-to-file-tool.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Gate Status**: CONCERNS

---

## Executive Summary

All 31 payload heredocs in shipped skill prose now use a file-tool write plus a path argument, and the ratchet allowlist is empty. The change is held by a mutation-proven test, CI on the PR is green, and the performance criterion is met. Two medium findings remain: the split between write and post removed the guarantee that the posted body was written in the same run.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix the two findings first)

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer for the diff (Step 3b). Route: code review of 33 files (the generated `references/` copies and the task's own documents were excluded from the patch). Reviewer dispatched 2026-11-20T09:46Z, duration 88 s from the completion notice.

CI on f5cde943fef6: green.

Step 4b: ran `qa-execute-snippets.mjs` over all 24 changed in-scope files. See Findings.

First review, so no re-review scope line applies.

---

## New Findings This Cycle

Not applicable (first review).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Pipeline step docs and tracker-comment-contract | PASS | Verified | 8 step docs migrated |
| 2. Skill SKILL.md sites | PASS | Verified | 16 skills |
| 3. Ratchet to zero guard | PASS | Verified | mutation-proven below |
| 4. Fresh-body-post citations | PASS | Verified | ensure-*, create-issue, sync-github-* |
| 5. Tests, bundle, changelog | CONCERNS | Verified | see TASK-284-CR-1 and CR-2 |

**Overall Phase Completion**: 5/5 delivered; Phase 5 carries the findings below.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Ratchet allowlist empty; fails on an added heredoc | mutation-proven | red then green | PASS | see Findings |
| Every changed block still runs under `qa-execute-snippets.mjs` | all | 1 of about 30 runnable; rest skipped by design | CONCERNS | see Findings |
| `CI=true npm test` within 10% of `develop` | ≤ +10% | head −3.3% | PASS | see Findings |
| `bundle --check` 0 problems; `validate` passes per changed skill | 0 | 0 | PASS | run at Step 3, gate on the LAN server |
| CHANGELOG `[Unreleased]` entry citing (task 284) | present | `cites (task 284)` | PASS | `changelog-cites.sh` |
| Posting sites cite fresh-body-post or are listed as excluded | all | all cited | PASS | ensure-task/story/epic/bug, create-issue, sync-github-* |

### Findings

**Performance record** (criterion 3, `record_criteria` location `qa-report`). Same host (the LAN server) and the same runner (`npm run test:remote -- --run test`, CI-parity container):

| Tree | `npm test` duration | Server load before the run |
| --- | --- | --- |
| PR head `f5cde943f` | 610,751 ms | 0.13 (`uptime`, 11:30) |
| `develop` `850985da3` | 631,771 ms | 1.44 (`uptime`, 11:48) |

The head is 3.3% faster. The loads differ, which flatters neither side by more than noise; either way it is inside the 10% bound. The `develop` run also failed one test, `SEC-1b` in `ci-tree-equivalence.test.mjs`, which is load-sensitive and untouched here; it is recorded as a pre-existing future item in the gate. The head's run had 8,661 of 8,664 passing with 0 failing (3 skipped).

**Step 4b, honest reading.** The engine reported zero failures on any block this change touched. Of the changed blocks (about 30), only 1 is classed `runnable`; the others are `mutating` (tracker or `gh` posts, skipped by design) or `placeholder`. The five `execution-failure` records are on blocks the change did not touch, and each fails for an environmental reason (no lock file or no git repository in the temp copy). So "every changed block still runs" is true only for the runnable subset; the rest are held by the test suites, not by execution. The criterion is recorded as met for what the engine can run and not stronger.

**Mutation proof.** `mutation-proven: appended a `cat > … <<EOF` heredoc to shared/resources/file-write-rules.md → "no payload heredoc is left in shipped prose" in shared/resources/tests/payload-heredoc-ratchet.test.mjs went red (5 pass, 1 fail) → covered`. Restored from a `cp` snapshot, `cmp` printed nothing, and the suite is back to 6 pass.

**Platform variance.** `TMPDIR=/tmp CI=true node --test` over the six touched suites: 129 pass, 0 fail.

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue: create-issue can post the previous run's body**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.284.bug.1.create-issue-posts-a-stale-body.md](./task.284.bug.1.create-issue-posts-a-stale-body.md)
- **Observation**: `skills/create-issue/SKILL.md:217` reads a fixed path written in an earlier call. The base wrote a fresh `mktemp` file in the same block (`git show origin/develop:skills/create-issue/SKILL.md`, line 190).
- **Impact**: a wrong issue body is published if the write is skipped.
- **Recommendation**: HALT when the file is absent or lacks the title; delete it after the create.

**Issue: tracker-comment post blocks can re-post the previous comment**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.284.bug.2.tracker-comment-sites-post-a-stale-body.md](./task.284.bug.2.tracker-comment-sites-post-a-stale-body.md)
- **Observation**: code review CR-2; the pattern is the same at about ten sites.
- **Recommendation**: HALT on a missing or empty body file; remove it after the post.

### LOW Severity Issues (1)

CR-3 (cleanup, advisory): the first block in `qa-task` and `qa-story` repeats a read-back guard that the post block also holds, so it exists only to run `mkdir`.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
Head 610,751 ms against 631,771 ms on `develop`.

### Reliability — CONCERNS
The stale-body regression above.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No input boundary is added; the criteria carry no boundary signal (`probe-boundary-signals.mjs` returned an empty list). `boundary: false`: the ratchet is a repository guard over prose, not an input gate.

### Maintainability — PASS
Allowlist gone, recipe cited, bundled copies match their sources.

---

## Code Review

Diff review: code review (33 files, 1,649 patch lines).

**Correctness bugs (2):**
- [medium/medium] `skills/create-issue/SKILL.md:217` — fixed body path can post a stale body → HALT when absent or title missing (TASK-284-CR-1)
- [medium/medium] `shared/resources/develop-pipeline-step-4-create-pr.md:314` — post blocks assert nothing about body freshness → HALT on missing or empty file (TASK-284-CR-2)

`code_review_blocking=true` gates only a high-confidence bug. Neither finding is high, so neither is promoted on the reviewer's own rating; both were checked by QA against the base (5b), are not pre-existing, and are in the task's scope, so QA enters them in `top_issues[]` as its own findings (5d, `origin: code-review, reproduced by QA` for CR-1 by reading the base and head blocks; CR-2 confirmed from the migration itself).

**Cleanups (1):**
- `skills/qa-story/SKILL.md:2460` — first block repeats the guard and only needs the `mkdir` (low, advisory)

---

## Regression Testing

Six touched suites re-run under `TMPDIR=/tmp`: 129 pass. Full CI-parity gate on the LAN server at the head: `ci:fast` exit 0.

---

## Test Artifacts

### Test Commands Executed
```bash
TMPDIR=/tmp CI=true node --test <six touched suites>
CI=true node --test shared/resources/tests/payload-heredoc-ratchet.test.mjs   # red with one heredoc added, green restored
npm run test:remote -- --run test                                             # on a detached develop worktree, for the baseline
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the work meets every stated criterion, but two medium reliability findings were introduced by the migration itself.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix TASK-284-CR-1 and TASK-284-CR-2.

**Next Steps**: `/qa-fix` on the two findings, then re-review.
