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

# Exact WHOLE-LINE match. `assert_stderr_has` is a substring check, so an assertion on the legal
# vocabulary passed unchanged when a sixth mode was appended to the enum — the mutation audit found
# it survived. Anything asserting a closed set has to compare the whole line.
assert_stderr_exact_line() {
  local name="$1" line="$2"
  grep -qxF -- "$line" "$STDERR_FILE" && ok "$name" \
    || bad "$name" "stderr had no line exactly equal to '$line' — got: $(tr '\n' ' ' < "$STDERR_FILE")"
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
# Asserted under BOTH tiers, on the resolved VALUE. This used to run on whatever tier the host
# happened to provide, which on a developer machine is python and on a stock macOS consumer host is
# awk — so the suite proved the modes resolve on the tier its authors run and said nothing about the
# tier its users run. Every value assertion in this file that both tiers can answer is now spelled
# this way; where a shape is genuinely tier-dependent it is called out as such (see §36).
for mode in manual command approve read-only full; do
  D=$(fixture "mode-$mode" "access:\n  tracker: $mode\n")
  for tier in python awk; do
    run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
    assert_rc "access.tracker: $mode [$tier] → status 0"              "$RC" "0"
    assert_eq "access.tracker: $mode [$tier] → ACCESS_TRACKER=$mode"  "$AT" "$mode"
  done
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
  # The message says "could not be parsed", not "unreadable": this file DOES parse as bytes and is
  # readable — it is malformed. Reserving "unreadable" for the permissions case (§34) is what makes
  # the two diagnostics point an operator at the right problem.
  assert_stderr_has "malformed WITH access: [$tier tier] → says it could not be parsed" "could not be parsed"
  assert_stderr_has "malformed WITH access: [$tier tier] → refuses the full fallback" "Refusing to fall back"
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
SOURCE_RE='(^|[^=[:alnum:]_])source[[:space:]]+[^`]*resolve-platform\.sh'
# The dot-source form is ANCHORED to line start (after optional indentation or a markdown list /
# quote marker), because a `.` command only ever appears there. The previous pattern tried to spell
# out the exact `. "$(dirname "$0")/references/…"` invocation and used `[^"]*`, which cannot cross
# the quote inside `"$0"` — so it matched ZERO lines repo-wide while its name and the comment above
# it claimed full dot-source coverage. Deleting `|| exit 1` from either real dot-source site left
# the suite green. An unanchored `\.` is not the fix either: it matches the full stop in any prose
# sentence that later mentions the file, which produced four false "unguarded" hits.
DOTSRC_RE='^[[:space:]]*([-*>][[:space:]]+)?\.[[:space:]]+[^`]*resolve-platform\.sh'

SOURCE_HITS=$(grep -rhE "$SOURCE_RE" "$REPO_ROOT"/skills/*/SKILL.md 2>/dev/null | grep -c . || true)
DOTSRC_HITS=$(grep -rhE "$DOTSRC_RE" "$REPO_ROOT"/skills/*/SKILL.md 2>/dev/null | grep -c . || true)

# A COVERAGE FLOOR, asserted before the guard check. This is the assertion whose absence let the
# blind regex above pass as a clean bill of health for a whole cycle: a pattern that matches nothing
# reports "no unguarded call sites" in exactly the same words as a pattern that matches everything.
# The floors are deliberately below the current counts (18 and 2) so that legitimately removing a
# call site does not fail the suite — but a pattern that goes blind, or a bulk edit that strips the
# sourcing lines wholesale, cannot pass.
if [ "$SOURCE_HITS" -ge 13 ]; then
  ok "call-site scan sees the source-form sites ($SOURCE_HITS found, floor 13)"
else
  bad "call-site scan has gone blind to source-form sites" "found $SOURCE_HITS, expected >= 13"
fi
if [ "$DOTSRC_HITS" -ge 2 ]; then
  ok "call-site scan sees the dot-source sites ($DOTSRC_HITS found, floor 2)"
else
  bad "call-site scan has gone blind to dot-source sites" "found $DOTSRC_HITS, expected >= 2"
fi

# Whole lines, not -o fragments: the guard sits AFTER the path (and after its closing quote), so a
# fragment that stops at `resolve-platform.sh` can never contain it.
UNGUARDED=$(grep -rnE "$SOURCE_RE" "$REPO_ROOT"/skills/*/SKILL.md 2>/dev/null | grep -v 'exit 1' || true)
UNGUARDED="$UNGUARDED$(grep -rnE "$DOTSRC_RE" "$REPO_ROOT"/skills/*/SKILL.md 2>/dev/null | grep -v 'exit 1' || true)"
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

# --- 17. A partially-enforced mode says exactly how far it reaches -------------------------------
# As of task.52 the two stage CLIs honour the mode; every other tracker call site does not (tasks
# 53–56). An operator who sets `manual` and sees a normal run would otherwise reasonably conclude
# they were fully protected. A notice that OVERSTATES coverage is worse than no notice at all, so
# this asserts the qualified wording, not merely that something was printed.
echo "  17. Partial-enforcement notice"
D=$(fixture notice 'access:\n  tracker: manual\n')
run_case "$D"
assert_rc         "non-full mode → still status 0"        "$RC" "0"
assert_stderr_has "non-full mode → warns enforcement is partial" "PARTIALLY ENFORCED"
assert_stderr_has "non-full mode → names what is still written"  "still proceed normally"

D=$(fixture notice-full "")
run_case "$D"
if grep -q "PARTIALLY ENFORCED" "$STDERR_FILE"; then
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
assert_rc 'merge key <<: → status 0, not malformed' "$RC" "0"
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

# --- 29. A config value cannot forge a record ----------------------------------------------------
# The framing is unescaped, which is only safe because the encoder refuses separator-bearing
# payloads. Without that refusal a value could inject a record: records are emitted in index order
# and the decoder takes the FIRST match, so a payload in record N lands ahead of every real record
# after it. That silently turned a declared `manual` into `full`.
echo "  29. Record forgery"
D=$(fixture forge-escalate 'tracker: "jira\\x1e5\\x1fv\\x1ffull"\nvcs: github\naccess:\n  tracker: manual\n')
run_case "$D"
if [ "$AT" = "full" ]; then bad "forged record must not grant full" "AT=full"; else ok "forged record → not full (rc=$RC, AT=${AT:-unset})"; fi
assert_rc "forged record → fails closed" "$RC" "1"

D=$(fixture forge-shape 'tracker: "jira\\x1e4\\x1fv\\x1fmapping"\naccess: manual\n')
run_case "$D"
assert_rc "forged shape record cannot bypass the scalar-access halt" "$RC" "1"

D=$(fixture forge-downgrade 'tracker: "jira\\x1e5\\x1fv\\x1fmanual"\naccess:\n  tracker: full\n')
run_case "$D"
assert_rc "forgery in either direction fails closed" "$RC" "1"

# A lone separator must be refused too — it used to truncate a value into a DIFFERENT legal one.
D=$(fixture lone-sep 'tracker: "jira\\x1fgithub"\nvcs: github\n')
run_case "$D"
assert_rc "a lone separator → refused, not silently truncated" "$RC" "1"

# The index must be compared as a string; otherwise 01 / 1.0 / " 1" / +1 are extra spellings of the
# same attack.
for spelling in 01 1.0 ' 1' +1; do
  GOT=$(env -i PATH="$PATH" HOME="$HOME" bash -c "
    source '$READER'; config_bulk_get '$spelling' \"\$(printf '1\\037v\\037real\\036')\"" 2>/dev/null)
  assert_eq "index spelling '$spelling' does not match index 1" "$GOT" ""
done

# --- 30. The `<<` OVERRIDE form, which is the whole point of a merge key --------------------------
# The dup scan ran after flatten_mapping, which PREPENDS merged pairs, so an inherited key plus the
# local key overriding it read as a duplicate. The earlier merge-key test passed because it only
# exercised a merge that adds a key never present locally.
echo "  30. Merge-key override"
D=$(fixture merge-override 'defaults: &d\n  tracker: read-only\n  vcs: full\naccess:\n  <<: *d\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "<<: override [python] → status 0"         "$RC" "0"
assert_eq "<<: override → the LOCAL value wins"      "$AT" "manual"

# The awk arm is INVERTED as of task.60, and that is a deliverable rather than a regression. This
# fixture carries an anchor AND a merge key — two constructs outside the documented tier-2 subset.
# Tier 2 used to read the whole access block as absent and resolve `full`: silently, at exit 0, on
# the DEFAULT tier of a stock macOS host. It now refuses and says why.
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
assert_rc "<<: override [awk] → REFUSED, not silently full" "$RC" "1"
assert_eq "<<: override [awk] → grants nothing"             "$AT" ""
assert_stderr_has "…names the construct"    "an anchor"
assert_stderr_has "…names the line"         "skills-config.yaml:1:"
assert_stderr_has "…names both migrations"  "pip install pyyaml"

# A real duplicate must still be caught, override support notwithstanding.
D=$(fixture dupe-under-merge 'defaults: &d\n  vcs: full\naccess:\n  <<: *d\n  tracker: manual\n  tracker: full\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "a genuine duplicate beside a merge key is still rejected" "$RC" "1"

# --- 31. Duplicates inside a merge SOURCE, and a duplicated merge key --------------------------
# Moving the dup scan before flatten_mapping (to make `<<` override legal) meant a merge source
# defined AT the merge site was never constructed in its own right and so never scanned. Its
# duplicates then resolved last-wins, silently: a declared `manual` read as `full`, exit 0.
# The earlier dupe-under-merge fixture cannot catch this — it puts the duplicate in the LOCAL
# mapping, which was always covered.
echo "  31. Duplicates inside a merge source"
for shape in \
  'access:\n  <<: {tracker: manual, tracker: full}\n' \
  'access:\n  <<: &d\n    tracker: manual\n    tracker: full\n' \
  'access:\n  <<: [{tracker: manual, tracker: full}]\n' ; do
  D=$(fixture "mergedupe-$RANDOM" "tracker: jira\n$shape")
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
  assert_rc "duplicate inside a merge source → rejected" "$RC" "1"
  if [ "$AT" = "full" ]; then bad "…and must not resolve to full" "AT=full"; else ok "…and does not resolve to full"; fi
done

# The same shape at the root reaches the identity keys; with an access: block it must halt.
D=$(fixture mergedupe-root 'tracker: jira\n<<: {tracker: jira, tracker: github}\naccess:\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "duplicate in a root-level merge source + access: → halts" "$RC" "1"

# A mapping may carry at most one `<<`; two of them last-wins silently.
D=$(fixture two-merge-keys 'a: &a\n  tracker: manual\nb: &b\n  tracker: full\naccess:\n  <<: *a\n  <<: *b\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "two << keys in one mapping → rejected" "$RC" "1"

# …while the legal forms keep working.
D=$(fixture merge-legal-seq 'a: &a\n  tracker: manual\nb: &b\n  vcs: full\naccess:\n  <<: [*a, *b]\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_eq "multi-merge sequence still resolves" "$AT" "manual"

# --- 32. NUL is the third byte the transport cannot carry ---------------------------------------
# bash and zsh DELETE NUL during command substitution, so a value of "\0" arrived as empty and read
# as unconfigured → full, exit 0, no warning. The refusal covered US and RS but not NUL, twelve
# lines below a comment naming NUL as unusable.
echo "  32. NUL payloads"
D=$(fixture nul-access 'tracker: jira\nvcs: github\naccess:\n  tracker: "\\0"\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "access.tracker: \"\\0\" [$tier] → refused" "$RC" "1"
  if [ "$AT" = "full" ]; then bad "NUL payload must not grant full [$tier]" "AT=full"; else ok "NUL payload → not full [$tier]"; fi
done

D=$(fixture nul-embedded 'tracker: "jir\\0a"\nvcs: github\n')
run_case "$D"
assert_rc "an embedded NUL → refused, not silently a different value" "$RC" "1"

# --- 33. A refusal names the offending key -------------------------------------------------------
echo "  33. Refusal diagnostics"
D=$(fixture sep-named 'tracker: "jira\\x1fgithub"\n')
run_case "$D"
assert_stderr_has "the refusal names the key" "tracker:"

# --- 34. The config file itself: unreadable, and redirected ---------------------------------------
# Two escalation routes that need no unusual YAML at all. Both resolved a declared `manual` to
# `full` at exit 0, on both tiers, on the canonical documented shape.
echo "  34. Config-file integrity"

# An UNREADABLE file. The fail-closed branch used to answer "is access configured?" by grepping the
# very file the parser had just failed to read; the grep failed too, so the gate fell through to
# platform detection — failing open at exactly the moment it existed to fail closed.
D=$(fixture unreadable-access 'access:\n  tracker: manual\n')
for tier in python awk; do
  chmod 644 "$D/skills-config.yaml"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_eq "control: readable canonical config [$tier] → manual" "$AT" "manual"
  chmod 000 "$D/skills-config.yaml"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "unreadable config [$tier] → refused"                 "$RC" "1"
  if [ "$AT" = "full" ]; then bad "unreadable config must not grant full [$tier]" "AT=full"; else ok "unreadable config → not full [$tier]"; fi
  assert_stderr_has "unreadable config [$tier] → names the real problem" "cannot be read"
  chmod 644 "$D/skills-config.yaml"
done

# A REDIRECT that lands on nothing. `SKILLS_CONFIG_FILE` makes the config path env-overridable, and
# pointing it at an absent file — or at /dev/null, which is not a regular file and so read as "no
# config at all" — discarded a committed restriction silently. That falsified the guarantee written
# in read-config.sh's own header, that a stray env var can never loosen a config that restricts.
D=$(fixture redirect-away 'access:\n  tracker: manual\n')
for target in /dev/null /nonexistent-config-51.yaml; do
  for tier in python awk; do
    run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier" "SKILLS_CONFIG_FILE=$target"
    assert_rc "SKILLS_CONFIG_FILE=$target [$tier] → refused" "$RC" "1"
    if [ "$AT" = "full" ]; then bad "redirect-to-nothing must not grant full [$tier]" "AT=full"; else ok "SKILLS_CONFIG_FILE=$target [$tier] → not full"; fi
  done
done

# …while a redirect at a REAL config is still honoured. The rule is "may point elsewhere, may not
# point nowhere" — narrow on purpose, because this is the form cross-repo callers legitimately use.
D2=$(fixture redirect-target 'access:\n  tracker: read-only\n')
D3=$(fixture redirect-from '')
for tier in python awk; do
  run_case "$D3" "AGENT_SKILLS_CONFIG_TIER=$tier" "SKILLS_CONFIG_FILE=$D2/skills-config.yaml"
  assert_rc "redirect at a real config [$tier] → status 0"        "$RC" "0"
  assert_eq "redirect at a real config [$tier] → read-only wins"  "$AT" "read-only"
done

# --- 35. The parser may not be replaced by the directory it is reading ---------------------------
# `python -c` prepends the CURRENT DIRECTORY to sys.path, so a file named yaml.py beside
# skills-config.yaml was imported instead of PyYAML: arbitrary code execution on merely SOURCING the
# resolver, and total control of the resolved value. This reader is hardened against the config as
# data — record forgery, NUL, separators — and all of that is worth nothing if the parser itself can
# be swapped out. The distinction that matters: skills-config.yaml is DATA, yaml.py is CODE.
echo "  35. Parser substitution"
D=$(fixture yaml-shadow 'access:\n  tracker: manual\n')
cat > "$D/yaml.py" <<'STUB'
import os
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "EXECUTED"), "w").write("x")
class SafeLoader: pass
class resolver:
    class BaseResolver: DEFAULT_MAPPING_TAG = "x"
class MappingNode: pass
class SequenceNode: pass
def load(*a, **k): return {}
def safe_load(*a, **k): return {}
STUB
rm -f "$D/EXECUTED"
run_case "$D"
if [ -f "$D/EXECUTED" ]; then bad "a repo-root yaml.py must not be imported" "the stub ran — code execution"; else ok "a repo-root yaml.py is not imported"; fi
assert_rc "yaml.py present → status 0"                    "$RC" "0"
assert_eq "yaml.py present → the REAL value still wins"   "$AT" "manual"

# The same vector as a package directory rather than a module file.
D=$(fixture yaml-shadow-pkg 'access:\n  tracker: manual\n')
mkdir -p "$D/yaml"
cat > "$D/yaml/__init__.py" <<'STUB'
import os
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "EXECUTED"), "w").write("x")
STUB
rm -f "$D/EXECUTED"
run_case "$D"
if [ -f "$D/EXECUTED" ]; then bad "a repo-root yaml/ package must not be imported" "the stub ran"; else ok "a repo-root yaml/ package is not imported"; fi
assert_eq "yaml/ package present → the REAL value still wins" "$AT" "manual"

# --- 36. The documented mapping form of `tracker:` on BOTH tiers ---------------------------------
# docs/reference/configuration.md prints `tracker: {workflowFile: …}`. The awk reader split on
# `-F': *'` and took $2, which truncates at the SECOND colon, so that form yielded the field
# `{workflowFile` — rejected by validate_enum, and with this task's `|| exit 1` guards on every call
# site that aborted the run. It aborted it on the DEFAULT tier of a stock macOS host, where
# /usr/bin/python3 ships without pyyaml and awk is therefore the only tier. The suite covered only
# the BLOCK spelling, which happened to work.
echo "  36. tracker: mapping forms, both tiers"
for shape in \
  'tracker: {workflowFile: .github/tracker-workflow.yaml}\n' \
  'tracker:\n  workflowFile: .github/tracker-workflow.yaml\n' \
  'tracker: {workflowFile: .github/tracker-workflow.yaml}  # why\n' ; do
  D=$(fixture "trackermap-$RANDOM" "${shape}access:\n  tracker: manual\n")
  for tier in python awk; do
    run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
    assert_rc "mapping-valued tracker: [$tier] → status 0"          "$RC" "0"
    assert_eq "mapping-valued tracker: [$tier] → TRACKER detects"   "$T"  "github"
    assert_eq "mapping-valued tracker: [$tier] → access preserved"  "$AT" "manual"
  done
done

# A mapping-valued `vcs:` has no documented form and must still be rejected — on both tiers, and by
# its meaning rather than by leaking the reader's internal sentinel.
D=$(fixture vcsmap 'vcs: {a: b}\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc         "mapping-valued vcs: [$tier] → refused"       "$RC" "1"
  assert_stderr_has "mapping-valued vcs: [$tier] → says mapping"  "(a mapping)"
done

# --- 37. Disjoint merge sources are legal; overlapping ones are not ------------------------------
# "A mapping may carry at most one `<<`" was too blunt and refused a legal composition. The
# escalation it was reaching for is real but narrower: it is OVERLAPPING sources that pyyaml
# resolves last-wins and silently. Disjoint sources merge deterministically, and `<<: [*a, *b]` is
# the documented way to say the same thing — refusing one spelling of it while accepting the other
# is a false rejection, and a false rejection halts the run just as hard as a bad value.
echo "  37. Merge-source overlap"
D=$(fixture merge-disjoint 'a: &a\n  tracker: manual\nb: &b\n  vcs: full\naccess:\n  <<: *a\n  <<: *b\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "two DISJOINT << sources → status 0"       "$RC" "0"
assert_eq "two DISJOINT << sources → tracker merged" "$AT" "manual"
assert_eq "two DISJOINT << sources → vcs merged"     "$AV" "full"

D=$(fixture merge-disjoint-flow 'a: &a {tracker: read-only}\nb: &b {vcs: full}\naccess: {<<: *a, <<: *b}\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "two DISJOINT << sources, flow form → status 0" "$RC" "0"
assert_eq "two DISJOINT << sources, flow form → merged"   "$AT" "read-only"

D=$(fixture merge-overlap 'a: &a\n  tracker: manual\nb: &b\n  tracker: full\naccess:\n  <<: *a\n  <<: *b\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "two OVERLAPPING << sources → still refused" "$RC" "1"
if [ "$AT" = "full" ]; then bad "overlapping sources must not grant full" "AT=full"; else ok "overlapping sources → not full"; fi

# Non-adjacent overlap: three sources where the FIRST and THIRD clash. A guard that only compared
# each source with the one before it would wave this through.
D=$(fixture merge-overlap-nonadjacent 'a: &a {tracker: manual}\nb: &b {vcs: full}\nc: &c {tracker: full}\naccess: {<<: *a, <<: *b, <<: *c}\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "non-adjacent overlapping << sources → refused" "$RC" "1"

# Overlap inside a merge SEQUENCE is refused on the same rule. YAML does define this one — within
# `<<: [*a, *b]` the EARLIER entry wins — but it is deterministic in the direction most operators
# guess wrong, which for an access control is the same silent escalation by another spelling. One
# rule for overlap regardless of how the sources are written; disjoint entries still resolve (§37).
D=$(fixture merge-seq-overlap 'a: &a {tracker: manual}\nb: &b {tracker: full}\naccess:\n  <<: [*a, *b]\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "overlapping << sequence entries → refused" "$RC" "1"
if [ "$AT" = "full" ]; then bad "overlapping sequence entries must not grant full" "AT=full"; else ok "overlapping sequence entries → not full"; fi

# A source's INHERITED keys count. A nested merge declared at the merge site contributes `tracker`
# while spelling only `x`, so pairing it with a permissive source read as disjoint and the permissive
# one won — silently, exit 0. This is the overlap guard's own blind spot, opened by narrowing it from
# "at most one `<<`" (which rejected the shape outright) and closed by recursing when the key sets are
# collected. A NAMED source hid the bug: pyyaml's flatten_mapping mutates an anchored node in place
# when it is constructed, so its inherited keys are already written on it by the time the alias site
# is scanned. Only an at-site source exposes it.
D=$(fixture merge-overlap-nested 'base: &base\n  tracker: manual\nb: &b\n  tracker: full\naccess:\n  <<: {<<: *base, x: 1}\n  <<: *b\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "overlap via a NESTED at-site merge source → refused" "$RC" "1"
if [ "$AT" = "full" ]; then bad "nested-source overlap must not grant full" "AT=full"; else ok "nested-source overlap → not full"; fi

# …while a nested merge whose inherited keys are genuinely disjoint still resolves.
D=$(fixture merge-nested-disjoint 'base: &base\n  q: 1\nb: &b\n  tracker: manual\naccess:\n  <<: {<<: *base, x: 1}\n  <<: *b\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "disjoint nested merge source → status 0" "$RC" "0"
assert_eq "disjoint nested merge source → resolves"  "$AT" "manual"

# The keyset recursion follows aliases, so a recursive anchor must terminate rather than spin.
D=$(fixture merge-recursive-anchor 'a: &a\n  <<: *a\n  tracker: manual\naccess:\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
if [ -n "$RC" ]; then ok "a recursive anchor terminates (rc=$RC)"; else bad "recursive anchor" "no result — probable hang"; fi

# The halt NAMES THE CAUSE. It used to enumerate the three parser-legal-but-silent shapes this
# reader rejects and leave the operator to work out which was theirs — a workaround for a sentinel
# that carried no reason. task.60 gives `__ERR__` a `<line>:<reason>` payload, so the enumeration is
# retired: the message now reports what actually went wrong.
assert_stderr_has "the malformed halt names the cause" "   Cause: "

D=$(fixture malformed-dup-cause 'access:\n  tracker: manual\nx: 1\nx: 2\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc         "a duplicate key WITH access: still halts"  "$RC" "1"
assert_stderr_has "…and the halt names the duplicate"         "duplicate key"
assert_stderr_has "…and names WHICH key"                      "x"

D=$(fixture malformed-syntax-cause 'access:\n  tracker: manual\nbroken: [1,\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc         "a syntax error WITH access: halts"         "$RC" "1"
assert_stderr_has "…and the halt carries a line number"       "Cause: line "

# --- 38. Non-canonical spellings of the `access:` key, on a malformed file ------------------------
# The fail-closed gate matched `^access:` — block form, column 0, nothing else. Every other legal
# spelling of the key missed it, so a malformed file that declared a restriction fell through to
# detection and resolved `full` at exit 0. The replacement probe asks the question the branch
# actually needs — "can I PROVE this file declares no access?" — and answers "no" whenever it cannot.
echo "  38. access: key spellings on a malformed file"
for shape in \
  '{access: {tracker: manual}, x: 1, x: 2}\n' \
  '"access":\n  tracker: manual\nx: 1\nx: 2\n' \
  'access :\n  tracker: manual\nx: 1\nx: 2\n' \
  '<<: {access: {tracker: manual, tracker: full}}\n' \
  'defaults: &d\n  access:\n    tracker: manual\nmain:\n  <<: *d\nx: 1\nx: 2\n' ; do
  D=$(fixture "spelling-$RANDOM" "$shape")
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
  assert_rc "malformed + non-canonical access spelling → refused" "$RC" "1"
  if [ "$AT" = "full" ]; then bad "…and must not grant full" "AT=full"; else ok "…and does not grant full"; fi
done

# EXPLICIT KEY syntax puts the colon on the next line, so it cannot be caught by any pattern that
# looks for `access` followed by a colon. Rare, but legal, and it declared a restriction that the
# first version of this probe still missed.
D=$(fixture spelling-explicit-key '? access\n: {tracker: manual}\nx: 1\nx: 2\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "malformed + explicit-key `? access` → refused" "$RC" "1"
if [ "$AT" = "full" ]; then bad "…and must not grant full" "AT=full"; else ok "…and does not grant full"; fi

# …and an explicit key that is NOT access must not trip it.
D=$(fixture spelling-explicit-other '? other\n: 1\nx: 1\nx: 2\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_rc "malformed + explicit-key `? other` → still degrades" "$RC" "0"

# The over-match is deliberate and bounded: a file with NO access key at all still degrades with a
# warning rather than halting, which is what keeps a consumer who never opted in from being locked
# out by someone else's broken YAML.
D=$(fixture malformed-no-access-at-all 'tracker: github\nx: 1\nx: 2\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "malformed, no access key [$tier] → still degrades" "$RC" "0"
  assert_eq "malformed, no access key [$tier] → full"           "$AT" "full"
done

# --- 39. The ordering of the modes, pinned behaviourally -----------------------------------------
# access_rank's ordering had no witness: `command` could be re-ranked above `approve` and `read-only`
# with the suite green, which would let a permissive config value beat a more restrictive env value —
# the exact inversion most-restrictive-wins exists to prevent. Pinned here through resolution rather
# than by calling the function, so it survives the function being renamed or inlined. Each adjacent
# pair is asserted in BOTH directions, which fixes the total order.
echo "  39. Most-restrictive-wins ordering"
while read -r cfg env_v want; do
  [ -n "$cfg" ] || continue
  D=$(fixture "rank-$cfg-$env_v" "access:\n  tracker: $cfg\n")
  run_case "$D" "AGENT_SKILLS_ACCESS_TRACKER=$env_v"
  assert_eq "config=$cfg env=$env_v → $want" "$AT" "$want"
done <<'PAIRS'
command   manual     manual
manual    command    manual
approve   command    command
command   approve    command
read-only approve    approve
approve   read-only  approve
full      read-only  read-only
read-only full       read-only
PAIRS

# --- 40. The legal vocabulary is a CLOSED set ----------------------------------------------------
# Asserted as a whole line. The substring check this replaces passed unchanged when a sixth mode was
# appended to the enum, so the suite could not tell an intentional vocabulary from a widened one.
echo "  40. Closed vocabulary"
D=$(fixture bad-mode 'access:\n  tracker: sudo\n')
run_case "$D"
assert_rc "an unrecognised mode → refused" "$RC" "1"
assert_stderr_exact_line "the legal set is exactly the five modes" \
  "   Legal values for access.tracker: manual command approve read-only full"

D=$(fixture bad-tracker 'tracker: gitlab\n')
run_case "$D"
assert_stderr_exact_line "the legal tracker set is exactly three" \
  "   Legal values for tracker: jira github auto"

# --- 41. Tier 2 ACCEPTS the documented subset, identically to tier 1 -----------------------------
# The other half of the refusal matrix below, and the half that actually costs something to get
# wrong. A subset narrower than what consumers write turns this task into a different outage: every
# refusal is loud, so an over-narrow subset is not silent — it is a locked door. The review caught a
# shape-based draft that would have refused this project OWN documented example config, and §43
# below runs that config as a fixture so it cannot happen again after the fact.
echo "  41. Tier 2 accepts the documented subset"
IN_SUBSET="
access:\n  tracker: manual\n
access:\n  tracker: \"manual\"\n
access:\n  tracker: manual  # why\n
access: {tracker: manual}\n
access:\n  tracker: manual\ndevLoadAlwaysFiles:\n  - docs/a.md\n  - docs/b.md\n
access:\n  tracker: manual\njira:\n  statusMap:\n    ready-for-review: [Waiting for Review, In Review]\n
access:\n  tracker: manual\ndevelopBatch:\n  resources:\n    - name: local\n      probe:\n        command: curl -fsS x\n
access:\n  tracker: manual\nnote: |\n  free text with &anchors *aliases and <<: merges\n  and a \"quoted key\": here\n
access:\n  tracker: manual\nworktreeSeedPaths: []\n
access:\n  tracker: manual\n\"my key\": 1\n
access:\n  tracker: manual\nbranching:\n  epicIntegration:\n    branchPattern: \"epic/{n}.{slug}\"\n
access:\n  tracker: manual\nretrospective:\n  identities:\n    - jira: Ada Lovelace\n      git: ada@example.com\n
# a comment mentioning &anchor *alias and <<: merge\naccess:\n  tracker: manual\n
"
IN_N=0
echo "$IN_SUBSET" | while IFS= read -r shape; do
  [ -z "$shape" ] && continue
  IN_N=$((IN_N + 1))
  D=$(fixture "subset-in-$IN_N" "$shape")
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"; PY_RC="$RC"; PY_AT="$AT"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
  # On the VALUE, not the exit code. Every escalating config in task.51 returned 0; a suite
  # asserting rc=0 passed while the escalation was live.
  if [ "$AT" = "$PY_AT" ] && [ "$RC" = "$PY_RC" ]; then
    echo "  PASS  in-subset shape resolves identically on both tiers ($PY_RC/$PY_AT)"
  else
    echo "  FAIL  in-subset shape DIVERGES — python $PY_RC/$PY_AT vs awk $RC/$AT"
    echo "        shape: $shape"
    echo "x" >> "$TMPDIR_TEST/subset-in-failures"
  fi
done
if [ -f "$TMPDIR_TEST/subset-in-failures" ]; then
  FAIL=$((FAIL + $(wc -l < "$TMPDIR_TEST/subset-in-failures")))
else
  PASS=$((PASS + 13))
fi

# --- 42. Tier 2 REFUSES everything outside it ----------------------------------------------------
# MIGRATED FROM the old §41 "KNOWN LIMIT" block, which pinned this same divergence as a deferred
# defect: three spelling fixtures (merge via anchor, merge declared at the site, quoted key) that
# asserted awk resolves `full` where python reads `manual`, plus `knownlimit-child`, which asserted
# `full` on BOTH tiers. That block carried a standing instruction — when one of these fails, the
# limit has been fixed; delete the block, do not repair it back to the escalating value. This is
# that deletion, with the coverage carried across rather than dropped: each fixture is here,
# inverted, and `knownlimit-child` is now §42b because it was never a tier-2 problem at all.
echo "  42. Tier 2 refuses everything outside the subset"
# NOTE: this is a DOUBLE-quoted string, so a backtick in a construct label is command substitution —
# it would execute the label and substitute the (empty) output, silently weakening the stderr
# assertion below to a shorter needle. Escape every backtick here as \`.
OUT_OF_SUBSET="
defaults: &d\n  tracker: manual\naccess:\n  <<: *d\n|an anchor
access:\n  <<: {tracker: manual}\n|a merge key
defaults: &d {tracker: manual}\naccess: *d\n|an anchor
\"access\":\n  tracker: manual\n|a quoted key
access :\n  tracker: manual\n|a space before the colon
access: {\n  tracker: manual}\n|a flow mapping spanning lines
access: !!map\n  tracker: manual\n|an explicit tag
---\naccess:\n  tracker: manual\n|a document separator
access:\n  tracker: full\naccess:\n  tracker: manual\n|a duplicate \`access:\` key
access:\n  tracker: full\n  tracker: manual\n|a duplicate \`tracker:\` key under \`access:\`
"
OUT_N=0
echo "$OUT_OF_SUBSET" | while IFS='|' read -r shape construct; do
  [ -z "$shape" ] && continue
  OUT_N=$((OUT_N + 1))
  D=$(fixture "subset-out-$OUT_N" "$shape")

  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
  FAILED=0
  [ "$RC" = "1" ] || { echo "  FAIL  out-of-subset ($construct) [awk] → expected rc=1, got $RC"; FAILED=1; }
  # The value assertion is the one that matters. `full` here is the escalation this task exists to
  # end, and it is reachable at rc=0 — so an rc-only suite would not see it.
  [ "$AT" = "full" ] && { echo "  FAIL  out-of-subset ($construct) [awk] granted full"; FAILED=1; }
  # The MESSAGE is a deliverable, not a detail: it is the entire migration path for BC-1. Asserting
  # rc=1 alone would pass just as happily on the wrong halt — the one validate_enum raises from the
  # identity block, which names neither the line, the construct, nor either way out. These three
  # assertions are what hold the refusal above the identity block.
  grep -qF -- "$construct" "$STDERR_FILE"          || { echo "  FAIL  out-of-subset [awk] did not name the construct ($construct)"; FAILED=1; }
  grep -qF -- "skills-config.yaml:" "$STDERR_FILE" || { echo "  FAIL  out-of-subset ($construct) [awk] did not name the line"; FAILED=1; }
  grep -qF -- "pip install pyyaml" "$STDERR_FILE"  || { echo "  FAIL  out-of-subset ($construct) [awk] did not offer pyyaml"; FAILED=1; }
  grep -qF -- "platform-detection.md" "$STDERR_FILE" || { echo "  FAIL  out-of-subset ($construct) [awk] did not point at the subset spec"; FAILED=1; }

  # Tier 1 is a real parser and still accepts every one of these — with ONE exception. A duplicate
  # key is refused by tier 1 as well (the strict loader rejects it outright, because YAML last-wins
  # would hide the first spelling), so for those two rows the expectation is a halt on BOTH tiers
  # rather than "awk refuses, python reads it". Same verdict, different mechanism.
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
  case "$construct" in
    *duplicate*)
      [ "$RC" = "1" ] || { echo "  FAIL  out-of-subset ($construct) [python] → expected rc=1 (strict loader), got $RC"; FAILED=1; }
      [ "$AT" = "full" ] && { echo "  FAIL  out-of-subset ($construct) [python] granted full"; FAILED=1; }
      ;;
    *)
      [ "$RC" = "0" ]      || { echo "  FAIL  out-of-subset ($construct) [python] → expected rc=0, got $RC"; FAILED=1; }
      [ "$AT" = "manual" ] || { echo "  FAIL  out-of-subset ($construct) [python] → expected manual, got $AT"; FAILED=1; }
      ;;
  esac

  if [ "$FAILED" = "0" ]; then
    echo "  PASS  out-of-subset ($construct): awk refuses with the migration path, python still reads it"
  else
    echo "x" >> "$TMPDIR_TEST/subset-out-failures"
  fi
done
if [ -f "$TMPDIR_TEST/subset-out-failures" ]; then
  FAIL=$((FAIL + $(wc -l < "$TMPDIR_TEST/subset-out-failures")))
else
  PASS=$((PASS + 10))
fi

# --- 42b. A mapping-valued access.tracker is refused on BOTH tiers -------------------------------
# MIGRATED FROM old §41 `knownlimit-child`, which asserted `full` for `for tier in python awk`.
# This shape escaped BOTH tiers and so was never a tier-2 problem: pyyaml parses it correctly and
# the STRICT reader then collapsed its `__MAP__` signal to "" — the same empty string it uses for
# "not configured". A nesting typo therefore read as a config that declares nothing, and nothing
# means `full`. `__NONE__` and `__MAP__` are now different answers.
echo "  42b. Mapping-valued access.tracker"
D=$(fixture mapping-child 'access:\n  tracker:\n    mode: manual\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "mapping-valued access.tracker [$tier] → refused" "$RC" "1"
  if [ "$AT" = "full" ]; then
    bad "mapping-valued access.tracker [$tier] must not grant full" "AT=full"
  else
    ok "mapping-valued access.tracker [$tier] grants nothing"
  fi
  assert_stderr_has "…and says it is a mapping [$tier]" "is a mapping"
done

# A genuine NULL child is a different thing and must still read as absent — the key really is not
# configured, and `full` is the correct answer. Refusing it would be the over-narrow failure.
D=$(fixture null-child 'access:\n  tracker:\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "null access.tracker [$tier] → status 0"  "$RC" "0"
  assert_eq "null access.tracker [$tier] → full"      "$AT" "full"
done

# --- 42c. `__UNSUPPORTED__` cannot be forged from the config --------------------------------------
# Tier 2 answers on a plain stdout channel with no kind byte, so if the hoisted refusal in
# resolve-platform.sh read a READER STDOUT rather than the scan verdict global, a config VALUE
# spelling the sentinel would be obeyed as the signal. That is the `__MAP__` forgery class task.51
# spent three QA cycles closing, and this tier has no framing to lean on.
echo "  42c. The refusal sentinel cannot be forged"
D=$(fixture forge-unsupported 'tracker: __UNSUPPORTED__\naccess:\n  tracker: manual\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
assert_rc         "a config value spelling __UNSUPPORTED__ → rejected" "$RC" "1"
assert_stderr_has "…as a VALUE, by enum validation"                    'tracker: "__UNSUPPORTED__" is not a recognised value'
if [ "$AT" = "full" ]; then bad "forged __UNSUPPORTED__ granted full" "AT=full"; else ok "forged __UNSUPPORTED__ grants nothing"; fi

D=$(fixture forge-unsupported-access 'access:\n  tracker: __UNSUPPORTED__\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
assert_rc "a forged access.tracker value → rejected" "$RC" "1"
if [ "$AT" = "full" ]; then bad "forged access value granted full" "AT=full"; else ok "forged access value grants nothing"; fi

# --- 42e. The READERS themselves, not only the resolver -------------------------------------------
# The refusal an operator sees comes from the hoisted check in resolve-platform.sh, so the guards
# inside the three readers are defence in depth — and defence in depth with no witness is defence
# that can be deleted with the suite green. A mutation audit found exactly that: removing the guard
# from read_nested_config_key_strict changed nothing observable through the resolver. These call the
# readers directly, which is also how a skill that sources read-config.sh alone would meet them.
echo "  42e. The readers, called directly"
D=$(fixture reader-direct 'defaults: &d\n  tracker: manual\naccess:\n  <<: *d\nprd:\n  prdShardedLocation: docs/custom\n')
READ_OUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
  cd '$D'; source '$READER'
  echo \"strict=\$(read_nested_config_key_strict access tracker)\"
  echo \"top=\$(read_config_key tracker)\"
  echo \"nested=\$(read_nested_config_key prd prdShardedLocation)\"
  echo \"verdict=\$_CONFIG_SUBSET_VERDICT\"" 2>/dev/null)
assert_eq "strict reader refuses out-of-subset"  "$(echo "$READ_OUT" | sed -n 's/^strict=//p')" "__UNSUPPORTED__"
assert_eq "top-level reader refuses out-of-subset" "$(echo "$READ_OUT" | sed -n 's/^top=//p')"  "__UNSUPPORTED__"
# The non-strict reader NEVER emits a sentinel — resolve-paths.sh has no way to act on one and its
# roots have safe defaults. `__UNREADABLE__` reached PRD_ROOT once and render-retro.sh got as far as
# `mkdir -p "__UNREADABLE__"`; this is the same split, held by a test this time.
assert_eq "non-strict reader maps it to empty"   "$(echo "$READ_OUT" | sed -n 's/^nested=//p')" ""
assert_eq "the verdict names the line and construct" \
  "$(echo "$READ_OUT" | sed -n 's/^verdict=//p')" '1:an anchor (`&name`)'

# The tier-1 half of the mapping-valued access.tracker fix, called DIRECTLY. Through the resolver
# this is masked: resolve-platform.sh reads via config_bulk whenever tier 1 is available, so the
# bulk path's own `__MAP__` check answers first and the strict reader is never reached. A mutation
# audit found exactly that — collapsing `__MAP__` back to "" here left the suite green — which is
# why BOTH sites are asserted rather than the one the resolver happens to exercise.
D=$(fixture reader-direct-map 'access:\n  tracker:\n    mode: manual\n')
for tier in python awk; do
  MAPOUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER="$tier" bash -c "
    cd '$D'; source '$READER'; read_nested_config_key_strict access tracker" 2>/dev/null)
  assert_eq "strict reader [$tier] reports a mapping, not absence" "$MAPOUT" "__MAP__"
  # The NON-strict reader must keep collapsing it — resolve-paths.sh never fails by contract, and
  # `prd`/`architecture` have safe defaults. This is the same split as `__UNREADABLE__` before it.
  NSOUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER="$tier" bash -c "
    cd '$D'; source '$READER'; read_nested_config_key access tracker" 2>/dev/null)
  assert_eq "non-strict reader [$tier] still collapses it to empty" "$NSOUT" ""
done

# A genuine null must stay absent in the same reader — the distinction is the whole fix, and a
# guard that answered `__MAP__` for both would refuse a config that declares nothing.
D=$(fixture reader-direct-null 'access:\n  tracker:\n')
for tier in python awk; do
  NULLOUT=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER="$tier" bash -c "
    cd '$D'; source '$READER'; read_nested_config_key_strict access tracker" 2>/dev/null)
  assert_eq "strict reader [$tier] reports a null child as absent" "$NULLOUT" ""
done

# Tier 1 authoritative ⇒ the scan does not run at all, and the verdict must say so rather than
# leaving a stale answer that the hoisted check would act on.
VERDICT_PY=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=python bash -c "
  cd '$D'; source '$READER'; printf '%s' \"\$_CONFIG_SUBSET_VERDICT\"" 2>/dev/null)
assert_eq "tier 1 authoritative → the subset scan is skipped" "$VERDICT_PY" "-"

# A clean file scans clean. Without this, a scan that crashed and returned nothing would read as
# "outside the subset" (loud, wrong) or "-" (silent, worse), and neither would be noticed.
D=$(fixture reader-direct-clean 'access:\n  tracker: manual\n')
VERDICT_OK=$(env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
  cd '$D'; source '$READER'; printf '%s' \"\$_CONFIG_SUBSET_VERDICT\"" 2>/dev/null)
assert_eq "an in-subset file scans clean" "$VERDICT_OK" "-"

# Each refused construct, classified on its own. Through the resolver most of these have no
# INDEPENDENT witness — a legal YAML alias needs an anchor, so the anchor rule always fires on the
# earlier line and the alias rule can be narrowed to match nothing with the suite green (the
# mutation audit found exactly that). The scan is a line classifier, so it is asserted as one:
# feed it the line and check which construct it names.
scan_verdict() {
  D=$(fixture "scan-$1" "$2")
  env -i PATH="$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
    cd '$D'; source '$READER'; printf '%s' \"\$_CONFIG_SUBSET_VERDICT\"" 2>/dev/null
}
assert_eq "classifier: anchor"      "$(scan_verdict anchor  'defaults: &d\n')"          '1:an anchor (`&name`)'
assert_eq "classifier: alias"       "$(scan_verdict alias   'access: *d\n')"            '1:an alias (`*name`)'
assert_eq "classifier: merge key"   "$(scan_verdict merge   'access:\n  <<: *d\n')"     '2:a merge key (`<<`)'
assert_eq "classifier: quoted key"  "$(scan_verdict qkey    '"access":\n')"             '1:a quoted key (`"access":`)'
assert_eq "classifier: spaced key"  "$(scan_verdict spaced  'access :\n')"              '1:a space before the colon (`access :`)'
assert_eq "classifier: explicit key" "$(scan_verdict qmark  '? access\n')"              '1:an explicit key (`? key`)'
assert_eq "classifier: flow map"    "$(scan_verdict flowml  'access: {\n')"             '1:a flow mapping spanning lines'
assert_eq "classifier: tag"         "$(scan_verdict tag     'access: !!map\n')"         '1:an explicit tag (`!tag`)'
assert_eq "classifier: doc sep"     "$(scan_verdict docsep  '---\naccess:\n')"          '1:a document separator (`---`)'
assert_eq "classifier: duplicate top-level guarded key" \
  "$(scan_verdict duptop  'access:\n  tracker: full\naccess:\n  tracker: manual\n')" '3:a duplicate `access:` key'
assert_eq "classifier: duplicate child under a guarded key" \
  "$(scan_verdict dupchild 'access:\n  tracker: full\n  tracker: manual\n')" '3:a duplicate `tracker:` key under `access:`'
assert_eq "classifier: BOM"         "$(scan_verdict bom     '\xef\xbb\xbfaccess:\n')"   '1:a UTF-8 byte-order mark'
assert_eq "classifier: escaped quoted key" "$(scan_verdict qesc '"acc\\x65ss":\n')"    '1:a quoted key containing an escape'

# An awk that DIES must not read as clean. The scan captures awk stdout, and a failed awk produces
# none — which is byte-identical to "found nothing", i.e. the permissive answer. This is the same
# class of mistake as the whole task (absence of evidence reported as evidence of absence), one
# layer down, so it gets the same treatment: the fallback verdict is a refusal, and it is witnessed.
AWKDEAD="$TMPDIR_TEST/awkdead"
mkdir -p "$AWKDEAD"
printf '#!/bin/sh\nexit 1\n' > "$AWKDEAD/awk"
chmod +x "$AWKDEAD/awk"
D=$(fixture scan-awkdead 'access:\n  tracker: manual\n')
DEAD_VERDICT=$(env -i PATH="$AWKDEAD:$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
  cd '$D'; source '$READER'; printf '%s' \"\$_CONFIG_SUBSET_VERDICT\"" 2>/dev/null)
if [ -n "$DEAD_VERDICT" ] && [ "$DEAD_VERDICT" != "-" ]; then
  ok "a failed awk yields a refusal, not a clean verdict (got '$DEAD_VERDICT')"
else
  bad "a failed awk read as clean" "verdict='$DEAD_VERDICT' — an empty scan must never mean in-subset"
fi

# And the resolver must act on it rather than resolving access from a scan that never ran.
OUT=$(env -i PATH="$AWKDEAD:$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
  cd '$D'; source '$RESOLVER' >/dev/null 2>&1; echo \"\$?:\$ACCESS_TRACKER\"")
if [ "$OUT" = "0:full" ]; then
  bad "a failed awk granted full" "$OUT"
else
  ok "a failed awk does not resolve access to full (got '$OUT')"
fi

# And the deliberate NON-matches. The alias rule requires an alphanumeric after `*` precisely so a
# glob in a path value is not mistaken for one; the anchor rule requires a non-space after `&` so a
# URL query string is not. Both would be loud false refusals, and both are plausible in a real
# config — so the looseness is asserted rather than left as a comment.
assert_eq "classifier: a glob value is not an alias"       "$(scan_verdict glob  'worktreeSeedPaths:\n  - *.env\n  - **/x.md\n')" "-"
assert_eq "classifier: an ampersand in a URL is not an anchor" "$(scan_verdict amp 'jira:\n  docBranch: https://x/y?a=1&b=2\n')" "-"
assert_eq "classifier: a quoted key we never read is fine" "$(scan_verdict okey  '"my key": 1\n')" "-"
assert_eq "classifier: a bare - sequence item is fine"     "$(scan_verdict seq   'devLoadAlwaysFiles:\n  - docs/a.md\n')" "-"
# The duplicate rule is scoped to the CONSUMED keys, and that scoping is the difference between
# closing an escalation and locking a consumer out of their own config. A repeated key this reader
# never looks at cannot change what any of the six resolve to; §38 depends on it degrading.
assert_eq "classifier: a duplicated key we never read is fine" \
  "$(scan_verdict dupother 'x: 1\nx: 2\naccess:\n  tracker: manual\n')" "-"
assert_eq "classifier: two different children are not a duplicate" \
  "$(scan_verdict twochild 'access:\n  tracker: manual\n  vcs: full\n')" "-"
assert_eq "classifier: the same child name under DIFFERENT parents is fine" \
  "$(scan_verdict twoparent 'prd:\n  x: 1\narchitecture:\n  x: 2\n')" "-"

# The scan runs ONCE, at source time. Memoised on first use it would cache into the command
# substitution each reader runs inside, never reach the parent, and re-run on every call — the
# mistake that made one `source` cost ten python spawns. Counted through awk invocations.
AWKCOUNT_DIR="$TMPDIR_TEST/awkcount"
mkdir -p "$AWKCOUNT_DIR"
printf '#!/bin/sh\necho x >> "%s/calls"\nexec /usr/bin/awk "$@"\n' "$AWKCOUNT_DIR" > "$AWKCOUNT_DIR/awk"
chmod +x "$AWKCOUNT_DIR/awk"
: > "$AWKCOUNT_DIR/calls"
env -i PATH="$AWKCOUNT_DIR:$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
  cd '$D'; source '$READER'
  read_nested_config_key_strict access tracker
  read_nested_config_key_strict access vcs
  read_config_key tracker
  read_config_key vcs" >/dev/null 2>&1
SCAN_CALLS=$(grep -c x "$AWKCOUNT_DIR/calls" 2>/dev/null || echo 0)
# Four reads, each of which runs its own awk. If the SCAN were lazy it would add one per read
# instead of one per source, so the count would rise with the number of readers called.
if [ "$SCAN_CALLS" -le 9 ]; then
  ok "the subset scan runs once per source, not once per read ($SCAN_CALLS awk calls for 4 reads)"
else
  bad "the subset scan looks lazy" "$SCAN_CALLS awk calls for 4 reads — expected at most 9"
fi

# --- 42d. A file outside the subset that declares NO access still degrades ------------------------
# The refusal is gated on the same fail-closed probe as the malformed branch, and for the same
# reason: the default for ACCESS is `full`, so an unreadable declaration must halt, while the
# default for IDENTITY is *detection*, which is the documented behaviour rather than a guess.
# Halting a consumer who never opted in, over a construct in a section nobody reads, is the
# over-refusal this subset was designed to avoid.
echo "  42d. No access declared → degrade, do not halt"
D=$(fixture out-of-subset-no-access 'defaults: &d\n  x: 1\ntracker: github\n')
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
assert_rc         "outside the subset, no access: → still degrades" "$RC" "0"
assert_eq         "…and identity still resolves"                    "$T"  "github"
assert_eq         "…and access is the documented default"           "$AT" "full"
assert_stderr_has "…but it is not silent"                           "falling back"

# --- 43. The subset accepts this project OWN documented example config ----------------------------
# The corpus the review named as the one that matters. A shape-based subset would refuse it
# outright: it carries three- and four-level nesting, a flow sequence, a sequence of mappings and a
# quoted value containing braces. This repo TWELVE-LINE skills-config.yaml exercises none of that,
# which is exactly why it could not have caught the problem.
#
# Derived from the doc at run time rather than copied, so it cannot drift. Skipped with a notice
# when the doc is absent — this file is also bundled into skills/*/references/, where it is not.
echo "  43. The canonical example config from docs/reference/configuration.md"
CONFIG_DOC="$HERE/../../docs/reference/configuration.md"
if [ -f "$CONFIG_DOC" ]; then
  CANON="$TMPDIR_TEST/canonical.yaml"
  # First fenced yaml block. The doc deliberately shows `tracker:` twice — once as a scalar and
  # once as the mapping form — with a comment saying YAML cannot hold both and to pick one. That
  # duplicate is documentation, not a config anyone writes, and the strict loader rejects it (as it
  # should), so the mapping form is dropped to make the block a config.
  awk '/^```yaml$/ { on = 1; next } on && /^```$/ { exit } on { print }' "$CONFIG_DOC" \
    | awk '/^tracker:[[:space:]]*$/ { skip = 1; next } skip && /^[[:space:]]+workflowFile:/ { next } { skip = 0; print }' \
    > "$CANON"
  if [ -s "$CANON" ]; then
    D=$(fixture canonical-config "")
    cp "$CANON" "$D/skills-config.yaml"
    run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"; PY_RC="$RC"; PY_AT="$AT"; PY_T="$T"; PY_V="$V"
    assert_rc "the canonical example config parses on tier 1" "$PY_RC" "0"
    run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
    assert_rc "the canonical example config is INSIDE the tier-2 subset" "$RC" "0"
    assert_eq "…and resolves ACCESS_TRACKER identically on both tiers"   "$AT" "$PY_AT"
    assert_eq "…and TRACKER identically"                                 "$T"  "$PY_T"
    assert_eq "…and VCS identically"                                     "$V"  "$PY_V"
  else
    echo "  SKIP  canonical example config (no fenced yaml block found in $CONFIG_DOC)"
  fi
else
  echo "  SKIP  canonical example config (docs/reference/configuration.md not present — bundled copy)"
fi

# This repo own config is the second corpus. Small, and it proves little on its own — which is the
# point of asserting it AFTER the one above rather than instead of it.
OWN_CONFIG="$HERE/../../skills-config.yaml"
if [ -f "$OWN_CONFIG" ]; then
  D=$(fixture own-config "")
  cp "$OWN_CONFIG" "$D/skills-config.yaml"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"; PY_AT="$AT"; PY_RC="$RC"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
  assert_rc "this repo own skills-config.yaml is inside the subset" "$RC" "$PY_RC"
  assert_eq "…and resolves identically on both tiers"               "$AT" "$PY_AT"
else
  echo "  SKIP  this repo own skills-config.yaml (not present — bundled copy)"
fi

# --- 44. The guarded key list matches the live call sites -----------------------------------------
# The LOCAL rules (a quoted key, a space before the colon) refuse only keys this reader consumes,
# which makes _CONFIG_GUARDED_KEYS load-bearing: a seventh key added to a call site without being
# added there would be readable under a spelling the scanner waves through — the hole re-opened for
# one key, quietly, with the suite green. Pin the list against the call sites themselves.
echo "  44. The guarded key list covers every reader call site"
if [ -d "$HERE" ]; then
  GUARDED=$(env -i PATH="$PATH" HOME="$HOME" bash -c "source '$READER' >/dev/null 2>&1; printf '%s' \"\$_CONFIG_GUARDED_KEYS\"")
  MISSING=""
  # Every literal key argument passed to a reader anywhere in shared/resources/. COMMENTS ARE
  # STRIPPED FIRST — these readers are named constantly in the prose that explains them, and
  # scraping that prose collects English words instead of key names.
  # Production resolvers only. The test files name these readers inside assertion STRINGS, which no
  # comment-stripping can tell from a call — and a suite that scans itself finds its own prose.
  READER_SOURCES=$(ls "$HERE"/*.sh 2>/dev/null | grep -v '\.test\.sh$')
  # shellcheck disable=SC2086
  READER_CALLS=$(sed 's/[[:space:]]#.*$//; s/^[[:space:]]*#.*$//' $READER_SOURCES \
    | grep -oE '(read_(nested_)?config_key(_strict)?|config_child_shape)[[:space:]]+[a-zA-Z][a-zA-Z0-9_]*([[:space:]]+[a-zA-Z][a-zA-Z0-9_]*)?' \
    | sed -E 's/^(read_(nested_)?config_key(_strict)?|config_child_shape)[[:space:]]+//' \
    | tr ' ' '\n' | sort -u)
  for key in $READER_CALLS; do
    [ -n "$key" ] || continue
    echo "$GUARDED" | tr '|' '\n' | grep -qxF "$key" || MISSING="$MISSING $key"
  done
  if [ -z "$MISSING" ]; then
    ok "every key read by shared/resources/*.sh appears in _CONFIG_GUARDED_KEYS"
  else
    bad "a reader call site names a key the subset scan does not guard" "missing:$MISSING"
  fi
fi

# --- 45. awk variants: BWK awk, gawk, mawk --------------------------------------------------------
# The scan is one awk program and awk is three implementations. A regex or an octal escape that
# works on the macOS BWK awk and not on mawk would refuse a clean config on Debian, or accept a
# merge key on macOS — a divergence in the permissive direction. Forced by shimming `awk` on PATH,
# because that is what the scan actually invokes.
echo "  45. awk variants"
for variant in gawk mawk; do
  if ! command -v "$variant" >/dev/null 2>&1; then
    echo "  SKIP  $variant not installed on this host (CI installs both — see .github/workflows/test.yml)"
    continue
  fi
  ASHIM="$TMPDIR_TEST/awkshim-$variant"
  mkdir -p "$ASHIM"
  printf '#!/bin/sh\nexec %s "$@"\n' "$(command -v "$variant")" > "$ASHIM/awk"
  chmod +x "$ASHIM/awk"

  D=$(fixture "awkvar-in-$variant" 'access:\n  tracker: manual\njira:\n  statusMap:\n    ready-for-review: [A, B]\n')
  OUT=$(env -i PATH="$ASHIM:$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
    cd '$D'; source '$RESOLVER' >/dev/null 2>&1; echo \"\$?:\$ACCESS_TRACKER\"")
  assert_eq "[$variant] in-subset config resolves" "$OUT" "0:manual"

  D=$(fixture "awkvar-out-$variant" 'defaults: &d\n  tracker: manual\naccess:\n  <<: *d\n')
  OUT=$(env -i PATH="$ASHIM:$PATH" HOME="$HOME" AGENT_SKILLS_CONFIG_TIER=awk bash -c "
    cd '$D'; source '$RESOLVER' >/dev/null 2>&1; echo \"\$?:\$ACCESS_TRACKER\"")
  assert_eq "[$variant] out-of-subset config is refused" "$OUT" "1:"
done

# --- 46. A real awk-only host, not a forced tier --------------------------------------------------
# Forcing AGENT_SKILLS_CONFIG_TIER tests the branch. It does not test what a consumer runs: a stock
# macOS host where /usr/bin/python3 ships without pyyaml and awk is simply the only tier there is.
# Shim the interpreters away instead, and run it under zsh too — macOS logins are zsh, and task.51
# cycle 1 shipped a bash-only ${!var} that broke every call site on the shell consumers actually use.
echo "  46. A host with no python at all"
PYSHIM="$TMPDIR_TEST/pyshim"
mkdir -p "$PYSHIM"
printf '#!/bin/sh\nexit 127\n' > "$PYSHIM/python3"
cp "$PYSHIM/python3" "$PYSHIM/python"
chmod +x "$PYSHIM/python3" "$PYSHIM/python"

for sh in bash zsh; do
  if ! command -v "$sh" >/dev/null 2>&1; then
    echo "  SKIP  $sh not on this host"
    continue
  fi
  # PATH is re-asserted INSIDE the -c body, not only in the env. A login shell runs its startup
  # files first, and on macOS /etc/zshrc prepends /usr/local/bin — which put a REAL python3 back in
  # front of the shim and quietly turned this into a tier-1 test that passed for the wrong reason.
  # Setting it here means the shim survives whatever the host startup files do.
  SHIMPATH="PATH=$PYSHIM:/usr/bin:/bin; export PATH;"

  D=$(fixture "nopython-in-$sh" 'access:\n  tracker: manual\n')
  OUT=$(env -i PATH="$PYSHIM:/usr/bin:/bin" HOME="$HOME" "$sh" -c "
    $SHIMPATH cd '$D'; source '$RESOLVER' >/dev/null 2>&1; echo \"\$?:\$ACCESS_TRACKER\"")
  assert_eq "[$sh, no python] in-subset access resolves" "$OUT" "0:manual"

  D=$(fixture "nopython-out-$sh" 'defaults: &d\n  tracker: manual\naccess:\n  <<: *d\n')
  OUT=$(env -i PATH="$PYSHIM:/usr/bin:/bin" HOME="$HOME" "$sh" -c "
    $SHIMPATH cd '$D'; source '$RESOLVER' >/dev/null 2>&1; echo \"\$?:\$ACCESS_TRACKER\"")
  assert_eq "[$sh, no python] out-of-subset access is REFUSED, never full" "$OUT" "1:"

  # The shim must actually be the interpreter on PATH. Without this the two assertions above pass
  # identically on a host where tier 1 is alive, proving nothing about the tier consumers run.
  WHICH_PY=$(env -i PATH="$PYSHIM:/usr/bin:/bin" HOME="$HOME" "$sh" -c "$SHIMPATH command -v python3")
  assert_eq "[$sh, no python] the shim is the python3 on PATH" "$WHICH_PY" "$PYSHIM/python3"

  # End to end: a guarded call site, which is how every skill sources this. `|| exit 1` is what
  # turns the refusal into a halt; without it the caller prints the message and carries on.
  RC_GUARDED=$(env -i PATH="$PYSHIM:/usr/bin:/bin" HOME="$HOME" "$sh" -c "
    $SHIMPATH cd '$D'; ( source '$RESOLVER' || exit 1; echo unreachable ) >/dev/null 2>&1; echo \$?")
  assert_eq "[$sh, no python] a guarded call site exits 1" "$RC_GUARDED" "1"
done

# --- Summary -----------------------------------------------------------------
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
