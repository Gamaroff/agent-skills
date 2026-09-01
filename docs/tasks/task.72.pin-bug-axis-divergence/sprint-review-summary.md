# Sprint Review Summary: Task 72

**Task:** Pin the bug-axis divergence exactly instead of asserting it loosely
**Status:** ✅ Accepted — 2026-09-01
**PR:** [#296](https://github.com/Gamaroff/agent-skills/pull/296) → `develop`
**Issue:** [#287](https://github.com/Gamaroff/agent-skills/issues/287)
**QA Gate:** PASS 100/100 (2 cycles)

---

## Summary

A test in the roadmap selector asserted that the set of bug statuses `/develop-next` will nominate is a **subset** of what `/develop-bug` accepts. That relation holds for every possible widening of the dispatcher — so the assertion was structurally silent about precisely the drift it existed to catch. Adding a fifth status to `develop-bug` would have left it green.

It now asserts the gap **exactly**: `{in-progress, ready-for-qa}`. A change on either side fails loudly.

**Nothing about the product changed.** `BUG_ELIGIBLE_STATUSES` is byte-identical, so no bug becomes newly selectable or newly excluded. What changed is what the build can *detect*.

---

## Why the gap stays — the finding that shaped the task

Task 71 made the *task* axis equal its dispatcher's accepted set, and it was right to. The obvious follow-up is to do the same for bugs. This task concludes the opposite, for a reason that is semantic rather than about risk appetite:

- `develop-task`'s pre-work statuses mean **"this is unstarted work and the pipeline will start it."** Nominating such a task is exactly right.
- `develop-bug`'s two extra statuses mean something else. `in-progress` is *"a prior run may have started; resume-aware"*; `ready-for-qa` is *"proceed toward verification if a fix already exists."* Those are **resume affordances** — written so a re-invoked pipeline does not halt on its own half-finished work.

Selecting on a resume affordance would hand an unattended overnight loop a bug a human may be actively holding, or one whose fix is written and only awaiting verification. So the equality rule is right for one axis and wrong for the other — and the divergence is now a checked fact rather than a documented intention.

---

## Technical Details

**Files modified (3):**
- `evals/develop-next/unit/select-next.test.mjs` — subset loop → exact-gap `deepStrictEqual`; test renamed; guard retained and annotated
- `skills/develop-next/references/roadmap-selection.md` — eligibility table row and rationale prose
- `skills/develop-next/scripts/select-next.mjs` — comment blocks only

**Deliberately not modified:** `BUG_ELIGIBLE_STATUSES` itself (leaving it alone is the task's conclusion), the `develop-bug` dispatcher doc (read-only input), and `CHANGELOG.md` (no observable behaviour change).

---

## Testing & QA

- **2141 tests, 0 failures**; `prettier --check` clean; CI green on the accepted head
- **Seven mutation and vacuity probes**, each reverted:

| # | Probe | Result |
|---|---|---|
| 1–3 | Shrink floor / grow dispatcher / delete from floor | RED — gap assertion |
| 4 | Rename a dispatcher row | RED — but not discriminating |
| 5 | Widen **both** sides equally | **GREEN, correctly** — proves it pins the *difference* |
| 6 | **Delete** a dispatcher row | RED — **guard only** |
| 7 | Probe 6 with the guard removed | **GREEN** — proves the guard is load-bearing |

---

## What the process caught that the work did not

Two findings, both of the same shape — a proof that confirmed something other than what it claimed.

1. **Pre-development review.** The task's mutation list credited the anti-vacuity guard to a mutation of `BUG_ELIGIBLE_STATUSES`. The guard never reads that constant — it reads the parsed dispatcher table. The mutation was split before any code was written.

2. **QA cycle 2 (refute pass).** The replacement mutation — renaming a dispatcher row — still could not prove the guard: it yields a three-element gap that `deepStrictEqual` rejects anyway, so the guard merely fired first. The discriminating mutation is to **delete** the row, which leaves the gap at exactly two elements and slips past the assertion entirely. A control run with the guard removed confirmed the test then goes green.

The guard's claim was true throughout. What was missing, twice, was a proof that could *discriminate* — the vacuous-coverage failure the task's own risk assessment names as this repository's recurring one, caught one level up: not a test that cannot fail, but a proof that could not distinguish.

---

## Impact

- A future edit to either side of the bug axis now fails a test and forces a decision, rather than drifting in silently.
- Closing the gap remains possible — but it must be deliberate, because the assertion failing is how that decision gets recorded.
- The reasoning is now recorded where a maintainer will actually land: at the assertion, in the selector's constant, and in the reference doc.

## Known Limitations

- The PR carries no human review (solo-maintained repository). Recorded as unverified rather than approved.
- The pinned gap means a legitimate `develop-bug` status change now requires editing this test. That is intended: the failure message states what each direction means, so the fix is a decision rather than a puzzle.
