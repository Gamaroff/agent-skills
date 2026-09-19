#!/usr/bin/env bash
# advance-pipeline-lock.test.sh — regression tests for advance-pipeline-lock.sh
#
# Usage: bash shared/resources/advance-pipeline-lock.test.sh
#
# Focus: the commit-changes self-advance guard. commit-changes is invoked at
# three points in a single pipeline run (create-pr Step 4, qa-fix Steps 5–6,
# terminal Step 8). Only the Step 8 invocation may remove the lock; the nested
# invocations must preserve it so PreCompact/Stop hooks keep working.
#
# Covers:
#   1–3. Nested commit-changes (current_step 4/5/6) preserves lock, step unchanged
#   4.   Terminal commit-changes (current_step 8) removes lock
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
#        no directory (pre-task.123) is accepted; an orphaned `.pausing.<pid>`
#        claim is a candidate and the newest candidate wins (and the losing
#        same-document snapshot is consumed with it); a string halt_step is
#        stored as a number; a GNU-shaped `stat` (shimmed) still picks the newest
#        candidate, and a non-numeric mtime read degrades to 0 with a warning.
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

# ── Scenario 4: terminal commit-changes (step 8) removes the lock ────────────
LOCK_FILE="$TMPDIR_TEST/terminal.lock"
write_lock 8
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
if [ -f "$LOCK_FILE" ]; then
  fail "terminal commit-changes at step 8 removes lock" "lock file still exists"
else
  pass "terminal commit-changes at step 8 removes lock"
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

  # a snapshot with no directory (pre-task.123 shape) is accepted
  printf '{"current_step":7,"halt_step":7}\n' > "$S"
  PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore "$R/doc" >/dev/null 2>&1; RC=$?
  if [ "$RC" -eq 0 ] && [ "$(jq -r '.current_step' "$L")" = "7" ]; then
    pass "[$SH] --restore: snapshot without task_or_story_directory (pre-task.123) accepted"
  else
    fail "[$SH] --restore: pre-task.123 snapshot" "rc=$RC"
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
