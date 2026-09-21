---
id: task.134
title: "[Task 134] The gate-the-last-fix half-cycle keys on the loop's whole HIGH history, not on the fix it exists to gate: a converging 0/1/0/1/0 loop escalated with a one-finding, mutation-proven fix that no gate had read"
type: task
description: "Replace route 2c's 'HIGH 0 throughout' clause with 'the last gate raised no HIGH' — the property the half-cycle actually needs — so a loop whose blockers were each found and fixed inside the loop, and whose last fix closes only non-blocking findings, gets the one gate it is owed instead of a loop-limit HALT and an operator grant."
tags: [pipeline, qa-loop, routes, develop-task, develop-story]
category: refactoring
status: accepted
priority: Medium
created: 2026-09-20
updated: 2026-09-21
assignee:
estimated_effort_hours: 2
pr_number: 452
github_issue: 443
risk_level: low
---

# Technical Task: Route 2c keys on HIGH history, not on the last fix it exists to gate

**Status:** Accepted
**GitHub Issue**: [#443](https://github.com/Gamaroff/agent-skills/issues/443)

---

## 1. Overview

The Gate-the-last-fix half-cycle (route 2c, `classifyLoopRoute` in `shared/resources/qa-diminishing-returns.js`, obs #112) exists for a loop whose budget ends on a **fix** — cycle N's 5b lands a commit no gate reads. It grants one 5a. Its conditions were written from task.117's shape (five CONCERNS gates, HIGH 0 throughout, MEDIUM falling) and one of them — `HIGH was not 0 throughout` → `high-findings-seen` — encodes that history rather than the property that makes the half-cycle safe. Task.130 ran HIGH `0, 1, 0, 1, 0`: each HIGH a new defect found by executing prose, each fixed in one cycle, none recurring; MEDIUM `2, 2, 3, 2, 1` — strictly falling over the last three gates; cycle 5's fix closed one MEDIUM, mutation-proven both ways. Route 2c declined (`high-findings-seen`), the loop escalated, the operator granted two cycles, and cycle 6's gate read the fix clean in 120 seconds. The half-cycle could not fire on exactly the shape it exists for.

**Scope**: `shared/resources/qa-diminishing-returns.js` (route 2c predicate and reason), `shared/resources/tests/qa-loop-route.test.mjs` (fixture rows), `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (route table row, § Gate-the-last-fix conditions), `shared/resources/develop-pipeline-resume-contract.md` (the 5c sub-state row that names `high-findings-seen`, if any), bundled copies, CHANGELOG.

**Key deliverables**: (1) the clause reads the **last gate's** HIGH count — `raised.high === 0` from `countRaised(latestGateContent)`, which the function already computes — and declines with `last-gate-raised-high` when it is not; the whole-history read is removed. (2) Fixture rows: task.130's exact sequence fires; task.117's still fires; a gate N with a HIGH declines; a HIGH at cycle N−1 fixed by cycle N's 5b with gate N clean fires. (3) The step-5-6 route table and § conditions restate the rule once, in the engine's words, with the task.130 case as the counter-example the old clause missed.

**Expected outcome**: a loop that ends on a non-blocking fix after a clean last gate gets its gate without a HALT, whatever its earlier HIGH history; a loop whose last gate still carries a HIGH escalates with its evidence, as before.

---

## 2. Motivation

### Current Problems

- **The clause reads history, not state.** `nonZero = highCounts.slice(0, cycle).filter(h => h !== 0)` declines on any HIGH ever raised. A HIGH raised at cycle 2 and closed at cycle 2's 5b — verified closed by gate 3 — is not evidence about cycle N's fix.
- **The rationale in the reason string does not match the check.** *"a loop that raised a blocker at any cycle escalates with its evidence"* — but the evidence for a closed blocker is the gate that closed it, and that gate already ran. Escalating a loop for a blocker it fixed three cycles ago hands the operator a HALT with nothing outstanding.
- **The cost lands as an operator grant.** On task.130 the decline produced: a loop-limit HALT, an escalation entry, an `AskUserQuestion`, `grant-qa-cycles.sh`, a lock restore, and a sixth cycle whose only work was the gate 2c would have run. The half-cycle exists to avoid precisely that round trip (obs #112).
- **The two clauses that carry the real safety are already there.** `last-cycle-not-a-fix` (the fix must exist and be ungated) and `medium-not-falling` (the loop must be converging) are the evidence that one more gate would clear; the HIGH clause adds nothing they do not, once it reads the last gate.

### Benefits

- A converging loop ends through its gate, not through an escalation and a grant.
- The reason a run escalates matches what is outstanding on its last gate.
- One fewer human decision per loop that spent its budget one gate early.

---

## 3. Technical Background

### Current Architecture

`classifyLoopRoute(input)` with `budgetSpent: true` (called from Loop Escalation's **Loop limit** trigger) evaluates, in order: `last-cycle-not-a-fix` (Action row must read `Running qa-fix …`), `below-cycle-floor` (cycle ≥ 3), `high-counts-missing`, **`high-findings-seen`** (`highCounts.slice(0, cycle)` all zero), `gate-unreadable` (`countRaised(latestGateContent)` null), `medium-counts-missing`, `medium-not-falling` (`mN < m1 < m2` where `mN` is read from the gate and `m1`, `m2` from the sequence), then `gate-the-last-fix`. `countRaised` already returns `{ high, medium, low }` for gate N; its `high` is unused by route 2c today.

`develop-pipeline-step-5-6-qa-loop.md` § "Gate-the-last-fix half-cycle" lists the conditions as (1) Action row is a fix, (2) `HIGH_k == 0` for every `k ≤ N`, (3) MEDIUM strictly falling over the last three gates; the route table row says *"HIGH was 0 throughout"*. `qa-loop-route.test.mjs` "route 2c" rows pin the task.117 shape and the three negatives.

### Target Architecture

The HIGH clause becomes a read of gate N:

```js
const raised = countRaised(latestGateContent);          // moved above the HIGH check
if (raised === null) return route(CONTINUE, "gate-unreadable", …);
if (raised.high > 0) {
  return route(CONTINUE, "last-gate-raised-high",
    `gate ${cycle} raised ${raised.high} HIGH — the fix awaiting a gate closes a blocker, and a blocker's fix is read by a full cycle (5a, 5b if needed, 5c), not a half-cycle; the loop escalates with that evidence`);
}
```

`highCounts` is still required (`high-counts-missing` stays — the Convergence check and route 2 read it, and a missing sequence is a report defect) but no longer gates 2c. The docs restate the condition once each: *"gate N raised no HIGH"*, with a sentence naming task.130 as the shape the whole-history read missed and task.117 as the shape both forms accept.

### Important Clarifications

- **Why the last gate and not the last two.** Route 2 (Diminishing-returns) and 2b (Cosmetic-residue) need two quiet gates because they *exit* the loop. Route 2c does not exit — it runs a full 5a whose gate then decides. The safety of a half-cycle is that its gate is adversarial; what it must not do is skip a *5b* the fix needs, and a fix that closes only non-HIGH findings after a clean gate is exactly the fix that needs no further 5b if its gate reads clean.
- **`last-cycle-not-a-fix` and `medium-not-falling` are unchanged.** They are the convergence evidence; this task narrows one clause and touches nothing else in the classifier.
- **The Convergence check is unaffected.** It reads the HIGH sequence for a stall (HIGH remaining and not falling); task.130's alternating sequence never tripped it and would not under this change.

---

## 4. Scope

### In Scope

✅ `shared/resources/qa-diminishing-returns.js` — route 2c's HIGH clause and reason string
✅ `shared/resources/tests/qa-loop-route.test.mjs` — four fixture rows
✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — route table row; § Gate-the-last-fix condition 2 and its rationale paragraph
✅ `shared/resources/develop-pipeline-resume-contract.md` — any row naming `high-findings-seen` (grep before editing)
✅ `npm run bundle`; CHANGELOG entry

### Out of Scope

❌ Routes 2 and 2b, the Convergence check, the third-strike rule — unchanged
❌ The grant path (`grant-qa-cycles.sh`) — unchanged; it remains the recovery when 2c declines for a real reason
❌ Task.133's residue; task.135's gate timestamps

---

## 5. Breaking Changes

None — API stable. `classifyLoopRoute`'s signature and every other reason value are unchanged; `high-findings-seen` is replaced by `last-gate-raised-high`, and no shipped prose or test outside this task matches the old string (verify with `grep -rn high-findings-seen shared skills evals docs` before and after; the only expected hits are task.130's trail, which is history).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.134.plan.route-2c-keyed-on-last-fix.md](task.134.plan.route-2c-keyed-on-last-fix.md)

### Phase 1: Fixture rows first (red)

**Risk**: Low
**Files**: `shared/resources/tests/qa-loop-route.test.mjs`

- [ ] Row "2c positive: task.130 shape" — `cycle: 5, highCounts: [0,1,0,1,0], mediumCounts: [2,2,3,2], gate: CONCERNS with 1 MEDIUM open, lastCycleAction: "Running qa-fix (cycle 5 of 5)"` → expects `gate-the-last-fix` (red today: `high-findings-seen`)
- [ ] Row "2c negative: gate N raised a HIGH" — same, gate with 1 HIGH → `last-gate-raised-high`
- [ ] Row "2c positive: HIGH at N−1 closed by N's fix" — `highCounts: [0,0,1,0]`, gate 4 clean, MEDIUM `3,2 → 1` → fires
- [ ] Existing task.117 row and the three negatives unchanged and still green after Phase 2

### Phase 2: The predicate

**Risk**: Low
**Files**: `shared/resources/qa-diminishing-returns.js`

- [ ] Move `countRaised` above the HIGH check; replace the whole-history read with `raised.high > 0` → `last-gate-raised-high`; keep `high-counts-missing`
- [ ] Mutation: restore the whole-history clause → the task.130 row red; drop the new clause → the "gate N raised a HIGH" row red

### Phase 3: The two statements of the rule

**Risk**: Low
**Files**: `develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-resume-contract.md`, CHANGELOG

- [ ] Route table row: *"the budget is spent, **gate N raised no HIGH**, MEDIUM fell strictly for three cycles, and the last cycle's fix has no gate"*
- [ ] § conditions: condition 2 rewritten; a sentence naming task.130 (0/1/0/1/0, one-MEDIUM fix, declined, granted, gated clean in 120 s) as the shape the history read missed
- [ ] Resume contract: update any `high-findings-seen` mention; `npm run bundle`; CHANGELOG [Unreleased]

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-diminishing-returns.js` — route 2c clause

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/qa-loop-route.test.mjs` — four rows

### Files to Modify (Documentation)

3. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — route table + § conditions
4. ✅ `shared/resources/develop-pipeline-resume-contract.md` — reason-string mention (if present)
5. ✅ `CHANGELOG.md`
6. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `qa-loop-route.test.mjs` is the spec the step-5-6 sections are written from; the four new rows plus the existing 2c rows.
- **Mutation proofs**: whole-history clause restored → task.130 row red; new clause removed → gate-N-HIGH row red.
- **Command**: `command node --test shared/resources/tests/qa-loop-route.test.mjs`; `npm run ci:fast`.

### Integration Tests

- `npm run eval:develop-task` — no fixture exercises the loop-limit trigger today; add none (the classifier is a pure function with its own fixture table).

### Contract Tests

- `grep -rn high-findings-seen` over `shared skills evals docs` (excluding `docs/tasks/task.130*`) returns nothing after Phase 3; `bundle:check` 0.

### Performance Tests

Not applicable.

### Consumer Tests

- `develop-story` shares the step file and the engine; the bundled copies are regenerated and identical.

---

## 9. Success Criteria

### Functional

- [ ] `classifyLoopRoute` returns `gate-the-last-fix` on task.130's recorded inputs
- [ ] A gate N carrying a HIGH returns `last-gate-raised-high`
- [ ] Task.117's shape and the three existing negatives are unchanged

### Performance

- [ ] Not applicable — pure function

### Code Quality

- [ ] Both mutation proofs recorded; `ci:fast`, `bundle:check`, Prettier green

### Migration

- [ ] The rule is stated once in the engine, once in the route table, once in § conditions — all three in the same words; CHANGELOG entry

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A half-cycle runs on a fix whose earlier HIGH regressed**
   - **Risk**: cycle N's fix reopens a HIGH closed at cycle N−2; gate N was clean because the regression is in N's fix.
   - **Probability**: Low · **Impact**: Low — the half-cycle *is* a full adversarial 5a on that head; a reopened HIGH is found there and the loop escalates with it (the on-exit branch "any open entry → escalation").
   - **Mitigation**: none needed beyond the existing on-exit table; state it in § conditions.

### Low Risk Areas

1. **The reason string is cited somewhere unexpected** — the grep in Phase 3 is the check; the resume contract's 5c sub-state table is the one known reader.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a half-cycle fires on a loop that should have escalated (a HIGH on gate N slipped through the count).
- **Steps**: revert the Phase 2 commit; `npm run bundle`; push.
- **Validation**: the gate-N-HIGH fixture row is the check.

### Partial Rollback (1-2 hours)

- **When to use**: the docs disagree with the engine after a partial merge — revert Phase 3 alone and re-run the `grep`.

### Forward Fix (< 4 hours)

- **When to use**: a reason string or a doc sentence is wrong; fix in place with the fixture rows re-run.

### Rollback Triggers

- **Critical**: 2c fires with a HIGH open on gate N.
- **Non-critical**: wording.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — obs #139; task.130 loop-limit escalation (route 2c declined `high-findings-seen`) | create-task |

| 2026-09-21 |  | Implemented — staged #139 fix installed: `high-on-last-gate` reads `highCounts[cycle-1]`; step-5-6 route table + § conditions; +2 fixture rows (32/32), mutation-proved | manual |
| 2026-09-21 | 1.1 | Accepted (PR #452) — route 2c fires on task.130's shape and declines a HIGH on the last gate. Hand-driven quick win: no QA loop, no DoD file; the tests named here are the evidence | manual |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: fixture rows
- [x] Phase 2: predicate
- [x] Phase 3: the two statements
- [ ] QA: `task.134.qa.[N].route-2c-keyed-on-last-fix.md`
- [ ] Gate: `task.134.gate.[N].route-2c-keyed-on-last-fix.yml`

## References

- Observation #139; #112 (why route 2c exists)
- `docs/tasks/task.130.…/task.130.implementation.1.…-initial-run.md` § Issues Log › QA Loop Limit Reached — the declined run, with the classifier's JSON
- `docs/tasks/task.123.*` — the task that shipped routes 2b/2c
- `shared/resources/tests/qa-loop-route.test.mjs` — the fixture table the step file is written from

## Notes

- **Accepted 2026-09-21 without the pipeline (PR #452).** The reason string shipped as `high-on-last-gate` (the staged name), not the `last-gate-raised-high` this document proposed; the engine reads the HIGH sequence's last entry rather than re-counting the gate — the same value.
- QA artifacts land beside this file: `task.134.qa.[N].*.md`, `task.134.bug.[N].*.md`, `task.134.gate.[N].*.yml`.
- Independent of tasks 133 and 135. Touches `develop-pipeline-step-5-6-qa-loop.md`, which task.135 also cites but does not edit.
