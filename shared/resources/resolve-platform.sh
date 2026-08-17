#!/usr/bin/env bash
# resolve-platform.sh — source this file to set TRACKER, VCS, ACCESS_TRACKER and ACCESS_VCS.
#
# Usage (in a skill or script):
#   source shared/resources/resolve-platform.sh || exit 1
#   # The four variables are now set for the remainder of the shell session.
#
# The `|| exit 1` is not optional. This resolver rejects an unrecognised value by writing to
# stderr and returning non-zero; a caller that sources it bare prints the message and carries on
# with a default — which for an access control is the exact silent-permissive outcome the
# validation exists to prevent.
#
# Outputs:
#   TRACKER        — "jira" or "github"          (identity: which tracker)
#   VCS            — "github" or "bitbucket"     (identity: which forge)
#   ACCESS_TRACKER — full | read-only | approve | command | manual   (access: how much it may do)
#   ACCESS_VCS     — full                        (only `full` is supported today; see below)
#
# Identity and access are separate axes. Knowing the tracker is Jira is what lets a restricted run
# still emit "move RAPP-605 to In Review" with the right URL and field names, so `manual` is a
# value of `access.tracker`, never of `tracker`.
#
# Resolver order for identity (per shared/resources/platform-detection.md):
#   1. skills-config.yaml keys (tracker:, vcs:)
#   2. Env vars (JIRA_URL → jira)
#   3. Git remote (bitbucket.org → bitbucket)
#   4. Default: github / github
#
# Resolver order for access — deliberately NOT the same:
#   Config and env are each read independently, then the MORE RESTRICTIVE of the two wins,
#   ordering the modes  manual < command < approve < read-only < full  by permissiveness.
#   Identity uses config → env → detect because picking the wrong tracker is a mistake; access
#   uses most-restrictive-wins because picking the wrong access is an escalation. A CI job or a
#   single run can therefore lock itself down without editing committed config, while a stray env
#   var can never loosen a config that deliberately restricts.
#
# Graceful degrade: see read-config.sh for the two tiers. A skills-config.yaml that is missing, or
# unparseable and carrying no `access:` block, still degrades to detection exactly as it always
# has. A malformed file that DOES carry an `access:` block fails closed instead — the default for
# access is `full`, so degrading there would silently re-grant the credentials the operator meant
# to withhold.

# Locate this file's own directory so the shared reader can be sourced as a sibling. read-config.sh
# sits beside this file in both layouts — shared/resources/ in-tree, <skill>/references/ once
# bundled — so a sibling path is correct in both and needs no rewrite.
#
# BASH_SOURCE is bash-only and macOS logins are zsh, so fall back to zsh's %x prompt expansion.
# The eval keeps that zsh-only parameter form away from bash's parser, which would otherwise
# reject it as a bad substitution even on the branch it never takes.
_rp_self="${BASH_SOURCE[0]:-}"
if [ -z "$_rp_self" ] && [ -n "${ZSH_VERSION:-}" ]; then
  eval '_rp_self="${(%):-%x}"'
fi
[ -n "$_rp_self" ] || _rp_self="$0"
# shellcheck source=read-config.sh
source "$(dirname "$_rp_self")/read-config.sh"
unset _rp_self

# Permissiveness order, least to most. Also the legal set for both access keys.
ACCESS_MODES="manual command approve read-only full"

access_rank() {
  case "$1" in
    manual)    echo 0 ;;
    command)   echo 1 ;;
    approve)   echo 2 ;;
    read-only) echo 3 ;;
    full)      echo 4 ;;
    *)         echo -1 ;;
  esac
}

# validate_enum <key-label> <value> <legal>...
# Legal sets are passed PER KEY, never shared. One set across `tracker` and `vcs` would accept
# `tracker: bitbucket` and `vcs: jira` — misconfigurations of exactly the class being closed here.
validate_enum() {
  local key="$1" value="$2"
  shift 2
  local legal="$*" candidate
  for candidate in "$@"; do
    [ "$value" = "$candidate" ] && return 0
  done
  printf '❌ %s: %s: "%s" is not a recognised value.\n' "$SKILLS_CONFIG_FILE" "$key" "$value" >&2
  printf '   Legal values for %s: %s\n' "$key" "$legal" >&2
  return 1
}

# resolve_access <system>   (system = "tracker" | "vcs")
# Echoes the resolved mode. Returns 1 if either tier holds an unrecognised value.
resolve_access() {
  local system="$1" cfg env_name env_val resolved
  cfg=$(read_nested_config_key access "$system")
  env_name="AGENT_SKILLS_ACCESS_$(printf '%s' "$system" | tr '[:lower:]' '[:upper:]')"
  env_val="${!env_name:-}"

  # Both tiers are validated. An env var that bypassed validation would be a hole straight
  # through the check, since it is the tier a CI environment can set most easily.
  [ -n "$cfg" ] && { validate_enum "access.$system" "$cfg" $ACCESS_MODES || return 1; }
  [ -n "$env_val" ] && { validate_enum "$env_name" "$env_val" $ACCESS_MODES || return 1; }

  if [ -n "$cfg" ] && [ -n "$env_val" ]; then
    if [ "$(access_rank "$cfg")" -le "$(access_rank "$env_val")" ]; then
      resolved="$cfg"
    else
      resolved="$env_val"
    fi
  elif [ -n "$cfg" ]; then
    resolved="$cfg"
  elif [ -n "$env_val" ]; then
    resolved="$env_val"
  else
    resolved="full"
  fi
  echo "$resolved"
}

# ── Fail-closed branch for an unreadable config ─────────────────────────────
# Grepping for an `access:` line separates the two cases cleanly: a consumer who never opted in is
# never locked out by a broken file, and one who did is never silently unlocked by it.
if [ "$(config_file_status)" = "malformed" ]; then
  if grep -q '^access:' "$SKILLS_CONFIG_FILE" 2>/dev/null; then
    printf '❌ %s: access is configured but unreadable.\n' "$SKILLS_CONFIG_FILE" >&2
    printf '   The file contains an `access:` block but could not be parsed, so the access level\n' >&2
    printf '   cannot be determined. Refusing to fall back to `full` — fix the YAML and re-run.\n' >&2
    return 1
  fi
  printf '⚠️  %s could not be parsed — falling back to platform detection.\n' "$SKILLS_CONFIG_FILE" >&2
fi

# ── Identity ────────────────────────────────────────────────────────────────
TRACKER=$(read_config_key tracker)
# A mapping-valued `tracker:` is the documented `tracker.workflowFile` form (see
# docs/reference/tracker-workflow.md). It is not a platform override and must not be graded as
# one — it means "no scalar override", i.e. detect.
[ "$TRACKER" = "__MAP__" ] && TRACKER="auto"
validate_enum tracker "$TRACKER" jira github auto || return 1
[ "$TRACKER" = "auto" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)

VCS=$(read_config_key vcs)
if [ "$VCS" = "__MAP__" ]; then
  printf '❌ %s: vcs: expected a scalar, found a mapping.\n' "$SKILLS_CONFIG_FILE" >&2
  printf '   Legal values for vcs: github bitbucket auto\n' >&2
  return 1
fi
validate_enum vcs "$VCS" github bitbucket auto || return 1
[ "$VCS" = "auto" ] && VCS=$(git remote get-url origin 2>/dev/null | grep -qi bitbucket.org && echo bitbucket || echo github)

# ── Access ──────────────────────────────────────────────────────────────────
ACCESS_TRACKER=$(resolve_access tracker) || return 1
ACCESS_VCS=$(resolve_access vcs) || return 1

# `access.vcs` is accepted and validated so the schema is stable, but only `full` works today.
# VCS write is a hard requirement for the whole pipeline: /create-pr returns a PR URL that later
# steps consume, and /develop-next gates on `gh pr merge`. Rejecting with the reason beats
# accepting a value that would be silently ignored.
if [ "$ACCESS_VCS" != "full" ]; then
  printf '❌ access.vcs: "%s" is accepted as a key but not supported as a value.\n' "$ACCESS_VCS" >&2
  printf '   VCS write access is a hard requirement: /create-pr returns a PR URL that later\n' >&2
  printf '   pipeline steps consume, and /develop-next gates on `gh pr merge`. Only `full` is\n' >&2
  printf '   supported today — remove the key or set `access.vcs: full`.\n' >&2
  return 1
fi

export TRACKER VCS ACCESS_TRACKER ACCESS_VCS

# tracker_call_with_retry — wrap a non-blocking tracker mutation (gh api,
# gh issue comment, gh pr comment, gh project, etc.) with 3× exponential
# backoff (1s, 2s, 4s).
#
# Usage:
#   tracker_call_with_retry gh api graphql -f query='...'
#   tracker_call_with_retry gh issue close 42
#
# Exit code: 0 on first success; non-zero (last attempt's code) after 3 failures.
# Stdout/stderr of the wrapped command are passed through.
#
# Caller policy: failures from this helper are non-blocking — log a warning
# in the Issues Log and continue. Tracker mutations are best-effort by design;
# the implementation report + PR remain the source of truth.
#
# Note for MCP-driven Jira calls: this helper is shell-only and cannot wrap
# Atlassian MCP tool invocations. Skill-level retry is required for MCP calls;
# orchestrator skills that call MCP should implement equivalent 3× retry
# inline (see develop-pipeline-step-0-resolve-and-prepare.md "Jira path").
tracker_call_with_retry() {
  local rc=0
  local delay
  for delay in 1 2 4; do
    "$@" && return 0
    rc=$?
    # On the last attempt, do not sleep — just return the failure code.
    [ "$delay" = "4" ] && return "$rc"
    sleep "$delay"
  done
  return "$rc"
}
