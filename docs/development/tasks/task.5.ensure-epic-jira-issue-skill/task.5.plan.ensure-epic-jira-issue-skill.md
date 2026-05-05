---
id: task.5.plan
title: "Implementation Plan: ensure-epic-jira-issue skill + call site dual-pathing"
type: plan
task-ref: task.5.ensure-epic-jira-issue-skill.md
---

# Implementation Plan: ensure-epic-jira-issue skill + call site dual-pathing

> Requirements and success criteria: [task.5.ensure-epic-jira-issue-skill.md](task.5.ensure-epic-jira-issue-skill.md)

## Overview

Create a Jira sibling for `ensure-epic-github-issue`. The new skill is a thin wrapper: read epic frontmatter → if `jira_key` missing, delegate to `/sync-jira-epic` → re-read frontmatter → return key. Then update the two call sites in `create-story` and `review-story` to branch on `JIRA_URL`.

## Phase-by-Phase Implementation Guide

### Phase 1: Scaffold

```bash
python skills/create-skill/scripts/init_skill.py ensure-epic-jira-issue --path skills/
```

This produces `skills/ensure-epic-jira-issue/SKILL.md` with the standard frontmatter.

### Phase 2: Author SKILL.md

Frontmatter (model on `skills/ensure-epic-github-issue/SKILL.md`):

```yaml
---
name: ensure-epic-jira-issue
description: |
  Internal sub-routine called from create-story and review-story.
  Given an epic markdown file path, ensures the epic has a corresponding Jira issue.
  Creates the issue if missing (delegating to /sync-jira-epic), and writes jira_key + jira_url
  to the epic frontmatter. Returns EPIC_JIRA_KEY (e.g. "RB-42") or empty on failure.
  Jira path only — GitHub path handled by ensure-epic-github-issue. Callers branch on JIRA_URL.
license: MIT
---
```

Body skeleton:

```markdown
# ensure-epic-jira-issue

## Inputs
- `EPIC_FILE` (relative path to epic markdown)
- Env: `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` (or Atlassian MCP)

## Outputs
- `EPIC_JIRA_KEY` (e.g. `RB-42`) or empty string on failure

## Workflow

1. Read `EPIC_FILE` frontmatter. Extract `jira_key`.
2. **If `jira_key` is set and non-null**: verify with Atlassian MCP `getJiraIssue` (cloudId derived from `JIRA_URL` hostname; `issueIdOrKey: $jira_key`; `fields: ["status","summary"]`).
   - On success: return `jira_key` immediately.
   - On 404: log critical "Epic Jira issue $jira_key not found — manual investigation required" and return empty (do NOT silently re-create — risk of orphans).
   - On other error: log warning, return current `jira_key` value (treat as unknown but don't lose the link).
3. **If `jira_key` is missing or null**: invoke `/sync-jira-epic $EPIC_FILE`. This skill creates/updates the Jira epic and writes `jira_key` + `jira_url` to the epic frontmatter.
4. Re-read epic frontmatter. Capture the freshly-written `jira_key`.
5. Return `EPIC_JIRA_KEY=$jira_key` (or empty if step 3 failed).

## Failure handling
- All failures non-blocking. Log a warning and return empty.
- Callers (`create-story`, `review-story`) decide how to proceed when empty.
```

### Phase 3: Patch create-story call site

Locate the existing invocation in `skills/create-story/SKILL.md` (search for `ensure-epic-github-issue`):

```
EPIC_ISSUE_NUM=$(/ensure-epic-github-issue $EPIC_FILE)
```

Replace with:

```
if [ -n "$JIRA_URL" ]; then
  EPIC_TRACKER_REF=$(/ensure-epic-jira-issue $EPIC_FILE)   # Jira key, e.g. RB-42
  EPIC_TRACKER_KIND="jira"
else
  EPIC_TRACKER_REF=$(/ensure-epic-github-issue $EPIC_FILE) # GitHub issue number
  EPIC_TRACKER_KIND="github"
fi
```

Update downstream consumers to use `$EPIC_TRACKER_REF` and `$EPIC_TRACKER_KIND`. If consumers expect strictly `$EPIC_ISSUE_NUM`, alias for backward compat in the GitHub branch.

### Phase 4: Patch review-story call site

Same change in `skills/review-story/SKILL.md`. Verify around line ~131 where `gh issue view {N}` consumes `EPIC_ISSUE_NUM` — gate that block on `EPIC_TRACKER_KIND=github`.

### Phase 5: Clarify GitHub sibling description

`skills/ensure-epic-github-issue/SKILL.md` frontmatter `description:` field — line 3:

```yaml
description: |
  Internal sub-routine called from create-story and review-story.
  Given an epic markdown file path, ensures the epic has a corresponding GitHub issue.
  Creates the issue if missing, adds it to the project board, and writes github_issue to the epic frontmatter.
  Returns EPIC_ISSUE_NUM (integer or empty on failure).
  GitHub-only sibling of ensure-epic-jira-issue. Callers branch on JIRA_URL to pick the right one.
```

### Phase 6: Repackage

```bash
for s in ensure-epic-jira-issue ensure-epic-github-issue create-story review-story; do
  python skills/create-skill/scripts/quick_validate.py "skills/$s"
  python skills/create-skill/scripts/package_skill.py "skills/$s"
done
```

## Key Patterns and References

- **Skill scaffolding**: `skills/create-skill/scripts/init_skill.py`
- **Reuse target**: `skills/sync-jira-epic/SKILL.md` (already creates/updates Jira epics with ADF body)
- **Frontmatter parsing utility**: `shared/resources/jira-sync.js`
- **MCP tools**: `getJiraIssue` for verification, `addCommentToJiraIssue` if you want to leave a "verified" footprint (optional, not required by this task)
- **GitHub sibling**: `skills/ensure-epic-github-issue/SKILL.md` — shape and contract to mirror

## Testing Approach

**Static**: validate + package all four affected skills

**Functional**:

1. Epic with valid `jira_key` → skill returns key, no Jira write
2. Epic with `jira_key: null` → skill invokes sync-jira-epic, writes new key, returns it
3. Epic with stale `jira_key` (issue deleted in Jira) → skill returns empty, logs critical
4. `JIRA_URL` unset → call site invokes GitHub sibling, behavior unchanged

**Manual verification**: pick a project's epic file, set `jira_key: null`, run `/create-story` for the next story under that epic, verify Jira issue created and `jira_key` written back.
