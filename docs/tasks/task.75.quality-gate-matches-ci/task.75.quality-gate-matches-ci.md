---
id: task.75
title: "[Task 75] Make the pipeline quality gate run what CI runs"
type: task
description: "CI's test job runs format:check, npm test and eval:all. The pipeline's quality gate runs npm test alone, so two of the three never execute locally. On task 67 that shipped a red build and cost a recovery commit; eval:all was never run locally at any step. Give both a single source."
tags: [ci, quality-gate, develop-next, pipeline, tooling]
category: infrastructure
status: accepted
priority: High
risk_level: low
created: 2026-09-01
updated: 2026-09-01
completed_date: 2026-09-01
pr_number: 291
assignee:
estimated_effort_hours: 4
---

# Technical Task: Make the pipeline quality gate run what CI runs

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.75.review.1.quality-gate-matches-ci.md` implemented 2026-09-01

---

## 1. Overview

`.github/workflows/test.yml`'s `test` job runs three commands:

```
npm run format:check      →   Formatting
npm test                  →   Hermetic test suite (L1–L4)
npm run eval:all          →   End-to-end replay evals (L4)
```

The pipeline's gate runs one:

```
developNext.qualityGateCommand   →   npm test   (default)
```

So a branch can pass every local gate the pipeline has and still go red. On task 67 it did.

**Scope**: one script both sides call, and the config default pointing at it. No change to what CI
checks, no new checks.

---

## 2. Motivation

### Current Problems

1. **Measured on task 67.** Step 8 pushed, CI went red on `test` → *Formatting*: `prettier --check`
   flagged the two new files. `npm test` had passed locally throughout. Cost: a red build, a diagnosis
   round trip, and recovery commit `de9dc8a`.
2. **`eval:all` never ran locally at all** — not in `/develop` Step 3, not in the QA loop, not in
   `/finalise`, not at the `develop-next` merge gate. It passed in CI, which is the only reason nobody
   noticed. Had it failed, the first signal would have been a red build on an already-accepted task.
3. **The gate is configured by name, not derived.** `qualityGateCommand` is a string in
   `skills-config.yaml` with no relationship to the workflow. Adding a CI step does not update it, and
   nothing detects the divergence.
4. **The pipeline's own docs treat `npm test` as the definition of green.** `develop-next` Step 3 says
   *"Always … run `<qualityGateCommand>` on the PR branch. This is the real gate."* It is not the real
   gate; CI is, and they differ.
5. **It fails at the most expensive moment.** The gate exists so failures land during development. A
   divergent gate moves them to after the PR is open and, in the task-67 case, after `/finalise` had
   already run.

### Benefits

1. **A local green means a CI green**, which is the property the gate is supposed to have.
2. **One place to change.** A new CI step is picked up by the pipeline automatically.
3. **`eval:all` gets run before push** rather than discovered in CI.

---

## 3. Technical Background

### Current architecture

`package.json` has `format:check`, `test`, and `eval:all` as separate scripts. The workflow names all
three as separate steps. `skills-config.yaml` names one of them as the gate. Nothing connects them.

### Target architecture

A single `npm run ci` script that is the definition of "green":

```json
"ci": "npm run format:check && npm test && npm run eval:all"
```

The workflow calls it. `developNext.qualityGateCommand` defaults to it. A contract test asserts the
workflow and the script have not drifted apart.

### Important clarifications

- **This does not make every pipeline step slower.** `eval:all` is the expensive part and belongs at the
  *merge* gate, not in every `qa-fix` cycle. The task defines which gate runs which tier — see Phase 2.
- **CI keeps its per-step names.** Losing the separate "Formatting" step would make a red build harder to
  read, so the workflow calls the tiers, not one opaque command. See Phase 3.
- **No new checks are added.** This is alignment, not expansion.

---

## 4. Scope

### In Scope

✅ **A `ci` script** in `package.json` composing the existing three
✅ **Tiering** — which pipeline moment runs which tier, so the fast loop stays fast
✅ **`qualityGateCommand` default** changed to the full gate, and documented
✅ **A contract test** asserting the workflow and the script do not drift
✅ **`develop-next` Step 3 and `develop-task` Step 8 prose** corrected to say what the gate now is

### Out of Scope

❌ **Adding or removing CI checks** — the set is what it is
❌ **The `validate` / `link-check` / branch-policy workflows** — separate jobs, separate task if wanted
❌ **Making `eval:all` faster** — a real concern, and a different task
❌ **Changing `skills-config.yaml` in consumer repos** — the default changes; an explicit override wins

---

## 5. Breaking Changes

**One, and it is a behaviour change worth naming.** A consumer that has not set `qualityGateCommand`
inherits a slower, stricter gate. That is the intent — the current default is quietly weaker than the CI
it is meant to predict — but it will make some runs longer, and the CHANGELOG must say so.

An explicit `qualityGateCommand:` in `skills-config.yaml` continues to win, so a consumer who wants the
old behaviour states it.

---

## 6. Implementation Plan

### Phase 1: One definition of green

**Risk Level**: Low

**Files**: `package.json`

**Changes**:
- [x] Add `"ci:fast": "npm run format:check && npm test"`
- [x] Add `"ci": "npm run ci:fast && npm run eval:all"`
- [x] Leave the three existing scripts in place — they are the tiers, and CI names them individually

**Dependencies**: none

---

### Phase 2: Tier the gates, so the fast loop stays fast

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-3-develop-loop.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`, `docs/reference/configuration.md`

**The fast gate is a config key, not a literal.** These two shared step docs ship verbatim into consumer
repos, which have no `ci:fast` script of their own. Hardcoding the literal would instruct every
downstream project to run a command that does not exist. Add `developNext.fastGateCommand` (default
`npm run ci:fast`) and reference it in the step docs as `<fastGateCommand>`, matching the existing
`<qualityGateCommand>` idiom. An explicit override wins, exactly as it does for the merge gate.

**Changes**:
- [x] Add `developNext.fastGateCommand`, default `npm run ci:fast` — the tier run inside the loop
- [x] **Step 3 (develop loop)**: this is a **placeholder resolution, not an edit**. The triage capture
      block already reads `<test-command>`; name `<fastGateCommand>` as what fills it. Formatting is
      cheap and its absence is what shipped the task-67 red build; `eval:all` here would be paid on
      every iteration
- [x] **Each qa-fix cycle**: this is an **addition** — the qa-loop document names no test command today.
      The seam is after fixes are applied and before the `fix(...)` commit, so a cycle cannot commit a
      red tree. A non-zero exit feeds the existing cycle machinery rather than introducing a new halt
- [x] **`develop-next` Step 3 (merge gate)**: run the full `ci`. This is the last point before merge and
      the only one that must match CI exactly
- [x] Change the `developNext.qualityGateCommand` default from `npm test` to `npm run ci`, and say in the
      config table that it is expected to be the project's full CI-equivalent

**Dependencies**: Phase 1

---

### Phase 3: Make the workflow call the tiers

**Risk Level**: Low

**Files**: `.github/workflows/test.yml`

> **Verify, do not invent.** The workflow **already** runs `npm run format:check`, `npm test` and
> `npm run eval:all` as three separately named steps — which is exactly what this phase asks for. Expect
> this phase to require **no edit**. Its value is entirely that Phase 4 then locks the arrangement so a
> future step cannot drift out of the composite. Do not manufacture a change to justify the phase.

**Changes**:
- [x] Confirm three named steps — `Formatting`, `Hermetic test suite (L1–L4)`, `End-to-end replay evals (L4)`
      — so a red build still names which tier broke
- [x] Confirm they call the same three scripts the `ci` composite calls, so there is exactly one list

**Dependencies**: Phase 1

---

### Phase 4: Hold the alignment with a contract test

**Risk Level**: Low

**Files**: `evals/shared/tests/ci-gate-parity.test.mjs` (new)

**Changes**:
- [x] Parse `.github/workflows/test.yml` for every `npm run …` / `npm test` the `test` job executes
- [x] Parse the `ci` script's composition from `package.json`
- [x] Assert the two sets are equal — a CI step the composite does not call is a gate the pipeline cannot
      see, which is precisely this task's defect
- [x] Assert `develop-next`'s **and `develop-batch`'s** documented defaults name the composite — both
      restate the same `developNext.qualityGateCommand` key, and holding one but not the other is how
      the two drift apart

**Dependencies**: Phases 1–3

---

## 7. Files Summary

### Files to Create

1. ✅ `evals/shared/tests/ci-gate-parity.test.mjs`

### Files to Modify

2. ✅ `package.json` — `ci` and `ci:fast` composites
3. ✅ `.github/workflows/test.yml` — steps call the same scripts
4. ✅ `skills/develop-next/SKILL.md` — config table default and Step 3 prose
5. ✅ `skills/develop-next/README.md` — restates "(default `npm test`)"
6. ✅ `skills/develop-batch/SKILL.md` — **carries an identical config table row**, and its per-item merge
   gate reads the same key, so it inherits the new default whether or not its table is updated
7. ✅ `skills/develop-batch/README.md` — restates "(default `npm test`)"
8. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` — `<fastGateCommand>` fills the existing
   `<test-command>` placeholder
9. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — `<fastGateCommand>` added to each qa-fix cycle
10. ✅ `docs/reference/configuration.md` — both the YAML **example block** and the reference **table row**;
    `qualityGateCommand` default + rationale, and the new `fastGateCommand`
11. ✅ `CHANGELOG.md` — the default change is observable

> **The default is restated in six places, not two.** `develop-batch` is the one that matters: it reads
> `developNext.qualityGateCommand` for its own merge gate, so leaving its table at `npm test` makes two
> sibling orchestrators document different defaults for one key. Sweep all six.

### Files Regenerated

9. ✅ `skills/*/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [x] Workflow step commands == `ci` composite members
- [x] A step added to the workflow but not the composite fails the test
- [x] `develop-next`'s documented default names the composite

**Command**: `node --test evals/shared/tests/ci-gate-parity.test.mjs`

### Behaviour Verification

- [x] `npm run ci:fast` fails on a deliberately mis-formatted file and passes once formatted — the exact
      task-67 failure, reproduced and then closed
- [x] `npm run ci` runs all three tiers

### Mutation Proving

- [x] Remove `format:check` from the composite → the parity test goes red
- [x] Remove `npm test` from the composite → the parity test goes red
- [x] Remove `eval:all` from the composite → the parity test goes red

---

## 9. Success Criteria

### Functional

- [x] `npm run ci` runs formatting, tests and evals
- [x] `npm run ci:fast` runs formatting and tests only
- [x] The develop loop and each qa-fix cycle run `ci:fast`
- [x] `develop-next`'s merge gate runs the full `ci`
- [x] `qualityGateCommand` defaults to `npm run ci`

### Regression

- [x] CI still reports three separately named steps
- [x] An explicit `qualityGateCommand` in `skills-config.yaml` still wins
- [x] No check is added or removed

### Safety

- [x] The parity test fails when the workflow and the composite diverge
- [x] The CHANGELOG records the default change as observable behaviour

---

## 10. Risk Assessment

### High Risk Areas

None. This aligns two existing command sets; it adds no check and changes no logic.

### Medium Risk Areas

**1. The merge gate gets slower**

- **Risk**: `eval:all` at `develop-next` Step 3 adds real time to every merge.
- **Probability**: Certain — that is the change.
- **Impact**: Moderate.
- **Mitigation**: it runs once per item at the merge gate, not per QA cycle; and it is the tier most
  likely to catch what the unit suite cannot. Tiering is the whole point of Phase 2.

**2. A consumer's slower gate surprises them**

- **Risk**: a consumer inheriting the new default sees longer runs.
- **Impact**: Moderate.
- **Mitigation**: CHANGELOG entry under Changed, not Added; the override is one line and is documented
  in the config table.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the merge gate becomes unacceptably slow.

**Steps**: revert `qualityGateCommand`'s default to `npm test`. The composites stay in `package.json`
and remain usable by hand; CI is unaffected either way.

**Verification**: `develop-next` Step 3 runs `npm test`; CI still runs all three steps.

### Forward Fix (< 4 hours)

Move `eval:all` out of the merge gate and into a pre-merge check run once per branch rather than once
per item, or make the eval tier incremental.

---

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-01
**Quality Score**: 100/100
**Gate Decision**: PASS (cycle 3 of 3)

### QA Report
- **Full Report**: [task.75.qa.3.quality-gate-matches-ci.md](./task.75.qa.3.quality-gate-matches-ci.md) (cycles [1](./task.75.qa.1.quality-gate-matches-ci.md), [2](./task.75.qa.2.quality-gate-matches-ci.md))
- **Gate File**: [task.75.gate.3.quality-gate-matches-ci.yml](./task.75.gate.3.quality-gate-matches-ci.yml) (cycles [1](./task.75.gate.1.quality-gate-matches-ci.yml), [2](./task.75.gate.2.quality-gate-matches-ci.yml))

### Test Coverage Summary
- **Tests Executed**: 2094 (full `npm run ci`, 0 failures)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Five findings across three cycles, **all closed and verified**:

| ID | Cycle | Severity | Finding |
| --- | --- | --- | --- |
| TASK-75-001 | 1 | medium | Fast-gate block ordered before the no-change check it should follow |
| — | 1 | low | Parity test dropped unknown workflow scripts instead of flagging them |
| TASK-75-002 | 2 | medium | Parity scan read the whole workflow file, not the `test` job it documented |
| TASK-75-003 | 2 | low | Step 0a claimed a bound (`MAX_ITER`) that never governed its inner retry |

Contract test mutation-proved **10×**, including a proof that the cycle-2 scoping fix removes a real
false failure rather than restating existing behaviour.

**Three findings are carried forward as out of scope** — none gate this task, all recorded in
`gate.3` under `recommendations.future`: the `qa-execute-snippets.mjs` symlink no-op (HIGH, fix
already exists in `select-next.mjs`); the `access-config-parity` `spawnSync` flake, which this task
promotes onto the mandatory merge path; and `develop-bug`'s per-cycle fix loop having no fast gate.

---

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**Final Gate**: [`task.75.gate.3.quality-gate-matches-ci.yml`](./task.75.gate.3.quality-gate-matches-ci.yml) — ✅ **PASS**, 100/100
**QA Cycles**: 3 · **Findings**: 5 raised, 5 closed · **Mutation proofs**: 10

All Definition of Done criteria verified:

✅ **Success Criteria** — 10/10 (5 functional, 3 regression, 2 safety), each verified mechanically
✅ **Tests** — `ci-gate-parity.test.mjs` 10/10; full `npm run ci` 2094 pass / 0 fail
✅ **CI** — ✅ SUCCESS on all 4 jobs; PR head `ccc62d9` == gated commit
✅ **Documentation** — CHANGELOG (Changed), config reference, 5 skill docs, 2 shared step docs, bundle in sync
✅ **Security** — no secrets, no new dependencies, no network calls; the change makes the gate stricter
⚠️ **Compliance** — N/A: internal build tooling, no regulated surface
✅ **NFRs** — Security / Performance / Reliability / Maintainability all PASS

**Three findings are carried forward as out of scope**, recorded in `gate.3` under
`recommendations.future`: the `qa-execute-snippets.mjs` symlink no-op (HIGH — fix already exists in
`select-next.mjs`), the `access-config-parity` flake that this task promotes onto the merge path, and
`develop-bug`'s per-cycle fix loop lacking a fast gate.

**Detailed Verification Log:** see [`task.75.dod.1.quality-gate-matches-ci.md`](./task.75.dod.1.quality-gate-matches-ci.md).

**Task marked as ACCEPTED on:** 2026-09-01

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                  | Author      |
| ---------- | ------- | ------------------------------------------------------------ | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.67 pipeline retrospective  | create-task |
| 2026-09-01 | 1.1     | Review passed (8/10) — 0 critical, 5 important. Widened the doc sweep from 2 sites to 6 (`develop-batch` reads the same key); made the fast gate a config key rather than a literal, since the step docs ship to consumers with no `ci:fast`; named Phase 2's seam in the qa-fix cycle and marked Phase 3 as verify-not-edit | review-task |
| 2026-09-01 |         | Implemented — 11 files changed, 1 new contract suite (8 tests), 7 mutation proofs. Phase 3 required no edit, as the review predicted | develop |
| 2026-09-01 |         | QA gate CONCERNS (90/100) — 1 medium, 1 low; 4/4 phases verified, full `ci` green 2092/0 | qa-task |
| 2026-09-01 |         | QA findings fixed — TASK-75-001 (fast-gate block reordered after the no-change check) + 1 low (parity test now flags unknown workflow scripts); 1 iteration | qa-fix |
| 2026-09-01 |         | QA cycle 2 (refute pass) CONCERNS (80/100) — TASK-75-002 (parity test scanned whole workflow, not the `test` job) + TASK-75-003 (step 0a claimed a bound MAX_ITER does not give it); both fixed, 10 mutation proofs | qa-fix |
| 2026-09-01 | 1.2     | DoD verified 10/10 — accepted (PR #291), final gate PASS 100/100 after 3 QA cycles | finalise |

---

## Progress Tracking

### Phase 1: One definition of green
- [x] `ci` and `ci:fast` composites

### Phase 2: Tier the gates
- [x] `ci:fast` in develop loop and qa-fix
- [x] Full `ci` at the merge gate
- [x] Config default changed and documented

### Phase 3: Workflow calls the tiers
- [x] Three named steps, one list (verify — expected to already hold)

### Phase 4: Parity test
- [x] Workflow == composite
- [x] Mutation proofs

---

## References

- **The workflow**: `.github/workflows/test.yml` — the `test` job's three steps
- **The gate**: `skills/develop-next/SKILL.md` — Configuration table, `qualityGateCommand`
- **The red build**: PR [#289](https://github.com/Gamaroff/agent-skills/pull/289), run `33442849750` — `test` → Formatting
- **The recovery commit**: `de9dc8a`
- **The DoD record that caught it**: [`task.67.dod.1.execute-the-skill-qa-gate.md`](../task.67.execute-the-skill-qa-gate/task.67.dod.1.execute-the-skill-qa-gate.md) — Step 1b

---

## Notes

### Important Reminders

- **Do not collapse CI into one opaque step.** A red build must still name the tier that broke; that is
  why Phase 3 keeps three named steps calling the same three scripts.
- **`eval:all` at the merge gate, not in the loop.** Putting it in every qa-fix cycle would make the
  correct fix feel expensive enough to be reverted.

### Why this is High priority

Cheap, small, and it removes a whole class of late failure. The gate's stated purpose is that a local
green predicts CI; today it demonstrably does not, and the first time that mattered it cost a red build
on a task that had already been accepted.
