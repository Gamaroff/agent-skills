---
id: task.5
title: "Add ensure-epic-jira-issue skill and dual-path the call sites"
type: task
category: infrastructure
priority: High
status: 📋 Planned
created: 2026-05-05
assignee: TBD
effort: 1-2 days
depends_on: —
---

# Task 5 — Add ensure-epic-jira-issue skill and dual-path the call sites

## 1. Overview

`skills/ensure-epic-github-issue` is an internal sub-routine called from `create-story` and `review-story` to guarantee an epic has a corresponding GitHub issue (creating it if missing, adding to the project board, writing `github_issue` to epic frontmatter). Its description literally states "GitHub path only — Jira path not affected." On Bitbucket+Jira projects this means epic→story tracker linkage relies on `jira_epic_key` being set somewhere upstream, but there is no symmetric "ensure epic Jira issue exists" sub-routine — a real gap in the create-story/review-story flow.

**Scope**:

- Create new skill `skills/ensure-epic-jira-issue/`
- Update call sites in `skills/create-story/SKILL.md` and `skills/review-story/SKILL.md` to branch on `JIRA_URL` and invoke the right ensure skill

**Key deliverables**:

- New `skills/ensure-epic-jira-issue/SKILL.md` with the same I/O contract (input: epic file path; output: `EPIC_JIRA_KEY` or empty on failure)
- Updated `skills/create-story/SKILL.md` and `skills/review-story/SKILL.md` to call the right sibling
- Updated `skills/ensure-epic-github-issue/SKILL.md` description to clarify it is the GitHub-only sibling

**Expected outcome**: BB+Jira projects get the same epic-tracker guarantees as GitHub projects.

## 2. Motivation

**Current Problems**:

- On BB+Jira, `create-story` Step 5.2a (Jira path) is referenced but no callable sibling exists for *epic-level* ensure
- `review-story` lines 498-499 prompt to create a Jira Story but assume the epic already has `jira_key` — silently broken when it doesn't
- Tracker-linkage drift: stories get created with `jira_epic_key: null` and no autocorrect step

**Benefits**:

- Symmetry with the GitHub path
- Idempotent invocation — safe to call repeatedly
- Removes a class of "missing epic linkage" bugs that surface late (during sync-jira-story)

## 3. Technical Background

**Current** `skills/ensure-epic-github-issue/SKILL.md`:

- Input: epic file path (relative to repo root)
- Reads `github_issue:` from epic frontmatter
- If missing: `gh issue create` with epic body, `gh project item-add`, write `github_issue: {N}` back to frontmatter
- Output: `EPIC_ISSUE_NUM` (integer) or empty on failure
- Failures: non-blocking, callers handle empty return

**Target** new `skills/ensure-epic-jira-issue/SKILL.md`:

- Same I/O shape, different fields
- Reads `jira_key:` from epic frontmatter
- If missing: invoke existing `/sync-jira-epic` (or `jira-epic-creator`) for creation; result is the new Jira key
- Writes `jira_key:` and `jira_url:` back to epic frontmatter
- Output: `EPIC_JIRA_KEY` (e.g. `RB-42`) or empty on failure

**Reuse**: `skills/sync-jira-epic` already creates/updates Jira epics; `shared/resources/jira-sync.js` provides frontmatter parsing, ADF builders, retries, and `getBitbucketRepoBase()`. The new skill is a thin wrapper that calls `sync-jira-epic` if `jira_key` is missing.

## 4. Scope

**In scope**:

- ✅ New skill: `skills/ensure-epic-jira-issue/SKILL.md`
- ✅ Update `skills/create-story/SKILL.md` to branch on `$JIRA_URL` at the ensure call site
- ✅ Update `skills/review-story/SKILL.md` to branch similarly
- ✅ Clarify description on `skills/ensure-epic-github-issue/SKILL.md`

**Out of scope**:

- ❌ Rewriting `sync-jira-epic` — reuse it
- ❌ Changing the Jira REST contract or ADF rendering
- ❌ Backfilling existing stories that were created without epic linkage

## 5. Breaking Changes

None. New skill is additive. Call sites in create-story/review-story branch on `JIRA_URL` — when unset, behavior is identical to today.

## 6. Implementation Plan

> Detailed implementation guide: [task.5.plan.ensure-epic-jira-issue-skill.md](task.5.plan.ensure-epic-jira-issue-skill.md)

**Phase 1 — Scaffold new skill (Low risk)**

- Files: `skills/ensure-epic-jira-issue/SKILL.md` (new), `skills/ensure-epic-jira-issue/scripts/` (optional)
- Changes:
  - [ ] Run `python skills/create-skill/scripts/init_skill.py ensure-epic-jira-issue --path skills/`
  - [ ] Author SKILL.md mirroring the GitHub sibling's structure

**Phase 2 — Implement the skill body (Medium risk)**

- Files: `skills/ensure-epic-jira-issue/SKILL.md`
- Changes:
  - [ ] Read epic file, parse frontmatter, extract `jira_key`
  - [ ] If `jira_key` present and non-null: verify via `getJiraIssue` MCP; on success return early
  - [ ] If missing: invoke `/sync-jira-epic <epic-file>` which creates/updates the Jira epic and writes back frontmatter
  - [ ] Re-read epic frontmatter to capture the freshly-written `jira_key`
  - [ ] Return `EPIC_JIRA_KEY` (or empty on failure)
  - [ ] Document failure modes (Jira auth missing, network error, sync-jira-epic exit non-zero)

**Phase 3 — Update create-story call site (Low risk)**

- Files: `skills/create-story/SKILL.md`
- Changes:
  - [ ] Locate the `/ensure-epic-github-issue` invocation
  - [ ] Wrap it in:
    ```
    if [ -n "$JIRA_URL" ]; then
      /ensure-epic-jira-issue <epic-file>
    else
      /ensure-epic-github-issue <epic-file>
    fi
    ```
  - [ ] Update the variable consumed downstream (`EPIC_ISSUE_NUM` for GitHub, `EPIC_JIRA_KEY` for Jira) — unify under a single `EPIC_TRACKER_REF` if practical, otherwise branch consumers

**Phase 4 — Update review-story call site (Low risk)**

- Files: `skills/review-story/SKILL.md`
- Changes:
  - [ ] Same conditional pattern as Phase 3

**Phase 5 — Clarify GitHub sibling description (Low risk)**

- Files: `skills/ensure-epic-github-issue/SKILL.md`
- Changes:
  - [ ] Update `description:` frontmatter from "GitHub path only — Jira path not affected" to "GitHub-only sibling of `ensure-epic-jira-issue`. Callers branch on `JIRA_URL` to pick the right one."

**Phase 6 — Repackage all affected skills (Low risk)**

- Files: build artifacts
- Changes:
  - [ ] `package_skill.py` for: ensure-epic-jira-issue (new), ensure-epic-github-issue, create-story, review-story

## 7. Files Summary

**New**:

1. ✅ `skills/ensure-epic-jira-issue/SKILL.md` — new sibling skill

**Modified**:

2. ✅ `skills/create-story/SKILL.md` — branch on `$JIRA_URL` at ensure call site
3. ✅ `skills/review-story/SKILL.md` — branch on `$JIRA_URL` at ensure call site
4. ✅ `skills/ensure-epic-github-issue/SKILL.md` — clarify description

**Build artifacts** (regenerate):

5. `skills/ensure-epic-jira-issue/ensure-epic-jira-issue.zip`
6. `skills/ensure-epic-github-issue/ensure-epic-github-issue.zip`
7. `skills/create-story/create-story.zip`
8. `skills/review-story/review-story.zip`

## 8. Testing Strategy

**Static**:

- `quick_validate.py skills/ensure-epic-jira-issue` passes
- Cross-references resolve (no broken `shared/resources/` paths after package)

**Dual-env smoke**:

1. **GitHub project** — `unset JIRA_URL`. Run `/create-story` with an epic missing `github_issue`. Expect: `ensure-epic-github-issue` invoked; `github_issue` written to epic frontmatter.
2. **BB+Jira project** — `export JIRA_URL=...`. Run `/create-story` with an epic missing `jira_key`. Expect: `ensure-epic-jira-issue` invoked → which calls `sync-jira-epic` → creates Jira epic → writes `jira_key` and `jira_url` to frontmatter.
3. **Idempotency** — re-run on an epic that already has the right key. Expect: no Jira mutation, just verification.

**Edge cases**:

- Stale `jira_key` (Jira issue deleted): `getJiraIssue` returns 404 → flag as critical, do not silently re-create
- Network failure on Jira: log warning, return empty, callers handle gracefully

## 9. Success Criteria

**Functional**:

- [ ] New skill creates Jira epic when missing
- [ ] New skill verifies existing Jira epic when present
- [ ] `create-story` branches correctly on `$JIRA_URL`
- [ ] `review-story` branches correctly on `$JIRA_URL`
- [ ] No regression on GitHub-only projects

**Performance**:

- [ ] One Jira `getJiraIssue` call when `jira_key` already present (cheap)
- [ ] Full `sync-jira-epic` invocation only when missing

**Code quality**:

- [ ] `quick_validate.py` passes for all four affected skills
- [ ] No duplication of Jira REST logic — wrapper delegates to `sync-jira-epic`

**Migration**:

- [ ] Existing epics without `jira_key` get backfilled on next story creation under that epic — no manual intervention required
- [ ] `ensure-epic-github-issue` description clarified

## 10. Risk Assessment

**HIGH**

1. **Drift between epic frontmatter format and `sync-jira-epic` expectations**
   - Probability: Medium
   - Impact: High (skill silently fails to write back)
   - Mitigation: Phase 2 explicitly re-reads frontmatter post-sync; verify `sync-jira-epic` writes the same `jira_key:` shape this skill reads

**MEDIUM**

2. **Idempotency: double-creation if `getJiraIssue` returns transient error**
   - Probability: Low
   - Impact: Medium (orphan Jira issues)
   - Mitigation: Treat MCP errors as "unknown state" not "missing"; halt with explicit message rather than re-creating

3. **Call-site refactor breaks GitHub path**
   - Probability: Medium
   - Impact: High
   - Mitigation: Phase 3/4 only adds an outer `if/else` — GH path inside is byte-identical to current

**LOW**

4. **`sync-jira-epic` not yet invocable as a slash command from another skill body**
   - Probability: Low (it is — it's a registered skill)
   - Mitigation: Verify in Phase 1 by reading sync-jira-epic SKILL.md

## 11. Rollback Plan

**Immediate rollback (< 1 hour)**:

- Triggers: GitHub-path regression in create-story or review-story
- Steps: revert call-site patches in create-story/review-story (leave the new skill in place — it is not invoked when `JIRA_URL` is unset)
- Validation: re-run `/create-story` on a known-good GH project

**Partial rollback**:

- New skill misbehaves but call sites work: leave the call-site branch in place, fix the new skill in isolation; if it fails, the conditional silently skips Jira work and the existing `null` state is preserved

**Forward fix**: most edge cases (stale keys, transient Jira errors) tightened in the new skill body without affecting callers

**Triggers**: any GH-path regression; or Jira mass-creation of duplicate epics
