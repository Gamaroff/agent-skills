---
id: task.266
title: "create-task asks the questions its checks miss"
type: task
description: "Add five Critical items to create-task's adversarial review (timing statistic, measured population, classifier/writer parity, second-layer defence test, seeded remedy vs existing tests) so a plan fails where it is written, not in review-task."
tags: [create-task, finalise, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 4
---

# Task 266: create-task asks the questions its checks miss

**Status:** Ready for Review

---

## 1. Overview

`create-task` § 3.5 (Adversarial Quality Review) lets five plan shapes through that `review-task` or `finalise` later catch, one round-trip late. Each is a question the author is best placed to answer while writing (obs #31, #122, #134, #154, #156). This task adds the five as four Critical items and one Should Add item (the timing bound, beside the baseline item).

**Scope**: prose in `skills/create-task/SKILL.md` § 3.5, one clause in `shared/resources/finalise-dod-ac-prompt.md`, and behavioural evidence. Observation #34 (a multi-task path and an issue-body renderer) is **not** here; see § 4.

---

## 2. Motivation

### Current Problems

1. **A timing bound names one run.** On task.184 ten runs of the same suites gave 1.08–1.62 s nine times and 4.13 s once; the criterion's wording decided the outcome twice (obs #31).
2. **A rule is specified from one example.** task.242 keyed criteria on leading ids and citations on `path:line`; of the 14 most recent task documents, 10 had no leading ids (obs #122).
3. **A classifier and its writer read the input differently.** task.246's `detect` said `unset`, `configure` refused `exists`, and the stated recovery looped (obs #134).
4. **A second defence has no test of its own.** task.255 layered `ghFreePath` behind a trip-wire; the planned tests stayed green with it removed (obs #154).
5. **A seeded remedy overrides a decision the tests hold.** The remedy cut into task.256 would have told a developer to rewrite two tests holding earlier decisions (obs #156).

### Benefits

1. Each defect is caught at authoring, where `create-task` § 3.5 already says the cost is lowest.
2. The author, not a reviewer walking a refusal path by hand, finds the loop.
3. Observation-seeded tasks stop carrying a remedy nobody tried.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/create-task/SKILL.md:543` is `#### 🚨 Critical (fix before document generation; the obs #168 item goes to the author)`; `:558` (obs #124), `:559` (obs #135) and `:560` (obs #120) are the most recent Critical items, so a new item follows that shape.
- `:562` `#### ⚡ Should Add` holds `Missing performance baselines` at `:564`, which asks for a baseline and nothing about sample size or statistic.
- `grep -n -iE "median|sample size|classifier|scratch copy" skills/create-task/SKILL.md` returns no hit for any of the five shapes.
- `shared/resources/finalise-dod-ac-prompt.md:72` already requires load (`uptime`) beside a wall-clock figure and the PR head commit; it says nothing about run count or statistic.
- `skills/create-task/scripts/lib.js:339` `seedFromObservations` seeds Target Architecture and the Implementation Plan from each Improvement; § 3.5's obs #127 item greps the Issue's current-state names only.
- No test asserts § 3.5's items today (`git grep -n "3\.5" skills/create-task/tests` returns nothing relevant). Evidence for a prose rule is behavioural (§ 8).

### Target Architecture

Four Critical items and one Should Add item, each stating the check, the command or walk that performs it, and the author's remedy. `review-task` has no twin of any of the five today: `grep -n -E "obs #(134|122|31|156)" skills/review-task/SKILL.md` returns nothing, and its check 10 (outcome reachability, obs #168) and check 21 (field names from another skill, obs #296) are different checks. The review-side twins are task 267; this task does not edit `review-task`.

### Important Clarifications

- A Critical item is fixed by the author before generation. The obs #168 item is the exception: it goes to the user. None of the five is.
- Item 5 applies to `--from-observation` only. Outside it the remedy has no seed to test.

---

## 4. Scope

### In Scope

✅ **Five items** in § 3.5: four Critical and one Should Add.
✅ **One clause** in `finalise-dod-ac-prompt.md:72` for run count and statistic (obs #31 names finalise's AC check).
✅ **Behavioural evidence** with controls for each item.

### Out of Scope

❌ **Obs #34** (multi-task fan-out and an issue-body renderer script): an engine-sized change with its own tests, filed separately; it stays `open`.
❌ **`review-task` edits**: its late catches stay as the backstop.
❌ **Retrofitting** existing task documents.

---

## 5. Breaking Changes

None - prose only.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.266.plan.create-task-asks-the-questions-its-checks-miss.md](task.266.plan.create-task-asks-the-questions-its-checks-miss.md)

### Phase 1: The five items

**Risk Level**: Low

**Files**:
- `skills/create-task/SKILL.md`

**Changes**:
- [x] A wall-clock or throughput criterion names N ≥ 5 runs, the statistic (median) against the bound, the load ceiling and that outliers are reported (obs #31). Placed in Should Add beside the baseline item.
- [x] A rule that parses or keys on a field of existing documents or agent output states the population and the command that measured how much of it carries the field (obs #122).
- [x] A plan pairing a read-only classifier with a writer that can refuse maps every refusal reason to a classifier state and states a recovery that leaves that state (obs #134).
- [x] A defence layered behind another that blocks the same input names the test that defeats the first layer and the mutation it alone turns red (obs #154).
- [x] `--from-observation`: when the seeded remedy changes an engine's verdict or refusal, grep the engine's tests for the decision it overrides and, where a suite exists, try the rule in a scratch copy against an unmodified baseline; say where the remedy was narrowed (obs #156).

**Dependencies**: none.

---

### Phase 2: The finalise clause

**Risk Level**: Low

**Files**:
- `shared/resources/finalise-dod-ac-prompt.md`
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (read only; run it)
- `tests/review-task-measured-criterion.test.js` and `tests/lib/count-of-kinds.js` (read only; both read this prompt, so run the test)

**Changes**:
- [x] Extend the wall-clock sentence at `:72` with: a bound is graded on the median of at least five runs, each with load recorded; one run is `FAIL` with `note: "re-measure"`. The clause adds no new criterion kind, so the kind count that `count-of-kinds.js` derives stays as it is.

**Dependencies**: none.

---

### Phase 3: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] Run each item against its motivating example and against a control (§ 8). Eleven drafts (five motivating, one extra different-dimension case for item 3, five controls) ran in a fresh agent against the new § 3.5, and the same eleven against the unchanged `develop` copy as a baseline; the QA report cites both.
- [x] `command npm run bundle`, then `command npm run bundle -- --check`.
- [x] Grep consumer docs for restatements of § 3.5's list.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-task/SKILL.md` - five § 3.5 items
2. ✅ `shared/resources/finalise-dod-ac-prompt.md` - run-count clause

### Files to Modify (Generated)

3. ✅ bundled copies under `skills/*/references/` - regenerated by `npm run bundle`

### Files to Modify (Tests)

None authored. `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` is run, not edited, unless the clause needs a pinned phrase (plan decides).

---

## 8. Testing Strategy

### Behavioural Evidence

**Scope**: each item fires on its motivating shape and not on a clean one.

**Actions**:
- [ ] Item 1: a draft with a single-run `time` criterion is flagged; a draft naming median of 5 under a load ceiling is not.
- [ ] Item 2: a draft keying on "leading id" without a measured population is flagged; one citing the measuring command is not.
- [ ] Item 3: a plan with `detect` classifying on parsed config and `configure` refusing on raw text is flagged. **Control (obs #176)**: a pair that disagrees on a different dimension than the motivating example (e.g. encoding, not key presence) is also flagged; a pair reading one parse is not.
- [ ] Item 4: two layers on one spawn with tests only through the first are flagged. **Control**: the same two layers with a planned test that bypasses the first layer, and the mutation only it turns red, are not flagged.
- [ ] Item 5: a seeded remedy adding a decline rule that an existing test pins is flagged. **Control**: a seeded remedy that changes no verdict or refusal, or whose overridden decision was grepped and narrowed in Technical Background, is not flagged.

**Command**: a fresh session running `create-task` § 3.5 on each draft; results go in the QA report as one row per item, with the flagged draft and the control draft each shown.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] Each of the five items is present in `skills/create-task/SKILL.md` § 3.5 and fires on its motivating shape; the five-draft results are listed in the QA report.
- [ ] Each item leaves its control draft unflagged; recorded in the QA report.
- [ ] `finalise-dod-ac-prompt.md` names run count and statistic for a wall-clock bound.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] `CI=true command node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/review-task-measured-criterion.test.js` passes.
- [ ] `command npm run bundle -- --check` reports 0 problems.
- [ ] `python skills/create-skill/scripts/quick_validate.py skills/create-task` passes.

### Migration

- [ ] No new item restates a section list (`CARD_SECTIONS_BY_KIND` stays the single definition).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. Critical list bloat**
- **Risk**: § 3.5 grows past what an author reads, and items start getting skipped.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: each item is one paragraph in the shape of #124 and #135; item 1 goes in Should Add, not Critical.
- **Rollback**: revert the item.

### Low Risk Areas

**1. The finalise clause trips the prompt-contract test**
- **Risk**: a pinned phrase moves.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: run the test in Phase 2 before anything else.
- **Rollback**: revert the clause.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- the prompt-contract test is red on `develop` after merge

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one item misfires.

**Steps**:
1. Remove that item from `SKILL.md` and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording only.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- red `develop` caused by the clause

**Non-Critical (Forward Fix)**:
- an item's wording

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-06
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.266.qa.2.create-task-asks-the-questions-its-checks-miss.md](./task.266.qa.2.create-task-asks-the-questions-its-checks-miss.md)
- **Gate File**: [task.266.gate.2.create-task-asks-the-questions-its-checks-miss.yml](./task.266.gate.2.create-task-asks-the-questions-its-checks-miss.yml)

### Test Coverage Summary
- **Tests Executed**: 7944 (full suite, cycle 1), 50 contract tests (re-run)
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No findings. Cycle 1's CHANGELOG finding is closed. The five-run timing criterion was not taken on a loaded host and is recorded as a future action.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                            | Author      |
| ---------- | ------- | ---------------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #31, #122, #134, #154, #156      | create-task |
| 2026-11-06 | 1.1     | Review passed (8/10) — corrected the false review-task twin claim, four-plus-one item count, controls for items 4 and 5, two more tests that read the finalise prompt | review-task |
|            |         | Status → ready-for-development                                         | review-task |
| 2026-11-06 |         | Implemented — 2 source files + 3 bundled copies; 50 prompt-contract tests pass; 11 drafts run against new and baseline § 3.5 | develop |
| 2026-11-06 |         | QA gate CONCERNS (90/100) — 1 finding                                  | qa-task     |
| 2026-11-06 |         | QA findings fixed — cycle 1, 1 finding (CHANGELOG entry)               | qa-fix      |
| 2026-11-06 |         | QA gate PASS (95/100) — 0 findings                                     | qa-task     |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The five items
- [x] Five § 3.5 items written

### Phase 2: The finalise clause
- [x] Clause added, contract test green

### Phase 3: Evidence, bundle and sweep
- [x] Eleven drafts run, bundle clean, sweep done

---

## References

- Observation #31 — Wall-clock criteria name no sample size or statistic
- Observation #122 — create-task plans key on document fields without measuring how many documents carry them
- Observation #134 — Classifier and gated writer read the input differently, so a refusal loops back to the state that caused it
- Observation #154 — A defence layered behind another needs a planned test that bypasses the first layer
- Observation #156 — A seeded remedy is not checked against decisions the tests already hold

---

## Notes

### Important Reminders

Obs #34 is left open on purpose: it needs a script and its own tests, and is not prose.

### Future Improvements

Task 267 (review-task) holds the review-side twins of these checks.

---

**Status:** Ready for Review
