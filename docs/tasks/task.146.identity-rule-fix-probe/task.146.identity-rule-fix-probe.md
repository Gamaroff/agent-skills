---
id: task.146
title: "[Task 146] qa-fix: a fix to an identity rule must prove both directions — should-merge and should-not-merge"
type: task
description: "Add an identity-rule probe to qa-fix Step 3.5 and to the qa-task / qa-story cycle-2 refute directive: when a fix changes a rule that decides whether two things are the same (a dedupe key, cache key, record identity, normaliser or equality predicate), its tests must carry a should-merge pair and a should-not-merge pair drawn from real call sites — so a key stops oscillating between splitting too much and merging too much, one QA cycle per direction."
tags: [qa-fix, qa-task, qa-story, refute-pass, identity, observation]
category: documentation
status: ready-for-review
priority: Medium
created: 2026-09-24
updated: 2026-09-25
assignee:
estimated_effort_hours: 8
github_issue: 474
---

# Technical Task: qa-fix — a fix to an identity rule must prove both directions

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.146.review.1.identity-rule-fix-probe.md` implemented 2026-09-25

**GitHub Issue**: [#474](https://github.com/Gamaroff/agent-skills/issues/474)

---

## 1. Overview

A rule that decides whether two things are *the same* — a dedupe key, a cache key, a record identity,
a normaliser, an equality predicate — can fail in two directions: it **splits** things that are one,
or it **merges** things that are two. A fix for one direction pushes toward the other, and a test
that proves only the direction the finding named has proved half of an equivalence relation. This
task adds an **identity-rule probe** to qa-fix Step 3.5 and to the cycle-2 refute directive that
qa-task and qa-story share, and a test that holds both — including the byte-parity of the two refute
directives, which nothing guards today.

**Scope**: prose in three `SKILL.md` files and one sentence of the shared reviewer contract's cycle-2 description; one test; CHANGELOG.

**Key deliverables**:

1. qa-fix Step 3.5 gains a third probe table, **For a fix to an identity rule** (obs #169).
2. The qa-task and qa-story `REFUTE PASS` directive gains an **Identity rules** paragraph after its
   four-transition list, identical in both.
3. `tests/identity-rule-probe.test.js` holds the qa-fix table, the refute entry, and the two refute
   directives' byte-parity.

**Expected outcome**: a fix to an identity rule arrives with a should-merge **and** a should-not-merge
test, so the direction the fix did not name is exercised in the same cycle instead of the next one.

---

## 2. Motivation

### Current Problems

1. **One key, patched once per direction, a QA cycle each.** task.144's record key for a `cli:`
   control decided which two probe runs are "the same control" (obs #169):
   - cycle 2 (QA-1): the whole template kept per-run paths, so a re-run **split** into a second control;
   - cycle 3 (CR-1): the fix keyed on the flag before `{input}` and **merged** two different controls;
   - cycle 4 (CR-1): the skeleton key **merged** `--mode strict` and `--mode lax`;
   - cycle 5: the key settled on a stated `--name`;
   - 5c CR-1 (fixed in PR #472): a probe declined before its template reached the result **split**
     from its corrected re-run.

   Each fix's test proved the reported direction only. The loop hit its cycle limit on this one
   mechanism and needed an operator grant.
2. **Step 3.5 has probes for two defect shapes, not this one.** Its lifecycle table (teardown,
   in-flight, error path, reconnect) and its documentation table (what did this edit make false
   elsewhere) both target a *transition* or a *neighbouring sentence*. An identity rule's failure is
   neither: it is a pair of inputs the rule classifies wrongly.
3. **The two refute directives are twins with no guard.** qa-task and qa-story each carry the same
   20-line `REFUTE PASS` block (identical today, verified by extracting both); no test holds that, so
   adding a bullet to one and not the other would pass CI.

### Benefits of Solution

- The unnamed direction is probed in the cycle that changes the rule.
- The cycle-2 refute pass — the one independent pass in the loop — looks for the pair explicitly.
- Refute-directive drift between qa-task and qa-story becomes a red test.

---

## 3. Technical Background

### Current Architecture

- `skills/qa-fix/SKILL.md` § *Step 3.5: Adversarial pass over the fixes themselves* — two probe
  tables: the lifecycle **Transition / Ask** table, and the documentation **Probe / Ask** table (obs
  #21); then *Review the combination*, *Weight by surface*.
- `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` § *Step 3b* step 2 — **Cycle 2 only
  (`REFUTE_PASS=true`) — refute, do not review.** A fenced `REFUTE PASS.` directive appended to the
  code reviewer's prompt: the four lifecycle transitions and *Review the COMBINATION*. The two blocks
  are byte-identical today.
- `shared/resources/code-review-prompt.md` — the shared reviewer prompt the directive is appended to.
  Its Prompt Template is unchanged by this task. Its cycle-2 section *describes* the refute directive
  ("Probe the four transitions …"), and that description gains the identity pair (QA cycle 1, QA-1).
- No test references `REFUTE PASS` or the Step 3.5 tables (`grep -rln 'REFUTE PASS' --include='*.js'
  --include='*.mjs' .` finds only an unrelated consumer-profile test).

### Target Architecture

- qa-fix Step 3.5, a third table after the documentation table:

  | Probe | Ask |
  | --- | --- |
  | **Should merge** | Two inputs a real call site treats as one — does the new rule give them one key? |
  | **Should not merge** | Two inputs a real call site treats as two — does the new rule still give them two? |
  | **Which direction did the last fix move?** | A fix for a split pushes toward merging, and vice versa — the test must carry the pair for the direction the finding did **not** name |

  Trigger: the fix changes a rule that decides whether two things are the same — a dedupe key, cache
  key, record identity, normaliser, equality or hash-of-key function. Pairs are drawn from **real call
  sites**, not synthetic strings, because the counter-examples that bit task.144 (`--set … --note` vs
  `--accept … --note`, `--mode strict` vs `--mode lax`) were each a real consumer's argv.
- The refute directive, one **Identity rules** paragraph after the four-transition list and before
  *Review the COMBINATION* — **not** a fifth bullet. The list is introduced as *"probe these four
  transitions"* for changes that touch emission, subscription, caching or any lifecycle; a fifth
  bullet would make "four" false and gate the identity probe on a lifecycle trigger a normaliser or
  equality-predicate change does not share (review.1). Text: the plan's Phase 2 snippet.

### Same-class mechanism inventory (obs #103)

The new table **sits beside** the two existing Step 3.5 tables: each targets a different defect
shape (a transition, a neighbouring sentence, a misclassified pair). It does not extend the
*Review the combination* paragraph, which is about two fixes interacting, not one rule's two
directions.

---

## 4. Scope

### In Scope

- ✅ qa-fix Step 3.5 identity-rule table
- ✅ qa-task and qa-story refute directive Identity rules paragraph (identical)
- ✅ `tests/identity-rule-probe.test.js`, including refute-directive parity
- ✅ CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ `shared/resources/code-review-prompt.md`'s Prompt Template — the general reviewer. (Its cycle-2
  *description* of the refute directive is in scope: it restates the directive's content.) The probe belongs where a fix is
  judged (qa-fix) and where the loop is refuted (cycle 2); adding it to every review is a wider change
  with its own noise cost. Revisit if an identity-rule defect escapes both.
- ❌ develop-bug's verify loop — no Step 3.5 of its own; revisit on an instance.
- ❌ Retro-fitting pairs to task.144's existing tests (PR #472's CR-1 fix already relies on the
  pre-existing two-names-two-controls test for its should-not-merge half).

---

## 5. Breaking Changes

None — additive QA guidance. A qa-fix cycle on an identity rule now owes one more test pair; no gate,
cycle budget or verdict rule changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.146.plan.identity-rule-fix-probe.md](task.146.plan.identity-rule-fix-probe.md)

### Phase 1: qa-fix Step 3.5 (Risk: Low)

**Files**: `skills/qa-fix/SKILL.md`

- [x] Add the **For a fix to an identity rule** paragraph and three-row table after the documentation table
- [x] Cite obs #169 and the task.144 cycles 2–5 sequence as the worked example
- [x] State the trigger list and the real-call-site rule

### Phase 2: refute directive (Risk: Low)

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

- [x] Add the **Identity rules** paragraph to the `REFUTE PASS.` block in both files, after the
      four-transition list and before *Review the COMBINATION*, byte-identical
- [x] Keep the block's existing four bullets, and their *"these four"* introduction unchanged; the closing *Review the COMBINATION* sentence changes only to name its subject ("lifecycle defect of the shape above", QA-3)

### Phase 3: test (Risk: Low)

**Files**: `tests/identity-rule-probe.test.js`

- [x] qa-fix Step 3.5 section carries the table with **Should merge** and **Should not merge** rows and cites obs #169
- [x] Each refute block carries the **Identity rules** paragraph, and its list under *"these four"* still holds exactly four `•` bullets
- [x] The two `REFUTE PASS.` blocks are byte-identical (extracted fence-to-fence); a floor asserts both were found
- [x] Mutation-prove each assertion

### Phase 4: docs and validation (Risk: Low)

**Files**: `CHANGELOG.md`

- [x] CHANGELOG `[Unreleased]` › Changed cites `(task 146)`
- [x] `npm run ci:fast`, `format:check`, `bundle --check`

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-fix/SKILL.md` — Step 3.5 identity-rule table
2. ✅ `skills/qa-task/SKILL.md` — Step 3b refute directive paragraph
3. ✅ `skills/qa-story/SKILL.md` — Step 3b refute directive paragraph
3a. ✅ `shared/resources/code-review-prompt.md` — cycle-2 description names the identity pair (QA-1; `npm run bundle` refreshes the 6 `references/` copies)

### Files to Add (Tests)

4. ✅ `tests/identity-rule-probe.test.js` — table, refute-entry, four-bullet count and parity assertions (inside the existing `tests/*.test.js` glob)

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `tests/identity-rule-probe.test.js`
  - extract qa-fix's Step 3.5 section (heading to next `### `), assert the three table rows and `obs #169`;
  - extract each `REFUTE PASS.` fenced block from qa-task and qa-story, assert the Identity rules
    paragraph in each, that the list under *"these four"* still holds exactly four `•` bullets
    (the entry sits outside it), and `assert.equal(taskBlock, storyBlock)`; the floor asserts each extraction is
    non-empty, so a renamed fence fails rather than comparing two empty strings.
- **Command**: `command node --test tests/identity-rule-probe.test.js`

### Behavioural evidence (recorded, not automated)

The test holds that the probe is **stated**; it cannot hold that a qa-fix run **applies** it. The
implementation report records one worked application: the probe run against task.144's cycle-3 fix
(the flag-before-`{input}` key) — the should-not-merge pair from uat-status's real argv
(`--set D.1 blocked --note {input}` vs `--accept D.1 --note {input}`) — showing it reports the cycle-3
defect one cycle early.

### Regression

- `npm test`; the qa-task / qa-story skill tests (`skills/qa-task/tests`, `skills/qa-story/tests`)
  still pass with the directive extended.

---

## 9. Success Criteria

### Functional

- [x] qa-fix Step 3.5 carries the identity-rule table (Should merge / Should not merge / Which direction did the last fix move?), its trigger list and the real-call-site rule, citing obs #169
- [x] qa-task's and qa-story's `REFUTE PASS.` blocks both carry the Identity rules paragraph outside the four-transition list (which still holds four bullets) and are byte-identical
- [x] The test fails when either block drifts from the other, when the entry is removed from either or moved into the four-transition list, or when a qa-fix table row is removed

### Performance

- [x] The test runs in under one second (pure file reads)
- [x] No network access

### Code Quality

- [x] Every new assertion mutation-proved
- [x] `npm run ci:fast`, `format:check`, `bundle --check` clean

### Migration

- [x] CHANGELOG `[Unreleased]` cites `(task 146)`
- [x] The implementation report records the worked application against task.144's cycle-3 key

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The trigger is read too widely**
   - Risk: qa-fix treats any comparison as an identity rule and demands pairs for trivial equality checks.
   - Probability: Low · Impact: Low
   - Mitigation: the trigger names the kinds — a rule that decides whether two *records, entries or keys* are one — and *Weight by surface* already makes Step 3.5 proportionate.

### Low Risk Areas

1. **A future edit to one refute block only** — now caught by the parity assertion, which is part of the point.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the refute directive's new paragraph measurably displaces lifecycle findings in cycle-2 reviews.
- **Steps**: revert the PR — prose and one test, no runtime code.
- **Validation**: `npm test` green on the reverted tree.

### Partial Rollback (1–2 hours)

- Revert Phase 2 alone (the refute paragraph) and keep the qa-fix table and the parity assertion.

### Forward Fix

- Reword the trigger at the site that misfires.

### Rollback Triggers

- **Critical**: none — advisory QA guidance.
- **Non-critical**: noisy probes — fix forward.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-25
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.146.qa.3.identity-rule-fix-probe.md](./task.146.qa.3.identity-rule-fix-probe.md)
- **Gate File**: [task.146.gate.3.identity-rule-fix-probe.yml](./task.146.gate.3.identity-rule-fix-probe.yml)
- Previous cycles: [qa.1](./task.146.qa.1.identity-rule-fix-probe.md) · [gate.1](./task.146.gate.1.identity-rule-fix-probe.yml) · [qa.2](./task.146.qa.2.identity-rule-fix-probe.md) · [gate.2](./task.146.gate.2.identity-rule-fix-probe.yml)

### Test Coverage Summary

- **Tests Executed**: 127
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

- Cycles 1–2: QA-1 to QA-5 fixed. Bugs [1](./task.146.bug.1.refute-description-omits-identity.md), [2](./task.146.bug.2.four-bullet-count-vacuous.md) and [3](./task.146.bug.3.qa-results-inside-change-log.md) are Ready for QA and re-proved. This section now sits above the Change Log markers.
- QA-6 (medium): the single qa-fix Change Log row sits above the gate row it answers ([bug 4](./task.146.bug.4.qa-fix-row-out-of-order.md)).
- QA-7 (low): the shared-description test's end anchor has no floor.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-24 | 1.0     | Initial draft | create-task |
| 2026-09-25 | 1.1     | Review passed (9/10) — refute Identity rules entry moved out of the four-transition list into its own paragraph; test gains a four-bullet count assertion | review-task |
| 2026-09-25 |         | Status → ready-for-development | review-task |
| 2026-09-25 |  | Implemented — 5 files, 6 tests (qa-fix Step 3.5 table, qa-task/qa-story refute paragraph, identity-rule-probe test, CHANGELOG) | develop |
| 2026-09-25 |  | QA gate CONCERNS (80/100) — 3 findings (2 medium, 1 low) | qa-task |
| 2026-09-25 |  | QA gate CONCERNS (90/100) — 2 findings (1 medium, 1 low); cycle-2 refute pass | qa-task |
| 2026-09-25 |  | QA gate CONCERNS (90/100) — 2 findings (1 medium, 1 low); cycle 3 | qa-task |
| 2026-09-25 |  | QA findings fixed — cycles 1–3 (QA-1 shared cycle-2 description, QA-2/QA-5 list-item count, QA-3 lifecycle subject, QA-4 QA Results moved out of the change-log block, QA-6 this row kept last, QA-7 end-anchor floor), 3 iterations | qa-fix |

---
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: qa-fix Step 3.5
- [x] Phase 2: refute directive
- [x] Phase 3: test
- [x] Phase 4: docs and validation

---

## References

- Observation #169 — qa-fix Step 3.5 has no probe for a fix to an identity or dedupe rule
- task.144 — [`task.144.probe-engine-cli-entry-form.md`](../task.144.probe-engine-cli-entry-form/task.144.probe-engine-cli-entry-form.md) (PR #471): QA cycles 2–5 and the implementation report's cycle entries
- PR #472 — task.144 5c CR-1: the fifth instance, fixed after the loop
- task.145 — the review-time counterpart for outcome claims (obs #168); independent of this task

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.146.qa.{N}.identity-rule-fix-probe.md`,
  `task.146.gate.{N}.identity-rule-fix-probe.yml`, bug reports `task.146.bug.{N}.{name}.md`.
- Observation #169 is resolved (`set-status --status actioned`) when this task's PR merges.
