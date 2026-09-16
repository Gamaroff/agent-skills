#!/usr/bin/env bash
# develop-pipeline-install-hooks.test.sh — regression tests for develop-pipeline-install-hooks.sh
#
# Usage: bash shared/resources/develop-pipeline-install-hooks.test.sh
#
# Focus (task.120): the installer dedupes by hook IDENTITY, not by command
# string. On task.110 a settings.json carried the PreCompact and Stop hooks under
# two spellings — "${CLAUDE_PROJECT_DIR}/.claude/skills/…" and
# "${CLAUDE_PROJECT_DIR}/.agents/skills/…" — the installer's exact-string dedupe
# saw two different commands, the host fired both in parallel, and every pause
# side-effect was produced twice. The fixture below is that file's exact shape,
# plus the legacy bare-relative form the retired `unpatch_hook_exact` candidate
# loop used to strip (its coverage must not regress), plus an unrelated
# PostToolUse hook and a permissions block that must come through byte-identical.
#
# Covers:
#   1. Three spellings per event → ONE entry per event, and the survivor is the
#      resolver's spelling ("${CLAUDE_PROJECT_DIR}/<BASE>/…").
#   2. Everything that is not one of the two hooks (permissions, env, the
#      PostToolUse hook) is byte-identical before and after.
#   3. A second run is a no-op — the file does not change at all.
#   4. --dry-run prints the prune and changes nothing; "already registered" names only
#      the canonical entry. 4b: with only a non-canonical spelling present, dry-run
#      shows "removing X" then "adding canonical" — the same sequence as a real run
#      (task.120 CR-1).
#   5. A settings file that already carries only the canonical spelling is
#      untouched (no spurious "removing").
#   6. hook_identity never collapses two DIFFERENT scripts: an on-stop.sh entry
#      is not removed while healing on-precompact.sh, and a consumer hook whose
#      command merely resembles ours is left alone.

PASS=0
FAIL=0
INSTALLER="$(cd "$(dirname "$0")" && pwd)/develop-pipeline-install-hooks.sh"
BASH_BIN="${HOOK_TEST_BASH:-$(command -v bash)}"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

if ! command -v jq >/dev/null 2>&1; then
  echo "  SKIP  jq not on PATH — the installer requires it; nothing to test"
  exit 0
fi

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# The installer resolves BASE from candidate paths relative to cwd; the first
# candidate is what a consumer install provides, so the canonical spelling is
# "${CLAUDE_PROJECT_DIR}/.agents/skills/develop-story/scripts/<hook>".
BASE=".agents/skills/develop-story/scripts"
CANON_PRE="bash \"\${CLAUDE_PROJECT_DIR}/${BASE}/on-precompact.sh\""
CANON_STOP="bash \"\${CLAUDE_PROJECT_DIR}/${BASE}/on-stop.sh\""

# make_project DIR — a throwaway project with runnable-looking hook stubs at
# the first candidate base, so the resolver picks it.
make_project() {
  mkdir -p "$1/$BASE" "$1/.claude"
  : > "$1/$BASE/on-stop.sh"
  : > "$1/$BASE/on-precompact.sh"
}

# The task.110 pre-fix shape (.claude/settings.json.bak-2026-09-16), extended.
write_fixture() {
  cat > "$1" <<'JSON'
{
  "permissions": {
    "allow": ["Bash(npm test)", "Read"]
  },
  "env": { "KEEP_ME": "1" },
  "hooks": {
    "PreCompact": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/skills/develop-story/scripts/on-precompact.sh\"" } ] },
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/skills/develop-story/scripts/on-precompact.sh\"" } ] },
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash .claude/skills/develop-story/scripts/on-precompact.sh" } ] }
    ],
    "Stop": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/skills/develop-story/scripts/on-stop.sh\"" } ] },
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/skills/develop-story/scripts/on-stop.sh\"" } ] },
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash .agents/skills/develop-story/scripts/on-stop.sh" } ] }
    ],
    "PostToolUse": [
      { "matcher": "Write", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/skills/my-consumer-skill/scripts/on-precompact.sh\"" } ] }
    ]
  }
}
JSON
}

run_installer() {   # $1 = project dir, rest = installer args
  local dir="$1"; shift
  (cd "$dir" && "$BASH_BIN" "$INSTALLER" --settings .claude/settings.json "$@")
}

# ── Scenario 1: three spellings per event → one entry, the canonical one ─────
P1="$TMPDIR_TEST/p1"; make_project "$P1"; write_fixture "$P1/.claude/settings.json"
OUT1=$(run_installer "$P1" 2>&1); RC=$?
S1="$P1/.claude/settings.json"
N_PRE=$(jq '.hooks.PreCompact | length' "$S1")
N_STOP=$(jq '.hooks.Stop | length' "$S1")
CMD_PRE=$(jq -r '.hooks.PreCompact[0].hooks[0].command' "$S1")
CMD_STOP=$(jq -r '.hooks.Stop[0].hooks[0].command' "$S1")
if [ "$RC" -ne 0 ]; then
  fail "heal: installer exits 0" "rc=$RC: $OUT1"
elif [ "$N_PRE" != "1" ] || [ "$N_STOP" != "1" ]; then
  fail "heal: one entry per event" "PreCompact=$N_PRE Stop=$N_STOP: $(jq -c '.hooks' "$S1")"
elif [ "$CMD_PRE" != "$CANON_PRE" ] || [ "$CMD_STOP" != "$CANON_STOP" ]; then
  fail "heal: the survivor is the resolver's spelling" "PreCompact='$CMD_PRE' Stop='$CMD_STOP'"
elif [ "$(grep -c 'removing duplicate spelling' <<<"$OUT1")" != "4" ]; then
  fail "heal: four duplicates reported removed (2 per event)" "$OUT1"
else
  pass "heal: 3 spellings per event → 1 entry each, canonical spelling survives, 4 removals reported"
fi

# ── Scenario 2: everything else byte-identical ───────────────────────────────
write_fixture "$TMPDIR_TEST/fixture.json"
BEFORE=$(jq -S 'del(.hooks.PreCompact, .hooks.Stop)' "$TMPDIR_TEST/fixture.json")
AFTER=$(jq -S 'del(.hooks.PreCompact, .hooks.Stop)' "$S1")
if [ "$BEFORE" != "$AFTER" ]; then
  fail "heal: non-hook keys and the unrelated PostToolUse hook untouched" "$(diff <(echo "$BEFORE") <(echo "$AFTER"))"
else
  pass "heal: permissions, env and the unrelated PostToolUse hook are byte-identical before and after"
fi

# ── Scenario 3: second run is a no-op ────────────────────────────────────────
cp "$S1" "$TMPDIR_TEST/after-first.json"
OUT3=$(run_installer "$P1" 2>&1); RC=$?
if [ "$RC" -ne 0 ]; then
  fail "idempotent: second run exits 0" "rc=$RC"
elif ! cmp -s "$S1" "$TMPDIR_TEST/after-first.json"; then
  fail "idempotent: second run changes nothing" "$(diff "$TMPDIR_TEST/after-first.json" "$S1")"
elif grep -q 'removing' <<<"$OUT3"; then
  fail "idempotent: second run reports no removals" "$OUT3"
else
  pass "idempotent: a second run leaves the file byte-identical and reports nothing removed"
fi

# ── Scenario 4: --dry-run shows the prune, writes nothing ────────────────────
P4="$TMPDIR_TEST/p4"; make_project "$P4"; write_fixture "$P4/.claude/settings.json"
cp "$P4/.claude/settings.json" "$TMPDIR_TEST/p4-before.json"
OUT4=$(run_installer "$P4" --dry-run 2>&1); RC=$?
if [ "$RC" -ne 0 ]; then
  fail "dry-run: exits 0" "rc=$RC"
elif ! cmp -s "$P4/.claude/settings.json" "$TMPDIR_TEST/p4-before.json"; then
  fail "dry-run: file unchanged" "file was modified"
elif ! grep -q 'removing duplicate spelling' <<<"$OUT4"; then
  fail "dry-run: prune is shown" "$OUT4"
elif ! grep -q -- '^    -.*\.claude/skills/develop-story/scripts/on-precompact\.sh' <<<"$OUT4"; then
  fail "dry-run: diff shows the .claude spelling being removed" "$OUT4"
elif [ "$(grep -c 'already registered' <<<"$OUT4")" != "2" ]; then
  # The fixture carries the canonical spelling too, so both events are correctly
  # "already registered" — by the canonical entry, never by a spelling the dry run
  # just said it would remove (task.120 CR-1).
  fail "dry-run: 'already registered' reported once per event, for the canonical entry" "$OUT4"
elif grep 'already registered' <<<"$OUT4" | grep -qv 'agents/skills/develop-story'; then
  fail "dry-run: 'already registered' never names a spelling that is being removed" "$(grep 'already registered' <<<"$OUT4")"
else
  pass "dry-run: prune shown with a diff, settings file untouched, 'already registered' names only the canonical entry"
fi

# ── Scenario 4b: --dry-run with ONLY a non-canonical spelling → "adding" shown ─
# The CR-1 shape: heal_hook says "removing X", and before the fix patch_hook then
# said "already registered (X)" for the same entry, hiding the add a real run
# performs. A dry run must report the same sequence as the real run.
P4B="$TMPDIR_TEST/p4b"; make_project "$P4B"
cat > "$P4B/.claude/settings.json" <<'JSON'
{
  "hooks": {
    "PreCompact": [ { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/skills/develop-story/scripts/on-precompact.sh\"" } ] } ],
    "Stop":       [ { "matcher": "*", "hooks": [ { "type": "command", "command": "bash .claude/skills/develop-story/scripts/on-stop.sh" } ] } ]
  }
}
JSON
cp "$P4B/.claude/settings.json" "$TMPDIR_TEST/p4b-before.json"
OUT4B=$(run_installer "$P4B" --dry-run 2>&1); RC=$?
if [ "$RC" -ne 0 ]; then
  fail "dry-run (non-canonical only): exits 0" "rc=$RC"
elif ! cmp -s "$P4B/.claude/settings.json" "$TMPDIR_TEST/p4b-before.json"; then
  fail "dry-run (non-canonical only): file unchanged" "file was modified"
elif grep -q 'already registered' <<<"$OUT4B"; then
  fail "dry-run (non-canonical only): a spelling being removed is never 'already registered'" "$(grep 'already registered' <<<"$OUT4B")"
elif [ "$(grep -c '^  + .*adding' <<<"$OUT4B")" != "2" ]; then
  fail "dry-run (non-canonical only): the canonical add is shown for both events" "$OUT4B"
elif [ "$(grep -c 'removing duplicate spelling' <<<"$OUT4B")" != "2" ]; then
  fail "dry-run (non-canonical only): both removals shown" "$OUT4B"
else
  pass "dry-run (non-canonical only): 'removing X' then 'adding canonical' for both events — same sequence as a real run; file untouched"
fi

# ── Scenario 5: already-canonical file is left alone ─────────────────────────
P5="$TMPDIR_TEST/p5"; make_project "$P5"
jq -n --arg pre "$CANON_PRE" --arg stop "$CANON_STOP" \
  '{hooks: {PreCompact: [{matcher:"*", hooks:[{type:"command", command:$pre}]}],
            Stop:       [{matcher:"*", hooks:[{type:"command", command:$stop}]}]}}' \
  > "$P5/.claude/settings.json"
cp "$P5/.claude/settings.json" "$TMPDIR_TEST/p5-before.json"
OUT5=$(run_installer "$P5" 2>&1); RC=$?
if [ "$RC" -ne 0 ]; then
  fail "canonical-only: exits 0" "rc=$RC"
elif ! cmp -s "$P5/.claude/settings.json" "$TMPDIR_TEST/p5-before.json"; then
  fail "canonical-only: file unchanged" "$(diff "$TMPDIR_TEST/p5-before.json" "$P5/.claude/settings.json")"
elif grep -q 'removing' <<<"$OUT5"; then
  fail "canonical-only: nothing reported removed" "$OUT5"
elif [ "$(grep -c 'already registered' <<<"$OUT5")" != "2" ]; then
  fail "canonical-only: both hooks reported already registered" "$OUT5"
else
  pass "canonical-only: file untouched, both hooks 'already registered', no removals"
fi

# ── Scenario 6: identity never collapses two different scripts ───────────────
# on-stop.sh under PreCompact is a DIFFERENT hook from on-precompact.sh — a
# mis-registration, but not ours to remove. Neither is a consumer's script
# whose path merely ends the same way under a different skill (Scenario 2
# already covers that under PostToolUse; here it sits under PreCompact itself).
P6="$TMPDIR_TEST/p6"; make_project "$P6"
cat > "$P6/.claude/settings.json" <<'JSON'
{
  "hooks": {
    "PreCompact": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/skills/develop-story/scripts/on-stop.sh\"" } ] },
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/skills/other-skill/scripts/on-precompact.sh\"" } ] }
    ]
  }
}
JSON
OUT6=$(run_installer "$P6" 2>&1); RC=$?
S6="$P6/.claude/settings.json"
CMDS6=$(jq -r '.hooks.PreCompact[].hooks[].command' "$S6" | sort)
if [ "$RC" -ne 0 ]; then
  fail "no-collapse: exits 0" "rc=$RC"
elif [ "$(jq '.hooks.PreCompact | length' "$S6")" != "3" ]; then
  fail "no-collapse: the two unrelated entries survive and ours is added (3 total)" "$(jq -c '.hooks.PreCompact' "$S6")"
elif ! grep -qF 'develop-story/scripts/on-stop.sh' <<<"$CMDS6" || ! grep -qF 'other-skill/scripts/on-precompact.sh' <<<"$CMDS6"; then
  fail "no-collapse: a different script under the same event is never removed" "$CMDS6"
elif grep -q 'removing' <<<"$OUT6"; then
  fail "no-collapse: nothing reported removed" "$OUT6"
else
  pass "no-collapse: a different hook script and a different skill's same-named script both survive; ours is added beside them"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
