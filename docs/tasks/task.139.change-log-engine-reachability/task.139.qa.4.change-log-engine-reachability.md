# QA Report: Task 139 - The Change Log engine is unreachable from a skill whose prose runs it

**Task**: [task.139.change-log-engine-reachability.md](./task.139.change-log-engine-reachability.md)
**Gate File**: [task.139.gate.4.change-log-engine-reachability.yml](./task.139.gate.4.change-log-engine-reachability.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Testing Completed**: 2026-09-22
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 re-reviews cycle 3's fix (`6b72f629`). Every one of the eleven cycle-3 findings is verified closed **by execution** (task.42 → 17 links; the task doc from a skill cwd → 0 dead; `--file missing.md` → usage 2; open-fence fixture → exit 1; corpus guard 170 docs / 1,245 links against its floors). The fix introduced one medium/high defect: on a CRLF document no fence opens and the paragraph splitter never fires, so the open-fence finding cannot report and the cross-paragraph code-span swallow returns. The repository has no CRLF files, but the engine ships to consumers. Promoted; seven advisories (`documentPath` unconstrained, opener lookbehind, container-indented fences, ref-def/escaped-bracket false positives, per-doc `rev-parse`, stale header sentence, wrong-operand error message).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix C4-CR-1, re-review

---

## Re-Review Context

Re-review scope: since 2026-09-22T06:49:01Z (gate.3; default narrowing — `SAFETY_REPROBE=false`). 11 files; 1,503-line scoped diff.

| Prior issue | Status | Verification |
| --- | --- | --- |
| TQ-1 exit-after-write | **FIXED** | 0 `process.exit(` in source; guard green in `ci:fast` |
| CR-1 fence desync | **FIXED** | task.42 → 17 links; open-fence fixture exits 1 with ✖ (mutation-proven) |
| CR-2 cwd-relative | **FIXED** | from `skills/review-task` via bare `references/doc-links.js` → 5 links resolve, exit 0 |
| CR-3 unbound variable | **FIXED** | `{resolved task file path}` / `{resolved story file path}` |
| CR-4 bare path | **FIXED** | 0 bare `node references/doc-links.js`; root-anchored form at all sites |
| CR-5 documentPath | **FIXED** (see C4-CR-2 for the residual) | evaluator + test, mutation-proven |
| CR-6..CR-10 | **FIXED** | fixtures present and green |

---

## New Findings This Cycle

- **[medium/high]** `shared/resources/doc-links.js:60,118` — CRLF: no fence opens, paragraphs never split → open-fence finding cannot report; cross-paragraph swallow returns. (C4-CR-1 — promoted)
- **[medium/medium]** `finalise-fix-and-recheck.mjs:140` — `documentPath` admits any string equal to it (`README.md` passes). (C4-CR-2)
- **[low/high]** `doc-links.js:122` — opener lacks `(?<!`)`; `` ``[x](a.md)` then [y](b.md) `` hides `a.md`. (C4-CR-3)
- **[low/medium]** fences indented ≥ 4 columns inside a list item unrecognised → false ✖. (C4-CR-4)
- **[low/high]** `[Note]: see below` reads as a ref-def; `\[not\](a.md)` reads as a link. (C4-CR-5)
- **[cleanup]** per-document `rev-parse` (~2.1 s corpus); stale header sentence; `--root /nope` reported as "cannot read <file>". (C4-CR-6..8)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phases 1–4 (original) | PASS | unchanged since gate.2 |
| obs #154 addition | CONCERNS | C4-CR-1 |

## Success Criteria Verification

SC1–SC7 unchanged (all PASS).

## Breaking Changes Validation

None declared; none found. PASS.

## Issues Found

HIGH: 0 · MEDIUM: 2 (1 promoted) · LOW: 6

## NFR Assessment

Performance PASS (C4-CR-6 advisory) · Reliability **CONCERNS** (C4-CR-1) · Security PASS (reasoned, boundary: false, probes 0) · Maintainability PASS (C4-CR-7 advisory)

## Code Review

Step 3b — blocking, scoped. 5 bugs + 3 cleanups; 1 promoted. Provenance: all in files added on this branch. Mutation-proven this cycle: open-fence finding removed → its test red → `covered`. Step 4b: unchanged from cycle 3 (0 findings with the document bound; remaining placeholders pre-existing).

## Regression Testing

`npm run ci:fast` 3903/3903 · `npm run bundle:check` 0 problems · `doc-links.test.mjs` 11/11 · `finalise-fix-and-recheck.test.mjs` 23/23

## Recommendations

**Immediate**: C4-CR-1. **Short-term**: C4-CR-2..8.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on C4-CR-1.

**Next Steps**: `/qa-fix` on gate.4 (cycle 4 of 5); cycle 5 re-review.
