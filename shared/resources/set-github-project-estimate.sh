#!/usr/bin/env bash
# Set the "Estimate" number field on every GitHub Project (v2) board that
# contains the given issue. Mirrors `estimated_effort_hours` from story/task
# frontmatter onto the board so PMs can sort/filter by estimate.
#
# Usage:
#   set-github-project-estimate.sh <issue_number> <hours>
#
# Args:
#   issue_number  Required. The GitHub issue number (numeric).
#   hours         Required. Estimated effort in hours (number). Pass empty
#                 string to skip silently (caller uses this when frontmatter
#                 has no estimate).
#
# Field name override:
#   GH_PROJECT_ESTIMATE_FIELD  Field name to look up. Default: "Estimate".
#
# Exit code: always 0. Never fails the caller. Logs status to stdout.
#
# Requires: gh, jq. Repo context is detected via `gh repo view`.

set -u

ISSUE_NUM="${1:-}"
HOURS_IN="${2:-}"
FIELD_NAME="${GH_PROJECT_ESTIMATE_FIELD:-Estimate}"

if [ -z "$ISSUE_NUM" ]; then
  echo "⚠️  set-github-project-estimate: missing <issue_number> — skipped" >&2
  exit 0
fi

if [ -z "$HOURS_IN" ]; then
  # No estimate to set — caller passed empty. Silent skip.
  exit 0
fi

if ! command -v gh >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  echo "⚠️  set-github-project-estimate: gh/jq not available — skipped"
  exit 0
fi

# Validate numeric.
if ! echo "$HOURS_IN" | grep -Eq '^[0-9]+(\.[0-9]+)?$'; then
  echo "⚠️  set-github-project-estimate: '${HOURS_IN}' is not numeric — skipped"
  exit 0
fi

OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null || true)
REPO_NAME=$(gh repo view --json name -q '.name' 2>/dev/null || true)
if [ -z "$OWNER" ] || [ -z "$REPO_NAME" ]; then
  echo "⚠️  set-github-project-estimate: cannot resolve repo context — skipped"
  exit 0
fi

# Fetch project items + number field metadata.
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
                ... on ProjectV2Field {
                  id name dataType
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
  echo "⚠️  set-github-project-estimate: GraphQL fetch failed for #${ISSUE_NUM} — skipped"
  exit 0
fi

NODE_COUNT=$(echo "$PROJ_RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes | length // 0')
if [ "$NODE_COUNT" = "0" ] || [ -z "$NODE_COUNT" ]; then
  echo "⚠️  Estimate skip — issue #${ISSUE_NUM} not on any Project board"
  exit 0
fi

APPLIED=0
for i in $(seq 0 $((NODE_COUNT - 1))); do
  ITEM_ID=$(echo "$PROJ_RESPONSE" | jq -r ".data.repository.issue.projectItems.nodes[$i].id // empty")
  PROJECT_ID=$(echo "$PROJ_RESPONSE" | jq -r ".data.repository.issue.projectItems.nodes[$i].project.id // empty")
  PROJECT_TITLE=$(echo "$PROJ_RESPONSE" | jq -r ".data.repository.issue.projectItems.nodes[$i].project.title // \"unknown\"")
  FIELD_ID=$(echo "$PROJ_RESPONSE" | jq -r --arg name "$FIELD_NAME" ".data.repository.issue.projectItems.nodes[$i].project.fields.nodes[]? | select(.name == \$name and .dataType == \"NUMBER\") | .id // empty" | head -1)

  if [ -z "$ITEM_ID" ] || [ -z "$PROJECT_ID" ] || [ -z "$FIELD_ID" ]; then
    echo "⚠️  Estimate skip on '${PROJECT_TITLE}' — '${FIELD_NAME}' number field not found"
    continue
  fi

  if gh api graphql -f query='
    mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$FIELD_ID"'"
        value: { number: '"$HOURS_IN"' }
      }) { projectV2Item { id } }
    }' >/dev/null 2>&1; then
    echo "✅ Estimate set to ${HOURS_IN}h on '${PROJECT_TITLE}'"
    APPLIED=$((APPLIED + 1))
  else
    echo "⚠️  Estimate mutation failed on '${PROJECT_TITLE}'"
  fi
done

if [ "$APPLIED" = "0" ]; then
  echo "⚠️  Estimate not applied on any board for #${ISSUE_NUM}"
fi

exit 0
