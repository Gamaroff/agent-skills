#!/usr/bin/env bash
# advance-pipeline-lock.test.sh — regression tests for advance-pipeline-lock.sh
#
# Usage: bash shared/resources/advance-pipeline-lock.test.sh
#
# Focus: the commit-changes self-advance guard. commit-changes is invoked at
# several points in a single pipeline run (create-pr Step 4, qa-fix Steps 5–6,
# the Step 8 commit, any HALT commit). It preserves the lock at every one of
# them; only `--complete`, run by Step 8's Completion Checklist, removes it
# (task 161). The lock must outlive every commit so the PreCompact/Stop hooks
# keep working and a HALT can snapshot it.
#
# Covers:
#   1–3. Nested commit-changes (current_step 4/5/6) preserves lock, step unchanged
#   4.   commit-changes at current_step 8 leaves the lock; --complete removes it (task 161)
#   4b.  Without jq: commit-changes leaves the lock and --complete removes it; a corrupt
#        lock does not make the no-op commit-changes call fail
#   5.   Explicit --complete removes lock unconditionally (current_step 4)
#   6.   No lock file → exit 0, noop
#   7.   Every Steps 5–6 loop member (qa-story, qa-task, qa-fix, review-pr)
#        noops — lock preserved, current_step untouched. review-pr is Step 5c,
#        the loop's exit gate, and joined the arm with task 77.
#   8.   Zero-byte lock fails closed — exit non-zero, lock untouched, and
#        NOTHING on stdout. Task 90: `jq` on empty input emits nothing and exits
#        0, so this used to print "step 0 → 5", exit 0, and leave the lock empty.
#   9.   Whitespace-only lock behaves identically and is not truncated (before
#        the fix this path DESTROYED a file that had content).
#   10.  A pre-existing symlink at $LOCK.tmp does not receive the write — the
#        temp file is now `mktemp`'d on an unpredictable name in the lock's dir.
#   11.  --complete still removes a zero-byte lock. This exemption is deliberate
#        and pinned here: gating --complete on the new guard would make a corrupt
#        lock permanently unclearable, which is worse than the bug being fixed.
#   12.  A lock that PARSES but is not a JSON object (bare `null`, `[]`, `"str"`,
#        `42`) fails closed. `jq` accepts all of these, and `.current_step = 5`
#        on any of them FABRICATES `{"current_step":5}` from a file that never
#        held an object — the empty case's defect wearing a different shape.
#        Found by QA probing the fix for scenario 8.
#   13.  --restore (task.124, Phase 4) — the one restore path, in bash AND zsh:
#        no lock + snapshot → lock at halt_step, snapshot consumed; lock present →
#        exit 0 no-op, nothing touched; neither → exit 1 naming both paths;
#        snapshot for another document → exit 1, nothing written, snapshot kept;
#        relative vs absolute spellings of one directory match; a snapshot with
#        no directory (pre-task.123) is REFUSED as `legacy-snapshot` unless
#        --accept-legacy is passed (task.130); an orphaned `.pausing.<pid>`
#        claim is a candidate and the newest candidate wins (and the losing
#        same-document snapshot is consumed with it); a string halt_step is
#        stored as a number; a GNU-shaped `stat` (shimmed) still picks the newest
#        candidate, and a non-numeric mtime read degrades to 0 with a warning; a
#        snapshot's `waiting_on` is dropped by the restore.
#   14.  No-lock split (task.124): `<n>` with no lock → exit 1 naming --restore
#        (the silent exit 0 hid an inert Stop hook for a whole session, obs #123);
#        `--skill <name>` and `--complete` with no lock keep exit 0 — the
#        self-advance runs standalone in nine sub-skills, and --complete must
#        stay able to clear an absent lock.
#
# Scenarios 8–11 run under BOTH bash and zsh. macOS logins are zsh and task 51
# found a real bash/zsh divergence in a sibling shared resource, so the
# interpreter is a variable worth covering. Guarded on `command -v zsh`:
# ubuntu-latest carries no zsh, and an unguarded pass would turn CI red on
# absence rather than green on skip — the convention tracker-access.test.sh
# §12 and §45 already use.

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/advance-pipeline-lock.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# write_lock STEP → creates a lock file at $LOCK_FILE with given current_step
write_lock() {
  printf '{"current_step": %s, "story": "demo"}\n' "$1" > "$LOCK_FILE"
}

# ── Scenarios 1–3: nested commit-changes preserves the lock ──────────────────
for STEP in 4 5 6; do
  LOCK_FILE="$TMPDIR_TEST/nested-$STEP.lock"
  write_lock "$STEP"
  PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
  if [ ! -f "$LOCK_FILE" ]; then
    fail "nested commit-changes at step $STEP preserves lock" "lock file was removed"
  else
    GOT=$(jq -r '.current_step' "$LOCK_FILE")
    if [ "$GOT" = "$STEP" ]; then
      pass "nested commit-changes at step $STEP preserves lock (step unchanged)"
    else
      fail "nested commit-changes at step $STEP preserves lock" "current_step changed: $STEP → $GOT"
    fi
  fi
done

# ── Scenario 4: commit-changes at step 8 leaves the lock; --complete removes it ──
# The Step 8 commit is not the end of the run: its push, Cleanup and Completion
# Checklist follow, and a pause, crash or HALT there needs the lock to resume
# from. Only --complete, after the checklist, removes it (task 161).
LOCK_FILE="$TMPDIR_TEST/terminal.lock"
write_lock 8
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
RC=$?
if [ "$RC" -ne 0 ] || [ ! -f "$LOCK_FILE" ]; then
  fail "commit-changes at step 8 leaves the lock" "rc=$RC, lock present=$([ -f "$LOCK_FILE" ] && echo yes || echo no)"
elif [ "$(jq -r '.current_step' "$LOCK_FILE")" != "8" ]; then
  fail "commit-changes at step 8 leaves the lock" "current_step changed: 8 → $(jq -r '.current_step' "$LOCK_FILE")"
else
  pass "commit-changes at step 8 leaves the lock (current_step 8)"
fi
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --complete >/dev/null 2>&1
if [ -f "$LOCK_FILE" ]; then
  fail "--complete removes the lock commit-changes left at step 8" "lock file still exists"
else
  pass "--complete removes the lock commit-changes left at step 8"
fi

# ── Scenario 4b: the terminal remover and the no-op arm work without jq ─────
# --complete is the lock's one terminal remover (task 161). Gated behind the jq check it
# exited 0 and left the lock, so a jq-less host could never finish Step 8 (task.161 QA
# cycle 1, CR-1). `--skill commit-changes` removes nothing and must not need jq or a
# parsable lock either (CR-3). PATH holds only the external commands those two arms run
# (`dirname` when the script loads, `rm` for --complete) and no jq. The script runs under an
# absolute "$BASH_BIN", so bash need not be on PATH; `echo` is a builtin. `command -v` answers
# one of three ways, and each has its own arm. An absolute path is linked. A bare name is a
# builtin, and linking it would make a self-referencing link, so it is skipped (task 162). An empty
# answer is a missing command: setup fails there, naming it, and the two no-jq assertions below do
# not run, rather than failing later for the setup's reason under their own names (task 163;
# task.162 gate.1 CR-2). An arm that starts needing another command fails here, visibly, instead of
# finding it on an over-linked PATH.
NOJQ_BIN="$TMPDIR_TEST/nojq-bin"
mkdir -p "$NOJQ_BIN"
NOJQ_SETUP_OK=1
for c in rm dirname; do
  p=$(command -v "$c")
  case "$p" in
    "") fail "4b setup: '$c' not found on PATH" "the no-jq fixture cannot link a command that does not resolve"; NOJQ_SETUP_OK=0 ;;
    /*) ln -sf "$p" "$NOJQ_BIN/$c" ;;
    *) ;; # a builtin resolves to its bare name: skip it (linking it would self-reference)
  esac
done
BASH_BIN=$(command -v bash)
LOCK_FILE="$TMPDIR_TEST/nojq.lock"
if [ "$NOJQ_SETUP_OK" -eq 1 ]; then
  write_lock 8
  ERR=$(PATH="$NOJQ_BIN" PIPELINE_LOCK="$LOCK_FILE" "$BASH_BIN" "$SCRIPT" --skill commit-changes 2>&1 >/dev/null)
  RC=$?
  # The jq gate also exits 0 and leaves the lock, so the lock alone cannot tell the pre-gate arm
  # from the gate. Its own line, and the gate's absence, can (task.161 QA cycle 2, CR-3).
  if [ "$RC" -ne 0 ] || [ ! -f "$LOCK_FILE" ]; then
    fail "without jq, commit-changes at step 8 leaves the lock" "rc=$RC, lock present=$([ -f "$LOCK_FILE" ] && echo yes || echo no)"
  elif ! echo "$ERR" | grep -q "lock preserved (--complete ends the run)" || echo "$ERR" | grep -q "jq not installed"; then
    fail "without jq, commit-changes at step 8 leaves the lock" "answered by the jq gate, not the commit-changes arm: $ERR"
  else
    pass "without jq, commit-changes at step 8 leaves the lock (its own arm, not the jq gate)"
  fi
  PATH="$NOJQ_BIN" PIPELINE_LOCK="$LOCK_FILE" "$BASH_BIN" "$SCRIPT" --complete >/dev/null 2>&1
  RC=$?
  if [ "$RC" -ne 0 ] || [ -f "$LOCK_FILE" ]; then
    fail "without jq, --complete removes the lock" "rc=$RC, lock present=$([ -f "$LOCK_FILE" ] && echo yes || echo no)"
  else
    pass "without jq, --complete removes the lock"
  fi
fi
printf 'not json{' > "$LOCK_FILE"
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
RC=$?
if [ "$RC" -ne 0 ] || [ "$(cat "$LOCK_FILE")" != "not json{" ]; then
  fail "commit-changes on a corrupt lock is a no-op (exit 0, untouched)" "rc=$RC"
else
  pass "commit-changes on a corrupt lock is a no-op (exit 0, untouched)"
fi

# ── Scenario 5: explicit --complete removes lock unconditionally ─────────────
LOCK_FILE="$TMPDIR_TEST/complete.lock"
write_lock 4
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --complete >/dev/null 2>&1
if [ -f "$LOCK_FILE" ]; then
  fail "--complete removes lock unconditionally (step 4)" "lock file still exists"
else
  pass "--complete removes lock unconditionally (step 4)"
fi

# ── Scenario 6: no lock file → exit 0, noop ──────────────────────────────────
LOCK_FILE="$TMPDIR_TEST/absent.lock"
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
RC=$?
if [ "$RC" -eq 0 ] && [ ! -f "$LOCK_FILE" ]; then
  pass "no lock file → exit 0 noop"
else
  fail "no lock file → exit 0 noop" "rc=$RC, lock present=$([ -f "$LOCK_FILE" ] && echo yes || echo no)"
fi

# ── Scenario 7: Steps 5–6 loop members noop, leaving the lock untouched ──────
#
# The orchestrator drives this loop explicitly, so no member may advance the
# lock. Note what this does and does NOT prove: an unlisted skill also exits 0
# via the `*)` catch-all, so removing any name from the loop arm leaves these
# assertions green. They pin the CONTRACT (a loop member must not advance the
# lock), not the presence of the arm. See task 77 §8 — that mutation is
# expected not to hold, and the diagnosis is redundant source, not a vacuous
# test.
for SKILL in qa-story qa-task qa-fix review-pr; do
  for STEP in 5 6; do
    LOCK_FILE="$TMPDIR_TEST/loop-$SKILL-$STEP.lock"
    write_lock "$STEP"
    PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill "$SKILL" >/dev/null 2>&1
    RC=$?
    if [ ! -f "$LOCK_FILE" ]; then
      fail "$SKILL at step $STEP noops" "lock file was removed"
    elif [ "$RC" -ne 0 ]; then
      fail "$SKILL at step $STEP noops" "exit code $RC, expected 0"
    else
      GOT=$(jq -r '.current_step' "$LOCK_FILE")
      if [ "$GOT" = "$STEP" ]; then
        pass "$SKILL at step $STEP noops (lock preserved, step unchanged)"
      else
        fail "$SKILL at step $STEP noops" "current_step changed: $STEP → $GOT"
      fi
    fi
  done
done

# ── Scenario 7b: the QA loop's position is `qa_phase`, and the helper stays monotonic (task.123) ──
#
# Inside the loop the lock reads `current_step: 5` throughout and a `qa_phase`
# field names 5a/5b/5c. The helper gains nothing for this: it must (a) accept a
# lock carrying `qa_phase` as a valid object, (b) preserve the field on every
# path — noop, advance and --skill — and (c) still refuse a backward move, which
# is the monotonic pin that makes `qa_phase` necessary in the first place.
write_phase_lock() { # $1 = step, $2 = qa_phase
  printf '{"current_step": %s, "qa_phase": "%s", "story": "demo"}\n' "$1" "$2" > "$LOCK_FILE"
}

LOCK_FILE="$TMPDIR_TEST/qa-phase-noop.lock"
write_phase_lock 5 5b
OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5 2>/dev/null); RC=$?
if [ "$RC" -ne 0 ]; then
  fail "advance 5 on a step-5 lock with qa_phase noops" "exit $RC"
elif [ "$(jq -r '.current_step' "$LOCK_FILE")" != "5" ] || [ "$(jq -r '.qa_phase' "$LOCK_FILE")" != "5b" ]; then
  fail "advance 5 on a step-5 lock with qa_phase noops" "lock changed: $(cat "$LOCK_FILE")"
else
  pass "advance 5 on a step-5 lock with qa_phase noops (step 5, qa_phase 5b preserved)"
fi

LOCK_FILE="$TMPDIR_TEST/qa-phase-backward.lock"
write_phase_lock 6 5a
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5 >/dev/null 2>&1; RC=$?
if [ "$RC" -ne 0 ] || [ "$(jq -r '.current_step' "$LOCK_FILE")" != "6" ]; then
  fail "advance still refuses 6 → 5 (monotonic pin)" "rc=$RC, current_step=$(jq -r '.current_step' "$LOCK_FILE")"
else
  pass "advance still refuses 6 → 5 (monotonic pin — the reason qa_phase exists)"
fi

LOCK_FILE="$TMPDIR_TEST/qa-phase-exit.lock"
write_phase_lock 5 5c
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 7 >/dev/null 2>&1; RC=$?
if [ "$RC" -ne 0 ] || [ "$(jq -r '.current_step' "$LOCK_FILE")" != "7" ]; then
  fail "advance 5 → 7 on loop exit" "rc=$RC, current_step=$(jq -r '.current_step' "$LOCK_FILE")"
elif [ "$(jq -r '.qa_phase' "$LOCK_FILE")" != "5c" ]; then
  fail "advance 5 → 7 preserves qa_phase" "qa_phase was rewritten: $(cat "$LOCK_FILE")"
else
  pass "advance 5 → 7 on loop exit (qa_phase 5c preserved — only the Stop hook's case 5 reads it)"
fi

for SKILL in qa-story qa-task qa-fix review-pr; do
  LOCK_FILE="$TMPDIR_TEST/qa-phase-skill-$SKILL.lock"
  write_phase_lock 5 5b
  PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill "$SKILL" >/dev/null 2>&1; RC=$?
  if [ "$RC" -ne 0 ] || [ "$(jq -r '.current_step' "$LOCK_FILE")" != "5" ] || [ "$(jq -r '.qa_phase' "$LOCK_FILE")" != "5b" ]; then
    fail "--skill $SKILL on a qa_phase lock noops" "rc=$RC, lock: $(cat "$LOCK_FILE")"
  else
    pass "--skill $SKILL on a qa_phase lock noops (step and qa_phase untouched)"
  fi
done

# ── Scenarios 8–11: malformed-lock fail-closed + temp-write hardening ────────
#
# Parameterised on the interpreter so the same four assertions run under bash and
# zsh without being written twice. The script's shebang says bash, but nothing
# stops a zsh shell invoking it directly.
run_malformed_lock_scenarios() {
  SH="$1"

  # ── 8. Zero-byte lock → fail closed ────────────────────────────────────────
  # Three separate claims, each of which was false before the fix: non-zero exit,
  # lock untouched, and no success line. The third matters most — the whole
  # defect is that a caller was TOLD the pipeline advanced.
  LOCK_FILE="$TMPDIR_TEST/empty-$SH.lock"
  : > "$LOCK_FILE"
  OUT=$(PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" 5 2>/dev/null)
  RC=$?
  SIZE=$(wc -c < "$LOCK_FILE" | tr -d ' ')
  if [ "$RC" -eq 0 ]; then
    fail "[$SH] zero-byte lock fails closed" "exit 0, expected non-zero"
  elif [ "$SIZE" != "0" ]; then
    fail "[$SH] zero-byte lock fails closed" "lock was written: $SIZE bytes"
  elif [ -n "$OUT" ]; then
    fail "[$SH] zero-byte lock fails closed" "success line on stdout: $OUT"
  else
    pass "[$SH] zero-byte lock fails closed (exit $RC, untouched, silent stdout)"
  fi

  # ── 9. Whitespace-only lock → fail closed, and NOT truncated ───────────────
  # Distinct from scenario 8: this file has content, and the pre-fix path
  # replaced it with jq's empty output — a destructive silent success.
  LOCK_FILE="$TMPDIR_TEST/whitespace-$SH.lock"
  printf '   \n\t\n' > "$LOCK_FILE"
  BEFORE=$(wc -c < "$LOCK_FILE" | tr -d ' ')
  OUT=$(PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" 5 2>/dev/null)
  RC=$?
  AFTER=$(wc -c < "$LOCK_FILE" | tr -d ' ')
  if [ "$RC" -eq 0 ]; then
    fail "[$SH] whitespace-only lock fails closed" "exit 0, expected non-zero"
  elif [ "$AFTER" != "$BEFORE" ]; then
    fail "[$SH] whitespace-only lock fails closed" "truncated: $BEFORE → $AFTER bytes"
  elif [ -n "$OUT" ]; then
    fail "[$SH] whitespace-only lock fails closed" "success line on stdout: $OUT"
  else
    pass "[$SH] whitespace-only lock fails closed (exit $RC, $AFTER bytes intact)"
  fi

  # ── 10. A symlink at $LOCK.tmp must not receive the write ──────────────────
  # Asserts BOTH halves: the canary is untouched AND the advance still succeeds.
  # Checking only the canary would pass a version that simply stopped working.
  LOCK_FILE="$TMPDIR_TEST/symlink-$SH.lock"
  write_lock 1
  CANARY="$TMPDIR_TEST/canary-$SH.txt"
  echo "CANARY-UNTOUCHED" > "$CANARY"
  ln -sf "$CANARY" "$LOCK_FILE.tmp"
  PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" 3 >/dev/null 2>&1
  RC=$?
  GOT_CANARY=$(cat "$CANARY")
  GOT_STEP=$(jq -r '.current_step' "$LOCK_FILE" 2>/dev/null)
  if [ "$GOT_CANARY" != "CANARY-UNTOUCHED" ]; then
    fail "[$SH] symlink at \$LOCK.tmp is not followed" "canary was overwritten: $GOT_CANARY"
  elif [ "$RC" -ne 0 ]; then
    fail "[$SH] symlink at \$LOCK.tmp is not followed" "advance failed with exit $RC"
  elif [ "$GOT_STEP" != "3" ]; then
    fail "[$SH] symlink at \$LOCK.tmp is not followed" "lock not advanced: current_step=$GOT_STEP"
  else
    pass "[$SH] symlink at \$LOCK.tmp is not followed (canary intact, lock advanced 1 → 3)"
  fi

  # ── 12. A parseable non-object lock fails closed ───────────────────────────
  # Four shapes, because `jq` accepts every one of them and the assignment
  # fabricates an object from each. Asserting only `null` would leave the arm
  # satisfiable by a guard that special-cased that one literal.
  for SHAPE in 'null' '[]' '"str"' '42'; do
    LOCK_FILE="$TMPDIR_TEST/nonobject-$SH-$(echo "$SHAPE" | tr -dc '[:alnum:]').lock"
    printf '%s' "$SHAPE" > "$LOCK_FILE"
    OUT=$(PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" 5 2>/dev/null)
    RC=$?
    AFTER=$(cat "$LOCK_FILE")
    if [ "$RC" -eq 0 ]; then
      fail "[$SH] non-object lock $SHAPE fails closed" "exit 0, expected non-zero"
    elif [ "$AFTER" != "$SHAPE" ]; then
      fail "[$SH] non-object lock $SHAPE fails closed" "lock rewritten: $SHAPE -> $AFTER"
    elif [ -n "$OUT" ]; then
      fail "[$SH] non-object lock $SHAPE fails closed" "success line on stdout: $OUT"
    else
      pass "[$SH] non-object lock $SHAPE fails closed (exit $RC, untouched, silent)"
    fi
  done

  # ── 11. --complete stays exempt from the new guard ─────────────────────────
  # Pins the §4 exemption. A corrupt lock that cannot be cleared is a worse
  # failure than the silent success this task fixes, so widening the guard to
  # cover --complete must break a test rather than ship.
  LOCK_FILE="$TMPDIR_TEST/complete-empty-$SH.lock"
  : > "$LOCK_FILE"
  PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" --complete >/dev/null 2>&1
  RC=$?
  if [ -f "$LOCK_FILE" ]; then
    fail "[$SH] --complete removes a zero-byte lock" "lock still exists (guard over-applied)"
  elif [ "$RC" -ne 0 ]; then
    fail "[$SH] --complete removes a zero-byte lock" "exit code $RC, expected 0"
  else
    pass "[$SH] --complete removes a zero-byte lock (exemption holds)"
  fi
}

run_malformed_lock_scenarios bash

if command -v zsh >/dev/null 2>&1; then
  run_malformed_lock_scenarios zsh
else
  echo "  SKIP  zsh interpreter pass for scenarios 8-11 (zsh not on this host)"
fi

# ── Scenario 13: --restore ───────────────────────────────────────────────────
run_restore_scenarios() {
  local SH="$1"
  local R="$TMPDIR_TEST/restore-$SH"
  mkdir -p "$R/doc" "$R/other" "$R/state"
  local L="$R/state/lock" S="$R/state/last-halt.json"

  # no lock + snapshot → lock rebuilt at halt_step, halt fields gone, snapshot consumed
  printf '{"skill":"develop-task","task_or_story_directory":"%s","branch":"feature/x","current_step":5,"qa_phase":"5b","halted_at":"t","halt_reason":"loop-limit","halt_step":"5"}\n' "$R/doc" > "$S"
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  if [ "$RC" -ne 0 ] || [ ! -f "$L" ]; then
    fail "[$SH] --restore: no lock + snapshot → lock rebuilt" "rc=$RC out=$OUT"
  elif [ "$(jq -c '[.current_step, .branch, .qa_phase, (.halt_step // "absent"), (.halt_reason // "absent"), (.halted_at // "absent")]' "$L")" != '[5,"feature/x","5b","absent","absent","absent"]' ]; then
    fail "[$SH] --restore: halt fields stripped, pipeline fields kept, halt_step → numeric current_step" "lock: $(jq -c . "$L")"
  elif [ -f "$S" ]; then
    fail "[$SH] --restore: snapshot consumed" "snapshot still present"
  elif ! echo "$OUT" | grep -q "lock restored from .* at step 5"; then
    fail "[$SH] --restore: announces the source and step" "out=$OUT"
  else
    pass "[$SH] --restore: no lock + snapshot → lock at halt_step 5 (numeric), halt fields stripped, snapshot consumed"
  fi

  # a waiting_on captured in a PreCompact snapshot does not survive the restore (QA cycle 2, CR-3)
  printf '{"task_or_story_directory":"%s","current_step":3,"paused_at":"t","pause_reason":"precompact","waiting_on":{"kind":"agent","label":"stale","since":"2026-01-01T00:00:00Z","budget_minutes":10}}\n' "$R/doc" > "$S"
  rm -f "$L"
  PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" >/dev/null 2>&1; RC=$?
  if [ "$RC" -eq 0 ] && [ "$(jq -c '[has("waiting_on"), .current_step, (.pause_reason // "absent")]' "$L")" = '[false,3,"absent"]' ]; then
    pass "[$SH] --restore: a snapshot's waiting_on is dropped (a rebuilt lock waits on nothing)"
  else
    fail "[$SH] --restore: waiting_on dropped" "rc=$RC lock=$(jq -c . "$L" 2>/dev/null)"
  fi
  printf '{"skill":"develop-task","task_or_story_directory":"%s","branch":"feature/x","current_step":5,"qa_phase":"5b","halted_at":"t","halt_reason":"loop-limit","halt_step":"5"}\n' "$R/doc" > "$S"
  rm -f "$L"; PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" >/dev/null 2>&1

  # lock present → exit 0 no-op; a snapshot beside it is left alone
  printf '{"task_or_story_directory":"%s","halt_step":2}\n' "$R/doc" > "$S"
  BEFORE=$(cat "$L")
  PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" >/dev/null 2>&1; RC=$?
  if [ "$RC" -eq 0 ] && [ "$(cat "$L")" = "$BEFORE" ] && [ -f "$S" ]; then
    pass "[$SH] --restore: lock present → exit 0, lock and snapshot untouched"
  else
    fail "[$SH] --restore: lock present → no-op" "rc=$RC changed=$([ "$(cat "$L")" != "$BEFORE" ] && echo yes || echo no) snapshot=$([ -f "$S" ] && echo kept || echo consumed)"
  fi
  rm -f "$L" "$S"

  # neither → exit 1 naming both paths, nothing written
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  if [ "$RC" -ne 0 ] && [ ! -f "$L" ] && echo "$OUT" | grep -q "$S" && echo "$OUT" | grep -q "pausing"; then
    pass "[$SH] --restore: no snapshot and no claim → exit 1 naming both paths, nothing written"
  else
    fail "[$SH] --restore: neither → exit 1" "rc=$RC lock=$([ -f "$L" ] && echo yes || echo no) out=$OUT"
  fi

  # snapshot for another document → exit 1, nothing written, snapshot kept
  printf '{"task_or_story_directory":"%s","halt_step":4}\n' "$R/other" > "$S"
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  if [ "$RC" -ne 0 ] && [ ! -f "$L" ] && [ -f "$S" ] && echo "$OUT" | grep -q "refusing to restore"; then
    pass "[$SH] --restore: snapshot for another document → exit 1, nothing written, snapshot kept"
  else
    fail "[$SH] --restore: other-document refusal" "rc=$RC lock=$([ -f "$L" ] && echo yes || echo no) snap=$([ -f "$S" ] && echo kept || echo gone) out=$OUT"
  fi
  rm -f "$S"

  # relative snapshot dir vs absolute doc-dir: one directory, restored
  ( cd "$R" && printf '{"task_or_story_directory":"./doc/","halt_step":3}\n' > state/last-halt.json \
      && PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" >/dev/null 2>&1 )
  if [ -f "$L" ] && [ "$(jq -r '.current_step' "$L")" = "3" ]; then
    pass "[$SH] --restore: relative snapshot dir vs absolute doc-dir match (canonicalised)"
  else
    fail "[$SH] --restore: canonicalised match" "lock=$([ -f "$L" ] && jq -c . "$L" || echo absent)"
  fi
  rm -f "$L" "$S"

  # a snapshot with no directory (pre-task.123 shape) is REFUSED by name unless --accept-legacy
  # is passed: it can belong to any document, and a match by absence is a guess (task.130,
  # PR #436 review CR-5).
  printf '{"current_step":7,"halt_step":7}\n' > "$S"
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  if [ "$RC" -eq 1 ] && [ ! -f "$L" ] && [ -f "$S" ] && printf '%s' "$OUT" | grep -q "legacy-snapshot"; then
    pass "[$SH] --restore: snapshot without task_or_story_directory → exit 1 'legacy-snapshot', nothing written, snapshot kept"
  else
    fail "[$SH] --restore: legacy snapshot refused" "rc=$RC lock=$([ -f "$L" ] && echo present || echo absent) snap=$([ -f "$S" ] && echo kept || echo gone) out=$OUT"
  fi
  PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --accept-legacy "$R/doc" >/dev/null 2>&1; RC=$?
  if [ "$RC" -eq 0 ] && [ "$(jq -r '.current_step' "$L")" = "7" ] && [ ! -f "$S" ]; then
    pass "[$SH] --restore --accept-legacy: the legacy snapshot is restored and consumed"
  else
    fail "[$SH] --restore --accept-legacy" "rc=$RC"
  fi
  # …and the restored lock CARRIES the directory the operator asserted, so the recovery sticks:
  # the next pause or HALT snapshots a matched candidate, not a legacy one (task.130 5c CR-1).
  # Proven end to end — a second --restore WITHOUT the flag from a snapshot of that lock succeeds.
  if [ "$(jq -r '.task_or_story_directory // ""' "$L")" = "$R/doc" ]; then
    pass "[$SH] --restore --accept-legacy: the rebuilt lock is stamped with task_or_story_directory"
  else
    fail "[$SH] --restore --accept-legacy: directory stamp" "lock=$(jq -c . "$L")"
  fi
  jq '. + {halted_at:"t", halt_reason:"x", halt_step:7}' "$L" > "$S"; rm -f "$L"
  PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" >/dev/null 2>&1; RC=$?
  if [ "$RC" -eq 0 ] && [ -f "$L" ] && [ ! -f "$S" ]; then
    pass "[$SH] --restore --accept-legacy: a snapshot of the rebuilt lock restores again WITHOUT the flag"
  else
    fail "[$SH] --restore --accept-legacy: recovery sticks" "rc=$RC"
  fi
  rm -f "$L" "$S"
  # A candidate that already names a directory keeps its own under the flag — the stamp
  # fills an absence, it never overwrites.
  printf '{"task_or_story_directory":"%s","current_step":4}\n' "$R/doc" > "$S"
  PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --accept-legacy "$R/doc" >/dev/null 2>&1
  if [ "$(jq -r '.task_or_story_directory' "$L")" = "$R/doc" ] && [ "$(jq -r '.current_step' "$L")" = "4" ]; then
    pass "[$SH] --restore --accept-legacy: a matched candidate keeps its own directory"
  else
    fail "[$SH] --restore --accept-legacy: no overwrite" "lock=$(jq -c . "$L")"
  fi
  rm -f "$L" "$S"

  # --restore --which prints the path --restore would consume, writes nothing, consumes nothing
  # (task.130): same selection function, so the two cannot disagree. Set up a snapshot AND a
  # newer orphaned claim for this document; --which must name the claim, --restore must then
  # consume that same claim.
  printf '{"task_or_story_directory":"%s","halt_step":5,"qa_max_cycles":5}\n' "$R/doc" > "$S"
  touch -t 202601010000 "$S"
  printf '{"task_or_story_directory":"%s","current_step":5,"qa_max_cycles":7}\n' "$R/doc" > "$L.pausing.4242"
  WHICH=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --which "$R/doc" 2>/dev/null); RC=$?
  if [ "$RC" -eq 0 ] && [ "$WHICH" = "$L.pausing.4242" ] && [ ! -f "$L" ] && [ -f "$S" ] && [ -f "$L.pausing.4242" ]; then
    pass "[$SH] --restore --which: names the newest same-document candidate; no writes, nothing consumed"
  else
    fail "[$SH] --restore --which" "rc=$RC which='$WHICH' lock=$([ -f "$L" ] && echo present || echo absent) snap=$([ -f "$S" ] && echo kept || echo gone) claim=$([ -f "$L.pausing.4242" ] && echo kept || echo gone)"
  fi
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  RESTORED_FROM=$(printf '%s\n' "$OUT" | sed -nE 's/^advance-pipeline-lock: lock restored from (.*) at step .*/\1/p')
  if [ "$RC" -eq 0 ] && [ "$RESTORED_FROM" = "$WHICH" ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "7" ]; then
    pass "[$SH] --restore consumes exactly the candidate --which named (budget read from the claim: 7)"
  else
    fail "[$SH] --restore vs --which agreement" "rc=$RC restored_from='$RESTORED_FROM' which='$WHICH' out=$OUT"
  fi
  rm -f "$L" "$S" "$L.pausing.4242"

  # A TRAILING flag is a usage error, never a consuming restore (task.130 QA cycle 1, bug 1):
  # `--restore <dir> --which` used to drop the flag and restore.
  printf '{"task_or_story_directory":"%s","halt_step":5}\n' "$R/doc" > "$S"
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" --which 2>&1); RC=$?
  if [ "$RC" -eq 1 ] && [ ! -f "$L" ] && [ -f "$S" ] && printf '%s' "$OUT" | grep -q "flags BEFORE"; then
    pass "[$SH] --restore <dir> --which (trailing flag) → exit 1 usage, no lock, snapshot kept"
  else
    fail "[$SH] --restore trailing flag" "rc=$RC lock=$([ -f "$L" ] && echo CREATED || echo absent) snap=$([ -f "$S" ] && echo kept || echo CONSUMED) out=$(printf '%s' "$OUT" | head -1)"
  fi
  rm -f "$L" "$S"

  # --which with a lock present: stdout is EMPTY (the notice goes to stderr), exit 0 (CR-4).
  printf '{"current_step":5}\n' > "$L"
  WHICH=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --which "$R/doc" 2>/dev/null); RC=$?
  if [ "$RC" -eq 0 ] && [ -z "$WHICH" ]; then
    pass "[$SH] --restore --which with a lock present → empty stdout, exit 0 (notice on stderr)"
  else
    fail "[$SH] --which with lock present" "rc=$RC stdout='$WHICH'"
  fi
  rm -f "$L"

  # An exported ACCEPT_LEGACY in the environment must NOT accept a legacy snapshot (CR-6).
  printf '{"current_step":7,"halt_step":7}\n' > "$S"
  ACCEPT_LEGACY=1 PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" >/dev/null 2>&1; RC=$?
  if [ "$RC" -eq 1 ] && [ ! -f "$L" ] && [ -f "$S" ]; then
    pass "[$SH] --restore ignores an exported ACCEPT_LEGACY=1 — only the flag raises it"
  else
    fail "[$SH] env ACCEPT_LEGACY ignored" "rc=$RC lock=$([ -f "$L" ] && echo CREATED || echo absent)"
  fi
  rm -f "$L" "$S"

  # Provenance over mtime (task.130 QA cycle 3, CR-6; cycle 4, CR-4): under --accept-legacy a
  # directory-MATCHED claim is chosen over a NEWER legacy snapshot, and — because the legacy file
  # is MINE under the flag and lost — a consuming --restore removes it as a loser. Both halves
  # are asserted: the selection via --which, the consume via --restore.
  printf '{"task_or_story_directory":"%s","current_step":5,"qa_max_cycles":7}\n' "$R/doc" > "$L.pausing.4343"
  touch -t 202601010000 "$L.pausing.4343"
  printf '{"current_step":3,"halt_step":3}\n' > "$S"     # legacy, NEWER
  WHICH=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --accept-legacy --which "$R/doc" 2>/dev/null); RC=$?
  if [ "$RC" -eq 0 ] && [ "$WHICH" = "$L.pausing.4343" ]; then
    pass "[$SH] --restore --accept-legacy --which: a directory-matched claim outranks a newer legacy snapshot"
  else
    fail "[$SH] provenance-first ranking" "rc=$RC which='$WHICH'"
  fi
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --accept-legacy "$R/doc" 2>&1); RC=$?
  if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "7" ] && [ ! -f "$L.pausing.4343" ] && [ ! -f "$S" ]; then
    pass "[$SH] --restore --accept-legacy: restores from the matched claim and consumes the losing legacy snapshot"
  else
    fail "[$SH] provenance-first consume" "rc=$RC lock=$([ -f "$L" ] && jq -c . "$L" || echo absent) legacy=$([ -f "$S" ] && echo KEPT || echo consumed) out=$OUT"
  fi
  rm -f "$L" "$S" "$L.pausing.4343"

  # --which with nothing usable → exit 1, same stderr as --restore, nothing written
  WHICH=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --which "$R/doc" 2>/dev/null); RC=$?
  if [ "$RC" -eq 1 ] && [ -z "$WHICH" ] && [ ! -f "$L" ]; then
    pass "[$SH] --restore --which: nothing usable → exit 1, empty stdout, no lock fabricated"
  else
    fail "[$SH] --restore --which with nothing usable" "rc=$RC which='$WHICH'"
  fi
  rm -f "$L" "$S"

  # an orphaned .pausing.<pid> claim is a candidate; the newest candidate wins, and the
  # losing same-document snapshot is consumed with it (QA cycle 1, CR-8)
  printf '{"task_or_story_directory":"%s","halt_step":4}\n' "$R/doc" > "$S"
  touch -t 202601010000 "$S"
  printf '{"task_or_story_directory":"%s","current_step":6}\n' "$R/doc" > "$L.pausing.4242"
  OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  if [ "$RC" -eq 0 ] && [ "$(jq -r '.current_step' "$L")" = "6" ] && [ ! -f "$L.pausing.4242" ] && echo "$OUT" | grep -q "pausing.4242"; then
    pass "[$SH] --restore: newer orphaned claim outranks an older snapshot; the claim is consumed"
  else
    fail "[$SH] --restore: orphaned claim" "rc=$RC lock=$([ -f "$L" ] && jq -c . "$L" || echo absent) claim=$([ -f "$L.pausing.4242" ] && echo kept || echo gone) out=$OUT"
  fi
  if [ ! -f "$S" ] && echo "$OUT" | grep -q "also removed 1 older candidate"; then
    pass "[$SH] --restore: the losing same-document snapshot is consumed too, and named"
  else
    fail "[$SH] --restore: losing candidate consumed" "snapshot=$([ -f "$S" ] && echo kept || echo gone) out=$OUT"
  fi
  rm -f "$L" "$S" "$L".pausing.*

  # GNU-shaped stat on every host (QA cycle 1, CR-1). A shim that behaves like GNU coreutils —
  # `-f` is FILE-SYSTEM mode (prints text, exits 0), `-c %Y` prints the mtime — is put first on
  # PATH. The pre-fix `stat -f %m || stat -c %Y` read text, `[ text -gt n ]` aborted, and the
  # first candidate (the snapshot) won regardless of age: this is the scenario that was red
  # under Linux CI while green on macOS. The shim delegates the real read to the host's stat
  # through an absolute path, so it runs on BSD and GNU hosts alike.
  local SHIM="$R/gnu-shim" REAL_STAT
  REAL_STAT=$(command -v stat)
  mkdir -p "$SHIM"
  cat > "$SHIM/stat" <<SHIMEOF
#!/usr/bin/env bash
case "\$1" in
  -f) echo "  File: \"\$2\"  ID: 0  Namelen: 255  Type: apfs"; exit 0 ;;
  -c) [ "\$2" = "%Y" ] || exit 1; shift 2
      if "$REAL_STAT" -c %Y "\$1" >/dev/null 2>&1; then "$REAL_STAT" -c %Y "\$1"; else "$REAL_STAT" -f %m "\$1"; fi ;;
  *) exec "$REAL_STAT" "\$@" ;;
esac
SHIMEOF
  chmod +x "$SHIM/stat"
  printf '{"task_or_story_directory":"%s","halt_step":4}\n' "$R/doc" > "$S"
  touch -t 202601010000 "$S"
  printf '{"task_or_story_directory":"%s","current_step":6}\n' "$R/doc" > "$L.pausing.7"
  OUT=$(PATH="$SHIM:$PATH" PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  if [ "$RC" -eq 0 ] && [ "$(jq -r '.current_step' "$L")" = "6" ] && ! echo "$OUT" | grep -q "could not read the mtime"; then
    pass "[$SH] --restore: newest candidate still wins under a GNU-shaped stat (CR-1)"
  else
    fail "[$SH] --restore: GNU-shaped stat" "rc=$RC step=$(jq -r '.current_step' "$L" 2>/dev/null) out=$OUT"
  fi
  rm -f "$L" "$S" "$L".pausing.*
  # …and a stat that yields nothing numeric at all degrades to 0 with a warning, never an abort.
  cat > "$SHIM/stat" <<'SHIMEOF'
#!/usr/bin/env bash
echo "garbage"; exit 0
SHIMEOF
  printf '{"task_or_story_directory":"%s","halt_step":4}\n' "$R/doc" > "$S"
  OUT=$(PATH="$SHIM:$PATH" PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" 2>&1); RC=$?
  if [ "$RC" -eq 0 ] && [ -f "$L" ] && echo "$OUT" | grep -q "could not read the mtime"; then
    pass "[$SH] --restore: a non-numeric mtime read is 0 with a warning, and the restore still completes"
  else
    fail "[$SH] --restore: non-numeric mtime guard" "rc=$RC out=$OUT"
  fi
  rm -f "$L" "$S" "$L".pausing.*
}

# ── Scenario 14: the no-lock split ───────────────────────────────────────────
run_no_lock_split() {
  local SH="$1"
  local L="$TMPDIR_TEST/split-$SH.lock" OUT RC
  OUT=$(PIPELINE_LOCK="$L" "$SH" "$SCRIPT" 4 2>&1); RC=$?
  if [ "$RC" -ne 0 ] && [ ! -f "$L" ] && echo "$OUT" | grep -q -- "--restore"; then
    pass "[$SH] <n> with no lock → exit 1, message names --restore, no lock fabricated"
  else
    fail "[$SH] <n> with no lock → exit 1" "rc=$RC out=$OUT"
  fi
  for MODE in "--skill develop" "--skill commit-changes" "--complete"; do
    # MODE is a two-word flag deliberately split into argv.
    # shellcheck disable=SC2086
    PIPELINE_LOCK="$L" "$SH" "$SCRIPT" $MODE >/dev/null 2>&1; RC=$?
    if [ "$RC" -eq 0 ] && [ ! -f "$L" ]; then
      pass "[$SH] $MODE with no lock → exit 0 (standalone sub-skill / clearable lock)"
    else
      fail "[$SH] $MODE with no lock → exit 0" "rc=$RC"
    fi
  done
}

run_restore_scenarios bash
run_no_lock_split bash
if command -v zsh >/dev/null 2>&1; then
  run_restore_scenarios zsh
  run_no_lock_split zsh
else
  echo "  SKIP  zsh interpreter pass for scenarios 13-14 (zsh not on this host)"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
