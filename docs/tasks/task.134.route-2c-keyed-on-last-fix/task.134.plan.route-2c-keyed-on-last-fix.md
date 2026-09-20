---
id: task.134.plan
title: "Implementation Plan: Route 2c keyed on the last fix"
type: plan
task-ref: task.134.route-2c-keyed-on-last-fix.md
---

# Implementation Plan: Route 2c keyed on the last fix

> Requirements and success criteria: [task.134.route-2c-keyed-on-last-fix.md](task.134.route-2c-keyed-on-last-fix.md)

## Overview

One clause in one pure function, fixture-first. The engine already computes the value the new clause reads (`countRaised(latestGateContent).high`); the change moves that read above the HIGH check and replaces a whole-history filter with it.

## Phase-by-Phase Implementation Guide

### Phase 1: Fixture rows

**Files to modify:** `shared/resources/tests/qa-loop-route.test.mjs` — the `// ── route 2c — gate the last fix ──` block

**Exact changes:** the block's rows are `{ name, input, expect: { route, reason } }` objects fed to `classifyLoopRoute`; add, in the same shape:

```js
{
  name: "route 2c positive: task.130 shape — HIGH alternated 0/1/0/1/0, last gate clean, MEDIUM 3→2→1, fix ungated",
  input: { cycle: 5, highCounts: [0, 1, 0, 1, 0], mediumCounts: [2, 2, 3, 2],
           latestGateContent: gate({ high: 0, medium: 1 }), budgetSpent: true,
           lastCycleAction: "Running qa-fix (cycle 5 of 5)" },
  expect: { route: "gate-the-last-fix", reason: "gate-the-last-fix" },
},
{
  name: "route 2c negative: gate N raised a HIGH — the fix awaiting a gate closes a blocker",
  input: { …same…, latestGateContent: gate({ high: 1, medium: 0 }) },
  expect: { route: "continue", reason: "last-gate-raised-high" },
},
{
  name: "route 2c positive: a HIGH at N−1 closed by N's fix, gate N clean",
  input: { cycle: 4, highCounts: [0, 0, 1, 0], mediumCounts: [3, 3, 2],
           latestGateContent: gate({ high: 0, medium: 1 }), budgetSpent: true,
           lastCycleAction: "Running qa-fix (cycle 4 of 4)" },
  expect: { route: "gate-the-last-fix", reason: "gate-the-last-fix" },
},
```
(`gate({high, medium})` is whatever helper the file already uses to build `top_issues[]` YAML with N open entries per severity — reuse it; do not hand-write YAML in the row.) Keep the existing "route 2c negative: HIGH seen" row **only if** its gate carries a HIGH; if it was built with a clean gate and a non-zero history, retitle it to the new positive semantics or delete it — the row's intent moved with the rule.

### Phase 2: The predicate

**Files to modify:** `shared/resources/qa-diminishing-returns.js`, inside `if (budgetSpent) { … }`

**Exact changes:** delete the `nonZero` block; move `const raised = countRaised(latestGateContent);` and its `gate-unreadable` return to directly after `high-counts-missing`; insert:

```js
    if (raised.high > 0) {
      return route(
        ROUTES.CONTINUE,
        "last-gate-raised-high",
        `gate ${cycle} raised ${raised.high} HIGH — the fix awaiting a gate closes a blocker, and a blocker's fix is read by a full cycle, not a half-cycle; the loop escalates with that evidence`,
      );
    }
```
Update the `gate-the-last-fix` message: *"the N-cycle budget is spent with gate N raising no HIGH and MEDIUM falling …"*. Update the JSDoc above `classifyLoopRoute` where it lists the 2c reasons.

Mutations (cp snapshot / restore): (a) reinstate the `nonZero` filter → task.130 row red; (b) delete the `raised.high > 0` block → gate-N-HIGH row red.

### Phase 3: The two statements

**Files to modify:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the route table row `**Gate-the-last-fix half-cycle** (budget, route 2c)` and § "Gate-the-last-fix half-cycle (shared)" → **The conditions**, item 2; `shared/resources/develop-pipeline-resume-contract.md` — `grep -n high-findings-seen`.

**Exact changes:** condition 2 → *"`HIGH_N == 0` — **gate N raised no HIGH.** The fix awaiting a gate closes only non-blocking findings. An earlier HIGH that a later gate read as closed is evidence about that gate, not about this fix; task.130 alternated 0, 1, 0, 1, 0 with each blocker fixed inside the loop and was declined by the whole-history form of this clause, escalated, and needed an operator grant to run the one gate this route exists to run. A blocker still open on gate N is the case that escalates."* Route table: *"the budget is spent, gate N raised no HIGH, MEDIUM fell strictly for three cycles, and the last cycle's fix has **no gate**"*. `describeLoopRoute` text for the `continue` reasons in the step file's *On `continue`* paragraph: replace `high-findings-seen` with `last-gate-raised-high` in the example list.

CHANGELOG [Unreleased] › Changed: one entry — *"route 2c (gate-the-last-fix) reads gate N's HIGH count instead of the loop's whole HIGH history (task 134; obs #139)"*.

## Key Patterns and References

- `countRaised()` in the same file — the reader route 2c now shares with route 2b and the Cosmetic-residue check.
- `qa-loop-route.test.mjs` header comment — the fixture table is the spec; the step file cites it as such, so the rows change first.
- task.123's plan for how the step file and the engine were kept in the same words when 2b/2c shipped.

## Testing Approach

`command node --test shared/resources/tests/qa-loop-route.test.mjs` red after Phase 1 (one row), green after Phase 2; the two mutations recorded; `npm run ci:fast`; `npm run bundle -- --check`; the `grep` for the retired reason string across `shared skills evals docs` excluding `docs/tasks/task.130*`.
