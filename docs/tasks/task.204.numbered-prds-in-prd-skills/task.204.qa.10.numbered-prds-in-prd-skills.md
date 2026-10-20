# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 10)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.10.numbered-prds-in-prd-skills.yml](./task.204.gate.10.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 10 at `8c1b6d4e`, the last cycle of the re-entry budget. Gate 9's four findings are fixed and
verified. Two reproduced mediums, both in cycle 9's new reference test inside the migration guard.

## Re-Review Context

| Gate-9 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 vendored prose blocked every migration | ✅ FIXED | gate-9 row; reviewer re-probe |
| CR-2 reference-doc PRD subtree paths | ✅ FIXED | docs match create-prd / create-epic / create-story |
| CR-4 jq precedence | ✅ FIXED | gate-9 row |
| CR-5 regex metacharacters | ✅ FIXED (fixed-string search) — see new CR-1 | gate-9 row |

## New Findings This Cycle

- **[medium]** `skills/review-prd/scripts/migration-guard.mjs:119` — C-quoted `git grep` paths read as no reference (**CR-1**).
- **[medium]** `skills/review-prd/scripts/migration-guard.mjs:104` — quadratic token scan (**CR-2**).
- **[low, medium confidence]** link forms the regex misses (CR-3); no right boundary, repo-relative rule on link targets (CR-4); runbook epic-registry prose (CR-5) — advisory.

## Review Methodology

Re-review scope: files changed since gate 9 (head `a8810b54`; 8 files) — default. `SAFETY_REPROBE=false`.
One Explore reviewer; 295 s (completion notice `duration_ms` 295131). Probe 24/engages.

## NFR Assessment

Security — PASS (measured, 24) · Performance — CONCERNS (CR-2) · Reliability — CONCERNS (CR-1) · Maintainability — PASS

## Final Assessment

**Gate Status**: CONCERNS — two medium. **Quality Score**: 80/100. **Next Steps**: `/qa-fix` cycle 10.
