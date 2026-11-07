---
id: task.269
title: "finalise never hand-copies agent output"
type: task
description: "Give finalise Steps 3b.1 and 3c a transcription-free route for the security probe plan and the AC agent's YAML, and a byte check, so a model reply is never retyped into a file that decides acceptance."
tags: [finalise, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-07
estimated_effort_hours: 16
---

# Task 269: finalise never hand-copies agent output

**Status:** Ready for Review

---

## 1. Overview

Two finalise steps tell the orchestrator to save a subagent's reply with the file tool: the security `probe_plan` (Step 3b.1) and the AC agent's YAML (Step 3c). Both are hand transcriptions of model output into a file that decides acceptance, with nothing checking the copy (obs #65, #136, #142).

**Scope**: a mechanical route for each, plus a byte count or hash recorded beside the result.

---

## 2. Motivation

### Current Problems

1. **Entities in the reply.** On task.189 the plan arrived with `&lt;!-- matrix-start --&gt;` in place of `<!-- matrix-start -->`, seven times; written as returned, the fence cases would have tested a different input (obs #65). `plan-entry-html-entity` checks `argv` only, by design.
2. **Control characters.** On task.246 a 146-case plan carried U+0085, U+2028, U+2029, VT, FF, U+001F and lone CR; a hand copy can turn a hostile case into a legitimate one, and nothing downstream sees it (obs #136).
3. **A paraphrased record.** On task.248 about 150 lines of AC YAML were copied by hand and every `note` was shortened; the merge input was not the agent's answer, and nothing checks it (obs #142).

### Benefits

1. A hostile probe case is the case the agent wrote.
2. A reader can tell a copy from a paraphrase by a recorded hash.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/finalise/SKILL.md:619` Step 3b.1 item 1: "Save `SECURITY_RESULT.probe_plan` as a JSON array to `.claude/state/probe-plan.json` (Write tool — it is YAML in your context, not a shell variable)."
- `skills/finalise/SKILL.md:809` Step 3c: "Save agent 1's YAML, verbatim, to `.claude/state/finalise-ac-result-${DOD_N}.yaml` with the file-write tool", then `finalise-rerun-scope.js merge` reads it.
- The runner is `skills/finalise/references/security-probe.mjs` (`:661` passes `--record` and `--cases-base`); cases land at `$DOC_DIR/$STEM.dod.$DOD_N.security.cases[.<i>].json` (`:719`).
- `security-probe-plan.mjs` documents that "a case's `input` may carry an entity on purpose" `(unverified: file not opened here; quoted by obs #65)`.
- The AC agent is a read-only Explore subagent (obs #142), so it cannot write the file itself.

### Target Architecture

- **Probe plan**: the security agent may name an existing committed cases file per entry (`cases_file:`) instead of inline `cases`; the runner copies it into the run's numbered cases file (obs #136 option a). When the prior run's plan hashes identical to its committed cases files and the engine paths are unchanged since the prior record's head, Step 3b.1 reuses it and says so (option b).
- **AC YAML**: the AC prompt ends with a fenced block the orchestrator extracts by one command, with no retyping; the byte count and SHA-256 of the extracted block are recorded in the AC record (obs #142).
- A plan or AC block that carries HTML entities where the source file has literal characters is refused by the step that writes it (obs #65).

### Important Clarifications

- This is engine work: a script, a schema field and tests. It is why the estimate is 16h.
- It must not weaken the existing `plan-entry-html-entity` rule, which is deliberately `argv`-only.
- A subagent's reply reaches the orchestrator as context, not as a file; "extract by one command" needs an output file the host provides `(unverified: the plan decides how, by reading the Agent tool's output-file behaviour)`.
- **A hash over retyped text proves only that the text is self-consistent.** If Phase 1 finds no output file, the orchestrator must still hand the block to the extractor by retyping it, and a hash computed over that copy cannot show the copy matches the agent's answer. In that case the AC route keeps the recorded hash as a tamper check between extract and merge (the file the merge reads is the file the extractor wrote), says plainly that it is not a transcription check, and the task narrows to the probe route per the Medium risk below. Do not describe the hash as a transcription check in the DoD or the QA report unless a file route exists.
- **`cases_file:` removes transcription only where a committed cases file already exists** (a re-run, or the reuse path). The read-only security agent cannot create a file, so a first-run plan's inline `cases` still reaches the orchestrator as reply text. The entity refusal is what covers that gap, and only for the four entities; control-character loss on a first run is not closed by this task and is not claimed to be.
- **Source files, not generated copies.** `skills/finalise/references/security-probe.mjs` and `finalise-rerun-scope.js` are bundled copies (`AUTO-GENERATED — DO NOT EDIT`). The sources are `shared/resources/security-probe.mjs`, `shared/resources/security-probe-plan.mjs` (where entries are read, the entity refusal sits at `:256` and the numbered cases file is written at `:289`) and `shared/resources/finalise-rerun-scope.js`. `skills/finalise/SKILL.md` is a source.

---

## 4. Scope

### In Scope

✅ **The runner** accepts `cases_file:` per entry.
✅ **The extractor** for the AC block, with a recorded hash.
✅ **The entity refusal** at the write step.
✅ **Tests** for each, with a control.

### Out of Scope

❌ **Changing what the agents analyse.**
❌ **Retrofitting** past DoD records.
❌ **The `security-probe` uniform-failure rule** (task 256, merged).

---

## 5. Breaking Changes

None - `cases_file:` is an optional field; inline `cases` keeps working.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.269.plan.finalise-never-hand-copies-agent-output.md](task.269.plan.finalise-never-hand-copies-agent-output.md)

### Phase 1: Measure how the reply reaches the orchestrator

**Risk Level**: Low

**Changes**:
- [x] Establish whether a subagent's reply is available as a file; record the finding in the plan before designing the extractor.

**Dependencies**: none.

---

### Phase 2: Probe plan route

**Risk Level**: High

**Files**:
- `shared/resources/security-probe-plan.mjs` (entry reader, entity refusal, numbered cases file) and `shared/resources/security-probe.mjs`
- `shared/resources/finalise-dod-security-prompt.md`
- `skills/finalise/SKILL.md` Step 3b.1

**Changes**:
- [x] `cases_file:` per entry, copied into the numbered cases file byte for byte.
- [x] Reuse path with hash check (obs #136 option b).
- [x] Entity check at the write step (obs #65).

**Dependencies**: Phase 1.

---

### Phase 3: AC YAML route

**Risk Level**: Medium

**Files**:
- `shared/resources/finalise-dod-ac-prompt.md`
- `shared/resources/finalise-rerun-scope.js`
- `skills/finalise/SKILL.md` Step 3c

**Changes**:
- [x] Fenced end block, one-command extract, byte count and SHA-256 recorded in the AC record.

**Dependencies**: Phase 1.

---

### Phase 4: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] Removed-literal sweep: the sentences Steps 3b.1 and 3c lose ("Save `SECURITY_RESULT.probe_plan` as a JSON array", "Save agent 1's YAML, verbatim") are pinned by tests found by `git grep -n 'probe-plan.json\|finalise-ac-result-' -- '*.test.*'`; known hits: `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `shared/resources/tests/read-only-agent-writes.test.mjs`, `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`, `shared/resources/tests/security-input-corpus.test.mjs`. Update each to the new wording; re-run the grep before editing.
- [x] Tests with mutation proofs (§ 8).
- [x] `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 2 and 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe-plan.mjs`, `shared/resources/security-probe.mjs` - `cases_file:`, reuse path, entity refusal
2. ✅ `shared/resources/finalise-rerun-scope.js` - extract and hash
3. ✅ `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/finalise-dod-ac-prompt.md` - output shape
4. ✅ `skills/finalise/SKILL.md` - Steps 3b.1 and 3c

### Files to Modify (Tests)

5. ✅ new tests beside `shared/resources/tests/finalise-rerun-scope.test.mjs` and `shared/resources/tests/security-probe.test.mjs`; existing pins updated (see Phase 4)

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the new routes.

**Actions**:
- [x] A plan entry with `cases_file:` yields a numbered cases file byte-identical to the source, including U+0085, U+2028, U+2029, VT, FF, U+001F and lone CR.
- [x] An entity-bearing inline case is refused when the same plan has no literal `<`. **Control**: an entity carried on purpose in an `input` whose source file also has it is accepted.
- [x] The extracted AC block hashes to the recorded value; a one-byte change fails the check.
- [x] Mutation proofs: remove the byte copy, the hash check and the entity refusal; each turns exactly one named test red.

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [x] A plan using `cases_file:` produces a cases file byte-identical to its source for the seven control characters, shown by the new test (name recorded in the QA report).
- [x] The AC record carries the byte count and SHA-256 of the extracted block; a modified block is refused.
- [x] An escaped plan is refused at the write step; the control case is accepted.
- [x] The reuse path: a prior plan whose hash matches its committed cases files, with engine paths unchanged since the prior record's head, is reused and the DoD says "plan reused from dod.{N-1}"; a one-byte change to a cases file, or a changed engine path, makes it re-plan. Shown by a new test (name recorded in the QA report).
- [x] `cases_file:` outside the work-item directory, or a symlink, is refused; shown by a new test.

### Performance

- [x] No new test case takes over one second: `CI=true command node --test --test-reporter=spec` on the new test files, five runs, slowest case per run with `/proc/loadavg` beside each, recorded in the QA report on the PR head commit. (A whole-suite wall-clock bound against `develop` was dropped: task 285 showed it cannot be held per PR and had to be amended at 5c.)

### Code Quality

- [x] Each new refusal has a mutation proof recorded in the QA report.
- [x] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [x] `python skills/create-skill/scripts/quick_validate.py skills/finalise` passes.

### Migration

- [x] Inline `cases` plans still run (an existing fixture passes unchanged).

---

## 10. Risk Assessment

### High Risk Areas

**1. The probe runner's plan schema changes**
- **Risk**: a new field breaks the plan reader or the refute pass.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the field is optional and additive; the reader's existing fixtures are run unchanged.
- **Rollback**: revert the runner change.

### Medium Risk Areas

**1. No file for the subagent reply**
- **Risk**: Phase 1 finds there is none and the extractor design fails.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: Phase 1 runs first; if no route exists, the task narrows to the probe route and re-files the AC half.
- **Rollback**: n/a.

### Low Risk Areas

**1. Hash recorded but never read**
- **Risk**: the hash is decoration.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the merge step re-hashes and refuses on mismatch.
- **Rollback**: forward fix.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- finalise HALTs on a plan that ran before the change
- the probe suite is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: only the AC half misbehaves.

**Steps**:
1. Revert Phase 3's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording or a refusal's message.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- finalise cannot complete a run that completed before

**Non-Critical (Forward Fix)**:
- a message or note format

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-07
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.269.qa.2.finalise-never-hand-copies-agent-output.md](./task.269.qa.2.finalise-never-hand-copies-agent-output.md)
- **Gate File**: [task.269.gate.2.finalise-never-hand-copies-agent-output.yml](./task.269.gate.2.finalise-never-hand-copies-agent-output.yml)

### Test Coverage Summary
- **Tests Executed**: 22 (new or changed), 7999 in the fast gate
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
All five cycle-1 findings are fixed and held by tests that go red when the fix is reverted. One MEDIUM remains: no CHANGELOG entry cites task 269 (T269-QA-6).

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #65, #136, #142    | create-task |
| 2026-11-07 | 1.1     | Review passed (8/10) — edit sources not bundled copies, hash-over-retyped-text and first-run limits stated, wall-clock criterion replaced, reuse/path criteria added, removed-literal sweep listed | review-task |
| 2026-11-07 |         | Status → ready-for-development                           | review-task |
| 2026-11-07 |         | Implemented — 15 files, 14 tests                         | develop     |
| 2026-11-07 |         | QA gate FAIL (70/100) — 5 findings                       | qa-task     |
| 2026-11-07 |         | QA findings fixed — T269-QA-1 to -5, 4 new tests, 5 mutation proofs, iteration 1 | qa-fix      |
| 2026-11-07 |         | QA gate CONCERNS (90/100) — 1 finding                    | qa-task     |
| 2026-11-07 |         | QA findings fixed — T269-QA-6 plus two advisory notes, iteration 2 | qa-fix      |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Measure how the reply reaches the orchestrator
- [x] Finding recorded

### Phase 2: Probe plan route
- [x] `cases_file:`, reuse path, entity refusal

### Phase 3: AC YAML route
- [x] Extract and hash

### Phase 4: Evidence, bundle and sweep
- [x] Tests, mutation proofs, bundle clean

---

## References

- Observation #65 — Step 3b.1 writes a probe plan that may arrive HTML-escaped from the agent notification
- Observation #136 — finalise Step 3b.1 makes the orchestrator hand-transcribe large probe plans with control characters
- Observation #142 — finalise Step 3c relies on hand-copying the AC agent's YAML verbatim

---

## Notes

### Important Reminders

Task 270 and task 271 also edit finalise; they touch different steps, so the three can land in any order, but each re-bundles.

### Future Improvements

If Phase 1 finds no file route, file the AC half as its own task.

---

**Status:** Ready for Review
