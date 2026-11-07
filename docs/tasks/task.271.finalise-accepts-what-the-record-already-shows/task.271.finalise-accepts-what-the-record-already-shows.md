---
id: task.271
title: "finalise accepts what the record already shows"
type: task
description: "Give finalise three recorded arms it lacks, so work that the evidence already clears is no longer halted: a measurement on a code-identical earlier commit, one bounded re-run of a red outside the diff, and a probe reproduction the owner deferred."
tags: [finalise, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-07
estimated_effort_hours: 16
---

# Task 271: finalise accepts what the record already shows

**Status:** Ready for Review

---

## 1. Overview

`/finalise` halts on three situations where the record already shows the work is sound, and an operator closed each by hand (obs #32, #50, #117). Each needs a named, mechanical arm that records its basis. None may accept silently: every arm writes who decided, on what evidence, and an unmatched case stays a FAIL.

**Scope**: three arms in finalise and the shared AC and security prompts. The "finalise takes the measurement itself" half of obs #32 (the measured-criteria card) is out.

---

## 2. Motivation

### Current Problems

1. **A figure cannot be both on the head and committed** (obs #32). The AC prompt requires a wall-clock figure "taken on the PR's head commit" and cited from a committed artifact; committing makes a new head. On task.184 the AC agent failed AC5 `re-measure` for a figure on `5ab4839a` against head `17abc500`; `git diff 5ab4839a 17abc500 -- shared/ skills/ tests/` was empty.
2. **A red outside the diff halts** (obs #50). On task.205 CI reading 1 was FAILURE: one of 6142 tests failed with ENOENT in `resolve-pr-number.test.mjs`, outside the diff; the delta from the last green head was docs-only. The CI table says FAILURE means do not accept, and the re-sample loop covers only NONE, CANCELLED and UNKNOWN.
3. **A reproduction the owner deferred halts** (obs #117). On task.238 DoD run 2 the probe reproduced `oc10-second-findings-cut-short`, which QA gate 10 had reproduced and the owner had deferred to task.240. The skill offered only a halt or a fix that contradicts the decision; the run accepted by judgement and logged a deviation.

### Benefits

1. Sound work is not held by a literal reading of a rule whose purpose it meets.
2. Each acceptance names its basis, so the departure from the rule is auditable.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `shared/resources/finalise-dod-ac-prompt.md:72`: "A wall-clock bound decays with every later commit and every change in machine load. Its cited measurement must record the load it ran under … and be taken on the PR's head commit. A figure from an earlier commit, or with no load recorded, is `FAIL` with `note: "re-measure"`." (Task 266 appends a run-count clause to this line.)
- `shared/resources/ci-tree-equivalence.js:1127` `module.exports`: the docs-only tree-equivalence engine. `skills/finalise/SKILL.md:1368` (anchors re-measured 2026-11-07 on `feature/task.271…`; find them again with `grep -n "ci-tree-equivalence" skills/finalise/SKILL.md`) already uses it for a `PENDING`/`NONE` rollup after the re-sample loop; it exits 0 only for `tree-equivalent`.
- `skills/finalise/SKILL.md:1238` (the rollup `jq`; `grep -n "TIMED_OUT" skills/finalise/SKILL.md`) buckets `FAILURE | TIMED_OUT | ERROR | STARTUP_FAILURE | ACTION_REQUIRED` as FAILURE with no re-run arm.
- Security Step 3b.1 item 6 (`:811`, `:795`; `grep -n "Recompute .overall" skills/finalise/SKILL.md`) "Recompute `overall`: FAIL if any check or general … reproduced"; Step 6 then decides IN PROGRESS unless Step 8a's fix-and-recheck applies. A `WAIVED` gate already has `approved_by` and a reason (`:345`–`:353`, `**Waiver**: {waiver.reason} — approved by {waiver.approved_by}`).
- `recommendations.future[]` is read from the gate at `:322`.

### Target Architecture

- **Arm 1 (obs #32)**: a measured figure counts when taken on a commit whose code tree equals the head's, by `ci-tree-equivalence.js`; the AC agent cites the equivalence result, not the literal head.
- **Arm 2 (obs #50)**: when the only red is a test file outside the PR diff and the delta from the last green head is entirely docs (tree-equivalence answers that), re-run the failed job **exactly once** (owner decision, Phase 1), record both attempts, and accept only on a green second attempt. Separately, find why the fixture template vanishes mid-copy (`fixtureRepo` in `shared/resources/tests/lib/executed-prose.mjs`).
- **Arm 3 (obs #117)**: a reproduced probe whose case id matches an entry in the gate's `recommendations.future` (or the work item's Deferred Work) that names a follow-up task and an approver, **where the approver is the repository owner** (owner decision, Phase 1; the matcher compares the approver to an owner identity read from a named source, chosen in Phase 4, with a reader and a test, and with no source configured no deferral is accepted), is rendered "deferred (owner, date, task)" and not as FAIL, in the shape a `WAIVED` gate uses. No approver or no match stays FAIL.

### Important Clarifications

- Each arm needs an owner decision on the semantics before it ships. The plan's Phase 1 puts the three to the user and records the answers; a decision not given leaves that arm out and its observation open.
- Arm 3 is a mechanical match, never a judgement by the agent.

---

## 4. Scope

### In Scope

✅ **Three arms** with recorded basis.
✅ **The fixture-vanish investigation** for arm 2 (find the cause; fix if small).
✅ **Tests** with an unmatched control for each.

### Out of Scope

❌ **Finalise taking the measurement itself** (obs #32 part b, and #43 part b): its own card.
❌ **Weakening the default**: with no matching record, behaviour is unchanged.

---

## 5. Breaking Changes

None - each arm only turns a halt into an acceptance when a recorded basis exists; absent the basis, today's behaviour holds.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.271.plan.finalise-accepts-what-the-record-already-shows.md](task.271.plan.finalise-accepts-what-the-record-already-shows.md)

### Phase 1: Owner decisions

**Risk Level**: Low

**Changes**:
- [x] Put the three semantics to the user (what counts as equivalent, how many re-runs, who may defer) and record the answers in the plan.

**Dependencies**: none.

---

### Phase 2: Arm 1, equivalent-commit measurement

**Risk Level**: Medium

**Files**:
- `shared/resources/finalise-dod-ac-prompt.md`
- `shared/resources/finalise-dod-prompt-contract` test (read/update pin)

**Changes**:
- [x] Rewrite the head-commit clause around tree-equivalence and require the agent to cite the equivalence result.

**Dependencies**: Phase 1; task 266 is merged (PR #851), so its run-count clause is already on the line and is kept.

The tests that read the AC prompt, to run before and after (found with `git grep -l "finalise-dod-ac-prompt" -- '*.test.*'`): `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`, `shared/resources/tests/qa-finalise-rules-wiring.test.mjs`. No test pins the removed phrase "taken on the PR's head commit" by literal (`git grep -n "on the PR's head commit" -- '*.test.*'` returns nothing).

---

### Phase 3: Arm 2, bounded re-run

**Risk Level**: High

**Files**:
- `skills/finalise/SKILL.md` (CI gate: the rollup `jq` near `:1238` and the tree-equivalence block near `:1368`)
- `skills/finalise/references/finalise-ci-poll.sh` or a sibling script
- `shared/resources/tests/lib/executed-prose.mjs` (the vanish)

**Changes**:
- [x] One recorded re-run when the red test file is outside the diff and the delta is docs-only.
- [x] Root-cause the vanishing fixture template (suspected cause removed, not reproduced; see the implementation report).

**Dependencies**: Phase 1.

---

### Phase 4: Arm 3, deferred reproduction

**Risk Level**: High

**Files**:
- `shared/resources/finalise-dod-security-prompt.md`
- `skills/finalise/SKILL.md` Step 3b.1 item 6
- a matcher script with tests

**Changes**:
- [x] Match on case id against `recommendations.future[]` or Deferred Work with a named task and an owner approver; render as deferred with owner, date, task.
- [x] Before adding the matcher script under `shared/resources/`, find the tests that enumerate that directory (`git grep -nE "readdirSync|git ls-files" -- 'tests/*.test.js' 'shared/resources/tests/*.test.mjs'`) and name each in the QA report with what it required of the new file. Run the banned-name pattern from `tests/no-consumer-names.test.js` over any fixture literals.

**Dependencies**: Phase 1.

---

### Phase 5: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] `command npm run bundle`, `command npm run bundle -- --check`, tests with mutation proofs.

**Dependencies**: Phases 2 to 4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finalise-dod-ac-prompt.md` - arm 1
2. ✅ `skills/finalise/SKILL.md` - arms 2 and 3
3. ✅ `shared/resources/finalise-delta.js` - arms 1 and 2, new (the sibling script the plan allowed for)
4. ✅ `shared/resources/finalise-deferral-match.js` - arm 3, new
5. ✅ `shared/resources/tests/lib/executed-prose.mjs` - the vanishing template
6. ✅ `docs/reference/configuration.md` and `CHANGELOG.md` - the `finalise.deferralApprover` key and the entry

Not modified, against the plan: `finalise-dod-security-prompt.md` (Arm 3 is wired in `SKILL.md` Step 3b.1, where `overall` is recomputed, so the prompt needs no change) and `finalise-ci-poll.sh` (Arm 2 decides in the new engine and reuses the existing poll as it is).

### Files to Modify (Tests)

7. ✅ `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` - ran green unchanged (no pin moved)
8. ✅ new: `shared/resources/tests/finalise-delta.test.mjs`, `finalise-deferral-match.test.mjs`, `executed-prose-no-background-git.test.mjs`, `finalise-acceptance-blocks.test.mjs` (the two SKILL.md blocks run under bash and zsh, added in QA cycle 1)

### Files to Modify (Generated)

9. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each arm and its refusal.

**Actions**:
- [x] Arm 1: a figure on a code-identical earlier commit passes with the equivalence cited; a figure on a commit with a code change fails `re-measure`. **Control**: a docs-only delta that touches a file the measured suite reads is not equivalent.
- [x] Arm 2: a red test outside the diff with a docs-only delta triggers one re-run recorded twice and accepts only on green; a red test inside the diff, or a non-docs delta, does not re-run.
- [x] Arm 3: a matching case id with task and approver renders deferred; no approver, no match, or a different case id stays FAIL.
- [x] Mutation proofs: drop the equivalence check, the in-diff exclusion and the approver requirement; each turns one named test red.

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] Each arm accepts its matching case and refuses its unmatched control, shown by named tests recorded in the QA report.
- [ ] Every accepted case writes its basis (commits and equivalence result; both CI attempts; owner, date and task) into the DoD record, shown by the tests' assertions.
- [ ] With no matching record, finalise behaves as before (an existing fixture passes unchanged).

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each arm has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `CI=true command node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs` passes.

### Migration

- [ ] The fixture-vanish cause is stated in the QA report, or recorded as not found with the commands tried.

---

## 10. Risk Assessment

### High Risk Areas

**1. An arm accepts work it should not**
- **Risk**: a false match turns a real FAIL into an acceptance.
- **Probability**: Medium
- **Impact**: Critical
- **Mitigation**: exact-id match, approver required, tree-equivalence exits 0 only on `tree-equivalent`, each arm bounded to one use per run, and the unmatched controls above.
- **Rollback**: revert the arm.

**2. A re-run hides a flaky test**
- **Risk**: arm 2 normalises flakiness.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: both attempts are recorded and the vanishing template is root-caused in the same task.
- **Rollback**: revert arm 2.

### Medium Risk Areas

**1. Semantics not decided**
- **Risk**: Phase 1 gets no answer.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: that arm is dropped and its observation stays open.
- **Rollback**: n/a.

### Low Risk Areas

**1. The AC prompt pin moves**
- **Risk**: `finalise-dod-prompt-contract` fails.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: run it before and after.
- **Rollback**: revert the clause.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- finalise accepts a case a control says it must refuse
- the finalise suites are red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one arm misbehaves.

**Steps**:
1. Revert that arm's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording or a message.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- an arm accepts an unmatched control

**Non-Critical (Forward Fix)**:
- recorded-basis wording

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-07
**Quality Score**: 60/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.271.qa.4.finalise-accepts-what-the-record-already-shows.md](./task.271.qa.4.finalise-accepts-what-the-record-already-shows.md)
- **Gate File**: [task.271.gate.4.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.4.finalise-accepts-what-the-record-already-shows.yml)

### Test Coverage Summary
- **Tests Executed**: 8058
- **Phases Verified**: 5/5
- **Critical Issues**: 2
- **NFR Status**: Security: FAIL, Performance: CONCERNS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
Cycle 3's findings are closed or narrowed. The safety re-probe (14 probes) found the same class a third time in the Arm 3 matcher (free prose in the bold slot of the lead, a later revocation ignored) and a symlink to a changed file passing the failed-file check. The third-strike rule applies: the fix replaces the grammar.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                          | Author      |
| ---------- | ------- | ---------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #32, #50, #117 | create-task |
| 2026-11-07 | 1.1     | Phase 1 owner decisions recorded in the plan; all three arms approved (Arm 3 owner-only approval) | Claude      |
| 2026-11-07 | 1.2     | Review passed (9/10): anchors re-measured, owner-only approver and exactly-once re-run stated, test-enumeration step added | review-task |
| 2026-11-07 |         | Status → ready-for-development | review-task |
| 2026-11-07 | 1.3     | Developed: `finalise-delta.js` (Arms 1 and 2), `finalise-deferral-match.js` (Arm 3), AC prompt and SKILL.md wiring, `finalise.deferralApprover`, fixture background-git fix; `ci:fast` green | develop |
| 2026-11-07 |         | QA gate FAIL (60/100) — 4 findings | qa-task |
| 2026-11-07 |         | QA findings fixed — 4 of 4 (failed-file canonicalisation, placeholder refusal, real-date check, zsh-portable owner read), 1 iteration | qa-fix |
| 2026-11-07 |         | QA gate FAIL (60/100) — 3 findings | qa-task |
| 2026-11-07 |         | QA findings fixed — 3 of 3 (anchored single-form deferral bullet, comments ignored, symlink final component kept), 1 iteration | qa-fix |
| 2026-11-07 |         | QA gate FAIL (70/100) — 2 findings | qa-task |
| 2026-11-07 |         | QA findings fixed — 2 of 2 (bullet lead as an allow-list, failed file must be a blob named against the toplevel), 1 iteration | qa-fix |
| 2026-11-07 |         | QA gate FAIL (60/100) — 3 findings | qa-task |
| 2026-11-07 |         | QA findings fixed — 3 of 3 (Arm 3 grammar replaced with one exact line, regular-file check, every record must approve), 1 iteration | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Owner decisions
- [x] Three answers recorded

### Phase 2: Arm 1
- [x] Equivalent-commit measurement

### Phase 3: Arm 2
- [x] Bounded re-run, vanishing template

### Phase 4: Arm 3
- [x] Deferred reproduction

### Phase 5: Bundle and sweep
- [x] Mutation proofs, bundle clean

---

## References

- Observation #32 — Measured criterion demands a head-commit figure a committed record cannot have
- Observation #50 — Finalise CI gate has no sanctioned re-run for a red outside the diff on a docs-only delta
- Observation #117 — finalise has no arm for a probe reproduction the owner already deferred

---

## Notes

### Important Reminders

Task 266 appends to the same line of `finalise-dod-ac-prompt.md`; land one first or merge `develop`.

### Future Improvements

The measured-criteria card (finalise takes the measurement itself).

---

**Status:** Ready for Review
