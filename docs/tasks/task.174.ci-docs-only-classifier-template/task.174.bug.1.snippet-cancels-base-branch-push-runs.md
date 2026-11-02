# Bug Report: Task 174 - The GitHub snippet cancels push runs on the base branch

**Task**: [Link](./task.174.ci-docs-only-classifier-template.md)
**Bug ID**: TASK-174-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 1; from code review CR-1, verified)
**Date Found**: 2026-11-02

## Description

`docs/examples/ci/github-actions/changes-job.yml` sets:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

That supersedes **push** runs on `main`/`develop` as well as PR runs. The classifier's push path
(`classify-changes.sh`, the `EVENT_NAME = push` branch) emits `code=false` on a docs-only
`before..after` diff **without asking whether `before` passed**. That is deliberate in the lifted
script (its own comment says so), because a push run on the base is expected to run to completion.

The template's source does not cancel push runs. tinker-city's `ci.yml` groups by PR number, and
its comment reads: "Supersede PR runs ONLY. A push to develop/main always runs to completion".

## Steps to Reproduce

1. Merge a code PR into `develop`. Its push run starts.
2. Before that run finishes, merge a docs-only PR. The second push run cancels the first.
3. The second run's classifier sees a docs-only `before..after` and emits `code=false`.

## Expected Behavior

Every push to the base branch keeps a completed run. Only superseded PR runs are cancelled.

## Actual Behavior

The code merge's run is cancelled, and the docs-only run after it skips the heavy jobs. The merged
code never gets a full run on the base branch. The guide's merge-result trade-off relies on that run
("the push to the base after the merge is a `push` event, and a code change there runs in full").

## Impact

An adopter who copies the snippet as written can land untested code on the base branch with every
check green. The classifier's fail-safe contract does not cover it, because the cancellation happens
before the classifier runs.

## Recommendation

- Key the group on the PR number, falling back to the ref.
- Cancel only PR runs: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- Correct the guide's `cancel-in-progress` section to say that push runs on the base always complete.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-11-02
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root Cause Analysis**: The snippet's `concurrency` block was written as a generic "supersede the
older run" setting, without reading it against the push path's assumption that every base-branch run
completes. Neither spec covered the snippet, so nothing could see the contradiction.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-11-02

**Fix Description**:

- `group: ci-${{ github.event.pull_request.number && format('pr-{0}', github.event.pull_request.number) || github.run_id }}`
  — a PR's runs share one group; each push run gets its own. The recommendation's "fall back to the
  ref" was not taken: a ref-keyed push group still drops a *pending* run when a newer one queues,
  even with `cancel-in-progress` off. The run id never collides.
- `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- The snippet comment and the guide's `cancel-in-progress` section now say base-branch runs must
  finish, and why.

**Files Modified**:

- `docs/examples/ci/github-actions/changes-job.yml` — the concurrency block and its comment
- `docs/runbooks/ci-docs-only-skip.md` — `cancel-in-progress` section
- `docs/examples/ci/github-actions/changes-job.test.js` — new, 2 tests

**Testing**: `changes-job.test.js` reads the block as text (Actions expressions cannot run here).
Mutation-proven: `cancel-in-progress: true` restored → 1 red; group restored to `ci-${{ github.ref }}`
→ 1 red; fix in place → 2/2.

**Verification Steps for QA**:

1. Read `changes-job.yml`'s `concurrency:` block: PR-only cancellation, run-id push groups.
2. `command node --test docs/examples/ci/github-actions/changes-job.test.js` → 2/2.

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-11-02

**QA Reopening Reason**: Gate 2 found the yml right for this workflow, but (a) its guard passes on
a broken group (TASK-174-BUG-2) and (b) the group is not workflow-scoped. Concurrency groups are
repository-wide, so another workflow copying the block would cancel this one (TASK-174-QA-5).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-11-02

- The group is now `${{ github.workflow }}-…`, and the snippet comment and guide say why.
- The guard is now pinned (see bug 2).

**Verification**: M11 (workflow prefix dropped) → 1 red in `changes-job.test.js`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | New | qa-task | Filed in QA cycle 1 |
| 2026-11-02 | In Progress | qa-fix | Investigation started |
| 2026-11-02 | Ready for QA | qa-fix | Fix implemented and mutation-proven |
| 2026-11-02 | Reopened | qa-task | Partly fixed by task.174.qa.2.ci-docs-only-classifier-template.md: yml right, its guard vacuous (BUG-2), group not workflow-scoped (QA-5) |
| 2026-11-02 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |
| 2026-11-02 | Closed | qa-task | Verified by task.174.qa.3.ci-docs-only-classifier-template.md |
