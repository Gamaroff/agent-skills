---
id: task.99
title: "[Task 99] The QA loop has no exit for \"nothing is blocked, and every finding is now about the pins\""
type: task
description: "The QA loop's only stall guard measures HIGH findings. A run that reaches zero HIGH but keeps producing MEDIUM/LOW findings inside its own test machinery runs to the five-cycle limit, refining guards while the product has been finished for two cycles. Measured on a consumer run: HIGH 2,0,0,0 across four cycles, 21 findings, none of them in the three fixes. Adds a clean exit distinct from the existing escalation."
tags: [develop-pipeline, qa-loop, convergence, cost]
category: infrastructure
status: draft
priority: High
risk_level: medium
created: 2026-09-08
updated: 2026-09-08
assignee:
estimated_effort_hours: 6
---

# Technical Task: A diminishing-returns exit for the QA loop

**Status:** Draft

---

## 1. Overview

`shared/resources/develop-pipeline-step-5-6-qa-loop.md` has one stall guard — the **Convergence
check**. It counts HIGH findings per gate and escalates when the count stops strictly decreasing
across two consecutive cycles. It was written for an observed `7, 7, 7, 7, 4` sequence, it is
correct, and this task does not change it.

It has one blind spot: **it only measures HIGH.** A loop that reaches zero HIGH but keeps producing
MEDIUM/LOW findings **inside its own test machinery** trips nothing and runs to the five-cycle
limit.

This task adds a second, independent exit — a **clean** one, deliberately not an escalation.

## 2. Motivation

Measured on tinker-city **task.103** (PR #829, 2026-09-08). HIGH counts `2, 0, 0, 0`:

| Cycle | Gate | HIGH | Findings | Where the findings were |
| :-- | :--- | :--- | :--- | :--- |
| 1 | FAIL 50 | **2** | 6 | the new guards — a circular pin, and wiring pins defeatable by a gate |
| 2 | CONCERNS 75 | 0 | 9 | the **repairs to** cycle 1's guards |
| 3 | CONCERNS 80 | 0 | 6 | the repairs to cycle 2's repairs |
| 4 | PASS 95 | 0 | 6 | the repairs to cycle 3's repairs |

**Nothing malfunctioned.** The Convergence check evaluated correctly at cycle 3 (`0 >= 0` is true,
but `0 >= 2` is false → no trip), and cycle 4 exited via `PASS` before reaching it.

What it cost: **~32 min of adversarial-agent time and two 19-minute CI runs** for two cycles whose
findings were entirely about the pins. Total run 245 min, of which 117 min was CI.

Two further facts from that run sharpen the case:

- **Not one of the 21 findings was in the three fixes the task existed to make.** Those were correct
  in cycle 1 and were never refuted across four adversarial passes. Every finding was in machinery
  built to *pin* them, each one argument further out than the last.
- **Four of the 21 were false claims in prose** — a repair's stated rationale that measurement
  refuted — rather than defects in code.

The run reached the right conclusion itself, at cycle 4, and wrote it into the gate:

> *"what was still being found had stopped being a defect and become a property: a textual rule
> cannot establish a semantic property, so a fifth layer would relocate the gap rather than close
> it."*

**That judgement should live in the skill, not in whoever happens to be running it.**

There is precedent in the same corpus: `bug.83` reached the identical conclusion from the other
direction — a 14-line fix unrefuted through four adversarial passes while ~800 lines of protecting
machinery were refuted by all four, and were **deleted rather than hardened a fifth time**.

## 3. Technical Background

The two instruments are different and both are needed:

| | Convergence check (exists) | Diminishing-returns exit (this task) |
| :-- | :--- | :--- |
| Fires when | HIGH findings remain **and stop falling** | HIGH findings are **gone**, residue is machinery |
| Outcome | **Escalate** — the loop stopped working | **Exit cleanly** — the loop finished working |
| Because | a real blocker is unfixed | nothing is blocked; further cycles refine the pins |

Escalating a run with zero HIGH would misreport finished work as stalled — the pipeline's Fail
Loudly rule cuts the other way here. Continuing it buys cycles that examine the guards, not the
product.

## 4. Scope

**In scope**

- A new section in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, after *Convergence
  check*, before `### 5b. Run QA Fix (shared)`.
- A new config key `qa.testArtifactGlobs` + schema documentation.
- Updating the Loop Escalation table so a clean exit cannot be read as a stall.
- Updating the "three exits" sentence in the section preamble — there are now four.

**Out of scope**

- Any change to the Convergence check's arithmetic, its `HIGH_N` awk, or its escalation text. It is
  correct; this sits beside it.
- The five-cycle limit.
- The QA skills' own severity assignment.

## 5. Breaking Changes

None. Purely additive: a loop that never satisfies the new conditions behaves exactly as today.

## 6. Implementation Plan

- [ ] **Phase 1 — the rule.** Add the *Diminishing-returns exit* section (text in § 7 below).
- [ ] **Phase 2 — the config key.** `qa.testArtifactGlobs` in the schema and
      `docs/reference/configuration.md`, with the fail-safe direction stated.
- [ ] **Phase 3 — the surrounding prose.** Loop Escalation table row; the "three exits" preamble.
- [ ] **Phase 4 — `npm run bundle`** and commit the regenerated `references/`.

## 7. The rule to add

Exit the loop with the current gate when **all** hold, evaluated from cycle 3 onward and only when
the Convergence check did **not** trip:

1. `HIGH_N == 0` **and** `HIGH_{N-1} == 0` — two consecutive gates with no blocker. Reuse the
   `HIGH_N` the Convergence check already computed; do not re-derive it, and **do not exclude
   `status: closed`** — same reasoning as there.
2. **Every** `top_issues[]` entry in the latest gate has a `file:` matching `qa.testArtifactGlobs`.
3. No finding this cycle is a product-behaviour defect (`category: bug` against a non-test path).

Condition 2 is load-bearing, and it is why `file:` is **required** on every `top_issues[]` entry —
the same field the third-strike rule already depends on. **A finding with no `file:`, or one the
globs do not match, fails the condition**: the exit is opt-in on positive evidence, never on
absence.

On exit: do not run 5b; proceed to Step 7 with the current gate; record the residual in the gate's
`recommendations.future` **and** the work item; and write the reason into the QA Iteration History
entry explicitly — a reader must be able to tell this exit from a stall six months later.

> This is not a licence to stop at the first quiet cycle. It needs two consecutive zero-HIGH gates
> **and** a residue that is entirely machinery. One quiet cycle is normal.

## 8. Files Summary

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the new section, the escalation table
  row, the preamble exit count
- `docs/reference/configuration.md` — `qa.testArtifactGlobs`
- `skills/*/references/develop-pipeline-step-5-6-qa-loop.md` — regenerated by `npm run bundle`

## 9. Testing Strategy

The subject is runnable prose, so the honest test is a **replay against the recorded sequence**, not
a unit test of a paragraph:

- Replay tinker-city task.103's four gates (`task.103.gate.{1..4}.*.yml`, all committed) through the
  rule and assert it fires **at the end of cycle 2** — the first point where both conditions hold.
- Assert it does **not** fire on the `7, 7, 7, 7, 4` sequence the Convergence check owns, at any
  cycle. The two guards must not both claim the same run.
- Assert a gate with one HIGH does not fire it, and that a MEDIUM finding on a **production** path
  does not fire it.
- **Anti-vacuity**: a fixture where every condition holds except the glob match must NOT exit — if
  it does, condition 2 is not being read.

## 10. Success Criteria

1. [ ] The *Diminishing-returns exit* section sits after *Convergence check* and before
       `### 5b. Run QA Fix (shared)`, and states all three conditions plus the cycle ≥ 3 floor.
2. [ ] The exit fires on a replay of tinker-city task.103's four committed gates, **at the end of
       cycle 2** — the first point at which both conditions hold.
3. [ ] The exit does **not** fire on the `7, 7, 7, 7, 4` sequence the Convergence check owns, at any
       cycle. The two guards never both claim the same run.
4. [ ] A gate carrying one HIGH does not fire it; a MEDIUM finding on a **production** path does not
       fire it.
5. [ ] **Anti-vacuity:** a fixture where every condition holds *except* the glob match does not
       exit. If it does, condition 2 is not being read and the rule is passing on absence.
6. [ ] A `top_issues[]` entry with no `file:`, or one the globs do not match, **fails** the
       condition — the exit is opt-in on positive evidence, never on missing data.
7. [ ] `qa.testArtifactGlobs` is in the schema and in `docs/reference/configuration.md`, with the
       fail-safe direction stated: a consumer matching nothing keeps today's behaviour exactly.
8. [ ] The Loop Escalation table and the preamble's exit count distinguish this clean exit from a
       stall, so a reader six months later can tell which one a run took.
9. [ ] The Convergence check's arithmetic, its `HIGH_N` awk and its escalation text are
       **byte-unchanged** — verified by diff, not by assertion.
10. [ ] `npm run bundle` has been run and the regenerated `references/` copies are committed.

## 11. Risk Assessment

**Medium**, and the risk is one-directional: this exit ends a loop early, so a wrong rule ships work
that a later cycle would have caught.

| Risk | Mitigation |
| :--- | :--- |
| A product defect is filed with a test-file `file:` and slips the glob | Condition 3 is independent of condition 2 for exactly this; and QA assigns `file:` as "the file a fix would edit first" |
| Two zero-HIGH cycles occur early by luck, before real review depth | The rule needs cycle ≥ 3, so at least two full adversarial passes have run |
| Consumers with unusual test layouts match nothing and never exit | Fail-safe direction — they keep today's behaviour exactly. A missed exit costs time; a wrong exit costs a defect |
| The exit is mistaken for a stall in the record | Phase 3's escalation-table row exists solely to keep the two distinguishable |

## 12. Rollback Plan

Delete the section and the config key; re-run `npm run bundle`. Nothing else reads either, and the
Convergence check is untouched, so rollback restores today's behaviour exactly.

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-08 | 0.1 | Filed from a measured consumer run (tinker-city task.103, PR #829): HIGH `2,0,0,0` across four cycles, 21 findings, none in the three fixes, ~32 min of agent time and two 19-min CI runs spent on cycles whose findings were entirely about the pins. | Claude |

## Progress Tracking

Not started.

## References

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — Convergence check (the sibling guard)
- tinker-city `docs/tasks/task.103.dialog-migration-followups/` — the four gates, four QA reports
  and the implementation report this task is derived from
- tinker-city `docs/bugs/bug.83.*` — the same conclusion reached from the other direction

## Notes

The companion findings from the same run are filed separately: **task.100** (mutation-proving has no
false-RED rule) and **task.101** (`fastGateCommand` defaults to a script consumers need not have).

⚠️ **The ~70 min/task saving is extrapolated from ONE run.** It is a single data point, not a trend.
Re-measure across the next few pipeline runs before treating it as the expected return — the rule is
justified by the *shape* of what it prevents, which recurred four times within that one run, rather
than by the figure.
