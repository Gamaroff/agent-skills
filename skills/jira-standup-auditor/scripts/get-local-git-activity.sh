#!/bin/bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '{"status": "Not inside a valid git repository workspace"}'
  exit 0
fi

CURRENT_BRANCH=$(git branch --show-current)

# Guard missing user.email — without it, --author="" matches everyone.
GIT_AUTHOR_EMAIL=$(git config user.email || true)
if [ -z "$GIT_AUTHOR_EMAIL" ]; then
  GIT_LOGS='[]'
  AUTHOR_WARNING="git config user.email not set; recentCommits filtered out"
else
  GIT_LOGS=$(git log --since="48 hours ago" --no-merges --author="$GIT_AUTHOR_EMAIL" \
    --pretty=format:"%s (%h)" | jq -R . | jq -s .)
  AUTHOR_WARNING=""
fi

UNCOMMITTED_CHANGES=$(git status --porcelain | jq -R . | jq -s .)

jq -n \
  --arg branch "$CURRENT_BRANCH" \
  --arg warning "$AUTHOR_WARNING" \
  --argjson commits "$GIT_LOGS" \
  --argjson staging "$UNCOMMITTED_CHANGES" \
  '{
    currentLocalBranch: $branch,
    recentCommits: $commits,
    uncommittedWorkInProgress: $staging
  } + (if $warning == "" then {} else {warning: $warning} end)'
