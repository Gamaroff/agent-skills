#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/resolve-pr-number.sh. Regenerate via `npm run bundle`.
# resolve-pr-number.sh — the pull request a work item is being judged against.
#
# usage: resolve-pr-number.sh --doc <work-item.md> [--pr <N>] [--json]
#
#   exit 0  prints N — or, with --json, {"pr":N,"source":"<rung>"}
#   exit 1  no authoritative source names a PR. Prints NO number: nothing on stdout, or with
#           --json {"pr":null,"source":"none","reason":"none"}. One line per rung that did not
#           answer goes to stderr.
#   exit 2  usage: --doc missing or not a file, --pr not a positive integer, an unknown flag
#
# Rungs, first answer wins (task 175):
#
#   explicit     --pr N, from a caller that already knows its PR
#   branch       the PR whose head is the current branch — `pr_read` from pr-read.sh with no
#                --pr, so the forge queries live in one place (GitHub: the PR `gh` finds for the
#                branch; Bitbucket: the ONE open PR from the branch)
#   lock         .claude/state/develop-pipeline.lock's `pr_url`, written at develop Step 4 — only
#                when the lock's `task_or_story_directory`, canonicalised, IS the --doc directory,
#                canonicalised. Another work item's lock never answers for this one
#   frontmatter  `pr_number:` inside the document's leading `---` block
#   body         the FIRST `PR #N` / `pull/N` in the document — only when PR N's head branch is
#                the current branch (`pr_read --pr N`, PR_READ_HEAD_BRANCH). An unconfirmed
#                citation is refused, never used
#
# WHY THIS EXISTS
#
# finalise Step 3a read `pr_number:` and, when that was absent, the first `PR #N` anywhere in the
# body. Inside a pipeline the frontmatter never has `pr_number:` yet (finalise writes it at 7.2),
# so the body rule always ran, and a task document cites other work's PRs: task.146 resolved #472,
# task.147 #207, task.166 #505 — none of them their own (observation #184). The sources that know
# the PR — the branch and the lock — come first; the sources that may only mention one come last,
# and the body is never trusted without confirmation.
#
# Run it as `bash …/resolve-pr-number.sh`, whatever the caller's shell. Siblings (pr-read.sh, and
# through it resolve-platform.sh and bitbucket-auth.sh) are sourced from this script's own
# directory: shared/resources/ in-tree, <skill>/references/ once bundled.

set -u

SELF_DIR=$(CDPATH='' cd -P -- "$(dirname -- "$0")" >/dev/null 2>&1 && pwd -P)

usage() {
  echo "usage: resolve-pr-number.sh --doc <work-item.md> [--pr <N>] [--json]" >&2
  [ -n "${1:-}" ] && echo "resolve-pr-number: $1" >&2
  exit 2
}

DOC="" PR_ARG="" JSON=0 PR_GIVEN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --doc)  [ $# -ge 2 ] || usage "--doc needs a path"; DOC="$2"; shift 2 ;;
    --pr)   [ $# -ge 2 ] || usage "--pr needs a number"; PR_ARG="$2"; PR_GIVEN=1; shift 2 ;;
    --json) JSON=1; shift ;;
    *)      usage "unknown argument '$1'" ;;
  esac
done
[ -n "$DOC" ] || usage "--doc is required"
[ -f "$DOC" ] || usage "--doc '$DOC' is not a file"
if [ "$PR_GIVEN" = 1 ]; then
  printf '%s' "$PR_ARG" | grep -qE '^[1-9][0-9]*$' || usage "--pr '$PR_ARG' is not a positive integer"
fi

answer() {   # $1 = number, $2 = source
  if [ "$JSON" = 1 ]; then printf '{"pr":%s,"source":"%s"}\n' "$1" "$2"; else printf '%s\n' "$1"; fi
  exit 0
}
miss() { echo "resolve-pr-number: $1" >&2; }

# A directory, canonicalised the way advance-pipeline-lock.sh --restore compares lock directories:
# strip a leading ./ and trailing slashes, then resolve symlinks. An unresolvable directory prints
# nothing, which never equals a resolved one.
canon_dir() {
  local d="$1"
  d="${d#./}"
  while [ "${d%/}" != "$d" ] && [ "$d" != "/" ]; do d="${d%/}"; done
  [ -n "$d" ] || d="."
  (CDPATH='' cd -P -- "$d" >/dev/null 2>&1 && pwd -P)
}

# ── 1. explicit ─────────────────────────────────────────────────────────────────────────────────
[ "$PR_GIVEN" = 1 ] && answer "$PR_ARG" explicit

# ── 2. branch ───────────────────────────────────────────────────────────────────────────────────
PR_READ_LOADED=0
# shellcheck source=pr-read.sh
if source "$SELF_DIR/pr-read.sh" 2>/dev/null; then
  PR_READ_LOADED=1
  if pr_read && [ -n "$PR_READ_NUMBER" ]; then
    answer "$PR_READ_NUMBER" branch
  fi
  miss "branch: ${PR_READ_ERROR:-no PR for the current branch}"
else
  miss "branch: pr-read.sh not found beside resolve-pr-number.sh (re-run the bundler)"
fi

# ── 3. lock ─────────────────────────────────────────────────────────────────────────────────────
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || ROOT=""
LOCK="${ROOT:-.}/.claude/state/develop-pipeline.lock"
if [ ! -f "$LOCK" ]; then
  miss "lock: no pipeline lock"
elif ! command -v jq >/dev/null 2>&1; then
  miss "lock: jq not on PATH — lock not read"
else
  LOCK_DIR=$(jq -r '.task_or_story_directory // empty' "$LOCK" 2>/dev/null)
  LOCK_URL=$(jq -r '.pr_url // empty' "$LOCK" 2>/dev/null)
  LOCK_N=$(printf '%s' "$LOCK_URL" | sed -nE 's#.*/([1-9][0-9]*)/?$#\1#p')
  DOC_CANON=$(canon_dir "$(dirname -- "$DOC")")
  # The lock's directory is relative to the repository root; resolve it from there.
  LOCK_CANON=""
  if [ -n "$LOCK_DIR" ]; then
    case "$LOCK_DIR" in
      /*) LOCK_CANON=$(canon_dir "$LOCK_DIR") ;;
      *)  LOCK_CANON=$(cd "${ROOT:-.}" 2>/dev/null && canon_dir "$LOCK_DIR") ;;
    esac
  fi
  if [ -z "$LOCK_N" ]; then
    miss "lock: no pr_url with a PR number in the lock"
  elif [ -z "$LOCK_CANON" ] || [ -z "$DOC_CANON" ] || [ "$LOCK_CANON" != "$DOC_CANON" ]; then
    miss "lock: the lock is for '${LOCK_DIR:-no directory}', not this document's directory"
  else
    answer "$LOCK_N" lock
  fi
fi

# ── 4. frontmatter ──────────────────────────────────────────────────────────────────────────────
# Only inside the leading `---` block: a `pr_number:` line quoted in the body is not frontmatter.
FM_N=$(awk 'NR == 1 && $0 != "---" { exit } NR > 1 && $0 == "---" { exit } NR > 1 { print }' "$DOC" \
  | sed -nE "s/^pr_number:[[:space:]]*['\"]?([1-9][0-9]*)['\"]?[[:space:]]*$/\1/p" | head -1)
[ -n "$FM_N" ] && answer "$FM_N" frontmatter
miss "frontmatter: no pr_number:"

# ── 5. body, confirmed ──────────────────────────────────────────────────────────────────────────
BODY_N=$(grep -oE 'PR #[0-9]+|pull/[0-9]+' "$DOC" | head -1 | grep -oE '[0-9]+')
if [ -z "$BODY_N" ]; then
  miss "body: no PR cited"
else
  CUR=$(git symbolic-ref --short -q HEAD 2>/dev/null)
  if [ -z "$CUR" ]; then
    miss "body: PR #$BODY_N cited, but HEAD is detached — cannot confirm it"
  elif [ "$PR_READ_LOADED" != 1 ]; then
    miss "body: PR #$BODY_N cited, but pr-read.sh is missing — cannot confirm it"
  elif pr_read --pr "$BODY_N" && [ -n "$PR_READ_HEAD_BRANCH" ] && [ "$PR_READ_HEAD_BRANCH" = "$CUR" ]; then
    answer "$BODY_N" body
  else
    miss "body: PR #$BODY_N cited, but its head branch is '${PR_READ_HEAD_BRANCH:-unknown}', not '$CUR' — refused"
  fi
fi

if [ "$JSON" = 1 ]; then printf '{"pr":null,"source":"none","reason":"none"}\n'; fi
exit 1
