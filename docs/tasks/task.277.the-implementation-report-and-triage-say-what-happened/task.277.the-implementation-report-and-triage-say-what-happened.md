---
id: task.277
title: "The implementation report and triage say what happened"
type: task
description: "Close four develop-pipeline honesty gaps: a guard allow-list entry is not a fix for new code, report times are measured, qa-fix records are H4 under their cycle, and the traceability mapper decision is a required line."
tags: [develop-task, develop-story, develop-bug, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 8
---

# Task 277: The implementation report and triage say what happened

**Status:** Planned

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
- `shared/resources/report-lint.js:242` has `qa-cycle-duplicated`: the same `### QA Cycle N` appearing twice. It does not reject a suffix such as `— qa-fix` on an H3, and a qa-fix heading with a distinct N would pass `(unverified: the plan runs the task.230 shape through the linter)`.
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:183` "Pre-step: Dispatch traceability mapper (standard mode only)" and `:244` "Log the bypass reason in the Decisions Log (`Traceability mapper skipped: {reason}`)": the line is prose-required, not lint-required.
- `shared/resources/implementation-report-template.md` defines the `### QA Cycle {N}` template; `report-lint.js` reads its sections from there (the one definition).

### Target Architecture

- **Triage**: a result whose fix is "add an allow-list entry" is a design question about the new code. Fix the code; extend the allow-list only when the entry's justification names the line or `{placeholder}` that binds the value in that same block (obs #5).
- **Times**: every time in the report comes from `date -u` at the moment or a completion notice's `duration_ms`, else `(not measured)`; stated for Notes cells and the Decisions Log in the Step Transition Protocol wording and the autonomous-defaults text (obs #6).
- **Headings**: a qa-fix record is an H4 under its cycle's H3, stated in the QA-loop doc; `report-lint.js` rejects an H3 `QA|Verify Cycle` heading carrying a suffix and a count of H3 cycle headings that differs from the distinct N (obs #92).
- **Mapper**: the `### QA Cycle {N}` template carries a required `**Traceability**: mapped | skipped ({reason})` row; the lint reports `traceability-missing` when a standard-mode report's cycle lacks it (obs #124).

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
- [ ] Triage rule (obs #5).
- [ ] Measured-time wording for Notes cells and the Decisions Log (obs #6).

**Dependencies**: none.

---

### Phase 2: Headings and the mapper row

**Risk Level**: Medium

**Files**:
- `shared/resources/implementation-report-template.md`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- `shared/resources/report-lint.js`, its test

**Changes**:
- [ ] H4 rule and `heading-suffix` / count lint codes (obs #92).
- [ ] `**Traceability**` row and `traceability-missing` code (obs #124).

**Dependencies**: none.

---

### Phase 3: Marker, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Choose the marker that exempts older reports; `command npm run bundle`, `command npm run bundle -- --check`; run the lint over the existing accepted reports and record the count of problems before and after.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` - triage rule
2. ✅ `shared/resources/develop-pipeline-autonomous-defaults.md` - measured times
3. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - H4 rule, mapper row
4. ✅ `shared/resources/implementation-report-template.md` - the row
5. ✅ `shared/resources/report-lint.js` - two new codes

### Files to Modify (Tests)

6. ✅ `shared/resources/tests/report-lint.test.mjs` `(unverified: the plan confirms the file name)` and the fixtures under `shared/resources/tests/fixtures/report-lint/`

### Files to Modify (Generated)

7. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the lint codes and their controls.

**Actions**:
- [ ] A report with `### QA Cycle 2 — qa-fix (5b)` beside `### QA Cycle 2 — {date}` is flagged; **control**: the same content with the qa-fix record as an H4 passes.
- [ ] A standard-mode cycle without the Traceability row is flagged; one with `skipped (reason)` passes; a lite-mode report is not flagged.
- [ ] The existing green fixtures still lint clean.
- [ ] Mutation proofs: remove each check; each turns one named test red.

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
- [ ] The triage fixture is fixed in code and the control is accepted, recorded in the QA report.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each lint code has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `command node shared/resources/report-lint.js` over every accepted report reports no new problem (counts before and after in the QA report).

### Migration

- [ ] The marker choice is stated in the template and in `report-lint.js`.

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

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                | Author      |
| ---------- | ------- | ---------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #5, #6, #92, #124    | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The two prose rules
- [ ] Triage and times

### Phase 2: Headings and the mapper row
- [ ] Template, docs, lint

### Phase 3: Marker, bundle and sweep
- [ ] Before/after counts, bundle clean

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

**Status:** Planned
