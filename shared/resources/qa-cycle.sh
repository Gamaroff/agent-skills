#!/usr/bin/env bash
# qa-cycle.sh <dir> — print the QA cycle number of the current gate in <dir>.
#
# The cycle is the numeric segment of the gate filename (`*.gate.{N}.{name}.yml`),
# and the current gate is the one with the HIGHEST number — not the newest by
# mtime, which ties in a fresh checkout and then falls back to lexical order
# (`gate.1` < `gate.10` < `gate.2`). That number is the suffix of the
# cycle-scoped tracker-comment stages (`qa-gate-N`, `qa-fix-N`), which is what
# keys each comment's idempotency marker.
#
# It refuses rather than guesses. When <dir> holds no numbered gate — nothing
# there, or only files named without a number — it prints NOTHING, writes one
# warning to stderr, and exits 1. A caller that guessed `1` instead would key
# every cycle to cycle 1's marker, and cycle 2 onward would read `already` and
# post nothing: the bare-stage suppression task.121 removed, wearing a suffix.
# (TASK-121-BUG-2.) A caller that reads an empty value into `qa-gate-` gets exit 2
# from the engine, which is loud; both outcomes are better than a wrong cycle.
#
# Call it in EVERY fenced block that uses the cycle. Each block a skill's prose
# ships is executed as its own shell, so a value derived in one block does not
# exist in the next; this script is what makes "derive once" mean "derive from
# one definition" rather than "derive in one block". Usage at a call site:
#
#   QA_CYCLE=$(bash references/qa-cycle.sh "$TASK_DIR") || QA_CYCLE=
#   [ -n "$QA_CYCLE" ] || echo "⚠️  … skipping the tracker comment"
#
# Run under bash by that `bash …` invocation whatever the caller's shell — so the
# unmatched-glob behaviour of zsh (abort before `ls`) never reaches the derivation.
set -u

DIR=${1:-}
if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
  echo "⚠️  qa-cycle: no such directory: '${DIR}' — cannot derive the QA cycle" >&2
  exit 1
fi

# `nullglob` so a directory with no gate yields an empty loop rather than the
# literal pattern; every candidate is parsed and the highest number wins.
shopt -s nullglob
best=""
unnumbered=0
for f in "$DIR"/*.gate.*.yml; do
  # At most 9 digits: a QA cycle is a small count, and `[ -gt ]` is a 64-bit
  # integer test that prints "integer expected" and SKIPS the comparison on a
  # longer run of digits — which would exit 0 with a lower, wrong cycle rather
  # than refuse. A longer run is treated as a malformed name, not a number.
  n=$(printf '%s' "${f##*/}" | sed -nE 's/^.*\.gate\.([0-9]{1,9})\..*$/\1/p')
  # Digits only, or the name is un-numbered. sed works a LINE at a time, so a
  # filename with an embedded newline yields two lines here — and feeding that
  # to `$((10#$n))` below is an arithmetic error that ABORTS the loop, leaving
  # the script to print whatever `best` held and exit 0: a lower, wrong cycle
  # rather than a refusal (finalise DoD security probe, task.121). The guard is
  # a pattern, not `-z`, so anything sed did not reduce to one run of digits —
  # empty, multi-line, or otherwise — takes the un-numbered branch.
  case "$n" in
    ''|*[!0-9]*)
      unnumbered=$((unnumbered + 1))
      continue
      ;;
  esac
  # Strip leading zeros so `gate.007` compares as 7 and prints as 7. A value
  # that normalises to 0 is not a cycle — the `cycle` slot is positive-integer
  # only and would be dropped, and `qa-gate-0` names no round — so it counts
  # as un-numbered rather than as the current gate (cycle-4 CR-5).
  n=$((10#$n))
  if [ "$n" -eq 0 ]; then
    unnumbered=$((unnumbered + 1))
    continue
  fi
  if [ -z "$best" ] || [ "$n" -gt "$best" ]; then
    best=$n
  fi
done

if [ -z "$best" ]; then
  if [ "$unnumbered" -gt 0 ]; then
    echo "⚠️  qa-cycle: ${unnumbered} gate file(s) in ${DIR} carry no cycle number (expected *.gate.{N}.{name}.yml) — refusing to guess the cycle" >&2
  else
    echo "⚠️  qa-cycle: no gate file in ${DIR} — cannot derive the QA cycle" >&2
  fi
  exit 1
fi

printf '%s\n' "$best"
