---
id: task.239
title: "QA escalation and grant say what will run"
type: task
description: "Make the QA loop's escalation and its re-entry grant describe what the resumed run will actually do: label the option by its action, recommend only moves the third-strike rule permits, tell a stalled mechanism from a newly found one, and deliver the k cycles a grant promises."
tags: [develop-task, develop-story, qa-loop, escalation, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-27
updated: 2026-10-28
assignee:
estimated_effort_hours: 8
github_issue: 769
---

# Technical Task: QA escalation and grant say what will run

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.239.review.1.qa-escalation-and-grant-say-what-runs.md` implemented 2026-10-28
**GitHub Issue**: [#769](https://github.com/Gamaroff/agent-skills/issues/769)

---

## 1. Overview

When the QA loop escalates, a person decides how to resume it, and today's escalation tells them the wrong thing in four ways. This task makes the escalation entry and the Phase 0b grant match what the resumed run will do.

**Scope:** the escalation templates, the Convergence check and the third-strike rule in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`; the resume contract's grant step; `grant-qa-cycles.sh`; the Phase 0b option in both develop SKILL.md files and their READMEs; the bundled copies and the guards.

**Key deliverables:**

- **The option names its action (obs #70).** "Resume at 5a with {k} more cycles" becomes "Resume the QA loop with {k} more cycles". After the grant, the run reports the phase that `grant-qa-cycles.sh` chose.
- **The recommendation obeys the third strike (obs #71).** The escalation runs the third-strike comparison when it is written. For a struck file, recommended step 1 names a permitted move (delete, replace or waive) and the struck mechanism.
- **A flat count is read for mechanism (obs #19).** The not-converging escalation states whether this cycle's HIGH shares a mechanism with the last cycle's (*stall*) or is a new one (*discovery: the earlier fixes held*). The trip is not loosened.
- **A grant delivers k cycles (obs #72).** The Convergence check counts readings only from the cycle after the grant's base, so "k more cycles" runs k cycles.

**Expected outcome:** the person deciding a resume sees the action that will run, a next step the run will allow, and an honest reading of the stall. The budget they grant is the budget the loop spends.

---

## 2. Motivation

### Current Problems

- **The option names a phase the run does not enter (obs #70).** On task.215 (2026-10-19), a not-converging halt offered "Resume at 5a with {k} more cycles" (`skills/develop-task/SKILL.md:334`, `develop-pipeline-resume-contract.md:634`). `grant-qa-cycles.sh` printed `reenter_at=5b`. That is correct: a not-converging halt fires at 5a before 5b, so the next move is a fix (`grant-qa-cycles.sh:70`, *"the restored candidate's halt_reason is `not-converging`"*). The label hard-codes one branch of a decision the script owns.
- **The escalation recommends a patch the next 5b forbids (obs #71).** task.215's escalation said "fix QA3-1 (guarded formatting, marker first)", a fourth patch to the crash-marker mechanism. That file had HIGH findings in gates 1–3. On re-entry the third-strike detector (`develop-pipeline-step-5-6-qa-loop.md:900`, *"#### Third-strike rule — replace, do not patch again"*) forbade exactly that move. The develop-task template (`:2005`, *"#### develop-task escalation template"*) never consults the detector.
- **A flat count reads the same for a stall and a discovery (obs #19).** task.180's gates 1–5 each raised 1 HIGH in `security-probe.mjs`. Gates 1–4 circled one mechanism (refusal scoring). Gate 5's HIGH was a new mechanism (sandbox containment) that the re-probe found after gate 4's fix held. The check (`:541`, *"### Convergence check (shared)"*, step 3: `HIGH_N >= HIGH_{N-1} >= HIGH_{N-2}`) escalated both alike, as "not converging". Cycle 6 then showed a real stall with the same numbers.
- **A grant of k cycles delivers one fix (obs #72).** On task.215, a not-converging halt (HIGH 1, 1, 1) was granted 2 cycles (`qa_max_cycles=5`, `reenter_at=5b`). The check reads the per-cycle `**HIGH findings**` rows of the implementation report across the grant (step 2: *"that entry is what a resume reads the earlier counts back out of"*). It saw 1, 1, 1 again after cycle 4's review and escalated before cycle 4's fix.

### Benefits

- A person who grants a resume gets the action, the move and the budget they agreed to.
- A resumed run never silently overrules the escalation it resumed from.
- "Not converging" is read for what it is, so a grant on a discovery-flat line is a choice made knowingly.

---

## 3. Technical Background

### Current Architecture

- **Grant.** `shared/resources/grant-qa-cycles.sh` is the one writer of `extra_cycles_granted`. It writes `qa_max_cycles` and `qa_phase` atomically and prints `grant-qa-cycles: QA_CYCLE=<base> extra_cycles_granted=<k> qa_max_cycles=<n> reenter_at=<5a|5b>` (`:252`). `qa_phase` is `5b` for a `not-converging` snapshot and `5a` otherwise (`:68`–`:75`). Suite: `shared/resources/grant-qa-cycles.test.sh`. Lock schema row: `develop-pipeline-pause.md:114` (*"`qa_max_cycles`, `extra_cycles_granted` | Optional."*). Field parity guard: `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, which also asserts the label (`:724`, `/Resume at 5a with \{k\} more cycles/`).
- **Convergence check.** Prose in step-5-6 `:541`–`:660`. `HIGH_N` comes from an awk over the latest gate. The sequence comes from `### QA Cycle` entries' `**HIGH findings**` lines. The trip runs from cycle 3 onward with three preconditions. No script computes the trip (`grep -l not-converging shared/resources/*.{js,mjs,sh}` returns only `grant-qa-cycles.sh` and its test).
- **Third strike.** `high_files()` plus `comm -12` over the last three gates (step-5-6, the block ending *"# Files on their third consecutive strike"*). It keys on `file:`. The rule says to name the mechanism from the three `finding:` texts.
- **Escalation templates.** `#### develop-story escalation template` (`:1969`) and `#### develop-task escalation template` (`:2005`). The fields are Final gate status, HIGH findings per cycle, Remaining issues, What was attempted, Likely root cause and Recommended next steps. The halt messages at `:2079` and `:2102` restate the label.
- **Label sites.** Measured with `git grep -n 'Resume at 5a' -- ':!skills/*/references/*' ':!docs/tasks/*' ':!docs/prd/*' ':!CHANGELOG.md' ':!.agents/plans/*'` (re-measured 2026-10-28, after task.238 merged): `skills/develop-task/SKILL.md:334`, `skills/develop-story/SKILL.md:347`, `develop-pipeline-resume-contract.md:634`, `develop-pipeline-step-5-6-qa-loop.md:2079` and `:2102`, `grant-qa-cycles.sh:6`, `skills/develop-task/README.md:136,137,361,414`, `skills/develop-story/README.md:143,144,376,429`, `docs/reference/troubleshooting.md:192`, `evals/develop-{task,story}/step-isolation/12-qa-reentry-after-loop-limit-with-grant/{answers.jsonl,scenario.json}`, and `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:724`. `CHANGELOG.md` and the past plans are history and are left alone.

### Target Architecture

- **Label (obs #70).** Every live site reads **"Resume the QA loop with {k} more cycles"**. After the grant call, the Phase 0b step reports `reenter_at` from the script's output line ("re-entering at 5b: fix first" / "re-entering at 5a: review first"). The script stays the one place the phase is decided.
- **Window (obs #72).** `grant-qa-cycles.sh` also writes `convergence_from_cycle = base + 1` to the lock, in the same atomic write, and prints it. Convergence check step 3 counts only readings from cycles `>= convergence_from_cycle` (absent → 1), so the three-reading rule restarts at a grant. This applies to both grant kinds: a loop-limit grant re-enters at 5a and has the same flaw. The escalation's "HIGH findings per cycle" line still lists every cycle and marks the grant boundary.
- **Third strike at escalation (obs #71).** Both templates run the same `high_files`/`comm -12` comparison when the entry is written. For each struck file, item 1 of *Recommended next steps* must be one of *delete / replace / waive*, and it names the mechanism. A struck file's entry may not recommend a patch.
- **Mechanism reading (obs #19).** The not-converging variant gains one line: `**Flat-count reading**: {stall | discovery} — {file}: {mechanism}, cycle N-1 vs cycle N`. *Stall* means the latest HIGH shares the previous cycle's `file:` and the same function or mechanism named in its `finding:`, or cites the previous fix. *Discovery* means it does not. The trip is unchanged. When the reading is *discovery*, the escalation's recommended step 1 says the earlier fixes held, and that a grant buys new ground, not another try at the same defect.

### Important Clarifications

- **Why reset rather than relabel (obs #72).** The user chose to reset the window on 2026-10-27. The guard still applies to a granted run once three post-grant readings exist, so a person decides again at the next stall.
- **The mechanism reading is the escalation author's judgment, recorded beside a checkable half.** The `file:` overlap is deterministic (`high_files`). The mechanism is read from the `finding:` texts, as the third-strike rule already requires. Neither changes the trip.
- **`develop-bug` is not affected.** Its verify loop has no grant and no convergence escalation.
- **The window governs the Convergence trip only.** The route classifier (`classifyLoopRoute` in `qa-diminishing-returns.js`: the Diminishing-returns and Cosmetic-residue exits) keeps reading the whole `**HIGH findings**` sequence. Those exits end a loop that has finished, so a pre-grant reading can only let a granted run exit cleanly sooner, never spend its budget.
- **Reconstruction states the window must hold in.** `convergence_from_cycle` lives on the lock, and the lock is rebuilt on resume, so the rule must read correctly in each of these states:
  1. **A lock written before this task** (no field): reads as `1`, today's behaviour (SC-12).
  2. **A lock restored from a halt snapshot**: the snapshot is a superset of the lock and `advance-pipeline-lock.sh --restore` strips only the halt and pause fields, so an earlier grant's value survives the restore until the new grant overwrites it.
  3. **A grant on a lock that already exists** (in-place continuation, no restore): the same write sets the field.
  4. **A second grant**: the field is overwritten with the new `base + 1`. The base is reconstructed as max(highest gate on disk, report entries) and the script already refuses to lower the budget, so the window never moves backwards.
  5. **A cycle run by hand outside the loop before the grant**: its gate is counted into the base, so its reading falls before the window, as the escalation it followed already judged it.
  6. **The report ahead of or behind the gates**: the base rule above (max of the two) decides `QA_CYCLE`, and the window is derived from that base, never from either count alone.
  7. **A Step 7 DoD-gaps re-entry** (`reenter-qa-after-finalise.sh`): it does not write the field. A value an earlier grant wrote is carried; absent stays `1`. See Out of Scope.

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: Convergence check step 3, both escalation templates, and both halt messages
✅ `shared/resources/develop-pipeline-resume-contract.md`: § Re-entry after a QA loop escalation, step 3
✅ `shared/resources/grant-qa-cycles.sh` and `grant-qa-cycles.test.sh`: `convergence_from_cycle`, and the header comment's label
✅ `shared/resources/develop-pipeline-pause.md`: the lock schema row for the new field
✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` and both READMEs: the Phase 0b option and the diagrams' labels
✅ `docs/reference/troubleshooting.md:192`, the two step-isolation eval scenarios, and `qa-loop-lock-fields-parity.test.mjs`
✅ Bundled copies (`npm run bundle`) and the CHANGELOG `[Unreleased]` entry

### Out of Scope

❌ **Loosening the convergence trip.** The obs #19 Improvement says a person still decides.
❌ **A scripted convergence engine.** The check stays prose plus awk. Moving it into an engine is a separate decision.
❌ **5a/5b signal handling and 5c routing.** That is task.238.
❌ **`reenter-qa-after-finalise.sh` writing `convergence_from_cycle`.** It is the other writer of `qa_max_cycles`, but it re-enters QA after a loop that exited accept-eligible, so the readings before it already passed the guard. It is not a grant of k cycles after a stall, which is the case obs #72 measured. A later task can add the field there if a DoD re-entry is ever seen to trip on pre-re-entry readings.

---

## 5. Breaking Changes

1. **The Phase 0b option's text changes.** Migration: none for users. Tests and eval answers that match the old text are updated in this task (§ 3 site list).
2. **A new optional lock field, `convergence_from_cycle`.** A lock without it reads as `1`, which is today's behaviour, so a run in flight when this lands resumes unchanged.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.239.plan.qa-escalation-and-grant-say-what-runs.md](task.239.plan.qa-escalation-and-grant-say-what-runs.md)

### Phase 1: The grant window (Risk: Medium)

**Files:** `grant-qa-cycles.sh`, `grant-qa-cycles.test.sh`, `develop-pipeline-pause.md`, step-5-6 Convergence check, `qa-loop-lock-fields-parity.test.mjs`

- [x] `grant-qa-cycles.sh` writes and prints `convergence_from_cycle = base + 1` in the same atomic write
- [x] Convergence check step 3 counts readings from `convergence_from_cycle` (absent → 1), with a worked example of the task.215 sequence
- [x] Lock schema row and parity test know the field

**Dependencies:** none

### Phase 2: The label (Risk: Low)

**Files:** the § 3 label sites

- [x] Replace the label at every live site
- [x] Phase 0b reports `reenter_at` from the script's output after the grant

**Dependencies:** none

### Phase 3: The escalation entry (Risk: Low)

**Files:** step-5-6 escalation templates (story and task)

- [x] Run the third-strike comparison when the entry is written, and constrain recommended step 1 for a struck file
- [x] Add the `Flat-count reading` line to the not-converging variant
- [x] Mark the grant boundary in "HIGH findings per cycle"

**Dependencies:** Phase 1, for the grant-boundary marker only

### Phase 4: Guards, bundle and record (Risk: Low)

- [x] Tests in § 8, each mutation-proved
- [x] `npm run bundle`; CHANGELOG `[Unreleased]`

**Dependencies:** Phases 1–3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/grant-qa-cycles.sh`: the new field and the header label
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: Convergence check, escalation templates, halt messages
3. ✅ `shared/resources/develop-pipeline-resume-contract.md`: grant step 3
4. ✅ `shared/resources/develop-pipeline-pause.md`: lock schema row
5. ✅ `skills/develop-task/SKILL.md` and `skills/develop-story/SKILL.md`: Phase 0b
6. ✅ `skills/develop-task/README.md` and `skills/develop-story/README.md`: diagram labels

### Files to Modify (Generated — `npm run bundle`)

7. ✅ Every `skills/*/references/` copy of files 1–4 (do not hand-edit them)

### Files to Modify (Tests)

8. ✅ `shared/resources/grant-qa-cycles.test.sh`: the field is written, atomic and printed; a loop-limit grant writes it too
9. ✅ `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`: the new field and the new label
10. ✅ `evals/develop-{task,story}/step-isolation/12-qa-reentry-after-loop-limit-with-grant/{answers.jsonl,scenario.json}`
11. ✅ A new `evals/shared/tests/qa-escalation-template.test.mjs`: the template constraints

### Files to Modify (Documentation)

12. ✅ `docs/reference/troubleshooting.md` (`:192`)
13. ✅ `CHANGELOG.md` `[Unreleased]`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Grant field.** `grant-qa-cycles.test.sh`: a not-converging snapshot at base 3 writes `convergence_from_cycle: 4` and prints it. A loop-limit snapshot does the same. A lock that already has the field is overwritten only by a later grant (the base never moves backwards). Mutation: drop the field from the jq write and the test goes red.
- **Window rule.** Evaluate the rule the doc states on the task.215 sequence (cycles 1–4, HIGH 1 each, `convergence_from_cycle: 4`) and assert no trip at cycle 4. Then on `1,1,1` from cycle 4 onward (cycles 4–6) and assert a trip at cycle 6. **Control case (obs #176):** a lock without the field and `7,7,7` at cycles 1–3 still trips at cycle 3.
- **Label.** Assert that no live site in the § 3 list matches `Resume at 5a with`, and that each matches `Resume the QA loop with {k} more cycles`. The site list is derived by the same `git grep`, not restated.

### Integration Tests

- **Escalation template.** Parse both templates. Assert the not-converging variant carries `**Flat-count reading**` and that *Recommended next steps* names the third-strike comparison and the three permitted moves. Mutation: delete the struck-file constraint and the test goes red.

### Performance Tests

- N/A. The comparison already runs at 5b, and this adds one more run at escalation.

### Consumer Tests

- `npm run ci:fast` green, `npm run bundle:check` clean. The step-isolation evals still pass with the new answers.

---

## 9. Success Criteria

### Functional

- [x] SC-1: `grant-qa-cycles.sh` writes `convergence_from_cycle = base + 1` in the same write as `qa_max_cycles` and `qa_phase`, and prints it on its result line, for both a not-converging and a loop-limit grant (`grant-qa-cycles.test.sh`)
- [x] SC-2: Convergence check step 3 counts only readings from cycles `>= convergence_from_cycle` (absent → 1). On the task.215 sequence it does not trip at cycle 4, and a lock without the field trips exactly as today (unit test with control)
- [x] SC-3: No live site in the § 3 list reads "Resume at 5a with {k} more cycles". Each reads "Resume the QA loop with {k} more cycles", and Phase 0b reports `reenter_at` from the script's output
- [x] SC-4: Both escalation templates run the third-strike comparison when written, and for a struck file their recommended step 1 is delete, replace or waive, naming the mechanism (template test)
- [x] SC-5: The not-converging variant of both templates carries a `**Flat-count reading**: {stall | discovery}` line, and the trip formula is unchanged (`git diff` of step 3's formula paragraph shows only the window clause)

### Performance

- [x] SC-6: The grant is still one script call. No new call is added to Phase 0b
- [x] SC-7: The escalation adds at most one `high_files` comparison per entry

### Code Quality

- [x] SC-8: `npm run ci:fast` passes, including `grant-qa-cycles.test.sh`
- [x] SC-9: `npm run bundle:check` passes. No hand edit under `skills/*/references/` for a file with a `shared/resources/` source
- [x] SC-10: `npm run validate -- skills/develop-task/` and `skills/develop-story/` pass
- [x] SC-11: Every new guard is mutation-proved, and the commit message records the mutation

### Migration

- [x] SC-12: A lock written before this task (no `convergence_from_cycle`) resumes with today's behaviour (SC-2's control case)
- [x] SC-13: The CHANGELOG `[Unreleased]` entry cites task.239 and names the label, the window, the third-strike constraint and the flat-count reading

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The reset hides a real stall for up to two post-grant cycles.**
   - Probability: Medium. Impact: at most k cycles, which the person granted.
   - Mitigation: the loop limit still bounds the grant, and three post-grant readings re-arm the guard.
   - Rollback: revert Phase 1 alone.
2. **The label change misses a site** (the step-isolation evals match answer text).
   - Mitigation: SC-3's test derives the sites from the same `git grep`.

### Low Risk Areas

1. **The mechanism reading is a judgment and can be wrong.**
   - Mitigation: it is shown beside the deterministic `file:` overlap and never gates anything.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a resume that loops past its budget, or a grant script that fails its suite.
- **Steps:** `git revert` the merge commit; `npm run bundle`; `bash shared/resources/grant-qa-cycles.test.sh`; `npm run ci:fast`.
- **Validation:** a lock without the new field still resumes as before.

### Partial Rollback (1-2 hours)

- Phases 1–3 touch separate places. Revert one phase's commit and re-bundle.

### Forward Fix (< 4 hours)

- Template wording and a missed label site are fixed forward with a test.

### Rollback Triggers

- **Critical:** a grant writes a wrong `qa_max_cycles` or `convergence_from_cycle`.
- **Non-critical:** template wording.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-28
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.239.qa.5.qa-escalation-and-grant-say-what-runs.md](./task.239.qa.5.qa-escalation-and-grant-say-what-runs.md)
- **Gate File**: [task.239.gate.5.qa-escalation-and-grant-say-what-runs.yml](./task.239.gate.5.qa-escalation-and-grant-say-what-runs.yml)

### Test Coverage Summary
- **Tests Executed**: 16
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Cycle 4's fixes hold: every describer of the grant write set lists the four fields, and the window qualifier and its worked-example rows are bound to the rule by tests. Both bugs are closed. The last cycle's review asked for high-confidence, line-anchored defects only.

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-27 | 1.0 | Initial draft — cut from observations #19, #70, #71, #72 | create-task |
| 2026-10-28 | 1.1 | Review passed (8/10) — line anchors re-measured after task.238; reconstruction states listed; window scoped to the Convergence trip; `reenter-qa-after-finalise.sh` excluded with reason | review-task |
| 2026-10-28 |  | Status → ready-for-development | review-task |
| 2026-10-28 |  | Implemented — 17 files, 11 tests | develop |
| 2026-10-28 |  | QA gate CONCERNS (90/100) — 5 findings (1 medium, 4 low) | qa-task |
| 2026-10-28 |  | QA findings fixed — CR-1 to CR-5 (bug.1 ready for QA), 1 iteration | qa-fix |
| 2026-10-28 |  | QA gate CONCERNS (80/100) — 7 findings (1 medium, 6 low); bug.1 closed | qa-task |
| 2026-10-28 |  | QA findings fixed — QA2-CR-1 to CR-7 (bug.2 ready for QA), 1 iteration | qa-fix |
| 2026-10-28 |  | QA gate CONCERNS (90/100) — 4 findings (all low); bug.2 closed | qa-task |
| 2026-10-28 |  | QA findings fixed — QA3-CR-1 to CR-4, 1 iteration | qa-fix |
| 2026-10-28 |  | QA gate CONCERNS (90/100) — 4 findings (all low) | qa-task |
| 2026-10-28 |  | QA findings fixed — QA4-CR-1 to CR-4, 1 iteration | qa-fix |
| 2026-10-28 |  | QA gate PASS (100/100) — no findings; both bugs closed | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The grant window

- [x] Script, lock schema, Convergence check

### Phase 2: The label

- [x] Every live site; Phase 0b reports `reenter_at`

### Phase 3: The escalation entry

- [x] Third strike at escalation; flat-count reading; grant boundary

### Phase 4: Guards, bundle and record

- [x] Tests, bundle, CHANGELOG

---

## References

- Observation #19 — QA convergence check cannot tell a stalled fix from a re-probe finding new distinct HIGHs
- Observation #70 — QA re-entry option names 5a while a not-converging grant re-enters at 5b
- Observation #71 — Escalation recommends a patch the third-strike rule forbids on re-entry
- Observation #72 — Not-converging grant of k cycles delivers one fix: convergence window spans the grant
- task.123 — `grant-qa-cycles.sh` (the grant writer)
- task.140 — a not-converging halt re-enters at 5b
- task.238 — QA loop signals and 5c routing (the sibling cut from the same review, 2026-10-27)

---

## Notes

- QA report: `task.239.qa.{N}.qa-escalation-and-grant-say-what-runs.md`
- Bug reports: `task.239.bug.{N}.{name}.md`
- Quality gate: `task.239.gate.{N}.qa-escalation-and-grant-say-what-runs.yml` (co-located)
