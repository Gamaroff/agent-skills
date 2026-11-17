---
id: task.279
title: "develop-next reads the world before it stops"
type: task
description: "Stop develop-next halting on a recorded HALT the evidence has superseded, name where its quality-gate worktree goes, and run the observe-work Session Start Protocol as a Step 0 line in the long orchestrators."
tags: [develop-next, develop-task, develop-story, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-17
estimated_effort_hours: 8
---

# Task 279: develop-next reads the world before it stops

**Status:** Ready for Review

---

## 1. Overview

`/develop-next` stops on state it could have checked, runs its merge gate where two tests refuse to run, and relies on a project instruction to start observation (obs #53, #66, #138, #157). Each is a stated rule plus, for the first, a small check.

**Scope**: `skills/develop-next/SKILL.md` Steps 0 and 3, and a Step 0 / Phase 0 line in `develop-next`, `develop-task`, `develop-story` and `develop-bug`. `develop-batch` is excluded on purpose: it fans each item into a per-item pipeline whose own Phase 0 carries the line.

---

## 2. Motivation

### Current Problems

1. **A resolved HALT still stops the loop** (obs #53, #66). Step 0.1a stops on `halted: true`. On T205, T189 and T211 the operator had resolved the halt out of band (document `accepted`, PR `MERGED`, registry row `accepted`), and the stale flag remained; a later item (T221, PR #714) merged while the file sat there. Three instances in six days.
2. **The gate worktree goes where tests refuse to run** (obs #138). On task.225 (PR #798) `npm run ci` ran in a worktree under `/tmp` and exited 1 on `skills/create-task/tests/from-observation.test.js` and `tests/test-clean-checkout.test.js`, both of which refuse an ephemeral checkout. The red was environmental, not a code verdict.
3. **Session Start was skipped** (obs #157). In the task 264 session the first tool call ran before the observe-work protocol because the session began from a skill invocation; it was found at a later task boundary.

### Benefits

1. An unattended loop continues past a halt the evidence contradicts, and still stops on any it does not.
2. A red from an ephemeral-checkout refusal is named as environment.
3. The activation does not depend on the first message.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/develop-next/SKILL.md:69` **a. A recorded HALT first**: `halted: true` → surface and STOP; "to clear it, set `halted: false` in the run-state file". `:71` **b. Reconcile the flags against the evidence** only advances flags and never clears one.
- `skills/develop-next/SKILL.md:28` `developNext.qualityGateCommand` default `npm run ci` is the Step 3 merge gate; `grep -n -i "worktree" skills/develop-next/SKILL.md` finds only `develop-batch`'s worktree wording at `:262`, nothing naming where a quality-gate worktree goes.
- `grep -n -i "observe-work\|Session Start" skills/develop-next/SKILL.md skills/develop-task/SKILL.md` returns nothing: the activation lives only in the project `AGENTS.md`.
- `tests/test-clean-checkout.test.js` and `skills/create-task/tests/from-observation.test.js` refuse an ephemeral checkout (stated by obs #138; the refusal list is the resolver's in `observe-work`).

### Target Architecture

- **0.1a** checks the same evidence 0.1b reads before stopping: document `accepted` (bug: `closed`) AND `prNumber` MERGED. When both hold, report the halt as resolved out of band and route as `halted: false`; keep STOP for any halt the evidence does not contradict (obs #66).
- **Step 3**: the gate worktree goes beside the checkout (for example `../.qg-<id>`), not under `/tmp`, with `node_modules` linked in and removed afterwards; a red from a test that refuses an ephemeral checkout is an environment failure, not a code verdict (obs #138).
- **Step 0** of `develop-next`, and **Phase 0** of `develop-task`, `develop-story` and `develop-bug`, carry a line that runs the observe-work Session Start Protocol once if it has not run this session (obs #157).

### Important Clarifications

- Reconciliation "only ever advances a flag" (`:71`); the 0.1a change must keep that: it routes as if cleared and writes `halted: false` only through the same advance path, with the evidence recorded.
- A merged PR plus an `accepted` document can still coexist with a different unresolved halt on another item; the check is per item.
- The Step 0 line cannot assume the skill is installed; it is conditional on the skill's presence.
- **The sibling worktree is not ephemeral** (verified in review, 2026-11-17): `git worktree add --detach ../.qg-probe HEAD` in this checkout, then `ephemeralReason` (`shared/resources/observation-log.js:584`) on its real path, returned `null`; the same call on `/tmp/x/y` returned "inside a temporary directory". The refused locations are exactly `/tmp`, `/var/tmp` and `.claude/worktrees/` (`EPHEMERAL_PATTERNS`, `:578`), so the rule must also never name a path under `.claude/worktrees/`. The probe worktree was removed afterwards.
- **An existing test pins the 0.1a wording.** `evals/develop-next/protocol/skill-shape.test.mjs:515-528` slices the text between the `**a. A recorded HALT first.**` and `**b. Reconcile the flags` markers and asserts `never route a halted run, and never to Step 3`, `develop-pipeline.last-halt.json` and `set \`halted: false\``. The rewritten 0.1a keeps all three in that slice (they still describe the case the evidence does not contradict), or the plan updates the test in the same edit.
- **Reconstruction states for 0.1a** (the evidence reader must hold in each): halted with document `accepted` and PR `MERGED` (route); halted, document `accepted`, PR `OPEN` (stop); halted, document not `accepted`, PR `MERGED` (stop); halted with no `prNumber` recorded (stop: no evidence); the PR query fails (stop); a bug item (document `closed` replaces `accepted`); `halted: false` (the reader is not consulted).

---

## 4. Scope

### In Scope

✅ **0.1a evidence check** and its tests.
✅ **Step 3 worktree rule.**
✅ **Step 0 / Phase 0 activation line** in four orchestrators (`develop-next`, `develop-task`, `develop-story`, `develop-bug`).

### Out of Scope

❌ **Changing what counts as a halt.**
❌ **The observe-work skill itself.**

---

## 5. Breaking Changes

None - a halt the evidence does not contradict still stops.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.279.plan.develop-next-reads-the-world-before-it-stops.md](task.279.plan.develop-next-reads-the-world-before-it-stops.md)

### Phase 1: The 0.1a check

**Risk Level**: High

**Files**:
- `skills/develop-next/SKILL.md` Step 0.1a
- `skills/develop-next/scripts/halt-evidence.mjs` (the evidence reader: required, not optional, because § 8 names unit tests of its decision; `--json`, a `reason`, exit 0 only for "resolved out of band") and its test `evals/develop-next/unit/halt-evidence.test.mjs` (reached by the `eval:develop-next` glob `evals/develop-next/unit/*.test.mjs`)
- `evals/develop-next/protocol/skill-shape.test.mjs` (the pin on the 0.1a wording, `:515-528`; kept passing or updated in the same edit)

**Changes**:
- [x] Evidence check before STOP; resolved → route; otherwise STOP with the one-line clear instruction.

**Dependencies**: none.

---

### Phase 2: The Step 3 worktree rule

**Risk Level**: Low

**Files**:
- `skills/develop-next/SKILL.md` Step 3

**Changes**:
- [x] Where the worktree goes, how it is cleaned up, and how a refusal red is read.

**Dependencies**: none.

---

### Phase 3: The Step 0 activation line

**Risk Level**: Low

**Files**:
- `skills/develop-next/SKILL.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`

**Changes**:
- [x] One conditional line each (`develop-batch` excluded, see Scope).

**Dependencies**: none.

---

### Phase 4: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] Fixtures with controls (§ 8); `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/develop-next/SKILL.md` - 0.1a, Step 3, Step 0
2. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md` - Phase 0 line; and `evals/shared/tests/observe-work-start-line.test.mjs` (new) holding all four lines
3. ✅ an evidence reader under `skills/develop-next/scripts/`, if the plan needs one

### Files to Modify (Tests)

4. ✅ `evals/develop-next/unit/halt-evidence.test.mjs`, and `evals/develop-next/protocol/skill-shape.test.mjs` for the pinned 0.1a wording

### Files to Modify (Generated)

5. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the 0.1a decision.

**Actions**:
- [ ] `halted: true` with the document `accepted` and the PR MERGED routes; **control**: the same with the PR OPEN, or the document `in-progress`, stops with the instruction.
- [ ] A PR query that fails leaves the flag as recorded and stops.
- [ ] Mutation proof: drop the merged check; the PR-open control turns red.

**Command**: `CI=true command node --test` on the named files.

### Behavioural Evidence

Step 3 and Step 0 lines are prose; evidence is a fresh session on each, with a control (a gate run beside the checkout passes both refusing tests).

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] A halt with both pieces of evidence routes and a halt with either missing stops, shown by named tests recorded in the QA report.
- [ ] A quality gate run in a worktree beside the checkout passes `from-observation.test.js` and `test-clean-checkout.test.js`, shown by the command and exit codes in the QA report.
- [ ] The Step 0 / Phase 0 line is present in the four orchestrators, all four held by one test, `evals/shared/tests/observe-work-start-line.test.mjs` (reached by the `evals/shared/tests/*.test.mjs` glob in `package.json`), which reads each `SKILL.md` and fails when its line is removed (the greps and the mutation proof are in the QA report).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] The 0.1a check has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `python skills/create-skill/scripts/quick_validate.py` passes for the three skills.

### Migration

- [ ] A run-state file with `halted: true` and no merged PR still stops: the `halt-evidence.test.mjs` case for it passes, and the existing 0.1a pin in `evals/develop-next/protocol/skill-shape.test.mjs` passes unchanged (both named in the QA report).

---

## 10. Risk Assessment

### High Risk Areas

**1. The loop continues past a real halt**
- **Risk**: evidence misread, so a genuine halt is routed.
- **Probability**: Low
- **Impact**: Critical
- **Mitigation**: both conditions are required; a failed query stops; the PR-open and in-progress controls are tests.
- **Rollback**: revert Phase 1.

### Medium Risk Areas

**1. The worktree rule leaves clutter**
- **Risk**: `../.qg-*` directories remain.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: the rule includes removal and names the cleanup command.
- **Rollback**: forward fix.

### Low Risk Areas

**1. The Step 0 line runs the protocol twice**
- **Risk**: a duplicate scan.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: "once per session, if not already run".
- **Rollback**: remove the line.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- develop-next routes a run it should have stopped
- the develop-next suites are red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one phase misbehaves.

**Steps**:
1. Revert that phase's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- a real halt is routed past

**Non-Critical (Forward Fix)**:
- prose wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                   | Author      |
| ---------- | ------- | ------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #53, #66, #138, #157    | create-task |
| 2026-11-17 | 1.1     | Review passed (8/10): evidence reader made a script with a named test path, existing 0.1a pin named, sibling worktree verified non-ephemeral, develop-bug added to the activation line, reconstruction states listed | review-task |
| 2026-11-17 |         | Status → ready-for-development                                | review-task |
| 2026-11-17 |         | Developed: halt-evidence.mjs + unit test, 0.1a evidence read, Step 3 gate-worktree rule, Session Start line in four orchestrators + test; status → ready-for-review | develop-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The 0.1a check
- [x] Evidence check and tests

### Phase 2: The Step 3 worktree rule
- [x] Rule written

### Phase 3: The Step 0 activation line
- [x] Four lines

### Phase 4: Evidence, bundle and sweep
- [x] Bundle clean

---

## References

- Observation #53 — develop-next run-state halted flag is never cleared when the halted pipeline is later completed
- Observation #66 — develop-next Step 0.1a stops on a halt the operator already resolved out of band
- Observation #138 — Quality-gate scratch worktree under /tmp fails npm run ci on tests that refuse ephemeral checkouts
- Observation #157 — Session Start Protocol skipped when a skill invocation opens the session

---

## Notes

### Important Reminders

This task edits the orchestrator that runs it; land it in its own PR and re-read Step 0.1a afterwards.

### Future Improvements

None.

---

**Status:** Ready for Review
