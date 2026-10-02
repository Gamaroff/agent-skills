---
id: task.166
title: "[Task 166] Give measured non-functional criteria a defined path through review and finalise"
type: task
description: "Add a third test-free criterion kind — a measured criterion with a stated bound and a cited committed measurement — to finalise's DoD AC prompt, and have review-task flag a non-functional success criterion that states no bound, so a timing or size criterion is neither failed by rule nor passed by override (observation #206); and have review-task classify every success criterion the way finalise will, flagging a behaviour criterion with no planned test and a criterion that can only be met after merge (observation #222)."
tags: [finalise, review-task, definition-of-done, success-criteria, observe-work]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-28
updated: 2026-10-02
assignee:
estimated_effort_hours: 6
github_issue: 510
---

# Technical Task: Give measured non-functional criteria a defined path through review and finalise

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.166.review.1.measured-non-functional-criteria.md` implemented 2026-10-02

**GitHub Issue**: [#510](https://github.com/Gamaroff/agent-skills/issues/510)

---

## 1. Overview

Finalise's AC traceability agent judges each success criterion by `shared/resources/finalise-dod-ac-prompt.md`. The prompt lets exactly two kinds of criterion pass without a per-PR test: "no unit tests applicable" (the work item says so) and a documentation criterion. A **measured** non-functional criterion, such as a runtime, size or count bound, is neither kind, so it fails by rule even when the measurement meets the bound. On task.164 this failed AC7 ("No measurable change beyond the new 4b test's three runs"). The orchestrator could only halt on a satisfied criterion, override the prompt (which the prompt forbids), or ask the user. It asked, and the user accepted the criterion as a recorded deviation (observation #206).

This task gives the measured criterion a defined path at both ends:

- finalise's AC prompt gains a third kind with its own bar;
- `review-task` flags a non-functional criterion that states no bound, at review time, where it can still be rewritten;
- `review-task` classifies every success criterion by finalise's kinds, and flags the two shapes finalise fails by construction: a behaviour criterion that names no test to hold it, and a criterion that can only be met after merge (observation #222, folded in 2026-09-30).

**Scope**:
- `shared/resources/finalise-dod-ac-prompt.md` § Step 3 (the test-free kinds)
- `skills/review-task/SKILL.md` § Step 6 check 4, "Success Criteria Measurability"
- A pinning test for each

**Key deliverables**:

1. The AC prompt names three test-free kinds. The third is a **measured criterion**: `PASS` requires a stated bound, and a measurement meeting it, cited from a committed artifact with the command that produced it. A criterion with no bound is not a measured criterion, and fails unless a per-PR test holds it.
2. `review-task` raises an **Important** finding for a non-functional success criterion held by neither a planned per-PR test nor a numeric bound with its measuring command.
3. `review-task` raises an **Important** finding for a behaviour criterion that names no test planned to hold it, and for a success criterion that can only be satisfied after merge or acceptance, with the remedy for each (name the test, or move the item to Deferred Work).
4. Tests fail when any of these rules is removed or weakened.

---

## 2. Motivation

### Current Problems

1. **A satisfied criterion fails by rule.** On task.164, AC7 was met by measurement: 13–16s per run on an idle host (37–42s under load), and no production code changed. It still returned `FAIL`, because `finalise-dod-ac-prompt.md` § Step 3 says "A behaviour criterion never takes either path".
2. **The only exits erode the rule.** The prompt itself records why overriding is wrong: "a check that is overridden on every run is not a check". Halting on satisfied work is wrong too. Asking the user worked once but is not a rule.
3. **The criterion was unmeasurable as written, and nothing said so.** "No measurable change beyond …" names no bound. `/create-task` wrote it, and `/review-task` passed it, because its Step 6 check 4 asks only that a criterion "should be verifiable". The defect was introduced at authoring and first noticed at acceptance, two pipeline steps later.

4. **The same shape halted two more tasks.** review-task passed success criteria that finalise then failed by construction: task.126 ("no measurable change to bundle time"), and task.142 on 2026-09-30 — three behaviour claims with no planned test ("no process spawn", "SKILL.md reads memoised", "no wall-clock change") and one post-merge item ("observation #159 marked actioned once this merges"), halting at `/finalise` after gate PASS 100 and 5c APPROVE (`task.142.dod.1.reference-doc-skill-pinning.md`). Observation #222 records both; the post-merge shape is not a measured criterion and needs its own rule.

### Benefits

1. A measured criterion with a bound has a mechanical pass/fail bar. It needs neither an override nor a user decision.
2. An unbounded one is caught at review, where rewriting it costs one edit.
3. The obs #204 pattern holds: each test-free kind is defined once, with its own bar, and pinned.

---

## 3. Technical Background

### Current Architecture

- `shared/resources/finalise-dod-ac-prompt.md` § Step 3 (anchor: `**Two kinds of criterion may carry \`test_citation: "NOT_APPLICABLE: …"\`, and only these two:**`):
  - **"No unit tests applicable."**: `PASS` with a note citing the task's line.
  - **A documentation criterion.**: `code_citation` is the document line, read and summarised; `test_citation` is a pinning test if one exists, else `"NOT_APPLICABLE: documentation criterion"`.
  - Then: "`test_runs_per_pr` is `null` on both kinds … **A behaviour criterion never takes either path.**"
  - The documentation kind was added by obs #204 (`aece92db`, merged via PR #505) **with no test**.
- Bundled copy: `skills/finalise/references/finalise-dod-ac-prompt.md` (AUTO-GENERATED). finalise dispatches it as its agent 1 in Step 3b.
- `skills/review-task/SKILL.md` § Step 6 "Consistency and Completeness Review", check **4. Success Criteria Measurability**: "Each criterion should be verifiable / Should cover functional, performance, quality aspects / Should align with stated benefits". It gives no severity for an unmeasurable criterion. Check 10 (outcome reachability, obs #168) covers a named function's outcome, not a measured bound.
- Neither `skills/finalise/` nor `skills/review-task/` has a `tests/` directory. `package.json`'s `test` script lists per-skill test globs by hand, so a new `skills/*/tests/` directory would run nowhere unless it is added. The existing homes are `shared/resources/tests/*.test.mjs` and `tests/*.test.js`.

### Target Architecture

- § Step 3 names **three** test-free kinds. The third:
  - **A measured criterion.** A non-functional bound (runtime, size, count, rate) whose natural evidence is a measurement, not a per-PR test.
    - `code_citation`: the committed artifact line that records the measurement and the command that produced it, typically the implementation report or a QA report.
    - `test_citation`: `"NOT_APPLICABLE: measured criterion"`, unless a test pins the bound, in which case the criterion is an ordinary behaviour criterion and takes the normal path.
    - `PASS` when the criterion states a bound, the cited measurement meets it, and the command is named. `FAIL` when the bound is missing ("no measurable change", "fast enough"), the measurement is uncited or uncommitted, or it misses the bound.
  - The closing sentence becomes "`test_runs_per_pr` is `null` on all three kinds … **A behaviour criterion never takes any of these paths.**" The measured kind must not become a back door for behaviour that could be tested.
  - The Execution rule (§ Step 5: "The two `NOT_APPLICABLE` kinds in Step 3 carry `null` here …") restates the count. It drops the count ("The `NOT_APPLICABLE` kinds in Step 3 …"), so the heading sentence is the file's one count of the kinds (review 1).
- `review-task` Step 6 check 4 also classifies each success criterion as finalise's AC prompt will — behaviour (needs a per-PR test), documentation, "no unit tests applicable", or measured — and raises **Important** for (a) a behaviour criterion whose text or phase names no test planned to hold it ("name the test, or re-scope it"), and (b) a criterion that can only be met after merge or acceptance, such as closing an observation or a tracker item on merge ("move it to Deferred Work — finalise runs before merge"). The worked examples are task.142's AC7/AC8 (behaviour) and AC16 (post-merge).
- `review-task` Step 6 check 4 gains a rule: a non-functional success criterion (Performance, or any criterion bounding time, size, count or rate) must be held by a planned per-PR test, or state a **numeric bound** and **how it is measured**. A criterion held by neither a planned per-PR test nor a numeric bound with its measuring command is **Important** ("name the test that pins it, or state the bound and the command"). The example is task.164's AC7 wording.
- Tests:
  - `shared/resources/tests/finalise-dod-ac-kinds.test.mjs` pins the AC prompt: the section states the number of kinds, the number of bulleted kinds equals it, each kind has its `test_citation` string, the measured kind's `PASS` requires a bound and a cited command, and the closing sentence covers all kinds. It also checks that the bundled copy under `skills/finalise/references/` matches the source body.
  - `tests/review-task-measured-criterion.test.js` pins the review-task rules: check 4 carries the bound-and-measurement rule, the behaviour-without-test rule and the post-merge rule, each at severity Important.

### Important Clarifications

- **A pin on prompt text is the available guard, and it is a weak one.** These prompts are executed by an agent, not code, so a test can hold their structure but not their effect. The tests pin the *structure the rule depends on*: the kind count, each kind's bar, and the closing sentence's reach. Behaviour evidence is the next real finalise run that meets a measured criterion; the task's DoD run can supply it if it has one.
- **`create-task` is not changed.** Its Section 9 prompt could ask for a bound at authoring. That is a smaller, separate improvement, left out of scope here by choice. review-task catches the defect one step later.

---

## 4. Scope

### In Scope

✅ `shared/resources/finalise-dod-ac-prompt.md`: the third test-free kind, and the closing sentence covering all kinds
✅ `skills/review-task/SKILL.md`: Step 6 check 4 bound-and-measurement rule, severity Important
✅ `shared/resources/tests/finalise-dod-ac-kinds.test.mjs` (new): pins the AC prompt's kinds, including the obs #204 documentation kind that shipped untested
✅ `tests/review-task-measured-criterion.test.js` (new): pins the review-task rule
✅ Bundled copy regenerated; CHANGELOG `[Unreleased]` entry citing (task 166)
✅ Post-merge, not a success criterion: observations #206 and #222 marked actioned (see Notes)

### Out of Scope

❌ `create-task` Section 9 authoring guidance (by choice; see Clarifications)
❌ `review-story` (stories carry acceptance criteria, which finalise already routes as behaviour)
❌ Any change to finalise's decision matrix or `AC_OVERALL` aggregation (the agent's per-criterion status is unchanged in shape)

---

## 5. Breaking Changes

None to any interface. One behaviour change: a finalise run with a bounded, measured, cited non-functional criterion now returns `PASS` for it instead of `FAIL`. A run with an unbounded criterion still returns `FAIL` unless a per-PR test holds it, and `review-task` now flags an untested unbounded criterion earlier.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.166.plan.measured-non-functional-criteria.md](task.166.plan.measured-non-functional-criteria.md)

Independent of task.165. It can land before or after it.

### Phase 1: finalise's AC prompt defines the measured criterion

**Risk**: Medium. A too-loose definition becomes a back door for testable behaviour.

**Files**: `shared/resources/finalise-dod-ac-prompt.md`

- [x] Change "Two kinds … only these two" to "Three kinds … only these three".
- [x] Add the **measured criterion** bullet: what qualifies (a non-functional bound whose natural evidence is a measurement), its `code_citation` (the committed artifact line with the command), its `test_citation` string, and its `PASS` / `FAIL` bar.
- [x] Extend the closing sentence to "all three kinds" / "any of these paths", and add one line: a criterion whose bound a per-PR test could assert is a behaviour criterion, not a measured one.
- [x] Drop the count from the Execution rule's "The two `NOT_APPLICABLE` kinds in Step 3" (§ Step 5), so the heading sentence is the only count of the kinds in the file.

### Phase 2: review-task flags an unbounded non-functional criterion

**Risk**: Low.

**Files**: `skills/review-task/SKILL.md`

- [x] Step 6 check 4: add the bound-and-measurement rule with severity **Important**, the remedy ("state the bound and the command, or replace it with a test that pins it"), and task.164's AC7 as the worked example.
- [x] Add the behaviour-without-test and post-merge rules (observation #222) to check 4, each with its remedy and task.142 as the worked example.
- [x] Add all three findings to the Step 6 "Issues to Flag" list under **Important**.

### Phase 3: Pin both rules

**Risk**: Low.

**Files**: `shared/resources/tests/finalise-dod-ac-kinds.test.mjs` (new), `tests/review-task-measured-criterion.test.js` (new)

- [x] AC prompt pin: the kind count stated in the heading sentence equals the number of top-level bulleted kinds under it (floor: 3). Each kind carries its `test_citation` string. The measured kind's bar names "bound" and "command". The closing sentence covers all kinds. No other sentence in the file states a count of `NOT_APPLICABLE` kinds. The source body equals the bundled copy's body, minus the AUTO-GENERATED header.
- [x] review-task pin: check 4 contains the bound-and-measurement rule, the behaviour-without-test rule and the post-merge rule, each at severity Important.
- [x] Confirm `npm test` picks both files up via `shared/resources/tests/*.test.mjs` and `tests/*.test.js`, and grep `package.json` before assuming.

### Phase 4: Proof and gates

**Risk**: Low.

- [x] Mutation-prove under bash, with `cp` snapshots and `cmp`-checked restore:
  - revert "three" to "two" in the heading → AC pin red;
  - drop the measured-criterion bullet → AC pin red;
  - drop "bound" from its `PASS` bar → AC pin red;
  - revert the closing sentence to "both kinds" → AC pin red;
  - restore "The two `NOT_APPLICABLE` kinds" in the Execution rule → AC pin red;
  - delete the documentation kind's `test_citation` string → AC pin red (the obs #204 kind is now covered);
  - drop review-task's bound rule, or change its severity → review-task pin red;
  - drop the behaviour-without-test rule, or the post-merge rule → review-task pin red.
- [x] `npm run bundle`, `npm run ci:fast` with `.agents/skills` moved aside, `npm run bundle:check`, `npm run validate -- skills/finalise/ skills/review-task/`.
- [x] CHANGELOG `[Unreleased]` entry citing (task 166).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finalise-dod-ac-prompt.md`: the measured-criterion kind
2. ✅ `skills/review-task/SKILL.md`: Step 6 check 4 rule

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/finalise-dod-ac-kinds.test.mjs` (new)
4. ✅ `tests/review-task-measured-criterion.test.js` (new)

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`: `[Unreleased]` entry
6. ✅ `skills/finalise/references/finalise-dod-ac-prompt.md`: regenerated by `npm run bundle` (never edited by hand)
7. ✅ `skills/review-task/references/finalise-dod-ac-prompt.md` (new): bundled by `npm run bundle` because check 4 now cites the AC prompt's Step 3 (a citation bundles that file alone)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the AC prompt's kinds and bars; the review-task rule
- **Command**: `node --test shared/resources/tests/finalise-dod-ac-kinds.test.mjs tests/review-task-measured-criterion.test.js`
- **Target**: each Phase 4 mutation goes red; baseline green

### Integration Tests

- **Scope**: the bundled copy stays equal to its source (`npm run bundle:check`), and the new AC pin's copy check
- **Command**: `npm run bundle:check`

### Performance Tests

Not applicable. The change is prompt prose and two text pins.

### Consumer Tests

- `/finalise` on a work item with a bounded, measured, cited criterion: the AC agent returns `PASS` with `test_citation: "NOT_APPLICABLE: measured criterion"`. This is observed on the next such run and recorded as evidence. It is not a committed test, because the agent's reading cannot be asserted from a unit test.
- `/review-task` on a task whose Performance criterion states no bound returns an Important finding.

---

## 9. Success Criteria

### Functional

- [x] `finalise-dod-ac-prompt.md` § Step 3 names three test-free kinds. The measured kind's `PASS` requires a stated bound, a measurement meeting it, and the command that produced it, cited from a committed artifact. An unbounded criterion is not a measured criterion, and fails unless a per-PR test holds it. Pinned (Phases 1, 3).
- [x] The prompt's closing sentence covers all three kinds, and says a criterion whose bound a per-PR test could assert is a behaviour criterion. Pinned (Phases 1, 3).
- [x] `review-task` Step 6 check 4 flags a non-functional criterion held by neither a planned per-PR test nor a numeric bound with its measuring command as Important. Pinned (Phases 2, 3).
- [x] The documentation kind added by obs #204 is covered by the new AC pin (Phase 3).
- [x] `review-task` Step 6 check 4 flags a behaviour criterion with no planned test, and a criterion met only after merge, each as Important. Pinned (Phases 2, 3).

### Performance

- [x] Not applicable: no runtime code changes. The two new test files each finish in under 1s, measured with `time node --test <file>` and recorded in the implementation report.

### Code Quality

- [x] `npm run ci:fast` passes with `.agents/skills` moved aside; `bundle:check` and `npm run validate -- skills/finalise/ skills/review-task/` pass
- [x] Each Phase 4 mutation goes red under bash, with restore checked by `cmp`

### Migration

- [x] CHANGELOG `[Unreleased]` entry cites (task 166)

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

1. **The measured kind becomes a back door.**
   - **Risk**: an agent classifies a testable behaviour ("returns within 200ms") as measured, cites a one-off timing, and passes a criterion that should have a per-PR test.
   - **Probability**: Medium. **Impact**: Medium (an untested behaviour is accepted).
   - **Mitigation**: the kind is defined by what the criterion bounds (time, size, count, rate) *and* by the absence of a test that could assert the bound. The closing sentence routes any bound a per-PR test could assert back to the behaviour path. The Phase 4 mutations keep "bound" and the closing sentence pinned.
   - **Rollback**: revert Phase 1; the prompt returns to two kinds.

### Low Risk Areas

1. **A text pin that passes a reworded rule.** Mitigation: pin structure (kind count equals bullets, each kind's `test_citation` string, the words the bar depends on), not whole sentences. Record in the implementation report that behaviour evidence comes from the next real finalise run.
2. **review-task over-flags.** A functional criterion mentioning "time" in passing is flagged as non-functional. Mitigation: scope the rule to the Performance subsection and to criteria that *bound* a quantity, with the task.164 AC7 example.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the new tests red on `develop`; a finalise run passing a criterion that has a feasible per-PR test through the measured kind
- **Steps**: revert the merge commit, run `npm run bundle`, run `npm run ci:fast`
- **Validation**: suites green; the prompt shows two kinds again

### Partial Rollback (1-2 hours)

- **When**: only the review-task rule over-flags
- **Steps**: revert Phase 2 and its pin; keep the finalise change

### Forward Fix (< 4 hours)

- **When**: wording in the measured kind is ambiguous but the bar is sound
- **Approach**: reword, keep the pins

### Rollback Triggers

- **Critical**: red suite on `develop`; a back-door pass observed
- **Non-critical**: wording (fix forward)

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-02
**Quality Score**: 70/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.166.qa.2.measured-non-functional-criteria.md](./task.166.qa.2.measured-non-functional-criteria.md)
- **Gate File**: [task.166.gate.2.measured-non-functional-criteria.yml](./task.166.gate.2.measured-non-functional-criteria.yml)

### Test Coverage Summary

- **Tests Executed**: 10
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

Cycle 1's fixes hold where they were made, but the bound rule and the unbounded-criterion outcome are still stated the old way at other sites: the Issues to Flag line and its pin, the CHANGELOG, and success criteria 1 and 3 (CR2-1, CR2-3). The bound rule also still flags an unbounded criterion that a planned test holds (CR2-2). Three low test findings.

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-28 | 1.0     | Initial draft | create-task |
| 2026-09-30 | 1.1     | Folded in observation #222 (user-approved): review-task also flags behaviour criteria with no planned test and post-merge criteria; "observation #206 actioned on merge" moved out of Success Criteria into Notes (it can only be met after merge) | Claude |
| 2026-10-02 | 1.2     | Review passed (9/10) — applied 2 Important fixes: the Execution rule's kind count brought into Phase 1 and pinned; the review-task pin and mutations cover the #222 rules; In Scope's post-merge line aligned with Notes | review-task |
| 2026-10-02 |         | Status → ready-for-development | review-task |
| 2026-10-02 |         | Implemented — 6 files (AC prompt, review-task check 4, 2 new pin tests, CHANGELOG, 1 new bundled copy); 9 tests, 14 mutations red | develop |
| 2026-10-02 |         | QA gate CONCERNS (80/100) — 2 medium, 3 low findings | qa-task |
| 2026-10-02 |         | QA findings fixed — gate 1: CR-1 (check 4 names the kinds, counts none), CR-2, CR-4/5/6; gate 2: one bound rule (held by a planned test, or by a bound + its measuring command) swept across every site that states it, unbounded outcome corrected in CHANGELOG and SC 1, test normalisation and count regex; 2 iterations | qa-fix |
| 2026-10-02 |         | QA gate CONCERNS (70/100) — 3 medium, 3 low findings | qa-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: finalise's AC prompt defines the measured criterion

- [x] Three kinds; measured-criterion bullet; closing sentence

### Phase 2: review-task flags an unbounded non-functional criterion

- [x] Check 4 rule; Issues to Flag entry

### Phase 3: Pin both rules

- [x] AC prompt pin (including the documentation kind and the bundled copy)
- [x] review-task pin

### Phase 4: Proof and gates

- [x] Mutation proofs
- [x] Gates, CHANGELOG (observations #206 and #222 are set to actioned after merge — see Notes)

---

## References

- **Source**: observation #206, "Finalise AC prompt has no path for a measured non-functional criterion"; task.164 DoD (`docs/tasks/task.164.task-163-deferred-follow-ups/task.164.dod.1.task-163-deferred-follow-ups.md`, § Step 5, recorded deviation)
- **Source**: observation #222, "review-task passes success criteria whose evidence form finalise's citation rule can never accept" (recurred on task.126 and task.142)
- **Related**: observation #204 (`aece92db`: the documentation-criterion kind), `skills/finalise/SKILL.md` (Step 3b agent 1), `skills/review-task/SKILL.md` (Step 6 check 4; Step 3 check 10, outcome reachability)

---

## Notes

### Deferred Work

- None in scope. The post-merge observation updates below are not deferred work: they cannot happen before the PR merges.

### Important Reminders

- **Post-merge (not a success criterion — finalise runs before merge):** set observations #206 and #222 to `actioned` through `observation-log.js set-status` once this merges.

- Edit `shared/resources/finalise-dod-ac-prompt.md`, then run `npm run bundle`. Never edit the `skills/finalise/references/` copy.
- New test files go under `shared/resources/tests/` and `tests/`, which `npm test` already globs. A new `skills/*/tests/` directory would run nowhere until it is added to `package.json`.

---

**Status:** Ready for Review

**Next Steps**:

1. `/develop-task docs/tasks/task.166.measured-non-functional-criteria/task.166.measured-non-functional-criteria.md`
2. QA artifacts will be co-located: `task.166.qa.{N}.*.md`, `task.166.gate.{N}.*.yml`, `task.166.bug.{N}.*.md`
