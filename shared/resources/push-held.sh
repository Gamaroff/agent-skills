#!/usr/bin/env bash
# push-held.sh — push the commits a develop pipeline run was holding, at the two moments that need them
# out: a terminal HALT, after which a person reads the PR, and the entry to /finalise, which takes a CI
# reading on the PR head.
#
# The rule lived in five command blocks, and each was missing something another had: a push that could
# hang, a deleted branch pushed back into existence, a tracking ref that was not there read as "nothing
# held" (task.319, QA cycle 3). It is here once.
#
# Usage:
#   push-held.sh --site halt|finalise-entry
#
# One line on stdout, `<site>: <answer>`, and the reason with it where there is one:
#
#   nothing held   the remote branch has every commit (finalise-entry: and is at HEAD)
#   pushed         the held commits are on the remote
#   commit-staged  (finalise-entry) commits are held and a set is staged that they may link to: commit the
#                  staged set and nothing else, then run this again
#   kept local     (halt) the held commits were left, and why
#   not pushed     the remote or the lock could not be read, the remote branch has commits HEAD does not, or
#                  the push failed or ran out of time, and why
#
# Exit 0, except finalise-entry's `not pushed`, which exits 1: a reading there would be of another commit.
# A HALT goes on whatever happened here, so `halt` never exits 1 and never waits longer than its bounds.
# Exit 2 is a usage error.
#
# WHAT IS HELD is measured against the REMOTE, asked now, and never against the tracking ref: a
# single-branch clone has none, and a branch deleted when its PR merged still has one. A branch the remote
# does not have is never created here.
#
# The sibling it asks (spelled out so the bundler ships it): shared/resources/push-policy.sh
set -u

HERE="$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LOCK=.claude/state/develop-pipeline.lock

SITE=""
if [ $# -eq 2 ] && [ "$1" = --site ]; then SITE="$2"; fi
# The push's bound covers the consumer's own pre-push hook. A HALT's is short: its `--halt` runs in the
# same command block, and nothing may keep it from running.
case "$SITE" in
  halt) PUSH_SECONDS=50 ;;
  finalise-entry) PUSH_SECONDS=500 ;;
  *) echo "usage: push-held.sh --site halt|finalise-entry" >&2; exit 2 ;;
esac
ASK_SECONDS=${PUSH_HELD_SECONDS:-20}
PUSH_SECONDS=${PUSH_HELD_SECONDS:-$PUSH_SECONDS} # set by the tests, and by nothing in a pipeline
LOCAL_SECONDS=5 # for a question about this repository: in a partial clone, git asks the remote for an answer

OUT=""
GROUP="" # the bounded command's process group while it runs
WATCHER="" # and its watcher's
trap '[ -z "$GROUP" ] || kill -9 -- "-$GROUP" 2>/dev/null; [ -z "$WATCHER" ] || kill -9 -- "-$WATCHER" 2>/dev/null; [ -z "$OUT" ] || rm -f "$OUT"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

answer() { echo "$SITE: $1"; exit 0; }
refused() {
  echo "$SITE: not pushed — $1"
  [ "$SITE" = halt ]; exit
}

# Run a command for at most $1 seconds, with nothing to answer a prompt. 124 when it ran out of time. Its
# output goes to a file, so a process it leaves behind cannot hold the caller's pipe. It gets a process
# group of its own (`set -m`), and the group is what is stopped, when the time is up or this script is told
# to end: a pre-push hook left running runs beside the next push's (T319-CR-901). A second group holds a
# watcher, which stops the first when this script is gone without a word (SIGKILL, T319-CR-1101). A
# descendant that leaves the group (`setsid`, coreutils' `timeout`) is not stopped.
bounded() {
  local end=$((SECONDS + $1)) pid rc=""
  shift
  set -m
  GIT_TERMINAL_PROMPT=0 "$@" < /dev/null > "$OUT" 2>&1 &
  pid=$!
  GROUP=$pid
  (
    while kill -0 "$$" && [ "$SECONDS" -le $((end + 5)) ]; do
      case $(ps -o stat= -p "$$") in Z*) break ;; esac # ended, and nobody collected it
      sleep 1
    done
    kill -9 -- "-$pid"
    [ "$SECONDS" -gt $((end + 5)) ] || rm -f "$OUT" # the script is gone, and its EXIT trap did not run
  ) < /dev/null > /dev/null 2>&1 &
  WATCHER=$!
  set +m
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$SECONDS" -gt "$end" ]; then
      kill -- "-$pid" 2>/dev/null
      sleep 0.2
      kill -9 -- "-$pid" 2>/dev/null
      rc=124
      break
    fi
    sleep 0.2
  done
  wait "$pid" 2>/dev/null
  rc=${rc:-$?}
  GROUP=""
  kill -9 -- "-$WATCHER" 2>/dev/null
  wait "$WATCHER" 2>/dev/null
  WATCHER=""
  return "$rc"
}
why() { # exit status, the bound in seconds
  if [ "$1" -eq 124 ]; then echo "no answer in $2 s"; else echo "exit $1: $(grep -v '^hint:' "$OUT" | tail -1)"; fi
}
# The remote branch's commit, or nothing when it has no such branch, in REMOTE. False when it could not be
# asked, with the exit status in rc.
ask() {
  bounded "$ASK_SECONDS" git ls-remote origin "refs/heads/$BRANCH"
  rc=$?
  [ "$rc" -eq 0 ] || return 1
  REMOTE=$(awk 'NF == 2 && $2 == ref { print $1 }' ref="refs/heads/$BRANCH" "$OUT")
}
# A question about this repository alone. GIT_NO_LAZY_FETCH (git 2.45) keeps a partial clone from asking
# the remote for what it does not have; under an older git, the bound does.
local_git() { bounded "$LOCAL_SECONDS" env GIT_NO_LAZY_FETCH=1 git "$@"; }
in_history() { # false too when an object is not here
  local_git merge-base --is-ancestor "$1" "$2"
  case $? in
    0) return 0 ;;
    124) refused "the history could not be read (no answer in $LOCAL_SECONDS s)" ;;
    *) return 1 ;;
  esac
}

BRANCH=$(git symbolic-ref --short -q HEAD)
if [ "$SITE" = halt ]; then
  # A lock that cannot be read is not a lock with no PR: the PR may be open, and the HALT must say so.
  [ -e "$LOCK" ] || answer "kept local — there is no pipeline lock"
  RUN=$(jq -ers 'if length == 1 and (.[0] | type) == "object" then .[0] else error end
    | [.pr_url // "", .branch // ""] | @tsv' "$LOCK" 2>/dev/null) \
    || refused "the pipeline lock could not be read (no jq, or not JSON)"
  [ -n "${RUN%%$'\t'*}" ] || answer "kept local — no PR is recorded"
  [ -n "$BRANCH" ] && [ "${RUN#*$'\t'}" = "$BRANCH" ] \
    || answer "kept local — the checkout is not on the run's branch"
fi
[ -n "$BRANCH" ] || refused "HEAD is detached"

# Without a file the remote's answer is lost, and a branch that is there reads as deleted (T319-CR-904).
OUT=$(mktemp) || refused "no scratch file could be made"
ask || refused "origin could not be asked for $BRANCH ($(why "$rc" "$ASK_SECONDS"))"
if [ -z "$REMOTE" ]; then
  [ "$SITE" = halt ] && answer "kept local — origin has no $BRANCH (merged and deleted?)"
  refused "origin has no $BRANCH"
fi
HEAD_SHA=$(git rev-parse HEAD)
[ "$REMOTE" != "$HEAD_SHA" ] || answer "nothing held"
if ! in_history "$REMOTE" HEAD; then
  # The remote has commits this branch does not. Whether this branch has any of its own is asked with the
  # remote's commit here, so that the answer is the same before and after somebody's fetch (T319-CR-905).
  if ! local_git cat-file -e "$REMOTE^{commit}"; then
    bounded "$ASK_SECONDS" git fetch --quiet --no-tags origin "refs/heads/$BRANCH"
    rc=$?
    [ "$rc" -eq 0 ] || refused "origin's $BRANCH has another commit, which could not be fetched ($(why "$rc" "$ASK_SECONDS"))"
  fi
  if in_history HEAD "$REMOTE"; then
    [ "$SITE" = halt ] && answer "nothing held — origin's $BRANCH is ahead of this checkout"
    refused "origin's $BRANCH is ahead of this checkout: the PR head is not HEAD"
  fi
  refused "origin's $BRANCH has commits this checkout does not, and the held commits would be rejected"
fi

local_git diff --cached --quiet
case $? in
  0) ;;
  1)
    [ "$SITE" = finalise-entry ] && answer "commit-staged"
    answer "kept local — something is staged that the held commits may link to"
    ;;
  *) refused "what is staged could not be read" ;;
esac
if [ "$SITE" = halt ] && [ "$(cat .claude/state/finalise-ci-head-2.txt 2>/dev/null)" = "$REMOTE" ] \
  && kill -0 "$(cat .claude/state/finalise-ci-poll.pid 2>/dev/null)" 2>/dev/null; then
  answer "kept local — CI is being read on the acceptance head, which is the PR head"
fi

# No answer, for whatever reason, is a push: every site holds on `defer` and on nothing else.
case "$SITE" in
  halt) bounded "$LOCAL_SECONDS" bash "$HERE/push-policy.sh" --site halt ;;
  finalise-entry) bounded "$LOCAL_SECONDS" bash "$HERE/push-policy.sh" --site finalise-entry ;;
esac
! grep -qx defer "$OUT" || refused "push-policy.sh deferred it"
bounded "$PUSH_SECONDS" git push origin HEAD
rc=$?
[ "$rc" -ne 0 ] || answer "pushed"
WHY=$(why "$rc" "$PUSH_SECONDS")
# A push that was stopped can have reached the server, and the server can still be at it (T319-CR-906).
if [ "$rc" -eq 124 ]; then
  if ask; then
    [ "$REMOTE" != "$HEAD_SHA" ] || answer "pushed"
    refused "the push failed ($WHY; origin did not have it when asked again, and may still take it)"
  fi
  refused "the push may have failed ($WHY; origin could not be asked again)"
fi
refused "the push failed ($WHY)"
