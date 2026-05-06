#!/usr/bin/env bash
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
