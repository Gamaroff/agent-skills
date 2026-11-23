# Sprint Review Summary - Jira sync maps the superseded status

**Story/Task ID:** task.305
**Completed Date:** 2026-11-23
**Pull Request:** [#930](https://github.com/Gamaroff/agent-skills/pull/930)

---

## Summary

A task whose status is `superseded` now finds a Jira transition and lands in the same family as `cancelled` (a negative, terminal state). The generated GitHub ladder carries the same status.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `mapStatusCandidates("superseded")` returns the cancelled family.
- [x] A superseded task takes a negative resolution and may use the done-category fallback.
- [x] The GitHub scaffold carries `superseded` aimed where `cancelled` is.
- [x] No extra transition lookups.
- [x] `bundle:check` clean and the fast gate green.
- [x] CHANGELOG entry and lifecycle and configuration rows.

### Key Features Implemented

- **Jira map:** `superseded` added to `DEFAULT_STATUS_MAP` and to both terminal-status sets.
- **GitHub ladder:** `superseded` line added beside `cancelled` in the scaffold.

---

## Technical Details

### Files Modified/Created

- `shared/resources/jira-sync.js` - map key and two set entries
- `shared/resources/gh-stage.js` - one scaffold line
- `shared/resources/tests/jira-sync-superseded-status.test.mjs` - 8 new tests
- `shared/resources/document-status-lifecycle.md`, `docs/reference/configuration.md`, `CHANGELOG.md` - documentation
- bundled `skills/*/references/` copies, regenerated

### Architecture/Design Decisions

Owner decision A: `superseded` lands in the cancelled family as a negative terminal state, because replaced work was not delivered. A `jira.statusMap` override lets a board choose a Done state instead.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Unit Tests:** 8 new tests in `shared/resources/tests/jira-sync-superseded-status.test.mjs`; four mutations each turn a named test red.
- **QA Gate:** PASS (100/100), cycle 1.
- **PR review:** APPROVE.
- **CI:** all six checks green on `b94e76646355`.

---

## Known Limitations and Future Work

- Add `superseded` to `CANONICAL_LOCAL_STATUSES` so `--probe-workflow` reports it.
- Add `superseded` to the lifecycle `ALLOW` snippet (pre-existing from PR #878).
