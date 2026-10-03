#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-safety-clause1.sh. Regenerate via `npm run bundle`.
# qa-safety-clause1.sh <gate-file> — print `true` or `false` for SAFETY_REPROBE clause 1 (exit 0).
#
# Clause 1 of the safety re-probe trigger (qa-re-review-scope.md § "Clause 1 — the mechanical
# probe"): the prior gate's `nfr_validation.security.status` is FAIL, or its `evidence` is
# `unverified` — including a `security:` block with no `evidence:` key at all. Clauses 2 and 3 are
# judgement calls and stay with the agent; this one is mechanical, so it has one definition, here,
# called by both QA skills' Phase 0 step 5 and recomputed by their Step 3b preambles (task.168
# CR3-4). Before task.168 it was a fenced block copied three times, and Step 3b trusted a value an
# agent had typed for it.
#
# Exit 2 on usage (no argument, or more than one). An EMPTY or unreadable <gate-file> prints
# `false`: the status half fails CLOSED — an unreadable gate is not evidence of a failure. A
# security block with no `evidence:` key prints `true`: the evidence half fails OPEN.
#
# The awk program below moved byte-for-byte from the shared rule's clause-1 block. Its three
# transit constraints still hold — no whole-record variable, no apostrophe, no GNU-only escape —
# and each still has a test in evals/shared/tests/qa-re-review-scope-parity.test.mjs, which now
# reads this file. The `</dev/null` keeps awk off stdin should the readable-file guard ever go.
set -u

if [ "$#" -ne 1 ]; then
  echo "⚠️  qa-safety-clause1: usage: qa-safety-clause1.sh <gate-file>" >&2
  exit 2
fi
LATEST_GATE=$1

SAFETY_REPROBE=false
if [ -n "$LATEST_GATE" ] && [ -f "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]; then
  SECURITY_AXIS=$(awk '
    # Three transit constraints govern every line below — no whole-record
    # variable, no apostrophe, no GNU-only escape. See "Transit constraints"
    # in the shared rule for why each one fails silently. Each has a test.
    !f && /^[[:space:]]*security:[[:space:]]*$/ {
      n = length; sub(/^[[:space:]]*/, ""); ind = n - length; f = 1; next
    }
    f {
      # A key at or left of the indent of security: ends the block, so keys
      # belonging to a later NFR axis can never be read as this one.
      n = length; sub(/^[[:space:]]*/, ""); lead = n - length
      if (length > 0 && lead <= ind) exit
      if (st == "" && /^status:/) {
        st = (/[[:space:]]FAIL[[:space:]]*$/) ? "FAIL" : "OK"
      }
      if (ev == "" && /^evidence:/) {
        ev = "unverified"
        if (/evidence:[^[:alpha:]]*measured/) ev = "measured"
        else if (/evidence:[^[:alpha:]]*reasoned/) ev = "reasoned"
      }
    }
    END {
      if (!f) { print "absent"; exit }
      printf "%s %s\n", (st == "" ? "OK" : st), (ev == "" ? "unverified" : ev)
    }
  ' "$LATEST_GATE" </dev/null)
  case "$SECURITY_AXIS" in
    absent)                     : ;;
    *FAIL*)                     SAFETY_REPROBE=true ;;
    *unverified*)               SAFETY_REPROBE=true ;;
    "OK measured"|"OK reasoned") : ;;
    # The branches above are EXHAUSTIVE over what the program can emit, so
    # reaching here means the reader produced something it cannot produce —
    # in practice the EMPTY string, from an awk that died, is missing, or had
    # its program corrupted in transit. That is a claim about the instrument,
    # not about the gate, so it fires: nothing has established the axis is
    # fine. `absent` is a deliberate answer; empty is not an answer at all.
    #
    # The clean readings must be listed BEFORE this. Leaving them to the
    # catch-all makes every passing gate fire — which is what happened when
    # this branch was first added.
    *)                          SAFETY_REPROBE=true ;;
  esac
fi
printf '%s\n' "$SAFETY_REPROBE"
