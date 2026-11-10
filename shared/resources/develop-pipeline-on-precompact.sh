#!/usr/bin/env bash
# on-precompact.sh — PreCompact hook for /develop-task and /develop-story pipelines.
#
# Runs when Claude Code is about to compact the conversation. If a develop-task
# or develop-story pipeline is active (lock file present), this hook:
#   0. Writes a develop-pipeline.last-halt.json resume snapshot (a lock superset,
#      pause_reason: "precompact") BEFORE it marks the lock, so even a hook run killed
#      mid-flow by the harness (SIGTERM/timeout) leaves recoverable resume state for
#      the Phase 0b resume detector
#   1. Appends a "Paused — Context Compaction" entry to the implementation report
#   2. Commits the report and pushes to remote (best-effort) — the push is held when
#      the report links to a path staged but not in the commit (a 5c carry)
#   3. Posts a pause comment to the PR (best-effort) — through the access gate
#      (`tracker_write`), opening with the plain-language lead for the
#      `pipeline-paused` stage, body carried by --body-file
#   4. Posts a pause comment to the tracker issue (best-effort) — ONE
#      tracker-comment.js call, which resolves the tracker itself, renders the
#      same lead, carries the idempotency marker, and honours the access gate
#   5. KEEPS the lock and marks it paused: `paused: {at, step, reason: "precompact"}`
#   6. Emits a PIPELINE-PAUSE-SIGNAL via additionalContext so the agent halts cleanly
#
# The lock is kept, not removed. Claude Code continues the SAME session after a
# compaction, with a summary, and a removed lock left that session with no lock:
# set-waiting-on.sh, set-qa-phase.sh and the Stop hook were inert, and the agent had
# to run `advance-pipeline-lock.sh --restore` by hand — three times in one consumer
# run on 2026-11-10. The mark is what the removal used to say ("this run paused"),
# without taking the lock away. Its readers:
#   • the Stop hook allows a stop while the mark is set, so the halt this signal asks
#     for is not fought — the same pass-through a removed lock gave;
#   • every lock writer clears it — advance-pipeline-lock.sh (numeric, --skill,
#     --restore, --clear-pause), set-qa-phase.sh, set-waiting-on.sh — so the first
#     pipeline call of a session that carries on re-arms the Stop hook with no
#     recovery step; clearing also consumes this pause's snapshot;
#   • a FRESH session reads the lock (the detector's `source: lock`), surfaces the
#     pause, and `--restore <doc-dir>` clears the mark in place.
#
# The hook CLAIMS the pause before any of that (task.120): an atomic `mkdir` of a
# claim directory beside the lock, so N concurrent invocations — a host that
# registered the hook twice, say — produce exactly one of everything, and the
# losers exit 0 with the empty signal. (Until 2026-11 the claim was an `mv` of the
# lock itself to `.pausing.<pid>`, which is what removed it.) A run that finds the
# lock ALREADY marked paused records nothing new: no lock writer ran since that
# pause, so there is no progress to report — it refreshes the snapshot and emits
# the signal again. The PR comment carries the same idempotency marker family as
# the issue comment and is updated in place on a repeat pause at the same step.
#
# Both tracker writes go through the contract (bug.14). Before that fix they were
# bare `gh … comment --body "…"` calls: no lead, no marker, and — the part that
# mattered — no access gate, so a consumer that had declared
# `access.tracker: read-only` still got a write from the one caller no prose
# step sits behind. Both arms now FAIL CLOSED: if the sibling engine cannot be
# found or sourced, the comment is skipped and said so in the signal — never
# posted bare as a fallback.
#
# Jira: the issue comment reaches Jira when JIRA_URL / JIRA_API_TOKEN /
# JIRA_USER_EMAIL are in the hook's environment (or a .env the engine reads);
# without them the engine reports `no-credentials` and the pause is silent on
# the Jira side. The PR comment is GitHub-only (`gh`), as before.
#
# Sibling engines this hook runs — spelled out as shared-resources paths so the
# bundler ships them beside the hook (its shell rule follows `source`/`exec`
# of a sibling .sh, not `node "$dir/x.js"`):
#   shared/resources/resolve-platform.sh        (tracker_write + ACCESS_TRACKER)
#   shared/resources/tracker-comment.js         (issue comment, marker, lead, gate)
#   shared/resources/stakeholder-summary-cli.js (the lead for the PR comment)
#   shared/resources/defer-mutation.js          (the deferred record, via both)
#
# Always exits 0. Failures are logged to stderr and never block compaction.

set -uo pipefail

# Lock path — env-overridable for test isolation (mirrors advance-pipeline-lock.sh).
LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
# Resume snapshot, co-located with the lock. Written BEFORE the lock is marked so a
# killed/partial hook run always leaves a recoverable artifact (see write_pause_snapshot).
SNAPSHOT="$(dirname "$LOCK")/develop-pipeline.last-halt.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Where the sibling engines live: shared/resources/ in-tree, references/ when
# bundled. BASH_SOURCE rather than $0 so the wrapper's `exec` resolves to the
# canonical file's own directory, not the wrapper's.
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="$(dirname "$LOCK")"

emit_empty() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":""}}'
  exit 0
}

# write_pause_snapshot — persist a resume snapshot (a superset of the lock) to
# $SNAPSHOT. Tagged pause_reason: "precompact" + paused_at, and aliases the lock's
# current_step to halt_step — the field the Phase 0b resume detector maps to LOCK_STEP.
# The lock's own `paused` mark is dropped: the snapshot keeps the flat pause fields it
# always had, and --restore strips both. This runs BEFORE the lock is marked, so a
# harness kill (SIGTERM/timeout) between the two leaves the snapshot and an unmarked
# lock — a state the next pause simply redoes. Degrades to a verbatim cp when jq is
# unavailable (current_step is still preserved in the copied lock). Guarded with
# || true: a snapshot failure must never abort the hook or block compaction.
write_pause_snapshot() {
  if command -v jq >/dev/null 2>&1; then
    jq --arg ts "$NOW" \
       'del(.paused) + {paused_at: $ts, pause_reason: "precompact", halt_step: .current_step}' \
       "$LOCK" > "$SNAPSHOT" 2>/dev/null || cp -f "$LOCK" "$SNAPSHOT" 2>/dev/null || true
  else
    cp -f "$LOCK" "$SNAPSHOT" 2>/dev/null || true
  fi
}

# mark_paused — add `paused: {at, step, reason}` to the lock, through a mktemp file in
# the lock's own directory and an mv (the advance-pipeline-lock.sh write rule: never a
# redirect onto a predictable path). Returns 1 when the write did not land.
mark_paused() {
  local tmp
  tmp=$(mktemp "$STATE_DIR/.precompact-mark.XXXXXX" 2>/dev/null) || return 1
  if jq --arg ts "$NOW" \
        '.paused = {at: $ts, step: ((.current_step // 0) | (tonumber? // .)), reason: "precompact"}' \
        "$LOCK" > "$tmp" 2>/dev/null; then
    mv -f "$tmp" "$LOCK" 2>/dev/null && return 0
  fi
  rm -f "$tmp"
  return 1
}

# report_dangling_links — print each relative link target in $REPORT that HEAD does not
# carry but the index does, one per line: a link into a set staged for a later commit
# (the 5c carry), which a consumer's docs link linter would find dangling on the pushed
# tree. Requiring the index copy is what makes the hold end: the commit that carries the
# staged set pushes the pause commit with it. A target in neither — a link quoted inside
# inline code, or one to a file never written (2 of 477 tinker-city reports) — would
# hold the push for good, so it does not count. `HEAD:./<path>` and `:./<path>` resolve
# against the cwd, so the lookup runs from the report's own directory and `..` segments
# resolve as the link does. Absolute URLs, root-absolute paths and bare anchors are
# skipped; a `#fragment` is dropped.
report_dangling_links() {
  [ -f "$REPORT" ] || return 0
  (
    cd "$(dirname "$REPORT")" 2>/dev/null || exit 0
    grep -oE '\]\([^)[:space:]]+\)' "$(basename "$REPORT")" 2>/dev/null |
      sed -E 's/^\]\(//; s/\)$//; s/#.*$//' | sort -u |
      while IFS= read -r t; do
        case "$t" in '' | *://* | mailto:* | /*) continue ;; esac
        git cat-file -e "HEAD:./$t" 2>/dev/null && continue
        git cat-file -e ":./$t" 2>/dev/null && printf '%s\n' "$t"
      done
  )
}

# No lock = no active pipeline = noop, before anything is created on disk.
[ -f "$LOCK" ] || emit_empty

# The claim. "Is there a lock" is not a question two concurrent runs can both be
# allowed to answer yes to — on task.110 a settings file carried this hook under two
# spellings, the host fired both in parallel, both passed a `[ -f "$LOCK" ]` check,
# and every side-effect below was produced twice (report block, PR comment, issue
# comment). `mkdir` is atomic: of N concurrent runs exactly one creates the claim
# directory, and every other run's mkdir fails and takes the same noop path a stray
# re-fire takes. Claiming BEFORE writing a snapshot keeps the loser side-effect-free.
#
# The claim used to be `mv "$LOCK" "$LOCK.pausing.$$"` (task.120) — atomic too, but it
# took the lock away, which is the defect this revision removes. The directory is named
# OUTSIDE the `develop-pipeline.lock.pausing.*` family on purpose: the resume detector,
# `--restore` and `--paused-here` read that family as orphaned lock copies, and the
# sweep below rm's its members as files.
#
# A claim whose holder died (SIGKILL skips the EXIT trap) would make every later pause a
# silent noop, so the loser checks the holder: a pid file it can read, naming a dead
# process, is stale; so is a claim with no readable pid older than a minute (the holder
# was killed between its mkdir and its pid write). A stale claim is stolen by an atomic
# rename to a unique name and the mkdir is retried ONCE. Two runs can judge the same dead
# claim stale (task.110's double registration after a SIGKILLed pause): the faster steals
# and re-claims, and the slower one's rename then takes the FRESH claim. So the stealer
# checks what it moved — the pid it judged dead, or (no pid) a claim still over a minute
# old — and on a mismatch puts the claim back and takes the noop path. The EXIT trap
# releases the claim only while it still holds this run's pid, so a run never frees a
# claim another run holds.
CLAIM_DIR="$STATE_DIR/develop-pipeline.precompact-claim.d"
take_claim() {
  mkdir "$CLAIM_DIR" 2>/dev/null || return 1
  printf '%s\n' "$$" > "$CLAIM_DIR/pid" 2>/dev/null || true
  return 0
}
if ! take_claim; then
  HOLDER=$(cat "$CLAIM_DIR/pid" 2>/dev/null)
  STALE_CLAIM=false
  case "$HOLDER" in
    ''|*[!0-9]*)
      [ -n "$(find "$CLAIM_DIR" -maxdepth 0 -mmin +1 2>/dev/null)" ] && STALE_CLAIM=true ;;
    *)
      kill -0 "$HOLDER" 2>/dev/null || STALE_CLAIM=true ;;
  esac
  [ "$STALE_CLAIM" = true ] || emit_empty
  STOLEN="$CLAIM_DIR.stale.$$"
  mv "$CLAIM_DIR" "$STOLEN" 2>/dev/null || emit_empty
  MOVED=$(cat "$STOLEN/pid" 2>/dev/null)
  if [ -n "$HOLDER" ]; then
    [ "$MOVED" = "$HOLDER" ] && STILL_STALE=true || STILL_STALE=false
  else
    [ -z "$MOVED" ] && [ -n "$(find "$STOLEN" -maxdepth 0 -mmin +1 2>/dev/null)" ] \
      && STILL_STALE=true || STILL_STALE=false
  fi
  if [ "$STILL_STALE" != true ]; then
    # Another run stole the dead claim first and this rename took its fresh one: put it back.
    mv "$STOLEN" "$CLAIM_DIR" 2>/dev/null || rm -rf "$STOLEN"
    emit_empty
  fi
  rm -rf "$STOLEN"
  take_claim || emit_empty
  echo "on-precompact: took over a stale claim (${HOLDER:-no pid}) left by a killed pause" >&2
fi
# Release the claim on every exit path — only while it is still this run's. The lock itself
# is never removed here.
release_claim() {
  [ "$(cat "$CLAIM_DIR/pid" 2>/dev/null)" = "$$" ] && rm -rf "$CLAIM_DIR"
  return 0
}
trap release_claim EXIT
# The lock may have gone between the first check and the claim (Step 8's --complete).
[ -f "$LOCK" ] || emit_empty

# Legacy `.pausing.*` claims — the lock, byte for byte, renamed by a hook of the previous
# revision that was killed mid-flow (task.120 CR-1 / bug.2). This revision never writes
# one; the resume detector and `--restore` still read them. Sweeping them is safe HERE
# because a live lock exists: a newer pipeline has started, and its state is the one that
# matters. (No nullglob in bash 3.2: with no match the loop sees the literal pattern, and
# rm -f of a name that does not exist is a noop.)
for stale in "$LOCK".pausing.*; do
  rm -f "$stale"
done

# jq is required for safe parsing — degrade gracefully if missing. The lock is kept,
# UNMARKED (marking needs jq); the cp-fallback snapshot preserves the resume state. The
# Stop hook needs jq too, so an unmarked lock blocks nothing on such a host.
if ! command -v jq >/dev/null 2>&1; then
  write_pause_snapshot
  echo "on-precompact: jq not found, skipping pause processing (lock kept, not marked paused; resume snapshot preserved at $SNAPSHOT)" >&2
  emit_empty
fi

# Already paused: no lock writer has run since that pause (every writer clears the
# mark), so nothing has happened that a second report entry, commit or comment could
# record. Refresh the snapshot — a doc-level jq write may have added a field — and
# repeat the signal. This is also what makes a duplicate hook run that started after
# the winner finished a noop, which the claim alone cannot see.
ALREADY_PAUSED=$(jq -r 'if (.paused | type) == "object" then "step \(.paused.step // "?") since \(.paused.at // "?")" else "" end' "$LOCK" 2>/dev/null)
if [ -n "$ALREADY_PAUSED" ]; then
  write_pause_snapshot
  SKILL=$(jq -r '.skill // ""' "$LOCK" 2>/dev/null)
  SIGNAL=$(printf '🛑 PIPELINE-PAUSE-SIGNAL (repeat)\n\nThe `/%s` pipeline is already paused (%s); no lock helper has run since, so the hook recorded nothing new — no report entry, commit or comment. The lock is kept and still marked paused. Continuing in THIS session: the next lock helper call (`advance-pipeline-lock.sh <N>`, `set-qa-phase.sh`, `set-waiting-on.sh`) clears the mark. Stopping: re-invoke `/%s <path>` to resume.' \
    "${SKILL:-develop}" "$ALREADY_PAUSED" "${SKILL:-develop}")
  jq -n --arg msg "$SIGNAL" '{hookSpecificOutput: {hookEventName: "PreCompact", additionalContext: $msg}}'
  exit 0
fi

# Snapshot first, then the mark — see write_pause_snapshot for why that order.
write_pause_snapshot
MARK_OK=true
mark_paused || { MARK_OK=false; echo "on-precompact: could not mark the lock paused — the lock is kept unmarked, so the Stop hook will treat the run as live" >&2; }

SKILL=$(jq -r '.skill // ""' "$LOCK" 2>/dev/null)
REPORT=$(jq -r '.report_path // ""' "$LOCK" 2>/dev/null)
BRANCH=$(jq -r '.branch // ""' "$LOCK" 2>/dev/null)
PR_URL=$(jq -r '.pr_url // ""' "$LOCK" 2>/dev/null)
# Hook-private name, deliberately not TRACKER: sourcing resolve-platform.sh below
# unsets and re-resolves TRACKER (and leaves it unset when it returns 1 part-way),
# so a shared name would have the signal report whatever the resolver decided —
# or nothing — instead of what the lock said.
LOCK_TRACKER=$(jq -r '.tracker // ""' "$LOCK" 2>/dev/null)
TRACKER_ISSUE=$(jq -r '.tracker_issue // ""' "$LOCK" 2>/dev/null)
CURRENT_STEP=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)
DOC_DIR=$(jq -r '.task_or_story_directory // ""' "$LOCK" 2>/dev/null)
# NOW is set once near the top (used by both write_pause_snapshot and the report entry).

# Sanity: if we don't even know which skill, bail gracefully
if [ -z "$SKILL" ]; then
  echo "on-precompact: lock file missing 'skill' field, skipping (lock kept)" >&2
  emit_empty
fi

# Append pause entry to report
if [ -n "$REPORT" ] && [ -f "$REPORT" ]; then
  {
    echo ""
    echo "---"
    echo ""
    echo "## Pipeline Paused — $NOW"
    echo ""
    echo "⏸️ **Context compaction imminent.** The \`/${SKILL}\` orchestrator was halted by the PreCompact hook before Claude's context could be summarised."
    echo ""
    echo "**State at pause**:"
    echo ""
    echo "- Skill: \`/${SKILL}\`"
    echo "- Branch: \`${BRANCH}\`"
    echo "- Last step boundary: Step ${CURRENT_STEP}"
    echo "- PR: ${PR_URL:-not yet created}"
    echo "- Tracker: ${LOCK_TRACKER:-none} ${TRACKER_ISSUE:+#${TRACKER_ISSUE}}"
    echo ""
    echo "**Resume**: re-invoke \`/${SKILL} <path>\` (same path) and choose **Resume from last completed step** when prompted. Phase 0b will read this report, verify completed-step artifacts, and re-run Step ${CURRENT_STEP}."
    echo ""
    echo "**Pipeline Progress** for this step is now \`⏸️ Paused\` — equivalent to \`⏳ Pending\` for resume purposes (the step will re-run from the start)."
    echo ""
  } >> "$REPORT" || echo "on-precompact: failed to append to report" >&2

  # Read the report back before committing it — lint call site (3) of four
  # (task.124, obs #115). The append above is the one write this hook makes to
  # the report, and this hook runs under the pressure that makes a half-written
  # report most likely; task.117's doubled, mid-line-spliced report reached git
  # through a commit nobody read first. A failing lint does NOT abort the pause
  # (the snapshot and the paused mark above are what resume depends on) — it
  # skips the commit, so the corruption stays in the working tree for a human to
  # repair, and says so on stderr and in the additionalContext summary.
  REPORT_LINT_OK=true
  if command -v node >/dev/null 2>&1 && [ -f "$HOOK_DIR/report-lint.js" ]; then
    if ! LINT_OUT=$(command node "$HOOK_DIR/report-lint.js" --file "$REPORT" --json 2>&1); then
      REPORT_LINT_OK=false
      echo "on-precompact: report failed lint — pause entry appended but NOT committed; repair $REPORT by hand" >&2
      printf '%s\n' "$LINT_OUT" | jq -r '.problems[]? | "  \(.code) (line \(.line)): \(.detail)"' 2>/dev/null >&2 || true
    fi
  fi

  # Best-effort commit + push — only over a report the linter accepted.
  # Path-limited (`-- "$REPORT"`): 5c may have staged the PR review report and doc-only fixes for
  # /finalise 6a to carry into the acceptance commit. A bare `git commit` would sweep them into a
  # "pipeline paused" commit; `--` commits the report alone and leaves the rest of the index
  # staged (task.173).
  #
  # Not pushed when the committed report links to a path that is staged but not in the commit. The
  # path-limited commit is exactly what makes that possible: a QA-cycle entry links to the
  # PR review report, which 5c staged for 6a to carry, so the pushed head has a dangling
  # link and the consumer's docs-lint goes red (tinker-city PR #1223, pause commit at
  # step 7). The commit stays local; the next commit that carries the targets pushes both.
  if [ "$REPORT_LINT_OK" = true ]; then
    git add "$REPORT" 2>/dev/null || true
    git commit -m "docs(${SKILL}): pipeline paused at step ${CURRENT_STEP} — context compaction imminent" -- "$REPORT" >/dev/null 2>&1 || true
    DANGLING=$(report_dangling_links)
    if [ -z "$DANGLING" ]; then
      git push origin HEAD >/dev/null 2>&1 || true
    else
      PUSH_HELD=true
      echo "on-precompact: pause commit NOT pushed — the report links to paths staged but not in the commit: $(printf '%s' "$DANGLING" | tr '\n' ' ')" >&2
    fi
  fi
fi

# Best-effort PR comment — through the access gate, lead first, body by file.
#
# `tracker_write` is what makes a declared `access.tracker` restriction hold
# here: under anything but `full` it records the comment in the deferred
# journal instead of posting it. The body lives in the state dir rather than a
# mktemp so the recorded argv still names a file a human can post by hand.
# Fail closed: no resolver, no lead → no comment, and the signal says which.
PR_COMMENT_OUTCOME="(no PR yet)"
if [ -n "$PR_URL" ]; then
  PR_COMMENT_OUTCOME="skipped — gh not on PATH"
  if command -v gh >/dev/null 2>&1; then
    PR_COMMENT_OUTCOME="skipped — node not on PATH (nothing posted)"
    RESOLVER_OK=false
    if command -v node >/dev/null 2>&1; then
      # Three different failures, three different outcomes. A missing sibling
      # means the hook was copied without its bundle (re-run the bundler) —
      # and resolve-platform.sh itself returns 1 before reading any config when
      # read-config.sh is absent beside it, so that file is checked here too, or
      # a partial bundle would be reported as a rejected config. A resolver that
      # is present and returns non-zero has REJECTED the config (malformed
      # access: block, unsupported access.vcs); sending that operator to the
      # bundler is the wrong troubleshooting row.
      PR_COMMENT_OUTCOME="skipped — resolve-platform.sh or read-config.sh not found beside the hook (nothing posted)"
      if [ -f "$HOOK_DIR/resolve-platform.sh" ] && [ -f "$HOOK_DIR/read-config.sh" ]; then
        PR_COMMENT_OUTCOME="skipped — resolve-platform.sh failed to load: it rejected the config (nothing posted)"
        source "$HOOK_DIR/resolve-platform.sh" 2>/dev/null && RESOLVER_OK=true
      fi
    fi
    if [ "$RESOLVER_OK" = true ]; then
      PR_COMMENT_OUTCOME="skipped — stakeholder-summary-cli.js could not render the lead (nothing posted)"
      LEAD=$(command node "$HOOK_DIR/stakeholder-summary-cli.js" --stage "pipeline-paused-${CURRENT_STEP}" 2>/dev/null) || LEAD=""
      if [ -n "$LEAD" ]; then
        PR_BODY=$(printf '⏸️ **Pipeline paused — context compaction imminent**\n\nThe `/%s` orchestrator paused at Step %s because Claude'\''s context window approached its limit.\n\n**State saved in**: `%s`\n\n**To resume**: re-invoke `/%s <path>` (same path) and choose **Resume from last completed step** when prompted.' \
          "$SKILL" "$CURRENT_STEP" "$REPORT" "$SKILL")
        # Step-suffixed, and the step is in the intent too. A deferred record's
        # id is derived from intent + argv + target + stdin; with one body path
        # and no step, a pause at Step 3 and a pause at Step 6 produced two
        # records with ONE id — the handover kept the first and the hook had
        # overwritten the body with the second. Each pause now names its own
        # body file, so each record is distinct and points at the text that
        # belongs to it.
        PR_BODY_FILE="$STATE_DIR/precompact-pr-comment.step-${CURRENT_STEP}.md"
        # The marker goes FIRST, before the lead. It is the same family
        # tracker-comment.js writes on the issue arm (agent-skills-comment:<stage>),
        # and the find-then-edit below keys on `startswith` — a lead inserted above
        # the marker makes that search miss and posts a NEW comment on every pause
        # at this step, which is the duplicate this exists to prevent (finalise
        # Step 6c records the same lesson for its own marker).
        PR_MARKER="<!-- agent-skills-comment:pipeline-paused-${CURRENT_STEP} -->"
        printf '%s\n%s\n\n---\n\n%s\n' "$PR_MARKER" "$LEAD" "$PR_BODY" > "$PR_BODY_FILE"
        # tracker_write returns 0 on EVERY deferral branch, including "the record
        # could not be written" — it says so only on stderr. Capture that and
        # read it, so the signal never asserts a journal record that does not
        # exist; an audit trail that claims more than it holds is the failure
        # the journal exists to prevent.
        TW_ERR="$STATE_DIR/precompact-pr-comment.step-${CURRENT_STEP}.stderr"
        # Find-by-marker → PATCH in place → else create (the finalise Step 6c
        # recipe). A second pause at the SAME step edits the earlier comment
        # rather than adding one; the issue arm's engine reports `already` for
        # the same case, and the implementation report keeps every pause. This
        # is a partial read — `gh pr view --json comments` does not page —
        # accepted here as finalise accepts it. The search is a read, so it
        # stays outside tracker_write; only the mutation goes through the gate,
        # and both arms keep TRACKER_WRITE_KIND=github.pr.comment so the
        # deferred journal is unchanged whichever one runs.
        EXISTING_PR_COMMENT=$(gh pr view "$PR_URL" --json comments \
          -q ".comments[] | select(.body | startswith(\"$PR_MARKER\")) | .url" 2>/dev/null \
          | head -1 | grep -oE '[0-9]+$')
        if [ -n "$EXISTING_PR_COMMENT" ]; then
          # owner/repo is already in PR_URL (github.com/<owner>/<repo>/pull/N);
          # `gh repo view` in the hook's cwd is only the fallback for a URL that
          # does not parse — a mismatch there would have built /repos//… .
          PR_REPO=$(printf '%s' "$PR_URL" | sed -nE 's#^https?://[^/]+/([^/]+/[^/]+)/pull/[0-9]+.*$#\1#p')
          [ -n "$PR_REPO" ] || PR_REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
          TRACKER_WRITE_KIND=github.pr.comment \
          TRACKER_WRITE_SKILL="$SKILL" \
          TRACKER_WRITE_INTENT="Update the pipeline-paused notice (Step ${CURRENT_STEP}) on the pull request (body: $PR_BODY_FILE)" \
            tracker_write gh api -X PATCH "/repos/${PR_REPO}/issues/comments/${EXISTING_PR_COMMENT}" -F "body=@${PR_BODY_FILE}" >/dev/null 2>"$TW_ERR"
          TW_RC=$?
        else
          TRACKER_WRITE_KIND=github.pr.comment \
          TRACKER_WRITE_SKILL="$SKILL" \
          TRACKER_WRITE_INTENT="Post the pipeline-paused notice (Step ${CURRENT_STEP}) on the pull request (body: $PR_BODY_FILE)" \
            tracker_write gh pr comment "$PR_URL" --body-file "$PR_BODY_FILE" >/dev/null 2>"$TW_ERR"
          TW_RC=$?
        fi
        if [ "${ACCESS_TRACKER:-full}" != "full" ]; then
          if grep -q 'recorded as' "$TW_ERR" 2>/dev/null; then
            PR_COMMENT_OUTCOME="deferred — access.tracker=${ACCESS_TRACKER} (recorded in the deferred-mutation journal, not posted)"
          else
            PR_COMMENT_OUTCOME="deferred — access.tracker=${ACCESS_TRACKER}, but the deferred record was NOT written (not posted; body kept at $PR_BODY_FILE)"
          fi
        elif [ "$TW_RC" -eq 0 ] && [ -n "$EXISTING_PR_COMMENT" ]; then
          PR_COMMENT_OUTCOME="updated in place: $PR_URL (comment $EXISTING_PR_COMMENT — an earlier pause at Step ${CURRENT_STEP})"
        elif [ "$TW_RC" -eq 0 ]; then
          PR_COMMENT_OUTCOME="posted: $PR_URL"
        else
          PR_COMMENT_OUTCOME="failed — gh returned non-zero (body kept at $PR_BODY_FILE)"
        fi
        rm -f "$TW_ERR"
      fi
    fi
  fi
fi

# Best-effort tracker-issue comment — one tracker-comment.js call. The engine
# resolves the tracker (GitHub or Jira), renders the same lead, adds the
# idempotency marker and applies the access gate; this hook does none of that
# itself, which is the whole point. The stage is scoped by the step it paused
# at, so a second pause later in the run is a second comment rather than a
# suppressed one. Fail closed: engine or node missing → skipped, never bare.
ISSUE_COMMENT_OUTCOME="(no tracker issue)"
if [ -n "$TRACKER_ISSUE" ]; then
  ISSUE_COMMENT_OUTCOME="skipped — node or tracker-comment.js not found beside the hook (nothing posted)"
  if command -v node >/dev/null 2>&1 && [ -f "$HOOK_DIR/tracker-comment.js" ]; then
    ISSUE_BODY_FILE="$STATE_DIR/precompact-issue-comment.step-${CURRENT_STEP}.md"
    printf '⏸️ Pipeline paused at Step %s — context compaction imminent. State saved in `%s`. Resume with `/%s <path>`.\n' \
      "$CURRENT_STEP" "$REPORT" "$SKILL" > "$ISSUE_BODY_FILE"
    # --tracker from the LOCK, explicitly. Left to itself the engine resolves the
    # tracker from its environment, and this hook's environment is whatever the
    # PR arm happened to leave: TRACKER exported when resolve-platform.sh was
    # sourced, nothing when there was no PR yet. With nothing, the engine falls
    # back to JIRA_URL presence — and a GitHub project whose shell carries a
    # JIRA_URL would post issue #42 to Jira. The lock knows which tracker the
    # pipeline is on; routing must not depend on which arms ran before this one.
    # Expanded below as ${arr[@]+"${arr[@]}"}: under `set -u` a bare "${arr[@]}"
    # on an EMPTY array is "unbound variable" in bash 3.2 (macOS /bin/bash),
    # which is a bash `#!/usr/bin/env bash` can resolve to on a consumer machine.
    case "$LOCK_TRACKER" in
      jira|github) TRACKER_FLAG=(--tracker "$LOCK_TRACKER") ;;
      *)           TRACKER_FLAG=() ;;
    esac
    ISSUE_COMMENT_JSON=$(command node "$HOOK_DIR/tracker-comment.js" \
      --issue "$TRACKER_ISSUE" --stage "pipeline-paused-${CURRENT_STEP}" \
      --body-file "$ISSUE_BODY_FILE" ${TRACKER_FLAG[@]+"${TRACKER_FLAG[@]}"} --quiet --json 2>/dev/null) || true
    ISSUE_COMMENT_REASON=$(printf '%s' "$ISSUE_COMMENT_JSON" | jq -r '.reason // "unknown"' 2>/dev/null)
    ISSUE_COMMENT_OUTCOME="${ISSUE_COMMENT_REASON:-unknown} — #${TRACKER_ISSUE}${LOCK_TRACKER:+ (${LOCK_TRACKER})}"
  fi
fi

# The lock stays. A stray re-fire finds it marked paused and records nothing new.
LOCK_NOTE="Lock kept and marked paused (\`paused.step\` = ${CURRENT_STEP}) — the Stop hook allows the halt below"
if [ "$MARK_OK" != true ]; then
  LOCK_NOTE="Lock kept but NOT marked paused (the mark write failed) — the Stop hook will treat the run as live"
fi

# Build the agent signal. The lint outcome is reported both to the agent and in the
# user-facing template — a pause entry that was appended but not committed is a
# repair the operator has to do, and a summary that said "committed" would hide it.
REPORT_LINT_NOTE=", committed, and pushed"
REPORT_LINT_SUMMARY=", committed the report, and pushed to remote"
if [ "${REPORT_LINT_OK:-true}" != true ]; then
  REPORT_LINT_NOTE=" but NOT committed — the report FAILED report-lint.js; repair it by hand, then commit"
  REPORT_LINT_SUMMARY=" (report NOT committed: it failed report-lint.js — repair by hand)"
elif [ "${PUSH_HELD:-false}" = true ]; then
  HELD_LIST=$(printf '%s' "$DANGLING" | sed 's/.*/`&`/' | paste -sd ',' - | sed 's/,/, /g')
  REPORT_LINT_NOTE=", committed, but NOT pushed — it links to ${HELD_LIST}, which are staged but not in this commit (the 5c carry); the commit that carries them pushes both"
  REPORT_LINT_SUMMARY=", and committed the report (not pushed: it links to files not yet committed)"
fi
SIGNAL=$(cat <<EOF
🛑 PIPELINE-PAUSE-SIGNAL

The \`/${SKILL}\` pipeline was paused at Step ${CURRENT_STEP} due to imminent context compaction.

**Done by the hook (no action needed from you):**
- Implementation report appended with pause entry${REPORT_LINT_NOTE}: \`${REPORT}\`
- PR comment: ${PR_COMMENT_OUTCOME}
- Tracker issue comment: ${ISSUE_COMMENT_OUTCOME}
- ${LOCK_NOTE}

**What you must do now:**
1. STOP all further pipeline work immediately. Do not invoke any more sub-skills, do not update the report, do not run any tools.
2. Output the user-facing pause summary below, then HALT.
3. Report the two comment outcomes above verbatim in the summary. \`deferred\` means the consumer's access.tracker setting held and the comment is in the deferred-mutation journal; \`no-credentials\` on a Jira issue means the hook's environment carried no JIRA_* credentials, so the Jira side was not commented on.

**User-facing summary template:**

\`\`\`
⏸️ Pipeline Paused — Context Compaction Imminent

Skill:                 /${SKILL}
Paused at:             Step ${CURRENT_STEP}
Branch:                ${BRANCH}
PR:                    ${PR_URL:-(none yet)}
Implementation Report: ${REPORT}

The hook saved state${REPORT_LINT_SUMMARY}.
PR comment:            ${PR_COMMENT_OUTCOME}
Tracker issue comment: ${ISSUE_COMMENT_OUTCOME}
Resume with: /${SKILL} <path>   (choose 'Resume from last completed step' when prompted)
Continuing in THIS session instead? The lock is kept, marked paused. Carry on with Step ${CURRENT_STEP}:
its first lock call clears the mark and re-arms the Stop hook, for example
  bash .agents/skills/${SKILL}/references/advance-pipeline-lock.sh ${CURRENT_STEP}
(\`advance-pipeline-lock.sh --restore ${DOC_DIR:-<doc-dir>}\` clears it too.)
\`\`\`
EOF
)

jq -n --arg msg "$SIGNAL" '{hookSpecificOutput: {hookEventName: "PreCompact", additionalContext: $msg}}'

exit 0
