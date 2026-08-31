---
id: task.72
title: "[Task 72] Pin the bug-axis divergence exactly instead of asserting it loosely"
type: task
description: "The bug eligibility floor is asserted as a subset of what develop-bug accepts, so the two-status gap between them can grow silently. Assert the gap exactly, and record why bugs keep a divergence the task axis does not."
tags: [develop-next, selection, eligibility-floor, bugs, drift-detection]
category: infrastructure
status: planned
priority: Medium
risk_level: low
created: 2026-08-31
updated: 2026-08-31
assignee:
depends_on: task.71
estimated_effort_hours: 4
github_issue: 287
---

# Technical Task: Pin the bug-axis divergence exactly instead of asserting it loosely

**Status:** Planned
**GitHub Issue**: [#287](https://github.com/Gamaroff/agent-skills/issues/287)

---

## 1. Overview

`BUG_ELIGIBLE_STATUSES` is `{new, reopened}`. `develop-bug` proceeds on `{new, reopened, in-progress, ready-for-qa}`. Test `16/H1` asserts only that the first is a **subset** of the second, which is true today and would remain true if the gap doubled.

Replace that subset assertion with one that pins the gap **exactly** — `{in-progress, ready-for-qa}` — so any change on either side fails loudly. Record why the bug axis keeps a divergence the task axis was made to close.

**Key deliverables**: an exact-gap assertion, the rationale written where the next reader will find it, and three mutation proofs.

**Expected outcome**: no behaviour change. The floor stays exactly as it is; what changes is that it can no longer drift without a test going red.

---

## 2. Motivation

### Current Problems

1. **`⊆` cannot detect the gap growing.** If someone adds a fifth proceed-status to `develop-bug`'s table, `{new, reopened} ⊆ {…}` still holds and the test stays green. The assertion is satisfied by every possible widening of the dispatcher, which makes it silent about precisely the change it exists to notice. This is the same structural blindness task 71 removed from the task axis, still present here.

2. **The gap is currently undocumented in executable form.** Task 71 measured it (`in-progress`, `ready-for-qa`) and wrote it into three prose locations. Prose does not fail a build. The number of statuses in the gap is a fact about the system that no test currently asserts.

3. **Task 71 explicitly left this open, and the reason was risk, not correctness.** Its §4 says: *"Changing `BUG_ELIGIBLE_STATUSES` — the bug axis diverges from `develop-bug` by `in-progress` and `ready-for-qa`, and closing that gap is its own task with its own risk assessment."* This is that task, and it concludes the gap should **stay** — but be pinned.

### The finding that decides this task's shape

**The two dispatchers' status tables do not mean the same thing, and the analogy from task 71 does not transfer.**

`develop-task` Phase 0c on its pre-work statuses:

> `Draft` → *"Note in the implementation report. Proceed — Step 2 (`/review-task`) will validate and update the status autonomously."*

That row says: **this is unstarted work, and the pipeline will start it.** Nominating such a task is exactly right, which is why task 71 made the floor equal that set.

`develop-bug` Step 0 on the two statuses in the gap (`skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:58-64`):

> `in-progress` → *"Proceed — a prior run may have started; resume-aware."*
> `ready-for-qa` → *"Proceed directly toward Steps 5–6 verification **if a fix already exists**; else re-verify the fix record."*

Those rows say something different: **something is already underway, and this run will resume it.** They are resume affordances, written so a re-invoked pipeline does not HALT on its own half-finished work. They are not a claim that unstarted work is waiting to be nominated.

So the equality rule is not a universal law that the bug axis has failed to obey — it is the right rule for a dispatcher whose pre-work statuses mean "not started", and the wrong rule for one whose extra statuses mean "already in flight". Selecting on a resume affordance would hand an unattended loop a bug a human may be actively holding, or one whose fix is written and only awaiting verification, on the strength of a table row that was never making a claim about the work being available.

**This is why the task widens nothing.** It makes the divergence a checked fact rather than a documented intention.

### Benefits

1. **The gap can no longer grow silently.** A new proceed-status on `develop-bug` fails the test and forces a decision.
2. **Closing the gap also fails the test** — which is correct: doing so is a policy change that must be deliberate, not a passing side effect of an unrelated edit.
3. **The rationale becomes executable.** The reason for the divergence sits next to the assertion that enforces it, rather than only in prose three files away.
4. **It finishes what task 71 deliberately left open**, rather than leaving a known gap indefinitely deferred.

---

## 3. Technical Background

### Current state

`evals/develop-next/unit/select-next.test.mjs` — the bug half of `16/H1`:

```js
test("16/H1: every bug eligibility status is one develop-bug proceeds on", () => {
  const proceed = proceedStatuses(readFileSync(STEP0_BUG, "utf-8"), null);
  assert.ok(
    proceed.has("new") && proceed.has("reopened"),
    `parsed proceed-set looks wrong: ${[...proceed].join(", ")}`,
  );
  for (const status of BUG_ELIGIBLE_STATUSES) {
    assert.ok(proceed.has(status), `…`);
  }
});
```

Measured on `develop` at the time of filing:

| | Set |
|---|---|
| `develop-bug` proceeds on | `new`, `reopened`, `in-progress`, `ready-for-qa` |
| `BUG_ELIGIBLE_STATUSES` | `new`, `reopened` |
| **Gap** | `in-progress`, `ready-for-qa` |

### Target state

The loop becomes an exact assertion on the difference:

```js
const gap = [...proceed].filter((v) => !BUG_ELIGIBLE_STATUSES.has(v)).sort();
assert.deepStrictEqual(gap, ["in-progress", "ready-for-qa"], "…");
```

`⊆` is implied by the gap being a known set rather than an arbitrary one, so nothing is lost. What is gained is a failure on any change in either direction.

### Important clarifications

- **This changes no runtime behaviour.** `BUG_ELIGIBLE_STATUSES` is untouched. No bug becomes newly selectable or newly excluded. The only file whose behaviour changes is the test.
- **`proceedStatuses()` is reused unchanged.** It already parses the dispatcher's table, drops HALT rows and splits slash-separated cells. Do not write a second parser.
- **The existing anti-vacuity guard must survive.** `assert.ok(proceed.has("new") && proceed.has("reopened"))` is what stops an empty parse satisfying the comparison. Under `deepStrictEqual` an empty parse would produce `gap: []`, which fails — but the guard also catches a parse that returns the *wrong* rows, which an empty-check would not.
- **The task axis is not touched.** Its `===` assertion stays as task 71 left it.

---

## 4. Scope

### In Scope

✅ Convert the bug half of `16/H1` from a `⊆` loop to an exact-gap `deepStrictEqual`
✅ Preserve the existing `new`/`reopened` anti-vacuity guard unchanged
✅ Write the resume-affordance rationale (§2) at the assertion, replacing the current comment that explains the gap only in terms of risk
✅ Update `roadmap-selection.md`'s Kind/Lifecycle/Eligible table — the Task row's *Relation to dispatcher* cell says `⊆`; make the bug row say "pinned exactly" and give the reason
✅ Mutation-prove the new assertion in all three directions

### Out of Scope

❌ **Changing `BUG_ELIGIBLE_STATUSES`** — the floor stays `{new, reopened}`; that is this task's conclusion, not a deferral
❌ **Changing what `develop-bug` accepts** — task 71's rule holds: move the selector to match the dispatcher, never the reverse
❌ **Touching the task axis** — its `===` assertion is correct and stays
❌ **Adding a park value** to either lifecycle
❌ A CHANGELOG entry — no observable behaviour changes (see §5)

---

## 5. Breaking Changes

**None.** No runtime behaviour changes: `BUG_ELIGIBLE_STATUSES` is not modified, so the set of selectable bugs is identical before and after. No API, schema or config change.

The only behavioural difference is in CI: a future edit that changes either side of the bug axis now fails a test that previously passed. That is the intent, and it is a change to what the build *detects*, not to what the code *does*.

Because nothing observable changes, this task deliberately adds **no** CHANGELOG entry — consistent with `develop`'s rule that internal refactors with no external effect are skipped.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.72.plan.pin-bug-axis-divergence.md](task.72.plan.pin-bug-axis-divergence.md)

### Phase 1: Pin the gap

**Risk Level**: Low
**Files**: `evals/develop-next/unit/select-next.test.mjs`

- [ ] Replace the `for (const status of BUG_ELIGIBLE_STATUSES)` loop with an exact-gap `assert.deepStrictEqual` on the sorted difference
- [ ] Keep the `new`/`reopened` anti-vacuity guard **verbatim** — it catches a wrong parse, which an empty-check cannot
- [ ] Fail with a message naming the unexpected statuses and stating what each direction means
- [ ] Rename the test — its current title states the subset rule

**Dependencies**: none

---

### Phase 2: Record why the divergence is correct, not merely tolerated

**Risk Level**: Low
**Files**: `evals/develop-next/unit/select-next.test.mjs`, `skills/develop-next/references/roadmap-selection.md`

> The comment above the bug assertion currently explains the gap in terms of **risk** ("would hand an unattended loop a fix already written"). That is true but secondary. The primary reason is **semantic**, and the comment should lead with it.

- [ ] Rewrite the comment above the bug assertion to lead with the resume-affordance distinction (§2), quoting both dispatchers' rows
- [ ] `roadmap-selection.md` — the eligibility table's *Relation to dispatcher* cell for the bug row: change `⊆ — diverges by …` to state the gap is pinned exactly, and why bugs differ from tasks
- [ ] Check the two `select-next.mjs` comment blocks task 71 wrote: they describe the bug axis as keeping "the weaker `⊆`". That is about to stop being true — update the wording

**Dependencies**: Phase 1

---

### Phase 3: Verify and mutation-prove

**Risk Level**: Low
**Files**: none (verification only)

- [ ] `node --test 'evals/develop-next/unit/*.test.mjs'` green
- [ ] Full `npm test` green
- [ ] `prettier --check` clean on the changed files
- [ ] Three mutations executed and reverted (see §8)

**Dependencies**: Phases 1-2

---

## 7. Files Summary

### Files to Modify

1. ✅ `evals/develop-next/unit/select-next.test.mjs` — the bug half of `16/H1`: assertion and its comment
2. ✅ `skills/develop-next/references/roadmap-selection.md` — the eligibility table's bug row
3. ✅ `skills/develop-next/scripts/select-next.mjs` — comment only; the "keeps the weaker `⊆`" wording becomes stale

### Files NOT Modified, deliberately

- `skills/develop-next/scripts/select-next.mjs` — the **`BUG_ELIGIBLE_STATUSES` constant itself**. Leaving it alone is this task's conclusion
- `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` — read-only input to the assertion
- `CHANGELOG.md` — no observable behaviour change (§5)

---

## 8. Testing Strategy

### Unit Tests

- [ ] The bug gap is exactly `{in-progress, ready-for-qa}`
- [ ] The anti-vacuity guard still fails on a parse that returns the wrong rows
- [ ] The task axis assertion is untouched and still passes
- [ ] No bug's selectability changes — the existing `15` bug-eligibility tests pass unmodified

**Command**: `node --test 'evals/develop-next/unit/*.test.mjs'`

### Integration

> **No integration test is warranted, and that is a finding rather than an omission.** This task changes only a test assertion. `select-next.mjs`'s behaviour is byte-identical, so any integration check would pass identically before and after — the vacuous shape task 71's §8 called out. The existing bug-selection tests are the regression net.

### Mutation Proving

Each executed against the real suite and reverted:

- [ ] Add `in-progress` to `BUG_ELIGIBLE_STATUSES` → gap shrinks to `{ready-for-qa}` → **the new assertion goes red** (proves it catches the gap closing)
- [ ] Add a fifth proceed-row to `develop-bug`'s status table → gap grows → **red** (proves it catches the drift `⊆` was blind to — the whole point of the task)
- [ ] Delete `new` from `BUG_ELIGIBLE_STATUSES` → the anti-vacuity guard or the gap assertion → **red** (proves the guard survived Phase 1)

---

## 9. Success Criteria

### Functional

- [ ] No bug's selectability changes — `BUG_ELIGIBLE_STATUSES` is byte-identical
- [ ] The task axis assertion is unchanged and passing
- [ ] Full suite green

### Structural

- [ ] The bug gap is asserted **exactly**, not as a subset
- [ ] Growing the gap fails the test
- [ ] Closing the gap fails the test
- [ ] The anti-vacuity guard is preserved and still catches a wrong parse

### Documentation

- [ ] The comment at the assertion leads with the resume-affordance reason, not the risk one
- [ ] `roadmap-selection.md` and `select-next.mjs` no longer describe the bug axis as keeping "the weaker `⊆`"

---

## 10. Risk Assessment

### Low Risk Areas

**1. The pinned gap becomes a maintenance burden**

- **Risk**: a legitimate change to `develop-bug`'s table now requires editing this test.
- **Probability**: Low — that table has changed rarely.
- **Impact**: Minor, and intended. A dispatcher gaining a status the selector ignores is exactly the decision that should not be made silently.
- **Mitigation**: the failure message states what each direction means, so the fix is a decision rather than a puzzle.

**2. The exact assertion is written but vacuous**

- **Risk**: an empty or mangled parse satisfies `deepStrictEqual` some other way.
- **Probability**: Low.
- **Impact**: Major if it happened — this repo's recurring failure mode.
- **Mitigation**: `proceedStatuses()` already asserts `sawRow`; the `new`/`reopened` guard pins the content; and mutation 3 exists specifically to prove the guard survived. An empty parse yields `gap: []`, which fails the comparison.

**3. Someone later reads "pinned" as "the divergence is permanent"**

- **Risk**: the rationale is mistaken for a prohibition on ever closing the gap.
- **Probability**: Low.
- **Impact**: Minor.
- **Mitigation**: the comment says the gap may be closed deliberately, and that the test failing is how that decision gets recorded — not a reason to avoid it.

---

## 11. Rollback Plan

### Immediate Rollback (< 15 minutes)

**Triggers**: the assertion proves brittle against a legitimate dispatcher change.

**Steps**: restore the `for (const status of BUG_ELIGIBLE_STATUSES)` subset loop. One test, no source change.

**Verification**: `node --test 'evals/develop-next/unit/*.test.mjs'` green; `BUG_ELIGIBLE_STATUSES` was never modified, so there is nothing else to revert.

### Forward Fix

If the gap legitimately changes, update the expected array and record why in the same edit — that is the mechanism working, not a rollback trigger.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — filed from the divergence task 71 measured and deliberately deferred | create-task |

---

## Progress Tracking

### Phase 1: Pin the gap
- [ ] Exact-gap assertion replaces the subset loop
- [ ] Anti-vacuity guard preserved verbatim
- [ ] Test renamed

### Phase 2: Rationale
- [ ] Comment leads with the resume-affordance distinction
- [ ] `roadmap-selection.md` bug row updated
- [ ] `select-next.mjs` "weaker ⊆" wording updated

### Phase 3: Verify
- [ ] Suite green, prettier clean
- [ ] 3 mutations proved and reverted

---

## References

- **The assertion to change**: `evals/develop-next/unit/select-next.test.mjs` — bug half of `16/H1`
- **The parser to reuse**: `proceedStatuses()` in the same file, with its `sawRow` guard
- **The dispatcher, and the rows that decide this task's shape**: `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:58-64` — `in-progress` is *"resume-aware"*, `ready-for-qa` is *"if a fix already exists"*
- **The rule this task declines to apply**: [`task.71`](../task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md) — equality on the task axis, and its §4 deferring the bug axis
- **The prose to update**: `skills/develop-next/references/roadmap-selection.md` §"Eligibility — the floor equals what the dispatcher accepts"

---

## Notes

### Important Reminders

- **This task widens nothing.** If the implementation ends with `BUG_ELIGIBLE_STATUSES` changed, it has done the wrong thing — re-read §2.
- **Lead the rationale with meaning, not risk.** The existing comment says closing the gap is risky. True, but the reason it should stay is that `develop-bug`'s extra statuses are resume affordances rather than claims that work is available. A reader given only the risk argument will eventually decide the risk is acceptable and close the gap.
- **The guard is what makes the assertion real.** Preserve `assert.ok(proceed.has("new") && proceed.has("reopened"))` verbatim.

### Why Medium priority

Nothing is broken and nothing is blocked — the floor is correct today. What is missing is the ability to notice it stopping being correct. That is worth doing before the next change to either pipeline, but it does not outrank the four tasks already in the frontier.

---

**Status:** Planned

**Next Steps**:
1. `/review-task docs/tasks/task.72.pin-bug-axis-divergence/task.72.pin-bug-axis-divergence.md`
2. `/develop-task docs/tasks/task.72.pin-bug-axis-divergence/task.72.pin-bug-axis-divergence.md`
