#!/usr/bin/env bash
# develop-pipeline-on-precompact.test.sh — regression tests for develop-pipeline-on-precompact.sh
#
# Usage: bash shared/resources/develop-pipeline-on-precompact.test.sh
#
# Focus: the hook KEEPS the lock (2026-11). It writes the develop-pipeline.last-halt.json
# resume snapshot, then marks the lock `paused: {at, step, reason}`; it never removes
# the lock, so a session that carries on after the compaction still has one, and a
# killed hook leaves the lock with its full state.
#
# Covers:
#   1. jq forced absent (degraded) → lock KEPT, unmarked; snapshot exists,
#      current_step preserved; claim directory released.
#   2. Success path → snapshot has pause_reason "precompact" + halt_step == current_step
#      and no `paused` field; lock KEPT and marked paused (step, reason, at);
#      PIPELINE-PAUSE-SIGNAL emitted, naming the kept lock.
#   3. No lock → exit 0 noop, a pre-existing snapshot is left untouched (idempotence).
#   4. (bug.14) access.tracker: read-only → NO `gh issue comment` and NO `gh pr comment`
#      is executed; both are recorded in the deferred-mutation journal instead.
#   5. (bug.14) access full → the issue comment is one tracker-comment.js call
#      (`--body-file -`, marker first, plain-language lead before the body) and the
#      PR comment opens with the lead and travels by `--body-file`, never inline.
#   6. (bug.14) resolve-platform.sh cannot be sourced → the PR comment is SKIPPED
#      (fail closed), the hook still exits 0 and still emits the signal.
#   7. (bug.14 / CR-1) no pr_url, JIRA_URL in the environment → the issue comment
#      still goes to the tracker the LOCK names (github), because the hook passes
#      --tracker explicitly instead of letting the engine guess from the env.
#   8. (bug.14 / CR-3) resolve-platform.sh present but REJECTS the config → the PR
#      arm reports "failed to load", not "not found", and posts nothing.
#   9. (bug.14 / CR-4) deferred but the journal cannot be written → the outcome says
#      the record was NOT written rather than asserting one that does not exist.
#  10. (bug.14 / cycle-2 CR-1) two deferred pauses at different steps → two journal
#      records with DISTINCT ids, and both body files still on disk.
#  11. (bug.14 / cycle-2 CR-3) resolve-platform.sh present but read-config.sh absent
#      → "not found beside the hook" (a bundling problem), not "failed to load".
#  12. (task.120) two CONCURRENT invocations against one lock → exactly one snapshot,
#      one report block, one PR-comment call, one issue-comment call; both exit 0,
#      and exactly one of the two emits the pause signal (the other the empty one —
#      the mkdir claim, not the paused mark, turned it away); claim released.
#  13. (task.120) a legacy `.pausing.*` claim from a killed run of the previous hook
#      neither blocks a fresh pause nor survives it.
#  13b-d. the claim directory: one whose holder pid is dead is taken over; one held by
#      a live process turns the run away with nothing done; one with no pid, older
#      than a minute, is taken over.
#  14. (task.120) the PR comment opens with the `agent-skills-comment:pipeline-paused-<step>`
#      marker, and when a comment with that marker already exists on the PR the hook
#      PATCHes it in place instead of posting a second one.
#  15. a hook SIGKILLed mid-flow leaves the lock in place with its full state, and its
#      claim directory behind; the next pause takes that claim over and completes.
#  16. (task.124, obs #115) the appended report is read back through report-lint.js
#      before the commit — lint call site (3): a well-formed report is committed; a
#      corrupt one is appended to but NOT committed, the signal says so, and the pause
#      itself (snapshot, paused mark) still completes. The signal names both the
#      in-session continuation (`advance-pipeline-lock.sh <N>`) and `--restore <doc-dir>`.
#  18. a second compaction with NO lock write since the first: nothing new recorded —
#      no report block, no commit, no gh call; the signal says it is a repeat; the
#      lock stays marked.
#  19. pause → in-session clear (`advance-pipeline-lock.sh <N>`) → pause again at the
#      same step: the second pause runs in full, but posts NO second comment on either
#      arm (the PR comment is edited in place, the issue arm reports `already`).

PASS=0
FAIL=0
# shellcheck source=undefined-command-guard.sh
. "$(dirname "$0")/undefined-command-guard.sh"
HOOK="$(cd "$(dirname "$0")" && pwd)/develop-pipeline-on-precompact.sh"
# Absolute bash path — Scenario 1 runs the hook under a restricted PATH (jq absent);
# an inline `PATH=… bash` prefix would also strip `bash` itself from lookup (rc=127).
BASH_BIN="${HOOK_TEST_BASH:-$(command -v bash)}"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# ── Scenario 1: jq absent → degraded path keeps the lock, writes the snapshot ─
# A restricted PATH containing the coreutils the degraded path needs but NOT jq.
# This forces `command -v jq` to fail regardless of where jq is installed, so the
# hook takes its early degraded exit: write_pause_snapshot falls back to `cp`. The
# lock is kept, and left unmarked — marking needs jq.
NOJQ_BIN="$TMPDIR_TEST/nojq-bin"
mkdir -p "$NOJQ_BIN"
# `mkdir` makes the claim directory and `ln` takes the claim (bug.21); `rm` releases it
# in the EXIT trap.
for tool in dirname cp date rm cat mkdir mv ln; do
  src=$(command -v "$tool" 2>/dev/null) && [ -n "$src" ] && ln -sf "$src" "$NOJQ_BIN/$tool"
done

LOCK_FILE="$TMPDIR_TEST/s1/develop-pipeline.lock"
SNAP_FILE="$TMPDIR_TEST/s1/develop-pipeline.last-halt.json"
mkdir -p "$TMPDIR_TEST/s1"
printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":""}\n' > "$LOCK_FILE"
LOCK_BEFORE=$(cat "$LOCK_FILE")

PATH="$NOJQ_BIN" PIPELINE_LOCK="$LOCK_FILE" "$BASH_BIN" "$HOOK" >/dev/null 2>&1
if [ ! -f "$LOCK_FILE" ]; then
  fail "jq absent: lock kept" "lock file was removed"
elif [ "$(cat "$LOCK_FILE")" != "$LOCK_BEFORE" ]; then
  fail "jq absent: lock left byte-identical (unmarked)" "$(cat "$LOCK_FILE")"
elif [ ! -f "$SNAP_FILE" ]; then
  fail "jq absent: snapshot written" "snapshot was not written"
elif [ -e "$TMPDIR_TEST/s1/develop-pipeline.precompact-claim.d" ]; then
  fail "jq absent: claim released" "claim directory left behind"
else
  GOT_STEP=$(jq -r '.current_step' "$SNAP_FILE" 2>/dev/null)
  if [ "$GOT_STEP" = "4" ]; then
    pass "jq absent: lock kept unmarked, snapshot preserves current_step=4, claim released"
  else
    fail "jq absent: snapshot preserves current_step" "expected 4, got '$GOT_STEP'"
  fi
fi

# ── Scenario 2: success path writes a tagged snapshot + emits the signal ─────
# report_path empty → report/git block skipped; no pr_url/tracker_issue → no gh calls.
LOCK_FILE="$TMPDIR_TEST/s2/develop-pipeline.lock"
SNAP_FILE="$TMPDIR_TEST/s2/develop-pipeline.last-halt.json"
mkdir -p "$TMPDIR_TEST/s2"
printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":"","pr_url":"","tracker":"","tracker_issue":""}\n' > "$LOCK_FILE"

OUT=$(PIPELINE_LOCK="$LOCK_FILE" "$BASH_BIN" "$HOOK" 2>/dev/null)
RC=$?
if [ ! -f "$LOCK_FILE" ]; then
  fail "success path keeps the lock" "lock file was removed"
elif [ ! -f "$SNAP_FILE" ]; then
  fail "success path leaves snapshot" "snapshot was not written"
else
  REASON=$(jq -r '.pause_reason' "$SNAP_FILE" 2>/dev/null)
  HALT_STEP=$(jq -r '.halt_step' "$SNAP_FILE" 2>/dev/null)
  PAUSED_AT=$(jq -r '.paused_at' "$SNAP_FILE" 2>/dev/null)
  MARK=$(jq -c '.paused' "$LOCK_FILE" 2>/dev/null)
  if [ "$REASON" != "precompact" ]; then
    fail "success path tags pause_reason" "expected 'precompact', got '$REASON'"
  elif [ "$HALT_STEP" != "4" ]; then
    fail "success path aliases halt_step=current_step" "expected 4, got '$HALT_STEP'"
  elif [ -z "$PAUSED_AT" ] || [ "$PAUSED_AT" = "null" ]; then
    fail "success path stamps paused_at" "paused_at missing"
  elif [ "$(jq -r 'has("paused")' "$SNAP_FILE")" != "false" ]; then
    fail "success path: the snapshot carries no paused mark" "$(cat "$SNAP_FILE")"
  elif [ "$(jq -r '.paused.step' "$LOCK_FILE")" != "4" ] || [ "$(jq -r '.paused.reason' "$LOCK_FILE")" != "precompact" ] \
       || [ "$(jq -r '.paused.at' "$LOCK_FILE")" != "$PAUSED_AT" ]; then
    fail "success path marks the lock paused {at, step: 4, reason: precompact}" "paused=$MARK"
  elif [ "$(jq -c 'del(.paused)' "$LOCK_FILE")" != "$(jq -c . <<<'{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":"","pr_url":"","tracker":"","tracker_issue":""}')" ]; then
    fail "success path: the mark is the only change to the lock" "$(cat "$LOCK_FILE")"
  elif ! grep -qF "PIPELINE-PAUSE-SIGNAL" <<<"$OUT"; then
    fail "success path emits PIPELINE-PAUSE-SIGNAL" "signal absent from stdout (rc=$RC)"
  elif ! grep -qF 'Lock kept and marked paused' <<<"$OUT" || grep -qF 'Lock file removed' <<<"$OUT"; then
    fail "success path: the signal says the lock was kept, not removed" "$(grep -o 'Lock[^\\]*' <<<"$OUT" | head -2)"
  elif [ -e "$TMPDIR_TEST/s2/develop-pipeline.precompact-claim.d" ]; then
    fail "success path releases the claim" "claim directory left behind"
  else
    pass "success path: snapshot tagged (pause_reason=precompact, halt_step=4), lock kept and marked paused, signal says so, claim released"
  fi
fi

# ── Scenario 3: no lock → noop, pre-existing snapshot untouched (idempotence) ─
LOCK_FILE="$TMPDIR_TEST/s3/develop-pipeline.lock"   # intentionally absent
SNAP_FILE="$TMPDIR_TEST/s3/develop-pipeline.last-halt.json"
mkdir -p "$TMPDIR_TEST/s3"
printf '{"sentinel":"do-not-clobber","current_step":7}\n' > "$SNAP_FILE"
SNAP_BEFORE=$(cat "$SNAP_FILE")

OUT=$(PIPELINE_LOCK="$LOCK_FILE" "$BASH_BIN" "$HOOK" 2>/dev/null)
RC=$?
SNAP_AFTER=$(cat "$SNAP_FILE")
if [ "$RC" -ne 0 ]; then
  fail "no lock → exit 0 noop" "rc=$RC"
elif [ "$SNAP_BEFORE" != "$SNAP_AFTER" ]; then
  fail "no lock → pre-existing snapshot untouched" "snapshot was modified"
elif ! grep -qF '"additionalContext":""' <<<"$OUT"; then
  fail "no lock → emits empty additionalContext" "unexpected output: $OUT"
else
  pass "no lock: exit 0 noop, pre-existing snapshot untouched, empty additionalContext"
fi

# ── bug.14 scenarios: the two tracker writes go through the contract ────────
#
# A `gh` shim on PATH logs every argv line to $GH_LOG and captures any stdin
# body to $GH_STDIN_DIR/<n>. It answers the reads tracker-comment.js makes
# (`auth status`, `repo view`, `api --paginate …/comments` → no existing
# comments) so the CLI takes its normal posting path. The hook runs with cwd =
# a temp "consumer" dir, which is where both resolve-platform.sh and
# tracker-comment.js read skills-config.yaml from.
SHIM_BIN="$TMPDIR_TEST/shim-bin"
mkdir -p "$SHIM_BIN"
cat > "$SHIM_BIN/gh" <<'SHIM'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$GH_LOG"
case "$1 $2" in
  "auth status") exit 0 ;;
  "repo view") echo "o/r"; exit 0 ;;
  "api --paginate") exit 0 ;;
esac
for a in "$@"; do
  if [ "$a" = "-" ]; then
    n=$(ls "$GH_STDIN_DIR" 2>/dev/null | wc -l | tr -d ' ')
    cat > "$GH_STDIN_DIR/$((n + 1))"
  fi
done
exit 0
SHIM
chmod +x "$SHIM_BIN/gh"

run_hook_in_consumer() {
  # $1 = scenario dir, $2 = access line for skills-config.yaml ("" → no file)
  # $3 = pr_url for the lock (default: a GitHub PR; "" → no PR yet)
  # $4 = journal path override (default: <dir>/.claude/state/tracker-actions.jsonl)
  # Extra env for the hook can be passed by the caller as HOOK_ENV_* exports.
  local dir="$1" access="$2" pr_url="${3-https://github.com/o/r/pull/7}" journal="${4-}"
  mkdir -p "$dir/.claude/state" "$dir/stdin"
  [ -n "$access" ] && printf 'access:\n  tracker: %s\n' "$access" > "$dir/skills-config.yaml"
  printf '{"skill":"develop-task","current_step":%s,"branch":"feature/x","report_path":"","pr_url":"%s","tracker":"github","tracker_issue":"42","task_or_story_directory":"%s"}\n' \
    "${HOOK_TEST_STEP:-4}" "$pr_url" "${HOOK_TEST_DOC_DIR:-}" \
    > "$dir/.claude/state/develop-pipeline.lock"
  : > "$dir/gh.log"
  (cd "$dir" && PATH="$SHIM_BIN:$PATH" GH_LOG="$dir/gh.log" GH_STDIN_DIR="$dir/stdin" \
     PIPELINE_LOCK="$dir/.claude/state/develop-pipeline.lock" \
     TRACKER_ACTIONS_JOURNAL="${journal:-$dir/.claude/state/tracker-actions.jsonl}" \
     "$BASH_BIN" "$HOOK" 2>"$dir/stderr.log")
}

# ── Scenario 4: read-only → nothing posted, both writes recorded ──────────────
S4="$TMPDIR_TEST/s4"
OUT=$(run_hook_in_consumer "$S4" "read-only")
RC=$?
JOURNAL="$S4/.claude/state/tracker-actions.jsonl"
if [ "$RC" -ne 0 ]; then
  fail "read-only: hook still exits 0" "rc=$RC"
elif grep -qE '^(issue|pr) comment' "$S4/gh.log"; then
  fail "read-only: no gh issue/pr comment is executed" "$(grep -E '^(issue|pr) comment' "$S4/gh.log")"
elif [ ! -f "$JOURNAL" ]; then
  fail "read-only: deferred journal written" "no journal at $JOURNAL (stderr: $(cat "$S4/stderr.log"))"
elif ! grep -q '"github.issue.comment"' "$JOURNAL"; then
  fail "read-only: issue comment recorded" "journal lacks github.issue.comment: $(cat "$JOURNAL")"
elif ! grep -q '"github.pr.comment"' "$JOURNAL"; then
  fail "read-only: PR comment recorded" "journal lacks github.pr.comment: $(cat "$JOURNAL")"
elif ! grep -qF "PIPELINE-PAUSE-SIGNAL" <<<"$OUT"; then
  fail "read-only: signal still emitted" "signal absent from stdout"
else
  pass "read-only: no gh comment executed; issue + PR comments recorded in the deferred journal; signal emitted"
fi

# ── Scenario 5: full access → contract path on both comments ────────────────
S5="$TMPDIR_TEST/s5"
OUT=$(run_hook_in_consumer "$S5" "")
RC=$?
ISSUE_LINE=$(grep -E '^issue comment 42 ' "$S5/gh.log")
PR_LINE=$(grep -E '^pr comment https://github.com/o/r/pull/7 ' "$S5/gh.log")
ISSUE_BODY=$(cat "$S5/stdin/1" 2>/dev/null)
PR_FILE=$(printf '%s' "$PR_LINE" | sed -n 's/.*--body-file \([^ ]*\).*/\1/p')
if [ "$RC" -ne 0 ]; then
  fail "full: hook exits 0" "rc=$RC"
elif [ -z "$ISSUE_LINE" ]; then
  fail "full: issue comment posted" "no 'issue comment 42' in gh.log: $(cat "$S5/gh.log")"
elif ! grep -qF -- '--body-file -' <<<"$ISSUE_LINE"; then
  fail "full: issue comment travels by --body-file (tracker-comment.js), not inline --body" "$ISSUE_LINE"
elif ! grep -qE '^<!-- .*pipeline-paused' <<<"$ISSUE_BODY"; then
  fail "full: issue comment opens with the pipeline-paused idempotency marker" "$(head -2 <<<"$ISSUE_BODY")"
elif ! grep -qF 'paused' <<<"$(sed -n '2p' <<<"$ISSUE_BODY")"; then
  fail "full: issue comment has a plain-language lead after the marker" "$(sed -n '1,3p' <<<"$ISSUE_BODY")"
elif ! grep -qF 'Step 4' <<<"$ISSUE_BODY"; then
  fail "full: issue comment body still names the pause step" "$ISSUE_BODY"
elif [ -z "$PR_LINE" ]; then
  fail "full: PR comment posted" "no 'pr comment <url>' in gh.log: $(cat "$S5/gh.log")"
elif grep -qE -- '--body ' <<<"$PR_LINE"; then
  fail "full: PR comment travels by --body-file, not inline --body" "$PR_LINE"
elif [ -z "$PR_FILE" ] || [ ! -f "$PR_FILE" ]; then
  fail "full: PR comment body file exists when gh runs" "body file '$PR_FILE' not found (hook must not delete it before gh reads it)"
elif ! head -1 "$PR_FILE" | grep -qE '^<!-- agent-skills-comment:pipeline-paused-4 -->$'; then
  fail "full: PR comment opens with the step-scoped idempotency marker" "$(head -3 "$PR_FILE")"
elif ! sed -n '2p' "$PR_FILE" | grep -qF 'paused'; then
  fail "full: PR comment has the plain-language lead right after the marker" "$(head -3 "$PR_FILE")"
elif ! grep -qF 'Pipeline paused' "$PR_FILE"; then
  fail "full: PR comment still carries the developer body" "$(cat "$PR_FILE")"
else
  pass "full: issue comment via tracker-comment.js (marker + lead, --body-file -); PR comment is marker, then lead, via --body-file"
fi

# ── Scenario 6: resolver unavailable → PR comment skipped, hook still clean ──
# Run from a dir whose sibling resolve-platform.sh cannot be found by copying the
# hook alone into an empty directory: the sibling lookup fails and the PR arm
# must fail CLOSED (no bare gh pr comment as a "fallback").
S6="$TMPDIR_TEST/s6"
mkdir -p "$S6/hook-alone"
cp "$HOOK" "$S6/hook-alone/develop-pipeline-on-precompact.sh"
HOOK_SAVED="$HOOK"; HOOK="$S6/hook-alone/develop-pipeline-on-precompact.sh"
OUT=$(run_hook_in_consumer "$S6" "")
RC=$?
HOOK="$HOOK_SAVED"
if [ "$RC" -ne 0 ]; then
  fail "resolver missing: hook still exits 0" "rc=$RC"
elif grep -qE '^pr comment' "$S6/gh.log"; then
  fail "resolver missing: PR comment fails closed (no bare gh pr comment)" "$(grep -E '^pr comment' "$S6/gh.log")"
elif ! grep -qF "PIPELINE-PAUSE-SIGNAL" <<<"$OUT"; then
  fail "resolver missing: signal still emitted" "signal absent"
elif [ "$(jq -r '.paused.reason' "$S6/.claude/state/develop-pipeline.lock" 2>/dev/null)" != "precompact" ]; then
  fail "resolver missing: lock still kept and marked paused" "$(cat "$S6/.claude/state/develop-pipeline.lock" 2>/dev/null || echo 'lock absent')"
else
  pass "resolver missing: PR comment skipped (fail closed), lock kept and marked paused, signal emitted"
fi

# ── Scenario 7 (CR-1): the lock's tracker wins over an ambient JIRA_URL ──────
# No pr_url, so the PR arm never sources resolve-platform.sh and nothing exports
# TRACKER into the engine's environment. Without an explicit --tracker the engine
# resolves from JIRA_URL presence and posts a GitHub issue number to Jira.
S7="$TMPDIR_TEST/s7"
OUT=$(JIRA_URL="https://example.atlassian.net" run_hook_in_consumer "$S7" "" "")
RC=$?
if [ "$RC" -ne 0 ]; then
  fail "lock tracker wins: hook exits 0" "rc=$RC"
elif ! grep -qE '^issue comment 42 --body-file -' "$S7/gh.log"; then
  fail "lock tracker wins: issue comment routed to GitHub (the lock's tracker), not Jira" "gh.log: $(cat "$S7/gh.log"); outcome: $(grep -o 'Tracker issue comment: .*' <<<"$OUT" | head -1)"
elif ! grep -qF 'Tracker issue comment: posted' <<<"$OUT"; then
  fail "lock tracker wins: signal reports the issue comment as posted" "$(grep -o 'Tracker issue comment: .*' <<<"$OUT" | head -1)"
elif ! grep -qF 'PR comment: (no PR yet)' <<<"$OUT"; then
  fail "lock tracker wins: PR arm reports no PR yet" "$(grep -o 'PR comment: .*' <<<"$OUT" | head -1)"
else
  pass "lock tracker wins: with no PR and JIRA_URL in env, issue comment still goes to GitHub via --tracker"
fi

# ── Scenario 8 (CR-3): resolver present but rejects the config → "failed to load"
S8="$TMPDIR_TEST/s8"
OUT=$(run_hook_in_consumer "$S8" "bogus-mode")
RC=$?
if [ "$RC" -ne 0 ]; then
  fail "resolver rejects config: hook exits 0" "rc=$RC"
elif grep -qE '^pr comment' "$S8/gh.log"; then
  fail "resolver rejects config: PR comment not posted" "$(grep -E '^pr comment' "$S8/gh.log")"
elif ! grep -qF 'PR comment: skipped — resolve-platform.sh failed to load' <<<"$OUT"; then
  fail "resolver rejects config: outcome distinguishes failed-to-load from not-found" "$(grep -o 'PR comment: .*' <<<"$OUT" | head -1)"
else
  pass "resolver rejects config: PR arm skipped with a 'failed to load' outcome, not 'not found'"
fi

# ── Scenario 9 (CR-4): deferred, journal unwritable → outcome says NOT written ─
S9="$TMPDIR_TEST/s9"
mkdir -p "$S9/journal-is-a-dir"
OUT=$(run_hook_in_consumer "$S9" "read-only" "https://github.com/o/r/pull/7" "$S9/journal-is-a-dir")
RC=$?
if [ "$RC" -ne 0 ]; then
  fail "journal unwritable: hook exits 0" "rc=$RC"
elif grep -qE '^pr comment' "$S9/gh.log"; then
  fail "journal unwritable: PR comment still not posted" "$(grep -E '^pr comment' "$S9/gh.log")"
elif ! grep -qF 'PR comment: deferred — access.tracker=read-only, but the deferred record was NOT written' <<<"$OUT"; then
  fail "journal unwritable: outcome does not claim a record that was not written" "$(grep -o 'PR comment: .*' <<<"$OUT" | head -1)"
else
  pass "journal unwritable: deferred outcome reports the record was NOT written"
fi

# ── Scenario 10 (cycle-2 CR-1): two pauses, two distinct deferred records ────
S10="$TMPDIR_TEST/s10"
OUT=$(HOOK_TEST_STEP=3 run_hook_in_consumer "$S10" "read-only")
OUT=$(HOOK_TEST_STEP=6 run_hook_in_consumer "$S10" "read-only")
J10="$S10/.claude/state/tracker-actions.jsonl"
PR_IDS=$(grep '"github.pr.comment"' "$J10" 2>/dev/null | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | sort)
N_PR=$(printf '%s\n' "$PR_IDS" | grep -c .)
N_UNIQ=$(printf '%s\n' "$PR_IDS" | sort -u | grep -c .)
if [ "$N_PR" -ne 2 ]; then
  fail "two pauses: two PR-comment records journaled" "expected 2 github.pr.comment records, got $N_PR"
elif [ "$N_UNIQ" -ne 2 ]; then
  fail "two pauses: the two PR-comment records have distinct ids" "ids collapsed: $PR_IDS"
elif [ "$(ls "$S10/.claude/state"/precompact-pr-comment*.md 2>/dev/null | wc -l | tr -d ' ')" -lt 2 ]; then
  fail "two pauses: both PR body files kept on disk" "$(ls "$S10/.claude/state")"
else
  pass "two pauses (Step 3, Step 6): two deferred PR-comment records with distinct ids; both bodies kept"
fi

# ── Scenario 11 (cycle-2 CR-3): resolver present, its reader absent → "not found"
S11="$TMPDIR_TEST/s11"
mkdir -p "$S11/hook-partial"
cp "$HOOK" "$S11/hook-partial/develop-pipeline-on-precompact.sh"
cp "$(dirname "$HOOK")/resolve-platform.sh" "$S11/hook-partial/resolve-platform.sh"
HOOK_SAVED="$HOOK"; HOOK="$S11/hook-partial/develop-pipeline-on-precompact.sh"
OUT=$(run_hook_in_consumer "$S11" "")
RC=$?
HOOK="$HOOK_SAVED"
if [ "$RC" -ne 0 ]; then
  fail "partial bundle: hook exits 0" "rc=$RC"
elif grep -qE '^pr comment' "$S11/gh.log"; then
  fail "partial bundle: PR comment not posted" "$(grep -E '^pr comment' "$S11/gh.log")"
elif ! grep -qF 'PR comment: skipped — ' <<<"$OUT" || grep -qF 'failed to load' <<<"$OUT"; then
  fail "partial bundle: outcome names a missing sibling, not a rejected config" "$(grep -o 'PR comment: .*' <<<"$OUT" | head -1)"
elif ! grep -qF 'PR comment: skipped — resolve-platform.sh or read-config.sh not found beside the hook' <<<"$OUT"; then
  # Anchored on the PR line: the issue arm's own "not found beside the hook"
  # is always present in this partial dir and would satisfy a bare grep.
  fail "partial bundle: PR outcome says 'not found beside the hook'" "$(grep -o 'PR comment: .*' <<<"$OUT" | head -1)"
else
  pass "partial bundle (resolver present, read-config.sh absent): 'not found beside the hook', nothing posted"
fi

# ── Scenario 12 (task.120): two concurrent runs → one of everything ──────────
# The task.110 failure: the host fired the hook twice in parallel (one settings
# file, two spellings of the same command) and both runs passed `[ -f "$LOCK" ]`.
# With the atomic claim exactly one run owns the pause. A report file is present
# here so the appended block is counted too; `git` is shimmed to a noop so the
# best-effort commit neither needs a repo nor touches this one — and it SLEEPS,
# so the first run is provably still inside its pause flow (holding the claim)
# when the second starts. The loser must emit the EMPTY signal: that is what proves
# the mkdir claim turned it away. A loser that got past a missing claim would find
# the lock already marked and emit the repeat signal instead, and the side-effect
# counts alone would not tell the two apart.
S12="$TMPDIR_TEST/s12"
mkdir -p "$S12/.claude/state" "$S12/stdin"
printf '# report\n' > "$S12/report.md"
cat > "$SHIM_BIN/git" <<'SHIM'
#!/usr/bin/env bash
[ "$1" = "commit" ] && sleep 1
exit 0
SHIM
chmod +x "$SHIM_BIN/git"
printf '{"skill":"develop-task","current_step":5,"branch":"feature/x","report_path":"report.md","pr_url":"https://github.com/o/r/pull/7","tracker":"github","tracker_issue":"42"}\n' \
  > "$S12/.claude/state/develop-pipeline.lock"
: > "$S12/gh.log"
(
  cd "$S12" || exit 1
  export PATH="$SHIM_BIN:$PATH" GH_LOG="$S12/gh.log" GH_STDIN_DIR="$S12/stdin" \
    PIPELINE_LOCK="$S12/.claude/state/develop-pipeline.lock" \
    TRACKER_ACTIONS_JOURNAL="$S12/.claude/state/tracker-actions.jsonl"
  "$BASH_BIN" "$HOOK" > "$S12/out.a" 2>/dev/null & A=$!
  "$BASH_BIN" "$HOOK" > "$S12/out.b" 2>/dev/null & B=$!
  wait "$A"; echo $? > "$S12/rc.a"
  wait "$B"; echo $? > "$S12/rc.b"
)
N_SNAP=$(ls "$S12/.claude/state/"develop-pipeline.last-halt.json 2>/dev/null | wc -l | tr -d ' ')
N_BLOCK=$(grep -c '^## Pipeline Paused' "$S12/report.md")
N_PR=$(grep -cE '^pr comment ' "$S12/gh.log")
N_ISSUE=$(grep -cE '^issue comment 42 ' "$S12/gh.log")
N_SIGNAL=$(cat "$S12/out.a" "$S12/out.b" | grep -c 'PIPELINE-PAUSE-SIGNAL')
N_EMPTY=$(cat "$S12/out.a" "$S12/out.b" | grep -cF '"additionalContext":""')
N_CLAIMS=$(ls -d "$S12/.claude/state/"develop-pipeline.lock.pausing.* "$S12/.claude/state/"develop-pipeline.precompact-claim.d* 2>/dev/null | wc -l | tr -d ' ')
N_REPEAT=$(cat "$S12/out.a" "$S12/out.b" | grep -c 'PIPELINE-PAUSE-SIGNAL (repeat)')
if [ "$(cat "$S12/rc.a")" != "0" ] || [ "$(cat "$S12/rc.b")" != "0" ]; then
  fail "concurrent: both runs exit 0" "rc.a=$(cat "$S12/rc.a") rc.b=$(cat "$S12/rc.b")"
elif [ "$N_SNAP" != "1" ]; then
  fail "concurrent: exactly one snapshot" "found $N_SNAP"
elif [ "$N_BLOCK" != "1" ]; then
  fail "concurrent: exactly one report block appended" "found $N_BLOCK '## Pipeline Paused' headings"
elif [ "$N_PR" != "1" ]; then
  fail "concurrent: exactly one PR-comment call" "found $N_PR in gh.log: $(cat "$S12/gh.log")"
elif [ "$N_ISSUE" != "1" ]; then
  fail "concurrent: exactly one issue-comment call" "found $N_ISSUE in gh.log: $(cat "$S12/gh.log")"
elif [ "$N_SIGNAL" != "1" ] || [ "$N_EMPTY" != "1" ] || [ "$N_REPEAT" != "0" ]; then
  fail "concurrent: one run emits the pause signal, the other the empty signal (turned away by the claim)" "signals=$N_SIGNAL empties=$N_EMPTY repeats=$N_REPEAT"
elif [ "$(jq -r '.paused.step' "$S12/.claude/state/develop-pipeline.lock" 2>/dev/null)" != "5" ]; then
  fail "concurrent: the lock is kept and marked paused once" "$(cat "$S12/.claude/state/develop-pipeline.lock" 2>/dev/null || echo 'lock absent')"
elif [ "$N_CLAIMS" != "0" ]; then
  fail "concurrent: no claim left behind" "$(ls -A "$S12/.claude/state")"
else
  pass "concurrent (2 runs, 1 lock): one snapshot, one report block, one PR call, one issue call; loser turned away by the claim with the empty signal; lock kept and marked; claim released"
fi

# ── Scenario 12a (bug.21): the claim must not lean on `mkdir` being exclusive ─
# On the LAN server's kernel (WSL2 6.18.33.2, ext4 and tmpfs) two concurrent `mkdir`
# calls of one name BOTH return 0 (264 of 300 races on ext4; `ln` and a noclobber
# create: 0 of 300), so a claim taken with `mkdir` is taken twice and scenario 12
# fails on roughly 7 of 12 runs there. A timing race cannot be pinned on a kernel
# that behaves, so this scenario supplies the broken primitive itself: a `mkdir`
# stand-in that returns 0 when the directory already exists, which is exactly what
# the affected kernel does. Two hooks race with it on PATH and the same assertions
# as scenario 12 must hold. Against a claim built on `mkdir` it is red on every run;
# a claim that takes its exclusivity from `ln` is unaffected, because `mkdir` is
# only used to make the directory the claim lives in. The overlap of the two runs is
# guaranteed by the `git` stand-in scenario 12 left in SHIM_BIN, which sleeps 1s at
# `commit`: the first run is still inside its pause flow when the second starts.
NOEX_BIN="$TMPDIR_TEST/noex-bin"
mkdir -p "$NOEX_BIN"
{
  printf '#!/usr/bin/env bash\n'
  printf '# bug.21 stand-in: mkdir that succeeds on an existing directory (the affected kernel).\n'
  printf 'exec %q -p "$@"\n' "$(command -v mkdir)"
} > "$NOEX_BIN/mkdir"
chmod +x "$NOEX_BIN/mkdir"
S12A="$TMPDIR_TEST/s12a"
mkdir -p "$S12A/.claude/state" "$S12A/stdin"
printf '# report\n' > "$S12A/report.md"
printf '{"skill":"develop-task","current_step":5,"branch":"feature/x","report_path":"report.md","pr_url":"https://github.com/o/r/pull/7","tracker":"github","tracker_issue":"42"}\n' \
  > "$S12A/.claude/state/develop-pipeline.lock"
: > "$S12A/gh.log"
(
  cd "$S12A" || exit 1
  export PATH="$NOEX_BIN:$SHIM_BIN:$PATH" GH_LOG="$S12A/gh.log" GH_STDIN_DIR="$S12A/stdin" \
    PIPELINE_LOCK="$S12A/.claude/state/develop-pipeline.lock" \
    TRACKER_ACTIONS_JOURNAL="$S12A/.claude/state/tracker-actions.jsonl"
  "$BASH_BIN" "$HOOK" > "$S12A/out.a" 2>/dev/null & A=$!
  "$BASH_BIN" "$HOOK" > "$S12A/out.b" 2>/dev/null & B=$!
  wait "$A"; wait "$B"
)
N12A_BLOCK=$(grep -c '^## Pipeline Paused' "$S12A/report.md")
N12A_SIGNAL=$(cat "$S12A/out.a" "$S12A/out.b" | grep -c 'PIPELINE-PAUSE-SIGNAL')
N12A_EMPTY=$(cat "$S12A/out.a" "$S12A/out.b" | grep -cF '"additionalContext":""')
N12A_PR=$(grep -cE '^pr comment ' "$S12A/gh.log")
if [ "$N12A_BLOCK" != "1" ]; then
  fail "non-exclusive mkdir stand-in: exactly one report block appended" "found $N12A_BLOCK '## Pipeline Paused' headings"
elif [ "$N12A_PR" != "1" ]; then
  fail "non-exclusive mkdir stand-in: exactly one PR-comment call" "found $N12A_PR in gh.log: $(cat "$S12A/gh.log")"
elif [ "$N12A_SIGNAL" != "1" ] || [ "$N12A_EMPTY" != "1" ]; then
  fail "non-exclusive mkdir stand-in: one pause signal, one empty signal" "signals=$N12A_SIGNAL empties=$N12A_EMPTY"
else
  pass "non-exclusive mkdir stand-in (bug.21): the claim still admits exactly one of two concurrent runs"
fi

# ── Scenario 12b: the slower of two stealers moves the faster one's FRESH claim ─
# task.110's double registration after a SIGKILLed pause: both runs find the dead
# claim and judge it stale; the faster takes it over and re-claims, and the slower
# one's rename then moves that fresh claim. Timing cannot hit the window (40 real
# concurrent pairs never did), so the precompact-claim-thief `mv` stand-in puts a
# live pid in the claim at the instant of the rename. The run must see that it moved
# a claim it did not judge dead, put it back, and take the noop path: empty signal,
# no snapshot, lock unmarked, the live run's claim in place, no `.stale.*` left.
THIEF="$(cd "$(dirname "$0")" && pwd)/tests/fixtures/precompact-claim-thief.sh"
THIEF_BIN="$TMPDIR_TEST/thief-bin"
mkdir -p "$THIEF_BIN"
cp "$THIEF" "$THIEF_BIN/mv"; chmod +x "$THIEF_BIN/mv"
REAL_MV_BIN=$(command -v mv)
true & DEAD12B=$!; wait "$DEAD12B" 2>/dev/null
sleep 60 & LIVE12B=$!
S12B="$TMPDIR_TEST/s12b"
mkdir -p "$S12B/.claude/state/develop-pipeline.precompact-claim.d"
printf '%s\n' "$DEAD12B" > "$S12B/.claude/state/develop-pipeline.precompact-claim.d/pid"
printf '{"skill":"develop-task","current_step":5,"branch":"feature/x"}\n' > "$S12B/.claude/state/develop-pipeline.lock"
OUT=$(cd "$S12B" && PATH="$THIEF_BIN:$PATH" REAL_MV="$REAL_MV_BIN" THIEF_PID="$LIVE12B" \
  THIEF_MARK="$S12B/thief.mark" PIPELINE_LOCK="$S12B/.claude/state/develop-pipeline.lock" \
  "$BASH_BIN" "$HOOK" 2>/dev/null)
S12B_CLAIM=$(cat "$S12B/.claude/state/develop-pipeline.precompact-claim.d/pid" 2>/dev/null)
S12B_STALE=$(find "$S12B/.claude/state" -maxdepth 1 -name '*.stale.*' | wc -l | tr -d ' ')
kill "$LIVE12B" 2>/dev/null; wait "$LIVE12B" 2>/dev/null
if [ ! -e "$S12B/thief.mark" ]; then
  fail "slower stealer: the thief fired (fixture check)" "the claim rename never happened"
elif ! grep -qF '"additionalContext":""' <<<"$OUT"; then
  fail "slower stealer: turned away with the empty signal" "$(head -c 160 <<<"$OUT")"
elif [ -f "$S12B/.claude/state/develop-pipeline.last-halt.json" ] \
     || jq -e '.paused' "$S12B/.claude/state/develop-pipeline.lock" >/dev/null 2>&1; then
  fail "slower stealer: no snapshot written, lock not marked" "$(cat "$S12B/.claude/state/develop-pipeline.lock")"
elif [ "$S12B_CLAIM" != "$LIVE12B" ] || [ "$S12B_STALE" != "0" ]; then
  fail "slower stealer: the live run's claim is put back" "claim pid=${S12B_CLAIM:-none} (want $LIVE12B) stale dirs=$S12B_STALE"
else
  pass "slower of two stealers: notices it moved a live claim, puts it back, and pauses nothing"
fi

# ── Scenario 13 (task.120): a legacy stale claim from a killed run is swept, not fatal ─
S13="$TMPDIR_TEST/s13"
mkdir -p "$S13"
printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":"","pr_url":"","tracker":"","tracker_issue":""}\n' > "$S13/develop-pipeline.lock"
printf '{"skill":"develop-task","current_step":2}\n' > "$S13/develop-pipeline.lock.pausing.99999"
OUT=$(PIPELINE_LOCK="$S13/develop-pipeline.lock" "$BASH_BIN" "$HOOK" 2>/dev/null)
RC=$?
if [ "$RC" -ne 0 ]; then
  fail "stale claim: hook exits 0" "rc=$RC"
elif ! grep -qF "PIPELINE-PAUSE-SIGNAL" <<<"$OUT"; then
  fail "stale claim: a fresh pause still completes" "signal absent"
elif [ "$(jq -r '.halt_step' "$S13/develop-pipeline.last-halt.json" 2>/dev/null)" != "4" ]; then
  fail "stale claim: snapshot is taken from the live lock, not the stale claim" "halt_step=$(jq -r '.halt_step' "$S13/develop-pipeline.last-halt.json" 2>/dev/null)"
elif [ -f "$S13/develop-pipeline.lock.pausing.99999" ]; then
  fail "stale claim: swept by the winner" "stale claim file still present"
elif [ "$(cd "$S13" && for f in * .[!.]*; do [ -e "$f" ] && [ "$f" != develop-pipeline.last-halt.json ] && printf '%s ' "$f"; done)" != "develop-pipeline.lock " ]; then
  fail "stale claim: only the (kept) lock and the snapshot remain" "$(ls -A "$S13")"
else
  pass "stale claim (.pausing.99999): fresh pause completes from the live lock and the stale file is gone"
fi

# ── Scenarios 13b–d: the claim directory and its holder ──────────────────────
# A claim left by a SIGKILLed hook (the EXIT trap never ran) must not silence every
# later pause; a claim whose holder is alive must turn the run away untouched.
s13_lock() { # $1 = dir → a fresh unmarked lock there
  mkdir -p "$1"
  printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":"","pr_url":"","tracker":"","tracker_issue":""}\n' > "$1/develop-pipeline.lock"
}
( exit 0 ) & DEAD_PID=$!; wait "$DEAD_PID"
S13B="$TMPDIR_TEST/s13b"; s13_lock "$S13B"
mkdir -p "$S13B/develop-pipeline.precompact-claim.d"; printf '%s\n' "$DEAD_PID" > "$S13B/develop-pipeline.precompact-claim.d/pid"
OUT=$(PIPELINE_LOCK="$S13B/develop-pipeline.lock" "$BASH_BIN" "$HOOK" 2>"$S13B/stderr.log")
if grep -qF 'PIPELINE-PAUSE-SIGNAL' <<<"$OUT" && [ "$(jq -r '.paused.step' "$S13B/develop-pipeline.lock")" = "4" ] \
   && [ ! -e "$S13B/develop-pipeline.precompact-claim.d" ] && grep -qF 'took over a stale claim' "$S13B/stderr.log"; then
  pass "claim held by a dead pid: taken over, the pause completes, the claim is released"
else
  fail "claim held by a dead pid is taken over" "out=$(head -c 200 <<<"$OUT") lock=$(cat "$S13B/develop-pipeline.lock") stderr=$(cat "$S13B/stderr.log")"
fi
S13C="$TMPDIR_TEST/s13c"; s13_lock "$S13C"
mkdir -p "$S13C/develop-pipeline.precompact-claim.d"; printf '%s\n' "$$" > "$S13C/develop-pipeline.precompact-claim.d/pid"
LOCK_BEFORE=$(cat "$S13C/develop-pipeline.lock")
OUT=$(PIPELINE_LOCK="$S13C/develop-pipeline.lock" "$BASH_BIN" "$HOOK" 2>/dev/null)
if grep -qF '"additionalContext":""' <<<"$OUT" && [ "$(cat "$S13C/develop-pipeline.lock")" = "$LOCK_BEFORE" ] \
   && [ ! -e "$S13C/develop-pipeline.last-halt.json" ] && [ "$(cat "$S13C/develop-pipeline.precompact-claim.d/pid")" = "$$" ]; then
  pass "claim held by a live pid: run turned away — empty signal, lock untouched, no snapshot, the holder's claim kept"
else
  fail "claim held by a live pid turns the run away" "out=$OUT lock=$(cat "$S13C/develop-pipeline.lock") files=$(ls -A "$S13C")"
fi
S13D="$TMPDIR_TEST/s13d"; s13_lock "$S13D"
mkdir -p "$S13D/develop-pipeline.precompact-claim.d"; touch -t 202001010000 "$S13D/develop-pipeline.precompact-claim.d"
OUT=$(PIPELINE_LOCK="$S13D/develop-pipeline.lock" "$BASH_BIN" "$HOOK" 2>/dev/null)
if grep -qF 'PIPELINE-PAUSE-SIGNAL' <<<"$OUT" && [ "$(jq -r '.paused.step' "$S13D/develop-pipeline.lock")" = "4" ] \
   && [ ! -e "$S13D/develop-pipeline.precompact-claim.d" ]; then
  pass "claim with no pid, older than a minute: taken over, the pause completes"
else
  fail "claim with no pid and an old mtime is taken over" "out=$(head -c 200 <<<"$OUT") files=$(ls -A "$S13D")"
fi

# ── Scenario 14 (task.120): marker → a repeat pause at the same step is an edit ─
# A `gh` shim variant that answers `pr view --json comments` with one existing
# comment whose body starts with the Step-4 marker. The hook must PATCH that
# comment by id, not `pr comment` a second one.
SHIM2_BIN="$TMPDIR_TEST/shim2-bin"
mkdir -p "$SHIM2_BIN"
cp "$SHIM_BIN/git" "$SHIM2_BIN/git"
cat > "$SHIM2_BIN/gh" <<'SHIM'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$GH_LOG"
case "$1 $2" in
  "auth status") exit 0 ;;
  "repo view") case "$*" in *nameWithOwner*) echo "o/r" ;; *) echo "o/r" ;; esac; exit 0 ;;
  "api --paginate") exit 0 ;;
  "pr view")
    # The jq filter the hook passes selects on startswith(marker); emulate it by
    # answering with the URL only when the requested marker is the seeded one.
    case "$*" in
      *"pipeline-paused-4"*) echo "https://github.com/o/r/pull/7#issuecomment-31337" ;;
    esac
    exit 0 ;;
esac
for a in "$@"; do
  if [ "$a" = "-" ]; then
    n=$(ls "$GH_STDIN_DIR" 2>/dev/null | wc -l | tr -d ' ')
    cat > "$GH_STDIN_DIR/$((n + 1))"
  fi
done
exit 0
SHIM
chmod +x "$SHIM2_BIN/gh"
S14="$TMPDIR_TEST/s14"
SHIM_SAVED="$SHIM_BIN"; SHIM_BIN="$SHIM2_BIN"
OUT=$(run_hook_in_consumer "$S14" "")
RC=$?
SHIM_BIN="$SHIM_SAVED"
PATCH_LINE=$(grep -E '^api -X PATCH /repos/o/r/issues/comments/31337 ' "$S14/gh.log")
if [ "$RC" -ne 0 ]; then
  fail "marker edit: hook exits 0" "rc=$RC"
elif grep -qE '^pr comment ' "$S14/gh.log"; then
  fail "marker edit: no second pr comment when a marked one exists" "$(grep -E '^pr comment' "$S14/gh.log")"
elif [ -z "$PATCH_LINE" ]; then
  fail "marker edit: existing comment PATCHed by id" "gh.log: $(cat "$S14/gh.log")"
elif ! grep -qF -- '-F body=@' <<<"$PATCH_LINE"; then
  fail "marker edit: PATCH body travels by file, not inline" "$PATCH_LINE"
elif ! grep -qF 'PR comment: updated in place' <<<"$OUT"; then
  fail "marker edit: signal reports the update, not a post" "$(grep -o 'PR comment: .*' <<<"$OUT" | head -1)"
else
  pass "marker edit: a marked Step-4 comment already on the PR is PATCHed in place; no second pr comment; signal says 'updated in place'"
fi

# ── Scenario 15: a SIGKILLed hook leaves the lock, and the next pause recovers ─
# Under the task.120 claim (an mv of the lock) a kill between the claim and the
# snapshot left NEITHER the lock nor last-halt.json — only an orphaned `.pausing.*`
# copy. The hook now never moves the lock, so a kill at the same point must leave
# the lock in place with its full state, and only the claim directory behind (the
# EXIT trap does not run on SIGKILL). The next pause must take that claim over.
#
# The point is entered deterministically: a legacy claim makes the sweep call `rm`,
# and a shim `rm` on PATH sleeps, so the hook is parked just after its claim and
# before its snapshot while the test kills it.
S15="$TMPDIR_TEST/s15"
mkdir -p "$S15/sleepy-bin"
cat > "$S15/sleepy-bin/rm" <<'SHIM'
#!/usr/bin/env bash
# Park here so the test can kill the hook mid-window; then do nothing.
sleep 5
SHIM
chmod +x "$S15/sleepy-bin/rm"
LOCK15="$S15/develop-pipeline.lock"
printf '{"skill":"develop-task","current_step":6,"branch":"feature/x","report_path":"","pr_url":"","tracker":"github","tracker_issue":"42"}\n' > "$LOCK15"
printf '{"skill":"develop-task","current_step":2}\n' > "$LOCK15.pausing.11111"   # the stale claim that routes the sweep through rm
LOCK15_BEFORE=$(cat "$LOCK15")
CLAIM15="$S15/develop-pipeline.precompact-claim.d"
PATH="$S15/sleepy-bin:$PATH" PIPELINE_LOCK="$LOCK15" "$BASH_BIN" "$HOOK" >/dev/null 2>&1 &
HOOK_PID=$!
# Wait until the hook holds its claim — i.e. it is past the mkdir, parked in the sweep.
for _ in $(seq 1 50); do [ -f "$CLAIM15/pid" ] && break; sleep 0.1; done
sleep 0.2
kill -9 "$HOOK_PID" 2>/dev/null; wait "$HOOK_PID" 2>/dev/null
pkill -9 -f "$S15/sleepy-bin/rm" 2>/dev/null; sleep 0.2
if [ ! -f "$CLAIM15/pid" ]; then
  fail "kill mid-flow: the hook held its claim when killed" "no claim on disk — the kill landed before the claim; test did not reach the window"
elif [ -f "$S15/develop-pipeline.last-halt.json" ]; then
  fail "kill mid-flow: no snapshot yet (the kill landed before it)" "snapshot exists — the kill landed later than intended"
elif [ "$(cat "$LOCK15" 2>/dev/null)" != "$LOCK15_BEFORE" ]; then
  fail "kill mid-flow: the lock is still there with its full state" "$(cat "$LOCK15" 2>/dev/null || echo 'lock absent')"
else
  pass "kill mid-flow (after the claim, before the snapshot): the lock is untouched with its full state (current_step=6); only the claim is left behind"
fi
# The next pause takes the dead hook's claim over and completes.
OUT=$(PIPELINE_LOCK="$LOCK15" "$BASH_BIN" "$HOOK" 2>/dev/null)
if grep -qF 'PIPELINE-PAUSE-SIGNAL' <<<"$OUT" && [ "$(jq -r '.paused.step' "$LOCK15")" = "6" ] \
   && [ "$(jq -r '.halt_step' "$S15/develop-pipeline.last-halt.json" 2>/dev/null)" = "6" ] && [ ! -e "$CLAIM15" ]; then
  pass "after a killed pause: the next pause takes the stale claim over, snapshots step 6, marks the lock, releases the claim"
else
  fail "after a killed pause, the next pause completes" "out=$(head -c 200 <<<"$OUT") files=$(ls -A "$S15")"
fi

# ── Scenario 16: report-lint gates the pause commit (task.124) ───────────────
# Real git this time (the shim is removed for the scenario), so "committed" means a
# commit object exists. `git push` fails harmlessly (no remote) — it is best-effort.
rm -f "$SHIM_BIN/git"
run_precompact_in_repo() { # $1 = dir, $2 = report body file, $3 = optional sibling path to leave STAGED
  local dir="$1"
  mkdir -p "$dir/.claude/state" "$dir/stdin" "$dir/docs/tasks/task.42.x"
  ( cd "$dir" && git init -q && git config user.email t@t && git config user.name t && git config commit.gpgsign false ) >/dev/null 2>&1
  local rp="${HOOK_TEST_REPORT_PATH:-report.md}" # the report's repo-relative path
  cp "$2" "$dir/$rp"
  ( cd "$dir" && git add -- "$rp" && git commit -qm init ) >/dev/null 2>&1
  if [ -n "${HOOK_TEST_REMOTE:-}" ]; then # a bare origin the branch tracks, so a push is observable
    git init -q --bare "$dir.origin.git" >/dev/null 2>&1
    ( cd "$dir" && git remote add origin "$dir.origin.git" && git push -q -u origin HEAD ) >/dev/null 2>&1
  fi
  if [ -n "${3:-}" ]; then
    printf 'staged by 5c\n' > "$dir/$3"
    ( cd "$dir" && git add -- "$3" ) >/dev/null 2>&1
  fi
  printf '{"skill":"develop-task","current_step":5,"branch":"feature/x","report_path":"%s","task_or_story_directory":"docs/tasks/task.42.x","pr_url":"","tracker":"","tracker_issue":""}\n' "$rp" \
    > "$dir/.claude/state/develop-pipeline.lock"
  (cd "$dir" && PATH="$SHIM_BIN:$PATH" GH_LOG="$dir/gh.log" GH_STDIN_DIR="$dir/stdin" \
     PIPELINE_LOCK="$dir/.claude/state/develop-pipeline.lock" \
     "$BASH_BIN" "$HOOK" 2>"$dir/stderr.log")
}
GREEN_REPORT="$(cd "$(dirname "$0")" && pwd)/tests/fixtures/report-lint/green/task.123.md"
CORRUPT_REPORT="$(cd "$(dirname "$0")" && pwd)/tests/fixtures/report-lint/corrupt-task117.md"
S16A="$TMPDIR_TEST/s16a"
OUT=$(run_precompact_in_repo "$S16A" "$GREEN_REPORT")
if [ "$(cd "$S16A" && git rev-list --count HEAD)" = "2" ] && grep -q '^## Pipeline Paused' "$S16A/report.md" \
   && echo "$OUT" | grep -q 'committed, and pushed' && ! echo "$OUT" | grep -q 'NOT committed'; then
  pass "lint ok: pause entry appended AND committed; signal says committed"
else
  fail "lint ok → committed" "commits=$(cd "$S16A" && git rev-list --count HEAD) stderr=$(cat "$S16A/stderr.log" | head -3) out=$(echo "$OUT" | grep -o 'Implementation report appended[^\\]*' | head -1)"
fi
if echo "$OUT" | grep -q 'advance-pipeline-lock.sh 5' && echo "$OUT" | grep -q 'advance-pipeline-lock.sh --restore docs/tasks/task.42.x' \
   && ! echo "$OUT" | grep -q 'The lock is gone'; then
  pass "signal names the in-session continuation (advance-pipeline-lock.sh 5) and --restore <doc-dir>, and no longer says the lock is gone"
else
  fail "signal names the in-session continuation" "$(echo "$OUT" | grep -o 'advance-pipeline-lock[^\\]*' | head -3)"
fi
S16B="$TMPDIR_TEST/s16b"
OUT=$(run_precompact_in_repo "$S16B" "$CORRUPT_REPORT")
if [ "$(cd "$S16B" && git rev-list --count HEAD)" = "1" ] && grep -q '^## Pipeline Paused' "$S16B/report.md" \
   && echo "$OUT" | grep -q 'NOT committed' && grep -q 'report failed lint' "$S16B/stderr.log" \
   && [ -f "$S16B/.claude/state/develop-pipeline.last-halt.json" ] \
   && [ "$(jq -r '.paused.step' "$S16B/.claude/state/develop-pipeline.lock" 2>/dev/null)" = "5" ]; then
  pass "lint fails: pause entry appended but NOT committed; signal and stderr say so; snapshot written, lock kept and marked"
else
  fail "lint fails → not committed" "commits=$(cd "$S16B" && git rev-list --count HEAD) stderr=$(head -2 "$S16B/stderr.log") signal=$(echo "$OUT" | grep -o 'Implementation report appended[^\\]*' | head -1)"
fi

# ── Scenario 17: the pause commit carries the report ONLY (task.173) ─────────
# 5c stages its PR review report (and any doc-only fixes) for /finalise 6a to carry.
# A pause between 5c and 6a must not sweep them into a "pipeline paused" commit:
# the commit names the report, and the sibling is still staged afterwards.
S17="$TMPDIR_TEST/s17"
SIBLING="docs/tasks/task.42.x/task.42.pr-review.1.x.md"
OUT=$(run_precompact_in_repo "$S17" "$GREEN_REPORT" "$SIBLING")
S17_FILES=$(cd "$S17" && git show --name-only --format= HEAD)
S17_STATUS=$(cd "$S17" && git status --porcelain -- "$SIBLING")
if [ "$(cd "$S17" && git rev-list --count HEAD)" = "2" ] && [ "$S17_FILES" = "report.md" ] \
   && [ "$S17_STATUS" = "A  $SIBLING" ]; then
  pass "staged 5c sibling: the pause commit carries report.md only, and the sibling stays staged for 6a"
else
  fail "pause commit is path-limited" "commits=$(cd "$S17" && git rev-list --count HEAD) files=[$S17_FILES] status=[$S17_STATUS]"
fi

# ── Scenario 17b: a report linking into the staged carry is committed, NOT pushed ─
# tinker-city PR #1223: a pause at step 7 pushed a report whose QA-cycle entry linked to
# the PR review report 5c had staged for 6a; the pushed head had a dangling link and
# docs-lint went red. The commit must stay local and the signal must say so. 17c is the
# control: a report whose links are all in the commit is pushed, so the fixture's push
# is observable and 17b's "not pushed" is the hold, not a broken remote. As in the
# consumer, 17b's report sits in the work-item directory and links `./` to its sibling,
# so the link resolves against the report's directory, not the repo root.
origin_tip() { # $1 = scenario dir: the one branch tip its bare origin holds
  git --git-dir="$1.origin.git" for-each-ref --format='%(objectname)' refs/heads/ | head -1
}
S17B="$TMPDIR_TEST/s17b"
LINKED_REPORT="$TMPDIR_TEST/linked-report.md"
cp "$GREEN_REPORT" "$LINKED_REPORT"
printf '\nQA cycle 3 review: [PR review](./%s).\n' "${SIBLING##*/}" >> "$LINKED_REPORT"
OUT=$(HOOK_TEST_REMOTE=1 HOOK_TEST_REPORT_PATH=docs/tasks/task.42.x/task.42.implementation.1.x.md \
  run_precompact_in_repo "$S17B" "$LINKED_REPORT" "$SIBLING")
S17B_LOCAL=$(cd "$S17B" && git rev-parse HEAD)
S17B_REMOTE=$(origin_tip "$S17B")
if [ "$(cd "$S17B" && git rev-list --count HEAD)" != "2" ]; then
  fail "carry link: the pause is still committed locally" "commits=$(cd "$S17B" && git rev-list --count HEAD) stderr=$(head -3 "$S17B/stderr.log")"
elif [ -z "$S17B_REMOTE" ] || [ "$S17B_LOCAL" = "$S17B_REMOTE" ]; then
  fail "carry link: the pause commit is NOT pushed" "local=$S17B_LOCAL upstream=${S17B_REMOTE:-none}"
elif ! grep -qF 'NOT pushed' <<<"$OUT" || ! grep -qF "./${SIBLING##*/}" <<<"$OUT" \
     || ! grep -qF 'NOT pushed' "$S17B/stderr.log"; then
  fail "carry link: signal and stderr say the push was held and name the link" "signal=$(echo "$OUT" | grep -o 'Implementation report appended[^\\]*' | head -1)"
else
  pass "report links into the staged carry: pause committed locally, NOT pushed; signal and stderr name the link"
fi
S17C="$TMPDIR_TEST/s17c"
SELF_LINKED="$TMPDIR_TEST/self-linked-report.md"
cp "$GREEN_REPORT" "$SELF_LINKED"
printf '\nSee [this report](report.md#pipeline-progress) and [the site](https://example.com/x).\n' >> "$SELF_LINKED"
OUT=$(HOOK_TEST_REMOTE=1 run_precompact_in_repo "$S17C" "$SELF_LINKED")
if [ "$(cd "$S17C" && git rev-list --count HEAD)" = "2" ] \
   && [ "$(cd "$S17C" && git rev-parse HEAD)" = "$(origin_tip "$S17C")" ] \
   && ! grep -qF 'NOT pushed' <<<"$OUT"; then
  pass "control: a report whose links are all in the commit is committed AND pushed"
else
  fail "control: links all carried → pushed" "commits=$(cd "$S17C" && git rev-list --count HEAD) local=$(cd "$S17C" && git rev-parse HEAD) origin=$(origin_tip "$S17C") stderr=$(head -3 "$S17C/stderr.log")"
fi

# 17e: a link whose target is in neither HEAD nor the index — quoted inside inline code,
# as two real tinker-city reports do (`[y](z)`) — must not hold the push: no later
# commit would carry it, so the hold would never end.
S17E="$TMPDIR_TEST/s17e"
QUOTED_LINK="$TMPDIR_TEST/quoted-link-report.md"
cp "$GREEN_REPORT" "$QUOTED_LINK"
printf '\nThe escaper handles `[y](z)` and `[t](task….md)`.\n' >> "$QUOTED_LINK"
OUT=$(HOOK_TEST_REMOTE=1 run_precompact_in_repo "$S17E" "$QUOTED_LINK")
if [ "$(cd "$S17E" && git rev-list --count HEAD)" = "2" ] \
   && [ "$(cd "$S17E" && git rev-parse HEAD)" = "$(origin_tip "$S17E")" ] \
   && ! grep -qF 'NOT pushed' <<<"$OUT"; then
  pass "a link to a path neither committed nor staged (quoted in code) does not hold the push"
else
  fail "unstaged, uncommitted link target → still pushed" "commits=$(cd "$S17E" && git rev-list --count HEAD) local=$(cd "$S17E" && git rev-parse HEAD) origin=$(origin_tip "$S17E") stderr=$(head -3 "$S17E/stderr.log")"
fi

# ── Scenario 17d: a run never releases a claim another run now holds ─────────
# If another run holds the claim by the time this one exits (it took the claim over
# while this one was still pausing), the EXIT trap must leave it: freeing it would let
# a third run pause alongside the holder. The precompact-claim-thief `git` stand-in
# rewrites the claim's pid to a live process at the pause commit.
S17D="$TMPDIR_TEST/s17d"
mkdir -p "$S17D/.claude/state" "$THIEF_BIN"
cp "$THIEF" "$THIEF_BIN/git"; chmod +x "$THIEF_BIN/git"
cp "$GREEN_REPORT" "$S17D/report.md"
printf '{"skill":"develop-task","current_step":5,"branch":"feature/x","report_path":"report.md"}\n' \
  > "$S17D/.claude/state/develop-pipeline.lock"
sleep 60 & LIVE17D=$!
OUT=$(cd "$S17D" && PATH="$THIEF_BIN:$PATH" REAL_MV="$REAL_MV_BIN" THIEF_PID="$LIVE17D" \
  THIEF_MARK="$S17D/thief.mark" THIEF_CLAIM_DIR="$S17D/.claude/state/develop-pipeline.precompact-claim.d" \
  PIPELINE_LOCK="$S17D/.claude/state/develop-pipeline.lock" "$BASH_BIN" "$HOOK" 2>/dev/null)
S17D_CLAIM=$(cat "$S17D/.claude/state/develop-pipeline.precompact-claim.d/pid" 2>/dev/null)
kill "$LIVE17D" 2>/dev/null; wait "$LIVE17D" 2>/dev/null
rm -f "$THIEF_BIN/git"
if [ ! -e "$S17D/thief.mark" ]; then
  fail "claim held by another run at exit: the thief fired (fixture check)" "no pause commit was attempted"
elif [ "$S17D_CLAIM" != "$LIVE17D" ]; then
  fail "claim held by another run at exit: left in place" "claim pid=${S17D_CLAIM:-removed} (want $LIVE17D)"
else
  pass "a run's EXIT trap releases only its own claim, never one another run holds"
fi

# ── Scenario 18: a second compaction with no lock write since the first ──────
# Every lock writer clears the mark, so a lock still marked means nothing happened
# since the last pause: no second report block, no second commit, no gh call.
S18="$TMPDIR_TEST/s18"
OUT=$(run_precompact_in_repo "$S18" "$GREEN_REPORT")
COMMITS_1=$(cd "$S18" && git rev-list --count HEAD)
BLOCKS_1=$(grep -c '^## Pipeline Paused' "$S18/report.md")
OUT2=$(cd "$S18" && PATH="$SHIM_BIN:$PATH" GH_LOG="$S18/gh.log" GH_STDIN_DIR="$S18/stdin" \
  PIPELINE_LOCK="$S18/.claude/state/develop-pipeline.lock" "$BASH_BIN" "$HOOK" 2>/dev/null)
if [ "$COMMITS_1" = "2" ] && [ "$(cd "$S18" && git rev-list --count HEAD)" = "2" ] \
   && [ "$(grep -c '^## Pipeline Paused' "$S18/report.md")" = "$BLOCKS_1" ] \
   && grep -qF 'PIPELINE-PAUSE-SIGNAL (repeat)' <<<"$OUT2" \
   && [ "$(jq -r '.paused.step' "$S18/.claude/state/develop-pipeline.lock")" = "5" ] \
   && [ "$(jq -r '.halt_step' "$S18/.claude/state/develop-pipeline.last-halt.json")" = "5" ]; then
  pass "repeat pause, nothing written since: no second report block or commit; repeat signal; lock still marked; snapshot kept"
else
  fail "repeat pause records nothing new" "commits=$COMMITS_1→$(cd "$S18" && git rev-list --count HEAD) blocks=$BLOCKS_1→$(grep -c '^## Pipeline Paused' "$S18/report.md") out2=$(head -c 160 <<<"$OUT2")"
fi
S18B="$TMPDIR_TEST/s18b"
OUT=$(run_hook_in_consumer "$S18B" "")
GH_1=$(grep -cE '^(pr|issue) comment ' "$S18B/gh.log")
OUT2=$(cd "$S18B" && PATH="$SHIM_BIN:$PATH" GH_LOG="$S18B/gh.log" GH_STDIN_DIR="$S18B/stdin" \
  PIPELINE_LOCK="$S18B/.claude/state/develop-pipeline.lock" \
  TRACKER_ACTIONS_JOURNAL="$S18B/.claude/state/tracker-actions.jsonl" "$BASH_BIN" "$HOOK" 2>/dev/null)
if [ "$GH_1" = "2" ] && [ "$(grep -cE '^(pr|issue) comment ' "$S18B/gh.log")" = "2" ] && grep -qF '(repeat)' <<<"$OUT2"; then
  pass "repeat pause, nothing written since: no second PR or issue comment call"
else
  fail "repeat pause posts no comment" "first=$GH_1 after=$(grep -cE '^(pr|issue) comment ' "$S18B/gh.log") gh.log=$(cat "$S18B/gh.log")"
fi

# ── Scenario 19: pause → in-session clear → pause again at the same step ─────
# The session carried on (advance-pipeline-lock.sh 5, the Stop hook's re-assert, cleared
# the mark), then compacted again at Step 5. The second pause runs in full — progress
# happened — but must post no second comment: the PR arm finds its marker and edits in
# place, the issue arm finds its marker and reports `already`. The gh stand-in keeps
# what it was asked to post, so the second run's reads see the first run's comments.
SHIM3_BIN="$TMPDIR_TEST/shim3-bin"
mkdir -p "$SHIM3_BIN"
cp "$(cd "$(dirname "$0")" && pwd)/tests/fixtures/precompact-gh-stateful.sh" "$SHIM3_BIN/gh"
chmod +x "$SHIM3_BIN/gh"
ADVANCE_SH="$(cd "$(dirname "$0")" && pwd)/advance-pipeline-lock.sh"
S19="$TMPDIR_TEST/s19"
export GH_STATE="$S19/gh-state"
SHIM_SAVED="$SHIM_BIN"; SHIM_BIN="$SHIM3_BIN"
OUT=$(HOOK_TEST_STEP=5 HOOK_TEST_DOC_DIR=docs/tasks/task.42.x run_hook_in_consumer "$S19" "")
SHIM_BIN="$SHIM_SAVED"
L19="$S19/.claude/state/develop-pipeline.lock"
MARKED_1=$(jq -r '.paused.step' "$L19" 2>/dev/null)
ADV_ERR=$(PIPELINE_LOCK="$L19" bash "$ADVANCE_SH" 5 2>&1 >/dev/null)
CLEARED=$(jq -r 'has("paused")' "$L19" 2>/dev/null)
SNAP_AFTER_CLEAR=$([ -f "$S19/.claude/state/develop-pipeline.last-halt.json" ] && echo present || echo consumed)
OUT2=$(cd "$S19" && PATH="$SHIM3_BIN:$PATH" GH_LOG="$S19/gh.log" GH_STDIN_DIR="$S19/stdin" PIPELINE_LOCK="$L19" \
  TRACKER_ACTIONS_JOURNAL="$S19/.claude/state/tracker-actions.jsonl" "$BASH_BIN" "$HOOK" 2>/dev/null)
unset GH_STATE
N_PR19=$(grep -cE '^pr comment ' "$S19/gh.log")
N_ISSUE19=$(grep -cE '^issue comment 42 ' "$S19/gh.log")
N_PATCH19=$(grep -cE '^api -X PATCH /repos/o/r/issues/comments/1 ' "$S19/gh.log")
if [ "$MARKED_1" != "5" ] || [ "$CLEARED" != "false" ] || [ "$SNAP_AFTER_CLEAR" != "consumed" ] || ! grep -qF 'paused mark cleared' <<<"$ADV_ERR"; then
  fail "in-session clear: advance-pipeline-lock.sh 5 (a no-op advance) clears the mark and consumes the pause snapshot" "marked=$MARKED_1 has_paused=$CLEARED snapshot=$SNAP_AFTER_CLEAR stderr=$ADV_ERR"
elif ! grep -qF 'PIPELINE-PAUSE-SIGNAL' <<<"$OUT2" || grep -qF '(repeat)' <<<"$OUT2"; then
  fail "second pause after a clear runs in full" "$(head -c 200 <<<"$OUT2")"
elif [ "$N_PR19" != "1" ] || [ "$N_ISSUE19" != "1" ] || [ "$N_PATCH19" != "1" ]; then
  fail "second pause at the same step posts no second comment" "pr comment=$N_PR19 issue comment=$N_ISSUE19 patch=$N_PATCH19; gh.log: $(cat "$S19/gh.log")"
elif ! grep -qF 'Tracker issue comment: already' <<<"$OUT2" || ! grep -qF 'PR comment: updated in place' <<<"$OUT2"; then
  fail "second pause reports already / updated in place" "$(grep -oE '(PR|Tracker issue) comment: [^\\]*' <<<"$OUT2" | head -2)"
elif [ "$(jq -r '.paused.step' "$L19")" != "5" ]; then
  fail "second pause marks the lock again" "$(cat "$L19")"
else
  pass "pause → in-session clear → pause at the same step: one PR comment (then edited in place), one issue comment (then 'already'); the lock is marked again"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
undefined_commands_check || FAIL=$((FAIL + 1))
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
