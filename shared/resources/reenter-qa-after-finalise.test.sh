#!/usr/bin/env bash
# reenter-qa-after-finalise.test.sh — regression tests for reenter-qa-after-finalise.sh (task.170)
#
# Usage: bash shared/resources/reenter-qa-after-finalise.test.sh
#
# Each case builds a throwaway git repository in a temp directory — a work-item directory with a
# gate whose `head:` is a real commit, a DoD file, and a halt snapshot — and runs the script from
# that repository's root, which is where the pipeline runs it. Pins:
#   • every refusal reason, and that a refusal writes nothing and consumes nothing
#   • a document-only fix is refused; committed, uncommitted and untracked code all count as moved
#   • a gate head that cannot vouch for the tree (none, not 40-hex, not an ancestor) counts as moved
#   • the accept path: step 5, qa_phase 5a, qa_max_cycles = max(existing, base + 2), qa_reentry
#   • no temp file is left beside the lock, on success or failure

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/reenter-qa-after-finalise.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
DOC=docs/tasks/task.42.example

# mkrepo NAME [GATE_HEAD_MODE] — a repo with one code commit, a gate whose head is that commit,
# a GAPS DoD file and a step-7 halt snapshot for $DOC. GATE_HEAD_MODE: sha (default) | none | HEAD.
# Sets R (repo root), L (lock), S (snapshot).
mkrepo() {
  R="$T/$1"; L="$R/.claude/state/lock.json"; S="$R/.claude/state/last-halt.json"
  mkdir -p "$R/$DOC" "$R/src" "$R/.claude/state"
  git -C "$R" init -q
  git -C "$R" config user.email t@t; git -C "$R" config user.name t; git -C "$R" config commit.gpgsign false
  printf '.claude/\n' > "$R/.gitignore"
  echo one > "$R/src/code.sh"
  echo "# task" > "$R/$DOC/task.42.example.md"
  git -C "$R" add -A; git -C "$R" commit -qm code
  local head; head=$(git -C "$R" rev-parse HEAD)
  case "${2:-sha}" in
    sha)  printf 'schema: 2\nhead: %s\ngate: PASS\n' "$head" ;;
    none) printf 'schema: 1\ngate: PASS\n' ;;
    HEAD) printf 'schema: 2\nhead: HEAD\ngate: PASS\n' ;;
  esac > "$R/$DOC/task.42.gate.2.example.yml"
  : > "$R/$DOC/task.42.gate.1.example.yml"
  printf '# DoD\n\n## Verification Complete\n\n**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED\n' > "$R/$DOC/task.42.dod.1.example.md"
  git -C "$R" add -A; git -C "$R" commit -qm "gate + dod"
  printf '{"skill":"develop-task","current_step":7,"task_or_story_directory":"%s","branch":"feature/x","qa_max_cycles":5,"halted_at":"2026-10-01T00:00:00Z","halt_reason":"finalise DoD gaps","halt_step":"7"}\n' "$DOC" > "$S"
}
codefix() { # a committed code change outside the work item — the movement the re-entry measures
  echo two > "$R/src/code.sh"; git -C "$R" commit -qam "code fix"
}
run() { # extra args → script; runs from the repo root
  (cd "$R" && PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" "$DOC" "$@")
}
leftovers() { find "$R/.claude/state" -name '.reenter-qa.*' -o -name '.advance-pipeline-lock.*' 2>/dev/null | grep -c . ; }

# expect_refusal NAME REASON — runs the script, expects exit 1 naming REASON, no lock written,
# the snapshot (if any) still on disk, and no temp file.
expect_refusal() {
  local name="$1" reason="$2" snap_before err rc
  snap_before=$([ -f "$S" ] && cat "$S")
  err=$(run 2>&1 >/dev/null); rc=$?
  if [ "$rc" -ne 1 ]; then fail "$name" "rc=$rc (want 1) err=$err"; return; fi
  if ! printf '%s' "$err" | grep -q "refused ($reason)"; then fail "$name" "reason not named ($reason): $err"; return; fi
  if [ -n "$snap_before" ] && [ "$(cat "$S" 2>/dev/null)" != "$snap_before" ]; then fail "$name" "snapshot consumed or changed by a refusal"; return; fi
  if [ "$reason" != lock-present ] && [ -f "$L" ]; then fail "$name" "a refusal wrote a lock: $(cat "$L")"; return; fi
  if [ "$(leftovers)" -ne 0 ]; then fail "$name" "temp file left behind"; return; fi
  pass "$name → refused ($reason), nothing written, nothing consumed"
}

echo "reenter-qa-after-finalise.sh"

# ── Refusals ─────────────────────────────────────────────────────────────────
mkrepo no-snap; rm -f "$S"; codefix
expect_refusal "no halt snapshot" no-snapshot

mkrepo other-doc; codefix
jq '.task_or_story_directory = "docs/tasks/task.99.other"' "$S" > "$S.n" && mv "$S.n" "$S"; mkdir -p "$R/docs/tasks/task.99.other"
expect_refusal "snapshot for another document" no-snapshot

mkrepo step5; codefix
jq '.halt_step = "5" | .halt_reason = "loop-limit"' "$S" > "$S.n" && mv "$S.n" "$S"
expect_refusal "halt_step 5 (a loop-limit halt)" not-a-finalise-halt

mkrepo pause; codefix
jq 'del(.halt_step, .halted_at, .halt_reason) | .paused_at = "x" | .pause_reason = "precompact"' "$S" > "$S.n" && mv "$S.n" "$S"
expect_refusal "a PreCompact pause at step 7 (no halt_step)" not-a-finalise-halt

mkrepo nodod; codefix; rm -f "$R/$DOC"/*.dod.*
expect_refusal "no DoD file" no-dod

mkrepo accepted; codefix
printf '**Final Status:** ✅ ACCEPTED\n' > "$R/$DOC/task.42.dod.2.example.md"
expect_refusal "newest DoD file accepted (dod.2 outranks dod.1's GAPS)" dod-not-gaps

mkrepo nogate; codefix; rm -f "$R/$DOC"/*.gate.*
expect_refusal "no gate" no-gate

mkrepo docs-only
echo "re-scoped criterion" >> "$R/$DOC/task.42.example.md"; git -C "$R" commit -qam "doc fix"
echo "uncommitted doc edit" >> "$R/$DOC/task.42.example.md"
expect_refusal "document-only fix (committed + uncommitted, inside the work-item directory)" no-code-moved

mkrepo live-lock; codefix; printf '{"current_step":7}\n' > "$L"
expect_refusal "a live lock" lock-present
[ "$(jq -c . "$L")" = '{"current_step":7}' ] && pass "lock-present leaves the live lock untouched" || fail "live lock untouched" "$(cat "$L")"

# ── Accept ───────────────────────────────────────────────────────────────────
# accept NAME [report-arg] — expects exit 0 and the full re-entry shape; WANT_MAX is the budget.
accept() {
  local name="$1"; shift
  local out rc
  out=$(run "$@" 2>/dev/null); rc=$?
  if [ "$rc" -ne 0 ] || [ ! -f "$L" ]; then fail "$name" "rc=$rc lock=$([ -f "$L" ] && echo yes || echo no) out=$out err=$(run "$@" 2>&1 >/dev/null)"; return; fi
  local got; got=$(jq -c '{s: .current_step, p: .qa_phase, m: .qa_max_cycles, r: .qa_reentry.reason, f: .qa_reentry.from_step, h: (.qa_reentry.gate_head|length), at: (.qa_reentry.at|test("^[0-9]{4}-")), halt: (has("halt_step") or has("halt_reason") or has("halted_at"))}' "$L")
  local want="{\"s\":5,\"p\":\"5a\",\"m\":$WANT_MAX,\"r\":\"dod-gaps-code-fix\",\"f\":7,\"h\":$WANT_HEADLEN,\"at\":true,\"halt\":false}"
  if [ "$got" != "$want" ]; then fail "$name" "lock $got, want $want"; return; fi
  if [ -f "$S" ]; then fail "$name" "snapshot not consumed by the restore"; return; fi
  if [ "$(leftovers)" -ne 0 ]; then fail "$name" "temp file left behind"; return; fi
  if ! printf '%s' "$out" | grep -q "qa_max_cycles=$WANT_MAX"; then fail "$name" "stdout does not report the budget: $out"; return; fi
  pass "$name → step 5 / 5a, qa_max_cycles $WANT_MAX, qa_reentry recorded, snapshot consumed"
}
WANT_HEADLEN=40

mkrepo committed; codefix
WANT_MAX=5; accept "committed code fix (existing budget 5 > base 2 + 2 is kept)"
[ "$(jq -r '.qa_reentry.gate_head' "$L")" = "$(git -C "$R" rev-parse HEAD~2)" ] && pass "qa_reentry.gate_head is the gate's head" || fail "gate_head recorded" "$(jq -c .qa_reentry "$L")"
[ "$(jq -r '.branch' "$L")" = "feature/x" ] && pass "pipeline fields carried over from the snapshot" || fail "fields carried" "$(cat "$L")"

# Uncommitted work is refused, never accepted and never sent to /finalise: the re-entered review reads
# committed history and qa-task Step 3b HALTs on an uncommitted tracked change (QA cycle 3, CR-4).
mkrepo uncommitted; echo two > "$R/src/code.sh"
expect_refusal "an uncommitted tracked fix is refused (commit it first)" uncommitted-fix
mkrepo uncommitted-plus; codefix; echo three > "$R/src/code.sh"
expect_refusal "an uncommitted change beside a committed fix is still refused" uncommitted-fix
# Untracked files: alone they may be the fix → refused; beside a committed fix they are the files
# Step 4 restored → listed, not counted (QA cycle 3, CR-2).
mkrepo untracked; echo new > "$R/src/new-fix.sh"
expect_refusal "untracked files with no committed movement are refused (they may be the fix)" uncommitted-fix
mkrepo untracked-held; codefix; echo held > "$R/src/held-aside.sh"
WANT_MAX=5; accept "a committed fix beside an untracked held-aside file re-enters"
mkrepo untracked-warn; codefix; echo held > "$R/src/held-aside.sh"
ERR=$(run 2>&1 >/dev/null)
printf '%s' "$ERR" | grep -q 'held-aside.sh' && pass "the untracked file is named on stderr" || fail "untracked listed" "err=$ERR"

mkrepo budget; codefix
jq 'del(.qa_max_cycles)' "$S" > "$S.n" && mv "$S.n" "$S"
WANT_MAX=5; accept "no prior budget → the loop's default 5 is kept (base 2 + 2 = 4 would lower it)"

mkrepo budget-high; codefix
jq 'del(.qa_max_cycles)' "$S" > "$S.n" && mv "$S.n" "$S"
: > "$R/$DOC/task.42.gate.3.example.yml"; cp "$R/$DOC/task.42.gate.2.example.yml" "$R/$DOC/task.42.gate.4.example.yml"
git -C "$R" add -A; git -C "$R" commit -qm "gates 3-4"
WANT_MAX=6; accept "no prior budget, base 4 → 4 + 2 = 6 (above the default)"

mkrepo report; codefix
jq 'del(.qa_max_cycles)' "$S" > "$S.n" && mv "$S.n" "$S"
printf '# r\n### QA Cycle 1\n### QA Cycle 2\n### QA Cycle 3\n' > "$R/report.md"
WANT_MAX=5; accept "report ahead of the gates → base is the report's 3, + 2 = 5" report.md

mkrepo nohead none
WANT_MAX=5; WANT_HEADLEN=0; accept "a gate with no head: (schema 1) counts as moved even with no change"
mkrepo symbolic HEAD
WANT_MAX=5; WANT_HEADLEN=4; accept "a gate head that is not 40-hex counts as moved even with no change"
WANT_HEADLEN=40

# A head that is a real commit but not an ancestor of HEAD (an off-branch commit) cannot vouch for
# this tree: counted as moved, with no change on the branch (task.168 CR4-1's case).
mkrepo offbranch
git -C "$R" checkout -qb side; echo side > "$R/src/side.sh"; git -C "$R" add -A; git -C "$R" commit -qm side
SIDE=$(git -C "$R" rev-parse HEAD); git -C "$R" checkout -q -
sed -i.bak -E "s/^head: .*/head: $SIDE/" "$R/$DOC/task.42.gate.2.example.yml" && rm -f "$R/$DOC/task.42.gate.2.example.yml.bak"
git -C "$R" commit -qam "gate re-recorded"
WANT_MAX=5; accept "a gate head that is not an ancestor of HEAD counts as moved even with no code change"

mkrepo numeric; codefix
jq '.halt_step = 7' "$S" > "$S.n" && mv "$S.n" "$S"
WANT_MAX=5; accept "a numeric halt_step 7 is accepted as well as the string"

# ── CR-1: the DoD lookup is keyed on the work item's stem, not the directory ──
# A co-located bug writes {bug-prefix}.dod.{N}.*.md beside the task's own DoD. A higher-numbered
# bug DoD must never be read as the task's verdict, in either direction.
mkrepo bugdod-accepted; codefix
printf '**Final Status:** ✅ ACCEPTED\n' > "$R/$DOC/task.42.bug.3.dod.2.x.md"
WANT_MAX=5; accept "a higher-numbered co-located bug DoD (ACCEPTED) is not the task's verdict — task GAPS re-enters"
mkrepo bugdod-gaps; codefix
printf '**Final Status:** ✅ ACCEPTED\n' > "$R/$DOC/task.42.dod.1.example.md"
printf '**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED\n' > "$R/$DOC/task.42.bug.3.dod.4.x.md"
expect_refusal "a co-located bug DoD at GAPS does not stand in for an accepted task DoD" dod-not-gaps
mkrepo taskprefix; codefix
printf '**Final Status:** ✅ ACCEPTED\n' > "$R/$DOC/task.420.dod.9.other.md"
WANT_MAX=5; accept "another work item's stem sharing the prefix (task.420) is not read as task.42's DoD"

# ── QA cycle 2 CR-2: a parallel-story directory has a stem ───────────────────
# create-parallel-stories numbers stories story.{epic}.{n}-{m}; the stem keeps the suffix.
SAVED_DOC=$DOC; DOC=docs/stories/story.305.1-1.example-feature
mkrepo parallel-story; codefix
for f in "$R/$DOC"/task.42.*; do mv "$f" "$R/$DOC/story.305.1-1.${f##*/task.42.}"; done
git -C "$R" add -A; git -C "$R" commit -qm "story names"
WANT_MAX=5; accept "a hybrid-numbered parallel story (story.305.1-1) re-enters"
DOC=$SAVED_DOC

# QA cycle 3 CR-3: a four-part sub-story (story.309.2.3A) — the stem is read from its DoD files.
SAVED_DOC=$DOC; DOC=docs/stories/story.309.2.3A.core-notification-ui
mkrepo sub-story; codefix
for f in "$R/$DOC"/task.42.*; do mv "$f" "$R/$DOC/story.309.2.3A.${f##*/task.42.}"; done
printf '**Final Status:** ✅ ACCEPTED\n' > "$R/$DOC/story.309.2.dod.9.parent.md"
git -C "$R" add -A; git -C "$R" commit -qm "story names"
WANT_MAX=5; accept "a four-part sub-story (story.309.2.3A) re-enters; the parent story.309.2 DoD is not its verdict"
DOC=$SAVED_DOC

# The stem must be continued by the directory name with a ".": in task.420.other, a lone task.42 DoD
# is another work item's, not this one's (the "." is what tells task.42 from task.420).
SAVED_DOC=$DOC; DOC=docs/tasks/task.420.other
mkrepo stem-dot; codefix
for f in "$R/$DOC"/task.42.dod.*; do mv "$f" "$R/$DOC/task.42.dod.1.elsewhere.md"; done
git -C "$R" add -A; git -C "$R" commit -qm "only a task.42 DoD here"
expect_refusal "a task.42 DoD inside task.420.other is not the work item's DoD" no-dod
DOC=$SAVED_DOC

# ── QA cycle 3 CR-1: qa_reentry records the base cycle the resume precedence keys on ──
mkrepo base-cycle; codefix
WANT_MAX=5; accept "committed fix (base_cycle recorded)"
[ "$(jq -r '.qa_reentry.base_cycle' "$L")" = "2" ] && pass "qa_reentry.base_cycle is the reconstructed base (gate.2 → 2)" || fail "base_cycle" "$(jq -c .qa_reentry "$L")"

# ── CR-2: .claude/state is not movement ──────────────────────────────────────
# In a repo that does not gitignore .claude/, the halt snapshot this script consumes is an untracked
# file. Counted as movement, it would make no-code-moved unreachable.
mkrepo noignore
git -C "$R" rm -q --cached .gitignore; rm -f "$R/.gitignore"; git -C "$R" commit -qm "no gitignore"
mkrepo_gate_head=$(git -C "$R" rev-parse HEAD)
sed -i.bak -E "s/^head: .*/head: $mkrepo_gate_head/" "$R/$DOC/task.42.gate.2.example.yml" && rm -f "$R/$DOC/task.42.gate.2.example.yml.bak"
git -C "$R" commit -qam "gate re-recorded at the no-gitignore head"
echo "doc-only" >> "$R/$DOC/task.42.example.md"
expect_refusal "an untracked .claude/state snapshot (no .gitignore) is not code movement" no-code-moved

# ── QA-1: hostile gate head: values never execute and fail toward re-review ──
# The gate's head: is the one value this script reads but does not write. Each must be refused as a
# revision (counted as moved, so the re-entry fires), and none may run a substitution.
hostile_head() { # $1 = label, $2 = the head value written verbatim
  mkrepo "hostile-$1" HEAD
  { printf 'schema: 2\nhead: '; printf '%s' "$2"; printf '\ngate: PASS\n'; } > "$R/$DOC/task.42.gate.2.example.yml"
  git -C "$R" commit -qam "hostile head"
  local out rc pwned
  out=$(run 2>&1); rc=$?
  pwned=$(find "$T" -name 'PWNED*' 2>/dev/null | grep -c .)
  if [ "$rc" -eq 0 ] && [ "$pwned" -eq 0 ] && [ "$(jq -r '.current_step' "$L" 2>/dev/null)" = "5" ]; then
    pass "hostile head $1 → never executed, counted as moved, re-entered at 5"
  else
    fail "hostile head $1" "rc=$rc pwned=$pwned lock=$(cat "$L" 2>/dev/null) out=$out"
  fi
}
hostile_head cmdsub '$(touch PWNED1)'
hostile_head backtick '`touch PWNED2`'
hostile_head semicolon 'x; touch PWNED3'
hostile_head quoted-cmdsub '"$(touch PWNED4)"'
hostile_head option-all '--all'
hostile_head option-n '-n'
hostile_head symbolic-relative 'HEAD~0'
hostile_head hex-not-a-commit 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'

# ── A failed write keeps the restored lock and leaves no temp file ───────────
mkrepo writefail; codefix
STUB="$T/stubbin"; mkdir -p "$STUB"
REAL_JQ=$(command -v jq)
# A jq that fails only on the re-entry write (the filter that names qa_reentry).
cat > "$STUB/jq" <<EOF
#!/usr/bin/env bash
for a in "\$@"; do case "\$a" in *qa_reentry*) exit 3 ;; esac; done
exec "$REAL_JQ" "\$@"
EOF
chmod +x "$STUB/jq"
ERR=$(cd "$R" && PATH="$STUB:$PATH" PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" "$DOC" 2>&1 >/dev/null); RC=$?
if [ "$RC" -eq 1 ] && [ "$(jq -r '.current_step' "$L" 2>/dev/null)" = "7" ] && [ "$(jq -r 'has("qa_reentry")' "$L")" = "false" ] \
   && [ "$(leftovers)" -eq 0 ] && printf '%s' "$ERR" | grep -q "is kept"; then
  pass "a failed re-entry write keeps the restored step-7 lock and leaves no temp file"
else
  fail "failed write" "rc=$RC lock=$(cat "$L" 2>/dev/null) leftovers=$(leftovers) err=$ERR"
fi

# ── Usage ────────────────────────────────────────────────────────────────────
mkrepo usage
(cd "$R" && bash "$SCRIPT" >/dev/null 2>&1); [ $? -eq 2 ] && pass "no <doc-dir> → exit 2" || fail "usage" "no doc-dir did not exit 2"
(cd "$R" && PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" . >/dev/null 2>&1); [ $? -eq 2 ] && pass "<doc-dir> at the repository root → exit 2" || fail "root doc-dir" "did not exit 2"
[ -f "$S" ] && pass "usage errors consume nothing" || fail "usage consumed" "snapshot gone"
mkdir -p "$R/docs/notes"
(cd "$R" && PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" docs/notes >/dev/null 2>&1); RC=$?
# docs/notes carries no snapshot of its own, so it is refused before the stem check is reached;
# point the snapshot at it to reach the stem check.
jq '.task_or_story_directory = "docs/notes"' "$S" > "$S.n" && mv "$S.n" "$S"
(cd "$R" && PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" docs/notes >/dev/null 2>&1); RC2=$?
[ "$RC" -eq 1 ] && [ "$RC2" -eq 1 ] && pass "a directory no DoD stem continues → refused (no-dod), never guessed" || fail "non-work-item dir" "rc=$RC rc2=$RC2"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
