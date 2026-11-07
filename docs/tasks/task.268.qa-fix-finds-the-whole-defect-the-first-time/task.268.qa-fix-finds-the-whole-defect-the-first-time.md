---
id: task.268
title: "qa-fix finds the whole defect the first time"
type: task
description: "Add the probes, structural moves and gates qa-fix lacks (classifier direction, weakest value, earlier refusal, restatement population, undecidable boundary, extract-to-script, mechanical trigger b, untracked-file fast gate) so repeat-finding loops end sooner."
tags: [qa-fix, develop-task, observation]
category: refactoring
status: accepted
priority: Medium
created: 2026-11-06
updated: 2026-11-07
completed_date: 2026-11-07
pr_number: 854
estimated_effort_hours: 8
---

# Task 268: qa-fix finds the whole defect the first time

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.268.review.1.qa-fix-finds-the-whole-defect-the-first-time.md` implemented 2026-11-06

---

## 1. Overview

Eight recurring ways a QA fix loop circles the same subject are not covered by `qa-fix` Step 2.6 (structural moves), Step 3.5 (adversarial probes) or Step 4 (validate): a fix moves a classifier one direction, satisfies a new requirement with its weakest value, adds an earlier refusal that hollows a later test, fixes one restatement of a rule, circles an undecidable boundary, patches operational shell in prose, skips the repeat-subject block, or passes a fast gate that cannot see untracked files (obs #16, #18, #20, #27, #42, #56, #63, #113).

**Scope**: prose in `skills/qa-fix/SKILL.md`, plus the one fast-gate site obs #56 names. Obs #143 (which tool applies a mutation revert) is **not** here: task 265 Phase 2 covers it.

---

## 2. Motivation

### Current Problems

1. **Classifier widened one way** (obs #16): task.180 ran HIGH 1, 1, 1 over one error/refusal split; each fix swung to the opposite false result.
2. **Weakest satisfying value** (obs #18): `expected` was made mandatory on hostile cases; `{exit: 1}` satisfies it and keeps the ambiguity.
3. **Earlier refusal hollows a later test** (obs #20): cycle 7 widened a pre-spawn check and cycle 6's guard test passed with the guard deleted.
4. **One restatement fixed, not the population** (obs #27): task.182's cycles 1–3 each found the same defect at a new site.
5. **Undecidable boundary** (obs #42): task.202 ran five cycles on a parser the task itself said could not decide the boundary from its input.
6. **Operational shell in prose** (obs #63): task.189 drew a MEDIUM per cycle from one fenced block; consolidating inside the block did not reduce the edges.
7. **Trigger (b) is unenforced** (obs #113): on task.238 cycle 5 the summary carried no `Narrowing residue:` block and the post went out.
8. **A green fast gate that cannot see new files** (obs #56): twice, `ci:fast` passed before new files were staged and CI went red on guards that read `git ls-files`.

### Benefits

1. A loop converges in fewer cycles on these subjects; the cost of a cycle is a QA run plus a fix.
2. The summary cannot post without the block the rule requires.
3. A local green means the same thing CI's green does.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- Line numbers below were re-measured on 2026-11-06 at `develop` `5363f369`: Step 3.5 is at `:687`, Step 4 at `:811`, Step 7 at `:907`, the optional summary blocks near `:972`; the anchors in the plan file are offset by up to 5 lines, so find each by its heading.
- `skills/qa-fix/SKILL.md:623` `### Step 2.6: Offer the structural move before another patch` has **two triggers** ((a) pipeline offer, (b) repeat subject, a judgement) and a four-row move table: Consolidate the contract, Scope the claim, Waive, Patch. The summary shape `Narrowing residue:` / `Move:` is at `:655`.
- `:683` `### Step 3.5: Adversarial pass over the fixes themselves` has the lifecycle table, the documentation table at `:719` (`What did this edit make false elsewhere?` with a population command), the identity-rule both-directions table at `:770`, and the writer/refusal/input-class table that follows (`Is the writer idempotent?`, `Does the fix hold across the input class?`, `Which documented shapes does the new refusal reject?`). None asks for the classifier direction, the weakest value, or re-running later mutation proofs.
- `:807` `### Step 4: Validate` runs lint and test commands with no staging step; `grep -n "git add -N" skills/qa-fix/SKILL.md` returns nothing.
- `:903` `### Step 7: Post Fix Summary to PR`; `:967` lists the optional summary blocks (`Probe:`, `Narrowing residue:` / `Move:`).
- The `Narrowing residue:` shape is also produced by `shared/resources/qa-diminishing-returns.js:845` (the pipeline offer). Tests keyed on it: `shared/resources/tests/qa-narrowing-residue.test.mjs`, `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`. Adding move rows must not change that shape.
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1216` already uses `git ls-files --others --exclude-standard` for another purpose, so the idiom exists in this repository.

### Target Architecture

- **Step 3.5**: three new probe rows (obs #16, #18, #20) and a pre-fix population search for a finding that says a document states a rule wrongly (obs #27).
- **Step 2.6**: two more moves (obs #42: narrow the contract to what the input decides; obs #63: extract fenced operational shell to a script with a test per edge) and trigger (b) made mechanical at Step 7 (obs #113).
- **Step 4**: stage new files (`git add -N`) before the fast gate, or fail on untracked files under the changed paths (obs #56).

### Important Clarifications

- The move table says "four moves" in prose; both occurrences are updated with the table. `grep -n "four moves" skills/qa-fix/SKILL.md` finds the sites.
- Obs #56 names "develop Step 3's fast gate" too. The plan greps for the fast-gate command site in `shared/resources/develop-pipeline-step-3-develop-loop.md` and decides there whether it is in scope.
- Step 2.5 (third strike) keeps precedence over Step 2.6, unchanged.

---

## 4. Scope

### In Scope

✅ **qa-fix**: the rows, moves, the Step 7 check and the Step 4 staging.
✅ **Fast-gate site** in the develop loop doc if the grep finds the same unstaged-run hazard.
✅ **Behavioural evidence** with controls.

### Out of Scope

❌ **Obs #143**: parked on task 265.
❌ **The `qa-diminishing-returns.js` offer logic**: the offer's trigger is unchanged.
❌ **Retrofitting** past fix summaries.

---

## 5. Breaking Changes

None - prose only. The `Narrowing residue:` / `Move:` shape is unchanged; the `Move:` line gains two allowed values.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.268.plan.qa-fix-finds-the-whole-defect-the-first-time.md](task.268.plan.qa-fix-finds-the-whole-defect-the-first-time.md)

### Phase 1: Step 3.5 probes

**Risk Level**: Low

**Files**:
- `skills/qa-fix/SKILL.md`

**Changes**:
- [ ] Classifier-direction probe (obs #16): a fix that widens or narrows an error/refusal split, an allow/deny boundary or a "could not look" class carries one case the rule must now catch and one it must still leave alone (including a failure after the decision was made); name the direction the last fix moved and test the other.
- [ ] Weakest-value probe (obs #18): for a fix that adds a requirement or refusal, name the weakest value that satisfies it and test it.
- [ ] Earlier-refusal probe (obs #20): when a fix adds or widens an earlier check on a path, re-run the mutation proofs of later-stage guards whose tests send input through that path, and record the re-runs in the summary.
- [ ] Pre-fix population (obs #27): when a finding says a document states a value or rule wrongly, run the restatement search before fixing and fix or consolidate the whole population in that cycle; derive any guard's file set by the same search.

**Dependencies**: none.

---

### Phase 2: Step 2.6 moves and Step 7 gate

**Risk Level**: Medium

**Files**:
- `skills/qa-fix/SKILL.md`

**Changes**:
- [ ] Move 5, narrow the contract (obs #42): when successive fixes to one function each open a new edge at one boundary and the task says the boundary cannot be decided from the function's input, refuse every ambiguous shape and leave the decision to the caller.
- [ ] Move 6, extract to a script (obs #63): when the repeat subject is operational shell in a fenced block and has drawn MEDIUMs on two consecutive gates, move it to a script with a test per edge and leave a one-line call.
- [ ] Update the "four moves" wording (one site, `skills/qa-fix/SKILL.md:642`) and the `Move:` allowed values, and update `tests/qa-fix-structural-move.test.js` (`:96`, `:125`) in the same change.
- [ ] Step 7 (obs #113): before posting, check whether any bug in this cycle's set names an earlier bug of the same work item (`bug.N` text or the same `file:` as a previous gate's entry); when one does, the summary must carry the `Narrowing residue:` block or the post is refused. Same for a documentation fix and the `Probe:` block.

**Dependencies**: Phase 1.

---

### Phase 3: Step 4 staging

**Risk Level**: Low

**Files**:
- `skills/qa-fix/SKILL.md` Step 4
- the develop-loop fast-gate site, if in scope

**Changes**:
- [ ] Run `git add -N` on new files before the fast gate, or fail when `git ls-files --others --exclude-standard` lists files under the changed paths (obs #56).

**Dependencies**: none.

---

### Phase 4: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Run each new probe and gate on its motivating shape and a control (§ 8).
- [ ] `command npm run bundle`, then `command npm run bundle -- --check`.
- [ ] Run the two narrowing-residue tests; grep consumer docs for "four moves".

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-fix/SKILL.md` - probes, moves, Step 7 check, Step 4 staging
2. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` - fast-gate staging, only if the plan's grep finds the hazard

### Files to Modify (Generated)

3. ✅ bundled copies under `skills/*/references/` - regenerated by `npm run bundle`

### Files to Modify (Tests)

4. ✅ `tests/qa-fix-structural-move.test.js` - it pins the old shape by pattern, found by `git grep -ln "qa-fix/SKILL\|four moves\|Narrowing residue" -- '*.test.*' 'tests/**' 'evals/**'`: the `Move: consolidate | scope the claim | waive | patch — {one sentence why}` line (`:125`, an exact-line match) and the four-row move list (`:96`). Widen the `Move:` pin to the six values and add the two new rows to the list, in the same change as the `SKILL.md` edit.

`shared/resources/tests/qa-narrowing-residue.test.mjs` and `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs` are run, not edited. Run `CI=true command node --test tests/qa-fix-structural-move.test.js tests/identity-rule-probe.test.js` too.

---

## 8. Testing Strategy

### Behavioural Evidence

**Scope**: each new rule fires on its shape and leaves a clean fix alone.

**Actions**:
- [ ] Classifier probe: a fix widening a refusal class is flagged without the second case; **control**: a widening of a different kind (an allowlist, not an error split) is also flagged; a fix with both cases is not.
- [ ] Weakest value: a mandatory-field fix tested only with a strong value is flagged.
- [ ] Earlier refusal: a fix adding a pre-spawn decline triggers the re-run list.
- [ ] Population: a finding naming one restating file triggers the search before the fix.
- [ ] Moves 5 and 6 offered on the task.202 and task.189 shapes, and not on distinct defects.
- [ ] Step 7: a summary lacking the block is refused when a bug cites an earlier bug; accepted otherwise.
- [ ] Step 4: a new untracked file under a changed path stops the gate or is staged.

**Command**: a fresh session running `qa-fix` on each fixture; results in the QA report.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [x] Each of the eight rules is present in `skills/qa-fix/SKILL.md`, citing its observation; the list is in the QA report.
- [x] Each rule fires on its fixture and not on its control, recorded per rule in the QA report.
- [x] A Step 7 post is warned about (the block is added, then the post goes ahead; the check never halts the cycle) when trigger (b) holds and the block is absent, shown by running the check on a fixture set recorded in the QA report. (Reworded from "refused" after review; approved by Lorien Gamaroff, 2026-11-07.)

### Performance

- [x] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [x] `CI=true command node --test shared/resources/tests/qa-narrowing-residue.test.mjs evals/shared/tests/qa-narrowing-offer-wiring.test.mjs tests/qa-fix-structural-move.test.js tests/identity-rule-probe.test.js` passes.
- [x] `command npm run bundle -- --check` reports 0 problems.
- [x] `python skills/create-skill/scripts/quick_validate.py skills/qa-fix` passes.

### Migration

- [x] No remaining prose says "four moves" (`git grep -n "four moves" -- skills shared` returns nothing outside generated copies).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The Step 7 refusal blocks a legitimate post**
- **Risk**: the "same file as a previous gate's entry" test fires on unrelated bugs.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: Step 7 is best-effort and non-blocking by design (`:903`); the check prints the missing block and the reason, and a waiver line is allowed.
- **Rollback**: remove the check.

**2. Step 3.5 grows past what a fixer reads**
- **Risk**: the probes get skipped.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: each row is one line in an existing table; a mechanical carrier (obs #113) backs the highest-value one.
- **Rollback**: remove the row.

### Low Risk Areas

**1. Fast-gate staging changes the index**
- **Risk**: `git add -N` leaves intent-to-add entries a later `git commit -a` sweeps up.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: prefer the fail-on-untracked form if the plan finds that hazard real.
- **Rollback**: `git reset` the intent-to-add paths.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a narrowing-residue test is red on `develop` after merge
- `quick_validate.py` fails on `qa-fix`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one rule misfires.

**Steps**:
1. Remove that row, move or check and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- red `develop` caused by the edit

**Non-Critical (Forward Fix)**:
- a rule's wording or severity

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-06
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.268.qa.5.qa-fix-finds-the-whole-defect-the-first-time.md](./task.268.qa.5.qa-fix-finds-the-whole-defect-the-first-time.md)
- **Gate File**: [task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml](./task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml)

### Test Coverage Summary
- **Tests Executed**: 22
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Two medium edge cases remain in the Step 4 guard: shell metacharacters in a path (T268-QA-10) and a nested-repo or symlinked path (T268-QA-11). The QA budget is spent, so both are deferred.

## Deferred Work

- **T268-QA-10** (MEDIUM) — carried to gate 5 `recommendations.future` (QA budget spent, cycle 5): shell metacharacters in a changed path are expanded by the double-quoted slot assignment in qa-fix Step 4; substitute through a single-quoted heredoc or refuse them, with a hostile probe case.
- **T268-QA-11** (MEDIUM) — carried to gate 5 `recommendations.future` (QA budget spent, cycle 5): a path in a nested repository or behind a symlinked directory reads clean in the Step 4 guard; refuse or document it.

## Definition of Done - Gaps Identified, run 1 (historical, superseded by run 2)

**Status:** SUPERSEDED — all four gaps closed in run 2 (see the section below)

Security (18 probes, 0 reproduced), compliance (not applicable) and docs/changelog pass. Four acceptance criteria are not met as written.

### Missing Criteria:

- [ ] Functional #3: Step 7 warns and posts instead of refusing when trigger (b) holds and the block is absent, and no fixture run of the check is recorded in a QA report.
- [ ] Functional #1: no QA report lists the eight rules with their observations.
- [ ] Functional #2: no per-rule fixture and control record against the final `SKILL.md`.
- [ ] Performance #4: the recorded median is about +29% (192 s vs 247 s), taken under load at an earlier commit.

### Next Steps:

- Decide #3 (make the check refuse, or amend the criterion), then record the fixture run.
- Write the eight-rule list and per-rule results into a QA report; re-measure the suite time on a quiet machine or amend #4.
- Re-run `/finalise`.

**Estimated Effort:** Small to Medium.

**Detailed Verification Log:** See `task.268.dod.1.qa-fix-finds-the-whole-defect-the-first-time.md`.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**QA Report**: `task.268.qa.5.qa-fix-finds-the-whole-defect-the-first-time.md` (with the criteria evidence added at run 2)
**Gate File**: `task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml`
**Gate Status**: CONCERNS (80/100), accepted with two deferred MEDIUMs

✅ **Acceptance Criteria:** all 8 met (run 2); the reword of Functional criterion 3 is approved by Lorien Gamaroff
✅ **Tests:** the four named test files pass (53/53); `bundle --check` 0 problems; `quick_validate` passes
✅ **Performance:** suite median 160 s on `develop` and on the branch
✅ **Security Review:** 18 probes executed, 0 reproduced, 0 escapes
✅ **Compliance / Docs:** not applicable / `CHANGELOG.md` cites task 268
⚠️ **Deferred:** T268-QA-10 and T268-QA-11 (see Deferred Work)

**Detailed Verification Log:** See `task.268.dod.2.qa-fix-finds-the-whole-defect-the-first-time.md`.

**Task marked as ACCEPTED on:** 2026-11-07

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                  | Author      |
| ---------- | ------- | ---------------------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #16, #18, #20, #27, #42, #56, #63, #113 | create-task |
| 2026-11-06 | 1.1     | Review passed (9/10) — added `tests/qa-fix-structural-move.test.js` to the files to modify, refreshed line anchors | review-task |
| 2026-11-06 |         | Status → ready-for-development                                               | review-task |
| 2026-11-06 |         | QA gate CONCERNS (85/100) — 3 medium findings                                | qa-task     |
| 2026-11-06 |         | QA findings fixed — CHANGELOG entry, Step 7 wording, Step 4 guard slot, 1 iteration | qa-fix      |
| 2026-11-06 |         | QA gate FAIL (70/100) — 1 high, 1 medium finding                             | qa-task     |
| 2026-11-06 |         | QA findings fixed — Step 4 guard repaired and held by `tests/qa-fix-step4-guard.test.js`, 2 iterations | qa-fix      |
| 2026-11-06 |         | QA gate FAIL (70/100) — 1 high, 1 medium finding | qa-task     |
| 2026-11-06 |         | QA findings fixed — Step 4 guard splits its slot in bash and zsh; multi-path cases and a second mutant added, 1 iteration | qa-fix      |
| 2026-11-06 |         | QA gate CONCERNS (80/100) — 2 findings | qa-task     |
| 2026-11-06 |         | QA findings fixed — Step 4 guard matches paths literally and refuses a nonexistent path; two more mutants proven, 1 iteration | qa-fix      |
| 2026-11-06 |         | QA gate CONCERNS (80/100) — 2 findings, both deferred (budget spent) | qa-task     |
| 2026-11-07 |         | DoD incomplete — 4 gaps identified | finalise    |
| 2026-11-07 |         | Functional criterion 3 reworded from "refused" to "warned" to match the Step 7 design settled at gate 1 (T268-QA-2); criteria evidence recorded in QA report 5 | develop-next |
| 2026-11-07 | 1.2     | DoD passed — accepted (PR #854) | finalise    |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Step 3.5 probes
- [ ] Four rows written

### Phase 2: Step 2.6 moves and Step 7 gate
- [ ] Two moves, wording and Step 7 check

### Phase 3: Step 4 staging
- [ ] Staging rule written

### Phase 4: Evidence, bundle and sweep
- [ ] Fixtures run, bundle clean, sweep done

---

## References

- Observation #16 — qa-fix Step 3.5 has no both-directions probe for a classifier widening
- Observation #18 — qa-fix Step 3.5 lacks a probe for a new requirement's weakest satisfying value
- Observation #20 — A fix that adds an earlier refusal can make later-stage tests vacuous; mutation proofs are not re-run
- Observation #27 — qa-fix fixes the cited restatement of a rule, not the population of restatements
- Observation #42 — Fix loop circled a boundary the spec said was undecidable from the input
- Observation #56 — Local fast gate misses guards over tracked files when new files are untracked
- Observation #63 — Repeat MEDIUMs in prose-embedded operational shell need an extract-to-script move
- Observation #113 — qa-fix Step 2.6 trigger (b) and the Probe block are skipped when nothing checks the fix summary for them

---

## Notes

### Important Reminders

Obs #143 is parked on task 265, whose mutation recipe makes the revert an Edit; this task must not restate it.

### Future Improvements

Task 269 candidates (qa-task step gaps) sit in the same QA loop; none depends on this one.

---

**Status:** Accepted
