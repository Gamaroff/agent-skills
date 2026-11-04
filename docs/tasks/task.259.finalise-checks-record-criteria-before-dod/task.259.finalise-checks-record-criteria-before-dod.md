---
id: task.259
title: "finalise checks record criteria before the DoD run"
type: task
description: "Before /finalise dispatches the DoD agents, find every success criterion that demands a record and confirm the record is in a committed artifact, so a missing record is fixed in minutes instead of costing a failed DoD pass."
tags: [finalise, trap]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-04
updated: 2026-11-04
estimated_effort_hours: 8
github_issue: 831
---

# Technical Task: finalise checks record criteria before the DoD run

**Status:** Ready for Review

**GitHub Issue**: [#831](https://github.com/Gamaroff/agent-skills/issues/831)

> Turns the trap "`/finalise` must read the QA report for record criteria BEFORE the DoD run" (`docs/contributing/traps.md`, added 2026-11-04) from a procedure step into a check. Origin: task 257, criterion 14.

---

## 1. Overview

A success criterion that demands a record ("the six mutations are recorded", "the figure is logged") is graded by the AC agent against **committed** artifacts. When the record exists only in the implementation report, which the pipeline commits after `/finalise`, the agent fails the criterion, and the run pays for a whole DoD pass to learn what a file listing would have shown. This task adds a cheap, deterministic check ahead of the dispatch.

**Scope**: a new pure engine beside `finalise-rerun-scope.js`, its wiring in `skills/finalise/SKILL.md` Step 3a, its tests, bundling, and one CHANGELOG entry. It does not change what the AC agent grades.

---

## 2. Motivation

### Current Problems

1. **A fixable gap is found at the most expensive point.** On task 257 (2026-11-04), criterion 14 asked for the six §8 mutations to be recorded. They were in the implementation report alone. The AC agent failed it; the fix was to re-run all six mutations, write a table into the QA report, commit, and have a second agent re-judge. Nothing about the gap needed the agent to see it: the report's location was knowable before dispatch.
2. **Prevention exists only at authoring.** `review-task` Step 3 check 22 flags a criterion that names no location, or names only the implementation report. A document reviewed before check 22 existed, or one whose criterion was reworded later, reaches `/finalise` unchecked.
3. **The trap is prose.** `traps.md` tells a session to read the QA report first. A rule a session can forget, on the one step that is expensive to repeat, is a rule that will be forgotten.

### Benefits

1. **The gap is found in seconds, before any agent runs.**
2. **The fix is written once, by the session that holds the evidence**, rather than reconstructed after a failed pass.
3. **One definition of "demands a record"** shared with `review-task` check 22, so authoring and finalise cannot drift.

---

## 3. Technical Background

### Current Architecture

Names below were grepped on 2026-11-04.

- The AC prompt (`shared/resources/finalise-dod-ac-prompt.md`, "A measured criterion" and "A process criterion" bullets) already requires a **committed** record and says "The implementation report is not one of them". It grades after dispatch.
- `skills/finalise/SKILL.md` Step 2 (`### Step 2: Check for and Review QA Reports`) reads QA reports for context; Step 3a (`#### Step 3a: Prepare Shared Context`) builds the dispatch inputs; Step 3b dispatches. No step lists record criteria.
- `skills/review-task/SKILL.md` check 22 ("A criterion that demands a record names where it lives") defines the trigger in prose: "recorded", "logged", "listed in", "documented", or a numeric bound graded by a measurement.
- `shared/resources/finalise-rerun-scope.js` is the existing pure engine at this point in the flow (`scope | merge | resolve-ci`), with the `--json` `reason` contract.

### Target Architecture

A pure engine `shared/resources/finalise-record-preflight.js` with one command, `check`:

- **Input**: the work item's success-criteria text, and the list of paths in the work item's directory that git tracks (`git ls-files`), plus the list of paths in the working tree that are staged or modified.
- **Output** (`--json`, `reason` contract): for each criterion that matches the record trigger, `{ criterion, location, state }` where `location` is the artifact the criterion names (`qa-report`, `gate`, `dod`, `implementation-report`, or `none`) and `state` is one of `ok`, `no-location`, `implementation-report-only`, `location-uncommitted`, `location-absent`. `location-absent` means the named artifact does not exist yet (a QA report not written).
- **It does not judge content.** Whether the named file holds the evidence stays with the AC agent. The engine answers only "is there a committed place the agent can read". Each listed criterion also carries `artifacts`, the committed files its named location resolves to (for `qa-report`, every tracked `{stem}.qa.{N}.*.md` beside the work item).
- **`ok` means a committed place exists, not that the record is in it.** Task 257's criterion 14 read "Every mutation in § 8 turns a test red, recorded in the QA report" and a committed QA report existed, so the engine reads that incident as `ok`. The record was missing from the named file, which only a reader of the file can see. That reader is Step 3a's confirm step (Phase 2), run by the main context, which holds the evidence. The engine turns the trap's "find every record criterion and its place" into a deterministic list; it does not replace the reading.
- **The trigger is defined once**, exported by the engine, and a test asserts that the words in `review-task` check 22 are the same set.

### Important Clarifications

- On the **default** path the check reports and the main context fixes: it writes the record into the committed artifact, commits, and then dispatches. The engine never writes a record, because writing needs the evidence only the session has.
- A criterion in the `no-location` state is not blocked: `/finalise` cannot invent a location. It is reported, the AC agent still runs, and the DoD notes it.

---

## 4. Scope

### In Scope

✅ **The engine, its CLI and `--json` contract.**
✅ **Wiring into Step 3a**, before the dispatch.
✅ **A parity test with `review-task` check 22's trigger words.**
✅ **Bundling, CHANGELOG, the `traps.md` entry reworded from "procedure" to "check".**

### Out of Scope

❌ **Judging the content of a record.** Stays with the AC agent.
❌ **Changing the AC prompt's grading.**
❌ **Bug mode.** A bug has no success criteria list (`rerun-scope` is skipped there for the same reason).

---

## 5. Breaking Changes

None. The check adds a step before dispatch and a section in the DoD file's Step 1 block. It blocks nothing a run could do before, except that the main context now has to fix a reported gap before dispatching, which is the point.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.259.plan.finalise-checks-record-criteria-before-dod.md](task.259.plan.finalise-checks-record-criteria-before-dod.md)

### Phase 1: The engine

**Risk Level**: Low.

**Files**:
- `shared/resources/finalise-record-preflight.js` (new)
- `shared/resources/tests/finalise-record-preflight.test.mjs` (new)

**Changes**:
- [x] Reproduce task 257's criterion 14 verbatim as the first test, from the committed document (`git show 95f58307^:docs/tasks/task.257.fix-and-recheck-reads-what-it-claims/task.257.fix-and-recheck-reads-what-it-claims.md`), with the real file listing: it reads `ok` with `artifacts` holding the committed QA report. The test's comment states the limit above. Red before the engine exists.
- [x] A criterion reworded to name only the implementation report ("recorded in the implementation report") reads `implementation-report-only`: the shape the review-task check 22 rejects at authoring.
- [x] Implement `check` with the five states and the `reason` contract (`ok`, `findings`, `usage`, `scan-broken`).
- [x] Controls: a criterion naming "the QA report" with a committed QA report reads `ok`; a criterion with no trigger word is not listed; an empty criteria list answers `empty`, distinct from `scan-broken` (an empty result is a claim about the instrument).

**Dependencies**: none.

### Phase 2: Wire into Step 3a

**Risk Level**: Medium. This phase changes the order of a long procedure.

**Files**: `skills/finalise/SKILL.md`.

**Changes**:
- [x] Add a Step 3a sub-step that runs the engine and prints its findings before dispatch.
- [x] State the rule once: fix `implementation-report-only` and `location-uncommitted` and `location-absent` by writing and committing the record; report `no-location`.
- [x] Add the confirm step for every `ok` criterion: the main context opens each file in `artifacts` and confirms the record is in it before dispatch; a record missing from a committed artifact is written there and committed first. This is the step that catches task 257's incident.
- [x] Put the engine call in a fenced `bash` block in Step 3a (not a table cell or a sentence), so a test can extract and run it.
- [x] Add a test that extracts that block and asserts it calls the engine and sits before the `#### Step 3b` heading.
- [x] Run `npm run validate -- skills/finalise/`.

**Dependencies**: Phase 1.

### Phase 3: One definition, docs and bundle

**Risk Level**: Low.

**Files**: `skills/review-task/SKILL.md` (a citation of the engine's trigger), `docs/contributing/traps.md`, `CHANGELOG.md`, generated `references/` copies.

**Changes**:
- [x] The parity test between the engine's trigger and check 22.
- [x] Reword the trap to point at the check.
- [x] `npm run bundle`, `npm run bundle:check`, CHANGELOG entry.
- [ ] Mutation record written into the QA report.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Core Implementation

1. ✅ `shared/resources/finalise-record-preflight.js` (new)

### Tests

2. ✅ `shared/resources/tests/finalise-record-preflight.test.mjs` (new)

### Documentation

3. ✅ `skills/finalise/SKILL.md`
4. ✅ `skills/review-task/SKILL.md`
5. ✅ `docs/contributing/traps.md`
6. ✅ `CHANGELOG.md`

### Generated (by `npm run bundle`)

7. ✅ `skills/finalise/references/finalise-record-preflight.js` and the `review-task` copy if it cites the engine by a script path. The exact list comes from `npm run bundle` and is read off its output, not predicted here.

---

## 8. Testing Strategy

### Unit Tests

- **Command**: `CI=true command node --test shared/resources/tests/finalise-record-preflight.test.mjs`.
- **Reproduce first**: the task 257 case, built from a real directory listing, not a hand-made list.

### Controls

- A record in the QA report: `ok`. A record in the gate: `ok`. A record in the DoD file: `ok`.
- A record only in the implementation report: `implementation-report-only`.
- A named QA report that is untracked: `location-uncommitted`; one that does not exist: `location-absent`.
- A criterion with no trigger word: not listed.

### Mutation

| # | Mutation | Test expected red |
| - | -------- | ----------------- |
| 1 | treat the implementation report as a committed location | the `implementation-report-only` test |
| 2 | ignore untracked state | the `location-uncommitted` test |
| 3 | drop one trigger word | the parity test |

The table is recorded in the QA report (`task.259.qa.{N}.*.md`), committed before acceptance.

---

## 9. Success Criteria

### Functional

- [ ] Task 257's criterion 14, read verbatim, lists with `artifacts` holding the committed QA report (test: the first Phase 1 test), and a criterion naming only the implementation report reads `implementation-report-only`.
- [ ] A record criterion naming a committed QA report, gate or DoD reads `ok`.
- [ ] Step 3a runs the check before the dispatch (the Phase 2 extraction test: the fenced block calls the engine and precedes `#### Step 3b`), and the SKILL.md says what to do for each state and states the confirm step.
- [ ] The three mutations in § 8 each turn the named test red, recorded in the QA report's mutation table.

### Performance

- [ ] The engine is pure: `check()` takes the criteria and the file lists as arguments and spawns nothing. A test passes it lists and asserts the answer with `child_process` stubbed to throw; the CLI gathers `git ls-files` once.

### Code Quality

- [ ] `CI=true` over the new test file passes; `npm run bundle:check` is clean.
- [ ] `npm run validate -- skills/finalise/` and `npm run validate -- skills/review-task/` pass.

### Migration

- [ ] CHANGELOG entry present; `changelog-cites.sh task.259` reports it.
- [ ] The trap in `traps.md` points at the check.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Trigger words match prose that is not a record criterion (Phase 1)**
   - Risk: "documented" appears in many criteria ("migration guide documented") and each would be listed.
   - Probability: Medium. Impact: Low (a listing, not a block, when the location is named).
   - Mitigation: only the five states that need action are acted on; a criterion that names a committed location reads `ok`.
2. **Step 3a order change (Phase 2)**: a mistake could skip the dispatch. Mitigation: the SKILL.md wording is tested by the existing `finalise` step-order tests, and the check reports rather than halts for `no-location`.

### Low Risk Areas

1. **Bundle drift** from editing a `references/` copy. Mitigation: edit `shared/resources/` only.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a finalise run halted by a wrong finding, or `bundle:check` red on `develop`.
- **Steps**: `git revert` the merge, `npm run bundle`, push through a PR.
- **Validation**: a `/finalise` dry read of Step 3a runs straight to dispatch.

### Partial Rollback (1-2 hours)

Remove the Step 3a sub-step and keep the engine, which is inert until called.

### Forward Fix (< 4 hours)

A trigger word that over-matches: narrow it and add the criterion as a control.

### Rollback Triggers

- **Critical**: the check blocks a dispatch on a criterion that is correctly recorded.
- **Non-critical**: an extra listing.

---

## Progress Tracking

### Phase 1: The engine
- [ ] Failing test, engine, controls

### Phase 2: Wire into Step 3a
- [ ] Sub-step, per-state rule, validate

### Phase 3: One definition, docs and bundle
- [ ] Parity test, trap reworded, bundle, CHANGELOG, mutation record

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-04 | 1.0 | Initial draft — turns the finalise record-criteria trap into a check | create-task |
| 2026-11-04 | 1.1 | Review passed (8/10) — Critical fixed: task 257's own incident reads `ok` from the engine, so the catch moves to a Step 3a confirm step and the first criterion is re-scoped; Step 3a test and Performance criterion made testable | review-task |
| 2026-11-04 |  | Status → ready-for-development | review-task |
| 2026-11-04 |  | Implemented: finalise-record-preflight.js and its tests, Step 3a check, trap reworded, CHANGELOG; the `record-preflight` key added to the bug-mode skip table and its test. Status → ready-for-review | develop |
<!-- change-log-end -->

---

## References

- `docs/contributing/traps.md` — "`/finalise` must read the QA report for process criteria BEFORE the DoD run"
- `docs/tasks/task.257.fix-and-recheck-reads-what-it-claims/task.257.dod.1.fix-and-recheck-reads-what-it-claims.md` — the first-pass AC #14 failure
- `skills/review-task/SKILL.md` check 22; obs #105, #77; task 249
- `shared/resources/finalise-dod-ac-prompt.md` — measured and process criterion rules

---

## Notes

Independent of task 258. The two touch different files.
