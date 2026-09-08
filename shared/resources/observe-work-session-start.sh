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
# Read `status` from the FRONTMATTER BLOCK ONLY, and tolerate surrounding
# whitespace. Two defects live here, one on each side of the count, and both
# came from matching the whole file with an over-tight pattern:
#
#   under: `grep -l '^status: open$'` matched neither `status: open ` (one
#          trailing space) nor the statusless fallback, so such a file counted
#          as neither — 1 open reported where the engine said 2.
#   over:  an unscoped match counts a line in an observation's BODY. These
#          observations are about skills and their status fields, so a resolved
#          entry quoting `status: open` in its prose counted as open — 1 open
#          reported where the engine said 0.
#
# Undercounting is the more dangerous direction (an understated backlog is
# indistinguishable from a clean log, which is the silent failure this file
# exists to prevent), but both make the hook disagree with the engine, and the
# engine is the authority.
#
# frontmatter_status prints the value of `status:` from between the first two
# `---` fences, or nothing when the field or the block is absent.
frontmatter_status() {
  awk '
    /^---[[:space:]]*$/ { fence++; if (fence >= 2) exit; next }
    fence == 1 && /^status:[[:space:]]*/ {
      sub(/^status:[[:space:]]*/, ""); sub(/[[:space:]]+$/, ""); print; exit
    }
  ' "$1" 2>/dev/null
}

total=0
open=0
for f in "$LOG_DIR"/*.md; do
  [ -f "$f" ] || continue
  total=$((total + 1))
  st=$(frontmatter_status "$f")
  # A missing status is read as open — the contract's rule, and the only default
  # that cannot make a malformed file vanish from the work queue.
  case "$st" in
    "" | open) open=$((open + 1)) ;;
  esac
done

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
