# Bug Report: Task 135 - The freshness test accepts a zone-less updated:, so its verdict depends on TZ

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe, CR3-5)
**Date Found**: 2026-09-30

## Description
`Date.parse` reads `2026-09-20T11:00:00` as local time — 02:00Z in Tokyo, 18:00Z in Los Angeles — so the author-time verdict on a typed local-time gate (task.130's shape) varies by machine. Date-only values and `1` (parsed as 2001) also pass.

## Recommendation
Require the `date -u` shape (with `Z` or an explicit offset) before `Date.parse`; fixtures for zone-less and date-only values.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: `updated:` must match the ISO-8601 instant shape with `Z` or an explicit offset before `Date.parse`. Fixtures: zone-less, date-only, `1` → red; `+02:00` → fresh. Mutation M21 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 3 |
