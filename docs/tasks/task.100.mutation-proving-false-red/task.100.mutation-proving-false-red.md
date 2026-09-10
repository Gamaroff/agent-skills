---
id: task.100
title: "[Task 100] mutation-proving covers the false GREEN but not the false RED"
type: task
description: "The mutation-proving reference tells you to confirm a mutation applied before believing a survival — and that check works. It says nothing about the mirror: a suite that goes red because the runner never executed it, or executed the wrong change, reads exactly like a dead mutant, and is more convincing because red was the prediction. Five invalid probe readings across two independent runs, three of them false REDs that would have certified coverage never exercised — and one of those defeats the existing applied-check too."
tags: [mutation-proving, testing, evidence, shared-resources]
category: documentation
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-08
updated: 2026-09-10
assignee:
estimated_effort_hours: 2
github_issue: 368
---

# Technical Task: the false-RED mirror in mutation-proving

**Status:** Ready for Review
**GitHub Issue**: [#368](https://github.com/Gamaroff/agent-skills/issues/368)
**Review**: ✅ All review recommendations from `task.100.review.1.mutation-proving-false-red.md` implemented 2026-09-10

---

## 1. Overview

`shared/resources/mutation-proving.md` handles the **false GREEN** well. Step 2 requires diffing
against a pre-mutation copy before believing a survival, with the observed case (a literal `…` where
the source had `...`) recorded. The *"When the proof does not go red"* table covers the three reasons
a mutant survives.

It says nothing about the **mirror**: a suite that goes red for a reason other than the behaviour
you broke reads exactly like a dead mutant — and is *more* persuasive, because red was the
prediction. That covers two cases the document does not separate: the runner never executed the
suite, and the mutation changed something other than the value under test.

## 2. Motivation

Five invalid probe readings across **two independent runs**, in both directions. Rows 1-4 are from
tinker-city task.103 (2026-09-08); row 5 was found separately during agent-skills task.95
(2026-09-09) — different repository, different operator, same failure class:

| # | Cause | Presented as |
| :-- | :--- | :--- |
| 1 | mutation harness driven from a `subprocess` inherited a different Node major; the repo's own node-major guard **refused the run** | 4 dead mutants — **false RED** |
| 2 | `--reporter=basic` does not exist in that Vitest; the runner threw while loading it | 4 dead mutants — **false RED** |
| 3 | a fixture whose decoy was a *comment*, which the comment-stripper already removes — it passed with its own fix reverted | a live mutant — **false GREEN** |
| 4 | a heredoc mangled the replacement, so the mutation never applied | 2 survivors — **false SURVIVAL** |
| 5 | a mutation **mangled a shell variable rather than changing its value** — the edit landed, but it broke the script instead of altering the behaviour under test | a dead mutant — **false RED** |

Rows 3 and 4 are already covered by this document (the six shapes; step 2). **Rows 1 and 2 are not.**

The detail worth keeping: **row 1 was the repository's own guard working exactly as designed.** A
correct refusal is what made the reading convincing. Nothing in the output said "this suite did not
run" in terms a reader scanning for red would notice.

Rows 1 and 2 would have recorded a mutation matrix as complete having executed **zero** tests —
certifying coverage that was never exercised, while looking like diligence.

⚠️ **Row 5 is the hardest of the five, because it defeats both existing safeguards at once.** The
mutation *did* apply, so step 2's `diff` check passes — there is a real change in the output. The
suite *did* go red, which is what was predicted. Every signal agrees, and the proof is still void,
because the edit broke the script rather than changing the value under test. Nothing external can
catch this: the only check that works is **re-reading the mutation and confirming it expresses the
behaviour you meant to break**.

That makes row 5 a distinct shape rather than a variant of row 4. Row 4 is *no diff, unexpected
green*; row 5 is *a diff, an expected red, and the wrong thing changed*. A rule that only says
"confirm it applied" passes row 5 without comment.

The operator who found it put it in one line worth quoting in the finished section:

> *"a red test isn't self-validating."*

## 3. Technical Background

**Current state.** `shared/resources/mutation-proving.md` is 220 lines across seven H2 sections. Two
of them carry the whole verdict apparatus:

- *"The procedure"* — five numbered steps. Step 2 is the **applied-check**: `cp` the source, make the
  edit, `diff`, and refuse to believe a green run when the diff is empty.
- *"When the proof does not go red"* — a three-row table keyed on why a mutant **survived**
  (vacuous test, redundant source, wrong premise), feeding into
  *"The six shapes vacuity takes"*.

Both are organised around a **green** run that should have been red. The document has no section,
table or check keyed on a **red** run, so every red reading is treated as self-evidently a kill.

**Target state.** One additional H2 immediately after *"When the proof does not go red"*, mirroring
its shape: a four-row table keyed on why a suite went red, plus a probe-validation procedure of three
mechanical checks and one judgement. Nothing above it changes — the false-GREEN material, the six
shapes and `## Do not claim it unless you did it` are untouched, and the new section reuses their
vocabulary rather than introducing its own.

**Distribution.** The file is a shared resource, bundled verbatim into six skills
(`develop`, `double-check`, `finalise`, `qa-story`, `qa-task`, `review-security`) as
`references/mutation-proving.md`. The source is the only editable copy; `npm run bundle` regenerates
the rest, and editing a bundled copy is silently reverted on the next bundle.

---

## 4. Scope

**In scope**

- A new section, *"When the proof goes red for the WRONG reason"*, immediately after *"When the proof
  does not go red"*.
- A probe-validation procedure: **three mechanical checks plus one judgement**.
- The judgement is the row-5 check, which the mechanical three cannot catch: re-read the mutation and
  confirm it expresses the behaviour you meant to break. Say plainly that it is a judgement rather
  than dressing it as a command — nothing external can verify it.

**Out of scope**

- The existing step 1–5 procedure, the six shapes, and the `## Do not claim it unless you did it`
  section — all unchanged.
- Any tooling. This is a reference document; the fix is a rule, not a script.

## 5. Breaking Changes

None — additive prose.

## 6. Implementation Plan

- [x] **Phase 1** — add the section and its table (mirror of the existing one).
- [x] **Phase 2** — add the three MECHANICAL checks: baseline GREEN with the *exact* command
      the matrix will use; one known-bad mutation RED **killed by its named case**; the mutation
      asserted applied.
- [x] **Phase 2b** — add the row-5 check: the mutation must change the VALUE under test, not merely
      produce a diff. Include the shell-variable example, since a mangled substitution is the
      everyday way this happens and it satisfies every other check.
- [x] **Phase 3** — `npm run bundle`, commit the regenerated `references/`.

## 7. Files Summary

**Modified**

- `shared/resources/mutation-proving.md` — **+109 lines, −1** (final, after two QA fix cycles).
  New H2 `## When the proof goes red for the WRONG reason` inserted between `## When the proof
  does not go red` and `## When to do it`; frontmatter `description` extended by one clause naming
  the false-RED half (the description is the auto-activation signal, and a reader matching on it
  would otherwise not know the new material exists). **220 → 328 lines**, 7 → 8 H2 sections.
- `CHANGELOG.md` — +29 lines. Entry under Unreleased → Added: the change alters guidance that
  ships into six skills, which is consumer-visible rather than an internal refactor.
- `skills/develop/references/mutation-proving.md` — regenerated by `npm run bundle`
- `skills/double-check/references/mutation-proving.md` — regenerated
- `skills/finalise/references/mutation-proving.md` — regenerated
- `skills/qa-story/references/mutation-proving.md` — regenerated
- `skills/qa-task/references/mutation-proving.md` — regenerated
- `skills/review-security/references/mutation-proving.md` — regenerated

**Added / deleted**: none.

## 8. Testing Strategy

Prose, so the test is a **review against the five recorded readings**: each must be identifiable from
the finished section — three as the new class, two as already-covered — and a reader who follows the
checks must be unable to record any of them as evidence.

⚠️ Row 5 is the discriminating case. A draft that catches rows 1 and 2 but not row 5 has only
restated "did the runner run?", which is the easy half. **If the finished section would let row 5
through, it is not done** — that is the anti-vacuity test for this task's own deliverable.

The section's own claim to check: that the three **mechanical** checks cost ~20 seconds. If they cost
materially more, the rule will be skipped and is worth restating cheaper. The fourth is a judgement
and carries no time claim — do not give it one.

## 9. Success Criteria

1. [x] A reader can classify a red run as *a real kill* / *environmental refusal* / *invocation
       error* / *wrong thing mutated* from the table alone.
2. [x] The probe-validation procedure states all four checks, and states that a matrix collected
       before them proves nothing **in either direction**.
3. [x] The document says plainly that a **false RED is worse than a false GREEN**, and why: it
       certifies coverage that was never exercised.
4. [x] Row 5 is covered explicitly, **and the document states that it passes the applied-check** —
       a reader must not come away thinking step 2's `diff` closes it.
5. [x] The existing false-GREEN material is unchanged.

## 10. Risk Assessment

**Low.** The failure mode of the change itself is that the section is ignored. The mitigation is
placement — directly beside the question it mirrors, so a reader asking "why did my mutant survive?"
meets "and why did it die?" in the same breath.

## 11. Rollback Plan

Delete the section; `npm run bundle`.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-10
**Quality Score**: 95/100
**Gate Decision**: PASS
**QA Cycles**: 3

### QA Reports

- **Cycle 3 (latest)**: [task.100.qa.3.mutation-proving-false-red.md](./task.100.qa.3.mutation-proving-false-red.md) · gate [task.100.gate.3.mutation-proving-false-red.yml](./task.100.gate.3.mutation-proving-false-red.yml) — **PASS, 0 open issues**
- **Cycle 2**: [task.100.qa.2.mutation-proving-false-red.md](./task.100.qa.2.mutation-proving-false-red.md) · gate [task.100.gate.2.mutation-proving-false-red.yml](./task.100.gate.2.mutation-proving-false-red.yml)
- **Cycle 1**: [task.100.qa.1.mutation-proving-false-red.md](./task.100.qa.1.mutation-proving-false-red.md) · gate [task.100.gate.1.mutation-proving-false-red.yml](./task.100.gate.1.mutation-proving-false-red.yml)

### Test Coverage Summary

- **Tests Executed**: 3023 (3022 pass, 0 fail, 1 pre-existing skip) + full `eval:all` tier, exit 0
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS (`reasoned`), Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Bug Resolution Summary (QA cycle 1 → fixes applied 2026-09-10)

| ID | Severity | Resolution |
| :-- | :--- | :--- |
| `TASK-100-001` | MEDIUM | **Fixed.** The unmeasured "about twenty seconds" is replaced by a cost stated in **matrix-command runs** — "two more runs of the matrix command, plus a diff" — with the measured spread named (0.3 s scoped, 54 s whole-suite) as the reason a constant could not have been right. The cheapness argument is now the **ratio**: an N-mutation matrix already pays N runs, so validating the probe adds `2/N` (40% at five mutations, 10% at twenty). Check 4 still carries no time claim, per §8. |
| LOW-1 | LOW | **Fixed.** Both bare `Step 2` references qualified — L181 now reads "step 2 of the procedure", and the second was rewritten to "That `diff`", removing the referent question entirely. All three mentions in the file now name the procedure explicitly. |
| LOW-2 | LOW | **No action, by design.** `description` is 95 words against ~100 guidance — inside the limit. Recorded so the next editor knows the headroom is small. |

### Bug Resolution Summary (QA cycle 2 → fixes applied 2026-09-10)

Cycle 2 was a **refute pass** over the whole diff, not a re-read of the fix. All three findings are in text that cycle 1 introduced — which is the pattern the refute directive exists to catch.

| ID | Severity | Resolution |
| :-- | :--- | :--- |
| `TASK-100-002` | MEDIUM | **Fixed.** Cycle 1 replaced an unmeasured constant with an unchecked ratio: it claimed an N-mutation matrix pays N runs, so validation adds `2/N` (40% at five, 10% at twenty). But `## The procedure` runs the suite **twice per invariant** — step 3 mutated, step 5 restore-and-confirm-green — so the matrix pays ~2N and the real overhead is ~`1/N`; every percentage was exactly 2× too high. The percentages are now gone rather than corrected: the text states the comparison directly ("the procedure already runs the suite twice per invariant … adding two more is roughly one extra mutation's worth, at any N"), which is true however the reader counts and needs no arithmetic. |
| `TASK-100-003` | LOW | **Fixed.** The cycle-1 wording "That `diff`" could be read as the mangled edit's diff rather than step 2's applied-check, since the same paragraph says "There is a real diff" three sentences earlier. Now names the mechanism: "The applied-check closes the …". |
| `TASK-100-004` | LOW | **Fixed.** The same rewrite had left a 96-column line in a file wrapped at ~83; `prettier` does not reflow prose so no gate caught it. Re-wrapped in the same edit. |

### Key Findings

All five success criteria met, including SC4 — the row-5 anti-vacuity check this task named as its own falsification test. One medium finding (`TASK-100-001`): the section states *"The three cost about twenty seconds"*, which is an unmeasured constant. The three mechanical checks are two runs of the matrix command plus a diff, so the cost scales with that command — measured at 53,966 ms per whole-suite run (claim ~5× too fast) and 294 ms per scoped run (claim ~33× too slow). §8 of this task nominated that exact claim for checking, and the document ends with `## Do not claim it unless you did it`.

---

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-08 | 0.1 | Filed from four invalid probe readings measured in one consumer run — two false REDs the reference does not cover, one of which was the repository's own guard correctly refusing to run. | Claude |
| 2026-09-09 | 0.2 | Added a **fifth** reading, found independently during agent-skills task.95 — a mutation that mangled a shell variable rather than changing its value. It is the hardest of the five: the edit lands, so the applied-check passes, and the suite goes red as predicted, yet the proof is void. Promotes the evidence base from one run to **two independent runs** and makes row 5 the anti-vacuity test for this task's own deliverable. | Claude |
| 2026-09-10 | 0.3 | Review passed (9/10) — READY TO IMPLEMENT. Added the missing `## 3. Technical Background` section and renumbered §4–§11 to restore the 11-section template contract; linked GitHub issue #368. | review-task |
| 2026-09-10 |  | Status → ready-for-development | review-task |
| 2026-09-10 |  | Implemented — 7 files (1 source + 6 regenerated), 0 new tests (prose-only change; verified by review against the five recorded readings) | develop |
| 2026-09-10 |  | QA gate CONCERNS (80/100) — 1 medium, 2 low; the section's ~20s cost claim does not hold | qa-task |
| 2026-09-10 |  | QA cycle 2 (refute pass) CONCERNS (85/100) — cycle 1's finding closed; 3 new findings, all in text cycle 1 introduced | qa-task |
| 2026-09-10 |  | QA findings fixed — 2 iterations; cost claim restated without arithmetic, referent named, line re-wrapped | qa-fix |
| 2026-09-10 |  | QA cycle 3 PASS (95/100) — all 3 cycle-2 findings closed, no new findings | qa-task |
| 2026-09-10 |  | PR review (Step 5c) CONCERNS — §7 Files Summary refreshed against the final diff (PC-1) | review-pr |

## Progress Tracking

All four phases complete (2026-09-10).

| Phase | Outcome |
| :--- | :--- |
| 1 — section + table | `## When the proof goes red for the WRONG reason` added between `## When the proof does not go red` and `## When to do it`. Four-row table keyed on why a suite went **red**, mirroring the existing three-row green table's `cause / signal / response` shape. Signals are the four criterion-1 labels verbatim: *a real kill*, *environmental refusal*, *invocation error*, *wrong thing mutated*. |
| 2 — three mechanical checks | Numbered 1–3 under **Validate the probe before you trust the matrix**, with a copyable bash block. Baseline GREEN insists on the *exact* command string (this is what catches rows 1 and 2 — a refusing guard and a bad flag both fail here, before any mutation exists to blame). Check 2 requires the **named** case to be the one that fails. Check 3 is the existing step-2 `diff`. The ~20s cost claim is stated, with the reason it must stay cheap. |
| 2b — the row-5 judgement | Numbered 4, and labelled a judgement rather than a command, with no time claim. Carries the mangled-shell-variable diff (`STATU S="ready"`) and states explicitly that **it passes the applied-check** — a real diff, an expected red, every mechanical signal agreeing, and the proof still void. Closes with the discriminator: *no diff + unexpected green* is the false-GREEN case; *a diff + an expected red + the wrong thing changed* is this one. |
| 3 — bundle | `npm run bundle` run; all six `skills/*/references/mutation-proving.md` copies regenerated and verified to carry the new heading. No `references/` copy was hand-edited. |

**Anti-vacuity check (§8).** Each of the five recorded readings is identifiable from the finished section: row 1 (node-major guard refused the run) and row 2 (`--reporter=basic` threw on load) are the *environmental refusal* and *invocation error* rows, both named in the paragraph beneath the table with the "zero tests executed" consequence; row 5 is the *wrong thing mutated* row and the whole fourth check. Rows 3 and 4 remain covered where they already were — the six shapes and step 2 — and the section says so rather than re-litigating them. A reader who runs the four checks cannot record any of the five as evidence.

## References

- `shared/resources/mutation-proving.md` — the false-GREEN half this mirrors
- tinker-city `docs/tasks/task.103.dialog-migration-followups/task.103.qa.{3,4}.*.md` — rows 1-4,
  with the commands that produced each reading
- agent-skills `docs/tasks/task.95.observe-work-docs-boundaries/task.95.implementation.1.*.md` —
  row 5, and a second finding worth reading beside it: a QA report that asserted something false by
  reasoning from one platform, which is the same false-claims-in-prose pattern that produced four of
  task.103's twenty-one findings

## Notes

Companion findings from the same run: **task.99** (QA loop has no diminishing-returns exit) and
**task.101** (`fastGateCommand` default).
