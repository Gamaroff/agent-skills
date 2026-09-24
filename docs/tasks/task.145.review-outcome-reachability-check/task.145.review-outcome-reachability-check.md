---
id: task.145
title: "[Task 145] review-task: trace a criterion's stated outcome through the function that decides it"
type: task
description: "Add an outcome-reachability check to review-task Step 3 (and its authoring and sibling counterparts): when a success criterion or test case states the outcome a named function produces for a named input, walk that input through the function's decision branches and confirm the outcome is one it can return — so a criterion that cannot be met is caught at review, not discovered at develop."
tags: [review-task, review-story, review-bug, create-task, anti-hallucination, observation]
category: documentation
status: ready-for-review
priority: Medium
created: 2026-09-24
updated: 2026-09-25
assignee:
estimated_effort_hours: 8
github_issue: 473
---

# Technical Task: review-task — trace a criterion's stated outcome through the function that decides it

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.145.review.1.review-outcome-reachability-check.md` implemented 2026-09-24

**GitHub Issue**: [#473](https://github.com/Gamaroff/agent-skills/issues/473)

---

## 1. Overview

`/review-task` Step 3 verifies that the functions, files and flags a task names **exist**. It does not
verify that the **outcomes** a task promises are ones those functions can **produce**. This task adds
that check — *outcome reachability* — to review-task Step 3, to the authoring-time review in
create-task Step 3.5 where the defect is introduced, and to the matching steps of review-story and
review-bug, with a population test that holds the check in every site.

**Scope**: prose checks in four `SKILL.md` files; one population test; CHANGELOG.

**Key deliverables**:

1. review-task Step 3 gains check 10, **Outcome reachability** (obs #168), beside checks 6–8.
2. create-task Step 3.5 gains the same check as a Critical item; review-story Step 4 (as check 7) and
   review-bug Step 3 gain their shape of it.
3. `tests/outcome-reachability-check.test.js` holds all four sites, with a non-vacuity floor.

**Expected outcome**: a criterion that names a verdict, exit code or status the deciding function
cannot return for the stated input is reported at review as **Important**, with the branch that
actually fires named — instead of being silently rewritten or silently failed at develop.

---

## 2. Motivation

### Current Problems

1. **A criterion that could not be met passed review.** task.144's Success Criteria and Testing
   Strategy said an accept-all fixture CLI would score `present-but-inert`. `computeVerdict` in
   `shared/resources/security-probe.mjs` cannot produce that: `present-but-inert` requires a control
   that demonstrably rejects *some* hostile input, and an accept-all rejects none, so it scores
   `absent`. `/review-task` read `computeVerdict` in full, verified seven other claims against the
   code, and passed this one (obs #168). It surfaced only at develop, when the fixture test went
   green on `absent`, and the criterion was corrected in the implementation commit.
2. **Existence is checked; reachability is not.** Step 3's nine checks ask whether a library, path,
   anchor, link, config key or sibling mechanism is real. None asks whether a *claimed output* is an
   output the named procedure has a branch for.
3. **The two defects look identical from outside.** A developer facing an unreachable criterion either
   rewrites it (the task changes under review's feet, unrecorded) or fails it (a QA cycle spent on a
   document defect). Both cost more than the review-time check.

### Benefits of Solution

- The class "the outcome named is not one this function can return for this input" is caught where it
  is cheapest — the deciding function is usually already open for the rest of Step 3.
- Authoring-time coverage (create-task Step 3.5), matching the precedent that obs #103 / #117 / #102
  set: each landed in create-task Step 3.5 **and** review-task Step 3.
- The check's four sites are held by one test, so a later edit that drops one is red.

---

## 3. Technical Background

### Current Architecture

- `skills/review-task/SKILL.md` § *Step 3: Technical Accuracy and Anti-Hallucination Review* —
  **Validation Checks** 1–9: Technology Inventory, File Path Accuracy (incl. line anchors, obs #22, and
  relative links, obs #154), API Pattern Accuracy, Database Schema Accuracy, Code Example Accuracy,
  Same-class mechanism inventory (obs #103), Figures that a test will re-measure (obs #117),
  Path-filtered workflow triggers (obs #102), Configuration Key Accuracy.
- `skills/create-task/SKILL.md` § *3.5 Adversarial Quality Review* → *🚨 Critical* — carries obs #103,
  #117 and #102 as bullets, the authoring-time twins of review-task checks 6–8.
- `skills/review-story/SKILL.md` § *Step 4: Technical Accuracy and Anti-Hallucination Review* —
  checks 1–6 (Source Verification, Technology Inventory, API Specification Accuracy, Data Model
  Accuracy, Configuration Accuracy, Reference Validation); no outcome check.
- `skills/review-bug/SKILL.md` § *Step 3: Reproducibility Clarity (the core gate)* — requires
  *Expected vs Actual* to be explicit; does not check that the Expected Behavior is an outcome the
  code path can produce for the reproduction input.
- No test pins any of review-task's numbered Step 3 checks today (`grep -rln 'obs #103' tests evals
  shared/resources/tests skills/*/tests` matches nothing).

### Target Architecture

- review-task Step 3 check **10. Outcome reachability** (obs #168): *when a success criterion, test
  case or Testing Strategy row states the outcome a named function produces for a named input — a
  verdict, an exit code, a status, a return value — open the function, walk that input through its
  decision branches, and confirm the stated outcome is the branch that fires.* Report an unreachable
  outcome as **Important**, naming the branch that does fire and the outcome it returns; report an
  outcome whose branch depends on an input the document does not pin down as **Optional** ("state the
  input"). The worked example is task.144's accept-all → `present-but-inert`.
- create-task Step 3.5 *Critical*: the same check, one bullet, citing obs #168.
- review-story Step 4 check 7 (after *6. Reference Validation*): the same check, worded for acceptance
  criteria.
- review-bug Step 3: one bullet — when the Expected Behavior names what a function returns for the
  reproduction input, confirm the fixed code can return it (an expected outcome that no branch
  produces is a fix that cannot pass its own verification).

### Same-class mechanism inventory (obs #103)

Step 3 already carries checks of the same kind — each asks "is this claim true of the code?". Check 10
**sits beside** them: checks 2, 5 and 9 verify that a named thing exists or reads a value; none walks
an input through a decision. It does not replace check 5 (*Code Example Accuracy*), which verifies
syntax and imports of examples the document contains, not outcomes it promises.

---

## 4. Scope

### In Scope

- ✅ review-task Step 3 check 10; create-task Step 3.5 Critical bullet
- ✅ review-story Step 4 check 7; review-bug Step 3 bullet
- ✅ `tests/outcome-reachability-check.test.js`
- ✅ CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ A mechanical engine that extracts outcome claims from criteria — the claims are free prose, and
  deciding which function "decides" a criterion is a reading judgement. The check is a reviewer step;
  the test holds its presence, not its execution (see § 8 for the behavioural evidence).
- ❌ create-story / review-epic / review-prd — no numbered technical-accuracy checks of this shape;
  revisit if an instance appears there.
- ❌ Re-reviewing existing planned tasks against the new check.

---

## 5. Breaking Changes

None — additive review guidance. A review may now report one more **Important** finding on a
document that states an unreachable outcome; no gate, score cap or verdict rule changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.145.plan.review-outcome-reachability-check.md](task.145.plan.review-outcome-reachability-check.md)

### Phase 1: review-task check 10 (Risk: Low)

**Files**: `skills/review-task/SKILL.md`

- [x] Add **10. Outcome reachability** (obs #168) after check 9 in Step 3 Validation Checks
- [x] Add a line to *Common Hallucination Patterns to Detect*: an outcome no branch of the named function returns for the stated input
- [x] Severity: unreachable → Important; input not pinned down → Optional

### Phase 2: authoring and sibling sites (Risk: Low)

**Files**: `skills/create-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/review-bug/SKILL.md`

- [x] create-task Step 3.5 *Critical*: **An outcome the named function cannot return** (obs #168)
- [x] review-story Step 4: check 7 (after check 6, *Reference Validation*), worded for acceptance criteria
- [x] review-bug Step 3: Expected Behavior bullet

### Phase 3: population test (Risk: Low)

**Files**: `tests/outcome-reachability-check.test.js`

- [x] Each of the four sites names the check (`obs #168`) inside the section it belongs to — section-scoped, not file-scoped
- [x] Each site's **own check item** — the list item whose first line carries `obs #168`, through to the next list item at the same indentation or the section end — carries the three load-bearing elements: the **stated input**, the **deciding function**, the **branch that fires**. Item-scoped, not section-scoped: `a function` already occurs in the review-task Step 3 and create-task Step 3.5 sections today, so a section-scoped element assertion would pass with the check absent
- [x] Non-vacuity floor: the site list is 4, and the test fails if the section extractor finds fewer than 4 sections
- [x] Mutation-prove: delete the check from each site in turn → red naming that site; and remove each element phrase from one site's item in turn → red naming the element

### Phase 4: docs and validation (Risk: Low)

**Files**: `CHANGELOG.md`

- [x] CHANGELOG `[Unreleased]` › Changed cites `(task 145)`
- [x] `npm run ci:fast`, `format:check`, `npm run validate` on the four skills

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-task/SKILL.md` — Step 3 check 10; Common Hallucination Patterns line
2. ✅ `skills/create-task/SKILL.md` — Step 3.5 Critical bullet
3. ✅ `skills/review-story/SKILL.md` — Step 4 check 7
4. ✅ `skills/review-bug/SKILL.md` — Step 3 Expected Behavior bullet

### Files to Add (Tests)

5. ✅ `tests/outcome-reachability-check.test.js` — the four-site population test (already inside the `tests/*.test.js` glob in `package.json`)

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `tests/outcome-reachability-check.test.js` — for each site, extract the named section
  (heading to next same-level heading, fences skipped), assert it names `obs #168`, then extract the
  check's own list item from that section and assert the three elements inside the item. Sites and
  their headings live in one array in the test; the floor asserts the extractor found each heading.
- **Command**: `command node --test tests/outcome-reachability-check.test.js`

### Behavioural evidence (recorded, not automated)

The population test proves the check is **stated** in every site, not that a reviewer **applies** it
(the assert-behaviour-not-source-text rule; this repository has no eval layer for the review skills).
So the implementation report records one hand run: `/review-task --validate` against a scratch copy of
task.144 with its pre-fix criterion restored (the accept-all fixture scoring `present-but-inert`),
showing the review reports it as **Important** and names the `absent` branch. Recorded as evidence of
applicability, and stated as not held by CI.

### Regression

- `npm test` — no existing test pins the Step 3 numbering; `skill-frontmatter` and bundle checks cover
  the edited SKILL.md files.

---

## 9. Success Criteria

### Functional

- [x] review-task Step 3 carries check 10 *Outcome reachability*, citing obs #168, with task.144's accept-all → `present-but-inert` as its worked example and Important / Optional severities stated
- [x] create-task Step 3.5, review-story Step 4 and review-bug Step 3 each carry their form of the check
- [x] The population test fails when the check is removed from any one of the four sections, and names that section; it also fails when any one of the three elements is removed from a site's check item

### Performance

- [x] The test runs in under one second (pure file reads)
- [x] No network access

### Code Quality

- [x] Every new assertion mutation-proved (remove the check from each site → red)
- [x] `npm run ci:fast`, `format:check`, `bundle --check` clean

### Migration

- [x] CHANGELOG `[Unreleased]` cites `(task 145)`
- [x] The implementation report records the hand run against the task.144 pre-fix criterion

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Over-firing on prose outcomes**
   - Risk: reviewers apply the check to criteria that state no function-level outcome ("the docs say X"), producing noise.
   - Probability: Medium · Impact: Low
   - Mitigation: the check's trigger is explicit — a **named function** and a **stated outcome** for a **stated input**; everything else is out of its scope, and the text says so.

### Low Risk Areas

1. **Section drift** — a later rename of a Step heading breaks the extractor; the floor turns that into a red test rather than a silent pass.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the check produces false Important findings on correct documents in normal use.
- **Steps**: revert the PR — prose and one test, no runtime code.
- **Validation**: `npm test` green on the reverted tree.

### Partial Rollback (1–2 hours)

- Revert a sibling site (review-story / review-bug) alone if its wording misfires; keep review-task and create-task.

### Forward Fix

- Tighten the trigger wording at the site that misfires; add the counter-example to the check's text.

### Rollback Triggers

- **Critical**: none — advisory review guidance.
- **Non-critical**: noisy findings — fix forward.

---
<!-- change-log-start -->
## Change Log

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-25
**Quality Score**: 70/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.145.qa.3.review-outcome-reachability-check.md](./task.145.qa.3.review-outcome-reachability-check.md)
- **Gate File**: [task.145.gate.3.review-outcome-reachability-check.yml](./task.145.gate.3.review-outcome-reachability-check.yml)

### Test Coverage Summary

- **Tests Executed**: 4002 (4001 pass, 0 fail, 1 skipped)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (MEDIUM: 3, LOW: 1)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings

- CR3-1: the fence guard regex stops four-backtick fences opening.
- CR3-2: the hallucination-pattern lines lack the current-or-planned qualifier.
- CR3-3: review-bug's stale routing is gated on PREPASS_STALE only.

## Change Log

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-25
**Quality Score**: 60/100
**Gate Decision**: FAIL

### QA Report

- **Full Report**: [task.145.qa.2.review-outcome-reachability-check.md](./task.145.qa.2.review-outcome-reachability-check.md)
- **Gate File**: [task.145.gate.2.review-outcome-reachability-check.yml](./task.145.gate.2.review-outcome-reachability-check.yml)

### Test Coverage Summary

- **Tests Executed**: 4000 (3999 pass, 0 fail, 1 skipped)
- **Phases Verified**: 4/4
- **Critical Issues**: 1 HIGH (MEDIUM: 2, LOW: 1)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings

- CR2-1 (high): the pre-implementation sites judge reachability against today's code, and create-task's auto-fix rewrites intent into current behaviour.
- CR2-2 (medium): the population test does not hold the check's verdict.
- CR2-3 (medium): review-bug passes a stale bug's already-returning branch as "reachable".
- CR2-4 (low): a closing fence at the item indent does not end the item.

## Change Log

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-25
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.145.qa.1.review-outcome-reachability-check.md](./task.145.qa.1.review-outcome-reachability-check.md)
- **Gate File**: [task.145.gate.1.review-outcome-reachability-check.yml](./task.145.gate.1.review-outcome-reachability-check.yml)

### Test Coverage Summary

- **Tests Executed**: 3998 (3997 pass, 0 fail, 1 skipped)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (MEDIUM: 2, LOW: 1)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

- CR-1 (medium): the "branch that fires" element assertion is vacuous at 3 of 4 sites; "decision branches" satisfies `/\bbranch/`.
- QA-2 (medium): the review-bug check asks a pre-fix review about "the fixed code".
- QA-3 (low): review-task's existence-check cross-reference names the wrong check.

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-24 | 1.0     | Initial draft | create-task |
| 2026-09-24 | 1.1     | Review passed (8/10) — review-story target renumbered check 5 → check 7 (checks 5–6 already exist); population test element assertions scoped to the check's own item (section scope was pre-satisfied) | review-task |
| 2026-09-24 |         | Status → ready-for-development | review-task |
| 2026-09-25 |  | Implemented — 6 files, 6 tests (4 review-skill sites, population test, CHANGELOG) | develop |
| 2026-09-25 |  | QA gate CONCERNS (80/100) — 3 findings (2 medium, 1 low) | qa-task |
| 2026-09-25 |  | QA findings fixed — cycle 1 (CR-1, QA-2, QA-3; CR-3/CR-4 reader hardening), 1 iteration | qa-fix |
| 2026-09-25 |  | QA gate FAIL (60/100) — 4 findings (1 high, 2 medium, 1 low); cycle-2 refute pass | qa-task |
| 2026-09-25 |  | QA findings fixed — cycle 2 (CR2-1 planned-state reachability, CR2-2 verdict held, CR2-3 stale-bug clause, CR2-4..7) | qa-fix |
| 2026-09-25 |  | QA gate CONCERNS (70/100) — 4 findings (3 medium, 1 low) | qa-task |
| 2026-09-25 |  | QA findings fixed — cycle 3 (CR3-1 fence regression, CR3-2 pattern lines, CR3-3 stale routing, CR3-4 named phase, CR3-5/6) | qa-fix |

---
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: review-task check 10
- [x] Phase 2: authoring and sibling sites
- [x] Phase 3: population test
- [x] Phase 4: docs and validation

---

## References

- Observation #168 — review-task does not trace a criterion's stated outcome through the deciding function
- task.144 — [`task.144.probe-engine-cli-entry-form.md`](../task.144.probe-engine-cli-entry-form/task.144.probe-engine-cli-entry-form.md) (PR #471): the accept-all criterion, corrected at develop
- `shared/resources/security-probe.mjs` `computeVerdict` — the function the worked example walks
- task.146 — the QA-loop counterpart for identity rules (obs #169); independent of this task

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.145.qa.{N}.review-outcome-reachability-check.md`,
  `task.145.gate.{N}.review-outcome-reachability-check.yml`, bug reports `task.145.bug.{N}.{name}.md`.
- Observation #168 is resolved (`set-status --status actioned`) when this task's PR merges.

### Implementation Notes (2026-09-25)

- **Sites**: review-task Step 3 check 10 + a *Common Hallucination Patterns* line; create-task 3.5
  Critical bullet (after obs #102); review-story Step 4 check 7 (after *6. Reference Validation*);
  review-bug Step 3 bullet (after *Expected vs Actual*). Each names the stated input, the named
  function and the branch that fires, and gives Important / Optional severities.
- **Test**: `tests/outcome-reachability-check.test.js`: 6 tests, about 135 ms. The section reader is
  heading-bounded and fence-aware. The item reader takes the list item whose first line cites
  `obs #168` up to the next line at its own indentation or shallower. Elements are matched on the
  item with emphasis and line wraps normalised (`asProse`), because `**named\n function**` wraps
  across lines in review-task. The deciding-function pattern was tightened from the plan's
  `/named function|a function/` to `/named function/`, since `a function` is the phrase that made
  section scope vacuous. A self-test proves the item reader does not reach a sibling item.
- **Mutation proof** (from `cp` snapshots, restored after each run): deleting the check from each of
  the 4 sites → red naming the site; removing each of the 3 elements from review-bug's item → red
  naming the element; renaming the review-bug heading → the floor goes red naming the heading.
- **QA cycle 1 fixes** (qa-fix):
  - CR-1: the branch element matches `/branch that fires/`. The dev proof had removed elements at
    review-bug only, and "decision branches" kept `/\bbranch/` green at the other three sites.
    12/12 element mutants are now red.
  - QA-2: the review-bug bullet is reworded for a pre-fix review.
  - QA-3: the existence-check cross-references are corrected. review-task now reads "Checks 1–5
    and 9", review-story "Checks 1–6".
  - CR-3 and CR-4: the readers track fences by marker kind and length (`fenceStep`), locate the
    start heading outside fences, split on CRLF, and end the item at a fence opening at its own
    indentation.
  - 8 tests. Each reader fix is mutation-proven red.
- **QA cycle 2 fixes** (qa-fix, after a refute pass returned FAIL):
  - CR2-1 (high): the three pre-implementation sites now walk the input through the function **as
    the plan leaves it**. §3 *Target Architecture* above says "walk that input through its decision
    branches". The implemented check deliberately refines that wording: an outcome a planned phase
    produces is reachable. create-task puts an unreachable outcome to the author and never
    auto-rewrites it.
  - CR2-2: each site's verdict sentence is held.
  - CR2-3: review-bug routes an already-returning branch to likely-already-fixed.
  - CR2-4, CR2-5 and CR2-6: reader and fixture hardening.
  - CR2-7: review-story gains the hallucination-pattern line.
  - 10 tests; 11/11 fix mutants red. One deliberate `no-red-untested`: the review-task
    "Confirm …" bullet restates the verdict's premise.
  - The hand run's controls never changed the deciding function, which is why they could not see
    CR2-1. That gap is recorded against obs #176.
- **QA cycle 3 fixes** (gate CONCERNS):
  - CR3-1: the cycle-2 fence guard had regressed four-backtick fences. It now tests only the text
    after the opening run.
  - CR3-2: the hallucination-pattern lines are judged against the planned state, and the test holds
    them section-wide.
  - CR3-3: review-bug's likely-already-fixed rule, STALE row and QP2 prompt also fire on the in-line
    walk.
  - CR3-4: a planned branch counts only when a named phase states it.
  - CR3-5: the create-task Critical heading names the author exception.
  - CR3-6: verdict holds are anchored on the imperative.
  - 11 tests; 9/9 fix mutants red.
