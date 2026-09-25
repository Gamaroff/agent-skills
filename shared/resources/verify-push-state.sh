#!/usr/bin/env bash
# verify-push-state.sh — assert that reported work actually exists on the remote.
#
# WHY THIS EXISTS
#
# On 2026-08-13 a develop-story pipeline reported "PR-ready branch pushed" and,
# separately, that a trunk fix had been "isolated in its own commit so the
# orchestrator can drop it at rebase". Neither was true: the branch ref existed on
# the remote but pointed at the base tip — 0 commits — and every file was still an
# uncommitted working-tree modification. The orchestrator relayed that claim to two
# sibling pipelines and planned a merge around it.
#
# The develop-batch merge gate's head-SHA check would have refused the merge, so
# nothing broken could ship. But that check runs at MERGE time, and the false claim
# was acted on well before it — which is the actual cost, and why this check belongs
# at REPORT time instead.
#
# Prose cannot fix this. The pipeline prompt already said to report the PR; adding
# "and be accurate" changes nothing, because the failure mode is not disobedience,
# it is reporting an intention as an accomplishment without looking. So this is a
# mechanical assertion the pipeline runs and pastes, not an instruction it follows.
#
# NOTE ON EXIT CODES: this script never pipes a status-bearing command into another
# command. The same 2026-08-13 session produced three separate false passes from
# exactly that (`npm test | tail -80` reporting tail's exit 0 over a failed suite;
# twice more from a wrapper script whose status came from a trailing grep/echo).
# Every check here captures the command's own status directly.
#
# Usage:
#   verify-push-state.sh --base <branch> [--pr <number>] [--remote <name>] [--scope <path>]...
#
#   --scope (repeatable) narrows check 3 to the named paths: a dirty path inside a scope fails,
#   a dirty path outside every scope is printed as a named warning and does not. Without
#   --scope, any dirty path fails. For a checkout another session is also editing (obs #142).
#
# Exit codes:
#   0  every check passed — the reported state is real
#   1  a check failed — the report would have been false
#   2  usage error / not a git repository

set -uo pipefail

BASE=""
PR=""
REMOTE="origin"
SCOPES=()

while [ $# -gt 0 ]; do
  case "$1" in
    --base)   BASE="${2:-}"; shift 2 ;;
    --pr)     PR="${2:-}"; shift 2 ;;
    --remote) REMOTE="${2:-}"; shift 2 ;;
    --scope)
      [ -n "${2:-}" ] || { echo "verify-push-state: --scope needs a path" >&2; exit 2; }
      SCOPES+=("$2"); shift 2 ;;
    -h|--help)
      # By markers, not line numbers: the bundler prepends a header to every copy under
      # skills/*/references/, and a fixed range there dropped the last line (task.147 QA-5, CR-6).
      sed -n '/^# Usage:/,/^#   2 /p' "$0"; exit 0 ;;
    *) echo "verify-push-state: unknown argument '$1'" >&2; exit 2 ;;
  esac
done

[ -n "$BASE" ] || { echo "verify-push-state: --base <branch> is required" >&2; exit 2; }

git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || { echo "verify-push-state: not a git repository" >&2; exit 2; }

# ONE predicate decides "is path P inside scope S", for both the scope gate below and check 3. They
# used to disagree: the gate used filesystem and pathspec semantics, check 3 compared strings. Every
# spelling they disagreed on (a glob, a case-folded path, :/ magic, a symlinked component) was a
# scope that existed but matched nothing, so check 3 passed vacuously (task.147 QA-5, CR-3).
path_under() {
  [ "$1" = "$2" ] && return 0
  case "$1" in "$2"/*) return 0 ;; esac
  return 1
}

# Normalise each --scope to the repo-root-relative form porcelain prints, then refuse one that names
# nothing. A `./`-prefixed, absolute or mistyped scope used to match no path, which classed every
# dirty path as outside and passed check 3 with nothing checked (task.147 QA-1, CR-8).
if [ ${#SCOPES[@]} -gt 0 ]; then
  TOP=$(git rev-parse --show-toplevel)
  PREFIX=$(git rev-parse --show-prefix)
  NORMALISED=()
  for s in "${SCOPES[@]}"; do
    raw="$s"
    # An absolute scope is compared against the PHYSICAL toplevel, so canonicalise it the same way
    # first: a logical path through a symlink (macOS /tmp → /private/tmp) is inside the repo
    # (task.147 QA-2, CR-9).
    case "$s" in
      /*)
        if [ -d "$s" ]; then s=$(cd "$s" 2>/dev/null && pwd -P) || s="$raw"
        elif [ -d "$(dirname "$s")" ]; then s="$(cd "$(dirname "$s")" 2>/dev/null && pwd -P)/$(basename "$s")"
        fi ;;
    esac
    case "$s" in
      "$TOP")   s="" ;;
      "$TOP"/*) s="${s#"$TOP"/}" ;;
      /*)       echo "verify-push-state: --scope '$raw' is outside this repository, or does not resolve to a path inside it" >&2; exit 2 ;;
      *)        s="${PREFIX}${s#./}" ;;
    esac
    # A '..' segment would pass the existence check and then match no porcelain path, which is a
    # vacuous pass. Refuse it rather than guess what it meant.
    case "/$s/" in */../*) echo "verify-push-state: --scope '$raw' contains '..' — pass a path inside the repository" >&2; exit 2 ;; esac
    # Collapse what porcelain never prints: repeated slashes and '.' segments. Without this,
    # `docs/./tasks` or `docs//tasks` passed the existence check and matched nothing, which is a
    # vacuous pass, the sibling of the '..' case (task.147 QA-3, CR-4).
    while [ "${s#*//}" != "$s" ]; do s="${s%%//*}/${s#*//}"; done
    while [ "${s#*/./}" != "$s" ]; do s="${s%%/./*}/${s#*/./}"; done
    while [ "${s#./}" != "$s" ]; do s="${s#./}"; done
    [ "$s" = "." ] && s=""
    s="${s%/.}"
    # Relative by now (the toplevel was stripped above). A leading '/' can only be left over from a
    # `.//x` spelling whose `./` was stripped before the collapse; kept, it matched no porcelain path
    # and check 3 passed vacuously (task.147 QA-4, CR-1).
    while [ "${s#/}" != "$s" ]; do s="${s#/}"; done
    while [ "${s%/}" != "$s" ]; do s="${s%/}"; done
    [ -n "$s" ] || { echo "verify-push-state: --scope '$raw' names the whole repository — omit --scope instead" >&2; exit 2; }
    NORMALISED+=("$s")
  done
  SCOPES=("${NORMALISED[@]}")

  # The gate is check 3's own predicate over git's own path list: case-exact, no globbing, no
  # symlink following. The list is the index and the untracked-not-ignored files (so an uncommitted
  # deletion counts) plus HEAD's tree (so a scope whose files were all renamed away still counts).
  # A scope that no such path falls under can only ever match nothing: refuse it (exit 2).
  PATHS_FILE=$(mktemp) || { echo "verify-push-state: mktemp failed — cannot validate --scope" >&2; exit 2; }
  if git -C "$TOP" ls-files -z --cached --others --exclude-standard > "$PATHS_FILE" 2>/dev/null; then
    git -C "$TOP" ls-tree -r -z --name-only HEAD >> "$PATHS_FILE" 2>/dev/null
    LISTED=true
  else
    # An unreadable index is check 3's to report: it reads the same index and fails on it. Skipping
    # validation here cannot produce a vacuous pass, and exiting 2 would misreport it as a usage error.
    LISTED=false
  fi
  for s in "${SCOPES[@]}"; do
    [ "$LISTED" = true ] || break
    FOUND=false
    while IFS= read -r -d '' p; do
      if path_under "$p" "$s"; then FOUND=true; break; fi
    done < "$PATHS_FILE"
    if [ "$FOUND" != true ]; then
      rm -f "$PATHS_FILE"
      echo "verify-push-state: --scope '$s' names no path git knows (tracked or untracked, case-exact, no globbing)" >&2; exit 2
    fi
  done
  rm -f "$PATHS_FILE"
fi

FAILURES=0
note() { printf '  %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
ok()   { printf '  ✓ %s\n' "$1"; }

echo "verify-push-state: asserting the reported branch state is real"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
note "branch=${BRANCH}  head=${HEAD_SHA}  base=${BASE}  remote=${REMOTE}"

# ── 1. No rebase/merge/cherry-pick left in progress ───────────────────────────
# A half-finished rebase leaves a detached HEAD that can look plausible.
GITDIR=$(git rev-parse --git-dir 2>/dev/null)
if [ -d "$GITDIR/rebase-merge" ] || [ -d "$GITDIR/rebase-apply" ]; then
  fail "a rebase is IN PROGRESS — resolve or abort it before reporting"
elif [ -f "$GITDIR/MERGE_HEAD" ]; then
  fail "a merge is IN PROGRESS — resolve or abort it before reporting"
elif [ -f "$GITDIR/CHERRY_PICK_HEAD" ]; then
  fail "a cherry-pick is IN PROGRESS — resolve or abort it before reporting"
else
  ok "no rebase/merge/cherry-pick in progress"
fi

# ── 2. Commits actually exist on top of the base ──────────────────────────────
# THE headline check. An "empty branch push" satisfies every naive test for
# "did you push?" — the ref exists, the push succeeded, the PR opens — and
# contains none of the work.
if ! git rev-parse --verify --quiet "$BASE" >/dev/null 2>&1; then
  fail "base ref '${BASE}' does not resolve — cannot count commits"
else
  AHEAD=$(git rev-list --count "${BASE}..HEAD" 2>/dev/null)
  if [ -z "$AHEAD" ]; then
    fail "could not count commits ahead of '${BASE}'"
  elif [ "$AHEAD" -eq 0 ]; then
    fail "0 commits ahead of '${BASE}' — the branch is EMPTY. Nothing was committed."
  else
    ok "${AHEAD} commit(s) ahead of ${BASE}"
  fi
fi

# ── 3. Working tree is clean ──────────────────────────────────────────────────
# Uncommitted work is work that will not reach the PR, however green the suite was
# when it ran against the working tree.
if [ ${#SCOPES[@]} -eq 0 ]; then
  DIRTY=$(git status --porcelain 2>/dev/null)
  if [ -n "$DIRTY" ]; then
    fail "working tree is DIRTY — $(printf '%s\n' "$DIRTY" | grep -c .) uncommitted path(s):"
    printf '%s\n' "$DIRTY" | head -20 | sed 's/^/      /'
  else
    ok "working tree clean"
  fi
else
  # Scoped: only dirt inside a scope is this run's unfinished work. Dirt outside every scope
  # belongs to someone else in a shared checkout — name it, never fail on it (obs #142).
  # -z and --untracked-files=all: file-level entries with no quoting, so a new directory is
  # judged by its files rather than by a directory entry that may straddle a scope.
  INSIDE=()
  OUTSIDE=()
  in_scope() {
    local s
    for s in "${SCOPES[@]}"; do path_under "$1" "$s" && return 0; done
    return 1
  }
  # Each command's own status is captured: an unreadable status must fail check 3, never read as an
  # empty list, which would report "clean within scope" (task.147 QA-1, CR-7).
  STATUS_READ=false
  if STATUS_FILE=$(mktemp); then
    git status --porcelain -z --untracked-files=all > "$STATUS_FILE" 2>/dev/null
    GS_STATUS=$?
    if [ "$GS_STATUS" -eq 0 ]; then STATUS_READ=true; fi
  fi
  if [ "$STATUS_READ" = true ]; then
    # With -z, a rename or copy is "XY <dest>" followed by a separate "<source>" entry. BOTH paths
    # are judged: a move from inside the scope to outside it is a pending removal from the work
    # item, and judging only the destination passed it as a warning (task.147 QA-1).
    RENAME_SRC=false
    while IFS= read -r -d '' entry; do
      if [ "$RENAME_SRC" = true ]; then
        RENAME_SRC=false
        in_scope "$entry" && INSIDE+=("$entry (moved or copied away)")
        continue
      fi
      XY="${entry:0:2}"
      P="${entry:3}"
      # Either column: a worktree-side rename (" R", as for an intent-to-add path) also carries a
      # separate source record (task.147 QA-2, CR-8).
      case "$XY" in R?|C?|?R|?C) RENAME_SRC=true ;; esac
      if in_scope "$P"; then INSIDE+=("$P"); else OUTSIDE+=("$P"); fi
    done < "$STATUS_FILE"
  fi
  [ -n "${STATUS_FILE:-}" ] && rm -f "$STATUS_FILE"
  for P in ${OUTSIDE[@]+"${OUTSIDE[@]}"}; do
    note "! outside scope (warning): $P"
  done
  if [ "$STATUS_READ" != true ]; then
    fail "could not read the working-tree status — cannot establish that the scope is clean"
  elif [ ${#INSIDE[@]} -gt 0 ]; then
    fail "working tree is DIRTY within scope — ${#INSIDE[@]} uncommitted path(s):"
    printf '      %s\n' "${INSIDE[@]}" | head -20
  else
    ok "working tree clean within scope (${#OUTSIDE[@]} path(s) outside scope, listed above)"
  fi
fi

# ── 4. Local HEAD is on the remote ────────────────────────────────────────────
git fetch "$REMOTE" "$BRANCH" --quiet 2>/dev/null
REMOTE_SHA=$(git rev-parse --verify --quiet "${REMOTE}/${BRANCH}" 2>/dev/null)
if [ -z "$REMOTE_SHA" ]; then
  fail "branch '${BRANCH}' does not exist on '${REMOTE}' — nothing was pushed"
elif [ "$REMOTE_SHA" != "$HEAD_SHA" ]; then
  UNPUSHED=$(git rev-list --count "${REMOTE}/${BRANCH}..HEAD" 2>/dev/null || echo "?")
  fail "local HEAD != ${REMOTE}/${BRANCH} (${UNPUSHED} unpushed commit(s)) — push before reporting"
  note "      local:  ${HEAD_SHA}"
  note "      remote: ${REMOTE_SHA}"
else
  ok "local HEAD == ${REMOTE}/${BRANCH}"
fi

# ── 5. The PR points at this exact commit ─────────────────────────────────────
# Optional: only when a PR number is supplied and gh is available. This mirrors
# the develop-batch merge gate's head-SHA check, moved earlier so a false report
# is caught at the moment it would be made rather than at merge time.
if [ -n "$PR" ]; then
  if ! command -v gh >/dev/null 2>&1; then
    note "! gh not on PATH — PR head check skipped (not a failure)"
  else
    PR_SHA=$(gh pr view "$PR" --json headRefOid --jq .headRefOid 2>/dev/null)
    if [ -z "$PR_SHA" ]; then
      fail "could not read PR #${PR} head — cannot confirm the PR matches this commit"
    elif [ "$PR_SHA" != "$HEAD_SHA" ]; then
      fail "PR #${PR} head != local HEAD — the PR does not contain this commit"
      note "      local:   ${HEAD_SHA}"
      note "      PR head: ${PR_SHA}"
    else
      ok "PR #${PR} head == local HEAD"
    fi
  fi
fi

echo
if [ "$FAILURES" -gt 0 ]; then
  echo "verify-push-state: FAILED (${FAILURES} check(s)) — do NOT report this work as pushed."
  exit 1
fi
echo "verify-push-state: OK — the reported state is real."
exit 0
