#!/bin/bash
# Fixture-replay test for the retrospective renderer.
# No live Jira, no network — feeds a canned compile-retro-data.sh output through
# render-retro.sh and asserts the figure arithmetic, the people filter, the
# halt paths, and the authoring markers.
#
# Run: bash skills/jira-sprint-retrospective/tests/fixture.test.sh
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
SKILL=$(cd "$HERE/.." && pwd)
FIXTURE="$HERE/fixtures/retro-data.json"
RENDER="$SKILL/scripts/render-retro.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fail=0
assert_contains() {
  local label=$1 needle=$2 hay=$3
  if ! grep -qF -- "$needle" <<<"$hay"; then
    echo "FAIL [$label]: missing '$needle'" >&2
    fail=$((fail + 1))
  fi
}
assert_not_contains() {
  local label=$1 needle=$2 hay=$3
  if grep -qF -- "$needle" <<<"$hay"; then
    echo "FAIL [$label]: unexpected '$needle'" >&2
    fail=$((fail + 1))
  fi
}
assert_status() {
  local label=$1 want=$2 got=$3
  if [ "$want" -ne "$got" ]; then
    echo "FAIL [$label]: expected exit $want, got $got" >&2
    fail=$((fail + 1))
  fi
}

# --- Whole sprint -----------------------------------------------------------
# Fixture: 6 issues. Committed (not added mid-sprint) = 101,102,103,106 → 4, of
# which 101,102 are done → 2. Added mid-sprint = 104,105 → 2 (33%), 104 done.
# Carried in = 102 → 1. Not done = 103 (in flight), 105,106 (not started) → 3.
ALL=$(bash "$RENDER" "$FIXTURE" --stdout --jira-base https://acme.atlassian.net 2>&1)

assert_contains "all.title"      "# Sprint 7 Retrospective"                     "$ALL"
assert_contains "all.scope"      "scope: all"                                    "$ALL"
assert_contains "all.sprintid"   "sprint_id: 42"                                 "$ALL"
assert_contains "all.window"     "sprint_window: 2026-05-04 to 2026-05-18"       "$ALL"
assert_contains "all.goal"       "Ship the new checkout flow behind a flag"      "$ALL"
assert_contains "all.count"      "6 of 6 issues"                                 "$ALL"
assert_contains "all.committed"  "| Committed work delivered | 2 of 4 | 50%"     "$ALL"
assert_contains "all.added"      "| Added mid-sprint | 2 | 33%"                  "$ALL"
assert_contains "all.addedDone"  "1 of them closed"                              "$ALL"
assert_contains "all.carriedIn"  "| Carried in from a previous sprint | 1 |"     "$ALL"
assert_contains "all.carryOut"   "| Carrying to the next sprint | 3 | 1 in flight, 2 not started |" "$ALL"

# Issue links and per-item flags
assert_contains "all.link"       "[PROJ-101](https://acme.atlassian.net/browse/PROJ-101)" "$ALL"
assert_contains "all.creepFlag"  "**added mid-sprint** 2026-05-08"               "$ALL"
assert_contains "all.carryFlag"  "**carried in**"                                "$ALL"
assert_contains "all.assignee"   "Ada Lovelace"                                  "$ALL"
# An issue nobody owns must appear, not vanish
assert_contains "all.unassigned" "unassigned"                                    "$ALL"
assert_contains "all.unassignedItem" "PROJ-106"                                  "$ALL"
# Empty description falls back rather than rendering a blank paragraph
assert_contains "all.noDesc"     "_No description on the issue._"                "$ALL"

# Every authoring slot must be present for the caller to fill
for marker in retro:headline retro:findings retro:keepchange retro:order retro:pr-counts; do
  assert_contains "all.marker.$marker" "$marker" "$ALL"
done

# Sections
assert_contains "all.sec.shipped"  "## What shipped"        "$ALL"
assert_contains "all.sec.didnot"   "## What did not"        "$ALL"
assert_contains "all.sec.measured" "## How this was measured" "$ALL"

# --- Scoped to one person ---------------------------------------------------
# Ada holds 101 (done, committed), 103 (in flight, committed), 105 (not started,
# added mid-sprint) → committed 2, of which 1 done; added 1 (33% of 3), 0 done.
ADA=$(bash "$RENDER" "$FIXTURE" --stdout --people "Ada Lovelace" 2>&1)

assert_contains "ada.scope"     "scope: Ada Lovelace"                       "$ADA"
assert_contains "ada.count"     "3 of 6 issues"                             "$ADA"
assert_contains "ada.committed" "| Committed work delivered | 1 of 2 | 50%" "$ADA"
assert_contains "ada.added"     "| Added mid-sprint | 1 | 33%"              "$ADA"
assert_contains "ada.carriedIn" "| Carried in from a previous sprint | 0 |" "$ADA"
assert_contains "ada.item"      "PROJ-101"                                  "$ADA"
# Grace's and the unassigned work must be excluded
assert_not_contains "ada.excl.grace"      "PROJ-102" "$ADA"
assert_not_contains "ada.excl.grace2"     "PROJ-104" "$ADA"
assert_not_contains "ada.excl.unassigned" "PROJ-106" "$ADA"

# Match by email and by unambiguous substring, not just exact display name
EMAIL=$(bash "$RENDER" "$FIXTURE" --stdout --people "ada@example.com" 2>&1)
assert_contains "match.email"  "scope: Ada Lovelace"  "$EMAIL"
SUB=$(bash "$RENDER" "$FIXTURE" --stdout --people "grace" 2>&1)
assert_contains "match.substr" "scope: Grace Hopper"  "$SUB"

# --- Halt paths -------------------------------------------------------------
# A typo must stop loudly. Silently rendering an empty retrospective would read
# as a quiet sprint, which is worse than an error.
MISS=$(bash "$RENDER" "$FIXTURE" --stdout --people "Nobody Here" 2>&1); MISS_RC=$?
assert_status   "halt.miss.rc"      1                  "$MISS_RC"
assert_contains "halt.miss.msg"     "no match: Nobody Here" "$MISS"
assert_contains "halt.miss.roster"  "Ada Lovelace"     "$MISS"
assert_contains "halt.miss.roster2" "Grace Hopper"     "$MISS"
assert_contains "halt.miss.unassigned" "1 unassigned"  "$MISS"

# "a" is a substring of both names — ambiguity must halt, never pick one
AMB=$(bash "$RENDER" "$FIXTURE" --stdout --people "a" 2>&1); AMB_RC=$?
assert_status   "halt.amb.rc"  1              "$AMB_RC"
assert_contains "halt.amb.msg" "ambiguous: a" "$AMB"

# --- Commit figures ---------------------------------------------------------
# Regression pin. collect-git-activity.sh always reports repository-wide totals
# in .repository AND a per-author breakdown when --author-email was passed.
# Reading .repository while labelling it per-author attributed the entire
# repository's commits to one person. The renderer must sum .perAuthor instead.
cat > "$TMP/git-author.json" <<'JSON'
{"available":true,
 "window":{"since":"2026-05-04","until":"2026-05-18","ref":"--all"},
 "scope":"per-author","correctionPattern":"correct|drift",
 "repository":{"commits":900,"correctionCommits":300,"correctionShare":33},
 "perAuthor":[{"email":"ada@example.com","commits":10,"correctionCommits":4}]}
JSON
GA=$(bash "$RENDER" "$FIXTURE" --stdout --people "Ada Lovelace" --git "$TMP/git-author.json" 2>&1)
assert_contains "git.perAuthor.figure" "| Commits in the window | 10 | 4 correction-shaped (~40%), for the named people |" "$GA"
assert_not_contains "git.perAuthor.noRepoTotal" "900" "$GA"
# The reproduce command must carry the author filter, or it will not reproduce
assert_contains "git.perAuthor.repro" "--author-email ada@example.com" "$GA"

cat > "$TMP/git-repo.json" <<'JSON'
{"available":true,
 "window":{"since":"2026-05-04","until":"2026-05-18","ref":"--all"},
 "scope":"repository-wide","correctionPattern":"correct|drift",
 "repository":{"commits":900,"correctionCommits":300,"correctionShare":33},
 "perAuthor":[]}
JSON
GR=$(bash "$RENDER" "$FIXTURE" --stdout --git "$TMP/git-repo.json" 2>&1)
assert_contains "git.repo.figure" "| Commits in the window | 900 | 300 correction-shaped (~33%), repository-wide |" "$GR"

# Unusable git degrades to a stated omission, never a silent one
echo '{"available":false,"reason":"not inside a git work tree"}' > "$TMP/git-none.json"
GN=$(bash "$RENDER" "$FIXTURE" --stdout --git "$TMP/git-none.json" 2>&1)
assert_not_contains "git.none.noRow" "Commits in the window" "$GN"
assert_contains     "git.none.reason" "Commit figures were not collected: not inside a git work tree." "$GN"

# --- Output path ------------------------------------------------------------
PATH_OUT=$(bash "$RENDER" "$FIXTURE" --print-path 2>&1)
assert_contains "path.default" "sprint.7.retrospective.md" "$PATH_OUT"

# --out writes a real file and prints where
WROTE=$(bash "$RENDER" "$FIXTURE" --out "$TMP/out/sprint.7.retrospective.md" 2>/dev/null)
if [ ! -f "$TMP/out/sprint.7.retrospective.md" ]; then
  echo "FAIL [out.file]: file not written" >&2
  fail=$((fail + 1))
fi
assert_contains "out.path" "$TMP/out/sprint.7.retrospective.md" "$WROTE"

# --- Classification from raw Jira shape -------------------------------------
# Regression pin for the timezone bug. Jira does NOT emit both timestamps in the
# same form: sprint meta came back as `...14:32:41.210Z` while changelog entries
# came back as `...16:03:00.440+0200`. Compared as strings, "16:03" sorts after
# "14:32" and the issue reads as joining 90 minutes into the sprint — when
# converted it joined at 14:03Z, half an hour BEFORE the sprint started.
#
# On the tenant where this was found the failure was total: every issue read as
# mid-sprint discovery and the committed column was empty. These assertions fail
# on any reversion to string comparison.
CLASSIFIED=$(jq \
  --arg sp customfield_10026 \
  --arg sid 5434 \
  --arg sstart '2026-08-05T14:32:41.210Z' \
  --argjson meta '{"id":5434,"name":"Test Sprint 9","goal":"","startDate":"2026-08-05T14:32:41.210Z","endDate":"2026-08-12T15:00:00.000Z","state":"closed"}' \
  -f "$SKILL/scripts/compile-retro-data.jq" \
  "$HERE/fixtures/raw-issues.json")

pluck() { jq -r --arg k "$1" --arg f "$2" '.issues[] | select(.key == $k) | .[$f] | tostring' <<<"$CLASSIFIED"; }

# +0200 wall-clock reads LATER than the Z start but the instant is EARLIER
assert_contains "tz.201.committed"  "false" "$(pluck PROJ-201 addedMidSprint)"
assert_contains "tz.201.notCarried" "false" "$(pluck PROJ-201 carriedOver)"
# Genuinely joined five days in
assert_contains "tz.202.added"      "true"  "$(pluck PROJ-202 addedMidSprint)"
# Joined at/before the start with a prior sprint in `from` → carry-over
assert_contains "tz.203.carried"    "true"  "$(pluck PROJ-203 carriedOver)"
assert_contains "tz.203.notAdded"   "false" "$(pluck PROJ-203 addedMidSprint)"

# ADF is walked to arbitrary depth, not just the first level of paragraphs
assert_contains "adf.deep" "Nested ADF deep leaf" "$(pluck PROJ-203 description)"
# Roster excludes the unassigned issue but counts it
assert_contains "roster.names"      "Ada Lovelace" "$(jq -r '[.assignees[].displayName] | join(",")' <<<"$CLASSIFIED")"
assert_contains "roster.unassigned" "1"            "$(jq -r '.unassignedCount' <<<"$CLASSIFIED")"

if [ "$fail" -gt 0 ]; then
  echo "❌ $fail assertion(s) failed" >&2
  exit 1
fi
echo "✅ all assertions passed"
