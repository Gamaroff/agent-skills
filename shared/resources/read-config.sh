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

# YAML says last-wins on a duplicate key; that is technically correct and operationally awful here.
# A copy-pasted second `access:` block made the first one vanish, silently resolving a declared
# `manual` back to `full` — and the same shape flipped `tracker:`. Treat a duplicate as the config
# error it is, so the malformed branch fails closed rather than quietly picking one.
class _StrictLoader(yaml.SafeLoader):
    pass

def _scan_keys(loader, node):
    """Reject a duplicate among the keys of ONE mapping node, as written."""
    seen = set()
    merges = 0
    for k, _ in node.value:
        if getattr(k, "tag", None) == "tag:yaml.org,2002:merge":
            # A mapping may carry at most one `<<`. Two of them last-wins silently, so an operator
            # merging a restrictive default and then a permissive one gets the permissive one with
            # no diagnostic — the same escalation as a duplicate ordinary key.
            merges += 1
            if merges > 1:
                raise ValueError("duplicate merge key: <<")
            continue
        key = loader.construct_object(k, deep=True)
        if key in seen:
            raise ValueError("duplicate key: %r" % (key,))
        seen.add(key)

def _scan_merge_sources(loader, node):
    """Scan mappings that appear AS a merge source at this site.

    A merge source defined at the merge site — `<<: {a: 1, a: 2}`, or an anchor declared right
    there, or a sequence of such — is spliced in by flatten_mapping without ever being constructed
    in its own right, so it never reaches the duplicate check. Its duplicates then resolve
    last-wins, silently: a declared `manual` became `full`. A NAMED node is already covered,
    because it is constructed where it is defined."""
    for k, v in node.value:
        if getattr(k, "tag", None) != "tag:yaml.org,2002:merge":
            continue
        for sub in (v.value if isinstance(v, yaml.SequenceNode) else [v]):
            if isinstance(sub, yaml.MappingNode):
                _scan_keys(loader, sub)
                _scan_merge_sources(loader, sub)

def _no_dupes(loader, node):
    # Scan the keys AS WRITTEN, before flatten_mapping runs. Order matters twice over:
    #   * scanning before means a `<<` merge key is skipped explicitly rather than blowing up for
    #     want of a constructor (which graded a legal config malformed);
    #   * scanning before ALSO means an inherited key and a local key that overrides it are not
    #     mistaken for a duplicate — flatten_mapping PREPENDS the merged pairs, and overriding is
    #     the entire purpose of `<<`.
    _scan_keys(loader, node)
    _scan_merge_sources(loader, node)
    loader.flatten_mapping(node)
    # Generator, not a plain return: construct_yaml_map yields the dict before filling it, which is
    # what lets a recursive anchor resolve. Returning a finished dict broke those.
    for data in yaml.SafeLoader.construct_yaml_map(loader, node):
        yield data

_StrictLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _no_dupes)

path, mode = sys.argv[1], sys.argv[2]
try:
    with open(path) as f:
        d = yaml.load(f, Loader=_StrictLoader)
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
    """Return (kind, payload). The KIND comes from provenance, never from what the payload spells —
    inferring it from the text meant a config containing the literal `__MAP__` was classified as a
    signal and obeyed, which is the forgery this framing exists to stop."""
    kind, _, rest = spec.partition(":")
    if kind == "status":
        return ("s", "ok")
    if kind == "key":
        return _scalar(d.get(rest))
    if kind == "shape":
        p = d.get(rest)
        return ("v", "absent" if p is None else ("mapping" if isinstance(p, dict) else "scalar"))
    if kind == "nested":
        parent, _, child = rest.partition(".")
        p = d.get(parent)
        if not isinstance(p, dict):
            return ("s", "__NONE__")
        return _scalar(p.get(child))
    return ("s", "__ERR__")   # unknown spec — fail closed, never "absent"

def _scalar(v):
    if v is None:
        return ("s", "__NONE__")
    if isinstance(v, bool):
        return ("v", "true" if v else "false")
    if isinstance(v, (dict, list)):
        return ("s", "__MAP__")
    return ("v", str(v))

if mode == "status":
    print("ok")
elif mode == "key":
    print(answer("key:" + sys.argv[3])[1])
elif mode == "shape":
    print(answer("shape:" + sys.argv[3])[1])
elif mode == "nested":
    print(answer("nested:%s.%s" % (sys.argv[3], sys.argv[4]))[1])
elif mode == "bulk":
    # One spawn, many answers, NUL-framed and TYPED: each record is
    #     <index> US <kind> US <payload> RS          US = 0x1f, RS = 0x1e, kind ∈ {v, s}
    # `v` = a value the config actually contains; `s` = a signal from this reader.
    #
    # Two earlier attempts failed here and both failures were the same mistake in different clothes:
    # putting data and control on one untyped channel. Bare lines let a multi-line value shift every
    # later answer. Escaping fixed the shifting but added an encoder with no decoder, and mangled the
    # trailing newline every block scalar carries, so a working config started halting.
    #
    # ASCII US/RS need no escaping: they survive command substitution (NUL does not — bash strips it,
    # which is why the obvious choice is unusable here) and do not occur in a real config. And they
    # are belt to the kind bytes braces: a value that somehow contained a separator could at worst
    # truncate its own record, which then fails enum validation loudly. A config containing the
    # literal text `__MAP__` arrives as DATA and is validated like any other value, rather than being
    # obeyed as a signal.
    out = []
    for i, spec in enumerate(sys.argv[3:], 1):
        kind, payload = answer(spec)
        # An unescaped framing is only safe if the payload cannot contain a separator. Without this
        # a value could inject a whole record — records are emitted in index order, and the decoder
        # takes the FIRST match, so a payload in record N lands ahead of every real record after it
        # and wins. That silently turned a declared `manual` into `full`.
        #
        # NUL is here for a different reason than US/RS: it frames nothing, but bash and zsh DELETE
        # it during command substitution, so `access.tracker: "\0"` arrived as an empty payload and
        # read as unconfigured — full, exit 0, no warning. Three bytes the transport cannot carry;
        # refusing costs nothing, since no legal value (enum or filesystem path) contains any of them.
        if any(c in payload for c in ("\x1f", "\x1e", "\x00")):
            kind, payload = "s", "__ERR__"
        # A block scalar always carries a trailing newline; `$( )` used to strip it, so stripping
        # here keeps the bulk path and the individual readers agreeing on the same file.
        if kind == "v":
            payload = payload.rstrip("\n")
        out.append("%d\x1f%s\x1f%s\x1e" % (i, kind, payload))
    sys.stdout.write("".join(out))
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

# _config_denull <value> — echo "" for any YAML null spelling, otherwise the value unchanged.
#
# Shared by BOTH readers. It lived inline in read_config_key first and the nested reader was left
# without it, so `access.tracker: null` halted every guarded call site on an awk-only host and
# `architectureShardedLocation: ~` produced ARCH_ROOT=~ — which unquoted expands to $HOME. One
# definition is the fix; two call sites of one helper cannot drift the way two copies did.
_config_denull() {
  case "$1" in
    null | Null | NULL | '~' | '') printf '' ;;
    *) printf '%s' "$1" ;;
  esac
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
  val=$(_config_denull "$val")
  [ -z "$val" ] && val="auto"
  echo "$val"
}

read_nested_config_key() {
  # Args: $1 = parent key (e.g. "prd"), $2 = child key (e.g. "prdShardedLocation")
  # Echoes the value or empty string — NEVER a sentinel.
  #
  # `__UNREADABLE__` (awk met a flow map it cannot read on one line) is meaningful only to the
  # access path, which halts on it. It used to be returned for ANY parent, so resolve-paths.sh —
  # which by contract never fails — produced PRD_ROOT=__UNREADABLE__, consumed by 34 files, and
  # render-retro.sh got as far as `mkdir -p "__UNREADABLE__"`. Callers that want the signal ask for
  # it explicitly via read_nested_config_key_strict.
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
      # A flow map that does not close on this line is beyond what awk should attempt. Emitting
      # nothing here read as "not configured" and resolved access to `full` — a silent escalation.
      # Say so instead; the caller halts. This tier is documented as not a parser, and the right
      # response to syntax it cannot read is to refuse, not to guess.
      if ($0 !~ /\}/) { print "__UNREADABLE__"; exit }
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
  [ "$val" = "__UNREADABLE__" ] && val=""
  _config_denull "$val"
}

# read_nested_config_key_strict <parent> <child> — as above, but MAY echo `__UNREADABLE__` when the
# awk tier meets a flow mapping it cannot read on one line. Only the access path opts in: for a key
# with a safe default (the path roots) the default is the right answer, whereas silently defaulting
# an access control is the failure this whole task exists to prevent.
read_nested_config_key_strict() {
  local parent="$1" child="$2" raw
  if raw=$(_config_py_run nested "$parent" "$child"); then
    case "$raw" in
      __NONE__ | __MAP__) echo ""; return 0 ;;
      __ERR__ | "")       : ;;
      *)                  printf '%s\n' "$raw"; return 0 ;;
    esac
  fi
  [ "${AGENT_SKILLS_CONFIG_TIER:-}" = "python" ] && { echo ""; return 0; }
  awk -v p="$parent" '
    $0 ~ "^"p":[[:space:]]*\\{" { if ($0 !~ /\}/) { print "__UNREADABLE__" } exit }
  ' "$SKILLS_CONFIG_FILE" 2>/dev/null | grep -q . && { echo "__UNREADABLE__"; return 0; }
  read_nested_config_key "$parent" "$child"
}


# config_bulk <spec>... — answer several questions in ONE python spawn.
#
# WIRE FORMAT (read this before consuming it): a NUL-framed stream of typed records,
#     <index> US <kind> US <payload> RS             kind: v = value from the config, s = signal
# US/RS (0x1f/0x1e) do not occur in a real config and survive command substitution, so nothing needs
# escaping; the kind byte is what stops a value from ever being read as a signal. Use `config_bulk_get` to read a record rather than open-coding the framing — an earlier
# version shipped an encoder with no decoder and the two drifted immediately.
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
# config_bulk_get <index> <stream> — echo `<kind> <payload>` for one record, or nothing.
# The kind byte is what keeps a config value spelling `__MAP__` from being obeyed as a signal.
config_bulk_get() {
  # String comparison, not awk's default numeric strnum compare — otherwise 01, 1.0, " 1", +1 and
  # 1e0 all match index 1, which widened the record-forgery surface.
  printf '%s' "$2" | awk -v want="$1" -v RS="$(printf '\036')" -v FS="$(printf '\037')" '
    ($1 "") == (want "") { printf "%s %s", $2, $3; exit }'
}

# Probe once, here, in the sourcing shell — see _config_probe for why this cannot be lazy.
_config_probe || true
