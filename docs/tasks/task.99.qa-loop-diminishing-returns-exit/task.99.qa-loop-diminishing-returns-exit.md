---
id: task.99
title: "[Task 99] The QA loop has no exit for \"nothing is blocked, and every finding is now about the pins\""
type: task
description: "The QA loop's only stall guard measures HIGH findings. A run that reaches zero HIGH but keeps producing MEDIUM/LOW findings inside its own test machinery runs to the five-cycle limit, refining guards while the product has been finished for two cycles. Measured on a consumer run: HIGH 2,0,0,0 across four cycles, 21 findings, none of them in the three fixes. Adds a clean exit distinct from the existing escalation."
tags: [develop-pipeline, qa-loop, convergence, cost]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-08
updated: 2026-09-09
assignee:
estimated_effort_hours: 9
---

# Technical Task: A diminishing-returns exit for the QA loop

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.99.review.1.qa-loop-diminishing-returns-exit.md` implemented 2026-09-09

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
- A new **pure module** `shared/resources/qa-diminishing-returns.js` implementing the predicate the
  section describes, plus its test file. The section is the contract; the module is what a test can
  execute. Shape it on `shared/resources/review-report-freshness.js` — a library, not a CLI,
  deliberately, because its only caller is this gate and a CLI would be a second interface to keep
  honest.
- Replay fixtures under `shared/resources/tests/fixtures/qa-diminishing-returns/`.
- A new config key `qa.testArtifactGlobs` + schema documentation.
- Updating the Loop Escalation table so a clean exit cannot be read as a stall.
- Updating the **exit count** in the section preamble. The preamble was rewritten when 5c became the
  loop's exit gate and no longer contains the "three exits" sentence this task was filed against; it
  now reads *"There is **one way the loop exits to Step 7**"* and *"There are **two ways it
  escalates**"*. The first becomes **two**; the escalation count is unchanged.

**Out of scope**

- Any change to the Convergence check's arithmetic, its `HIGH_N` awk, or its escalation text. It is
  correct; this sits beside it.
- The five-cycle limit.
- The QA skills' own severity assignment.

## 5. Breaking Changes

None. Purely additive: a loop that never satisfies the new conditions behaves exactly as today.

## 6. Implementation Plan

- [x] **Phase 1 — the rule.** Add the *Diminishing-returns exit* section (text in § 7 below).
- [x] **Phase 2 — the config key.** `qa.testArtifactGlobs` in the schema and
      `docs/reference/configuration.md`, with the fail-safe direction stated. **Shape:** a list of
      glob strings, each matched against a `top_issues[].file` value interpreted as a **repo-relative
      path**. **Default: `[]`** — an empty list matches nothing, so condition 2 can never be
      satisfied and the loop behaves exactly as it does today. The fail-safe direction is therefore
      the default, not an opt-out from it.
- [x] **Phase 3 — the surrounding prose.** Loop Escalation table row; the "three exits" preamble.
- [x] **Phase 4 — the engine and its tests.** `shared/resources/qa-diminishing-returns.js`,
      the fixtures, and `shared/resources/tests/qa-diminishing-returns.test.mjs`. That test path is
      already inside the `shared/resources/tests/*.test.mjs` glob in `package.json`, so no glob edit
      is needed — but confirm the file actually runs before believing it does.
- [x] **Phase 5 — `npm run bundle`** and commit the regenerated `references/`.

## 7. The rule to add

Exit the loop with the current gate when **all** hold, evaluated from cycle 3 onward and only when
the Convergence check did **not** trip:

1. `HIGH_N == 0` **and** `HIGH_{N-1} == 0` — two consecutive gates with no blocker. Reuse the
   `HIGH_N` the Convergence check already computed; do not re-derive it, and **do not exclude
   `status: closed`** — same reasoning as there.
2. **Every** `top_issues[]` entry in the latest gate has a `file:` matching `qa.testArtifactGlobs`.
3. No finding this cycle is a product-behaviour defect. Evaluate this against the fields the gate
   actually carries — verify the QA skills' gate schema before implementing, and if `category:` is
   not among them, express the condition in terms of fields that are. **A finding whose category
   cannot be determined fails the condition**, on the same reasoning as condition 2: the exit is
   opt-in on positive evidence, never on absence.

Condition 2 is load-bearing, and it is why `file:` is **required** on every `top_issues[]` entry —
the same field the third-strike rule already depends on. **A finding with no `file:`, or one the
globs do not match, fails the condition**: the exit is opt-in on positive evidence, never on
absence.

On exit: **do not run 5b; hand to 5c exactly as a `PASS` gate does.** Since 5c became the loop's
exit gate, the only route to Step 7 is 5c returning `APPROVE` or `CONCERNS`, and this exit must not
become the one path that reaches Step 7 without a PR conformance review — that would make it a
*weaker* exit than the one a clean gate takes, on a run that by construction has stopped finding
blockers. Record the residual in the gate's `recommendations.future` **and** the work item; and write
the reason into the QA Iteration History entry explicitly — a reader must be able to tell this exit
from a stall six months later.

> This is not a licence to stop at the first quiet cycle. It needs two consecutive zero-HIGH gates
> **and** a residue that is entirely machinery. One quiet cycle is normal.

## 8. Files Summary

**Add**

- `shared/resources/qa-diminishing-returns.js` — the predicate, as a pure library (peer of
  `review-report-freshness.js`)
- `shared/resources/tests/qa-diminishing-returns.test.mjs` — the replay tests
- `shared/resources/tests/fixtures/qa-diminishing-returns/` — the reconstructed gate sequences

**Modify**

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the new section, the escalation table
  row, the preamble exit count
- `docs/reference/configuration.md` — `qa.testArtifactGlobs`
- `skills/*/references/develop-pipeline-step-5-6-qa-loop.md` — regenerated by `npm run bundle`

**Delete** — none.

## 9. Testing Strategy

The subject is runnable prose, so the honest test is a **replay against the recorded sequence**, not
a unit test of a paragraph. Two things have to exist for that to be possible, and neither did when
this task was filed:

**The thing under test.** A paragraph cannot be replayed. `shared/resources/qa-diminishing-returns.js`
is what the fixtures run through — a pure function taking the cycle's gates and the resolved
`qa.testArtifactGlobs`, returning a verdict and a reason. Grepping the new prose section for its own
sentences proves the string exists, not that the rule works, and this repository has already paid for
that mistake once (`docs/reference/anti-patterns.md` — *assert behaviour, not source text*).

**The fixtures, which are reconstructions and must say so.** The gates this task was derived from are
committed in **tinker-city**, a different repository; they are not available here, and `task.103` in
*this* repo is an unrelated task (`task.103.pipeline-owns-the-registry-tick`), so the bare reference
is ambiguous as well as unresolvable. Vendor fixtures under
`shared/resources/tests/fixtures/qa-diminishing-returns/` that reproduce the **documented shape** of
that run — HIGH `2, 0, 0, 0`; every cycle-2-onward finding carrying a test-path `file:` — and label
them in-file as reconstructions of a recorded sequence, not copies. A fixture that claims to be
someone else's committed artifact and is not is worse than an honest reconstruction.

Then:

- Replay the reconstructed four-gate sequence and assert the rule fires **at the end of cycle 3** —
  the first point where both conditions hold. (This task was filed saying "cycle 2"; §7's own rule
  cannot fire there. See the correction note below.)
- Assert it does **not** fire on the `7, 7, 7, 7, 4` sequence the Convergence check owns, at any
  cycle. The two guards must not both claim the same run.
- Assert a gate with one HIGH does not fire it, and that a MEDIUM finding on a **production** path
  does not fire it.
- **Anti-vacuity**: a fixture where every condition holds except the glob match must NOT exit — if
  it does, condition 2 is not being read.
- **Mutation-prove the whole set**: revert each condition in turn and confirm a test goes red. A
  condition no test holds is a condition that is not implemented.

## 10. Success Criteria

1. [x] The *Diminishing-returns exit* section sits after *Convergence check* and before
       `### 5b. Run QA Fix (shared)`, and states all three conditions plus the cycle ≥ 3 floor.
2. [x] The exit fires on a replay of the reconstructed four-gate sequence in
       `shared/resources/tests/fixtures/qa-diminishing-returns/`, **at the end of cycle 3** — the
       first point at which both conditions hold. The fixtures reproduce the recorded tinker-city
       task.103 shape (HIGH `2, 0, 0, 0`) and are labelled in-file as reconstructions; the original
       gates live in another repository and are not vendored.

   > **Corrected during implementation, from "cycle 2".** The two statements in this task
   > contradicted each other arithmetically. §7 requires `HIGH_N == 0` **and** `HIGH_{N-1} == 0`,
   > evaluated **from cycle 3 onward**; the recorded sequence is `2, 0, 0, 0`. At cycle 2 the
   > previous reading is 2, so condition 1 fails — and cycle 2 is below the floor besides. Two
   > consecutive zeros first exist at cycle 3. The rule as specified therefore cannot fire at
   > cycle 2, and the §11 risk table gives the reason the floor is there: "at least two full
   > adversarial passes have run".
   >
   > The consequence is worth stating rather than burying: this saves **one** cycle on the recorded
   > run (cycle 4), not the two the Motivation section counts. The exit was implemented to §7 and to
   > the risk table, which agree with each other; the "cycle 2" phrasing was the outlier, and it was
   > the optimistic one.
3. [x] The exit does **not** fire on the `7, 7, 7, 7, 4` sequence the Convergence check owns, at any
       cycle. The two guards never both claim the same run.
4. [x] A gate carrying one HIGH does not fire it; a MEDIUM finding on a **production** path does not
       fire it.
5. [x] **Anti-vacuity:** a fixture where every condition holds *except* the glob match does not
       exit. If it does, condition 2 is not being read and the rule is passing on absence.
6. [x] A `top_issues[]` entry with no `file:`, or one the globs do not match, **fails** the
       condition — the exit is opt-in on positive evidence, never on missing data.
7. [x] `qa.testArtifactGlobs` is in the schema and in `docs/reference/configuration.md`, with the
       fail-safe direction stated: a consumer matching nothing keeps today's behaviour exactly.
8. [x] The Loop Escalation table and the preamble's exit count distinguish this clean exit from a
       stall, so a reader six months later can tell which one a run took.
9. [x] The Convergence check's arithmetic, its `HIGH_N` awk and its escalation text are
       **byte-unchanged** — verified by diff, not by assertion. Name the mechanism: a test that
       pins the *Convergence check* section's content, or a recorded `git diff` over that section's
       line range in the PR. "Verified by diff" with no named diff is an intention.
10. [x] `shared/resources/qa-diminishing-returns.js` exists and is what every criterion above is
       asserted against — a test that reads the prose section's text instead of executing the module
       does not satisfy any of them.
11. [x] The diminishing-returns exit hands to **5c**, not straight to Step 7 — it is not the one path
       that reaches Step 7 without a PR conformance review.
12. [x] `npm run bundle` has been run and the regenerated `references/` copies are committed.

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

Delete the section, the config key, `qa-diminishing-returns.js`, its test and its fixtures; re-run
`npm run bundle`. Nothing else reads any of them, and the Convergence check is untouched, so rollback
restores today's behaviour exactly. Setting `qa.testArtifactGlobs: []` is the cheaper partial
rollback — it disarms the exit without removing anything, because an empty glob list can never
satisfy condition 2.

## QA Testing Results

**QA Status**: CONCERNS (cycle 3)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-09
**Quality Score**: 90/100 (cycle 2: 60/100, cycle 1: 50/100)
**Gate Decision**: CONCERNS

### QA Reports

- **Cycle 3 (latest)**: [task.99.qa.3.qa-loop-diminishing-returns-exit.md](./task.99.qa.3.qa-loop-diminishing-returns-exit.md) · [gate.3](./task.99.gate.3.qa-loop-diminishing-returns-exit.yml)
- **Cycle 2**: [task.99.qa.2.qa-loop-diminishing-returns-exit.md](./task.99.qa.2.qa-loop-diminishing-returns-exit.md) · [gate.2](./task.99.gate.2.qa-loop-diminishing-returns-exit.yml)
- **Cycle 1**: [task.99.qa.1.qa-loop-diminishing-returns-exit.md](./task.99.qa.1.qa-loop-diminishing-returns-exit.md) · [gate.1](./task.99.gate.1.qa-loop-diminishing-returns-exit.yml)

### Test Coverage Summary

- **Tests Executed**: 2936 (32 new)
- **Phases Verified**: 5/5
- **Critical Issues**: 1 HIGH, 2 MEDIUM, 3 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings

**Cycle 3.** No HIGH. One MEDIUM, and it was a direct consequence of cycle 2's own fix: widening 5c
to admit route 2 falsified a sentence further down 5c asserting that an arriving gate carries an
empty `top_issues[]` — and on route 2 plus a REQUEST CHANGES verdict, `/qa-fix` would then work the
machinery residue the exit declined to fix, resuming the pin-refining the task exists to end
(TASK-99-007, fixed).

**Cycle 3 dogfood check.** The rule was run against this run's own sequence, HIGH `1, 1, 0`. The
Convergence check does not trip (`0 >= 1` is false) and the diminishing-returns exit does not fire
(`condition 1 needs two consecutive zero-HIGH gates`). Both guards correctly decline, for the right
reasons and without overlapping — criterion 3 shown on a real sequence rather than a fixture.

**Cycle 2 (refute pass).** 5c's own entry condition — "after a gate exits 5a with `PASS` or
`WAIVED`" — excludes the `CONCERNS` gate this exit hands it, so the deliverable's exit path is
undefined in the document that defines it (TASK-99-004, HIGH). Plus two false claims in prose: the
`**Loop exit**` default sentence, and a stale "32 tests" now that the suite is 33.

**Cycle 1 (all fixed).** The glob matcher case-folds `file:` paths, so a consumer whose `qa.testArtifactGlobs` carries an
uppercase character can never take the exit — silently, and indistinguishably from an unconfigured
project. The new 32-test suite cannot detect it because every fixture path in it is lowercase,
including the anti-vacuity fixture. Filed as
[task.99.bug.1](./task.99.bug.1.glob-matching-case-folds-file-paths.md).

Two MEDIUMs: the section instructs a `**Loop exit**` row the QA Cycle template does not define, and
the invocation snippet's four variables have no documented source.

---

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-08 | 0.1 | Filed from a measured consumer run (tinker-city task.103, PR #829): HIGH `2,0,0,0` across four cycles, 21 findings, none in the three fixes, ~32 min of agent time and two 19-min CI runs spent on cycles whose findings were entirely about the pins. | Claude |
| 2026-09-09 | 0.2 | Review passed (8/10) after fixes — added the missing executable artifact (`qa-diminishing-returns.js`) and reconstructed fixtures the replay tests need, since the tinker-city gates live in another repo; corrected the exit to hand to 5c rather than bypass it; specified `qa.testArtifactGlobs` shape and `[]` default; corrected the stale "three exits" scope item; effort 6h → 9h. | review-task |
| 2026-09-09 |  | Status → ready-for-development | review-task |
| 2026-09-09 |  | Implemented — 8 files (3 added incl. 12 fixtures, 5 modified), 32 tests, all 8 conditions mutation-proved. Corrected criterion 2 from "cycle 2" to "cycle 3": §7's own rule cannot fire at cycle 2 on a `2,0,0,0` sequence. | develop |
| 2026-09-09 |  | QA gate FAIL (50/100) — 1 HIGH (glob matcher case-folds `file:` paths, silently disabling the exit for capitalised paths; the new suite cannot see it), 2 MEDIUM, 3 LOW | qa-task |
| 2026-09-09 |  | QA findings fixed — 1 HIGH + 2 MEDIUM closed, 1 iteration. The HIGH was a case-fold applied to `file:` as well as to the three enumerations, which silently disabled the exit for capitalised paths; the fix is mutation-proved and the new test is the only one in the suite that exercises a capitalised path. | qa-fix |
| 2026-09-09 |  | QA gate 2 FAIL (60/100) — cycle-2 refute pass: 1 HIGH (5c's entry condition excludes the CONCERNS gate this exit hands it) + 2 MEDIUM (two false claims in prose). Cycle 1's three findings verified fixed. | qa-task |
| 2026-09-09 |  | QA findings fixed — 1 HIGH + 2 MEDIUM closed, 2nd iteration. 5c's entry condition now names both routes out of 5a, so the exit's destination no longer refuses it; `**Loop exit**` default corrected; three stale test counts corrected. | qa-fix |
| 2026-09-09 |  | QA gate 3 CONCERNS (90/100) — no HIGH; 1 MEDIUM (route 2 falsified 5c's own empty-`top_issues` claim, which would have sent the machinery residue back to qa-fix), fixed in a 3rd iteration. Both guards verified to decline correctly on this run's own `1,1,0` sequence. | qa-task |

## Progress Tracking

**Start Date**: 2026-09-09
**Completion Date**: 2026-09-09
**Status**: All 5 phases complete; all 12 success criteria met.

### Implementation summary

A pure library, `shared/resources/qa-diminishing-returns.js`, decides the exit; the new
*Diminishing-returns exit* section in `develop-pipeline-step-5-6-qa-loop.md` is the contract it
implements and the thing a pipeline reader executes. 33 tests replay reconstructed gate sequences
through the module; 12 fixtures carry the sequences. `qa.testArtifactGlobs` is documented with a
`[]` default that makes the fail-safe direction the default rather than an opt-out.

### Implementation approach

- **Phase 4 was built first**, not last. The module plus one failing fixture came before the prose,
  so every later phase had something to prove itself against rather than something to describe.
- **HIGH counts are an input, not a re-derivation.** The Convergence check's awk already computes
  `HIGH_N` and records it in QA Iteration History; the module takes that sequence as an argument. Two
  implementations of one count drift silently, and the two guards would then disagree about the same
  run while each looked right alone. A test asserts the verdict follows the *supplied* counts even
  when they contradict the gate's contents — which is what proves the count is an input — and a
  second asserts the module source contains no HIGH-counting logic, to catch a re-derivation added
  later as a "cross-check" that happens to agree on every fixture.
- **The module reads no filesystem**, taking gate *content* and resolved config values. Same property
  and same reason as its sibling `review-report-freshness.js`: a rule that consults the disk decides
  differently in a fresh clone (CI, a `/develop-batch` worktree) than on a developer's machine, and
  this one is believed in both places.
- **The gate scanner reuses the Convergence check's two indent rules** — entry boundaries pinned to
  the first entry's indent, keys read only at the entry's own key indent — because gates carry
  multi-line `finding: >-` block scalars containing decoy `- ` lines and decoy `severity: high`
  strings. Those rules were learned expensively in the awk; re-deriving them would have meant
  re-learning them. Two fixtures carry the decoys.

### Two things the task specified that the code could not honour as written

- **`category:` does not exist.** Condition 3 was specified as "`category: bug` against a non-test
  path". Verified against the corpus before implementing, as the reviewed task required: **no gate
  carries `category:`** — entries carry `id`, `severity`, `file`, `finding`, `suggested_action`,
  `suggested_owner`, `status`. Requiring a field nothing emits would make the exit unreachable, which
  is not conservative but dead, and indistinguishable from broken. Condition 3 is therefore carried
  by `nfr_validation.*.status`, which lives in a different part of the gate from `file:` and so keeps
  condition 3 genuinely independent of condition 2 — the property the §11 risk table relies on.
  `category:` is honoured as an optional refinement for the day a QA skill emits it.
- **"Cycle 2" was arithmetically impossible.** See the note under success criterion 2. Implemented to
  §7 and the §11 risk table, which agree; the outlier phrasing was the optimistic one.

### QA cycle 1 fixes (2026-09-09)

Gate 1 read FAIL (50/100) — 1 HIGH, 2 MEDIUM. All three closed in one qa-fix iteration.

- **TASK-99-001 (HIGH)** — `readKeysInto` folded case on all four captured keys. Three are
  enumerations; `file:` is a path. Folding it meant the glob was written against the real path and
  matched against the folded one, so any glob with a capital letter could never match and the exit
  silently never fired. Fixed by folding only `severity`, `category` and `status`. **Mutation-proved:
  restoring the unconditional fold turns the new test red.**
  - The instructive part is why nothing caught it: **every fixture path and every glob in the suite
    was lowercase**, so the fold was a no-op suite-wide and 32/32 passed with the defect present —
    the anti-vacuity test included. Mutation-proving could not have found it either. It asks whether
    a test can fail when the behaviour is removed; it cannot see a fixture corpus containing no
    instance of the input class. That is a **fifth vacuity shape**, distinct from the four in
    `mutation-proving.md`, and it is the one an author reviewing their own work is least likely to
    look for.
- **TASK-99-002 (MEDIUM)** — the new section instructed writing a `**Loop exit**` row that the QA
  Cycle entry template did not define. Added to the template with its default (`n/a — loop
  continued`) and a note on who writes it, matching the existing treatment of `**PR Review**`.
- **TASK-99-003 (MEDIUM)** — the invocation snippet consumed four variables with no stated source.
  Added a binding table above it naming each one, and the rule that an orchestrator which cannot
  resolve one has not met the precondition and should continue into 5b rather than guess — which is
  what the engine already does for each of those inputs.

The three LOW items were **deliberately not fixed** and remain in the gate's `recommendations.future`:
two are latent under YAML's own rules and one is a wording preference. Refining them would be exactly
the behaviour the rule this task ships exists to stop.

### Testing results

- 33/33 tests pass in `shared/resources/tests/qa-diminishing-returns.test.mjs` (32 at the develop
  step; the 33rd is the capitalised-path regression added in qa-fix cycle 1).
- **Mutation-proved**: eight mutations, one per condition — cycle floor, both halves of condition 1,
  the empty-residue guard, the missing-`file:` guard, condition 3's NFR signal, the empty-glob
  default, glob separator handling, and condition 2 itself. Seven went red immediately. **The
  eighth — replacing condition 1 with `hN !== 0`, dropping the "two consecutive" half — stayed
  green**, because every fixture whose latest count is zero also has a zero before it. The half of
  condition 1 that does the work was held by nothing. A `2, 1, 0` case was added and that mutation
  now goes red. This is the one finding of the implementation that a passing suite had actively
  concealed.
- Full fast gate green: `npm run ci:fast` → 2936 tests, 0 failures, Prettier clean.
- Success criterion 9 verified **by diff, not by assertion**: the *Convergence check* section is
  byte-identical to its `develop` version (5624 bytes both sides).

## Bug Reports

### In QA Verification

- [Bug 1: Glob matching case-folds `file:` paths](./task.99.bug.1.glob-matching-case-folds-file-paths.md) — ✅ Ready for QA — Severity: HIGH (fixed 2026-09-09, verified at gate 2)
- [Bug 2: 5c's entry condition excludes the gate the new exit hands it](./task.99.bug.2.5c-entry-condition-excludes-the-new-exit.md) — ✅ Ready for QA — Severity: HIGH (fixed 2026-09-09, verified at gate 3)

### Closed Bugs

_None yet._

---

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
