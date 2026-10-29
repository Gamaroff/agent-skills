# QA Report: Task 243 - Link Wireloom wireframe nodes to the project's UI components

**Task**: [task.243.wireframe-component-mapping.md](./task.243.wireframe-component-mapping.md)
**Gate File**: [task.243.gate.11.wireframe-component-mapping.yml](./task.243.gate.11.wireframe-component-mapping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: PASS

---

## Re-Review Context

QA cycle 11 of 12 (the user granted 2 cycles after gate 10). It reviews the cycle 10 fix,
`97035bae`. `record` now round-trips each unquoted value through `splitRow` before any read or
write: `--component`, `--variant`, `--hint` and `--notes` also go through `readMap`'s `unquote`,
while `--by` and `--date` share the Confirmed cell. A value that does not read back unchanged, with
the next cell intact, is refused with a UsageError naming the flag. The refusal test is extended,
and the eight bundled copies are updated.

| Previous issue | Source | Status |
| --- | --- | --- |
| TASK-243-CR10-1 (medium): an odd backtick in an unquoted cell collapses the row | gate 10 | ✅ FIXED. Round-trip check at `wireframe-map.js:731–746`; mutation-proven; the probe refuses every odd-backtick case for all five flags |
| TASK-243-CR10-2 (low): the "not refused" case tests a balanced pair only | gate 10 | ✅ FIXED. The test now refuses 4 odd-backtick positions × 6 flags and 2 whole-span shapes × 4 flags, and reads a not-refused row back field by field |
| TASK-243-CR8-1 (low): `existsSync` assertions in the resolve unset test cannot fail | gate 8 | ❌ NOT FIXED (deferred, carried) |
| TASK-243-CR7-1 (low): no-jq test asserts `/HALT/` only | gate 7 | ❌ NOT FIXED (deferred, carried) |

---

## Executive Summary

The cycle 10 fix closes the class, not just the instance. Instead of adding a third deny-list rule,
`record` asks the reader itself whether each value will come back intact, so every odd backtick
count is refused. So is a whole-cell code span, which `unquote` would have stripped (that was found
while writing the fix's test). Removing the check, or its `unquote` arm, turns the refusal test red.
The probe ran 79 cases: no hostile input was accepted, and no legitimate value was refused. The
reviewer found two lows. One is a refusal of `--by`/`--date` that is stricter than the default
column order needs. The other is a comment that gives the wrong reason. Neither is promoted.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#785, head `97035bae`)

### Testing Approach

- [x] Automated Testing (wireframe suites)
- [x] Regression Testing
- [x] Security Review (boundary probe, measured)
- [x] Code Review (Step 3b, Explore subagent)

### Review Methodology

Direct tools plus one Explore code reviewer (re-review strategy).
Re-review scope: files changed since gate 10 (head b1464d42c3a2; 10 files) — default. The reviewer
read the two source files against `origin/develop`, plus the cycle delta. The eight bundled copies
were checked byte-identical to the source apart from the generated header line, and were not
reviewed separately. `SAFETY_REPROBE=false`: `qa-safety-clause1.sh` returned false for gate 10, and
clauses 2–3 do not apply.
Reviewer dispatched at 17:05:21Z; its notification gave a duration of 123069 ms.
CI on 97035bae0cfe: pending
Step 4b: not applicable — no runnable prose in the change set (the 10 files are `.js` / `.mjs`).

---

## New Findings This Cycle

- **[low]** `shared/resources/wireframe-map.js:727`: the check refuses an odd backtick in `--by`
  and `--date`, but `readMap` never reads the Confirmed cell, and it is the last column by default.
  So the refusal is stricter than needed. → Check those two only when a column follows Confirmed,
  or keep the refusal as a margin and say so. (TASK-243-CR11-1, bug, confidence medium — not promoted)
- **[low]** `shared/resources/wireframe-map.js:725`: the comment's reason for skipping `unquote` on
  `--by`/`--date` is the wrong one. → Say that `readMap` does not read the Confirmed cell.
  (TASK-243-CR11-2, cleanup)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine and its tests | PASS | Verified | round-trip check added and mutation-proven; 19/19 |
| Phase 2: Procedure and configuration reference | PASS | Unchanged | — |
| Phase 3: Skill hooks, then `npm run bundle` | PASS | Verified | eight copies match source apart from the generated header; `bundle:check` clean |
| Phase 4: Hook-presence test | PASS | Verified | 21/21 |
| Phase 5: Verification | PASS | Verified | fast gate at the fix: 6842 tests, 0 failed |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 | `wireframe-map.test.mjs:164`, `:175` | PASS |
| SC-2 | `wireframe-map.test.mjs:191` | PASS |
| SC-3 | `wireframe-map.test.mjs:214`, `:246` | PASS |
| SC-4 | `wireframe-map.test.mjs:381` | PASS |
| SC-5 | `wireframe-map.test.mjs:429` and the two refusal tests after it. A recorded link round-trips, and a value that would not round-trip is refused before the map is touched | PASS |
| SC-6 | `wireframe-mapping-hooks.test.mjs:38` | PASS |
| SC-7 | `wireframe-mapping-hooks.test.mjs:409` | PASS |

---

## Breaking Changes Validation

None. The new refusal applies only to `record`'s input values. Every documented call
(`wireframe-component-mapping.md`) passes one-line placeholders with no backtick.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **TASK-243-CR11-1**: the `--by`/`--date` refusal is stricter than the default column order needs (above).
- **TASK-243-CR11-2**: the comment at `wireframe-map.js:725` gives the wrong reason (above).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
At most six `splitRow` calls, each on one short line, before any read or write.

### Reliability — PASS
A refused `record` leaves the map byte-identical; the refusal test asserts it after every case.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 79 (copied from `task.243.qa.11.security.run.json` `totals.executed`); escaped: 0
- `boundary: true`: `record` is the gate before the map is written. Probed with the `cli:` form,
  one control per flag (`record --component`, `--notes`, `--label`, `--variant`, `--hint`, `--by`,
  `--signature`). Each case runs in a fixture consumer with an empty map.
- Refused: every line-break case, every odd-backtick case, and every whole-cell code span. Accepted:
  every legitimate value, including a balanced inner span, `|`, an escaped pipe and a code span in
  `--by`.
- 0 reproduced. The same odd-backtick cases reproduced 5 times at gate 10, so the probe is
  calibrated on exactly this defect.

### Maintainability — PASS
One rule now holds the class: the reader is the allow-list. Eight bundled copies match the source,
and `bundle:check` reports 0 problems.

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `shared/resources/wireframe-map.js:727`: `--by`/`--date` are refused on an odd backtick although `readMap` never reads the Confirmed cell. → Narrow the check, or keep it as a margin and say so. Not promoted (low severity, medium confidence). (TASK-243-CR11-1)

**Cleanups (1):**
- `shared/resources/wireframe-map.js:725`: the comment's stated reason is wrong. → Correct it. (TASK-243-CR11-2)

Anchors: both `ok` against `97035bae` (`finding-anchors.js`).

Provenance: `shared/resources/wireframe-map.js` does not exist on `origin/develop`, so both findings are new to this branch.

mutation-proven: disabled the round-trip check in `record` → `record refuses a line break in any written field, and a backtick in a code cell` went red (18/19), green on restore (19/19) → covered
mutation-proven: dropped the `unquote` arm of the round-trip check → the same test went red (18/19), green on restore (19/19) → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shared/resources/tests/wireframe-map.test.mjs` | PASS 19/19 |
| `evals/shared/tests/wireframe-mapping-hooks.test.mjs` | PASS 21/21 |
| `npm run validate` for create-story, create-task, develop-story, develop-task, qa-story, qa-task, review-story, review-task | PASS ×8 |
| `npm run bundle:check` | PASS (0 problems) |
| Fast gate (`format:check` + `npm test`) at `97035bae` | PASS, 6842 tests, 0 failed |

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
  --cases-file <per-flag cases> --name 'record --<flag>' --record task.243.qa.11.security.run.json --json
node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings> --rev HEAD --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 785
```

### Coverage Report
Not measured (the repository's test runner reports no coverage).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. TASK-243-CR11-1: narrow the `--by`/`--date` refusal, or document it as a margin.
2. TASK-243-CR11-2: correct the comment at `wireframe-map.js:725`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The cycle 10 fix closes the odd-backtick class with one rule held by the reader itself. It is mutation-proven, and the probe measured no accepted hostile input. Two lows remain and are advisory.
**Quality Score**: 100/100

**Deployment Recommendation**: READY
**Conditions**: none

---

**QA Report**: co-located at `task.243.qa.11.wireframe-component-mapping.md`
**Gate File**: co-located at `task.243.gate.11.wireframe-component-mapping.yml`
**Next Steps**: the develop-task loop decides the route; a PASS gate goes to Step 5c (`/review-pr`).
