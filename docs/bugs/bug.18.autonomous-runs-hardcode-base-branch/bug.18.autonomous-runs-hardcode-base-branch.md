---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-10-09'
related: 'none — cross-cutting (develop-next · develop-batch · Phase 0d)'
github_issue: 620
description: 'develop-next and develop-batch hardcode the Phase 0d base and PR-target answers to the base branch, overriding the epic-integration recommendation Phase 0d derives; develop-batch also builds and rebases every worktree on the base branch.'
---

**Bug ID**: bug.18
**Related**: none — cross-cutting (`develop-next` · `develop-batch` · Phase 0d)
**Status**: ✅ Ready for QA
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

## Scope & Impact

**Reference**: autonomous orchestrators — `develop-next` (the AUTONOMOUS RUN directive it prepends at
Step 2) and `develop-batch` (its directive, worktree creation, pre-merge rebase and merge note) — plus
the Phase 0d recommendation in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` that
both override. No single story or task owns these files; each orchestrator restates the Phase 0d
answers on its own.

**How It Failed**: Phase 0d derives a per-item recommendation (`EPIC_BRANCH` for a story whose epic
declares `branch_model: epic-integration`, `develop` otherwise). Both orchestrators replace that
derivation with a fixed literal, so any autonomous run on an `epic-integration` item is told to cut
from and PR into `develop`. `develop-batch` additionally creates and rebases every worktree on
`<baseBranch>` and has no way to know an item's branch model, because `schedule.mjs` never reads it.

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

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-10

**Reproduction**: a new guard, `evals/shared/tests/orchestrator-directive-branch-literal.test.mjs`,
extracts each orchestrator's AUTONOMOUS RUN blockquote and fails on a branch literal in it. On the
pre-fix code it failed for both: `develop-next` (`Q1 = base branch,`, `` `develop` ``,
`Q2 = PR target,`, `` `develop` ``) and `develop-batch` (`Q1 = base branch,`, `<baseBranch>` ×2).
Three new `select-next.test.mjs` cases failed too: `selectBatch` batched an `epic-integration` story
(`actual: ['8.1', '9.1'], expected: ['8.1']` in the CLI case), and `storyBranchModel` did not exist.

**Root Cause Analysis**: each orchestrator restated Phase 0d's answers as constants instead of
deferring to them. `skills/develop-next/SKILL.md:126` named `develop` for both questions;
`skills/develop-batch/SKILL.md:287-289` named `<baseBranch>` for both (Q2 mislabelled "base
branch"). Phase 0d's recommendation is per item (§0d, `EPIC_BRANCH` for an `epic-integration`
story), so the constant overrode it for exactly the items it exists for. `develop-batch` had a
second, structural cause: `selectBatch` in `select-next.mjs` never read an item's branch model, so
it planned every story's worktree from `develop` (`worktreeFor`) and the merge lane rebased it onto
`origin/<baseBranch>`.

**Proposed Fix**: drop the literals from both directives; exclude `epic-integration` stories from
the batch frontier with a logged reason (the report's recommended "exclude" option); add the guard.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-10

**Root Cause**: orchestrator directives restated Phase 0d's per-item branch answers as constants,
and the batch selector could not see an item's branch model.

**Fix Description**:

- `develop-next`'s directive now says to take the option Phase 0d marks **(Recommended)** for every
  question and never substitute an answer, and names the per-item case (an `epic-integration`
  story's answer is its epic's integration branch; Q1 and Q2 agree). No branch is named. A
  paragraph after it says why, and points at the guard.
- `develop-batch`'s directive takes Phase 0d's Recommended option for every question except base and
  PR target. It answers those with `<baseBranch>`, the branch its worktree was cut from, because
  Phase 0d's own option always reads `develop` and not every consumer's base is `develop`. It also
  HALTs the item, rather than choosing, if Phase 0d's epic pre-check finds an integration branch.
  The worktree, rebase and merge
  paragraphs now state why cutting from and rebasing onto `<baseBranch>` is correct (no
  `epic-integration` story reaches a batch), and `excluded[]` and the empty-batch STOP tell the
  operator to run such stories with `/develop-next`.
- `select-next.mjs`: new exported `storyBranchModel(storyPath, read)` finds the epic the way Phase 0d
  does (`epic_source:` relative to the story, then the working directory; else the enclosing
  directory named by `epic:`) and returns its `branch_model:`, or null when the epic declares none or
  cannot be found. It returns `{ resolved, model | reason }`, so "the epic declares nothing" is
  kept apart from "the epic could not be found". `selectBatch` takes an optional
  `branchModelOf(row)`. It moves an `epic-integration` `/develop-story` row to `excluded[]` with a
  reason starting `epic-integration:`, and names an unresolved one in `lint.warnings`. `main()` wires it for `--batch`. Without the callback `selectBatch` is
  unchanged.
- Support for `epic-integration` items in a batch (worktree from, and rebase onto, the integration
  branch) is not built here. The report named exclusion as the smaller safe fix, and support can
  follow.
- Known limit: the selector reads only the default key and value (`branch_model:
  epic-integration`); a `branching.epicIntegration` override in `skills-config.yaml` is not read.
  Documented in `roadmap-selection.md`.

**Files Modified**:

- `skills/develop-next/SKILL.md` — directive without branch literals, plus rationale; `--batch` line.
- `skills/develop-batch/SKILL.md` — directive, worktree, `excluded[]`, empty batch, rebase and merge
  prose.
- `skills/develop-next/scripts/select-next.mjs` — `frontmatterScalar`, `storyBranchModel`,
  `selectBatch` exclusion, CLI wiring.
- `skills/develop-next/references/roadmap-selection.md` — §Parallel batch documents the exclusion.
- `evals/shared/tests/orchestrator-directive-branch-literal.test.mjs` — added regression guard.
  `develop-next` may name no branch. `develop-batch` may name one only beside an
  integration-branch HALT. Neither may answer by question number.
- `evals/develop-next/unit/select-next.test.mjs` — added 6 `bug.18` cases (exclusion with reason,
  develop-direct/undeclared kept silently, unresolved kept with a warning, pure default,
  `storyBranchModel` resolution, CLI on disk).
- `CHANGELOG.md` — Unreleased › Fixed entry.

**Testing**:

- The guard fails on the pre-fix directives (both orchestrators), shown again after the review
  rework by running it against `develop`'s two SKILL.md files, and passes after the fix. Its own
  mutation case rejects each pre-fix clause and accepts the fixed wording.
- 3 of the 5 new `select-next` cases fail on the pre-fix selector and pass after it. The other 2 pin
  the unchanged default.
- `node --test` over the develop-next/develop-batch protocol and unit suites plus the guard: 251
  pass, 0 fail. `bundle:check`, `check:generated` and `validate:all` are clean.

**Verification Steps for QA**:

1. `node --test evals/shared/tests/orchestrator-directive-branch-literal.test.mjs` — passes.
   Restore the old clause in either SKILL.md and it fails, naming the literal.
2. `node --test evals/develop-next/unit/select-next.test.mjs` — the `bug.18` cases pass.
3. Build a temp repo with an epic declaring `branch_model: epic-integration` and a story nested under
   it, list the story in a roadmap, and run `select-next.mjs --batch`. The story appears in
   `excluded[]` with an `epic-integration:` reason and gets no worktree.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-10-10
**Verified by**: develop-bug

**Verification Result**: ✅ Fixed

**Notes**: The regression guard `orchestrator-directive-branch-literal.test.mjs` passes, and it fails
against `develop`'s pre-fix SKILL.md files. The 6 `bug.18` cases in `select-next.test.mjs` pass, and
3 of them failed before the fix. `npm run ci:fast` is green (5176 pass / 0 fail).

`/review-code` found no blocking findings. It raised 3 non-blocking ones (2 bugs at confidence
medium, 1 bug at confidence low), and all were applied in this cycle:

- **CR-1/CR-2**: the batch directive names `<baseBranch>` again, beside an integration-branch HALT.
  The base is otherwise unknown inside a worktree, and Phase 0d's option always reads `develop`.
- **CR-3**: an unresolved epic is now told apart from an epic that declares nothing, and is named in
  `lint.warnings`.

The reported failure no longer reproduces.

**Decision**: Closed (finalised in Step 7)

---

## Status History

| Date       | Status | Changed By | Notes                                                                                     |
| ---------- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| 2026-10-09 | New    | Claude     | Found from the rebirth-wallet consumer while designing up-front pipeline answers (task.201); filed as #620 |
| 2026-10-10 | In Progress | develop-bug | Reproduced (guard + 3 selector tests fail on pre-fix code); investigation started |
| 2026-10-10 | Ready for QA | develop-bug | Fix implemented + regression tests; `npm run ci:fast` 5175 pass / 0 fail |
| 2026-10-10 | Ready for QA | develop-bug | Fix verified — bug scenario gone (verify cycle 1; 3 non-blocking review findings applied) |
| 2026-10-10 | Ready for QA | finalise | DoD verified — bug.18.dod.1.autonomous-runs-hardcode-base-branch.md |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
