#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/pr-read.sh. Regenerate via `npm run bundle`.
# pr-read.sh — source this file, then call `pr_read` to read a pull request's head and base on
# either forge.
#
# Usage:
#   source references/pr-read.sh || exit 1
#   pr_read [--pr <number>] [--remote <name>] [--branch <name>]
#
#   --pr      the PR to read. Without it: on GitHub, the PR `gh` finds for the current branch; on
#             Bitbucket, the ONE open PR whose source branch is --branch (default: the current
#             branch). None, or more than one, is a named failure, never a guess.
#   --remote  whose URL names the Bitbucket workspace and repository (default: origin).
#
# Outputs (set in the caller's shell; empty on failure):
#   PR_READ_VCS     github | bitbucket
#   PR_READ_NUMBER  the PR number
#   PR_READ_HEAD    the head commit. Bitbucket returns 12 characters in some responses — compare
#                   by PREFIX against `git rev-parse HEAD`, never by equality
#   PR_READ_BASE    the branch the PR merges into
#   PR_READ_ERROR   on failure, which read failed and why — print it, do not paraphrase it
#
# Return status:
#   0  read; every output above is set
#   1  the read failed; PR_READ_ERROR says which read and why
#   3  VCS is github and `gh` is not on PATH — the caller decides whether that is a skip
#
# WHY THIS EXISTS
#
# The develop-* Step 8 checklist read the PR through `gh` only. On a Bitbucket remote `gh` returns
# nothing, so a correct, fully pushed run reported "could not read PR #601 head" and halted on
# "no PR on this branch" — both false. The consumer confirmed the head by hand and dropped --pr to
# finish, which turns a mechanical check into a manual one and lets a stale PR head pass silently.
#
# READ THE HTTP STATUS, NOT THE BODY. Bitbucket answers an unauthenticated or wrongly scoped call
# to a private repository with 404, not 401 (see bitbucket-auth.sh), so an empty body looks like
# "no such PR". Every non-200 is a named failure carrying its status. Bodies are parsed with
# python3 `json.loads(strict=False)`: real PR descriptions carry raw control characters, and jq
# rejects them.

# Resolve this file's own directory at SOURCE time, where both forms are still correct: inside a
# function BASH_SOURCE is bash-only and zsh's %x names the caller. The siblings sit beside this
# file in both layouts, shared/resources/ in-tree and <skill>/references/ once bundled.
_pr_read_self="${BASH_SOURCE[0]:-}"
if [ -z "$_pr_read_self" ] && [ -n "${ZSH_VERSION:-}" ]; then
  eval '_pr_read_self="${(%):-%x}"'
fi
[ -n "$_pr_read_self" ] || _pr_read_self="$0"
# shellcheck disable=SC1007  # `CDPATH= cmd` is a one-command env prefix, not an empty assignment
_PR_READ_DIR=$(CDPATH= cd -P -- "$(dirname -- "$_pr_read_self")" >/dev/null 2>&1 && pwd -P)
unset _pr_read_self

# Overridable so tests never reach the network; nothing in a pipeline sets it.
PR_READ_BB_API="${PR_READ_BB_API:-https://api.bitbucket.org/2.0}"

# shellcheck disable=SC2034  # PR_READ_* are the output contract, set here and read by the sourcing caller (see header)
pr_read() {
  PR_READ_VCS="" PR_READ_NUMBER="" PR_READ_HEAD="" PR_READ_BASE="" PR_READ_ERROR=""
  local pr="" remote="origin" branch=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --pr)     pr="${2:-}"; shift 2 ;;
      --remote) remote="${2:-}"; shift 2 ;;
      --branch) branch="${2:-}"; shift 2 ;;
      *) PR_READ_ERROR="pr_read: unknown argument '$1'"; return 1 ;;
    esac
  done

  # shellcheck source=resolve-platform.sh
  if ! source "${_PR_READ_DIR}/resolve-platform.sh" >/dev/null 2>&1; then
    PR_READ_ERROR="could not resolve the platform (resolve-platform.sh missing beside pr-read.sh, or it rejected the config)"
    return 1
  fi
  PR_READ_VCS="$VCS"

  if [ "$VCS" != "bitbucket" ]; then
    command -v gh >/dev/null 2>&1 || { PR_READ_ERROR="gh not on PATH"; return 3; }
    local line
    # shellcheck disable=SC2086  # $pr is empty or one number; unquoted so empty means "this branch"
    line=$(gh pr view $pr --json number,headRefOid,baseRefName \
             --jq '"\(.number) \(.headRefOid) \(.baseRefName)"' 2>/dev/null)
    read -r PR_READ_NUMBER PR_READ_HEAD PR_READ_BASE <<<"$line"
    if [ -z "$PR_READ_HEAD" ] || [ -z "$PR_READ_BASE" ]; then
      PR_READ_NUMBER="" PR_READ_HEAD="" PR_READ_BASE=""
      PR_READ_ERROR="gh pr view ${pr:-(current branch)} returned no PR"
      return 1
    fi
    return 0
  fi

  # ── Bitbucket ──────────────────────────────────────────────────────────────
  # The configured URL, not `git remote get-url`: get-url expands insteadOf, which is a transport
  # detail. owner/repo = the last two path segments, the same expression review-pr uses, so an
  # altssh remote (ssh://git@altssh.bitbucket.org:443/ws/repo.git) reads as ws/repo.
  # Not `path`: in zsh that name is tied to PATH, and `local path` empties PATH for the function.
  local url bb_path ws repo
  url=$(git config --get "remote.${remote}.url" 2>/dev/null)
  bb_path=$(printf '%s\n' "$url" | sed -E 's#/+$##; s#\.git$##; s#^.*[:/]([^/:]+/[^/:]+)$#\1#')
  ws="${bb_path%%/*}" repo="${bb_path#*/}"
  if [ -z "$url" ] || [ -z "$ws" ] || [ -z "$repo" ] || [ "$ws" = "$bb_path" ]; then
    PR_READ_ERROR="could not derive the Bitbucket workspace/repository from remote '${remote}' (${url:-no URL})"
    return 1
  fi

  # shellcheck source=bitbucket-auth.sh
  if ! source "${_PR_READ_DIR}/bitbucket-auth.sh" 2>/dev/null; then
    PR_READ_ERROR="no Bitbucket credential (set BITBUCKET_ACCESS_TOKEN, or BITBUCKET_USERNAME + BITBUCKET_API_TOKEN)"
    return 1
  fi
  command -v python3 >/dev/null 2>&1 || { PR_READ_ERROR="python3 not on PATH — cannot parse the Bitbucket response"; return 1; }

  # Not `status`: zsh reserves it as a read-only alias of $?.
  local body http_status what
  body=$(mktemp) || { PR_READ_ERROR="mktemp failed"; return 1; }
  if [ -n "$pr" ]; then
    what="PR #${pr} on Bitbucket"
    http_status=$(curl -s -o "$body" -w '%{http_code}' "${BB_CURL_AUTH[@]}" \
      "${PR_READ_BB_API}/repositories/${ws}/${repo}/pullrequests/${pr}" 2>/dev/null)
  else
    # symbolic-ref, not `rev-parse --abbrev-ref`: on a detached HEAD that prints the literal
    # "HEAD", which would be queried as a branch name and answered "0 open PRs".
    [ -n "$branch" ] || branch=$(git symbolic-ref --short -q HEAD 2>/dev/null)
    if [ -z "$branch" ]; then
      rm -f "$body"
      PR_READ_ERROR="HEAD is detached — pass --pr or --branch to name the PR"
      return 1
    fi
    what="the open PR for branch '${branch}' on Bitbucket"
    http_status=$(curl -s -G -o "$body" -w '%{http_code}' "${BB_CURL_AUTH[@]}" \
      --data-urlencode "q=source.branch.name=\"${branch}\" AND state=\"OPEN\"" \
      "${PR_READ_BB_API}/repositories/${ws}/${repo}/pullrequests" 2>/dev/null)
  fi
  if [ "$http_status" != "200" ]; then
    rm -f "$body"
    PR_READ_ERROR="could not read ${what} (HTTP ${http_status:-000})"
    return 1
  fi

  local parsed
  parsed=$(python3 - "$body" <<'PY' 2>/dev/null
import json, sys
with open(sys.argv[1], encoding="utf-8", errors="replace") as f:
    d = json.loads(f.read(), strict=False)
if "values" in d:
    v = d["values"]
    if len(v) != 1:
        print("COUNT %d" % len(v)); sys.exit(0)
    d = v[0]
print("OK %s %s %s" % (d["id"], d["source"]["commit"]["hash"], d["destination"]["branch"]["name"]))
PY
)
  rm -f "$body"
  local tag
  read -r tag PR_READ_NUMBER PR_READ_HEAD PR_READ_BASE <<<"$parsed"
  case "$tag" in
    OK) [ -n "$PR_READ_BASE" ] && return 0 ;;
    COUNT)
      # COUNT's one field landed in PR_READ_NUMBER.
      PR_READ_ERROR="found ${PR_READ_NUMBER} open PRs for branch '${branch}' on Bitbucket — expected exactly one"
      PR_READ_NUMBER="" PR_READ_HEAD="" PR_READ_BASE=""
      return 1 ;;
  esac
  PR_READ_NUMBER="" PR_READ_HEAD="" PR_READ_BASE=""
  PR_READ_ERROR="could not parse ${what} (HTTP 200, unexpected body)"
  return 1
}
