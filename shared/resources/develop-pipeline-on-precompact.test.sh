#!/usr/bin/env bash
# develop-pipeline-on-precompact.test.sh — regression tests for develop-pipeline-on-precompact.sh
#
# Usage: bash shared/resources/develop-pipeline-on-precompact.test.sh
#
# Focus: the snapshot-before-removal guarantee. The hook removes the pipeline lock
# on every exit path (EXIT trap). A harness kill before the graceful-pause flow
# completes must STILL leave a develop-pipeline.last-halt.json resume snapshot, so
# the next /develop-task invocation can resume via Phase 0b instead of finding the
# pipeline both unlocked and un-resumable.
#
# Covers:
#   1. Mid-run kill (jq forced absent) → lock removed BUT snapshot exists,
#      current_step preserved (deterministic stand-in for a SIGTERM mid-flow).
#   2. Success path → snapshot has pause_reason "precompact" + halt_step == current_step,
#      lock removed, PIPELINE-PAUSE-SIGNAL emitted.
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

PASS=0
FAIL=0
HOOK="$(cd "$(dirname "$0")" && pwd)/develop-pipeline-on-precompact.sh"
# Absolute bash path — Scenario 1 runs the hook under a restricted PATH (jq absent);
# an inline `PATH=… bash` prefix would also strip `bash` itself from lookup (rc=127).
BASH_BIN="${HOOK_TEST_BASH:-$(command -v bash)}"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# ── Scenario 1: mid-run kill simulated via jq-absent degraded path ───────────
# A restricted PATH containing the coreutils the degraded path needs but NOT jq.
# This forces `command -v jq` to fail regardless of where jq is installed, so the
# hook takes its early degraded exit: write_pause_snapshot falls back to `cp`, then
# the EXIT trap removes the lock. Equivalent to the harness killing the hook before
# it finishes the rich pause flow.
NOJQ_BIN="$TMPDIR_TEST/nojq-bin"
mkdir -p "$NOJQ_BIN"
for tool in dirname cp date rm cat mkdir; do
  src=$(command -v "$tool" 2>/dev/null) && [ -n "$src" ] && ln -sf "$src" "$NOJQ_BIN/$tool"
done

LOCK_FILE="$TMPDIR_TEST/s1/develop-pipeline.lock"
SNAP_FILE="$TMPDIR_TEST/s1/develop-pipeline.last-halt.json"
mkdir -p "$TMPDIR_TEST/s1"
printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":""}\n' > "$LOCK_FILE"

PATH="$NOJQ_BIN" PIPELINE_LOCK="$LOCK_FILE" "$BASH_BIN" "$HOOK" >/dev/null 2>&1
if [ -f "$LOCK_FILE" ]; then
  fail "mid-run kill (jq absent) removes lock" "lock file still exists"
elif [ ! -f "$SNAP_FILE" ]; then
  fail "mid-run kill (jq absent) leaves snapshot" "snapshot was not written"
else
  GOT_STEP=$(jq -r '.current_step' "$SNAP_FILE" 2>/dev/null)
  if [ "$GOT_STEP" = "4" ]; then
    pass "mid-run kill (jq absent): lock removed, snapshot preserves current_step=4"
  else
    fail "mid-run kill (jq absent) preserves current_step" "expected 4, got '$GOT_STEP'"
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
if [ -f "$LOCK_FILE" ]; then
  fail "success path removes lock" "lock file still exists"
elif [ ! -f "$SNAP_FILE" ]; then
  fail "success path leaves snapshot" "snapshot was not written"
else
  REASON=$(jq -r '.pause_reason' "$SNAP_FILE" 2>/dev/null)
  HALT_STEP=$(jq -r '.halt_step' "$SNAP_FILE" 2>/dev/null)
  PAUSED_AT=$(jq -r '.paused_at' "$SNAP_FILE" 2>/dev/null)
  if [ "$REASON" != "precompact" ]; then
    fail "success path tags pause_reason" "expected 'precompact', got '$REASON'"
  elif [ "$HALT_STEP" != "4" ]; then
    fail "success path aliases halt_step=current_step" "expected 4, got '$HALT_STEP'"
  elif [ -z "$PAUSED_AT" ] || [ "$PAUSED_AT" = "null" ]; then
    fail "success path stamps paused_at" "paused_at missing"
  elif ! grep -qF "PIPELINE-PAUSE-SIGNAL" <<<"$OUT"; then
    fail "success path emits PIPELINE-PAUSE-SIGNAL" "signal absent from stdout (rc=$RC)"
  else
    pass "success path: snapshot tagged (pause_reason=precompact, halt_step=4), lock removed, signal emitted"
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
  printf '{"skill":"develop-task","current_step":%s,"branch":"feature/x","report_path":"","pr_url":"%s","tracker":"github","tracker_issue":"42"}\n' "${HOOK_TEST_STEP:-4}" "$pr_url" \
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
elif ! head -1 "$PR_FILE" | grep -qF 'paused'; then
  fail "full: PR comment opens with the plain-language lead" "$(head -3 "$PR_FILE")"
elif ! grep -qF 'Pipeline paused' "$PR_FILE"; then
  fail "full: PR comment still carries the developer body" "$(cat "$PR_FILE")"
else
  pass "full: issue comment via tracker-comment.js (marker + lead, --body-file -); PR comment leads with the plain-language paragraph via --body-file"
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
elif [ -f "$S6/.claude/state/develop-pipeline.lock" ]; then
  fail "resolver missing: lock still removed" "lock present"
else
  pass "resolver missing: PR comment skipped (fail closed), lock removed, signal emitted"
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

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
