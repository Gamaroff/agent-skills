#!/bin/bash
# Compile sprint review data: fetch sprint meta + all issues (paginated),
# classify completion via statusCategory.key (localization-safe),
# detect true mid-sprint scope creep (changelog timestamp > sprint.startDate),
# emit JSON consumed by compile-sprint-review-agenda.sh.
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

SPRINT_ID=${1:-}
STORY_POINTS_FIELD=${JIRA_SP_FIELD:-customfield_10026}
QA_STATUS_FIELD=${JIRA_QA_FIELD:-customfield_10090}

if [ -z "$SPRINT_ID" ]; then
  echo "Usage: $0 <sprint_id>" >&2
  exit 1
fi
jsm_require_env

# 1. Sprint metadata (need startDate for mid-sprint cutoff).
jsm_curl GET "https://$JIRA_INSTANCE/rest/agile/1.0/sprint/$SPRINT_ID"
if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
  echo "Jira API Error fetching sprint ($JSM_HTTP_STATUS): $JSM_BODY" >&2
  exit 1
fi
SPRINT_META=$JSM_BODY
SPRINT_START=$(jq -r '.startDate // empty' <<<"$SPRINT_META")
if [ -z "$SPRINT_START" ]; then
  echo "Warning: sprint $SPRINT_ID has no startDate; mid-sprint detection disabled." >&2
fi

# 2. All sprint issues, paginated, with changelog.
ISSUES=$(jsm_paginate_issues \
  "https://$JIRA_INSTANCE/rest/agile/1.0/sprint/$SPRINT_ID/issue" \
  "expand=changelog&fields=summary,status,resolution,$STORY_POINTS_FIELD,$QA_STATUS_FIELD")

# 3. Normalize. Use statusCategory.key ("done"/"indeterminate"/"new"), not localized .name.
# Mid-sprint = changelog entry where Sprint field gained this sprint id AFTER sprint.startDate.
# Sprint changelog .to is comma-separated id list like "123, 456"; split + trim + exact match.
#
# Edge cases:
# - Created-after-startDate string comparison relies on Jira emitting startDate
#   and changelog.created in the same ISO-8601 form (it does — both default to
#   +0000 / UTC). Mixing tenants with custom TZ rendering could skew this.
# - If an issue is added → removed → added across the sprint, only "added"
#   events are counted. The latest qualifying add wins for addedDate. We do not
#   correlate against "removed" events; an issue that was on the sprint at
#   start, removed, and re-added will be flagged as creep on the re-add.
echo "$ISSUES" | jq \
  --arg sp "$STORY_POINTS_FIELD" \
  --arg qa "$QA_STATUS_FIELD" \
  --arg sid "$SPRINT_ID" \
  --arg sstart "$SPRINT_START" \
  --argjson meta "$SPRINT_META" '
  def qa_val(f): if (f|type) == "object" then (f.value // f.name // "Not Tracked")
                 elif f == null then "Not Tracked"
                 else f end;
  def points_num(p): if p == null then 0 elif (p|type) == "number" then p else (p|tonumber? // 0) end;
  def sprint_add_events:
    [ .changelog.histories[]?
      | . as $h
      | .items[]?
      | select(.field == "Sprint")
      | { created: $h.created,
          added: ((.to // "") | tostring | split(",") | map(gsub("^\\s+|\\s+$"; ""))) } ];
  def added_mid_sprint:
    if $sstart == "" then false
    else
      [ sprint_add_events[]
        | select(.added | index($sid))
        | select(.created > $sstart) ] | length > 0
    end;
  def added_date:
    if $sstart == "" then null
    else
      [ sprint_add_events[]
        | select(.added | index($sid))
        | select(.created > $sstart)
        | .created ] | sort | last // null
    end;
  {
    sprint: {
      id: $meta.id,
      name: $meta.name,
      goal: ($meta.goal // ""),
      startDate: ($meta.startDate // null),
      endDate: ($meta.endDate // null),
      state: $meta.state
    },
    issues: [ .[] | {
      key: .key,
      summary: .fields.summary,
      status: .fields.status.name,
      statusCategoryKey: .fields.status.statusCategory.key,
      resolution: (.fields.resolution.name // null),
      points: points_num(.fields[$sp]),
      qaApproval: qa_val(.fields[$qa]),
      addedMidSprint: added_mid_sprint,
      addedDate: added_date
    } ]
  }'
