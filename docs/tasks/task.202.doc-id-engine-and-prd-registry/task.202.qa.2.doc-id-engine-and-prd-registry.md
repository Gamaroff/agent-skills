# QA Report: Task 202 - Doc-id engine and PRD registry (cycle 2)

**Task**: [Link to task document](./task.202.doc-id-engine-and-prd-registry.md)
**Gate File**: [task.202.gate.2.doc-id-engine-and-prd-registry.yml](./task.202.gate.2.doc-id-engine-and-prd-registry.yml)
**Previous Gate**: [task.202.gate.1.doc-id-engine-and-prd-registry.yml](./task.202.gate.1.doc-id-engine-and-prd-registry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Every cycle-1 finding is fixed, each with a regression test that goes red when the fix is reverted, and the security probe now `engages`. The cycle-2 refute pass found three new medium defects, and QA found a fourth: a regression introduced by the cycle-1 CR-10 fix. No HIGH findings.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| PROBE-1 unsafe integers | ✅ FIXED | probe case `docid.huge-number` rejected; test "PROBE-1…" |
| CR-1 reuse claim | ✅ FIXED | standards reworded; test "CR-1…" |
| CR-2 next under a missing parent | ✅ FIXED | test "CR-2…" (but see new CR-1: an unreadable child directory) |
| CR-3 format round-trip | ⚠️ PARTIAL | the drift check now rejects string-number parts (new CR-3) |
| CR-5 runCli cwd | ✅ FIXED | test "CR-5…" |
| CR-6 registry fence/table rows | ⚠️ PARTIAL | fenced rows skipped, but the reader now disagrees with the selector (new CR-2, CR-4, CR-8) |
| CR-7 counter validity | ✅ FIXED | test "CR-7…" |
| CR-8 missing file | ✅ FIXED | test "CR-8…" |
| CR-4 / CR-9 / CR-10 (advisory, fixed) | ✅ FIXED, with residue | CR-9's comment strip is quadratic and greedy (new CR-5, CR-6); CR-10 made sprint-review-summary artifacts count as documents (QA-1) |

## New Findings This Cycle

- **[medium]** `shared/resources/doc-id.js` — QA-1: a lone `sprint-review-summary` segment reads as a document slug; the corpus walk now counts the five legacy `story.N.N.sprint-review-summary.md` files (`check --corpus` documents 29 → 34, measured by diffing the finding paths of the 3f32dfa9 engine against the current one)
- **[medium]** `shared/resources/doc-id.js:720` — CR-1: allocator reads an unreadable directory as empty
- **[medium]** `shared/resources/doc-id.js:324` — CR-2: registry reader disagrees with `parseRegistry`
- **[medium]** `shared/resources/doc-id.js:266` — CR-3: `format()` rejects string-number parts
- **[low]** CR-4 (fence-blind counter), CR-5 (greedy quoted value), CR-6 (quadratic frontmatter regexes), CR-8 (fence length)
- Advisory: CR-7 (PRD review full-stem shape), CR-9 (unreadable document/registry reasons), CR-10 (malformed counter reads as missing), CR-11 (JSDoc)

---

## Review Methodology

Re-review, cycle 2: whole-branch diff (`origin/develop...HEAD`, 2643 lines, `docs/tasks/` excluded) reviewed by one read-only Explore reviewer with the REFUTE PASS directive. Its completion notice reports `duration_ms` 302784 (about 5.0 minutes). Safety re-probe: false (clause 1 false; the prior gate's security status was CONCERNS, not FAIL).

Re-review scope: whole branch (cycle 2 refute pass)

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Grammar and pure functions | CONCERNS | QA-1, CR-3 |
| Phase 2: Checks and CLI | CONCERNS | CR-1, CR-2, CR-4–CR-6, CR-8 |
| Phase 3: Registry parser and standards | PASS | CR-11 (JSDoc) advisory |

---

## Success Criteria Verification

Unchanged from cycle 1, all PASS, re-run on head e096933d: `doc-id.test.mjs` 39/39; `select-next.test.mjs` green; `npm run ci:fast` 5553 tests, 0 failures (qa-fix fast gate). Performance: `check --corpus` 0.035 s on head e096933d, `uptime` load 0.88, 1.05, 1.04.

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30
- `security-probe.mjs --sink filename --cases-file doc-id.cases.json --entry shared/resources/doc-id.js#parse`: `engages`. 23 hostile cases rejected (including the three unsafe-integer forms), 7 legitimate accepted. Record: `task.202.qa.2.security.run.json`. The case `docid.unsafe-seq` was re-specified from hostile to legitimate before this run. An unsafe seq falls to the keyword branch, so it is a non-canonical artifact with `seq: null`, which is the documented grammar and not a lossy number. The cases file was compared with the committed PROBE-1 test, which asserts the same outcome.

### Performance — CONCERNS
CR-6: a crafted whitespace run makes `frontmatterField` quadratic (7 s at 40k characters, the reviewer's timing).

### Reliability — CONCERNS
CR-1, CR-2.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (10):**
- [medium/high] `shared/resources/doc-id.js:720` — `childDirs` / `allDirs` read an unreadable directory as empty (CR-1, promoted)
- [medium/high] `shared/resources/doc-id.js:324` — the registry reader disagrees with `parseRegistry` (CR-2, promoted)
- [medium/high] `shared/resources/doc-id.js:266` — strict `!==` rejects string-number parts (CR-3, promoted)
- [low/high] `shared/resources/doc-id.js:356` — the counter is read fence-blind (CR-4, promoted)
- [low/high] `shared/resources/doc-id.js:427` — the quoted branch is greedy (CR-5, promoted)
- [low/high] `shared/resources/doc-id.js:429` — quadratic regexes (CR-6, promoted)
- [low/medium] `docs/standards/file-naming.md:84` — the PRD review full-stem shape is not canonical (CR-7, advisory)
- [low/high] `shared/resources/doc-id.js:316` — fence length is ignored (CR-8, promoted)
- [low/medium] `shared/resources/doc-id.js:489` — an unreadable document is reported as `frontmatter-mismatch` (CR-9, advisory)
- [low/medium] `shared/resources/doc-id.js:357` — a malformed counter is reported as `registry-missing` (CR-10, advisory)

**Cleanups (1):**
- `skills/develop-next/scripts/select-next.mjs:1206` — the JSDoc kind union omits `prd` (CR-11)

All 11 anchors checked with `finding-anchors.js --rev HEAD`: `ok`.

**Boundary:** `boundary: true` (`parse`). `probes_executed: 30`, copied from the run record's `totals.executed`.

**Mutation spot check — cycle-1 fixes** (each fix reverted in turn, `node --test shared/resources/tests/doc-id.test.mjs`):
mutation-proven: PROBE-1 safe-integer guard → "PROBE-1…" → covered
mutation-proven: CR-3 drift check → "CR-3…" → covered
mutation-proven: CR-6 table tracking → "CR-6…" → covered
mutation-proven: CR-7 counter check → "CR-7…" → covered
mutation-proven: CR-8 existence check → "CR-8…" → covered
mutation-proven: CR-9 comment strip → "CR-9…" → covered
mutation-proven: CR-4 unreadable → "CR-4…" → covered
mutation-proven: CR-10 trailing keyword → "CR-10…" → covered
mutation-proven: CR-2 parent check → "CR-2…" → covered
mutation-proven: CR-5 cwd resolution → "CR-5…" → covered

**Provenance:** every finding is in code this branch adds.

---

## Final Assessment

**Gate Status**: CONCERNS — **Quality Score**: 60/100 — **Deployment**: CONDITIONAL
**Next Steps**: `/qa-fix` cycle 2. Every MEDIUM on gates 1 and 2 is in `shared/resources/doc-id.js` at HIGH 0, which is the narrowing-residue shape. Prefer a structural move for the registry reader, and do not add another patch.
