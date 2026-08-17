#!/usr/bin/env bash
# read-config.sh — shared readers for skills-config.yaml.
#
# Usage (in a skill, script, or another shared resolver):
#   source shared/resources/read-config.sh
#
# Provides:
#   config_python                     — echo an interpreter that can parse YAML; return 1 if none
#   config_file_status                — echo missing | ok | malformed | unverified
#   read_config_key <key>             — top-level scalar. Echoes the value, "auto" when the key is
#                                       absent/null, or "__MAP__" when the key holds a mapping or
#                                       sequence rather than a scalar.
#   read_nested_config_key <p> <c>    — two-level scalar. Echoes the value or an empty string.
#   config_child_shape <parent>       — echo absent | mapping | scalar. Lets a caller reject a key
#                                       written in a shape it cannot honour, instead of silently
#                                       reading nothing out of it.
#
# Two tiers:
#   Tier 1 — python + pyyaml. Full YAML: distinguishes a mapping from a scalar, an absent key from
#            a parse failure, and understands the inline flow form. Its answer is AUTHORITATIVE —
#            when tier 1 runs, tier 2 is not consulted. (Letting an "absent" answer fall through to
#            awk is what made `tracker: null` halt: tier 1 correctly said "not configured", awk then
#            returned the literal text `null`, and validation rejected it.)
#   Tier 2 — awk. Handles `key: value`, two-level block mappings, and the inline flow mapping
#            `parent: {child: value}`. No dependencies.
#
# The tier-1 probe tries `python3` first and falls back to `python`, and is MEMOISED — it used to
# re-run `command -v` plus `import yaml` on every call, costing ten python spawns and about a second
# per `source`. The copies this file replaces invoked a bare `python`, which macOS has not shipped
# since 12.3, so tier 1 was dead on most machines and awk was silently the only tier.
#
# The config path and every key name are passed to python as ARGUMENTS, never spliced into the
# program text. Splicing made a path containing a quote both break the parse and execute arbitrary
# code.
#
# Testing hook: AGENT_SKILLS_CONFIG_TIER=awk forces the tier-2 path; =python skips the tier-2
# fallback. Unset (normal operation) tries tier 1, then tier 2. The tiers can only be told apart on
# inputs a real parser grades differently, so any suite covering those must force each tier
# explicitly — and must SKIP loudly, not silently pass, when the forced tier is unavailable.

SKILLS_CONFIG_FILE="${SKILLS_CONFIG_FILE:-skills-config.yaml}"

# Memoised probe result: "" = not yet probed, "-" = no usable interpreter, else the interpreter.
_CONFIG_PY=""

# One program, three modes — so a single file read serves every question and there is one place
# where YAML semantics are decided. Sentinels are chosen to be impossible YAML scalars.
_CONFIG_PY_PROG='
import sys, yaml
path, mode = sys.argv[1], sys.argv[2]
try:
    with open(path) as f:
        d = yaml.safe_load(f)
except Exception:
    print("__ERR__"); sys.exit(0)
if d is None:
    d = {}
if not isinstance(d, dict):
    print("__ERR__"); sys.exit(0)

def emit(v):
    if v is None:
        print("__NONE__")
    elif isinstance(v, bool):
        print("true" if v else "false")
    elif isinstance(v, (dict, list)):
        print("__MAP__")
    else:
        print(v)

def answer(spec):
    kind, _, rest = spec.partition(":")
    if kind == "status":
        return "ok"
    if kind == "key":
        v = d.get(rest)
        return "__NONE__" if v is None else (
            ("true" if v else "false") if isinstance(v, bool) else
            "__MAP__" if isinstance(v, (dict, list)) else str(v))
    if kind == "shape":
        p = d.get(rest)
        return "absent" if p is None else ("mapping" if isinstance(p, dict) else "scalar")
    if kind == "nested":
        parent, _, child = rest.partition(".")
        p = d.get(parent)
        if not isinstance(p, dict):
            return "__NONE__"
        v = p.get(child)
        return "__NONE__" if v is None else (
            ("true" if v else "false") if isinstance(v, bool) else
            "__MAP__" if isinstance(v, (dict, list)) else str(v))
    return "__NONE__"

if mode == "status":
    print("ok")
elif mode == "key":
    emit(d.get(sys.argv[3]))
elif mode == "shape":
    p = d.get(sys.argv[3])
    print("absent" if p is None else ("mapping" if isinstance(p, dict) else "scalar"))
elif mode == "nested":
    p = d.get(sys.argv[3])
    if not isinstance(p, dict):
        print("__NONE__")
    else:
        emit(p.get(sys.argv[4]))
elif mode == "bulk":
    # One spawn, many answers. Each remaining argv is a spec — status | key:K | shape:P |
    # nested:P.C — and one line comes back per spec, in order. Generic: this file knows nothing
    # about which keys a particular caller wants.
    for spec in sys.argv[3:]:
        print(answer(spec))
'

# _config_probe — populate $_CONFIG_PY; return 0 when tier 1 is usable.
#
# Deliberately sets a global and echoes nothing. Every reader below runs inside a command
# substitution, so a probe that returned its answer on stdout would be memoising into a subshell
# that exits immediately — the cache would never reach the parent and the probe would re-run on
# every call. That is what made one `source` cost ten python spawns. The probe therefore runs ONCE
# at source time (bottom of this file) and the readers consult the variable.
_config_probe() {
  [ "${AGENT_SKILLS_CONFIG_TIER:-}" = "awk" ] && return 1
  if [ -z "$_CONFIG_PY" ]; then
    _CONFIG_PY="-"
    local py
    for py in python3 python; do
      command -v "$py" >/dev/null 2>&1 || continue
      "$py" -c 'import yaml' >/dev/null 2>&1 || continue
      _CONFIG_PY="$py"
      break
    done
  fi
  [ "$_CONFIG_PY" != "-" ]
}

# Public form — echoes the interpreter, for callers and tests that want to know which one won.
config_python() {
  _config_probe || return 1
  echo "$_CONFIG_PY"
}

_config_py_run() {
  # _config_py_run <mode> [args...] — run the shared program, or return 1 if tier 1 is unavailable.
  _config_probe || return 1
  "$_CONFIG_PY" -c "$_CONFIG_PY_PROG" "$SKILLS_CONFIG_FILE" "$@" 2>/dev/null
}

# config_file_status — can skills-config.yaml be trusted?
#
#   missing     — no file. Every key is absent; callers use their defaults.
#   ok          — tier 1 parsed it and it is a mapping (or empty).
#   malformed   — tier 1 failed to parse it, or tier 2 saw a line that cannot be valid YAML.
#   unverified  — tier 2 only, nothing obviously wrong. NOT a promise of validity.
#
# The distinction matters to one caller: resolve-platform.sh fails closed on `malformed` when an
# `access:` block is present, because silently degrading an access control to its permissive default
# is the one failure that must never happen.
config_file_status() {
  local out
  [ -f "$SKILLS_CONFIG_FILE" ] || { echo missing; return 0; }

  if out=$(_config_py_run status); then
    [ "$out" = "ok" ] && echo ok || echo malformed
    return 0
  fi

  # Tier 2: reject only what cannot be valid YAML in block context — a line whose first non-space
  # character is ':'. Nothing else.
  #
  # This lint used to also require every non-indented line to look like `key:`, which rejected
  # perfectly legal files: a root-level block sequence (`- item` at column 0), a quoted key, a key
  # containing '/' or a space. With an `access:` block present those became a hard halt, and only on
  # hosts without pyyaml — so the same file worked on one machine and bricked the pipeline on
  # another. A heuristic that is not a parser must not invent malformation it cannot prove.
  #
  # Block scalars are still tracked so their free-form body is never graded as YAML.
  if awk '
    {
      n = match($0, /[^ \t]/)
      indent = (n ? n - 1 : -1)
    }
    /^[[:space:]]*$/                         { next }
    in_bs && indent > bs_indent              { next }
                                             { in_bs = 0 }
    /^[[:space:]]*#/                         { next }
    /:[[:space:]]*[|>][0-9+-]*[[:space:]]*$/ { in_bs = 1; bs_indent = indent; next }
    /^[[:space:]]*:/                         { bad = 1; exit }
    END                                      { exit (bad ? 1 : 0) }
  ' "$SKILLS_CONFIG_FILE" 2>/dev/null; then
    echo unverified
  else
    echo malformed
  fi
}

# config_child_shape <parent> — absent | mapping | scalar
# A caller that only knows how to read `parent.child` uses this to tell "not configured" from
# "configured in a shape I am about to ignore". Ignoring it silently is how `access: manual`
# resolved to `full` with exit 0.
config_child_shape() {
  local parent="$1" out
  if out=$(_config_py_run shape "$parent"); then
    case "$out" in
      absent | mapping | scalar) echo "$out"; return 0 ;;
      __ERR__) : ;;
    esac
  fi
  [ "${AGENT_SKILLS_CONFIG_TIER:-}" = "python" ] && { echo absent; return 0; }

  awk -v p="$parent" '
    $0 ~ "^"p":[[:space:]]*$"      { print "mapping"; found=1; exit }
    $0 ~ "^"p":[[:space:]]*\\{"    { print "mapping"; found=1; exit }
    $0 ~ "^"p":[[:space:]]*#"      { print "mapping"; found=1; exit }
    $0 ~ "^"p":[[:space:]]*[^[:space:]]" { print "scalar"; found=1; exit }
    END { if (!found) print "absent" }
  ' "$SKILLS_CONFIG_FILE" 2>/dev/null
}

read_config_key() {
  local key="$1" val=""
  # Tier 1 is authoritative when it runs — including when it says "absent".
  if val=$(_config_py_run key "$key"); then
    case "$val" in
      __NONE__) echo auto;     return 0 ;;
      __MAP__)  echo __MAP__;  return 0 ;;
      __ERR__)  : ;;                        # unparseable — let awk try
      "")       : ;;                        # interpreter died — let awk try
      *)        echo "$val";   return 0 ;;
    esac
  fi

  [ "${AGENT_SKILLS_CONFIG_TIER:-}" = "python" ] && { echo auto; return 0; }

  # Tier 2: simple top-level `key: value`. Strips a trailing inline comment and surrounding quotes —
  # without which `tracker: "jira"` and `tracker: jira  # why` would be rejected by validation, both
  # being legal YAML naming a legal platform.
  val=$(awk -F': *' "/^${key}:/{
    v = \$2
    sub(/[[:space:]]+#.*\$/, \"\", v)
    gsub(/^[[:space:]]+|[[:space:]]+\$/, \"\", v)
    gsub(/^[\"\\047]|[\"\\047]\$/, \"\", v)
    print v
    exit
  }" "$SKILLS_CONFIG_FILE" 2>/dev/null)
  # YAML's null spellings all mean "not configured", the same as an absent key. Tier 1 already
  # returns them as such; without this, awk hands back the literal text `null` and strict validation
  # rejects a config that is both legal and previously working.
  case "$val" in
    null | Null | NULL | '~') val="" ;;
  esac
  [ -z "$val" ] && val="auto"
  echo "$val"
}

read_nested_config_key() {
  # Args: $1 = parent key (e.g. "prd"), $2 = child key (e.g. "prdShardedLocation")
  # Echoes the value or empty string.
  local parent="$1" child="$2" val="" raw
  if raw=$(_config_py_run nested "$parent" "$child"); then
    case "$raw" in
      # Tier 1 ran and found nothing — authoritative. Do not let awk invent an answer.
      __NONE__ | __MAP__) echo ""; return 0 ;;
      __ERR__)            : ;;               # unparseable — let awk try
      "")                 : ;;               # interpreter died — let awk try
      *)                  echo "$raw"; return 0 ;;
    esac
  fi

  [ "${AGENT_SKILLS_CONFIG_TIER:-}" = "python" ] && { echo ""; return 0; }

  # Tier 2: block form (`^parent:` then an indented `child:`) and the inline flow form
  # (`parent: {child: value, ...}`). The flow form used to read as empty here, so an operator who
  # wrote `access: {tracker: manual}` silently got the permissive default on any host without pyyaml.
  val=$(awk -v p="$parent" -v c="$child" '
    $0 ~ "^"p":[[:space:]]*\\{" {
      line = $0
      sub(/^[^{]*\{/, "", line)
      sub(/\}.*$/, "", line)
      n = split(line, parts, ",")
      for (i = 1; i <= n; i++) {
        eq = index(parts[i], ":")
        if (eq == 0) continue
        k = substr(parts[i], 1, eq - 1)
        v = substr(parts[i], eq + 1)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", k)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", v)
        gsub(/^["\x27]|["\x27]$/, "", k)
        gsub(/^["\x27]|["\x27]$/, "", v)
        if (k == c) { print v; exit }
      }
      next
    }
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
  echo "$val"
}


# config_bulk <spec>... — answer several questions in ONE python spawn.
#
# Specs: `status` | `key:<K>` | `shape:<P>` | `nested:<P>.<C>`. Prints one line per spec, in order,
# using the same sentinels as the individual readers (`__NONE__`, `__MAP__`, `__ERR__`).
# Returns 1 when tier 1 is unavailable, so the caller falls back to the individual readers — which
# is also the only correct behaviour, since the awk tier has to answer each question separately.
#
# Exists because the resolver asks six questions per source. One spawn each cost ~500 ms; batching
# them is the difference between a working pyyaml tier being affordable and being a tax on every
# call site.
config_bulk() {
  _config_py_run bulk "$@"
}
# Probe once, here, in the sourcing shell — see _config_probe for why this cannot be lazy.
_config_probe || true
