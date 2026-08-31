---
id: task.71
title: "[Task 71] Make the selection floor equal what the dispatching pipeline accepts"
type: task
description: "develop-task accepts draft and planned and promotes them via its own Step 2 review, but select-next.mjs excludes both from the frontier. A filed task is therefore invisible to /develop-next until someone remembers to review it by hand."
tags: [develop-next, selection, eligibility-floor, registries, automation]
category: infrastructure
status: ready-for-development
priority: High
risk_level: medium
created: 2026-08-31
updated: 2026-08-31
assignee:
depends_on: task.66
estimated_effort_hours: 8
---

# Technical Task: Make the selection floor equal what the dispatching pipeline accepts

**Status:** Ready for Development

---

## 1. Overview

`select-next.mjs` admits a task to the frontier only at `ready-for-development` or `in-progress`. `develop-task` accepts `draft` and `planned` as well, and promotes them through its own Step 2 review. Widen the floor so it equals what the dispatcher accepts, and enforce the equality with a test.

**Scope**: one constant, one test, and the prose that explains the rule.

---

## 2. Motivation

### Current Problems

1. **A freshly filed task is invisible to `/develop-next`.** `/create-task` produces `status: draft`. The floor excludes `draft`. So every task enters the world outside the frontier and stays there until a human remembers to run `/review-task` — which is exactly the manual tracking the registry fallback was built to remove.
2. **The selector refuses work the dispatcher would accept.** `develop-task` Phase 0c: *"`Draft` → Note in the implementation report. Proceed — Step 2 (`/review-task`) will validate and update the status autonomously. Do NOT ask the user."* The pipeline is ready for a draft; the selector will not nominate one.
3. **The repo's own rule permits the wider floor.** Task 65 stated it as: *"The floor must be a **subset of the statuses the dispatching pipeline accepts** — that is the rule, and those values are only its current answer."* `{draft, planned}` are inside that set. The current floor is a strict subset where it could be an equality.
4. **The safety this buys already exists one layer down.** `develop-task` HALTs when `review-task` returns NEEDS REVISION or REQUIRES REWORK. A draft that is not ready is stopped by the review, not by being hidden from selection. The floor is duplicating a gate that already works, and charging manual toil for it.
5. **This reproduces the exact failure task 65 was written about.** That task existed because a filed, registered bug was invisible to the selector and an overnight run reported `roadmap-complete` while real work sat waiting. A filed, registered *task* is invisible in precisely the same way, for a different reason.

### Benefits

1. **File a task and forget it.** `/create-task` → it is in the frontier. No promotion step to remember.
2. **The floor stops drifting from the dispatcher**, because a test asserts equality rather than a one-directional subset.
3. **Small and reversible** — one constant, one test.

---

## 3. Technical Background

### Current architecture

`skills/develop-next/scripts/select-next.mjs:84-88`:

```js
export const BUG_ELIGIBLE_STATUSES = new Set(["new", "reopened"]);
export const TASK_ELIGIBLE_STATUSES = new Set([
  "ready-for-development",
  "in-progress",
]);
```

`--lint` reports the exclusion explicitly:

```
"documentStatus": "draft",
"eligible": false,
"reason": "document status draft — outside the task eligibility floor (ready-for-development, in-progress)"
```

### Target architecture

```js
export const TASK_ELIGIBLE_STATUSES = new Set([
  "draft",
  "planned",
  "ready-for-development",
  "in-progress",
]);
```

Equal to `develop-task`'s accepted set. `ready-for-review`, `accepted` and `cancelled` stay out — the dispatcher HALTs on all three, so selecting one would hand an unattended loop work it then refuses.

### Important clarifications

- **This is a widening, not a removal.** The floor still exists and still excludes three statuses. What changes is that it stops being stricter than the thing it feeds.
- **The review gate moves, it does not disappear.** A draft still gets reviewed before development — by `develop-task` Step 2, which is where the review belongs and where it already halts on a bad verdict.
- **The bug axis needs checking, not assuming.** `BUG_ELIGIBLE_STATUSES = {new, reopened}` may or may not match what `develop-bug` accepts. Phase 3 checks; it does not presume the same gap exists.

---

## 4. Scope

### In Scope

✅ Add `draft` and `planned` to `TASK_ELIGIBLE_STATUSES`
✅ A test asserting the floor **equals** the dispatcher's accepted set, parsed from `develop-task`'s own status table
✅ Check the bug axis against `develop-bug`'s accepted set; align only if a genuine gap exists
✅ Update the prose that explains the floor — `select-next.mjs` header comment and `references/roadmap-selection.md`
✅ A CHANGELOG entry, since this changes what an unattended loop will pick up

### Out of Scope

❌ **Removing the floor** — `ready-for-review`, `accepted` and `cancelled` must stay excluded
❌ **Changing roadmap precedence** — the registries remain a fallback consulted only at `roadmap-complete`
❌ **Changing what `develop-task` accepts** — this task moves the selector to match the dispatcher, never the reverse
❌ Retro-promoting existing draft tasks — they become selectable automatically

---

## 5. Breaking Changes

**Behavioural, and worth stating plainly**: after this lands, an unattended `/loop /develop-next` will pick up `draft` and `planned` tasks it previously skipped. That is the intent. The practical effect is that a stub or half-written task can consume one pipeline run and halt at Step 2 with review findings, where previously it would have been silently ignored.

That trade is deliberate: a wasted cycle is visible and recoverable; invisibility is neither.

No API or schema changes.

---

## 6. Implementation Plan

### Phase 1: Widen the floor

**Risk Level**: Low

**Files**: `skills/develop-next/scripts/select-next.mjs`

**Changes**:
- [ ] Add `draft` and `planned` to `TASK_ELIGIBLE_STATUSES`
- [ ] Update the header comment to say the floor **equals** the dispatcher's accepted set, and why
- [ ] Update the `--lint` exclusion message so it names the new floor accurately

**Dependencies**: none

---

### Phase 2: Enforce the equality with a test

**Risk Level**: Medium

**Files**: `evals/develop-next/unit/select-next.test.mjs`

**Changes**:
- [ ] Parse `develop-task`'s status table out of `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
- [ ] Derive the accepted set: rows whose action is "Proceed" (in any form), excluding every HALT row
- [ ] Assert `TASK_ELIGIBLE_STATUSES` **equals** that set — not merely a subset
- [ ] The existing subset test is superseded; replace it rather than keeping both, so there is one rule
- [ ] Fail with a message naming which statuses diverged and in which direction

**Dependencies**: Phase 1

---

### Phase 3: Check the bug axis

**Risk Level**: Low

**Files**: `skills/develop-next/scripts/select-next.mjs`, `evals/develop-next/unit/select-next.test.mjs`

**Changes**:
- [ ] Read `develop-bug`'s accepted-status table
- [ ] Compare with `BUG_ELIGIBLE_STATUSES = {new, reopened}`
- [ ] **If they already match, change nothing** and record that in the implementation report — a symmetrical-looking fix applied where no gap exists is its own defect
- [ ] If they diverge, align and extend the equality test to cover bugs too

**Dependencies**: Phase 2

---

### Phase 4: Prose and changelog

**Risk Level**: Low

**Files**: `skills/develop-next/references/roadmap-selection.md`, `CHANGELOG.md`

**Changes**:
- [ ] Update the "eligibility floor" section: the floor is now equality, and the review gate lives in `develop-task` Step 2
- [ ] CHANGELOG entry under `[Unreleased] → Changed`, stating the behavioural change for unattended loops
- [ ] Note the interaction with roadmap precedence — the registries are still a fallback, so a widened floor changes nothing until the roadmap is complete

**Dependencies**: Phases 1-3

---

## 7. Files Summary

### Files to Modify

1. ✅ `skills/develop-next/scripts/select-next.mjs` — the constant and its explanation
2. ✅ `evals/develop-next/unit/select-next.test.mjs` — equality test replacing the subset test
3. ✅ `skills/develop-next/references/roadmap-selection.md` — the floor's documentation
4. ✅ `CHANGELOG.md` — `[Unreleased] → Changed`

---

## 8. Testing Strategy

### Unit Tests

- [ ] A `draft` task in the registry is now `eligible: true`
- [ ] A `planned` task is `eligible: true`
- [ ] `ready-for-review`, `accepted`, `cancelled` remain `eligible: false`
- [ ] The floor equals the parsed dispatcher set; a divergence in **either** direction fails
- [ ] Roadmap precedence is untouched — a widened floor changes nothing while a phase holds an actionable row

**Command**: `node --test 'evals/develop-next/unit/*.test.mjs'`

### Integration

- [ ] `select-next.mjs --lint` reports the four filed tasks (67-70) as eligible
- [ ] `select-next.mjs` still returns the roadmap item, not a registry item, while the roadmap is incomplete

### Mutation Proving

- [ ] Remove `draft` from the floor → the eligibility test **and** the equality test both go red
- [ ] Add `accepted` to the floor → the equality test goes red (proves it catches over-widening, not just under-widening)
- [ ] Change `develop-task`'s status table to HALT on `Draft` → the equality test goes red (proves it re-checks itself against the real source)

---

## 9. Success Criteria

### Functional

- [ ] A task at `draft` appears in the registry frontier
- [ ] A task at `planned` appears
- [ ] `ready-for-review`, `accepted`, `cancelled` remain excluded
- [ ] `/develop-next` dispatches a selected draft task, and `develop-task` Step 2 promotes it
- [ ] Roadmap precedence unchanged

### Structural

- [ ] The floor is asserted **equal** to the dispatcher's set, parsed from the dispatcher's own table
- [ ] Over-widening fails the test, not only under-widening
- [ ] The bug axis is checked, and left alone if no gap exists

### Documentation

- [ ] The floor's rationale is rewritten to say where the review gate actually lives
- [ ] CHANGELOG names the behavioural change for unattended loops

---

## 10. Risk Assessment

### Medium Risk Areas

**1. An unattended loop picks up a stub task**

- **Risk**: a placeholder task consumes a pipeline run and halts at Step 2.
- **Probability**: Medium
- **Impact**: Minor — a wasted cycle, surfaced with review findings. No damage; nothing merges.
- **Mitigation**: `develop-task` Step 2 already HALTs on NEEDS REVISION / REQUIRES REWORK, and that halt is loud. Compare against the status quo, where the same task is invisible indefinitely — a visible wasted cycle is strictly better than silence.
- **Rollback**: revert the constant; one line.

**2. The equality test is too rigid and blocks legitimate divergence**

- **Risk**: a future status is deliberately accepted by the dispatcher but should not be auto-selected.
- **Probability**: Low
- **Impact**: Minor — the test fails loudly and a human decides.
- **Mitigation**: that is the intended behaviour. A deliberate divergence should require editing the test and saying why, not drifting silently.

**3. Parsing the dispatcher's status table is brittle**

- **Risk**: the markdown table's shape changes and the test breaks or, worse, silently parses nothing and asserts an empty set.
- **Probability**: Medium
- **Impact**: Major — an empty parsed set would make the equality assertion vacuous, which is this repo's recurring failure mode.
- **Mitigation**: assert the parsed set is **non-empty and contains a known anchor** (`ready-for-development`) before comparing. A test that parses nothing must fail, not pass.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: an unattended loop repeatedly selects unready drafts and halts.

**Steps**: revert `TASK_ELIGIBLE_STATUSES` to `{ready-for-development, in-progress}`; revert the equality test to the prior subset test.

**Verification**: `select-next.mjs --lint` reports draft tasks as ineligible again.

### Forward Fix (< 2 hours)

If the problem is a specific noisy task rather than the policy, set that task to `cancelled` or move it out of the registry — no code change needed.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — filed after /develop-next was found to exclude freshly filed tasks | create-task |
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, effort 4h→8h per rubric; status → ready-for-development | review-task |

---

## Progress Tracking

### Phase 1: Widen the floor
- [ ] Constant
- [ ] Header comment and lint message

### Phase 2: Equality test
- [ ] Parse the dispatcher table
- [ ] Assert equality, non-empty guard

### Phase 3: Bug axis
- [ ] Compare; align only if a real gap exists

### Phase 4: Prose and changelog
- [ ] roadmap-selection.md
- [ ] CHANGELOG

---

## References

- **The constant**: `skills/develop-next/scripts/select-next.mjs:84-88`
- **What the dispatcher accepts**: [`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`](../../../shared/resources/develop-pipeline-step-0-resolve-and-prepare.md) § 0c, develop-task table
- **The rule this task applies**: `CHANGELOG.md:78` — *"The floor must be a subset of the statuses the dispatching pipeline accepts — that is the rule, and those values are only its current answer."*
- **Why the registries are a fallback at all**: [`task.65`](../task.65.registry-aware-selection/task.65.registry-aware-selection.md)
- **The in-pipeline review gate**: `skills/develop-task/SKILL.md` § Autonomous Decision Defaults — HALT on NEEDS REVISION / REQUIRES REWORK

---

## Notes

### Important Reminders

- **Move the selector to match the dispatcher, never the reverse.** If the two disagree, the dispatcher's table is the source of truth — it is the thing that actually has to do the work.
- **The equality test must fail when it parses nothing.** An empty parsed set silently satisfies any comparison, which is the vacuous-assertion failure this repo has hit repeatedly.

### Why High priority

Every task filed by `/create-task` currently lands outside the frontier. That is not an edge case — it is the default path for all new work, and it reintroduces exactly the manual tracking task 65 removed for bugs.

---

**Status:** Ready for Development

**Next Steps**:
1. `/review-task docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md`
2. `/develop-task docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md`
