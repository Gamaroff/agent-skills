---
id: task.43.audit-log-retention
status: draft
created: 2026-05-10
epic: epic.7.platform-core
sign_off_roles: [CTO, Tech Lead, Design (optional)]
---

# Task 43 — Audit log retention

**Task ID**: TASK-43
**Created**: 2026-05-10

## 1. Overview

Simplify the cache lib by collapsing the three-tier adapter chain into a single
strategy interface. Architectural source: [Source: docs/architecture/tech-stack.md#caching].

## 2. Motivation

Current adapter chain duplicates logic across L1/L2/L3 tiers. Per
[Source: docs/architecture/coding-standards.md#naming], strategy classes should
follow kebab-case file naming, which the new layout enforces.

## 3. Technical Background

Cache lib lives under `packages/cache`. The three adapters share ~80% surface.

## 4. Scope

In scope: collapse adapters, migrate callers. Out of scope: cache eviction policy.

## 5. Breaking Changes

`CacheAdapter` is removed. Callers must migrate to `CacheStrategy`.

## 6. Implementation Plan

1. Introduce `CacheStrategy` interface.
2. Port L1/L2/L3 adapters.
3. Delete adapter chain.

## 7. Files Summary

- `packages/cache/src/strategy.ts` — new
- `packages/cache/src/adapters/*` — removed

## 8. Testing Strategy

Unit tests on `CacheStrategy`. Integration tests on call sites.

## 9. Success Criteria

- All adapters removed.
- No callers reference `CacheAdapter`.
- Test suite green.

## 10. Risk Assessment

Low — callers are internal. Migration is mechanical.

## 11. Rollback Plan

Revert the commit. Adapter chain has no persistent state.

## Stakeholder Sign-off

Development must not begin until every required role below has signed. To sign, replace your **Signature** cell with your name and today's date, then commit the change yourself — your commit authorship is the audit trail.

| Role              | Signature | Date |
| ----------------- | --------- | ---- |
| CTO               |           |      |
| Tech Lead         |           |      |
| Design (optional) |           |      |

**Sign-off status:** Pending — 0 of 2 required signatures

## Progress Tracking

### Phase 1
- [ ] Collapse adapter chain
- [ ] Update callers
