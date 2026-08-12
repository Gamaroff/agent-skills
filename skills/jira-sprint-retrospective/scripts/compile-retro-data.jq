# Normalise sprint issues for a retrospective.
# Expected --arg / --argjson: sp, sid, sstart, meta

def points_num(p): if p == null then 0 elif (p|type) == "number" then p else (p|tonumber? // 0) end;

# Compare instants, not strings.
#
# The obvious implementation — `changelog.created > sprint.startDate` as a
# string — is what the review compiler does, on the stated assumption that Jira
# emits both in the same ISO-8601 form. That assumption is FALSE. Observed live:
# sprint meta returns `2026-08-05T14:32:41.210Z` while changelog entries return
# `2026-08-05T16:03:00.440+0200`. Lexically "16:03" sorts after "14:32", so the
# string test says the issue joined 90 minutes into the sprint; converted, it
# joined at 14:03Z, half an hour BEFORE the sprint started.
#
# The failure is total rather than marginal: on that tenant every issue in the
# sprint read as mid-sprint discovery and the committed column was empty, which
# is not a subtly wrong number but a useless one. So both timestamps are parsed
# to epoch seconds and compared numerically.
#
# jq's fromdateiso8601 handles only `Z`, so the offset form is parsed by hand.
# mktime interprets a broken-down time as UTC, so subtracting the offset from
# the wall-clock reading yields the true instant.
def to_epoch:
  if . == null or . == "" then null
  else
    (. | sub("\\.[0-9]+"; "")) as $t
    | if ($t | test("Z$")) then
        ($t | sub("Z$"; "") | strptime("%Y-%m-%dT%H:%M:%S") | mktime)
      elif ($t | test("[+-][0-9]{2}:?[0-9]{2}$")) then
        ($t | capture("^(?<base>.*?)(?<sign>[+-])(?<hh>[0-9]{2}):?(?<mm>[0-9]{2})$")) as $c
        | ($c.base | strptime("%Y-%m-%dT%H:%M:%S") | mktime)
          - ((if $c.sign == "+" then 1 else -1 end) * (($c.hh | tonumber) * 3600 + ($c.mm | tonumber) * 60))
      else
        ($t | strptime("%Y-%m-%dT%H:%M:%S") | mktime)
      end
  end;

($sstart | to_epoch) as $startEpoch

# Jira API v3 returns descriptions as ADF, not markdown. Walk every nested node
# for text leaves rather than assuming a depth — a description carrying a list
# or a table nests deeper than one of plain paragraphs.
| def adf_text:
    if . == null then ""
    elif type == "string" then .
    elif type == "object" then ((.text // "") + ((.content // []) | map(adf_text) | join(" ")))
    elif type == "array" then (map(adf_text) | join(" "))
    else "" end;

def clean_text: adf_text | gsub("\\s+"; " ") | gsub("^\\s+|\\s+$"; "");

# Sprint changelog items carry comma-separated id lists in .from and .to, e.g.
# "123, 456". Both are split and trimmed before an exact match, so sprint 5
# never matches sprint 51.
def sprint_events:
  [ .changelog.histories[]?
    | . as $h
    | .items[]?
    | select(.field == "Sprint")
    | { at: ($h.created | to_epoch),
        raw: $h.created,
        from: ((.from // "") | tostring | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(. != ""))),
        added: ((.to // "") | tostring | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(. != ""))) } ];

def joined_events: [ sprint_events[] | select(.added | index($sid)) | select(.at != null) ];

# Discovery: joined after the sprint had started.
def added_mid_sprint:
  if $startEpoch == null then false
  else [ joined_events[] | select(.at > $startEpoch) ] | length > 0
  end;

def added_date:
  if $startEpoch == null then null
  else [ joined_events[] | select(.at > $startEpoch) ] | sort_by(.at) | last | (.raw // null)
  end;

# Carry-over: joined at or before the start, having come from somewhere — the
# same event names a previous sprint in .from. An issue placed on its first ever
# sprint has an empty .from and is not a carry-over.
def carried_over:
  if $startEpoch == null then false
  else
    [ joined_events[]
      | select(.at <= $startEpoch)
      | select((.from | length) > 0) ] | length > 0
  end;

def issue_rows:
  [ .[] | {
      key: .key,
      summary: .fields.summary,
      description: (.fields.description | clean_text),
      issueType: (.fields.issuetype.name // null),
      parentKey: (.fields.parent.key // null),
      status: .fields.status.name,
      statusCategoryKey: .fields.status.statusCategory.key,
      resolution: (.fields.resolution.name // null),
      resolutionDate: (.fields.resolutiondate // null),
      created: (.fields.created // null),
      points: points_num(.fields[$sp]),
      assignee: (if .fields.assignee == null then null else {
        displayName: (.fields.assignee.displayName // null),
        accountId: (.fields.assignee.accountId // null),
        emailAddress: (.fields.assignee.emailAddress // null)
      } end),
      addedMidSprint: added_mid_sprint,
      addedDate: added_date,
      carriedOver: carried_over
    } ];

issue_rows as $rows
| {
    sprint: {
      id: $meta.id,
      name: $meta.name,
      goal: ($meta.goal // ""),
      startDate: ($meta.startDate // null),
      endDate: ($meta.endDate // null),
      completeDate: ($meta.completeDate // null),
      state: $meta.state
    },
    assignees: (
      [ $rows[] | select(.assignee != null) | .assignee ]
      | unique_by(.accountId)
      | sort_by(.displayName // "")
    ),
    unassignedCount: ([ $rows[] | select(.assignee == null) ] | length),
    issues: $rows
  }
