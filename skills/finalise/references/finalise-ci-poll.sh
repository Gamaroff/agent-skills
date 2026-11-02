#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-ci-poll.sh. Regenerate via `npm run bundle`.
# finalise Step 7 action 6c — the CI reading 2 poll, shipped as a file and run, never copied.
#
# It used to live in finalise/SKILL.md as a heredoc with a `rollup()` placeholder the agent spliced
# in by hand. Copying it out by line range dropped its final `printf`, and the truncated poll exited
# 0 without a result — which the reader cannot tell from a poll that was killed (obs #148). A file
# has no copy step to lose a line in.
#
# usage: finalise-ci-poll.sh <PR_NUMBER> <EXPECTED_HEAD> <MAX_WAIT_SECONDS> <RESULT_FILE> [EXPECTED_CHECKS] [ENGINE]
# Writes ONE line to RESULT_FILE when it concludes: "<STATE> <HEAD> <CHECKS> <WAITED>s TREE_EQ=<sha12 or empty>".
# <STATE> is the rollup token, or UNDECIDED when MAX_WAIT ran out on a SUCCESS that never qualified.
# ENGINE is the path of ci-tree-equivalence.js; absent means the docs-only rule is off for this poll.
# GitHub only: every read below is `gh`. Bitbucket forms are noted beside each read.
if [ "$#" -lt 4 ] || [ -z "${1:-}" ] || [ -z "${2:-}" ] || [ -z "${3:-}" ] || [ -z "${4:-}" ]; then
  echo "usage: finalise-ci-poll.sh <PR_NUMBER> <EXPECTED_HEAD> <MAX_WAIT_SECONDS> <RESULT_FILE> [EXPECTED_CHECKS] [ENGINE]" >&2
  exit 2
fi
PR_NUMBER=${1}; EXPECTED_HEAD=${2}; MAX_WAIT=${3}; RESULT=${4}; EXPECTED_CHECKS=${5:-0}; ENGINE=${6:-}
TREE_EQ=""; TE_LATCHED=0
# The docs-only arm parses the engine's JSON with jq. Without jq nothing could ever be latched and a
# configured checkCommand would be re-run every 30 s for the whole wait, so the rule is OFF here and the
# poll waits as before (QA cycle 3, review CR-10).
command -v jq >/dev/null 2>&1 || { [ -z "$ENGINE" ] || echo "ci-tree-equivalence off: jq not found" >&2; ENGINE=""; }
# The Step 6 rollup query, the same jq program as reading 1 (finalise/SKILL.md Step 6, CI_ROLLUP).
# A test holds the two equal: ci-tree-equivalence.test.mjs › "the 6c poll's rollup() is Step 6's query".
# Bitbucket: the head commit's pipeline statuses.
rollup() {
  # shellcheck disable=SC2016  # $st is a jq variable, not a shell one: single quotes are intended
  gh pr view "$PR_NUMBER" --json statusCheckRollup \
    -q '[ .statusCheckRollup[]
          | (.status // "") as $st
          | (if   $st == ""          then (.state // "")        # StatusContext
             elif $st == "COMPLETED" then (.conclusion // "")   # finished CheckRun
             else "PENDING" end)                                 # QUEUED/IN_PROGRESS/WAITING
          | if . == "" then "PENDING" else . end ]               # empty ⇒ undecided, never green
        | if length == 0 then "NONE"
          elif any(. == "FAILURE" or . == "TIMED_OUT" or . == "ERROR"
                   or . == "STARTUP_FAILURE" or . == "ACTION_REQUIRED") then "FAILURE"
          elif any(. == "PENDING" or . == "EXPECTED" or . == "QUEUED"
                   or . == "IN_PROGRESS" or . == "WAITING") then "PENDING"
          elif any(. == "CANCELLED") then "CANCELLED"
          else "SUCCESS" end' 2>/dev/null || echo "UNKNOWN"
}
# The head CI was actually sampled on — read from the PR, never echoed back from the argument.
# Bitbucket: the PR's .source.commit.hash. "unknown" on failure makes the later-turn head check
# HALT rather than pass.
sampled_head() { gh pr view "$PR_NUMBER" --json headRefOid -q .headRefOid 2>/dev/null || echo unknown; }
# How many checks the rollup is green OVER. A push registers its fast lanes first; a rollup
# sampled in that window is SUCCESS across three checks while the slow lanes have not yet
# appeared (obs #87). Distinct checks, the same query as CI_CHECKS_1 (obs #3).
# Bitbucket: the pipeline count for the head commit.
checks() { gh pr view "$PR_NUMBER" --json statusCheckRollup -q '[.statusCheckRollup[] | (.name // .context // "")] | unique | length' 2>/dev/null || echo 0; }
WAITED=0; PREV_CHECKS=-1
STATE=$(rollup); CHECKS=$(checks)
# A terminal state is accepted only when ALL of:
#   (1) WAITED > 0 — the pre-loop sample can still be the PREVIOUS head's rollup, which a
#       fresh push has not yet replaced (obs #108: a stale SUCCESS accepted at 0s);
#   (2) the sampled head is the expected head — never gate one commit and read another;
#   (3) the check count is at least reading 1's count and unchanged since the previous sample —
#       a rollup that is still growing is not decided, whatever its state says.
# FAILURE is terminal under (1) and (2) only: a red on a partial rollup is still a red.
# A PENDING/NONE head may also conclude as SUCCESS when the docs-only rule (task.172) holds —
# still under (1) and (2), so it is never taken on a stale or foreign head. The engine exits 0 for
# tree-equivalent and for nothing else. Once it has answered code-changed, check-failed or disabled
# the answer cannot change (the head is pinned), so it is latched and not re-run every 30 s — a
# configured checkCommand is a full local suite. code-changed is only ever reported when no nearer
# ancestor was left undecided, so it IS final; behind an undecided ancestor the engine says
# no-green-ancestor instead (a CANCELLED ancestor counts as undecided and is re-asked too: that
# costs polling, never a wrong answer). no-green-ancestor / unverifiable can change (an ancestor's
# run may finish), so those are asked again.
tree_equivalent() {
  [ -n "$ENGINE" ] && [ "$TE_LATCHED" -eq 0 ] || return 1
  local out sha
  if out=$(command node "$ENGINE" --head-rollup "$STATE" --head "$EXPECTED_HEAD" --pr "$PR_NUMBER" --json 2>/dev/null); then
    sha=$(printf '%s' "$out" | jq -r '.greenSha[0:12] // empty')
    [ -n "$sha" ] || return 1
    TREE_EQ=$sha; return 0
  fi
  case "$(printf '%s' "$out" | jq -r '.reason // empty' 2>/dev/null)" in
    code-changed|check-failed|disabled) TE_LATCHED=1 ;;
  esac
  return 1
}
decided() {
  [ "$WAITED" -gt 0 ] || return 1
  [ "$(sampled_head | cut -c1-12)" = "$(printf '%s' "$EXPECTED_HEAD" | cut -c1-12)" ] || return 1
  case "$STATE" in
    FAILURE) return 0 ;;
    SUCCESS) [ "$CHECKS" -ge "$EXPECTED_CHECKS" ] && [ "$CHECKS" -eq "$PREV_CHECKS" ] ;;
    PENDING|NONE) if tree_equivalent; then STATE=SUCCESS; return 0; fi; return 1 ;;
    *) return 1 ;;
  esac
}
DECIDED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
  decided && { DECIDED=1; break; }
  sleep 30; WAITED=$((WAITED + 30)); PREV_CHECKS=$CHECKS; STATE=$(rollup); CHECKS=$(checks)
done
# MAX_WAIT ran out. The last sample was taken after the loop's last decided(), so judge it once.
# Only a SUCCESS is re-judged: decided() on a PENDING/NONE head asks the engine, and FAILURE is
# terminal for the reader anyway. A SUCCESS that still fails the floor or the stable-count rule is
# NOT a green reading: printed as sampled, the reader accepted a rollup that stayed partial for the
# whole wait, which is the case the floor exists to refuse (obs #4). UNDECIDED makes the reader HALT.
if [ "$DECIDED" -eq 0 ] && [ "$STATE" = SUCCESS ]; then
  decided || STATE=UNDECIDED
fi
printf '%s %s %s %ss TREE_EQ=%s\n' "$STATE" "$(sampled_head)" "$CHECKS" "$WAITED" "$TREE_EQ" > "$RESULT"
