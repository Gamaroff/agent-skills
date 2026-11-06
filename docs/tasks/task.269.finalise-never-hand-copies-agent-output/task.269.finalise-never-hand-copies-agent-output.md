---
id: task.269
title: "finalise never hand-copies agent output"
type: task
description: "Give finalise Steps 3b.1 and 3c a transcription-free route for the security probe plan and the AC agent's YAML, and a byte check, so a model reply is never retyped into a file that decides acceptance."
tags: [finalise, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 16
---

# Task 269: finalise never hand-copies agent output

**Status:** Planned

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
- [ ] Establish whether a subagent's reply is available as a file; record the finding in the plan before designing the extractor.

**Dependencies**: none.

---

### Phase 2: Probe plan route

**Risk Level**: High

**Files**:
- `skills/finalise/references/security-probe.mjs` (and its plan reader)
- `shared/resources/finalise-dod-security-prompt.md`
- `skills/finalise/SKILL.md` Step 3b.1

**Changes**:
- [ ] `cases_file:` per entry, copied into the numbered cases file byte for byte.
- [ ] Reuse path with hash check (obs #136 option b).
- [ ] Entity check at the write step (obs #65).

**Dependencies**: Phase 1.

---

### Phase 3: AC YAML route

**Risk Level**: Medium

**Files**:
- `shared/resources/finalise-dod-ac-prompt.md`
- `skills/finalise/references/finalise-rerun-scope.js`
- `skills/finalise/SKILL.md` Step 3c

**Changes**:
- [ ] Fenced end block, one-command extract, byte count and SHA-256 recorded in the AC record.

**Dependencies**: Phase 1.

---

### Phase 4: Evidence, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Tests with mutation proofs (§ 8).
- [ ] `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 2 and 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/finalise/references/security-probe.mjs` - `cases_file:`
2. ✅ `skills/finalise/references/finalise-rerun-scope.js` - extract and hash
3. ✅ `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/finalise-dod-ac-prompt.md` - output shape
4. ✅ `skills/finalise/SKILL.md` - Steps 3b.1 and 3c

### Files to Modify (Tests)

5. ✅ new tests beside `shared/resources/tests/finalise-rerun-scope.test.mjs` and the security-probe suite

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the new routes.

**Actions**:
- [ ] A plan entry with `cases_file:` yields a numbered cases file byte-identical to the source, including U+0085, U+2028, U+2029, VT, FF, U+001F and lone CR.
- [ ] An entity-bearing inline case is refused when the same plan has no literal `<`. **Control**: an entity carried on purpose in an `input` whose source file also has it is accepted.
- [ ] The extracted AC block hashes to the recorded value; a one-byte change fails the check.
- [ ] Mutation proofs: remove the byte copy, the hash check and the entity refusal; each turns exactly one named test red.

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] A plan using `cases_file:` produces a cases file byte-identical to its source for the seven control characters, shown by the new test (name recorded in the QA report).
- [ ] The AC record carries the byte count and SHA-256 of the extracted block; a modified block is refused.
- [ ] An escaped plan is refused at the write step; the control case is accepted.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each new refusal has a mutation proof recorded in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `python skills/create-skill/scripts/quick_validate.py skills/finalise` passes.

### Migration

- [ ] Inline `cases` plans still run (an existing fixture passes unchanged).

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

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #65, #136, #142    | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Measure how the reply reaches the orchestrator
- [ ] Finding recorded

### Phase 2: Probe plan route
- [ ] `cases_file:`, reuse path, entity refusal

### Phase 3: AC YAML route
- [ ] Extract and hash

### Phase 4: Evidence, bundle and sweep
- [ ] Tests, mutation proofs, bundle clean

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

**Status:** Planned
