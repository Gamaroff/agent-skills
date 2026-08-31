---
id: task.67
title: "[Task 67] Make QA execute a prose skill, not only read it"
type: task
description: "QA reviews a prose skill's text and never runs it. Task 66 shipped accepted with a glob that collected 0 files on the default macOS shell; the first live run found it in minutes. Add an execution gate to qa-task/qa-story for skills whose deliverable is runnable prose."
tags: [qa, gate, skills, shell-portability, dogfooding]
category: infrastructure
status: draft
priority: High
risk_level: medium
created: 2026-08-31
updated: 2026-08-31
assignee:
estimated_effort_hours: 8
---

# Technical Task: Make QA execute a prose skill, not only read it

**Status:** Draft

---

## 1. Overview

For a skill whose deliverable is **runnable prose** — documented shell snippets and CLI invocations an agent will copy and execute — the QA gate currently reads the prose and never runs it. Add an execution step to `qa-task` / `qa-story` that actually executes the skill's documented commands against real data before the gate can reach PASS.

**Scope**: a new QA sub-step plus the detection rule for when it applies. No change to the QA report or gate schema.

---

## 2. Motivation

### Current Problems

1. **A prose skill can pass QA twice and still be broken on the default shell.** Task 66 (`review-pr`) ran two QA cycles, a DoD pass, and 11 mutation proofs. Its Step 3 artifact-collection command used a multi-glob `ls`, which **aborts entirely under zsh** when any single glob has no match. Verified on its own task directory: **0 files under zsh, 7 under bash.** macOS defaults to zsh.
2. **The failure shape is silence.** An empty artifact list is indistinguishable from "this work item has no artifacts", so the skill would have reported a complete paper trail as absent — confidently, with no error.
3. **Contract tests grep prose; they cannot execute it.** Task 66 had 40 passing contract tests. Not one could have caught this, because they assert what the text *says*, never what it *does*.
4. **The first live run found it in minutes.** Dogfooding `/review-pr` on its own PR (#283) surfaced this and a second high-confidence defect immediately. The gap between "QA passed" and "someone ran it" was where both defects lived.
5. **The residual was declared, then deferred, then forgotten.** Task 66 named the live end-to-end run as Deferred Work before QA ran, QA passed with it outstanding, and the DoD accepted it. Every gate behaved correctly and the defect still shipped.

### Benefits

1. **Catches the class of defect contract tests structurally cannot.** Shell portability, wrong CLI flags, unbound variables, redirect handling.
2. **Closes a real, demonstrated hole** — not a hypothetical one. The evidence is `task.66.pr-review.1.review-pr.md`.
3. **Cheap where it does not apply.** A skill with no runnable snippets skips the step entirely.
4. **Makes "deferred to QA" mean something.** Right now a criterion can be deferred *to* QA and then passed *by* QA without being tested.

---

## 3. Technical Background

### Current architecture

`qa-task` Step 3b dispatches the shared diff reviewer (`code-review-prompt.md`) over the change set. That reviewer reads code. For a skill made of markdown, it reads markdown — and it did flag several shell issues in task 66, but only those visible by inspection. Nothing executes.

`qa-task` Step 4 runs the project's test suite. For a prose skill, that suite is contract tests over the prose.

### Target architecture

A new **Step 4b — Execute the documented commands**, gated on a detection rule. Where a skill's SKILL.md contains fenced `bash` blocks that are meant to be run, QA extracts them and executes the safe (read-only) ones against real repository data, under **both** `bash` and `zsh`, comparing results.

### Important clarifications

- **This is not a general "run the skill" step.** It executes the *documented snippets*, in isolation, read-only. It does not perform the skill's mutations.
- **Both shells, compared.** The task-66 defect is invisible unless you run the same block under bash and zsh and notice they disagree.
- **Not every fenced block is runnable.** Blocks containing placeholders (`{n}`, `<PLACEHOLDER>`) or mutations (`gh pr comment`, `curl -X POST`) are skipped, and the skip is recorded.

---

## 4. Scope

### In Scope

✅ **Detection rule** — when a work item's deliverable counts as "runnable prose"
✅ **New `qa-task` / `qa-story` sub-step** that extracts and executes read-only fenced `bash` blocks
✅ **Dual-shell comparison** (`bash` vs `zsh`), with disagreement reported as a finding
✅ **Skip classification** — placeholder blocks and mutating blocks recorded as skipped with a reason
✅ **Gate mapping** — an execution failure is a `category: bug` finding, eligible for `top_issues[]` under `code_review_blocking`

### Out of Scope

❌ **Executing mutations** — no `POST`, no `gh pr comment`, no writes
❌ **A general skill-runner or sandbox** — this executes snippets, not the whole skill
❌ **Shells beyond bash and zsh** — those are the two that matter for this repo's users
❌ **Retrofitting existing skills** — going-forward only; a sweep is its own task

---

## 5. Breaking Changes

None. The step is additive and skips silently for work items whose deliverable is not runnable prose. Existing gate and QA report schemas are unchanged; findings use the existing `code_review` finding shape.

---

## 6. Implementation Plan

### Phase 1: Detection rule

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Changes**:
- [ ] Define "runnable prose": the diff adds or modifies a `SKILL.md` (or a `shared/resources/*.md` prompt) containing at least one fenced ```bash block
- [ ] State the rule where both QA skills can reference it once, not twice
- [ ] Record the detection outcome in the QA report's Review Methodology section

**Dependencies**: none

---

### Phase 2: Block extraction and classification

**Risk Level**: Medium

**Files**: `shared/resources/qa-execute-snippets.mjs` (new)

**Changes**:
- [ ] Extract every fenced ```bash block from the target file, with its line number
- [ ] Classify each: `runnable` | `placeholder` (contains `{…}` or `<…>`) | `mutating` (matches a deny-list: `gh pr comment`, `gh issue`, `gh api -X`, `curl -X POST|PUT|PATCH|DELETE`, `git push`, `git commit`, `rm -rf`)
- [ ] The deny-list is the safety boundary — it must fail **closed**: anything unrecognised classifies as `mutating` and is skipped, never executed
- [ ] Emit a JSON manifest of blocks and classifications

**Dependencies**: Phase 1

---

### Phase 3: Dual-shell execution

**Risk Level**: Medium

**Files**: `shared/resources/qa-execute-snippets.mjs`

**Changes**:
- [ ] Execute each `runnable` block under `bash -c` and `zsh -c`, in a temp working copy, with a timeout
- [ ] Capture stdout, stderr and exit status for each shell
- [ ] Report a finding when: either shell exits non-zero, **or** the two shells disagree on stdout
- [ ] Substitute real values for the block's expected inputs (the caller passes a `$DOC_FILE`, `$D`, `$PR_NUMBER` binding set) — a block that cannot be bound is reclassified `placeholder`

**Dependencies**: Phase 2

---

### Phase 4: Wire into the QA skills

**Risk Level**: Low

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Changes**:
- [ ] Add **Step 4b — Execute the documented commands**, after the test suite and before success-criteria verification
- [ ] Map findings into the existing `code_review` shape (`category: bug`, `severity`, `confidence: high` for an execution failure, `medium` for a shell disagreement)
- [ ] Record every skipped block and its reason in the QA report — a silent skip would recreate the problem this task exists to solve
- [ ] Honour lite mode: run the step, but only on blocks in the changed file

**Dependencies**: Phase 3

---

### Phase 5: Prove it against the known defect

**Risk Level**: Low

**Files**: `evals/qa-task/` or `shared/resources/tests/`

**Changes**:
- [ ] Regression fixture: the pre-fix task-66 Step 3 block (multi-glob `ls`) against a directory missing one artifact kind
- [ ] Assert the step reports a shell disagreement: 0 files under zsh, 7 under bash
- [ ] Assert the post-fix `find` version reports no finding
- [ ] Assert a mutating block is skipped, not executed

**Dependencies**: Phase 4

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/qa-execute-snippets.mjs` — extraction, classification, dual-shell execution
2. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs` — unit tests including the task-66 regression fixture

### Files to Modify

3. ✅ `skills/qa-task/SKILL.md` — Step 4b
4. ✅ `skills/qa-story/SKILL.md` — Step 4b
5. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the detection rule, stated once
6. ✅ `package.json` — test glob for the new suite

---

## 8. Testing Strategy

### Unit Tests

- [ ] Block extraction finds every fenced bash block with correct line numbers
- [ ] Classification: placeholder detection, mutation deny-list, **fail-closed on unrecognised commands**
- [ ] Dual-shell runner reports disagreement when stdout differs
- [ ] Timeout terminates a hanging block without failing the run

**Command**: `node --test 'shared/resources/tests/qa-execute-snippets.test.mjs'`

### Regression Fixture (the whole point)

- [ ] The pre-fix task-66 `ls` block is reported as a shell disagreement
- [ ] The post-fix `find` block is reported clean

### Mutation Proving

- [ ] Remove the zsh arm → the disagreement finding disappears (proves both shells are load-bearing)
- [ ] Remove the fail-closed default from classification → a novel mutating command becomes executable

---

## 9. Success Criteria

### Functional

- [ ] A work item adding a SKILL.md with bash blocks triggers Step 4b
- [ ] A work item with no runnable prose skips it, and the skip is recorded
- [ ] Read-only blocks execute under both shells; results are compared
- [ ] Mutating and placeholder blocks are skipped with a recorded reason
- [ ] An execution failure produces a `category: bug` finding eligible for `top_issues[]`

### Regression

- [ ] The pre-fix task-66 Step 3 block is caught
- [ ] The post-fix version is not flagged

### Safety

- [ ] No block on the mutation deny-list ever executes
- [ ] Classification fails **closed** on anything unrecognised
- [ ] Execution happens in a temp working copy, never the live tree

---

## 10. Risk Assessment

### High Risk Areas

**1. Executing something that mutates**

- **Risk**: a snippet classified `runnable` turns out to write, post, or delete.
- **Probability**: Medium
- **Impact**: Critical — QA would cause the side effect it is meant to check for.
- **Mitigation**: deny-list fails closed; execution in a temp copy; no network credentials in the execution environment.
- **Rollback**: disable Step 4b via the detection rule.

### Medium Risk Areas

**1. Noise from blocks that legitimately differ between shells**

- **Risk**: false findings train reviewers to ignore the step.
- **Probability**: Medium
- **Impact**: Major — an ignored check is no check.
- **Mitigation**: report a disagreement only when stdout differs or a shell errors; `confidence: medium` for disagreements, `high` only for outright failure.

**2. Blocks that cannot be bound to real values**

- **Risk**: over-broad `placeholder` classification skips everything, and the step quietly does nothing.
- **Probability**: Medium
- **Impact**: Major — the exact silent-skip failure this task is about.
- **Mitigation**: the QA report states how many blocks ran vs skipped; a run where **zero** blocks executed is itself a finding.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a mutating block executes; the step produces persistent false findings.

**Steps**: revert the Step 4b sections from both QA skills; leave the script in place unused.

**Verification**: QA cycles complete without Step 4b; existing gate behaviour unchanged.

### Forward Fix (< 4 hours)

Tighten the deny-list or the disagreement heuristic; both are concentrated in one file.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — filed from the task.66 dogfood findings | create-task |

---

## Progress Tracking

### Phase 1: Detection rule
- [ ] Define and document the rule

### Phase 2: Extraction and classification
- [ ] Extract blocks
- [ ] Classify, fail-closed

### Phase 3: Dual-shell execution
- [ ] Run under bash and zsh
- [ ] Compare and report

### Phase 4: Wire into QA
- [ ] qa-task Step 4b
- [ ] qa-story Step 4b

### Phase 5: Prove it
- [ ] task-66 regression fixture
- [ ] Mutation proofs

---

## References

- **Origin**: [`task.66.pr-review.1.review-pr.md`](../task.66.review-pr/task.66.pr-review.1.review-pr.md) — CR-1, the defect that motivates this
- **The gates that passed it anyway**: [`task.66.gate.2.review-pr.yml`](../task.66.review-pr/task.66.gate.2.review-pr.yml), [`task.66.dod.1.review-pr.md`](../task.66.review-pr/task.66.dod.1.review-pr.md)
- **QA skill**: `skills/qa-task/SKILL.md` Step 3b / Step 4
- **Mutation proving**: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md)

---

## Notes

### Important Reminders

- The deny-list is a **safety boundary**, not a convenience filter. It must fail closed.
- A run where zero blocks executed is a finding, not a pass. That is the silent-skip failure this task exists to prevent, and it would be trivially easy to reintroduce here.

### Why this is High priority

The evidence is not hypothetical. A skill passed two QA cycles and a DoD gate carrying a defect that broke its core function on the default macOS shell, and the first person to actually run it found the defect immediately. Every gate behaved correctly; the hole was structural.

---

**Status:** Draft

**Next Steps**:
1. `/review-task docs/tasks/task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md`
2. `/develop-task docs/tasks/task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md`
