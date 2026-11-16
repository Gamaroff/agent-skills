---
id: task.277
title: "The implementation report and triage say what happened"
type: task
description: "Close four develop-pipeline honesty gaps: a guard allow-list entry is not a fix for new code, report times are measured, qa-fix records are H4 under their cycle, and the traceability mapper decision is a required line."
tags: [develop-task, develop-story, develop-bug, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-16
estimated_effort_hours: 8
---

# Task 277: The implementation report and triage say what happened

**Status:** Ready for Review

---

## 1. Overview

Four defects in what the develop orchestrator writes or decides, each invisible until someone read the result closely (obs #5, #6, #92, #124). Each needs a stated rule and, where a script can check it, a lint.

**Scope**: the Test Failure Triage rule, report time wording, the QA Cycle heading shape, and a required traceability line in the report template and its lint.

---

## 2. Motivation

### Current Problems

1. **A guard allow-list extended to green new code** (obs #5). On task.201 (PR #632) triage fixed `tests/unbound-default-reads.test.js` by adding two names to its INPUTS allow-list; QA cycle 1 found the reads genuinely unbound (gate 1, QA-1, high). Recurred on task.188 (`skills/develop-next/SKILL.md#VCS`).
2. **Recalled times in the report** (obs #6). The orchestrator wrote step times into Notes cells and Decisions Log entries from recall; `date -u` at the next measured moment read earlier than several recorded times.
3. **Seven QA Cycle headings for four cycles** (obs #92). task.230 logged each qa-fix pass as `### QA Cycle {N} — qa-fix (5b)`; `grep -cE '^### (QA|Verify) Cycle'` returned 7 before the fix, 4 after. Finalise's PR comment and the resume contract read the count.
4. **The mapper was skipped with no reason** (obs #124). On task.242 cycles 1 to 5 ran without the Step 5 traceability mapper while both dispatch conditions held; `grep -n -i 'mapper\|traceab'` over the report found nothing before cycle 6.

### Benefits

1. A real failure in new code is fixed in the code, not hidden in a guard.
2. Times in the report are readings or `(not measured)`.
3. The cycle count is one source of truth; a skipped mapper is a visible line.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `shared/resources/develop-pipeline-step-3-develop-loop.md:202` `## Test Failure Triage (both orchestrators — applies inside /develop)`; `grep -n -i "allow-list\|allowlist"` over the file returns nothing.
- `shared/resources/develop-pipeline-autonomous-defaults.md:69` "**Every time in that record is measured, never recalled.**" covers the subagent-dispatch record; Notes cells and the Step Transition Protocol are not named (`grep -n "Step Transition Protocol" shared/resources/*.md` shows it lives in the orchestrator `SKILL.md`, with action wording at `develop-pipeline-step-3-develop-loop.md:416`). The `Completed (UTC)` column is in `shared/resources/implementation-report-template.md` (task.201).
- `shared/resources/report-lint.js:234-246` has `qa-cycle-duplicated`: the same `### QA Cycle N` appearing twice. Measured on 2026-11-16 with a scratch report holding `### QA Cycle 2 — 2026-01-02` and `### QA Cycle 2 — qa-fix (5b)`: `command node shared/resources/report-lint.js --file <scratch> --json` returns exactly `qa-cycle-duplicated`. So the task.230 shape is already caught when the qa-fix heading reuses N. The gap is a suffixed heading that does not reuse N, and the missing H4 rule that tells the orchestrator what to write.
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:183` "Pre-step: Dispatch traceability mapper (standard mode only)" and `:244` "Log the bypass reason in the Decisions Log (`Traceability mapper skipped: {reason}`)": the line is prose-required, not lint-required. The develop-story dispatch has three bypass conditions (lite mode, no AC section, two or fewer ACs); develop-task has two (lite mode, no Success Criteria table).
- The `### QA Cycle {N} — {YYYY-MM-DD}` entry template is the fenced block at `develop-pipeline-step-5-6-qa-loop.md:487` (its rows: Gate Result, Issues Found, HIGH findings, MEDIUM findings, PR Review, Loop exit, Action). `implementation-report-template.md` does not define it (`grep -n "QA Cycle" shared/resources/implementation-report-template.md` hits only the Pipeline Progress cell text). `report-lint.js` reads `## ` sections from the template; its QA Cycle check is a hard-coded regex.
- Other writers of a `### QA Cycle` entry (`grep -rln "### QA Cycle" shared/resources`): the 5a step, the resume contract's back-fill, `accept-qa-residual.sh` / `.js`, `grant-qa-cycles.sh`, `reenter-qa-after-finalise.sh`, `qa-report-cycles.sh`, `resume-prompt-check.sh`. Tests pin entry shapes in `shared/resources/*.test.sh` and `evals/develop-next/unit/accept-qa-residual-merge-rule.test.mjs`; eval replay reports carry `### QA Cycle` entries with no new row.
- Task and story reports have no YAML frontmatter (only the bug variant does), so a `report_format:` frontmatter marker cannot exist for them.

### Target Architecture

- **Triage**: a result whose fix is "add an allow-list entry" is a design question about the new code. Fix the code; extend the allow-list only when the entry's justification names the line or `{placeholder}` that binds the value in that same block (obs #5).
- **Times**: every time in the report comes from `date -u` at the moment or a completion notice's `duration_ms`, else `(not measured)`; stated for Notes cells and the Decisions Log in the Step Transition Protocol wording and the autonomous-defaults text (obs #6).
- **Headings**: a qa-fix record is an H4 under its cycle's H3, stated at the QA-loop doc's `Invoke qa-fix` step; `report-lint.js` adds `qa-cycle-heading-suffix` for an H3 `### QA Cycle N` heading whose remainder names a qa-fix record or a step marker (matches `/qa-fix|\(5[abc]\)/i`). A separate count-mismatch code is dropped: duplicated N is already `qa-cycle-duplicated`, and a count over distinct N adds nothing the two codes miss. The bounded claim: the lint catches a suffixed H3 and a repeated N; it does not judge H4 content (obs #92).
- **Mapper**: the `### QA Cycle {N}` entry template in `develop-pipeline-step-5-6-qa-loop.md` carries a required `**Traceability**: mapped | skipped ({reason})` row. Lite mode and the other bypasses write `skipped (…)`, so the row is required on **every** cycle of a marked report, whatever the mode; the lint reports `traceability-missing` when it is absent and `traceability-reason-missing` when `skipped` has no parenthesised reason (obs #124). Every writer of a cycle entry carries it: the back-filled and accepted-residual entries write `skipped (run outside the loop)`.
- **Marker**: reports have no frontmatter, so the marker is a header-block line `**Report format**: 2` that the task and story variants of `implementation-report-template.md` write. The lint applies the Traceability check only to a report carrying it; every report written before this change lints as before.

### Important Clarifications

- The lint is the guard; prose alone has failed twice here.
- Task 276's budget fix counts distinct N, so it is correct whether or not this lands first.
- `report-lint.js` reads sections from the template; adding a row to the template must not make existing reports fail (the lint treats a missing row as a problem only for cycles written after the change, by a date or version marker the plan chooses).

---

## 4. Scope

### In Scope

✅ **Triage rule** text.
✅ **Time wording** in two docs.
✅ **QA Cycle heading** rule and its lint.
✅ **Traceability row** in the template and lint.
✅ **Tests** for the lint codes.

### Out of Scope

❌ **Rewriting past reports.**
❌ **The budget count** (task 276).

---

## 5. Breaking Changes

None - the lint rejects only reports written after the change (Phase 3 chooses the marker).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.277.plan.the-implementation-report-and-triage-say-what-happened.md](task.277.plan.the-implementation-report-and-triage-say-what-happened.md)

### Phase 1: The two prose rules

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-step-3-develop-loop.md`
- `shared/resources/develop-pipeline-autonomous-defaults.md`

**Changes**:
- [x] Triage rule (obs #5).
- [x] Measured-time wording for Notes cells and the Decisions Log (obs #6).

**Dependencies**: none.

---

### Phase 2: Headings and the mapper row

**Risk Level**: Medium

**Files**:
- `shared/resources/implementation-report-template.md` (the `**Report format**: 2` header line only)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (H4 rule; Traceability row in the cycle entry template)
- `shared/resources/report-lint.js`, its test
- the writers of a cycle entry named in Technical Background (`accept-qa-residual.*`, `grant-qa-cycles.sh`, `reenter-qa-after-finalise.sh`, the resume contract back-fill), each carried or confirmed unaffected by running its own test

**Changes**:
- [x] H4 rule and the `qa-cycle-heading-suffix` lint code (obs #92).
- [x] `**Traceability**` row, `traceability-missing` and `traceability-reason-missing` codes, applied only to reports marked `**Report format**: 2` (obs #124).

**Dependencies**: none.

---

### Phase 3: Marker, bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] The marker is decided (`**Report format**: 2`); `command npm run bundle`, `command npm run bundle -- --check`; run the lint over the existing accepted reports and record the count of problems before and after.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` - triage rule
2. ✅ `shared/resources/develop-pipeline-autonomous-defaults.md` - measured times
3. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - H4 rule at the qa-fix step, Traceability row in the cycle entry template
4. ✅ `shared/resources/implementation-report-template.md` - the `**Report format**: 2` header line (task and story variants)
5. ✅ `shared/resources/report-lint.js` - three new codes (`qa-cycle-heading-suffix`, `traceability-missing`, `traceability-reason-missing`)
5a. ✅ the cycle-entry writers (`accept-qa-residual.*`, `grant-qa-cycles.sh`, `reenter-qa-after-finalise.sh`, resume contract back-fill) - write `**Traceability**: skipped (run outside the loop)` where they create an entry

### Files to Modify (Tests)

6. ✅ `shared/resources/tests/report-lint.test.mjs` (exists; `FIX` points at `shared/resources/tests/fixtures/report-lint/`, with `corrupt-task117.md` and `green/`)

### Files to Modify (Generated)

7. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the lint codes and their controls.

**Actions**:
- [x] A report with `### QA Cycle 3 — qa-fix (5b)` (a distinct N) beside `### QA Cycle 2 — {date}` is flagged `qa-cycle-heading-suffix`; the reused-N shape stays flagged `qa-cycle-duplicated`; **control**: the same content with the qa-fix record as an H4 passes.
- [x] A marked (`**Report format**: 2`) cycle without the Traceability row is flagged; `mapped` and `skipped (reason)` pass; `skipped` with no reason is flagged; **control**: the same cycle in an unmarked report passes, and so does a lite-mode marked report whose rows read `skipped (lite mode)`.
- [x] The cycle-entry writers' own tests (`accept-qa-residual.test.sh`, `grant-qa-cycles.test.sh`, `reenter-qa-after-finalise.test.sh`, `qa-report-cycles.test.sh`, `resume-prompt-check.test.sh`, `evals/develop-next/unit/accept-qa-residual-merge-rule.test.mjs`) pass.
- [x] The existing green fixtures still lint clean.
- [x] Mutation proofs: remove each check; each turns one named test red.

**Command**: `CI=true command node --test shared/resources/tests/report-lint.test.mjs`

### Behavioural Evidence

Triage and time rules are prose; evidence is a fresh develop-loop session on a fixture whose fix would be an allow-list entry, with a control whose entry is justified by a binder line.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The lint flags the task.230 heading shape and a missing Traceability row, shown by named tests recorded in the QA report.
- [ ] The two prose rules are present in their docs; the greps are in the QA report.
- [ ] The triage rule in `develop-pipeline-step-3-develop-loop.md` names the justification exception (the binder line or `{placeholder}`); documentation criterion, shown by the grep and line number in the QA report. The fixture rehearsal (allow-list case fixed in code, justified-entry control accepted) is manual evidence in the QA report, not an acceptance gate.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each lint code has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `command node shared/resources/report-lint.js` over every accepted report reports no new problem (counts before and after in the QA report).

### Migration

- [ ] The marker (`**Report format**: 2`) is stated in the template and in `report-lint.js`'s header comment, and a report written before the change lints as before (counts in the QA report).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The lint blocks a boundary commit on an old report**
- **Risk**: an in-flight report fails after the change.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the marker exempts reports created before the change; the before/after count over accepted reports proves it.
- **Rollback**: revert the lint codes.

### Low Risk Areas

**1. Triage rule over-triggers**
- **Risk**: legitimate allow-list entries blocked.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the justification-names-the-binder exception.
- **Rollback**: edit the rule.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a pipeline boundary commit is refused by the lint on a healthy report
- the lint suite is red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one lint code misfires.

**Steps**:
1. Remove that code and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- the lint blocks a healthy run

**Non-Critical (Forward Fix)**:
- prose wording

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-16
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.277.qa.3.the-implementation-report-and-triage-say-what-happened.md](./task.277.qa.3.the-implementation-report-and-triage-say-what-happened.md)
- **Gate File**: [task.277.gate.3.the-implementation-report-and-triage-say-what-happened.yml](./task.277.gate.3.the-implementation-report-and-triage-say-what-happened.yml)

### Test Coverage Summary
- **Tests Executed**: 23 in the lint suite; full suite 8514, 0 failed
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 2's two fixes hold and are mutation-proven. One low finding is open: T277-4, the performance criterion, needs an owner decision.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                | Author      |
| ---------- | ------- | ---------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #5, #6, #92, #124    | create-task |
| 2026-11-16 | 1.1     | Review passed (8/10) — QA Cycle template location corrected, marker made a header line, count-mismatch code dropped, writers and AC scoped | review-task |
| 2026-11-16 |         | Status → ready-for-development                             | review-task |
| 2026-11-16 |         | Implemented — 11 source files plus bundled copies, 6 lint tests added | develop     |
| 2026-11-16 |         | QA gate CONCERNS (90/100) — 4 findings                     | qa-task     |
| 2026-11-16 |         | QA findings fixed — T277-1 to T277-3, 1 iteration; T277-4 awaits an owner decision | qa-fix      |
| 2026-11-16 |         | QA gate PASS (95/100) — 3 low findings                     | qa-task     |
| 2026-11-16 |         | QA findings fixed — T277-5, T277-6, 1 iteration (cycle 2); T277-4 awaits an owner decision | qa-fix      |
| 2026-11-16 |         | QA gate PASS (95/100) — 1 low finding (T277-4, owner decision) | qa-task     |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The two prose rules
- [x] Triage and times

### Phase 2: Headings and the mapper row
- [x] Template, docs, lint

### Phase 3: Marker, bundle and sweep
- [x] Before/after counts, bundle clean

---

## References

- Observation #5 — Guard-test allow-list extended to green a real unbound-read failure in new code
- Observation #6 — Orchestrator wrote recalled step times into the implementation report
- Observation #92 — QA Cycle heading count in the implementation report is unguarded
- Observation #124 — QA cycles skipped the traceability mapper with no logged reason

---

## Notes

### Important Reminders

Obs #6 is partly landed (autonomous-defaults `:69`); this task extends it to Notes cells and the Decisions Log.

### Future Improvements

None.

---

**Status:** Ready for Review
