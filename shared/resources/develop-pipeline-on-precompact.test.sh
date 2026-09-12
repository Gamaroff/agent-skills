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

PASS=0
FAIL=0
HOOK="$(cd "$(dirname "$0")" && pwd)/develop-pipeline-on-precompact.sh"
# Absolute bash path — Scenario 1 runs the hook under a restricted PATH (jq absent);
# an inline `PATH=… bash` prefix would also strip `bash` itself from lookup (rc=127).
BASH_BIN="$(command -v bash)"

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

OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$HOOK" 2>/dev/null)
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

OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$HOOK" 2>/dev/null)
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
  local dir="$1" access="$2"
  mkdir -p "$dir/.claude/state" "$dir/stdin"
  [ -n "$access" ] && printf 'access:\n  tracker: %s\n' "$access" > "$dir/skills-config.yaml"
  printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":"","pr_url":"https://github.com/o/r/pull/7","tracker":"github","tracker_issue":"42"}\n' \
    > "$dir/.claude/state/develop-pipeline.lock"
  : > "$dir/gh.log"
  (cd "$dir" && PATH="$SHIM_BIN:$PATH" GH_LOG="$dir/gh.log" GH_STDIN_DIR="$dir/stdin" \
     PIPELINE_LOCK="$dir/.claude/state/develop-pipeline.lock" \
     TRACKER_ACTIONS_JOURNAL="$dir/.claude/state/tracker-actions.jsonl" \
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

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
