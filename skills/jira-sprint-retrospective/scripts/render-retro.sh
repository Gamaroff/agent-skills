#!/bin/bash
# Render a sprint retrospective document from compile-retro-data.sh output.
#
# Renders only what the data determines: frontmatter, the headline figures, the
# shipped/not-shipped item rows, and the measurement section. Sections needing
# judgement (findings, keep/change, next-sprint ordering) are emitted as marked
# empty slots for the caller to author — see SKILL.md. A script cannot decide
# what a sprint means, and pretending otherwise produces filler.
#
# Usage:
#   render-retro.sh <data.json> [options]
#
#   --git <file>      collect-git-activity.sh output; omitted → those lines omitted
#   --people "A,B"    restrict to these people. Omit → everyone in the sprint.
#   --out <path>      write here. Omit → resolved from config. --stdout wins.
#   --stdout          print to stdout, write nothing
#   --jira-base <url> e.g. https://acme.atlassian.net. Default: $JIRA_INSTANCE
#   --print-path      print the resolved output path and exit
#
# Config (skills-config.yaml, all optional, CLI flag > config > default):
#   retrospective:
#     location: docs/development/sprints
#     filenamePattern: sprint.{n}.retrospective.md
#     indexFile: README.md
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)

DATA=${1:-}
GIT_FILE=""
PEOPLE=""
OUT=""
TO_STDOUT=0
JIRA_BASE=""
PRINT_PATH=0

if [ -z "$DATA" ] || [ "${DATA:0:2}" = "--" ]; then
  echo "Usage: $0 <data.json> [--git <file>] [--people \"A,B\"] [--out <path>] [--stdout]" >&2
  exit 1
fi
shift

while [ $# -gt 0 ]; do
  case "$1" in
    --git)        GIT_FILE=${2:-};   shift 2 ;;
    --people)     PEOPLE=${2:-};     shift 2 ;;
    --out)        OUT=${2:-};        shift 2 ;;
    --jira-base)  JIRA_BASE=${2:-};  shift 2 ;;
    --stdout)     TO_STDOUT=1;       shift ;;
    --print-path) PRINT_PATH=1;      shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

[ -f "$DATA" ] || { echo "Error: data file not found: $DATA" >&2; exit 1; }

# ---------------------------------------------------------------- config ----
# read_nested_config_key comes from the shared resolver (python+pyyaml, then
# awk, then empty). Sourcing it also sets PRD_ROOT/ARCH_ROOT, which is harmless.
# shellcheck source=/dev/null
source "$HERE/../references/resolve-paths.sh"

RETRO_LOCATION=$(read_nested_config_key retrospective location)
[ -z "$RETRO_LOCATION" ] && RETRO_LOCATION="docs/development/sprints"

RETRO_PATTERN=$(read_nested_config_key retrospective filenamePattern)
[ -z "$RETRO_PATTERN" ] && RETRO_PATTERN="sprint.{n}.retrospective.md"

[ -z "$JIRA_BASE" ] && [ -n "${JIRA_INSTANCE:-}" ] && JIRA_BASE="https://$JIRA_INSTANCE"
JIRA_BASE=${JIRA_BASE%/}

# ---------------------------------------------------------------- people ----
# Matching is exact (case-insensitive) on displayName / emailAddress /
# accountId, falling back to a substring match on displayName ONLY when it
# resolves to exactly one person. An ambiguous or unmatched name halts: silently
# rendering an empty retrospective is the failure mode worth designing against.
ROSTER=$(jq -c '.assignees' "$DATA")

if [ -n "$PEOPLE" ]; then
  MATCH=$(jq -c --arg people "$PEOPLE" '
    ($people | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(. != ""))) as $wanted
    | . as $roster
    | [ $wanted[] as $w
        | ($w | ascii_downcase) as $lw
        | ( [ $roster[] | select(
                ((.displayName // "") | ascii_downcase) == $lw
                or ((.emailAddress // "") | ascii_downcase) == $lw
                or ((.accountId // "") | ascii_downcase) == $lw) ] ) as $exact
        | ( if ($exact | length) > 0 then $exact
            else [ $roster[] | select(((.displayName // "") | ascii_downcase) | contains($lw)) ]
            end ) as $hits
        | {term: $w, hits: $hits, count: ($hits | length)} ]
  ' <<<"$ROSTER")

  BAD=$(jq -r '[.[] | select(.count != 1)] | length' <<<"$MATCH")
  if [ "$BAD" -ne 0 ]; then
    echo "HALT — could not resolve --people unambiguously." >&2
    jq -r '.[] | select(.count != 1)
           | if .count == 0 then "  no match: \(.term)"
             else "  ambiguous: \(.term) → \([.hits[].displayName] | join(", "))" end' <<<"$MATCH" >&2
    echo "" >&2
    echo "People assigned work in this sprint:" >&2
    jq -r '.[] | "  \(.displayName // "(no name)")\(if .emailAddress then "  <\(.emailAddress)>" else "" end)"' <<<"$ROSTER" >&2
    UNASSIGNED=$(jq -r '.unassignedCount' "$DATA")
    [ "$UNASSIGNED" -gt 0 ] && echo "  (plus $UNASSIGNED unassigned issue(s))" >&2
    exit 1
  fi

  SELECTED=$(jq -c '[.[].hits[]] | unique_by(.accountId)' <<<"$MATCH")
  SCOPE_LABEL=$(jq -r '[.[].displayName] | join(", ")' <<<"$SELECTED")
  SCOPE_MODE="people"
else
  SELECTED=$ROSTER
  SCOPE_LABEL="all"
  SCOPE_MODE="all"
fi

# ------------------------------------------------------------ output path ----
SPRINT_NAME=$(jq -r '.sprint.name // ""' "$DATA")
SPRINT_ID=$(jq -r '.sprint.id' "$DATA")
# Sprint number = trailing integer in the name ("Acme Sprint 12" → 12). Sprint
# names are free text, so fall back to the id rather than guessing.
SPRINT_NO=$(printf '%s' "$SPRINT_NAME" | sed -n 's/.*[^0-9]\([0-9][0-9]*\)[^0-9]*$/\1/p')
[ -z "$SPRINT_NO" ] && SPRINT_NO=$SPRINT_ID

FILENAME=${RETRO_PATTERN//\{n\}/$SPRINT_NO}
[ -z "$OUT" ] && OUT="$RETRO_LOCATION/$FILENAME"

if [ "$PRINT_PATH" -eq 1 ]; then
  printf '%s\n' "$OUT"
  exit 0
fi

GIT_JSON='null'
if [ -n "$GIT_FILE" ] && [ -f "$GIT_FILE" ]; then
  GIT_JSON=$(cat "$GIT_FILE")
fi

TODAY=$(date -u +%Y-%m-%d)

# ---------------------------------------------------------------- render ----
DOC=$(jq -r \
  --argjson selected "$SELECTED" \
  --argjson git "$GIT_JSON" \
  --arg scopeLabel "$SCOPE_LABEL" \
  --arg scopeMode "$SCOPE_MODE" \
  --arg jira "$JIRA_BASE" \
  --arg today "$TODAY" \
  --arg sprintNo "$SPRINT_NO" \
  -f "$HERE/render-retro.jq" \
  "$DATA")

if [ "$TO_STDOUT" -eq 1 ]; then
  printf '%s\n' "$DOC"
  exit 0
fi

mkdir -p "$(dirname "$OUT")"
printf '%s\n' "$DOC" > "$OUT"
echo "Wrote $OUT" >&2
printf '%s\n' "$OUT"
