#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/read-config.sh. Regenerate via `npm run bundle`.
# read-config.sh — shared readers for skills-config.yaml.
#
# Usage (in a skill, script, or another shared resolver):
#   source shared/resources/read-config.sh
#
# Provides:
#   config_python                     — echo an interpreter that can parse YAML; return 1 if none
#   config_file_status                — echo missing | ok | malformed | unverified
#   read_config_key <key>             — top-level scalar. Echoes the value, "auto" when the key is
#                                       absent/null/unreadable, or "__MAP__" when the key holds a
#                                       mapping or sequence rather than a scalar.
#   read_nested_config_key <p> <c>    — two-level scalar. Echoes the value or an empty string.
#
# Two tiers, unchanged in spirit from the copies this file replaces:
#   Tier 1 — python + pyyaml. Full YAML: distinguishes a mapping from a scalar and a parse
#            failure from an absent key. Neither of those is knowable from tier 2.
#   Tier 2 — awk. Handles the common `key: value` and two-level nested cases with no dependencies.
#
# The tier-1 probe tries `python3` first and falls back to `python`. The copies this file replaces
# invoked a bare `python`, which macOS has not shipped since 12.3 — so tier 1 was dead on most
# machines and awk was silently the only tier. The probe also requires `import yaml` to succeed,
# because an interpreter without pyyaml cannot do tier-1 work either; that case falls to awk
# exactly as a missing interpreter does.
#
# Testing hook: AGENT_SKILLS_CONFIG_TIER=awk forces the tier-2 path; =python skips the tier-2
# fallback. Unset (normal operation) tries tier 1, then tier 2. The tiers disagree on inputs that
# only a real YAML parser can grade, so any suite covering those must force each tier explicitly
# rather than take whichever the host happens to provide.

SKILLS_CONFIG_FILE="${SKILLS_CONFIG_FILE:-skills-config.yaml}"

config_python() {
  [ "${AGENT_SKILLS_CONFIG_TIER:-}" = "awk" ] && return 1
  local py
  for py in python3 python; do
    command -v "$py" >/dev/null 2>&1 || continue
    "$py" -c 'import yaml' >/dev/null 2>&1 || continue
    echo "$py"
    return 0
  done
  return 1
}

# config_file_status — can skills-config.yaml be trusted?
#
#   missing     — no file. Every key is absent; callers use their defaults.
#   ok          — tier 1 parsed it and it is a mapping (or empty).
#   malformed   — tier 1 failed to parse it, or tier 2's structural lint rejected it.
#   unverified  — tier 2 only. The lint found nothing wrong, but it is not a YAML parser and
#                 cannot promise the file is valid.
#
# The distinction matters to exactly one caller: resolve-platform.sh fails closed on `malformed`
# when an `access:` block is present, because silently degrading an access control to its
# permissive default is the one failure this must never produce.
config_file_status() {
  local py
  [ -f "$SKILLS_CONFIG_FILE" ] || { echo missing; return 0; }

  if py=$(config_python); then
    if "$py" -c "
import sys, yaml
try:
    with open('$SKILLS_CONFIG_FILE') as f:
        d = yaml.safe_load(f)
except Exception:
    sys.exit(1)
sys.exit(0 if d is None or isinstance(d, dict) else 1)
" 2>/dev/null; then
      echo ok
    else
      echo malformed
    fi
    return 0
  fi

  # Tier 2 structural lint. Not a parser — a cheap check for the breakage a parser would catch,
  # so that a machine without pyyaml still fails closed rather than silently granting `full`.
  #
  # Rejects: any line whose first non-space character is ':' (invalid in block context at any
  # depth — this is the shape a truncated or hand-mangled file usually takes), and any
  # non-indented line that does not open a mapping key. Block scalars (`key: |`, `key: >`) are
  # tracked so their free-form indented body is never graded as YAML.
  if awk '
    {
      n = match($0, /[^ \t]/)
      indent = (n ? n - 1 : -1)
    }
    /^[[:space:]]*$/                        { next }
    in_bs && indent > bs_indent             { next }
                                            { in_bs = 0 }
    /^[[:space:]]*#/                        { next }
    /^(---|\.\.\.)[[:space:]]*$/            { next }
    /:[[:space:]]*[|>][0-9+-]*[[:space:]]*$/ { in_bs = 1; bs_indent = indent }
    /^[[:space:]]*:/                        { bad = 1; exit }
    /^[[:space:]]/                          { next }
    /^[A-Za-z_][A-Za-z0-9_.-]*:/            { next }
                                            { bad = 1; exit }
    END                                     { exit (bad ? 1 : 0) }
  ' "$SKILLS_CONFIG_FILE" 2>/dev/null; then
    echo unverified
  else
    echo malformed
  fi
}

read_config_key() {
  local key="$1" val="" py
  # Tier 1: python + pyyaml (handles any valid YAML)
  if py=$(config_python); then
    val=$("$py" -c "
import yaml
try:
    with open('$SKILLS_CONFIG_FILE') as f:
        d = yaml.safe_load(f) or {}
    v = d.get('$key', None)
except Exception:
    print('auto')
else:
    if v is None:
        print('auto')
    elif isinstance(v, (dict, list)):
        print('__MAP__')
    else:
        print(v)
" 2>/dev/null) || val=""
    # A scalar or a mapping is a definitive answer — do not second-guess it with awk.
    if [ -n "$val" ] && [ "$val" != "auto" ]; then
      echo "$val"
      return 0
    fi
  fi

  [ "${AGENT_SKILLS_CONFIG_TIER:-}" = "python" ] && { echo auto; return 0; }

  # Tier 2: awk fallback for simple top-level `key: value` lines (no pyyaml needed).
  # Strips a trailing inline comment and surrounding quotes. The copy this replaces did neither,
  # which was invisible while an unrecognised value silently meant github, and becomes a false
  # rejection now that values are validated: `tracker: "jira"` and `tracker: jira  # why` are
  # both legal YAML naming a legal platform.
  val=$(awk -F': *' "/^${key}:/{
    v = \$2
    sub(/[[:space:]]+#.*\$/, \"\", v)
    gsub(/^[[:space:]]+|[[:space:]]+\$/, \"\", v)
    gsub(/^[\"\\047]|[\"\\047]\$/, \"\", v)
    print v
    exit
  }" "$SKILLS_CONFIG_FILE" 2>/dev/null)
  [ -z "$val" ] && val="auto"
  echo "$val"
}

read_nested_config_key() {
  # Args: $1 = parent key (e.g. "prd"), $2 = child key (e.g. "prdShardedLocation")
  # Echoes the value or empty string.
  local parent="$1" child="$2" val="" py
  # Tier 1: python + pyyaml
  if py=$(config_python); then
    val=$("$py" -c "
import yaml
try:
    with open('$SKILLS_CONFIG_FILE') as f:
        data = yaml.safe_load(f) or {}
        v = (data.get('$parent') or {}).get('$child', '')
        print(v if v is not None else '')
except Exception:
    print('')
" 2>/dev/null) || val=""
  fi
  # Tier 2: awk — find '^parent:' then next indented 'child:' line
  if [ -z "$val" ] && [ "${AGENT_SKILLS_CONFIG_TIER:-}" != "python" ]; then
    val=$(awk -v p="$parent" -v c="$child" '
      $0 ~ "^"p":" { in_block=1; next }
      in_block && /^[^[:space:]]/ { in_block=0 }
      in_block && $0 ~ "^[[:space:]]+"c":" {
        sub("^[[:space:]]+"c":[[:space:]]*", "")
        sub(/[[:space:]]+#.*$/, "")
        gsub(/[[:space:]]+$/, "")
        gsub(/^["\x27]|["\x27]$/, "")
        print
        exit
      }
    ' "$SKILLS_CONFIG_FILE" 2>/dev/null)
  fi
  echo "$val"
}
