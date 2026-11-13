---
id: task.300
title: "security-probe names the sink it observes"
type: task
description: "Make a clean security-probe result say which sink class it could observe, so a command-line-flag boundary reaching a remote shell is not read as fully probed."
tags: [finalise, security-probe, observation]
category: refactoring
status: ready-for-review
pr_number: 896
priority: Low
created: 2026-11-10
updated: 2026-11-13
estimated_effort_hours: 4
---

# Technical Task: security-probe names the sink it observes

**Status:** Ready for Review

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

- [x] The premise check above is done. Phase 1 decides the shape: list every limit the runner's comments state (grep `stated limit` and `is not observed` in `shared/resources/security-probe.mjs`; `shared/resources/probe-boundary-rule.md` §5 states the same limits in prose), and choose between a fixed "limits" line on the Probe Results and a per-entry field. Record the choice and its reason in the QA report.
- [x] **Name the deciding input** (review.1, I-1). The runner cannot see what a target does with an accepted value, so "this entry's sink is unobservable" cannot be computed from the target. The inputs it does have are the **entry form** (`module`, `shell:`, `shell-fn:`, `cli:`, `shell-argv:`, `fence:`) and the case verdicts. Recommended shape: a **fixed, run-level `observation_limits` list** whose members are chosen by entry form (for example `fence:` adds "a write to an absolute path outside the sandbox is not observed"; every form carries "effects after an accepted value are not observed"). Choose a per-entry field only if Phase 1 finds an input that decides it.
- [x] **Do not call the new field `sink`** (review.1, I-2). `sink` already means the corpus input class (`--sink`, `SINKS`, `c.sink`). Use `observation_limits` / `not_observed`.

### Phase 2: Record the limits — Risk: Medium

**Files:** `shared/resources/security-probe.mjs` (the source; `npm run bundle` copies it to `skills/finalise`, `skills/qa-story`, `skills/qa-task` and `skills/review-security` under `references/`)

- [x] Add the run-level `observation_limits` list to the record. The limit **text lives once**, as an exported constant in the runner; `probe-boundary-rule.md` §5 and the Probe Results line cite it and never restate it (review.1, I-3).
- [x] `readRecord()` (and so `security-probe-plan.mjs`, which reads `probes_executed` through it) tolerates the field. Readers named: `shared/resources/security-probe-plan.mjs`, `shared/resources/tests/security-probe-plan-cases-file.test.mjs`, `shared/resources/tests/read-only-agent-writes.test.mjs`, `evals/shared/tests/probes-executed-population.test.mjs`.

### Phase 3: Report it — Risk: Low

- [x] The security DoD text in `skills/finalise/SKILL.md` § Probe Results carries the limits on the line that reads `**Candidates executed:** … — **reproduced:** …`. `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` pins that block (the `### Probe Results` heading, `**Candidates executed:** {security_result.probes_executed`, `{if}` / `{endif}` balance, and each verdict token's occurrence count). Edit with those pins read first, and update the pins the edit legitimately moves (review.1, I-3).

### Phase 4: Tests — Risk: Low

- [x] A fixture run through an entry form that carries a limit produces the field; one through a form without the form-specific limit does not carry it. Mutation-proved: removing the form-to-limit mapping turns it red. The test's temp directories are removed in a `finally` / `t.after`: `scripts/test-tmpdir.mjs` rejects a new leaking prefix (review.1, I-5).
- [x] A record that carries the new field is read back by `readRecord()` and by the plan CLI with the same `probes_executed` as the same record without it (the tolerance criterion's test, review.1, I-4).

## 7. Files Summary

1. ✅ `shared/resources/security-probe.mjs` (confirmed: the source; four bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/`; list with `ls skills/*/references/security-probe.mjs`)
2. ✅ `skills/finalise/SKILL.md` § Probe Results, and `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` if its pins move
3. ✅ `shared/resources/tests/security-probe.test.mjs` (reached by the `shared/resources/tests/*.test.mjs` glob in `package.json`), bundled copies, `CHANGELOG.md`

## 8. Testing Strategy

Behaviour fixtures over the runner's output, mutation-proved; the whole suite through `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [x] Phase 1's finding on the premise is recorded in the QA report.
- [x] A run through an entry form that carries a stated limit yields `observation_limits` in the record and on the DoD Probe Results line. Held by the Phase 4 fixture test.
- [x] Every form carries the universal after-accept limit, so no form is limit-free; a form without the form-specific limit (every form but `fence:`) does not carry it, and the counts a gate reads are unchanged by the field. Held by the same test (Phase 1 decision, develop: a fixed run-level list keyed by entry form).

**Performance**

- [x] No extra probe executions: the test counts the runs.

**Code quality**

- [x] `npm run bundle:check`, `format:check` and `ci:fast` pass. (`ci:fast`, which includes `format:check`, passed on the LAN server at develop; `bundle:check` passed locally: 129 skills, 0 problems.)

**Migration**

- [x] `CHANGELOG.md` entry; readers of the record tolerate the new field. Held by the Phase 4 read-back test.

## 10. Risk Assessment

**High:** none. **Medium:** the premise is wrong, and the task adds a field nobody needs. Mitigation: Phase 1 may close the task. **Low:** wording.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a reader of the record breaking on the new field (Critical).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-13
**Quality Score**: 96/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.300.qa.2.security-probe-names-the-sink-it-observes.md](./task.300.qa.2.security-probe-names-the-sink-it-observes.md)
- **Gate File**: [task.300.gate.2.security-probe-names-the-sink-it-observes.yml](./task.300.gate.2.security-probe-names-the-sink-it-observes.yml)

### Test Coverage Summary
- **Tests Executed**: 374
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Cycle 1's three PR-review findings are fixed.

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft — cut from observation #165 | create-task |
| 2026-11-13 | 1.1     | Review passed (8/10) — 5 Important fixed: deciding input named, `sink` name collision avoided, source and readers named, pinned tests named, temp-dir removal | review-task |
| 2026-11-13 |         | Status → ready-for-development | review-task |
| 2026-11-13 |         | Implemented: `OBSERVATION_LIMITS` in the runner, plan output and DoD Probe Results line; status → ready-for-review | develop-task |
| 2026-11-13 |         | QA gate PASS (95/100) — 0 findings | qa-task |
| 2026-11-13 |         | 5c PR review CONCERNS fixed — 3 findings, 1 iteration | qa-fix |
| 2026-11-13 |         | QA gate PASS (96/100) — 0 findings | qa-task |

<!-- change-log-end -->

## Progress Tracking

- [x] Phases 1 to 4

## References

- Observation #165 — A clean security-probe score does not name the sink it can observe
- task.295 DoD, probe results
