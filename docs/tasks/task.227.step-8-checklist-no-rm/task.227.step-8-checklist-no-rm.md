---
id: task.227
title: "Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block"
type: task
description: "Keep removals out of any block that also carries a must-pass check or a terminal action."
tags: [develop-task, develop-story, develop-bug, observation, pipeline-lock]
category: infrastructure
status: ready-for-review
priority: Medium
estimated_effort_hours: 16
created: 2026-10-22
updated: 2026-10-24
github_issue: 728
---

# Technical Task: Step 8 — move the state-file removals out of the Completion Checklist

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.227.review.1.step-8-checklist-no-rm.md` implemented 2026-10-24
**GitHub Issue**: [#728](https://github.com/Gamaroff/agent-skills/issues/728)

---

## 1. Overview

Step 8's Completion Checklist is one fenced block. It runs the must-pass checks, removes five state files with two `rm -f` lines, and then ends the run with `advance-pipeline-lock.sh --complete`. On the T216 run (2026-10-22) the agent ran the block as one `bash -c` script. Claude Code's removal safety check refused the whole command because it could not inspect the `rm` inside the script, and with nobody there to approve, the checks and `--complete` never ran. This task moves the five removals into `advance-pipeline-lock.sh --complete`, so the checklist block carries no `rm`, and adds a guard that keeps it that way.

**Scope:** the `--complete` mode of `shared/resources/advance-pipeline-lock.sh`, the Completion Checklist block in `shared/resources/develop-pipeline-step-8-commit.md`, their tests, the bundled copies and a CHANGELOG entry.

**Key deliverables:**

- `--complete` removes Step 4's three records and the two 5c carry records, then the lock, in both of its arms (lock present, and no lock).
- The Completion Checklist block contains no `rm` invocation.
- A test that fails when a fenced block that calls `--complete` also carries an `rm` invocation.

**Expected outcome:** an unattended run reaches `--complete` without a removal prompt, and a refused removal can no longer stop the checks.

---

## 2. Motivation

### Current Problems

- **An unattended run stalls at its last step.** The checklist block mixes `rm -f` with the checks and `--complete`. When the host refuses the removal, it refuses the whole block, so the run ends at Step 8 with the lock still at step 8 (observation #87, T216 develop-next run).
- **The failure looks like a check failure.** Nothing in the block failed. The host declined the command before any line ran, so the agent has to work out by hand which part to re-run without the removals.
- **The workaround is improvised.** On T216 the agent re-ran checks 2–5 without the removals, removed the one file that existed with a separate direct command, and then ran `--complete`. Each run that hits this will improvise its own version.

### Benefits

- The checklist runs as one command on any host, prompted or not, because it removes nothing directly.
- The records are removed by the same script that removes the lock, which is the right moment: after every check has passed.
- A guard test stops a later edit from putting an `rm` back into a terminal block.

---

## 3. Technical Background

### Current Architecture

- **The checklist block.** `shared/resources/develop-pipeline-step-8-commit.md`, the fenced block that ends `✅ Step 8 post-conditions verified` (the test extracts it by that line: `shared/resources/tests/step-8-completion-checklist.test.mjs:255`, `blockBy(readDoc(STEP8), "✅ Step 8 post-conditions verified")`). After check 5 it runs:
  - `develop-pipeline-step-8-commit.md:284`: `rm -f .claude/state/step4-scope-paths.txt .claude/state/step4-held-paths.txt .claude/state/step4-hold-dir.txt`
  - `develop-pipeline-step-8-commit.md:287`: `rm -f .claude/state/5c-carry-eligible.txt .claude/state/5c-carry-classified.txt`
  - `develop-pipeline-step-8-commit.md:292`: `bash .agents/skills/{develop-story|develop-task|develop-bug}/references/advance-pipeline-lock.sh --complete`
- **`--complete` has two arms.** `shared/resources/advance-pipeline-lock.sh:120` sets `LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"`. With no lock on disk, the no-lock `case` exits at `advance-pipeline-lock.sh:174` (`--complete) exit 0 ;;`). With a lock, the arm at `advance-pipeline-lock.sh:190` runs `rm -f "$LOCK"` and prints `pipeline complete, lock removed`. A change that touches only the second arm misses every run that has no lock. The checklist test fixture is one of those: `setup()` creates no lock (`step-8-completion-checklist.test.mjs`, comment above `async function setup`).
- **Who reads the records.** The 5c carry records are written and read by the Step 5c classify and stage blocks (`develop-pipeline-step-5-6-qa-loop.md:1517`, `CLASSIFIED=.claude/state/5c-carry-classified.txt`; `:1518`, `ELIGIBLE=.claude/state/5c-carry-eligible.txt`) and named by the resume contract (`develop-pipeline-resume-contract.md:266`). Step 4's records are read by the Step 4 leak check and the Step 8 held-files check (`shared/resources/tests/step-4-leak-check.test.mjs:90`). None of them is read after `--complete`.
- **The tests that pin the removal.** `step-8-completion-checklist.test.mjs`, `a passing checklist removes Step 4's records` (`:1688`), runs the extracted block and asserts the three Step 4 records are gone. `advance-pipeline-lock.test.sh` cases 4, 5 and 11 pin `--complete` removing the lock.
- **The other `rm` sites, measured.** A scan of fenced `bash`/`sh` blocks in `shared/resources/develop-pipeline-*.md` for an `rm` invocation (the command is in the plan, § Measuring the population) finds 8 blocks. Only one also calls `--complete`: the checklist. The other seven are listed under Out of Scope with a reason each.

### Target Architecture

- `advance-pipeline-lock.sh --complete` removes the five records from the lock's own directory (`$(dirname "$LOCK")`), **before** it decides which arm to take, so both arms remove them. Then it removes the lock as today. The records are removed by literal name: no glob and no variable path from outside the script. The exception, stated once in the script header (`advance-pipeline-lock.sh:15`): `step4-hold-dir.txt` and `step4-held-paths.txt` are kept, with a warning, while `--hold-state` reads pending: the hold directory holds files, or the record or directory cannot be read.
- The checklist block keeps its checks and its `--complete` call, and loses both `rm` lines. Its comment says the records are removed by `--complete`.
- A new test in `step-8-completion-checklist.test.mjs` scans every fenced block in the files `developPipelineDocs()` returns (`:573` — the shared `develop-pipeline-*.md` docs **and** the `skills/develop-*/SKILL.md` orchestrators) that calls `advance-pipeline-lock.sh --complete`, and fails on an `rm` invocation in it. Blocks come from `fencedRanges()` (`shared/resources/change-log.js`, already imported by the test at `:42`), which returns every fence whatever its info string — `extractBlocks()` returns only `bash` fences and would miss an `sh` or unlabelled block — never a new fence parser. It carries a non-vacuity floor: it must find at least one such block.

### Why a script and not a separate block

A separate block of literal `rm -f` lines would also pass the safety check when it is run directly. But it can still be wrapped in `bash -c`, and it moves the removal to after `--complete` (the run has ended, and a refused removal leaves a record that the next run reads as current, task.147 QA-2 CR-7) or before it (a separate step to forget). Putting the removal inside `--complete` keeps the order the block has today: every check passes, then the records go, then the lock goes.

---

## 4. Scope

### In Scope

- ✅ `shared/resources/advance-pipeline-lock.sh`: `--complete` removes the five records in both arms, except the two hold records while the hold directory holds files (QA1-2, QA2-1, QA2-2).
- ✅ `shared/resources/develop-pipeline-step-8-commit.md`: the checklist block loses its two `rm` lines.
- ✅ Tests: `advance-pipeline-lock.test.sh` (records removed with and without a lock; an unrelated file in the same directory kept), and `step-8-completion-checklist.test.mjs` (the guard, and the existing records test extended to the 5c records).
- ✅ `npm run bundle` for the three skills that bundle both files, and a CHANGELOG entry.

### Out of Scope

- ❌ The Step 8 Cleanup block's halt-snapshot removal (`rm -f "$SNAPSHOT"`, `develop-pipeline-step-8-commit.md:144` and `:163`). It carries no must-pass check and no terminal action: a refused removal leaves the snapshot, and the run still reaches the checklist. Observation #87 names it; it stays open there.
- ❌ The six other blocks the scan finds (`develop-pipeline-pause.md`, `develop-pipeline-resume-contract.md` ×2, `develop-pipeline-step-1-create-branch.md`, `develop-pipeline-step-4-create-pr.md`, `develop-pipeline-step-5-6-qa-loop.md`). None calls `--complete`. The two resume-contract blocks do mix `rm` with a HALT (`exit 1`), and are worth a separate observation if a resume is ever refused the same way.
- ❌ The skills' heredocs (observation #88): a separate, library-wide decision.

---

## 5. Breaking Changes

`advance-pipeline-lock.sh --complete` now also removes five files beside the lock. Its only caller is Step 8's Completion Checklist (`every orchestrator mention of --complete names the Step 8 Completion Checklist`, `step-8-completion-checklist.test.mjs:626`), which removed the same five files one line earlier. No caller sees a different end state.

Migration: none. A consumer that runs `--complete` by hand outside Step 8 loses those five files, which are records of a run that `--complete` declares finished. The one exception is the hold records: `step4-hold-dir.txt` and `step4-held-paths.txt` are kept, with a warning on stderr, while `--hold-state` reads pending (the directory the first names holds files, or the record or directory cannot be read), because they are the only pointer to those files and the list of them (QA1-2, QA2-1, QA2-2, QA3-2). Step 8 reads the same answer and refuses to finish (QA3-1). Step 8 refuses to reach `--complete` in that state, so a pipeline run never sees the exception.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.227.plan.step-8-checklist-no-rm.md](task.227.plan.step-8-checklist-no-rm.md)

### Phase 1: Tests first (Risk: Low)

- [x] `advance-pipeline-lock.test.sh`: a case where `--complete` with a lock removes the five records and the lock, and keeps an unrelated file in the same directory.
- [x] The same with no lock on disk (the `:174` arm).
- [x] `step-8-completion-checklist.test.mjs`: extend `a passing checklist removes Step 4's records` to write and assert the two 5c records too.
- [x] Add the guard test: no fenced block that calls `--complete` carries an `rm` invocation, with a floor of at least one such block.
- [x] Run them: the new script cases and the guard are red, and the extended checklist test is green (today's block still removes the records itself).

### Phase 2: Move the removals (Risk: Low)

- [x] In `advance-pipeline-lock.sh`, remove the five records by literal name in the lock's directory before the no-lock `case`, for `--complete` only.
- [x] Delete the two `rm -f` lines and their comments from the checklist block. Say in the comment above `--complete` that it removes the records.
- [x] Re-run: every Phase 1 test is green.
- [x] Mutation-prove: put one `rm -f` line back in the block and watch the guard go red; drop the removal from the no-lock arm and watch the no-lock case go red.

### Phase 3: Bundle, docs, changelog (Risk: Low)

- [x] `npm run bundle`, then `npm run bundle:check`: the copies under `skills/develop-{task,story,bug}/references/` match.
- [x] Update the `advance-pipeline-lock.sh` usage text for `--complete` (`usage()`, `:128`) and the header comment that also describes it (`:15`, `:31`).
- [x] CHANGELOG entry under Unreleased.
- [x] `npm run ci` green.

---

## 7. Files Summary

### Core Implementation

1. ✅ `shared/resources/advance-pipeline-lock.sh`: `--complete` removes the records.
2. ✅ `shared/resources/develop-pipeline-step-8-commit.md`: the checklist block loses its `rm` lines.

### Tests

3. ✅ `shared/resources/advance-pipeline-lock.test.sh`: two new cases.
4. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: the guard, and the 5c records in the existing records test.
4a. ✅ `shared/resources/tests/lib/rm-invocation.mjs` (QA cycle 1): the guard's matcher, `lineRunsNoRm`, as its own module.

### Generated (by `npm run bundle`)

5. ✅ `skills/develop-task/references/advance-pipeline-lock.sh`, `skills/develop-story/references/…`, `skills/develop-bug/references/…`
6. ✅ `skills/develop-{task,story,bug}/references/develop-pipeline-step-8-commit.md`

### Documentation

7. ✅ `CHANGELOG.md`

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** `--complete` in both arms; the checklist block run end to end in a fixture repo under bash and zsh (the existing harness).
- **Command:** `bash shared/resources/advance-pipeline-lock.test.sh` and `command node --test shared/resources/tests/step-8-completion-checklist.test.mjs`.

### The guard

- **What it reads.** Every fenced block `fencedRanges()` returns from the files `developPipelineDocs()` lists (the shared `develop-pipeline-*.md` docs and the `skills/develop-*/SKILL.md` orchestrators) whose text contains `advance-pipeline-lock.sh --complete` on a non-comment line.
- **What it fails on.** A non-comment line in such a block with `rm` as a command word: at line start or after `;`, `&&`, `||`, `|`, `(` or `{`.
- **Why text and not behaviour.** The host's safety check reads the command text, not what the command does. The property under test is the text of the block.
- **Control.** The guard must not fire on `rm` inside a word or a comment (`# … rm -f of a name …`, `confirm`, `--rm`). Add one fixture string of each to the test and assert no match.

### Regression

- The existing `advance-pipeline-lock.test.sh` cases 4, 5 and 11 (lock removed; zero-byte lock removed) pass unchanged.
- `a passing checklist removes Step 4's records` passes before and after Phase 2. Before, the block removes them; after, `--complete` does.

---

## 9. Success Criteria

### Functional

- [x] `advance-pipeline-lock.sh --complete` with a lock removes `step4-scope-paths.txt`, `step4-held-paths.txt`, `step4-hold-dir.txt`, `5c-carry-eligible.txt`, `5c-carry-classified.txt` and the lock (Phase 2), except the two hold records while the hold directory holds files (see §3).
- [x] With no lock, `--complete` removes the same five records, with the same exception, and exits 0 (Phase 2, the no-lock arm).
- [x] An unrelated file in `.claude/state/` survives `--complete`.
- [x] The Completion Checklist block contains no `rm` invocation, and the guard test fails if one is added.

### Performance

- [x] Not applicable — no unit tests applicable: the change moves five `rm -f` calls from one shell to another and adds one file-scan test; no performance-sensitive path changes.

### Code Quality

- [x] `npm run ci` passes.
- [x] `npm run bundle:check` reports no drift and no `UNREACHED` copy.
- [x] The implementation report records both Phase 2 mutations, the test that went red for each, and the revert.

### Migration

- [x] CHANGELOG entry names the behaviour change to `--complete`.
- [x] The `--complete` usage text lists the five records.

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

1. **The removal lands in one arm only.**
   - Risk: the no-lock arm exits at `:174` before the lock-present arm at `:190`. A removal added only beside `rm -f "$LOCK"` misses every no-lock run, and the checklist fixture has no lock.
   - Probability: Medium. Impact: the records survive on those runs.
   - Mitigation: Phase 1's no-lock case; the removal sits before the `case`.

### LOW RISK

1. **A record directory other than `.claude/state`.**
   - Risk: a test that sets `PIPELINE_LOCK` to a temp path expects the records beside it.
   - Mitigation: the records are removed from `$(dirname "$LOCK")`, which is `.claude/state` by default.
2. **An agent wraps the block in `bash -c` anyway.**
   - Risk: none left to the removal check, since the block removes nothing.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a run's records survive Step 8, or `--complete` removes a file it should not.
- **Steps:** revert the task's commits on `develop`; run `npm run bundle` and `npm run ci`.
- **Validation:** `a passing checklist removes Step 4's records` passes on the reverted tree.

### Partial Rollback (1-2 hours)

- Keep the script change and restore the two `rm -f` lines in the block. Both removals are idempotent, so running them twice is harmless. The guard test must then be reverted too.

### Forward Fix

- A missed record name is a one-line addition to the script's list and to the Phase 1 case.

### Rollback Triggers

- **Critical:** `--complete` removes the lock but exits non-zero, or removes a file outside the five.
- **Non-critical:** a record name missed; fix forward.

---

## Implementation Summary

**Completed:** 2026-10-24 (develop-task pipeline, Step 3 inline — implementation report `task.227.implementation.1.step-8-checklist-no-rm-initial-run.md`).

- **Summary.** `advance-pipeline-lock.sh --complete` now removes the five run records (`step4-scope-paths.txt`, `step4-held-paths.txt`, `step4-hold-dir.txt`, `5c-carry-eligible.txt`, `5c-carry-classified.txt`) from the lock's directory, before the no-lock exit, so both arms remove them. The Completion Checklist block lost its two `rm -f` lines; its comment says `--complete` removes the records. A guard test keeps `rm` out of any fenced block that calls `--complete`.
- **Approach.** Phase 1 added scenario 15 to `advance-pipeline-lock.test.sh` (both arms, bash and zsh; an unrelated file and the halt snapshot kept), the 5c records to `a passing checklist removes Step 4's records`, and the guard plus an `RM_WORD` control test to `step-8-completion-checklist.test.mjs`. Red as planned: the two script cases and the guard failed, the records test passed. Phase 2 moved the removals; Phase 3 updated the header comment and `usage()`, bundled (13 copies of the script, 3 of the step doc) and added the CHANGELOG entry.
- **Testing.** `advance-pipeline-lock.test.sh` 76/76; the three new or extended checklist tests pass; `npm run ci:fast` 6289 tests, 0 failed (zsh arms skip: no zsh on this host). Mutations: an `rm -f` line put back in the block turns the guard red; the removal moved into the lock-present arm only turns the no-lock case red. Both reverted.
- **Deferred work.** None.
- **QA cycle 1 fixes (qa-fix).** QA1-1: the guard's matcher became `lineRunsNoRm` in `tests/lib/rm-invocation.mjs`. It counts `rm` as a word after quote and escape removal, and the guard also requires that it read the Step 8 doc's own `--complete` block. Probed with `security-probe.mjs` (rm-specific cases): `present-but-inert`, then `engages` after quote removal. QA1-2: `--complete` keeps `step4-hold-dir.txt`, with a stderr warning, while its directory holds files; three cases per arm were added to scenario 15 (82/82). Both fixes were mutation-proven. Bugs 1 and 2 are now Ready for QA.
- **QA cycle 2 fixes (qa-fix).** QA2-1/QA2-2: `--complete` keeps `step4-held-paths.txt` along with the hold-dir record, and treats a hold directory it cannot list as one that holds files (84/84, including an unlistable case per arm). QA2-3: `lineRunsNoRm` is now one word test, `(?<![\w-])rm(?![\w-])`, instead of a list of what may precede and follow `rm`. Redirections count, and the pattern is linear (0.05 ms at 64k characters). QA2-4: §3, §4, §5 and criteria 1–2 state the exception. All three code fixes were mutation-proven.
- **QA cycle 3 fixes (qa-fix).** QA3-1/QA3-2: the hold-record rule is now stated once, as `hold_state` in `advance-pipeline-lock.sh`, and exposed read-only as `--hold-state` (`clear` / `pending: <why>`). `--complete` keeps the two hold records by its answer. Step 8's held-files check calls it instead of its own `ls -A` copy, so the two can no longer disagree. A record that cannot be read, a directory that cannot be listed and a path that is not a directory all read `pending`. Lock suite 102/102 (six hold cases per arm, each asserting both modes); checklist suite 64/64 (unlistable dir and unreadable record fail Step 8). Four mutations proven.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-24
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.227.qa.4.step-8-checklist-no-rm.md](./task.227.qa.4.step-8-checklist-no-rm.md)
- **Gate File**: [task.227.gate.4.step-8-checklist-no-rm.yml](./task.227.gate.4.step-8-checklist-no-rm.yml)

### Test Coverage Summary

- **Tests Executed**: 166 (lock suite 102, checklist suite 64)
- **Phases Verified**: 3/3
- **Critical Issues**: 0 high, 0 medium, 2 low (carried, route 2b)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

- QA3-1 and QA3-2 are fixed: the hold-record rule is one function, read by `--complete` and Step 8. Bug 3 is closed.
- TASK-227-QA4-1 and QA4-2 (low) are carried to the gate's `recommendations.future` (see Deferred Work).

## Deferred Work

- **TASK-227-QA4-1** (LOW) — carried to gate 4 `recommendations.future` (route 2b, cycle 4): the `hold_state` comment says the rule is stated once, but Step 4's Restore Held Files decides by its own `ls -A` test (its behaviour is pre-existing)
- **TASK-227-QA4-2** (LOW) — carried to gate 4 `recommendations.future` (route 2b, cycle 4): a hold dir whose parent cannot be searched reads `clear`

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-22 | 1.0 | Initial draft — cut from observation #87 | create-task |
| 2026-10-24 | 1.1 | Review passed (8/10) — guard helpers named (`developPipelineDocs`, `extractBlocks`), Performance criteria replaced by a not-applicable line, mutation criterion re-scoped to the implementation report, header comment added to Phase 3, two anchors corrected | review-task |
| 2026-10-24 |  | Status → ready-for-development | review-task |
| 2026-10-24 |  | Implemented — 5 source files and 16 bundled copies; 3 tests added (lock scenario 15, the guard, its RM_WORD control), 1 extended | develop |
| 2026-10-24 |  | QA gate CONCERNS (80/100) — 2 findings | qa-task |
| 2026-10-24 |  | QA findings fixed — QA1-1, QA1-2 (2 MEDIUM), 1 iteration | qa-fix |
| 2026-10-24 |  | QA gate CONCERNS (90/100) — 4 findings | qa-task |
| 2026-10-24 |  | QA findings fixed — QA2-1..QA2-4 (4 LOW), 1 iteration | qa-fix |
| 2026-10-24 |  | QA gate CONCERNS (85/100) — 2 findings | qa-task |
| 2026-10-24 |  | QA findings fixed — QA3-1 (MEDIUM), QA3-2 (LOW), 1 iteration | qa-fix |
| 2026-10-24 |  | QA gate PASS (95/100) — 2 LOW carried (route 2b) | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: Tests first
- [x] Phase 2: Move the removals
- [x] Phase 3: Bundle, docs, changelog

## References

- Observation #87 — Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block
- [task.216 implementation report](../task.216.probe-engine-cli-case-fixture-files/): the run where the block was refused.
- `docs/reference/anti-patterns.md` § "Never put a must-succeed path and a glob in one `rm` argv": the neighbouring rule for `rm` in shared shell.

## Notes

QA artifacts land beside this file: `task.227.qa.[N].*.md`, `task.227.bug.[N].*.md`, `task.227.gate.[N].*.yml`.
