#!/bin/bash
# Format JSON from compile-sprint-review-data.sh into stakeholder-facing
# release notes. Reads JSON from stdin or $1 (file path).
#
# Output is a tight, demo-ready changelog: only items with statusCategoryKey
# == "done" are listed; mid-sprint additions are flagged inline; DoD warnings
# are surfaced so a release manager can hold publication if something looks
# half-finished.
set -euo pipefail

INPUT=${1:-}
if [ -n "$INPUT" ] && [ -f "$INPUT" ]; then
  DATA=$(cat "$INPUT")
else
  DATA=$(cat)
fi

jq -r '
  def qa_missing(q): (q == "Not Tracked" or q == "");
  def dod_warn(i):
    if (i.resolution != null) and (qa_missing(i.qaApproval) | not) then ""
    else " ⚠️" end;

  . as $root
  | (.sprint) as $s
  | ([.issues[] | select(.statusCategoryKey == "done")]) as $done
  | ($done | map(.points) | add // 0) as $done_pts

  | "# Release Notes — " + ($s.name // "(unnamed sprint)") + "\n" +
    "\n_Window: " + ($s.startDate // "?") + " → " + ($s.endDate // "?") + "_" +
    "\n_Delivered: " + ($done | length | tostring) + " items, " + ($done_pts | tostring) + " pts_" +
    (if ($s.goal // "") == "" then "" else "\n\n**Sprint Goal:** " + $s.goal end) +
    "\n\n## Shipped\n\n" +
    ( if ($done | length) == 0 then "_No items shipped this sprint._\n"
      else ($done | map(
        "- **[" + .key + "]** " + .summary +
        (if .addedMidSprint then " _(added mid-sprint)_" else "" end) +
        dod_warn(.) + "\n"
      ) | join(""))
    end ) +
    "\n_Items marked ⚠️ failed Definition of Done checks (missing resolution or QA approval) — review before publishing._\n"
' <<<"$DATA"
