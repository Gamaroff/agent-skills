---
id: task.123
title: "[Task 123] The QA loop's guards read only the HIGH count and the lock cannot go backwards"
type: task
description: "Four QA-loop shapes the step-5-6 doc has no route for, each observed burning cycles on a real task: a PASS gate whose open entries are all LOW re-enters a full qa-fix cycle (task.110 ran cycles 12–13 for two nits); a converging medium-only loop with HIGH 0 throughout exhausts the budget and escalates an ungated fix (task.117, five CONCERNS gates); advance-pipeline-lock.sh is monotonic so every 5b→5a re-entry needed a hand-rolled jq (task.108); and a re-invocation after a loop-limit halt has no re-entry rule, so a standalone cycle 6 run by the operator was invisible to the resumed pipeline (task.110). One task, one document to change, one lock helper, one resume-contract subsection. Observations #72, #77, #95, #100, #112."
tags: [develop-task, develop-story, qa-loop, pipeline]
category: refactoring
status: ready-for-development
priority: High
risk_level: medium
created: 2026-09-17
updated: 2026-09-18
assignee:
estimated_effort_hours: 8
github_issue: 423
---

# Technical Task: The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Status:** Ready for Development
**Review**: ✅ All review recommendations from `task.123.review.1.qa-loop-exits-and-re-entry.md` implemented 2026-09-18
**GitHub Issue**: [#423](https://github.com/Gamaroff/agent-skills/issues/423)

---

## 1. Overview

`develop-pipeline-step-5-6-qa-loop.md` routes every cycle on the gate's open queue and guards the
loop with two HIGH-count readings: the Convergence check (HIGH remains and stops falling →
escalate) and the Diminishing-returns exit (HIGH gone and residue is test machinery → 5c). Every
other shape falls through to a full `qa-fix` cycle or to the budget. This task adds the routes the
loop has been improvising, gives the lock a field that records the loop's true position so nothing
has to move `current_step` backwards, and writes the re-entry rule for a pipeline re-invoked after
its budget is spent.

**Scope**: the step-5-6 doc's Outcome branching and Loop Escalation, its two guards and their
fixture rows; the route-classifier engine `qa-diminishing-returns.js`; the lock's `qa_phase` field and
the Stop hook that reads it; the resume contract's re-entry subsection and the Phase 0b prompt in
both develop-* SKILL.md; the corresponding eval replay fixtures on both sides.

## 2. Motivation

### Current Problems

1. **A PASS gate with LOW-only residue re-enters a full cycle.** Task.110 ran cycles 12 and 13 to
   clear two cosmetic entries (a `..` in a basename, a stale word in a comment), each cycle costing a
   reviewer dispatch, a suite run, a gate, a QA report, a Change Log row and two tracker comments.
   The Diminishing-returns exit covers only a residue that is *entirely test machinery* (#77, #100).
2. **A medium-only loop has no guard that can speak.** Task.117 ran five CONCERNS gates with HIGH 0
   throughout, each cycle a strictly narrower medium in the previous fix. Convergence had nothing to
   measure; the exit was refused every cycle by a maintainability CONCERNS. The budget ended the loop
   and the escalation handed a person a mutation-proven, suite-green fix that only lacked a gate (#112).
   The defect is at the **budget boundary**: the last budgeted 5b landed a fix and no cycle remained to
   gate it, so the loop escalated an ungated head that one more review would have cleared.
3. **The lock helper is monotonic and the loop is not.** `advance-pipeline-lock.sh` treats
   `next <= current` as a no-op; 5b (`current_step: 6`) legitimately returns to 5a (`5`). On task.108
   every re-entry needed `jq '.current_step = 5'` by hand, and a stale `6` during a re-review would
   have had the Stop hook re-prompt `/qa-fix` on a gate that had not been rewritten (#72).
4. **No re-entry rule after a loop-limit halt.** The halt message offers three options; Phase 0b
   (`skills/develop-{task,story}/SKILL.md`, "Resume from {halt_step} / Start fresh") offers neither of
   them and no way to grant more cycles. The resume contract's **QA Cycle Count Reconstruction**
   counts `### QA Cycle` entries in the implementation report — but a standalone `/qa-task` run by
   the operator writes `gate.{N}` and `qa.{N}` to disk and **no report entry**, so the two counts
   diverge. On task.110 the operator ran a standalone cycle 6 between halt and re-invocation, and the
   resumed pipeline counted five (#95). The halt snapshot (`develop-pipeline.last-halt.json`, written
   at `skills/develop-task/SKILL.md` Step HALT) carries only `halt_reason`, `halt_step`, `halted_at`
   over the lock's fields — it has no cycle count at all, and cannot record cycles that have not
   happened yet.

### Benefits

1. A clean PASS with cosmetic residue reaches 5c in one step, with the LOWs carried in
   `recommendations.future` — the same treatment route 2 already gives test machinery.
2. A converging medium-only loop exits with a **gated** fix: when the budget is spent, one cheap
   "gate the last fix" half-cycle (review + gate on the last fix's head, no 5b) runs before the
   escalation is written, and a clean gate hands to 5c instead.
3. The lock records the loop's true position; no orchestrator edits it by hand; the Stop hook's
   re-prompt names the right step.
4. A re-invoked pipeline reconstructs the cycle count from the gates on disk, back-fills the report
   entries the operator's cycles never wrote, and offers the halt's own options plus an explicit
   extra-cycle grant recorded in the lock.
5. Five observations close against one document change.

## 3. Technical Background

### Current Architecture

```
step-5-6 doc, Outcome branching (five arms + malformed HALT; task.116)
  any open top_issues[] entry → Convergence check → Diminishing-returns exit → 5b
  Convergence:  HIGH_N > 0 AND flat across two cycles          → escalate   (precondition landed; §Convergence check step 3)
  Diminishing:  HIGH_N == 0 AND residue ⊆ testArtifactGlobs AND no NFR CONCERNS → 5c
                evaluated by shared/resources/qa-diminishing-returns.js (classifyDiminishingReturns /
                describeDiminishingReturns) — "ask the engine; do not evaluate them by eye"
Loop Escalation            5 cycles spent → escalation entry + HALT; the last 5b's fix is never gated
advance-pipeline-lock.sh   next <= current → noop                (monotonic); 5a = current_step 5, 5b = 6
develop-pipeline-on-stop.sh  case 5) → /qa-task|/qa-story   case 6) → /qa-fix
resume contract            cycle count = grep -c "^### QA Cycle" {report}; halt snapshot = lock + halt_reason/halt_step/halted_at
                           Phase 0b (develop-*/SKILL.md): Resume from {halt_step} | Start fresh
```

### Target Architecture

```
qa-diminishing-returns.js grows into the loop's route classifier — ONE engine, one fixture table:
  classifyLoopRoute({cycle, highCounts, mediumCounts?, latestGateContent, testArtifactGlobs, budgetSpent})
    → {route: diminishing-returns | cosmetic-residue | gate-the-last-fix | continue, reason, detail, findings}
  MEDIUM_N is computed inside the engine from gate content, never by a second awk in prose.
  describeLoopRoute(r) is the only writer of the `**Loop exit**` row, as describeDiminishingReturns is today.

Outcome branching gains ONE route, evaluated after the Convergence check beside the Diminishing-returns exit:
  route 2b  cosmetic residue:  gate token PASS (and only PASS — a CONCERNS token is a reservation 5c
            must see raised, not carried), every open entry severity: low, HIGH_N == HIGH_{N-1} == 0
            → 5c, LOWs moved to recommendations.future by id, `**Loop exit**: cosmetic-residue — {n} low entries carried to future`

Loop Escalation gains ONE pre-escalation step (the loop-limit trigger only):
  route 2c  gate-the-last-fix: budget spent AND the last budgeted cycle ran 5b AND HIGH_k == 0 for all k
            AND MEDIUM strictly falling across the last three gates
            → one half-cycle: an ordinary 5a (qa-{task,story} → gate.{N+1}) on the fix's head, no 5b
              PASS / CONCERNS with no open entry → 5c, `**Loop exit**: gate-the-last-fix`
              any open entry → the Loop-limit escalation as today, with gate.{N+1} attached

advance-pipeline-lock.sh   OPTION B (decided at review): current_step stays 5 for 5a, 5b and 5c;
                           a `qa_phase: 5a|5b|5c` field carries the sub-position and is the only thing
                           that moves within the loop. Step 6 becomes unused in the story/task lock.
develop-pipeline-on-stop.sh  case 5) reads qa_phase → /qa-task|/qa-story, /qa-fix, /review-pr

resume contract            Re-entry after a QA loop escalation:
                           QA_CYCLE      = max N over gate.{N}.yml on disk (the report count is the cross-check)
                           cycles_outside_loop = QA_CYCLE − count(### QA Cycle)   — DERIVED at resume, never stored
                           each missing entry back-filled, marked `run outside the loop (operator)`
                           Phase 0b on halt_reason ∈ {loop-limit, not-converging} → the halt's own three options
                           + "Resume at 5a with {k} more cycles"; k written to the LOCK as extra_cycles_granted;
                           QA_MAX_CYCLES = 5 + extra_cycles_granted for this run (not MAX_ITER — that is Step 3's bound)
```

### Important Clarifications

- **Route 2b is not a way to drop findings.** The LOWs go to `recommendations.future` by id, and
  5c's conformance lens reads that list. Two consecutive HIGH-0 cycles is the floor so a first PASS
  is not exempt from its own review.
- **Route 2c fires at the budget boundary, not inside the loop.** It is evaluated once, when the
  loop-limit trigger would otherwise write the escalation entry, and only if the last budgeted cycle
  ran 5b — so there is a fix on the head that no gate has read. The half-cycle is an ordinary 5a
  (review + gate) on that head; "no 5b" follows because the half-cycle's gate either has no open
  entry (→ 5c) or the run escalates with the gate attached. It does **not** re-review a head a gate
  has already read, and it needs no new mode or argument on `qa-task` / `qa-story`. If its gate opens
  a HIGH, that is the escalation's evidence, not a new cycle.
- **The lock decision is made: option B.** `current_step` stays `5` for the whole loop and a
  `qa_phase: 5a|5b|5c` field carries the position. Option A (`--set N`, an explicit logged backward
  move) was smaller but leaves the lock reading `6` between 5b's return and the call that resets it —
  the exact window in which the Stop hook re-prompted `/qa-fix` on task.108. B is truer to "the QA
  loop is one step with sub-phases", and the hook change is two `case` arms in
  `develop-pipeline-on-stop.sh`. The lock helper stays monotonic; no backward move is added.
- **Same-class mechanism inventory.** `shared/resources/qa-diminishing-returns.js` already classifies
  a gate sequence + queue into `exit | continue`. Routes 2b and 2c **extend** it — one
  `classifyLoopRoute()` with a fixture table (sequence, queue, token → route) — rather than sitting
  beside it as prose predicates. The step doc's own warning applies: "a second implementation of one
  count drifts silently, and the two guards would then disagree about the same run while each looked
  right alone." `MEDIUM_N` is therefore an engine output, not a second awk.
- **Re-entry reconstructs from disk and derives, never stores, the operator's cycles.** The highest
  `gate.{N}` on disk is the cycle count; the report's `### QA Cycle` count is the cross-check; the
  difference is `cycles_outside_loop`, computed at resume — the halt snapshot cannot record cycles
  that have not happened yet. Each missing entry is back-filled and marked `run outside the loop
  (operator)`. The only new stored field is `extra_cycles_granted`, written to the **lock** when the
  operator accepts the grant.

## 4. Scope

### In Scope

✅ Step-5-6 doc: route 2b in Outcome branching, route 2c as the loop-limit trigger's pre-escalation
   step, their fixture rows beside the existing worked examples, the Loop-exit record values.
✅ `shared/resources/qa-diminishing-returns.js` (+ its test): `classifyLoopRoute` / `describeLoopRoute`.
✅ Lock: `qa_phase` in the lock JSON (option B); `develop-pipeline-on-stop.sh` reads it; the lock
   helper's test pins that `advance` still refuses 6 → 5 and that `qa_phase` never moves `current_step`.
✅ Resume contract: the re-entry subsection (reconstruction from disk, back-fill, the grant);
   `skills/develop-{task,story}/SKILL.md`: Phase 0b prompt variant and the `extra_cycles_granted` lock write.
✅ Eval replay fixtures under **both** `evals/develop-task/step-isolation/` and
   `evals/develop-story/step-isolation/`: one per new route, one for re-entry (the doc is shared;
   a fixture on one side pins half of it).
✅ `docs/runbooks/qa-flow.md` and the qa-flow mermaid (task.116 left a route-2 edge missing; add 2b/2c).
✅ `npm run bundle`.

### Out of Scope

❌ Changing what `qa-task` / `qa-story` put in `top_issues[]` (obs #100's alternative), or adding
   any mode/argument to them — route 2c is an ordinary 5a invocation.
❌ A backward move in `advance-pipeline-lock.sh` (option A) — superseded by option B.
❌ The HIGH_N > 0 precondition on the Convergence check — staged by the 2026-09-17 observation review.
❌ The third-strike mechanism granularity — staged by the same review.

## 5. Breaking Changes

None for consumers. A pipeline resumed across this change reads the new snapshot fields as absent
(`0`) and behaves as today.

## 6. Implementation Plan

> Detailed implementation guide: [task.123.plan.qa-loop-exits-and-re-entry.md](task.123.plan.qa-loop-exits-and-re-entry.md)

### Phase 1: Lock position for the loop (option B)

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (Loop Setup, 5a, 5b, 5c: write
`qa_phase`), `shared/resources/develop-pipeline-on-stop.sh` (`case 5)` arms, story/task map only),
`shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/develop-pipeline-hooks.md`,
`shared/resources/pipeline-lock-cooperation.md`

**Changes**:
- [ ] Record the decision (B) and its reason in the step-5-6 doc's Loop Setup.
- [ ] 5a, 5b and 5c each write `qa_phase` (`jq '.qa_phase = "5a"'` … through the lock's atomic-write
      pattern) and leave `current_step` at `5`; `advance-pipeline-lock.sh 6` is no longer called inside the loop.
- [ ] `develop-pipeline-on-stop.sh`: `case 5)` reads `qa_phase` → `/qa-task|/qa-story`, `/qa-fix`,
      `/review-pr`; absent `qa_phase` → `/qa-task|/qa-story` (the loud, re-entrant default). `case 6)`
      stays for `develop-bug`, whose map is separate.
- [ ] Lock helper test: `advance` still refuses 6 → 5 (monotonic pin); a lock carrying `qa_phase` is
      still a valid object; `--skill qa-fix` etc. still noop.
- [ ] Remove the hand-rolled `jq '.current_step = 5'` from any step doc that carries it.

**Dependencies**: none.

### Phase 2: Routes 2b and 2c

**Risk Level**: Medium

**Files**: `shared/resources/qa-diminishing-returns.js` + its test, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
`evals/develop-task/step-isolation/*`, `evals/develop-story/step-isolation/*`,
`evals/shared/tests/pr-review-loop-parity.test.mjs`, `docs/runbooks/qa-flow.md`

**Changes**:
- [ ] Engine: `classifyLoopRoute()` / `describeLoopRoute()` extending `classifyDiminishingReturns`;
      fixture table first (sequence, queue, token, budgetSpent → route) including the existing
      `7,7,7,7,4` and `0,0,0` rows; `MEDIUM_N` derived inside from gate content.
- [ ] Route 2b (cosmetic residue) in Outcome branching beside the Diminishing-returns exit: PASS-only
      precondition **stated as an exclusion**, LOWs to `recommendations.future` by id, `**Loop exit**`
      row from `describeLoopRoute`.
- [ ] Route 2c (gate-the-last-fix) as the loop-limit trigger's pre-escalation step in Loop Escalation:
      precondition, the ordinary 5a invocation on the fix's head, the two outcomes.
- [ ] Guards table gains both rows; the "two cycle-3 rules are opposites" paragraph becomes a
      four-way table (stall / finished / cosmetic / budget).
- [ ] §5c and the parity test: the accepting-route set gains 2b and 2c as routes; consumers still
      point at §5c and read the `**Action**` row, whose value set is unchanged.
- [ ] `docs/runbooks/qa-flow.md`: the four-ways-it-ends table and the mermaid (add the missing
      route-2 and escalation edges as well as 2b/2c).
- [ ] Replay fixtures (both sides): PASS+LOW-only after two HIGH-0 gates → 5c; budget spent,
      HIGH-0 medium-falling → half-cycle gate → 5c.

**Dependencies**: Phase 1 (the half-cycle writes `qa_phase`).

### Phase 3: Re-entry after a spent budget

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-resume-contract.md` (§QA Cycle Count Reconstruction),
`skills/develop-task/SKILL.md` and `skills/develop-story/SKILL.md` (the terminal-HALT snapshot writer
and the Phase 0b "Resume / Start fresh" prompt), `shared/resources/pipeline-resume-detector-prompt.md`,
the develop-task / develop-story HALT messages in the step-5-6 doc

**Changes**:
- [ ] Reconstruction rule: `QA_CYCLE = max N over gate.{N}.yml`; `cycles_outside_loop = QA_CYCLE −
      grep -c "^### QA Cycle"`; back-fill each missing entry (gate verdict, HIGH_N, `run outside the
      loop (operator)`). The report count becomes the cross-check, not the source.
- [ ] Phase 0b (both SKILL.md): when `halt_reason` ∈ {loop-limit, not-converging}, present the halt
      message's own three options plus "Resume at 5a with {k} more cycles"; on accept, write
      `extra_cycles_granted: k` into the **lock**; `QA_MAX_CYCLES = 5 + extra_cycles_granted` for this
      run. Do not reuse `MAX_ITER` — that is the Step 3 develop-loop bound.
- [ ] The HALT messages name the re-entry option ("re-run /develop-task to resume with more cycles").
- [ ] Detector prompt reads `extra_cycles_granted` from the lock/snapshot and reports it in `deltas_since_pause`.
- [ ] Contract test: the resume contract, the step doc and both SKILL.md agree on the field name.
- [ ] Replay fixture (both sides): halt at 5, standalone cycle 6 on disk, re-invoke → offers the
      grant → resumes at 5a as cycle 7 with `cycles_outside_loop: 1` back-filled.

**Dependencies**: Phase 1.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-diminishing-returns.js` — `classifyLoopRoute` / `describeLoopRoute` (extends the existing engine)
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — route 2b, route 2c (Loop Escalation), guards table, `qa_phase` writes, HALT messages
3. ✅ `shared/resources/develop-pipeline-on-stop.sh` — `case 5)` reads `qa_phase`
4. ✅ `shared/resources/develop-pipeline-resume-contract.md` — re-entry subsection
5. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` — Phase 0b grant prompt; `extra_cycles_granted` lock write
6. ✅ `shared/resources/pipeline-resume-detector-prompt.md` — reads the grant
7. ✅ `shared/resources/develop-pipeline-hooks.md`, `shared/resources/pipeline-lock-cooperation.md` — `qa_phase` documented

### Files to Modify (Tests)

8. ✅ `shared/resources/qa-diminishing-returns.test.*` (beside the engine) — route fixture table
9. ✅ `shared/resources/advance-pipeline-lock.test.sh` — monotonic pin; `qa_phase` is a valid lock field
10. ✅ `evals/develop-task/step-isolation/`, `evals/develop-story/step-isolation/` — three new replay fixtures each
11. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs` — accepting-route set now includes 2b/2c

### Files to Modify (Documentation)

12. ✅ `docs/runbooks/qa-flow.md` (table + mermaid), `docs/reference/configuration.md` (if a key is added)
13. ✅ `skills/*/references/` — regenerated (`npm run bundle`)

### Files NOT Modified (deliberately)

- `shared/resources/advance-pipeline-lock.sh` — stays monotonic; option B needs no backward move
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — route 2c is an ordinary invocation

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] Lock helper: `advance` still refuses 6 → 5; a lock with `qa_phase` passes `require_parsable_lock`;
      the Stop hook names `/qa-task`, `/qa-fix`, `/review-pr` from `qa_phase` and `/qa-task` when absent.
- [ ] `classifyLoopRoute` as a pure function with a fixture table (sequence, queue, token, budgetSpent
      → route), including the existing `7,7,7,7,4` and `0,0,0` rows; mutation proof: drop the PASS-only
      guard on 2b and a CONCERNS+LOW row must go red.

**Command**: `npm test`

### Integration Tests
- [ ] Replay fixtures for 2b, 2c and re-entry pass under `npm run eval:all`.
- [ ] `pr-review-loop-parity` still forbids paraphrase of the accepting-route set.

### Contract Tests
- [ ] Resume contract, the step doc and both develop-* SKILL.md agree on `extra_cycles_granted` and
      `qa_phase` (one test, four files).

### Performance Tests
Not applicable.

### Consumer Tests
- [ ] Next multi-cycle pipeline run: no hand-edited lock; the loop-exit record names the route taken.

## 9. Success Criteria

### Functional
- [ ] A PASS gate with LOW-only residue after two HIGH-0 cycles reaches 5c without a 5b cycle.
- [ ] A HIGH-0, medium-falling loop that spends its budget gets one gated half-cycle before any
      escalation entry is written; a clean half-cycle gate hands to 5c.
- [ ] `current_step` reads `5` for the whole QA loop; `qa_phase` names the sub-step; no step doc
      instructs a hand `jq` on `current_step`.
- [ ] Re-invocation after a loop-limit halt offers the grant, counts on-disk gates, and back-fills
      the report entries the operator's cycles did not write.

### Performance
- [ ] Cycle cost of route 2c ≤ half a full cycle (no fix, no suite re-run beyond the gate's).

### Code Quality
- [ ] Every new route has a replay fixture and a mutation proof recorded.
- [ ] The accepting-route set is still stated once (§5c) — consumers point, do not restate.

### Migration
- [ ] Observations #72, #77, #95, #100, #112 close naming the PR.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **Route 2b drops a real defect filed as LOW.** Mitigation: LOWs travel to `recommendations.future`
   by id and 5c reads them; the two-cycle HIGH-0 floor.
2. **Lock change breaks the Stop hook's re-prompt.** Mitigation: the hook test covers every
   `qa_phase` value and its absence; option B keeps `current_step` stable so a hook that has not been
   updated still re-prompts `/qa-task` — the loud, re-entrant error rather than the silent skip.
3. **Route 2c's half-cycle re-reviews a head a gate already read.** Mitigation: the precondition
   requires that the last budgeted cycle ran 5b — a fix exists that no gate has seen — and the
   fixture table carries the negative row (budget spent, last cycle routed to 5c → no half-cycle).

### Low Risk
1. Replay fixture drift — the fixtures are git-tracked (see `.gitignore` negation block).

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: a pipeline run misroutes (a HIGH finding reaches 5c), the hook re-prompts the wrong step.
- **Steps**: `git revert` the merge; `npm run bundle`; commit.
- **Validation**: replay suite green on the reverted tree.

### Partial Rollback (1–2 hours)
- Revert Phase 2 only: routes gone, lock and re-entry stay.

### Forward Fix
- A wrong predicate threshold is a one-line fixture-driven change.

### Rollback Triggers
- **Critical**: a HIGH finding exits the loop.
- **Non-critical**: record wording, runbook diagram.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #72, #77, #95, #100, #112) | create-task |
| 2026-09-18 | 1.1 | Review 1 (6/10 → revised): Problem 4 rewritten around report-vs-disk cycle count (no `qa_cycles_completed` field exists); route 2c relocated to the loop-limit pre-escalation step; lock option B decided; predicates extend `qa-diminishing-returns.js`; Files Summary corrected; story-side fixtures scoped; title shortened | review-task |
| 2026-09-18 |  | Status → ready-for-development | review-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: lock position
- [ ] Phase 2: routes 2b / 2c
- [ ] Phase 3: re-entry
- [ ] QA: `task.123.qa.[N].qa-loop-exits-and-re-entry.md`
- [ ] Gate: `task.123.gate.[N].qa-loop-exits-and-re-entry.yml`

## References

- Observations #72, #77 (second half), #95, #100, #112
- task.116 (routes on the queue; §5c is the single statement of the accepting set), task.99 (diminishing-returns exit)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` §Convergence check, §Diminishing-returns exit, §Third-strike

## Notes

Bugs found during QA land at `task.123.bug.[N].[name].md` in this directory.
