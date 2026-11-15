---
id: task.275
title: "Gates say what they know"
type: task
description: "Make a PASS gate's plain-language lead count its open minor points instead of saying no problems, and mark each recommendation's remedy as verified or unverified, so a reader is not told something the gate does not support."
tags: [qa-task, qa-story, create-task, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-15
estimated_effort_hours: 4
---

# Task 275: Gates say what they know

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.275.review.1.gates-say-what-they-know.md` implemented 2026-11-15

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

- **A count slot** (obs #84): `open_count`, a numeric slot (registered in `NUMERIC_SLOTS`; the "every slot a template reads is classified" test fails otherwise). `PASS` with a positive count renders "The checks passed, with N minor points recorded below." (singular for 1); the bare sentence stays for a count of 0 or absent. **Decision (review 1):** the no-slot rendering keeps the bare sentence, because § 9 requires gates and call sites without the slot to render as before; every shipped `qa-gate` / `qa-cycle` site therefore feeds the slot (guarded, see § 8), so the bare sentence reaches a reader only on a measured zero.
- **What is counted** (review 1, check 11). The count is the entries of the gate's `top_issues:` block whose own `status:` is absent or `open`, read from the gate being posted. It is **not** the block's length and not `grep -c '^  - id:'` over the file: on task 213's gate 2 (the motivating example) both entries read `status: closed` and that grep returns 2 (`grep -c '^  - id:' docs/tasks/task.213.*/task.213.gate.2.*.yml`). The read is scoped to the `top_issues:` block (it stops at the next top-level key, so `recommendations:` entries are never counted) and lives in **one executable helper** under `shared/resources/` that `qa-task` and `qa-story` both call, tested by running it (a behaviour fix in prose is a fix no test executes).
- **The sites that feed it** (review 1, check 14; population from `command node .agents/skills/review-task/references/call-sites.js --engine tracker-comment.js --json` and `--engine stakeholder-summary-cli.js`, then `--stage qa-gate|qa-cycle`): `skills/qa-task/SKILL.md:1997` and `:2100`, `skills/qa-story/SKILL.md:2541` and `:2640` (the PR-comment lead through `stakeholder-summary-cli.js`, and the issue comment through `tracker-comment.js`), and `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:95` (`qa-cycle`, which has no gate file: it feeds the cycle's **Declined** non-blocking count, which its own report entry already records). `skills/qa-fix` posts `qa-fix`, which neither template touches.
- **A remedy status** (obs #86): each `recommendations.future` action carries `remedy: verified | unverified` (a verified one names the command or test that showed it working, in `verified_by:`; `verified` without it reads as `unverified`). Every skill that writes the schema carries it: `qa-task`, `qa-story` **and `qa-gate`** (`skills/qa-gate/SKILL.md` documents the same block at `:207`/`:213` and `:542`/`:546`; found by `git grep -n "recommendations:" -- 'skills/*/SKILL.md'`). `qa-planning`'s `recommendations:` are test-design suggestions, not gate remedies, and are out of scope. `create-task` treats an `unverified` remedy seeded from a gate as a claim to run before the plan builds on it.

### Important Clarifications

- The count slot is read by two templates only; the coverage test derives its expectations from the templates, so it is updated by changing the templates, not the test's list.
- The no-slot rendering of PASS keeps the bare sentence (decided in review 1, see § 3 Target Architecture); the feed guard in § 8 is what keeps a shipped site from reaching it unmeasured.

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
- `shared/resources/stakeholder-summary.js` (templates, `NUMERIC_SLOTS`)
- `shared/resources/stakeholder-summary.md` (the lead catalogue restates the PASS sentence at `:149`, `:156`, `:170`; found by `git grep -n "found no problems"`)
- a new open-count helper under `shared/resources/` with its test
- `shared/resources/tests/stakeholder-summary.test.mjs`, `comment-slot-coverage.test.mjs`
- the five call sites listed in § 3 (`qa-task`, `qa-story`, the `develop-bug` verify loop)

**Changes**:
- [x] Add `open_count` to `NUMERIC_SLOTS` and to the `qa-gate` and `qa-cycle` templates; render PASS with a positive count as above.
- [x] Add the helper that counts open `top_issues` entries; call it at each site.
- [x] Extend `comment-slot-coverage.test.mjs` so every shipped `qa-gate` / `qa-cycle` site must feed `open_count`, with a non-vacuity case (a site that omits it must fail the guard).

**Dependencies**: none.

---

### Phase 2: The remedy status

**Risk Level**: Low

**Files**:
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-gate/SKILL.md` (gate schema)
- `skills/create-task/SKILL.md` § 3.5

**Changes**:
- [x] `remedy:` and `verified_by:` fields and their meaning in all three gate-writing skills; the `create-task` line.

**Dependencies**: none (task 266, which also edits § 3.5, is accepted and merged).

---

### Phase 3: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] Tests with mutation proofs; `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/stakeholder-summary.js` - slot, `NUMERIC_SLOTS`, PASS rendering
2. ✅ `shared/resources/stakeholder-summary.md` - the catalogue's PASS wording
3. ✅ new open-count helper under `shared/resources/`
4. ✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` - call sites, `remedy:` schema; `skills/qa-gate/SKILL.md` - `remedy:` schema
5. ✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` - the `qa-cycle` site
6. ✅ `skills/create-task/SKILL.md` - one line

### Files to Modify (Tests)

7. ✅ `shared/resources/tests/stakeholder-summary.test.mjs` (the cases at `:171`–`:191` and `:386` iterate `GATE_MEANING` and the bare PASS sentence; they stay green because the bare sentence is kept)
8. ✅ `shared/resources/tests/comment-slot-coverage.test.mjs` (derives from the templates, plus the feed-the-count guard)
9. ✅ a test for the helper; it must be reached by the runner (add the glob to `package.json` if the new file's directory is not already listed)

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the slot and its rendering.

**Actions**:
- [x] PASS with `open_count` 2 renders "passed, with 2 minor points" and not "no problems"; with 0 or absent it renders the bare sentence. **Control**: CONCERNS and FAIL with a count render unchanged.
- [x] A call site feeding `open_count` to a stage that does not read it fails the coverage test; a `qa-gate` / `qa-cycle` site that omits it fails the new feed guard.
- [x] The helper counts: an entry with no `status:`, `status: open` (both counted), `status: closed`, and a `recommendations:` entry (neither counted); a `top_issues: []` gate counts 0.
- [x] Mutation proof: remove the count branch; the PASS-with-count test turns red.

**Command**: `CI=true command node --test shared/resources/tests/stakeholder-summary.test.mjs shared/resources/tests/comment-slot-coverage.test.mjs`

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [x] A PASS comment with open lows never contains "found no problems", shown by a named test in the QA report.
- [x] All three gate-writing skills (`qa-task`, `qa-story`, `qa-gate`) describe `remedy:`, and `create-task` treats `unverified` as a claim to run; the greps `git grep -c "remedy:" -- skills/qa-task/SKILL.md skills/qa-story/SKILL.md skills/qa-gate/SKILL.md` and `git grep -n "unverified" -- skills/create-task/SKILL.md` are in the QA report.
- [x] A gate without the new field and a call site without the new slot render as before (existing fixtures pass unchanged).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [x] The count branch has a mutation proof in the QA report.
- [x] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [x] `python skills/create-skill/scripts/quick_validate.py` passes for qa-task, qa-story and create-task.

### Migration

- [x] Past gates are untouched (`git diff --stat` over `docs/` shows only this task's files).

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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-15
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.275.qa.1.gates-say-what-they-know.md](./task.275.qa.1.gates-say-what-they-know.md)
- **Gate File**: [task.275.gate.1.gates-say-what-they-know.yml](./task.275.gate.1.gates-say-what-they-know.yml)

### Test Coverage Summary
- **Tests Executed**: 26 across the three affected suites, plus `ci:fast` on the LAN server
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
One low point open: the wall-time criterion was bounded (0.4 s of added tests against a 685 s run), not measured by five alternating runs.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                       | Author      |
| ---------- | ------- | ------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #84, #86    | create-task |
| 2026-11-15 | 1.1     | Review passed (8/10) — count redefined as open entries via one helper, five call sites listed, `qa-gate` added as a third schema writer, feed guard and `NUMERIC_SLOTS` added, `qa-cycle` fed at its one site | review-task |
| 2026-11-15 |         | Status → ready-for-development                    | review-task |
| 2026-11-15 |         | QA gate PASS (95/100) — 1 finding                 | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The count slot
- [x] Templates, call sites, tests

### Phase 2: The remedy status
- [x] Schema and create-task line

### Phase 3: Evidence, bundle and sweep
- [x] Mutation proof, bundle clean

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

**Status:** Ready for Review
