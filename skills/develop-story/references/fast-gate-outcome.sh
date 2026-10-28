#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/fast-gate-outcome.sh. Regenerate via `npm run bundle`.
# fast-gate-outcome.sh — classify a fast-gate result before anything triages it (task.238, obs #14).
#
# A gate has three outcomes, not two:
#   not-measured  no exit code (the run never finished), or 124/137/143 (timeout, SIGKILL, SIGTERM)
#   pre-existing  red, and every failing test the head log names also fails at the PR base
#   attributable  any other red — including every case where the base comparison is unavailable
# plus `green` for an exit of 0, which needs no classifying and never creates a base worktree.
#
# Usage (from the repository root):
#   fast-gate-outcome.sh --log <gate log> --exit <exit code, or empty when none was recorded> --base <PR target branch>
#
# Prints detail lines (BASE_CHECK=…, BASE_EXIT=…) and exactly one GATE_OUTCOME=… line. Exits 0 for
# every outcome — the outcome is the answer, not the exit code — and 2 on a usage error.
#
# Pre-existing is the one outcome that widens what the gate lets through, so it is narrow by
# construction: anything the comparison cannot establish lands on attributable, which is today's
# triage-and-retry path. Callers: the story/task QA loop's step 0a and develop-bug's step 3a.

set -u

LOG="" EXIT_CODE="" BASE="" HAVE_EXIT=false
while [ $# -gt 0 ]; do
  case "$1" in
    --log) LOG="${2-}"; shift 2 || { echo "fast-gate-outcome: --log needs a value" >&2; exit 2; } ;;
    --exit) EXIT_CODE="${2-}"; HAVE_EXIT=true; shift 2 || { echo "fast-gate-outcome: --exit needs a value" >&2; exit 2; } ;;
    --base) BASE="${2-}"; shift 2 || { echo "fast-gate-outcome: --base needs a value" >&2; exit 2; } ;;
    *) echo "fast-gate-outcome: unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$LOG" ] || { echo "fast-gate-outcome: --log is required" >&2; exit 2; }
$HAVE_EXIT || { echo "fast-gate-outcome: --exit is required (pass --exit \"\" when the run recorded none)" >&2; exit 2; }

case "$EXIT_CODE" in
  "") echo "GATE_OUTCOME=not-measured (no GATE_EXIT recorded)"; exit 0 ;;
  124 | 137 | 143) echo "GATE_OUTCOME=not-measured (exit $EXIT_CODE)"; exit 0 ;;
  0) echo "GATE_OUTCOME=green"; exit 0 ;;
  *[!0-9]*) echo "fast-gate-outcome: --exit must be a number or empty, got: $EXIT_CODE" >&2; exit 2 ;;
esac
# An interrupted node --test exits 1, not 130 or 143, and its summary (`fail 0`, `cancelled 1`)
# reads exactly like a test that hit its timeout, which is a real red. Only the test-tmpdir wrapper's
# own signal report tells the two apart, so only it makes a run not measured (task.238 CR4-9).
if [ -f "$LOG" ] && grep -qE '^test-tmpdir: (interrupted by|the suite was killed by) SIG[A-Z0-9]+' "$LOG"; then
  echo "GATE_OUTCOME=not-measured (the run was interrupted by a signal)"
  exit 0
fi
[ -n "$BASE" ] || { echo "fast-gate-outcome: --base is required for a red gate" >&2; exit 2; }
[ -f "$LOG" ] || { echo "fast-gate-outcome: no such log: $LOG" >&2; exit 2; }
# The base run is bounded: a failing head test that hangs at the base would otherwise block this
# script until its caller killed it (task.238 bug.4). Seconds; the default fits inside a 120s
# foreground tool call.
BASE_TIMEOUT="${FAST_GATE_BASE_TIMEOUT:-90}"
case "$BASE_TIMEOUT" in "" | *[!0-9]* | 0)
  echo "fast-gate-outcome: FAST_GATE_BASE_TIMEOUT must be a positive number of seconds, got: $BASE_TIMEOUT" >&2
  exit 2
  ;;
esac

unavailable() {
  echo "BASE_CHECK=unavailable ($1)"
  echo "GATE_OUTCOME=attributable"
  exit 0
}

# --base reaches `git fetch` after the remote name, where git reads a leading `-` as an option:
# `--upload-pack=<cmd>` runs <cmd> over a local or ssh transport. A branch name never starts with
# `-`, so refuse anything that is not one before any git call (task.238 bug.3).
case "$BASE" in -*) unavailable "--base is not a branch name: $BASE" ;; esac
git check-ref-format --branch "$BASE" >/dev/null 2>&1 || unavailable "--base is not a branch name: $BASE"

# The failing tests a node --test log names, one `file<TAB>test` pair per line: the spec reporter's
# summary (the default, also when redirected — a `test at` line, then its `✖ name`), or TAP (a
# `not ok` line, then its `location:`). A test is its file and its name, never its name alone: a
# head-only failure sharing a name with a base failure is not pre-existing (task.238 bug.5). $2 is
# a path prefix to strip (the checkout, for an absolute location); a test with no file keeps an
# empty first field, which the caller refuses.
failing_pairs() {
  awk -v pre="$2" '
    function rel(p) { if (pre != "" && index(p, pre) == 1) p = substr(p, length(pre) + 1); return p }
    /^✖ failing tests:/ { spec = 1; file = ""; next }
    spec && /^test at .+:[0-9]+:[0-9]+$/ {
      file = $0; sub(/^test at /, "", file); sub(/:[0-9]+:[0-9]+$/, "", file); file = rel(file); next
    }
    spec && /^[[:space:]]*location: \047.+:[0-9]+:[0-9]+\047$/ {
      file = $0; sub(/^[[:space:]]*location: \047/, "", file); sub(/:[0-9]+:[0-9]+\047$/, "", file); file = rel(file); next
    }
    spec && /^[[:space:]]*✖ .* \([0-9.]+m?s\)$/ {
      t = $0; sub(/^[[:space:]]*✖ /, "", t); sub(/ \([0-9.]+m?s\)$/, "", t)
      print file "\t" t; file = ""; next
    }
    spec { next }
    /^[[:space:]]*not ok [0-9]+ - / {
      if (name != "") print "\t" name
      name = $0; sub(/^[[:space:]]*not ok [0-9]+ - /, "", name); sub(/ # (SKIP|TODO).*$/, "", name); next
    }
    name != "" && /^[[:space:]]*location: \047.+:[0-9]+:[0-9]+\047$/ {
      f = $0; sub(/^[[:space:]]*location: \047/, "", f); sub(/:[0-9]+:[0-9]+\047$/, "", f)
      print rel(f) "\t" name; name = ""; next
    }
    END { if (name != "") print "\t" name }
  ' "$1"
}

# The first line after node --test's own results that is not node's, npm's report of the failure,
# the gate's exit line or a clean tmp-leak report — empty when there is none. A red is pre-existing
# only when node's results end the log: anything after them may be another step's red, which the
# base comparison cannot see (task.238 bug.6). A tripped tmp-leak ratchet prints other tmp-leak
# lines, and those are not allowed.
trailer() {
  awk '
    /^✖ failing tests:/ { mode = "spec"; bad = ""; next }
    mode != "spec" && (/^(not )?ok [0-9]+/ || /^1\.\.[0-9]+$/ || /^TAP version/) { mode = "tap"; bad = ""; next }
    mode == "" { next }
    /^$/ || /^[[:space:]]/ || /^GATE_EXIT=/ || /^npm (error|ERR!) / { next }
    /^tmp-leak: [0-9]+ top-level entries under [0-9]+ prefixes left by the suite \(directory removed\)$/ { next }
    /^tmp-leak: ratchet ok$/ || /^tmp-leak: notice — / { next }
    mode == "spec" && (/^test at / || /^✖ /) { next }
    mode == "tap" && /^# / { next }
    bad == "" { bad = $0 }
    END { print bad }
  ' "$1"
}

WORK=$(mktemp -d "${TMPDIR:-/tmp}/fast-gate-outcome.XXXXXX") || unavailable "cannot create a scratch directory"
# Every exit path cleans up, a killed run included: the base run's whole process group, its watchdog
# and the base worktree, not only the scratch directory (task.238 bug.4). A caught TERM/INT/HUP
# exits through the same trap; while the base runs the script sits in `wait`, which a trapped signal
# interrupts at once.
WT="" BASE_PID="" WATCH_PID=""
cleanup() {
  [ -z "$WATCH_PID" ] || kill -KILL -- -"$WATCH_PID" 2>/dev/null
  [ -z "$BASE_PID" ] || kill -KILL -- -"$BASE_PID" 2>/dev/null
  if [ -n "$WT" ]; then
    git worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"
    git worktree prune 2>/dev/null
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
trap 'exit 129' HUP

failing_pairs "$LOG" "$PWD/" | LC_ALL=C sort -u >"$WORK/head-fails"
[ -s "$WORK/head-fails" ] || unavailable "the head log names no failing node --test test"
grep -q "^$(printf '\t')" "$WORK/head-fails" &&
  unavailable "a failing test names no file: $(sed -n "s/^$(printf '\t')//p" "$WORK/head-fails" | head -1)"
TRAILER=$(trailer "$LOG")
[ -z "$TRAILER" ] || unavailable "the log has output after the node --test results: $TRAILER"
# The base runs the head log's own reporter: TAP lists a failing suite that spec leaves out, and
# the pairs must be read the same way on both sides.
REPORTER=()
grep -q '^✖ failing tests:' "$LOG" || REPORTER=(--test-reporter=tap)

# The failing files come from the head log, never from recall. Repo-relative only, so the base run
# can never execute the head checkout's copy of a file: no absolute path, no `..` segment (it climbs
# out of the base worktree — task.238 DoD 1), and no leading `-`, which node would read as an
# option (task.238 bug.9).
cut -f1 "$WORK/head-fails" | LC_ALL=C sort -u >"$WORK/files"
grep -qE '^/|(^|/)\.\.(/|$)|^-' "$WORK/files" && unavailable "a failing test file lies outside the checkout"
FILES=() # not mapfile: macOS ships bash 3.2
while IFS= read -r f; do FILES+=("$f"); done <"$WORK/files"

git fetch -q origin -- "$BASE" 2>/dev/null || unavailable "cannot fetch origin/$BASE"
# A base that already holds this commit is not a base: every head red would read as pre-existing.
git merge-base --is-ancestor HEAD "origin/$BASE" 2>/dev/null && unavailable "origin/$BASE already contains HEAD"
# SIGKILL runs no trap, so a predecessor killed that way left its worktree behind: remove any whose
# process is gone before adding this run's.
for d in .worktrees/base-check-*; do
  [ -d "$d" ] || continue
  kill -0 "${d##*-}" 2>/dev/null && continue
  git worktree remove --force "$d" >/dev/null 2>&1 || rm -rf "$d"
done
git worktree prune 2>/dev/null
WT=".worktrees/base-check-$$"
git worktree add -q --detach "$WT" "origin/$BASE" >/dev/null 2>&1 || { WT=""; unavailable "cannot create a base worktree"; }
# node runs whichever of the named files exist and passes over a missing one, so a new head test
# file would never be compared (task.238 bug.5).
for f in "${FILES[@]}"; do
  [ -f "$WT/$f" ] || unavailable "a failing test file does not exist at the base: $f"
done
# A fresh worktree has no node_modules; borrow the checkout's so a missing dependency is not the reading.
[ -d node_modules ] && ln -s "$PWD/node_modules" "$WT/node_modules"
BASE_LOG="$LOG.base"
# Job control puts each background job in its own process group, so one kill reaches the test
# files node --test spawns, not only node itself. The watchdog marks a timeout before it kills.
set -m
BASE_PREFIX="$PWD/$WT/" # what a TAP location at the base starts with
# The `+` form: bash 3.2 under set -u reads an empty array as unbound.
(cd "$WT" && exec node --test ${REPORTER[@]+"${REPORTER[@]}"} "${FILES[@]}") >"$BASE_LOG" 2>&1 &
BASE_PID=$!
(
  sleep "$BASE_TIMEOUT"
  : >"$WORK/timed-out"
  kill -TERM -- -"$BASE_PID"
  sleep 5
  kill -KILL -- -"$BASE_PID"
) >/dev/null 2>&1 &
WATCH_PID=$!
disown "$WATCH_PID" # killed below; a disowned job draws no "Killed" notice on stderr
set +m
wait "$BASE_PID"
BASE_EXIT=$?
kill -KILL -- -"$WATCH_PID" 2>/dev/null
kill -KILL -- -"$BASE_PID" 2>/dev/null # a test's own child that outlived node
WATCH_PID="" BASE_PID=""
git worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"
git worktree prune 2>/dev/null
WT=""
[ ! -e "$WORK/timed-out" ] || unavailable "the base run did not finish within ${BASE_TIMEOUT}s"
echo "BASE_EXIT=$BASE_EXIT (node --test ${REPORTER[*]+${REPORTER[*]} }${FILES[*]} at origin/$BASE; log $BASE_LOG)"

[ "$BASE_EXIT" -ne 0 ] || unavailable "green at the base"
# A base run that failed for its environment proves nothing about the code: a fresh worktree has no
# .agents/skills (gitignored), and a dependency the head added is absent there.
grep -qE 'Cannot find module|ERR_MODULE_NOT_FOUND|command not found|\.agents/skills' "$BASE_LOG" &&
  unavailable "the base run failed for its environment"
failing_pairs "$BASE_LOG" "$BASE_PREFIX" | LC_ALL=C sort -u >"$WORK/base-fails"
ONLY_HEAD=$(LC_ALL=C comm -23 "$WORK/head-fails" "$WORK/base-fails")
[ -z "$ONLY_HEAD" ] || unavailable "fails only on the head: $(printf '%s' "$ONLY_HEAD" | tr '\t\n' ' ;')"
echo "GATE_OUTCOME=pre-existing ($(cut -f2 "$WORK/head-fails" | tr '\n' ';'))"
