---
id: task.146
title: "[Task 146] qa-fix: a fix to an identity rule must prove both directions — should-merge and should-not-merge"
type: task
description: "Add an identity-rule probe to qa-fix Step 3.5 and to the qa-task / qa-story cycle-2 refute directive: when a fix changes a rule that decides whether two things are the same (a dedupe key, cache key, record identity, normaliser or equality predicate), its tests must carry a should-merge pair and a should-not-merge pair drawn from real call sites — so a key stops oscillating between splitting too much and merging too much, one QA cycle per direction."
tags: [qa-fix, qa-task, qa-story, refute-pass, identity, observation]
category: documentation
status: planned
priority: Medium
created: 2026-09-24
updated: 2026-09-24
assignee:
estimated_effort_hours: 8
github_issue: 474
---

# Technical Task: qa-fix — a fix to an identity rule must prove both directions

**Status:** Planned

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

**Scope**: prose in three `SKILL.md` files; one test; CHANGELOG.

**Key deliverables**:

1. qa-fix Step 3.5 gains a third probe table, **For a fix to an identity rule** (obs #169).
2. The qa-task and qa-story `REFUTE PASS` directive gains an **Identity rules** bullet, identical in both.
3. `tests/identity-rule-probe.test.js` holds the qa-fix table, the refute bullet, and the two refute
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
- `shared/resources/code-review-prompt.md` — the shared reviewer prompt the directive is appended to;
  unchanged by this task.
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
- The refute directive, one bullet after *Reconnect*:
  `• Identity rules — for every change to a dedupe/cache/record key, normaliser or equality
  predicate, find one pair that must be the same and one that must differ; a key changed to fix one
  direction has usually broken the other.`

### Same-class mechanism inventory (obs #103)

The new table **sits beside** the two existing Step 3.5 tables: each targets a different defect
shape (a transition, a neighbouring sentence, a misclassified pair). It does not extend the
*Review the combination* paragraph, which is about two fixes interacting, not one rule's two
directions.

---

## 4. Scope

### In Scope

- ✅ qa-fix Step 3.5 identity-rule table
- ✅ qa-task and qa-story refute directive bullet (identical)
- ✅ `tests/identity-rule-probe.test.js`, including refute-directive parity
- ✅ CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ `shared/resources/code-review-prompt.md` — the general reviewer. The probe belongs where a fix is
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

- [ ] Add the **For a fix to an identity rule** paragraph and three-row table after the documentation table
- [ ] Cite obs #169 and the task.144 cycles 2–5 sequence as the worked example
- [ ] State the trigger list and the real-call-site rule

### Phase 2: refute directive (Risk: Low)

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

- [ ] Add the **Identity rules** bullet to the `REFUTE PASS.` block in both files, byte-identical
- [ ] Keep the block's existing four bullets and closing paragraph unchanged

### Phase 3: test (Risk: Low)

**Files**: `tests/identity-rule-probe.test.js`

- [ ] qa-fix Step 3.5 section carries the table with **Should merge** and **Should not merge** rows and cites obs #169
- [ ] Each refute block carries the **Identity rules** bullet
- [ ] The two `REFUTE PASS.` blocks are byte-identical (extracted fence-to-fence); a floor asserts both were found
- [ ] Mutation-prove each assertion

### Phase 4: docs and validation (Risk: Low)

**Files**: `CHANGELOG.md`

- [ ] CHANGELOG `[Unreleased]` › Changed cites `(task 146)`
- [ ] `npm run ci:fast`, `format:check`, `bundle --check`

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-fix/SKILL.md` — Step 3.5 identity-rule table
2. ✅ `skills/qa-task/SKILL.md` — Step 3b refute directive bullet
3. ✅ `skills/qa-story/SKILL.md` — Step 3b refute directive bullet

### Files to Add (Tests)

4. ✅ `tests/identity-rule-probe.test.js` — table, bullet and parity assertions (inside the existing `tests/*.test.js` glob)

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
    bullet in each and `assert.equal(taskBlock, storyBlock)`; the floor asserts each extraction is
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

- [ ] qa-fix Step 3.5 carries the identity-rule table (Should merge / Should not merge / Which direction did the last fix move?), its trigger list and the real-call-site rule, citing obs #169
- [ ] qa-task's and qa-story's `REFUTE PASS.` blocks both carry the Identity rules bullet and are byte-identical
- [ ] The test fails when either block drifts from the other, when the bullet is removed from either, or when a qa-fix table row is removed

### Performance

- [ ] The test runs in under one second (pure file reads)
- [ ] No network access

### Code Quality

- [ ] Every new assertion mutation-proved
- [ ] `npm run ci:fast`, `format:check`, `bundle --check` clean

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 146)`
- [ ] The implementation report records the worked application against task.144's cycle-3 key

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

- **Triggers**: the refute directive's new bullet measurably displaces lifecycle findings in cycle-2 reviews.
- **Steps**: revert the PR — prose and one test, no runtime code.
- **Validation**: `npm test` green on the reverted tree.

### Partial Rollback (1–2 hours)

- Revert Phase 2 alone (the refute bullet) and keep the qa-fix table and the parity assertion.

### Forward Fix

- Reword the trigger at the site that misfires.

### Rollback Triggers

- **Critical**: none — advisory QA guidance.
- **Non-critical**: noisy probes — fix forward.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-24 | 1.0     | Initial draft | create-task |

---

## Progress Tracking

- [ ] Phase 1: qa-fix Step 3.5
- [ ] Phase 2: refute directive
- [ ] Phase 3: test
- [ ] Phase 4: docs and validation

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
