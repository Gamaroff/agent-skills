#!/bin/bash
# Shared Jira helpers (auth header, paginated GET, ISO-8601 validation, retry).
# Single source of truth. Hoisted to shared/resources/ and bundled into each
# consuming skill's references/ via `npm run bundle`. Edit here, then re-bundle.
# Source from a script under <skill>/scripts/ AFTER `set -euo pipefail`:
#   source "$(dirname "$0")/../references/jira-sprint-lib.sh"
#
# This file deliberately does NOT set shell options — callers control that.

jsm_require_env() {
  local missing=()
  [ -z "${JIRA_INSTANCE:-}" ]    && missing+=("JIRA_INSTANCE")
  [ -z "${JIRA_USER_EMAIL:-}" ]  && missing+=("JIRA_USER_EMAIL")
  [ -z "${JIRA_API_TOKEN:-}" ]   && missing+=("JIRA_API_TOKEN")
  if [ ${#missing[@]} -gt 0 ]; then
    echo "Error: Missing JIRA env vars: ${missing[*]}" >&2
    exit 1
  fi
}

# Build Authorization header value. Avoids leaking creds via `-u` in process args.
jsm_auth_header() {
  local b64
  b64=$(printf '%s:%s' "$JIRA_USER_EMAIL" "$JIRA_API_TOKEN" | base64 | tr -d '\n')
  printf 'Authorization: Basic %s' "$b64"
}

# The access gate for this file (task.53).
#
# Under any ACCESS_TRACKER other than `full`, a non-GET through jsm_curl is
# REFUSED and RECORDED rather than sent. The record is written by the
# deferred-mutation writer — shared/resources/defer-mutation.js, which the
# bundler ships next to this file, so `$(dirname "${BASH_SOURCE[0]}")` finds it
# both in-tree and in an installed skill.
#
# A caller names what it is about to do by setting these BEFORE the call; unset,
# the record is a `jira.unknown-mutation`, which is legible enough to act on and
# loud enough to notice:
#   JSM_DEFER_KIND     roster kind, e.g. jira.sprint.set-state
#   JSM_DEFER_INTENT   one line, imperative, human-facing
#   JSM_DEFER_TARGET   JSON object, e.g. '{"sprint":"42","url":"…"}'
#   JSM_DEFER_DESIRED  JSON object, e.g. '{"state":"closed"}'
# Resolve the access mode ONCE into caller scope.
#
# Sets: JSM_ACCESS_MODE (one of the five modes) and, on a refusal,
# JSM_ACCESS_ERROR. Returns 0 when a mode was resolved, 1 on a refusal.
#
# Two env tiers, most-restrictive-wins: ACCESS_TRACKER is resolve-platform.sh's
# output, AGENT_SKILLS_ACCESS_TRACKER is the knob an operator sets. Reading only
# the first left this gate inert for exactly the person who had declared a
# restriction, because this skill's own SKILL.md documents bare
# `manage-sprint-state.sh <id> closed` invocations that never source the resolver.
#
# `access.tracker` in skills-config.yaml IS read here, and by the only reader
# there is: resolve-platform.sh, sourced below in a subshell. This file used to
# open-code the mode table over the two env names, which made it a FOURTH copy of
# a contract that already had three — and left it blind to a restriction an
# operator had committed to the repo, which is precisely the person the gate
# exists for. Sourcing the resolver is not a fifth copy; it is the original.
#
# In a SUBSHELL, and read back through stdout, on purpose. resolve-platform.sh
# `unset`s and re-exports TRACKER/VCS/ACCESS_* and defines functions; sourcing it
# into the caller's shell would overwrite platform state the caller may have
# resolved for itself. A subshell keeps the blast radius to one variable.
#
# It SETS a global rather than printing, and is called as a plain command: a
# value assigned inside `$(...)` dies with the subshell, so a memo there never
# survives and an `exit` there kills only the subshell.
jsm_resolve_access() {
  [ -n "${JSM_ACCESS_MODE:-}" ] && return 0
  JSM_ACCESS_ERROR=""

  # The CONFIG tier, from the one reader. A non-zero exit is a refusal — the file
  # exists and could not be read correctly — and resolves to the most restrictive
  # mode rather than to "full", matching what the JS gates do with the same
  # answer. An absent config answers "full", which is the identity element of the
  # most-restrictive-wins reduction below and so changes nothing.
  local cfg_mode="" resolver cfg_err
  # ABSOLUTE, resolved BEFORE the subshell cd's. `dirname "${BASH_SOURCE[0]}"` is
  # relative whenever the lib is sourced by a relative path — which is the
  # documented call shape — so a later `cd` to the repo root left the resolver
  # path pointing nowhere, `source` failed, and EVERY answer became `manual`.
  # A repo declaring nothing then deferred every sprint write: a false
  # restriction, and worse than the anchoring bug it was fixing.
  #
  # Three hazards in one line, each of which re-opens that same false-restriction
  # class through a different door:
  #
  #   CDPATH= — `cd` consults CDPATH, and when an entry matches it PRINTS the
  #     resolved directory on stdout. Inside `$(...)` that lands in the value, so
  #     an operator with CDPATH exported (common in dotfiles) plus a bare relative
  #     dirname like `references` got a two-line garbage path, `[ -f ]` false, and
  #     `manual` on every write — under a message blaming the bundle.
  #   || true — a bare assignment whose only command is a failing substitution is
  #     FATAL under `set -euo pipefail`. Harmless today because the sole caller
  #     tests it in a condition context, but a future plain-command caller would
  #     get a silent exit 1 instead of the intended fail-closed `manual`.
  #   :-/nonexistent — an empty BASH_SOURCE[0] (sourced from stdin) makes
  #     `dirname ""` return `.`, so the resolver would be taken from the CALLER'S
  #     CWD — anchoring to cwd being the precise thing this line exists to forbid,
  #     and a cwd-controlled script being a far worse outcome than refusing.
  _jsm_self=${BASH_SOURCE[0]:-}
  if [ -z "$_jsm_self" ]; then
    resolver="/nonexistent/resolve-platform.sh"
  else
    # shellcheck disable=SC1007  # `CDPATH= cmd` is a one-command env prefix, not an empty assignment
    resolver="$(CDPATH= cd -P -- "$(dirname "$_jsm_self")" >/dev/null 2>&1 && pwd -P || true)/resolve-platform.sh"
  fi
  unset _jsm_self
  if [ -f "$resolver" ]; then
    # ANCHORED to the repo root, not the caller's cwd. read-config.sh defaults
    # SKILLS_CONFIG_FILE to the RELATIVE `skills-config.yaml`, and this skill
    # documents bare `manage-sprint-state.sh <id> closed` invocations that no
    # wrapper cd's for. Unanchored, the same repo resolved `manual` from its root
    # and `full` from `docs/` — the C5-CR6 defect, fixed on the JS side and left
    # here (T61-H4).
    #
    # AGENT_SKILLS_CONFIG_TIER is unset alongside the two access names: forcing a
    # tier the host cannot honour makes the reader answer nothing and the resolver
    # exit 0 with `full` over a committed restriction (T61-M4).
    cfg_err=$(mktemp) || cfg_err=""
    cfg_mode=$(
      unset ACCESS_TRACKER AGENT_SKILLS_ACCESS_TRACKER AGENT_SKILLS_CONFIG_TIER
      cd "$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "$PWD")" || exit 1
      # shellcheck disable=SC1090  # $resolver is computed at runtime from BASH_SOURCE; there is no
      # constant path a `source=` directive could name.
      source "$resolver" >/dev/null 2>"${cfg_err:-/dev/null}" && printf '%s' "$ACCESS_TRACKER"
    ) || cfg_mode="manual"
    [ -n "$cfg_mode" ] || cfg_mode="manual"
    # Surface the resolver's own refusal line, the way the JS path does. Without
    # this the operator gets `manual` and no reason at all.
    if [ "$cfg_mode" = "manual" ] && [ -n "$cfg_err" ] && [ -s "$cfg_err" ]; then
      # shellcheck disable=SC2034  # output contract: set here, read by this lib's callers
      # $'...' (ANSI-C quoting), NOT "\xe2…": grep does not interpret \xNN, so the
      # double-quoted form searched for the literal text `xe2x9dx8c` and matched
      # nothing. The capture was silently inert until a test caught it.
      JSM_ACCESS_ERROR=$(grep -m1 $'^\xe2\x9d\x8c' "$cfg_err" 2>/dev/null || true)
    fi
    # A refusal with no reason is not a legible refusal. mktemp can fail (a
    # read-only TMPDIR), and the subshell can die before the resolver prints
    # anything — a failing `cd`, a partially-bundled resolver. Both left `manual`
    # with an empty JSM_ACCESS_ERROR, which is the exact silence the emit above
    # was added to end.
    if [ "$cfg_mode" = "manual" ] && [ -z "${JSM_ACCESS_ERROR:-}" ]; then
      JSM_ACCESS_ERROR="skills-config.yaml could not be read by resolve-platform.sh (no diagnostic captured) - refusing rather than defaulting to full"
    fi
    [ -n "$cfg_err" ] && rm -f "$cfg_err"
  else
    # FAIL CLOSED, matching the JS tier for the identical condition. A partial
    # bundle leaves no way to read the config, and `full` is the wrong guess to
    # make when nothing can be verified (T61-M1).
    cfg_mode="manual"
    JSM_ACCESS_ERROR="resolve-platform.sh not found beside jira-sprint-lib.sh - refusing rather than defaulting to full"
  fi

  local best="full" v rank_v rank_best
  for v in "$cfg_mode" "${ACCESS_TRACKER:-}" "${AGENT_SKILLS_ACCESS_TRACKER:-}"; do
    [ -z "$v" ] && continue
    case "$v" in
      manual) rank_v=0 ;; command) rank_v=1 ;; approve) rank_v=2 ;;
      read-only) rank_v=3 ;; full) rank_v=4 ;;
      *)
        # Refused, never defaulted: a typo resolving to "full" would turn a
        # declared restriction into an unintended tracker write.
        JSM_ACCESS_ERROR="access.tracker=\"$v\" is not a recognised access mode (manual, command, approve, read-only, full). Refusing rather than defaulting to \"full\"."
        JSM_ACCESS_MODE=""
        return 1
        ;;
    esac
    case "$best" in
      manual) rank_best=0 ;; command) rank_best=1 ;; approve) rank_best=2 ;;
      read-only) rank_best=3 ;; *) rank_best=4 ;;
    esac
    [ "$rank_v" -lt "$rank_best" ] && best="$v"
  done
  JSM_ACCESS_MODE="$best"
  # Say WHY, once, when the config tier refused. Both writers above set
  # JSM_ACCESS_ERROR and then return 0 with mode=manual, so the only existing
  # printer — the `return 1` path in the caller — never fired and the operator
  # still got `manual` with no reason, which is precisely what setting the
  # variable was meant to fix.
  if [ -n "${JSM_ACCESS_ERROR:-}" ] && [ "$best" != "full" ]; then
    printf '%s\n' "$JSM_ACCESS_ERROR" >&2
  fi
  return 0
}

# Record one refused call. MUST leave JSM_HTTP_STATUS and JSM_BODY set: both
# callers run under `set -euo pipefail` and branch on them, so returning without
# them converts a deferral into a failed run.
jsm_defer() {
  # CYCLE-4 CR-10 — named `mode`, not JSM_ACCESS_MODE: a local of the same name
  # shadows the global under bash's dynamic scope, so the process-wide memo the
  # cycle-3 fix exists to create was never populated.
  local method=$1 url=$2 mode=${3:-}
  local writer kind intent target desired
  writer="$(dirname "${BASH_SOURCE[0]}")/defer-mutation.js"
  kind=${JSM_DEFER_KIND:-jira.unknown-mutation}
  intent=${JSM_DEFER_INTENT:-"Perform $method $url by hand — no semantic annotation, so what it would have changed is not known here"}
  target=${JSM_DEFER_TARGET:-"{\"url\":\"$url\"}"}
  desired=${JSM_DEFER_DESIRED:-"{\"method\":\"$method\"}"}

  local record_id=""
  if [ -f "$writer" ] && command -v node >/dev/null 2>&1; then
    record_id=$(node "$writer" \
      --kind "$kind" \
      --intent "$intent" \
      --access "${mode:-${JSM_ACCESS_MODE:?jsm_defer: no access mode resolved}}" \
      --target "$target" \
      --desired "$desired" \
      --skill "jira-sprint-manager" --json 2>/dev/null \
      | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1) \
      || echo "⚠️  Could not record the deferred $method $url" >&2
  else
    echo "⚠️  Could not record the deferred $method $url — defer-mutation.js not found" >&2
  fi

  # 200 is accepted by BOTH callers (manage-sprint-state.sh checks -ne 200;
  # move-sprint-issues.sh accepts 200 or 204). jq-safe body, because the
  # failure branches feed JSM_BODY straight into an error line.
  JSM_HTTP_STATUS=200
  JSM_BODY='{"deferred":true}'
  # CR-4 — a 200 keeps the caller alive; this tells it the truth. Without it
  # both scripts print "transitioned to: closed" / "Moved N issue(s)" for a
  # mutation that never happened, which is the false report this whole gate
  # exists to prevent. Callers MUST branch on it before any success line.
  JSM_DEFERRED=1
  JSM_DEFERRED_RECORD=$record_id
}

# jsm_curl METHOD URL [JSON_BODY]
# Sets globals: JSM_HTTP_STATUS, JSM_BODY.
# Does NOT use command substitution → assignments are visible to caller.
# Retries on 429 / 5xx (max 4 tries, expo backoff 1s→2s→4s).
jsm_curl() {
  local method=$1
  local url=$2
  local body=${3:-}
  local auth tmp attempt=0 max=4 wait=1

  # Always set, so a caller under `set -u` can branch on it unconditionally.
  # shellcheck disable=SC2034  # output contract: read by the sprint scripts that source this lib
  JSM_DEFERRED=0
  # shellcheck disable=SC2034  # output contract, as above
  JSM_DEFERRED_RECORD=""

  # Fail closed, and BEFORE the retry loop — recording inside it would write one
  # record per attempt for one logical mutation.
  #
  # A GET is never gated, so a resolver that cannot answer must not stop one:
  # reads are how a skill discovers what it would have changed.
  if [ "$method" != "GET" ]; then
    if ! jsm_resolve_access; then
      echo "${JSM_ACCESS_ERROR}" >&2
      exit 1
    fi
    if [ "$JSM_ACCESS_MODE" != "full" ]; then
      jsm_defer "$method" "$url" "$JSM_ACCESS_MODE"
      return 0
    fi
  fi

  auth=$(jsm_auth_header)
  tmp=$(mktemp)

  while :; do
    attempt=$((attempt + 1))
    if [ -n "$body" ]; then
      JSM_HTTP_STATUS=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
        -H "$auth" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$body" \
        "$url") || { rm -f "$tmp"; echo "curl transport error" >&2; exit 1; }
    else
      JSM_HTTP_STATUS=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
        -H "$auth" \
        -H "Accept: application/json" \
        "$url") || { rm -f "$tmp"; echo "curl transport error" >&2; exit 1; }
    fi

    if [ "$JSM_HTTP_STATUS" -eq 429 ] || { [ "$JSM_HTTP_STATUS" -ge 500 ] && [ "$JSM_HTTP_STATUS" -lt 600 ]; }; then
      if [ $attempt -lt $max ]; then
        sleep "$wait"
        wait=$((wait * 2))
        continue
      fi
    fi
    break
  done

  JSM_BODY=$(cat "$tmp")
  rm -f "$tmp"
}

# Validate ISO-8601 with timezone. Accepts:
#   2026-05-26T09:00:00Z
#   2026-05-26T09:00:00.000Z
#   2026-05-26T09:00:00+0200
#   2026-05-26T09:00:00.000+02:00
jsm_validate_iso8601() {
  local val=$1 label=$2
  if ! [[ "$val" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:?[0-9]{2})$ ]]; then
    echo "Error: $label must be ISO-8601 with timezone (e.g. 2026-05-26T09:00:00.000Z or 2026-05-26T09:00:00+02:00). Got: $val" >&2
    exit 1
  fi
}

# Both paginators accumulate into a TEMP FILE, not a shell variable.
#
# They used to hold the running array in `acc` and merge each page with
# `jq --argjson a "$acc"`, which passes the entire accumulated result through
# argv. Past roughly 256 KB on macOS that fails with "Argument list too long"
# — and it fails at the merge, so the caller sees a jq error rather than a
# size problem. A 30-issue sprint fetched with `expand=changelog` and a
# `description` field is already past the limit, and every caller that expands
# the changelog is one large sprint away from it. --slurpfile reads from disk
# and has no such ceiling.
#
# Paginate a GET endpoint that returns {values: [...], isLast?, total?, startAt, maxResults}.
# Usage: jsm_paginate_values URL_NO_QUERY QUERY_STRING
# Echoes a JSON array of merged values to stdout.
jsm_paginate_values() {
  local base=$1
  local query=${2:-}
  local start=0 is_last page_len grand_total url acc_f page_f new_f
  acc_f=$(mktemp); page_f=$(mktemp); new_f=$(mktemp)
  # shellcheck disable=SC2064  # expansion at trap-set time is intended: the path must be
  # captured now, not resolved when the trap fires and the variable may be gone
  trap "rm -f '$acc_f' '$page_f' '$new_f'" RETURN
  printf '[]' > "$acc_f"
  while :; do
    if [ -n "$query" ]; then
      url="${base}?${query}&startAt=${start}"
    else
      url="${base}?startAt=${start}"
    fi
    jsm_curl GET "$url"
    if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
      echo "Jira API Error ($JSM_HTTP_STATUS): $JSM_BODY" >&2
      exit 1
    fi
    printf '%s' "$JSM_BODY" > "$page_f"
    jq -nc --slurpfile a "$acc_f" --slurpfile p "$page_f" '$a[0] + ($p[0].values // [])' > "$new_f"
    mv "$new_f" "$acc_f"
    is_last=$(jq -r '.isLast // empty' "$page_f")
    page_len=$(jq -r '.values | length' "$page_f")
    grand_total=$(jq -r '.total // empty' "$page_f")
    if [ "$page_len" -eq 0 ] || [ "$is_last" = "true" ]; then
      break
    fi
    start=$(( start + page_len ))
    if [ -n "$grand_total" ] && [ "$start" -ge "$grand_total" ]; then
      break
    fi
  done
  cat "$acc_f"
}

# Paginate /sprint/{id}/issue → echoes JSON array of issues to stdout.
jsm_paginate_issues() {
  local base=$1
  local query=${2:-}
  local start=0 page_len grand_total url acc_f page_f new_f
  acc_f=$(mktemp); page_f=$(mktemp); new_f=$(mktemp)
  # shellcheck disable=SC2064  # expansion at trap-set time is intended: the path must be
  # captured now, not resolved when the trap fires and the variable may be gone
  trap "rm -f '$acc_f' '$page_f' '$new_f'" RETURN
  printf '[]' > "$acc_f"
  while :; do
    if [ -n "$query" ]; then
      url="${base}?${query}&startAt=${start}"
    else
      url="${base}?startAt=${start}"
    fi
    jsm_curl GET "$url"
    if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
      echo "Jira API Error ($JSM_HTTP_STATUS): $JSM_BODY" >&2
      exit 1
    fi
    printf '%s' "$JSM_BODY" > "$page_f"
    jq -nc --slurpfile a "$acc_f" --slurpfile p "$page_f" '$a[0] + ($p[0].issues // [])' > "$new_f"
    mv "$new_f" "$acc_f"
    page_len=$(jq -r '.issues | length' "$page_f")
    grand_total=$(jq -r '.total // empty' "$page_f")
    if [ "$page_len" -eq 0 ]; then
      break
    fi
    start=$(( start + page_len ))
    if [ -n "$grand_total" ] && [ "$start" -ge "$grand_total" ]; then
      break
    fi
  done
  cat "$acc_f"
}
