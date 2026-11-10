---
id: task.297
title: "QA loop fast gate and an earlier structural move"
type: task
description: "Find why task.295's QA loop never ran the full fast suite after a fix, and make the loop's fast gate and its structural-move offer fire when they should."
tags: [develop-task, qa-task, qa-fix, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: QA loop fast gate and an earlier structural move

**Status:** Planned

Cut from observations #161 and #162.

---

## 1. Overview

On task.295 the QA loop gated five times, and the first full `ci:fast` run on the final tree came during `/finalise`. It found a hardcoded spawn timeout that QA fix 1 had introduced; the repo guard `tests/test-harness-concurrency.test.js` rejects it. Separately, the same mechanism (the per-branch container-name guard) drew a finding at gates 3, 4 and 5, and the structural move ("scope the claim") came only at the third.

**Scope:** find out why neither existing mechanism fired earlier, and fix the cause. **Deliverables:** a diagnosis, a fix for each, and a test per fix.

## 2. Motivation

- **The loop already has a fast gate.** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1263` runs `develop.fastGateCommand` (suggested value `npm run ci:fast`) each qa-fix cycle, and `docs/reference/configuration.md:101` marks the key REQUIRED. This repository's own `skills-config.yaml` carries no such key (grep returned nothing), so the gate may have been skipped as unconfigured on task.295. **Premise check (2026-11-10):**

- **Confirmed:** `skills-config.yaml` has no `develop:` block and no `fastGateCommand` (grep). The loop's step 0a (`develop-pipeline-step-5-6-qa-loop.md:1228`) runs the placeholder `<fastGateCommand>`; the develop loop's extraction treats an unset key as "skipped, never fail" (`develop-pipeline-step-3-develop-loop.md:283-286`), and the doc says so deliberately.
- **Unknown, and recorded nowhere:** whether step 0a ran in task.295's five cycles. The implementation report and QA reports contain no fast-gate line for any cycle. A full run did happen earlier (implementation report: run 6, 8353 tests, green) but before fix 1, which is what introduced the failing literal.
- **So:** the fix is not "add a gate", it exists. It is that an unset key skips the gate with no trace, which is exactly the case in this repo.
- **The structural-move offer already exists** at `skills/qa-fix/SKILL.md:636-658`, with a trigger "(b) a repeat subject" that is the author's judgement. On task.295 the offer fired late. **(unverified)** whether it fired and was declined, or did not fire.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- The fast gate: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1263`.
- The key's docs: `docs/reference/configuration.md:101`, `:290`.
- The move table and the "Narrowing residue / Move:" fix-summary shape: `skills/qa-fix/SKILL.md:641-658`.

**Target:** a loop that cannot silently skip its fast gate (it HALTs or names the skip in the QA report when the key is unset), and an offer whose trigger (b) is stated mechanically enough to fire at the second finding on one subject.

## 4. Scope

**In scope:** ✅ the diagnosis ✅ the fix in the shared step doc and in `skills/qa-fix/SKILL.md` ✅ tests for both.

**Out of scope:** ❌ the content of any one QA gate ❌ moves other than the offer's timing ❌ the slow test tier.

## 5. Breaking Changes

None expected. If the fix makes an unset `develop.fastGateCommand` a HALT, a consumer who never set it now has to; name that in the CHANGELOG.

## 6. Implementation Plan

### Phase 1: Diagnose — Risk: Low

- [ ] Read task.295's implementation report and QA reports to see whether the fast gate ran each cycle and whether the offer fired.
- [ ] The key check is done (unset in this repo). Remaining: whether the structural-move offer fired before cycle 3 of task.295, and why no cycle records a gate run. Also decide whether this repository should set `develop.fastGateCommand: npm run ci:fast` in `skills-config.yaml`, which may be the whole fix for the gate half.

### Phase 2: Fix the gate — Risk: Medium

**Files:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, the bundled copies (`npm run bundle`).

- [x] This repository now sets `develop.fastGateCommand: npm run ci:fast` in `skills-config.yaml` (done 2026-11-10, outside this task, so the next task in this repo is gated).
- [ ] The remaining generic fix: an unset key must leave a trace. The gate step records "fast gate skipped: develop.fastGateCommand unset" in the QA report (or HALTs), so a skip is visible to the reader of the gate.
- [ ] Say in the gate step that a per-file run is not the gate.

### Phase 3: Fix the offer — Risk: Low

**Files:** `skills/qa-fix/SKILL.md`.

- [ ] State trigger (b) as a rule over the gate files (a finding whose `file:` or section matches one the previous fix edited), so it needs no judgement, and fire at the second repeat.

### Phase 4: Tests and docs — Risk: Low

- [ ] A test per fix, mutation-proved; `CHANGELOG.md` entry.

## 7. Files Summary

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
2. ✅ `skills/qa-fix/SKILL.md`
3. ✅ bundled `references/` copies (generated by `npm run bundle`)
4. ✅ a test under `evals/shared/tests/` or `tests/`
5. ✅ `CHANGELOG.md`

## 8. Testing Strategy

A behaviour test that runs the loop's gate-resolution step with the key unset and asserts the outcome (not a grep of the prose). A fixture of two gates naming one subject asserts the offer's trigger. Mutation-prove both. Run the whole `npm run test:remote` after each fix, not only the new test (the lesson of task.295).

## 9. Success Criteria

**Functional**

- [ ] With `develop.fastGateCommand` unset, the loop's gate step HALTs or records the skip in the QA report; never passes silently. Held by a test.
- [ ] Two consecutive gates naming one subject trigger the offer. Held by a test.
- [ ] The diagnosis of task.295 is recorded in the QA report.

**Performance**

- [ ] No extra gate runs on a configured repository. Checked by the test's call count, not by timing.

**Code quality**

- [ ] `npm run bundle:check` and `npm run ci:fast` pass, the latter via `npm run test:remote`.
- [ ] Each fix is mutation-proved.

**Migration**

- [ ] `CHANGELOG.md` names the HALT, if one was added.

## 10. Risk Assessment

**High:** none.

**Medium:** a HALT on an unset key breaks consumers who relied on the silent skip. Mitigation: a clear message naming the key and the suggested value.

**Low:** the offer fires too often on a rule that is too wide. Mitigation: restrict the match to the same `file:` and the previous fix's edited files.

## 11. Rollback Plan

**Immediate:** revert the commit and re-run `npm run bundle`. **Partial:** the gate fix and the offer fix are independent. **Triggers:** Critical: a loop that HALTs on a correctly configured repository. Non-critical: wording.

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                                  | Author      |
| ---------- | ------- | -------------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft — cut from observations #161, #162 | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1 to 4

## References

- Observation #161 — QA loop never ran the full suite after a fix; a repo-wide guard surfaced only at finalise
- Observation #162 — Repeated gate findings on one mechanism should trigger the structural move at the second repeat
- task.295 implementation report and QA reports
