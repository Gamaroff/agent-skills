---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-10-09'
related: 'none — cross-cutting (develop-next · develop-batch · Phase 0d)'
github_issue: 620
description: 'develop-next and develop-batch hardcode the Phase 0d base and PR-target answers to the base branch, overriding the epic-integration recommendation Phase 0d derives; develop-batch also builds and rebases every worktree on the base branch.'
---

**Bug ID**: bug.18
**Related**: none — cross-cutting (`develop-next` · `develop-batch` · Phase 0d)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-10-09
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: The AUTONOMOUS RUN directive that `develop-next` and `develop-batch` hand to
`/develop-story` and `/develop-task` says "take the auto-derived recommended option for every
question" and then names the answer anyway — base branch and PR target both `develop` /
`<baseBranch>`. For an item whose epic declares `branch_model: epic-integration`, Phase 0d recommends
the epic's integration branch for both, so the literal clause overrides the recommendation it claims
to take. `develop-batch` goes further: it has no epic-integration path at all.

**Expected Behavior**: an autonomous run takes Phase 0d's recommended options verbatim. A story whose
epic declares `branch_model: epic-integration` is cut from, and PRs into, `EPIC_BRANCH`, exactly as an
interactive run that accepts the recommendations would be. `develop-batch` either supports such items
(worktree from, and rebase onto, `EPIC_BRANCH`) or excludes them from the frontier with a logged reason.

**Actual Behavior**:

- `develop-next` — the directive's literal answer (`develop`) contradicts its own instruction and
  Phase 0d's rule that Q1 and Q2 must agree. Which one the model follows is undetermined; the clause
  that names a value is the likelier winner.
- `develop-batch` — hardcodes both answers to `<baseBranch>` (Q2 mislabelled "base branch"), creates
  every worktree from `<baseBranch>`, rebases every item onto `origin/<baseBranch>` before merge, and
  states that story/task PRs target `<baseBranch>` with no epic integration branch.

**Impact**: on a consumer whose default model is `epic-integration` (the consumer this was found in
has carried that default since 2026-08-12, with 149 documents declaring it), an autonomous run can
land an epic's story on `develop` early, bypassing the integration branch the epic was built around.
The batch rebase onto `origin/<baseBranch>` of a branch cut from an integration branch would replay
the epic's earlier commits.

---

## Reproduction Steps

**Environment**: `agent-skills` `v0.55.0`, and `develop` at `7d712757` (unchanged). Reading only; no
credentials.

**Steps to Reproduce**:

1. Read `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0d (lines ~606–674): an epic
   declaring `branch_model: epic-integration` sets `EPIC_BRANCH`, which becomes the Recommended option
   for Q1 and Q2, and Q1/Q2 must agree.
2. Read `skills/develop-next/SKILL.md:126`: "take the auto-derived recommended option for **every**
   question … For `/develop-story` and `/develop-task` that is Q1 = base branch, `develop` and Q2 = PR
   target, `develop`."
3. Read `skills/develop-batch/SKILL.md:287-289` (directive), `:243` (`git worktree add <dir> -b <branch>
   <baseBranch>`), `:376` (`git rebase origin/<baseBranch>`), `:505` ("Story/task PRs target
   `<baseBranch>` directly — no epic integration …").
4. `grep -c branch_model skills/develop-next/scripts/select-next.mjs skills/develop-batch/scripts/schedule.mjs`
   → `0` and `0`: neither selector knows the item's branch model.

**Frequency**: Always, for an autonomous run on an `epic-integration` item.
**Reproducible**: Yes — by reading; not yet observed producing a wrong merge.

---

## Evidence

**Related Files**:

- `skills/develop-next/SKILL.md:126` — the directive; `:354-358` — the Step 3 note that *assumes*
  `/develop-story` bases on the integration branch, contradicting `:126`
- `skills/develop-batch/SKILL.md:243, :287-289, :376, :505`
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0d — the recommendation the
  directive overrides
- `skills/develop-next/scripts/select-next.mjs`, `skills/develop-batch/scripts/schedule.mjs` — no
  `branch_model` read

Found from a consumer repository while designing developer-supplied up-front answers (task.201); the
v0.35.0-era entry that introduced `epic-integration` updated `develop-next`'s promotion note but not
the directive.

---

## Suggested Fix

1. **`develop-next`**: drop the literal branch names from the directive. Take Phase 0d's Recommended
   option for every question, and record each answer and its source in the Decisions Log. task.201's
   `--defaults` flag is the durable form of this: the directive becomes one flag on the invocation, so
   no orchestrator restates the question set.
2. **`develop-batch`**: choose one, explicitly —
   - **support**: resolve each item's `EPIC_BRANCH` in `schedule.mjs`, create its worktree from it,
     rebase onto `origin/<EPIC_BRANCH>`, and let the PR declare its own target; or
   - **exclude**: drop `epic-integration` items from the batch frontier with a logged reason, leaving
     them to `develop-next` or an interactive run.

   Exclusion is the smaller safe fix; support can follow.
3. **Guard**: a test that fails if an orchestrator directive names a branch literal for Q1/Q2.

---

## Developer Fix Cycle

_Not started._

---

## Status History

| Date       | Status | Changed By | Notes                                                                                     |
| ---------- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| 2026-10-09 | New    | Claude     | Found from the rebirth-wallet consumer while designing up-front pipeline answers (task.201); filed as #620 |
