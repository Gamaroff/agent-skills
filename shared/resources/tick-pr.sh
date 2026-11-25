#!/usr/bin/env bash
# tick-pr.sh — record a develop-next / develop-batch tick through a pull request.
#
# `developNext.tickVia: pr` is for a project whose base branch refuses direct pushes. The tick commit
# goes on its own documentation branch, gets a PR, and is merged only when the merge gate is green. The
# default, `push`, never runs this script.
#
# Usage, in order, from the checkout (GitHub and Bitbucket):
#   tick-pr.sh start --base <branch> --branch <tick-branch>
#       Checks out the tick branch, off origin/<base>. Prints `new` (edit the row and commit it),
#       `resume` (an earlier run committed it: go straight to `open`) or `landed` (an earlier run's tick
#       is already on <base>: the checkout is on <base>, and there is nothing left to do).
#   tick-pr.sh open  --base <branch> --branch <tick-branch> --title <text>
#       Pushes the tick branch and prints the number of its open PR, opened now if there is none.
#   tick-pr.sh merge --base <branch> --branch <tick-branch> --pr <n> --quality-gate <command>
#                    [--strategy merge|squash|rebase] [--max-wait <seconds>] [--checks <floor>]
#       Runs the quality gate on the tick branch, waits for the PR's CI on the tick head, merges, and
#       leaves the checkout on the updated <base>. Prints `merged`.
#       RUN IT IN THE BACKGROUND: the gate is a suite, and CI can take --max-wait seconds (default 1500).
#   tick-pr.sh finish --base <branch> --branch <tick-branch>
#       After `new`, when the row already says what the tick would write and there is nothing to commit:
#       returns the checkout to <base>. Prints `already-recorded`. Refuses a tick branch with a commit or
#       an uncommitted edit.
#
# THE MERGE GATE, the same four conditions as develop-next Step 3, none of them a caller's judgement:
#   1. the project's quality gate, run here, passes on the tick branch's head (--quality-gate; absent
#      refuses);
#   2. the PR's head is the tick branch's head, and its destination is <base>;
#   3. CI on that head is SUCCESS (a docs-only tail counts, by ci-tree-equivalence.js), or the head has no
#      checks at all after the whole wait and --checks is 0 (a project without PR CI: condition 1 is its
#      gate);
#   4. the merge is judged by the PR's state afterwards, never by the merge command's exit status.
#
# Exit 0 on success; 1 when a step was refused or failed, with one `HALT:` line; 2 for a usage error.
#
# Siblings it runs (spelled out so the bundler ships them):
#   shared/resources/push-policy.sh, shared/resources/pr-read.sh, shared/resources/finalise-ci-poll.sh,
#   shared/resources/ci-tree-equivalence.js, shared/resources/resolve-platform.sh,
#   shared/resources/bitbucket-auth.sh
set -u

HERE="$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

usage() { echo "tick-pr: $1" >&2; echo "usage: tick-pr.sh start|open|merge|finish --base <branch> --branch <tick-branch> [...]" >&2; exit 2; }
halt() { echo "HALT: tick-pr: $1" >&2; exit 1; }

CMD="${1:-}"; [ $# -gt 0 ] && shift
BASE="" TICK_BRANCH="" TITLE="" PR="" GATE="" STRATEGY=merge MAX_WAIT=1500 FLOOR=0
while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || usage "$1 needs a value"
  case "$1" in
    --base) BASE="$2" ;;
    --branch) TICK_BRANCH="$2" ;;
    --title) TITLE="$2" ;;
    --pr) PR="$2" ;;
    --quality-gate) GATE="$2" ;;
    --strategy) STRATEGY="$2" ;;
    --max-wait) MAX_WAIT="$2" ;;
    --checks) FLOOR="$2" ;;
    *) usage "unknown argument '$1'" ;;
  esac
  shift 2
done
[ -n "$BASE" ] || usage "--base is required"
[ -n "$TICK_BRANCH" ] || usage "--branch is required"
[ "$BASE" != "$TICK_BRANCH" ] || usage "--branch must not be the base branch"

# shellcheck source=/dev/null
. "$HERE/pr-read.sh" || halt "pr-read.sh is missing beside tick-pr.sh"

# Sets PR_READ_* for the tick branch's open PR; returns 1 when there is none or it cannot be read.
# `pr_read` takes a branch on Bitbucket only, so on GitHub the number is looked up first.
find_pr() {
  # shellcheck source=/dev/null
  . "$HERE/resolve-platform.sh" >/dev/null 2>&1 || halt "the platform could not be resolved"
  if [ "$VCS" = bitbucket ]; then
    pr_read --branch "$TICK_BRANCH"
    return
  fi
  local n
  n=$(gh pr list --head "$TICK_BRANCH" --base "$BASE" --state open --json number -q '.[0].number // empty') || halt "gh pr list failed"
  [ -n "$n" ] || return 1
  pr_read --pr "$n"
}

# Leave the checkout on the updated <base> and drop the tick branch. The tick is on the base branch by
# now, so nothing here may turn the answer into a failure: the run would keep `ticked: false` and record
# the tick again.
tidy() {
  if ! { git checkout --quiet "$BASE" && git pull --quiet --ff-only origin "$BASE"; }; then
    echo "tick-pr: WARNING: the checkout could not be moved to the updated $BASE" >&2
    return 0
  fi
  if git rev-parse --verify --quiet "refs/heads/$TICK_BRANCH" >/dev/null; then
    git branch --quiet -D "$TICK_BRANCH" || echo "tick-pr: WARNING: the local branch $TICK_BRANCH was not deleted" >&2
  fi
}

# True when merging $1 into origin/<base> would change nothing: its content is already there. A squash or
# rebase merge leaves the branch's own commits off the base, so ancestry cannot say it.
#
# A LIMIT (T319-CR-1301): a tick whose conflict was resolved on the forge, and whose PR was then squashed
# and its branch deleted there, is on the base in the forge's words and in nothing this can compare with.
# `start` answers `resume` for it, and nothing is deleted. Close the PR that `open` then makes, and delete
# the tick branch here and on the remote.
landed() {
  local base="refs/remotes/origin/$BASE" from at
  holds "$base" "$1"
  case $? in
    0) return 0 ;;
    # A conflict, which a landed tick gives too once the base changed a row beside its own (T319-CR-902).
    # Then it is asked of the base as it was at each commit since the branch was cut: the one that landed
    # the tick holds it, and what the base did to the row afterwards is the base's own. No row is compared
    # here, so the same words on another row are not the tick (T319-CR-1102).
    3)
      from=$(git merge-base "$base" "$1") || return 1
      # only the commits that changed a file the branch changed; from the top, because those names are
      # relative to it and rev-list reads a path from where it is (T319-CR-1304)
      for at in $(cd "$(git rev-parse --show-toplevel)" && git diff-tree -r -z --no-renames --name-only "$from" "$1" \
        | GIT_LITERAL_PATHSPECS=1 xargs -0 git rev-list --first-parent "$from..$base" --); do
        ! holds "$at" "$1" || return 0
      done
      ;;
  esac
  return 1 # or it could not be asked, which says nothing: `landed` deletes the tick branch
}

# Would merging $2 into $1 change nothing? 0 yes, 1 no, 3 a conflict, 2 it could not be asked.
holds() {
  local tree own
  tree=$(git merge-tree --write-tree "$1" "$2" 2>/dev/null)
  case $? in
    0) own=$(git rev-parse --verify --quiet "$1^{tree}") && [ "$tree" = "$own" ] ;;
    1) return 3 ;;
    *) return 2 ;;
  esac
}

# A local base that holds the tick commit (the `ticked-unpushed` route) fast-forwards neither to an origin
# that moved on nor to a squash or rebase of the tick. $1 is a ref that holds the tick: when it holds every
# commit of the local base, the local base goes back to origin's and loses nothing. Whether origin moved
# since does not matter (T319-CR-309).
restore_base() {
  git rev-parse --verify --quiet "refs/heads/$BASE" >/dev/null || return 0
  ! git merge-base --is-ancestor "refs/heads/$BASE" "refs/remotes/origin/$BASE" || return 0
  git merge-base --is-ancestor "refs/heads/$BASE" "$1" || return 0
  if [ "$(git symbolic-ref --short -q HEAD)" = "$BASE" ]; then
    git checkout --quiet --detach "refs/remotes/origin/$BASE" 2>/dev/null
  fi
  git branch --quiet --force --no-track "$BASE" "refs/remotes/origin/$BASE" >&2 \
    || echo "tick-pr: WARNING: the local $BASE still holds the tick commit" >&2
}

case "$CMD" in
  start)
    git fetch --quiet origin "$BASE" || halt "git fetch origin $BASE failed"
    # No tick branch on the remote, or no answer from it: read as the first, the second starts a new tick
    # over the one that is there, and every later push of it is rejected (T319-CR-304).
    git ls-remote --exit-code origin "refs/heads/$TICK_BRANCH" >/dev/null
    case $? in
      0)
        git fetch --quiet origin "+refs/heads/$TICK_BRANCH:refs/remotes/origin/$TICK_BRANCH" \
          || halt "git fetch origin $TICK_BRANCH failed"
        ;;
      2) git update-ref -d "refs/remotes/origin/$TICK_BRANCH" || halt "the stale tracking ref of $TICK_BRANCH could not be removed" ;;
      *) halt "origin could not be asked for $TICK_BRANCH" ;;
    esac
    LANDED=""
    for ref in "refs/heads/$TICK_BRANCH" "refs/remotes/origin/$TICK_BRANCH"; do
      git rev-parse --verify --quiet "$ref^{commit}" >/dev/null || continue
      [ "$(git rev-list --count "refs/remotes/origin/$BASE..$ref")" -gt 0 ] || continue
      if landed "$ref"; then LANDED="$ref"; continue; fi
      if [ "$ref" = "refs/heads/$TICK_BRANCH" ]; then
        # The remote branch can hold more (the forge's "Update branch"): resumed at the local commit, every
        # push is rejected (T319-CR-702). The local branch holds nothing of its own then, so the next turn
        # of this loop resumes at the remote's.
        REMOTE_REF="refs/remotes/origin/$TICK_BRANCH"
        if git rev-parse --verify --quiet "$REMOTE_REF^{commit}" >/dev/null && ! git merge-base --is-ancestor "$REMOTE_REF" "$ref"; then
          git merge-base --is-ancestor "$ref" "$REMOTE_REF" && continue
          halt "the local $TICK_BRANCH and origin's have diverged: keep one of them"
        fi
        git checkout --quiet "$TICK_BRANCH" || halt "cannot check out $TICK_BRANCH"
      else
        git checkout --quiet -B "$TICK_BRANCH" "$ref" || halt "cannot check out $TICK_BRANCH"
      fi
      restore_base "refs/heads/$TICK_BRANCH"
      echo resume
      exit 0
    done
    if [ -n "$LANDED" ]; then
      restore_base "$LANDED"
      tidy
      echo landed
      exit 0
    fi
    # A leftover branch with nothing of its own is re-cut from the base, and loses nothing.
    git checkout --quiet --no-track -B "$TICK_BRANCH" "refs/remotes/origin/$BASE" \
      || halt "cannot cut $TICK_BRANCH off origin/$BASE"
    echo new
    ;;

  open)
    [ -n "$TITLE" ] || usage "open needs --title"
    [ "$(git symbolic-ref --short -q HEAD)" = "$TICK_BRANCH" ] || halt "HEAD is not on $TICK_BRANCH"
    [ "$(git rev-list --count "refs/remotes/origin/$BASE..HEAD")" -gt 0 ] || halt "$TICK_BRANCH has no tick commit over origin/$BASE"
    [ "$(bash "$HERE/push-policy.sh" --site tick)" != defer ] || halt "push-policy.sh deferred the tick push"
    # Both sides named: under push.default=upstream a bare name is pushed to the branch's upstream, which
    # can be the base (T319-CR-701).
    git push --quiet -u origin "refs/heads/$TICK_BRANCH:refs/heads/$TICK_BRANCH" >&2 || halt "the push of $TICK_BRANCH was rejected"
    if ! find_pr; then
      BODY="Records a merged work item. Documentation only; opened by tick-pr.sh (\`developNext.tickVia: pr\`)."
      if [ "$VCS" = bitbucket ]; then
        command -v jq >/dev/null 2>&1 || halt "jq not on PATH"
        [ -n "$PR_READ_REPO" ] || halt "$PR_READ_ERROR"
        case "$PR_READ_ERROR" in
          "found 0 open PRs"*) ;;
          *) halt "$PR_READ_ERROR" ;;
        esac
        OUT=$(mktemp) || halt "mktemp failed"
        CODE=$(jq -n --arg t "$TITLE" --arg d "$BODY" --arg s "$TICK_BRANCH" --arg b "$BASE" \
            '{title:$t,description:$d,source:{branch:{name:$s}},destination:{branch:{name:$b}},close_source_branch:true}' \
          | curl -s --max-time 30 -o "$OUT" -w '%{http_code}' -X POST -H "Content-Type: application/json" "${BB_CURL_AUTH[@]}" \
              --data-binary @- "${PR_READ_BB_API}/repositories/${PR_READ_REPO}/pullrequests")
        rm -f "$OUT"
        [ "$CODE" = 201 ] || halt "opening the tick PR answered HTTP ${CODE:-000}"
      else
        gh pr create --base "$BASE" --head "$TICK_BRANCH" --title "$TITLE" --body "$BODY" >&2 || halt "gh pr create failed"
      fi
      find_pr || halt "the tick PR was opened but could not be read back: $PR_READ_ERROR"
    fi
    [ "$PR_READ_BASE" = "$BASE" ] || halt "PR #$PR_READ_NUMBER targets $PR_READ_BASE, not $BASE"
    echo "$PR_READ_NUMBER"
    ;;

  merge)
    [ -n "$PR" ] || usage "merge needs --pr"
    case "$STRATEGY" in
      merge) BB_STRATEGY=merge_commit ;;
      squash) BB_STRATEGY=squash ;;
      rebase) BB_STRATEGY=fast_forward ;;
      *) usage "--strategy is merge, squash or rebase" ;;
    esac
    # A gate of blank lines and comments runs nothing and exits 0, so it is no gate.
    printf '%s\n' "$GATE" | grep -qE '^[[:space:]]*[^#[:space:]]' || usage "merge needs a command in --quality-gate"
    # A wait that is not a number, or none, ended the poll at once, and its NONE merged (T319-CR-303).
    case "$MAX_WAIT" in '' | 0* | *[!0-9]* | ???????*) usage "--max-wait is a positive number of seconds" ;; esac
    case "$FLOOR" in '' | 0?* | *[!0-9]* | ??????*) usage "--checks is a number of checks" ;; esac
    [ "$(git symbolic-ref --short -q HEAD)" = "$TICK_BRANCH" ] || halt "HEAD is not on $TICK_BRANCH, where the quality gate runs; not merged"
    git diff --quiet HEAD -- || halt "uncommitted changes to tracked files: the quality gate would judge them, not the tick; not merged"
    HEAD_SHA=$(git rev-parse --verify --quiet "refs/heads/$TICK_BRANCH^{commit}") || halt "no local branch $TICK_BRANCH"
    # The PR is read before the gate, so a wrong PR costs no suite, and again after it and before the merge.
    pin() {
      pr_read --pr "$PR" || halt "$PR_READ_ERROR"
      [ "${PR_READ_HEAD:0:12}" = "${HEAD_SHA:0:12}" ] || halt "PR #$PR head ${PR_READ_HEAD:0:12} is not the tick head ${HEAD_SHA:0:12}; not merged"
      [ "$PR_READ_BASE" = "$BASE" ] || halt "PR #$PR targets $PR_READ_BASE, not $BASE; not merged"
    }
    pin
    sh -c "$GATE" < /dev/null >&2
    GATE_EXIT=$?
    [ "$GATE_EXIT" -eq 0 ] || halt "the quality gate failed on $TICK_BRANCH (exit $GATE_EXIT); not merged"
    [ "$(git rev-parse HEAD)" = "$HEAD_SHA" ] || halt "HEAD moved while the quality gate ran; not merged"
    [ "$(git symbolic-ref --short -q HEAD)" = "$TICK_BRANCH" ] || halt "the quality gate left $TICK_BRANCH; not merged"
    git diff --quiet HEAD -- || halt "the quality gate changed tracked files, so it passed on content the tick does not hold; not merged"

    RESULT=$(mktemp) || halt "mktemp failed"
    bash "$HERE/finalise-ci-poll.sh" "$PR" "$HEAD_SHA" "$MAX_WAIT" "$RESULT" "$FLOOR" "$HERE/ci-tree-equivalence.js" >&2
    read -r STATE READ_HEAD _ WAITED _ < "$RESULT"
    rm -f "$RESULT"
    [ "${READ_HEAD:0:12}" = "${HEAD_SHA:0:12}" ] || halt "CI was sampled on ${READ_HEAD:-nothing}, not the tick head; not merged"
    case "$STATE" in
      SUCCESS) ;;
      NONE)
        [ "$FLOOR" -eq 0 ] || halt "PR #$PR has no checks and --checks asks for $FLOOR; not merged"
        WAITED=${WAITED%s}
        case "$WAITED" in '' | *[!0-9]*) WAITED=0 ;; esac
        [ "$WAITED" -ge "$MAX_WAIT" ] || halt "PR #$PR has no checks after ${WAITED}s, before the whole wait of ${MAX_WAIT}s; not merged"
        echo "tick-pr: the tick PR has no checks; the quality gate is the gate" >&2
        ;;
      *) halt "CI on PR #$PR is ${STATE:-unread}; not merged" ;;
    esac

    pin # Bitbucket's merge call takes no head to match, so the head is read last of all
    if [ "$PR_READ_VCS" = bitbucket ]; then
      command -v jq >/dev/null 2>&1 || halt "jq not on PATH"
      jq -n --arg m "Merge PR #$PR: $TICK_BRANCH" --arg s "$BB_STRATEGY" \
          '{type:"pullrequest",message:$m,merge_strategy:$s,close_source_branch:true}' \
        | curl -s --max-time 120 -o /dev/null -X POST -H "Content-Type: application/json" "${BB_CURL_AUTH[@]}" --data-binary @- \
            "${PR_READ_BB_API}/repositories/${PR_READ_REPO}/pullrequests/${PR}/merge"
      MERGE_EXIT=$?
      PR_BODY=$(mktemp) || halt "mktemp failed"
      curl -s --max-time 30 -o "$PR_BODY" "${BB_CURL_AUTH[@]}" "${PR_READ_BB_API}/repositories/${PR_READ_REPO}/pullrequests/${PR}"
      # python3, not jq: a PR body carries raw control characters, which jq rejects (pr-read.sh).
      STATE_NOW=$(python3 -c 'import json,sys;print(json.loads(open(sys.argv[1],encoding="utf-8",errors="replace").read(),strict=False).get("state",""))' "$PR_BODY" 2>/dev/null)
      rm -f "$PR_BODY"
    else
      gh pr merge "$PR" --"$STRATEGY" --match-head-commit "$HEAD_SHA" >&2
      MERGE_EXIT=$?
      STATE_NOW=$(gh pr view "$PR" --json state -q .state)
    fi
    [ "$STATE_NOW" = MERGED ] || halt "PR #$PR is '${STATE_NOW:-unreadable}' after the merge call (exit $MERGE_EXIT)"
    echo "tick-pr: PR #$PR merged" >&2
    tidy
    if [ "$PR_READ_VCS" != bitbucket ]; then
      git push --quiet origin --delete "$TICK_BRANCH" 2>/dev/null || echo "tick-pr: the remote branch $TICK_BRANCH was not deleted (already gone?)" >&2
    fi
    echo merged
    ;;

  finish)
    [ "$(git symbolic-ref --short -q HEAD)" = "$TICK_BRANCH" ] || halt "HEAD is not on $TICK_BRANCH"
    git diff --quiet HEAD -- || halt "there is an uncommitted edit: commit the tick and run open"
    [ "$(git rev-list --count "refs/remotes/origin/$BASE..HEAD")" -eq 0 ] || halt "$TICK_BRANCH holds a commit over origin/$BASE: run open"
    tidy
    echo already-recorded
    ;;

  *) usage "the first argument is start, open, merge or finish" ;;
esac
