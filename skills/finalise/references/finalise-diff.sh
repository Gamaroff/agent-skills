#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-diff.sh. Regenerate via `npm run bundle`.
# finalise-diff.sh — the ONE reader of a pull request's whole change for /finalise (task 321).
#
#   bash .agents/skills/finalise/references/finalise-diff.sh --out <file> [--pr <n>]
#
# Writes two files and prints one line on stdout:
#   <file>        the patch, without bundled copies (see "Bundled copies" below)
#   <file>.names  EVERY changed path, the bundled copies included, NUL-delimited
#
#   source=merge-base base=<sha> head=<sha> files=<n> excluded=<n>   the change read from git
#   source=forge pr=<n> files=<n>                                    the change read from `gh pr diff`
#   unresolved: <reason>                                             no change could be read
#
# Exit: 0 resolved · 1 unresolved (<file> is empty) · 2 usage
#
# WHY THIS EXISTS
#
# Step 3a used to run `gh pr diff`, then `git diff HEAD~1 HEAD`, then `touch`, with stderr sent to
# /dev/null. On PR #937 the forge refused the diff (`PullRequest.diff too_large`) and the agents
# were handed 1 file of a 250-file change; on Bitbucket `gh pr diff` cannot read a PR at all, so
# every run there was graded on its last commit; and an empty diff passed a criterion over a set,
# because with no members none is unmapped. Nothing recorded which diff answered. This reader
# returns the whole change or says it could not, and the line it prints says which.
#
# THE ORDER
#
#   1. The PR is read with pr-read.sh (both forges). No --pr, or a failed read → unresolved.
#   2. The PR's head commit is in this checkout (wherever HEAD is): fetch the base, then diff the
#      merge base against the PR's head. source=merge-base.
#   3. The head is not here, or the branch adds nothing to the base (a merged PR), and the forge is
#      GitHub: `gh pr diff`. source=forge.
#   4. Otherwise: unresolved, with the reason.
#
# BUNDLED COPIES
#
# A bundled copy is a file under skills/<skill>/references/ whose relative path exists under
# shared/resources/ in the PR head's tree. It is excluded from the patch, never from the names list:
# the source is in the patch, `bundle:check` holds the copy to it, and a criterion about the copies
# still has its members. Not a path pattern (97 hand-written files live under references/), and not
# the AUTO-GENERATED header (two JSON copies carry none).
#
# An empty result is `unresolved`, never an empty patch: "could not read the change" and "the change
# is small" are different answers. `unresolved` truncates <file> before it exits, so a stale patch of
# an earlier run is never read as this one.

set -u

usage() {
  echo "usage: finalise-diff.sh --out <file> [--pr <n>] — $1" >&2
  exit 2
}

OUT="" PR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --out) [ $# -ge 2 ] || usage "--out needs a value"; OUT="$2"; shift 2 ;;
    --pr)  [ $# -ge 2 ] || usage "--pr needs a value"; PR="$2"; shift 2 ;;
    *) usage "unknown argument '$1'" ;;
  esac
done
[ -n "$OUT" ] || usage "--out is required"
case "$PR" in '' | *[!0-9]*) [ -z "$PR" ] || usage "--pr must be a number (got '$PR')" ;; esac

# Absolute before the cd below, so <file> means what the caller meant.
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
mkdir -p "$(dirname "$OUT")" 2>/dev/null || usage "cannot create the directory of --out ($OUT)"
NAMES="$OUT.names"

unresolved() {
  : > "$OUT"
  # The names list survives only when it holds the change ("every changed file is a bundled copy").
  [ "${KEEP_NAMES:-}" = 1 ] || : > "$NAMES"
  printf 'unresolved: %s\n' "$1"
  exit 1
}

# Nothing of an earlier run is ever read as this one.
: > "$OUT" 2>/dev/null || usage "cannot write --out ($OUT)"
: > "$NAMES" 2>/dev/null || usage "cannot write $NAMES"

TOP=$(git rev-parse --show-toplevel 2>/dev/null) || unresolved "not inside a git repository"
cd "$TOP" || unresolved "cannot enter the repository top ($TOP)"

[ -n "$PR" ] || unresolved "no PR number — the change has no base to diff against"

HERE=$(CDPATH='' cd -P -- "$(dirname -- "$0")" >/dev/null 2>&1 && pwd -P)
# shellcheck source=pr-read.sh
. "$HERE/pr-read.sh" || unresolved "pr-read.sh missing beside finalise-diff.sh"
pr_read --pr "$PR"
case $? in
  0) ;;
  *) unresolved "could not read PR #$PR: ${PR_READ_ERROR:-no reason given}" ;;
esac
BASE="$PR_READ_BASE"

# Bitbucket returns 12 characters of the head in some responses: resolve it to the full commit.
HEAD_SHA=$(git rev-parse --verify --quiet "${PR_READ_HEAD}^{commit}" 2>/dev/null) || HEAD_SHA=""
WHY_NO_GIT=""

if [ -n "$HEAD_SHA" ]; then
  # Fetch the base first: a stale origin/<base> gives an older merge base, and the patch would then
  # carry other merged work. A failed fetch is named, never read past.
  FETCH_ERR=$(git fetch -q origin "+refs/heads/${BASE}:refs/remotes/origin/${BASE}" 2>&1) \
    || unresolved "git fetch origin ${BASE} failed: $(printf '%s' "$FETCH_ERR" | tr '\n' ' ' | sed 's/ *$//')"
  MB=$(git merge-base "refs/remotes/origin/${BASE}" "$HEAD_SHA" 2>/dev/null) \
    || unresolved "no merge base between origin/${BASE} and the PR head ${HEAD_SHA:0:12}"
  git diff --name-only -z "$MB" "$HEAD_SHA" > "$NAMES" \
    || unresolved "git diff --name-only $MB $HEAD_SHA failed"
  if [ -s "$NAMES" ]; then
    EXCL=()
    TOTAL=0
    SRC_DIR="shared/resources"
    while IFS= read -r -d '' f; do
      TOTAL=$((TOTAL + 1))
      case "$f" in
        skills/*/references/*)
          rel=${f#skills/*/references/}
          # The copy's source, looked up in the PR head's tree, not the working tree's. SRC_DIR is a
          # variable because a literal source path here reads to the bundler as a file to bundle.
          git cat-file -e "${HEAD_SHA}:${SRC_DIR}/${rel}" 2>/dev/null \
            && EXCL+=(":(top,exclude,literal)$f")
          ;;
      esac
    done < "$NAMES"
    # `${EXCL[@]+…}`: an empty array under set -u is an error on bash 4.3 and older.
    git diff "$MB" "$HEAD_SHA" -- ':(top)' ${EXCL[@]+"${EXCL[@]}"} > "$OUT" \
      || unresolved "git diff $MB $HEAD_SHA failed"
    if [ ! -s "$OUT" ]; then
      KEEP_NAMES=1 unresolved "every changed file is a bundled copy (${TOTAL} in ${NAMES##*/})"
    fi
    printf 'source=merge-base base=%s head=%s files=%s excluded=%s\n' \
      "${MB:0:12}" "${HEAD_SHA:0:12}" "$((TOTAL - ${#EXCL[@]}))" "${#EXCL[@]}"
    exit 0
  fi
  WHY_NO_GIT="no change between origin/${BASE} (merge base ${MB:0:12}) and the PR head ${HEAD_SHA:0:12}"
  : > "$NAMES"
else
  WHY_NO_GIT="the PR head ${PR_READ_HEAD:-(none)} is not in this checkout"
fi

# ── The forge arm: GitHub only ───────────────────────────────────────────────────────────────
[ "$PR_READ_VCS" = github ] || unresolved "$WHY_NO_GIT, and the forge diff is GitHub-only (vcs: ${PR_READ_VCS:-unknown})"
command -v gh >/dev/null 2>&1 || unresolved "$WHY_NO_GIT, and gh is not on PATH"
FORGE_ERR=$(gh pr diff "$PR" 2>&1 > "$OUT") \
  || unresolved "$WHY_NO_GIT, and gh pr diff $PR failed: $(printf '%s' "$FORGE_ERR" | tr '\n' ' ' | sed 's/ *$//')"
[ -s "$OUT" ] || unresolved "$WHY_NO_GIT, and gh pr diff $PR returned an empty diff"

# The names come from the patch's `diff --git a/X b/Y` headers. An unquoted header holds the same
# path twice for every change but a rename, so the b-side is the second half; a rename falls back to
# the text after the last " b/". A quoted header (git's form for a special character) is kept as git
# printed it. One name per line, then NUL-delimited: git quotes a path that holds a newline, so a
# header line never holds a raw one, and awk's own NUL output is not portable.
awk '
  /^diff --git / {
    h = substr($0, 12)
    n = length(h)
    if (n % 2 == 1 && substr(h, 1, 2) == "a/" && substr(h, (n + 1) / 2 + 1, 2) == "b/" \
        && substr(h, 3, (n - 1) / 2 - 2) == substr(h, (n + 1) / 2 + 3)) {
      p = substr(h, (n + 1) / 2 + 3)
    } else {
      i = 0; j = 0
      while ((j = index(substr(h, i + 1), " b/")) > 0) i += j
      p = (i > 0) ? substr(h, i + 3) : h
    }
    print p
  }
' "$OUT" | tr '\n' '\0' > "$NAMES" || unresolved "could not read the names from the forge diff"
FILES=$(tr -cd '\0' < "$NAMES" | wc -c | tr -d ' ')
printf 'source=forge pr=%s files=%s\n' "$PR" "$FILES"
exit 0
