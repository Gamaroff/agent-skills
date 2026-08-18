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
# CYCLE-3 CR-6 — this SETS a global rather than printing, and is called as a
# plain command rather than `$(...)`. The previous version memoised into a
# variable inside a command substitution, so the cache died with the subshell
# and every jsm_curl — including the paginated GET loops — spawned node and
# re-parsed the roster.
#
# CYCLE-3 CR-5 — stdout only. Folding stderr in meant any node-level warning
# (a TLS notice, an NODE_OPTIONS loader line) produced rc 0 with a multi-line
# value that was neither `full` nor the invalid sentinel, so a full-access run
# quietly diverted every mutation into the defer branch.
#
# CYCLE-4 CR-11 — the rule, stated as implemented: ANY non-zero exit from the
# resolver is a refusal. Fail-closed on a crash is deliberate — a gate that
# cannot answer must not answer "full" — and reads are protected instead by
# jsm_curl, which never consults this for a GET.
jsm_resolve_access() {
  [ -n "${JSM_ACCESS_MODE:-}" ] && return 0
  JSM_ACCESS_ERROR=""

  local writer out rc errfile
  writer="$(dirname "${BASH_SOURCE[0]}")/defer-mutation.js"
  if [ -f "$writer" ] && command -v node >/dev/null 2>&1; then
    errfile=$(mktemp)
    # CYCLE-4 CR-7 — `out=$(...)` as a bare assignment ABORTS the caller under
    # `set -e` before `rc=$?` runs, losing the refusal message and leaking the
    # temp file. The `if` makes the non-zero exit an inspected condition.
    if out=$(node "$writer" --resolve-access 2>"$errfile"); then
      rc=0
    else
      rc=$?
    fi
    if [ "$rc" -eq 0 ]; then
      case "$out" in
        manual|command|approve|read-only|full)
          JSM_ACCESS_MODE="$out"
          rm -f "$errfile"
          return 0
          ;;
      esac
      # CYCLE-4 CR-1 — rc 0 but not a mode. Falling back to the env tier here
      # answered "full" whenever no env var was set, DISCARDING a config-declared
      # restriction the resolver had just been asked about. A value we cannot
      # name is a refusal.
      JSM_ACCESS_ERROR="Could not read the access mode from the resolver (got: $(printf '%s' "$out" | head -c 120)). Refusing rather than defaulting to \"full\"."
      JSM_ACCESS_MODE=""
      rm -f "$errfile"
      return 1
    else
      JSM_ACCESS_ERROR=$(cat "$errfile")
      # CYCLE-4 CR-8 — a node that dies without writing to stderr (a bare
      # process.exit, a signal) left this empty, so the caller printed a blank
      # line and exited 1 with no reason given.
      if [ -z "$JSM_ACCESS_ERROR" ]; then
        JSM_ACCESS_ERROR="The access resolver ($writer) exited $rc without a message. Refusing rather than defaulting to \"full\"."
      fi
      rm -f "$errfile"
      JSM_ACCESS_MODE=""
      return 1
    fi
    rm -f "$errfile"
  fi

  # Env tier only. Degraded — it cannot see `access.tracker` in
  # skills-config.yaml — so it is a fallback, never the normal path.
  #
  # And that is exactly why a config file being PRESENT is a refusal here: with
  # no writer we cannot read the declaration, and answering "full" over a file
  # that may restrict is the one outcome this gate exists to prevent. (It is
  # also moot for the mutation itself — with no writer there is nothing to
  # record the deferral with either.)
  if [ -f "${SKILLS_CONFIG_FILE:-skills-config.yaml}" ] \
     && [ -z "${ACCESS_TRACKER:-}" ] && [ -z "${AGENT_SKILLS_ACCESS_TRACKER:-}" ]; then
    JSM_ACCESS_ERROR="Cannot read access.tracker from ${SKILLS_CONFIG_FILE:-skills-config.yaml}: the deferred-mutation writer is unavailable (node missing, or $writer not bundled). Refusing rather than defaulting to \"full\"."
    JSM_ACCESS_MODE=""
    return 1
  fi

  local best="full" v rank_v rank_best
  for v in "${ACCESS_TRACKER:-}" "${AGENT_SKILLS_ACCESS_TRACKER:-}"; do
    [ -z "$v" ] && continue
    case "$v" in
      manual) rank_v=0 ;; command) rank_v=1 ;; approve) rank_v=2 ;;
      read-only) rank_v=3 ;; full) rank_v=4 ;;
      *)
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
  return 0
}

# Back-compat shim for anything that reads the mode as a value.
jsm_access_mode() {
  jsm_resolve_access || { printf '%s' "__INVALID__"; return 0; }
  printf '%s' "$JSM_ACCESS_MODE"
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
      --access "${mode:-${JSM_ACCESS_MODE:-full}}" \
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
  JSM_DEFERRED=0
  JSM_DEFERRED_RECORD=""

  # Fail closed, and BEFORE the retry loop — recording inside it would write one
  # record per attempt for one logical mutation.
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
  # shellcheck disable=SC2064
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
  # shellcheck disable=SC2064
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
