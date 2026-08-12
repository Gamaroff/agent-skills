#!/bin/bash
# Collect commit-level delivery signal for a sprint window.
#
# Deliberately pure `git log` — no platform API — so it behaves identically on
# GitHub, Bitbucket, GitLab or a bare remote. Merged-PR counts are NOT collected
# here; they need a platform API and are handled as a best-effort enrichment in
# SKILL.md, so that a repo whose VCS API is unreachable still gets a document.
#
# Usage:
#   collect-git-activity.sh <since> <until> [--author-email a@b,c@d] [--ref <ref>]
#
#   <since>/<until>   anything `git log --since/--until` accepts; ISO-8601 from
#                     the sprint's startDate/endDate is the intended input
#   --author-email    restrict to these authors. Omit for repository-wide.
#   --ref             ref to walk. Default --all: a retrospective must see work
#                     on integration branches that never reached the trunk.
#
# Emits JSON on stdout. Exits 0 even when git is unusable — the caller renders
# the document without these figures rather than failing. `available: false`
# with a `reason` says why, so the omission is explainable rather than silent.
set -euo pipefail

SINCE=${1:-}
UNTIL=${2:-}
shift 2 2>/dev/null || true

AUTHOR_EMAILS=""
REF="--all"

while [ $# -gt 0 ]; do
  case "$1" in
    --author-email) AUTHOR_EMAILS=${2:-}; shift 2 ;;
    --ref)          REF=${2:---all};     shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [ -z "$SINCE" ] || [ -z "$UNTIL" ]; then
  echo "Usage: $0 <since> <until> [--author-email a@b,c@d] [--ref <ref>]" >&2
  exit 1
fi

emit_unavailable() {
  jq -nc --arg reason "$1" '{available: false, reason: $reason}'
  exit 0
}

command -v git >/dev/null 2>&1 || emit_unavailable "git is not installed"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || emit_unavailable "not inside a git work tree"

# Subjects that read as correcting the record rather than adding to it. This is
# a HEURISTIC over commit subjects, not a classification anyone audited — the
# renderer must present it as approximate, and the pattern is printed into the
# document's measurement section so a reader can re-run and disagree with it.
CORRECTION_RE='qa-fix|qa cycle|review [0-9]|correct|stale|reconcile|fix the|drift'

collect() {
  # $1 = optional author email; empty means repository-wide.
  local author=$1
  local args=(log "$REF" --no-merges --since="$SINCE" --until="$UNTIL" --pretty=format:%s)
  [ -n "$author" ] && args+=(--author="$author")
  git "${args[@]}" 2>/dev/null || true
}

subjects_all=$(collect "")
total_all=$(printf '%s' "$subjects_all" | grep -c . || true)
corr_all=$(printf '%s' "$subjects_all" | grep -icE "$CORRECTION_RE" || true)

PER_AUTHOR='[]'
SCOPE="repository-wide"

if [ -n "$AUTHOR_EMAILS" ]; then
  SCOPE="per-author"
  IFS=',' read -ra _emails <<<"$AUTHOR_EMAILS"
  for _e in "${_emails[@]}"; do
    _e=$(printf '%s' "$_e" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    [ -z "$_e" ] && continue
    _subjects=$(collect "$_e")
    _total=$(printf '%s' "$_subjects" | grep -c . || true)
    _corr=$(printf '%s' "$_subjects" | grep -icE "$CORRECTION_RE" || true)
    PER_AUTHOR=$(jq -nc \
      --argjson acc "$PER_AUTHOR" \
      --arg email "$_e" \
      --argjson total "${_total:-0}" \
      --argjson corr "${_corr:-0}" \
      '$acc + [{email: $email, commits: $total, correctionCommits: $corr}]')
  done
fi

jq -nc \
  --arg since "$SINCE" \
  --arg until "$UNTIL" \
  --arg ref "$REF" \
  --arg scope "$SCOPE" \
  --arg pattern "$CORRECTION_RE" \
  --argjson total "${total_all:-0}" \
  --argjson corr "${corr_all:-0}" \
  --argjson perAuthor "$PER_AUTHOR" '
  {
    available: true,
    window: {since: $since, until: $until, ref: $ref},
    scope: $scope,
    correctionPattern: $pattern,
    repository: {
      commits: $total,
      correctionCommits: $corr,
      correctionShare: (if $total > 0 then (($corr / $total) * 100 | round) else 0 end)
    },
    perAuthor: $perAuthor
  }'
