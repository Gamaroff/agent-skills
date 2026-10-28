---
id: task.238.plan
title: "Implementation Plan: QA loop acts on the signals it already has"
type: plan
task-ref: task.238.qa-loop-acts-on-signals-it-has.md
---

# Implementation Plan: QA loop acts on the signals it already has

> Requirements and success criteria: [task.238.qa-loop-acts-on-signals-it-has.md](task.238.qa-loop-acts-on-signals-it-has.md)

## Overview

There are four independent edits, each to a section that already exists, followed by guards. Edit the `shared/resources/` sources only, then run `npm run bundle`. `develop-bug-step-5-6-verify-loop.md` is skill-owned, so edit it in place.

## Phase-by-Phase Implementation Guide

### Phase 1: Fast-gate outcomes and gated cleanup

**Files to modify:**

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b step 0a, the block after *"0a. **Run the fast gate before committing.**"*
- `shared/resources/develop-pipeline-step-3-develop-loop.md`: *"### Output Capture Pattern"* and the *"On Test Failure"* cleanup bullets
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: its 0a block (`FIX_LOG=".claude/state/bug-fix-gate-{N}-…"`)
- `skills/develop/SKILL.md`: its own `TEST_LOG` block (`:624`) and the `Log cleanup:` line (`:641`)
- `shared/resources/test-failure-triage-prompt.md`: *"## Log Cleanup Rule"* (`:79`), a restatement. Reword it to the gated form

The site list comes from `git grep -nE '[A-Z_]+_LOG="?\.claude/state' -- 'shared/resources/*.md' 'skills/*/SKILL.md' 'skills/develop-bug/references/*.md'` and `git grep -nE 'rm -f "\$[A-Z_]*LOG"'` over the same paths. Re-run both at implementation time. `RB_LOG` (`develop-pipeline-step-5-6-qa-loop.md:461`) is never removed, so it is excluded.

**Exact changes:**

1. **Gated cleanup.** Delete the prose line *"Cleanup mirrors step 3: `GATE_EXIT == 0` → `rm -f "$FIX_LOG"`; non-zero → retain for post-mortem."* Then put the cleanup at the end of each block, as one statement:

   Foreground form:

   ```bash
   [ "$GATE_EXIT" -eq 0 ] && rm -f "$FIX_LOG"   # a red log is never removed here
   ```

   Background form (read on the completion notification):

   ```bash
   grep -q '^GATE_EXIT=0$' "$FIX_LOG" && rm -f "$FIX_LOG"
   ```

   Add one sentence: *Reading the result and removing the log are separate decisions. The removal is keyed on the result in the same statement, so a command that batches a read with cleanup cannot remove a red log.* Make the same change to `TEST_LOG`/`TEST_EXIT` in step 3.

2. **Three outcomes.** Before *"**This is a gate on the commit, not a new halt.**"*, insert a classification of the result:

   | Result | How to tell | Action | QA Iteration History line |
   |---|---|---|---|
   | not measured | no `GATE_EXIT=` line in the log (background form), or a foreground exit of 124 (timeout), 137 (SIGKILL) or 143 (SIGTERM) | re-run once; never green, never red; no retry attempt consumed | `Fast gate: not measured ({reason})` |
   | pre-existing red | the **same tests fail** in a worktree at the PR base: the failing test names or assertions in the base log match those in the head log | record both runs, then commit and push as on green | `Fast gate: red, pre-existing on {base} ({tests}; head + base commands)` |
   | attributable red | anything else red, including `BASE_CHECK=unavailable` | today's triage + 2-attempt bound | unchanged |

   The base check, in one block. Fetch the base first. The worktree has no `node_modules` and no `.agents/skills`, so a failure there that names none of the head's failing tests means the environment, not the code:

   ```bash
   BASE_NAME="$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo develop)"
   git fetch -q origin "$BASE_NAME" || { echo "BASE_CHECK=unavailable"; exit 0; }
   WT=".worktrees/base-check-${QA_CYCLE}"
   git worktree add --detach "$WT" "origin/$BASE_NAME" >/dev/null 2>&1 || { echo "BASE_CHECK=unavailable"; exit 0; }
   [ -d node_modules ] && ln -s "$PWD/node_modules" "$WT/node_modules"
   ( cd "$WT" && command node --test "{failing-file}" ) > "$FIX_LOG.base" 2>&1; BASE_EXIT=$?
   git worktree remove --force "$WT"
   echo "BASE_EXIT=$BASE_EXIT"
   ```

   Then compare: pre-existing **only** when `BASE_EXIT != 0` **and** every failing test named in the head log (`not ok … - {name}` lines for `node --test`) also appears as failing in `$FIX_LOG.base`. A base log with no `not ok` line, or one that fails on `Cannot find module` / `command not found` / a missing `.agents/skills`, is `BASE_CHECK=unavailable`. `BASE_CHECK=unavailable` falls through to the attributable path, never to pre-existing. The failing file comes from the head log, never from recall. When the failing test is not a `node --test` file, run the failing command named in the log and compare its failure lines the same way.

   **Differential oracle** (each shape must land on *attributable*, tested in the integration test): a base run where a different test fails; a base run that fails with `Cannot find module`; a base run that fails for want of `.agents/skills`; a worktree that cannot be created.

### Phase 2: PR Existence Check and CI read at Step 10

**Files to modify:** `skills/qa-task/SKILL.md` (*"### PR Existence Check"*, Step 10's gate composition, Step 11's *Review Methodology*, Step 14's Bitbucket preamble), and the same four places in `skills/qa-story/SKILL.md`.

**Exact changes:**

- **PR Existence Check.** Source `resolve-platform.sh` there, guarded (`source references/resolve-platform.sh || exit 1`), and branch on `VCS`. GitHub keeps today's `gh pr view` block. Bitbucket derives `BB_WORKSPACE`/`BB_REPO` exactly as Step 14 does today (`skills/qa-task/SKILL.md:1679-1688`), sources `bitbucket-auth.sh` (guarded), and looks up the open PR for the current branch:
  `GET ${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests?q=source.branch.name="${CURRENT_BRANCH}" AND state="OPEN"`, setting `PR_NUMBER` (`.values[0].id`), `PR_URL` (`.values[0].links.html.href`), `PR_STATE` and `PR_TITLE`. No match → the same HALT text as GitHub. Step 14 then reuses these values instead of deriving them again.
- **CI read at Step 10**, just before the gate YAML is composed, once, with no wait. Reuse `/finalise`'s bucketing **exactly**. Copy the jq from `skills/finalise/SKILL.md` (`CI_ROLLUP=$(gh pr view …`), per check rather than aggregated, keeping its `.status`-first rule and its full failure set **including `ACTION_REQUIRED`**:

  ```bash
  HEAD_SHA=$(git rev-parse HEAD)
  gh pr view "$PR_NUMBER" --json headRefOid,statusCheckRollup -q '
    .headRefOid as $h | .statusCheckRollup[]
    | (.status // "") as $st
    | { name: (.name // .context // ""), url: (.detailsUrl // .targetUrl // ""),
        state: (if $st == "" then (.state // "") elif $st == "COMPLETED" then (.conclusion // "") else "PENDING" end) }
    | select(.state == "FAILURE" or .state == "TIMED_OUT" or .state == "ERROR"
             or .state == "STARTUP_FAILURE" or .state == "ACTION_REQUIRED")
    | "\(.name)\t\(.url)\t\($h)"'
  ```

  Map a line only when its `$h` equals `$HEAD_SHA`. A mismatch is informational, on both platforms.

  Bitbucket: the pipelines read for `HEAD_SHA`, with `/finalise`'s HTTP-status-first rule (`BB_CODE` …; 403 → informational, never "no CI"). `FAILED`/`ERROR` results are failures, and `STOPPED` is undecided.
- **Base check, per failing check.** GitHub: `gh run list --branch "$BASE_NAME" --workflow "{the failing check's workflow}" --status completed --limit 1 --json conclusion,databaseId`. Bitbucket: the latest completed pipeline whose `target.ref_name` is the base. If it is a failure too → the check is **pre-existing**.
- **Mapping.**
  - Pre-existing → `recommendations.future` `{ finding: 'CI check {name} red on {sha} and on {base} ({head run}, {base run})', provenance: pre-existing }`.
  - Otherwise → `top_issues[]` `{ id: '{PREFIX}-CI-{n}', severity: medium, file: '{path named by the failing job, else the workflow file}', finding: 'CI check {name} failed on {sha} ({url}); green on {base}', suggested_action: 'reproduce locally and fix', status: open }`.
- Review Methodology gets one line: `CI on {sha}: {n} failed ({m} pre-existing) / {pending|cancelled|none|read failed|head mismatch}`.
- The step-5-6 *"CI and the QA loop"* paragraph says that QA reads CI once per cycle at Step 10 of `/qa-task` / `/qa-story` and never waits.

### Phase 3: Coverage findings to 5b

**Files to modify:**
- `develop-pipeline-step-5-6-qa-loop.md`: the *"#### Verdict branching"* `CONCERNS` row, and the heading and lead of *"#### Invoking `/qa-fix` on a REQUEST CHANGES verdict"*
- `skills/qa-fix/SKILL.md`: Step 1b (`:405`) and Step 2's priority ladder (`:467`)
- `develop-pipeline-resume-contract.md`: the 5c resume table (`:554`)
- `develop-pipeline-autonomous-defaults.md:34` (*"`CONCERNS` → record findings, do not block, exit to Step 7"*)
- the other restatements the sweep below returns

**Exact changes:**

- `CONCERNS` row: *"If the review's Machine-Readable Findings hold an **open** entry with `category: coverage` (one without `provenance: pre-existing`), take the REQUEST CHANGES arm. Otherwise record the findings …"* (the rest as today). review-pr emits no status field (`skills/review-pr/SKILL.md:781-795`), so `provenance: pre-existing` (`:692`) is the only exclusion.
- Rename the invocation heading to *"Invoking `/qa-fix` on a REQUEST CHANGES verdict, or a CONCERNS with an open coverage finding"*. Keep the prefix `#### Invoking \`/qa-fix\` on a REQUEST CHANGES verdict` byte-identical: `pr-review-loop-parity.test.mjs:739` locates the block by it.
- **The ingester alone is not enough.** `qa-findings-ingester-prompt.md:72`/`:77` carry `severity` as-is and drop `confidence`, so a `medium` coverage finding does enter `/qa-fix`'s Findings Summary. But qa-fix Step 2's ladder has no row for a non-high pr-review finding, and Step 1b treats only a `high` one as a HIGH top_issue. Add a Step 2 row after row 3, *"pr-review `coverage` findings, at any severity — each is a criterion the work item promised, and `/finalise`'s AC check fails it"*, and a matching Step 1b sentence. State both in the invocation section and cite the files.
- **Resume row split.** Replace the `APPROVE` or `CONCERNS` row with three rows:
  - one keyed on `APPROVE` → go to Step 7
  - one keyed on `CONCERNS` whose review holds an open coverage finding → set the counter to `N` and re-enter at **5b**, with the same action as the review-driven row (describe it in words; do not name `` `REQUEST CHANGES` `` in backticks in this key, because the parity test requires exactly one row keyed on each backticked value)
  - one keyed on any other `CONCERNS` → go to Step 7

  The states it must hold in: died after 5c wrote the row and before 5b started; died inside 5b; and 5b exited and incremented the counter (the next 5a's entry then selects).
- **Restatement sweep (SC-12).** Definition: lines in tracked `shared/resources/*.md` and `skills/*/SKILL.md`, excluding `skills/*/references/` and test fixtures, that mention `CONCERNS` and say it does not block or exits to Step 7. A git pathspec `*` crosses `/`, so exclude the fixtures explicitly. Command:
  `git grep -nE 'CONCERNS' -- 'shared/resources/*.md' 'skills/*/SKILL.md' ':!skills/*/references/*' ':!shared/resources/tests/*' | grep -iE 'do not block|non-blocking|proceed(s)? to Step 7|exit(s)? (the loop|to Step 7)'`.
  On 2026-10-28 it returned:
  - `develop-pipeline-autonomous-defaults.md:34`
  - `develop-pipeline-step-5-6-qa-loop.md:484` (the PR Review row's value list: no change needed, record it as an exclusion)
  - `develop-pipeline-step-5-6-qa-loop.md:1463`
  - `skills/develop-story/SKILL.md:252`
  - `skills/develop-task/SKILL.md:239`
  - `skills/review-pr/SKILL.md:1072`
  - `skills/qa-task/SKILL.md:2112`. This is the QA *gate* decision, not 5c, so leave it and record it as an exclusion.

  Also check every line holding `APPROVE or CONCERNS` (`git grep -nE 'APPROVE or CONCERNS' -- 'shared/resources/*.md' 'skills/*/SKILL.md'`). As of 2026-10-28 those are:
  - the lock-transition lines `skills/develop-task/SKILL.md:203` and `skills/develop-story/SKILL.md:214` (*"`5 → 7` when 5c returns APPROVE or CONCERNS"*), which need *"(a CONCERNS without an open coverage finding)"*
  - `develop-pipeline-step-5-6-qa-loop.md:2016`
  - `skills/finalise/SKILL.md:900`

  Re-run both commands at implementation time, because the count decays.

### Phase 4: Guards, bundle and record

- Tests per the task's § 8. Mutation-prove each one and record the mutation in the commit message.
- `npm run bundle`, then `npm run bundle:check`.
- CHANGELOG `[Unreleased]`: one entry citing task.238, with the four behaviours.

## Key Patterns and References

- `/finalise`'s rollup jq comment block explains the `conclusion: ""` trap. Do not write `.conclusion // .state`.
- qa-task Step 3b item 5b is the precedent for running a finding against the PR base.
- `evals/shared/tests/fast-gate-precondition.test.mjs` reads only the step-3 document (`LOOP_DOC`, line 56), not 5b step 0a. Put the 0a assertions in a new sibling, `qa-loop-fast-gate-outcomes.test.mjs`, built on `shared/resources/tests/lib/executed-prose.mjs` (`blockBy`).
- Tests that pin literals this task touches: `pr-review-loop-parity.test.mjs` `:739` (invocation heading prefix), `:749-772` (the CONCERNS row; rewrite it to carry the coverage condition), `:1412` (resume table, one row per value); `qa-loop-stage-before-gate.test.mjs:58` (0a's `<fastGateCommand> > "$FIX_LOG"`; keep it); `qa-re-review-scope-parity.test.mjs:1326` (0a's red-retry exit). Found with `git grep -nF '<literal>' -- '*.test.*'`.
- Edit sources, never bundled copies (memory: bundle reverts a fix applied only to `references/`).

## Testing Approach

- Extract fenced blocks with `shared/resources/tests/lib/executed-prose.mjs` (`blockBy`) or `qa-execute-snippets.mjs` (`extractBlocks`). Do not write a new regex.
- The CI mapping runs on JSON fixtures piped into the same jq (GitHub) and the same pipelines mapping (Bitbucket). No network.
- Control cases: a `consistency`-only `CONCERNS` (still proceeds), a `coverage` finding marked `provenance: pre-existing` (still proceeds), an `IN_PROGRESS` CheckRun with `conclusion: ""` (no finding), a CI failure green on base (a `top_issue`, the counterpart to the pre-existing case), and a green fast gate (no base worktree).
- Move the `.agents/skills` symlink aside before trusting a local green (memory: the gitignored symlink masks CI failures).
