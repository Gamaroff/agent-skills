---
id: task.130
title: "[Task 130] Resume residue from task.124: the probe base fallback reads a row the bug-variant report never carries, develop-bug's root-cause dispatch is outside the waiting_on population, the detector self-reports a delete it may not perform, and one rule is still stated at five sites"
type: task
description: "Close the medium findings PR #436's Step 5c review carried past merge and collapse the who-restores enumeration that produced bugs 9→11→12→13: bind the probe base from the bug-variant report's Branch-model line, mark develop-bug's Step 3 dispatch and widen the population pattern, move the stale-snapshot rm -f into the orchestrator, state the restore rule once with citations and a test, and the four gate-6 futures."
tags: [pipeline, resume, develop-bug, enumeration]
category: refactoring
status: planned
priority: High
created: 2026-09-20
updated: 2026-09-20
assignee:
estimated_effort_hours: 8
risk_level: medium
github_issue: 437
---

# Technical Task: Resume residue from task.124 — bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Status:** Planned
**GitHub Issue**: [#437](https://github.com/Gamaroff/agent-skills/issues/437)

---

## 1. Overview

Task.124 shipped the working-tree probe, `--restore`, `waiting_on` and the report linter, and its Step 5c review (`task.124.pr-review.1`) left three medium findings and four gate-6 futures on the merged head. Each is small; together they are the residue of one pattern the QA loop kept finding — a rule stated at one site was fixed at that site while its restatements elsewhere stayed wrong. This task closes the findings and removes the enumeration that produced them.

**Scope**: `shared/resources/develop-pipeline-resume-contract.md` (probe base binding, who-restores rule), `pipeline-resume-detector-prompt.md` + the three orchestrators' Phase 0a handling (stale-snapshot delete), `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` (dispatch mark), `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (population pattern), `grant-qa-cycles.sh` (guard reads the chosen candidate), `develop-pipeline-step-8-commit.md` + `advance-pipeline-lock.sh` (snapshot with no directory), the orchestrators' Step 0-lock paragraphs and step-0 §0b (citations instead of restatements) and one new test.

**Key deliverables**: (1) probe base bound on every report variant, else HALT — never a silent `develop` default; (2) every `Explore subagent` dispatch under a lock marked, with the population test's pattern widened so an unmarked one is red; (3) the detector reports `stale-snapshot`, the orchestrator deletes; (4) the who-restores rule stated once, cited four times, guarded by a test; (5) gate-6 futures closed.

**Expected outcome**: a develop-bug hotfix resumed before Step 4 probes against `main`; a develop-bug Step 3 wait is not re-prompted; a merged run's snapshot cannot be "deleted" in a report and survive on disk; a future edit to the restore rule has one place to land.

---

## 2. Motivation

### Current Problems

- **The probe's base fallback is variant-specific.** `develop-pipeline-resume-contract.md` binds `BASE_BRANCH` from `gh pr view` else a `| Feature branch base | … |` row. The bug-variant report (`implementation-report-template.md` § bug variant) records the base as `**Branch model:** {model} (base: X, PR target: Y)`, so a develop-bug hotfix off `main` resumed before Step 4 falls to `develop` — the one pipeline where the base is routinely not develop, and the (a) discard is the destructive outcome (PR #436 review CR-1, medium/high).
- **A real dispatch sits outside the `waiting_on` population.** `develop-bug-step-3-investigate-fix.md` step 3 "Localise the root cause via a read-only Explore subagent" runs with the lock present and carries no `set-waiting-on.sh` mark; the population test's pattern (`subagent_type=`, `dispatch an Explore subagent`, `run_in_background`, `gh pr checks --watch`) does not match its wording, so the test is green over a gap (CR-2, medium/high; the same class as task.124 bug 3).
- **The detector is told to `rm -f` and the orchestrator trusts the report.** `pipeline-resume-detector-prompt.md` § stale snapshot after merge has the read-only Explore subagent delete `last-halt.json`; whether the harness permits it is a property of the session, and `"deleted"` in `deltas_since_pause` is a self-reported verdict nothing re-reads (CR-3, medium/medium — an obs #77-class self-report).
- **One rule, five statements.** Who restores the lock, and when, is stated in the resume contract's Phase 0a section, its Phase 0b paragraph, step-0 §0b and each of three orchestrators' Step 0-lock paragraphs. Bugs 9 → 11 → 12 → 13 on task.124 are a single contradiction walking across four of them, one site-local fix at a time (obs #132).
- **Four gate-6 futures**: the probe's fallback stderr line says "no PR on this branch" when `gh` may simply have failed; `grant-qa-cycles.sh`'s never-lower guard reads `qa_max_cycles` from `$SNAPSHOT` while `--restore` may choose a newer `.pausing.*` claim (task.124 cycle-1 CR-5, carried in every gate since); inline lint call sites collapse exit 1/2/127 into one `||` branch (cycle-1 CR-7); Step 8 deletes only a snapshot with a matching non-empty `task_or_story_directory` while `--restore` accepts one with none for any document.

### Benefits of Closing the Residue

- The destructive probe outcome keys on the real base for every branch model (hotfix, epic-integration, feature).
- The population test catches the next unmarked dispatch instead of passing over it.
- A stale snapshot is deleted by an agent that can delete, and the deletion is verified on disk.
- The restore rule has one author-facing location; the other four sites become citations a test can check for restatement.
- Fewer places for the next QA loop to circle.

---

## 3. Technical Background

### Current Architecture

**Components** (merged at `62945d68`, PR #436):

- `shared/resources/develop-pipeline-resume-contract.md` § Working-tree probe — binds `BASE_BRANCH` in order `gh pr view --json baseRefName` → `sed` over `{implementation-report-path}` for `| Feature branch base |` → `develop` with a stderr line. Phase 0a § "Restore the lock (both resume paths)" states the who-restores rule; Phase 0b § "Restoring the lock — on either resume path" restates it with a deferral sentence.
- `shared/resources/implementation-report-template.md` — story/task variants carry the `Feature branch base` table row; the bug variant carries `**Branch model:** {BRANCH_MODEL} (base: {BASE_BRANCH}, PR target: {PR_TARGET})`.
- `shared/resources/pipeline-resume-detector-prompt.md` § Step 1 item 2 — the read-only detector's one sanctioned write (`rm -f` of a MERGED snapshot).
- `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` step 3 — root-cause Explore dispatch, unmarked; step 51 (test triage) is marked.
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` — derives the dispatch population from directories with a case-insensitive pattern and an `EXEMPT` regex; ≥12-site floor.
- `shared/resources/grant-qa-cycles.sh` — `read_budget "$SNAPSHOT"` for the never-lower guard, then `bash "$ADVANCE" --restore "$DOC_DIR"` which selects its own candidate.
- `shared/resources/advance-pipeline-lock.sh --restore` — candidate match treats an absent `task_or_story_directory` as matching any document; `develop-pipeline-step-8-commit.md` § Cleanup deletes only a non-empty matching one.
- `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock paragraphs and `develop-pipeline-step-0-resolve-and-prepare.md` §0b — each restates the who-restores rule with pipeline qualifiers (after task.124 cycle 5).

### Target Architecture

**Components**:

- Probe base binding: `gh pr view` → report row (`| Feature branch base |`) → report line (`**Branch model:** … (base: X`) → **HALT** naming the report path and both shapes tried. No `develop` default: a base the probe cannot establish is class (c) for the whole tree, because the comparison that discards is meaningless without it. The stderr line distinguishes "gh returned no PR" from "gh failed: <first stderr line>".
- `develop-bug-step-3-investigate-fix.md` step 3 marked (`set-waiting-on.sh "step-3 root-cause localisation"` / `--clear`); the population test's pattern gains `via a read-only Explore subagent|Explore subagent \(|Agent\(subagent_type` and a fixture asserting the develop-bug site is in the population.
- Detector reports `stale-snapshot: <path> — PR merged` in `deltas_since_pause` and does **not** delete; each orchestrator's Phase 0a "Consume Output" handling performs `rm -f` for every reported path and re-reads the directory (`[ ! -f "$p" ]`) before proceeding — the write is done by the agent that can write, and verified.
- One statement of the who-restores rule: the resume contract's Phase 0a section. Phase 0b, step-0 §0b and the three Step 0-lock paragraphs cite it in one sentence ("who restores, and when: resume contract § Restore the lock (both resume paths)") and carry no `loop-limit|not-converging` clause of their own. `shared/resources/tests/who-restores-single-statement.test.mjs` asserts the phrase `loop-limit|not-converging` appears in exactly one section of the resume contract and in no orchestrator `SKILL.md` outside a citation line — the `mutation-call-site-coverage.test.js` shape.
- `grant-qa-cycles.sh` asks `advance-pipeline-lock.sh --restore --which "$DOC_DIR"` (new read-only flag: prints the winning candidate path, exit 1 when none) and runs `read_budget` on that file.
- Inline lint call sites (Step Transition action 2, step-8, HALT rule) split `|| { … }` into a `case $?` on 1 / 2 / 127 with a distinct message each (problems / usage / linter missing).
- `--restore` refuses a snapshot with no `task_or_story_directory` unless `--accept-legacy` is passed; Step 8's cleanup deletes such a snapshot when it is the only one (it can belong to no run that will resume it).

### Important Clarifications

- **A HALT replaces the `develop` default deliberately.** Task.124 cycle 5 bound the base and kept a default "said aloud"; the 5c review showed the default is wrong on exactly the pipeline whose report the fallback cannot read. A probe that cannot name its base must not discard.
- **The detector stays read-only by construction, not by permission.** Whether an Explore subagent can `rm` is a harness property; the contract must not depend on it.
- **Collapsing to a citation is the fix for obs #132; the pipeline qualifiers task.124 cycle 5 added are kept in the one statement**, not dropped.
- Task.128 (shell entry for the probe engine) and task.129 (call-site population collector) are independent of this task; the population-pattern widening here is a one-line test change, not the collector 129 builds.

---

## 4. Scope

### In Scope

✅ Probe base binding: bug-variant line, HALT instead of default, stderr label by cause (CR-1 + gate-6 future 1).
✅ develop-bug Step 3 dispatch marked; population pattern widened; fixture for the site (CR-2).
✅ Stale-snapshot delete moved to the orchestrators' Phase 0a handling with an on-disk re-read (CR-3).
✅ Who-restores rule stated once; four citations; `who-restores-single-statement.test.mjs` (obs #132).
✅ `--restore --which`; grant guard reads the chosen candidate (cycle-1 CR-5).
✅ Lint call sites split exit 1/2/127 (cycle-1 CR-7).
✅ Snapshot with no directory: `--accept-legacy` on `--restore`; Step 8 deletes a sole legacy snapshot (gate-6 CR-5).
✅ Replay fixture: develop-bug hotfix resumed before Step 4 with a dirty forward-port.
✅ `npm run bundle`; CHANGELOG `[Unreleased]`.

### Out of Scope

❌ A `base_branch` lock field written at Step 1 — the report already records the answer; adding a second writer is the enumeration class again.
❌ Task.129's call-site collector; task.128's shell probe entry.
❌ Any change to what the probe classifies as (a)/(b)/(c) beyond the base it compares against.

---

## 5. Breaking Changes

### Breaking Change 1: the probe HALTs when it cannot bind a base

**What Changed**: `BASE_REF` no longer defaults to `origin/develop`.

**Before**: no PR, no report row → `develop`, stderr line, classification proceeds.

**After**: no PR, no report row, no Branch-model line → HALT naming the report path and the shapes tried; nothing discarded.

**Impact**: a resume on a run whose report predates task.124's template (no `Feature branch base` row) and has no PR halts where it previously guessed. Reports written by the pipeline since task.115 carry the row.

**Migration Path**: add the `| Feature branch base | <branch> |` row to the report's Pipeline Configuration table by hand and re-invoke; the HALT message says so.

### Breaking Change 2: `--restore` refuses a snapshot with no `task_or_story_directory`

**What Changed**: a pre-task.123 snapshot (no directory field) is refused with a named reason unless `--accept-legacy` is passed.

**Impact**: none on runs since task.123; a legacy snapshot on disk surfaces once and is either accepted explicitly or deleted by the next completed run's Step 8.

**Migration Path**: `advance-pipeline-lock.sh --restore --accept-legacy <dir>` once, or delete the file.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.130.plan.resume-residue-bug-variant-base-and-who-restores.md](task.130.plan.resume-residue-bug-variant-base-and-who-restores.md)

### Phase 1: Probe base — bug variant, HALT, label by cause

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-resume-contract.md`; `evals/develop-task/step-isolation/17-resume-bug-hotfix-base-main/`.

**Changes**:
- [ ] Add the `**Branch model:** … (base: X` sed arm after the table-row arm
- [ ] Replace the `develop` default with a HALT naming `{implementation-report-path}` and both shapes
- [ ] Capture `gh pr view`'s exit status and first stderr line; two stderr labels ("no PR on this branch" / "gh pr view failed: …")
- [ ] Update the Cost sentence and the (a)/(c) table note
- [ ] Replay fixture 17: bug-variant report, no PR, base `main`, a dirty file equal to develop's copy → class (c), nothing discarded

**Dependencies**: none

### Phase 2: develop-bug dispatch mark + population pattern

**Risk Level**: Low

**Files**: `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`; `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`.

**Changes**:
- [ ] Mark step 3's root-cause dispatch (`set-waiting-on.sh "step-3 root-cause localisation"` / `--clear` after the summary is read)
- [ ] Widen the dispatch pattern to the three wordings the corpus uses; add the develop-bug site to the expected population; raise the floor
- [ ] Mutation-prove: remove the mark → test red

**Dependencies**: none

### Phase 3: stale-snapshot delete in the orchestrator

**Risk Level**: Medium

**Files**: `shared/resources/pipeline-resume-detector-prompt.md`; `shared/resources/develop-pipeline-resume-contract.md` § Consume Output; `skills/develop-{task,story,bug}/SKILL.md` Step 0a; `evals/develop-task/step-isolation/16-resume-stale-snapshot-after-merge-deleted/`.

**Changes**:
- [ ] Detector: report `stale-snapshot: <path> — PR merged` and keep the file; remove the "one sanctioned write" clause
- [ ] Contract § Consume Output: for each `stale-snapshot` delta, `rm -f` the path and assert `[ ! -f ]` before Phase 0b; HALT if it survives
- [ ] Fixture 16 asserts the deletion is the orchestrator's and verified

**Dependencies**: none

### Phase 4: one statement of who restores

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-resume-contract.md` (Phase 0b paragraph), `develop-pipeline-step-0-resolve-and-prepare.md` §0b, `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock; new `shared/resources/tests/who-restores-single-statement.test.mjs`.

**Changes**:
- [ ] Reduce the four restatements to one-sentence citations of the Phase 0a section; keep the pipeline qualifiers in the one statement
- [ ] Test: `loop-limit|not-converging` in exactly one section of the contract; in orchestrator `SKILL.md` and step-0 only on a line that cites `Restore the lock (both resume paths)`; non-vacuity floor (the one statement must exist)
- [ ] Mutation-prove: re-add a restatement → red

**Dependencies**: Phase 1 (the contract file is edited by both — land 1 first)

### Phase 5: gate-6 futures

**Risk Level**: Low

**Files**: `shared/resources/advance-pipeline-lock.sh` (+ test), `grant-qa-cycles.sh` (+ test), `develop-pipeline-step-8-commit.md`, `skills/develop-{task,story,bug}/SKILL.md` (lint call sites), `develop-pipeline-hooks.md`.

**Changes**:
- [ ] `--restore --which`: print the winning candidate, exit 1 on none; no writes
- [ ] `grant-qa-cycles.sh`: guard reads the budget from the `--which` result
- [ ] `--restore` refuses a directory-less snapshot without `--accept-legacy`; Step 8 deletes a sole legacy snapshot
- [ ] Lint call sites: `case $?` on 1 / 2 / 127 with distinct messages at the three inline sites
- [ ] Tests for each; `npm run bundle`; CHANGELOG

**Dependencies**: Phase 4 (SKILL.md edits)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-resume-contract.md` — base binding, HALT, stderr labels, Consume Output delete, Phase 0b citation
2. ✅ `shared/resources/pipeline-resume-detector-prompt.md` — report-only stale snapshot
3. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — §0b citation
4. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md` — Step 0-lock citation; Phase 0a delete; lint call-site exit split
5. ✅ `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` — dispatch mark
6. ✅ `shared/resources/advance-pipeline-lock.sh` — `--which`, `--accept-legacy`
7. ✅ `shared/resources/grant-qa-cycles.sh` — guard on the chosen candidate
8. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — legacy snapshot deletion; lint exit split

### Files to Modify (Tests)

9. ✅ `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` — pattern + population
10. ✅ `shared/resources/tests/who-restores-single-statement.test.mjs` — new
11. ✅ `shared/resources/advance-pipeline-lock.test.sh`, `grant-qa-cycles.test.sh` — `--which`, legacy refusal, guard source
12. ✅ `evals/develop-task/step-isolation/17-resume-bug-hotfix-base-main/` — new fixture; `16-…` updated
13. ✅ `package.json` — register the new `.mjs` suite if its glob is not already covered

### Files to Modify (Documentation)

14. ✅ `shared/resources/develop-pipeline-hooks.md`, `develop-pipeline-pause.md` — `--which`, `--accept-legacy`, delete ownership
15. ✅ `CHANGELOG.md` — `[Unreleased]` entry
16. ✅ `skills/*/references/` — regenerated by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `advance-pipeline-lock.sh --which` / `--accept-legacy`; `grant-qa-cycles.sh` guard source; who-restores single-statement; population pattern.

**Actions**:
- `--which` prints the same path `--restore` would consume (assert by running both on one fixture); exit 1 on none; leaves the tree untouched
- guard reads the newer `.pausing.*` claim's budget when it wins over the snapshot
- legacy snapshot refused / accepted with the flag
- who-restores: exactly one statement; a re-added restatement is red; a citation line is not counted
- population: the develop-bug site is enumerated; removing its mark is red

**Command**: `npm test` (the per-suite globs) and `npm run ci:fast`

**Target**: every new branch mutation-proven (revert → red), recorded per the mutation-proving reference.

### Integration Tests

**Scope**: replay fixtures 16 (orchestrator-owned delete, verified) and 17 (bug hotfix, base `main`, no PR).

**Actions**: `npm run eval:develop-task`; fixture 17 asserts class (c) and no `git checkout HEAD` in the transcript.

### Contract Tests

**Scope**: bundle parity (`npm run bundle:check`), `qa-loop-lock-fields-parity`, `mutation-call-site-coverage`.

### Performance Tests

Not applicable — one additional `sed` per resume.

### Consumer Tests

**Scope**: `develop-bug` end-to-end replay if one exists for Phase 0b; otherwise Step 4b (`qa-execute-snippets.mjs`) over the three changed prose files under bash and zsh.

---

## 9. Success Criteria

### Functional

- [ ] A bug-variant report with base `main` binds `BASE_REF=origin/main`; no report shape → HALT, nothing discarded
- [ ] `gh` failure and "no PR" produce different stderr lines
- [ ] develop-bug Step 3's dispatch is marked and in the tested population
- [ ] A MERGED snapshot is deleted by the orchestrator and asserted absent before Phase 0b
- [ ] `loop-limit|not-converging` is stated in one section; every other site cites it
- [ ] The grant's guard reads the candidate `--restore` will choose
- [ ] A directory-less snapshot is refused without `--accept-legacy` and deleted by Step 8 when sole

### Performance

- [ ] Resume cost unchanged beyond one `sed` and one `--which` read

### Code Quality

- [ ] Every new branch mutation-proven; `npm run ci:fast` and `eval:develop-task` green; `bundle:check` 0 problems; shellcheck clean

### Migration

- [ ] CHANGELOG `[Unreleased]` names the HALT and the legacy-snapshot refusal
- [ ] `task.124.pr-review.1` CR-1..CR-5 and gate-6 futures referenced as closed in this task's implementation report

---

## 10. Risk Assessment

### High Risk Areas

**1. The base HALT fires on legitimate old reports**
- Risk: pre-task.115 reports lack the row; a resume on one now halts
- Probability: Low (no such run is in flight)
- Impact: Medium — a one-line manual edit
- Mitigation: the HALT message names the row to add
- Rollback: Phase 1 revert restores the default

### Medium Risk Areas

**1. Collapsing restatements loses a qualifier**
- Risk: a citation drops a pipeline-specific detail (develop-bug has no grant)
- Mitigation: the one statement keeps every qualifier task.124 cycle 5 added; the test is non-vacuous
- Rollback: Phase 4 revert

**2. Two edits to the resume contract in one task**
- Risk: Phase 1 and Phase 4 both edit the file; a merge of one without the other
- Mitigation: land Phase 1 first; one PR

### Low Risk Areas

**1. `--which` and `--restore` disagree** — both call the same candidate function; the test asserts equality on a shared fixture.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a resume HALTs on a report the pipeline itself wrote; the population test goes red on `develop` for a site that is marked.

**Steps**:
1. `git revert` the task's merge commit
2. `npm run bundle && npm run ci:fast`

**Verification**: `eval:develop-task` fixtures 13–16 green; `--restore` behaviour as at `62945d68`.

### Partial Rollback (1-2 hours)

**When to Use**: one phase misbehaves (e.g. the HALT) while the others are sound.

**Steps**: revert that phase's hunks in the contract; re-bundle; keep the tests that still pass.

### Forward Fix (< 4 hours)

**When to Use**: a label wording or a fixture expectation.

**Approach**: fix forward with a mutation proof.

### Rollback Triggers

**Critical (Immediate Rollback)**: a probe discard on a file that is not an overlay.

**Non-Critical (Forward Fix)**: message wording; a citation the test misreads.

---

## Change Log
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — follow-ups from task.124 / PR #436 (5c review CR-1..CR-5, gate-6 futures, obs #132) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: probe base
- [ ] Phase 2: dispatch mark + population
- [ ] Phase 3: orchestrator-owned delete
- [ ] Phase 4: one statement of who restores
- [ ] Phase 5: gate-6 futures
- [ ] QA: `task.130.qa.[N].resume-residue-bug-variant-base-and-who-restores.md`
- [ ] Gate: `task.130.gate.[N].resume-residue-bug-variant-base-and-who-restores.yml`

## References

- `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.pr-review.1.pipeline-resume-lifecycle-hygiene.md` — CR-1..CR-5
- `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.gate.6.pipeline-resume-lifecycle-hygiene.yml` — `recommendations.future`
- Observation #132 (who-restores enumeration); task.124 bugs 9, 11, 12, 13
- `docs/reference/anti-patterns.md` — enumeration class

## Notes

- QA artifacts land beside this file: `task.130.qa.[N].*.md`, `task.130.bug.[N].*.md`, `task.130.gate.[N].*.yml`.
- Independent of tasks 128 and 129 (both `planned`); shares no file with 129, and touches `probe-boundary-rule.md` not at all.
