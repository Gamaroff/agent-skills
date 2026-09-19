---
id: task.123
title: "[Task 123] The QA loop's guards read only the HIGH count and the lock cannot go backwards"
type: task
description: "Four QA-loop shapes the step-5-6 doc has no route for, each observed burning cycles on a real task: a PASS gate whose open entries are all LOW re-enters a full qa-fix cycle (task.110 ran cycles 12–13 for two nits); a converging medium-only loop with HIGH 0 throughout exhausts the budget and escalates an ungated fix (task.117, five CONCERNS gates); advance-pipeline-lock.sh is monotonic so every 5b→5a re-entry needed a hand-rolled jq (task.108); and a re-invocation after a loop-limit halt has no re-entry rule, so a standalone cycle 6 run by the operator was invisible to the resumed pipeline (task.110). One task, one document to change, one lock helper, one resume-contract subsection. Observations #72, #77, #95, #100, #112."
tags: [develop-task, develop-story, qa-loop, pipeline]
category: refactoring
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-17
updated: 2026-09-19
assignee:
estimated_effort_hours: 8
github_issue: 423
---

# Technical Task: The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Status:** Ready for Review
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
                           qa_max_cycles = QA_CYCLE at resume + k written beside it (QA cycle 1, CR-1: never 5 + k);
                           the loop reads QA_MAX_CYCLES from the lock (not MAX_ITER — that is Step 3's bound)
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
- [x] Record the decision (B) and its reason in the step-5-6 doc's Loop Setup.
- [x] 5a, 5b and 5c each write `qa_phase` (`jq '.qa_phase = "5a"'` … through the lock's atomic-write
      pattern) and leave `current_step` at `5`; `advance-pipeline-lock.sh 6` is no longer called inside the loop.
- [x] `develop-pipeline-on-stop.sh`: `case 5)` reads `qa_phase` → `/qa-task|/qa-story`, `/qa-fix`,
      `/review-pr`; absent `qa_phase` → `/qa-task|/qa-story` (the loud, re-entrant default). `case 6)`
      stays for `develop-bug`, whose map is separate.
- [x] Lock helper test: `advance` still refuses 6 → 5 (monotonic pin); a lock carrying `qa_phase` is
      still a valid object; `--skill qa-fix` etc. still noop.
- [x] Remove the hand-rolled `jq '.current_step = 5'` from any step doc that carries it. *(No step doc carried one — the surface map found the only `.current_step = 5` text in the lock helper's own comments; the doc now states the rule instead, and `qa-loop-lock-fields-parity.test.mjs` fails on a hand `jq` appearing.)*

**Dependencies**: none.

### Phase 2: Routes 2b and 2c

**Risk Level**: Medium

**Files**: `shared/resources/qa-diminishing-returns.js` + its test, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
`evals/develop-task/step-isolation/*`, `evals/develop-story/step-isolation/*`,
`evals/shared/tests/pr-review-loop-parity.test.mjs`, `docs/runbooks/qa-flow.md`

**Changes**:
- [x] Engine: `classifyLoopRoute()` / `describeLoopRoute()` extending `classifyDiminishingReturns`;
      fixture table first (sequence, queue, token, budgetSpent → route) including the existing
      `7,7,7,7,4` and `0,0,0` rows; `MEDIUM_N` derived inside from gate content.
- [x] Route 2b (cosmetic residue) in Outcome branching beside the Diminishing-returns exit: PASS-only
      precondition **stated as an exclusion**, LOWs to `recommendations.future` by id, `**Loop exit**`
      row from `describeLoopRoute`.
- [x] Route 2c (gate-the-last-fix) as the loop-limit trigger's pre-escalation step in Loop Escalation:
      precondition, the ordinary 5a invocation on the fix's head, the two outcomes.
- [x] Guards table gains both rows; the "two cycle-3 rules are opposites" paragraph becomes a
      four-way table (stall / finished / cosmetic / budget).
- [x] §5c and the parity test: the accepting-route set gains 2b and 2c as routes; consumers still
      point at §5c and read the `**Action**` row, whose value set is unchanged.
- [x] `docs/runbooks/qa-flow.md`: the four-ways-it-ends table and the mermaid (add the missing
      route-2 and escalation edges as well as 2b/2c).
- [x] Replay fixtures (both sides): PASS+LOW-only after two HIGH-0 gates → 5c; budget spent,
      HIGH-0 medium-falling → half-cycle gate → 5c.

**Dependencies**: Phase 1 (the half-cycle writes `qa_phase`).

### Phase 3: Re-entry after a spent budget

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-resume-contract.md` (§QA Cycle Count Reconstruction),
`skills/develop-task/SKILL.md` and `skills/develop-story/SKILL.md` (the terminal-HALT snapshot writer
and the Phase 0b "Resume / Start fresh" prompt), `shared/resources/pipeline-resume-detector-prompt.md`,
the develop-task / develop-story HALT messages in the step-5-6 doc

**Changes**:
- [x] Reconstruction rule: `QA_CYCLE = max N over gate.{N}.yml`; `cycles_outside_loop = QA_CYCLE −
      grep -c "^### QA Cycle"`; back-fill each missing entry (gate verdict, HIGH_N, `run outside the
      loop (operator)`). The report count becomes the cross-check, not the source.
- [x] Phase 0b (both SKILL.md): when `halt_reason` ∈ {loop-limit, not-converging}, present the halt
      message's own three options plus "Resume at 5a with {k} more cycles"; on accept, write
      `extra_cycles_granted: k` and `qa_max_cycles: QA_CYCLE + k` into the **lock**; the loop reads
      `QA_MAX_CYCLES` from the lock (absent → 5). *(QA cycle 1, CR-1: the original `5 + k` counted every
      gate written since the budget against the grant.)* Do not reuse `MAX_ITER` — that is the Step 3
      develop-loop bound.
- [x] The HALT messages name the re-entry option ("re-run /develop-task to resume with more cycles").
- [x] Detector prompt reads `extra_cycles_granted` from the lock/snapshot and reports it in `deltas_since_pause`.
- [x] Contract test: the resume contract, the step doc and both SKILL.md agree on the field name.
- [x] Replay fixture (both sides): halt at 5, standalone cycle 6 on disk, re-invoke → offers the
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

8. ✅ `shared/resources/tests/qa-loop-route.test.mjs` (new — the engine's suite lives under `tests/`, not beside it) + 6 gate fixtures under `tests/fixtures/qa-diminishing-returns/` — route fixture table; `shared/resources/set-qa-phase.sh` + `set-qa-phase.test.sh` (new, QA cycle 1 CR-2); `shared/resources/grant-qa-cycles.sh` + `grant-qa-cycles.test.sh` (new, QA cycle 2 C2-CR-1/2)
9. ✅ `shared/resources/advance-pipeline-lock.test.sh` — monotonic pin; `qa_phase` is a valid lock field
10. ✅ `evals/develop-task/step-isolation/`, `evals/develop-story/step-isolation/` — three new replay fixtures each
11. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs` — accepting-route set now includes 2b/2c; `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (new) — `qa_phase` / `extra_cycles_granted` spelled once across eight files

### Files to Modify (Documentation)

12. ✅ `docs/runbooks/qa-flow.md` (table + mermaid); `docs/reference/configuration.md` untouched — no config key was added (`extra_cycles_granted` is a lock field, not config)
13. ✅ `skills/*/references/` — regenerated (`npm run bundle`)

### Files NOT Modified (deliberately)

- `shared/resources/advance-pipeline-lock.sh` — stays monotonic; option B needs no backward move
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — route 2c is an ordinary invocation

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [x] Lock helper: `advance` still refuses 6 → 5; a lock with `qa_phase` passes `require_parsable_lock`;
      the Stop hook names `/qa-task`, `/qa-fix`, `/review-pr` from `qa_phase` and `/qa-task` when absent.
- [x] `classifyLoopRoute` as a pure function with a fixture table (sequence, queue, token, budgetSpent
      → route), including the existing `7,7,7,7,4` and `0,0,0` rows; mutation proof: drop the PASS-only
      guard on 2b and a CONCERNS+LOW row must go red.

**Command**: `npm test`

### Integration Tests
- [x] Replay fixtures for 2b, 2c and re-entry pass under `npm run eval:all`.
- [x] `pr-review-loop-parity` still forbids paraphrase of the accepting-route set.

### Contract Tests
- [x] Resume contract, the step doc and both develop-* SKILL.md agree on `extra_cycles_granted` and
      `qa_phase` (one test, four files).

### Performance Tests
Not applicable.

### Consumer Tests
- [ ] Next multi-cycle pipeline run: no hand-edited lock; the loop-exit record names the route taken.

## 9. Success Criteria

### Functional
- [x] A PASS gate with LOW-only residue after two HIGH-0 cycles reaches 5c without a 5b cycle.
- [x] A HIGH-0, medium-falling loop that spends its budget gets one gated half-cycle before any
      escalation entry is written; a clean half-cycle gate hands to 5c.
- [x] `current_step` reads `5` for the whole QA loop; `qa_phase` names the sub-step; no step doc
      instructs a hand `jq` on `current_step`.
- [x] Re-invocation after a loop-limit halt offers the grant, counts on-disk gates, and back-fills
      the report entries the operator's cycles did not write.

### Performance
- [x] Cycle cost of route 2c ≤ half a full cycle (no fix, no suite re-run beyond the gate's).

### Code Quality
- [x] Every new route has a replay fixture and a mutation proof recorded.
- [x] The accepting-route set is still stated once (§5c) — consumers point, do not restate.

### Migration
- [x] Observations #72, #77, #95, #100, #112 close naming the PR. *(actioned 2026-09-19 — PR #435)*

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

## Implementation Record

**Implemented**: 2026-09-18 → 2026-09-19 (develop, run 1 of `/develop-task`). **Status**: Ready for Review.

### Summary

Three phases, one engine. The QA loop's route decision is now one call — `classifyLoopRoute()` in
`shared/resources/qa-diminishing-returns.js` — returning `diminishing-returns | cosmetic-residue |
gate-the-last-fix | continue`; the lock reads `current_step: 5` for the whole loop with a
`qa_phase: 5a|5b|5c` sub-position the Stop hook names sub-skills from; and a re-invocation after a
loop-limit halt reconstructs the cycle count from the gates on disk, back-fills the report, and offers
`extra_cycles_granted`.

### Approach

- **Phase 1 (option B).** `develop-pipeline-on-stop.sh` gains a `case 5)` that reads `qa_phase`
  (`5b → /qa-fix`, `5c → /review-pr`, else `/qa-task|/qa-story` — the loud default) and asks for the
  end-of-loop advance as `5 → 7`; `case 6)` stays for a pre-task.123 lock; develop-bug's map is
  untouched. The step-5-6 doc's new **Lock position for the loop** subsection names the writer —
  `shared/resources/set-qa-phase.sh`, a script since QA cycle 1 (CR-2: a function defined in one
  fenced block is unreachable from the next), mktemp + mv, never `current_step` — and each of
  5a/5b/5c invokes it first. `advance-pipeline-lock.sh`
  is unchanged — the test suite now pins that `6 → 5` is still refused and that `qa_phase` survives
  noop, advance and `--skill` paths.
- **Phase 2 (routes).** `readTopIssues` now carries `id`; `readGateToken` and `countRaised`
  (MEDIUM/LOW only — HIGH stays the awk's, and the engine suite's group 7 source check still holds)
  are new readers. `classifyLoopRoute` wraps `classifyDiminishingReturns` (still exported; route 2
  first), then route 2b (PASS-only, every open entry LOW, HIGH 0 ×2, cycle ≥ 2), and — with
  `budgetSpent: true` — route 2c (last cycle's Action row reads `Running qa-fix`, HIGH 0 throughout,
  MEDIUM strictly falling over three gates, MEDIUM_N read from the gate itself). `describeLoopRoute`
  delegates route 2's text so the existing pins hold. The doc gains the four-way guards table, the
  Cosmetic-residue section (On-exit list mirrors route 2's), the Gate-the-last-fix pre-escalation step,
  a `**MEDIUM findings**` row, the `Escalating — loop limit reached` Action value, and
  `QA_MAX_CYCLES` in place of the literal 5. §5c enumerates five routes; `pr-review-loop-parity` was
  extended (not paraphrased) to pin items 4 and 5 and the new value set.
- **Phase 3 (re-entry).** The resume contract's reconstruction now reads `max N over gate.{N}.yml`;
  the report count is the cross-check; `CYCLES_OUTSIDE_LOOP` is derived, never stored; back-filled
  entries carry `**Origin**: run outside the loop (operator)`. Both SKILL.md files carry the Phase 0b
  grant prompt and the `extra_cycles_granted` lock write; the detector prompt reports both new fields;
  both HALT messages gain option 4. `MAX_ITER` is untouched.

### Testing

- `npm run ci:fast`: format clean; **3488 pass, 0 fail** (node suites) + all bash suites green
  (`advance-pipeline-lock.test.sh` 37, `develop-pipeline-on-stop.test.sh` 23).
- New: `qa-loop-route.test.mjs` (29 tests, 19-row fixture table + 6 gate fixtures),
  `qa-loop-lock-fields-parity.test.mjs` (5), on-stop scenario 10 (10 rows), lock-helper scenario 7b (7).
- `npm run eval:all`: 34 replay scenarios green incl. the six new fixtures
  (`10-qa-pass-low-only-cosmetic-residue-routes-to-5c`, `11-qa-budget-spent-gate-the-last-fix-half-cycle`,
  `12-qa-reentry-after-loop-limit-with-grant`, on both develop-task and develop-story).
- `bundle:check`, `check:generated`, `validate:all`, `lint:shell` (shellcheck `--severity=warning`): all exit 0.
- **Mutation proofs** (each mutant restored byte-identical afterwards):

  | Mutant | Suite | Red |
  |---|---|---|
  | drop the PASS-only guard on 2b | qa-loop-route | 6 |
  | drop the last-cycle-was-5b guard on 2c | qa-loop-route | 1 |
  | strictly falling → non-strict on 2c | qa-loop-route | 2 |
  | drop HIGH-0-throughout on 2c | qa-loop-route | 2 |
  | 2b reads all entries, not open ones | qa-loop-route | 1 |
  | 2b needs one HIGH-0 gate, not two | qa-loop-route | 1 |
  | Stop hook ignores `qa_phase` | on-stop.test.sh | 4 |
  | Stop hook advances 5 → 6 instead of 5 → 7 | on-stop.test.sh | 8 |

### QA Fix Cycle 1 — 2026-09-19

Gate 1 FAIL (50): five `top_issues[]` entries, all fixed; four advisory findings and the negative-count
note also taken.

- **CR-1 (HIGH)** — the budget is an absolute `qa_max_cycles` on the lock, written by the grant as
  `QA_CYCLE at resume + k`; Loop Setup reads it (absent → 5). Resume contract, both SKILL.md Phase 0b
  blocks, detector prompt, hooks doc updated; the parity test forbids `5 + extra_cycles_granted`
  and pins the two-field write; fixture 12 (both sides) is legal under the rule (budget 8, cycles 7–8).
- **CR-2 (MEDIUM)** — `shared/resources/set-qa-phase.sh` + `set-qa-phase.test.sh` (19, in `npm test`);
  every call site invokes the bundled script from the repository root; the parity test forbids a bare
  `set_qa_phase` and locates the four call sites by section.
- **CR-3 (MEDIUM)** — the Stop hook's step-5 completion sentence is per sub-step (`THEN_WHAT`): 5a/5b
  keep the run in the loop and name the writer; only 5c's conditions the `5 → 7` advance on
  APPROVE/CONCERNS. Scenario 10 gains four rows (27 total).
- **CR-4 (MEDIUM)** — seven "three routes" restatements fixed; `pr-review-loop-parity` reads §5c's count
  and fails any of 15 restaters that disagrees (mutation-proven).
- **CR-5 (LOW)** — fixture 11 asserts the report's `**Half-cycle**` row and Action; the gate carries no
  invented key.
- Advisory: CR-6 (escalation Action values get their own 5c sub-state row → the re-entry rule), CR-7
  (`id` anchored to the key position; fixture row; mutation-proven), CR-8 (CHANGELOG headline), CR-9
  (row label); negative `CYCLES_OUTSIDE_LOOP` defined (report entries with no gate → resume from the
  report's count, warn).
- Verification: `ci:fast` green (3488 node + 7 bash suites incl. the new one); `eval:all` 34 green;
  bundle:check / check:generated / lint:shell / format:check exit 0. One unrelated hang
  (`security-probe.test.mjs` "runProbeSpec validates timeoutMs itself", 60 min under load) re-ran
  green alone, 22/22 — untouched by this diff.

### QA Fix Cycle 2 — 2026-09-19

Gate 2 FAIL (50) — the refute pass found four defects in cycle 1's fixes; all five `top_issues[]` entries fixed, plus C2-CR-6.

- **C2-CR-1 (HIGH) + C2-CR-2** — `shared/resources/grant-qa-cycles.sh` (23-assertion suite, in `npm test`): reconstructs the highest gate on disk, restores the lock from the halt snapshot when the HALT removed it (halt/pause fields dropped), writes both fields atomically with cleanup. Every call site is one line; the parity test forbids inline `jq` and cross-fence `$QA_CYCLE`. The pause doc's lock lifecycle names the restore and the pre-existing general gap.
- **C2-CR-3** — `staleRouteCountPatterns()` derives the forbidden words from a list minus the current one; mutation row over four hypothetical counts.
- **C2-CR-4** — the loop-limit escalation writes `Escalating — loop limit reached` on the last cycle's Action row on every path; fixture 12 snapshots updated.
- **C2-CR-5** — CHANGELOG names `qa_max_cycles`; parity pin now covers CHANGELOG and the `5 + k` spelling.
- **C2-CR-6** — the hook's 5a sentence spells both invocations.
- Verification: `ci:fast` green (3490 node + 8 bash suites); `eval:all` 34; bundle:check / check:generated / lint:shell / format:check exit 0. Mutation proofs: restore disabled → 2 red; `5 + k` in the script → 6 red + parity red.

### QA Fix Cycle 3 — 2026-09-19

Gate 3 CONCERNS (80) — three `top_issues[]` entries fixed, plus the four advisories.

- **C3-CR-1** — the loop-limit escalation writes the `**Action**` row only, on both paths; a real REQUEST CHANGES verdict survives. Parity pins the Action-only wording and forbids the paired write.
- **C3-CR-2** — `grant-qa-cycles.sh` takes the implementation report; base = max(highest gate, report entries); never lowers an existing `qa_max_cycles`. **C3-CR-4** leading-zero `k` refused, budget printed from the lock. **C3-CR-3** `qa_phase: 5a` in the same write. **C3-CR-5** a snapshot for another document refused. Suite 23 → 34.
- **C3-CR-6/7** — subsumed regex replaced by the ASCII-hyphen ordinal; CHANGELOG count fixed.
- Verification: `ci:fast` green (3490 node + 8 bash suites); `eval:all` 34; bundle/format/lint/check:generated exit 0. Mutation proofs: never-lower removed → 1 red; report base ignored → 1 red; paired write restored → parity red.

### QA Fix Cycle 4 — 2026-09-19

Gate 4 CONCERNS (60) — four MEDIUMs, all fixed, plus C4-CR-5/6/7.

- **C4-CR-1** — never-lower guard before the restore, against the lock or the snapshot; `undo_restore` on any later failure; refusal message names the accepted `k` (C4-CR-5); non-integer budget warned (C4-CR-7).
- **C4-CR-2** — one declined-grant statement in the contract's step 4 (no lock, no cycle, halt options); SKILL.md points at it.
- **C4-CR-3** — precedence sentence above the 5c sub-state table; `REQUEST CHANGES` row qualified by its Action; parity pins both.
- **C4-CR-4** — `canon()` resolves both paths with `cd && pwd -P`; absent field accepted; suite rows both ways + prefix-sharing refusal. Suite 34 → 41.
- **C4-CR-6** — preamble says the loop-limit write never touches PR Review.
- Verification: `ci:fast` green (3490 + 8 bash suites); `eval:all` 34; gates exit 0. Mutations: guard disabled → 2 red; string-compare canon → 2 red.

### Deferred Work

- Success criterion **Migration** — deferred out of `/develop` because it needs the PR number; done by the
  orchestrator after Step 4: observations #72, #77, #95, #100, #112 set `actioned` naming PR #435 (2026-09-19).
- Consumer test ("next multi-cycle pipeline run") — a future run, by definition.
- The banner doc's `cycle {CYCLE}/5` strings keep the literal; Loop Setup states that the `5` reads
  `QA_MAX_CYCLES` on a granted re-entry. Rewriting the banner catalogue was out of scope.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-19
**Quality Score**: 60/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.123.qa.4.qa-loop-exits-and-re-entry.md](./task.123.qa.4.qa-loop-exits-and-re-entry.md)
- **Gate File**: [task.123.gate.4.qa-loop-exits-and-re-entry.yml](./task.123.gate.4.qa-loop-exits-and-re-entry.yml)

### Test Coverage Summary
- **Tests Executed**: 3490 node + 8 bash suites + 34 replay scenarios
- **Phases Verified**: 3/3 (2 PASS, 1 CONCERNS)
- **Critical Issues**: 0 HIGH, 4 MEDIUM; bugs 9–10 Closed
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Cycle 4 (scoped since gate 3): cycle-3 findings verified FIXED. Remaining, all in the grant script's refusal paths and the re-entry contract: a refused grant leaves a restored lock (C4-CR-1); the declined-grant path is described three ways (C4-CR-2); two 5c sub-state rows match a loop-limit-via-review entry (C4-CR-3); absolute vs relative doc-dir refused (C4-CR-4). HIGH 1, 1, 0, 0.

## Change Log
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #72, #77, #95, #100, #112) | create-task |
| 2026-09-18 | 1.1 | Review 1 (6/10 → revised): Problem 4 rewritten around report-vs-disk cycle count (no `qa_cycles_completed` field exists); route 2c relocated to the loop-limit pre-escalation step; lock option B decided; predicates extend `qa-diminishing-returns.js`; Files Summary corrected; story-side fixtures scoped; title shortened | review-task |
| 2026-09-18 |  | Status → ready-for-development | review-task |
| 2026-09-19 |  | Implemented — 14 source files modified, 8 new (engine routes, qa_phase hook, re-entry contract, 6 replay fixtures ×2 sides); 3488 node tests + bash suites green; 8 mutants caught | develop |
| 2026-09-19 |  | QA gate FAIL (50/100) — 1 HIGH, 3 MEDIUM, 5 LOW (cycle 1) | qa-task |
| 2026-09-19 |  | QA gate FAIL (50/100) — 1 HIGH, 3 MEDIUM, 2 LOW (cycle 2, refute pass; cycle-1 bugs 1–4 closed) | qa-task |
| 2026-09-19 |  | QA gate CONCERNS (80/100) — 0 HIGH, 2 MEDIUM, 3 LOW (cycle 3, scoped; cycle-2 bugs 5–8 closed) | qa-task |
| 2026-09-19 |  | QA gate CONCERNS (60/100) — 0 HIGH, 4 MEDIUM, 1 LOW (cycle 4, scoped; bugs 9–10 closed) | qa-task |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: lock position
- [x] Phase 2: routes 2b / 2c
- [x] Phase 3: re-entry
- [ ] QA: `task.123.qa.[N].qa-loop-exits-and-re-entry.md`
- [ ] Gate: `task.123.gate.[N].qa-loop-exits-and-re-entry.yml`

## References

- Observations #72, #77 (second half), #95, #100, #112
- task.116 (routes on the queue; §5c is the single statement of the accepting set), task.99 (diminishing-returns exit)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` §Convergence check, §Diminishing-returns exit, §Third-strike

## Notes

Bugs found during QA land at `task.123.bug.[N].[name].md` in this directory.
