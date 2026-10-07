#!/usr/bin/env bash
# resolve-head-rev.sh — the commit Step 6 checks finding anchors against: the PR head.
#
# Step 6 runs finding-anchors.js with `--rev`, and a rev that does not exist exits 2 `bad-rev`,
# which by rule stops the review. The PR head is easy on the git route (`origin/<head-branch>`) and
# on GitHub's API route (`pull/<n>/head`, kept forever). Bitbucket has no such ref: once a merged
# PR's source branch is deleted there was no route at all, so auditing a merged Bitbucket PR — a
# case the skill supports — stopped at Step 6.
#
# Usage:
#   resolve-head-rev.sh --vcs github|bitbucket --head-branch B --base-branch B
#                       [--pr N] [--source-hash H] [--merge-hash H] [--fork-url URL]
#
#   --pr           GitHub: the PR number, for `pull/<n>/head`
#   --source-hash  Bitbucket: `.source.commit.hash` from the Step 1b PR JSON (may be abbreviated)
#   --merge-hash   Bitbucket: `.merge_commit.hash`, set once the PR is merged
#   --fork-url     a cross-fork PR's source repository clone URL; skips `origin/<head-branch>`,
#                  which names a different branch (or nothing) in a fork's base repo
#
# Routes, first hit wins:
#   head-branch    origin/<head-branch> after fetching it              (same-repo, branch alive)
#   pull-ref       GitHub `pull/<n>/head`                               (merged, deleted or fork)
#   fork-branch    <head-branch> fetched from --fork-url                (Bitbucket cross-fork)
#   source-commit  Bitbucket source commit, local or after fetching the base
#                  (a merge-commit merge keeps it reachable from the base)
#   merge-commit   Bitbucket merge commit — a squash merge leaves the source commit unreachable.
#                  Its tree is the PR head's for every file only the PR touched; a file the base
#                  also changed may differ, and the checker then reports a mismatch, never a false ok
#
# Output: `rev=<full sha>` then `via=<route>` on stdout, exit 0.
# Exit 1: no route resolved; stderr names every route tried. Exit 2: usage.
#
# Must behave identically under bash and zsh: no arrays, no `[[ ]]`, every expansion quoted.

VCS="" HEAD_BRANCH="" BASE_BRANCH="" PR="" SOURCE_HASH="" MERGE_HASH="" FORK_URL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --vcs) VCS="${2:-}"; shift 2 ;;
    --head-branch) HEAD_BRANCH="${2:-}"; shift 2 ;;
    --base-branch) BASE_BRANCH="${2:-}"; shift 2 ;;
    --pr) PR="${2:-}"; shift 2 ;;
    --source-hash) SOURCE_HASH="${2:-}"; shift 2 ;;
    --merge-hash) MERGE_HASH="${2:-}"; shift 2 ;;
    --fork-url) FORK_URL="${2:-}"; shift 2 ;;
    *) echo "resolve-head-rev: refused (usage): unknown argument: $1" >&2; exit 2 ;;
  esac
done
case "$VCS" in
  github|bitbucket) ;;
  *) echo "resolve-head-rev: refused (usage): --vcs must be github or bitbucket" >&2; exit 2 ;;
esac

TRIED=""
found() { printf 'rev=%s\nvia=%s\n' "$1" "$2"; exit 0; }
commit_of() { git rev-parse --verify --quiet "${1}^{commit}" 2>/dev/null; }

# head-branch — same-repo PR whose source branch still exists.
if [ -n "$HEAD_BRANCH" ] && [ -z "$FORK_URL" ]; then
  TRIED="$TRIED head-branch"
  if git fetch -q origin "$HEAD_BRANCH" 2>/dev/null; then
    REV=$(commit_of "origin/$HEAD_BRANCH") && [ -n "$REV" ] && found "$REV" head-branch
  fi
fi

if [ "$VCS" = "github" ]; then
  if [ -n "$PR" ]; then
    TRIED="$TRIED pull-ref"
    if git fetch -q origin "pull/$PR/head" 2>/dev/null; then
      REV=$(commit_of FETCH_HEAD) && [ -n "$REV" ] && found "$REV" pull-ref
    fi
  fi
else
  if [ -n "$FORK_URL" ] && [ -n "$HEAD_BRANCH" ]; then
    TRIED="$TRIED fork-branch"
    if git fetch -q "$FORK_URL" "$HEAD_BRANCH" 2>/dev/null; then
      REV=$(commit_of FETCH_HEAD) && [ -n "$REV" ] && found "$REV" fork-branch
    fi
  fi
  if [ -n "$SOURCE_HASH" ]; then
    TRIED="$TRIED source-commit"
    REV=$(commit_of "$SOURCE_HASH") && [ -n "$REV" ] && found "$REV" source-commit
    if [ -n "$BASE_BRANCH" ] && git fetch -q origin "$BASE_BRANCH" 2>/dev/null; then
      REV=$(commit_of "$SOURCE_HASH") && [ -n "$REV" ] && found "$REV" source-commit
    fi
  fi
  if [ -n "$MERGE_HASH" ]; then
    TRIED="$TRIED merge-commit"
    REV=$(commit_of "$MERGE_HASH") && [ -n "$REV" ] && found "$REV" merge-commit
    if [ -n "$BASE_BRANCH" ] && git fetch -q origin "$BASE_BRANCH" 2>/dev/null; then
      REV=$(commit_of "$MERGE_HASH") && [ -n "$REV" ] && found "$REV" merge-commit
    fi
  fi
fi

echo "resolve-head-rev: no PR head commit available locally or from origin — tried:${TRIED:- nothing (no route had its inputs)}" >&2
exit 1
