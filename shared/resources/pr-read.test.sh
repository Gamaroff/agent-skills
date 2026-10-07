#!/usr/bin/env bash
# pr-read.test.sh — tests for pr-read.sh's pr_read, the forge-aware PR read behind develop-* Step 8.
#
# Usage: bash shared/resources/pr-read.test.sh
#
# verify-push-state.test.sh covers the --pr read through check 5. This file covers what only Step 8
# uses: binding BASE_BRANCH (and PR_NUMBER) with no --pr, by finding the one open PR for the branch.
# A fake curl and gh on PATH stand in for both forges; no case reaches the network.

PASS=0
FAIL=0
LIB="$(cd "$(dirname "$0")" && pwd)/pr-read.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

FAKEBIN="$TMPROOT/fakebin"; mkdir -p "$FAKEBIN"
cat > "$FAKEBIN/curl" <<'SH'
#!/usr/bin/env bash
out=""
while [ $# -gt 0 ]; do
  case "$1" in -o) out="$2"; shift 2 ;; *) printf '%s\n' "$1" >> "$FAKE_CURL_LOG"; shift ;; esac
done
[ -n "$out" ] && cat "$FAKE_CURL_BODY" > "$out"
printf '%s' "$FAKE_CURL_STATUS"
SH
cat > "$FAKEBIN/gh" <<'SH'
#!/usr/bin/env bash
echo "gh $*" >> "$FAKE_CURL_LOG"
printf '%s\n' "$FAKE_GH_LINE"
SH
chmod +x "$FAKEBIN/curl" "$FAKEBIN/gh"
printf 'vcs: bitbucket\n' > "$TMPROOT/bb.yaml"
printf 'vcs: github\n' > "$TMPROOT/gh.yaml"

REPO="$TMPROOT/repo"
git init --quiet -b feature/14.1-thing "$REPO"
git -C "$REPO" remote add origin git@bitbucket.org:acme/wallet.git

# read_pr CONFIG STATUS BODY [args...] — prints "rc|number|head|base|error"
read_pr() {
  local cfg="$1" st="$2" body="$3"; shift 3
  printf '%s' "$body" > "$TMPROOT/body.json"
  : > "$TMPROOT/curl.log"
  ( cd "$REPO" && export PATH="$FAKEBIN:$PATH" SKILLS_CONFIG_FILE="$cfg" BITBUCKET_ACCESS_TOKEN=t \
      FAKE_CURL_LOG="$TMPROOT/curl.log" FAKE_CURL_BODY="$TMPROOT/body.json" FAKE_CURL_STATUS="$st" \
      FAKE_GH_LINE="${FAKE_GH_LINE:-}"
    # shellcheck source=pr-read.sh
    source "$LIB"
    pr_read "$@"; rc=$?
    printf '%s|%s|%s|%s|%s' "$rc" "$PR_READ_NUMBER" "$PR_READ_HEAD" "$PR_READ_BASE" "$PR_READ_ERROR" )
}

echo "pr-read.test.sh"

pr_json() { printf '{"id": %s, "description": "a\tb", "source": {"commit": {"hash": "abcdef123456"}}, "destination": {"branch": {"name": "%s"}}}' "$1" "$2"; }

# ── 1. Bitbucket, no --pr: the one open PR for the current branch binds base and number ──
OUT=$(read_pr "$TMPROOT/bb.yaml" 200 "{\"values\": [$(pr_json 601 develop)]}")
if [ "$OUT" = "0|601|abcdef123456|develop|" ] \
   && grep -qx 'q=source.branch.name="feature/14.1-thing" AND state="OPEN"' "$TMPROOT/curl.log" \
   && grep -q '/repositories/acme/wallet/pullrequests$' "$TMPROOT/curl.log"; then
  pass "Bitbucket, no --pr: base and number bound from the branch's one open PR"
else
  fail "Bitbucket, no --pr: base and number bound from the branch's one open PR" "got $OUT / $(cat "$TMPROOT/curl.log")"
fi

# ── 2–3. None or several open PRs: named, never a guess ──
OUT=$(read_pr "$TMPROOT/bb.yaml" 200 '{"values": []}')
case "$OUT" in
  "1||||found 0 open PRs for branch 'feature/14.1-thing' on Bitbucket"*) pass "Bitbucket, no open PR → rc 1, count named" ;;
  *) fail "Bitbucket, no open PR → rc 1, count named" "got $OUT" ;;
esac
OUT=$(read_pr "$TMPROOT/bb.yaml" 200 "{\"values\": [$(pr_json 1 develop), $(pr_json 2 main)]}")
case "$OUT" in
  "1||||found 2 open PRs"*) pass "Bitbucket, two open PRs → rc 1, never picks one" ;;
  *) fail "Bitbucket, two open PRs → rc 1, never picks one" "got $OUT" ;;
esac

# ── 4. A non-200 names the read and the status ──
OUT=$(read_pr "$TMPROOT/bb.yaml" 404 '')
case "$OUT" in
  "1||||could not read the open PR for branch 'feature/14.1-thing' on Bitbucket (HTTP 404)") pass "Bitbucket, HTTP 404 → rc 1, read and status named" ;;
  *) fail "Bitbucket, HTTP 404 → rc 1, read and status named" "got $OUT" ;;
esac

# ── 5. --pr reads that PR directly ──
OUT=$(read_pr "$TMPROOT/bb.yaml" 200 "$(pr_json 601 release/1.2)" --pr 601)
if [ "$OUT" = "0|601|abcdef123456|release/1.2|" ] && grep -q '/pullrequests/601$' "$TMPROOT/curl.log"; then
  pass "Bitbucket, --pr: base read from .destination.branch.name"
else
  fail "Bitbucket, --pr: base read from .destination.branch.name" "got $OUT"
fi

# ── 6. A 200 whose body is not a PR is a parse failure, not an empty success ──
OUT=$(read_pr "$TMPROOT/bb.yaml" 200 '<html>login</html>' --pr 601)
case "$OUT" in
  "1||||could not parse PR #601 on Bitbucket"*) pass "Bitbucket, HTTP 200 with a non-PR body → rc 1, named" ;;
  *) fail "Bitbucket, HTTP 200 with a non-PR body → rc 1, named" "got $OUT" ;;
esac

# ── 6b. A detached HEAD is named, never queried as a branch called "HEAD" ──
git -C "$REPO" -c user.email=t@e -c user.name=t commit --quiet --allow-empty -m c
git -C "$REPO" checkout --quiet --detach
OUT=$(read_pr "$TMPROOT/bb.yaml" 200 '{"values": []}')
case "$OUT" in
  "1||||HEAD is detached"*)
    if [ ! -s "$TMPROOT/curl.log" ]; then pass "Bitbucket, detached HEAD, no --pr → rc 1, named, no request"
    else fail "Bitbucket, detached HEAD, no --pr → rc 1, named, no request" "curl was called"; fi ;;
  *) fail "Bitbucket, detached HEAD, no --pr → rc 1, named, no request" "got $OUT" ;;
esac
git -C "$REPO" checkout --quiet feature/14.1-thing

# ── 7. GitHub: gh answers, curl is never called ──
OUT=$(FAKE_GH_LINE="7 $(printf 'a%.0s' $(seq 40)) main" read_pr "$TMPROOT/gh.yaml" 200 '')
if [ "$OUT" = "0|7|$(printf 'a%.0s' $(seq 40))|main|" ] && grep -q '^gh pr view --json' "$TMPROOT/curl.log" \
   && [ "$(grep -vc '^gh ' "$TMPROOT/curl.log")" = 0 ]; then
  pass "GitHub, no --pr: bound through gh, curl never called"
else
  fail "GitHub, no --pr: bound through gh, curl never called" "got $OUT / $(cat "$TMPROOT/curl.log")"
fi

# ── 9. zsh: macOS logins are zsh, and Step 8 sources this into the caller's shell. zsh ties `path`
#    to PATH and reserves `status`; a local named either breaks the read only there. ──
if command -v zsh >/dev/null 2>&1; then
  printf '%s' "{\"values\": [$(pr_json 601 develop)]}" > "$TMPROOT/body.json"
  OUT=$( cd "$REPO" && PATH="$FAKEBIN:$PATH" SKILLS_CONFIG_FILE="$TMPROOT/bb.yaml" BITBUCKET_ACCESS_TOKEN=t \
      FAKE_CURL_LOG="$TMPROOT/curl.log" FAKE_CURL_BODY="$TMPROOT/body.json" FAKE_CURL_STATUS=200 \
      zsh -c 'source "$1" || exit 9; pr_read; printf "%s|%s|%s|%s|%s" $? "$PR_READ_NUMBER" "$PR_READ_HEAD" "$PR_READ_BASE" "$PR_READ_ERROR"' _ "$LIB" 2>&1 )
  [ "$OUT" = "0|601|abcdef123456|develop|" ] && pass "zsh: sourced and called from zsh, the Bitbucket read binds base and number" \
    || fail "zsh: sourced and called from zsh, the Bitbucket read binds base and number" "got $OUT"
else
  echo "  SKIP  zsh not on PATH"
fi

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
