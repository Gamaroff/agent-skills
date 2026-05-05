# Sprint Review Summary — Task 5

**Task:** Add ensure-epic-jira-issue skill and dual-path the call sites
**Task ID:** task.5
**PR:** [#10](https://github.com/Gamaroff/agent-skills/pull/10)
**GitHub Issue:** [#9](https://github.com/Gamaroff/agent-skills/issues/9)
**Accepted:** 2026-05-05
**QA Gate:** PASS (97/100)

---

## Summary

Added the `ensure-epic-jira-issue` internal sub-routine skill as the Jira sibling of the existing `ensure-epic-github-issue`. Updated `review-story` to branch on `JIRA_URL` at the epic-ensure call site, giving BB+Jira projects the same epic-tracker guarantees that GitHub projects already had. Clarified the GitHub sibling's description to name the dual-path relationship.

---

## What Was Delivered

### New Skill: `skills/ensure-epic-jira-issue`

- `type: internal` sub-routine mirroring the GitHub sibling's contract
- Input: `EPIC_FILE_PATH` (set by caller)
- Output: `EPIC_JIRA_KEY` (e.g. `RB-42`) in caller scope, or empty string on failure
- Delegates to `sync-jira-epic` when `jira_key` absent; verifies via `getJiraIssue` MCP when present
- Comprehensive failure handling (404 → return empty; transient → preserve link; sync failure → return empty)

### Updated: `skills/review-story`

- Jira path: invokes `ensure-epic-jira-issue` before story creation → sets `EPIC_JIRA_KEY` + `EPIC_TRACKER_KIND="jira"`
- GitHub path: sets `EPIC_TRACKER_KIND="github"` after `ensure-epic-github-issue`
- Sub-issue linking block gated on `EPIC_TRACKER_KIND=github` (Jira parent linkage is `sync-jira-story`'s job)

### Updated: `skills/ensure-epic-github-issue`

- Description clarified: named as GitHub-only sibling; callers told to branch on `JIRA_URL`

---

## Impact

- BB+Jira projects: `review-story` now ensures the parent epic has a Jira issue before creating the story's Jira issue — eliminates the class of "missing epic linkage" bugs that previously surfaced during `sync-jira-story`
- GitHub projects: zero behavioural change (conditional is never entered when `JIRA_URL` is unset)
- All three skills repackaged and validated

---

## Technical Notes

- `sync-jira-epic` side effects (status transition, change log append) accepted when `ensure-epic-jira-issue` delegates; documented in skill body as a follow-up opportunity (`--no-status-transition` flag)
- Live dual-env smoke test deferred to post-merge (requires a live Jira instance)

---

## QA Results

- Gate: PASS (97/100)
- Issues: HIGH 0 / MEDIUM 0 / LOW 1 (deferred smoke test)
- All validators: ✅ pass

---

## Files Changed

| File | Change |
|---|---|
| `skills/ensure-epic-jira-issue/SKILL.md` | New |
| `skills/review-story/SKILL.md` | Modified (dual-path + EPIC_TRACKER_KIND) |
| `skills/ensure-epic-github-issue/SKILL.md` | Modified (description clarified) |
| `docs/development/tasks/task.5.ensure-epic-jira-issue-skill/task.5.ensure-epic-jira-issue-skill.md` | Status accepted + QA results + DoD section |
