---
id: task.297
title: "QA loop fast gate and an earlier structural move"
type: task
description: "Find why task.295's QA loop never ran the full fast suite after a fix, and make the loop's fast gate and its structural-move offer fire when they should."
tags: [develop-task, qa-task, qa-fix, observation]
category: refactoring
status: accepted
priority: Medium
created: 2026-11-10
updated: 2026-11-13
completed_date: 2026-11-13
pr_number: 895
estimated_effort_hours: 4
---

# Technical Task: QA loop fast gate and an earlier structural move

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.297.review.1.qa-loop-fast-gate-and-earlier-structural-move.md` implemented 2026-11-13

Cut from observations #161 and #162.

---

## 1. Overview

On task.295 the QA loop gated five times, and the first full `ci:fast` run on the final tree came during `/finalise`. It found a hardcoded spawn timeout that QA fix 1 had introduced; the repo guard `tests/test-harness-concurrency.test.js` rejects it. Separately, the same mechanism (the per-branch container-name guard) drew a finding at gates 3, 4 and 5, and the structural move ("scope the claim") came only at the third.

**Scope:** find out why neither existing mechanism fired earlier, and fix the cause. **Deliverables:** a diagnosis, a fix for each, and a test per fix.

## 2. Motivation

- **The loop already has a fast gate.** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1263` runs `develop.fastGateCommand` (suggested value `npm run ci:fast`) each qa-fix cycle, and `docs/reference/configuration.md:101` marks the key REQUIRED. When task.295 ran, this repository's own `skills-config.yaml` carried no such key (historical: it was set on 2026-11-10, see Phase 2), so the gate may have been skipped as unconfigured on task.295. **Premise check (2026-11-10):**

- **Confirmed:** `skills-config.yaml` has no `develop:` block and no `fastGateCommand` (grep). The loop's step 0a (`develop-pipeline-step-5-6-qa-loop.md:1228`) runs the placeholder `<fastGateCommand>`; the develop loop's extraction treats an unset key as "skipped, never fail" (`develop-pipeline-step-3-develop-loop.md:283-286`), and the doc says so deliberately.
- **Unknown, and recorded nowhere:** whether step 0a ran in task.295's five cycles. The implementation report and QA reports contain no fast-gate line for any cycle. A full run did happen earlier (implementation report: run 6, 8353 tests, green) but before fix 1, which is what introduced the failing literal.
- **So:** the fix is not "add a gate", it exists. It is that an unset key skips the gate with no trace, which is exactly the case in this repo.
- **The structural-move offer already exists** at `skills/qa-fix/SKILL.md:636-658`, with a trigger "(b) a repeat subject" that is the author's judgement. On task.295 the offer fired late. **(unverified)** whether it fired and was declined, or did not fire.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- The fast gate: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1263`.
- The key's docs: `docs/reference/configuration.md:101`, `:290`.
- The move table and the "Narrowing residue / Move:" fix-summary shape: `skills/qa-fix/SKILL.md:641-658`.

**Target:** a loop that cannot silently skip its fast gate (when the key is unset it names the skip in the QA Iteration History line and the fix summary, and does not HALT), and an offer whose trigger (b) is computed by a script over the gate files and fires at the second consecutive gate naming one subject.

**Decisions (review 1, 2026-11-12):**

- **Trace, not HALT.** The develop loop's rule is "extracting nothing means skip, never fail" (`develop-pipeline-step-3-develop-loop.md`); a HALT would break every consumer that relied on the silent skip. The defect is the invisibility, so the fix is the trace.
- **"Subject" is the finding's `file:` field.** A repeat subject is a finding in gate N whose `file:` appears in gate N-1 and is among the files fix N-1 changed (`git diff --name-only` of that fix commit).
- **Executable homes.** Neither rule may live only in prose: a table cell or paragraph cannot be run, so its test would pass with the fix reverted. The unset-key decision goes into `shared/resources/fast-gate-outcome.sh` (the one definition 5b step 0a and develop-bug step 3a already call); trigger (b) goes into a new script beside it.

## 4. Scope

**In scope:** ✅ the diagnosis ✅ the fix in the shared step doc and in `skills/qa-fix/SKILL.md` ✅ tests for both.

**Out of scope:** ❌ the content of any one QA gate ❌ moves other than the offer's timing ❌ the slow test tier.

## 5. Breaking Changes

None. An unset `develop.fastGateCommand` stays a skip (decision: trace, not HALT), now recorded in the QA Iteration History line and the fix summary. The CHANGELOG entry says so.

## 6. Implementation Plan

### Phase 1: Diagnose — Risk: Low

- [x] Read task.295's implementation report and QA reports to see whether the fast gate ran each cycle and whether the offer fired. (Review 1 found no `Fast gate` line in any of them: `grep -n 'Fast gate' docs/tasks/task.295.*/task.295.qa.*.md docs/tasks/task.295.*/task.295.implementation.1.*.md` returns nothing. That fits both "key unset" and "gate green, which leaves no trace"; the diagnosis must say which.)
- [x] The key check is done (unset in this repo when task.295 ran). Remaining: whether the structural-move offer fired before cycle 3 of task.295, and why no cycle records a gate run. The setting decision is made (see Phase 2).
- [x] Write the answers as a `## Diagnosis` section of this task document, one paragraph per question. It is committed with the work, and the QA report cites it.

### Phase 2: Fix the gate — Risk: Medium

**Files:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/fast-gate-outcome.sh`, the bundled copies (`npm run bundle`).

- [x] This repository now sets `develop.fastGateCommand: npm run ci:fast` in `skills-config.yaml` (done 2026-11-10, outside this task, so the next task in this repo is gated).
- [x] The generic fix: an unset or empty key must leave a trace. Extend `fast-gate-outcome.sh` with a `--command <value>` argument; an empty value prints `GATE_OUTCOME=skipped (develop.fastGateCommand unset)` and exits 0. Step 0a calls it before running anything and, on `skipped`, records `Fast gate: skipped (develop.fastGateCommand unset)` as the QA Iteration History line and in the fix summary, and does not run the gate. A key that is set behaves exactly as before. This is the executable home the test runs; do not state the rule only in a table or paragraph.
- [x] Say in the gate step that a per-file run is not the gate.
- [x] Step 0a's text changes, so re-run and update the four tests that read it (Files Summary item 6).

### Phase 3: Fix the offer — Risk: Low

**Files:** `skills/qa-fix/SKILL.md`, a new script `shared/resources/repeat-subject.mjs` (bundled into `qa-fix` as `references/repeat-subject.mjs`, cited from `SKILL.md` so the bundler reaches it).

- [x] Replace trigger (b)'s "your judgement" with a call to `repeat-subject.mjs`. Inputs: the current gate file, the previous gate file, and the files the previous fix commit changed. Output: the `file:` values that appear in both gates and in that changed-file list (the repeat subjects), as JSON. A non-empty list means the offer fires; trigger (a) is unchanged.
- [x] The rule is the script, so the offer fires at the second consecutive gate naming one subject and needs no judgement.

### Phase 4: Tests and docs — Risk: Low

- [x] A test per fix, mutation-proved: the unset-key case extends `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs` (it already runs `fast-gate-outcome.sh`); the repeat-subject rule gets its own test file under `evals/shared/tests/`. Confirm `package.json`'s `test:suite` glob reaches the new file, or list the runner edit.
- [x] `CHANGELOG.md` entry stating that an unset key is still a skip, now visible.

## 7. Files Summary

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
2. ✅ `shared/resources/fast-gate-outcome.sh` (the unset-key outcome)
3. ✅ `shared/resources/repeat-subject.mjs` (new: trigger (b) as a rule)
4. ✅ `skills/qa-fix/SKILL.md`
5. ✅ bundled `references/` copies (generated by `npm run bundle`)
6. ✅ tests that read step 0a, to re-run and update: `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`, `evals/shared/tests/fast-gate-precondition.test.mjs`, `shared/resources/tests/qa-loop-stage-before-gate.test.mjs`, `tests/executable-instructions.test.js` (found with `git grep -ln 'fastGateCommand\|Fast gate:' -- 'tests/**' 'evals/**' '*.test.*'`)
7. ✅ a new test file under `evals/shared/tests/` for `repeat-subject.mjs`
8. ✅ `CHANGELOG.md`

## 8. Testing Strategy

A behaviour test that runs `fast-gate-outcome.sh` (as step 0a calls it) with the command unset and asserts `GATE_OUTCOME=skipped`, and with a command set asserts the old outcomes unchanged (not a grep of the prose). A fixture of two gates naming one `file:`, plus a control pair that names different files and a pair whose shared file the previous fix did not edit, asserts `repeat-subject.mjs` fires on the first and stays silent on the controls. Mutation-prove both: revert the empty-command branch, and revert the changed-files intersection, and see a test go red. Run the whole `npm run test:remote` after each fix, not only the new test (the lesson of task.295).

## 9. Success Criteria

**Functional**

- [x] With `develop.fastGateCommand` unset, step 0a records `Fast gate: skipped (develop.fastGateCommand unset)` in the QA Iteration History line and does not run the gate; it never passes silently. Held by the extended `qa-loop-fast-gate-outcomes.test.mjs`.
- [x] Two consecutive gates naming one `file:` that the previous fix edited trigger the offer; a pair naming different files, or a shared file the fix did not edit, does not. Held by the `repeat-subject.mjs` test.
- [x] The diagnosis of task.295 is recorded in the `## Diagnosis` section of this task document.

**Performance**

- [x] No extra gate runs on a configured repository. Checked by the test's call count, not by timing.

**Code quality**

- [x] `npm run bundle:check` and `npm run ci:fast` pass, the latter via `npm run test:remote`.
- [x] Each fix is mutation-proved.

**Migration**

- [x] `CHANGELOG.md` states that an unset `develop.fastGateCommand` is still a skip, now recorded.

## 10. Risk Assessment

**High:** none.

**Medium:** none. The HALT option was rejected (review 1) because it breaks consumers who relied on the silent skip.

**Low:** the offer fires too often on a rule that is too wide. Mitigation: `repeat-subject.mjs` intersects the two gates' `file:` values with the previous fix's changed files, and the test holds two control pairs. Also low: a new script is a bundled resource; `npm run bundle:check` and `tests/executable-instructions.test.js` catch an unreached or unextractable copy.

## 11. Rollback Plan

**Immediate:** revert the commit and re-run `npm run bundle`. **Partial:** the gate fix and the offer fix are independent. **Triggers:** Critical: a loop that HALTs on a correctly configured repository. Non-critical: wording.

---

## Diagnosis

Written at develop (2026-11-13) from task.295's implementation report, its five QA reports, its five gates and its DoD.

**Did the fast gate run after each fix?** There is no evidence that it did, and the cause is the unset key. Step 0a runs the literal `<fastGateCommand>`, and when task.295 ran, `skills-config.yaml` had no `develop:` block (confirmed 2026-11-10), so the gate was skipped by the rule "extracting nothing means skip, never fail" with no line recorded. `grep -n -i 'fast gate' docs/tasks/task.295.*/task.295.implementation.1.*.md docs/tasks/task.295.*/task.295.qa.*.md` finds nothing; the cycle entries record only per-file runs ("Guard test added (8/8 pass)" for fix 1, "Guard tests 13 to 17" for fix 3). The first full `ci:fast` on the final tree came during `/finalise` (qa.5 line 106, DoD "Deviation recorded"), and found the hardcoded spawn timeout that fix 1 introduced, which `tests/test-harness-concurrency.test.js` rejects. A green gate also leaves no trace today, so absence of a line cannot tell "ran green" from "not configured"; that is why the fix records the skipped case explicitly and why a per-file run is now stated not to be the gate.

**Did the structural-move offer fire before the cycle that took it?** The move was taken at fix 4 (implementation report: "third gate on this mechanism ... so the claim was scoped, not patched again (Step 2.6, scope the claim)"), after gates 2, 3 and 4 had each named the mechanism. Nothing in the implementation report or the QA reports shows the offer being made or declined earlier, and trigger (b) was "your judgement", so there was no rule to fire. Replaying the new rule over the real gates and fix commits (`repeat-subject.mjs --current gate.N --previous gate.N-1 --fix-commit <fix N-1>`): gate 2 vs 1 with `7dd8e0a8`, gate 3 vs 2 with `5548cf09` and gate 4 vs 3 with `3502406d` each return `scripts/remote-test/run.sh`; gate 5 vs 4 with `510da7e9` returns nothing, because gate 5's only finding was in `docs/contributing/testing-remote.md`. So the rule would have offered at gate 2, one gate earlier than the plan's "second repeat" reading, and the cost is that a file is a coarse subject here: task.295 was mostly one file, so every finding named it. This is recorded as a limit, not hidden. The offer only offers (it exits nothing and forbids nothing), so an early offer costs one paragraph in the fix plan; narrowing the subject to a finding's section or function is out of scope and would need a field the gates do not carry.

**Decision on the setting:** this repository now sets `develop.fastGateCommand: npm run ci:fast` (2026-11-10, outside this task), so the next task here is gated; the generic fix covers every consumer that leaves it unset.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-13
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.297.qa.1.qa-loop-fast-gate-and-earlier-structural-move.md](./task.297.qa.1.qa-loop-fast-gate-and-earlier-structural-move.md)
- **Gate File**: [task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml](./task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml)

### Test Coverage Summary
- **Tests Executed**: 40 targeted; ci:fast 8445 pass, 0 fail
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues. Two LOW cleanups are recorded in the gate's future recommendations.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.297.qa.1.qa-loop-fast-gate-and-earlier-structural-move.md`
**Gate File**: `task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** all 7 met, with code and test evidence cited for each
✅ **Tests and CI:** `ci:fast` 8445 pass on the LAN server; CI reading 1 SUCCESS across 6 checks on `cd794da4`
✅ **PR Review:** PR #895; the 5c conformance review is CONCERNS with one medium finding (the missing `pr_number`), cleared by this acceptance
✅ **Documentation:** the QA-loop step document, `skills/qa-fix/SKILL.md` and the bundled copies updated
✅ **Security Review:** ✅ PASS. The probe plan executed 27 cases against `repeat-subject.mjs` and `fast-gate-outcome.sh --command`; none reproduced. Two low recommendations for the owner (a Unicode-blank command, and a leading-dash `--fix-commit` value) are in the DoD file.
⚠️ **Compliance Review:** not applicable (internal tooling, no data, payment, UI or health features)

**Detailed Verification Log:** See `task.297.dod.1.qa-loop-fast-gate-and-earlier-structural-move.md` for the full evidence.

**Task marked as ACCEPTED on:** 2026-11-13

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-10 | 1.0     | Initial draft — cut from observations #161, #162 | create-task |
| 2026-11-13 | 1.1     | Review passed (8/10) — decided trace not HALT, gave both rules a script home, listed the four tests that read step 0a, moved the diagnosis into this document | review-task |
| 2026-11-13 |         | Status → ready-for-development | review-task |
| 2026-11-13 | 1.2     | Implemented: `--command` mode in `fast-gate-outcome.sh` and step 0a trace; `repeat-subject.mjs` and qa-fix trigger (b); tests mutation-proved; Diagnosis added; status → ready-for-review | develop |
| 2026-11-13 |         | QA gate PASS (100/100) — 0 findings, 2 LOW cleanups | qa-task |
| 2026-11-13 | 1.3 | DoD passed — accepted (PR #895) | finalise |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1 to 4

## References

- Observation #161 — QA loop never ran the full suite after a fix; a repo-wide guard surfaced only at finalise
- Observation #162 — Repeated gate findings on one mechanism should trigger the structural move at the second repeat
- task.295 implementation report and QA reports
