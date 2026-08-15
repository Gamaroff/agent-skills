#!/usr/bin/env bash
# bitbucket-auth.test.sh — tests for bitbucket-auth.sh
#
# Usage: bash shared/resources/bitbucket-auth.test.sh
#
# The failure mode this helper guards against is SILENT: Bitbucket answers an
# unauthenticated call to a private repo with 404, so a half-formed credential
# reads as "no results" rather than "no credentials". Two consequences shape
# these tests:
#
#   1. Every case asserts on the scheme SELECTED and on the exact argument
#      vector — never on a token's contents, and never merely on "it worked".
#   2. The nothing-set case asserts a non-zero status AND an empty argument
#      vector. A test that only checked the status would pass for a helper that
#      returned 1 while still emitting `--user user:`.

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/bitbucket-auth.sh"
STDERR_FILE=$(mktemp)
trap 'rm -f "$STDERR_FILE"' EXIT

# run_case ENV=VAL... — source the helper in a hermetic subshell.
#
# `env -i` matters: a developer running this suite with their own real
# BITBUCKET_* exported would otherwise see cases pass for the wrong reason.
# Sets RC, SCHEME, COUNT and ARGS (one argument per line, so a value containing
# a space cannot be mistaken for two arguments).
run_case() {
  local out
  out=$(env -i PATH="$PATH" "$@" bash -c '
    source "'"$SCRIPT"'"
    rc=$?
    echo "RC=$rc"
    echo "SCHEME=$BB_AUTH_SCHEME"
    echo "COUNT=${#BB_CURL_AUTH[@]}"
    for a in ${BB_CURL_AUTH[@]+"${BB_CURL_AUTH[@]}"}; do echo "ARG=$a"; done
  ' 2>"$STDERR_FILE")
  RC=$(printf '%s\n' "$out" | sed -n 's/^RC=//p')
  SCHEME=$(printf '%s\n' "$out" | sed -n 's/^SCHEME=//p')
  COUNT=$(printf '%s\n' "$out" | sed -n 's/^COUNT=//p')
  ARGS=$(printf '%s\n' "$out" | sed -n 's/^ARG=//p')
}

ok() {
  echo "  PASS  $1"
  PASS=$((PASS + 1))
}

bad() {
  echo "  FAIL  $1"
  echo "        $2"
  FAIL=$((FAIL + 1))
}

assert_eq() {
  # assert_eq NAME GOT EXPECTED
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected [$3], got [$2]"; fi
}

assert_contains() {
  # assert_contains NAME HAYSTACK NEEDLE
  case "$2" in
  *"$3"*) ok "$1" ;;
  *) bad "$1" "expected to contain [$3], got [$2]" ;;
  esac
}

assert_not_contains() {
  # assert_not_contains NAME HAYSTACK NEEDLE
  case "$2" in
  *"$3"*) bad "$1" "expected NOT to contain [$3], got [$2]" ;;
  *) ok "$1" ;;
  esac
}

echo "bitbucket-auth.sh"
echo

# --- 1. Bearer: access token set, no username ------------------------------
run_case BITBUCKET_ACCESS_TOKEN=bb-access-tok
assert_eq        "bearer: status 0"                "$RC"     "0"
assert_eq        "bearer: scheme selected"         "$SCHEME" "bearer"
assert_eq        "bearer: exactly 2 curl args"     "$COUNT"  "2"
assert_contains  "bearer: header carries token"    "$ARGS"   "Authorization: Bearer bb-access-tok"
assert_not_contains "bearer: no --user emitted"    "$ARGS"   "--user"

# --- 2. Basic: API token + username ----------------------------------------
run_case BITBUCKET_USERNAME=jsmith BITBUCKET_API_TOKEN=ATATTapi
assert_eq        "basic: status 0"                 "$RC"     "0"
assert_eq        "basic: scheme selected"          "$SCHEME" "basic"
assert_eq        "basic: exactly 2 curl args"      "$COUNT"  "2"
assert_contains  "basic: --user user:token"        "$ARGS"   "jsmith:ATATTapi"
assert_not_contains "basic: no Authorization hdr"  "$ARGS"   "Authorization"

# --- 3. Basic via the legacy name (back-compat) ----------------------------
# Consumers written before the 2026-07-28 rename have only APP_PASSWORD. If
# this case ever fails, every unmigrated consumer's tracker calls go silent.
run_case BITBUCKET_USERNAME=jsmith BITBUCKET_APP_PASSWORD=legacyval
assert_eq        "legacy: status 0"                "$RC"     "0"
assert_eq        "legacy: scheme is basic"         "$SCHEME" "basic"
assert_contains  "legacy: fallback value used"     "$ARGS"   "jsmith:legacyval"

# --- 4. API token wins over the legacy name when both are set --------------
# Consumers deliberately set both to the same value; this pins which name is
# authoritative if they ever diverge.
run_case BITBUCKET_USERNAME=jsmith BITBUCKET_API_TOKEN=newtok BITBUCKET_APP_PASSWORD=oldtok
assert_contains     "both basic names: API_TOKEN wins" "$ARGS" "jsmith:newtok"
assert_not_contains "both basic names: legacy unused"  "$ARGS" "oldtok"

# --- 5. Bearer wins when both credential types are present -----------------
run_case BITBUCKET_ACCESS_TOKEN=bb-access-tok BITBUCKET_USERNAME=jsmith BITBUCKET_API_TOKEN=ATATTapi
assert_eq           "precedence: bearer wins"      "$SCHEME" "bearer"
assert_not_contains "precedence: basic not emitted" "$ARGS"  "--user"

# --- 6. Nothing set: loud failure, and NO half-formed credential -----------
run_case
assert_eq "unset: status 1"                        "$RC"     "1"
assert_eq "unset: scheme none"                     "$SCHEME" "none"
assert_eq "unset: argument vector is empty"        "$COUNT"  "0"
assert_contains "unset: stderr names the fix" "$(cat "$STDERR_FILE")" "BITBUCKET_ACCESS_TOKEN"
assert_contains "unset: stderr explains the 404" "$(cat "$STDERR_FILE")" "404"

# --- 7. Username without a token is NOT a credential -----------------------
# The dangerous near-miss: `--user jsmith:` is syntactically valid and
# authenticates nothing.
run_case BITBUCKET_USERNAME=jsmith
assert_eq "username alone: status 1"               "$RC"     "1"
assert_eq "username alone: no args emitted"        "$COUNT"  "0"

# --- 8. Token without a username is NOT a Basic credential -----------------
run_case BITBUCKET_API_TOKEN=ATATTapi
assert_eq "token alone: status 1"                  "$RC"     "1"
assert_eq "token alone: no args emitted"           "$COUNT"  "0"

# --- 9. An empty access token falls through, never an empty Bearer ---------
# `BITBUCKET_ACCESS_TOKEN=` in a .env is the exact shape that produces a
# valid-looking header authenticating nothing.
run_case BITBUCKET_ACCESS_TOKEN= BITBUCKET_USERNAME=jsmith BITBUCKET_API_TOKEN=ATATTapi
assert_eq        "empty bearer var: falls back to basic" "$SCHEME" "basic"
assert_not_contains "empty bearer var: no Bearer header" "$ARGS"   "Bearer"

# --- 10. Empty everything is still a loud failure --------------------------
run_case BITBUCKET_ACCESS_TOKEN= BITBUCKET_USERNAME= BITBUCKET_API_TOKEN=
assert_eq "all empty: status 1"                    "$RC"     "1"
assert_eq "all empty: no args emitted"             "$COUNT"  "0"

# --- 11. Quoting holds for awkward token values ----------------------------
# A Bearer header already contains a space; a token containing one more (or a
# colon) must not split into extra arguments.
run_case "BITBUCKET_ACCESS_TOKEN=tok with space:and-colon"
assert_eq       "awkward bearer: still 2 args"     "$COUNT" "2"
assert_contains "awkward bearer: value intact"     "$ARGS"  "Bearer tok with space:and-colon"

run_case BITBUCKET_USERNAME="user name" "BITBUCKET_API_TOKEN=tok:with:colons"
assert_eq       "awkward basic: still 2 args"      "$COUNT" "2"
assert_contains "awkward basic: value intact"      "$ARGS"  "user name:tok:with:colons"

# --- 12. A resolved credential is silent -----------------------------------
# A helper that chattered on the happy path would put credentials one careless
# `set -x` away from a log, and would pollute --json stdout.
run_case BITBUCKET_ACCESS_TOKEN=bb-access-tok
assert_eq "success: nothing written to stderr" "$(cat "$STDERR_FILE")" ""

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
