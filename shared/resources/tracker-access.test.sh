#!/usr/bin/env bash
# tracker-access.test.sh — tests for the access-level resolution and strict enum validation
# added to resolve-platform.sh, plus the shared read-config.sh reader.
#
# Usage: bash shared/resources/tracker-access.test.sh
#
# What these assert, and why they are shaped this way:
#
#   * On the RESOLVED VALUE and the EXIT STATUS, never on config file contents. A test that greps
#     the YAML it just wrote proves only that printf works.
#
#   * Under `env -i`. A developer with JIRA_URL or AGENT_SKILLS_ACCESS_TRACKER exported would
#     otherwise make cases pass for the wrong reason — the technique bitbucket-auth.test.sh
#     established.
#
#   * Under BOTH tiers where the tiers can disagree. The pyyaml tier is dead on any machine
#     without a bare `python`, so a suite that only exercises the awk path silently skips half the
#     resolver — which is how the mapping-form disagreement survived unnoticed. Tier is forced
#     explicitly via AGENT_SKILLS_CONFIG_TIER rather than taken from whatever the host provides.
#
#   * On stderr content for every rejection, because "fails loudly" means the operator can see
#     which key, which value, and what was legal.

PASS=0
FAIL=0
HERE="$(cd "$(dirname "$0")" && pwd)"
RESOLVER="$HERE/resolve-platform.sh"
PATHS="$HERE/resolve-paths.sh"
READER="$HERE/read-config.sh"

STDERR_FILE=$(mktemp)
TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST" "$STDERR_FILE"' EXIT

ok()  { echo "  PASS  $1"; PASS=$((PASS + 1)); }
bad() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

assert_eq() {
  local name="$1" got="$2" exp="$3"
  [ "$got" = "$exp" ] && ok "$name" || bad "$name" "expected '$exp', got '$got'"
}

assert_rc() {
  local name="$1" got="$2" exp="$3"
  [ "$got" = "$exp" ] && ok "$name" || bad "$name" "expected exit $exp, got $got — stderr: $(tr '\n' ' ' < "$STDERR_FILE")"
}

assert_stderr_has() {
  local name="$1" needle="$2"
  grep -qF -- "$needle" "$STDERR_FILE" && ok "$name" \
    || bad "$name" "stderr did not contain '$needle' — got: $(tr '\n' ' ' < "$STDERR_FILE")"
}

# fixture DIR YAML-or-empty — makes a git repo with a GitHub remote and optional skills-config.yaml
fixture() {
  local dir="$TMPDIR_TEST/$1" yaml="$2"
  rm -rf "$dir"; mkdir -p "$dir"
  git -C "$dir" init -q 2>/dev/null
  git -C "$dir" remote add origin "https://github.com/acme/repo.git" 2>/dev/null || true
  [ -n "$yaml" ] && printf '%b' "$yaml" > "$dir/skills-config.yaml"
  echo "$dir"
}

# run_case DIR [ENV=VAL...] — source the resolver in a clean env; capture RC and the four outputs
run_case() {
  local dir="$1"; shift
  local out
  out=$(env -i PATH="$PATH" HOME="$HOME" "$@" bash -c "
    cd '$dir'
    source '$RESOLVER'
    rc=\$?
    echo \"RC=\$rc\"
    echo \"TRACKER=\$TRACKER\"
    echo \"VCS=\$VCS\"
    echo \"ACCESS_TRACKER=\$ACCESS_TRACKER\"
    echo \"ACCESS_VCS=\$ACCESS_VCS\"
  " 2>"$STDERR_FILE")
  RC=$(echo "$out"  | sed -n 's/^RC=//p')
  T=$(echo "$out"   | sed -n 's/^TRACKER=//p')
  V=$(echo "$out"   | sed -n 's/^VCS=//p')
  AT=$(echo "$out"  | sed -n 's/^ACCESS_TRACKER=//p')
  AV=$(echo "$out"  | sed -n 's/^ACCESS_VCS=//p')
}

echo ""
echo "tracker-access.test.sh"
echo ""

# --- 1. Defaults: a consumer who never opted in ------------------------------
echo "  1. Defaults"
D=$(fixture defaults "")
run_case "$D"
assert_rc "no config → status 0"            "$RC" "0"
assert_eq "no config → ACCESS_TRACKER=full" "$AT" "full"
assert_eq "no config → ACCESS_VCS=full"     "$AV" "full"
assert_eq "no config → TRACKER detects"     "$T"  "github"
assert_eq "no config → VCS detects"         "$V"  "github"

D=$(fixture legal-identity 'tracker: github\nvcs: github\n')
run_case "$D"
assert_rc "legal tracker/vcs, no access: → status 0" "$RC" "0"
assert_eq "legal tracker/vcs → ACCESS_TRACKER=full"  "$AT" "full"

# --- 2. Each of the five modes resolves to itself ----------------------------
echo "  2. The five modes"
for mode in manual command approve read-only full; do
  D=$(fixture "mode-$mode" "access:\n  tracker: $mode\n")
  run_case "$D"
  assert_eq "access.tracker: $mode → ACCESS_TRACKER=$mode" "$AT" "$mode"
done

D=$(fixture mode-partial 'access:\n  tracker: manual\n')
run_case "$D"
assert_eq "access.tracker set alone → ACCESS_VCS still full" "$AV" "full"

# --- 3. Unrecognised values fail loudly, with per-key legal sets --------------
echo "  3. Strict validation"
D=$(fixture typo-access 'access:\n  tracker: mnaual\n')
run_case "$D"
assert_rc          "access.tracker typo → non-zero" "$RC" "1"
assert_stderr_has  "access.tracker typo → names the key"       "access.tracker"
assert_stderr_has  "access.tracker typo → names the value"     "mnaual"
assert_stderr_has  "access.tracker typo → names the legal set" "manual command approve read-only full"

D=$(fixture typo-tracker 'tracker: jria\n')
run_case "$D"
assert_rc         "tracker: jria → non-zero (the live fall-through, now closed)" "$RC" "1"
assert_stderr_has "tracker: jria → names the value" "jria"

# Per-key legal sets: each of these is legal for the OTHER key.
D=$(fixture cross-tracker 'tracker: bitbucket\n')
run_case "$D"
assert_rc         "tracker: bitbucket → non-zero (legal for vcs, not tracker)" "$RC" "1"
assert_stderr_has "tracker: bitbucket → offers tracker's set, not vcs's" "jira github auto"

D=$(fixture cross-vcs 'vcs: jira\n')
run_case "$D"
assert_rc         "vcs: jira → non-zero (legal for tracker, not vcs)" "$RC" "1"
assert_stderr_has "vcs: jira → offers vcs's set, not tracker's" "github bitbucket auto"

# --- 4. access.vcs is accepted as a key, rejected as a non-full value ---------
echo "  4. access.vcs"
D=$(fixture access-vcs 'access:\n  vcs: manual\n')
run_case "$D"
assert_rc         "access.vcs: manual → non-zero" "$RC" "1"
assert_stderr_has "access.vcs: manual → says why" "hard requirement"

D=$(fixture access-vcs-full 'access:\n  vcs: full\n')
run_case "$D"
assert_rc "access.vcs: full → status 0" "$RC" "0"

# --- 5. auto and absent still detect -----------------------------------------
echo "  5. Detection unchanged"
D=$(fixture auto-tracker 'tracker: auto\nvcs: auto\n')
run_case "$D"
assert_rc "tracker/vcs: auto → status 0" "$RC" "0"
assert_eq "tracker: auto → detects github (no JIRA_URL)" "$T" "github"
run_case "$D" "JIRA_URL=https://acme.atlassian.net"
assert_eq "tracker: auto + JIRA_URL → detects jira" "$T" "jira"

# --- 6. Mapping-valued tracker: — asserted under BOTH tiers ------------------
# tracker.workflowFile is documented and supported. The two tiers disagree on it natively
# (pyyaml returns the dict, awk returns empty), which is exactly why both are forced here.
echo "  6. Mapping-form tracker: (both tiers)"
D=$(fixture mapping-tracker 'tracker:\n  workflowFile: docs/tracker-workflow.yaml\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "mapping tracker: [$tier tier] → status 0"       "$RC" "0"
  assert_eq "mapping tracker: [$tier tier] → detects github" "$T"  "github"
done

# --- 7. Env override: most-restrictive-wins, in both directions --------------
echo "  7. Env override"
D=$(fixture env-full 'access:\n  tracker: full\n')
run_case "$D" "AGENT_SKILLS_ACCESS_TRACKER=manual"
assert_eq "env more restrictive than config → env wins" "$AT" "manual"

D=$(fixture env-manual 'access:\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_ACCESS_TRACKER=full"
assert_eq "env LESS restrictive than config → config wins (no escalation)" "$AT" "manual"

D=$(fixture env-mid 'access:\n  tracker: read-only\n')
run_case "$D" "AGENT_SKILLS_ACCESS_TRACKER=approve"
assert_eq "env restricts further mid-scale → env wins" "$AT" "approve"

D=$(fixture env-only "")
run_case "$D" "AGENT_SKILLS_ACCESS_TRACKER=command"
assert_eq "env alone, no config → env applies" "$AT" "command"

run_case "$D" "AGENT_SKILLS_ACCESS_TRACKER=nonsense"
assert_rc         "env override invalid → non-zero (env tier is validated too)" "$RC" "1"
assert_stderr_has "env override invalid → names the env var" "AGENT_SKILLS_ACCESS_TRACKER"

run_case "$D" "AGENT_SKILLS_ACCESS_VCS=manual"
assert_rc "env access.vcs non-full → non-zero" "$RC" "1"

# --- 8. Malformed YAML: the one case that must not degrade to full -----------
echo "  8. Malformed YAML"
for tier in python awk; do
  D=$(fixture "malformed-noaccess-$tier" ': bad: yaml\n  - broken\n')
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "malformed, no access: [$tier tier] → still degrades (status 0)" "$RC" "0"
  assert_eq "malformed, no access: [$tier tier] → TRACKER falls back"        "$T"  "github"
  assert_eq "malformed, no access: [$tier tier] → ACCESS_TRACKER=full"       "$AT" "full"

  D=$(fixture "malformed-access-$tier" 'access:\n : bad: yaml\n')
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc         "malformed WITH access: [$tier tier] → non-zero" "$RC" "1"
  assert_stderr_has "malformed WITH access: [$tier tier] → says unreadable" "unreadable"
done

# --- 9. A rejection actually halts a guarded call site (end-to-end) ----------
# The resolver returning non-zero is worth nothing unless a caller propagates it. This asserts the
# guarded `source … || exit 1` form the 16 call sites use, not just the resolver's return code.
echo "  9. Guarded call site"
D=$(fixture guarded 'access:\n  tracker: mnaual\n')
cat > "$D/caller.sh" <<EOF
#!/usr/bin/env bash
source '$RESOLVER' || exit 1
echo "REACHED_BODY"
EOF
OUT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "cd '$D' && bash caller.sh" 2>"$STDERR_FILE")
RC=$?
assert_rc "guarded call site, invalid value → caller exits non-zero" "$RC" "1"
if echo "$OUT" | grep -q REACHED_BODY; then
  bad "guarded call site → body must not run" "caller continued past the rejection"
else
  ok "guarded call site → body did not run"
fi

# Same script, legal config: the guard must not be a tripwire on the happy path.
D=$(fixture guarded-ok 'access:\n  tracker: manual\n')
cat > "$D/caller.sh" <<EOF
#!/usr/bin/env bash
source '$RESOLVER' || exit 1
echo "REACHED_BODY ACCESS_TRACKER=\$ACCESS_TRACKER"
EOF
OUT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "cd '$D' && bash caller.sh" 2>"$STDERR_FILE")
RC=$?
assert_rc "guarded call site, legal value → caller exits 0" "$RC" "0"
assert_eq "guarded call site, legal value → body ran with the mode set" \
  "$(echo "$OUT" | sed -n 's/^REACHED_BODY //p')" "ACCESS_TRACKER=manual"

# --- 10. The shared reader ----------------------------------------------------
echo "  10. Shared nested reader"
# One reader, sourced by both resolvers — asserted by the fact that neither defines its own.
COPIES=$(grep -c '^read_nested_config_key()' "$PATHS" "$RESOLVER" "$READER" 2>/dev/null | awk -F: '{s+=$2} END {print s}')
assert_eq "read_nested_config_key defined exactly once across the three files" "$COPIES" "1"

# Tier-1 probe must find python3 — the bug was a bare `python`, absent from macOS since 12.3.
if command -v python3 >/dev/null 2>&1 && python3 -c 'import yaml' >/dev/null 2>&1; then
  PROBE=$(bash -c "source '$READER'; config_python")
  assert_eq "tier-1 probe finds python3" "$PROBE" "python3"
else
  echo "  SKIP  tier-1 probe (python3 + pyyaml not available on this host)"
fi
assert_eq "no bare-\`python\` invocation remains in the reader" \
  "$(grep -cE '^[[:space:]]*val=\$\(python -c' "$READER" "$PATHS" "$RESOLVER" 2>/dev/null | awk -F: '{s+=$2} END {print s}')" "0"

# Regression oracle for the extraction: PRD_ROOT / ARCH_ROOT must resolve identically, both tiers.
D=$(fixture paths 'prd:\n  prdShardedLocation: docs/custom-prd\narchitecture:\n  architectureShardedLocation: docs/custom-arch\n')
for tier in python awk; do
  OUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER="$tier" bash -c "
    cd '$D'; source '$PATHS'; echo \"\$PRD_ROOT|\$ARCH_ROOT\"" 2>/dev/null)
  assert_eq "resolve-paths [$tier tier] → configured roots" "$OUT" "docs/custom-prd|docs/custom-arch"
done
D=$(fixture paths-default "")
for tier in python awk; do
  OUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER="$tier" bash -c "
    cd '$D'; source '$PATHS'; echo \"\$PRD_ROOT|\$ARCH_ROOT\"" 2>/dev/null)
  assert_eq "resolve-paths [$tier tier] → default roots" "$OUT" "docs/prd|docs/architecture"
done

# --- Summary -----------------------------------------------------------------
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
