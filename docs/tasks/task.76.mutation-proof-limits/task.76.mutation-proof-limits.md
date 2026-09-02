---
id: task.76
title: "[Task 76] State what a mutation proof does not tell you"
type: task
description: "mutation-proving.md answers one question well — is this test real? It never says what a suite of real tests still fails to cover, and it gives an unheld proof exactly one diagnosis when there are three. On task 67 nine proofs held while thirteen holes sat in the code, and both unheld proofs were true signals that the doc's advice would have discarded."
tags: [testing, mutation-proving, verification, documentation]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-01
updated: 2026-09-02
assignee:
estimated_effort_hours: 3
---

# Technical Task: State what a mutation proof does not tell you

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.76.review.1.mutation-proof-limits.md` implemented 2026-09-02

---

## 1. Overview

`shared/resources/mutation-proving.md` is a good document. It answers one question thoroughly — *is
this test real?* — with a procedure, five worked shapes of vacuity, and a blunt rule against claiming
proofs you did not run.

It never answers the adjacent question: **what does a suite of proven-real tests still fail to cover?**
And it gives an unheld proof exactly one diagnosis — *the test is vacuous* — when there are three, two
of which are discoveries rather than defects.

**Scope**: three additions to one document. No procedure change, no new obligation on any skill, no
schema change.

---

## 2. Motivation

### Current Problems

1. **A held proof is read as coverage, and it is not.** On task 67, **nine** mutation proofs were
   recorded and **four** were re-run independently in QA — all four held — while **thirteen** fail-open
   routes sat in the shipped classifier. The proofs were honest. Every one reverted a real behaviour and turned the right test red. They said nothing
   about the thirteen, because *a mutation proof can only falsify a check that exists.*
2. **The document invites that misreading.** Line 21 says a vacuous test "reports coverage that does not
   exist" — framing the whole exercise in the vocabulary of coverage, then never stating the limit. A
   reader who runs nine held proofs comes away believing something the technique cannot support.
3. **An unheld proof gets one diagnosis where three are possible.** The doc says: suite stays green →
   the test is vacuous → strengthen it. That is one of three causes, and on task 67 it was the *wrong*
   one both times:
   - **The source was redundant.** Disabling the `COMMAND_RUNNERS` check broke nothing, because those
     commands were already absent from the allow-list. The set was dead code. The doc's advice — write a
     better test — would have papered over that. The right response was a precedence test that made the
     set defend a plausible future edit.
   - **The premise was wrong.** Removing `--timeout` validation broke nothing, because `spawnSync`
     *throws* on NaN and negative values; the QA finding's stated mechanism was factually incorrect. The
     real hole was `--timeout 0`. Strengthening the test would have hard-coded a fiction.
4. **A boundary fix proved in one direction only.** Every proof on task 67 asserted that a refusal
   fires. None asserted that legitimate input still passes — and two of the fixes regressed exactly
   there (`2>&1` read as a command; an arithmetic placeholder read as a command name). They were caught
   by a hand-maintained legitimate-input set that the document does not ask for.

### Benefits

1. **Stops a true claim being read as a bigger one.** "Nine proofs held" is evidence about nine tests.
2. **Turns an unheld proof from a nuisance into an instrument.** Both of task 67's were informative; the
   current advice would have discarded both.
3. **Costs nothing.** Guidance in a document already referenced by every skill that mutation-proves.

---

## 3. Technical Background

### Current architecture

`shared/resources/mutation-proving.md`, 140 lines: *The procedure* · *When to do it* · *The five shapes
vacuity takes* (the fifth — *a textual rule standing in for a semantic property* — and its *Two things
work instead* coda were added after this task was filed) · *Recording it* · *Do not claim it unless you
did it*.

It is bundled into the three skills that reference it — `develop`, `qa-task` and `qa-story`.
`qa-task` Step 3c and `qa-story` defer to it by reference rather than restating it, so a change here
reaches every consumer without touching a single SKILL.md.

### Target architecture

The same document, three sections longer:

- **What this does not tell you** — the coverage limit, stated once and plainly.
- **When the proof does not go red** — a three-branch diagnosis replacing the current single one.
- **Boundaries need both directions** — a fifth entry in the *When to do it* table.

### Important clarifications

- **The five shapes stay.** They are about vacuity and remain correct and useful.
- **No skill changes.** Consumers inherit this by reference; that is the design and this task should not
  disturb it.
- **This adds no obligation.** It is guidance about interpreting a result, not a new gate.

---

## 4. Scope

### In Scope

✅ **A "what this does not tell you" section** — a held proof is evidence about a test, not about the input space
✅ **A three-branch diagnosis for an unheld proof** — vacuous test · redundant source · wrong premise
✅ **A both-directions rule for boundary fixes**, added to the *When to do it* table
✅ **Re-bundle** so every consuming skill carries the updated text

### Out of Scope

❌ **Any SKILL.md change** — consumers reference this file; that indirection is the point
❌ **Changing `mutation-proven: yes/no` in the QA report** — a richer recording is a separate question
❌ **Rewriting the five shapes, the procedure, or the do-not-claim rule** — all correct as they stand
❌ **Any new gate, check or enforcement**

---

## 5. Breaking Changes

None. Documentation only; no consumer behaviour changes unless a human acts on the new guidance.

---

## 6. Implementation Plan

### Phase 1: What a held proof does not tell you

**Risk Level**: Low

**Files**: `shared/resources/mutation-proving.md`

**Changes**:
- [x] Add a short section after *The procedure* stating the limit: a mutation proof falsifies **a check
      that exists**. It cannot speak about behaviour no test names
- [x] Give it the task-67 number, because the abstraction alone does not land: **9 proofs recorded — 4
      re-run independently in QA, all 4 held — while 13 fail-open routes sat in the code**. State the
      provenance, not a bare "9 held": this is the document whose closing section is *do not claim it
      unless you did it*, and its own example of that failure is a commit message claiming proofs
      nobody ran
- [x] Name the practical consequence — after a proof run, the open question is not "are these tests
      real?" but "what is not tested at all?", and that question needs a different instrument
      (adversarial input generation), not more proofs

**Dependencies**: none

---

### Phase 2: When the proof does not go red — three causes, not one

**Risk Level**: Low

**Files**: `shared/resources/mutation-proving.md`

**Changes**:
- [x] Replace the single "the test is vacuous" conclusion with a diagnosis table:

      | The suite stayed green because | Signal | Response |
      | --- | --- | --- |
      | the test cannot observe the behaviour | **vacuous test** | the five shapes below; fix the test |
      | something else already enforces it | **redundant source** | the reverted code may be dead — decide whether to delete it, or make it defend a case nothing else covers |
      | the behaviour was never what you thought | **wrong premise** | the finding or fix is based on a false mechanism — verify the mechanism before writing anything |

- [x] State the rule plainly: **an unheld proof is a finding, not a nuisance.** Investigate before
      strengthening the test — strengthening first is how a wrong premise gets hard-coded
- [x] Carry both task-67 cases as worked examples, in the style of the existing five shapes

**Dependencies**: Phase 1

---

### Phase 3: Boundaries need both directions

**Risk Level**: Low

**Files**: `shared/resources/mutation-proving.md`

**Changes**:
- [x] Add a row to *When to do it*: **a fix to a boundary** (validator, classifier, allow/deny-list,
      authorisation check) — scope: *both directions*
- [x] Explain: proving the refusal fires does not prove legitimate input still passes. An over-strict
      fix is as broken as a permeable one and fails just as silently
- [x] Cite the measured case: two task-67 fixes regressed legitimate input and were caught only by a
      separately maintained accept-set, not by any proof

**Dependencies**: none — independent of Phases 1–2

---

### Phase 4: Bundle

**Risk Level**: Low

**Files**: `skills/*/references/mutation-proving.md`

**Changes**:
- [x] `npm run bundle` and commit the regenerated copies — `validate.yml`'s Bundle freshness check fails
      the PR otherwise
- [x] Confirm every consuming skill picked up the change

**Dependencies**: Phases 1–3

---

## 7. Files Summary

### Files to Modify

1. ✅ `shared/resources/mutation-proving.md` — the three additions

### Files Regenerated (commit them — CI checks freshness)

2. ✅ `skills/develop/references/mutation-proving.md` — `npm run bundle` output
3. ✅ `skills/qa-task/references/mutation-proving.md` — `npm run bundle` output
4. ✅ `skills/qa-story/references/mutation-proving.md` — `npm run bundle` output

> **Edit the source, not the bundled copies.** Each `skills/*/references/mutation-proving.md` carries the
> `AUTO-GENERATED — DO NOT EDIT` banner; a change made there is reverted by the next bundle.

### Explicitly NOT modified

- **No `SKILL.md`.** `qa-task` Step 3c and its siblings reference this document rather than restating
  it, so they inherit the change. Editing them would create the second copy this indirection exists to
  prevent.

---

## 8. Testing Strategy

This is a documentation change; its correctness is editorial, and the tests that apply are the
repository's existing structural ones.

### Structural checks

- [x] `npm run bundle` leaves the tree clean — the freshness check CI runs
- [x] `npx prettier --check` passes on the changed file
- [x] `link-check` passes — any new internal link resolves **in the tracked tree**, not merely in the
      working tree

### Content verification

- [x] The three new sections are present and the four existing ones are unchanged
- [x] Each new claim carries its measured number, not just its assertion
- [x] A reader arriving from `qa-task` Step 3c reaches the diagnosis table without another hop

### Mutation Proving

Not applicable — there is no behaviour to revert. **Saying so is the honest answer**, and the document
being changed is the one that says not to claim a proof you did not run.

---

## 9. Success Criteria

### Functional

- [x] The document states that a held proof is evidence about a test, not about the input space
- [x] It carries the task-67 number with its provenance (9 recorded / 4 independently re-run and held, 13 holes) rather than the abstraction alone
- [x] An unheld proof has three named causes with distinct responses
- [x] "Investigate before strengthening the test" is stated explicitly
- [x] *When to do it* has a boundary row requiring both directions

### Regression

- [x] The procedure, the five shapes, *Recording it* and *Do not claim it* are unchanged
- [x] No SKILL.md is modified
- [x] Bundle freshness clean; Prettier clean; links resolve

### Quality

- [x] Both task-67 unheld cases appear as worked examples, matching the voice of the five shapes
- [x] The additions total **no more than ~55 lines** (≈195 lines overall, from the current 140) — it is
      read mid-task, and length is a cost. The budget is stated as a delta on purpose: the file grew from
      96 to 140 lines between this task being filed and being picked up, and an absolute cap silently
      became unmeetable. If the examples push past the budget, cut prose inside the new sections — do
      not drop an example, which the criterion above requires

---

## 10. Risk Assessment

### High Risk Areas

None. A documentation change to a file no code parses.

### Medium Risk Areas

**1. The document becomes long enough that people stop reading it**

- **Risk**: 140 → ~195 lines; it is consulted mid-task, when attention is short.
- **Probability**: Medium.
- **Impact**: Moderate — an unread document is the same as an absent one, which is the failure mode this
  whole task is about.
- **Mitigation**: the diagnosis table replaces prose rather than adding to it; the success criteria cap
  the added lines rather than the total, so the cap cannot expire; the strongest sentence in each
  section goes first.

**2. "An unheld proof is a finding" is read as "never strengthen the test"**

- **Risk**: someone stops fixing genuinely vacuous tests.
- **Impact**: Moderate.
- **Mitigation**: vacuous-test stays the **first** row of the table and keeps the five shapes; the rule
  is *investigate before strengthening*, not *do not strengthen*.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the additions are judged to obscure the procedure.

**Steps**: revert the commit; `npm run bundle`. Nothing consumes the new sections programmatically, so
removal is complete and immediate.

**Verification**: the file is 140 lines with its original six sections; bundle freshness clean.

### Forward Fix (< 2 hours)

Move the additions to a linked companion document and leave a one-line pointer, if the length rather
than the content is the problem.

---

## QA Testing Results

**QA Status**: CONCERNS → fixes applied, awaiting re-review
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-02
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.76.qa.1.mutation-proof-limits.md](./task.76.qa.1.mutation-proof-limits.md)
- **Gate File**: [task.76.gate.1.mutation-proof-limits.yml](./task.76.gate.1.mutation-proof-limits.yml)

### Test Coverage Summary

- **Tests Executed**: `npm run ci:fast` (format:check + full hermetic suite) — exit 0, zero failures
- **Phases Verified**: 4/4
- **Success Criteria Verified**: 10/10
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

All ten success criteria were verified against the file itself, and all five of the document's
empirical claims about task 67 were re-checked against the task 67 artefacts — every one accurate,
including the "nine recorded, four independently re-run" provenance, which is what `task.67.qa.1`
actually says rather than a rounding of it.

One MEDIUM finding — [task.76.bug.1.stale-frontmatter-description.md](./task.76.bug.1.stale-frontmatter-description.md):
the frontmatter `description` still describes a one-question document after this change made it a
three-question one. It is the field `coding-standards.md` calls "the most-read line of any skill",
so the two new sections are currently undiscoverable by description match.

Two LOW observations, both pre-existing and neither introduced here: the file's own bash block cannot
be executed by Step 4b (`cp` is off the fail-closed allow-list), and `skills/develop/SKILL.md` still
says "the four shapes" against a five-shape document.

### Bug Reports

**In QA Verification**

- [TASK-76-BUG-1: Frontmatter `description` still describes a one-question document](./task.76.bug.1.stale-frontmatter-description.md) — ✅ Ready for QA — Severity: MEDIUM (fixed 2026-09-02)

**Closed Bugs**

_None yet — QA closes on verification._

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                  | Author      |
| ---------- | ------- | ------------------------------------------------------------ | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.67 pipeline retrospective  | create-task |
| 2026-09-02 | 1.1     | Review passed (8/10) — corrected the target file's description (140 lines, five shapes, three consumers), re-derived the length cap as a ~55-line delta, and qualified the nine-proofs number with its provenance | review-task |
| 2026-09-02 |         | Implemented — 4 files (1 authored + 3 regenerated), 0 tests added (documentation change; no behaviour to revert) | develop |
| 2026-09-02 |         | QA gate CONCERNS (90/100) — 10/10 success criteria met, 1 MEDIUM (stale frontmatter description) | qa-task |
| 2026-09-02 |         | QA findings fixed — TASK-76-001 closed (frontmatter description rewritten to 60 words covering all three questions, re-bundled), 1 iteration | qa-fix |

---

## Progress Tracking

### Phase 1: The coverage limit
- [x] Section added, with the 9-held / 13-holes number

### Phase 2: Three causes
- [x] Diagnosis table replaces the single conclusion
- [x] "Investigate before strengthening" stated
- [x] Both task-67 cases as worked examples

### Phase 3: Both directions
- [x] Boundary row in *When to do it*

### Phase 4: Bundle
- [x] `npm run bundle`, regenerated copies committed

---

## References

- **The document**: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md)
- **Nine proofs held, thirteen holes open**: [`task.67.qa.1.execute-the-skill-qa-gate.md`](../task.67.execute-the-skill-qa-gate/task.67.qa.1.execute-the-skill-qa-gate.md) — *Mutation-proof spot check (Step 3c)* section
- **The two unheld proofs, and what they meant**: [`task.67.bug.2.extraction-and-coverage-gaps.md`](../task.67.execute-the-skill-qa-gate/task.67.bug.2.extraction-and-coverage-gaps.md) — the L3 correction
- **The over-strict regressions caught by an accept-set**: [`task.67.bug.3.obfuscated-names-and-flag-writes.md`](../task.67.execute-the-skill-qa-gate/task.67.bug.3.obfuscated-names-and-flag-writes.md)
- **The instrument for the question proofs cannot answer**: `task.73` — probe mode in the DoD security check
- **Consumer that inherits this by reference**: `skills/qa-task/SKILL.md` Step 3c

---

## Notes

### Implementation Record (develop, 2026-09-02)

**What was built.** Three sections added to `shared/resources/mutation-proving.md`, in reading order:

1. **`## What a held proof does not tell you`** — placed immediately after *The procedure*, where a
   reader arrives having just been told the technique works. States the limit (a proof falsifies a
   check that exists; behaviour no test names has nothing to revert), carries the task-67 number with
   its provenance, and names the different instrument the remaining question needs. Closes on the
   one-line form: *a held proof is evidence about a test, not about coverage.*
2. **`## When the proof does not go red`** — replaces the old three-line single conclusion in place,
   rather than adding beside it. Diagnosis table (vacuous test · redundant source · wrong premise),
   the "investigate before strengthening" rule, then both task-67 cases as worked examples in the
   voice of the five shapes, each closing on an indented takeaway.
3. **A fifth row in `## When to do it`** plus a *Both directions* paragraph, citing the two
   over-strict regressions and the accept-set that caught them.

**Deliberate choices.**

- The removed sentence's content was **kept**, not dropped: "a vacuous test … reports coverage that
  does not exist" now sits under the diagnosis table as the reason the first row is the worst of the
  three. The `git diff` shows exactly three removed lines and nothing else.
- The task-67 number is written as *nine recorded, four re-run independently in QA and all four
  held*. A bare "nine held" would have put the document in violation of its own closing section, which
  is the failure it exists to prevent.
- The new sections sit **before** the five shapes, because the diagnosis table's first row points down
  at them. Ordering is load-bearing, not cosmetic.

**Measurements.** 140 → **194 lines**; **54 added**, against a budget of ~55. `npm run bundle`
regenerated all three consuming copies. `npm run ci:fast` (`format:check` + the full hermetic suite):
**exit 0, zero failures**. No `SKILL.md` was modified — verified against `git status`.

**Mutation proving:** not applicable, and saying so is the honest answer. There is no behaviour to
revert; the change is editorial, and the document being changed is the one that says not to claim a
proof you did not run.

**One observation left for QA, deliberately not fixed.** `skills/develop/SKILL.md` points at this
document with the phrase "the four shapes this takes". That count went stale when the fifth shape was
added — *before* this task — so it is pre-existing drift, not drift this change introduced. §4 Out of
Scope forbids any `SKILL.md` change, so it stands. Worth a one-line follow-up task.

### Important Reminders

- **Do not touch a SKILL.md.** Every consumer reaches this file by reference; adding the guidance to a
  skill would create the duplicate that indirection prevents.
- **Keep the five shapes.** They are about vacuity, they are correct, and they are the most-used part of
  the document.

### Why this is Medium and not High

Nothing is broken. No gate fails, no build goes red, no defect ships because this text is missing. What
it costs is a wrong conclusion drawn confidently — "nine proofs held" read as "the boundary is covered"
— which is expensive but slow, and does not block the frontier the way `task.75` does.
