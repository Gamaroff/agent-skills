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
#  12. (task.120) two CONCURRENT invocations against one lock → exactly one snapshot,
#      one report block, one PR-comment call, one issue-comment call; both exit 0,
#      and exactly one of the two emits the pause signal (the other the empty one).
#  13. (task.120) a stale `.pausing.*` claim from a killed run neither blocks a fresh
#      pause nor survives it.
#  14. (task.120) the PR comment opens with the `agent-skills-comment:pipeline-paused-<step>`
#      marker, and when a comment with that marker already exists on the PR the hook
#      PATCHes it in place instead of posting a second one.
#  15. (task.120 CR-1 / bug.2) a kill between the claim and the snapshot leaves the
#      full state in the orphaned claim file — what the resume detector's fallback reads.

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
# `mv` is here because the claim (task.120) is an mv; without it the degraded
# path could not even claim the lock and would take the noop exit.
for tool in dirname cp date rm cat mkdir mv; do
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

# ── Scenario 12 (task.120): two concurrent runs → one of everything ──────────
# The task.110 failure: the host fired the hook twice in parallel (one settings
# file, two spellings of the same command) and both runs passed `[ -f "$LOCK" ]`.
# With the atomic claim exactly one run owns the lock. A report file is present
# here so the appended block is counted too; `git` is shimmed to a noop so the
# best-effort commit neither needs a repo nor touches this one — and it SLEEPS,
# so the first run is provably still inside its pause flow when the second
# starts. Without that the two could serialise, and the pre-claim hook (which
# removed the lock only at the very end) would pass this scenario by luck.
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
N_CLAIMS=$(ls "$S12/.claude/state/"develop-pipeline.lock.pausing.* 2>/dev/null | wc -l | tr -d ' ')
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
elif [ "$N_SIGNAL" != "1" ] || [ "$N_EMPTY" != "1" ]; then
  fail "concurrent: one run emits the pause signal, the other the empty signal" "signals=$N_SIGNAL empties=$N_EMPTY"
elif [ -f "$S12/.claude/state/develop-pipeline.lock" ] || [ "$N_CLAIMS" != "0" ]; then
  fail "concurrent: no lock and no claim file left behind" "$(ls "$S12/.claude/state")"
else
  pass "concurrent (2 runs, 1 lock): one snapshot, one report block, one PR call, one issue call; loser exits 0 with the empty signal; nothing left behind"
fi

# ── Scenario 13 (task.120): a stale claim from a killed run is swept, not fatal ─
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
elif ls "$S13"/develop-pipeline.lock* >/dev/null 2>&1; then
  fail "stale claim: no lock or claim left behind" "$(ls "$S13")"
else
  pass "stale claim (.pausing.99999): fresh pause completes from the live lock and the stale file is gone"
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

# ── Scenario 15 (task.120 CR-1 / bug.2): a kill between the claim and the snapshot ─
# The claim renames the lock BEFORE the snapshot is written. A harness kill in
# that window leaves neither the lock nor last-halt.json; the only copy of the
# pipeline's state is the claimed file, which the Phase 0a resume detector reads
# as its last fallback. This proves the state is actually there, byte for byte,
# rather than lost — the property the detector's fallback depends on.
#
# The window is entered deterministically: a stale claim makes the sweep call
# `rm`, and a shim `rm` on PATH sleeps, so the hook is parked between its claim
# and its snapshot while the test kills it.
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
PATH="$S15/sleepy-bin:$PATH" PIPELINE_LOCK="$LOCK15" "$BASH_BIN" "$HOOK" >/dev/null 2>&1 &
HOOK_PID=$!
# Wait until the hook has claimed (lock gone) — i.e. it is inside the window.
for _ in $(seq 1 50); do [ -f "$LOCK15" ] || break; sleep 0.1; done
kill -9 "$HOOK_PID" 2>/dev/null; wait "$HOOK_PID" 2>/dev/null
pkill -9 -f "$S15/sleepy-bin/rm" 2>/dev/null; sleep 0.2
CLAIMS15=""
for c in "$LOCK15".pausing.*; do
  [ -f "$c" ] || continue
  case "$c" in *pausing.11111) continue ;; esac
  CLAIMS15="${CLAIMS15:+$CLAIMS15
}$c"
done
if [ -f "$LOCK15" ]; then
  fail "kill in window: the hook had claimed the lock before being killed" "lock still present — the kill landed before the claim; test did not reach the window"
elif [ -f "$S15/develop-pipeline.last-halt.json" ]; then
  fail "kill in window: no snapshot yet (the kill landed inside the window)" "snapshot exists — kill landed after the window"
elif [ "$(printf '%s\n' "$CLAIMS15" | grep -c .)" != "1" ]; then
  fail "kill in window: exactly one orphaned claim survives" "claims: $CLAIMS15"
elif [ "$(jq -r '.current_step' "$CLAIMS15")" != "6" ] || [ "$(jq -r '.tracker_issue' "$CLAIMS15")" != "42" ]; then
  fail "kill in window: the orphaned claim carries the lock's full state" "$(cat "$CLAIMS15")"
else
  pass "kill in window (claim → snapshot): lock and snapshot both absent, the orphaned claim carries the full state (current_step=6) for the resume detector's fallback"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
