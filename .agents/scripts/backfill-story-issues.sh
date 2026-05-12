#!/usr/bin/env bash
# One-shot backfill: create GitHub issues for stories that have github_issue: null.
# Reads frontmatter, builds issue body, creates issue, adds to board, mirrors
# priority field, links as sub-issue of parent epic, writes github_issue back.
#
# Usage: backfill-story-issues.sh <story-file> [<story-file> ...]
set -euo pipefail

OWNER=Gamaroff
REPO_NAME=agent-skills
REPO="${OWNER}/${REPO_NAME}"
PROJECT_NUM=1
PRIO_SCRIPT="$(git rev-parse --show-toplevel)/skills/ensure-story-github-issue/references/set-github-project-priority.sh"

fm() { awk -v key="$1" 'BEGIN{p=0} /^---$/{p++; next} p==1 && $1==key":" {sub(/^[^:]*: */,""); gsub(/^["'\'']|["'\'']$/,""); print; exit}' "$2"; }

extract_section() {
  # $1 = heading name, $2 = file. Prints lines from "## $1" up to next "## " (exclusive).
  awk -v h="## $1" '
    $0 == h { found=1; next }
    found && /^## / { exit }
    found { print }
  ' "$2"
}

for STORY_FILE in "$@"; do
  [ -f "$STORY_FILE" ] || { echo "skip (not file): $STORY_FILE"; continue; }

  EXISTING=$(fm github_issue "$STORY_FILE")
  if [ -n "$EXISTING" ] && [ "$EXISTING" != "null" ]; then
    echo "skip (already linked #$EXISTING): $STORY_FILE"
    continue
  fi

  TITLE=$(fm title "$STORY_FILE")
  PRIORITY=$(fm priority "$STORY_FILE")
  EPIC=$(fm epic "$STORY_FILE")
  ID=$(fm id "$STORY_FILE")
  # Parse E.S from id (story.E.S.slug)
  STORY_E=$(echo "$ID" | awk -F. '{print $2}')
  STORY_S=$(echo "$ID" | awk -F. '{print $3}')

  # Resolve parent epic file + GH issue
  STORY_DIR=$(dirname "$STORY_FILE")
  EPIC_DIR=$(dirname "$(dirname "$STORY_DIR")")
  EPIC_FILE="${EPIC_DIR}/$(basename "$EPIC_DIR").md"
  EPIC_GH=$(fm github_issue "$EPIC_FILE")
  EPIC_TITLE_RAW=$(fm title "$EPIC_FILE")
  EPIC_TITLE_BARE=$(echo "$EPIC_TITLE_RAW" | sed -E "s/^Epic [0-9]+:? *//")
  MILESTONE="Epic ${STORY_E} — ${EPIC_TITLE_BARE}"

  # Bare title (strip "Story E.S: " prefix)
  STORY_TITLE_BARE=$(echo "$TITLE" | sed -E "s/^Story [0-9]+\.[0-9]+:? *//")
  ISSUE_TITLE="[Story ${STORY_E}.${STORY_S}] ${STORY_TITLE_BARE}"

  REL_PATH=$(git -C "$(git rev-parse --show-toplevel)" ls-files --full-name "$STORY_FILE" 2>/dev/null || echo "$STORY_FILE")
  DOC_URL="https://github.com/${REPO}/blob/develop/${REL_PATH}"

  STORY_STMT=$(extract_section "Story Statement" "$STORY_FILE")
  ACS=$(extract_section "Acceptance Criteria" "$STORY_FILE")
  # Convert numbered AC list to GitHub checkbox list
  ACS_CHECKBOX=$(echo "$ACS" | sed -E 's/^[0-9]+\. /- [ ] /')

  BODY=$(cat <<EOF
## Overview

${STORY_STMT}

## Acceptance Criteria

${ACS_CHECKBOX}

## Document

📄 [Story Document](${DOC_URL})
📁 \`${REL_PATH}\`
EOF
)

  echo "creating: $ISSUE_TITLE"
  ISSUE_URL=$(gh issue create \
    --title "$ISSUE_TITLE" \
    --body "$BODY" \
    --label story \
    --label "priority:${PRIORITY}" \
    --milestone "$MILESTONE")
  ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')

  echo "  → #${ISSUE_NUM} ${ISSUE_URL}"

  # Add to project board (best-effort)
  gh project item-add "$PROJECT_NUM" --owner "$OWNER" --url "$ISSUE_URL" >/dev/null 2>&1 \
    && echo "  ✓ board" || echo "  ⚠ board add failed"

  # Mirror priority field (best-effort)
  if [ -x "$PRIO_SCRIPT" ]; then
    bash "$PRIO_SCRIPT" "$ISSUE_NUM" "$PRIORITY" >/dev/null 2>&1 \
      && echo "  ✓ priority field" || echo "  ⚠ priority field failed"
  fi

  # Link as sub-issue of parent epic (best-effort).
  # Note: sub_issue_id is the issue's *internal database id*, NOT the visible number.
  # Must be passed as an integer (-F), not a string (-f).
  if [ -n "$EPIC_GH" ] && [ "$EPIC_GH" != "null" ]; then
    SUB_ID=$(gh api "/repos/${REPO}/issues/${ISSUE_NUM}" --jq .id 2>/dev/null)
    if [ -n "$SUB_ID" ]; then
      gh api --method POST \
        -H "Accept: application/vnd.github+json" \
        "/repos/${REPO}/issues/${EPIC_GH}/sub_issues" \
        -F sub_issue_id="$SUB_ID" >/dev/null 2>&1 \
        && echo "  ✓ sub-issue of epic #${EPIC_GH}" \
        || echo "  ⚠ sub-issue link to #${EPIC_GH} failed"
    else
      echo "  ⚠ could not resolve internal id for #${ISSUE_NUM}"
    fi
  fi

  # Write github_issue back to frontmatter (replace existing null line)
  sed -i '' -E "s|^github_issue: *null|github_issue: ${ISSUE_NUM}|" "$STORY_FILE"
  sed -i '' -E "s|^github_url: *null|github_url: ${ISSUE_URL}|" "$STORY_FILE"
  echo "  ✓ frontmatter"
  echo
done
