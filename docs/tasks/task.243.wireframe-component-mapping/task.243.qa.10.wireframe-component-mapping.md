# QA Report: Task 243 - Link Wireloom wireframe nodes to the project's UI components

**Task**: [task.243.wireframe-component-mapping.md](./task.243.wireframe-component-mapping.md)
**Gate File**: [task.243.gate.10.wireframe-component-mapping.yml](./task.243.gate.10.wireframe-component-mapping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Re-Review Context

QA cycle 10 is the last cycle in the budget (`qa_max_cycles` 10). It reviews the cycle 9 fix,
`b1464d42`: `record` refuses `\r` or `\n` in every written field and a backtick in `--signature`
and `--label`. One new test covers it, and the eight bundled copies are updated.

| Previous issue | Source | Status |
| --- | --- | --- |
| TASK-243-CR9-1 (low): a line break in the other `record` fields splits the row | gate 9 | ✅ FIXED. Guard at `wireframe-map.js:720–730`; mutation-proven; probe refuses every line-break case for all six flags |
| TASK-243-CR9-2 (low, advisory): a backtick in a signature breaks the cell | gate 9 | ⚠️ PARTIAL. Fixed for `--signature` and `--label`; the same collapse remains in the unquoted cells (CR10-1 below) |
| TASK-243-CR8-1 (low): `existsSync` assertions in the resolve unset test cannot fail | gate 8 | ❌ NOT FIXED (deferred, carried) |
| TASK-243-CR7-1 (low): no-jq test asserts `/HALT/` only | gate 7 | ❌ NOT FIXED (deferred, carried) |

---

## Executive Summary

The cycle 9 fix does what it says. A line break in any written field and a backtick in a
backtick-wrapped cell are refused with a UsageError naming the flag, and the map is left
byte-identical. Removing either guard turns the new test red. The reviewer found that the backtick
half covers too little. An odd backtick count in a cell that is *not* written inside backticks
(`--component`, `--variant`, `--hint`, `--notes`, `--by`) also leaves `splitRow` in code mode, so
the row reads back with its later cells merged. That is CR10-1: medium, high confidence, reproduced
by hand and by the probe. It is promoted, so the gate is CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR10-1 fixed or waived)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#785, head `b1464d42`)

### Testing Approach

- [x] Automated Testing (wireframe suites)
- [x] Regression Testing
- [x] Security Review (boundary probe, measured)
- [x] Code Review (Step 3b, Explore subagent)

### Review Methodology

Direct tools plus one Explore code reviewer (re-review strategy).
Re-review scope: files changed since gate 9 (head c9f77474b2c3; 10 files) — default. The reviewer
read the two source files against `origin/develop`. The eight bundled copies were checked
byte-identical to the source apart from the generated header line, and were not reviewed separately.
`SAFETY_REPROBE=false`: `qa-safety-clause1.sh` returned false for gate 9, and clauses 2–3 do not apply.
Reviewer dispatched at 16:54:21Z; its notification gave a duration of 55550 ms.
CI on b1464d42c3a2: pending
Step 4b: not applicable — no runnable prose in the change set (the 10 files are `.js` / `.mjs`).

---

## New Findings This Cycle

- **[medium]** `shared/resources/wireframe-map.js:731`: the backtick guard covers only `--signature`
  and `--label`. An odd backtick count in an unquoted cell still collapses the row. → Refuse an
  odd backtick count in every written cell, or escape backticks in `cell()` and teach `splitRow`
  the escape. (TASK-243-CR10-1, promoted)
- **[low]** `shared/resources/tests/wireframe-map.test.mjs:544`: the "not refused" case tests only a
  balanced backtick pair, the one input where an unquoted backtick is safe. → Add an unbalanced
  case with the CR10-1 fix. (TASK-243-CR10-2, cleanup)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine and its tests | CONCERNS | Verified | `record` guards added and mutation-proven; CR10-1 open; 19/19 |
| Phase 2: Procedure and configuration reference | PASS | Unchanged | — |
| Phase 3: Skill hooks, then `npm run bundle` | PASS | Verified | eight copies match source apart from the generated header; `bundle:check` clean |
| Phase 4: Hook-presence test | PASS | Verified | 21/21 |
| Phase 5: Verification | PASS | Verified | fast gate at the fix: 6842 tests, 0 failed |

**Overall Phase Completion**: 5/5 (Phase 1 with one open medium)

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 | `wireframe-map.test.mjs:164`, `:175` | PASS |
| SC-2 | `wireframe-map.test.mjs:191` | PASS |
| SC-3 | `wireframe-map.test.mjs:214`, `:246` | PASS |
| SC-4 | `wireframe-map.test.mjs:381` | PASS |
| SC-5 | `wireframe-map.test.mjs:429` and the two refusal tests after it. A recorded link round-trips for one-line values; CR10-1 is an unquoted odd-backtick value that does not | CONCERNS |
| SC-6 | `wireframe-mapping-hooks.test.mjs:38` | PASS |
| SC-7 | `wireframe-mapping-hooks.test.mjs:409` | PASS |

---

## Breaking Changes Validation

None. The new refusals apply only to `record`'s input values, and every documented call
(`wireframe-component-mapping.md`) passes one-line placeholders with no backtick in
`--signature` or `--label`.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: An odd backtick in an unquoted cell collapses the map row**
- **Severity**: MEDIUM
- **Category**: Functional / Security (input validation)
- **Bug Report**: none (code-review finding promoted to the gate as TASK-243-CR10-1, the same shape as earlier cycles' CR entries)
- **Observation**: `record --signature '*>tab' --component Tab --notes 'see `Tabs' --by t` exits 0, and
  `readMap` then returns notes `see `Tabs | 2026-10-29, t`. The Confirmed cell is lost. The probe
  accepted the same shape for `--component`, `--variant`, `--hint`, `--notes` and `--by`.
- **Impact**: a confirmed link is written, then read back wrong by the next `resolve`. It fails
  closed for matching, because the signature cell is intact, but the row's other cells are corrupted.
- **Recommendation**: refuse an odd backtick count in every written cell.
- **Priority**: P2

### LOW Severity Issues (1)

- **TASK-243-CR10-2**: the "not refused" test case covers a balanced pair only (above).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Two short loops over at most seven flags, before any read or write.

### Reliability — PASS
A refused `record` leaves the map byte-identical; the new test asserts it.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 66 (copied from `task.243.qa.10.security.run.json` `totals.executed`); escaped: 0
- `boundary: true`: `record` is the gate before the map is written. Probed with the `cli:` form,
  one control per flag (`record --component`, `--notes`, `--label`, `--variant`, `--hint`, `--by`,
  `--signature`). Each case runs in a fixture consumer with an empty map.
- Every line-break case (LF leading, middle and trailing; CRLF; lone CR; a row-injection payload)
  is refused, and every legitimate value is accepted, including values with `|`. `--label` and
  `--signature` engage fully.
- 5 reproduced: the odd-backtick case for each unquoted flag. That is CR10-1. It also calibrates
  the probe: it reports an accepted hostile input when one exists.

### Maintainability — PASS
Eight bundled copies match the source; `bundle:check` reports 0 problems.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `shared/resources/wireframe-map.js:731`: the backtick guard only covers the two cells written inside backticks, but an odd backtick count in an unquoted cell also flips `splitRow` into code mode and merges the rest of the row into one cell. → Refuse an odd backtick count in every written cell, and fix the comment above the guard. **Promoted to gate `top_issues` as TASK-243-CR10-1** (`code_review_blocking`).

**Cleanups (1):**
- `shared/resources/tests/wireframe-map.test.mjs:544`: the "not refused" case tests a balanced backtick pair only, so it cannot catch CR10-1. → Add an unbalanced case for an unquoted cell. (TASK-243-CR10-2)

Anchors: both `ok` against `b1464d42` (`finding-anchors.js`).

Provenance: `shared/resources/wireframe-map.js` does not exist on `origin/develop`, so CR10-1 is new to this branch, not pre-existing.

mutation-proven: disabled the line-break guard in `record` → `record refuses a line break in any written field, and a backtick in a code cell` went red (18/19), green on restore (19/19) → covered
mutation-proven: disabled the backtick guard in `record` → the same test went red (18/19), green on restore (19/19) → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shared/resources/tests/wireframe-map.test.mjs` | PASS 19/19 |
| `evals/shared/tests/wireframe-mapping-hooks.test.mjs` | PASS 21/21 |
| `npm run validate` for create-story, create-task, develop-story, develop-task, qa-story, qa-task, review-story, review-task | PASS ×8 |
| `npm run bundle:check` | PASS (0 problems) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/wireframe-map.js`, `shared/resources/tests/wireframe-map.test.mjs`, `skills/*/references/wireframe-map.js` (8, header-only difference checked)

### Test Commands Executed
```bash
node --test shared/resources/tests/wireframe-map.test.mjs evals/shared/tests/wireframe-mapping-hooks.test.mjs
npm run validate -- skills/<each of the eight>/
npm run bundle:check
node .agents/skills/qa-task/references/security-probe.mjs --entry 'cli:shared/resources/wireframe-map.js' \
  --argv '["record","--signature","*>chip","--component","Chip","--by","t","--<flag>","{input}","--root","{fixture}","--json"]' \
  --cases-file <per-flag cases> --name 'record --<flag>' --record task.243.qa.10.security.run.json --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 785
```

### Coverage Report
Not measured (the repository's test runner reports no coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-243-CR10-1: refuse an odd backtick count in every cell `record` writes.

### Short-term Actions (Non-Blocking)
1. TASK-243-CR10-2: add an unbalanced-backtick case for an unquoted cell to the refusal test.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The cycle 9 fix is correct and mutation-proven. One medium finding of the same class remains, in the cells the backtick guard does not cover.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-243-CR10-1 fixed or waived

---

**QA Report**: co-located at `task.243.qa.10.wireframe-component-mapping.md`
**Gate File**: co-located at `task.243.gate.10.wireframe-component-mapping.yml`
**Next Steps**: this is cycle 10 of 10, so the QA budget is spent. The develop-task loop decides the route: Loop Escalation, after its Gate-the-last-fix half-cycle check.
