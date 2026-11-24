#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/push-held.sh. Regenerate via `npm run bundle`.
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
#   nothing held   the remote branch has every commit
#   pushed         the held commits are on the remote
#   commit-staged  (finalise-entry) commits are held and a set is staged that they may link to: commit the
#                  staged set and nothing else, then run this again
#   kept local     (halt) the held commits were left, and why
#   not pushed     the remote could not be read, or the push failed or ran out of time, and why
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
  halt) PUSH_SECONDS=60 ;;
  finalise-entry) PUSH_SECONDS=540 ;;
  *) echo "usage: push-held.sh --site halt|finalise-entry" >&2; exit 2 ;;
esac
ASK_SECONDS=${PUSH_HELD_SECONDS:-20}
PUSH_SECONDS=${PUSH_HELD_SECONDS:-$PUSH_SECONDS} # set by the tests, and by nothing in a pipeline

OUT=$(mktemp) || OUT=/dev/null
trap '[ "$OUT" = /dev/null ] || rm -f "$OUT"' EXIT

answer() { echo "$SITE: $1"; exit 0; }
refused() {
  echo "$SITE: not pushed — $1"
  [ "$SITE" = halt ]; exit
}

# Run a command for at most $1 seconds, with nothing to answer a prompt. 124 when it ran out of time. Its
# output goes to a file, so a process it leaves behind cannot hold the caller's pipe.
bounded() {
  local ticks=$(($1 * 5)) pid
  shift
  GIT_TERMINAL_PROMPT=0 "$@" < /dev/null > "$OUT" 2>&1 &
  pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$ticks" -le 0 ]; then
      kill "$pid" 2>/dev/null
      sleep 0.2
      kill -9 "$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
      return 124
    fi
    ticks=$((ticks - 1))
    sleep 0.2
  done
  wait "$pid"
}
why() { # exit status, the bound in seconds
  if [ "$1" -eq 124 ]; then echo "no answer in $2 s"; else echo "exit $1: $(tail -1 "$OUT" 2>/dev/null)"; fi
}

BRANCH=$(git symbolic-ref --short -q HEAD)
if [ "$SITE" = halt ]; then
  [ -n "$(jq -r '.pr_url // empty' "$LOCK" 2>/dev/null)" ] || answer "kept local — no PR is recorded"
  [ -n "$BRANCH" ] && [ "$(jq -r .branch "$LOCK" 2>/dev/null)" = "$BRANCH" ] \
    || answer "kept local — the checkout is not on the run's branch"
fi
[ -n "$BRANCH" ] || refused "HEAD is detached"

bounded "$ASK_SECONDS" git ls-remote origin "refs/heads/$BRANCH"
rc=$?
[ "$rc" -eq 0 ] || refused "origin could not be asked for $BRANCH ($(why "$rc" "$ASK_SECONDS"))"
REMOTE=$(awk 'NF == 2 && $2 == ref { print $1 }' ref="refs/heads/$BRANCH" "$OUT")
if [ -z "$REMOTE" ]; then
  [ "$SITE" = halt ] && answer "kept local — origin has no $BRANCH (merged and deleted?)"
  refused "origin has no $BRANCH"
fi
git merge-base --is-ancestor HEAD "$REMOTE" 2>/dev/null && answer "nothing held"

if ! git diff --cached --quiet; then
  [ "$SITE" = finalise-entry ] && answer "commit-staged"
  answer "kept local — something is staged that the held commits may link to"
fi
if [ "$SITE" = halt ] && [ "$(cat .claude/state/finalise-ci-head-2.txt 2>/dev/null)" = "$REMOTE" ] \
  && kill -0 "$(cat .claude/state/finalise-ci-poll.pid 2>/dev/null)" 2>/dev/null; then
  answer "kept local — CI is being read on the acceptance head, which is the PR head"
fi

case "$SITE" in
  halt) [ "$(bash "$HERE/push-policy.sh" --site halt 2>/dev/null)" != defer ] ;;
  finalise-entry) [ "$(bash "$HERE/push-policy.sh" --site finalise-entry 2>/dev/null)" != defer ] ;;
esac || refused "push-policy.sh deferred it"
bounded "$PUSH_SECONDS" git push origin HEAD
rc=$?
[ "$rc" -eq 0 ] || refused "the push failed ($(why "$rc" "$PUSH_SECONDS"))"
answer "pushed"
