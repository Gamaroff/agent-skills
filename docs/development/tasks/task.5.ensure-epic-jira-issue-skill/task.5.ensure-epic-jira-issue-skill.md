---
id: task.5
title: "Add ensure-epic-jira-issue skill and dual-path the call sites"
type: task
category: infrastructure
priority: High
status: Ready for Development
created: 2026-05-05
assignee: TBD
effort: 1-2 days
depends_on: —
github_issue: 9
---

**Status**: Ready for Development
**Review**: ✅ All review recommendations from `task.5.ensure-epic-jira-issue-skill.review.2026-05-05.md` implemented 2026-05-05

# Task 5 — Add ensure-epic-jira-issue skill and dual-path the call sites

> **GitHub Issue**: [#9](https://github.com/Gamaroff/agent-skills/issues/9)

## 1. Overview

`skills/ensure-epic-github-issue` is an internal sub-routine called from `review-story` (Step around line 522) to guarantee an epic has a corresponding GitHub issue (creating it if missing, adding to the project board, writing `github_issue` to epic frontmatter). Its description literally states "GitHub path only — Jira path not affected." On Bitbucket+Jira projects there is no symmetric "ensure epic Jira issue exists" sub-routine — a real gap in the review-story flow that surfaces later as missing `jira_epic_key` linkage during `sync-jira-story`.

**Scope**:

- Create new skill `skills/ensure-epic-jira-issue/` mirroring the existing GitHub sibling's sub-routine contract (in-context invocation, `EPIC_FILE_PATH` input, `EPIC_JIRA_KEY` output)
- Update the single call site in `skills/review-story/SKILL.md` to branch on `JIRA_URL` and invoke the right ensure skill

**Key deliverables**:

- New `skills/ensure-epic-jira-issue/SKILL.md` with the same I/O contract as the GitHub sibling (`type: internal`; input: `EPIC_FILE_PATH`; output: `EPIC_JIRA_KEY` set in caller scope, or empty on failure)
- Updated `skills/review-story/SKILL.md` to call the right sibling
- Updated `skills/ensure-epic-github-issue/SKILL.md` description to clarify it is the GitHub-only sibling

**Expected outcome**: BB+Jira projects get the same epic-tracker guarantees as GitHub projects.

> **Note (corrected during review 2026-05-05):** earlier drafts of this task claimed `create-story` also invokes `ensure-epic-github-issue`. It does not — `create-story` Step 5.2a explicitly skips tracker creation. Only `review-story` invokes the sub-routine.

## 2. Motivation

**Current Problems**:

- On BB+Jira, `review-story`'s tracker-creation block (around line 522) invokes `ensure-epic-github-issue` unconditionally — there is no Jira sibling, so epic→story Jira linkage relies on `jira_key` being already-present in the epic frontmatter
- `review-story` story-creation prompts assume the parent epic already has `jira_key` — silently broken when it doesn't
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

- Same sub-routine I/O shape as the GitHub sibling — `type: internal`, in-context invocation (NOT slash-command stdout capture)
- Input: `EPIC_FILE_PATH` (set by caller before invocation)
- Reads `jira_key:` from epic frontmatter
- If missing: invoke existing `sync-jira-epic` for creation; `sync-jira-epic` writes `jira_key` (and `jira_url` of shape `${JIRA_URL}/browse/${KEY}`) back to epic frontmatter
- After delegation: re-read epic frontmatter to capture freshly-written `jira_key`; verify `jira_url` is present and matches expected shape — if `sync-jira-epic` did not write it, write it here
- Output: `EPIC_JIRA_KEY` (e.g. `RB-42`) set in caller scope, or empty string on failure

**Reuse**: `skills/sync-jira-epic` already creates/updates Jira epics; `shared/resources/jira-sync.js` provides frontmatter parsing, ADF builders, retries, and `getBitbucketRepoBase()`. The new skill is a thin wrapper that calls `sync-jira-epic` if `jira_key` is missing. **Caveat**: `sync-jira-epic` has broader side effects (status transitions from frontmatter, change-log appends) — Phase 2 should document that calling ensure may trigger these, and decide whether to pass a flag to suppress them or accept the broader behavior.

## 4. Scope

**In scope**:

- ✅ New skill: `skills/ensure-epic-jira-issue/SKILL.md`
- ✅ Update `skills/review-story/SKILL.md` to branch on `$JIRA_URL` at the single ensure call site (around line 522)
- ✅ Clarify description on `skills/ensure-epic-github-issue/SKILL.md`

**Out of scope**:

- ❌ Rewriting `sync-jira-epic` — reuse it
- ❌ Changing the Jira REST contract or ADF rendering
- ❌ Backfilling existing stories that were created without epic linkage

## 5. Breaking Changes

None. New skill is additive. Call site in review-story branches on `JIRA_URL` — when unset, behavior is identical to today.

## 6. Implementation Plan

> Detailed implementation guide: [task.5.plan.ensure-epic-jira-issue-skill.md](task.5.plan.ensure-epic-jira-issue-skill.md)

**Phase 1 — Scaffold new skill (Low risk)**

- Files: `skills/ensure-epic-jira-issue/SKILL.md` (new), `skills/ensure-epic-jira-issue/scripts/` (optional)
- Changes:
  - [ ] Run `python skills/create-skill/scripts/init_skill.py ensure-epic-jira-issue --path skills/`
  - [ ] Author SKILL.md mirroring the GitHub sibling's `type: internal` sub-routine structure (input `EPIC_FILE_PATH`, output `EPIC_JIRA_KEY` set in caller scope, no slash-command invocation)

**Phase 2 — Implement the skill body (Medium risk)**

- Files: `skills/ensure-epic-jira-issue/SKILL.md`
- Changes:
  - [ ] Read epic file at `EPIC_FILE_PATH`, parse frontmatter, extract `jira_key`
  - [ ] If `jira_key` present and non-null: verify via `getJiraIssue` MCP; on success set `EPIC_JIRA_KEY=$jira_key` and return early
  - [ ] If missing: delegate to `sync-jira-epic` (passing `EPIC_FILE_PATH`) — it creates the Jira epic and writes `jira_key` + `jira_url` back to frontmatter
  - [ ] Re-read epic frontmatter to capture the freshly-written `jira_key`
  - [ ] Verify `jira_url` shape is `${JIRA_URL}/browse/${jira_key}` — write it if missing
  - [ ] Set `EPIC_JIRA_KEY=$jira_key` (or empty string on any failure)
  - [ ] Document failure modes — reconcile with §11 below: 404 on existing key → log critical, return empty; network/transient error → log warning, return current `jira_key` (don't lose link); auth missing or `sync-jira-epic` non-zero exit → log warning, return empty

**Phase 3 — Update review-story call site (Low risk)**

- Files: `skills/review-story/SKILL.md` (around line 522)
- Changes:
  - [ ] Locate the `ensure-epic-github-issue` sub-routine invocation
  - [ ] Wrap it in a `JIRA_URL`-conditional that sets `EPIC_TRACKER_KIND` and the appropriate output variable:
    ```
    if [ -n "$JIRA_URL" ]; then
      # invokes ensure-epic-jira-issue sub-routine; sets EPIC_JIRA_KEY in scope
      EPIC_TRACKER_KIND="jira"
    else
      # invokes ensure-epic-github-issue sub-routine; sets EPIC_ISSUE_NUM in scope
      EPIC_TRACKER_KIND="github"
    fi
    ```
  - [ ] Gate the existing GitHub-only sub-issue linking block (lines 549-563, the `gh api .../sub_issues` call) on `EPIC_TRACKER_KIND=github` — Jira parent linkage is `sync-jira-story`'s job, not this skill's

**Phase 4 — Clarify GitHub sibling description (Low risk)**

- Files: `skills/ensure-epic-github-issue/SKILL.md`
- Changes:
  - [ ] Update `description:` frontmatter: replace "GitHub path only — Jira path not affected." with "GitHub-only sibling of `ensure-epic-jira-issue`. Callers branch on `JIRA_URL` to pick the right one."

**Phase 5 — Repackage affected skills (Low risk)**

- Files: build artifacts
- Changes:
  - [ ] Run `quick_validate.py` then `package_skill.py` for: `ensure-epic-jira-issue` (new), `ensure-epic-github-issue`, `review-story`

## 7. Files Summary

**New**:

1. ✅ `skills/ensure-epic-jira-issue/SKILL.md` — new sibling skill

**Modified**:

2. ✅ `skills/review-story/SKILL.md` — branch on `$JIRA_URL` at ensure call site (~line 522), gate sub-issue linking on `EPIC_TRACKER_KIND=github`
3. ✅ `skills/ensure-epic-github-issue/SKILL.md` — clarify description

**Build artifacts** (regenerate):

4. `skills/ensure-epic-jira-issue/ensure-epic-jira-issue.zip`
5. `skills/ensure-epic-github-issue/ensure-epic-github-issue.zip`
6. `skills/review-story/review-story.zip`

## 8. Testing Strategy

**Static**:

- `quick_validate.py skills/ensure-epic-jira-issue` passes
- Cross-references resolve (no broken `shared/resources/` paths after package)

**Dual-env smoke** (run via `/review-story` since that is the call site):

1. **GitHub project** — `unset JIRA_URL`. Run `/review-story` on a story whose parent epic is missing `github_issue`. Expect: `ensure-epic-github-issue` invoked; `github_issue` written to epic frontmatter; sub-issue linkage proceeds.
2. **BB+Jira project** — `export JIRA_URL=...`. Run `/review-story` on a story whose parent epic is missing `jira_key`. Expect: `ensure-epic-jira-issue` invoked → delegates to `sync-jira-epic` → creates Jira epic → writes `jira_key` and `jira_url` to epic frontmatter; GitHub sub-issue linkage block skipped.
3. **Idempotency** — re-run on an epic that already has the right key. Expect: no Jira mutation, just `getJiraIssue` verification.

**Edge cases**:

- Stale `jira_key` (Jira issue deleted): `getJiraIssue` returns 404 → flag as critical, do not silently re-create
- Network failure on Jira: log warning, return empty, callers handle gracefully

## 9. Success Criteria

**Functional**:

- [ ] New skill creates Jira epic when missing (via delegation to `sync-jira-epic`)
- [ ] New skill verifies existing Jira epic when present
- [ ] `review-story` branches correctly on `$JIRA_URL` and gates sub-issue linkage on `EPIC_TRACKER_KIND=github`
- [ ] No regression on GitHub-only projects

**Performance**:

- [ ] One Jira `getJiraIssue` call when `jira_key` already present (cheap)
- [ ] Full `sync-jira-epic` invocation only when missing

**Code quality**:

- [ ] `quick_validate.py` passes for all three affected skills
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
   - Probability: Low
   - Impact: High
   - Mitigation: Phase 3 only adds an outer `if/else` in `review-story` — GH path inside is byte-identical to current. Sub-issue linking block (lines 549-563) gated on `EPIC_TRACKER_KIND=github`

**LOW**

4. **`sync-jira-epic` not yet invocable as a slash command from another skill body**
   - Probability: Low (it is — it's a registered skill)
   - Mitigation: Verify in Phase 1 by reading sync-jira-epic SKILL.md

## 11. Rollback Plan

**Immediate rollback (< 1 hour)**:

- Triggers: GitHub-path regression in review-story
- Steps: revert call-site patch in review-story (leave the new skill in place — it is not invoked when `JIRA_URL` is unset)
- Validation: re-run `/review-story` on a known-good GH project

**Partial rollback**:

- New skill misbehaves but call sites work: leave the call-site branch in place, fix the new skill in isolation; if it fails, the conditional silently skips Jira work and the existing `null` state is preserved

**Forward fix**: most edge cases (stale keys, transient Jira errors) tightened in the new skill body without affecting callers

**Triggers**: any GH-path regression; or Jira mass-creation of duplicate epics
