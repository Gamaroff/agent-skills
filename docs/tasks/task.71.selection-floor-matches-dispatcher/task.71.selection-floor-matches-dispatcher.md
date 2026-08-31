---
id: task.71
title: "[Task 71] Make the selection floor equal what the dispatching pipeline accepts"
type: task
description: "develop-task accepts draft and planned and promotes them via its own Step 2 review, but select-next.mjs excludes both from the frontier. A filed task is therefore invisible to /develop-next until someone remembers to review it by hand."
tags: [develop-next, selection, eligibility-floor, registries, automation]
category: infrastructure
status: accepted
priority: High
risk_level: medium
created: 2026-08-31
updated: 2026-08-31
completed_date: 2026-08-31
pr_number: 286
assignee:
depends_on: task.66
estimated_effort_hours: 3
github_issue: 285
---

# Technical Task: Make the selection floor equal what the dispatching pipeline accepts

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.71.review.1.selection-floor-matches-dispatcher.md` implemented 2026-08-31
**GitHub Issue**: [#285](https://github.com/Gamaroff/agent-skills/issues/285)

---

## 1. Overview

`select-next.mjs` admits a task to the frontier only at `ready-for-development` or `in-progress`. `develop-task` accepts `draft` and `planned` as well, and promotes them through its own Step 2 review. Widen the floor so it equals what the dispatcher accepts, and enforce the equality with a test.

**Scope**: one constant, two test edits, and the six pieces of prose that state the rule. The bug axis is measured and deliberately left alone.

---

## 2. Motivation

### Current Problems

1. **A freshly filed task is invisible to `/develop-next`.** `/create-task` sets `status: planned` (`skills/create-task/SKILL.md:422`; `resources/task-template.md`). The floor excludes `planned`. So every task enters the world outside the frontier and stays there until a human remembers to run `/review-task` — which is exactly the manual tracking the registry fallback was built to remove. `draft` is excluded too and is also accepted by the dispatcher, so it is widened alongside `planned`; but `planned` is the one on the default authoring path, and it is what makes this the rule rather than the edge case.
2. **The selector refuses work the dispatcher would accept.** `develop-task` Phase 0c: *"`Draft` → Note in the implementation report. Proceed — Step 2 (`/review-task`) will validate and update the status autonomously. Do NOT ask the user."* The pipeline is ready for a draft; the selector will not nominate one.
3. **The repo's own rule permits the wider floor.** Task 65 stated it as: *"The floor must be a **subset of the statuses the dispatching pipeline accepts** — that is the rule, and those values are only its current answer."* `{draft, planned}` are inside that set. The current floor is a strict subset where it could be an equality.
4. **The safety this buys already exists one layer down.** `develop-task` HALTs when `review-task` returns NEEDS REVISION or REQUIRES REWORK. A draft that is not ready is stopped by the review, not by being hidden from selection. The floor is duplicating a gate that already works, and charging manual toil for it.
5. **This reproduces the exact failure task 65 was written about.** That task existed because a filed, registered bug was invisible to the selector and an overnight run reported `roadmap-complete` while real work sat waiting. A filed, registered *task* is invisible in precisely the same way, for a different reason.

### The rationale this reverses, and why

The current floor is not an accident, and this task must not pretend it is. `select-next.mjs:71-78` states the opposing case directly, and `references/roadmap-selection.md:83` and `CHANGELOG.md:73-76` restate it — `roadmap-selection.md` even carries it as a section heading, `### Eligibility — the floor *is* the opt-out`:

> The eligibility floor IS the opt-out. Neither lifecycle has a park value (`deferred`, `wont-fix`), and adding one would touch two standards documents and every reader of those enums. Promotion up the existing ladder is already the act of saying "this is ready to be worked", so a `draft` task is a speculative filing and is out of the frontier BY CONSTRUCTION rather than by someone remembering to mark it — strictly stronger than an opt-out marker, because there is nothing new to remember and nothing new to write.

That argument is coherent and it is being **deliberately overturned**. Three things answer it:

1. **The opt-out was never free — it was paid for by everyone.** It parks speculative filings at no cost to their author, and charges every *real* filing a manual promotion step. The repo's own registry is the receipt: 71 rows, none of them ever left at `planned`, because a human promoted each one by hand.
2. **The cost of the failure it prevents is one visible cycle.** A speculative task selected by an unattended loop halts at `develop-task` Step 2 with review findings. Nothing merges. Compare the cost it imposes: a real task invisible for as long as nobody remembers it — which is the silence task 65 exists to remove.
3. **No park value replaces it, and none is wanted.** After this change there is no opt-out, by decision. A filing that should not be worked is `cancelled` or is not filed. Adding `deferred` to the lifecycle would re-import exactly the "something new to remember" cost the passage above correctly warns about.

The three passages quoted here must be rewritten in Phase 4, not merely edited around. A reversal left implicit reads as drift.

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
- **The bug axis diverges, and stays that way.** Measured, not assumed: `develop-bug` proceeds on `{new, reopened, in-progress, ready-for-qa}` (`skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:58-64`), while `BUG_ELIGIBLE_STATUSES = {new, reopened}`. That is a real two-status gap — but closing it would put a `ready-for-qa` bug (fix already written, awaiting verification) into an unattended loop, which is a different and larger change than this task assesses. **The equality rule is scoped to the task axis; the bug axis keeps its subset assertion.** Phase 3 records the divergence so the next author starts from a fact rather than an open question.

---

## 4. Scope

### In Scope

✅ Add `draft` and `planned` to `TASK_ELIGIBLE_STATUSES`
✅ A test asserting the floor **equals** the dispatcher's accepted set, parsed from `develop-task`'s own status table
✅ Record the measured bug-axis divergence in the implementation report and in the test's comment, without acting on it
✅ Update every piece of prose that states the floor — two comment blocks in `select-next.mjs`, and four sites in `references/roadmap-selection.md`
✅ A CHANGELOG entry, since this changes what an unattended loop will pick up

### Out of Scope

❌ **Removing the floor** — `ready-for-review`, `accepted` and `cancelled` must stay excluded
❌ **Changing roadmap precedence** — the registries remain a fallback consulted only at `roadmap-complete`
❌ **Changing what `develop-task` accepts** — this task moves the selector to match the dispatcher, never the reverse
❌ Retro-promoting existing draft tasks — they become selectable automatically
❌ **Changing `BUG_ELIGIBLE_STATUSES`** — the bug axis diverges from `develop-bug` by `in-progress` and `ready-for-qa`, and closing that gap is its own task with its own risk assessment. The bug test keeps `⊆`.
❌ **Adding a park value** (`deferred`, `wont-fix`) to either lifecycle — after this change there is no opt-out, by decision (§2)

---

## 5. Breaking Changes

**Behavioural, and worth stating plainly**: after this lands, an unattended `/loop /develop-next` will pick up `draft` and `planned` tasks it previously skipped. That is the intent. The practical effect is that a stub or half-written task can consume one pipeline run and halt at Step 2 with review findings, where previously it would have been silently ignored.

That trade is deliberate: a wasted cycle is visible and recoverable; invisibility is neither. It also removes the only opt-out a speculative filing had — see §2 *"The rationale this reverses"*, where that is argued rather than assumed.

**Bugs are unaffected.** `BUG_ELIGIBLE_STATUSES` is unchanged, so no bug becomes newly selectable. The bug floor's own divergence from `develop-bug` is recorded in Phase 3 and deliberately left open.

No API or schema changes.

---

## 6. Implementation Plan

### Phase 1: Widen the floor

**Risk Level**: Low

**Files**: `skills/develop-next/scripts/select-next.mjs`

**Changes**:
- [x] Add `draft` and `planned` to `TASK_ELIGIBLE_STATUSES`
- [x] Update the header comment to say the floor **equals** the dispatcher's accepted set, and why
- [x] Update the `--lint` exclusion message so it names the new floor accurately — **already correct by construction**: the message interpolates `[...ELIGIBLE_FOR[row.kind]]` (`select-next.mjs:1125`), so it renamed itself to `(draft, planned, ready-for-development, in-progress)` when the constant widened. Asserted rather than assumed — `15/SC5` now checks a passed-over draft row is *not* excluded by the floor

**Dependencies**: none

---

### Phase 2: Enforce the equality with a test

**Risk Level**: Medium

**Files**: `evals/develop-next/unit/select-next.test.mjs`

> **The parser already exists — do not build one.** `proceedStatuses(markdown, sectionHeading)` at `select-next.test.mjs:1786` already reads a dispatcher's status table, already drops every HALT row, and already splits slash-separated status cells. Test `16/H1` at `:1808` already calls it against `develop-task`'s section. The work here is converting one assertion, not writing a parser.

**Changes**:
- [x] `16/H1` converted to a two-way equality via `assert.deepEqual({onlyInFloor, onlyInDispatcher}, {…: [], …: []})`
- [x] Failure message names both directions and what each *means* operationally
- [x] **Both guards preserved verbatim** — `sawRow` inside `proceedStatuses` and the `ready-for-development`/`in-progress` + `!ready-for-review` anchors. A comment now records that `===` makes them *more* load-bearing than `⊆` did: two empty sets are equal, so an empty parse would turn the test green without them
- [x] Renamed → *"the task eligibility floor EQUALS what develop-task proceeds on"*
- [x] `15/SC5` inverted and renamed → *"the eligibility floor admits every status develop-task accepts"*; the excluded sweep is now exactly `ready-for-review`, `accepted`, `cancelled`
- [x] Bug half of `16/H1` left as `⊆`, with the measured gap recorded above it (Phase 3)
- [x] **Consequential fix not in the original plan**: `15/SC6` used a `draft` row as its "outside the floor, but still listed with a reason" exemplar. That row became selectable, so the test failed (`T1 !== T3`). Its exemplar moved to `ready-for-review`, which keeps the fixture's intent and makes rows 1/2/4 spell out exactly the three statuses the floor still excludes

**Dependencies**: Phase 1

---

### Phase 3: Record the bug-axis divergence — and decline to act on it

**Risk Level**: Low

**Files**: `evals/develop-next/unit/select-next.test.mjs`, implementation report

> **This phase deliberately changes no behaviour.** It exists so the divergence is written down where the next reader will find it, rather than rediscovered.

**Measured** (by running the test's own `proceedStatuses()` over `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`):

| | Set |
|---|---|
| `develop-bug` proceeds on | `new`, `reopened`, `in-progress`, `ready-for-qa` |
| `BUG_ELIGIBLE_STATUSES` | `new`, `reopened` |
| Gap | `in-progress`, `ready-for-qa` |

**Changes**:
- [x] `BUG_ELIGIBLE_STATUSES` unchanged
- [x] The equality assertion is scoped to the task axis; the bug half of `16/H1` stays `⊆`
- [x] Comment added above the bug assertion stating the measured gap (`in-progress`, `ready-for-qa`) and why it stays open
- [x] Measurement and decision recorded in the implementation report, and also in `select-next.mjs` and `roadmap-selection.md` so a reader of either finds it without the report

**Dependencies**: Phase 2

---

### Phase 4: Prose and changelog

**Risk Level**: Low

**Files**: `skills/develop-next/scripts/select-next.mjs`, `skills/develop-next/references/roadmap-selection.md`, `CHANGELOG.md`

> **Six sites, not one.** Every one of these states the old rule as fact. A missed one is drift.

**Changes**:
- [x] `select-next.mjs` — the "**SUBSET**" block is now an equality block, task axis only, and names the bug axis as the deliberate exception
- [x] `select-next.mjs` — the "**floor IS the opt-out**" block **rewritten, not deleted**: it now states there is no opt-out, quotes the argument it overturns, and gives the three answers to it
- [x] `roadmap-selection.md` heading retitled → `### Eligibility — the floor equals what the dispatcher accepts`
- [x] `roadmap-selection.md` table: Task row → all four statuses, plus a new **Relation to dispatcher** column making the `===` / `⊆` split explicit per axis rather than implied
- [x] `roadmap-selection.md` subset + by-construction paragraphs rewritten, including *why* `⊆` was structurally blind to the `planned` gap
- [x] `roadmap-selection.md` test-index entry updated for the inverted sweep and the two new tests
- [x] CHANGELOG `[Unreleased] → Changed` section created (Keep-a-Changelog order: Added → Changed → Fixed) stating the behavioural change, the reversal, the two-way assertion, and the untouched bug axis
- [x] **Seventh site, found by sweep**: the reversed decision was also stated as fact in the `[Unreleased] → Added` bullet at `CHANGELOG.md:73-78`. Leaving it would have shipped one release block that contradicts itself. Rewritten in place, with a pointer to the Changed entry
- [x] Roadmap-precedence interaction noted in `roadmap-selection.md` and CHANGELOG, **and asserted** by a new test rather than only stated

**Dependencies**: Phases 1-3

---

## 7. Files Summary

### Files to Modify

1. ✅ `skills/develop-next/scripts/select-next.mjs` — the constant, plus **both** rationale blocks (`:56-58`, `:71-78`) and the `--lint` exclusion message
2. ✅ `evals/develop-next/unit/select-next.test.mjs` — **two** tests change: `16/H1` (`:1808`, subset → equality, task axis only) and `15/SC5` (`:1475`, inverted). `proceedStatuses()` is reused unchanged
3. ✅ `skills/develop-next/references/roadmap-selection.md` — four sites: heading `:73`, table `:77-79`, paragraphs `:81,83`, test index `:153`
4. ✅ `CHANGELOG.md` — new `[Unreleased] → Changed` section, **and** the `[Unreleased] → Added` bullet at `:73-78` that stated the now-reversed rule as fact (a seventh prose site, found by repo sweep; leaving it would have shipped a release block contradicting itself)

**Not modified, deliberately:**

- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — read-only input to the equality test; this task moves the selector to the dispatcher, never the reverse. Touched only as a mutation probe and restored (verified absent from `git status`)
- `docs/tasks/task.65.*` — historical record of the decision being reversed. Rewriting it would erase the thing §2 argues against
- `BUG_ELIGIBLE_STATUSES` and the bug half of `16/H1` — out of scope by §4

---

## 8. Testing Strategy

### Unit Tests

- [x] A `draft` task in the registry is now `eligible: true` — `15/SC5` selectable sweep
- [x] A `planned` task is `eligible: true` — same sweep
- [x] `ready-for-review`, `accepted`, `cancelled` remain `eligible: false` — `15/SC5` excluded sweep
- [x] The floor equals the parsed dispatcher set; a divergence in **either** direction fails — `16/H1`
- [x] Roadmap precedence is untouched — new test *"the widened floor does not disturb roadmap precedence"*, asserting the strong form (`calls.n === 0`: the registry loader is never even called)

**Command**: `node --test 'evals/develop-next/unit/*.test.mjs'`

### Integration

> **The obvious check would be vacuous.** "`--lint` reports tasks 67-70 as eligible" proves nothing: all four are already `ready-for-development`, already eligible, and `--lint` already selects T67. It passes identically before and after. The repo also holds **zero** `draft` or `planned` registry rows, so nothing in the real corpus exercises this change — the fixture has to be synthetic.

- [x] Synthetic inline registry: `draft` T80 (Medium) + `planned` T81 (High). T81 is selected — **High beats Medium even though 81 > 80**, so the assertion proves eligibility rather than riding the ascending-number tie-break that would have picked T80 for free. T80 is passed over as *outranked*, asserted with `doesNotMatch(/eligibility floor/)` — the precise thing that changed
- [x] Mutation-proved: with `draft` removed from the floor the same fixture goes red (see Mutation Proving below)
- [x] `select-next.mjs` returns the roadmap item while the roadmap is incomplete — asserted with `draft`/`planned` rows at `Critical` priority sitting in the registry, so the test would catch precedence inversion, not merely absence

### Mutation Proving

All three executed against the real suite, each reverted immediately after:

- [x] **Remove `draft` from the floor** → **3 tests red**: `16/H1` equality, `15/SC5` behavioural sweep, and the new synthetic-registry test. More than the two predicted — the integration fixture is genuinely load-bearing, not decorative
- [x] **Add `accepted` to the floor** → `16/H1` red, reporting `only in floor: accepted` / `only in dispatcher: (none)`. This is the capability `⊆` never had: over-widening was previously undetectable
- [x] **Make `develop-task`'s own status table HALT on `Draft`** (edited `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, then restored) → `16/H1` red with the divergence on the floor side. Proves the test re-reads the real dispatcher rather than a restatement — and that it reads the git-tracked `shared/resources/` source, not the gitignored `.agents/skills/` symlink

---

## 9. Success Criteria

### Functional

- [x] A task at `draft` appears in the registry frontier
- [x] A task at `planned` appears
- [x] `ready-for-review`, `accepted`, `cancelled` remain excluded
- [x] `/develop-next` dispatches a selected draft task, and `develop-task` Step 2 promotes it — the selector half is asserted here; the dispatcher half is `develop-task` Phase 0c's existing `Draft`/`Planned` → *Proceed* rows, which `16/H1` now parses as the definition of the floor. The two halves are the same fact, checked from both ends
- [x] Roadmap precedence unchanged

### Structural

- [x] The floor is asserted **equal** to the dispatcher's set, parsed from the dispatcher's own table
- [x] Over-widening fails the test, not only under-widening — mutation-proved with `accepted`
- [x] The bug axis is checked, and left alone — a gap *does* exist (`in-progress`, `ready-for-qa`), so it keeps `⊆` and the gap is written down in three places rather than closed silently

### Documentation

- [x] The floor's rationale is rewritten to say where the review gate actually lives (`develop-task` Step 2), in `select-next.mjs`, `roadmap-selection.md` and CHANGELOG
- [x] CHANGELOG names the behavioural change for unattended loops, and the reversal it makes

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
- **Mitigation**: **already implemented — preserve it, do not rebuild it.** `select-next.test.mjs:1810` asserts `sawRow` (*"no status-table rows parsed — the table shape changed"*) and `:1813` asserts the `ready-for-development` / `in-progress` anchor. Both predate this task. The requirement on Phase 2 is therefore *do not drop these while converting `⊆` to `===`* — an empty parsed set must still fail rather than satisfy the comparison vacuously.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: an unattended loop repeatedly selects unready drafts and halts.

**Steps**: revert `TASK_ELIGIBLE_STATUSES` to `{ready-for-development, in-progress}`; revert `16/H1` to the subset assertion and re-invert `15/SC5`. The bug axis is untouched by this task, so nothing there needs reverting.

**Verification**: `select-next.mjs --lint` reports draft tasks as ineligible again.

### Forward Fix (< 2 hours)

If the problem is a specific noisy task rather than the policy, set that task to `cancelled` or move it out of the registry — no code change needed.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-31
**Quality Score**: 98/100
**Gate Decision**: PASS (cycle 1 CONCERNS → cycle 2 PASS after 1 fix cycle)

### QA Report
- **Full Report**: [task.71.qa.1.selection-floor-matches-dispatcher.md](./task.71.qa.1.selection-floor-matches-dispatcher.md)
- **Gate File**: [task.71.gate.1.selection-floor-matches-dispatcher.yml](./task.71.gate.1.selection-floor-matches-dispatcher.yml)

### Test Coverage Summary
- **Tests Executed**: 1999 (1998 pass, 0 fail, 1 pre-existing skip)
- **Phases Verified**: 4/4
- **Success Criteria Covered**: 10/10, none uncovered
- **Mutation Proofs**: 3/3 executed and reverted
- **Critical Issues**: 0 HIGH, 1 MEDIUM (fixed), 1 LOW (fixed)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Substance is correct and independently re-verified — QA re-parsed the dispatcher's status table with its own implementation and confirmed `{draft, planned, ready-for-development, in-progress}` with `sawRow = true`, ruling out the vacuous-empty-parse hazard §10 Risk 3 names. Blast radius checked: the constant has exactly two readers.

Cycle 1 raised one MEDIUM defect — [TASK-71-QA1-01](./task.71.bug.1.literal-unicode-escapes-in-comments.md): `//` comment lines in `select-next.test.mjs` rendering literal escape sequences instead of `⊆`/`—`, including the H1 section header. Fixed in one cycle and **closed**: 18 occurrences replaced (the cycle-1 count of 12 was of affected lines; several carried two — the discrepancy was reported rather than silently absorbed), 0 remain. The LOW `deepStrictEqual` recommendation was applied in the same pass and re-mutation-proved, since it changes the assertion guarding this task's central invariant.

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**QA Report**: [`task.71.qa.1.selection-floor-matches-dispatcher.md`](./task.71.qa.1.selection-floor-matches-dispatcher.md)
**Gate File**: [`task.71.gate.1.selection-floor-matches-dispatcher.yml`](./task.71.gate.1.selection-floor-matches-dispatcher.yml)
**Gate Status**: ✅ PASS · **Quality Score**: 98/100 · **QA Cycles**: 2 (1 fix cycle)

All Definition of Done criteria verified:

✅ **Success Criteria** — 10/10 met, 0 uncovered. Traceability matrix maps each to its test.
✅ **Tests** — 1999 tests, 0 failures. 2 added, 3 rewritten. All 3 planned mutations proved and reverted.
✅ **CI** — SUCCESS on the exact head commit `885de04` (`test`, `validate`, `link-check`, branch policy). Verified against the head being accepted, not an ancestor.
✅ **PR** — [#286](https://github.com/Gamaroff/agent-skills/pull/286), `MERGEABLE`, `mergeStateStatus: CLEAN`.
✅ **Documentation** — 7 prose sites updated (one more than the plan enumerated); CHANGELOG `Changed` entry added and the stale `Added` bullet rewritten.
⚠️ **Security** — NOT APPLICABLE, asserted from the diff's surface: no credential, input, network, dependency or authorisation change. One `Set` literal plus comments and tests.
⚠️ **Compliance** — NOT APPLICABLE: no personal data, payment, accessibility or licensing surface.
✅ **Bugs** — 1 found in QA cycle 1, fixed and closed. 0 remaining.

**Residual, recorded rather than rounded up**: the PR carries **no human review** (`reviews: 0`). This repository requires none — branch protection is satisfied and CI is the enforcing gate — so acceptance is defensible, but "no review required" and "approved" are different statements and only the first is true here.

**Open by decision, not defect**: the bug-axis divergence (`in-progress`, `ready-for-qa`) stays `⊆`, measured and recorded in three places. Out of scope by §4.

**Detailed Verification Log:** See [`task.71.dod.1.selection-floor-matches-dispatcher.md`](./task.71.dod.1.selection-floor-matches-dispatcher.md) for complete evidence, per-check citations and the CI verification.

**Task marked as ACCEPTED on:** 2026-08-31

---

## Bug Reports

### Closed Bugs

- [TASK-71-BUG-1: Literal `⊆` / `—` escape sequences in test-file comments](./task.71.bug.1.literal-unicode-escapes-in-comments.md) — ✅ Closed — Severity: MEDIUM (fixed and verified 2026-08-31, 1 fix cycle)

### Open Bugs

_None._

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — filed after /develop-next was found to exclude freshly filed tasks | create-task |
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, effort 4h→8h per rubric; status → ready-for-development | review-task |
| 2026-08-31 | 1.2     | Review 6/10 NEEDS REVISION — 3 critical, 6 important, all applied: corrected the `/create-task` premise (emits `planned`, not `draft`); added §2 "The rationale this reverses" engaging the shipped floor-is-the-opt-out decision; measured the bug axis (diverges by `in-progress`, `ready-for-qa`) and scoped equality to tasks only; rescoped Phase 2 to reuse the existing `proceedStatuses` parser and named test 15/SC5; enumerated six prose sites in Phase 4; replaced the vacuous 67-70 integration check with a synthetic fixture; effort 8h→3h | review-task |
| 2026-08-31 |         | Implemented — 4 files, 123 tests passing (2 added, 3 rewritten); 3 mutations proved | develop |
| 2026-08-31 |         | QA gate CONCERNS (90/100) — 1 medium, 1 low; 4/4 phases, 10/10 criteria, 3/3 mutations proved | qa-task |
| 2026-08-31 |         | QA findings fixed — gate PASS (98/100), 1 iteration; 18 escape sequences repaired, deepEqual→deepStrictEqual re-mutation-proved | qa-fix |
| 2026-08-31 | 1.3     | DoD verified — accepted (PR #286); CI green on head, 10/10 criteria, 1 bug closed | finalise |

---

## Progress Tracking

### Phase 1: Widen the floor
- [x] Constant
- [x] Header comment and lint message

### Phase 2: Equality test
- [x] `16/H1` → two-way equality, existing guards preserved
- [x] `15/SC5` inverted and renamed
- [x] `15/SC6` exemplar moved off `draft` (consequential)

### Phase 3: Bug axis
- [x] Divergence recorded in the test comment, `select-next.mjs`, `roadmap-selection.md` and the implementation report; no behaviour changed

### Phase 4: Prose and changelog
- [x] roadmap-selection.md (4 sites)
- [x] CHANGELOG (new `Changed` entry + the `Added` bullet that stated the reversed rule)

---

## References

- **The constant**: `skills/develop-next/scripts/select-next.mjs:84-88`
- **What the dispatcher accepts**: [`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`](../../../shared/resources/develop-pipeline-step-0-resolve-and-prepare.md) § 0c, develop-task table
- **The rule this task applies**: `CHANGELOG.md:78` — *"The floor must be a subset of the statuses the dispatching pipeline accepts — that is the rule, and those values are only its current answer."*
- **Why the registries are a fallback at all**: [`task.65`](../task.65.registry-aware-selection/task.65.registry-aware-selection.md)
- **The in-pipeline review gate**: `skills/develop-task/SKILL.md` § Autonomous Decision Defaults — HALT on NEEDS REVISION / REQUIRES REWORK
- **The rationale this reverses**: `skills/develop-next/scripts/select-next.mjs:71-78`; `skills/develop-next/references/roadmap-selection.md:73,83`; `CHANGELOG.md:73-76`
- **What `/create-task` actually emits**: `skills/create-task/SKILL.md:422` (`status: planned`); `skills/create-task/resources/task-template.md`
- **The bug axis, measured**: `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:58-64` — proceeds on `new`, `reopened`, `in-progress`, `ready-for-qa`
- **The parser Phase 2 reuses**: `evals/develop-next/unit/select-next.test.mjs:1786` (`proceedStatuses`), with guards at `:1810` and `:1813`

---

## Notes

### Important Reminders

- **Move the selector to match the dispatcher, never the reverse.** If the two disagree, the dispatcher's table is the source of truth — it is the thing that actually has to do the work.
- **The equality test must fail when it parses nothing.** An empty parsed set silently satisfies any comparison, which is the vacuous-assertion failure this repo has hit repeatedly. The guards that enforce this already exist (`:1810`, `:1813`) — the risk is dropping them during the conversion, not failing to write them.
- **Equality is scoped to the task axis on purpose.** The bug floor genuinely diverges from `develop-bug`. Extending the assertion to bugs would force `ready-for-qa` into an unattended loop's frontier — a change with its own risk profile, and not this one's.

### Why High priority

Every task filed by `/create-task` lands at `planned`, and `planned` is outside the frontier. That is not an edge case — it is the default path for all new work, and it reintroduces exactly the manual tracking task 65 removed for bugs.

The effect is currently **preventive rather than observed**: this repo's task registry holds 66 `accepted` and 5 `ready-for-development` rows and no `planned` or `draft` ones, because every filed task so far has been promoted by hand. That hand-promotion is the toil being removed, not evidence that the gap is harmless.

---

**Status:** Accepted

**Next Steps**:
1. `/review-task docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md`
2. `/develop-task docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md`
