---
type: review
description: 'review-bug validate-and-apply report for bug.22 — READY TO FIX'
---

# Bug Review — bug.22

**Reviewed:** 2026-11-14
**reviewed_blob:** b7e5a58a67d4511af2890470b1c92289fa1326ff
**Mode:** validate-and-apply (develop-bug Step 2, in-line pre-pass)
**Recommendation:** ✅ READY TO FIX
**Fix-readiness:** 9/10 — Completeness 9, Reproducibility 9, Classification 9, Linkage 9
**Issues:** Critical 0 · Important 0 · Optional 1

## Pre-pass

- **Duplicate:** none. The only bug document mentioning `excludedPrds` is this one; registry rows 1–21 name other defects.
- **Already fixed / stale:** `reproduces: likely`. `skills/qa-next/scripts/uat-status.mjs` still builds the set from `cfg.excludedPrds` (line 237) and tests `relative(base, file).split("/")[0]` (line 244). `grep -n 'excludedPrds' skills/qa-next/scripts/*.mjs` shows no other matcher.

## Findings

| Dimension | Result |
| :-- | :-- |
| Template and frontmatter | `type: bug`, status, severity, priority, created, related, description all present. |
| Reproducibility | Numbered steps on a concrete fixture, expected and actual explicit, evidence with a grep and a tinker-city commit. |
| Severity and priority | Minor / Medium fits a silent coverage miss with a workaround. |
| Linkage | General bug; registry row 22 reads `new`, matching frontmatter. |

**Optional:** the Evidence grep cites line 244 on `develop` at `8263f97c`; the site is now at line 244 still, and `excludedPrds` is read at 237. No edit needed.

## Next Steps

Proceed to Step 3. The report's own "Suggested fix" and "Tests to add" are the plan: match each path segment that is a PRD folder, recognised through `doc-id.js`; keep first-segment matching.
