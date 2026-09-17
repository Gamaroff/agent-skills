---
id: task.123
title: "[Task 123] The QA loop's guards read only the HIGH count and the lock cannot go backwards: a cosmetic-residue exit, a medium-only convergence reading, a gate-the-last-fix half-cycle, a lock that expresses 5b→5a, and a re-entry rule after a spent budget"
type: task
description: "Four QA-loop shapes the step-5-6 doc has no route for, each observed burning cycles on a real task: a PASS gate whose open entries are all LOW re-enters a full qa-fix cycle (task.110 ran cycles 12–13 for two nits); a converging medium-only loop with HIGH 0 throughout exhausts the budget and escalates an ungated fix (task.117, five CONCERNS gates); advance-pipeline-lock.sh is monotonic so every 5b→5a re-entry needed a hand-rolled jq (task.108); and a re-invocation after a loop-limit halt has no re-entry rule, so a standalone cycle 6 run by the operator was invisible to the resumed pipeline (task.110). One task, one document to change, one lock helper, one resume-contract subsection. Observations #72, #77, #95, #100, #112."
tags: [develop-task, develop-story, qa-loop, pipeline]
category: refactoring
status: planned
priority: High
risk_level: medium
created: 2026-09-17
updated: 2026-09-17
assignee:
estimated_effort_hours: 8
github_issue: 423
---

# Technical Task: The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Status:** Planned
**GitHub Issue**: [#423](https://github.com/Gamaroff/agent-skills/issues/423)

---

## 1. Overview

`develop-pipeline-step-5-6-qa-loop.md` routes every cycle on the gate's open queue and guards the
loop with two HIGH-count readings: the Convergence check (HIGH remains and stops falling →
escalate) and the Diminishing-returns exit (HIGH gone and residue is test machinery → 5c). Every
other shape falls through to a full `qa-fix` cycle or to the budget. This task adds the routes the
loop has been improvising, gives the lock helper a way to express the loop's documented backward
move, and writes the re-entry rule for a pipeline re-invoked after its budget is spent.

**Scope**: the step-5-6 doc's Outcome branching, its two guards and their fixture rows; the
`advance-pipeline-lock.sh` helper; the resume contract's halt-snapshot fields and Phase 0b prompt;
the corresponding eval replay fixtures.

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
3. **The lock helper is monotonic and the loop is not.** `advance-pipeline-lock.sh` treats
   `next <= current` as a no-op; 5b (`current_step: 6`) legitimately returns to 5a (`5`). On task.108
   every re-entry needed `jq '.current_step = 5'` by hand, and a stale `6` during a re-review would
   have had the Stop hook re-prompt `/qa-fix` on a gate that had not been rewritten (#72).
4. **No re-entry rule after a loop-limit halt.** The halt message offers three options; Phase 0b
   offers "Resume / Start fresh". The snapshot records `qa_cycles_completed: 5` with no field for
   cycles run outside the loop. On task.110 the operator ran a standalone cycle 6 between halt and
   re-invocation, and the resumed pipeline could not see it (#95).

### Benefits

1. A clean PASS with cosmetic residue reaches 5c in one step, with the LOWs carried in
   `recommendations.future` — the same treatment route 2 already gives test machinery.
2. A converging medium-only loop exits with a **gated** fix: one cheap "gate the last fix" half-cycle
   (review + gate, no fix) instead of a budget-driven escalation of an ungated one.
3. The lock records the loop's true position; no orchestrator edits it by hand; the Stop hook's
   re-prompt names the right step.
4. A re-invoked pipeline reconstructs the cycle count from the gates on disk, back-fills the report,
   and offers the halt's own options plus an explicit extra-cycle grant.
5. Five observations close against one document change.

## 3. Technical Background

### Current Architecture

```
step-5-6 doc, Outcome branching (five arms + malformed HALT; task.116)
  any open top_issues[] entry → Convergence check → Diminishing-returns exit → 5b
  Convergence:  HIGH_N > 0 AND flat across two cycles          → escalate   (precondition staged by obs review 2026-09-17)
  Diminishing:  HIGH_N == 0 AND residue ⊆ testArtifactGlobs AND no NFR CONCERNS → 5c
advance-pipeline-lock.sh   next <= current → noop                (monotonic)
resume contract            halt snapshot: qa_cycles_completed; Phase 0b: Resume | Start fresh
```

### Target Architecture

```
Outcome branching gains two routes, evaluated after the Convergence check:
  route 2b  cosmetic residue:  gate PASS, every open entry severity: low, HIGH == 0 for 2 cycles
            → 5c, LOWs moved to recommendations.future, recorded as `**Loop exit**: cosmetic-residue`
  route 2c  gate-the-last-fix: cycle ≥ 3, HIGH == 0 throughout, MEDIUM strictly falling,
            findings confined to files the previous fix changed
            → one half-cycle: qa-{task,story} in review-only mode (no 5b), then 5c on PASS/CONCERNS-empty
advance-pipeline-lock.sh   --set N  (explicit, logged; the only way backwards)  OR
                           current_step stays 5 for the whole loop + qa_cycle field   — pick one, state it
resume contract            halt snapshot: qa_cycles_completed, cycles_outside_loop, extra_cycles_granted
                           Phase 0b on halt_reason: loop-limit → the halt's own options + "resume at 5a with {k} more cycles"
                           cycle count reconstructed from max gate.{N} on disk, never from the snapshot alone
```

### Important Clarifications

- **Route 2b is not a way to drop findings.** The LOWs go to `recommendations.future` by id, and
  5c's conformance lens reads that list. Two consecutive HIGH-0 cycles is the floor so a first PASS
  is not exempt from its own review.
- **Route 2c is the cheaper half of a cycle, not a skipped one.** The last fix is reviewed and gated;
  only the fix step is omitted because there is nothing to fix. If the half-cycle's gate opens a
  new HIGH, the loop continues normally and the guards read the new sequence.
- **The lock choice is a design decision to be made in Phase 1 and stated in the doc.** Option A
  (`--set N`, explicit backward move, logged) is smaller; option B (`current_step` stays 5, a
  `qa_cycle` field carries position) is truer to "the QA loop is one step with sub-phases" and is
  what the Stop hook's re-prompt actually needs. Prefer B unless the hook change is larger than
  expected; record the reason either way.
- **Re-entry reconstructs from disk.** The highest `gate.{N}` on disk is the cycle count; a
  `### QA Cycle {N}` entry the report lacks is back-filled and marked `run outside the loop`.

## 4. Scope

### In Scope

✅ Step-5-6 doc: routes 2b and 2c, their fixture rows beside the existing worked examples, the
   Outcome-branching table, the Loop-exit record values.
✅ `advance-pipeline-lock.sh` and its test: the backward move (A or B), and the Stop hook's reading of it.
✅ Resume contract: the two snapshot fields, the Phase 0b prompt variant, the reconstruction rule.
✅ Eval replay fixtures under `evals/develop-task/step-isolation/`: one per new route, one for re-entry.
✅ `docs/runbooks/qa-flow.md` and the qa-flow mermaid (task.116 left a route-2 edge missing; add 2b/2c).
✅ `npm run bundle`.

### Out of Scope

❌ Changing what `qa-task` / `qa-story` put in `top_issues[]` (obs #100's alternative).
❌ The HIGH_N > 0 precondition on the Convergence check — staged by the 2026-09-17 observation review.
❌ The third-strike mechanism granularity — staged by the same review.

## 5. Breaking Changes

None for consumers. A pipeline resumed across this change reads the new snapshot fields as absent
(`0`) and behaves as today.

## 6. Implementation Plan

> Detailed implementation guide: [task.123.plan.qa-loop-exits-and-re-entry.md](task.123.plan.qa-loop-exits-and-re-entry.md)

### Phase 1: Lock position for the loop

**Risk Level**: Medium

**Files**: `shared/resources/advance-pipeline-lock.sh`, its test, `shared/resources/develop-pipeline-on-stop.sh`,
`shared/resources/develop-pipeline-hooks.md`

**Changes**:
- [ ] Decide A or B (see Clarifications); record the decision and reason in the step-5-6 doc.
- [ ] Implement; the helper's test covers the backward move and the hook's re-prompt names 5a during a re-review.
- [ ] Remove the hand-rolled `jq` from any step doc that carries it.

**Dependencies**: none.

### Phase 2: Routes 2b and 2c

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `evals/develop-task/step-isolation/*`,
`docs/runbooks/qa-flow.md`

**Changes**:
- [ ] Route 2b (cosmetic residue) with its precondition, record value and fixture row.
- [ ] Route 2c (gate-the-last-fix half-cycle) with its precondition, the review-only invocation of
      `qa-{task,story}`, and the sequence it hands back to the guards.
- [ ] Guards table gains both rows; the "two cycle-3 rules are opposites" paragraph becomes three.
- [ ] Replay fixtures: PASS+LOW-only → 5c; HIGH-0 medium-falling → half-cycle → 5c.

**Dependencies**: Phase 1 (the half-cycle moves the lock).

### Phase 3: Re-entry after a spent budget

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-resume-contract.md`, the halt-snapshot writer in the
step-5-6 doc, `shared/resources/pipeline-resume-detector-prompt.md`

**Changes**:
- [ ] Snapshot fields `cycles_outside_loop`, `extra_cycles_granted`; the halt message names them.
- [ ] Phase 0b: when `halt_reason` is a loop escalation, present the halt's own options plus the
      extra-cycle grant; record the grant in the lock.
- [ ] Reconstruction rule: cycle count from `max(gate.{N})`; back-fill report entries marked
      `run outside the loop`.
- [ ] Replay fixture: halt at 5, standalone cycle 6 on disk, re-invoke → resumes at 5a as cycle 7.

**Dependencies**: Phase 1.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — routes, guards table, snapshot fields
2. ✅ `shared/resources/advance-pipeline-lock.sh` — backward move
3. ✅ `shared/resources/develop-pipeline-on-stop.sh` — read the loop position
4. ✅ `shared/resources/develop-pipeline-resume-contract.md` — re-entry subsection
5. ✅ `shared/resources/pipeline-resume-detector-prompt.md` — reconstruction rule

### Files to Modify (Tests)

6. ✅ `shared/resources/tests/advance-pipeline-lock.test.*` (or the hooks test) — backward move
7. ✅ `evals/develop-task/step-isolation/` — three new replay fixtures
8. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs` — accepting-route set now includes 2b/2c

### Files to Modify (Documentation)

9. ✅ `docs/runbooks/qa-flow.md`, `docs/reference/configuration.md` (if a key is added)
10. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] Lock helper: 6 → 5 via the chosen mechanism; monotonic elsewhere; logged.
- [ ] Route predicates as pure functions with a fixture table (sequence → route), including the
      existing `7,7,7,7,4` and `0,0,0` rows.

**Command**: `npm test`

### Integration Tests
- [ ] Replay fixtures for 2b, 2c and re-entry pass under `npm run eval:all`.
- [ ] `pr-review-loop-parity` still forbids paraphrase of the accepting-route set.

### Contract Tests
- [ ] Resume contract and the step doc agree on snapshot field names (one test, both files).

### Performance Tests
Not applicable.

### Consumer Tests
- [ ] Next multi-cycle pipeline run: no hand-edited lock; the loop-exit record names the route taken.

## 9. Success Criteria

### Functional
- [ ] A PASS gate with LOW-only residue after two HIGH-0 cycles reaches 5c without a 5b cycle.
- [ ] A HIGH-0, medium-falling loop exits through a gated half-cycle, never through the budget.
- [ ] No step doc instructs a hand `jq` on the lock.
- [ ] Re-invocation after a loop-limit halt offers the grant and counts on-disk gates.

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
2. **Lock change breaks the Stop hook's re-prompt.** Mitigation: the hook test covers the re-review
   state; option B keeps `current_step` stable and is the smaller hook change.

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
