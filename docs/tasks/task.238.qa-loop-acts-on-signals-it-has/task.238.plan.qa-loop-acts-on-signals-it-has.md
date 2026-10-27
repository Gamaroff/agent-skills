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
   | not measured | no `GATE_EXIT=` line in the log, or the process was killed or timed out | re-run once; never green, never red; no retry attempt consumed | `Fast gate: not measured ({reason})` |
   | pre-existing red | each failing test file also fails, run alone, in a worktree at the PR base | record both runs, then commit and push as on green | `Fast gate: red, pre-existing on {base} ({files}; head + base commands)` |
   | attributable red | anything else red | today's triage + 2-attempt bound | unchanged |

   The base check, in one block:

   ```bash
   BASE_REF="origin/$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo develop)"
   WT=".worktrees/base-check-${QA_CYCLE}"
   git worktree add --detach "$WT" "$BASE_REF" >/dev/null 2>&1 || { echo "BASE_CHECK=unavailable"; exit 0; }
   ( cd "$WT" && command node --test "{failing-file}" ) > "$FIX_LOG.base" 2>&1; BASE_EXIT=$?
   git worktree remove --force "$WT"
   echo "BASE_EXIT=$BASE_EXIT"
   ```

   `BASE_CHECK=unavailable` falls through to the attributable path, never to pre-existing. The failing file comes from the head log, never from recall. When the failing test is not a `node --test` file, run the failing command named in the log.

### Phase 2: CI read at 5a

**Files to modify:** `skills/qa-task/SKILL.md` (*"### PR Existence Check"*, Step 10's `top_issues` mapping, Step 11's *Review Methodology*), and the same three places in `skills/qa-story/SKILL.md`.

**Exact changes:**

- After `PR_NUMBER` is stored, read the head being judged and its CI state once. Reuse `/finalise`'s bucketing. Copy the jq from `skills/finalise/SKILL.md` (`CI_ROLLUP=$(gh pr view …`) per check, not aggregated, and keep its `.status`-first rule:

  ```bash
  gh pr view "$PR_NUMBER" --json headRefOid,statusCheckRollup -q '
    .headRefOid as $h | .statusCheckRollup[]
    | (.status // "") as $st
    | { name: (.name // .context // ""), url: (.detailsUrl // .targetUrl // ""),
        state: (if $st == "" then (.state // "") elif $st == "COMPLETED" then (.conclusion // "") else "PENDING" end) }
    | select(.state == "FAILURE" or .state == "TIMED_OUT" or .state == "ERROR" or .state == "STARTUP_FAILURE")
    | "\(.name)\t\(.url)\t\($h)"'
  ```

  Bitbucket: the pipelines read for the head SHA, with `/finalise`'s HTTP-status-first rule (`BB_CODE` …). Use `git rev-parse HEAD` as the head, and only map a result when the PR's head equals the local `HEAD`. A mismatch is informational.
- Each line becomes `top_issues[]` `{ id: '{PREFIX}-CI-{n}', severity: medium, file: '{path named by the failing job, else the workflow file}', finding: 'CI check {name} failed on {sha} ({url})', suggested_action: 'reproduce locally; if it fails identically on the PR base, record it as pre-existing (5b step 0a)', status: open }`.
- Review Methodology gets one line: `CI on {sha}: {n} failed / {pending|cancelled|none|read failed}`.
- The step-5-6 *"CI and the QA loop"* paragraph says that QA reads CI once per cycle at 5a (`/qa-task` / `/qa-story` PR Existence Check) and never waits.

### Phase 3: Coverage findings to 5b

**Files to modify:** `develop-pipeline-step-5-6-qa-loop.md` (*"#### Verdict branching"* `CONCERNS` row, *"#### Invoking `/qa-fix` on a REQUEST CHANGES verdict"* heading and lead), and `develop-pipeline-autonomous-defaults.md:34` (*"`CONCERNS` → record findings, do not block, exit to Step 7"*).

**Exact changes:**

- `CONCERNS` row: *"If the review's Machine-Readable Findings hold an entry with `category: coverage`, take the REQUEST CHANGES arm. Otherwise record the findings …"* (the rest as today).
- Rename the invocation heading to *"Invoking `/qa-fix` on a REQUEST CHANGES verdict, or a CONCERNS with a coverage finding"*.
- Ingester scope is already right: `qa-findings-ingester-prompt.md:72`/`:77` carry `severity` as-is and drop `confidence`, so a `medium` coverage finding enters `/qa-fix`'s queue. State this in one sentence and cite the file.
- **Restatement sweep (SC-12).** Definition: lines in tracked `shared/resources/*.md` and `skills/*/SKILL.md`, excluding `skills/*/references/`, that mention `CONCERNS` and say it does not block or exits to Step 7. Command:
  `git grep -nE 'CONCERNS' -- 'shared/resources/*.md' 'skills/*/SKILL.md' ':!skills/*/references/*' | grep -iE 'do not block|non-blocking|proceed(s)? to Step 7|exit(s)? (the loop|to Step 7)'`.
  On 2026-10-27 it returned `develop-pipeline-autonomous-defaults.md:34`, `develop-pipeline-step-5-6-qa-loop.md:1463` and `skills/qa-task/SKILL.md:2112`. The last is the QA *gate* decision, not 5c, so leave it and record it as an exclusion. Also check the lock-transition lines `skills/develop-task/SKILL.md:203` and `skills/develop-story/SKILL.md:214` (*"`5 → 7` when 5c returns APPROVE or CONCERNS"*). They need *"(a CONCERNS without a coverage finding)"*. Re-run the command at implementation time, because the count decays.

### Phase 4: Guards, bundle and record

- Tests per the task's § 8. Mutation-prove each one and record the mutation in the commit message.
- `npm run bundle`, then `npm run bundle:check`.
- CHANGELOG `[Unreleased]`: one entry citing task.238, with the four behaviours.

## Key Patterns and References

- `/finalise`'s rollup jq comment block explains the `conclusion: ""` trap. Do not write `.conclusion // .state`.
- qa-task Step 3b item 5b is the precedent for running a finding against the PR base.
- `evals/shared/tests/fast-gate-precondition.test.mjs` already parses the 0a block, so extend it rather than writing a second parser.
- Edit sources, never bundled copies (memory: bundle reverts a fix applied only to `references/`).

## Testing Approach

- Extract fenced blocks with the extractor the evals already use. Do not write a new regex.
- The CI mapping runs on JSON fixtures piped into the same jq. No network.
- Control cases: a `consistency`-only `CONCERNS` (still proceeds), and an `IN_PROGRESS` CheckRun with `conclusion: ""` (no finding).
- Move the `.agents/skills` symlink aside before trusting a local green (memory: the gitignored symlink masks CI failures).
