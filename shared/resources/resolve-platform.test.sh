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

# ── Scenario 7: the `.env` rung — pinned from the RUNTIME side ───────────────
#
# WHY THESE LIVE HERE and not only in the installer's suite. Task 91 added a
# `.env` probe to TRACKER resolution, which changes behaviour for EVERY skill in
# the repo. All twelve spelling cases were written into
# shared/resources/tests/setup-consumer-skill-exclusion.test.mjs — the
# INSTALLER's file — so this resolver's own regression net, the one §8 of that
# task names for catching "an unintended change to it", never covered the rung
# at all. Delete the installer tomorrow and the coverage goes with it.
#
# Each case is a `.env` spelling that cost a defect. The env var is explicitly
# cleared so the `.env` rung is what is under test, not the process environment.
env_case() {
  # env_case NAME DOTENV_CONTENT EXPECTED_TRACKER
  local name="$1" content="$2" want="$3"
  local d="$TMPDIR_TEST/env-$PASS-$FAIL-$RANDOM" && mkdir -p "$d"
  git_with_remote "$d" "https://github.com/acme/repo.git"
  printf '%b' "$content" > "$d/.env"
  run_fixture "$d" "JIRA_URL="
  assert_eq ".env $name" "$TRACKER_GOT" "$VCS_GOT" "$want" "github"
}

env_case "plain assignment"            'JIRA_URL=https://acme.atlassian.net\n'        "jira"
# Missed by a bare `^JIRA_URL=` anchor. A shell that SOURCES such a .env has
# JIRA_URL exported and resolves jira, so missing it recreated the very
# install-vs-run split this rung exists to close.
env_case "export prefix"               'export JIRA_URL=https://acme.atlassian.net\n' "jira"
# A trailing CR satisfies `.+`, so an emptied key read as SET. CRLF is the exact
# spelling task 83 was written to fix.
env_case "empty value, CRLF ending"    'JIRA_URL=\r\n'                                "github"
env_case "quoted empty value"          'JIRA_URL=""\n'                                "github"
# A shell sourcing this file takes the LAST assignment, so first-match-wins
# disagreed with it.
env_case "set then emptied (last wins)" 'JIRA_URL=https://x\nJIRA_URL=\n'             "github"
env_case "a different key ending in JIRA_URL" 'MYJIRA_URL=https://x\n'                 "github"

# The config key must still beat a stale .env — the documented one-line opt-out
# for this behaviour change. If this goes red, a repo that pinned `tracker: github`
# to protect itself from a stale .env has lost that protection.
D8="$TMPDIR_TEST/s8" && mkdir "$D8"
git_with_remote "$D8" "https://github.com/acme/repo.git"
printf 'tracker: github\n' > "$D8/skills-config.yaml"
printf 'JIRA_URL=https://stale.atlassian.net\n' > "$D8/.env"
run_fixture "$D8" "JIRA_URL="
assert_eq "explicit tracker: github beats a stale .env" "$TRACKER_GOT" "$VCS_GOT" "github" "github"

# The process environment ranks ABOVE .env. Both spell jira when set, so the
# ordering is outcome-invisible in the positive case — this pins the negative
# one: an EMPTY .env value must not override a set environment variable.
D9="$TMPDIR_TEST/s9" && mkdir "$D9"
git_with_remote "$D9" "https://github.com/acme/repo.git"
printf 'JIRA_URL=\n' > "$D9/.env"
run_fixture "$D9" "JIRA_URL=https://acme.atlassian.net"
assert_eq "env JIRA_URL wins over an emptied .env" "$TRACKER_GOT" "$VCS_GOT" "jira" "github"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
