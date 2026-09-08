#!/bin/sh
# observe-work-session-start.sh — SessionStart hook for the observe-work skill.
#
# Emits the observation backlog's state as `hookSpecificOutput.additionalContext`
# so the agent starts the session already knowing what the review trigger would
# have told it. Reads only; writes nothing.
#
# SHIPPED, NOT INSTALLED. Register it as a SessionStart hook yourself — see
# skills/observe-work/references/environments.md.
#
# Why this exists: capture is hard-enforced by checkpoints hooked onto tool calls
# that were happening anyway. The review trigger is not — it is a soft step (read
# a file, compare a date) and gets skipped the same way activation does. That
# failure is self-concealing: capture keeps producing, the log looks healthy, and
# the only artefact recording the miss is a file reading `never` that nobody
# reads. So compute the state and inject it rather than asking the agent to look.
#
# Environment:
#   OBS_WORKSPACE  the observation workspace anchor. Required — this hook does
#                  NOT source the resolver, because a hook that exits non-zero
#                  can block session start. Unset or missing => silent exit 0.
#   OBS_STALE_DAYS review-staleness threshold in days (default 14).
#
# POSIX sh. No bashisms: this runs under whatever /bin/sh the harness provides.

set -u

WORKSPACE="${OBS_WORKSPACE:-}"
[ -n "$WORKSPACE" ] || exit 0

OBS_DIR="${WORKSPACE}/skill-observations"
LOG_DIR="${OBS_DIR}/observation-log"
[ -d "$LOG_DIR" ] || exit 0

# Count files whose `status` field reads `open`, NEVER a raw file count.
#
# Resolved entries stay in observation-log/ until the day after they were
# resolved, and parked entries are decided and out of the queue. A raw count
# overstates the backlog by every entry the last review just closed — for a day,
# in every session.
#
# A missing `status:` is read as open (the contract's rule), so the second grep
# counts headers that carry no status line at all.
# Tolerate surrounding whitespace. `grep -l '^status: open$'` matched neither
# `status: open ` (one trailing space) nor the statusless fallback below, so
# such a file counted as neither and the hook UNDER-reported the backlog —
# reporting 1 open where the engine reported 2. Undercounting is the worse
# direction: an overstated backlog gets noticed and corrected, an understated
# one is indistinguishable from a clean log, which is the silent failure this
# whole file exists to prevent.
open_explicit=$(
  grep -lE '^status:[[:space:]]*open[[:space:]]*$' "$LOG_DIR"/*.md 2>/dev/null | wc -l | tr -d ' '
)
total=$(ls -1 "$LOG_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
statusless=$(
  # `grep -c` exits 1 on zero matches while still printing 0, so the exit code is
  # deliberately ignored here; the printed value is the one that matters.
  for f in "$LOG_DIR"/*.md; do
    [ -f "$f" ] || continue
    grep -qE '^status:[[:space:]]*[^[:space:]]' "$f" 2>/dev/null || echo "$f"
  done | wc -l | tr -d ' '
)
open=$((open_explicit + statusless))

[ "$total" -gt 0 ] || exit 0

last=$(cat "${OBS_DIR}/last-review-date.txt" 2>/dev/null || echo never)
[ -n "$last" ] || last=never

stale_days="${OBS_STALE_DAYS:-14}"
# BSD and GNU date disagree on relative-date syntax; try both, and fall back to
# treating every date as stale rather than silently skipping the check.
cutoff=$(date -u -v-"${stale_days}"d +%Y-%m-%d 2>/dev/null \
  || date -u -d "${stale_days} days ago" +%Y-%m-%d 2>/dev/null \
  || echo 9999-12-31)

# Compare ISO dates WITHOUT `<` inside `[ ]`. ISO dates sort lexically, so this
# is true exactly when $last is not later than $cutoff — in every POSIX shell.
# `\<` is a bash/ksh extension that zsh rejects and sh does not know.
if [ "$last" = "never" ]; then
  review_state="never run"
elif [ "$(printf '%s\n%s\n' "$last" "$cutoff" | sort | head -1)" = "$last" ]; then
  review_state="last run ${last} — stale (over ${stale_days} days)"
else
  review_state=""
fi

# Silence is a correct outcome: a fresh review with nothing to nag about must
# emit nothing at all, which is why the branch above can leave review_state
# empty and why the fixtures prove that third branch explicitly.
if [ "$open" -eq 0 ] && [ -z "$review_state" ]; then
  exit 0
fi

msg="observe-work: ${open} open observation(s) of ${total} in the log."
[ -n "$review_state" ] && msg="${msg} Skill review ${review_state}."
msg="${msg} Run the Session Start Protocol; offer the review in one line and do not gate the user's task on it."

# Hand-rolled JSON escaping: the payload is a single line of our own prose, so
# only the quote and backslash cases can arise.
escaped=$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped"
