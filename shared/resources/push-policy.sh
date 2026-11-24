#!/usr/bin/env bash
# push-policy.sh — decide whether a pipeline step pushes now, or leaves its commit for a later push.
#
# Every push to a branch with an open PR starts the project's CI. The develop pipelines commit after
# almost every step, and many of those commits hold only records: a gate, a QA report, a pause entry.
# A CI run on one of them re-runs the build and the tests over code that has not changed. So every push
# site in the pipelines asks this script first, and no site decides on its own (task.319).
#
# Usage:
#   push-policy.sh --site <site-id> [--end] [--remote <name>]   prints `push` or `defer`
#   push-policy.sh --mark --site <site-id> [--remote <name>]    prints `marked` or `unmarked`
#   push-policy.sh --list                                       prints the site table (TSV)
#   push-policy.sh --self-test                                  checks the site table; prints `ok`
#
# One token on stdout; the reason is one line on stderr. Exit 0 for every decision, 2 for a usage
# error. A caller reads the token and pushes only on `push`:
#
#   if [ "$(bash references/push-policy.sh --site qa-cycle)" = push ]; then git push origin HEAD; fi
#
# A `defer` loses nothing: `git push origin HEAD` sends every commit the branch is ahead by, so the
# commit goes out with the next push, and the end of the run (Step 8, a HALT) always pushes.
#
# THE SITE TABLE (below) is the input: one row per push site, its rule, and the remote reader that
# forces the rule. A step that starts reading the remote head changes its row here, in one place.
#
#   reader  a step that reads the REMOTE head runs before the next push, so the push must come first
#   end     the last push of the run, or a HALT: a person reads the PR next
#   delta   push when the commits not yet on the remote change any path that is not documentation
#   pause   never pushed under `batched`: the resume reads the local commit
#   spent   held in both modes: this cycle's one push was already used, and a second would cancel
#           the cycle's own CI run (docs: the QA loop's "one push per cycle")
#
# CONFIGURATION (skills-config.yaml, read at the HEAD commit by ci-tree-equivalence.js --push-policy):
#   pipeline.pushRecordCommits  batched (default) | eager (push at every site, as before task.319)
#   ci.docsOnly.patterns        what counts as documentation; enabled: false makes every delta code
#   ci.skipMarker               text `--mark` appends to a record-only head's subject (default: off)
#
# WHEN IT CANNOT DECIDE (no node, no engine beside it, a malformed configuration, no remote branch to
# compare with) it answers `push`, the behaviour before this script existed: a needless CI run costs
# minutes, a commit nobody can see costs a review. The `pause` site is the exception and answers
# `defer`: the pause commit is read from the same checkout, and the pushes it would make are the cost
# this script exists to remove.
#
# The engine beside it (spelled out so the bundler ships it): shared/resources/ci-tree-equivalence.js
#
# The skip marker fails the other way: anything not proven leaves the commit `unmarked`.
set -u

SITES='pause	pause	none: the resume reads the local commit (qa-ci-read.sh reports HEAD_MISMATCH, which decides nothing)
qa-cycle	delta	none before the next push: 5a reads the local tree; qa-ci-read.sh is advisory
qa-review-fix	spent	none: the cycle'"'"'s push was used before 5c; the next cycle'"'"'s push carries it
qa-pre-5c	reader	step-5-6 5c asserts the gate and QA report on origin/<branch>, and /review-pr diffs origin/<head>
qa-halt	end	a person reads the PR after the HALT
qa-escalation	end	a person reads the PR after the escalation
finalise-gaps	end	a person reads the PR after the DoD-gaps HALT
finalise-accept	reader	/finalise 6b asserts the artefacts on origin/<branch>; 6c compares the PR head and reads CI on it
finalise-fix	reader	/finalise re-takes CI reading 1 on the fix head
step8	end	verify-push-state.sh, the develop-next merge gate and its head check read the remote
tick	reader	the next run'"'"'s resume reads the row on origin/<base>'
RULES='reader end delta pause spent'

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE="$HERE/ci-tree-equivalence.js"

usage() {
  echo "push-policy: $1" >&2
  echo "usage: push-policy.sh --site <site-id> [--end] [--remote <name>] | --mark --site <site-id> | --list | --self-test" >&2
  exit 2
}

site_rule() { printf '%s\n' "$SITES" | awk -F '\t' -v s="$1" '$1 == s { print $2 }'; }

SITE="" END=no MARK=no REMOTE=origin MODE=decide
while [ $# -gt 0 ]; do
  case "$1" in
    --site)   [ -n "${2:-}" ] || usage "--site needs a value"; SITE="$2"; shift 2 ;;
    --remote) [ -n "${2:-}" ] || usage "--remote needs a value"; REMOTE="$2"; shift 2 ;;
    --end)    END=yes; shift ;;
    --mark)   MARK=yes; shift ;;
    --list)   MODE=list; shift ;;
    --self-test) MODE=selftest; shift ;;
    *) usage "unknown argument '$1'" ;;
  esac
done

if [ "$MODE" = list ]; then
  printf '%s\n' "$SITES"
  exit 0
fi

if [ "$MODE" = selftest ]; then
  bad=$(printf '%s\n' "$SITES" | awk -F '\t' -v rules=" $RULES " '
    NF != 3 { print "row " NR " has " NF " fields" }
    index(rules, " " $2 " ") == 0 { print $1 ": unknown rule " $2 }
    seen[$1]++ { print $1 ": listed twice" }
    $3 == "" { print $1 ": no reader stated" }')
  [ -z "$bad" ] || { echo "push-policy: $bad" >&2; exit 1; }
  echo ok
  exit 0
fi

[ -n "$SITE" ] || usage "--site is required"
RULE=$(site_rule "$SITE")
[ -n "$RULE" ] || usage "unknown site '$SITE' (push-policy.sh --list names them)"

answer() { # token, reason
  echo "push-policy: $SITE: $1 — $2" >&2
  printf '%s\n' "$1"
  exit 0
}

# The ref the next `git push <remote> HEAD` moves. Not the configured upstream: a branch cut from develop may
# track origin/develop, and a push still goes to the branch's own name.
BRANCH=$(git symbolic-ref --short -q HEAD 2>/dev/null)
REMOTE_REF=""
if [ -n "$BRANCH" ] && git rev-parse --verify --quiet "refs/remotes/$REMOTE/$BRANCH^{commit}" >/dev/null 2>&1; then
  REMOTE_REF="refs/remotes/$REMOTE/$BRANCH"
fi

# One read of the engine's record. Empty POLICY = "could not be read"; POLICY_WHY says why.
POLICY="" POLICY_WHY=""
read_policy() {
  local args=(--push-policy)
  [ -n "$REMOTE_REF" ] && args+=(--base "$REMOTE_REF")
  command -v node >/dev/null 2>&1 || { POLICY_WHY="node is not on PATH"; return 1; }
  [ -f "$ENGINE" ] || { POLICY_WHY="ci-tree-equivalence.js is not beside push-policy.sh"; return 1; }
  # stderr is captured apart from stdout so a node warning cannot corrupt the record.
  local err rc=0
  err=$(mktemp) || { POLICY_WHY="mktemp failed"; return 1; }
  POLICY=$(command node "$ENGINE" "${args[@]}" 2>"$err") || rc=$?
  [ "$rc" -eq 0 ] || { POLICY=""; POLICY_WHY=$(head -1 "$err"); [ -n "$POLICY_WHY" ] || POLICY_WHY="the engine exited $rc"; }
  rm -f "$err"
  [ "$rc" -eq 0 ]
}
# The record is one flat JSON line this repository writes; `field` reads a scalar out of it without jq,
# which a consumer's hook environment may lack.
field() {
  printf '%s' "$POLICY" | command node -e '
    const v = JSON.parse(require("fs").readFileSync(0, "utf8"))[process.argv[1]];
    process.stdout.write(v === null || v === undefined ? "" : String(v));' "$1"
}

if [ "$MARK" = yes ]; then
  unmarked() { echo "push-policy: $SITE: unmarked — $1" >&2; echo unmarked; exit 0; }
  read_policy || unmarked "the policy could not be read ($POLICY_WHY)"
  MARKER=$(field skipMarker)
  [ -n "$MARKER" ] || unmarked "ci.skipMarker is not set"
  [ -n "$REMOTE_REF" ] || unmarked "no $REMOTE/${BRANCH:-HEAD} to compare with"
  [ "$(git rev-list --count "$REMOTE_REF..HEAD" 2>/dev/null || echo 0)" -gt 0 ] \
    || unmarked "HEAD is already on the remote"
  [ "$(field docsOnly)" = true ] || unmarked "the unpushed commits change code"
  [ "$(field headDocsOnly)" = true ] || unmarked "the head commit changes code"
  SUBJECT=$(git log -1 --format=%s)
  case "$SUBJECT" in *"$MARKER"*) unmarked "the subject already carries the marker" ;; esac
  # tree-equivalent: a green first-parent ancestor, and every path since it is documentation (and
  # ci.docsOnly.checkCommand passed, when one is configured). Exit 0 means that and nothing else.
  command node "$ENGINE" --head-rollup NONE --head HEAD >/dev/null 2>&1 \
    || unmarked "ci-tree-equivalence did not answer tree-equivalent"
  # `--only` with no paths amends the message alone: what 5c staged for /finalise stays staged.
  BODY=$(git log -1 --format=%b)
  MSG="$SUBJECT $MARKER"
  [ -z "$BODY" ] || MSG="$MSG

$BODY"
  printf '%s\n' "$MSG" | git commit --amend --only --quiet -F - >/dev/null 2>&1 \
    || unmarked "git refused to amend the subject"
  echo "push-policy: $SITE: marked — $MARKER" >&2
  echo marked
  exit 0
fi

[ "$END" = yes ] && answer push "--end: the last push of the run"
[ "$RULE" = spent ] && answer defer "this cycle's push was already used; the next push carries the commit"
[ "$RULE" = end ] && answer push "the last push of the run, or a HALT"
[ "$RULE" = reader ] && answer push "$(printf '%s\n' "$SITES" | awk -F '\t' -v s="$SITE" '$1 == s { print $3 }')"

if ! read_policy; then
  [ "$RULE" = pause ] && answer defer "the policy could not be read ($POLICY_WHY); a pause commit waits"
  answer push "the policy could not be read ($POLICY_WHY)"
fi
[ "$(field pushRecordCommits)" = eager ] && answer push "pipeline.pushRecordCommits is eager"
[ "$RULE" = pause ] && answer defer "pipeline.pushRecordCommits is batched: a pause commit rides the next push"

# delta
[ -n "$REMOTE_REF" ] || answer push "no $REMOTE/${BRANCH:-HEAD} to compare with"
[ "$(git rev-list --count "$REMOTE_REF..HEAD" 2>/dev/null || echo 1)" -gt 0 ] \
  || answer defer "nothing to push: HEAD is already on $REMOTE"
[ "$(field docsOnly)" = true ] \
  && answer defer "every unpushed path is documentation; the commit rides the next push"
answer push "the unpushed commits change code ($(field code))"
