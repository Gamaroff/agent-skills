---
id: task.238
title: "QA loop acts on the signals it already has"
type: task
description: "Make the QA loop act on four signals it already holds and today ignores or destroys: a red CI result on the PR, a fast-gate red that is pre-existing or produced no result, a red gate log, and a 5c coverage finding that /finalise is certain to fail."
tags: [develop-task, develop-story, develop-bug, qa-task, qa-story, qa-loop, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-10-27
updated: 2026-10-27
assignee:
estimated_effort_hours: 8
github_issue: 768
---

# Technical Task: QA loop acts on the signals it already has

**Status:** Planned
**GitHub Issue**: [#768](https://github.com/Gamaroff/agent-skills/issues/768)

---

## 1. Overview

The QA loop (Steps 5–6) holds four signals that it ignores or destroys, and each one later costs a `/finalise` HALT or a wasted gate run. This task makes the loop act on each signal at the point where it first has it.

**Scope:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (5b step 0a and the 5c verdict table), the step-3 Output Capture Pattern, `develop-bug`'s verify loop (the same fast-gate block), `qa-task` and `qa-story` (a one-time CI read), their bundled copies, and the guards.

**Key deliverables:**

- **CI read at 5a (obs #45).** `/qa-task` and `/qa-story` read the PR's CI result once, without waiting. A completed failure on the head they judge becomes a gate finding.
- **Three fast-gate outcomes (obs #14).** 5b step 0a names *attributable red*, *pre-existing red* (the failing tests fail the same way on the PR base) and *not measured* (no exit code). Each one has its own action.
- **Gated log cleanup (obs #41).** Every fast-gate block deletes its log only in a statement keyed on a zero exit, so the command that reads a red result cannot delete its log.
- **Coverage findings go back to 5b (obs #8).** On a 5c `CONCERNS` verdict, an open `category: coverage` finding sends the run back to 5b, like `REQUEST CHANGES`. Trail, consistency and scope findings stay non-blocking.

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

- **CI in the QA loop.** `develop-pipeline-step-5-6-qa-loop.md:1106` *"**CI and the QA loop — no cycle waits on CI.**"* says CI is free information. `/finalise` holds the only reader: `skills/finalise/SKILL.md:943` (`CI_ROLLUP=$(gh pr view "$PR_NUMBER" --json statusCheckRollup …`). It buckets CheckRun `.status`/`.conclusion` and StatusContext `.state`, and it treats `CANCELLED` as undecided. Bitbucket uses the pipelines endpoint at `skills/finalise/SKILL.md:982`. `qa-task`'s *PR Existence Check* (`skills/qa-task/SKILL.md:119`) already reads `gh pr view --json url,state,title,number` (`:128`). `qa-story`'s is at `skills/qa-story/SKILL.md:148`. A `grep -n statusCheckRollup` over both QA skills returns nothing.
- **Gate findings.** A gate's `top_issues[]` entry takes `id`, `severity`, `file` (required), `finding`, `suggested_action`, `suggested_owner` and `status` (`skills/qa-task/SKILL.md`, the `top_issues: []` schema in Step 10).
- **The fast gate.** 5b step 0a is at `develop-pipeline-step-5-6-qa-loop.md:1192`. Its block sets `FIX_LOG=".claude/state/qa-fix-gate-${QA_CYCLE}-$(date +%s).log"` and `GATE_EXIT=$?`. A background variant appends `echo "GATE_EXIT=$?"` to the log. The 2-attempt bound and "commit the attempt without pushing" follow. `develop-bug-step-5-6-verify-loop.md:194` is a skill-owned copy of the same block (`bug-fix-gate-{N}`), not a bundled one. The step-3 *Output Capture Pattern* (`develop-pipeline-step-3-develop-loop.md:242`) uses `TEST_LOG`/`TEST_EXIT`.
- **The precedent for "pre-existing".** `qa-task` Step 3b item 5b runs a `category: bug` finding against the PR **base** before it raises the finding. `review-pr` does the same (`skills/review-pr/SKILL.md:688`).
- **5c verdict routing.** The table is at `develop-pipeline-step-5-6-qa-loop.md:1458` (*"#### Verdict branching"*). `REQUEST CHANGES` returns to 5b and passes `pr_review=` to `/qa-fix` (*"#### Invoking `/qa-fix` on a REQUEST CHANGES verdict"*, `:1672`). The review's YAML carries `category: {coverage|scope|trail|consistency …}` and a free-form `ref` (`skills/review-pr/SKILL.md:787`).

### Target Architecture

- **CI read (obs #45).** At the PR Existence Check, each QA skill reads the CI state of the head it judges, once and without polling. It reuses `/finalise`'s bucketing rules. Each check whose CheckRun is `COMPLETED` with a failing conclusion becomes a `top_issues[]` entry: `severity: medium`, `file:` the path the failing job names or the workflow file, and a `finding` naming the check and run id. `PENDING`, `CANCELLED`, `NONE`, a read error or a head mismatch is recorded in the QA report's Review Methodology as informational, and the gate is unchanged. The loop's "no cycle waits on CI" rule stands, because this is a read, not a wait.
- **Three outcomes (obs #14).** 5b step 0a classifies the gate before it triages:
  1. **No result.** No `GATE_EXIT=` line, or the process was killed or timed out. Record "not measured" in the QA Iteration History. Re-run once. It never counts as green and never as red, and it does not consume a retry attempt.
  2. **Pre-existing red.** Run each failing test file alone in a worktree at the PR base. If it fails the same way there, record both measurements (red head, red base, the commands) and proceed to commit and push as on green. This mirrors qa-task Step 3b item 5b.
  3. **Attributable red.** Today's triage-and-retry path, unchanged.
- **Gated cleanup (obs #41).** Every block that captures a gate log ends with one statement: `grep -q '^GATE_EXIT=0$' "$FIX_LOG" && rm -f "$FIX_LOG"`, or `[ "$GATE_EXIT" -eq 0 ] && rm -f "$FIX_LOG"` for the foreground form. The prose "cleanup mirrors step 3" line goes. A note says that reading and cleanup are separate decisions. The same applies to `TEST_LOG` in step 3 and to develop-bug's copy.
- **Coverage → 5b (obs #8).** The `CONCERNS` row gains one condition: when the review carries an open `category: coverage` finding, take the `REQUEST CHANGES` arm. That means the same Remaining Work Status block, the same `/qa-fix` invocation with `pr_review=` and the same cycle accounting. Otherwise behave as today.

### Important Clarifications

- **Why every coverage finding, and not only the ones that "name a criterion".** Obs #8 asks for coverage findings "whose `ref` or text names a work-item criterion". But the `ref` is free-form. Measured over the 38 tracked `docs/tasks/*/*.pr-review.*.md` reports that carry `category: coverage` (`grep -h -A3 'category: coverage' … | grep 'ref:'`), the refs read `"Success Criteria 6"`, `"task.129 §8 Integration Tests"`, `"…md:129"` and so on. Not one uses an `AC-n`/`SC-n` id. A classifier over that text would be a guess. A coverage finding is, by `review-pr`'s definition, a gap between the PR and what its work item promised. That is exactly what `/finalise`'s AC agent checks. So the rule keys on `category: coverage` alone. The user chose "route to 5b" on 2026-10-27.
- **`APPROVE` is not changed.** An `APPROVE` carries only `severity: low` findings (`review-pr`'s verdict table, `skills/review-pr/SKILL.md:701`). Since task.237 its doc-only findings are carried, and nothing else changes here.
- **The CI finding's severity is `medium`, not `high`.** A `high` would trip the third-strike detector and the convergence check on a lane the fixer may not own, such as a flaky one. `medium` makes the gate `CONCERNS` and puts the red into 5b's queue, where obs #14's pre-existing branch can clear it.
- **Migration dead-link dry-run warning** (obs #45, second half) is out of scope (see § 4).

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b step 0a (three outcomes, gated cleanup), the 5c verdict table and its carry prose (coverage → 5b), and the "CI and the QA loop" paragraph (it names the 5a read).
✅ `shared/resources/develop-pipeline-step-3-develop-loop.md`: the Output Capture Pattern's gated cleanup.
✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: the same 0a block (three outcomes, gated cleanup).
✅ `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`: the one-time CI read and its mapping to `top_issues[]`, on GitHub and Bitbucket.
✅ The bundled copies (`npm run bundle`), the CHANGELOG `[Unreleased]` entry, and the guards in § 8.

### Out of Scope

❌ **Waiting on CI inside the loop.** The cost rule at `:1113` stands.
❌ **Changing `/finalise`'s CI gate.** CI reading 1 is still the acceptance decision.
❌ **A criterion classifier over `ref` text.** See § 3 Clarifications.
❌ **The migration engine's dead-link dry-run warning** (obs #45, second half). That is a different skill, and a different decision.
❌ **Escalation, grant and convergence wording.** That is task.239.

---

## 5. Breaking Changes

None to an API. Two behaviours change for a pipeline run:

1. **A 5c `CONCERNS` with an open coverage finding now uses one more QA cycle**, where today it proceeds to Step 7. Migration: none. The cycle is bounded by the same 5-cycle budget as `REQUEST CHANGES`.
2. **A QA gate can now be `CONCERNS` because a CI lane is red.** Migration: none. That red used to surface at `/finalise` as a HALT.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.238.plan.qa-loop-acts-on-signals-it-has.md](task.238.plan.qa-loop-acts-on-signals-it-has.md)

### Phase 1: Fast-gate outcomes and gated cleanup (Risk: Low)

**Files:** `develop-pipeline-step-5-6-qa-loop.md` (5b step 0a), `develop-pipeline-step-3-develop-loop.md` (Output Capture Pattern), `develop-bug-step-5-6-verify-loop.md` (its 0a)

- [ ] Replace each "cleanup mirrors" prose line with a one-statement gated cleanup inside the block, for the foreground and background forms
- [ ] Add the three-outcome classification to 5b step 0a: not measured, pre-existing red (a base-worktree run of the failing file), attributable red
- [ ] Apply the same to develop-bug's verify-loop 0a
- [ ] Record each outcome's QA Iteration History wording

**Dependencies:** none

### Phase 2: CI read at 5a (Risk: Medium)

**Files:** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `develop-pipeline-step-5-6-qa-loop.md` (the CI paragraph)

- [ ] Add a one-time CI read to each PR Existence Check, for GitHub and Bitbucket, with `/finalise`'s bucketing rules
- [ ] Map each completed failing check to a `top_issues[]` entry (`severity: medium`), and record undecided states in Review Methodology
- [ ] Reword the loop's "CI and the QA loop" paragraph to name the read, and keep "no cycle waits"

**Dependencies:** none (Phase 1's pre-existing branch is what clears a base-red lane in 5b, but Phase 2 ships alone)

### Phase 3: Coverage findings to 5b (Risk: Medium)

**Files:** `develop-pipeline-step-5-6-qa-loop.md` (Verdict branching, carry prose, the REQUEST CHANGES invocation heading)

- [ ] Add the coverage condition to the `CONCERNS` row, and route it through the `REQUEST CHANGES` arm
- [ ] Confirm `/qa-fix`'s findings ingester takes a `medium` coverage finding into scope, and state it in the invocation section
- [ ] Update the restatements that say `CONCERNS` always proceeds (see the plan's grep)

**Dependencies:** none

### Phase 4: Guards, bundle and record (Risk: Low)

- [ ] Tests in § 8, each one mutation-proved
- [ ] `npm run bundle`; CHANGELOG `[Unreleased]`

**Dependencies:** Phases 1–3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b step 0a, the CI paragraph, Verdict branching, and the REQUEST CHANGES invocation
2. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md`: Output Capture Pattern
3. ✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: its 0a block (skill-owned, not bundled)
4. ✅ `skills/qa-task/SKILL.md`: PR Existence Check, the Step 10 mapping, and the Step 11 Review Methodology line
5. ✅ `skills/qa-story/SKILL.md`: the same three places

### Files to Modify (Generated — `npm run bundle`)

6. ✅ Every `skills/*/references/` copy of files 1 and 2. `npm run bundle` lists them, so do not hand-edit any

### Files to Modify (Tests)

7. ✅ `evals/shared/tests/fast-gate-precondition.test.mjs`, or a new sibling: the gated-cleanup and three-outcome assertions
8. ✅ A new `evals/shared/tests/qa-loop-coverage-to-5b.test.mjs`: the verdict-table condition
9. ✅ `skills/qa-task/tests/qa-task.test.js` and `skills/qa-story/tests/qa-story.test.js`: the CI-read mapping, run on rollup fixtures

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md` `[Unreleased]`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Gated cleanup.** For every fenced block in files 1–3 that writes a `*_LOG` and an `*_EXIT`, assert that the block holds one `rm -f "$…_LOG"` and that it is joined by `&&` to a zero-exit test in the same statement. Execute the block on a fake gate that exits 1, and assert the log survives. Run it again with exit 0 and assert the log is gone. Mutation: restore the unconditional `rm -f` and the test goes red.
- **CI-read mapping.** Feed the bucketing jq fixtures for a COMPLETED/FAILURE CheckRun, an IN_PROGRESS CheckRun with `conclusion: ""`, a CANCELLED run, a StatusContext `state: FAILURE`, and an empty rollup. Assert one `top_issues` entry for each completed failure, and none for the other cases. The `conclusion: ""` case must not map to green or red (the `/finalise` trap at `skills/finalise/SKILL.md:928`).
- **Coverage condition.** Extract the routing rule the table states. Assert that `CONCERNS` plus an open `coverage` finding → 5b, `CONCERNS` plus only `trail`/`scope`/`consistency` → Step 7, and `APPROVE` → Step 7.

### Integration Tests

- Execute the 5b step 0a block (via the snippet executor the evals already use) against three fake gates: a red that is also red at base, a red that is green at base, and a killed process with no `GATE_EXIT=` line. Assert the three recorded outcomes.

### Performance Tests

- N/A. The CI read is one API call per QA cycle, and the base-worktree run happens only on a red.

### Consumer Tests

- `npm run ci:fast` green, `npm run bundle:check` clean.
- **Control case (obs #176).** The coverage test also includes a `CONCERNS` review whose only open finding is `category: consistency` with `severity: medium`, and it must still proceed to Step 7.

---

## 9. Success Criteria

### Functional

- [ ] SC-1: Executing each fast-gate block in files 1–3 with a gate that exits non-zero leaves its log file on disk. With exit 0, the log is removed (test in § 8, red on today's blocks)
- [ ] SC-2: 5b step 0a states three outcomes (not measured, pre-existing red, attributable red), each with its action and QA Iteration History wording. The integration test in § 8 records the three outcomes for the three fake gates
- [ ] SC-3: `/qa-task` and `/qa-story` each read the PR's CI state once per cycle, without waiting, on GitHub and on Bitbucket. A COMPLETED failing check becomes a `severity: medium` `top_issues[]` entry, and an undecided state changes nothing in the gate (unit test in § 8)
- [ ] SC-4: The 5c verdict table routes a `CONCERNS` verdict with an open `category: coverage` finding to 5b through the `REQUEST CHANGES` arm. A `CONCERNS` verdict without one proceeds to Step 7 as today (test in § 8, including the control case)

### Performance

- [ ] SC-5: The QA loop still adds no CI wait. No new `sleep`, poll or `--watch` appears in files 1–5 (`git diff develop -- <files> | grep -E '^\+.*(sleep|--watch|until )'` returns nothing)
- [ ] SC-6: The base-worktree run fires only when the head run was red. A green gate runs the gate once

### Code Quality

- [ ] SC-7: `npm run ci:fast` passes
- [ ] SC-8: `npm run bundle:check` passes. No hand edit under `skills/*/references/` for a file with a `shared/resources/` source
- [ ] SC-9: `npm run validate -- skills/qa-task/`, `skills/qa-story/` and `skills/develop-bug/` pass
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
   - Mitigation: `severity: medium`, so the third-strike and convergence guards are not touched. 5b's pre-existing branch (Phase 1) clears a red that also fails on base.
   - Rollback: revert Phase 2 alone.
2. **The coverage route costs cycles on findings `/finalise` would not have failed.**
   - Probability: Low to Medium. Impact: a cycle spent on a real promise gap.
   - Mitigation: the route is bounded by the 5-cycle budget, and a coverage finding is a promise the work item made.
   - Rollback: revert Phase 3 alone.
3. **`/qa-fix` ignores a `medium` coverage finding** because its ingester keys on `high`.
   - Mitigation: Phase 3's second checkbox confirms the ingester's scope before the route ships, and the invocation states it.

### Low Risk Areas

1. **A base worktree for the pre-existing check collides with the checkout's** `.agents/skills` move-aside.
   - Mitigation: create the worktree under `.worktrees/` and remove it in the same block. The plan names the command.

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

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-27 | 1.0 | Initial draft — cut from observations #8, #14, #41, #45 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Fast-gate outcomes and gated cleanup

- [ ] Gated cleanup in three files
- [ ] Three outcomes in 5b step 0a and develop-bug

### Phase 2: CI read at 5a

- [ ] qa-task and qa-story read, map and record

### Phase 3: Coverage findings to 5b

- [ ] Verdict table, ingester scope, restatements

### Phase 4: Guards, bundle and record

- [ ] Tests, bundle, CHANGELOG

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
