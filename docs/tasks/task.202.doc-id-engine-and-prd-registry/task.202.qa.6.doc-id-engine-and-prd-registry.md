# QA Report: Task 202 - Doc-id engine and PRD registry (cycle 6)

**Task**: [Link to task document](./task.202.doc-id-engine-and-prd-registry.md)
**Gate File**: [task.202.gate.6.doc-id-engine-and-prd-registry.yml](./task.202.gate.6.doc-id-engine-and-prd-registry.yml)
**Previous Gate**: [task.202.gate.5.doc-id-engine-and-prd-registry.yml](./task.202.gate.5.doc-id-engine-and-prd-registry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: PASS

---

## Executive Summary

This is the first cycle of the 2 granted after the loop-limit escalation. Cycle 5's fix holds: `parseLegacy` refuses new-scheme sub-story names, and over all 4712 distinct tracked filename segments it shows 0 other differences. Every legacy `docs/prd` shape still reads, including legacy sub-stories and slugs that start with a digit. No findings this cycle.

**Overall Assessment**: PASS — **Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Gate 5 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 sub-story suffix escaped the parseLegacy guard | ✅ FIXED | test "CR-2 (cycle 4)…", which now includes the 3 sub-story cases; reviewer's old-vs-new run over the tracked tree |

## New Findings This Cycle

None. The search covered the full branch patch of `shared/resources/doc-id.js` and its test (2186 lines). `parseLegacy` was run in its old (5fbf970b) and new form over all 4712 distinct tracked filename segments. The legacy shapes under `docs/prd` were re-checked: 128 of 135 read, and all 21 directory segments read. The 7 that do not are `story.*.validate.<date>` names, which were refused before this change too.

---

## Review Methodology

`Re-review scope: files changed since gate 5 (head 5fbf970b3312; 2 files) — default`. One read-only Explore reviewer; its completion notice reports `duration_ms` 43786 (about 0.7 minutes). Safety re-probe: false. Step 4b: not applicable.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| parse/format round-trip every generated name | `doc-id.test.mjs` round-trip test (6 ids × 16 shapes) | PASS |
| `matchesEpic` true / false cases | `doc-id.test.mjs` "matchesEpic: P is required…" | PASS |
| `nextNumber("story", …)` returns 4 | `doc-id.test.mjs` "nextNumber: highest + 1…" | PASS |
| `check --corpus` one finding per seeded defect, `ok` on the valid chain | `doc-id.test.mjs` corpus tests | PASS |
| `parseRegistry` reads the PRD row; a roadmap PRD link is not a work item | `select-next.test.mjs` task.202 tests; doc-id parity test | PASS |
| `check --corpus` < 1 s | 0.032 s on head 8103737b, `uptime` load 1.72, 1.40, 1.34 | PASS |
| No new runtime dependency | `package.json` unchanged | PASS |
| `npm test` with `.agents/skills` moved aside | `npm run ci:fast` 5569 tests, 0 failures (cycle 5 fix gate, head 0399f61f; 8103737b changes only the implementation report) | PASS |
| Every `check` reason mutation-proven | implementation report (develop step) and gates 1–5 | PASS |
| `npm run bundle:check` clean | develop step; rerun by the pre-commit hook on every commit | PASS |
| Standards carry the dated interim note; prd-registry.md complete; epic-registry.md names task 203 | standards diff | PASS |

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30
- `engages`. Record: `task.202.qa.6.security.run.json`.

### Performance — PASS
### Reliability — PASS
### Maintainability — PASS

---

## Code Review

No findings (0 bugs, 0 cleanups).

**Boundary:** `boundary: true` (`parse`). `probes_executed: 30` (run record `totals.executed`).

---

## Final Assessment

**Gate Status**: PASS — **Quality Score**: 100/100 — **Deployment**: APPROVED
**Next Steps**: Step 5c PR conformance review.
