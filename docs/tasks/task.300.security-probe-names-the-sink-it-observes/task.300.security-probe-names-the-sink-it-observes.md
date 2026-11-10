---
id: task.300
title: "security-probe names the sink it observes"
type: task
description: "Make a clean security-probe result say which sink class it could observe, so a command-line-flag boundary reaching a remote shell is not read as fully probed."
tags: [finalise, security-probe, observation]
category: refactoring
status: planned
priority: Low
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: security-probe names the sink it observes

**Status:** Planned

Cut from observation #165.

---

## 1. Overview

The `/finalise` probe plan for task.295 covered a command-line flag boundary (the `--run` and `--host` validators feeding a remote shell command) and reported 34 candidates, 0 reproduced. The runner decides "reproduced" by an observable sink; for a flag value that never reaches a sink it can observe, a clean score proves less than it reads as. This task makes the report say which sink the result could see.

**Premise check (2026-11-10, read `security-probe.mjs`):** the observation's mechanism was **wrong**, and the real gap is narrower.

- **Wrong:** "a flag value that never reaches a file sink cannot show as reproduced." For a validator, `computeVerdict` (`security-probe.mjs:1485-1500`) counts a hostile case as reproduced when the entry **accepts** it (`outcome === "accepted"`), whatever it later does. A refusal boundary such as the `--run` and `--host` validators is observed exactly as it should be: refused or accepted. For that boundary, "0 reproduced" is a true statement about the validator.
- **Right, and narrower:** what an accepted value does afterwards is not observed. The runner watches writes inside its sandbox, and states in a code comment that a write to an absolute path outside it "is not observed — a stated limit (TASK-180-016)" (`security-probe.mjs:271`). That limit lives in a source comment only. `skills/finalise/SKILL.md` § Probe Results (`:1103`) does not carry it into the DoD, so a reader of "34 candidates, 0 reproduced" does not see it. **Task.295's result was a true claim about refusal; it was not a claim about what the remote shell would do with an accepted value.**

**Re-scoped:** surface the stated limits (the out-of-sandbox write, and "effects after an accepted value are not observed") on the Probe Results line. Whether a per-entry "sink" field is still wanted is a decision for Phase 1, not a premise.

## 2. Motivation

A clean probe result is a claim about the sink it can observe. If the boundary's real sink is a remote shell, "0 reproduced" can only mean the observable sink stayed clean. Naming the sink beside the number keeps a DoD reader from over-trusting it.

## 3. Technical Background

**Current state (files grepped 2026-11-10):** `skills/finalise/references/security-probe.mjs`, `security-probe-plan.mjs` and `probe-boundary-signals.mjs` exist. How each decides "reproduced" is **(unverified)** until Phase 1.

**Target:** the run record states the sink classes the plan's entries use and marks a candidate set "sink not observable" when the entry's sink is not one the runner can see; the DoD's probe-results line carries that limit.

## 4. Scope

**In scope:** ✅ confirm the premise ✅ the record field and the DoD line ✅ tests.

**Out of scope:** ❌ adding a new observable sink (a separate, larger task) ❌ re-running task.295's probe.

## 5. Breaking Changes

A new field in the probe run record. Consumers that read the record must tolerate an extra field; Phase 1 greps for readers.

## 6. Implementation Plan

### Phase 1: Confirm — Risk: Low

- [ ] The premise check above is done. Phase 1 decides the shape: list every limit the runner's comments state (grep `stated limit` and `is not observed` in `security-probe.mjs`), and choose between a fixed "limits" line on the Probe Results and a per-entry field. Record the choice and its reason in the QA report.

### Phase 2: Record the sink — Risk: Medium

**Files:** `skills/finalise/references/security-probe.mjs` (edit the shared source it is bundled from, then `npm run bundle`)

- [ ] Add a per-entry sink class and a run-level "not observable" list to the record.

### Phase 3: Report it — Risk: Low

- [ ] The AC and security DoD text in `skills/finalise/SKILL.md` carries the limit on the Probe Results line.

### Phase 4: Tests — Risk: Low

- [ ] A fixture plan with an unobservable sink produces the field; one with an observable sink does not. Mutation-proved.

## 7. Files Summary

1. ✅ the probe runner (and its source under `shared/resources/` if that is where it lives; confirm in Phase 1)
2. ✅ `skills/finalise/SKILL.md`
3. ✅ a test, bundled copies, `CHANGELOG.md`

## 8. Testing Strategy

Behaviour fixtures over the runner's output, mutation-proved; the whole suite through `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [ ] Phase 1's finding on the premise is recorded in the QA report.
- [ ] A plan entry whose sink the runner cannot observe yields "sink not observable" in the record and the DoD line. Held by a test.
- [ ] An observable-sink entry is unchanged.

**Performance**

- [ ] No extra probe executions: the test counts the runs.

**Code quality**

- [ ] `npm run bundle:check`, `format:check` and `ci:fast` pass.

**Migration**

- [ ] `CHANGELOG.md` entry; readers of the record tolerate the new field.

## 10. Risk Assessment

**High:** none. **Medium:** the premise is wrong, and the task adds a field nobody needs. Mitigation: Phase 1 may close the task. **Low:** wording.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a reader of the record breaking on the new field (Critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft — cut from observation #165 | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phases 1 to 4

## References

- Observation #165 — A clean security-probe score does not name the sink it can observe
- task.295 DoD, probe results
