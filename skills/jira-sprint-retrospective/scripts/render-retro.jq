# Render a sprint retrospective from compile-retro-data.sh output.
#
# Lives in its own file rather than inline in render-retro.sh: the document
# prose contains apostrophes ("What didn't"), and a single-quoted bash string
# cannot carry those without unreadable escaping.
#
# Expected --argjson / --arg: selected, git, scopeLabel, scopeMode, jira, today, sprintNo

def pct($n; $d): if $d > 0 then (($n / $d) * 100 | round) else 0 end;
def day: if . == null then "" else (. | split("T")[0]) end;
def esc: gsub("\\|"; "\\|");

# A description is context, not the document. One or two sentences is what the
# format asks for; anything longer belongs in the linked issue.
def trim($n): if (. | length) > $n then (.[0:$n] | sub("\\s+\\S*$"; "")) + "…" else . end;
def link($k): if $jira == "" then $k else "[" + $k + "](" + $jira + "/browse/" + $k + ")" end;

def described: if (.description // "") != "" then (.description | trim(320)) else "_No description on the issue._" end;

def flags:
  (if .assignee then " · " + .assignee.displayName else " · unassigned" end)
  + (if .addedMidSprint then " · **added mid-sprint** " + (.addedDate | day) else "" end)
  + (if .carriedOver then " · **carried in**" else "" end);

def item_block:
  [ "### " + (.key | link(.)) + " — " + (.summary | esc),
    "",
    described,
    "",
    "→ " + .status + (if .resolution then " (" + .resolution + ")" else "" end) + flags,
    "" ];

# Pick the commit figures that match the document's scope.
#
# collect-git-activity.sh always reports repository-wide totals in .repository
# and, when --author-email was passed, a per-author breakdown alongside. Reading
# .repository while labelling it "per-author" would attribute the whole repo's
# commits to one person — the exact misattribution this skill refuses to make.
def git_figures:
  if ($git == null or $git.available != true) then null
  elif ($git.scope == "per-author" and ($git.perAuthor | length) > 0) then
    ([$git.perAuthor[].commits] | add) as $c
    | ([$git.perAuthor[].correctionCommits] | add) as $x
    | {commits: $c, corrections: $x,
       share: (if $c > 0 then (($x / $c) * 100 | round) else 0 end),
       label: "for the named people"}
  else
    {commits: $git.repository.commits, corrections: $git.repository.correctionCommits,
     share: $git.repository.correctionShare,
     label: "repository-wide"}
  end;

git_figures as $gitFig
| ([$selected[].accountId]) as $ids
| ($scopeMode == "all") as $everyone
| [ .issues[]
    | select($everyone or (.assignee != null and (.assignee.accountId as $a | $ids | index($a)))) ] as $scoped

| ([$scoped[] | select(.statusCategoryKey == "done")])          as $done
| ([$scoped[] | select(.statusCategoryKey == "indeterminate")]) as $inflight
| ([$scoped[] | select(.statusCategoryKey == "new")])           as $notstarted
| ([$scoped[] | select(.addedMidSprint == false)])              as $committed
| ([$scoped[] | select(.addedMidSprint == true)])               as $added
| ([$committed[] | select(.statusCategoryKey == "done")])       as $committedDone
| ([$added[]     | select(.statusCategoryKey == "done")])       as $addedDone
| ([$scoped[] | select(.carriedOver == true)])                  as $carriedIn
| ([$scoped[] | select(.statusCategoryKey != "done")])          as $carryingOut

| [
"---",
"title: Sprint \($sprintNo) Retrospective",
"type: record",
"description: Delivery retrospective for \(.sprint.name) (\(.sprint.startDate | day) to \(.sprint.endDate | day)), scoped to \($scopeLabel).",
"tags: [sprint, retrospective, delivery]",
"status: accepted",
"scope: \($scopeLabel)",
"sprint: \($sprintNo)",
"sprint_id: \(.sprint.id)",
"sprint_window: \(.sprint.startDate | day) to \(.sprint.endDate | day)",
"created: \($today)",
"updated: \($today)",
"---",
"",
"# Sprint \($sprintNo) Retrospective",
"",
"**Sprint:** \(.sprint.name) (id `\(.sprint.id)`) · **Window:** \(.sprint.startDate | day) to \(.sprint.endDate | day)  ",
"**Scope:** \(if $everyone then "everyone who held work in this sprint" else $scopeLabel end) — \($scoped | length) of \(.issues | length) issues.  ",
"**Measured:** \($today) — see [How this was measured](#how-this-was-measured). Every figure below decays; re-derive before reusing.",
""
]
+ (if (.sprint.goal // "") != "" then ["**Sprint goal:** \(.sprint.goal)", ""] else [] end)
+ [
"---",
"",
"## The headline",
"",
"<!-- retro:headline — one or two sentences naming the single most important thing this sprint's data says. Delete this comment. -->",
"",
"| Figure | | Note |",
"| --- | --: | --- |",
"| Committed work delivered | \($committedDone | length) of \($committed | length) | \(pct($committedDone | length; $committed | length))% of what was on the board at sprint start |",
"| Added mid-sprint | \($added | length) | \(pct($added | length; $scoped | length))% of the final board; \($addedDone | length) of them closed |",
"| Carried in from a previous sprint | \($carriedIn | length) | — |",
"| Carrying to the next sprint | \($carryingOut | length) | \($inflight | length) in flight, \($notstarted | length) not started |"
]
+ (if $gitFig != null then
    ["| Commits in the window | \($gitFig.commits) | \($gitFig.corrections) correction-shaped (~\($gitFig.share)%), \($gitFig.label) |"]
   else [] end)
+ [
"",
"---",
"",
"## What shipped",
""
]
+ (if ($done | length) == 0 then ["_Nothing in scope closed this sprint._", ""]
   else [ $done | sort_by(.key) | .[] | item_block ] | flatten end)
+ [
"---",
"",
"## What did not",
""
]
+ (if ($carryingOut | length) == 0 then ["_Everything in scope closed._", ""]
   else [ $carryingOut | sort_by(.statusCategoryKey, .key) | .[] | item_block ] | flatten end)
+ [
"---",
"",
"## What the data says",
"",
"<!-- retro:findings — three to five findings. Each: a bolded claim as an H3, a short paragraph, then a blockquote carrying the figures it rests on. Ground every claim in the numbers above; drop any you cannot. Delete this comment. -->",
"",
"---",
"",
"## Keep / change",
"",
"| Keep | Change |",
"| --- | --- |",
"",
"<!-- retro:keepchange — two or three rows for the table above. Concrete practices observed this sprint, not generic advice. Delete this comment. -->",
"",
"---",
"",
"## Suggested order for the next sprint",
"",
"<!-- retro:order — rank the carry-over above, highest consequence first, with one line of reasoning each. Close with a single question to open planning with. Delete this comment. -->",
"",
"---",
"",
"## How this was measured",
"",
"Run \($today). **Every figure above decays** — the issue set changes as cards move, and commit counts move with every merge. Re-run these before reusing any number.",
"",
"Sprint issues, classification, and the assignee roster:",
"",
"```bash",
"bash scripts/compile-retro-data.sh \(.sprint.id) > retro-data.json",
"```",
"",
"Committed vs added is **changelog-based**: an issue counts as added mid-sprint when a Sprint changelog event joined it to sprint `\(.sprint.id)` after `\(.sprint.startDate)`. It is not the issue creation date — an old card pulled in on day six is discovery, not commitment. Carried-in is the mirror: joined at or before the start, having come from another sprint.",
""
]
+ (if $gitFig != null then
    ["Commit figures (\($gitFig.label), ref `\($git.window.ref)`):",
     "",
     "```bash",
     "bash scripts/collect-git-activity.sh '\($git.window.since)' '\($git.window.until)'\(if $git.scope == "per-author" then " --author-email " + ([$git.perAuthor[].email] | join(",")) else "" end)",
     "```",
     "",
     "The correction share is a **heuristic over commit subjects** matching `\($git.correctionPattern)`, not a classification anyone audited. Treat the proportion as the claim; the exact count is not load-bearing.",
     ""]
   elif ($git != null and $git.available == false) then
    ["Commit figures were not collected: \($git.reason).", ""]
   else [] end)
+ [
"<!-- retro:pr-counts — if merged-PR counts were collected, state them and the query. If not, delete this comment and say nothing. Never imply a count that was not measured. -->",
""
]
| join("\n")
