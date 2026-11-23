---
id: task.312
title: "Allow-list and timing criteria name what they need"
type: task
description: "review-task has no check that an allow-list replacing a deny-list covers the whole set it gates, and neither create-task nor review-task steers a wall-time bound to a paired ratio or CPU time; this task adds both."
tags: [review-task, create-task, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-17
updated: 2026-11-23
estimated_effort_hours: 4
---

# Technical Task: Allow-list and timing criteria name what they need

**Status:** Ready for Review

---

## 1. Overview

Two authoring and review gaps found on tasks 289 and 306 (observations #159 and #171). A task that replaces a deny-list with an allow-list tabled three members and left the other 28 on "today's behaviour"; nothing required the table to cover the set, and a write by operand slipped past a flag table. A task that bounded suite wall time at 1.10x the prior median could not be settled on the shared LAN server and was amended at `/finalise`.

**Scope**: one new `review-task` Step 3 check for allow-lists (Phase 1), and a statistic rule added to `create-task` 3.5 and `review-task` check 22's wall-clock note (Phase 2).

---

## 2. Motivation

### Current Problems

1. **An allow-list that tables some members is a deny-list for the rest.** Task.289's plan named three commands of a 31-member allow-list for the QA snippet runner. Running the plan's own gap blocks found `uniq in out` creating a file, a write the flag table could not express.
2. **No review check reads the whole set.** `review-task` has check 13, a single-statement test discriminator (`skills/review-task/SKILL.md:1001`; find it with `grep -n "^13\. \*\*" skills/review-task/SKILL.md`), and nothing for a replaced deny-list.
3. **A wall-time criterion named a statistic the host could not give.** Ten interleaved runs on task 306 read a ratio of medians of 1.22, a paired-ratio median of 1.07 and CPU time of 1.016, while load ran from 2 to 20. `/finalise` run 1 ended GAPS and the owner amended the criterion.
4. **The existing rule stops short.** `create-task` 3.5 already requires the sample, the median, a load ceiling and reported outliers (obs #31, `skills/create-task/SKILL.md:582`); it does not say where it is measured, nor prefer a paired ratio or CPU time on a shared host.

### Benefits

1. A review catches an unaudited allow-list member before a developer builds on the table.
2. A timing criterion is settleable at authoring, so no amendment is needed at `/finalise`.
3. Both rules live in the skills that already own the neighbouring checks.

---

## 3. Technical Background

### Current Architecture

`skills/review-task/SKILL.md` Step 3 numbers its checks 1 to 31; the last is `31. A plan's own command is run once, in a safe form` (line 1280), so the next is 32 (command: `grep -n "^[0-9]*\. \*\*" skills/review-task/SKILL.md`). Check 22 (line 1172) is "A criterion that demands a record names where it lives"; the wall-clock note sits in Step 6 check 4 (lines 1483-1487, `grep -n "wall-clock runtime" skills/review-task/SKILL.md`): a measured bound with a command and `uptime` beside `time`, finalise failing a figure not taken on the PR's head. `skills/create-task/SKILL.md:582` holds "A timing bound that names one run (obs #31)" in 3.5 Should Add. `shared/resources/finalise-dod-ac-prompt.md` grades a measured criterion on its committed measurement. No hit in `skills/review-task/SKILL.md` for `deny-list` or `operand` (`grep -n -i "deny-list\|operand" skills/review-task/SKILL.md`).

### Target Architecture

`review-task` gains check 32: when a task replaces a deny-list with an allow-list, the table covers the whole set it gates, and the unaudited members are probed for writes by operand as well as by flag. `create-task` 3.5 and check 22's wall-clock note gain the statistic: say where it is measured and how load is controlled, and prefer a paired interleaved ratio or CPU time over a ratio of medians on a shared host.

---

## 4. Scope

### In Scope

✅ **review-task check 32** and its `review-story` sibling note.
✅ **create-task 3.5** timing bullet and **review-task check 22** wall-clock note.
✅ **Bundled copies**, `CHANGELOG.md`.

### Out of Scope

❌ **The QA snippet runner's allow-list itself** (task.289's subject).
❌ **`finalise`'s measured-criterion grading**, which is unchanged.

---

## 5. Breaking Changes

None - API stable. Both are added review checks and authoring prompts; a task that already meets them passes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.312.plan.allow-list-and-timing-criteria-name-what-they-need.md](task.312.plan.allow-list-and-timing-criteria-name-what-they-need.md)

### Phase 1: The allow-list check

**Risk Level**: Low

**Files**:
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md` (sibling note)
- `tests/review-allow-list-timing-checks.test.js` (new; `package.json`'s `test:suite` reaches `tests/*.test.js`, and has no glob for `skills/review-task/tests/`, so a test placed there would run nowhere)

**Changes**:
- [x] Reproduce first: run task.289's plan table through the classifier the check will describe, and record the command and the member that writes by operand.
- [x] Add check 32 with the two probes: coverage of the whole set, and a write-by-operand probe for each unaudited member.
- [x] Add the companion edits a new check needs, as task 298 did for check 31: a bullet under "Common Hallucination Patterns to Detect", the clause in Step 3's "Issues to Flag", and a numbered rule in the Anti-Hallucination Protocol.
- [x] Add the sibling note to `review-story`. Its technical-accuracy checks are in Step 4 (`### Step 4: Technical Accuracy and Anti-Hallucination Review`), not Step 3.
- [x] A control case: a fully tabled allow-list passes the check.

**Dependencies**: none.

---

### Phase 2: The timing statistic

**Risk Level**: Low

**Files**:
- `skills/create-task/SKILL.md`, `skills/review-task/SKILL.md` (check 22 note)

**Changes**:
- [x] Extend the obs #31 bullet: name where the bound is measured and how load is controlled; prefer a paired interleaved ratio or CPU time over a ratio of medians on a shared host.
- [x] Mirror the sentence in check 22's wall-clock note.
- [x] Test that the two sentences stay one rule (the existing parity-test pattern).

**Dependencies**: independent of Phase 1.

---

### Phase 3: Bundle, docs and gate

**Risk Level**: Low

**Changes**:
- [x] `npm run bundle`, `npm run generate-catalog`, `CHANGELOG.md`; fast gate under `CI=true`.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-task/SKILL.md` - check 32 and the check 22 note
2. ✅ `skills/review-story/SKILL.md` - sibling note
3. ✅ `skills/create-task/SKILL.md` - timing statistic

### Files to Modify (Tests)

4. ✅ a review-task check test and a create-task/review-task parity test

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`, generated catalog

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: presence tests, as the sibling check tests are (`tests/review-run-and-parity-checks.test.js` states why: a reviewer applying a rule is a behaviour no CI layer exercises). Check 32's text states its trigger, the coverage rule, the write-by-operand probe, the `uniq in out` example and its Important severity; a test runs `uniq in out` in a temp directory and asserts `out` was created (the probe's claim, executed); the timing sentence appears in both `create-task` and `review-task` and a test holds them together. The negative control is a task that does not replace a deny-list: the check's trigger wording names that condition, and the test asserts it.

**Command**: `npm run test:remote` (LAN server) or `TEST_LOCAL=1 npm run test:remote`.

### Mutation proofs

Remove check 32's coverage rule and name the red test; remove the statistic from one skill and name the parity test that goes red.

---

## 9. Success Criteria

### Functional

- [x] `review-task` check 32 states its trigger (a deny-list replaced by an allow-list), the coverage rule (the table lists every member or states the count and the command), and Important severity; the test is `tests/review-allow-list-timing-checks.test.js`, and removing the coverage rule turns it red (mutation-proved, red test named in the QA report's Findings table).
- [x] Check 32 requires a write-by-operand probe for each unaudited member, with `uniq in out` as the fixture.
- [x] `create-task` 3.5 and `review-task` check 22 carry the same timing-statistic rule, held by a parity test.

### Performance

None. No runtime path changes.

### Code Quality

- [x] `npm run bundle:check`, `npm run format:check` and `ci:fast` pass under `CI=true`.
- [x] `quick_validate.py` passes for `review-task`, `review-story` and `create-task`.

### Migration

- [x] `CHANGELOG.md` entry citing task 312; bundled copies regenerated.

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

None.

### LOW RISK

1. **Check 32 fires on tasks that are not deny-list replacements.**
   - Probability: Low. Impact: Low (an advisory finding).
   - Mitigation: the trigger is a stated replacement of a deny-list by an allow-list, and the control case proves a covered table passes.

---

## 11. Rollback Plan

**Immediate (under 1 hour)**: revert the merge commit; prose and tests only.

**Partial**: revert Phase 2 and keep Phase 1.

**Forward fix**: narrow check 32's trigger wording if it over-fires.

**Triggers**: Critical: none. Non-critical: an over-firing check fixes forward.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-17 | 1.0 | Initial draft — cut from observations #159, #171 | create-task |
| 2026-11-23 | 1.1 | Review passed (8/10) — 6 fixes applied: stale line anchors, test moved to `tests/` (the runner reaches no `skills/review-task/tests/`), fixture criterion re-scoped to presence tests, check 32's three companion edits added, review-story is Step 4 | review-task |
| 2026-11-23 |  | Status → ready-for-development | review-task |
| 2026-11-23 |  | Implemented check 32, the timing sentence and `tests/review-allow-list-timing-checks.test.js`; status → ready-for-review | develop |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: The allow-list check
- [x] Phase 2: The timing statistic
- [x] Phase 3: Bundle, docs and gate

---

## References

- Observation #159 — Allow-list task that tables only some members is a deny-list for the rest
- Observation #171 — Wall-time criterion set without a measurable method on a shared host
- Observation #31 (the existing timing rule this extends)

---

## Notes

Cut with task 311 from the 2026-11-17 observation review; independent of it.
