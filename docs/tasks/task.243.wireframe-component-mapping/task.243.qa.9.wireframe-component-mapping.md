# QA Report: Task 243 - Link Wireloom wireframe nodes to the project's UI components

**Task**: [task.243.wireframe-component-mapping.md](./task.243.wireframe-component-mapping.md)
**Gate File**: [task.243.gate.9.wireframe-component-mapping.yml](./task.243.gate.9.wireframe-component-mapping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: PASS

---

## Re-Review Context

QA cycle 9 is the re-entry after finalise DoD run 2 (`task.243.dod.2.wireframe-component-mapping.md`).
Since gate 8's head (`9e50d3b7`) there are two commits. `88c5c3d5` is the DoD run 2 gaps record
(docs only). `c9f77474` is the fix: `parsePattern` refuses a newline, a new `record` test is added,
and the eight bundled copies are updated.

| Previous issue | Source | Status |
| --- | --- | --- |
| Security: `parsePattern` accepts a newline in a signature; `record` writes it and splits the row (4 low probes) | DoD run 2 | ✅ FIXED. Guard at `wireframe-map.js:328`, test "record refuses a signature with a line break…", mutation-proven, and probe re-run 11/0/0 |
| TASK-243-CR8-1 (low): `existsSync` assertions in the resolve unset test cannot fail | gate 8 | ❌ NOT FIXED (deferred, carried) |
| TASK-243-CR8-2 (low): "read-only" wording for `0c-wire` | gate 8 | ✅ FIXED at PR review 2 |
| TASK-243-CR7-1 (low): no-jq test asserts `/HALT/` only | gate 7 | ❌ NOT FIXED (deferred, carried) |

---

## Executive Summary

The DoD run 2 gap is closed. `parsePattern` now returns null for any `\r` or `\n`, so `record` throws
a UsageError and leaves the map byte-identical. A committed test holds this, and it goes red when
the guard is removed. Re-run against the fix, the DoD probe plan for `parsePattern` reproduced
nothing (11 executed, 0 reproduced, 0 escaped). The reviewer found the same class one step over:
`record` writes six other caller-supplied values through `cell()`, which escapes only `|`. That is
CR9-1, low, high-confidence and reproduced, so it is promoted to `top_issues[]`. A backtick case
(CR9-2, low, medium confidence) is advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#785, head `c9f77474`)

### Testing Approach

- [x] Automated Testing (wireframe suites)
- [x] Regression Testing
- [x] Security Review (boundary probe, measured)
- [x] Code Review (Step 3b, Explore subagent)

### Review Methodology

Direct tools plus one Explore code reviewer (re-review strategy).
Re-review scope: files changed since gate 8 (head 9e50d3b7901f; 10 files) — default.
`SAFETY_REPROBE=false`: gate 8 was security PASS (`reasoned`) with no high finding, and clauses 2–3 do not apply.
Reviewer dispatched at 16:43Z; its notification gave a duration of 58292 ms.
CI on c9f77474b2c3: pending
Step 4b: not applicable — no runnable prose in the change set (the 10 files are `.js` / `.mjs`).

---

## New Findings This Cycle

- **[low]** `shared/resources/wireframe-map.js:280`: `record` writes `--label`, `--component`,
  `--variant`, `--hint`, `--notes` and `--by` through `cell()`, which escapes only `|`. A newline in
  any of them splits the row. → Refuse `\r` / `\n` in every written value, and test each field.
  (TASK-243-CR9-1, promoted)
- **[low]** `shared/resources/wireframe-map.js:329`: a backtick in the flag or attribute list
  (`button[a`b]`) leaves an odd backtick count, and the row reads back as one cell with an empty
  component. → Reject or escape backticks. (TASK-243-CR9-2, advisory)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine and its tests | PASS | Verified | `parsePattern` guard added; 18/18 |
| Phase 2: Procedure and configuration reference | PASS | Unchanged | — |
| Phase 3: Skill hooks, then `npm run bundle` | PASS | Verified | eight copies match source apart from the generated header; `bundle:check` clean |
| Phase 4: Hook-presence test | PASS | Verified | 21/21 |
| Phase 5: Verification | PASS | Verified | fast gate at the fix: 6841 tests, 0 failed |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 | `wireframe-map.test.mjs:164`, `:175` | PASS |
| SC-2 | `wireframe-map.test.mjs:191` | PASS |
| SC-3 | `wireframe-map.test.mjs:214`, `:246` | PASS |
| SC-4 | `wireframe-map.test.mjs:381` | PASS |
| SC-5 | `wireframe-map.test.mjs:429` (and the new refusal test after it) | PASS |
| SC-6 | `wireframe-mapping-hooks.test.mjs:38` | PASS |
| SC-7 | `wireframe-mapping-hooks.test.mjs:409` | PASS |

---

## Breaking Changes Validation

None. `parsePattern` returning null for a line-broken signature changes nothing for map rows read
from disk. `readMap` splits on `/\r?\n/` and trims each cell, so a stored signature never carries a
line break. The reviewer probed a CRLF map, and it reads normally.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **TASK-243-CR9-1**: newline in the other `record` fields (above). Reproduced in a scratch consumer:
  `--notes "a\nb"` wrote the row, then a `b | 2026-10-29, t |` line, and `readMap` lost the
  row's Confirmed cell.
- **TASK-243-CR9-2**: backtick in a signature (above). Reproduced: `button[a`b]` reads back as one
  signature cell with an empty component.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
One regex test per signature.

### Reliability — PASS
`record` refuses a line-broken signature and leaves the map byte-identical.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (copied from `task.243.qa.9.security.run.json` `totals.executed`); escaped: 0
- `boundary: true`: `parsePattern` is the gate `record` uses before it writes. The plan is DoD run
  2's `task.243.dod.2.security.cases.3.json` (4 legitimate, 7 hostile) against `c9f77474`, with
  0 reproduced. The same cases reproduced 4 at DoD run 2, so the probe is calibrated.
- CR9-1 is the same class in fields no probe form reaches: `record` has no exported predicate for
  them. It is low and fail-closed: no node gets the wrong component.

### Maintainability — PASS
Eight bundled copies match the source; `bundle:check` reports 0 problems.

---

## Code Review

**Correctness bugs (2):**
- [low/high] `shared/resources/wireframe-map.js:280`: the new guard covers only `--signature`. `record` writes six other values through `cell()`, which escapes only `|`, so a newline in `--notes` or `--component` still splits the row. → Refuse `\r` / `\n` for every written value and test each field. **Promoted to gate `top_issues` as TASK-243-CR9-1** (`code_review_blocking`).
- [low/medium] `shared/resources/wireframe-map.js:329`: a backtick inside the flag or attribute list breaks the cell. → Reject or escape backticks. Advisory (TASK-243-CR9-2).

**Cleanups (0)**

Anchors: both `ok` against `c9f77474` (`finding-anchors.js`).

mutation-proven: removed `if (/[\r\n]/.test(sig)) return null;` from `parsePattern` → `record refuses a signature with a line break and leaves the map unchanged` went red (17/18), green on restore (18/18) → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shared/resources/tests/wireframe-map.test.mjs` | PASS 18/18 |
| `evals/shared/tests/wireframe-mapping-hooks.test.mjs` | PASS 21/21 |
| `npm run validate` for create-story, create-task, develop-story, develop-task, qa-story, qa-task, review-story, review-task | PASS ×8 |
| `npm run bundle:check` | PASS (0 problems) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/wireframe-map.js`, `shared/resources/tests/wireframe-map.test.mjs`, `skills/*/references/wireframe-map.js` (8)

### Test Commands Executed
```bash
node --test shared/resources/tests/wireframe-map.test.mjs evals/shared/tests/wireframe-mapping-hooks.test.mjs
npm run validate -- skills/<each of the eight>/
npm run bundle:check
node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure \
  --entry 'shared/resources/wireframe-map.js#parsePattern' --cases-file task.243.dod.2.security.cases.3.json \
  --record task.243.qa.9.security.run.json --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 785
```

### Coverage Report
Not measured (the repository's test runner reports no coverage).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. TASK-243-CR9-1: refuse line breaks in every value `record` writes. This finishes the class the DoD run 2 gap named.
2. TASK-243-CR9-2: reject or escape backticks in signature and label.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The DoD gap is fixed, mutation-proven and re-probed clean. The only findings are low.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.243.qa.9.wireframe-component-mapping.md`
**Gate File**: co-located at `task.243.gate.9.wireframe-component-mapping.yml`
**Next Steps**: route per the develop-task QA loop. A PASS gate whose only open entry is low takes the Cosmetic-residue exit (2b), unless CR9-1 is fixed in a further cycle.
