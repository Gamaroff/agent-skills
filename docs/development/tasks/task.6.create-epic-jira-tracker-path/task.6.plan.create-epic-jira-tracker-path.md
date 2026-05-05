---
id: task.6.plan
title: "Implementation Plan: create-epic Jira tracker path"
type: plan
task-ref: task.6.create-epic-jira-tracker-path.md
---

# Implementation Plan: create-epic Jira tracker path

> Requirements and success criteria: [task.6.create-epic-jira-tracker-path.md](task.6.create-epic-jira-tracker-path.md)

## Overview

Audit `skills/create-epic/SKILL.md` for tracker-creation behavior. If absent or partial, add a dual-path block mirroring `skills/create-task/SKILL.md` lines 425-509, delegating Jira creation to `/sync-jira-epic` (which is idempotent and already battle-tested).

## Phase-by-Phase Implementation Guide

### Phase 1: Audit (write findings to implementation report)

```bash
grep -nE 'jira|JIRA|gh issue create|tracker|sync-jira-epic|jira-epic-creator' skills/create-epic/SKILL.md
wc -l skills/create-epic/SKILL.md
```

Read the full SKILL.md. Determine:

- **Q1**: Is there ANY tracker-creation step today? (gh issue create, curl to Jira, /sync-jira-epic invocation)
- **Q2**: At what point in the workflow does it sit? (after epic doc generation, before, gated by user prompt?)
- **Q3**: Does it write `github_issue` or `jira_key` back to epic frontmatter?

Record findings in `task.6.implementation.1.create-epic-jira-tracker-path-audit.md` (a fresh implementation report adjacent to the task file). Decide:

- **Path A (gap exists)**: proceed to Phase 2
- **Path B (already correct dual-path)**: close task with verification notes only

### Phase 2: Add dual-path block (Path A)

Insertion point: after epic doc generation step, before final hand-off. Mirror `create-task` lines 425-509 verbatim where applicable, but adapt for epic semantics:

```bash
if [ -n "$JIRA_URL" ]; then
  TRACKER="jira"
else
  TRACKER="github"
fi

if [ "$TRACKER" = "jira" ]; then
  # Delegate to sync-jira-epic — it handles create-or-update and writes
  # jira_key + jira_url back to the epic frontmatter.
  /sync-jira-epic "$EPIC_FILE"
else
  # GitHub path: pattern from create-task lines 515-630, adapted
  REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
  DOC_URL="https://github.com/$REPO/blob/develop/$EPIC_FILE_RELATIVE"

  EPIC_ISSUE_URL=$(gh issue create \
    --title "[Epic $EPIC_ID] $EPIC_TITLE" \
    --project "$PROJECT_BOARD_NAME" \
    --body "## Overview

$EPIC_OVERVIEW

## Goals

$EPIC_GOALS

## Stories

(populated by create-story under this epic)

## Document

📄 [Epic Document]($DOC_URL)
📁 \`$EPIC_FILE_RELATIVE\`" \
    --label "epic" \
    --label "priority:$EPIC_PRIORITY" \
    --milestone "Epic $EPIC_ID — $EPIC_TITLE")

  # Auto-create milestone if it doesn't exist (mirror create-task pattern)
  # Add to project board (mirror create-task pattern)
  # Write github_issue to epic frontmatter
fi
```

### Phase 3: Opt-out flag

Document at top of SKILL.md and in the "Workflow" section:

```
## Opt-out: docs-only epic

Set env var `SKIP_TRACKER=1` to skip the tracker-creation step entirely. The epic
file is still created. Useful for one-off planning epics or migrations.
```

Implementation:

```bash
if [ "$SKIP_TRACKER" = "1" ]; then
  echo "ℹ️  SKIP_TRACKER=1 — skipping tracker issue creation"
else
  # ... dual-path block above
fi
```

### Phase 4: Repackage

```bash
python skills/create-skill/scripts/quick_validate.py skills/create-epic
python skills/create-skill/scripts/package_skill.py skills/create-epic
```

## Key Patterns and References

- **Pattern source**: `skills/create-task/SKILL.md` lines 425-509 (platform detection + Jira REST), 515-630 (GitHub `gh issue create` + project board + milestone)
- **Jira delegate**: `skills/sync-jira-epic/SKILL.md` — idempotent create-or-update, ADF rendering, Bitbucket URL embedding
- **Alternative**: `skills/jira-epic-creator/SKILL.md` — single-purpose creator (use only if `sync-jira-epic` is too heavyweight; default to `sync-jira-epic`)
- **Frontmatter shape** (epic): `jira_key`, `jira_url`, or `github_issue` written by the respective branch

## Testing Approach

**Phase 1 deliverable**: audit report saved to task directory. The audit either confirms the gap or closes the task.

**Functional smoke** (post-Phase-2):

1. GH project, no `JIRA_URL`: `/create-epic` → produces epic doc + GH issue + frontmatter `github_issue: <N>`
2. BB+Jira project, `JIRA_URL` set: `/create-epic` → produces epic doc + Jira issue + frontmatter `jira_key: <KEY>`
3. `SKIP_TRACKER=1`: produces epic doc only, no tracker side effects
4. Re-run on existing epic with tracker ref: no duplicate issue (idempotency from `sync-jira-epic` and from frontmatter check on GH branch)
