#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/advance-pipeline-lock.sh. Regenerate via `npm run bundle`.
# advance-pipeline-lock.sh — single-source lock advancer for develop-{story,task} pipelines.
#
# Replaces the inline jq snippet that was duplicated across SKILL.md, on-stop.sh,
# step-N reference docs, and per-step orchestrator instructions. Centralising the
# advance logic enables:
#   • Sub-skill self-advance — each sub-skill calls this on successful completion
#   • Stop hook (on-stop.sh) — fallback advance instruction in block reason
#   • Orchestrator manual advance — same command, no jq one-liner to typo
#
# All paths share the same idempotency + safety semantics.
#
# Usage:
#   advance-pipeline-lock.sh <next_step_number>     # advance to specific step (1..8)
#   advance-pipeline-lock.sh --complete             # remove lock (Step 8 done)
#   advance-pipeline-lock.sh --skill <skill-name>   # advance based on sub-skill that just returned
#   advance-pipeline-lock.sh --restore <doc-dir>    # rebuild the lock from the halt snapshot or an
#                                                   # orphaned PreCompact claim (task.124, Phase 4)
#
# Behaviour:
#   • No lock file  → depends on the mode, and the split is deliberate (task.124):
#       <n>          → exit 1, message names --restore. A numeric advance is only ever issued
#                      by an orchestrator that believes a pipeline is running; an exit-0
#                      silence here hid a whole session in which every advance and the Stop
#                      hook were inert after a PreCompact pause removed the lock (obs #123).
#       --skill      → exit 0, silent noop. The self-advance is the last action of nine
#                      sub-skills that legitimately run outside any pipeline (a standalone
#                      /review-task is one).
#       --complete   → exit 0. It must stay able to clear a corrupt or absent lock.
#       --restore    → rebuilds the lock (below).
#   • jq missing    → exit 0, warn to stderr (degraded mode, same as on-stop.sh)
#   • lock that is not a JSON OBJECT (empty, whitespace-only, bare null/array/
#                     scalar, or malformed) → exit 1, lock untouched, no success
#                     line. Applies to every path that reads or writes the lock
#                     JSON; --complete is exempt so a corrupt lock stays clearable.
#   • next <= current → exit 0, idempotent noop (already advanced)
#   • next > current  → atomic write via mktemp + mv, print confirmation to stdout
#
# Skill→next-step mapping (--skill mode). Only unambiguous transitions advance;
# qa-story/qa-fix/review-pr are noops because Steps 5–6 form an iterative loop
# the orchestrator must manage explicitly.
#
#   create-branch   → 2   (Step 1 done)
#   review-story    → 3   (Step 2 done)
#   review-task     → 3
#   develop         → 4   (Step 3 done)
#   create-pr       → 5   (Step 4 done)
#   qa-story        → noop (loop)
#   qa-task         → noop (loop)
#   qa-fix          → noop (loop)
#   review-pr       → noop (loop — Step 5c, the loop's exit gate)
#   finalise        → 8   (Step 7 done)
#   commit-changes  → remove lock ONLY when current_step >= 8 (terminal commit);
#                     nested invocations (create-pr Step 4, qa-fix Steps 5–6) preserve the lock
#
# --restore <doc-dir> (task.124, Phase 4). The ONE restore path — grant-qa-cycles.sh
# used to carry its own (task.123) and now calls this. A terminal HALT and the
# PreCompact hook both REMOVE the lock and leave a superset of it behind:
#   • .claude/state/develop-pipeline.last-halt.json — written by a terminal HALT
#     (halted_at / halt_reason / halt_step) or by the PreCompact hook
#     (paused_at / pause_reason), and, before this task, never consumed;
#   • .claude/state/develop-pipeline.lock.pausing.<pid> — an orphaned claim, the lock
#     byte for byte, left by a PreCompact hook killed between its rename and its snapshot.
# A session that CONTINUES IN PLACE after a pause — rather than re-invoking the skill,
# whose Step 1 is the lock's only ordinary writer — had no step that put the lock back.
#   • lock present                    → exit 0, noop ("lock present — nothing to restore")
#   • no candidate at either path     → exit 1, names both paths
#   • every candidate is for another document (its task_or_story_directory, canonicalised,
#     is not <doc-dir>, canonicalised; an ABSENT directory is the pre-task.123 shape and
#     matches)                        → exit 1, nothing written, the candidate is left alone
#   • otherwise → of the candidates for this document, the NEWEST by mtime wins (the
#     detector's rule, task.120 bug.5); the lock is rebuilt from it with current_step =
#     halt_step (fallback: its own current_step), the five halt/pause fields AND any
#     `waiting_on` stripped (a rebuilt lock waits on nothing this session dispatched), via
#     mktemp + mv; the source is DELETED — a snapshot that outlives its run is offered as a
#     resume for merged work (obs #88), so the restore consumes it — and so is every OTHER
#     candidate for this document (an older snapshot losing to a newer claim); prints
#     `advance-pipeline-lock: lock restored from <source> at step N`
#   • mtimes are read GNU-form first (`stat -c %Y`), BSD-form second (`stat -f %m`), and a
#     non-numeric read is 0 with a warning — `stat -f` is filesystem mode on GNU coreutils,
#     which made the first candidate win unconditionally on Linux (task.124 QA cycle 1, CR-1)
#   • a candidate with NO task_or_story_directory (the pre-task.123 shape) is REFUSED with
#     "legacy-snapshot" unless --accept-legacy is passed: it can belong to any document, and
#     a match by absence is the guess this mode exists to remove (task.130, PR #436 review
#     CR-5). Step 8 deletes such a snapshot when it is the sole candidate on disk.
#   • --restore --which <doc-dir>: print the path --restore WOULD consume and exit 0, with
#     no writes and nothing consumed; exit 1 (same stderr) when nothing is usable. This is
#     the same selection function, not a re-derivation — grant-qa-cycles.sh reads its
#     never-lower guard from this path, so the guard and the restore cannot disagree about
#     which candidate is live (task.130; task.124 QA cycle 1, CR-5).
#
# Exit codes: 0 on every safe path listed above; 1 on argument error, a numeric advance
# with no lock, a --restore with nothing usable, a non-object lock, or a jq failure.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"

SNAPSHOT="${PIPELINE_HALT_SNAPSHOT:-$(dirname "$LOCK")/develop-pipeline.last-halt.json}"

usage() {
  cat <<USAGE >&2
Usage:
  $0 <next_step_number>     # 1..8
  $0 --complete             # remove lock (pipeline finished)
  $0 --skill <skill-name>   # advance based on returning sub-skill name
  $0 --restore [--which] [--accept-legacy] <doc-dir>
                            # rebuild the lock from the halt snapshot / orphaned claim
                            #   --which: print the candidate --restore would consume; no writes
                            #   --accept-legacy: accept a snapshot with no task_or_story_directory
                            #   (flags go BEFORE <doc-dir>; exactly one <doc-dir>)
USAGE
  exit 1
}

[ $# -ge 1 ] || usage

# The no-lock behaviour is decided PER MODE below, not here. A single `|| exit 0`
# ahead of the parse was the silent no-op that made every numeric advance and the
# Stop hook inert for a whole session after a PreCompact pause (task.124, obs #123).
if [ ! -f "$LOCK" ]; then
  case "$1" in
    --restore) ;;                       # the one mode that exists FOR a missing lock
    --skill|--complete) exit 0 ;;       # standalone sub-skill runs; clearable lock
    --help|-h) usage ;;
    *)
      echo "advance-pipeline-lock: no lock at '$LOCK' — nothing to advance to step '$1'. If this session is continuing after a PreCompact pause or a HALT, rebuild the lock first: advance-pipeline-lock.sh --restore <doc-dir>" >&2
      exit 1
      ;;
  esac
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "advance-pipeline-lock: jq not installed; cannot advance lock" >&2
  exit 0
fi

# canon DIR → the resolved physical path, or the ./- and slash-stripped string when
# the directory does not exist. Both sides of every directory comparison go through
# it: the lock records the relative path the pipeline wrote (docs/tasks/…) while an
# orchestrator often passes the resolver's absolute one (task.123 QA cycle 4, CR-4).
canon() {
  local stripped
  stripped=$(printf '%s' "$1" | sed -E 's#^\./##; s#/+$##')
  (cd "$stripped" 2>/dev/null && pwd -P) || printf '%s' "$stripped"
}

# restore_lock DOC_DIR — the --restore mode. See the header for the contract.
# mtime_of FILE → seconds since the epoch, or 0 with a stderr warning when neither stat
# form yields a number. GNU first: on GNU coreutils `stat -f` is FILE-SYSTEM mode — it
# prints filesystem fields and exits 0 or 1 depending on the build — so the BSD form
# cannot be tried first with `||` (task.124 QA cycle 1, CR-1: the first candidate always
# won on Linux). `stat -c` is an illegal option on BSD, which fails cleanly to the BSD
# form. The digits guard is what makes a bad read a 0, never a `[ x -gt y ]` abort that
# silently keeps the first candidate.
mtime_of() {
  local m
  m=$(stat -c %Y "$1" 2>/dev/null) || m=$(stat -f %m "$1" 2>/dev/null) || m=""
  case "$m" in
    ''|*[!0-9]*)
      echo "advance-pipeline-lock: could not read the mtime of '$1' (got '${m:-nothing}') — treating as 0" >&2
      m=0 ;;
  esac
  printf '%s' "$m"
}

# choose_candidate DOC_DIR → sets CHOSEN (the newest candidate for this document) and
# MINE (every candidate for it). Exit 1 with the reason on stderr when nothing is usable.
# The ONE selection: `--restore` consumes what this chooses, `--restore --which` prints it,
# and grant-qa-cycles.sh reads its never-lower guard from it — a second derivation anywhere
# is a guard that can pass on one file while the restore consumes another (task.130).
# Raised ONLY by the --accept-legacy flag — never seeded from the environment, so a stray
# exported ACCEPT_LEGACY cannot make every restore accept legacy snapshots (task.130 CR-6).
ACCEPT_LEGACY=0
CHOSEN=""; MINE=()
choose_candidate() {
  local doc_dir="$1" want candidates=() c c_dir m legacy=0
  [ -d "$doc_dir" ] || { echo "advance-pipeline-lock: --restore needs an existing <doc-dir>, got '$doc_dir'" >&2; exit 1; }
  want=$(canon "$doc_dir")
  [ -f "$SNAPSHOT" ] && candidates+=("$SNAPSHOT")
  # `find`, not a glob: this file is run under zsh as well as bash (the test suite's
  # interpreter pass), and zsh's nomatch aborts the whole function on an unmatched
  # pattern — the same defect task.124 Phase 2 removes from the HALT snippets.
  while IFS= read -r c; do
    [ -n "$c" ] && candidates+=("$c")
  done < <(find "$(dirname "$LOCK")" -maxdepth 1 -name "$(basename "$LOCK").pausing.*" -type f 2>/dev/null)
  if [ ${#candidates[@]} -eq 0 ]; then
    echo "advance-pipeline-lock: no lock at '$LOCK', no halt snapshot at '$SNAPSHOT' and no orphaned claim at '$LOCK.pausing.*' — nothing to restore" >&2
    exit 1
  fi
  # Provenance ranks above mtime (task.130 QA cycle 3, CR-6): a candidate MATCHED by its
  # directory always outranks one accepted only by --accept-legacy (matched by absence), so a
  # newer legacy file cannot win over — and then consume as a loser — a verified same-document
  # claim. Within a rank the newest wins (the detector's rule, task.120 bug.5).
  local matched_newest=-1 legacy_newest=-1 legacy_chosen=""
  for c in "${candidates[@]}"; do
    jq -e 'type == "object"' "$c" >/dev/null 2>&1 || { echo "advance-pipeline-lock: '$c' is not a JSON object — skipped" >&2; continue; }
    c_dir=$(jq -r '.task_or_story_directory // ""' "$c")
    if [ -z "$c_dir" ] && [ "$ACCEPT_LEGACY" != "1" ]; then
      # A snapshot with no directory predates task.123 and can belong to ANY document; a match
      # by absence is a guess. Refuse it by name so the operator decides (task.130).
      echo "advance-pipeline-lock: legacy-snapshot: '$c' carries no task_or_story_directory — refusing to restore from it; pass --accept-legacy to restore it for '$doc_dir', or delete it (Step 8 removes a sole legacy snapshot)" >&2
      legacy=1
      continue
    fi
    if [ -n "$c_dir" ] && [ "$(canon "$c_dir")" != "$want" ]; then
      echo "advance-pipeline-lock: '$c' is for '$c_dir', not '$doc_dir' — refusing to restore from it" >&2
      continue
    fi
    MINE+=("$c")
    m=$(mtime_of "$c")
    if [ -n "$c_dir" ]; then
      if [ "$m" -gt "$matched_newest" ]; then CHOSEN="$c"; matched_newest="$m"; fi
    else
      if [ "$m" -gt "$legacy_newest" ]; then legacy_chosen="$c"; legacy_newest="$m"; fi
    fi
  done
  # A legacy candidate is chosen only when no directory-matched candidate exists.
  [ -n "$CHOSEN" ] || CHOSEN="$legacy_chosen"
  if [ -z "$CHOSEN" ]; then
    if [ "$legacy" -eq 1 ]; then
      echo "advance-pipeline-lock: no candidate for '$doc_dir' — the only one(s) found are legacy snapshots (see above)" >&2
    else
      echo "advance-pipeline-lock: no halt snapshot or orphaned claim is for '$doc_dir' — nothing restored" >&2
    fi
    exit 1
  fi
}

restore_lock() {
  local doc_dir="$1" chosen step tmp
  if [ -f "$LOCK" ]; then
    echo "advance-pipeline-lock: lock present at '$LOCK' — nothing to restore"
    exit 0
  fi
  choose_candidate "$doc_dir"
  chosen="$CHOSEN"
  mkdir -p "$(dirname "$LOCK")"
  tmp=$(mktemp "$(dirname "$LOCK")/.advance-pipeline-lock.XXXXXX") || {
    echo "advance-pipeline-lock: could not create temp file beside '$LOCK'" >&2
    exit 1
  }
  # current_step = halt_step when the snapshot carries one (a HALT records the step it
  # halted IN, which is the step still to run), else the candidate's own current_step.
  # `tonumber?`: a HALT snippet that wrote halt_step through `--arg` stored a string, and
  # every reader of current_step compares it numerically.
  # `waiting_on` is dropped too: a rebuilt lock is not waiting on anything THIS session
  # dispatched, and a `--clear` issued in the no-lock window was a no-op — a wait carried
  # over from the snapshot would keep the Stop hook allowing every stop, a real stall
  # included, until its recorded budget elapsed (task.124 QA cycle 2, CR-3).
  if ! jq '(.current_step = ((.halt_step // .current_step) | (tonumber? // .)))
           | del(.halted_at, .halt_reason, .halt_step, .paused_at, .pause_reason, .waiting_on)' "$chosen" > "$tmp"; then
    rm -f "$tmp"
    echo "advance-pipeline-lock: could not rebuild the lock from '$chosen'" >&2
    exit 1
  fi
  mv "$tmp" "$LOCK"
  # Consume EVERY candidate for this document, not only the winner: a losing same-document
  # snapshot left behind is the stale-snapshot-after-merge leftover this mode exists to end
  # (task.124 QA cycle 1, CR-8). Candidates for other documents were never in `MINE`.
  local losers=() c
  for c in "${MINE[@]}"; do
    [ "$c" = "$chosen" ] && continue
    rm -f "$c" && losers+=("$c")
  done
  rm -f "$chosen"
  step=$(jq -r '.current_step // "?"' "$LOCK")
  if [ ${#losers[@]} -gt 0 ]; then
    echo "advance-pipeline-lock: lock restored from $chosen at step $step (also removed ${#losers[@]} older candidate(s) for this document: ${losers[*]})"
  else
    echo "advance-pipeline-lock: lock restored from $chosen at step $step"
  fi
  exit 0
}

# Fail closed on an empty or whitespace-only lock, at every site that reads or
# writes the lock JSON.
#
# `jq` given empty input emits NOTHING and exits 0. Both consequences are silent:
# the read below falls back to 0, and the `if ! jq` write guard does not fire, so
# `mv` installs a zero-byte file and the caller is told "step 0 -> 5" for an
# advance that did not happen — in the pipeline's own state machine. A
# whitespace-only lock is worse: it TRUNCATES a file that had content.
#
# Every other malformed input (null, absent, "abc", -3, 3.7, 1e400, malformed
# JSON, non-JSON) already fails closed here. This was the one hole.
#
# Tested textually rather than with a second `jq` call: it tests exactly the
# stated condition and does not depend on jq's empty-input exit code, which is 4
# for `-e .` but 0 for a filter — the very inconsistency that caused the bug.
#
# NOT called from `--complete`, which removes the lock without parsing it.
# Gating that would make a corrupt lock permanently unclearable, which is a worse
# failure than the one being fixed. Pinned by a test so a later widening of this
# guard fails rather than ships.
require_parsable_lock() {
  # ONE decision predicate. `jq -e 'type == "object"'` rejects every shape that
  # cannot carry pipeline state:
  #   • empty            — jq exits 4 on empty input
  #   • whitespace-only  — same
  #   • malformed JSON   — parse error
  #   • parses, but is not an object (`null`, `[]`, `"str"`, `42`) — the case
  #     that matters most, because `jq` accepts these and `.current_step = $n`
  #     on any of them FABRICATES `{"current_step":5}` from a file that never
  #     held an object. Reported as a real advance. That is the defect this
  #     whole task exists to close, wearing a different shape.
  #
  # An earlier revision tested emptiness separately, as its own `exit 1` ahead
  # of this. Mutation proof retired it: with this predicate in place, deleting
  # that branch left all 30 tests green — it was control flow no test could
  # falsify. It survives below only to CHOOSE THE MESSAGE, never to decide.
  #
  # Not called from `--complete`, which removes the lock without parsing it.
  # Gating that would make a corrupt lock permanently unclearable — worse than
  # the bug being fixed. Pinned by scenario 11 so a later widening breaks.
  if ! jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1; then
    if [ ! -s "$LOCK" ] || [ -z "$(tr -d '[:space:]' < "$LOCK")" ]; then
      echo "advance-pipeline-lock: lock file '$LOCK' is empty or whitespace-only; refusing to advance" >&2
    else
      echo "advance-pipeline-lock: lock file '$LOCK' is not a JSON object; refusing to advance" >&2
    fi
    exit 1
  fi
}

NEXT=""
case "$1" in
  --complete)
    rm -f "$LOCK"
    echo "advance-pipeline-lock: pipeline complete, lock removed"
    exit 0
    ;;
  --restore)
    shift
    WHICH=0
    while [ $# -gt 0 ]; do
      case "$1" in
        --which) WHICH=1; shift ;;
        --accept-legacy) ACCEPT_LEGACY=1; shift ;;
        --*) echo "advance-pipeline-lock: unknown --restore flag '$1'" >&2; usage ;;
        *) break ;;
      esac
    done
    # Exactly ONE positional may remain. A trailing flag (`--restore <dir> --which`) used to
    # fall through this check and run a full, consuming restore where a read-only query was
    # asked for (task.130 QA cycle 1, bug 1). Anything after the directory is a usage error.
    [ $# -eq 1 ] || { echo "advance-pipeline-lock: --restore takes flags BEFORE the <doc-dir>, and exactly one <doc-dir>; got: $*" >&2; usage; }
    if [ "$WHICH" -eq 1 ]; then
      # Print the candidate --restore would consume. No writes, nothing consumed. stdout is
      # a path or empty — the lock-present notice goes to stderr so a caller reading stdout
      # as a path never receives prose (task.130 QA cycle 1, CR-4).
      if [ -f "$LOCK" ]; then
        echo "advance-pipeline-lock: lock present at '$LOCK' — nothing to restore" >&2
        exit 0
      fi
      choose_candidate "$1"
      printf '%s\n' "$CHOSEN"
      exit 0
    fi
    restore_lock "$1"
    ;;
  --skill)
    [ $# -ge 2 ] || usage
    SKILL_NAME="$2"
    case "$SKILL_NAME" in
      create-branch)              NEXT=2 ;;
      review-story|review-task)   NEXT=3 ;;
      develop)                    NEXT=4 ;;
      create-pr)                  NEXT=5 ;;
      # review-pr is Step 5c, the QA loop's exit gate. It is listed explicitly
      # rather than left to the `*)` catch-all below: both arms exit 0, so this
      # is a documentation and testability change, not a behavioural one.
      qa-story|qa-task|qa-fix|review-pr)
                                  exit 0 ;;  # iterative loop, orchestrator manages
      finalise)                   NEXT=8 ;;
      commit-changes)
        # commit-changes is the ONLY pipeline sub-skill invoked at more than one step:
        #   - Step 4 (create-pr commits code before opening the PR)
        #   - Steps 5–6 (each qa-fix cycle commits fixes)
        #   - Step 8 (terminal commit)
        # Only the Step 8 invocation means "pipeline complete". For the nested
        # invocations the lock MUST be preserved so the PreCompact/Stop hooks keep
        # working through the back half of the run.
        require_parsable_lock
        CUR=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)
        case "$CUR" in ''|null) CUR=0 ;; esac
        if [ "$CUR" -ge 8 ] 2>/dev/null; then
          rm -f "$LOCK"
          echo "advance-pipeline-lock: pipeline complete (commit-changes at step $CUR), lock removed"
        else
          echo "advance-pipeline-lock: commit-changes nested at step $CUR — lock preserved" >&2
        fi
        exit 0
        ;;
      *)
        # Unknown skill = not a pipeline sub-skill = silent noop
        exit 0
        ;;
    esac
    ;;
  --help|-h)
    usage
    ;;
  *)
    NEXT="$1"
    ;;
esac

# Validate NEXT is an integer 1..8
case "$NEXT" in
  1|2|3|4|5|6|7|8) ;;
  *)
    echo "advance-pipeline-lock: invalid next step '$NEXT' (expected 1..8)" >&2
    exit 1
    ;;
esac

require_parsable_lock
CURRENT=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)
if [ -z "$CURRENT" ] || [ "$CURRENT" = "null" ]; then
  CURRENT=0
fi

# Idempotent: already at or past the target step
if [ "$NEXT" -le "$CURRENT" ] 2>/dev/null; then
  exit 0
fi

# Write through a `mktemp` file in the lock's own directory, not `$LOCK.tmp`.
# The old redirect FOLLOWED a pre-existing symlink on that predictable path,
# writing the JSON through to the target before `mv`. `mktemp` creates O_EXCL on
# an unpredictable name, so a planted symlink is never opened.
#
# `set -o noclobber` was the other candidate and is weaker: it refuses to
# overwrite an existing file, but a symlink pointing at a NON-EXISTENT target is
# still created through it, leaving the hole open.
#
# Side effect, deliberate: the lock's mode becomes 0600 (mktemp's default) rather
# than umask-derived 0644. `.claude/state/` is per-user state, so this is a
# tightening with no reader affected.
TMP=$(mktemp "$(dirname "$LOCK")/.advance-pipeline-lock.XXXXXX") || {
  echo "advance-pipeline-lock: could not create temp file beside '$LOCK'" >&2
  exit 1
}
if ! jq --argjson n "$NEXT" '.current_step = $n' "$LOCK" > "$TMP"; then
  rm -f "$TMP"
  echo "advance-pipeline-lock: jq write failed" >&2
  exit 1
fi
mv "$TMP" "$LOCK"
echo "advance-pipeline-lock: step $CURRENT → $NEXT"
exit 0
