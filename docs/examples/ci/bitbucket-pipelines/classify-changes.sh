#!/usr/bin/env bash
# classify-changes.sh — Bitbucket Pipelines variant of the docs-only CI classifier.
#
# OPTIONAL CONSUMER TEMPLATE (agent-skills task.174, Phase 3). Same contract as
# ../github-actions/classify-changes.sh: `code=true` runs the heavy steps, `code=false` skips them,
# and every uncertain path is `code=true`. Guide: docs/runbooks/ci-docs-only-skip.md.
#
# Two differences from the GitHub Actions template, both forced by Bitbucket:
#   - Bitbucket Pipelines exposes no push `before` SHA. The previous head is taken to be the
#     pushed commit's FIRST PARENT. A multi-commit push whose first parent never ran a pipeline
#     finds no evidence and runs in full — the safe direction.
#   - Only PULL-REQUEST pipelines classify. A branch pipeline has no merge base to measure from and
#     no before SHA, so it always runs the full suite.
#
# Inputs (env; the BITBUCKET_* ones are set by Pipelines):
#   BITBUCKET_PR_ID, BITBUCKET_PR_DESTINATION_BRANCH, BITBUCKET_COMMIT
#   BITBUCKET_WORKSPACE, BITBUCKET_REPO_SLUG
#   BITBUCKET_ACCESS_TOKEN (Bearer), or BITBUCKET_USERNAME + BITBUCKET_API_TOKEN (Basic;
#     BITBUCKET_APP_PASSWORD honoured as a fallback) — the same order as agent-skills'
#     shared/resources/bitbucket-auth.sh. The token needs `read:pipeline:bitbucket`.
#   DOCS_PATTERNS     — optional; as in the GitHub template. Unset means `*.md docs/*`.
#   BITBUCKET_API_URL — optional; default https://api.bitbucket.org/2.0 (tests point it elsewhere).
#   CLASSIFY_OUTPUT   — optional; a file the decision line is also written to (a step artifact).
# Output: `code=true|false` on stdout, and in $CLASSIFY_OUTPUT when it is set.
#
# Covered by classify-changes.test.js beside this file (temp git repos, a fake curl, no network).

set -uo pipefail

emit() {
  if [ -n "${CLASSIFY_OUTPUT:-}" ]; then
    printf 'code=%s\n' "$1" > "$CLASSIFY_OUTPUT"
  fi
  printf 'code=%s\n' "$1"
  echo "==> code=$1"
  exit 0
}

# ── DOCS PATTERNS — identical to the GitHub Actions template's is_docs ─────────────
DEFAULT_DOCS_PATTERNS='*.md docs/*'
is_docs() {
  local p hit=1 noglob_was_on=0
  case $- in *f*) noglob_was_on=1 ;; esac
  set -f
  for p in ${DOCS_PATTERNS-$DEFAULT_DOCS_PATTERNS}; do
    # shellcheck disable=SC2254 # $p is unquoted on purpose: it is a pattern, not a literal.
    case "$1" in $p) hit=0; break ;; esac
  done
  [ "$noglob_was_on" -eq 1 ] || set +f
  return "$hit"
}

all_docs() {
  local f
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    is_docs "$f" || { echo "first code file: $f"; return 1; }
  done <<< "$1"
  return 0
}

# ── DOCS-ONLY INCREMENT ────────────────────────────────────────────────────────────
# When the pushed commit's own change over its first parent is all docs, and that parent has a
# COMPLETED, SUCCESSFUL pull-request pipeline, the parent's code tree already passed: skip.
#
# A 403 from /pipelines/ means the token lacks `read:pipeline:bitbucket`. It does NOT mean "no
# CI" — the repository and pull-request endpoints keep answering 200 on the same credential (see
# /finalise's "A 403 here is the trap" note in agent-skills). So the status code decides, never
# the body: anything but 200 runs the full suite, with a warning naming the status.
#
# The evidence check matches each pipeline's OWN `target.commit.hash` against the parent, not
# only the query filter: if the API ignored `target.commit.hash=` it would return other commits'
# pipelines, and a filter-only check would grant a wrong skip.
BB_EVIDENCE_JQ='[.values[] | select(.target.type == "pipeline_pullrequest_target" and .target.commit.hash == $before and .state.name == "COMPLETED" and .state.result.name == "SUCCESSFUL")] | length > 0'
docs_only_increment_over_green() {
  local before incr out status body auth
  if ! before=$(git rev-parse --verify -q "${AFTER}^" 2>/dev/null); then
    echo "no first parent of ${AFTER} in this clone (shallow?) — running the full suite"
    return 1
  fi
  incr=$(git diff --name-only --no-renames "${before}" "${AFTER}" 2>/dev/null)
  [ -n "$incr" ] || return 1
  echo "this push changed (over first parent ${before}):"
  echo "${incr}" | sed 's/^/  /'
  all_docs "$incr" || return 1

  if ! command -v jq >/dev/null 2>&1; then
    echo "jq not found — cannot read the CI evidence for ${before}; running the full suite"
    return 1
  fi

  if [ -n "${BITBUCKET_ACCESS_TOKEN:-}" ]; then
    auth="Authorization: Bearer ${BITBUCKET_ACCESS_TOKEN}"
  elif [ -n "${BITBUCKET_USERNAME:-}" ] && [ -n "${BITBUCKET_API_TOKEN:-${BITBUCKET_APP_PASSWORD:-}}" ]; then
    auth="Authorization: Basic $(printf '%s:%s' "$BITBUCKET_USERNAME" "${BITBUCKET_API_TOKEN:-${BITBUCKET_APP_PASSWORD:-}}" | base64 | tr -d '\n')"
  else
    echo "no Bitbucket credential (BITBUCKET_ACCESS_TOKEN, or BITBUCKET_USERNAME + BITBUCKET_API_TOKEN) — running the full suite"
    return 1
  fi

  # The credential goes in on stdin (`-H @-`), never on argv, where any local user could read it
  # from the process list. `-w` appends the status on its own line, so the status decides.
  local rc=0
  out=$(curl -sS --connect-timeout 5 --max-time 20 -H @- -w '\n%{http_code}' \
    "${BITBUCKET_API_URL:-https://api.bitbucket.org/2.0}/repositories/${BITBUCKET_WORKSPACE:-}/${BITBUCKET_REPO_SLUG:-}/pipelines/?target.commit.hash=${before}&sort=-created_on&pagelen=50" \
    2>/dev/null <<< "$auth") || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "could not read the pipelines for ${before} (curl exit ${rc}) — running the full suite"
    return 1
  fi
  status=${out##*$'\n'}
  body=${out%$'\n'*}
  case "$status" in
    200) ;;
    403)
      echo "pipelines API answered 403 for ${before}: the token lacks read:pipeline:bitbucket (this is NOT 'no CI') — running the full suite"
      return 1 ;;
    *)
      echo "pipelines API answered ${status} for ${before} — running the full suite"
      return 1 ;;
  esac
  if ! printf '%s' "$body" | jq -e '.values | type == "array"' >/dev/null 2>&1; then
    echo "the pipelines response for ${before} is not a pipelines list — running the full suite"
    return 1
  fi
  if printf '%s' "$body" | jq -e --arg before "$before" "$BB_EVIDENCE_JQ" >/dev/null 2>&1; then
    echo "docs-only increment on top of ${before} (a successful pull-request pipeline) — heavy steps skipped"
    return 0
  fi
  echo "docs-only increment, but ${before} has no successful pull-request pipeline — running the full suite"
  return 1
}

# Sourced (a spec calling is_docs directly): stop here with the functions defined.
return 0 2>/dev/null || true

if [ -z "${BITBUCKET_PR_ID:-}" ]; then
  echo "not a pull-request pipeline — running the full suite"
  emit true
fi

AFTER="${BITBUCKET_COMMIT:-HEAD}"
DEST="${BITBUCKET_PR_DESTINATION_BRANCH:-}"

if [ -z "$DEST" ] || ! git fetch --no-tags origin "+refs/heads/${DEST}:refs/remotes/origin/${DEST}"; then
  echo "could not fetch destination branch '${DEST}' — running the full suite"
  emit true
fi

# Three-dot: measured from the merge base, as the pull request's own diff is.
if ! CHANGED=$(git diff --name-only --no-renames "origin/${DEST}...${AFTER}"); then
  echo "could not diff against 'origin/${DEST}' (a shallow clone has no merge base) — running the full suite"
  emit true
fi

if [ -z "${CHANGED}" ]; then
  echo "diff returned no files — cannot distinguish 'nothing changed' from a bad diff; running the full suite"
  emit true
fi

echo "changed files:"
echo "${CHANGED}" | sed 's/^/  /'

all_docs "$CHANGED" && emit false

docs_only_increment_over_green && emit false

emit true
