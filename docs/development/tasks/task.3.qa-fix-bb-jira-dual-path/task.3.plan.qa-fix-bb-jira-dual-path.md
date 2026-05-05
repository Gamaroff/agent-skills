---
id: task.3.plan
title: "Implementation Plan: qa-fix BB+Jira dual-path"
type: plan
task-ref: task.3.qa-fix-bb-jira-dual-path.md
---

# Implementation Plan: qa-fix BB+Jira dual-path

> Requirements and success criteria: [task.3.qa-fix-bb-jira-dual-path.md](task.3.qa-fix-bb-jira-dual-path.md)

## Overview

Mirror the platform-detection block from `create-pr`/`finalise` into `qa-fix`. The current GitHub-only paths become the `if PLATFORM=github` branch; add a parallel `elif PLATFORM=bitbucket` branch using the Bitbucket REST API; add an unconditional Jira MCP comment step gated on `JIRA_URL` and `jira_key`.

## Phase-by-Phase Implementation Guide

### Phase 1: Platform detection block

**File**: `skills/qa-fix/SKILL.md`

**Insertion point**: Just before the existing PR-lookup section (around line 160 — search for `gh pr view --json url,state,title,number`).

**Insert** (lift verbatim from `skills/finalise/SKILL.md` lines 314-325):

```bash
REMOTE_URL=$(git remote get-url origin)
if echo "$REMOTE_URL" | grep -qi "github\.com"; then
  PLATFORM="github"
elif echo "$REMOTE_URL" | grep -qi "bitbucket\.org"; then
  PLATFORM="bitbucket"
  BB_PATH=$(echo "$REMOTE_URL" | sed -E 's|.*bitbucket\.org[:/]([^/]+/[^/]+?)(\.git)?$|\1|')
  BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
  BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
  BB_API="https://api.bitbucket.org/2.0"
else
  echo "❌ Unknown remote: $REMOTE_URL" >&2
  exit 1
fi
```

Document required env vars in a new "Environment" subsection above this block:

```
- `BITBUCKET_USERNAME` + `BITBUCKET_APP_PASSWORD` — required when `PLATFORM=bitbucket`
- `JIRA_URL` — optional; enables Jira tracker comment when set
```

### Phase 2: Dual-path PR detection

**File**: `skills/qa-fix/SKILL.md` (~line 174)

**Replace**:

```bash
PR_JSON=$(gh pr view --json url,state,title,number 2>&1)
```

**With**:

```bash
BRANCH=$(git branch --show-current)

if [ "$PLATFORM" = "github" ]; then
  PR_JSON=$(gh pr view --json url,state,title,number 2>&1)
  if [ $? -ne 0 ]; then
    echo "❌ No PR found for current branch on GitHub"
    echo "1. Create a PR: gh pr create"
    exit 1
  fi
  PR_URL=$(echo "$PR_JSON" | jq -r '.url')
  PR_NUMBER=$(echo "$PR_JSON" | jq -r '.number')
  PR_STATE=$(echo "$PR_JSON" | jq -r '.state')
  PR_TITLE=$(echo "$PR_JSON" | jq -r '.title')

elif [ "$PLATFORM" = "bitbucket" ]; then
  BB_PR_JSON=$(curl -sf -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests?q=source.branch.name=\"${BRANCH}\"+AND+state=\"OPEN\"")
  if [ $? -ne 0 ] || [ "$(echo "$BB_PR_JSON" | jq '.values | length')" -eq 0 ]; then
    echo "❌ No open Bitbucket PR found for branch ${BRANCH}"
    echo "1. Create a PR: /create-pr"
    exit 1
  fi
  PR_NUMBER=$(echo "$BB_PR_JSON" | jq -r '.values[0].id')
  PR_URL=$(echo "$BB_PR_JSON" | jq -r '.values[0].links.html.href')
  PR_STATE=$(echo "$BB_PR_JSON" | jq -r '.values[0].state')
  PR_TITLE=$(echo "$BB_PR_JSON" | jq -r '.values[0].title')
fi
```

All downstream code that consumed `PR_URL`, `PR_NUMBER`, `PR_STATE` continues working unchanged.

### Phase 3: Dual-path post-fix comment

**File**: `skills/qa-fix/SKILL.md` (~line 539)

**Replace** the single `gh pr comment "$PR_URL" --body "..."` block **with**:

```bash
COMMENT_BODY="## 🛠️ QA Fixes Applied

{existing fix-summary body — unchanged}
"

if [ "$PLATFORM" = "github" ]; then
  gh pr comment "$PR_URL" --body "$COMMENT_BODY"
  COMMENT_RC=$?
elif [ "$PLATFORM" = "bitbucket" ]; then
  BB_COMMENT_PAYLOAD=$(jq -n --arg raw "$COMMENT_BODY" '{content: {raw: $raw}}')
  curl -sf -X POST \
    -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
    -H "Content-Type: application/json" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
    -d "$BB_COMMENT_PAYLOAD" >/dev/null
  COMMENT_RC=$?
fi

if [ $COMMENT_RC -ne 0 ]; then
  echo "❌ Failed to post fix-summary comment ($PLATFORM). Body printed below for manual posting:"
  echo "$COMMENT_BODY"
  exit 1
fi
```

**Verification step (~line 606, 642)** — replace the explicit `gh pr comment` exit-code text with platform-agnostic language: "Confirm the comment-post call returned exit code 0 on the active platform branch."

### Phase 4: Jira tracker comment

**File**: `skills/qa-fix/SKILL.md` (just after Phase 3 success path)

**Insert**:

**Prerequisite**: Step 0 of qa-fix must export `$STORY_FILE` (the absolute path to the resolved story or task document) so Phase 4 can read it. If qa-fix uses a different canonical name today, rename here to match — do not introduce a second variable.

```bash
if [ -n "$JIRA_URL" ]; then
  JIRA_KEY=$(grep -E '^jira_key:' "$STORY_FILE" | head -1 | sed -E 's/jira_key:\s*//; s/^["'\''"]+//; s/["'\''"]+$//')
  if [ -n "$JIRA_KEY" ] && [ "$JIRA_KEY" != "null" ]; then
    # Use Atlassian MCP: addCommentToJiraIssue with cloudId derived from JIRA_URL hostname
    # See skills/finalise/SKILL.md lines 827-832 for the exact MCP call shape
    echo "📨 Posting fix summary to Jira issue ${JIRA_KEY}"
    # Pseudocode — actual MCP call rendered in markdown for the agent to execute:
    #   addCommentToJiraIssue(cloudId={hostname from JIRA_URL}, issueIdOrKey=$JIRA_KEY, body=<ADF or plain>)
  fi
fi
```

The skill body should describe this in natural language directing the agent to invoke the MCP tool — match the prose style of `skills/finalise/SKILL.md` lines 815-832 (cloudId derivation, fallback to `getAccessibleAtlassianResources` on resolution error, non-blocking failure). Use `contentFormat: "markdown"` exactly as `finalise` does. ADF is permitted but not the default — do not claim ADF is the finalise pattern.

### Phase 5: Repackage and validate

```bash
python skills/create-skill/scripts/quick_validate.py skills/qa-fix
python skills/create-skill/scripts/package_skill.py skills/qa-fix

# Static lint:
grep -nE '\bgh (pr|issue)' skills/qa-fix/SKILL.md
# Every result must be inside an `if [ "$PLATFORM" = "github" ]` block.
```

## Key Patterns and References

- **Platform detection**: `skills/finalise/SKILL.md` lines 314-325 (canonical block)
- **Bitbucket REST PR comment**: `skills/create-pr/SKILL.md` line 254 + `skills/finalise/SKILL.md` ~line 257
- **Bitbucket REST PR lookup**: not present elsewhere — modeled on Bitbucket Cloud REST API v2 `/pullrequests` query
- **Jira MCP comment + cloudId resolution**: `skills/finalise/SKILL.md` lines 815-832 (uses `contentFormat: "markdown"`)
- **Auth env vars**: `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD` already used by `create-pr` and `finalise`

## Testing Approach

**Static**:

- `quick_validate.py` exit 0
- Grep audit (no stray `gh` outside platform branches)

**Dual-env smoke** — run `/qa-fix` end-to-end on:

1. A scratch GitHub repo with an open PR on a feature branch + a story doc with `github_issue: <N>` and no `jira_key`. Expect: GitHub PR receives the comment.
2. A scratch Bitbucket repo with an open PR + a story doc with `jira_key: ABC-123` and `JIRA_URL=https://example.atlassian.net`. Expect: BB PR receives the comment AND Jira issue ABC-123 receives a matching comment.

**Edge cases**:

- No open PR: skill exits with the platform-specific guidance (already handled in Phase 2)
- `jira_key: null`: Phase 4 skips silently (already handled by the conditional)
- BB auth failure: curl exits non-zero → skill halts with explicit "Failed to post" message and prints body for manual posting (Phase 3)
