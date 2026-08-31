---
id: task.67
title: "[Task 67] Make QA execute a prose skill, not only read it"
type: task
description: "QA reviews a prose skill's text and never runs it. Task 66 shipped accepted with a glob that collected 0 files on the default macOS shell; the first live run found it in minutes. Add an execution gate to qa-task/qa-story for skills whose deliverable is runnable prose."
tags: [qa, gate, skills, shell-portability, dogfooding]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-08-31
updated: 2026-08-31
assignee:
estimated_effort_hours: 8
---

# Technical Task: Make QA execute a prose skill, not only read it

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.67.review.1.execute-the-skill-qa-gate.md` implemented 2026-08-31

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

**Files**: `shared/resources/qa-runnable-prose-detection.md` (new), `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Changes**:
- [x] Define "runnable prose": the diff adds or modifies a `SKILL.md` (or a `shared/resources/*.md` prompt) containing at least one fenced ```bash block
- [x] State the rule **once**, in the new QA-owned shared resource `shared/resources/qa-runnable-prose-detection.md`, and reference it from both QA skills as `shared/resources/qa-runnable-prose-detection.md`
- [x] Cross-reference that file from `shared/resources/develop-pipeline-step-5-6-qa-loop.md` so the orchestrator's step doc points at the rule rather than restating it
- [x] Record the detection outcome in the QA report's Review Methodology section

> **Why not put the rule in `develop-pipeline-step-5-6-qa-loop.md` itself.** That doc is the
> *orchestrator's* step 5–6 protocol and is bundled into `develop-story` / `develop-task` only — it is
> **not** in `skills/qa-task/references/` or `skills/qa-story/references/`. A rule the QA skills execute
> has to live in a file those skills reference, or "state it once" silently becomes "state it nowhere
> either skill can read".

**Dependencies**: none

---

### Phase 2: Block extraction and classification

**Risk Level**: Medium

**Files**: `shared/resources/qa-execute-snippets.mjs` (new)

**Changes**:
- [x] Extract every fenced ```bash block from the target file, with its line number
- [x] Classify each: `runnable` | `placeholder` (contains `{…}` or `<…>`) | `mutating` (matches a deny-list: `gh pr comment`, `gh issue`, `gh api -X`, `curl -X POST|PUT|PATCH|DELETE`, `git push`, `git commit`, `rm -rf`)
- [x] The deny-list is the safety boundary — it must fail **closed**: anything unrecognised classifies as `mutating` and is skipped, never executed
- [x] Emit a JSON manifest of blocks and classifications

**Dependencies**: Phase 1

---

### Phase 3: Dual-shell execution

**Risk Level**: Medium

**Files**: `shared/resources/qa-execute-snippets.mjs`

**Changes**:
- [x] Execute each `runnable` block under `bash -c` and `zsh -c`, in a temp working copy, with a timeout
- [x] Capture stdout, stderr and exit status for each shell
- [x] Report a finding when: either shell exits non-zero, **or** the two shells disagree on stdout
- [x] Substitute real values for the block's expected inputs (the caller passes a `$DOC_FILE`, `$D`, `$PR_NUMBER` binding set) — a block that cannot be bound is reclassified `placeholder`
- [x] **Guard the zsh arm on zsh being installed** (`command -v zsh`). When zsh is absent, run the bash arm only, record `zsh-unavailable` as the reason, and report it as information — **not** as the zero-blocks-executed finding. CI runs `ubuntu-latest`, where zsh is not guaranteed; without this guard the "zero executed is a finding" rule turns a missing interpreter into a hard QA failure. Follow the existing precedent in `shared/resources/tracker-access.test.sh` §12, which guards its zsh-parity block the same way

**Dependencies**: Phase 2

---

### Phase 4: Wire into the QA skills

**Risk Level**: Low

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Changes**:
- [x] `skills/qa-task/SKILL.md`: add **`### Step 4b — Execute the documented commands`**, between `Step 4: Run Tests` and `Step 5: Verify Success Criteria`
- [x] `skills/qa-story/SKILL.md`: add the same content as **`#### Phase 1.7 — Execute the documented commands`**, immediately after `#### Phase 1.6: Diff Code Review`. `qa-story`'s Review Workflow is phase-numbered and has **no** `Step 4` and no test-suite step, so "Step 4b" has no insertion point there — follow that file's own convention
- [x] Map findings into the existing `code_review` shape (`category: bug`, `severity`, `confidence: high` for an execution failure, `medium` for a shell disagreement)
- [x] Record every skipped block and its reason in the QA report — a silent skip would recreate the problem this task exists to solve
- [x] Honour lite mode: run the step, but only on blocks in the changed file
- [x] Run `npm run bundle` and commit the regenerated `skills/*/references/*` copies — CI fails the PR otherwise (see the bundle note below)

**Dependencies**: Phase 3

> **The bundle step is not optional.** `.github/workflows/validate.yml` runs a **Bundle freshness check**
> that re-runs `bundle_skill.py --all` and fails when `git diff --quiet -- 'skills/*/references/*'` is
> dirty. This task adds one new `shared/resources/` file and edits another, both referenced from skills,
> so the bundled copies change. Skipping `npm run bundle` produces a red build, not a silent drift.

---

### Phase 5: Prove it against the known defect

**Risk Level**: Low

**Files**: `shared/resources/tests/qa-execute-snippets.test.mjs`

> Pinned deliberately. `evals/qa-task/` does **not** exist — standing one up would also need a
> `package.json` `eval:*` script and runner wiring, which is out of scope here. §7 already names the
> `shared/resources/tests/` path; this is the same file.

**Changes**:
- [x] Regression fixture: the pre-fix task-66 Step 3 block (multi-glob `ls`) against a directory missing one artifact kind
- [x] Assert the step reports a shell disagreement: 0 files under zsh, 7 under bash
- [x] Assert the post-fix `find` version reports no finding
- [x] Assert a mutating block is skipped, not executed

**Dependencies**: Phase 4

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/qa-execute-snippets.mjs` — extraction, classification, dual-shell execution
2. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs` — unit tests including the task-66 regression fixture
3. ✅ `shared/resources/qa-runnable-prose-detection.md` — the detection rule, stated once, in a file both QA skills reference

### Files to Modify

4. ✅ `skills/qa-task/SKILL.md` — new `### Step 4b`, between Step 4 and Step 5
5. ✅ `skills/qa-story/SKILL.md` — same content as `#### Phase 1.7`, after Phase 1.6 (that file is phase-numbered; it has no Step 4)
6. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — cross-reference to the detection rule (not a restatement)

### Files Regenerated (commit them — CI checks freshness)

7. ✅ `skills/{qa-task,qa-story,develop-task,develop-story}/references/*` — output of `npm run bundle`; never hand-edited.
   `develop-task` / `develop-story` are included **transitively**: they bundle
   `develop-pipeline-step-5-6-qa-loop.md`, which now cross-references the detection rule, so the rule
   and the engine follow it into those two skills as well.

### Explicitly NOT modified

- ❌ `package.json` — **no change needed.** The `test` script already globs
  `'shared/resources/tests/*.test.mjs'`, which picks the new suite up automatically. The constraint this
  places on the implementation is that the test file **must** land under `shared/resources/tests/` with a
  `.test.mjs` suffix; put it anywhere else and it runs nowhere, silently.

---

## 8. Testing Strategy

### Unit Tests

- [x] Block extraction finds every fenced bash block with correct line numbers
- [x] Classification: placeholder detection, mutation deny-list, **fail-closed on unrecognised commands**
- [x] Dual-shell runner reports disagreement when stdout differs
- [x] Timeout terminates a hanging block without failing the run

**Command**: `node --test 'shared/resources/tests/qa-execute-snippets.test.mjs'`

### Regression Fixture (the whole point)

- [x] The pre-fix task-66 `ls` block is reported as a shell disagreement
- [x] The post-fix `find` block is reported clean

### Mutation Proving

- [x] Remove the zsh arm → the disagreement finding disappears (proves both shells are load-bearing)
- [x] Remove the fail-closed default from classification → a novel mutating command becomes executable

---

## 9. Success Criteria

### Functional

- [x] A work item adding a SKILL.md with bash blocks triggers Step 4b
- [x] A work item with no runnable prose skips it, and the skip is recorded
- [x] Read-only blocks execute under both shells; results are compared
- [x] Mutating and placeholder blocks are skipped with a recorded reason
- [x] An execution failure produces a `category: bug` finding eligible for `top_issues[]`

### Regression

- [x] The pre-fix task-66 Step 3 block is caught
- [x] The post-fix version is not flagged

### Safety

- [x] No block on the mutation deny-list ever executes
- [x] Classification fails **closed** on anything unrecognised
- [x] Execution happens in a temp working copy, never the live tree
- [x] A host without `zsh` runs the bash arm only and records `zsh-unavailable` — it does **not** trip the zero-blocks-executed finding

### Repository integration

- [x] `npm run bundle` has been run and the regenerated `skills/*/references/*` copies are committed — `validate.yml`'s Bundle freshness check passes
- [x] The new test suite sits at `shared/resources/tests/qa-execute-snippets.test.mjs` so the existing `npm test` glob collects it; `npm test` shows the new cases running

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
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, no placeholders, links resolve, effort rubric checked; status → ready-for-development | review-task |
| 2026-08-31 | 1.2     | Review (8/10, READY TO IMPLEMENT) — added the missing `npm run bundle` step and regenerated-files list (CI Bundle freshness check would have failed); moved the detection rule to a new QA-owned `shared/resources/qa-runnable-prose-detection.md` because the step-5-6 doc is not bundled into either QA skill; pinned per-skill placement (qa-task Step 4b, qa-story Phase 1.7 — qa-story is phase-numbered); added a `command -v zsh` guard so a zsh-less CI host does not trip the zero-blocks-executed finding; pinned Phase 5 to `shared/resources/tests/`; dropped the redundant `package.json` edit; added dual-shell prior art to References | review-task |
| 2026-08-31 |  | Implemented — 3 files created, 4 modified, 8 regenerated; 41 tests, 9 mutation proofs; 5 engine defects found by dogfooding on real skill files and fixed | develop |
| 2026-08-31 |  | QA gate FAIL (0/100) — 18 findings; classifier fails open 13 verified ways, temp-copy containment disproven | qa-task |
| 2026-08-31 |  | QA findings fixed — 13 fail-open holes closed, sandbox sentinel added as defence in depth, 61 tests, 16 mutation proofs; 1 cycle | qa-fix |
| 2026-08-31 |  | QA gate PASS (90/100) — all findings closed and independently re-verified; 0 blocking issues | qa-task |

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-31
**Quality Score**: 90/100
**Gate Decision**: PASS (cycle 2; cycle 1 was FAIL)

### QA Reports
- **Latest**: [task.67.qa.2.execute-the-skill-qa-gate.md](./task.67.qa.2.execute-the-skill-qa-gate.md) · [gate.2 — PASS](./task.67.gate.2.execute-the-skill-qa-gate.yml)
- **Cycle 1**: [task.67.qa.1.execute-the-skill-qa-gate.md](./task.67.qa.1.execute-the-skill-qa-gate.md) · [gate.1 — FAIL](./task.67.gate.1.execute-the-skill-qa-gate.yml)
- **Bugs**: [BUG-1 — classifier fails open](./task.67.bug.1.classifier-fails-open.md) · [BUG-2 — extraction and coverage gaps](./task.67.bug.2.extraction-and-coverage-gaps.md)

### Test Coverage Summary
- **Tests Executed**: 2060 (0 failures, 1 skipped) — module suite grew 41 → 61
- **Phases Verified**: 5/5, all PASS
- **Outstanding Issues**: 0 blocking (6 LOW/MEDIUM deferred with rationale)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS
- **QA Cycles**: 2

### Key Findings

**Cycle 2 (PASS).** All fourteen previously fail-open inputs now classify `mutating`, and the
containment canary that escaped in cycle 1 no longer does — both re-verified independently, not taken
on trust. No over-strictness: six representative legitimate patterns still execute. QA re-ran four
mutation proofs against the shipped code; all held.

**Cycle 1 (FAIL) — kept for the record.** The safety boundary failed open in **thirteen independently
verified ways** — an allow-listed command
plus a redirect, a `#` inside quotes, a here-string, an unparseable command position, `env`/`command`/
`time`, `awk`'s program text, `find -delete`/`-exec`, and process substitution all classify `runnable`
and execute. Containment to the temp working copy was **disproven** with a canary written outside it.

Three Safety success criteria are unmet. The full suite is green throughout — the same "a passing test
is not evidence" failure this task exists to eliminate, reproduced inside the fix.

Step 4b itself works: it fired on this change set, recorded every skip with a reason, and with
`--bind` supplied executed 5 real blocks under both shells with no findings.

---

## Progress Tracking

### Phase 1: Detection rule
- [x] Define and document the rule — `shared/resources/qa-runnable-prose-detection.md`

### Phase 2: Extraction and classification
- [x] Extract blocks
- [x] Classify, fail-closed

### Phase 3: Dual-shell execution
- [x] Run under bash and zsh
- [x] Compare and report

### Phase 4: Wire into QA
- [x] qa-task `### Step 4b` (between Step 4 and Step 5)
- [x] qa-story `#### Phase 1.7` (after Phase 1.6)
- [x] `npm run bundle` + commit regenerated references

### Phase 5: Prove it
- [x] task-66 regression fixture
- [x] Mutation proofs — 7 run, all held

---

## References

- **Origin**: [`task.66.pr-review.1.review-pr.md`](../task.66.review-pr/task.66.pr-review.1.review-pr.md) — CR-1, the defect that motivates this
- **The gates that passed it anyway**: [`task.66.gate.2.review-pr.yml`](../task.66.review-pr/task.66.gate.2.review-pr.yml), [`task.66.dod.1.review-pr.md`](../task.66.review-pr/task.66.dod.1.review-pr.md)
- **QA skill**: `skills/qa-task/SKILL.md` Step 3b / Step 4
- **Mutation proving**: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md)
- **Prior art — dual-shell parity**: [`tracker-access.test.sh`](../../../shared/resources/tracker-access.test.sh) §12 already re-runs fixtures under `zsh -c` and asserts parity with the `bash -c` runs, guarded on `command -v zsh`. Reuse the pattern; Phase 3 generalises it from one hand-written suite to any documented block
- **Prior art — the rule, enforced only by reading**: [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md) documents the zsh-portability rules (no `${!var}`, no unquoted `$LIST` word-splitting) as review guidance an agent reads. Step 4b is what makes that guidance executable
- **CI gate this task must satisfy**: `.github/workflows/validate.yml` — "Bundle freshness check"

---

## Notes

### Important Reminders

- The deny-list is a **safety boundary**, not a convenience filter. It must fail closed.
- A run where zero blocks executed is a finding, not a pass. That is the silent-skip failure this task exists to prevent, and it would be trivially easy to reintroduce here.

### Found by dogfooding the engine on a real skill during implementation

Running the finished engine against `skills/review-pr/SKILL.md` — the skill whose defect motivated this
task — surfaced three defects in the engine itself that the unit tests had not. All three are fixed and
carry their own regression tests plus mutation proofs.

1. **`git` was resolved fail-open.** The safe-subcommand check matched the *first* `git …` in a block
   and applied that verdict to every later one, so `git rev-parse HEAD` followed by `git checkout -b x`
   classified as **runnable**. The safety boundary had a hole in exactly the direction it exists to
   prevent. Now every invocation is resolved individually.
2. **`case` arm patterns were read as commands.** `*://*/pull/*)` and friends were reported as
   unrecognised commands, so read-only blocks were skipped as mutating.
3. **Command substitutions were swallowed.** `P=$(git remote get-url origin)` was skipped as an
   assignment and then `remote` was read as the command word, hiding the real invocation.
4. **Arithmetic expansion was read as a command.** `M=$((N + 1))` reported `N` as an unrecognised
   command. Found by running the engine on `qa-story/SKILL.md` — one of the files this task edits.
5. **Backslash line-continuations started a new command.** `git log … -- \` followed by
   `  apps packages` reported `apps` as an unrecognised command. Found the same way, on
   `qa-task/SKILL.md`.

Defects 1–5 each carry a regression test and a mutation proof. Nine mutation proofs run in total; all
nine turn the intended test red.

Before the fixes, the engine classified **0 of 12** blocks in `review-pr/SKILL.md` as runnable — the
over-broad-classification risk named in §10, live. The `zero-blocks-executed` finding fired correctly,
which is the safeguard working; but the underlying cause was the tokenizer, not the file.

### Decision recorded — `zero-blocks-executed` is `confidence: medium`

§6 Phase 3 fixes the confidence of the two *execution* findings (`high` for a failure, `medium` for a
disagreement) but says nothing about the confidence of the zero-executed finding in §9/§10. It is
implemented as **`medium`**, and the reasoning is worth keeping:

`confidence: high` on a `category: bug` finding is what makes it eligible for `top_issues[]` and
therefore gate-blocking. Zero-executed is a statement about **coverage** — this gate did nothing here —
not a defect in the work item. Measured during implementation: `qa-task` and `qa-story` both classify
**0 runnable** without bindings, because their snippets read caller variables like `$TASK_FILE`. At
`high`, this step would have blocked the very pull request that introduced it, for the offence of
documenting snippets that take arguments.

It is still reported, which is what §9's "a run where zero blocks executed is itself a finding" asks
for, and the detail now names the placeholder count and tells the reader to supply `--bind`.

### QA cycle 1 — thirteen fail-open holes, found and closed

QA gate 1 returned **FAIL (0/100)**: the classifier reached `runnable` on thirteen verified inputs, and
containment to the temp working copy was disproven with a canary written outside it. Three Safety
criteria were unmet. The suite was green throughout — the same "a passing test is not evidence" failure
this task exists to eliminate, reproduced inside the fix.

All thirteen are closed, plus three MEDIUM and four LOW. See
[BUG-1](./task.67.bug.1.classifier-fails-open.md) and
[BUG-2](./task.67.bug.2.extraction-and-coverage-gaps.md).

**The structural lesson, which is the part worth keeping.** The original nine mutation proofs all held,
and none of them touched these paths — a mutation proof can only falsify a check that exists. The
answer was not more proofs of the same shape but a **second, independent line**: each block now runs in
`work/` inside a private temp root, and the runner compares that root before and after, reporting any
write outside the copy as `escaped-sandbox` without consulting the classifier at all.

Two things found by the adversarial pass over the fixes rather than by the findings:

- The sentinel first derived its own boundary as `cwd/..`. Since `runBlock` accepts any `cwd`, a bare
  temp directory made it walk the whole of `/tmp` twice per block — it hung the suite for two minutes
  before being killed. The sandbox root is now passed explicitly. **A safety net that guesses its own
  boundary is not a safety net.**
- The first `WRITE_REDIRECT` pattern matched `2>&1`, making this repository's own documented zsh guard
  (`command -v zsh >/dev/null 2>&1`) unrunnable by the gate that recommends it.

One finding was **partly wrong and is corrected in BUG-2** rather than quietly accepted: L3 claimed an
invalid `--timeout` silently disables hang protection. Measured, `spawnSync` throws `ERR_OUT_OF_RANGE`
on NaN and on a negative value. The real hole is `--timeout 0`, which is accepted and means *no
timeout*. The mutation proof coming back UNHELD is what surfaced it.

### Open question for review — noise on a consistently-failing block

With `DOC_FILE` bound, `review-pr` Step 3 executes under both shells, agrees on stdout, and still
reports `execution-failure` at `confidence: high` because its trailing `grep -v` exits 1 when nothing
matches. Per §6 Phase 3 that is correct — "either shell exits non-zero" — and it has been implemented as
specified rather than quietly redesigned.

It is worth a decision, though, because `confidence: high` is what makes a `category: bug` finding
gate-blocking: a documented snippet ending in `grep` would block a PR. The finding detail now says
`identical in every shell — not a portability defect` so a reviewer can triage it in one read, but the
confidence rule itself is unchanged and belongs to whoever owns this gate.

### Why this is High priority

The evidence is not hypothetical. A skill passed two QA cycles and a DoD gate carrying a defect that broke its core function on the default macOS shell, and the first person to actually run it found the defect immediately. Every gate behaved correctly; the hole was structural.

---

**Status:** Ready for Development

**Next Steps**:
1. `/review-task docs/tasks/task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md`
2. `/develop-task docs/tasks/task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md`
