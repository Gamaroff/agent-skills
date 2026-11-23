---
id: task.305
title: "Jira sync maps the superseded status"
type: task
description: "Follow-up to PR 878: superseded is now a valid terminal task status, but the Jira status map has no entry for it, so a superseded task finds no Jira transition. Map it, decide the Jira state it lands in, and check the GitHub ladder for the same gap."
tags: [jira, sync, status-lifecycle]
category: other
status: accepted
priority: Medium
created: 2026-11-11
updated: 2026-11-23
completed_date: 2026-11-23
pr_number: 930
estimated_effort_hours: 4
---

# Technical Task: Jira sync maps the superseded status

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.305.review.1.jira-sync-maps-superseded-status.md` implemented 2026-11-23

Follow-up to PR #878 (`fix/superseded-task-status`), which made `superseded` a valid terminal task status in the selector and in `document-status-lifecycle.md`. That PR left the tracker side alone on purpose. This task covers it.

---

## 1. Overview

A task whose frontmatter says `status: superseded` has no mapped Jira transition. This task:

1. Decides which Jira state a superseded task lands in (an **owner decision**, below).
2. Adds `superseded` to the one shared status map and to the two terminal-status sets that drive the fallback and the resolution.
3. Checks the GitHub path (`gh-stage.js` `documentStatus` ladder) for the same gap and closes it or records why not.
4. Holds each with a test that goes red when the mapping is removed.

## 2. Motivation

- `mapStatusCandidates` returns the raw word when the map has no key (`shared/resources/jira-sync.js:3859`, `if (hit == null) return [stripped];`). A superseded task therefore looks for a Jira transition literally named "Superseded". Boards rarely have one, so the sync finds no transition for it.
- `isTerminalLocalStatus` and `isNegativeLocalStatus` (`jira-sync.js:3876`, `:3880`) read `TERMINAL_LOCAL_STATUSES` (`:3505`) and `NEGATIVE_LOCAL_STATUSES` (`:3524`). `superseded` is in neither, so the `statusCategory=done` fallback is not used and no negative resolution is chosen.
- tinker-city already files replaced tasks as `superseded` (task.24, task.48), so this is a live gap, not a hypothetical.

## 3. Technical Background

**Current state (grepped 2026-11-11, `develop` at `8263f97c`):**

- `DEFAULT_STATUS_MAP`: `shared/resources/jira-sync.js:3459`. Keys today: the canonical lifecycle plus `cancelled: CANCELLED_CANDIDATES` (`:3467`) and aliases. No `superseded`.
- `CANCELLED_CANDIDATES`: `jira-sync.js:3264` = Cancelled, Canceled, Won't Do, Rejected, Closed.
- `TERMINAL_LOCAL_STATUSES` `:3505`, `NEGATIVE_LOCAL_STATUSES` `:3524`: neither holds `superseded`.
- The GitHub ladder scaffold: `shared/resources/gh-stage.js:1944` writes `cancelled: ...` under `documentStatus:` and no `superseded`.
- `documentStatus` in `shared/resources/tracker-workflow.js:398-412` is an open map: the loop at `:405` stores every non-empty `local: target` pair and checks no key against the lifecycle (verified at review, 2026-11-23). So an unknown key is accepted, and Phase 3 adds a scaffold line; it does not widen an allowed set.
- Existing tests that read the map: `shared/resources/tests/jira-ready-for-development-candidates.test.mjs` (names `DEFAULT_STATUS_MAP`). All four `sync-jira-*` scripts reference `jira-sync.js` (`grep -l jira-sync skills/sync-jira-*/scripts/*.js`); `sync-jira-task.js:1081` passes `lib.DEFAULT_STATUS_MAP`. Phase 2 still confirms each by a test rather than by this grep.
- The documented Jira mapping: `shared/resources/document-status-lifecycle.md`, section "External Tracker Mapping (Jira)", lists `cancelled` → `Cancelled` and no `superseded` row. It links to `docs/reference/configuration.md#jira-status-mapping`.

**Owner decision (resolved).** Jira workflows differ, so two options exist. **Option A was taken on 2026-11-23** by the autonomous `/develop-next --defaults` run, on the recommendation below; the config override keeps B available to any board, and the owner can overrule it at review of the PR:

| Option | Lands in | Resolution | Trade-off |
|---|---|---|---|
| A (recommended) | the `CANCELLED_CANDIDATES` family | negative (Won't Do) | replaced work was not delivered; matches how `cancelled` reads. Loses the "replaced, not abandoned" distinction on the board, but the card body can say it |
| B | a Done state | positive | reports replaced work as delivered; flatters the board |

Recommendation: A, with `superseded` added to both terminal sets. A `jira-sync` config override already exists (the map is overlaid at `jira-sync.js:3717`), so a board that wants B can set it.

## 4. Scope

**In scope:** ✅ `jira-sync.js` map and terminal sets ✅ the GitHub `documentStatus` scaffold ✅ the `superseded` row in the Jira mapping table of `document-status-lifecycle.md` ✅ tests with a mutation ✅ bundled copies.

**Out of scope:** ❌ the bug lifecycle map (bugs have their own statuses) ❌ the selector (done in PR #878) ❌ re-vendoring into a consumer repository.

## 5. Breaking Changes

None. A task that was `superseded` already failed to find a transition; it now finds one. A consumer's `jira.statusMap` override for `superseded`, if any, still wins.

## 6. Implementation Plan

> Detailed implementation guide: [task.305.plan.jira-sync-maps-superseded-status.md](task.305.plan.jira-sync-maps-superseded-status.md)

### Phase 1: The Jira map — Risk: Low

**Files:** `shared/resources/jira-sync.js`

- [x] Add `superseded: CANCELLED_CANDIDATES` to `DEFAULT_STATUS_MAP` (owner decision A).
- [x] Add `"superseded"` to `TERMINAL_LOCAL_STATUSES` and `NEGATIVE_LOCAL_STATUSES`.
- [x] Tests: `mapStatusCandidates("superseded")` returns the cancelled family; `isTerminalLocalStatus` and `isNegativeLocalStatus` are true for it.

### Phase 2: One definition, four scripts — Risk: Low

- [x] Confirm each of the four `sync-jira-*` scripts reads the shared map and carries no copy. A test drives each with `status: superseded` and asserts the resolved candidates.

### Phase 3: The GitHub path — Risk: Low

**Files:** `shared/resources/gh-stage.js`, possibly `shared/resources/tracker-workflow.js`

- [x] Add `superseded: ...` to the scaffold ladder in `gh-stage.js` next to `cancelled`, with the same `resolved("done") || last` target. (`tracker-workflow.js:405` accepts any key, so no allow-list changes.)
- [x] A test calls the scaffold builder and asserts the output carries a `superseded:` line whose target equals the `cancelled:` line's. Run `shared/resources/tests/gh-stage.test.mjs` whole: it is the existing suite for that file.

### Phase 3b: The documented mapping — Risk: Low

**Files:** `shared/resources/document-status-lifecycle.md`

- [x] Add a `superseded` → `Cancelled` row to the "External Tracker Mapping (Jira)" table, beside `cancelled`. Check `docs/reference/configuration.md#jira-status-mapping` for a default-mapping table and add the same row if it lists `cancelled`.

### Phase 4: Bundle and mutation — Risk: Low

- [x] `npm run bundle`, `npm run bundle:check`.
- [x] Mutation: remove the map key, then each set entry, then the ladder line. Each turns one named test red.

## 7. Files Summary

1. ✅ `shared/resources/jira-sync.js`
2. ✅ `shared/resources/gh-stage.js` (one scaffold line)
3. ✅ `shared/resources/tests/jira-sync-superseded-status.test.mjs` (new; reached by the `shared/resources/tests/*.test.mjs` glob in `npm run test:suite`)
4. ✅ `shared/resources/document-status-lifecycle.md` (one table row) and `docs/reference/configuration.md` (the default-mapping row and the terminal-fallback sentence)
5. ✅ bundled `references/jira-sync.js`, `gh-stage.js` and `document-status-lifecycle.md` copies under `skills/*/references/`, regenerated by `npm run bundle`
6. ✅ `CHANGELOG.md` (`[Unreleased]`)

## 8. Testing Strategy

Behaviour, not source text: call `mapStatusCandidates`, `isTerminalLocalStatus` and `isNegativeLocalStatus` with `superseded` and assert the results; drive a sync with a stubbed transition list and assert which transition is chosen. Mutation-prove each addition (Phase 4). Run `CI=true npm run test:remote`.

## 9. Success Criteria

**Functional**

- [x] `mapStatusCandidates("superseded")` returns the cancelled family. Held by a test.
- [x] A superseded task chooses a negative resolution and may use the `statusCategory=done` fallback. Held by a test.
- [x] The GitHub scaffold carries `superseded` with the same target as `cancelled`. Held by a test that calls the scaffold builder.

**Performance**

- [x] No extra network calls: held by a test in `jira-sync-superseded-status.test.mjs` that drives the transition lookup for `accepted` and `cancelled` with a stub and asserts the same number of lookups as before the change (a constant in the test, taken from `develop` before the edit).

**Code quality**

- [x] `npm run bundle:check` clean; `CI=true npm run test:remote` green.

**Migration**

- [x] `CHANGELOG.md` entry under `[Unreleased]`; the `superseded` row in `document-status-lifecycle.md` (Phase 3b) is the documentation of the Jira default map.

## 10. Risk Assessment

**High:** none. **Medium:** the owner picks option B after the code ships as A; the config override covers it. **Low:** a consumer already maps `superseded` in its own config; the override still wins.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Trigger: a board that now moves superseded tasks into a state the owner did not want (Critical); wording (non-critical).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-23
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.305.qa.1.jira-sync-maps-superseded-status.md](./task.305.qa.1.jira-sync-maps-superseded-status.md)
- **Gate File**: [task.305.gate.1.jira-sync-maps-superseded-status.yml](./task.305.gate.1.jira-sync-maps-superseded-status.yml)

### Test Coverage Summary
- **Tests Executed**: 8 new, 95 with neighbouring suites; fast gate 8725, 0 failed
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Two LOW follow-ups are recorded in the gate (the `--probe-workflow` status list and the lifecycle `ALLOW` snippet).

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

- ✅ **Acceptance Criteria:** all 6 met (see the DoD file).
- ✅ **QA gate:** PASS 100/100 (`task.305.gate.1.jira-sync-maps-superseded-status.yml`).
- ✅ **PR review:** PR #930, 5c report APPROVE (`task.305.pr-review.1.jira-sync-maps-superseded-status.md`).
- ✅ **Documentation:** CHANGELOG, lifecycle table and configuration reference updated.
- ⚠️ **Security and compliance:** not applicable (no input boundary, no personal data).
- ✅ **CI:** all six checks green on `b94e76646355`.

**Detailed Verification Log:** see `task.305.dod.1.jira-sync-maps-superseded-status.md`.

**Task marked as ACCEPTED on:** 2026-11-23
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-11 | 1.0     | Initial draft | create-task |
| 2026-11-23 | 1.1     | Review passed (9/10) — owner decision A taken; Phase 3 resolved (documentStatus is an open map); Phase 3b added for the lifecycle doc's Jira table; performance and migration criteria given a held test and a location; line anchors corrected | review-task |
| 2026-11-23 |         | Status → ready-for-development | review-task |
| 2026-11-23 |         | Implemented — 4 source and doc files plus bundled copies, 8 new tests; fast gate 8725 tests, 0 failed | develop |
| 2026-11-23 |         | QA gate PASS (100/100) — 0 findings blocking, 2 LOW follow-ups | qa-task |
| 2026-11-23 | 1.2 | DoD passed — accepted (PR #930) | finalise |
<!-- change-log-end -->

## Progress Tracking

- [x] Phases 1 to 4

## References

- PR #878 (`fix/superseded-task-status`): `superseded` becomes a valid terminal task status; this was its reach finding.
- `shared/resources/document-status-lifecycle.md`: the `superseded` row.
