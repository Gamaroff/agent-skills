#!/usr/bin/env bash
# Set the "Priority" single-select field on every GitHub Project (v2) board
# that contains the given issue. Mirrors the priority:* label that GitHub
# does NOT auto-sync into Project custom fields.
#
# Usage:
#   set-github-project-priority.sh <issue_number> [priority]
#
# Args:
#   issue_number  Required. The GitHub issue number (numeric).
#   priority      Optional. One of: critical|high|medium|low (case-insensitive —
#                 callers pass Title Case from create-task's frontmatter flow
#                 and lowercase from review-task/review-story's label flow;
#                 helper normalises via `tr`).
#                 If omitted, derived from the issue's first matching
#                 priority:* label.
#
# Filename note: this script supersedes the working name "set-github-priority.sh"
# from the original design plan; "project" is included because it operates on
# Project v2 board fields, not on the issue itself.
#
# Exit code: always 0. Never fails the caller. Logs status to stdout.
#
# Requires: gh, jq. Repo context is detected via `gh repo view`.

set -u

ISSUE_NUM="${1:-}"
PRIORITY_IN="${2:-}"

if [ -z "$ISSUE_NUM" ]; then
  echo "⚠️  set-github-project-priority: missing <issue_number> — skipped" >&2
  exit 0
fi

if ! command -v gh >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  echo "⚠️  set-github-project-priority: gh/jq not available — skipped"
  exit 0
fi

# 1. Resolve priority — argument wins, else read from issue labels.
if [ -z "$PRIORITY_IN" ]; then
  LABELS=$(gh issue view "$ISSUE_NUM" --json labels -q '.labels[].name' 2>/dev/null || true)
  PRIORITY_IN=$(echo "$LABELS" | sed -n 's/^priority:\(critical\|high\|medium\|low\)$/\1/p' | head -1)
fi

# Lowercase + strip whitespace for matching.
PRIORITY_LC=$(echo "$PRIORITY_IN" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')

case "$PRIORITY_LC" in
  critical) P_PREFIX="P0" ;;
  high)     P_PREFIX="P1" ;;
  medium)   P_PREFIX="P2" ;;
  low)      P_PREFIX="P3" ;;
  *)
    echo "⚠️  set-github-project-priority: unknown priority '${PRIORITY_IN}' — skipped"
    exit 0
    ;;
esac

OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null || true)
REPO_NAME=$(gh repo view --json name -q '.name' 2>/dev/null || true)
if [ -z "$OWNER" ] || [ -z "$REPO_NAME" ]; then
  echo "⚠️  set-github-project-priority: cannot resolve repo context — skipped"
  exit 0
fi

# 2. Fetch all project items + Priority field metadata for this issue.
PROJ_RESPONSE=$(gh api graphql -f query='
{
  repository(owner: "'"$OWNER"'", name: "'"$REPO_NAME"'") {
    issue(number: '"$ISSUE_NUM"') {
      projectItems(first: 10) {
        nodes {
          id
          project {
            id
            title
            fields(first: 50) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id name options { id name }
                }
              }
            }
          }
        }
      }
    }
  }
}' 2>/dev/null || true)

if [ -z "$PROJ_RESPONSE" ]; then
  echo "⚠️  set-github-project-priority: GraphQL fetch failed for #${ISSUE_NUM} — skipped"
  exit 0
fi

NODE_COUNT=$(echo "$PROJ_RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes | length // 0')
if [ "$NODE_COUNT" = "0" ] || [ -z "$NODE_COUNT" ]; then
  echo "⚠️  Priority skip — issue #${ISSUE_NUM} not on any Project board"
  exit 0
fi

# 3. For each project item, set the Priority field if found.
APPLIED=0
for i in $(seq 0 $((NODE_COUNT - 1))); do
  ITEM_ID=$(echo "$PROJ_RESPONSE" | jq -r ".data.repository.issue.projectItems.nodes[$i].id // empty")
  PROJECT_ID=$(echo "$PROJ_RESPONSE" | jq -r ".data.repository.issue.projectItems.nodes[$i].project.id // empty")
  PROJECT_TITLE=$(echo "$PROJ_RESPONSE" | jq -r ".data.repository.issue.projectItems.nodes[$i].project.title // \"unknown\"")
  FIELD_ID=$(echo "$PROJ_RESPONSE" | jq -r ".data.repository.issue.projectItems.nodes[$i].project.fields.nodes[]? | select(.name == \"Priority\") | .id // empty" | head -1)
  OPTION_ID=$(echo "$PROJ_RESPONSE" | jq -r --arg p "$P_PREFIX" ".data.repository.issue.projectItems.nodes[$i].project.fields.nodes[]? | select(.name == \"Priority\") | .options[]? | select(.name | startswith(\$p)) | .id // empty" | head -1)

  if [ -z "$ITEM_ID" ] || [ -z "$PROJECT_ID" ] || [ -z "$FIELD_ID" ] || [ -z "$OPTION_ID" ]; then
    echo "⚠️  Priority skip on '${PROJECT_TITLE}' — Priority field or '${P_PREFIX} *' option not found"
    continue
  fi

  if gh api graphql -f query='
    mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$FIELD_ID"'"
        value: { singleSelectOptionId: "'"$OPTION_ID"'" }
      }) { projectV2Item { id } }
    }' >/dev/null 2>&1; then
    echo "✅ Priority set to ${P_PREFIX} on '${PROJECT_TITLE}'"
    APPLIED=$((APPLIED + 1))
  else
    echo "⚠️  Priority mutation failed on '${PROJECT_TITLE}' — label priority:${PRIORITY_LC} still applied"
  fi
done

if [ "$APPLIED" = "0" ]; then
  echo "⚠️  Priority not applied on any board for #${ISSUE_NUM}"
fi

exit 0
