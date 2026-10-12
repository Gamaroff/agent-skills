# QA Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.8.probe-engine-fence-entry-form.yml](./task.180.gate.8.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 8, the granted cycle, gates qa-fix cycle 7 (`9d30305c`). TASK-180-019 is fixed and mutation-proven. This is the second consecutive gate with no HIGH, and Security is now PASS. The scoped re-review found two MEDIUMs, both outside the guard itself. Cycle 7's own change made the cycle-6 integration test vacuous: it no longer reaches `ghFreePath`, which only its unit test holds. And `emitBlock` drops a `fence:` control's slot, so two controls on one block render as one.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-180-019: default-path `gh` lookup from a fixture | medium | FIXED | fixture `env`/`files` in the text check; regression test green; QA mutations Q1 (fixture files unchecked) and Q2 (fixture env unchecked) each red |
| CR-2 (gate 7, advisory): relative PATH entries | low | FIXED | `ghFreePath` unit gains the relative-entry pair |

Bug 12 → Closed.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore code reviewer, dispatched 2026-10-12T17:18:43Z, `duration_ms` 363124.

Re-review scope: files changed since gate 7 (head cba2750b; 20 files) — default. `SAFETY_REPROBE` false: gate 7 had no HIGH, security CONCERNS with `evidence: measured`, and the gate was not FAIL. Mutations ran in scratch worktrees.

---

## New Findings This Cycle

- **[MEDIUM]** `shared/resources/tests/security-probe.test.mjs:4696`: the TASK-180-017 integration test fixture spells out `type -ap gh`, which the cycle-7 text check declines before any spawn. With the `ghFreePath` line removed the test stays green (confirmed) (TASK-180-020, bug 13).
- **[MEDIUM]** `shared/resources/security-probe.mjs:3094`: `emitBlock` prints `argv` but not `slot`. Two `fence:` controls on one block render as one, and the default name cuts a `#` heading (TASK-180-021, bug 14).
- **[LOW]** `shared/resources/security-probe.mjs:1245`: comment overstates absolute-path coverage (advisory).
- **[LOW]** `shared/resources/security-probe.mjs:2106`: `FENCE_LINE` copies `extractBlocks`' regex (advisory).
- **[LOW]** `shared/resources/security-probe.mjs:2342`: `workDirStamps` stats host binaries through the farm's symlinks (advisory).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Tests first | CONCERNS | TASK-180-020 |
| Phase 2: The entry form | CONCERNS | TASK-180-021 |
| Phase 3: Routing and proof | PASS | task.167 proof holds |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC1 `fence:` probes a block, scored per `scoreFenceRun` | PASS | committed tests; the guard is held by the `ghFreePath` unit test |
| SC2–SC5, Performance | PASS | committed tests; `ci:fast` green |

---

## Issues Found

### MEDIUM Severity Issues (2)

- **Bug Report**: [task.180.bug.13.ghfreepath-integration-test-vacuous.md](./task.180.bug.13.ghfreepath-integration-test-vacuous.md)
- **Bug Report**: [task.180.bug.14.emit-block-drops-fence-slot.md](./task.180.bug.14.emit-block-drops-fence-slot.md)

### LOW Severity Issues (3)

- The three advisory cleanups above.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 26 (`task.180.qa.8.security.run.json` `totals.executed`)
- Both controls engage, 0 reproduced, 0 escapes. TASK-180-019 closed.

### Maintainability — CONCERNS
TASK-180-020 and -021.

### Performance — PASS · Reliability — PASS

---

## Code Review

boundary: true. probes_executed: 26.

**Correctness bugs (2):**
- [medium/high] `shared/resources/tests/security-probe.test.mjs:4696`: vacuous integration test. Promoted to TASK-180-020.
- [medium/high] `shared/resources/security-probe.mjs:3094`: `emitBlock` drops the slot. Promoted to TASK-180-021.

**Cleanups (3):** the three LOW lines above. Provenance: all new to this branch.

mutation-proven: fixture `files` not checked → TASK-180-019 test → covered
mutation-proven: fixture `env` not checked → TASK-180-019 test → covered
mutation-proven: `ghFreePath` call removed → TASK-180-017 integration test → no-red-untested (only the unit test holds it: TASK-180-020)

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH for the second gate running; two open MEDIUMs, both in tests and record rendering.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — TASK-180-020 and -021 fixed.
