# QA Report: Task 202 - Doc-id engine and PRD registry (cycle 5)

**Task**: [Link to task document](./task.202.doc-id-engine-and-prd-registry.md)
**Gate File**: [task.202.gate.5.doc-id-engine-and-prd-registry.yml](./task.202.gate.5.doc-id-engine-and-prd-registry.yml)
**Previous Gate**: [task.202.gate.4.doc-id-engine-and-prd-registry.yml](./task.202.gate.4.doc-id-engine-and-prd-registry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 holds. `parse()` is unchanged over all 4708 distinct tracked path segments. `parseLegacy()` changes only the 23 intended new-scheme refusals, and all 135 legacy docs/prd names read as before. One medium finding remains: the digit-first refusal misses the sub-story suffix, so `parseLegacy` still accepts `story.1.2.3A.*` artifacts. No HIGH findings.

**Overall Assessment**: CONCERNS — **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 4 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 shared docSlug guard | ✅ FIXED | test "CR-1 (cycle 4)…"; 0 parse() differences over the tree |
| CR-2 (advisory) parseLegacy claims new-scheme names | ⚠️ PARTIAL | refused for plain ids; a sub-story suffix escapes (new CR-1) |

## New Findings This Cycle

- **[medium]** `shared/resources/doc-id.js:261` — CR-1: the digit-first guard misses `story.1.2.3A.*`

---

## Review Methodology

`Re-review scope: files changed since gate 4 (head 1254d3089e62; 2 files) — default`. One read-only Explore reviewer; its completion notice reports `duration_ms` 60778 (about 1.0 minute). Safety re-probe: false. Step 4b: not applicable.

---

## Success Criteria Verification

Unchanged, all PASS. Measured on head 5fbf970b: `npm run ci:fast` 5569 tests, 0 failures (cycle 4's fix gate). `check --corpus` ran in 0.031 s at `uptime` load 2.25, 2.50, 2.04.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30
- `engages`. Record: `task.202.qa.5.security.run.json`.

### Performance — PASS
### Reliability — PASS
### Maintainability — PASS

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `shared/resources/doc-id.js:261` — the sub-story suffix escapes the parseLegacy digit-first guard (CR-1, promoted)

**Boundary:** `boundary: true` (`parse`). `probes_executed: 30`.

**Provenance:** introduced by cycle 4's fix (5fbf970b). The guard is new; the escape is in its pattern.

---

## Final Assessment

**Gate Status**: CONCERNS — **Quality Score**: 90/100. HIGH 0 ×5; MEDIUM 4, 4, 1, 1, 1.
