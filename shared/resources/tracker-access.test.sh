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

# --- 11. Every real call site is guarded (repo-wide, not a self-built caller) ------------------
# The §9 case above builds its OWN caller.sh, so it proves the assertion works — it can never prove
# that the repo's call sites are guarded. Deleting `|| exit 1` from skills/create-pr/SKILL.md left
# this suite at 61/61 green, which is exactly how an unguarded site in `review-code` shipped.
# This scans the real files. It must also see `. path` dot-sources, which a grep for `source ` misses.
echo "  11. Call-site guard coverage (repo-wide)"
REPO_ROOT="$(cd "$HERE/.." && cd .. && pwd)"
# Matches the sourcing form ANYWHERE in the line, not just at line start — three of the call sites
# are prose sentences ("Branch on the tracker resolved by `source ... || exit 1`"), and an anchored
# pattern silently skips them, which is the same blind spot that let an unguarded site ship.
# `source=` is excluded: that is a shellcheck directive, not a sourcing.
UNGUARDED=$(grep -rnoE '(^|[^=[:alnum:]_])source[[:space:]]+[^`]*resolve-platform\.sh([[:space:]]*\|\|[[:space:]]*exit 1)?' \
  "$REPO_ROOT"/skills/*/SKILL.md 2>/dev/null | grep -v 'exit 1' || true)
UNGUARDED="$UNGUARDED$(grep -rnoE '\.[[:space:]]+"\$\(dirname[^"]*"/references/resolve-platform\.sh"([[:space:]]*\|\|[[:space:]]*exit 1)?' \
  "$REPO_ROOT"/skills/*/SKILL.md 2>/dev/null | grep -v 'exit 1' || true)"
if [ -z "$UNGUARDED" ]; then
  ok "every source/dot-source of resolve-platform.sh in skills/*/SKILL.md carries || exit 1"
else
  bad "unguarded resolve-platform.sh call site(s)" "$(echo "$UNGUARDED" | head -5)"
fi

# Nobody may EXECUTE the resolver: `bash …/resolve-platform.sh` never exports to the caller, and on
# a rejection prints a `return` error and exits 0 — fail-open.
EXECUTED=$(grep -rnE '(^|[^a-zA-Z-])bash[[:space:]]+[^|;&]*resolve-platform\.sh' \
  "$REPO_ROOT"/skills/*/SKILL.md 2>/dev/null || true)
if [ -z "$EXECUTED" ]; then
  ok "no skill executes resolve-platform.sh instead of sourcing it"
else
  bad "resolve-platform.sh is executed, not sourced" "$(echo "$EXECUTED" | head -3)"
fi

# --- 12. The resolver works under zsh, not only bash -------------------------------------------
# Every run_case above goes through `bash -c`. That is structurally why a bash-only `${!var}` shipped
# and broke every call site on macOS, where the login shell — and the shell skills run their blocks
# in — is zsh.
echo "  12. zsh parity"
if command -v zsh >/dev/null 2>&1; then
  D=$(fixture zsh-clean "")
  ZOUT=$(env -i PATH="$PATH" HOME="$HOME" zsh -c "
    cd '$D'; source '$RESOLVER'; echo \"RC=\$? AT=\$ACCESS_TRACKER T=\$TRACKER\"" 2>&1)
  assert_eq "zsh, no config → same as bash" \
    "$(echo "$ZOUT" | sed -n 's/^RC=//p')" "0 AT=full T=github"

  D=$(fixture zsh-access 'access:\n  tracker: manual\n')
  ZOUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_ACCESS_TRACKER=command zsh -c "
    cd '$D'; source '$RESOLVER'; echo \"RC=\$? AT=\$ACCESS_TRACKER\"" 2>&1)
  assert_eq "zsh, env override resolves most-restrictive" \
    "$(echo "$ZOUT" | sed -n 's/^RC=//p')" "0 AT=manual"

  D=$(fixture zsh-bad 'tracker: jria\n')
  env -i PATH="$PATH" HOME="$HOME" zsh -c "cd '$D'; source '$RESOLVER'" >/dev/null 2>&1
  assert_rc "zsh, invalid value → non-zero" "$?" "1"
else
  echo "  SKIP  zsh parity (zsh not on this host)"
fi

# --- 13. Shapes that must not silently resolve to `full` ---------------------------------------
echo "  13. No silent escalation"
D=$(fixture access-scalar 'access: manual\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "scalar \`access: manual\` [$tier] → rejected, not silently full" "$RC" "1"
done

# The inline flow form is the notation the task document itself uses. It resolved correctly under
# python and silently to `full` under awk — a tier-dependent privilege escalation.
D=$(fixture access-flow 'access: {tracker: manual}\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_eq "flow-form \`access: {tracker: manual}\` [$tier] → manual" "$AT" "manual"
done

D=$(fixture access-flow-two 'access: {tracker: read-only, vcs: full}\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_eq "flow-form, two children [$tier] → read-only" "$AT" "read-only"
done

# --- 14. Valid YAML the tier-2 lint must not reject --------------------------------------------
# Each of these parses cleanly under pyyaml. The lint used to grade them `malformed`, which with an
# `access:` block present is a hard halt — on exactly the hosts where awk is the only tier.
echo "  14. Tier-2 lint false positives"
LINT_OK_CASES="root-sequence|access:\n  tracker: manual\ndevLoadAlwaysFiles:\n- docs/a.md\n
quoted-key|access:\n  tracker: manual\n\"my key\": 1\n
slash-key|access:\n  tracker: manual\npaths/root: x\n
digit-key|access:\n  tracker: manual\n2fa: on\n"
echo "$LINT_OK_CASES" | while IFS='|' read -r name yaml; do
  [ -z "$name" ] && continue
  D=$(fixture "lint-$name" "$yaml")
  OUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
    cd '$D'; source '$RESOLVER' >/dev/null 2>&1; echo \"\$?:\$ACCESS_TRACKER\"")
  if [ "$OUT" = "0:manual" ]; then
    echo "  PASS  valid YAML ($name) not graded malformed [awk tier]"
  else
    echo "  FAIL  valid YAML ($name) [awk tier] — expected '0:manual', got '$OUT'"
    echo "$name" >> "$TMPDIR_TEST/lint-failures"
  fi
done
if [ -f "$TMPDIR_TEST/lint-failures" ]; then
  FAIL=$((FAIL + $(wc -l < "$TMPDIR_TEST/lint-failures")))
else
  PASS=$((PASS + 4))
fi

# Genuinely broken YAML must still fail closed when access: is present.
D=$(fixture lint-broken 'access:\n : bad: yaml\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "leading-colon + access: [$tier] → still fails closed" "$RC" "1"
done

# --- 15. YAML nulls mean "not configured", not a bad value -------------------------------------
echo "  15. Null spellings"
for spelling in null '~'; do
  D=$(fixture "null-$RANDOM" "tracker: $spelling\n")
  for tier in python awk; do
    run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
    assert_rc "tracker: $spelling [$tier] → status 0 (means unset)" "$RC" "0"
    assert_eq "tracker: $spelling [$tier] → detects" "$T" "github"
  done
done

# --- 16. A forced tier that is unavailable must SKIP loudly, not pass silently ------------------
# `config_python` returns 1 when pyyaml is absent, so a forced-python case would otherwise exercise
# the awk path and report green with zero coverage of the tier it names.
echo "  16. Forced-tier honesty"
if bash -c "source '$READER'; config_python" >/dev/null 2>&1; then
  ok "python tier genuinely available — forced-python cases above are real"
else
  echo "  SKIP  forced-python cases exercised the awk path (no python+pyyaml on this host)"
fi

# --- 17. A declared-but-unenforced mode says so --------------------------------------------------
# Nothing intercepts a mutation yet. An operator who sets `manual` and sees a completely normal run
# would reasonably conclude they were protected.
echo "  17. Not-yet-enforced notice"
D=$(fixture notice 'access:\n  tracker: manual\n')
run_case "$D"
assert_rc         "non-full mode → still status 0"        "$RC" "0"
assert_stderr_has "non-full mode → warns it is not enforced" "NOT YET ENFORCED"

D=$(fixture notice-full "")
run_case "$D"
if grep -q "NOT YET ENFORCED" "$STDERR_FILE"; then
  bad "full mode → no notice" "warned on the default, which would make the notice noise"
else
  ok "full mode → no notice"
fi

# --- 18. Bulk protocol is index-addressed, not positional ---------------------------------------
# The first version returned bare lines read with `sed -n "$Np"`. A value containing a newline
# emitted extra lines and shifted every later answer — three specs in, five lines out — which
# resolved a declared `manual` to `full`, silently, on the authoritative tier.
echo "  18. Bulk protocol"
D=$(fixture bulk-multiline 'summary: |\n  line one\n  line two\ntracker: jira\nvcs: bitbucket\n')
GOT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
  cd '$D'; source '$READER'
  B=\$(config_bulk key:summary key:tracker key:vcs)
  config_bulk_get 2 \"\$B\"" 2>/dev/null)
assert_eq "answer 2 is still tracker, not shifted by the multi-line value" "$GOT" "v jira"
GOT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
  cd '$D'; source '$READER'
  B=\$(config_bulk key:summary key:tracker key:vcs)
  config_bulk_get 3 \"\$B\"" 2>/dev/null)
assert_eq "answer 3 is still vcs" "$GOT" "v bitbucket"

# The kind byte is the point: a config that SPELLS a sentinel is delivered as data, so it reaches
# enum validation and is rejected, instead of being obeyed as a control signal.
D=$(fixture forge-sentinel 'tracker: __MAP__\n')
GOT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
  cd '$D'; source '$READER'; B=\$(config_bulk key:tracker); config_bulk_get 1 \"\$B\"" 2>/dev/null)
assert_eq "a config value spelling __MAP__ arrives as DATA, not a signal" "$GOT" "v __MAP__"
run_case "$D"
assert_rc "…and is therefore rejected as an unrecognised tracker" "$RC" "1"

for forged in __NONE__ __ERR__ __UNREADABLE__; do
  D=$(fixture "forge-$forged" "access: {tracker: $forged}\n")
  run_case "$D"
  if [ "$AT" = "full" ] && [ "$RC" = "0" ]; then
    bad "forged $forged must not silently grant full" "rc=0 AT=full"
  else
    ok "forged $forged → not a silent full (rc=$RC, AT=${AT:-unset})"
  fi
done

# A block scalar carries a trailing newline that `$( )` used to strip; the bulk path must agree.
D=$(fixture block-scalar 'access:\n  tracker: |\n    manual\n')
run_case "$D"
assert_eq "block-scalar access.tracker resolves, not halts" "$AT" "manual"
assert_rc "block-scalar access.tracker → status 0" "$RC" "0"

# End to end: the shape that silently escalated must now not.
D=$(fixture bulk-escalate 'tracker: "github\\n\\n\\n"\naccess:\n  tracker: manual\n')
run_case "$D"
if [ "$AT" = "full" ] && [ "$RC" = "0" ]; then
  bad "multi-line value must not silently grant full" "got rc=0 ACCESS_TRACKER=full"
else
  ok "multi-line value → no silent escalation (rc=$RC, AT=${AT:-unset})"
fi

# --- 19. Multi-line flow mapping fails closed on the awk tier ------------------------------------
# §13 covered only the single-line form; the awk rule stripped to the first `}` and called `next`,
# so a two-line flow map read as "not configured" → full.
echo "  19. Multi-line flow map"
for yaml_case in 'access: {\n  tracker: manual}\n' 'access: {\n  tracker: manual,\n  vcs: full\n}\n'; do
  D=$(fixture "flow-ml-$RANDOM" "$yaml_case")
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
  assert_eq "multi-line flow [python] → manual" "$AT" "manual"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
  assert_rc "multi-line flow [awk] → fails closed, never full" "$RC" "1"
  if [ "$AT" = "full" ]; then bad "multi-line flow [awk] must not grant full" "AT=full"; else ok "multi-line flow [awk] → no silent full"; fi
done

# --- 20. YAML nulls in NESTED keys, and in the path roots ----------------------------------------
# The null fix was applied to read_config_key and not to read_nested_config_key, so `access.tracker:
# null` halted on awk hosts and `architectureShardedLocation: ~` yielded ARCH_ROOT=~, which unquoted
# expands to $HOME.
echo "  20. Nested nulls"
for spelling in null NULL '~'; do
  D=$(fixture "nested-null-$RANDOM" "access:\n  tracker: $spelling\n")
  for tier in python awk; do
    run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
    assert_rc "access.tracker: $spelling [$tier] → status 0" "$RC" "0"
    assert_eq "access.tracker: $spelling [$tier] → full (means unset)" "$AT" "full"
  done
done

D=$(fixture roots-null 'prd:\n  prdShardedLocation: null\narchitecture:\n  architectureShardedLocation: ~\n')
for tier in python awk; do
  OUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER="$tier" bash -c "
    cd '$D'; source '$PATHS'; echo \"\$PRD_ROOT|\$ARCH_ROOT\"" 2>/dev/null)
  assert_eq "null path roots [$tier] → defaults, never the literal null/~" "$OUT" "docs/prd|docs/architecture"
done

# --- 21. Scratch vars do not leak between sources in one shell -----------------------------------
# Every other case runs in a fresh `bash -c`, which is structurally blind to this: the _RP_* vars
# used to survive a failed source and suppress the next one's reads.
echo "  21. Cross-source hygiene"
DA=$(fixture leak-a 'tracker: jira\naccess:\n  vcs: manual\n')
DB=$(fixture leak-b 'tracker: github\naccess:\n  tracker: manual\n')
# The first source must run on a tier where the batch SUCCEEDS (so the scratch vars get populated)
# and then fail; the second is forced onto awk so it takes the fallback path and would read stale
# values. Forcing awk for both — the first version of this test — populates nothing and passes for
# the wrong reason: mutation-testing the clearing showed it staying green.
OUT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
  cd '$DA'; source '$RESOLVER' >/dev/null 2>&1
  export AGENT_SKILLS_CONFIG_TIER=awk
  cd '$DB'; source '$RESOLVER' >/dev/null 2>&1
  echo \"\$?|\$TRACKER|\$ACCESS_TRACKER\"" 2>/dev/null)
assert_eq "second source in the same shell is unaffected by the first" "$OUT" "0|github|manual"

# Control: the same second repo in a fresh shell must give the identical answer.
CTRL=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
  cd '$DB'; source '$RESOLVER' >/dev/null 2>&1; echo \"\$?|\$TRACKER|\$ACCESS_TRACKER\"" 2>/dev/null)
assert_eq "…and matches a fresh-shell control" "$OUT" "$CTRL"

# --- 22. Duplicate keys are a config error, not last-wins ----------------------------------------
# Also the witness for "tier 1 is authoritative": this is a case where the tiers genuinely disagree,
# and tier 1's answer must win.
echo "  22. Duplicate keys"
D=$(fixture dupe-access 'access:\n  tracker: manual\naccess:\n  vcs: full\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "duplicate access: [python] → rejected, not last-wins" "$RC" "1"
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
if [ "$AT" = "full" ]; then bad "duplicate access: [awk] must not grant full" "AT=full"; else ok "duplicate access: [awk] → restrictive, not full"; fi

# --- 23. Unknown bulk spec fails closed ----------------------------------------------------------
echo "  23. Unknown bulk spec"
D=$(fixture bulk-typo 'access:\n  tracker: manual\n')
GOT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
  cd '$D'; source '$READER'; B=\$(config_bulk 'nsted:access.tracker'); config_bulk_get 1 \"\$B\"" 2>/dev/null)
assert_eq "typo'd spec → __ERR__ signal, never __NONE__ (which would read as 'absent')" "$GOT" "s __ERR__"

# --- 24. resolve_access rejects an unknown system ------------------------------------------------
echo "  24. resolve_access whitelist"
D=$(fixture whitelist "")
OUT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
  cd '$D'; source '$RESOLVER' >/dev/null 2>&1
  resolve_access 'x}; echo PWNED; :' >/dev/null 2>&1; echo \$?" 2>/dev/null | tail -1)
assert_eq "resolve_access with an unknown system → returns 1" "$OUT" "1"

# --- 25. Legal YAML the strict loader must still accept ------------------------------------------
# The duplicate-key loader called construct_object before flatten_mapping, so a `<<` merge key had
# no constructor and a legal config was graded malformed — a hard halt with an access: block.
echo "  25. Merge keys and anchors"
D=$(fixture merge-key 'common: &c\n  vcs: github\ntracker: jira\n<<: *c\naccess:\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "merge key `<<:` → status 0, not malformed" "$RC" "0"
assert_eq "merge key → access still read"             "$AT" "manual"

D=$(fixture anchor-plain 'base: &b docs/p\nprd:\n  prdShardedLocation: *b\ntracker: jira\naccess:\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "anchor/alias → status 0" "$RC" "0"

# Duplicates must still be rejected — the loader has one job and it must keep doing it.
# A duplicate is a parse failure, so the established rule applies: degrade without an `access:`
# block, halt with one. Asserting a bare rc=1 here would contradict the malformed-YAML contract.
D=$(fixture dupe-noaccess 'tracker: jira\ntracker: github\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "duplicate key, no access: → degrades like any parse failure" "$RC" "0"
assert_eq "…and does not silently pick one of the duplicates"          "$T"  "github"

D=$(fixture dupe-access 'tracker: jira\ntracker: github\naccess:\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "duplicate key WITH access: → halts" "$RC" "1"

# --- 26. Sentinels never escape to callers with a safe default ------------------------------------
# `__UNREADABLE__` is meaningful only to the access path. It reached PRD_ROOT/ARCH_ROOT — consumed by
# 34 files — and render-retro.sh got as far as `mkdir -p "__UNREADABLE__"`.
echo "  26. Sentinel containment"
D=$(fixture flow-prd 'prd: {\n  prdShardedLocation: docs/custom }\ntracker: jira\n')
for tier in python awk; do
  OUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER="$tier" bash -c "
    cd '$D'; source '$PATHS'; echo \"\$PRD_ROOT|\$ARCH_ROOT\"" 2>/dev/null)
  case "$OUT" in
    *__UNREADABLE__*) bad "path roots [$tier] leak a sentinel" "got '$OUT'" ;;
    *) ok "path roots [$tier] never expose a sentinel (got '$OUT')" ;;
  esac
done

# --- 27. Exported outputs do not survive a refused resolve ---------------------------------------
echo "  27. Output-variable hygiene"
DA=$(fixture out-a 'access:\n  tracker: full\n')
DB=$(fixture out-b 'access:\n  tracker: manual\naccess:\n  vcs: full\n')
OUT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
  cd '$DA'; source '$RESOLVER' >/dev/null 2>&1
  cd '$DB'; source '$RESOLVER' >/dev/null 2>&1 || true
  echo \"AT=[\$ACCESS_TRACKER]\"" 2>/dev/null)
assert_eq "a refused resolve does not leave the previous repo's mode exported" "$OUT" "AT=[]"

# --- 28. printf, not echo: a value of -n must not vanish -----------------------------------------
echo "  28. Values that look like echo flags"
for v in -n -e -E; do
  D=$(fixture "echoflag-$RANDOM" "tracker: $v\n")
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
  assert_rc "tracker: $v → rejected loudly, not swallowed into detection" "$RC" "1"
done

# --- Summary -----------------------------------------------------------------
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
