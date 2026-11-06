---
id: task.275
title: "Gates say what they know"
type: task
description: "Make a PASS gate's plain-language lead count its open minor points instead of saying no problems, and mark each recommendation's remedy as verified or unverified, so a reader is not told something the gate does not support."
tags: [qa-task, qa-story, create-task, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 4
---

# Task 275: Gates say what they know

**Status:** Planned

---

## 1. Overview

Two statements in QA output claim more than the gate knows. A `PASS` gate's comment opens "The checks found no problems." when `top_issues` holds open lows (obs #84), and a `recommendations.future` action prescribes a fix nobody ran (obs #86).

**Scope**: one new slot in the stakeholder-summary templates for `qa-gate` and `qa-cycle`, the call sites that feed it, a remedy-status field in the gate, and one `create-task` line.

---

## 2. Motivation

### Current Problems

1. **PASS says "no problems" beside open lows.** `GATE_MEANING.PASS` is "The checks found no problems." Task 213's gate 2 was `gate: PASS` with two `severity: low` entries, and its `status_reason` named them; the comment posted to issue #715 still opened with the no-problems sentence. The non-technical reader cannot see the YAML below the `---`. This breaks the stakeholder-summary rule against defaulting to reassurance.
2. **A remedy nobody ran.** Task.224 gate 4 recorded CR-1 under `recommendations.future` with the fix "on a stale cached hit, drop the cache entry and resolve once more". When task.225 was cut from it, the fix failed on Node v26.8.2: deleting every `Module._pathCache` key, a non-normalised request, or a direct `Module._findPath` call all still returned the deleted file.

### Benefits

1. A lead never says "no problems" while the gate lists some.
2. A task cut from a gate knows which remedies are claims to run.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `shared/resources/stakeholder-summary.js:29` `PASS: "The checks found no problems."` inside `GATE_MEANING`, with CONCERNS, FAIL and WAIVED beside it; `:115` `"qa-gate"` and `:125` `"qa-cycle"` are the two templates that render it; `:293`–`:297` list the stages that recur per cycle.
- `shared/resources/tests/comment-slot-coverage.test.mjs` fails on a call site that feeds a slot its stage does not read, and on one that feeds the lead nothing; `stakeholder-summary.test.mjs` is the engine test.
- `skills/qa-task/SKILL.md:1392` `recommendations:` in the gate schema; `:1317` shows an example `recommendations.future` entry with `action:` and `refs:`. `qa-story/SKILL.md` has the sibling gate step.
- The repository rule: an unknown or absent verdict renders "the results are recorded below" and never defaults to reassurance; every template must read correctly with no slots filled.

### Target Architecture

- **A count slot** (obs #84), e.g. `open_count`, fed by the call site from `top_issues` length. `PASS` with a non-zero count renders "The checks passed, with N minor points recorded below."; the bare sentence stays for an empty `top_issues` and for the no-slot rendering.
- **A remedy status** (obs #86): each `recommendations.future` action carries `remedy: verified | unverified` (a verified one names the command or test that showed it working). `qa-task` and `qa-story` write it; `create-task` treats an `unverified` remedy seeded from a gate as a claim to run before the plan builds on it.

### Important Clarifications

- The count slot is read by two templates only; the coverage test derives its expectations from the templates, so it is updated by changing the templates, not the test's list.
- The no-slot rendering of PASS is now the more cautious one only if the bare sentence is kept for it; the plan decides whether the no-slot form should avoid the claim (it is the form that ships first).

---

## 4. Scope

### In Scope

✅ **The count slot** in the `qa-gate` and `qa-cycle` templates and their call sites.
✅ **`remedy:`** in the gate schema, written by `qa-task` and `qa-story`.
✅ **One `create-task` line** (§ 3.5) for an unverified seeded remedy.
✅ **Tests.**

### Out of Scope

❌ **Other stages' leads.**
❌ **Retrofitting past gates.**

---

## 5. Breaking Changes

None - the new slot and field are optional; a gate without `remedy:` reads as `unverified` for the `create-task` rule, and a call site that feeds no count renders as today.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.275.plan.gates-say-what-they-know.md](task.275.plan.gates-say-what-they-know.md)

### Phase 1: The count slot

**Risk Level**: Medium

**Files**:
- `shared/resources/stakeholder-summary.js`
- `shared/resources/tests/stakeholder-summary.test.mjs`, `comment-slot-coverage.test.mjs`
- the `qa-gate` / `qa-cycle` call sites in `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`

**Changes**:
- [ ] Add `open_count` to the two templates and render PASS with a non-zero count as above.
- [ ] Feed it from `top_issues` length at each call site.

**Dependencies**: none.

---

### Phase 2: The remedy status

**Risk Level**: Low

**Files**:
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` (gate schema)
- `skills/create-task/SKILL.md` § 3.5

**Changes**:
- [ ] `remedy:` field and its meaning; the `create-task` line.

**Dependencies**: none (but edits § 3.5 after task 266).

---

### Phase 3: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Tests with mutation proofs; `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/stakeholder-summary.js` - slot and PASS rendering
2. ✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` - call sites, `remedy:` schema
3. ✅ `skills/create-task/SKILL.md` - one line

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/stakeholder-summary.test.mjs`
5. ✅ `shared/resources/tests/comment-slot-coverage.test.mjs` (derives from the templates; confirm it picks the slot up)

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the slot and its rendering.

**Actions**:
- [ ] PASS with `open_count` 2 renders "passed, with 2 minor points" and not "no problems"; with 0 or absent it renders the bare sentence. **Control**: CONCERNS and FAIL with a count render unchanged.
- [ ] A call site feeding `open_count` to a stage that does not read it fails the coverage test.
- [ ] Mutation proof: remove the count branch; the PASS-with-count test turns red.

**Command**: `CI=true command node --test shared/resources/tests/stakeholder-summary.test.mjs shared/resources/tests/comment-slot-coverage.test.mjs`

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] A PASS comment with open lows never contains "found no problems", shown by a named test in the QA report.
- [ ] Both gate-writing skills describe `remedy:`, and `create-task` treats `unverified` as a claim to run; the three greps are in the QA report.
- [ ] A gate without the new field and a call site without the new slot render as before (existing fixtures pass unchanged).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] The count branch has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `python skills/create-skill/scripts/quick_validate.py` passes for qa-task, qa-story and create-task.

### Migration

- [ ] Past gates are untouched (`git diff --stat` over `docs/` shows only this task's files).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. A call site feeds the wrong slot name**
- **Risk**: a real slot name on a different stage; it posts and reads as before.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: the coverage test derives expectations from the templates and fails on it.
- **Rollback**: revert the call site.

### Low Risk Areas

**1. `remedy:` ignored by writers**
- **Risk**: gates keep omitting it.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: absence reads as `unverified`, which is the safe reading.
- **Rollback**: n/a.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a stakeholder-summary or slot-coverage test is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: only `remedy:` misbehaves.

**Steps**:
1. Revert Phase 2's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- a posted comment loses its lead

**Non-Critical (Forward Fix)**:
- wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                       | Author      |
| ---------- | ------- | ------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #84, #86    | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The count slot
- [ ] Templates, call sites, tests

### Phase 2: The remedy status
- [ ] Schema and create-task line

### Phase 3: Evidence, bundle and sweep
- [ ] Mutation proof, bundle clean

---

## References

- Observation #84 — PASS gate lead says 'no problems' when top_issues holds open lows
- Observation #86 — QA recommendations.future prescribes fixes nobody ran

---

## Notes

### Important Reminders

The stakeholder-summary rule: every template must read correctly with no slots filled.

### Future Improvements

None.

---

**Status:** Planned
