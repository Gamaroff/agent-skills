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

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
