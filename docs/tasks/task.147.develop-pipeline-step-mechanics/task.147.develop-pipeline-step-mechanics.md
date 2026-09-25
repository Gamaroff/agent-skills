---
id: task.147
title: "[Task 147] develop pipeline: five steps that fail or overreach on correct input"
type: task
description: "Fix five mechanical defects in the develop pipeline's shared step documents and their helpers, each of which fails or overreaches on a correct run: the Step 4 leak check reads commit-message lines as file paths; Step 8 stages, verifies and (in develop-next) merges across the whole checkout, not the run's scope; Step 3 names /develop with no stated inline path; the QA loop runs its fast gate before the cycle's gate and QA report are staged; and Step 8 check 3 greps a Final Status form the report template never writes. Each fix ships with a test that executes the prose block against a fixture and goes red without it."
tags: [develop-task, develop-story, develop-next, develop-batch, commit-changes, develop-pipeline, observation]
category: refactoring
status: ready-for-review
priority: High
created: 2026-09-24
updated: 2026-09-25
assignee:
estimated_effort_hours: 16
github_issue: 477
---

# Technical Task: develop pipeline — five steps that fail or overreach on correct input

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.147.review.1.develop-pipeline-step-mechanics.md` implemented 2026-09-25

**GitHub Issue**: [#477](https://github.com/Gamaroff/agent-skills/issues/477)

---

## 1. Overview

Five steps of the develop pipeline misbehave on runs that did nothing wrong. Two of them always
report a failure that is not there: the Step 4 leak check, and Step 8 check 3. Two others reach
past the run's own work in a checkout another session is also editing: Step 8's staging and push
check, and `develop-next`'s merge. The last two are ordering or mandate gaps: the QA loop runs its
fast gate before the cycle's evidence is staged, and Step 3 gives no legitimate path when a run
already holds the full plan. This task fixes all five in the shared step documents (the source of
truth under `shared/resources/`) and in the skill files that own the remaining sites. Each fix has
a test that **runs** the prose block against a fixture repository. A test that only greps the
document would prove the new text exists, not that it works.

**Scope**: six shared step documents or helpers, three `SKILL.md` files, six new or extended
tests, one existing test re-pinned, CHANGELOG. The `skills/*/references/` copies are regenerated
by `npm run bundle` and are never edited by hand.

**Key deliverables**:

1. **Step 4 leak check** reads file names only, not a positional slice of `git log` output (obs #141).
2. **Shared-checkout scoping** (obs #142): `/commit-changes --scope` limits tracked
   modifications to the scope, and Step 4's `SCOPE_PATHS` derivation is widened so that limit
   drops nothing a correct run produced; `verify-push-state.sh --scope` reports dirt outside the scope as a
   named warning; `gh pr merge --delete-branch` runs only on a clean tree, and the post-merge
   re-sync is its own step, never chained to a commit.
3. **Step 3 inline branch** with a checkable precondition and the same post-conditions `/develop`
   produces (obs #162).
4. **QA loop §5b** stages the cycle's gate and QA report after step 0's no-change check and before
   step 0a's fast gate (obs #171).
5. **Step 8 check 3** accepts the Final Status and Finished forms the implementation-report
   template actually writes, tested against the template itself (obs #173).

**Expected outcome**: a correct `/develop-task` or `/develop-story` run prints no false `LEAK`,
spends no fast-gate attempt on its own unstaged evidence, and passes the Step 8 checklist on a
conformant report. In a checkout shared with a concurrent session, Step 8 commits and verifies only its
work-item directory, and the merge never switches branches on a dirty tree. Step 4 cannot tell
its own uncommitted tracked edits from another session's, so it still stages every tracked
modification (see § 10, Risk 1).

---

## 2. Motivation

### Current Problems

1. **The Step 4 leak check reports a leak on every commit it inspects (obs #141).**
   `shared/resources/develop-pipeline-step-4-create-pr.md:117`
   (`git log -1 --name-only HEAD | tail -n +3 | while IFS= read -r f; do`) skips two lines and then
   treats every remaining line as a path. Line 3 of `git log` output is the `Date:` header, and the
   lines after it are the commit message. So the check prints `LEAK` even for a one-line commit
   subject. Reproduced on current `develop` by running the block against commit `39e595f9` with
   `SCOPE_PATHS=(shared/resources/ skills/ CHANGELOG.md)`: the first five lines printed were
   `LEAK: Date: …`, then the subject and body lines, and both touched files were in scope. The doc
   then says a LEAK "does not warrant a halt — investigate", so every run pays for an
   investigation. Recorded on task.128
   (`task.128.implementation.*.md`: "printed a false LEAK; re-checked with `git show --name-only
   --pretty=format: HEAD` → no leak").
2. **Step 8 sweeps, verifies and merges across the whole checkout (obs #142).** On task.128 a
   concurrent session was editing the same checkout, and three things went wrong:
   - `skills/commit-changes/SKILL.md:51` runs a bare `git add -u` in scope mode (the comment reads
     `tracked modifications (any path) — safe`). That would have swept the other session's
     `package.json`, `CHANGELOG.md` and `README.md` into task.128's commit. The orchestrator staged
     the work-item directory by hand instead.
   - `shared/resources/verify-push-state.sh:100-111` (`# ── 3. Working tree is clean`) fails on
     **any** `git status --porcelain` entry. task.128's Step 8 failed on "working tree DIRTY, 7
     uncommitted paths". All seven belonged to the other session, while every push fact passed. So
     the step's own success condition could not be met, even though the run was correct.
   - `skills/develop-next/SKILL.md:268` (`gh pr merge "$PR_ID" --"$mergeStrategy"
     --delete-branch`) switches the local branch as part of the delete. On the dirty tree that
     switch aborted, so the remote branch was not deleted and had to be removed by hand. A recurrence
     on 2026-09-21 (PRs #452–#458) is recorded in the observation. There, a merge chained to the
     next commit raced the index lock three times, and two acceptance commits were lost.
3. **Step 3 names one route and no alternative (obs #162).**
   `shared/resources/develop-pipeline-step-3-develop-loop.md:112` and `:129` both say "Invoke
   `/develop` with the … file path". task.141 shipped a 599-line plan naming every hunk. Its
   orchestrator implemented inline, since `/develop` would only have re-read that plan. It then did
   by hand the bookkeeping `/develop` owns (checkboxes, `Ready for Review`, the Change Log row).
   Nothing in the skill made that route legitimate. The loop audit (`audit.status` must read
   `Ready for Review`) passed only because the orchestrator remembered that bookkeeping.
4. **The QA loop gates a tree the commit will not match (obs #171).** In §5b, step 0a
   (`develop-pipeline-step-5-6-qa-loop.md:934`, `0a. **Run the fast gate before committing.**`)
   runs `<fastGateCommand>` before anything is staged. Staging happens at step 1, through
   `/commit-changes`. At that point `qa-task` has already linked the work item to this cycle's
   untracked `…gate.{N}….yml` and `…qa.{N}….md`. `shared/resources/tests/doc-links.test.mjs:334`
   resolves links against `git ls-files`, the index, so it reports both links as dead. The first
   fast-gate attempt of each cycle goes red for a reason unrelated to the fix and uses one of the
   two bounded attempts. task.143's report records this twice, in cycles 1 and 6: "attempt 1 red
   (doc-links on the tracked tree: gate.1/qa.1 were not yet staged), attempt 2 green after staging
   them".
5. **Step 8 check 3 cannot pass on a report written from its own template (obs #173).**
   `develop-pipeline-step-8-commit.md:166-167` greps `^\*\*Final Status:\*\* (Completed|Accepted)`
   and `^\*\*Finished:\*\* [0-9]`, with the colon inside the bold. The template's story and task
   variants write `**Finished**: …` and `**Final Status**: …`, with the colon outside
   (`shared/resources/implementation-report-template.md:116-117` story, `:212-213` task). Only the
   bug variant's header uses the colon-inside form (`:242-243`). Measured across the corpus with
   `git ls-files 'docs/tasks/*implementation*.md' 'docs/prd/*implementation*.md'
   'docs/development/*implementation*.md' | xargs grep -lE …`: 147 reports, 105 of which carry
   `**Final Status**: (Completed|Accepted)` (colon outside) and fail check 3. Only 6 pass it. The
   check has been failing, or not run, on nearly every completed run.
   `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs:708-718` pins the wrong regex
   as source text, which is how it survived.

### Benefits of Solution

- A clean run produces no false Step 4 leak and no false Step 8 failure. The two post-condition
  checks mean something again, instead of teaching the operator to skip them.
- A pipeline sharing a checkout commits, verifies and merges only its own work. Dirt it cannot
  attribute to itself is named, not swept in or failed on.
- Each QA cycle's fast gate measures the tree the `fix(...)` commit will carry. The first attempt
  is no longer red by construction.
- The Step 3 inline route becomes a documented path with checkable post-conditions, so the loop
  audit cannot tell it apart from a `/develop` run, and neither can a reviewer.
- Every fix is held by a test that executes the prose. No test here passes on the current
  document.

---

## 3. Technical Background

### Current Architecture

- **Step 4, Build Staging Scope and leak check**, in `shared/resources/develop-pipeline-step-4-create-pr.md`.
  `SCOPE_PATHS` is built from `{work-item-dir}` plus the top-level directories of
  `git diff --name-only "{Q2_answer}...HEAD"` (lines 31-45). The Pre-flight Guard moves untracked
  files that fall outside the scope into a hold dir (lines 52-77). After `/create-pr`, the leak
  check (lines 116-125) walks `git log -1 --name-only HEAD | tail -n +3`. The check and the
  scope-mode staging it verifies both arrived in `512f06e6` (2026-06-20, PR #207, per
  `git log --format='%h %ci' -S'tail -n +3' -- shared/resources/develop-pipeline-step-4-create-pr.md`).
- **Positional `--name-only` parsing, whole population.** `git grep -n -E
  'git (log|show)[^`]*--name-only' -- shared/resources 'skills/*/SKILL.md' 'skills/*/scripts'
  scripts | grep -v /references/` returns nine sites. Seven already use `--format=""` (qa-story ×2,
  qa-task ×3, qa-re-review-scope, one test). One is prose (`code-review-prompt.md:214`). The Step 4
  line is the only positional parse.
- **`/commit-changes --scope`**, in `skills/commit-changes/SKILL.md` § "`--scope` mode" (lines
  46-72). It runs `git add -u` over the whole tree, then `git add -- <scope paths>` for new files.
  `git grep -n "add -u" -- 'shared/resources/*.md' 'skills/*/SKILL.md'` finds that one executable
  site. It also finds a prose description that restates it: `develop-pipeline-step-8-commit.md:46`
  ("stages tracked modifications across the whole tree (`git add -u`)"). The same grep also
  matches `develop-pipeline-resume-contract.md:194`, but that line describes `/develop`'s staging
  ("Step 3's `/develop` commits with `git add -u`") and says Step 8's scope mode "sweeps the
  work-item directory", which is already accurate. It is not a restatement of scope mode, and
  `/develop`'s staging is out of scope (§ 4).
- **Callers of `/commit-changes --scope`** (same grep for `--scope {`): Step 4, via `/create-pr`
  (`develop-pipeline-step-4-create-pr.md:103,109`, forwarded by `skills/create-pr/SKILL.md:103`),
  and Step 8 (`develop-pipeline-step-8-commit.md:65`).
- **`verify-push-state.sh`** (`shared/resources/`, 152 lines) runs five checks: no rebase or merge in
  progress, commits ahead of base, **clean tree**, local HEAD equals the remote, and PR head equals
  HEAD. It has 9 cases in `shared/resources/verify-push-state.test.sh`, run by `npm test`. Callers
  (`git grep -n "verify-push-state.sh" -- 'shared/resources/*.md' 'skills/*/SKILL.md'`): Step 8
  check 5 (`develop-pipeline-step-8-commit.md:181-184`, plus the example at `:205`), and
  `skills/develop-batch/SKILL.md:335`, which runs in the item's own worktree. `skills/finalise/SKILL.md:1355`
  is prose about why `/finalise` does not call it.
- **Merge with `--delete-branch`, whole population.** `git grep -n "gh pr merge" -- 'shared/resources/*.md'
  'skills/*/SKILL.md' 'skills/*/scripts/*' 'scripts/*' | grep -v /references/ | grep delete-branch`
  returns 2 sites: `skills/develop-next/SKILL.md:268` and `skills/develop-batch/SKILL.md:442`. In
  develop-next, Step 4 (`skills/develop-next/SKILL.md:313`, "On `<baseBranch>` (pull first if Step 3
  merged into it)") states the post-merge re-sync only as prose and then commits.
- **Step 3 develop loop**, in `develop-pipeline-step-3-develop-loop.md`. Plan File Discovery (line
  46) and the Explore surface map (line 20) both run before the loop. Each loop body's item 1 says
  "Invoke `/develop`" (lines 112, 129), and item 2 runs the loop audit. The Change Log row on loop
  exit "belongs to `/develop`, not to this step document" (lines 257-269). `/develop`'s
  post-conditions are defined in `skills/develop/SKILL.md` § "**Story Completion Checklist**"
  (line 700) and § "**Task Completion Checklist**" (line 800).
- **QA loop §5b** (`develop-pipeline-step-5-6-qa-loop.md`, `### 5b. Run QA Fix (shared)` at line
  733). The commit table (lines 866-879) puts the cycle's gate and QA report in the `fix(...)`
  commit. Step 0 (line 924) runs `git diff --stat HEAD` to detect a no-change fix. Step 0a (line
  934) runs the fast gate. Step 1 (line 972) unstages the implementation report and invokes
  `/commit-changes`, which is the first moment the gate and QA report are staged.
  `grep -n fastGateCommand` on the file finds the gate run at 0a only. The accepting path (§5c
  path 1) commits gate and report before `/review-pr` but runs no fast gate. The repo's pre-commit
  hook (`.githooks/pre-commit`) only bundles, so obs #171's "same applies before 5c" has no gate to
  reorder and is dropped (see § 4).
- **Step 8 Completion Checklist** (`develop-pipeline-step-8-commit.md:145-186`). This is one bash
  block with checks 1, 2, 2b, 3, 4 and 5. Check 3's regex was introduced in `df0b6904` (2026-05-11,
  per `git log --format='%h %ci' -S'Final Status:\*\* (Completed' -- shared/resources/develop-pipeline-step-8-commit.md`).
  The only test on it asserts the regex text: `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs`
  test "#3+#4 — step-8 doc has BLOCKING post-condition checklist".
- **Bundled copies** (`git ls-files "skills/*/references/<file>"`): step 3, step 4 and step 8 are
  copied into develop-bug, develop-story and develop-task. The step 5-6 doc goes into develop-story
  and develop-task. `verify-push-state.sh` goes into develop-batch, develop-bug, develop-story,
  develop-task and finalise.

### Target Architecture

- **Step 4 leak check** reads `git diff-tree --no-commit-id --name-only -r HEAD`. That is a
  file-names-only form with no header to skip. The rest of the loop is unchanged.
- **`/commit-changes --scope`** stages one pathspec `git add -- <scope paths>`, bounded by the
  allowlist. A pathspec `git add` (git ≥ 2.0) records new, modified and deleted files under each
  path. *Implementation deviation, recorded:* the two-command form first drafted here
  (`git add -u -- <scope>` then `git add -- <scope>`) exits 128 on a scope directory that holds
  only new files (`pathspec … did not match any file(s) known to git`). The single form stages the
  same set with no such failure, and `commit-changes-scope-mode.test.mjs` holds both facts. The
  prose at Step 8 line 46 is updated to match.
- **Step 4 `SCOPE_PATHS` derivation** (review 1, C1) is the union of two lists: the committed
  diff (`git diff --name-only "{Q2_answer}...HEAD"`) and the uncommitted tracked diff
  (`git diff --name-only HEAD`). A root-level file, whose `dirname` is `.`, is added **by its own
  path** and is no longer skipped. This is required, not optional. On a normal run nothing is
  committed before Step 4, so the committed diff is empty (task.146's report says so and
  names the dropped root-level `CHANGELOG.md`). Today's derivation then yields only
  `{work-item-dir}`, and a scoped `git add -u` would leave every code edit out of the PR. The
  whole-tree `git add -u` is what currently hides that. After the union, every tracked
  modification the whole-tree form would have staged is inside `SCOPE_PATHS`, so Step 4 has no
  regression. The derived array is logged in the Decisions Log as it is today.
- **`verify-push-state.sh --scope <path>`** (repeatable, optional). With `--scope`, check 3 fails
  only on dirty paths inside a scope and prints dirty paths outside it as `! outside scope
  (warning): <path>` lines, which do not count as failures. Without `--scope`, behaviour is
  unchanged: any dirt fails. Step 8 check 5 passes `--scope "{work-item-dir}"`. develop-batch keeps
  the unscoped form, because its item runs in a private worktree.
- **Merge sites** (both). `--delete-branch` is passed only when `git status --porcelain` is empty.
  Otherwise the PR is merged without it and the remote branch is deleted with
  `git push origin --delete "$HEAD_BRANCH"`, with no local branch switch. Each block **binds**
  `HEAD_BRANCH` itself, from `gh pr view "$PR_ID" --json headRefName -q .headRefName`, **before**
  the merge (after the merge the PR still answers, but binding first keeps the name out of any
  race). An empty binding HALTs rather than running `git push origin --delete ""` (review 1, I1;
  the obs #133 rule: a block that reads a name must bind it). develop-next's Bitbucket arm is
  unchanged: its REST merge with `close_source_branch: true` deletes the branch server-side and
  never touches the local checkout. develop-next Step 4 opens
  with an explicit `git checkout <baseBranch> && git pull --ff-only origin <baseBranch>` as its own
  step, never chained to the merge or to a commit in one command.
- **Step 3 inline branch**, added to both loop bodies. **Precondition**: a co-located plan file was
  found and read *this run* (Plan File Discovery logged "Plan file found"), **and** the pre-develop
  surface map returned (Decisions Log "Pre-develop surface map:"). Both are already outputs of Step
  3, so the precondition can be checked. **Obligation**: every item of `/develop`'s Story or Task
  Completion Checklist, cited by name and not restated. That includes the one Change Log row the
  step doc currently assigns to `/develop`. The orchestrator also records a Decisions Log entry,
  "Step 3 inline — /develop not invoked: {reason}". The loop audit (item 2) runs unchanged. On any
  other input the step still invokes `/develop`.
- **QA loop §5b**: a new step between 0 and 0a stages the cycle's gate `.yml` and QA report `.md`
  with `git add --`. It sits **after** step 0 because a staged new file shows in
  `git diff --stat HEAD`, and staging first would make step 0's no-change HALT unreachable.
- **Step 8 check 3** accepts both bold forms,
  `^\*\*Final Status(:\*\*|\*\*:) (Completed|Accepted)` and the same for `Finished … [0-9]`. It is
  tested by running the checklist against a Completion block cut from each template variant.

### Same-class mechanism inventory (obs #103)

- **Leak check versus the Pre-flight Guard.** The guard (Step 4, lines 52-77) acts on untracked
  paths *before* the commit. The leak check audits the commit *after* it. This task fixes the
  leak check's parsing and extends the guard to report out-of-scope tracked modifications. It adds
  no third mechanism.
- **`verify-push-state.sh` versus the Step 5c trail assertion** (`develop-pipeline-step-5-6-qa-loop.md:1127-1136`,
  `git ls-files --error-unmatch` + `git show origin/…`). The 5c assertion checks two named files.
  `verify-push-state.sh` checks the whole push state. The new `--scope` flag narrows check 3 only,
  so the two stay separate and neither replaces the other.
- **Step 8 check 3 versus `report-lint.js`.** `report-lint.js` validates section structure against
  the template and has no completed-state assertion (`grep -n "Final Status" shared/resources/report-lint.js`
  finds nothing). Check 3 stays the one completed-state check. Moving it into `report-lint.js` is
  recorded as an open question in § 10.

---

## 4. Scope

### In Scope

- ✅ obs #141: the Step 4 leak check (the only positional `--name-only` parse, per the grep in § 3)
- ✅ obs #142: `/commit-changes` scope-mode staging, the Step 4 Pre-flight Guard report,
  `verify-push-state.sh --scope` with Step 8 check 5 using it, both `--delete-branch` merge sites,
  and develop-next's explicit post-merge re-sync
- ✅ obs #162: the Step 3 inline branch in both loop bodies
- ✅ obs #171: the §5b stage-before-gate step
- ✅ obs #173: Step 8 check 3, and re-pinning `stall-and-cleanup-protocol.test.mjs`
- ✅ Prose sweep of the restatement named in § 3 (step-8:46)
- ✅ `npm run bundle` for the regenerated `references/` copies, and CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ **§5c "before review-pr" half of obs #171.** No fast gate runs on that path (the only
  `fastGateCommand` run site in the doc is 5b step 0a), so there is nothing to reorder. Dropped with
  that evidence.
- ❌ **develop-bug's verify loop** (`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`,
  its own source). That loop writes no gate or QA report file ("This loop writes no gate"), so obs
  #171 does not apply to it.
- ❌ **Moving check 3 into `report-lint.js`** (the "or better" option in obs #173). This is an open
  question (§ 10). The template-derived test gives the same guarantee now.
- ❌ **`/develop`'s own commit staging.** The resume contract says it "commits with `git add -u`",
  but `git grep -n "add -u" -- 'skills/*/SKILL.md'` finds no such line in `skills/develop/SKILL.md`.
  It is not observed here. Revisit if it is.
- ❌ **`prettier --check .` in `ci:fast` failing on another session's files.** That is also in the
  task.128 record, but it is not one of these five observations.
- ❌ **An `index.lock` retry loop.** Separating the post-merge re-sync from any commit removes the
  race the recurrence describes. A retry-with-backoff wrapper would be a second mechanism for the
  same job.

---

## 5. Breaking Changes

1. **`/commit-changes --scope` no longer stages tracked modifications outside the scope.**
   - Before: `git add -u` (whole tree), then `git add -- <scope>`.
   - After: `git add -- <scope>` (one pathspec add: new, modified and deleted files inside the scope).
   - Affected: callers relying on scope mode to sweep a tracked edit outside the listed scopes.
     Of the two callers, Step 8 carries only work-item-dir files by design (step-8 doc, "the
     implementation report and nothing else new"). Step 4 derives its scope from every directory
     changed since base **and** every uncommitted tracked modification, with root-level files by
     path. That is the same set the whole-tree form staged.
   - Migration: pass an additional `--scope` for any path that must ride along. Step 4's own
     scope is widened in the same phase, so it needs none.
2. **`verify-push-state.sh` gains `--scope`.** This is additive. Without the flag, behaviour is
   identical, and existing test cases 1-9 stay green unchanged.
3. **Step 8 check 3 accepts a second bold form.** It becomes more permissive, never stricter. Every
   report that passed before still passes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.147.plan.develop-pipeline-step-mechanics.md](task.147.plan.develop-pipeline-step-mechanics.md)

Each phase closes one observation, touches a disjoint set of lines and can be reverted alone.

### Phase 1: Step 8 check 3 accepts the template's form (obs #173) (Risk: Low)

**Files**: `shared/resources/develop-pipeline-step-8-commit.md`,
`evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs`,
`shared/resources/tests/step-8-completion-checklist.test.mjs` (new)

- [x] Replace both check-3 greps with the two-form regexes
- [x] Re-pin the "#3+#4" assertions in `stall-and-cleanup-protocol.test.mjs` to the new regexes
- [x] New test runs the Completion Checklist block against a report built from each template variant's Completion block
- [x] Mutation-prove: restore the colon-inside-only regex → the task- and story-variant cases go red

### Phase 2: Step 4 leak check reads names only (obs #141) (Risk: Low)

**Files**: `shared/resources/develop-pipeline-step-4-create-pr.md`,
`shared/resources/tests/step-4-leak-check.test.mjs` (new)

- [x] Replace `git log -1 --name-only HEAD | tail -n +3` with `git diff-tree --no-commit-id --name-only -r HEAD`
- [x] Test: in-scope multi-line commit prints `OK`, in-scope one-line commit prints `OK`, and an out-of-scope file prints `LEAK: <that path>`, under bash and zsh
- [x] Mutation-prove: restore the `tail -n +3` form → both `OK` cases go red

### Phase 3: QA loop stages evidence before the fast gate (obs #171) (Risk: Low)

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
`shared/resources/tests/qa-loop-stage-before-gate.test.mjs` (new)

- [x] Insert the staging step between §5b step 0 and step 0a, with the ordering rationale (after the no-change check, before the gate)
- [x] Test: the block, run in a fixture, puts gate and QA report in `git ls-files` and leaves the implementation report unstaged. Within §5b, the block sits after step 0's `git diff --stat HEAD` and before the `<fastGateCommand>` block
- [x] Mutation-prove: move the block after 0a → ordering red; delete it → extraction red

### Phase 4: Scope-bounded staging and push verification (obs #142, parts 1–2) (Risk: Medium)

**Files**: `skills/commit-changes/SKILL.md`, `shared/resources/verify-push-state.sh`,
`shared/resources/verify-push-state.test.sh`, `shared/resources/develop-pipeline-step-4-create-pr.md`,
`shared/resources/develop-pipeline-step-8-commit.md`,
`shared/resources/tests/commit-changes-scope-mode.test.mjs` (new)

- [x] `/commit-changes` scope mode: `git add -- <scope>` (see § 3 for why not `-u -- <scope>`), with the flags table, prose and smoke test updated
- [x] `verify-push-state.sh`: repeatable `--scope`; check 3 splits dirt into inside (fail) and outside (named warning); header usage and exit-code text updated
- [x] `verify-push-state.test.sh` cases 10–13 (scoped outside → 0 + warning, scoped inside → 1, scoped new file in a new dir inside → 1, unscoped outside → 1)
- [x] Step 8 check 5 passes `--scope "{work-item-dir}"`, and the step-8:46 prose matches
- [x] Step 4 `SCOPE_PATHS` derivation: union of the committed diff and `git diff --name-only HEAD`, with root-level files added by path (review 1, C1)
- [x] Test (in `commit-changes-scope-mode.test.mjs`): run the derivation block in a fixture where nothing is committed since base, a tracked file under `skills/x/` is modified and the root `CHANGELOG.md` is modified. `SCOPE_PATHS` contains `skills/x` and `CHANGELOG.md`. Scope-mode staging with that array stages both
- [x] Mutation-prove each: bare `git add -u` → scope test red; drop the inside/outside split → case 10 red; drop the uncommitted-diff half of the derivation → the derivation test red

### Phase 5: Merge on a dirty tree without switching branches (obs #142, part 3) (Risk: Medium)

**Files**: `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`,
`shared/resources/tests/merge-delete-branch-guard.test.mjs` (new)

- [x] Both merge sites: bind `HEAD_BRANCH` from `gh pr view … --json headRefName` before the merge (HALT on empty); `--delete-branch` only on an empty `git status --porcelain`; otherwise merge, then `git push origin --delete "$HEAD_BRANCH"`
- [x] develop-next Step 4: explicit `git checkout <baseBranch> && git pull --ff-only origin <baseBranch>` as its own step before the tick, never chained to the merge or the commit
- [x] Test: population from the grep in § 3 (floor 2). Each block runs with a `gh` stub that records argv and answers `headRefName`: clean → `--delete-branch` present; dirty → absent, and the remote branch is deleted from the bare origin. develop-batch's block uses `<PR#>` / `<mergeStrategy>` placeholders, not `{…}`, so the binder must fill both spellings and fail on either left unbound
- [x] Mutation-prove: drop the porcelain guard → the dirty case goes red at each site

### Phase 6: Step 3 inline branch (obs #162) (Risk: Low)

**Files**: `shared/resources/develop-pipeline-step-3-develop-loop.md`,
`shared/resources/tests/develop-loop-inline-branch.test.mjs` (new)

- [x] Both loop bodies: item 1 becomes "Invoke `/develop` — or, when the inline precondition holds, implement inline", with the precondition and obligation stated once in a shared sub-section
- [x] The Change Log paragraph (lines 257-269) says the inline path writes the row *in place of* `/develop`, never beside it
- [x] Test: the sub-section names both precondition facts and the Decisions Log line, and cites `/develop`'s two checklist labels, which must resolve to headings in `skills/develop/SKILL.md`. Both loop bodies point at it, and item 2 (loop audit) is unchanged
- [x] Mutation-prove: rename the cited checklist label → red; delete either loop body's pointer → red

### Phase 7: Bundle, docs and validation (Risk: Low)

**Files**: `CHANGELOG.md`, the regenerated `skills/*/references/` copies

- [x] `npm run bundle`, then `npm run bundle:check` clean
- [x] CHANGELOG `[Unreleased]` › Fixed cites `(task 147)` and each observation number
- [x] `npm test` (with the gitignored `.agents/skills` symlink moved aside), `npm run ci:fast`, and `npm run validate` on develop-task, develop-story, develop-next, develop-batch and commit-changes

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` — inline branch sub-section; loop-body pointers; Change Log paragraph
2. ✅ `shared/resources/develop-pipeline-step-4-create-pr.md` — leak check; `SCOPE_PATHS` derivation (uncommitted tracked diff, root-level files by path)
3. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — §5b stage-before-gate step
4. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — check 3 regexes; check 5 `--scope`; line-46 prose
5. ✅ `shared/resources/verify-push-state.sh` — `--scope`
6. ✅ `skills/commit-changes/SKILL.md` — scope-mode staging
7. ✅ `skills/develop-next/SKILL.md` — merge guard; Step 4 re-sync
8. ✅ `skills/develop-batch/SKILL.md` — merge guard
8a. ✅ `skills/develop-bug/SKILL.md`, `skills/develop-bug/references/develop-bug-step-7-close-bug.md` — a general bug names `docs/bugs/bug-registry.md` as Step 8's `{extra-scope-paths}` (QA cycle 1, CR-2)

### Files to Add (Tests)

10. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`
11. ✅ `shared/resources/tests/step-4-leak-check.test.mjs`
12. ✅ `shared/resources/tests/qa-loop-stage-before-gate.test.mjs`
13. ✅ `shared/resources/tests/commit-changes-scope-mode.test.mjs`
14. ✅ `shared/resources/tests/merge-delete-branch-guard.test.mjs`
15. ✅ `shared/resources/tests/develop-loop-inline-branch.test.mjs`
15a. ✅ `shared/resources/tests/lib/executed-prose.mjs` — the shared harness (fence cut, placeholder
    binder, cached fixture repo, `gh` stub, bash and zsh runner) that the plan's "write once" note called for

All six sit inside the `shared/resources/tests/*.test.mjs` glob that `package.json` `test` already
runs, so no glob edit is needed.

### Files to Modify (Tests)

16. ✅ `shared/resources/verify-push-state.test.sh` — cases 10–13
17. ✅ `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs` — re-pin the check-3 regexes

### Files to Modify (Documentation / Generated)

18. ✅ `CHANGELOG.md`
19. ✅ `skills/{develop-bug,develop-story,develop-task}/references/…` and the `verify-push-state.sh` copies in develop-batch and finalise — regenerated by `npm run bundle`, never edited by hand

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit / Executed-Prose Tests

- **Scope**: each new test cuts its block from the shipped document with the repository's own fence
  reader (`extractBlocks` in `shared/resources/qa-execute-snippets.mjs`). It binds the `{…}`
  placeholders, fails if any placeholder is left unbound, and runs the block in a throwaway git
  repository with a bare `origin`, under both `bash` and `zsh` (skipping zsh when it is absent, via the local
  `hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0` probe that
  `probe-base-binding.test.mjs:44` uses; there is no shared helper). This is the pattern of `shared/resources/tests/probe-base-binding.test.mjs`
  and `evals/shared/tests/fast-gate-precondition.test.mjs`. `gh` is a PATH-prepended stub that
  records its argv.
- **Non-vacuity**: every test asserts that its extraction found exactly the block it expects (by a
  unique anchor string inside the block). A renamed heading or moved block then turns the test red,
  not silently green.
- **Command**: `command node --test shared/resources/tests/<file>.test.mjs`; `bash shared/resources/verify-push-state.test.sh`.

### What each test proves (and its red-without-fix condition)

| Test | Proves | Red on today's document because |
| --- | --- | --- |
| `step-8-completion-checklist.test.mjs` | A task- and a story-variant report built from the template's own Completion block pass check 3; `{populated at end}` and `In Progress` fail it; a dirty path outside `{work-item-dir}` passes check 5 with a named warning, one inside fails | check 3 greps colon-inside only; check 5 fails on any dirt |
| `step-4-leak-check.test.mjs` | An in-scope commit prints `OK` whatever its message length; an out-of-scope file is named | `tail -n +3` feeds the `Date:` line and message into the loop |
| `qa-loop-stage-before-gate.test.mjs` | Gate and QA report are in `git ls-files` before the fast gate runs; the implementation report is not staged; step 0's no-change check still precedes the staging | no staging block exists before 0a |
| `commit-changes-scope-mode.test.mjs` | A tracked edit outside `--scope` stays unstaged; tracked and new files inside are staged | bare `git add -u` stages the outside edit |
| `verify-push-state.test.sh` 10–13 | `--scope` splits dirt into fail (inside) and warning (outside); no `--scope` still fails on any dirt | the flag does not exist (exit 2, unknown argument) |
| `merge-delete-branch-guard.test.mjs` | On a dirty tree neither merge site passes `--delete-branch`, and the remote branch is still deleted | both sites pass `--delete-branch` unconditionally |
| `develop-loop-inline-branch.test.mjs` | The inline branch exists in both loop bodies with its precondition, and cites `/develop` checklists that resolve | no inline branch exists |

### Honest limit

`develop-loop-inline-branch.test.mjs` holds the **statement** of the Step 3 branch, not an
orchestrator applying it. There is no eval layer that runs a live orchestrator through Step 3. The
behavioural evidence for that branch is task.141's run, which is already on the branch in
`task.141.implementation.*.md` ("Step 3: `/develop` was not invoked — the orchestrator implemented
inline"). The implementation report states this limit.

### Regression

- `npm test` in full, with the gitignored `.agents/skills` symlink moved aside. Local green through
  the symlink can hide a CI red.
- `evals/develop-story/protocol/*.test.mjs` and `evals/develop-task/protocol/*.test.mjs` pin
  step-doc structure. Re-run them after Phase 6.
- `evals/develop-task/step-isolation/08-commit-changes` replay fixtures already use the
  colon-outside form (`task.42.implementation.1.example-initial-run.md:10-11`) and stay valid.

---

## 9. Success Criteria

### Functional

- [x] Step 8 check 3 passes a report built from the task template's Completion block and one built from the story template's, and fails one still reading `{populated at end}` — `step-8-completion-checklist.test.mjs`
- [x] The Step 4 leak check prints `OK` for an in-scope commit with a multi-line body and for one with a one-line subject, and prints `LEAK: <path>` naming only the out-of-scope file otherwise, under bash and zsh — `step-4-leak-check.test.mjs`
- [x] In §5b the cycle's gate `.yml` and QA report `.md` are in `git ls-files` before `<fastGateCommand>` runs, after step 0's `git diff --stat HEAD`, and the implementation report is not staged — `qa-loop-stage-before-gate.test.mjs`
- [x] `/commit-changes --scope X` leaves a tracked modification outside `X` unstaged — `commit-changes-scope-mode.test.mjs`
- [x] `verify-push-state.sh --scope X` exits 0 with a warning naming a dirty path outside `X`, and exits 1 on a dirty path inside `X`; without `--scope` it exits 1 on either — `verify-push-state.test.sh` cases 10–13, with cases 1–9 unchanged and green
- [x] Step 8 check 5 passes `--scope "{work-item-dir}"`, and a fixture with an out-of-scope dirty path passes the whole Completion Checklist — `step-8-completion-checklist.test.mjs`
- [x] At every site the § 3 grep finds (floor 2), a dirty tree merges without `--delete-branch` and deletes the remote branch; a clean tree keeps `--delete-branch` — `merge-delete-branch-guard.test.mjs`
- [x] develop-next Step 4 re-syncs with `git checkout` + `git pull --ff-only` as a step of its own, not chained to a commit in one command — `merge-delete-branch-guard.test.mjs`
- [x] Both Step 3 loop bodies offer the inline branch with its two-fact precondition, and cite `/develop`'s Story and Task Completion Checklists by labels that resolve in `skills/develop/SKILL.md` — `develop-loop-inline-branch.test.mjs`

### Performance

- [x] Each new test file completes in under 10 seconds on an idle machine. Spawn timeouts come from `spawnBudget()`, never a literal (`tests/test-harness-concurrency.test.js` enforces this)
- [x] No test makes a network call (`gh` is stubbed; `origin` is a local bare repo)

### Code Quality

- [x] Every fix mutation-proved: the reverted behaviour turns its named test red, recorded per phase in the implementation report
- [x] `npm run ci:fast`, `format:check` and `npm run bundle:check` clean; `npm test` green with the `.agents/skills` symlink moved aside
- [x] No hand edit under `skills/*/references/`: `git diff --stat` shows those paths changed only in the `npm run bundle` commit

### Migration

- [x] CHANGELOG `[Unreleased]` › Fixed cites `(task 147)` and obs #141, #142, #162, #171, #173, and names the `/commit-changes --scope` behaviour change
- [x] The prose restatement of scope-mode staging (`develop-pipeline-step-8-commit.md` § "Invoke /commit-changes") describes the scoped form. `git grep -n "add -u" -- skills/commit-changes/SKILL.md shared/resources/develop-pipeline-step-8-commit.md` shows no whole-tree form left. `develop-pipeline-resume-contract.md:194` is about `/develop` and is deliberately left as is (§ 3)

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Scoped `git add -u` leaves a legitimate edit out of the Step 4 commit**
   - Risk: with the committed-diff-only derivation this is the **default** case, not an edge
     case. Nothing is committed before Step 4 on a normal run, so `SCOPE_PATHS` is just
     `{work-item-dir}` (task.146 report, Step 4 notes; review 1, C1).
   - Probability: High without the derivation fix; Low with it · Impact: High (the PR carries no code)
   - Mitigation: Phase 4 widens the derivation to the uncommitted tracked diff and keeps
     root-level files by path. Step 4 then stages exactly what the whole-tree form staged. The
     derivation test holds this. Step 8's scoped verify names anything left behind, and
     `develop-next` Step 3's green check and the 5c conformance review both read the PR, not the
     working tree.
   - Honest limit: Step 4 therefore still stages another session's tracked edit in a shared
     checkout. The pipeline has no way to attribute an uncommitted edit to a session. The
     shared-checkout guarantee this task delivers is at Step 8 and at the merge, not at Step 4.
   - Rollback: revert Phase 4 alone. The other phases do not depend on it.
2. **Merge guard behaviour differs between `gh` versions**
   - Risk: the local-switch abort on a dirty tree is recorded in obs #142 (task.128, 2026-09-20)
     and was not re-reproduced here, because doing so needs a live PR. A `gh` that no longer
     switches branches would make the guard unnecessary, though still harmless.
   - Probability: Low · Impact: Low
   - Mitigation: the guarded form, merge and then `git push origin --delete`, is correct whatever
     `gh` does locally. The test stubs `gh`, so it checks the pipeline's choice, not `gh`'s behaviour.
3. **The inline Step 3 path is taken on a thin plan**
   - Risk: an orchestrator reads "plan file found" as licence to skip `/develop` on a plan that
     does not name the hunks.
   - Probability: Medium · Impact: Medium
   - Mitigation: both precondition facts are required. The obligation is `/develop`'s full
     checklist, and the loop audit runs unchanged, so a thin inline pass reads `In Progress` and
     re-enters the loop. The Decisions Log line makes the choice auditable.

### Low Risk Areas

1. **Staging before the gate changes step 0's reading.** A staged new file shows in
   `git diff --stat HEAD`, so the block goes **after** step 0. The ordering assertion in
   `qa-loop-stage-before-gate.test.mjs` holds this.
2. **The re-pinned eval test still asserts text.** `stall-and-cleanup-protocol.test.mjs` keeps its
   structural pin, and the executed-prose test is what holds the behaviour.
3. **zsh differences in extracted blocks.** Every executed-prose test runs under both shells.

### Open Questions (recorded instead of asked — non-interactive authoring run)

1. **One task or three?** The caller asked for one document. By the create-task §1.2 splitting
   test, the phases split cleanly three ways: shared-checkout scoping (Phases 4–5), check parsing
   (Phases 1–2), and step ordering and mandate (Phases 3, 6). Each phase is independently
   revertible, so the owner can split at review without rewriting anything.
2. **obs #173 fix form.** This task takes the two-form regex plus a template-derived test. The
   observation's "or better" option, a `report-lint.js --completed` assertion that shares one
   definition with the template, is deferred. Choose it at review if a second completed-state
   reader appears.
3. **obs #162 policy.** The recommended default, an explicit inline branch, is taken. If the owner
   would rather keep `/develop` mandatory, Phase 6 becomes "state that inline implementation is not
   permitted, and HALT on a report that records one", and the rest of the task is unaffected.
4. **develop-batch merge site.** It is included because the § 3 enumeration finds it. Its main
   checkout is usually clean, so there the guard is a no-op, not a fix. The owner may prefer to
   exempt it by name in the test's population.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a develop pipeline run commits without its own code changes; the Step 8 checklist
  passes a report that is not finalised; a merge leaves the remote branch in place on a clean tree.
- **Steps**: revert the PR. It contains prose, one shell helper, tests and bundled copies, and no
  data migration. Then run `npm run bundle` to confirm the copies match the reverted sources.
- **Validation**: `npm test` and `npm run bundle:check` green on the reverted tree.

### Partial Rollback (1–2 hours)

- Revert one phase's commit. Phases 1, 2, 3 and 6 each touch one step document and one new test.
  Phases 4 and 5 are the ones with runtime reach (commit staging and merging). Revert them first if
  a pipeline run misbehaves, and keep the parsing and ordering fixes.

### Forward Fix

- A scope omitted at Step 4: add the missing directory to `SCOPE_PATHS` derivation (for example
  from `git diff --name-only HEAD`) instead of widening the staging back to the whole tree.
- A misfiring inline branch: tighten the precondition wording and add the counter-example to the
  sub-section.

### Rollback Triggers

- **Critical**: work missing from a PR because of scoped staging; a merge that deletes a branch
  other than the PR's head.
- **Non-critical**: a warning line format a reader finds unclear; wording of the inline
  precondition. Fix these forward.

---
## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-25
**Quality Score**: 60/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.147.qa.5.develop-pipeline-step-mechanics.md](./task.147.qa.5.develop-pipeline-step-mechanics.md)
- **Gate File**: [task.147.gate.5.develop-pipeline-step-mechanics.yml](./task.147.gate.5.develop-pipeline-step-mechanics.yml)

### Test Coverage Summary

- **Tests Executed**: 94 node tests + 27 shell cases
- **Phases Verified**: 7/7
- **Critical Issues**: 0 HIGH, 4 MEDIUM (one mechanism, filed as bug.14), 2 LOW; bugs 1–13 closed
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings

HIGH has been 0 for three consecutive gates. The `verify-push-state --scope` gate uses the wrong predicate: glob, case-folded and `:/` spellings exist but match nothing, so the scope check passes vacuously (bug.14). The fix replaces the gate rather than patching another spelling.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-24 | 1.0     | Initial draft — cut from observations #141, #142, #162, #171, #173 (2026-09-24 observation review) | create-task |
| 2026-09-25 | 1.1     | Review 1: 7/10 as reviewed, 9/10 after fixes. C1: Step 4 scope derivation widened, since a scoped `add -u` dropped all uncommitted code. I1: `HEAD_BRANCH` bound at both merge sites. I2: the resume-contract line dropped from the sweep. O1: zsh probe named | review-task |
| 2026-09-25 |         | Status → ready-for-development | review-task |
| 2026-09-25 |  | Implemented — 18 source files (+16 bundled copies), 58 node tests + 4 shell cases; all fixes mutation-proved | develop |
| 2026-09-25 |  | QA gate FAIL (20/100) — 2 HIGH, 4 MEDIUM, 3 LOW; bugs 1-6 filed | qa-task |
| 2026-09-25 |  | QA gate FAIL (60/100) — 1 HIGH, 2 MEDIUM, 4 LOW; bugs 1-6 closed, bugs 7-9 filed | qa-task |
| 2026-09-25 |  | QA gate CONCERNS (70/100) — 0 HIGH, 3 MEDIUM, 2 LOW; bugs 7-9 closed | qa-task |
| 2026-09-25 |  | QA gate CONCERNS (90/100) — 0 HIGH, 1 MEDIUM; bugs 10-12 closed, bug.13 filed | qa-task |
| 2026-09-25 |  | QA gate CONCERNS (60/100) — 0 HIGH, 4 MEDIUM (one mechanism, bug.14), 2 LOW; bug.13 closed | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: Step 8 check 3 (obs #173)
- [x] Phase 2: Step 4 leak check (obs #141)
- [x] Phase 3: QA loop stage-before-gate (obs #171)
- [x] Phase 4: scope-bounded staging and push verification (obs #142 parts 1–2)
- [x] Phase 5: merge guard and post-merge re-sync (obs #142 part 3)
- [x] Phase 6: Step 3 inline branch (obs #162)
- [x] Phase 7: bundle, docs, validation

---

## Implementation Record

**Implementation Summary.** All five observations are fixed in the shared step documents and in
the three `SKILL.md` files that own the remaining sites. Each fix is held by a test that cuts its
block from the shipped document and runs it in a fixture repository under bash and zsh. Each is
also mutation-proved: every mutant listed below turned its named test red and was restored from a
`cp` snapshot.

**Start / completion date.** 2026-09-25 / 2026-09-25 (`/develop-task` run 1, dispatched by
`/develop-next`).

**Implementation approach.**

- **Shared harness.** `shared/resources/tests/lib/executed-prose.mjs` provides the fence cut
  (`extractBlocks`, exactly one block per anchor), and a binder that refuses any `{…}` or `<…>`
  placeholder left in code (comments excluded). It also provides a fixture repo built once per process
  and copied per test (its remote is the relative `../origin.git`), a `gh` stub that records argv,
  and sync and async runners with no rc files and timeouts from `spawnBudget("EXECUTED_PROSE")`.
- **Phase 1 (obs #173).** Check 3 accepts `(:\*\*|\*\*:)`. The test builds its reports from
  `implementation-report-template.md`'s own fenced variants, cutting them with
  `change-log.js`'s `fencedRanges`. It substitutes placeholders that must exist, so a template
  edit reaches the test.
- **Phase 2 (obs #141).** `git diff-tree --no-commit-id --name-only -r HEAD`.
- **Phase 3 (obs #171).** New §5b step `0-stage.` sits between step 0 and step 0a, so the existing
  numbering and its one citation (`step-5-6:91`) stay valid.
- **Phase 4 (obs #142 parts 1–2).** Scope staging is a single pathspec `git add` (the deviation
  is recorded in § 3). `verify-push-state.sh --scope` uses `git status --porcelain -z
  --untracked-files=all`, so paths are unquoted and file-level, and it skips each rename's source
  entry. Step 4's derivation unions the committed diff with `git diff --name-only HEAD`,
  scopes root-level files by path and de-duplicates (review 1, C1). Step 8 check 5 passes
  `--scope "{work-item-dir}"`.
- **Phase 5 (obs #142 part 3).** Both merge sites bind `HEAD_BRANCH` before merging, HALT on an
  empty binding, and use `--delete-branch` only on an empty porcelain. Otherwise they merge, then
  run `git push origin --delete`. develop-next Step 4 opens with its own re-sync block.
- **Phase 6 (obs #162).** A sub-section, "Inline implementation instead of `/develop` (iteration
  1 only)". Its two preconditions quote the Decisions Log lines Step 3 itself writes, and the test
  checks that.

**Testing results.** The new suites are step-8-completion-checklist (17, 7.1s),
step-4-leak-check (6, 1.2s), qa-loop-stage-before-gate (3, 0.8s), commit-changes-scope-mode
(10, 2.0s), merge-delete-branch-guard (16, 8.0s) and develop-loop-inline-branch (6, 0.1s): 58 node
tests. `verify-push-state.test.sh` has 13 cases (was 9). `stall-and-cleanup-protocol.test.mjs`
was re-pinned (27/27). `npm run ci:fast` (format:check and `npm test`, with the `.agents/skills`
symlink moved aside) passed with 4068 passed and 0 failed. Also clean: `npm run bundle:check`,
`npm run lint:shell`, and `quick_validate` on develop-task, develop-story, develop-next,
develop-batch and commit-changes.

**Mutation proof.**

| Mutant | Red |
| --- | --- |
| check 3 back to colon-inside only | task- and story-variant pass cases, and the Finished case (bash+zsh); the bug variant stays green, as it should |
| check 5 without `--scope` | the outside-dirt case (bash+zsh) and the non-vacuity pin |
| leak check back to `git log … \| tail -n +3` | all six leak cases |
| staging block moved after 0a / deleted | the ordering test / the ordering test and both staging cases |
| scope mode with a bare `git add -u` first | the scope-only staging case |
| scope mode as `git add -u -- <scope>` first (the first-drafted form) | the only-new-files case (exit 128) |
| derivation without `git diff --name-only HEAD` / skipping root files | the nothing-committed and derived+staged cases |
| `verify-push-state` inside/outside split removed / `--scope` not collected | case 10 / cases 10 and 11 |
| porcelain guard dropped (each merge site) | that site's dirty-tree case |
| empty-`HEAD_BRANCH` guard dropped (each site) | that site's unbindable case |
| develop-next re-sync chained to a commit | the re-sync structure test and both run cases |
| a cited `/develop` checklist label renamed / a loop-body pointer deleted / both plan log lines renamed | the corresponding inline-branch assertion |

**QA cycle 1 fixes (qa-fix).** Gate 1 was FAIL, with 2 HIGH, 4 MEDIUM and 3 LOW findings. All nine are fixed. Each is held by a test that runs the shipped block binding only its documented placeholders, and each is mutation-proved (every mutant reds its named test):

- CR-1: real exits at develop-next's merge guard; the test PRELUDE no longer defines HALT().
- CR-2: Step 8 `{extra-scope-paths}` (table + check 5), wired into develop-bug.
- CR-4: `SCOPE_PATHS` is persisted to `.claude/state/step4-scope-paths.txt` for the guard and the leak check.
- **Found by qa-fix's adversarial pass:** `HOLD_DIR` had the same cross-shell shape. The Restore block would have stranded held files in /tmp, so it is now persisted too.
- CR-5: a failed remote delete is a warning at both sites.
- CR-6: the derivation skips paths that are gone from both the tree and the index.
- QA-1: both sides of a rename are judged.
- CR-7: exit statuses are captured.
- CR-8: scopes are normalised, and a scope that names nothing exits 2.
- QA-2: the Step 4 prose says "tracked".

The harness now shares one `gh` stub per process (symlinked, with a sourced per-test body), because macOS scans every new executable on its first exec. That took the merge suite from 12.5s to 2.0s. `verify-push-state.test.sh` has 20 cases (was 13).

**QA cycle 2 fixes (qa-fix).** Gate 2 was FAIL, with 1 HIGH, 2 MEDIUM and 4 LOW findings. All seven are fixed, each with an executed test and a mutation proof (9 mutants; each turns its named test red):

- CR-1: the guard records held paths, and Step 8 check 5 scopes those still present, so a held own file cannot pass as another session's dirt.
- CR-2: the guard skips `.claude/`.
- CR-3: the guard reuses an existing hold directory.
- CR-6: a failed re-sync is an explicit HALT.
- CR-7: record readers refuse a stale first line, and a passing Step 8 removes the records.
- CR-8: either porcelain column can mark a rename.
- CR-9: an absolute scope is canonicalised to its physical path, and `..` is refused.

`verify-push-state.test.sh` has 23 cases (was 20).

**QA cycle 3 fixes (qa-fix).** Gate 3 was CONCERNS, with 3 MEDIUM and 2 LOW findings. All five are fixed and mutation-proved (7 mutants): CR-1 replaces the `tee -a Issues Log` with echo; CR-3 makes an unrestored hold fail Step 8; CR-4 normalises `.` and `//` in scopes; CR-2 names a mismatched held record; CR-5 scopes `.claude/` changes by path. `verify-push-state.test.sh` now has 26 cases.

**QA cycle 4 fixes (qa-fix).** Gate 4 was CONCERNS, with 1 MEDIUM. CR-1 is fixed: a relative `.//x` scope no longer keeps a leading `/`. The advisory CR-2 cleanup test now seeds `step4-hold-dir.txt`. Both fixes are mutation-proved. `verify-push-state.test.sh` now has 27 cases.

**QA cycle 5 fixes (qa-fix).** Gate 5 was CONCERNS. It found 4 MEDIUM findings from one mechanism, plus 2 LOW. The fix **replaces** the verify-push-state scope gate instead of patching another spelling. A scope is now accepted only when check 3's own predicate matches a path git reports, so the glob, case-folded, `:/` and symlink-component spellings are refused with exit 2. `--help` prints by markers. There are 4 mutation proofs, and `verify-push-state.test.sh` now has 32 cases.

**Deferred work.** None of the scope. The Step 3 inline branch is held as a statement, not as
an orchestrator applying it (§ 8, Honest limit). The review's O3, bare-prefix path matching in
the leak check and the derivation, is recorded and left out of scope.

## References

- Observations #141, #142, #162, #171, #173, in the project observation log (`skill-observations/observation-log/`)
- task.128: the leak-check false positive and the shared-checkout failures, recorded in its implementation report
- task.141: the inline Step 3 run (`task.141.implementation.*.md`, "Step 3: `/develop` was not invoked")
- task.143: the stage-before-gate recurrences (cycles 1 and 6) and the check-3 FAIL on a conformant report
- `shared/resources/tests/probe-base-binding.test.mjs`, the executed-prose pattern (fence reader, `gh` stub, bash and zsh) the new tests follow
- [`document-change-log.md`](../../../shared/resources/document-change-log.md), the Change Log format

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.147.qa.{N}.develop-pipeline-step-mechanics.md`,
  `task.147.gate.{N}.develop-pipeline-step-mechanics.yml`, bug reports `task.147.bug.{N}.{name}.md`.
- Edit `shared/resources/` sources only, then run `npm run bundle`. An edit made only under
  `skills/*/references/` is reverted by the next bundle.
- This task fixes the pipeline it runs through. Phase 3's ordering and Phase 1's check 3 will
  apply to this task's own QA loop and Step 8 once they merge, but not before. Expect this run's
  own first §5b gate attempt to hit obs #171.
- Observations #141, #142, #162, #171 and #173 are resolved (`set-status --status actioned`) when
  this task's PR merges.
