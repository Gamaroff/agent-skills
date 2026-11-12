---
id: task.306
title: "Probe sandbox HOME shared across cases"
type: task
description: "A legitimate case on a state-changing control reads as a defect in the /finalise security probe, because every case and shell shares one sandbox HOME."
tags: [finalise, security-probe, shell, sandbox]
category: testing
status: planned
priority: Low
created: 2026-11-12
updated: 2026-11-12
estimated_effort_hours: 4
---

# Technical Task: Probe sandbox HOME shared across cases

**Status:** Planned

---

## 1. Overview

The `/finalise` security probe runs each case under bash and then zsh in one sandbox. Both shells get the same `HOME`, so a legitimate case on a control that changes state (task.296's `lockctl.sh take`) leaves that state behind. The zsh run then sees the bash run's state and reads the case as refused, and the write under the sandbox `HOME` is counted as an escape. This task gives each (case, shell) run its own `HOME` and `TMPDIR`, so state cannot carry from one run to the next.

**Scope**: the probe engine (`shared/resources/security-probe.mjs`), its tests, and the planning prompt (`shared/resources/finalise-dod-security-prompt.md`) where it tells agents how to plan such a control. One small audit of `$(( ))` on validated digit strings is included as a separate phase.

---

## 2. Motivation

### Current Problems

1. **A correct control reads as a defect.** On task.296 the first DoD probe run reported 2 reproduced and 2 escaped (32 executed). Both were legitimate `take` cases. A fresh `HOME` under zsh takes the lock (exit 0), and a second `take` on the same `HOME` gets exit 10, so the code was right and the sandbox was wrong.
2. **The workaround costs a check.** Task.296 made the `take` entries hostile-only. Its record now holds no legitimate-input case for `take`, and its DoD says so.
3. **The wrong reading is quiet.** "Reproduced" reads as a code defect to anyone who does not know the cause. The trap is written up in `docs/contributing/traps.md`, which is a workaround for a tool that should not need one.

### Benefits of One HOME per Run

1. **Legitimate cases on state-changing controls can be probed**, so the record holds the case instead of a stated limit.
2. **No false "escaped" from a control's own state.**
3. **A shell's result no longer depends on which shell ran first.**
4. **The planning prompt needs no special rule** for state-changing controls, or a shorter one.

---

## 3. Technical Background

### Current Architecture

- One sandbox per run: `sandboxHome = join(sandboxRoot, "home")` and `sandboxTmp = join(sandboxRoot, "tmp")`, created once (`shared/resources/security-probe.mjs:2123`, `:2124`).
- Each (case, shell) run gets its own fixture directory (`materialiseFixture` in `runShellArgvCase`, `security-probe.mjs:3540`; the comment at `:3536` says why: "a side effect from the bash run must not be read as one from the zsh run"). The fixture directory lives under the work dir.
- `HOME` and `TMPDIR` are the shared ones: `caseShellEnv(...)` takes `sandboxHome` and `sandboxTmp` (`security-probe.mjs:3297`), and `runShellArgvCase` passes the run-wide values (`:3552`).
- The escape watch snapshots the sandbox root and skips only the work dir: `snapshotTree(sandboxRoot, workDirName)` (`security-probe.mjs:2230`, `:2255`, `:2652`, `:2670`). A write under `sandboxRoot/home` is therefore reported as an escape.
- That is deliberate for hostile input: a test asserts a stray write to the sandbox `HOME` errors a setup (`shared/resources/tests/security-probe.test.mjs:8878`).

### Target Architecture

- `HOME` and `TMPDIR` become a per-(case, shell) pair under the case's fixture directory (inside the work dir, so the watch skips them), created before the setup runs and removed with the fixture.
- The escape watch keeps watching the run-wide sandbox root, so a write to a path outside the case's own `HOME` is still an escape. Only a write inside the case's own `HOME` and `TMPDIR` stops counting.
- Open decision for the author (see Phase 1): whether a write inside the case's own `HOME` should still be reported for a **hostile** case. A hostile case that writes under `HOME` is exactly the escape the watch exists to catch, so the likely answer is "report it for hostile cases, not for legitimate ones".

### Important Clarifications

- I read the engine to confirm the cause. I have not run the fix, and I have not read the `cli:` and `fence:` arms' HOME handling beyond the grep hits (`security-probe.mjs:2161`, `:2182`, `:2202`, `:2221` pass `sandboxHome`). Phase 1 measures all arms before changing any.
- `shared/resources/security-probe.mjs` is the source. Four skills carry generated copies (`skills/{finalise,qa-story,qa-task,review-security}/references/`). Edit the source and run `npm run bundle`.

---

## 4. Scope

### In Scope

✅ **Engine**: a per-(case, shell) `HOME` and `TMPDIR` for the shell arms that take a state-changing control (`shell:`, `shell-fn:`, `shell-argv:`, `fence:`), and the escape rule for the case's own `HOME`.
✅ **Tests**: a legitimate state-changing case that passes under bash then zsh, and a hostile write under `HOME` that is still reported.
✅ **Prompt**: `finalise-dod-security-prompt.md` loses or shortens any advice that existed only to dodge the shared `HOME`.
✅ **Audit** (Phase 4): `$(( ))` on validated digit strings in tracked shell, reported as a list.

### Out of Scope

❌ Changing what counts as an escape outside the sandbox root.
❌ The `cli:` arm, unless Phase 1 shows it shares the problem. If it does, it is a follow-up task, not a silent addition.
❌ Re-running task.296's probe. Its record stands as it was.

---

## 5. Breaking Changes

None. A probe plan that ran before still runs. A record can differ in one way: a legitimate case that wrote under the shared `HOME` and was counted as an escape is no longer counted.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.306.plan.probe-sandbox-home-shared-across-cases.md](task.306.plan.probe-sandbox-home-shared-across-cases.md)

### Phase 1: Measure and decide

**Risk Level**: Low

**Files**:
- `shared/resources/security-probe.mjs` (read only)

**Changes**:
- [ ] Reproduce the fault on a fixture: a shell script that creates a lock directory under `$HOME` and exits 10 if it exists, run as a legitimate case. Expect `reproduced` or `rejected` for the zsh run today.
- [ ] Read how the `cli:` and `fence:` arms build `HOME` and say whether each shares the fault.
- [ ] Decide the escape rule for a write inside the case's own `HOME` (legitimate: not an escape; hostile: still reported, or not). Record the decision in the task's Change Log.

**Dependencies**: none.

---

### Phase 2: Per-run HOME and TMPDIR

**Risk Level**: Medium

**Files**:
- `shared/resources/security-probe.mjs`

**Changes**:
- [ ] Create `home` and `tmp` under each (case, shell) fixture directory, and pass them as `HOME` and `TMPDIR` through the one definition, `caseShellEnv`.
- [ ] Apply the Phase 1 escape rule.
- [ ] Run `npm run bundle` and commit the four generated copies.

**Dependencies**: Phase 1.

---

### Phase 3: Tests and prompt

**Risk Level**: Low

**Files**:
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/finalise-dod-security-prompt.md`

**Changes**:
- [ ] Test: the Phase 1 fixture as a legitimate case passes under bash and zsh with 0 escapes.
- [ ] Test: a hostile case that writes under its `HOME` is still reported, with the Phase 1 rule.
- [ ] Mutation-prove both: restore the shared `HOME` and confirm the first goes red; remove the report and confirm the second goes red.
- [ ] Prompt: drop or shorten the hostile-only advice for state-changing controls if the engine now handles it.

**Dependencies**: Phase 2.

---

### Phase 4: `$(( ))` audit (optional, report only)

**Risk Level**: Low

**Files**:
- tracked `*.sh` under `scripts/`, `shared/resources/` and `skills/*/scripts/`

**Changes**:
- [ ] List each `$(( ))` that takes a value read from a file, a command or an argument without `10#`, and say whether a length cap guards it. Fix none here; file a follow-up task per real hit.

**Dependencies**: none.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe.mjs` - per-run `HOME`/`TMPDIR`, escape rule.
2. ✅ `skills/finalise/references/security-probe.mjs`, `skills/qa-story/references/security-probe.mjs`, `skills/qa-task/references/security-probe.mjs`, `skills/review-security/references/security-probe.mjs` - generated by `npm run bundle`. Measured with `git ls-files | grep -E '(^|/)security-probe\.mjs$'` (5 files: the source and 4 copies).

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/security-probe.test.mjs` - the two new cases.

### Files to Modify (Documentation)

4. ✅ `shared/resources/finalise-dod-security-prompt.md` (and its generated copies in `skills/{finalise,qa-story,qa-task}/references/`; measured with `git ls-files | grep finalise-dod-security-prompt`).
5. ✅ `docs/contributing/traps.md` - drop or shorten the entry "A legitimate case on a state-changing control..." once fixed.
6. ✅ `CHANGELOG.md` - one line under `[Unreleased]` citing task 306.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the probe engine's shell arms.

**Actions**:
- [ ] A legitimate state-changing case passes under bash then zsh, 0 escapes.
- [ ] A hostile case that writes under its own `HOME` is reported (per the Phase 1 rule).
- [ ] A write outside the case's `HOME` and outside the work dir is still an escape.
- [ ] Each of the three new tests goes red when its behaviour is reverted (mutation-proof).

**Command**: `npm run test:remote -- --run ci:fast` (LAN server first; run under `CI=true` before pushing).

**Target**: the whole `security-probe` suite stays green, including `:8878`.

### Integration Tests

**Scope**: re-run the task.296 plan with its two `take` entries restored to legitimate, as a one-off check, and expect 0 reproduced and 0 escaped. Report the result in the QA report.

### Performance Tests

Not applicable. A per-run `mkdir` pair is negligible; the QA report states the suite's wall time before and after, median of five runs with `uptime` beside each.

---

## 9. Success Criteria

### Functional

- [ ] A legitimate `take`-style case (creates state under `$HOME`, refuses a second take) passes under bash and zsh with 0 escapes.
- [ ] A hostile case that writes under its `HOME` is still reported, as decided in Phase 1.
- [ ] A write outside the case's `HOME` and outside the work dir is still an escape.
- [ ] No existing `security-probe` test changes its assertion, except any that asserted the shared `HOME` itself (named in the QA report).
- [ ] The task.296 plan with its `take` entries legitimate reads 0 reproduced and 0 escaped; the figure is recorded in the QA report.

### Performance

- [ ] The probe suite's wall time is within noise of its prior median (five runs, `uptime` recorded, outliers reported), recorded in the QA report.

### Code Quality

- [ ] `npm run bundle:check` passes (the four copies match the source).
- [ ] `CI=true` run of the suite is green.
- [ ] Every validation command the coding standards name for the files this task touches.

### Migration

- [ ] `CHANGELOG.md` cites task 306.
- [ ] The traps entry is removed or shortened to match.
- [ ] Phase 4's list is in the QA report; each real hit is a filed follow-up or a stated exclusion.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

**1. A write the watch used to catch is now missed**
- **Risk**: moving `HOME` into the work dir hides a hostile write to `$HOME` from the escape watch.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the Phase 1 rule keeps reporting a hostile write under the case's `HOME`; a test holds it.
- **Rollback**: revert Phase 2.

### Low Risk Areas

**1. A fixture that expects the old `HOME` path**
- **Risk**: a test or plan assumes `sandboxRoot/home`.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: grep for `sandboxRoot, "home"` and the `:8878` test before the change.
- **Rollback**: revert Phase 2.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The suite goes red on a test Phase 1 did not predict.
- A hostile write to `HOME` stops being reported.

**Steps**:
1. Revert the Phase 2 commit on `shared/resources/security-probe.mjs`.
2. Run `npm run bundle` to restore the four copies.

**Verification**: `npm run bundle:check` and the `security-probe` suite are green.

### Partial Rollback (1-2 hours)

**When to Use**: Phase 2 is sound but the prompt change in Phase 3 misleads agents.
**Steps**: revert only the prompt edit; keep the engine change.

### Forward Fix (< 4 hours)

**When to Use**: the engine change is right and one test needs its assertion corrected.
**Approach**: fix forward.

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A hostile escape stops being reported.

**Non-Critical (Forward Fix)**:
- A wording problem in the prompt or the traps entry.

---

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-12 | 1.0 | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Measure and decide
- [ ] Phase 2: Per-run HOME and TMPDIR
- [ ] Phase 3: Tests and prompt
- [ ] Phase 4: `$(( ))` audit

---

## References

- Found on task.296 (2026-11-12): `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.dod.1.test-remote-per-run-lock-and-image-prune.md`, Step 3 (Probe Results).
- Workaround and symptoms: `docs/contributing/traps.md`, entry "A legitimate case on a state-changing control reads as a defect in the `/finalise` probe".
