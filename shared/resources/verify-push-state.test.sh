#!/usr/bin/env bash
# verify-push-state.test.sh — regression tests for verify-push-state.sh
#
# Usage: bash shared/resources/verify-push-state.test.sh
#
# These are MUTATION tests, not smoke tests. A guard that returns 0 on a healthy
# repo proves nothing — the 2026-08-13 incident it was written for produced a
# green-looking report precisely because nobody checked the unhealthy case. So
# every test here constructs the specific broken state and asserts the guard
# BITES. The happy path is one test; the failure modes are seven.
#
# Covers:
#   1. clean, committed, pushed             → exit 0
#   2. EMPTY branch (0 commits ahead)       → exit 1   ← the incident itself
#   3. uncommitted working tree             → exit 1
#   4. committed but never pushed           → exit 1
#   5. local ahead of remote (partial push) → exit 1
#   6. rebase in progress                   → exit 1
#   7. branch absent from remote            → exit 1
#   8. missing --base                       → exit 2
#   9. not a git repository                 → exit 2

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/verify-push-state.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

# new_repo NAME → a repo with an "origin" remote and one base commit on `main`,
# checked out on a feature branch. Prints the repo path.
new_repo() {
  local name="$1"
  local up="$TMPROOT/$name.git"
  local wt="$TMPROOT/$name"
  git init --quiet --bare "$up"
  git init --quiet -b main "$wt"
  (
    cd "$wt" || exit 1
    git config user.email t@example.com
    git config user.name Test
    git config commit.gpgsign false
    echo base > base.txt
    git add base.txt
    git commit --quiet -m "base"
    git remote add origin "$up"
    git push --quiet -u origin main 2>/dev/null
    git checkout --quiet -b feature/x
  )
  echo "$wt"
}

commit_work() {
  ( cd "$1" && echo work > work.txt && git add work.txt && git commit --quiet -m "work" )
}

run_guard() {
  ( cd "$1" && bash "$SCRIPT" --base "${2:-main}" >/dev/null 2>&1 )
  echo $?
}

echo "verify-push-state.test.sh"

# ── 1. Happy path ─────────────────────────────────────────────────────────────
R=$(new_repo happy); commit_work "$R"
( cd "$R" && git push --quiet -u origin feature/x 2>/dev/null )
EXIT=$(run_guard "$R")
[ "$EXIT" = "0" ] && pass "clean+committed+pushed → exit 0" \
                  || fail "clean+committed+pushed → exit 0" "got exit $EXIT"

# ── 2. THE INCIDENT: branch pushed but empty ──────────────────────────────────
# The branch ref exists on the remote and the push succeeded — it just carries
# no commits. Every naive "did you push?" test passes here.
R=$(new_repo empty)
( cd "$R" && git push --quiet -u origin feature/x 2>/dev/null )
EXIT=$(run_guard "$R")
[ "$EXIT" = "1" ] && pass "EMPTY branch push (0 commits ahead) → exit 1" \
                  || fail "EMPTY branch push (0 commits ahead) → exit 1" "got exit $EXIT — the guard did NOT bite"

# ── 3. Uncommitted working tree ───────────────────────────────────────────────
R=$(new_repo dirty); commit_work "$R"
( cd "$R" && git push --quiet -u origin feature/x 2>/dev/null && echo more > extra.txt )
EXIT=$(run_guard "$R")
[ "$EXIT" = "1" ] && pass "uncommitted working tree → exit 1" \
                  || fail "uncommitted working tree → exit 1" "got exit $EXIT"

# ── 4. Committed but never pushed ─────────────────────────────────────────────
R=$(new_repo unpushed); commit_work "$R"
EXIT=$(run_guard "$R")
[ "$EXIT" = "1" ] && pass "committed but branch absent from remote → exit 1" \
                  || fail "committed but branch absent from remote → exit 1" "got exit $EXIT"

# ── 5. Partial push — remote is behind local ──────────────────────────────────
R=$(new_repo partial); commit_work "$R"
( cd "$R" && git push --quiet -u origin feature/x 2>/dev/null )
commit_work_second() { ( cd "$1" && echo more > second.txt && git add second.txt && git commit --quiet -m "second" ); }
commit_work_second "$R"
EXIT=$(run_guard "$R")
[ "$EXIT" = "1" ] && pass "local ahead of remote (unpushed commit) → exit 1" \
                  || fail "local ahead of remote (unpushed commit) → exit 1" "got exit $EXIT"

# ── 6. Rebase in progress ─────────────────────────────────────────────────────
R=$(new_repo rebasing); commit_work "$R"
( cd "$R" && git push --quiet -u origin feature/x 2>/dev/null && mkdir -p "$(git rev-parse --git-dir)/rebase-merge" )
EXIT=$(run_guard "$R")
[ "$EXIT" = "1" ] && pass "rebase in progress → exit 1" \
                  || fail "rebase in progress → exit 1" "got exit $EXIT"

# ── 7. Base ref does not resolve ──────────────────────────────────────────────
R=$(new_repo nobase); commit_work "$R"
( cd "$R" && git push --quiet -u origin feature/x 2>/dev/null )
EXIT=$(run_guard "$R" "no-such-base")
[ "$EXIT" = "1" ] && pass "unresolvable --base → exit 1" \
                  || fail "unresolvable --base → exit 1" "got exit $EXIT"

# ── 8. Usage: missing --base ──────────────────────────────────────────────────
R=$(new_repo usage)
( cd "$R" && bash "$SCRIPT" >/dev/null 2>&1 ); EXIT=$?
[ "$EXIT" = "2" ] && pass "missing --base → exit 2" \
                  || fail "missing --base → exit 2" "got exit $EXIT"

# ── 9. Not a git repository ───────────────────────────────────────────────────
NOGIT="$TMPROOT/plain"; mkdir -p "$NOGIT"
( cd "$NOGIT" && bash "$SCRIPT" --base main >/dev/null 2>&1 ); EXIT=$?
[ "$EXIT" = "2" ] && pass "not a git repository → exit 2" \
                  || fail "not a git repository → exit 2" "got exit $EXIT"

# ── 10–13. --scope: dirt is judged against the run's own paths (obs #142) ─────
# A checkout another session is editing: that session's package.json is outside the
# scope and must be named, not failed on. The run's own unfinished edit inside the
# scope still fails. Without --scope nothing changes: any dirt fails.
scoped_repo() {
  local R; R=$(new_repo "$1"); commit_work "$R"
  ( cd "$R" && mkdir -p docs/tasks/task.1 && echo r > docs/tasks/task.1/r.md \
      && git add docs/tasks/task.1/r.md && git commit --quiet -m "report" \
      && echo pkg > package.json && git add package.json && git commit --quiet -m pkg \
      && git push --quiet -u origin feature/x 2>/dev/null )
  echo "$R"
}

R=$(scoped_repo scoped-outside)
( cd "$R" && echo edited > package.json && echo new > other-session.txt )
OUT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.1 2>&1 ); EXIT=$?
if [ "$EXIT" = "0" ] && printf '%s\n' "$OUT" | grep -q "! outside scope (warning): package.json" \
   && printf '%s\n' "$OUT" | grep -q "! outside scope (warning): other-session.txt"; then
  pass "--scope, dirt only outside scope → exit 0 with each path named"
else
  fail "--scope, dirt only outside scope → exit 0 with each path named" "got exit $EXIT: $OUT"
fi

R=$(scoped_repo scoped-inside)
( cd "$R" && echo edited > docs/tasks/task.1/r.md && echo edited > package.json )
OUT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.1/ 2>&1 ); EXIT=$?
if [ "$EXIT" = "1" ] && printf '%s\n' "$OUT" | grep -q "DIRTY within scope"; then
  pass "--scope, dirt inside scope → exit 1"
else
  fail "--scope, dirt inside scope → exit 1" "got exit $EXIT: $OUT"
fi

R=$(scoped_repo scoped-newdir)
( cd "$R" && mkdir -p docs/tasks/task.1/sub && echo n > docs/tasks/task.1/sub/new.md )
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.1 >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope, new untracked file in a new dir inside scope → exit 1" \
                  || fail "--scope, new untracked file in a new dir inside scope → exit 1" "got exit $EXIT"

R=$(scoped_repo unscoped-outside)
( cd "$R" && echo edited > package.json )
EXIT=$(run_guard "$R")
[ "$EXIT" = "1" ] && pass "no --scope, dirt outside any work item → exit 1 (unchanged)" \
                  || fail "no --scope, dirt outside any work item → exit 1 (unchanged)" "got exit $EXIT"

# ── 14–20. --scope edge cases (task.147 QA cycle 1) ───────────────────────────
# A move out of the work item is a pending removal from it: both sides of a rename are judged.
R=$(scoped_repo rename-out)
( cd "$R" && git mv docs/tasks/task.1/r.md moved-out.md )
OUT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.1 2>&1 ); EXIT=$?
if [ "$EXIT" = "1" ] && printf '%s\n' "$OUT" | grep -q "docs/tasks/task.1/r.md (moved or copied away)"; then
  pass "--scope, staged rename inside → outside → exit 1, source named"
else
  fail "--scope, staged rename inside → outside → exit 1, source named" "got exit $EXIT: $OUT"
fi

R=$(scoped_repo rename-in)
( cd "$R" && git mv package.json docs/tasks/task.1/package.json )
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.1 >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope, staged rename outside → inside → exit 1" \
                  || fail "--scope, staged rename outside → inside → exit 1" "got exit $EXIT"

# A ./-prefixed or absolute scope is normalised to what porcelain prints, not left matching nothing.
R=$(scoped_repo dot-scope)
( cd "$R" && echo edited > docs/tasks/task.1/r.md )
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope ./docs/tasks/task.1/ >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope ./dir/ is normalised — inside dirt → exit 1" \
                  || fail "--scope ./dir/ is normalised — inside dirt → exit 1" "got exit $EXIT"

R=$(scoped_repo abs-scope)
( cd "$R" && echo edited > docs/tasks/task.1/r.md )
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope "$(pwd -P)/docs/tasks/task.1" >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope <absolute path> is normalised — inside dirt → exit 1" \
                  || fail "--scope <absolute path> is normalised — inside dirt → exit 1" "got exit $EXIT"

# A scope that names nothing, or a path outside the repository, is a usage error — never a
# vacuous pass.
R=$(scoped_repo no-such-scope)
( cd "$R" && echo edited > docs/tasks/task.1/r.md )
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.99 >/dev/null 2>&1; echo $? )
[ "$EXIT" = "2" ] && pass "--scope naming nothing → exit 2" \
                  || fail "--scope naming nothing → exit 2" "got exit $EXIT"

EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope /tmp >/dev/null 2>&1; echo $? )
[ "$EXIT" = "2" ] && pass "--scope outside the repository → exit 2" \
                  || fail "--scope outside the repository → exit 2" "got exit $EXIT"

# An unreadable status is a failure, never an empty (clean) list.
R=$(scoped_repo bad-index)
( cd "$R" && printf 'garbage' > "$(git rev-parse --git-dir)/index" )
OUT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.1 2>&1 ); EXIT=$?
if [ "$EXIT" = "1" ] && printf '%s\n' "$OUT" | grep -q "could not read the working-tree status"; then
  pass "--scope, unreadable git status → exit 1, named"
else
  fail "--scope, unreadable git status → exit 1, named" "got exit $EXIT: $OUT"
fi

# ── 21–23. QA cycle 2: worktree rename, symlinked absolute path, '..' ─────────
# A worktree-side rename (" R", an intent-to-add destination) carries a source record too.
R=$(scoped_repo worktree-rename)
( cd "$R" && seq 1 50 > docs/tasks/task.1/long.md && git add docs/tasks/task.1/long.md \
    && git commit --quiet -m long && git push --quiet 2>/dev/null \
    && mv docs/tasks/task.1/long.md moved-away.md && git add -N moved-away.md )
OUT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/task.1 2>&1 ); EXIT=$?
if [ "$EXIT" = "1" ] && printf '%s\n' "$OUT" | grep -q "docs/tasks/task.1/long.md (moved or copied away)"; then
  pass "--scope, worktree-side rename inside → outside → exit 1, source named"
else
  fail "--scope, worktree-side rename inside → outside → exit 1, source named" "got exit $EXIT: $OUT"
fi

# An absolute scope through a symlinked path to the repo is canonicalised, not refused.
R=$(scoped_repo symlinked-abs)
LINK="$TMPROOT/link-to-symlinked-abs"
ln -s "$R" "$LINK"
( cd "$R" && echo edited > docs/tasks/task.1/r.md )
EXIT=$( cd "$LINK" && bash "$SCRIPT" --base main --scope "$LINK/docs/tasks/task.1" >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope via a symlinked absolute path is canonicalised — inside dirt → exit 1" \
                  || fail "--scope via a symlinked absolute path is canonicalised — inside dirt → exit 1" "got exit $EXIT"

# A '..' segment would match no porcelain path: refused, never a vacuous pass.
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/tasks/../tasks/task.1 >/dev/null 2>&1; echo $? )
[ "$EXIT" = "2" ] && pass "--scope containing '..' → exit 2" \
                  || fail "--scope containing '..' → exit 2" "got exit $EXIT"

# ── 24–26. QA cycle 3: '.' segments and repeated slashes are normalised, bare '.' refused ──
R=$(scoped_repo dot-segment)
( cd "$R" && echo edited > docs/tasks/task.1/r.md )
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs/./tasks/task.1 >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope docs/./tasks/task.1 is normalised — inside dirt → exit 1" \
                  || fail "--scope docs/./tasks/task.1 is normalised — inside dirt → exit 1" "got exit $EXIT"
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope docs//tasks/task.1 >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope docs//tasks/task.1 is normalised — inside dirt → exit 1" \
                  || fail "--scope docs//tasks/task.1 is normalised — inside dirt → exit 1" "got exit $EXIT"
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope .//docs/tasks/task.1 >/dev/null 2>&1; echo $? )
[ "$EXIT" = "1" ] && pass "--scope .//docs/tasks/task.1 is normalised — inside dirt → exit 1" \
                  || fail "--scope .//docs/tasks/task.1 is normalised — inside dirt → exit 1" "got exit $EXIT"
EXIT=$( cd "$R" && bash "$SCRIPT" --base main --scope . >/dev/null 2>&1; echo $? )
[ "$EXIT" = "2" ] && pass "--scope . (the whole repository) → exit 2" \
                  || fail "--scope . (the whole repository) → exit 2" "got exit $EXIT"

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
