---
id: task.75
title: "[Task 75] Make the pipeline quality gate run what CI runs"
type: task
description: "CI's test job runs format:check, npm test and eval:all. The pipeline's quality gate runs npm test alone, so two of the three never execute locally. On task 67 that shipped a red build and cost a recovery commit; eval:all was never run locally at any step. Give both a single source."
tags: [ci, quality-gate, develop-next, pipeline, tooling]
category: infrastructure
status: ready-for-development
priority: High
risk_level: low
created: 2026-09-01
updated: 2026-09-01
assignee:
estimated_effort_hours: 4
---

# Technical Task: Make the pipeline quality gate run what CI runs

**Status:** Ready for Development

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
- [ ] Add `"ci:fast": "npm run format:check && npm test"`
- [ ] Add `"ci": "npm run ci:fast && npm run eval:all"`
- [ ] Leave the three existing scripts in place — they are the tiers, and CI names them individually

**Dependencies**: none

---

### Phase 2: Tier the gates, so the fast loop stays fast

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-3-develop-loop.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-next/SKILL.md`

**Changes**:
- [ ] **Step 3 (develop loop)** and **each qa-fix cycle**: run `ci:fast`. Formatting is cheap and its
      absence is what shipped the task-67 red build; `eval:all` here would be paid on every iteration
- [ ] **`develop-next` Step 3 (merge gate)**: run the full `ci`. This is the last point before merge and
      the only one that must match CI exactly
- [ ] Change the `developNext.qualityGateCommand` default from `npm test` to `npm run ci`, and say in the
      config table that it is expected to be the project's full CI-equivalent

**Dependencies**: Phase 1

---

### Phase 3: Make the workflow call the tiers

**Risk Level**: Low

**Files**: `.github/workflows/test.yml`

**Changes**:
- [ ] Keep three named steps — `Formatting`, `Hermetic test suite (L1–L4)`, `End-to-end replay evals (L4)`
      — so a red build still names which tier broke
- [ ] Point them at the same three scripts the `ci` composite calls, so there is exactly one list

**Dependencies**: Phase 1

---

### Phase 4: Hold the alignment with a contract test

**Risk Level**: Low

**Files**: `evals/shared/tests/ci-gate-parity.test.mjs` (new)

**Changes**:
- [ ] Parse `.github/workflows/test.yml` for every `npm run …` / `npm test` the `test` job executes
- [ ] Parse the `ci` script's composition from `package.json`
- [ ] Assert the two sets are equal — a CI step the composite does not call is a gate the pipeline cannot
      see, which is precisely this task's defect
- [ ] Assert `develop-next`'s documented default names the composite

**Dependencies**: Phases 1–3

---

## 7. Files Summary

### Files to Create

1. ✅ `evals/shared/tests/ci-gate-parity.test.mjs`

### Files to Modify

2. ✅ `package.json` — `ci` and `ci:fast` composites
3. ✅ `.github/workflows/test.yml` — steps call the same scripts
4. ✅ `skills/develop-next/SKILL.md` — config table default and Step 3 prose
5. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` — `ci:fast` in the develop loop
6. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — `ci:fast` per qa-fix cycle
7. ✅ `docs/reference/configuration.md` — `qualityGateCommand` default and rationale
8. ✅ `CHANGELOG.md` — the default change is observable

### Files Regenerated

9. ✅ `skills/*/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [ ] Workflow step commands == `ci` composite members
- [ ] A step added to the workflow but not the composite fails the test
- [ ] `develop-next`'s documented default names the composite

**Command**: `node --test evals/shared/tests/ci-gate-parity.test.mjs`

### Behaviour Verification

- [ ] `npm run ci:fast` fails on a deliberately mis-formatted file and passes once formatted — the exact
      task-67 failure, reproduced and then closed
- [ ] `npm run ci` runs all three tiers

### Mutation Proving

- [ ] Remove `format:check` from the composite → the parity test goes red
- [ ] Remove `eval:all` from the composite → the parity test goes red

---

## 9. Success Criteria

### Functional

- [ ] `npm run ci` runs formatting, tests and evals
- [ ] `npm run ci:fast` runs formatting and tests only
- [ ] The develop loop and each qa-fix cycle run `ci:fast`
- [ ] `develop-next`'s merge gate runs the full `ci`
- [ ] `qualityGateCommand` defaults to `npm run ci`

### Regression

- [ ] CI still reports three separately named steps
- [ ] An explicit `qualityGateCommand` in `skills-config.yaml` still wins
- [ ] No check is added or removed

### Safety

- [ ] The parity test fails when the workflow and the composite diverge
- [ ] The CHANGELOG records the default change as observable behaviour

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

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                  | Author      |
| ---------- | ------- | ------------------------------------------------------------ | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.67 pipeline retrospective  | create-task |

---

## Progress Tracking

### Phase 1: One definition of green
- [ ] `ci` and `ci:fast` composites

### Phase 2: Tier the gates
- [ ] `ci:fast` in develop loop and qa-fix
- [ ] Full `ci` at the merge gate
- [ ] Config default changed and documented

### Phase 3: Workflow calls the tiers
- [ ] Three named steps, one list

### Phase 4: Parity test
- [ ] Workflow == composite
- [ ] Mutation proofs

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
