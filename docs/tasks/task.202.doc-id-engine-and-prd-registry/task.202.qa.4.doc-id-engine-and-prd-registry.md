# QA Report: Task 202 - Doc-id engine and PRD registry (cycle 4)

**Task**: [Link to task document](./task.202.doc-id-engine-and-prd-registry.md)
**Gate File**: [task.202.gate.4.doc-id-engine-and-prd-registry.yml](./task.202.gate.4.doc-id-engine-and-prd-registry.yml)
**Previous Gate**: [task.202.gate.3.doc-id-engine-and-prd-registry.yml](./task.202.gate.3.doc-id-engine-and-prd-registry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 holds on the whole tracked tree. Across all 5808 tracked files, parse and parseLegacy changed only the 4 intended fixture results. frontmatterField is unchanged on all 568 documents and agrees with PyYAML on the 567 that parse. One medium regression remains: cycle 3's docSlug guard sits in the shared path, so `parse()` refuses digit-first bug and task full-stem review reports. No HIGH findings.

**Overall Assessment**: CONCERNS — **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 3 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 parseLegacy reads new-scheme full-stem artifacts | ⚠️ PARTIAL | canonical:false now, but the guard also blocks `parse()` for loose kinds (new CR-1); parseLegacy still returns a non-canonical artifact (advisory CR-2) |
| CR-3 unreadable registry in `next prd` | ✅ FIXED | test "CR-3 (cycle 3)…" |
| CR-2 / CR-4 / CR-5 (advisory, fixed) | ✅ FIXED | tests "CR-2 (cycle 3)…", "CR-4 (cycle 3)…"; reviewer probes on next epic/story |

## New Findings This Cycle

- **[medium]** `shared/resources/doc-id.js:150` — CR-1: the shared docSlug guard refuses `bug.20.404-on-refresh.review.1.fix-readiness.md` in `parse()`
- Advisory: **[low]** `shared/resources/tests/doc-id.test.mjs:981` — CR-2: parseLegacy still returns `ok: true` (non-canonical) for a new-scheme artifact

---

## Review Methodology

`Re-review scope: files changed since gate 3 (head 5e8228324fe2; 2 files) — default`. One read-only Explore reviewer; its completion notice reports `duration_ms` 118514 (about 2.0 minutes). Safety re-probe: false. Step 4b: not applicable.

---

## Success Criteria Verification

Unchanged, all PASS. Measured on head 1254d308: `npm run ci:fast` 5567 tests, 0 failures (cycle 3's fix gate). `check --corpus` ran in 0.030 s at `uptime` load 1.40, 1.82, 1.76.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30
- `engages`. Record: `task.202.qa.4.security.run.json`.

### Performance — PASS
### Reliability — PASS
### Maintainability — PASS

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `shared/resources/doc-id.js:150` — the shared docSlug guard blocks loose-kind full-stem reviews (CR-1, promoted)
- [low/medium] `shared/resources/tests/doc-id.test.mjs:981` — the test pins canonical:false only; parseLegacy still answers ok (CR-2, advisory)

**Boundary:** `boundary: true` (`parse`). `probes_executed: 30`.

**Provenance:** introduced by cycle 3's fix (1254d308).

---

## Final Assessment

**Gate Status**: CONCERNS — **Quality Score**: 90/100 — **Loop route**: `continue (not-a-pass-gate)`. HIGH 0, 0, 0, 0.
