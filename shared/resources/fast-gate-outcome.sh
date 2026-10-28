#!/usr/bin/env bash
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
[ -n "$BASE" ] || { echo "fast-gate-outcome: --base is required for a red gate" >&2; exit 2; }
[ -f "$LOG" ] || { echo "fast-gate-outcome: no such log: $LOG" >&2; exit 2; }

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

# The failing tests a node --test log names: the spec reporter's summary (the default, also when
# redirected), or TAP `not ok` lines.
failing_tests() {
  sed -n '/^✖ failing tests:/,$p' "$1" | sed -nE 's/^[[:space:]]*✖ (.*) \([0-9.]+m?s\)$/\1/p'
  sed -nE 's/^[[:space:]]*not ok [0-9]+ - (.*)$/\1/p' "$1" | sed -E 's/ # (SKIP|TODO).*$//'
}

WORK=$(mktemp -d "${TMPDIR:-/tmp}/fast-gate-outcome.XXXXXX") || unavailable "cannot create a scratch directory"
trap 'rm -rf "$WORK"' EXIT

failing_tests "$LOG" | LC_ALL=C sort -u >"$WORK/head-fails"
[ -s "$WORK/head-fails" ] || unavailable "the head log names no failing node --test test"

# The failing files come from the head log, never from recall. Repo-relative only, so the base run
# can never execute the head checkout's copy of a file.
sed -nE "s/^test at (.+):[0-9]+:[0-9]+$/\1/p; s/^[[:space:]]*location: '(.+):[0-9]+:[0-9]+'$/\1/p" "$LOG" |
  sed "s|^$PWD/||" | LC_ALL=C sort -u >"$WORK/files"
[ -s "$WORK/files" ] || unavailable "the head log names no failing test file"
grep -q '^/' "$WORK/files" && unavailable "a failing test file lies outside the checkout"
FILES=() # not mapfile: macOS ships bash 3.2
while IFS= read -r f; do FILES+=("$f"); done <"$WORK/files"

git fetch -q origin -- "$BASE" 2>/dev/null || unavailable "cannot fetch origin/$BASE"
WT=".worktrees/base-check-$$"
git worktree add -q --detach "$WT" "origin/$BASE" >/dev/null 2>&1 || unavailable "cannot create a base worktree"
# A fresh worktree has no node_modules; borrow the checkout's so a missing dependency is not the reading.
[ -d node_modules ] && ln -s "$PWD/node_modules" "$WT/node_modules"
BASE_LOG="$LOG.base"
(cd "$WT" && command node --test "${FILES[@]}") >"$BASE_LOG" 2>&1
BASE_EXIT=$?
git worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"
echo "BASE_EXIT=$BASE_EXIT (node --test ${FILES[*]} at origin/$BASE; log $BASE_LOG)"

[ "$BASE_EXIT" -ne 0 ] || unavailable "green at the base"
# A base run that failed for its environment proves nothing about the code: a fresh worktree has no
# .agents/skills (gitignored), and a dependency the head added is absent there.
grep -qE 'Cannot find module|ERR_MODULE_NOT_FOUND|command not found|\.agents/skills' "$BASE_LOG" &&
  unavailable "the base run failed for its environment"
failing_tests "$BASE_LOG" | LC_ALL=C sort -u >"$WORK/base-fails"
ONLY_HEAD=$(LC_ALL=C comm -23 "$WORK/head-fails" "$WORK/base-fails")
[ -z "$ONLY_HEAD" ] || unavailable "fails only on the head: $(printf '%s' "$ONLY_HEAD" | tr '\n' ';')"
echo "GATE_OUTCOME=pre-existing ($(tr '\n' ';' <"$WORK/head-fails"))"
