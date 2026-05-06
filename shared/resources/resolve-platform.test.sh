#!/usr/bin/env bash
# resolve-platform.test.sh — smoke tests for resolve-platform.sh
#
# Usage: bash shared/resources/resolve-platform.test.sh
#
# Tests 6 fixture scenarios:
#   1. GH+GH   — no config, GH remote, no JIRA_URL
#   2. GH+Jira — no config, GH remote, JIRA_URL set
#   3. BB+Jira — config: tracker=jira, vcs=bitbucket (overrides remote)
#   4. Config override only — no JIRA_URL, no BB remote, but config sets both
#   5. Malformed YAML — parse error → falls back to env/remote tier
#   6. Missing skills-config.yaml — falls back to env/remote tier

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/resolve-platform.sh"

assert_eq() {
  local name="$1" got_t="$2" got_v="$3" exp_t="$4" exp_v="$5"
  if [ "$got_t" = "$exp_t" ] && [ "$got_v" = "$exp_v" ]; then
    echo "  PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name"
    echo "        expected TRACKER=$exp_t VCS=$exp_v"
    echo "        got      TRACKER=$got_t VCS=$got_v"
    FAIL=$((FAIL + 1))
  fi
}

run_fixture() {
  # run_fixture DIR [env assignments...]
  # Sources SCRIPT inside a clean subshell rooted at DIR,
  # with any supplied env vars pre-exported.
  local dir="$1"; shift
  local env_block=""
  for kv in "$@"; do env_block+="export $kv; "; done

  local out
  out=$(bash -c "
    $env_block
    cd '$dir'
    source '$SCRIPT'
    echo \"TRACKER=\$TRACKER\"
    echo \"VCS=\$VCS\"
  " 2>/dev/null)

  TRACKER_GOT=$(echo "$out" | grep '^TRACKER=' | cut -d= -f2)
  VCS_GOT=$(echo "$out"    | grep '^VCS='     | cut -d= -f2)
}

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# helper: init a bare git repo with a remote
git_with_remote() {
  local dir="$1" url="$2"
  git -C "$dir" init -q 2>/dev/null
  git -C "$dir" remote add origin "$url" 2>/dev/null || true
}

# ── Scenario 1: GH+GH ───────────────────────────────────────────────────────
D1="$TMPDIR_TEST/s1" && mkdir "$D1"
git_with_remote "$D1" "https://github.com/acme/repo.git"
run_fixture "$D1" "JIRA_URL="
assert_eq "GH+GH (no config, GH remote, no JIRA_URL)" "$TRACKER_GOT" "$VCS_GOT" "github" "github"

# ── Scenario 2: GH+Jira ─────────────────────────────────────────────────────
D2="$TMPDIR_TEST/s2" && mkdir "$D2"
git_with_remote "$D2" "https://github.com/acme/repo.git"
run_fixture "$D2" "JIRA_URL=https://acme.atlassian.net"
assert_eq "GH+Jira (no config, GH remote, JIRA_URL set)" "$TRACKER_GOT" "$VCS_GOT" "jira" "github"

# ── Scenario 3: BB+Jira via skills-config.yaml overrides GH remote ──────────
D3="$TMPDIR_TEST/s3" && mkdir "$D3"
git_with_remote "$D3" "https://github.com/acme/repo.git"
printf 'tracker: jira\nvcs: bitbucket\n' > "$D3/skills-config.yaml"
run_fixture "$D3" "JIRA_URL="
assert_eq "BB+Jira (config overrides GH remote)" "$TRACKER_GOT" "$VCS_GOT" "jira" "bitbucket"

# ── Scenario 4: Config sets both, no env vars, no matching remote ────────────
D4="$TMPDIR_TEST/s4" && mkdir "$D4"
git_with_remote "$D4" "https://github.com/acme/repo.git"
printf 'tracker: jira\nvcs: bitbucket\n' > "$D4/skills-config.yaml"
run_fixture "$D4" "JIRA_URL=" "BITBUCKET_USERNAME="
assert_eq "Config explicit (tracker=jira, vcs=bitbucket, no env vars)" "$TRACKER_GOT" "$VCS_GOT" "jira" "bitbucket"

# ── Scenario 5: Malformed YAML → falls back to env/remote ───────────────────
D5="$TMPDIR_TEST/s5" && mkdir "$D5"
git_with_remote "$D5" "https://github.com/acme/repo.git"
printf ': bad: yaml\n  - broken\n' > "$D5/skills-config.yaml"
run_fixture "$D5" "JIRA_URL="
assert_eq "Malformed YAML (parse error → auto → GH fallback)" "$TRACKER_GOT" "$VCS_GOT" "github" "github"

# ── Scenario 6: Missing skills-config.yaml → falls back to env/remote ────────
D6="$TMPDIR_TEST/s6" && mkdir "$D6"
git_with_remote "$D6" "https://bitbucket.org/acme/repo.git"
run_fixture "$D6" "JIRA_URL=https://acme.atlassian.net"
assert_eq "No config file (env JIRA_URL + BB remote)" "$TRACKER_GOT" "$VCS_GOT" "jira" "bitbucket"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
