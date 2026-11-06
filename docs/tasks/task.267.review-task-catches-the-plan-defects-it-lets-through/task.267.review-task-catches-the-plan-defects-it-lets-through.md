---
id: task.267
title: "review-task catches the plan defects it lets through"
type: task
description: "Add the missing plan-defect checks to review-task Steps 3 and 6 (thirteen observed shapes, each caught only later at 5c, QA or finalise), with a create-task twin where the observation names one."
tags: [review-task, review-story, create-task, observation]
category: refactoring
status: accepted
priority: Medium
created: 2026-11-06
updated: 2026-11-06
completed_date: 2026-11-06
pr_number: 853
estimated_effort_hours: 8
---

# Task 267: review-task catches the plan defects it lets through

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.267.review.1.review-task-catches-the-plan-defects-it-lets-through.md` implemented 2026-11-06

---

## 1. Overview

`review-task` has 22 Step 3 checks and a Step 6 measurability check, and thirteen recurring plan defects still pass them. Each was caught a stage late, at 5c, in QA or at `/finalise`, where a one-line plan fix became a QA re-entry (obs #7, #13, #22, #25, #28, #29, #60, #90, #108, #111, #137, #144, #153).

**Scope**: add or sharpen the checks in `skills/review-task/SKILL.md`, mirror the two the observations name for `review-story`, and add a `create-task` twin where an observation names one (#29, #108, #111, #137).

---

## 2. Motivation

### Current Problems

1. **A "no X anywhere" criterion has no review check.** Only a scan test with a non-vacuity case can hold it (obs #7).
2. **A lexical guard claims "any restatement".** The claim is unbounded; check 13 doesn't require a bounded set (obs #13).
3. **A parity claim copies a sibling.** The sibling's guards are never enumerated (obs #22).
4. **The removed-literal sweep (check 15) is too narrow.** It searches the literal the plan named, not every removed sentence (obs #25), and not tests that pin a document by pattern (obs #144).
5. **A new `||`/`&&` term is never tested for redundancy.** Check 11 confirms the fix's outcomes, not that each new disjunct is held by an input (obs #28).
6. **A refusal added to a self-rewriting writer** has no self-consistency criterion (obs #29).
7. **A sweep's population is derived from remembered spellings** (obs #60).
8. **A new member of an enumerated class** breaks population tests review never named (obs #90).
9. **Fixture literals** can trip the banned-name guard (obs #108).
10. **An async read fires before its state settles** (obs #111).
11. **Planned temp dirs without removal** trip the tmp-leak ratchet (obs #137).
12. **A new file in a directory** is not checked against the directory's second reader (obs #153).

### Benefits

1. Each defect becomes an Important finding at review, where the fix is a line of the plan.
2. QA re-entries and finalise blocks traced to these shapes stop.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/review-task/SKILL.md:826` `### Step 3: Technical Accuracy and Anti-Hallucination Review` holds checks 1–22: check 11 at `:942` (invariant verification), 13 at `:980` (single-statement test discriminator), 15 at `:1028` (removed-literal test sweep), 18 at `:1074` (test file reached by the runner), 20 at `:1100` (a site list carries its grep), 22 at `:1118` (a criterion that demands a record names where it lives).
- `:1250` `### Step 6: Consistency and Completeness Review`; its item 4 at `:1288` is `Success Criteria Measurability`, the home for obs #7.
- Check 18 asks whether a new test is reached by the runner; obs #90 asks the converse (which existing tests reach the new file). Check 20 covers a site list; obs #60 covers how the population is derived.
- No existing check mentions `mkdtemp`, `banned-name`, `disjunct` or `second reader`: `grep -n -iE "mkdtemp|banned|disjunct|second reader|self-rewrit" skills/review-task/SKILL.md` returns nothing for those shapes. For `review-story`, `grep -nE 'Measurab' skills/review-story/SKILL.md` returns nothing, so it has no Step 6 item 4 equivalent and obs #7 has no mirror there. Its Step 4 (`### Step 4: Technical Accuracy and Anti-Hallucination Review`) numbers its checks 1 to 18 (the criterion-record check is 18), so the obs #108 mirror lands as its check 19.
- Tests that pin these sections by pattern (found by `git grep -l 'skills/review-task' -- tests evals shared`; the plan edits sentences inside the pinned items, so each is a removed-literal hazard, check 15 / obs #144):
  - `tests/review-plan-shape-checks.test.js` reads checks 15 to 20 of review-task Step 3 (11 to 16 in review-story Step 4) by number and name, and requires an `(obs #N)` id, a `- Trigger: ` line, a `- Worked example: ` line and an `**Important**` severity in each.
  - `tests/review-property-checks.test.js` pins check 11 (`11. **Invariant verification** (obs #161):`), check 12, and the hallucination-list lines that cite `(check 11)`.
  - `tests/review-call-site-population-check.test.js` pins check 14 and its hallucination-list line.
  - `tests/outcome-reachability-check.test.js` pins check 10 in all three skills.
  - `tests/review-task-measured-criterion.test.js` slices Step 6 check 4 up to check 5 and pins the measured-bound rules inside it.
  Sharpening must therefore add text to an item and leave the pinned wording intact, and new checks 23 to 29 must carry the same `(obs #N)`, `Trigger:`, `Worked example:` and `Important` shape.

### Target Architecture

Checks 23 onward, one per shape in the order above, each in the existing form (bold lead with `(obs #N)`, trigger, the command or walk, the severity, the remedy). Obs #25 and #144 extend check 15; obs #28 extends check 11; obs #13 extends check 13; obs #7 extends Step 6 item 4; obs #60 extends check 20. The rest are new numbered checks.

### Important Clarifications

- Severity is Important unless the observation says otherwise. None is a gate: review-task stays advisory per the repository's tracker-comment rules.
- Obs #30 (CHANGELOG placement) is **not** here: half of it is a pipeline design choice (a sanctioned pre-finalise fix point), so it stays `open`.
- The `create-task` twins avoid duplicating `create-task` task 266's five items; they add only the four named above.

---

## 4. Scope

### In Scope

✅ **review-task**: the thirteen checks above.
✅ **review-story**: obs #7's and #108's equivalents, if its check exists.
✅ **create-task**: the four twins (#29, #108, #111, #137).
✅ **Behavioural evidence** with a control per check.

### Out of Scope

❌ **Obs #30** and any pipeline change.
❌ **Retrofitting** reviewed plans.
❌ **A number-of-checks test.** Counting checks asserts source text, not behaviour.

---

## 5. Breaking Changes

None - prose only. Check numbers 23 and up are new; existing numbers are unchanged, so citations such as "check 15" stay valid.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.267.plan.review-task-catches-the-plan-defects-it-lets-through.md](task.267.plan.review-task-catches-the-plan-defects-it-lets-through.md)

### Phase 1: Sharpen five existing checks

**Risk Level**: Low

**Files**:
- `skills/review-task/SKILL.md`

**Changes**:
- [x] Step 6 item 4: name the negative-content shape; Important (obs #7).
- [x] Check 13: a lexical guard states its claim as a bounded set with known unseen shapes named (obs #13).
- [x] Check 15: enumerate every removed or rewritten sentence first, one search each, with hit counts recorded (obs #25); search the test tree for each rewritten document's file name and read hits for structural pins (obs #144).
- [x] Check 11: run the plan's named mutation against the planned inputs for each new boolean term (obs #28).
- [x] Check 20: derive a sweep population from the retired concept's own names, then diff-pass changed lines mentioning legacy/old/previous/retired (obs #60).

**Dependencies**: none.

---

### Phase 2: Seven new checks

**Risk Level**: Medium

**Files**:
- `skills/review-task/SKILL.md`

**Changes**:
- [x] 23: parity claim → enumerate the sibling's guards read off its code, a disposition per guard (obs #22).
- [x] 24: refusal added to a self-rewriting writer → self-consistency criterion plus a property test over a generated family (obs #29).
- [x] 25: new member of an enumerated class → the existing tests that list the class's directory or table (obs #90).
- [x] 26: prescribed fixture literals → run the banned-name guard's pattern over the plan (obs #108).
- [x] 27: async external read → latency measured against the point where the read fires, commands cited (obs #111).
- [x] 28: planned `mkdtemp` → removal named (obs #137).
- [x] 29: new file, marker or side effect in a directory → every reader of that directory named (obs #153).

**Dependencies**: Phase 1 (numbers 23+ follow the sharpened block).

---

### Phase 3: Twins and mirror

**Risk Level**: Low

**Files**:
- `skills/create-task/SKILL.md` (one line each for #29, #108, #111, #137, in § 3.5 after task 266's items)
- `skills/review-story/SKILL.md` (obs #7 and #108 equivalents, if present)

**Dependencies**: task 266 is merged (PR #851 is in `develop` at `fd81159a`, the base of this branch), so § 3.5 already holds its five items and the four twins append after them. `review-story` gets only the obs #108 mirror, as its check 19; obs #7 has no mirror there (§ 3, Current Architecture).

---

### Phase 4: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] Run the five pinning tests named in § 3 (`CI=true command node --test tests/review-plan-shape-checks.test.js tests/review-property-checks.test.js tests/review-call-site-population-check.test.js tests/outcome-reachability-check.test.js tests/review-task-measured-criterion.test.js`) after Phase 1, after Phase 2 and after Phase 3, not only in the final `npm test`.
- [x] Run each new or sharpened check on its motivating plan shape and on a control (§ 8).
- [x] `command npm run bundle`, then `command npm run bundle -- --check`.
- [x] Grep consumer docs for restatements of the review-task check list.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-task/SKILL.md` - five sharpened checks, seven new
2. ✅ `skills/review-story/SKILL.md` - mirror of #7 and #108 where the check exists
3. ✅ `skills/create-task/SKILL.md` - four twins

### Files to Modify (Generated)

4. ✅ bundled copies under `skills/*/references/` - regenerated by `npm run bundle`

### Files to Modify (Tests)

None authored.

---

## 8. Testing Strategy

### Behavioural Evidence

**Scope**: each check fires on the shape it names and leaves a clean plan alone.

**Actions**:
- [ ] For each of the thirteen, a fixture plan with the defect, and a control plan: the same defect class varied in a dimension the observation never mentions, and one correct instance. Obs #176 is why: a pass on the motivating example may be recognition, not the rule.
- [ ] Checks 11 and 28 (mutation of a term; tmp removal) are run on plans whose defect differs from tasks 141 and 255.

**Command**: a fresh session running `review-task` on each fixture; results in the QA report.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The twelve checks (five sharpened, seven new) covering the thirteen observations (#25 and #144 share check 15) are present in `skills/review-task/SKILL.md`, each citing its observation ids; the list is in the QA report's Findings table.
- [ ] Each of the twelve fires on its defective fixture and not on its controls, recorded per check in the QA report's Findings table. The fixtures are kept in the QA report, not committed.
- [ ] The five pinning tests named in § 3 pass after every phase (`CI=true command node --test <the five files>`), shown by the planned test run in Phase 4.
- [ ] Existing check numbers 1 to 22 are unchanged (`git diff` of the headings shows additions only).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report. Amended after QA cycle 1: the LAN server was shared and loaded (load 17 to 20 on 8 cores), so only one pair ran under quiet load (develop 537 s, branch 464 s); the five-run median is waived for this prose-only change, approved by Lorien Gamaroff.

### Code Quality

- [ ] `command npm run bundle -- --check` reports 0 problems.
- [ ] `python skills/create-skill/scripts/quick_validate.py` passes for review-task, review-story and create-task.
- [ ] `CI=true command npm test` passes.

### Migration

- [ ] The review-task skill stays under the repository's skill-size limit, if one is enforced (`quick_validate.py` reports it).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. review-task grows slower and noisier**
- **Risk**: seven new checks and five sharpened ones add wall time and false positives, and a sharpened sentence can break a test that pins its neighbour (§ 3).
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: each check carries a trigger condition, so it runs only on the plan shape it names.
- **Rollback**: remove the check.

**2. Merge conflict with task 266**
- **Risk**: both edit `create-task` § 3.5.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: Phase 3 depends on 266; resolve by keeping both.
- **Rollback**: n/a.

### Low Risk Areas

**1. Check numbering collides with an in-flight task**
- **Risk**: another branch adds check 23.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: re-read the highest number at Phase 2.
- **Rollback**: renumber.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a skill fails `quick_validate.py` after merge
- `bundle --check` is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one check misfires.

**Steps**:
1. Remove that check and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- red `develop` caused by the edit

**Non-Critical (Forward Fix)**:
- a check's wording or severity

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-06
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.267.qa.2.review-task-catches-the-plan-defects-it-lets-through.md](./task.267.qa.2.review-task-catches-the-plan-defects-it-lets-through.md)
- **Gate File**: [task.267.gate.2.review-task-catches-the-plan-defects-it-lets-through.yml](./task.267.gate.2.review-task-catches-the-plan-defects-it-lets-through.yml)

### Test Coverage Summary
- **Tests Executed**: 7946
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No open findings. Cycle 1's two medium items are closed.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

All Definition of Done criteria verified (PR #853, gate 2 PASS 95/100, 5c review APPROVE):

✅ **Success criteria:** 9 of 9 met; criterion 5 (wall time) carries an owner-approved amendment
✅ **Pinning tests and CI:** all checks green on `eac769d4a0d9`, including `test`
✅ **Documentation:** CHANGELOG entry cites (task 267)
✅ **Security review:** PASS, no boundary deliverable
✅ **Compliance review:** not applicable

**Detailed Verification Log:** See `task.267.dod.1.review-task-catches-the-plan-defects-it-lets-through.md`.

**Task marked as ACCEPTED on:** 2026-11-06

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-06 | 1.0     | Initial draft — cut from observations #7, #13, #22, #25, #28, #29, #60, #90, #108, #111, #137, #144, #153 | create-task |
| 2026-11-06 | 1.1     | Review passed (9/10) — named the five tests that pin the review sections, resolved the review-story mirror, updated the task 266 dependency (merged), corrected the check count | review-task |
| 2026-11-06 |         | Status → ready-for-development | review-task |
| 2026-11-06 |         | Implemented: five sharpened checks and checks 23–29 in review-task, review-story check 19, four create-task items; status → ready-for-review | develop-task |
| 2026-11-06 |         | QA gate CONCERNS (80/100) — 2 findings | qa-task |
| 2026-11-06 |         | QA findings fixed — cycle 1, 2 findings (CHANGELOG entry added; wall-time criterion amended with owner approval) | qa-fix |
| 2026-11-06 |         | QA gate PASS (95/100) — 0 findings | qa-task |
| 2026-11-06 | 1.2 | DoD passed — accepted (PR #853) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Sharpen five existing checks
- [x] #7, #13, #25 and #144, #28, #60 done

### Phase 2: Seven new checks
- [x] Checks 23 to 29 written

### Phase 3: Twins and mirror
- [x] create-task and review-story lines

### Phase 4: Evidence, bundle and sweep
- [x] Fixtures run (12 of 12 defective fire, 12 of 12 controls clean; evidence in the QA report), bundle clean, sweep done

---

## References

- Observation #7 — Review does not flag a negative-content criterion that only a scan test can hold
- Observation #13 — review-task check 13 does not require a lexical guard's claim to be bounded
- Observation #22 — A parity claim with a sibling mechanism needs the sibling's guards enumerated at review
- Observation #25 — Removed-literal sweep searched only the literal the plan named, not every removed sentence
- Observation #28 — Review confirms a fix's outcomes but not that each new disjunct is held by an input
- Observation #29 — A refusal added to a self-rewriting writer needs the writer's own output checked against it
- Observation #60 — A sweep population from one grep of remembered spellings misses the retired concept's own names
- Observation #90 — A new member of an enumerated class breaks population tests review never named
- Observation #108 — Plan-prescribed fixture literals are not checked against the banned-name guard
- Observation #111 — review-task has no check that an async read fires after the state settles
- Observation #137 — Planned test code that creates temp dirs without removing them trips the tmp-leak ratchet
- Observation #144 — review-task removed-literal check misses tests that pin a document by pattern
- Observation #153 — Plan review checks the new argument, not the second reader of the directory it writes to

---

## Notes

### Important Reminders

Obs #30 stays open: its pipeline half (a pre-finalise fix point for a CHANGELOG placement finding) needs a design decision first.

### Future Improvements

If the check list keeps growing, group checks by plan shape in a table; not part of this task.

---

**Status:** Accepted
