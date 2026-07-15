#!/bin/bash
# Format JSON from compile-sprint-review-data.sh into markdown Sprint Review agenda.
# Reads JSON from stdin or $1 (file path).
# DoD rules: see ../references/dod-rules.md.
#   Done issue passes DoD iff resolution != null AND qaApproval not in {"Not Tracked",""}.
#
# Velocity reporting splits committed work (on sprint at start) from mid-sprint
# creep so a real sprint review can distinguish "delivered against commitment"
# from "absorbed mid-sprint scope". Headline ratio uses committed pts only.
set -euo pipefail

INPUT=${1:-}
if [ -n "$INPUT" ] && [ -f "$INPUT" ]; then
  DATA=$(cat "$INPUT")
else
  DATA=$(cat)
fi

jq -r '
  # qaApproval arrives normalized to a string by compile-sprint-review-data.sh
  # (null → "Not Tracked"). We only need string-equality checks here.
  def qa_missing(q): (q == "Not Tracked" or q == "");
  def dod_status(i):
    if (i.resolution != null) and (qa_missing(i.qaApproval) | not)
    then "🟢 Definition of Done Met"
    else "⚠️ DoD Audit Warned (missing: " +
      ([ if i.resolution == null then "resolution" else empty end,
         if qa_missing(i.qaApproval) then "QA approval" else empty end
      ] | join(", ")) + ")"
    end;

  . as $root
  | (.sprint) as $s
  | ([.issues[] | select(.statusCategoryKey == "done")]) as $done
  | ([.issues[] | select(.statusCategoryKey != "done")]) as $open
  | ([.issues[] | select(.addedMidSprint == true)]) as $creep
  | ([.issues[] | select(.addedMidSprint == false)]) as $committed
  | ([$committed[] | select(.statusCategoryKey == "done")]) as $committed_done
  | ([$creep[] | select(.statusCategoryKey == "done")]) as $creep_done
  | ($committed       | map(.points) | add // 0) as $committed_pts
  | ($committed_done  | map(.points) | add // 0) as $committed_done_pts
  | ($creep           | map(.points) | add // 0) as $creep_pts
  | ($creep_done      | map(.points) | add // 0) as $creep_done_pts
  | ($done            | map(.points) | add // 0) as $done_pts
  | (.issues | map(.points) | add // 0) as $total_pts

  | "# 🚀 Sprint Review Presentation Agenda\n" +
    "\n**Sprint:** " + ($s.name // "(unnamed)") +
    "  |  **State:** " + ($s.state // "?") +
    "  |  **Window:** " + ($s.startDate // "?") + " → " + ($s.endDate // "?") +
    "\n**Goal:** " + (if ($s.goal // "") == "" then "_(none set)_" else $s.goal end) +
    "\n**Velocity (committed):** " + ($committed_done_pts | tostring) + " / " + ($committed_pts | tostring) + " pts delivered" +
    "\n**Mid-sprint creep:** " + ($creep_done_pts | tostring) + " / " + ($creep_pts | tostring) + " pts delivered" +
    "\n**Total delivered:** " + ($done_pts | tostring) + " / " + ($total_pts | tostring) + " pts" +
    "\n\n---\n\n" +

    "## 🎯 1. The Shipped Increment (What We Delivered)\n" +
    "*Review and demonstrate these features to stakeholders:*\n\n" +
    ( if ($done | length) == 0 then "_No issues completed this sprint._\n"
      else ($done | map(
        "- **[" + .key + "] " + .summary + "** (Points: " + (.points | tostring) +
        (if .addedMidSprint then ", _added mid-sprint_" else "" end) + ")\n" +
        "  - *DoD Verification*: " + dod_status(.) + "\n"
      ) | join(""))
    end ) +

    "\n## 📉 2. Uncompleted Work & Roadblocks\n" +
    "*Discuss why these items missed the sprint commitment and what we learned:*\n\n" +
    ( if ($open | length) == 0 then "_All committed items completed._ 🎉\n"
      else ($open | map(
        "- **[" + .key + "] " + .summary + "** (*Current Status: " + .status + "*)\n"
      ) | join(""))
    end ) +

    "\n## ⚠️ 3. Mid-Sprint Scope Creep Audit\n" +
    "*Review changes made to the sprint scope after activation:*\n\n" +
    ( if ($creep | length) == 0 then "_No mid-sprint additions detected._\n"
      else ($creep | map(
        "- **[" + .key + "] " + .summary + "** (Added to sprint on: " +
        ((.addedDate // "unknown") | split("T")[0]) + ")\n"
      ) | join(""))
    end )
' <<<"$DATA"
