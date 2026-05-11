#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/resolve-platform.sh. Regenerate via `npm run bundle`.
# resolve-platform.sh — source this file to set TRACKER and VCS.
#
# Usage (in a skill or script):
#   source shared/resources/resolve-platform.sh
#   # TRACKER and VCS are now set for the remainder of the shell session.
#
# Outputs:
#   TRACKER — "jira" or "github"
#   VCS     — "github" or "bitbucket"
#
# Resolver order (per shared/resources/platform-detection.md):
#   1. skills-config.yaml keys (tracker:, vcs:)
#   2. Env vars (JIRA_URL → jira)
#   3. Git remote (bitbucket.org → bitbucket)
#   4. Default: github / github
#
# Graceful degrade: python+pyyaml is tried first (full YAML parsing). If pyyaml
# is unavailable, awk handles the common simple key: value case. If skills-
# config.yaml is missing/malformed at both tiers, returns "auto" and the
# env-var / git-remote tier runs — behaviour is unchanged.

read_config_key() {
  local key="$1" val=""
  # Tier 1: python+pyyaml (handles any valid YAML)
  val=$(python -c "
import yaml
try:
    with open('skills-config.yaml') as f:
        v = yaml.safe_load(f).get('$key', 'auto')
        print(v if v is not None else 'auto')
except Exception:
    print('auto')
" 2>/dev/null) || val=""
  # Tier 2: awk fallback for simple top-level key: value lines (no pyyaml needed)
  if [ -z "$val" ] || [ "$val" = "auto" ]; then
    val=$(awk -F': *' "/^${key}:/{gsub(/[[:space:]]+$/, \"\", \$2); print \$2; exit}" \
      skills-config.yaml 2>/dev/null)
    [ -z "$val" ] && val="auto"
  fi
  echo "$val"
}

TRACKER=$(read_config_key tracker)
[ "$TRACKER" = "auto" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)

VCS=$(read_config_key vcs)
[ "$VCS" = "auto" ] && VCS=$(git remote get-url origin 2>/dev/null | grep -qi bitbucket.org && echo bitbucket || echo github)

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
