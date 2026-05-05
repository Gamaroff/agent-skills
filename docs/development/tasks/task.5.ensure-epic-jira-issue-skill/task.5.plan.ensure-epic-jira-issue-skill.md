---
id: task.5.plan
title: "Implementation Plan: ensure-epic-jira-issue skill + call site dual-pathing"
type: plan
task-ref: task.5.ensure-epic-jira-issue-skill.md
---

# Implementation Plan: ensure-epic-jira-issue skill + call site dual-pathing

> Requirements and success criteria: [task.5.ensure-epic-jira-issue-skill.md](task.5.ensure-epic-jira-issue-skill.md)

## Overview

Create a Jira sibling for `ensure-epic-github-issue`. The new skill is a thin **in-context sub-routine** (NOT a slash command): caller sets `EPIC_FILE_PATH` → sub-routine reads epic frontmatter → if `jira_key` missing, delegates to `sync-jira-epic` → re-reads frontmatter → sets `EPIC_JIRA_KEY` in caller scope. Then update the **single** call site in `review-story` (around line 522) to branch on `JIRA_URL`. **Note:** `create-story` does NOT call the GitHub sibling (Step 5.2a explicitly skips tracker creation), so it is out of scope.

## Phase-by-Phase Implementation Guide

### Phase 1: Scaffold

```bash
python skills/create-skill/scripts/init_skill.py ensure-epic-jira-issue --path skills/
```

This produces `skills/ensure-epic-jira-issue/SKILL.md` with the standard frontmatter.

### Phase 2: Author SKILL.md

Frontmatter (mirror `skills/ensure-epic-github-issue/SKILL.md` — `type: internal`, sub-routine):

```yaml
---
name: ensure-epic-jira-issue
description: Internal sub-routine called from review-story. Given an epic markdown file path, ensures the epic has a corresponding Jira issue. Creates it if missing by delegating to sync-jira-epic, and writes jira_key + jira_url to the epic frontmatter. Sets EPIC_JIRA_KEY (e.g. "RB-42") in caller scope, or empty string on failure. Jira-only sibling of ensure-epic-github-issue. Callers branch on JIRA_URL to pick the right one.
type: internal
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---
```

Body skeleton:

```markdown
# Ensure Epic Jira Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `review-story`. Do not invoke directly.

## Inputs (set by the calling skill before invoking)
- `EPIC_FILE_PATH` — repo-relative path to the epic markdown file
- Env: `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` (or Atlassian MCP)

## Output (set by this sub-routine, available to the calling skill)
- `EPIC_JIRA_KEY` — Jira key (e.g. `RB-42`), or empty string on failure

## Workflow

1. Read `EPIC_FILE_PATH` frontmatter. Extract `jira_key`.
2. **If `jira_key` is set and non-null**: verify with Atlassian MCP `getJiraIssue` (cloudId derived from `JIRA_URL` hostname; `issueIdOrKey: $jira_key`; `fields: ["status","summary"]`).
   - On success: set `EPIC_JIRA_KEY=$jira_key` and return.
   - On 404: log critical `Epic Jira issue $jira_key not found — manual investigation required`, set `EPIC_JIRA_KEY=""` and return (do NOT silently re-create — orphan risk).
   - On other (transient) error: log warning, set `EPIC_JIRA_KEY=$jira_key` (treat as unknown but don't lose link) and return.
3. **If `jira_key` is missing or null**: delegate to `sync-jira-epic` passing `EPIC_FILE_PATH`. It creates/updates the Jira epic and writes `jira_key` + `jira_url` to epic frontmatter.
4. Re-read epic frontmatter. Capture freshly-written `jira_key`. Verify `jira_url` equals `${JIRA_URL}/browse/${jira_key}` — write it if missing.
5. Set `EPIC_JIRA_KEY=$jira_key` (or empty string if step 3 failed).

## Failure handling
- All failures non-blocking. Log a warning and set empty output.
- Caller (`review-story`) decides how to proceed when empty.

## Side-effect note (delegating to sync-jira-epic)
`sync-jira-epic` advances Jira status from frontmatter and appends to the epic Change Log. Calling this ensure routine therefore triggers those side effects whenever creation actually runs. If the caller wants pure "ensure exists" semantics, this skill should pass a future `--no-status-transition --no-changelog` flag to `sync-jira-epic` (out of scope for this task — note as follow-up).
```

### Phase 3: Patch review-story call site

Locate the invocation in `skills/review-story/SKILL.md` (currently around line 522 — `If the file exists, invoke the ensure-epic-github-issue sub-routine with EPIC_FILE_PATH...`).

The current pattern is **in-context sub-routine invocation**: caller sets `EPIC_FILE_PATH`, invokes, sub-routine sets `EPIC_ISSUE_NUM` in caller scope. Preserve that pattern — do NOT introduce slash-command stdout capture.

Replace the unconditional invocation with a `JIRA_URL`-conditional dispatch:

```
EPIC_FILE_PATH="${EPIC_DIR}/$(basename "$EPIC_DIR").md"

if [ -n "$JIRA_URL" ]; then
  # Invoke ensure-epic-jira-issue sub-routine — sets EPIC_JIRA_KEY in scope
  EPIC_TRACKER_KIND="jira"
else
  # Invoke ensure-epic-github-issue sub-routine — sets EPIC_ISSUE_NUM in scope
  EPIC_TRACKER_KIND="github"
fi
```

Then gate the existing GitHub-only sub-issue linking block (currently lines 549-563, the `gh api .../sub_issues` call against `EPIC_ISSUE_NUM`) on `EPIC_TRACKER_KIND=github`. Jira parent linkage is `sync-jira-story`'s responsibility, not this skill's.

### Phase 4: Clarify GitHub sibling description

`skills/ensure-epic-github-issue/SKILL.md` frontmatter `description:` field — line 3:

```yaml
description: |
  Internal sub-routine called from create-story and review-story.
  Given an epic markdown file path, ensures the epic has a corresponding GitHub issue.
  Creates the issue if missing, adds it to the project board, and writes github_issue to the epic frontmatter.
  Returns EPIC_ISSUE_NUM (integer or empty on failure).
  GitHub-only sibling of ensure-epic-jira-issue. Callers branch on JIRA_URL to pick the right one.
```

### Phase 5: Repackage

```bash
for s in ensure-epic-jira-issue ensure-epic-github-issue review-story; do
  python skills/create-skill/scripts/quick_validate.py "skills/$s"
  python skills/create-skill/scripts/package_skill.py "skills/$s"
done
```

## Key Patterns and References

- **Skill scaffolding**: `skills/create-skill/scripts/init_skill.py`
- **Reuse target**: `skills/sync-jira-epic/SKILL.md` (already creates/updates Jira epics with ADF body)
- **Frontmatter parsing utility**: `shared/resources/jira-sync.js`
- **MCP tools**: `getJiraIssue` for verification
- **GitHub sibling**: `skills/ensure-epic-github-issue/SKILL.md` — shape and contract to mirror (sub-routine pattern, `type: internal`)

## Testing Approach

**Static**: validate + package all three affected skills

**Functional** (run via `/review-story`):

1. Epic with valid `jira_key` → sub-routine sets `EPIC_JIRA_KEY`, no Jira write
2. Epic with `jira_key: null` → delegates to `sync-jira-epic`, writes new key + url, sets `EPIC_JIRA_KEY`
3. Epic with stale `jira_key` (deleted in Jira) → sets `EPIC_JIRA_KEY=""`, logs critical
4. `JIRA_URL` unset → call site invokes GitHub sibling, behavior unchanged; sub-issue linking proceeds

**Manual verification**: pick a project's epic file, set `jira_key: null`, run `/review-story` for the next story under that epic, verify Jira issue created and `jira_key` + `jira_url` written back.
