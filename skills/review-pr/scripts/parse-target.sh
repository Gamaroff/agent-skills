#!/usr/bin/env bash
# parse-target.sh — turn /review-pr's `target` argument into key=value lines.
#
# Pure and offline: no network, no git, no environment reads. It decides WHAT the
# user gave us; SKILL.md Step 1 decides WHICH PR that means.
#
# Usage:  parse-target.sh "<target>"
# Output: key=value lines on stdout, exit 0. `kind` is always first:
#   kind=pr-for-current-branch                      (empty target)
#   kind=pr            pr=N            [host=H]     (bare number, or a PR URL)
#   kind=jira          jira_key=KEY    [host=H]     (bare key, /browse/, board ?selectedIssue=, Cloud /issues/KEY)
#   kind=github-issue  issue_num=N     [host=H repo=O/R]   (#N, or a /issues/N URL)
#   kind=branch        branch=B                     (anything else that is not a URL)
# Refusal: exit 2, `parse-target: refused (<reason>): <detail>` on stderr, nothing on stdout.
#   reasons: url-no-target | bad-issue-ref | usage
#
# Rules:
# - HOST FIRST. A URL's host picks the platform before any path arm is tried: Jira
#   Cloud's issue view `…/projects/RAPP/issues/RAPP-702` contains `/issues/` and must
#   never reach the GitHub-issue arm.
# - Anchored extraction. The key or number is the whole path segment after its
#   marker, and `?query` / `#fragment` are stripped first — `…/pull/12/files` is PR 12.
# - `host` is reported, never judged. The skill compares it per kind.
# - No issue-type judgement: an epic key looks like any other key. Only malformed
#   input is refused — a URL never falls through to the branch arm.
#
# Must behave identically under bash and zsh: every expansion is quoted, no arrays,
# no variable-held glob patterns, no `[[ ]]`.

KEY_RE='^[A-Z][A-Z0-9]+-[0-9]+$'

refuse() {
  printf 'parse-target: refused (%s): %s\n' "$1" "$2" >&2
  exit 2
}

is_num() {
  case "$1" in
    '' | *[!0-9]*) return 1 ;;
    *) return 0 ;;
  esac
}

is_key() {
  printf '%s\n' "$1" | grep -Eq "$KEY_RE"
}

# The path segment immediately after `/<marker>/`, or empty when the marker is absent.
seg_after() {
  _rest="${2#*/"$1"/}"
  [ "$_rest" = "$2" ] && return 0
  printf '%s' "${_rest%%/*}"
}

# The two segments before `/<marker>/` — `owner/repo` for a GitHub path.
repo_before() {
  _head="${2%%/"$1"/*}"
  [ "$_head" = "$2" ] && return 0
  _repo="${_head#/}"
  case "$_repo" in
    */*/*) _repo="${_repo#"${_repo%/*/*}"/}" ;;
  esac
  printf '%s' "$_repo"
}

# The value of `selectedIssue=` in a query string, or empty.
selected_issue() {
  _q="$1"
  while [ -n "$_q" ]; do
    _pair="${_q%%&*}"
    case "$_pair" in
      selectedIssue=*) printf '%s' "${_pair#selectedIssue=}"; return 0 ;;
    esac
    case "$_q" in
      *'&'*) _q="${_q#*&}" ;;
      *) _q="" ;;
    esac
  done
}

emit_pr_from_path() {
  for _m in pull pull-requests pullrequests; do
    _n=$(seg_after "$_m" "$1")
    if is_num "$_n"; then
      printf 'kind=pr\npr=%s\nhost=%s\n' "$_n" "$HOST"
      return 0
    fi
  done
  return 1
}

emit_jira_from_url() {
  _k=$(selected_issue "$QUERY")
  is_key "$_k" || _k=$(seg_after browse "$1")
  is_key "$_k" || _k=$(seg_after issues "$1")
  if is_key "$_k"; then
    printf 'kind=jira\njira_key=%s\nhost=%s\n' "$_k" "$HOST"
    return 0
  fi
  return 1
}

emit_issue_from_path() {
  _n=$(seg_after issues "$1")
  if is_num "$_n"; then
    printf 'kind=github-issue\nissue_num=%s\nhost=%s\n' "$_n" "$HOST"
    _r=$(repo_before issues "$1")
    [ -n "$_r" ] && printf 'repo=%s\n' "$_r"
    return 0
  fi
  return 1
}

[ "$#" -le 1 ] || refuse usage "expected one argument, got $#"

TARGET="${1:-}"

case "$TARGET" in
  '')
    printf 'kind=pr-for-current-branch\n'
    exit 0
    ;;
  *://*)
    REST="${TARGET#*://}"
    HOSTPORT="${REST%%/*}"
    HOSTPORT="${HOSTPORT%%\?*}"
    HOSTPORT="${HOSTPORT%%\#*}"
    HOSTPORT="${HOSTPORT##*@}"
    HOST=$(printf '%s' "${HOSTPORT%%:*}" | tr '[:upper:]' '[:lower:]')
    case "$REST" in
      */*) URLPATH="/${REST#*/}" ;;
      *) URLPATH="" ;;
    esac
    QUERY=""
    case "$REST" in
      *\?*) QUERY="${REST#*\?}"; QUERY="${QUERY%%\#*}" ;;
    esac
    URLPATH="${URLPATH%%\?*}"
    URLPATH="${URLPATH%%\#*}"

    case "$HOST" in
      github.com | www.github.com)
        emit_pr_from_path "$URLPATH" && exit 0
        emit_issue_from_path "$URLPATH" && exit 0
        ;;
      bitbucket.org | www.bitbucket.org | api.bitbucket.org)
        emit_pr_from_path "$URLPATH" && exit 0
        ;;
      *.atlassian.net)
        emit_jira_from_url "$URLPATH" && exit 0
        ;;
      *)
        # Self-hosted GitHub Enterprise, Bitbucket Server or Jira: decide by shape.
        # A Jira key and a GitHub issue number cannot be confused — the anchored
        # patterns are disjoint.
        emit_pr_from_path "$URLPATH" && exit 0
        emit_jira_from_url "$URLPATH" && exit 0
        emit_issue_from_path "$URLPATH" && exit 0
        ;;
    esac
    refuse url-no-target "no PR number, Jira key or issue number in $TARGET"
    ;;
  '#'*)
    N="${TARGET#\#}"
    is_num "$N" || refuse bad-issue-ref "'$TARGET' is not #<issue-number>"
    printf 'kind=github-issue\nissue_num=%s\n' "$N"
    exit 0
    ;;
esac

if is_num "$TARGET"; then
  printf 'kind=pr\npr=%s\n' "$TARGET"
elif is_key "$TARGET"; then
  printf 'kind=jira\njira_key=%s\n' "$TARGET"
else
  printf 'kind=branch\nbranch=%s\n' "$TARGET"
fi
