---
id: task.238
title: "QA loop acts on the signals it already has"
type: task
description: "Make the QA loop act on four signals it already holds and today ignores or destroys: a red CI result on the PR, a fast-gate red that is pre-existing or produced no result, a red gate log, and a 5c coverage finding that /finalise is certain to fail."
tags: [develop-task, develop-story, develop-bug, qa-task, qa-story, qa-fix, qa-loop, observation]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-27
updated: 2026-10-28
completed_date: 2026-10-28
assignee:
estimated_effort_hours: 13
github_issue: 768
pr_number: 770
---

# Technical Task: QA loop acts on the signals it already has

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.238.review.1.qa-loop-acts-on-signals-it-has.md` implemented 2026-10-28
**GitHub Issue**: [#768](https://github.com/Gamaroff/agent-skills/issues/768)

---

## 1. Overview

The QA loop (Steps 5–6) holds four signals that it ignores or destroys, and each one later costs a `/finalise` HALT or a wasted gate run. This task makes the loop act on each signal at the point where it first has it.

**Scope:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (5b step 0a and the 5c verdict table), the step-3 Output Capture Pattern and its restatements (`skills/develop/SKILL.md`, `test-failure-triage-prompt.md`), `develop-bug`'s verify loop (the same fast-gate block), `qa-task` and `qa-story` (a VCS-branched PR Existence Check and a one-time CI read), `qa-fix` (a priority row for coverage findings), the resume contract (the 5c `CONCERNS` row), their bundled copies, and the guards.

**Key deliverables:**

- **CI read at gate writing (obs #45).** `/qa-task` and `/qa-story` read the PR's CI result once, at Step 10, without waiting, on GitHub and Bitbucket. A completed failure on the head they judge becomes a gate finding, unless the same check is also red on the PR base. Then it is recorded as pre-existing.
- **Two outcomes for a red fast gate (obs #14).** 5b step 0a names *attributable red* and *not measured* (no exit code, or a killed or timed-out run). Each one has its own action. A red is never compared with the PR base: the *pre-existing red* outcome was deleted in QA cycle 6 (SC-2, amended; see Deferred Work).
- **Gated log cleanup (obs #41).** Every fast-gate block deletes its log only in a statement keyed on a zero exit, so the command that reads a red result cannot delete its log.
- **Coverage findings go back to 5b (obs #8).** On a 5c `CONCERNS` verdict, an open `category: coverage` finding sends the run back to 5b, like `REQUEST CHANGES`. `/qa-fix` has a priority row for it, and a resume re-enters 5b. Trail, consistency and scope findings stay non-blocking.

**Expected outcome:** a red CI lane, a criterion-coverage gap or an unattributable gate red is dealt with inside the QA loop. None of them first appears at `/finalise` after the loop's budget is spent.

---

## 2. Motivation

### Current Problems

- **A red CI result on the PR goes unread until `/finalise` (obs #45, recurred as #107).** The loop's own rule says to read CI's latest state "if it is to hand" (`develop-pipeline-step-5-6-qa-loop.md:1107`, *"CI runs in the background as free information"*). No step does it, though. On task.203 (2026-10-15), a `link-check` red on the migration commit outlived three QA cycles and a 5c review. On task.236 (2026-10-27), CI `test` was red on `7cb55772` (run 40463269272) while QA cycle 3 ran. A PASS 100/100 gate and a 5c APPROVE followed. `/finalise` found it both times, and each run paid for a HALT, a fix and a re-entry.
- **5b step 0a knows two outcomes, and a gate has three (obs #14).** The block (`develop-pipeline-step-5-6-qa-loop.md:1192`, *"0a. **Run the fast gate before committing.**"*) branches on `GATE_EXIT != 0` → triage and retry, at most 2 attempts. On task.178 (2026-10-12), `tests/bundle-missing-source.test.js` went red in cycles 1–3 on a load-sensitive budget, and it failed the same way on a clean `origin/develop`. The step has no branch for that, so the orchestrator invented a base-worktree check. Cycle 5's gate was killed by the host, which is a third state the step does not name either.
- **The red log is deleted by the command that reads it (obs #41).** Cleanup is a prose rule placed after the read: *"Cleanup mirrors step 3: `GATE_EXIT == 0` → `rm -f "$FIX_LOG"`"* (`develop-pipeline-step-5-6-qa-loop.md:1236`; step 3: `develop-pipeline-step-3-develop-loop.md:267`; develop-bug: `develop-bug-step-5-6-verify-loop.md:229`). On task.202 (2026-10-15), an agent batched `grep … $FIX_LOG; …; rm -f "$FIX_LOG"`. The log of a red gate was gone, and a second ~4-minute `ci:fast` run used up the 2-attempt bound just to name the failure.
- **5c `CONCERNS` passes forward a gap `/finalise` will fail (obs #8).** The verdict table routes `CONCERNS` to "Record the findings … **Do not block.** … proceed to Step 7" (`develop-pipeline-step-5-6-qa-loop.md:1463`). On task.201 (2026-10-11) and task.184 (2026-10-13), a `category: coverage` finding named a criterion the change did not meet. `/finalise`'s AC agent then failed that criterion, after a full four-agent DoD pass.

### Benefits

- Each of the four signals is acted on at the cheapest point that has it. Today the same work happens later, as a HALT plus a re-entry.
- A gate that did not run is never read as green or red.
- A red log always survives until something has read it.
- An autonomous `/develop-next` run spends its QA budget on gaps `/finalise` would block on, and does not halt at Step 7 on them.

---

## 3. Technical Background

### Current Architecture

- **CI in the QA loop.** `develop-pipeline-step-5-6-qa-loop.md:1107` *"**CI and the QA loop — no cycle waits on CI.**"* says CI is free information. `/finalise` holds the only reader: `skills/finalise/SKILL.md:943` (`CI_ROLLUP=$(gh pr view "$PR_NUMBER" --json statusCheckRollup …`). It buckets CheckRun `.status`/`.conclusion` and StatusContext `.state`, and it treats `CANCELLED` as undecided. Bitbucket uses the pipelines endpoint at `skills/finalise/SKILL.md:982`. `qa-task`'s *PR Existence Check* (`skills/qa-task/SKILL.md:119`) already reads `gh pr view --json url,state,title,number` (`:128`). `qa-story`'s is at `skills/qa-story/SKILL.md:148`. Both are an unconditional `gh pr view`, so on a Bitbucket remote each skill HALTs there today. The Bitbucket coordinates and credential (`BB_WORKSPACE`, `BB_REPO`, `bitbucket-auth.sh`) are resolved only at Step 14 (`skills/qa-task/SKILL.md:1673`, `skills/qa-story/SKILL.md:2204`). A `grep -n statusCheckRollup` over both QA skills returns nothing.
- **Timing.** 5a starts as soon as 5b pushes. On task.237 a QA review took about 5 minutes (cycle-2 fix commit 18:36:55, cycle-3 gate 18:41:46; `git log --format='%ad %s' 49a69f42^2`). CI's `Test` lane took about 5 minutes (20:30:11→20:35:00; `gh run list --limit 8`). A read at the start of `/qa-task` therefore sees the slow lanes as pending.
- **`/qa-fix`'s priority ladder.** Step 2 (`skills/qa-fix/SKILL.md:467`) has rows for bug reports by severity and for **High** `top_issues` only. Step 1b treats a `high` pr-review finding as a HIGH top_issue (`:405`). A `medium` or `low` pr-review finding has no row.
- **Resume.** `develop-pipeline-resume-contract.md:554` maps a `**PR Review**` row reading `APPROVE` or `CONCERNS` to "5c cleared — go to Step 7".
- **Gate findings.** A gate's `top_issues[]` entry takes `id`, `severity`, `file` (required), `finding`, `suggested_action`, `suggested_owner` and `status` (`skills/qa-task/SKILL.md`, the `top_issues: []` schema in Step 10).
- **The fast gate.** 5b step 0a is at `develop-pipeline-step-5-6-qa-loop.md:1192`. Its block sets `FIX_LOG=".claude/state/qa-fix-gate-${QA_CYCLE}-$(date +%s).log"` and `GATE_EXIT=$?`. A background variant appends `echo "GATE_EXIT=$?"` to the log. The 2-attempt bound and "commit the attempt without pushing" follow. `develop-bug-step-5-6-verify-loop.md:194` is a skill-owned copy of the same block (`bug-fix-gate-{N}`), not a bundled one. The step-3 *Output Capture Pattern* (`develop-pipeline-step-3-develop-loop.md:242`) uses `TEST_LOG`/`TEST_EXIT`.
- **The precedent for "pre-existing".** `qa-task` Step 3b item 5b runs a `category: bug` finding against the PR **base** before it raises the finding. `review-pr` does the same (`skills/review-pr/SKILL.md:688`).
- **5c verdict routing.** The table is at `develop-pipeline-step-5-6-qa-loop.md:1458` (*"#### Verdict branching"*). `REQUEST CHANGES` returns to 5b and passes `pr_review=` to `/qa-fix` (*"#### Invoking `/qa-fix` on a REQUEST CHANGES verdict"*, `:1672`). The review's YAML carries `category: {coverage|scope|trail|consistency …}` and a free-form `ref` (`skills/review-pr/SKILL.md:787`).

### Target Architecture

- **PR Existence Check, VCS-branched.** Each QA skill sources `resolve-platform.sh` (guarded, `|| exit 1`) at the PR Existence Check and branches on `VCS`. GitHub keeps `gh pr view`. Bitbucket finds the open PR for the current branch through the REST API (`pullrequests?q=source.branch.name="…" AND state="OPEN"`), with `bitbucket-auth.sh` sourced there and the same `BB_WORKSPACE`/`BB_REPO` derivation Step 14 uses. Step 14 then reuses those values instead of deriving them again.
- **CI read (obs #45).** At Step 10, just before the gate is composed, each QA skill reads the CI state of the head it judges, once and without polling. It maps a result only when the PR's head equals `git rev-parse HEAD`, on both platforms. It reuses `/finalise`'s bucketing rules **exactly**, including `ACTION_REQUIRED` as a failure and `CANCELLED` as undecided. For each check that has **completed with a failure**, it then reads the latest completed run of the **same check on the PR base branch**:
  - **Red on base too** → a `recommendations.future` entry marked `provenance: pre-existing`, naming both runs. It is not a `top_issue`, so it never reaches 5b with nothing to fix.
  - **Green on base, or no base run** → a `top_issues[]` entry: `severity: medium`, `file:` the path the failing job names or the workflow file, and a `finding` naming the check and run id.

  `PENDING`, `CANCELLED`, `NONE`, a read error or a head mismatch is recorded in the QA report's Review Methodology as informational, and the gate is unchanged. On Bitbucket it uses the pipelines endpoint with `/finalise`'s HTTP-status-first rule, and the base read is the latest completed pipeline whose target branch is the base. The loop's "no cycle waits on CI" rule stands, because this is a read, not a wait.
- **Three outcomes (obs #14).** 5b step 0a classifies the gate before it triages:
  1. **Not measured.** No `GATE_EXIT=` line (background form), or a foreground exit of 124 (timeout), 137 (SIGKILL) or 143 (SIGTERM). Record "not measured" in the QA Iteration History. Re-run once. It never counts as green and never as red, and it does not consume a retry attempt.
  2. **Pre-existing red.** Run each failing test file alone in a worktree at the PR base. It is pre-existing only when the **same tests fail** there: the failing test names or assertions in the base log match those in the head log. Record both measurements (red head, red base, the commands) and proceed to commit and push as on green. This mirrors qa-task Step 3b item 5b. A base run that fails with no matching test failure (module not found, command not found, a missing `.agents/skills`) is `BASE_CHECK=unavailable`.
  3. **Attributable red.** Today's triage-and-retry path, unchanged. `BASE_CHECK=unavailable` always lands here, never on pre-existing.
- **Gated cleanup (obs #41).** Every block that captures a gate or test log ends with one statement: `grep -q '^GATE_EXIT=0$' "$FIX_LOG" && rm -f "$FIX_LOG"`, or `[ "$GATE_EXIT" -eq 0 ] && rm -f "$FIX_LOG"` for the foreground form. The prose "cleanup mirrors step 3" line goes. A note says that reading and cleanup are separate decisions. **Site list**, from `git grep -nE '[A-Z_]+_LOG="?\.claude/state' -- 'shared/resources/*.md' 'skills/*/SKILL.md' 'skills/develop-bug/references/*.md'` together with `git grep -nE 'rm -f "\$[A-Z_]*LOG"'` over the same paths:
  - `develop-pipeline-step-5-6-qa-loop.md` (0a, `FIX_LOG`)
  - `develop-pipeline-step-3-develop-loop.md` (`TEST_LOG`)
  - `develop-bug-step-5-6-verify-loop.md` (0a, `FIX_LOG`)
  - `skills/develop/SKILL.md:624`/`:641` (its own `TEST_LOG` block)
  - `test-failure-triage-prompt.md:79` (a restated rule: reword it to the gated form)

  Exclusion: `RB_LOG` (`develop-pipeline-step-5-6-qa-loop.md:461`) is never removed, so there is no cleanup to gate.
- **Coverage → 5b (obs #8).** The `CONCERNS` row gains one condition: when the review's Machine-Readable Findings hold an **open** `category: coverage` entry, take the `REQUEST CHANGES` arm. *Open* means an entry without `provenance: pre-existing`. review-pr emits no status field (`skills/review-pr/SKILL.md:781-795`), and `provenance: pre-existing` is its only exclusion marker (`:692`). The arm brings the same Remaining Work Status block, the same `/qa-fix` invocation with `pr_review=` and the same cycle accounting. Otherwise behave as today. Two consumers change with it:
  - **`/qa-fix` Step 2** gains a row, placed after the High `top_issues` row: *pr-review `coverage` findings, at any severity, each one a criterion the work item promised*. Step 1b says the same.
  - **The resume contract's** `APPROVE` or `CONCERNS` row splits. `CONCERNS` whose review holds an open coverage finding → set the counter to `N` and re-enter at **5b**, the same as the `REQUEST CHANGES` row. Any other `CONCERNS`, or `APPROVE` → Step 7. The states the rule must hold in: the run died after 5c wrote the row but before 5b started; it died inside 5b; and 5b exited and incremented the counter (the next 5a then owns the entry, so the row no longer selects).

### Important Clarifications

- **Why every coverage finding, and not only the ones that "name a criterion".** Obs #8 asks for coverage findings "whose `ref` or text names a work-item criterion". But the `ref` is free-form. Measured over the 38 tracked `docs/tasks/*/*.pr-review.*.md` reports that carry `category: coverage` (`grep -h -A3 'category: coverage' … | grep 'ref:'`), the refs read `"Success Criteria 6"`, `"task.129 §8 Integration Tests"`, `"…md:129"` and so on. Not one uses an `AC-n`/`SC-n` id. A classifier over that text would be a guess. A coverage finding is, by `review-pr`'s definition, a gap between the PR and what its work item promised. That is exactly what `/finalise`'s AC agent checks. So the rule keys on `category: coverage` alone. The user chose "route to 5b" on 2026-10-27.
- **`APPROVE` is not changed.** An `APPROVE` carries only `severity: low` findings (`review-pr`'s verdict table, `skills/review-pr/SKILL.md:701`). Since task.237 its doc-only findings are carried, and nothing else changes here.
- **The CI finding's severity is `medium`, not `high`.** A `high` would trip the third-strike detector and the convergence check on a lane the fixer may not own, such as a flaky one. `medium` makes the gate `CONCERNS` (`skills/qa-task/SKILL.md:1258`) and puts the red into 5b's queue.
- **Why the base check happens in QA, not in 5b.** 5b step 0a classifies the local fast gate, not a CI lane, and it is reached only when step 0 found changes (`develop-pipeline-step-5-6-qa-loop.md:1192`). A CI finding that is red on base gives `/qa-fix` nothing to change, so 5b step 0's no-change HALT would fire first. Checking the base before the finding is raised keeps such a lane out of the queue altogether. The user chose this on 2026-10-28.
- **Why the read is at Step 10, not at the PR Existence Check.** Measured above (§ Current Architecture, *Timing*): the start of a cycle is roughly when the slow lanes begin. Step 10 is the latest point at which a read can still change the gate. The user chose this on 2026-10-28.
- **Migration dead-link dry-run warning** (obs #45, second half) is out of scope (see § 4).

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b step 0a (three outcomes, gated cleanup), the 5c verdict table and its carry prose (coverage → 5b), and the "CI and the QA loop" paragraph (it names the 5a read).
✅ `shared/resources/develop-pipeline-step-3-develop-loop.md`: the Output Capture Pattern's gated cleanup.
✅ `skills/develop/SKILL.md` (its `TEST_LOG` block) and `shared/resources/test-failure-triage-prompt.md` (the restated cleanup rule): gated cleanup.
✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: the same 0a block (three outcomes, gated cleanup).
✅ `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`: a VCS-branched PR Existence Check, the one-time CI read at Step 10 with its base check, and its mapping to `top_issues[]` or `recommendations.future`, on GitHub and Bitbucket.
✅ `skills/qa-fix/SKILL.md`: a Step 2 priority row (and a Step 1b sentence) for pr-review coverage findings at any severity.
✅ `shared/resources/develop-pipeline-resume-contract.md`: the `APPROVE` or `CONCERNS` resume row splits on an open coverage finding.
✅ The bundled copies (`npm run bundle`), the CHANGELOG `[Unreleased]` entry, and the guards in § 8.

### Out of Scope

❌ **Waiting on CI inside the loop.** The cost rule at `:1113` stands.
❌ **Changing `/finalise`'s CI gate.** CI reading 1 is still the acceptance decision.
❌ **A criterion classifier over `ref` text.** See § 3 Clarifications.
❌ **The migration engine's dead-link dry-run warning** (obs #45, second half). That is a different skill, and a different decision.
❌ **Escalation, grant and convergence wording.** That is task.239.

---

## 5. Breaking Changes

None to an API. Three behaviours change for a pipeline run:

1. **A 5c `CONCERNS` with an open coverage finding now uses one more QA cycle**, where today it proceeds to Step 7. Migration: none. The cycle is bounded by the same 5-cycle budget as `REQUEST CHANGES`.
2. **A QA gate can now be `CONCERNS` because a CI lane is red** on the judged head and not on the base. Migration: none. That red used to surface at `/finalise` as a HALT.
3. **`/qa-task` and `/qa-story` now run on a Bitbucket remote** past the PR Existence Check, where today they HALT. Migration: none. A Bitbucket consumer needs the credential Step 14 already uses, and a token without `read:pipeline:bitbucket` reads CI as informational.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.238.plan.qa-loop-acts-on-signals-it-has.md](task.238.plan.qa-loop-acts-on-signals-it-has.md)

### Phase 1: Fast-gate outcomes and gated cleanup (Risk: Medium)

The pre-existing branch lets a red gate commit and push, so it widens what the gate treats as safe. Its **differential oracle** is the set of shapes it must still refuse, each landing on the attributable path:
- a base run where a *different* test fails
- a base run that fails with module-not-found or command-not-found (no `node_modules` in the worktree)
- a base run that fails for want of `.agents/skills`
- a base worktree that cannot be created

**Files:** `develop-pipeline-step-5-6-qa-loop.md` (5b step 0a), `develop-pipeline-step-3-develop-loop.md` (Output Capture Pattern), `skills/develop/SKILL.md` (its `TEST_LOG` block), `test-failure-triage-prompt.md` (Log Cleanup Rule), `develop-bug-step-5-6-verify-loop.md` (its 0a)

- [x] Replace each "cleanup mirrors" prose line with a one-statement gated cleanup inside the block, for the foreground and background forms, at every site in § 3's site list
- [x] Add the red-gate classification to 5b step 0a: not measured (no `GATE_EXIT=` line, or exit 124/137/143) and attributable red. *(Amended 2026-10-28: the pre-existing red outcome and its `BASE_CHECK=unavailable` handling were deleted in QA cycle 6, per SC-2.)*
- [x] Apply the same to develop-bug's verify-loop 0a
- [x] Record each outcome's QA Iteration History wording

**Dependencies:** none

### Phase 2: PR Existence Check and CI read at Step 10 (Risk: Medium)

**Files:** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `develop-pipeline-step-5-6-qa-loop.md` (the CI paragraph)

- [x] Branch each PR Existence Check on `VCS` (guarded `resolve-platform.sh`). Add the Bitbucket open-PR lookup with `bitbucket-auth.sh`, and have Step 14 reuse the values (implemented as a re-derivation: each fenced block runs in its own shell, so a variable cannot carry from the check to Step 13 — see the implementation report's Step 3 decisions)
- [x] Add a one-time CI read at Step 10 for GitHub and Bitbucket, using `/finalise`'s bucketing rules exactly (including `ACTION_REQUIRED`), and map only when the PR head equals `git rev-parse HEAD`
- [x] For each completed failing check, read the same check's latest completed run on the PR base. Red there → `recommendations.future` with `provenance: pre-existing`; otherwise → a `top_issues[]` entry (`severity: medium`). Record undecided states in Review Methodology
- [x] Reword the loop's "CI and the QA loop" paragraph to name the Step 10 read, and keep "no cycle waits"

**Dependencies:** none

### Phase 3: Coverage findings to 5b (Risk: Medium)

**Files:** `develop-pipeline-step-5-6-qa-loop.md` (Verdict branching, carry prose, the REQUEST CHANGES invocation heading), `skills/qa-fix/SKILL.md` (Step 1b, Step 2), `develop-pipeline-resume-contract.md` (the 5c resume table), and the restatements the plan's sweep finds

- [x] Add the open-coverage condition to the `CONCERNS` row, and route it through the `REQUEST CHANGES` arm
- [x] Add `/qa-fix`'s Step 2 row for pr-review coverage findings at any severity, and the matching Step 1b sentence. State in the invocation section that the ingester already carries `severity` as-is (`qa-findings-ingester-prompt.md:72`) — and the ingester now carries `category` too, which it used to drop (without it the new row was unreachable)
- [x] Split the resume contract's `APPROVE` or `CONCERNS` row, covering the three states named in § 3
- [x] Update the restatements that say `CONCERNS` always proceeds (see the plan's grep)

**Dependencies:** none

### Phase 4: Guards, bundle and record (Risk: Low)

- [x] Tests in § 8, each one mutation-proved
- [x] `npm run bundle`; CHANGELOG `[Unreleased]`

**Dependencies:** Phases 1–3

---

## 7. Files Summary

### Files to Create

- ✅ `shared/resources/fast-gate-outcome.sh`: the three-outcome classifier that 5b step 0a and develop-bug's step 3a call
- ✅ `shared/resources/qa-ci-read.sh`: the one-time CI read at the qa-task and qa-story gate step
- ✅ `shared/resources/tests/qa-ci-read.test.mjs`: its tests

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b step 0a, the CI paragraph, Verdict branching, and the REQUEST CHANGES invocation
2. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md`: Output Capture Pattern
3. ✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: its 0a block (skill-owned, not bundled)
4. ✅ `skills/qa-task/SKILL.md`: PR Existence Check (VCS branch), the Step 10 CI read and mapping, the Step 11 Review Methodology line, and Step 14's reuse of the Bitbucket values
5. ✅ `skills/qa-story/SKILL.md`: the same four places
6. ✅ `skills/qa-fix/SKILL.md`: Step 1b sentence and Step 2 priority row
7. ✅ `shared/resources/develop-pipeline-resume-contract.md`: the 5c resume row
8. ✅ `skills/develop/SKILL.md`: its `TEST_LOG` gated cleanup
9. ✅ `shared/resources/test-failure-triage-prompt.md`: the Log Cleanup Rule
10. ✅ The restatements the plan's SC-12 sweep returns (as of 2026-10-28: `develop-pipeline-autonomous-defaults.md:34`, `skills/develop-task/SKILL.md:203`/`:239`, `skills/develop-story/SKILL.md:214`/`:252`, `skills/review-pr/SKILL.md:1072`)

### Files to Modify (Generated — `npm run bundle`)

11. ✅ Every `skills/*/references/` copy of the `shared/resources/` files above. `npm run bundle` lists them, so do not hand-edit any

### Files to Modify (Tests)

12. ✅ A new `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`: the gated-cleanup and three-outcome assertions. It uses the existing extractor (`shared/resources/tests/lib/executed-prose.mjs` `blockBy`, or `qa-execute-snippets.mjs` `extractBlocks`). `fast-gate-precondition.test.mjs` reads only the step-3 document, so it is not the place for these
13. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs`: rewrite the test "APPROVE and CONCERNS exit the loop, and CONCERNS does not block" (`:750`, regexes at `:763`/`:768`) so it carries the coverage condition and its control case, and extend `:739` to the renamed heading. This replaces a new `qa-loop-coverage-to-5b.test.mjs`
14. ✅ `skills/qa-task/tests/qa-task.test.js` and `skills/qa-story/tests/qa-story.test.js`: the CI-read mapping on GitHub rollup and Bitbucket pipelines fixtures, plus the PR Existence Check's VCS branch
15. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs` test "the 5c resume check reads the report, not the filesystem" (`:1412`): it parses the resume table by row key and requires **exactly one** row keyed on each backticked value (`:1516-1527`). Split the rows into one keyed on `APPROVE` and two keyed on `CONCERNS` (with and without an open coverage finding), and add the split to the test. The new row's key must not name `` `REQUEST CHANGES` `` in backticks, or that value's one-row assertion fails. Cover the three states named in § 3
16. ✅ Keep green without edits, and re-run: `shared/resources/tests/qa-loop-stage-before-gate.test.mjs:58` (locates 0a by `<fastGateCommand> > "$FIX_LOG"`; keep the literal) and `evals/shared/tests/qa-re-review-scope-parity.test.mjs:1326` (pins 0a's red-retry exit)

### Files to Modify (Documentation)

17. ✅ `CHANGELOG.md` `[Unreleased]`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Gated cleanup.** For every fenced block in files 1–3 that writes a `*_LOG` and an `*_EXIT`, assert that the block holds one `rm -f "$…_LOG"` and that it is joined by `&&` to a zero-exit test in the same statement. Execute the block on a fake gate that exits 1, and assert the log survives. Run it again with exit 0 and assert the log is gone. Mutation: restore the unconditional `rm -f` and the test goes red.
- **CI-read mapping (GitHub).** Feed the bucketing jq these fixtures: a COMPLETED/FAILURE CheckRun, a COMPLETED/ACTION_REQUIRED CheckRun, an IN_PROGRESS CheckRun with `conclusion: ""`, a CANCELLED run, a StatusContext `state: FAILURE`, an empty rollup, and a rollup whose `headRefOid` differs from the local `HEAD`. Assert one finding for each completed failure (including ACTION_REQUIRED) and none for the other cases. The `conclusion: ""` case must not map to green or red (the `/finalise` trap at `skills/finalise/SKILL.md:924-935`). The head-mismatch case maps nothing.
- **Base check.** A completed failure whose same-named check is red on the base → one `recommendations.future` entry with `provenance: pre-existing` and no `top_issues` entry. The same failure green on base, or with no base run → one `top_issues` entry. That second case is the control.
- **CI-read mapping (Bitbucket).** Feed pipelines fixtures through the same mapping: `FAILED` for the head SHA → a finding; `IN_PROGRESS` → none; `STOPPED` → none (undecided); HTTP 403 → informational, never "no CI".
- **PR Existence Check.** With `VCS=bitbucket`, the check takes the REST branch and never calls `gh pr view`. With `VCS=github`, the reverse.
- **Coverage condition.** Read the routing rule off the table row. Assert that `CONCERNS` plus an open `coverage` finding → 5b; `CONCERNS` plus a `coverage` finding marked `provenance: pre-existing` → Step 7; `CONCERNS` plus only `trail`/`scope`/`consistency` → Step 7; and `APPROVE` → Step 7.
- **Resume.** The resume table has one row keyed on `APPROVE`, one on `CONCERNS` with an open coverage finding (→ 5b) and one on any other `CONCERNS` (→ Step 7).

### Integration Tests

- Execute the 5b step 0a block (via the existing extractor, `shared/resources/tests/lib/executed-prose.mjs`) against these fake gates:
  - a red whose same test is red at base → attributable, and nothing runs at the base *(amended in QA cycle 6: was pre-existing)*
  - the log shapes QA cycles 4–6 found the old comparison misreading (bug.6, bug.11, bug.13, bug.14) → attributable
  - a killed process with no `GATE_EXIT=` line, and a foreground exit of 137 → not measured
  - **SC-6:** a green gate → one gate run, no worktree created

  Assert the recorded outcome for each.

### Performance Tests

- N/A as a timing test. The CI read is one or two API calls per QA cycle, and SC-6's integration case holds the "base run only on red" bound.

### Consumer Tests

- `npm run ci:fast` green, `npm run bundle:check` clean.
- **Control case (obs #176).** The coverage test also includes a `CONCERNS` review whose only open finding is `category: consistency` with `severity: medium`, and it must still proceed to Step 7.

---

## 9. Success Criteria

### Functional

- [ ] SC-1: Executing each fast-gate block in files 1–3 with a gate that exits non-zero leaves its log file on disk. With exit 0, the log is removed (test in § 8, red on today's blocks)
- [ ] SC-2: 5b step 0a states two outcomes for a red gate (not measured, attributable red), each with its action and QA Iteration History wording. A red is never compared with the PR base: a red that is also red at the base reads attributable and runs nothing a second time. The integration test in § 8 records each outcome. *(Amended 2026-10-28, QA cycle 6: the `pre-existing red` outcome was deleted at the third strike on `fast-gate-outcome.sh`; see Deferred Work.)*
- [ ] SC-3: `/qa-task` and `/qa-story` each read the PR's CI state once per cycle, at Step 10, without waiting, on GitHub and on Bitbucket, and only for a PR head equal to the local `HEAD`. A completed failing check that is green (or absent) on the PR base becomes a `severity: medium` `top_issues[]` entry. One that is also red on the base becomes a `recommendations.future` entry with `provenance: pre-existing`. An undecided state changes nothing in the gate (unit tests in § 8, GitHub and Bitbucket fixtures)
- [ ] SC-3a: On `VCS=bitbucket`, the PR Existence Check finds the open PR through the REST API and never calls `gh pr view`. On `VCS=github` it is unchanged (unit test in § 8)
- [ ] SC-4: The 5c verdict table routes a `CONCERNS` verdict with an open `category: coverage` finding (one without `provenance: pre-existing`) to 5b through the `REQUEST CHANGES` arm. A `CONCERNS` verdict without one proceeds to Step 7 as today (`pr-review-loop-parity.test.mjs`, including the control case)
- [ ] SC-4a: `/qa-fix` Step 2 has a priority row for pr-review `coverage` findings at any severity (`pr-review-loop-parity.test.mjs` or a qa-fix test asserts the row exists, read off the ladder)
- [ ] SC-4b: The resume contract re-enters 5b for a `CONCERNS` entry whose review holds an open coverage finding, and goes to Step 7 for any other `CONCERNS` (`pr-review-loop-parity.test.mjs` `:1412`, extended)

### Performance

- [ ] SC-5: The QA loop still adds no CI wait. The CI-read blocks added to `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` contain no `sleep`, `--watch` or `until` (a documentation criterion: file F does not say S)
- [ ] SC-6: Classifying a gate never runs anything a second time. A green gate runs the gate once and creates no worktree (integration test in § 8, the green-gate case). *(Amended 2026-10-28, QA cycle 6: there is no base-worktree run left to bound.)*

### Code Quality

- [ ] SC-7: `npm run ci:fast` passes
- [ ] SC-8: `npm run bundle:check` passes. No hand edit under `skills/*/references/` for a file with a `shared/resources/` source
- [ ] SC-9: `npm run validate -- skills/qa-task/`, `skills/qa-story/`, `skills/qa-fix/`, `skills/develop/` and `skills/develop-bug/` pass
- [ ] SC-10: Every new guard is mutation-proved: reverting the behaviour turns the test red, and the commit message records it

### Migration

- [ ] SC-11: The CHANGELOG `[Unreleased]` entry cites task.238 and names all four behaviour changes
- [ ] SC-12: Every restatement that says a 5c `CONCERNS` always proceeds to Step 7 is updated. The plan's grep for that wording returns no stale hit

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A flaky CI lane turns a clean QA gate into `CONCERNS`.**
   - Probability: Medium. Impact: one extra cycle.
   - Mitigation: `severity: medium`, so the third-strike and convergence guards are not touched. A lane that is also red on the PR base is recorded as pre-existing at Step 10 and never enters the queue.
   - Rollback: revert Phase 2 alone.
2. **The coverage route costs cycles on findings `/finalise` would not have failed.**
   - Probability: Low to Medium. Impact: a cycle spent on a real promise gap.
   - Mitigation: the route is bounded by the 5-cycle budget, and a coverage finding is a promise the work item made.
   - Rollback: revert Phase 3 alone.
3. **`/qa-fix` changes nothing for a `medium` or `low` coverage finding**, because its Step 2 ladder has no row for one, and 5b step 0's no-change HALT fires.
   - Mitigation: Phase 3 adds the row (SC-4a). The ingester already carries `severity` as-is.
4. **The pre-existing branch pushes a red tree it should have refused** (Phase 1). It widens what the gate treats as safe.
   - Probability: Medium without the oracle: a fresh worktree has no `node_modules` or `.agents/skills`, so a base run fails for environmental reasons.
   - Mitigation: pre-existing requires the same failing tests on both sides. An environmental base failure is `BASE_CHECK=unavailable` → attributable. The differential oracle in Phase 1 is tested shape by shape.
   - Rollback: revert Phase 1 alone.
   - *(Moot since 2026-10-28, QA cycle 6: the pre-existing branch was deleted; see SC-2 and Deferred Work.)*
5. **A resume after a coverage `CONCERNS` skips the fix.**
   - Mitigation: the resume row split (SC-4b), tested in the resume-table guard.

### Low Risk Areas

1. **A base worktree for the pre-existing check collides with the checkout's** `.agents/skills` move-aside.
   - Mitigation: create the worktree under `.worktrees/` and remove it in the same block. The plan names the command.
   - *(Moot since 2026-10-28, QA cycle 6: no base worktree is created any more; see SC-6.)*

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a QA loop that HALTs or loops on a CI read, or a coverage route that sends an APPROVE to 5b.
- **Steps:** `git revert` the task's merge commit; `npm run bundle`; `npm run ci:fast`.
- **Validation:** `bundle:check` is clean, and the step-5-6 doc matches `develop` before the merge.

### Partial Rollback (1-2 hours)

- The four phases touch separate sections. Revert one phase's commit and re-bundle.

### Forward Fix (< 4 hours)

- A wrong bucket in the CI read, or a missed restatement, is fixed forward with a test.

### Rollback Triggers

- **Critical:** the loop deletes a red log, or a killed gate reads as green.
- **Non-critical:** wording drift in a restatement.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-28
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.238.qa.10.qa-loop-acts-on-signals-it-has.md](./task.238.qa.10.qa-loop-acts-on-signals-it-has.md)
- **Gate File**: [task.238.gate.10.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.10.qa-loop-acts-on-signals-it-has.yml)

### Test Coverage Summary
- **Tests Executed**: 6535
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- The cycle 9 fix holds: bug.18 and bug.19 are closed, and each of its three guards is mutation-proved. No top issue is open
- One low gap remains in the §5c open-coverage check and is reproduced: a repeated `findings:` key with a cut-short second list reads `0` (CR10-1). By owner decision it is deferred to task.240, which replaces the awk

## Definition of Done - Gaps Identified — run 1 (historical, superseded)

**Status:** IN PROGRESS (run 1 only; superseded by DoD run 2, below)

> **Superseded (2026-10-28).** These are DoD run 1's gaps, against gate 3. All five were fixed in
> `adff39e2`, and QA cycles 4–10 have run since. DoD run 2 verified every criterion again and accepted.

### QA Gate Status

**QA Report**: `task.238.qa.3.qa-loop-acts-on-signals-it-has.md`
**Gate File**: `task.238.gate.3.qa-loop-acts-on-signals-it-has.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 90/100

The QA gate passed. The gaps below come from `/finalise`'s own checks: the security probe plan (28 cases executed) and a mutation run of the SC-10 guards.

### Missing Criteria:

1. **Security Review:**
   - ⚠️ (medium) `shared/resources/fast-gate-outcome.sh:99` refuses only an absolute failing-test path. A `test at ../../x.test.mjs` line in the gate log makes the base run execute the head checkout's copy, so a head-only red can be classed `pre-existing` and pushed
   - ⚠️ (medium) The same `../` escape through the reporter's `location: '…'` form (`fast-gate-outcome.sh:96`)
   - ⚠️ (low) The 5c open-coverage awk (`develop-pipeline-step-5-6-qa-loop.md:1547`) does not count a quoted `category: "coverage"`

2. **Acceptance Criteria:**
   - [ ] SC-10: `shared/resources/tests/qa-ci-read.test.mjs:397` "usage errors exit 2" stays green with the `--vcs` validation removed. It runs outside a git checkout, so every case also exits 2 at `git rev-parse`
   - [ ] SC-10: `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:632`'s `--exit abc` case stays green with the `--exit` number check removed, because it also exits 2 at the missing-log check

### Next Steps:

- [ ] Refuse any failing-test path with a `..` segment in `fast-gate-outcome.sh`; test both log forms (the DoD probe's `log-path-dotdot-*` fixtures), red on `8ac7ffef`
- [ ] Let the open-coverage awk accept an optionally quoted value; add the quoted case to the block test
- [ ] Assert each usage case's own stderr message in both tests, and mutation-prove them
- [ ] Record all SC-10 mutation proofs in the fix commit's message (nine are held already, listed in the DoD)
- [ ] Re-gate through QA, then re-run `/finalise`

**Estimated Effort:** Small (1–2 hours)

**Gap Report Generated:** 2026-10-28

**Detailed Verification Log:** See `task.238.dod.1.qa-loop-acts-on-signals-it-has.md` for complete verification evidence and timestamps.

## Deferred Work

- **Structured pre-existing comparison** (QA cycle 6, third strike on `fast-gate-outcome.sh`): the `pre-existing red` outcome was deleted rather than patched a fourth time. Gates 4, 5 and 6 each found another `node --test` log shape the comparison misread (bug.5–bug.14). A replacement must compare structured results from runs it controls (for example `--test-reporter=tap` written to a file on both sides, keyed on node's own test identity), not parse a gate log. Needs its own task document.
- **Gate 6 advisory items** carried to `recommendations.future`: CR6-2 (output before node's results), CR6-3 (`gh run list --event push`), CR6-4 (pre-existing decided per CI lane), CR6-5 (open-coverage awk on a truncated block), CR6-7 (Bitbucket PR lookup HTTP status). CR6-6 is moot: the code it named was deleted.
- **CR10-1, deferred to task.240** (QA cycle 10, owner decision 2026-10-28): the §5c open-coverage awk never clears `term`, so a block with a second `findings:` list cut short reads `0` where `unreadable` is correct. It is reproduced by `oc10-second-findings-cut-short`, and 0 of 185 tracked reports have the shape. task.240 (issue #771) replaces the awk with a parser that refuses a duplicate key. No success criterion states the reader's fail-closed property, so none is amended.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.238.qa.10.qa-loop-acts-on-signals-it-has.md`
**Gate File**: `task.238.gate.10.qa-loop-acts-on-signals-it-has.yml`
**Gate Status**: ⚠️ CONCERNS (no open entry; residue CR10-1 deferred to task.240)
**Quality Score**: 90/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 15/15 met (SC-1 to SC-12, SC-3a, SC-4a, SC-4b), each with code and per-PR test evidence
✅ **PR Review:** PR #770; 5c `/review-pr` APPROVE (`task.238.pr-review.4`); the host requires no review
✅ **CI:** SUCCESS on all 6 checks at `934ce5db` (reading 1)
✅ **Documentation:** CHANGELOG `[Unreleased]` cites task 238 with all four behaviours; SC-12 sweep clean
✅ **Security Review:** checklist PASS; probe 119 executed, 0 escaped, 1 reproduced, which is the owner-deferred CR10-1 (low, task.240)
✅ **Compliance Review:** not applicable (internal tooling)

**Task marked as ACCEPTED on:** 2026-10-28

**Detailed Verification Log:** See `task.238.dod.2.qa-loop-acts-on-signals-it-has.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-27 | 1.0 | Initial draft — cut from observations #8, #14, #41, #45 | create-task |
| 2026-10-28 | 1.1 | Review 1 (7/10, 14 Important, 0 Critical) — CI read moved to Step 10 with a base check; Bitbucket PR Existence Check added; qa-fix ladder row and resume-row split added; "open" coverage finding defined; pre-existing red requires the same failing tests, with a differential oracle (Phase 1 → Medium); jq gains ACTION_REQUIRED and a head-equality rule; test sites, cleanup sites and the SC-12 sweep refreshed; effort 8h → 13h | review-task |
| 2026-10-28 |  | Status → ready-for-development | review-task |
| 2026-10-28 |  | Implemented — 20 files (2 new scripts, 2 new test files), 77 new tests; status → ready-for-review | develop |
| 2026-10-28 |  | QA gate FAIL (70/100) — 3 findings (1 high, 2 medium); status → in-progress | qa-task |
| 2026-10-28 |  | QA findings fixed — gate 1 FAIL, 3 entries (bug.1–bug.3), 1 iteration; status → ready-for-review | qa-fix |
| 2026-10-28 |  | QA gate CONCERNS (80/100) — 1 finding (1 medium); bug.1–bug.3 closed | qa-task |
| 2026-10-28 |  | QA findings fixed — gate 2 CONCERNS, 1 entry (bug.4), 1 iteration; status stays ready-for-review | qa-fix |
| 2026-10-28 |  | QA gate PASS (90/100) — 0 findings; bug.4 closed | qa-task |
| 2026-10-28 |  | DoD incomplete — 5 gaps identified (security probe 2 medium + 1 low; SC-10 two unheld guards) | finalise |
| 2026-10-28 |  | QA gate FAIL (20/100) — 7 findings (3 high, 2 medium, 2 low); DoD 1 gaps verified fixed; status → in-progress | qa-task |
| 2026-10-28 |  | QA findings fixed — gate 4 FAIL, 7 entries (bug.5–bug.9, CR4-8, CR4-9; advisory CR-6 too), 1 iteration; status → ready-for-review | qa-fix |
| 2026-10-28 |  | QA gate FAIL (50/100) — 3 findings (2 high, 1 medium); bug.5–bug.9 verified and closed; status → in-progress | qa-task |
| 2026-10-28 |  | QA findings fixed — gate 5 FAIL, 3 entries (bug.10–bug.12), 1 iteration; status → ready-for-review | qa-fix |
| 2026-10-28 |  | QA gate FAIL (60/100) — 3 findings (2 high, 1 low); bug.10–bug.12 verified and closed; status → in-progress | qa-task |
| 2026-10-28 | 1.2 | QA findings fixed — gate 6 FAIL, 3 entries (bug.13, bug.14, CR6-6), 1 iteration; third strike on `fast-gate-outcome.sh`: `pre-existing red` deleted, SC-2 and SC-6 amended, structured comparison deferred; status → ready-for-review | qa-fix |
| 2026-10-28 |  | QA gate CONCERNS (80/100) — 3 findings (2 medium, 1 low); bug.13–bug.14 verified and closed | qa-task |
| 2026-10-28 |  | QA findings fixed — gate 7 CONCERNS, 3 entries (bug.15, bug.16, PRB7-1) plus cleanup CR7-5, 1 iteration; the §5c open-coverage check now reads an allow-list of line shapes; the wrapper's signal sentence counts only after node's summary | qa-fix |
| 2026-10-28 |  | QA gate CONCERNS (80/100) — 1 finding (1 medium); bug.15–bug.16 verified and closed | qa-task |
| 2026-10-28 |  | QA findings fixed — gate 8 CONCERNS, 1 entry (bug.17), 1 iteration; the §5c open-coverage check now allow-lists values as well as lines (review-pr's six category tokens; a continued, repeated or commented value reads `unreadable`) | qa-fix |
| 2026-10-28 |  | QA gate CONCERNS (80/100) — 2 findings (2 medium); bug.17 verified and closed; bug.18, bug.19 opened | qa-task |
| 2026-10-28 |  | QA findings fixed — gate 9 CONCERNS, 2 entries (bug.18, bug.19) plus low CR9-3, 1 iteration; the §5c open-coverage check maps a non-count value to `unreadable`, refuses any line after a one-line flow entry, and requires a terminator after `findings:` | qa-fix |
| 2026-10-28 |  | PR review 3 doc-only findings fixed: `pr_number: 770` added; the Overview and Phase 1 checkbox reworded to the amended SC-2; the DoD run 1 gaps section marked superseded | develop-task |
| 2026-10-28 |  | QA gate CONCERNS (90/100) — 0 open entries; bug.18 and bug.19 closed; CR10-1 (low) deferred to task.240 | qa-task |
| 2026-10-28 | 1.3 | DoD passed — accepted (PR #770); CR10-1 deferred to task.240 | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Fast-gate outcomes and gated cleanup

- [x] Gated cleanup at every site in § 3's site list
- [x] Fast-gate outcomes in 5b step 0a and develop-bug (two for a red since QA cycle 6; `pre-existing` deleted)

### Phase 2: PR Existence Check and CI read at Step 10

- [x] VCS-branched PR Existence Check in qa-task and qa-story
- [x] Step 10 read, base check, map and record (GitHub and Bitbucket)

### Phase 3: Coverage findings to 5b

- [x] Verdict table, qa-fix ladder row, resume-row split, restatements

### Phase 4: Guards, bundle and record

- [x] Tests, bundle, CHANGELOG

---

## References

- Observation #8 — 5c CONCERNS passes a criterion-coverage gap that finalise then blocks on
- Observation #14 — 5b fast-gate rule has no branch for a pre-existing red or a killed gate
- Observation #41 — Fast-gate log deleted in the same call that read a red result
- Observation #45 — QA loop never reads a red CI rollup it already has (recurred 2026-10-27 as #107, task.236)
- task.237 — the 5c carry on APPROVE (the verdict table this task edits)
- task.239 — escalation and grant wording (the sibling cut from the same review, 2026-10-27)

---

## Notes

- QA report: `task.238.qa.{N}.qa-loop-acts-on-signals-it-has.md`
- Bug reports: `task.238.bug.{N}.{name}.md`
- Quality gate: `task.238.gate.{N}.qa-loop-acts-on-signals-it-has.yml` (co-located)
