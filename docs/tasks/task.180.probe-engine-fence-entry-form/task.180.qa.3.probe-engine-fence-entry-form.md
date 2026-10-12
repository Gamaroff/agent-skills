# QA Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.3.probe-engine-fence-entry-form.yml](./task.180.gate.3.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Gate Status**: FAIL

---

## Re-Review Context

Previous gate: [gate 2](./task.180.gate.2.probe-engine-fence-entry-form.yml) — FAIL 60. Fix commit `fcbbe9d9`.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-180-004 (HIGH) absent/fixture collision | FIXED for exact names; normalised paths escape it → TASK-180-010 | test; mutation G1 red |
| TASK-180-005 (MEDIUM) other shell diagnostics | OVER-FIXED — the widening swallows non-fatal errors after a guard → TASK-180-009 | test; mutation G2 red |
| TASK-180-006 (MEDIUM) parse branch masks side effect | FIXED | test; mutation G3 red |
| TASK-180-007 (LOW) slot on decline | FIXED | test; mutation G4 red |
| TASK-180-008 (LOW) CRLF | FIXED | test; mutation G5 red |

---

## Executive Summary

Cycle 2's fixes hold for what they named. The cycle-3 safety re-probe reproduced a false `engages`
through cycle 2's own widening of the shell-diagnostic rule: a hostile input that gets past a guard
and then makes a later command fail non-fatally is scored "the guard never answered" and drops out
of the verdict. This is the third consecutive cycle with one HIGH, all in the `fence:` scoring path.

**Overall Assessment**: FAIL — and the loop is not converging (HIGH 1, 1, 1).
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools plus one Step 3b reviewer (Explore), measured 252.5 s (`duration_ms` 252450).

Re-review scope: unscoped (safety re-probe by judgement — the prior HIGH was on the security verdict path; clause 1 read false)

Whole branch diff, 2389 lines, generated copies and task docs excluded.

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/security-probe.mjs:2259` — `shellDiagnostic` treats non-fatal errors after a guard as "never answered" → false `engages` (TASK-180-009)
- **[MEDIUM]** `shared/resources/security-probe.mjs:2346` — collision decline compares raw paths (`./pwned`) (TASK-180-010)
- **[LOW]** `shared/resources/probe-boundary-rule.md:432` — writes beside the case dir under the work dir are not observed, though the docs say they are (TASK-180-011)

---

## NFR Assessment

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26 — from `task.180.qa.3.security.run.json` `totals.executed`
- Both controls `engages`, 0 reproduced. CONCERNS for TASK-180-009/010.

### Performance — PASS · Reliability — PASS · Maintainability — PASS

---

## Code Review

Safety re-probe, `code_review_blocking=true`; all three findings are bug + high confidence and are
promoted. Anchors checked at `HEAD`.

- [high/high] `shared/resources/security-probe.mjs:2259` — TASK-180-009
- [medium/high] `shared/resources/security-probe.mjs:2346` — TASK-180-010
- [low/high] `shared/resources/probe-boundary-rule.md:432` — TASK-180-011

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the convergence check trips at cycle 3 (HIGH 1, 1, 1) — escalate to a person with
the design question in the gate's `recommendations.immediate`.
