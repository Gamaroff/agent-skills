# QA Report: Task 202 - Doc-id engine and PRD registry (cycle 3)

**Task**: [Link to task document](./task.202.doc-id-engine-and-prd-registry.md)
**Gate File**: [task.202.gate.3.doc-id-engine-and-prd-registry.yml](./task.202.gate.3.doc-id-engine-and-prd-registry.yml)
**Previous Gate**: [task.202.gate.2.doc-id-engine-and-prd-registry.yml](./task.202.gate.2.doc-id-engine-and-prd-registry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Every cycle-2 fix holds. The reviewer re-ran `scanRegistry` against `parseRegistry` on 15 inputs the parity test does not cover, and they agreed on all 15. The security probe engages. One medium defect remains, introduced by cycle 2's full-stem branch: `parseLegacy` now accepts new-scheme artifacts as canonical legacy ones. There is one low. No HIGH findings.

**Overall Assessment**: CONCERNS — **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| QA-1 sprint-review-summary | ✅ FIXED | test "QA-1…"; `check --corpus` back to 29 documents |
| CR-1 allocator over an unreadable directory | ✅ FIXED | test "CR-1…" (residue: CR-3 below, the registry file itself) |
| CR-2 registry reader parity | ✅ FIXED | parity test (8 inputs) plus the reviewer's 15 further inputs, all agree |
| CR-3 string-number parts | ✅ FIXED | test "CR-3…" |
| CR-4 fenced counter | ✅ FIXED | test "CR-4…" |
| CR-5 / CR-6 frontmatter reader | ✅ FIXED, with residue | linear and quote-correct; closing-fence edge (advisory CR-2 below) |
| CR-8 fence length | ✅ FIXED by parity | parity test's 4-backtick input |
| CR-7 / CR-9 / CR-10 / CR-11 (advisory, fixed) | ✅ FIXED, with residue | CR-7's branch is the source of this cycle's CR-1 |

## New Findings This Cycle

- **[medium]** `shared/resources/doc-id.js:147` — CR-1: the 4-segment branch uses the caller's slug rule, so `parseLegacy("epic.1.1.review.1.hero.md")` is a canonical legacy artifact with `docSlug: "1"`
- **[low]** `shared/resources/doc-id.js:942` — CR-3: `next prd` reports an unreadable registry as `registry-missing`
- Advisory: CR-2 (closing `---` with trailing spaces / an unclosed block), CR-4 (`format` drops slug/seq on sprint-review-summary silently), CR-5 (parent directory read twice)

---

## Review Methodology

Re-review, cycle 3: `Re-review scope: files changed since gate 2 (head e096933dcdd5; 5 files) — default`. One read-only Explore reviewer; its completion notice reports `duration_ms` 179827 (about 3.0 minutes). Safety re-probe: false. Step 4b: not applicable.

The cycle-2 fix commit 5e822832 is local and unpushed (the 5b fast gate hit its 2-attempt bound). This review read the committed local state, which is what Step 3b reads.

---

## Success Criteria Verification

Unchanged, all PASS. Measured on head 5e822832: `doc-id.test.mjs` 49/49 and `load-sensitive-marker.test.js` green. `check --corpus` over docs/prd counts 29 documents. A full `npm run ci:fast` was not re-run green on this head; the cycle-3 fix gate runs it.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30
- `security-probe.mjs` on `doc-id.js#parse`: `engages`. Record: `task.202.qa.3.security.run.json`.

### Performance — PASS
### Reliability — PASS (one low residual, CR-3)
### Maintainability — PASS

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `shared/resources/doc-id.js:147` — new-scheme artifacts read as canonical legacy ones (CR-1, promoted)
- [medium/medium] `shared/resources/doc-id.js:536` — the closing fence must be exact `---`; an unclosed block reads the body (CR-2, advisory)
- [low/high] `shared/resources/doc-id.js:942` — unreadable registry reported as `registry-missing` in `next prd` (CR-3, promoted)
- [low/medium] `shared/resources/doc-id.js:324` — `format` drops slug/seq on sprint-review-summary without an error (CR-4, advisory)

**Cleanups (1):**
- `shared/resources/doc-id.js:972` — the parent directory is read twice (CR-5)

All 5 anchors checked with `finding-anchors.js --rev HEAD`: `ok` (no line text supplied, so each was checked as a path and line range).

**Boundary:** `boundary: true` (`parse`). `probes_executed: 30` (run record `totals.executed`).

**Provenance:** every finding is in code this branch adds.

---

## Final Assessment

**Gate Status**: CONCERNS — **Quality Score**: 90/100 — **Deployment**: CONDITIONAL
**Loop route**: `continue (not-a-pass-gate)` (`classifyLoopRoute`). The convergence check does not trip: HIGH is 0, 0, 0.
