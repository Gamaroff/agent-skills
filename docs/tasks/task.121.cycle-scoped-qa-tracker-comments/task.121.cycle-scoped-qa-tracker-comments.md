---
id: task.121
title: "[Task 121] QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped: make qa-gate and qa-fix cycle-scoped at the call sites, and guard it"
type: task
description: "tracker-comment.js builds its idempotency marker from --stage alone. qa-fix is already a cycle-scoped stage in the engine but skills/qa-fix passes the bare name; qa-gate is not cycle-scoped and qa-task/qa-story pass it bare on every cycle. Result on task.110, task.113 and task.119: the PR carries every cycle, the tracker issue carries cycle 1 and reports success for the rest. Add qa-gate to the cycle-scoped list, suffix all three call sites with the cycle they already derive, state once-per-issue vs once-per-cycle in the contract, and add a guard that fails on a bare cycle-scoped stage. Observation #75 (consolidating #66, #70, #78, #80, #84, #93, #94)."
tags: [tracker-comment, qa-task, qa-story, qa-fix, idempotency]
category: refactoring
status: planned
priority: High
risk_level: low
created: 2026-09-17
updated: 2026-09-17
assignee:
estimated_effort_hours: 4
github_issue: 421
---

# Technical Task: QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped

**Status:** Planned
**GitHub Issue**: [#421](https://github.com/Gamaroff/agent-skills/issues/421)

---

## 1. Overview

`tracker-comment.js` deduplicates by an HTML marker built from `--stage`. Three call sites in the QA
skills pass a bare stage name on a moment that recurs once per QA cycle, so the second and every
later cycle returns `reason: already`, exit 0, and posts nothing. The PR comment beside each of them
has no marker and posts every cycle, so the two audiences see different histories of the same loop.
This task makes the three call sites carry the cycle number they already compute, adds `qa-gate` to
the engine's cycle-scoped list so the suffix is legal, states the once-per-issue / once-per-cycle
split in the contract, and adds a test that fails on the next bare call.

**Scope**: the engine's `CYCLE_SCOPED_STAGES` list and its twin in `stakeholder-summary.js`; the
`--stage` argument at three call sites; `tracker-comment-contract.md`; one guard test; the
orchestrator's parallel `qa-cycle-{N}` block, which the evidence shows never posts.

## 2. Motivation

### Current Problems

1. **The tracker issue records only cycle 1.** Issue #419 (task.119, three QA cycles) carries exactly
   one `<!-- agent-skills-comment:qa-gate -->` and one `…:qa-fix -->`; #397 (task.113, four cycles)
   and task.110 (six cycles) the same. The gate that ended each loop — the PASS — never reached the
   card. A stakeholder reading the issue sees a FAIL or CONCERNS verdict that is several gates old.
2. **The skip reports success.** `already` is in the success family by contract (exit 0), so nothing
   in the pipeline log distinguishes "posted" from "suppressed by an earlier cycle's marker". This is
   the single most-logged defect in the observation backlog — eight entries in five days — precisely
   because each session rediscovered it from the symptom and found no error to trace.
3. **The engine already has the fix and one call site ignores it.** `CYCLE_SCOPED_STAGES` lists
   `qa-fix` and accepts `qa-fix-3`; `skills/qa-fix/SKILL.md` Step 7 passes `--stage qa-fix` while
   passing `--slot cycle="$FIX_CYCLE"` on the very next line.
4. **`qa-gate` is not cycle-scoped at all**, so `qa-task` and `qa-story` Step 13b could not suffix it
   even if they tried — the engine rejects `qa-gate-2` as an unknown stage.
5. **Two stages exist for the same moment.** `develop-pipeline-step-5-6-qa-loop.md` tells the
   orchestrator to post `qa-cycle-{N}` after each cycle; the QA skills post `qa-gate`. On #419 there
   is no `qa-cycle` marker at all — the orchestrator block does not run in practice, and the one that
   does run is the one keyed wrong.

### Benefits

1. Every QA cycle's verdict reaches the tracker issue, in order, with the plain-language lead the
   contract already renders for the suffixed form.
2. A resume of the *same* cycle still deduplicates — the marker becomes `qa-gate-3`, not unmarked.
3. The contract says which stages fire once per issue and which once per cycle, so a caller cannot
   pick the wrong idempotency by reading only the stage name.
4. A guard test turns the next bare cycle-scoped call red at `npm test` instead of at the third
   pipeline run someone happens to audit.
5. Seven duplicate observations close against one task.

## 3. Technical Background

### Current Architecture

```
tracker-comment.js
  CYCLE_SCOPED_STAGES = ["qa-cycle", "qa-fix", "pipeline-paused"]   # suffix legal only here
  marker = <!-- agent-skills-comment:{stage} -->                     # stage as passed
stakeholder-summary.js
  CYCLE_SCOPED_LEAD_STAGES  (a test holds it equal to the list above)
  stripCycleSuffix(stage) → catalogue key                            # lead renders for qa-fix-3

skills/qa-task/SKILL.md   Step 13b   --stage qa-gate   --slot verdict --slot blocking_count
skills/qa-story/SKILL.md  Step 13b   --stage qa-gate   --slot verdict --slot blocking_count
skills/qa-fix/SKILL.md    Step 7     --stage qa-fix    --slot cycle="$FIX_CYCLE"
shared/resources/develop-pipeline-step-5-6-qa-loop.md   --stage qa-cycle-{N}   (never observed posting)
```

### Target Architecture

```
tracker-comment.js
  CYCLE_SCOPED_STAGES = ["qa-gate", "qa-cycle", "qa-fix", "pipeline-paused"]
stakeholder-summary.js
  CYCLE_SCOPED_LEAD_STAGES — same four (the existing equality test enforces it)

qa-task   Step 13b   --stage "qa-gate-${QA_CYCLE}"    # from the gate filename, same derivation qa-fix uses
qa-story  Step 13b   --stage "qa-gate-${QA_CYCLE}"
qa-fix    Step 7     --stage "qa-fix-${FIX_CYCLE}"
qa-loop doc          orchestrator qa-cycle block removed (see Clarifications)

tracker-comment-contract.md   § Stages: once-per-issue vs once-per-cycle, stated once
shared/resources/tests/comment-slot-coverage.test.mjs   + "a cycle-scoped stage is never passed bare"
```

### Important Clarifications

- **Why `qa-gate` rather than switching the QA skills to `qa-cycle`.** The `qa-gate` lead reads
  `blocking_count`, which is what the gate file carries and what the outside reader needs; `qa-cycle`
  reads only `verdict` and `cycle`. Adding one name to a list is a smaller change than moving two call
  sites onto a lead that says less. The orchestrator's `qa-cycle-{N}` block is the duplicate — it was
  written for the same moment, it has never been observed posting (#419 has no `qa-cycle` marker), and
  leaving it makes a run that *did* execute it post twice per cycle. Remove the block; keep the
  `qa-cycle` stage in the engine (removing a stage touches the lead catalogue and its tests, and is
  out of scope).
- **The cycle number already exists at every site.** `qa-fix` derives `FIX_CYCLE` from the gate
  filename; `qa-task`/`qa-story` Step 13b re-resolve `THIS_GATE` for `blocking_count` and can take the
  number from the same filename with the same `sed`.
- **The marker for a suffixed stage is the suffixed name** (`agent-skills-comment:qa-gate-2`), so a
  resumed cycle 2 still answers `already` and cycle 3 posts. That is the behaviour the contract
  already promises for `qa-fix-N`.

## 4. Scope

### In Scope

✅ **Engine**: `qa-gate` added to `CYCLE_SCOPED_STAGES` and `CYCLE_SCOPED_LEAD_STAGES`; the stage
   validator and `stripCycleSuffix` need no change.
✅ **Call sites**: the three `--stage` arguments above, plus the `stakeholder-summary-cli.js` lead
   call beside each (it accepts the suffixed form already — verify, do not assume).
✅ **Contract**: `tracker-comment-contract.md` gains one table: stage → once-per-issue | once-per-cycle.
✅ **Guard**: `comment-slot-coverage.test.mjs` (or a sibling in the same file family) asserts that no
   shipped call site passes a cycle-scoped stage without a `-${…}` or `-{N}` suffix.
✅ **Orchestrator**: delete the `qa-cycle-{N}` comment block from `develop-pipeline-step-5-6-qa-loop.md`
   and the prose that documents its slots.
✅ `npm run bundle` — the shared sources fan out into ~30 `references/` copies.

### Out of Scope

❌ Update-in-place of a single running comment (the engine has that path; per-cycle history is the
   behaviour the PR side already has and the tracker side should match).
❌ Removing the `qa-cycle` stage from the engine or the lead catalogue.
❌ A `bitbucket_call_with_retry` helper (noted at the call site as its own task).
❌ Backfilling missing cycle comments on closed issues.

## 5. Breaking Changes

None for consumers. The marker text for the QA stages changes from `qa-gate` to `qa-gate-N`, so a
pipeline resumed across this change on an issue that already carries a bare `qa-gate` marker will
post cycle N again once — one duplicate on at most one in-flight issue, then correct.

## 6. Implementation Plan

> Detailed implementation guide: [task.121.plan.cycle-scoped-qa-tracker-comments.md](task.121.plan.cycle-scoped-qa-tracker-comments.md)

### Phase 1: Make `qa-gate` cycle-scoped in the engine

**Risk Level**: Low

**Files**: `shared/resources/tracker-comment.js`, `shared/resources/stakeholder-summary.js`,
`shared/resources/tests/tracker-comment.test.mjs`, `shared/resources/tests/stakeholder-summary.test.mjs`

**Changes**:
- [ ] Add `"qa-gate"` to `CYCLE_SCOPED_STAGES` and to `CYCLE_SCOPED_LEAD_STAGES`.
- [ ] Extend the existing "suffix is legal only for cycle-scoped stages" test with `qa-gate-2`
      accepted and `in-review-2` still rejected.
- [ ] Assert the lead for `qa-gate-2` renders identically to `qa-gate` (suffix stripped).

**Dependencies**: none.

### Phase 2: Suffix the three call sites, remove the orchestrator duplicate

**Risk Level**: Low

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-fix/SKILL.md`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Changes**:
- [ ] `qa-fix` Step 7: `--stage "qa-fix-${FIX_CYCLE}"`.
- [ ] `qa-task` / `qa-story` Step 13b: derive `QA_CYCLE` from `THIS_GATE`'s filename (same `sed` as
      `qa-fix`), pass `--stage "qa-gate-${QA_CYCLE}"`; update the adjacent prose that says the
      comment is per-stage.
- [ ] Delete the orchestrator's `qa-cycle-{N}` block and its slot note from the qa-loop doc; leave a
      one-line pointer that the QA skill posts the per-cycle comment.
- [ ] `npm run bundle`.

**Dependencies**: Phase 1 (the suffix must be legal before a call site uses it).

### Phase 3: Contract and guard

**Risk Level**: Low

**Files**: `shared/resources/tracker-comment-contract.md`,
`shared/resources/tests/comment-slot-coverage.test.mjs`

**Changes**:
- [ ] Contract: one table, stage → `once per issue` | `once per cycle (numeric suffix required)`,
      derived from and cross-referencing `CYCLE_SCOPED_STAGES`, not restating it as a second list.
- [ ] Guard: for every call site `collectCallSites()` already finds, if `baseStage(stage) !== stage`
      is false and `CYCLE_SCOPED_STAGES.includes(stage)` — i.e. a cycle-scoped stage passed with no
      suffix — fail with the file and line. Non-vacuity floor: at least three suffixed cycle-scoped
      sites must be found.
- [ ] Mutation-prove: revert one call site to the bare form, confirm the guard names it, restore.

**Dependencies**: Phase 2 (the guard must be green on the fixed tree and red on the old one).

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/tracker-comment.js` — `CYCLE_SCOPED_STAGES` += `qa-gate`
2. ✅ `shared/resources/stakeholder-summary.js` — `CYCLE_SCOPED_LEAD_STAGES` += `qa-gate`
3. ✅ `skills/qa-task/SKILL.md` — Step 13b stage suffix + cycle derivation
4. ✅ `skills/qa-story/SKILL.md` — Step 13b stage suffix + cycle derivation
5. ✅ `skills/qa-fix/SKILL.md` — Step 7 stage suffix
6. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — remove the duplicate block

### Files to Modify (Tests)

7. ✅ `shared/resources/tests/tracker-comment.test.mjs` — suffix legality for `qa-gate`
8. ✅ `shared/resources/tests/stakeholder-summary.test.mjs` — lead renders for `qa-gate-N`
9. ✅ `shared/resources/tests/comment-slot-coverage.test.mjs` — bare-cycle-scoped-stage guard

### Files to Modify (Documentation)

10. ✅ `shared/resources/tracker-comment-contract.md` — once-per-issue vs once-per-cycle
11. ✅ `skills/*/references/` — regenerated by `npm run bundle`

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests

**Scope**: engine stage validation and lead rendering.

**Actions**:
- [ ] `qa-gate-2` accepted; `qa-gate` still accepted; `in-review-2` rejected.
- [ ] Lead for `qa-gate-2` with `verdict=PASS blocking_count=0` equals the lead for `qa-gate`.
- [ ] Marker for `qa-gate-2` is `agent-skills-comment:qa-gate-2`; a second call with the same stage
      returns `already`; `qa-gate-3` posts.

**Command**: `npm test`

### Integration Tests

**Scope**: the shipped call sites.

**Actions**:
- [ ] `comment-slot-coverage.test.mjs` finds the three suffixed sites and no bare ones.
- [ ] Mutation: revert `qa-fix` Step 7 to `--stage qa-fix` → guard red, naming the file.

### Contract Tests

- [ ] `CYCLE_SCOPED_STAGES` equals `CYCLE_SCOPED_LEAD_STAGES` (existing test, now with four members).
- [ ] `tests/bundled-links.test.js` and `npm run bundle:check` green after the bundle.

### Performance Tests

Not applicable — no runtime path changes beyond one array member.

### Consumer Tests

- [ ] On the next `/develop-task` run with ≥2 QA cycles, the tracker issue carries one
      `qa-gate-N` and one `qa-fix-N` marker per cycle, in order.

## 9. Success Criteria

### Functional
- [ ] Every QA cycle's gate and fix comment reaches the tracker issue with a distinct marker.
- [ ] A resumed cycle still returns `already` for its own suffixed stage.
- [ ] No `qa-cycle` comment is posted by the orchestrator.

### Performance
- [ ] No change to comment latency; one extra list member in the validator.

### Code Quality
- [ ] `npm test` green; the new guard has a non-vacuity floor and a passed mutation proof recorded
      in the implementation report.
- [ ] `CYCLE_SCOPED_STAGES` remains the single definition (contract table cross-references it).

### Migration
- [ ] Contract documents the stage classes; observation #75 marked `actioned` with the PR number.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **Cycle derivation differs between qa-task and qa-fix**
   - Risk: two `sed` expressions drift and one cycle posts under the wrong number.
   - Probability: Low · Impact: Medium
   - Mitigation: copy the `qa-fix` expression verbatim; the guard checks presence of a suffix, and the
     consumer test checks ordering on a real run.

### Low Risk
1. **A call site cited in a task document trips the guard** — `collectCallSites()` already excludes
   `docs/`; confirm the new assertion goes through the same collector.
2. **Bundle churn** — three shared sources change; expect ~30 `references/` copies in the diff.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: the guard is red on a call site the task did not touch and cannot be fixed in-PR;
  a stage validator regression rejects a live stage.
- **Steps**: `git revert` the merge commit; `npm run bundle`; commit.
- **Validation**: `npm test` green; `tracker-comment.js --stage qa-fix-2 --dry-run` still accepted.

### Partial Rollback (1–2 hours)
- Keep Phase 1 (engine) and revert Phase 2 (call sites) — nothing breaks, the defect merely returns.

### Forward Fix
- A wrong cycle number on one comment is cosmetic; fix the derivation forward.

### Rollback Triggers
- **Critical**: engine rejects a stage a shipped call site passes.
- **Non-critical**: guard false positive, contract wording.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: engine
- [ ] Phase 2: call sites + orchestrator block
- [ ] Phase 3: contract + guard
- [ ] QA: `task.121.qa.[N].cycle-scoped-qa-tracker-comments.md`
- [ ] Gate: `task.121.gate.[N].cycle-scoped-qa-tracker-comments.yml`

## References

- Observation #75 (canonical; consolidates #66, #70, #78, #80, #84, #93, #94)
- `shared/resources/tracker-comment-contract.md` · `shared/resources/stakeholder-summary.md`
- Evidence: issue #419 comment markers — one `qa-gate`, one `qa-fix`, no `qa-cycle`, across three cycles
- `docs/reference/anti-patterns.md` — the enumeration class (why the contract table cross-references
  the engine list rather than restating it)

## Notes

Bugs found during QA land at `task.121.bug.[N].[name].md` in this directory.
