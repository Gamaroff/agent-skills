#!/bin/bash
# Shared helpers for jira-sprint-manager scripts.
# Source from each script AFTER setting `set -euo pipefail`:
#   source "$(dirname "$0")/_lib.sh"
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

# jsm_curl METHOD URL [JSON_BODY]
# Sets globals: JSM_HTTP_STATUS, JSM_BODY.
# Does NOT use command substitution → assignments are visible to caller.
# Retries on 429 / 5xx (max 4 tries, expo backoff 1s→2s→4s).
jsm_curl() {
  local method=$1
  local url=$2
  local body=${3:-}
  local auth tmp attempt=0 max=4 wait=1
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

# Paginate a GET endpoint that returns {values: [...], isLast?, total?, startAt, maxResults}.
# Usage: jsm_paginate_values URL_NO_QUERY QUERY_STRING
# Echoes a JSON array of merged values to stdout.
jsm_paginate_values() {
  local base=$1
  local query=${2:-}
  local start=0 acc='[]' is_last page_len grand_total url
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
    acc=$(jq -nc --argjson a "$acc" --argjson p "$JSM_BODY" '$a + ($p.values // [])')
    is_last=$(jq -r '.isLast // empty' <<<"$JSM_BODY")
    page_len=$(jq -r '.values | length' <<<"$JSM_BODY")
    grand_total=$(jq -r '.total // empty' <<<"$JSM_BODY")
    if [ "$page_len" -eq 0 ] || [ "$is_last" = "true" ]; then
      break
    fi
    start=$(( start + page_len ))
    if [ -n "$grand_total" ] && [ "$start" -ge "$grand_total" ]; then
      break
    fi
  done
  printf '%s' "$acc"
}

# Paginate /sprint/{id}/issue → echoes JSON array of issues to stdout.
jsm_paginate_issues() {
  local base=$1
  local query=${2:-}
  local start=0 acc='[]' page_len grand_total url
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
    acc=$(jq -nc --argjson a "$acc" --argjson p "$JSM_BODY" '$a + ($p.issues // [])')
    page_len=$(jq -r '.issues | length' <<<"$JSM_BODY")
    grand_total=$(jq -r '.total // 0' <<<"$JSM_BODY")
    if [ "$page_len" -eq 0 ]; then
      break
    fi
    start=$(( start + page_len ))
    if [ "$start" -ge "$grand_total" ]; then
      break
    fi
  done
  printf '%s' "$acc"
}
