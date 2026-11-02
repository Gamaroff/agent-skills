#!/usr/bin/env bash
# classify-changes.sh — a CI `changes` job classifier that skips the heavy jobs on docs-only pushes.
#
# OPTIONAL CONSUMER TEMPLATE (agent-skills task.174). Lifted from tinker-city task.127's
# `scripts/ci/classify-changes.sh` as merged (tinker-city PR #984, `88f98a27`), with three changes:
# the docs set is `DOCS_PATTERNS`, the evidence workflow is `CI_WORKFLOW_PATH`, and tinker-city's
# second output (`engine`, its task.128 per-lane gate) is gone. Guide: docs/runbooks/ci-docs-only-skip.md.
#
# Decides whether the expensive jobs run: `code=true` runs them, `code=false` skips them.
#
# Inputs (env):
#   EVENT_NAME, EVENT_ACTION, BASE_REF, BEFORE_SHA, AFTER_SHA   — from the triggering event
#   GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_API_URL             — the CI evidence lookup
#   CI_WORKFLOW_PATH — REQUIRED. The workflow file whose successful `pull_request` runs count as
#                      evidence, e.g. `.github/workflows/ci.yml`. Unset or empty runs the full suite.
#   DOCS_PATTERNS    — optional. Space-separated shell `case` patterns; a file matching one is docs.
#                      Unset means `*.md docs/*`. Set but empty means nothing is docs.
#   CI_OK_LOOKUP_FILE — TESTS ONLY: a JSON workflow-runs response read in place of the API.
#                       A workflow must never set it.
# Output: `code=true|false` appended to $GITHUB_OUTPUT, or to stdout when it is unset.
#
# Covered by classify-changes.test.js beside this file (temp git repos, no network).

set -uo pipefail

# ── FAIL-SAFE DIRECTION ────────────────────────────────────────────────────────────
# Every early exit below emits code=true. Silently NOT running the suites because a
# fetch blipped is the invisible failure this job exists to prevent — the mirror image
# of a fail-open aggregator, and worse, because a red build tells you something while a
# skipped one tells you nothing. When in doubt, run everything.
# ───────────────────────────────────────────────────────────────────────────────────

EVENT_NAME="${EVENT_NAME:-}"
BASE_REF="${BASE_REF:-}"
BEFORE_SHA="${BEFORE_SHA:-}"
AFTER_SHA="${AFTER_SHA:-}"

# Never `>> /dev/stdout`: when Node spawns this script (the spec) its stdout is a socket, and
# Linux cannot reopen /proc/self/fd/1 on a socket (ENXIO). macOS can, so a /dev/stdout fallback
# passed every local run and failed every case in a Linux CI job (tinker-city task.127 finalise).
emit() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf 'code=%s\n' "$1" >> "$GITHUB_OUTPUT"
  else
    printf 'code=%s\n' "$1"
  fi
  echo "==> code=$1"
  exit 0
}

# ── DOCS PATTERNS ──────────────────────────────────────────────────────────────────
# A file is docs if it matches one of DOCS_PATTERNS; ANY file that does not match makes the
# change a code change. Note `*` matches `/` in a shell case pattern, so `*.md` covers
# `**/*.md` at any depth (including the repo root) and `docs/*` covers `docs/**`.
#
# Each entry is used as a PATTERN, never expanded as a glob: `set -f` is on while the list is
# split, or `*.md` would expand to the runner's own root `*.md` files and stop matching
# `docs/a/b.md`. A C-quoted name (git quotes a non-ASCII or tab-bearing path) ends in `"`, so it
# matches no `*.md`-style pattern and reads as code — the safe direction.
#
# Every `git diff --name-only` below passes `--no-renames`. Rename detection is on by default
# and prints only a rename's DESTINATION, so `git mv src/a.ts docs/a.ts` would list just
# `docs/a.ts` and a change that removes code would read as docs-only (tinker-city task.127 BUG-1).
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

# True when every non-empty line of $1 is a docs path; names the first code file otherwise.
all_docs() {
  local f
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    is_docs "$f" || { echo "first code file: $f"; return 1; }
  done <<< "$1"
  return 0
}

# ── DOCS-ONLY INCREMENT ────────────────────────────────────────────────────────────
# The PR diff below is measured from the merge base, so once a PR touches code every
# later push reads as code — including the markdown-only commits each pipeline item ends
# with. This rule looks at what the PUSH added instead: when a `synchronize` push's own
# commits are all docs and the previous head has a successful PULL-REQUEST run of this
# workflow, that code tree already passed, and the heavy jobs are skipped.
#
# The evidence is a workflow run, not the aggregate check run (`ci-ok` or similar), because a
# check run belongs to a commit, not to an event: a `push` run on the base branch skips a
# docs-only push WITHOUT asking for a green `before`, so its green check proves nothing about the
# code (tinker-city task.127 BUG-2 — a release PR's head is a develop commit). A pull_request run
# concludes `success` only when every job succeeded or was skipped, which is exactly when its
# aggregate check passed. Restricted to pull_request runs, a skip granted here chains: it needs a
# green PR run, so a head that passed by skipping inherits a code tree that passed a full PR run.
#
# What that run tested is the head merged into ITS base — and the lookup is keyed by SHA only.
# The run may be from another PR on the same branch, or from this PR before a retarget
# (`edited` does not trigger CI), or against an older tip of the same base. The API cannot say
# which: a run's `pull_requests[]` lists the PRs open NOW with that head, not the one that
# triggered it. So a skip can stand on code never tested against the current base. That is the
# documented merge-result trade-off; the push to the base after the merge runs in full.
#
# "Any success", not "the newest": a cancelled run does not hide another run's success. The API
# reports each run's LATEST attempt, so a failed re-run replaces that run's earlier success and
# withholds the skip — the safe direction. A run still in progress has `conclusion: null`, so
# `conclusion == "success"` already means completed.
#
# Every failure falls through to the caller's `emit true`. "Could not look" (no `jq`, the
# request failed, the response is not a runs list) prints a ::warning:: so a skip that never
# fires can be diagnosed; "looked and found no success" prints a plain line.
CI_EVIDENCE_JQ='[.workflow_runs[] | select(.event == "pull_request" and ((.path // "") | split("@")[0]) == $wf and .conclusion == "success")] | length > 0'
docs_only_increment_over_green() {
  # `synchronize` is a pull_request action, so this also excludes push and dispatch. (A push
  # reaching here would be a no-op anyway: its increment IS the diff that just failed all_docs.)
  [ "${EVENT_ACTION:-}" = "synchronize" ] || return 1

  local incr runs
  # ONE guard for every "no usable increment" case, deliberately: an empty or unreachable
  # `before` (force-push, rewritten history) makes `git diff` fail with nothing on stdout, and
  # identical trees make it succeed with nothing on stdout. Separate checks for each would mask
  # one another — no test could tell which one fired.
  incr=$(git diff --name-only --no-renames "${BEFORE_SHA}" "${AFTER_SHA}" 2>/dev/null)
  [ -n "$incr" ] || return 1
  echo "this push changed:"
  echo "${incr}" | sed 's/^/  /'
  all_docs "$incr" || return 1

  if ! command -v jq >/dev/null 2>&1; then
    echo "::warning::jq not found — cannot read the CI evidence for ${BEFORE_SHA}; running the full suite"
    return 1
  fi

  local rc=0
  if [ -n "${CI_OK_LOOKUP_FILE:-}" ]; then
    runs=$(cat "$CI_OK_LOOKUP_FILE" 2>/dev/null) || rc=$?
  else
    # The token goes in on stdin (`-H @-`), never on argv, where any local user could read it
    # from the process list of a shared self-hosted runner. The timeouts bound a stalled call,
    # which on a single serial runner holds every job behind it.
    runs=$(curl -fsS --connect-timeout 5 --max-time 20 -H @- \
      "${GITHUB_API_URL:-https://api.github.com}/repos/${GITHUB_REPOSITORY:-}/actions/runs?head_sha=${BEFORE_SHA}&event=pull_request&exclude_pull_requests=true&per_page=100" \
      2>/dev/null <<< "Authorization: Bearer ${GITHUB_TOKEN:-}
Accept: application/vnd.github+json") || rc=$?
  fi
  if [ "$rc" -ne 0 ]; then
    echo "::warning::could not read the CI runs for ${BEFORE_SHA} (exit ${rc}) — running the full suite"
    return 1
  fi
  if ! printf '%s' "$runs" | jq -e '.workflow_runs | type == "array"' >/dev/null 2>&1; then
    echo "::warning::the CI runs response for ${BEFORE_SHA} is not a workflow-runs list — running the full suite"
    return 1
  fi

  if printf '%s' "$runs" | jq -e --arg wf "$CI_WORKFLOW_PATH" "$CI_EVIDENCE_JQ" >/dev/null 2>&1; then
    echo "::notice::docs-only increment on top of ${BEFORE_SHA} (a successful pull_request CI run) — heavy jobs skipped"
    return 0
  fi
  echo "docs-only increment, but ${BEFORE_SHA} has no successful pull_request CI run — running the full suite"
  return 1
}

# Sourced rather than executed — a spec that calls is_docs / all_docs directly — stop here, with
# the functions defined and nothing run. Executed with bash, `return` outside a function fails
# (silenced) and the script carries on below.
return 0 2>/dev/null || true

# A misconfigured template must be loud, never a silent skip: with no evidence workflow named,
# nothing here can be trusted to classify, so everything runs.
if [ -z "${CI_WORKFLOW_PATH:-}" ]; then
  echo "::warning::CI_WORKFLOW_PATH is not set — the classifier cannot be trusted to skip; running the full suite"
  emit true
fi

# A manual workflow_dispatch means somebody explicitly asked for a run.
if [ "$EVENT_NAME" = "workflow_dispatch" ]; then
  echo "event '$EVENT_NAME' — running the full suite"
  emit true
fi

if [ "$EVENT_NAME" = "push" ]; then
  # A push has no merge base, so the honest comparison is the incremental
  # `before`..`after` range. That is a different semantic from the PR's three-dot
  # diff, and deliberately so — it is the only diff a push HAS.
  if [ -z "${BEFORE_SHA}" ] || [ "${BEFORE_SHA}" = "0000000000000000000000000000000000000000" ]; then
    echo "push has no usable 'before' SHA (new branch?) — running the full suite"
    emit true
  fi
  if ! git cat-file -e "${BEFORE_SHA}^{commit}" 2>/dev/null; then
    echo "::warning::'before' SHA ${BEFORE_SHA} is unreachable (force-push / rewritten history) — running the full suite"
    emit true
  fi
  if ! CHANGED=$(git diff --name-only --no-renames "${BEFORE_SHA}" "${AFTER_SHA}"); then
    echo "::warning::could not diff ${BEFORE_SHA}..${AFTER_SHA} — running the full suite"
    emit true
  fi
else
  if ! git fetch --no-tags origin "+refs/heads/${BASE_REF}:refs/remotes/origin/${BASE_REF}"; then
    echo "::warning::could not fetch base ref '${BASE_REF}' — running the full suite"
    emit true
  fi

  # Three-dot: measured from the MERGE BASE, matching what GitHub's own path filters and
  # the PR "Files changed" tab compare. Two-dot would additionally report files changed
  # on the base branch since the fork point.
  if ! CHANGED=$(git diff --name-only --no-renames "origin/${BASE_REF}...HEAD"); then
    echo "::warning::could not diff against 'origin/${BASE_REF}' — running the full suite"
    emit true
  fi
fi

if [ -z "${CHANGED}" ]; then
  echo "::warning::diff returned no files — cannot distinguish 'nothing changed' from a bad diff; running the full suite"
  emit true
fi

echo "changed files:"
echo "${CHANGED}" | sed 's/^/  /'

all_docs "$CHANGED" && emit false

docs_only_increment_over_green && emit false

emit true
