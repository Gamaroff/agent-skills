---
id: task.299
title: "Orchestration reads status and time from the instrument"
type: task
description: "Stop pipeline prose that reads a background step's exit code from a wrapped command or types a timestamp by hand."
tags: [develop-task, qa-task, observation]
category: refactoring
status: planned
priority: Low
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: Orchestration reads status and time from the instrument

**Status:** Planned

Cut from observation #164.

---

## 1. Overview

On task.295 a background command written as `cmd; echo exit=$?` reported the exit code of the whole compound, so a notification said "exit 0" for a run whose real step had failed. Separately, `updated:` values typed into gate files drifted from the real time and had to be re-read from `date -u`. This task finds where the pipeline prose teaches either habit and replaces it.

## 2. Motivation

A status or a time that comes from the line that wraps it, or from memory, is wrong silently. The user's own global rules already say a background task's exit code belongs to the whole compound command; the pipeline's prose should not teach the opposite.

## 3. Technical Background

**Current state:** unmeasured. Phase 1 measures it with two greps over `skills/`, `shared/resources/` and `docs/`: background blocks that end in `echo` after the real command, and instructions that tell the author to write a timestamp rather than run `date -u`. **(unverified)** until Phase 1 records the commands and counts.

**Target:** each hit either fixed (the step's own status is written to a file and read back; the time comes from `date -u` in the same block) or named as an exclusion with its reason.

## 4. Scope

**In scope:** ✅ the measurement ✅ the fixes in shipped prose and scripts ✅ a guard test over the measured population.

**Out of scope:** ❌ changing how the harness reports exit codes ❌ files outside the skills and shared resources.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1: Measure — Risk: Low

- [ ] Record the two grep commands, their counts and each hit as `path:line`, each classed as a fix or an exclusion with its witness.

### Phase 2: Fix — Risk: Medium

- [ ] For each background-status hit, write the step's own status to a file and read it. For each timestamp hit, take it from `date -u` in the same block.
- [ ] Edit sources under `shared/resources/` and `skills/`, then `npm run bundle`.

### Phase 3: Guard — Risk: Low

- [ ] A test that scans the same population with the recorded definition and fails on a new hit, with a non-vacuity floor so a broken scan cannot read as clean.

## 7. Files Summary

The list comes from Phase 1's measurement, not from recall: record the command and its count here when Phase 1 is done. Fixed files are `shared/resources/*.md`, `skills/*/SKILL.md` and their bundled copies; the guard is a new test.

## 8. Testing Strategy

Assert behaviour: a fixture block containing `cmd; echo exit=$?` is flagged and the corrected form is not. Mutation-prove the guard by reintroducing a hit. Run the whole suite through `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [ ] Phase 1's measurement (commands, counts, every hit classed) is recorded in the QA report.
- [ ] No unclassed hit remains; each is fixed or excluded with a reason.
- [ ] The guard flags a fixture hit and passes the fixed form.

**Performance**

- [ ] The guard adds under a few seconds to `ci:fast`: median of five runs with `uptime` beside each, outliers reported.

**Code quality**

- [ ] `npm run bundle:check`, `format:check`, `lint:shell` and `ci:fast` pass.

**Migration**

- [ ] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** none. **Medium:** a broad scan flags prose that legitimately shows the wrong form as a counter-example. Mitigation: the allowlist carries a reason per entry, and a non-vacuity floor. **Low:** bundled copies drift; run `npm run bundle`.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a guard that fails on unrelated work (Critical); an allowlist wording (non-critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft — cut from observation #164 | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phases 1 to 3

## References

- Observation #164 — Background exit codes and typed timestamps: read the instrument, not the wrapper
