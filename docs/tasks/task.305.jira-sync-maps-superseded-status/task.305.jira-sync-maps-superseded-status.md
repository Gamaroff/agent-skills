---
id: task.305
title: "Jira sync maps the superseded status"
type: task
description: "Follow-up to PR 878: superseded is now a valid terminal task status, but the Jira status map has no entry for it, so a superseded task finds no Jira transition. Map it, decide the Jira state it lands in, and check the GitHub ladder for the same gap."
tags: [jira, sync, status-lifecycle]
category: other
status: planned
priority: Medium
created: 2026-11-11
updated: 2026-11-11
estimated_effort_hours: 4
---

# Technical Task: Jira sync maps the superseded status

**Status:** Planned

Follow-up to PR #878 (`fix/superseded-task-status`), which made `superseded` a valid terminal task status in the selector and in `document-status-lifecycle.md`. That PR left the tracker side alone on purpose. This task covers it.

---

## 1. Overview

A task whose frontmatter says `status: superseded` has no mapped Jira transition. This task:

1. Decides which Jira state a superseded task lands in (an **owner decision**, below).
2. Adds `superseded` to the one shared status map and to the two terminal-status sets that drive the fallback and the resolution.
3. Checks the GitHub path (`gh-stage.js` `documentStatus` ladder) for the same gap and closes it or records why not.
4. Holds each with a test that goes red when the mapping is removed.

## 2. Motivation

- `mapStatusCandidates` returns the raw word when the map has no key (`shared/resources/jira-sync.js:3857`, `if (hit == null) return [stripped];`). A superseded task therefore looks for a Jira transition literally named "Superseded". Boards rarely have one, so the sync finds no transition for it.
- `isTerminalLocalStatus` and `isNegativeLocalStatus` (`jira-sync.js:3876`, `:3880`) read `TERMINAL_LOCAL_STATUSES` (`:3505`) and `NEGATIVE_LOCAL_STATUSES` (`:3524`). `superseded` is in neither, so the `statusCategory=done` fallback is not used and no negative resolution is chosen.
- tinker-city already files replaced tasks as `superseded` (task.24, task.48), so this is a live gap, not a hypothetical.

## 3. Technical Background

**Current state (grepped 2026-11-11, `develop` at `8263f97c`):**

- `DEFAULT_STATUS_MAP`: `shared/resources/jira-sync.js:3459`. Keys today: the canonical lifecycle plus `cancelled: CANCELLED_CANDIDATES` (`:3467`) and aliases. No `superseded`.
- `CANCELLED_CANDIDATES`: `jira-sync.js:3264` = Cancelled, Canceled, Won't Do, Rejected, Closed.
- `TERMINAL_LOCAL_STATUSES` `:3505`, `NEGATIVE_LOCAL_STATUSES` `:3524`: neither holds `superseded`.
- The GitHub ladder scaffold: `shared/resources/gh-stage.js:1946` writes `cancelled: ...` under `documentStatus:` and no `superseded`.
- `documentStatus` in `shared/resources/tracker-workflow.js:398-412` is read as an open map of local status to target. Whether a key outside the lifecycle is accepted is `(unverified)`; read it before Phase 3.
- Existing tests that read the map: `shared/resources/tests/jira-ready-for-development-candidates.test.mjs` (names `DEFAULT_STATUS_MAP`). The `sync-jira-*` scripts take the map from `jira-sync.js` (`(unverified)`: confirm each of the four imports it rather than carrying a copy).

**Owner decision, needed before Phase 1.** Jira workflows differ, so two options exist:

| Option | Lands in | Resolution | Trade-off |
|---|---|---|---|
| A (recommended) | the `CANCELLED_CANDIDATES` family | negative (Won't Do) | replaced work was not delivered; matches how `cancelled` reads. Loses the "replaced, not abandoned" distinction on the board, but the card body can say it |
| B | a Done state | positive | reports replaced work as delivered; flatters the board |

Recommendation: A, with `superseded` added to both terminal sets. A `jira-sync` config override already exists (the map is overlaid at `jira-sync.js:3717`), so a board that wants B can set it.

## 4. Scope

**In scope:** ✅ `jira-sync.js` map and terminal sets ✅ the GitHub `documentStatus` scaffold ✅ tests with a mutation ✅ bundled copies.

**Out of scope:** ❌ the bug lifecycle map (bugs have their own statuses) ❌ the selector (done in PR #878) ❌ re-vendoring into a consumer repository.

## 5. Breaking Changes

None. A task that was `superseded` already failed to find a transition; it now finds one. A consumer's `jira.statusMap` override for `superseded`, if any, still wins.

## 6. Implementation Plan

> Detailed implementation guide: [task.305.plan.jira-sync-maps-superseded-status.md](task.305.plan.jira-sync-maps-superseded-status.md)

### Phase 1: The Jira map — Risk: Low

**Files:** `shared/resources/jira-sync.js`

- [ ] Add `superseded: CANCELLED_CANDIDATES` to `DEFAULT_STATUS_MAP` (owner decision A).
- [ ] Add `"superseded"` to `TERMINAL_LOCAL_STATUSES` and `NEGATIVE_LOCAL_STATUSES`.
- [ ] Tests: `mapStatusCandidates("superseded")` returns the cancelled family; `isTerminalLocalStatus` and `isNegativeLocalStatus` are true for it.

### Phase 2: One definition, four scripts — Risk: Low

- [ ] Confirm each of the four `sync-jira-*` scripts reads the shared map and carries no copy. A test drives each with `status: superseded` and asserts the resolved candidates.

### Phase 3: The GitHub path — Risk: Low

**Files:** `shared/resources/gh-stage.js`, possibly `shared/resources/tracker-workflow.js`

- [ ] Read `tracker-workflow.js:398-412` and decide: add `superseded: ...` to the scaffold ladder next to `cancelled`, or record that an absent key is already handled.
- [ ] A test holds whichever is chosen.

### Phase 4: Bundle and mutation — Risk: Low

- [ ] `npm run bundle`, `npm run bundle:check`.
- [ ] Mutation: remove the map key, then each set entry, then the ladder line. Each turns one named test red.

## 7. Files Summary

1. ✅ `shared/resources/jira-sync.js`
2. ✅ `shared/resources/gh-stage.js` (scaffold line, if Phase 3 adds one)
3. ✅ `shared/resources/tests/jira-sync-superseded-status.test.mjs` (new)
4. ✅ bundled `references/jira-sync.js` copies under `skills/*/references/`, regenerated by `npm run bundle`

## 8. Testing Strategy

Behaviour, not source text: call `mapStatusCandidates`, `isTerminalLocalStatus` and `isNegativeLocalStatus` with `superseded` and assert the results; drive a sync with a stubbed transition list and assert which transition is chosen. Mutation-prove each addition (Phase 4). Run `CI=true npm run test:remote`.

## 9. Success Criteria

**Functional**

- [ ] `mapStatusCandidates("superseded")` returns the cancelled family. Held by a test.
- [ ] A superseded task chooses a negative resolution and may use the `statusCategory=done` fallback. Held by a test.
- [ ] The GitHub ladder either carries `superseded` or a test states why it does not.

**Performance**

- [ ] No extra network calls: the stubbed transition-lookup count is unchanged for non-superseded statuses.

**Code quality**

- [ ] `npm run bundle:check` clean; `CI=true npm run test:remote` green.

**Migration**

- [ ] `CHANGELOG.md` entry; one line in `docs/reference` where the Jira status map is documented (`(unverified)`: grep for it).

## 10. Risk Assessment

**High:** none. **Medium:** the owner picks option B after the code ships as A; the config override covers it. **Low:** a consumer already maps `superseded` in its own config; the override still wins.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Trigger: a board that now moves superseded tasks into a state the owner did not want (Critical); wording (non-critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-11 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phases 1 to 4

## References

- PR #878 (`fix/superseded-task-status`): `superseded` becomes a valid terminal task status; this was its reach finding.
- `shared/resources/document-status-lifecycle.md`: the `superseded` row.
