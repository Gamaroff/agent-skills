#!/bin/bash
# Compile sprint retrospective data: sprint meta + all issues (paginated, with
# changelog), classified for a retrospective rather than a review.
#
# Forked from jira-sprint-review-prep/scripts/compile-sprint-review-data.sh.
# What this adds over that script:
#   1. assignee (displayName / accountId / emailAddress) — the review compiler
#      fetches none, and per-person scoping is the whole point here
#   2. description, flattened from ADF to plain text — the source of each
#      item's "what this work was" paragraph
#   3. carriedOver — arrived from a previous sprint, which nothing else computes
#   4. assignees[] — the distinct roster, so a caller can default to everyone
#
# addedMidSprint keeps the review compiler's changelog-based definition (but
# not its string comparison, see below). It is deliberately changelog-based:
# "when did this issue join the sprint", not "when was it created". An old card
# pulled in on day six is discovery even though it was created months earlier.
#
# Emits JSON on stdout. Never writes a file.
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

SPRINT_ID=${1:-}
STORY_POINTS_FIELD=${JIRA_SP_FIELD:-customfield_10026}

if [ -z "$SPRINT_ID" ]; then
  echo "Usage: $0 <sprint_id>" >&2
  exit 1
fi
jsm_require_env

# 1. Sprint metadata — startDate is the cutoff every classification below uses.
jsm_curl GET "https://$JIRA_INSTANCE/rest/agile/1.0/sprint/$SPRINT_ID"
if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
  echo "Jira API Error fetching sprint ($JSM_HTTP_STATUS): $JSM_BODY" >&2
  exit 1
fi
SPRINT_META=$JSM_BODY
SPRINT_START=$(jq -r '.startDate // empty' <<<"$SPRINT_META")
if [ -z "$SPRINT_START" ]; then
  echo "Warning: sprint $SPRINT_ID has no startDate; mid-sprint and carry-over detection disabled." >&2
fi

# 2. All sprint issues, paginated, with changelog.
ISSUES=$(jsm_paginate_issues \
  "https://$JIRA_INSTANCE/rest/agile/1.0/sprint/$SPRINT_ID/issue" \
  "expand=changelog&fields=summary,status,resolution,assignee,description,created,resolutiondate,issuetype,parent,$STORY_POINTS_FIELD")

# 3. Normalize.
#
# Classification uses statusCategory.key ("done"/"indeterminate"/"new"), never
# the localized .status.name.
#
# Sprint changelog items carry comma-separated id lists in .from and .to, e.g.
# "123, 456". Both are split and trimmed before an exact match, so sprint 5
# never matches sprint 51.
#
# Timestamps are compared as EPOCH SECONDS, not as strings. The review compiler
# compares them as strings on the stated assumption that Jira emits both in the
# same ISO-8601 form; that assumption is false in practice (sprint meta returns
# `Z`, changelog entries returned `+0200` on a live tenant) and it inverts the
# comparison for every issue. See the note on `to_epoch` in the .jq file.
#
# Other edge cases inherited from the review compiler:
# - Added -> removed -> re-added counts only the "added" events; the latest
#   qualifying add wins for addedDate.
# - carriedOver and addedMidSprint are not mutually exclusive by construction,
#   but in practice an issue is one or the other: carry-over joins at or before
#   the start, discovery joins after it.
echo "$ISSUES" | jq \
  --arg sp "$STORY_POINTS_FIELD" \
  --arg sid "$SPRINT_ID" \
  --arg sstart "$SPRINT_START" \
  --argjson meta "$SPRINT_META" \
  -f "$(dirname "$0")/compile-retro-data.jq"
