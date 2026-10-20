# QA Report: Task 189 - Read-only agents never write (cycle 2)

**Task**: [Link to task document](./task.189.read-only-agents-never-write.md)
**Gate File**: [task.189.gate.2.read-only-agents-never-write.yml](./task.189.gate.2.read-only-agents-never-write.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| CR-1 Step 8a re-runs a command the agent no longer records | ✅ FIXED | Step 8a.4 re-runs Step 3b.1 on the saved plan; contract test asserts it (mutation C6 red) |
| CR-2 runner drops engine escapes | ✅ FIXED | `runs[].escapes`, top-level `escapes[]`, Step 3b.1 item 4 FAIL; escape fixture test (mutation C1 red) |
| QA-1 owned-flag refusal not probeable | ✅ FIXED | `planArgvAllowed` engages under the engine: 18 executed, 0 reproduced, 0 overblocked |
| QA-2 empty block leaves a directory | ✅ FIXED | Matrix block re-probed: engages, 8 executed, 0 reproduced |
| CR-3 / CR-4 / CR-5 (advisory) | ✅ FIXED | FORBIDS without bare "no" (C5 red); readRecord + `record-unreadable` (C3 red); independent-sum assertion |

Bug reports task.189.bug.1–3 closed by this cycle.

---

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:557` — probe severities are graded and merged by corpus case id alone; two controls on one sink share ids (measured: two copies of `absent-control.mjs` → 18 probes, 9 distinct ids) → key probes as `<plan index>:<id>`. **CR2-1, promoted** — [task.189.bug.4.probe-severity-merged-by-case-id.md](./task.189.bug.4.probe-severity-merged-by-case-id.md)
- **[medium, confidence medium]** `skills/finalise/SKILL.md:566` — a corrected-plan re-run replaces probes/escapes with the second run only (CR2-2, advisory)
- **[low]** `shared/resources/security-probe-plan.mjs:161` — a null record after a run reads as 0 (CR2-3, advisory)
- **[low]** `shared/resources/security-probe-plan.mjs:242` — the engine spawn has no overall timeout; `--timeout` is not owned (CR2-4, advisory)
- **[cleanup]** `shared/resources/finalise-dod-security-prompt.md:298` — "equal to the sum … across your plan" is false when two entries share a control key (CR2-5)

---

## Executive Summary

Cycle 2 refute pass over the full branch diff (head `cb79ae69393e`). Every cycle-1 finding is fixed and verified; the two boundaries the change adds now engage under the probe engine. One new medium: Step 3b.1's severity grading keys probes by a case id that is not unique across controls.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Refute pass (cycle 2: exactly one prior gate) with the safety re-probe directive appended: `SAFETY_REPROBE` clause 1 read `false` (gate 1 security CONCERNS, not FAIL); set `true` by judgement (clauses 2–3) because a gate-1 top issue (CR-2, sandbox escape) is on a safety axis. Re-review scope: unscoped — cycle 2 refute pass over `origin/develop...HEAD` (bundled copies excluded), 3694-line patch. One Explore reviewer, 160 s (completion notice). Anchors: 5/5 `ok`.

Step 4b: unchanged since cycle 1 for these files' classifications (the edited blocks are executed by `read-only-agent-writes.test.mjs`).

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1 | PASS | Matrix block engages under the engine |
| Phase 2 | CONCERNS | CR2-1 |
| Phase 3 | PASS | |
| Phase 4 | PASS | |

---

## Success Criteria Verification

Unchanged from cycle 1 — all PASS (SC1–SC5, code quality, migration). `npm run ci:fast` 5801/0 at the fix commit `cb79ae69`.

---

## Issues Found

### MEDIUM Severity Issues (1)

**CR2-1** — see New Findings; bug report task.189.bug.4.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (gate); 4 advisory

---

## NFR Assessment

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26 (record `task.189.qa.2.security.run.json`, `totals.executed`)
- `planArgvAllowed`: 18 cases — every owned flag separate and `--flag=value`, flag-first, empty, non-string, a single command string (hostile); plain, cli `--argv`, a value mentioning a flag, a spaced fence heading (legitimate) — engages. Cases: `task.189.qa.2.security.cases.json`. Matrix block: 8 cases (`task.189.qa.1.security.cases.json`) — engages.

### Reliability — PASS / Performance — PASS / Maintainability — PASS

---

## Code Review

**Correctness bugs (4):** CR2-1 [medium/high] (promoted); CR2-2 [medium/medium]; CR2-3 [low/medium]; CR2-4 [low/medium].
**Cleanups (1):** CR2-5.

Cycle-1 fix proofs (run during 5b against committed tests): C1 escapes → `read-only-agent-writes` → covered; C2 `--flag=value` → `read-only-agent-writes` → covered; C3 unreadable record → `read-only-agent-writes` → covered; C4 mkdir order → `read-only-agent-writes` → covered; C5 bare "no" → `explore-prompts-no-write` → covered; C6 Step 8a.4 → `finalise-dod-prompt-contract` → covered. 6 of 6.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR2-1 fixed

**Next Steps**: `/qa-fix` cycle 2
