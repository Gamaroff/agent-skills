#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/resolve-paths.sh. Regenerate via `npm run bundle`.
# resolve-paths.sh — source this file to set PRD_ROOT and ARCH_ROOT.
#
# Usage (in a skill or script):
#   source shared/resources/resolve-paths.sh
#   # PRD_ROOT and ARCH_ROOT are now set for the remainder of the shell session.
#
# Outputs:
#   PRD_ROOT   — directory containing the PRD shard tree (default: docs/prd)
#   ARCH_ROOT  — directory containing architecture documents (default: docs/architecture)
#
# Configurable keys in skills-config.yaml at repo root:
#   prd:
#     prdShardedLocation: docs/prd
#   architecture:
#     architectureShardedLocation: docs/architecture
#
# The *nested* structure under each root is a fixed convention:
#   ${PRD_ROOT}/{domain}/{feature}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/
#   ${ARCH_ROOT}/concepts/{coding-standards,tech-stack,source-tree}.md
#
# Resolver order:
#   1. skills-config.yaml nested key
#   2. Default (docs/prd or docs/architecture)
#
# Graceful degrade: python+pyyaml is tried first (full YAML parsing). If pyyaml
# is unavailable, awk handles the common 2-level nested case. If skills-
# config.yaml is missing/malformed at both tiers, the default is returned.

read_nested_config_key() {
  # Args: $1 = parent key (e.g. "prd"), $2 = child key (e.g. "prdShardedLocation")
  # Echoes the value or empty string.
  local parent="$1" child="$2" val=""
  # Tier 1: python+pyyaml
  val=$(python -c "
import yaml
try:
    with open('skills-config.yaml') as f:
        data = yaml.safe_load(f) or {}
        v = (data.get('$parent') or {}).get('$child', '')
        print(v if v is not None else '')
except Exception:
    print('')
" 2>/dev/null) || val=""
  # Tier 2: awk — find '^parent:' then next indented 'child:' line
  if [ -z "$val" ]; then
    val=$(awk -v p="$parent" -v c="$child" '
      $0 ~ "^"p":" { in_block=1; next }
      in_block && /^[^[:space:]]/ { in_block=0 }
      in_block && $0 ~ "^[[:space:]]+"c":" {
        sub("^[[:space:]]+"c":[[:space:]]*", "")
        gsub(/[[:space:]]+$/, "")
        gsub(/^["\x27]|["\x27]$/, "")
        print
        exit
      }
    ' skills-config.yaml 2>/dev/null)
  fi
  echo "$val"
}

PRD_ROOT=$(read_nested_config_key prd prdShardedLocation)
[ -z "$PRD_ROOT" ] && PRD_ROOT="docs/prd"

ARCH_ROOT=$(read_nested_config_key architecture architectureShardedLocation)
[ -z "$ARCH_ROOT" ] && ARCH_ROOT="docs/architecture"

export PRD_ROOT ARCH_ROOT
