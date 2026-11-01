#!/usr/bin/env bash
# changelog-cites.sh — does CHANGELOG.md [Unreleased] cite this work item? (task.248, obs #43)
#
# Usage (run, not sourced — it exports nothing; from the repository root):
#   bash .agents/skills/<skill>/references/changelog-cites.sh <stem>
#
#   <stem>  the work item's id: task.248, story.1.2.3, bug.4, task.67.bug.3
#
# Exit  stdout                                   meaning
# 0     cites (task N)                           [Unreleased] cites the task
# 1     missing (task N)                         enforcement on, CHANGELOG.md exists, no citation
# 2     usage: …                                 no stem, or a stem doc-id.js cannot read
# 3     not-applicable: <why>                    enforcement off, no CHANGELOG.md, or a story/bug stem
# 4     unknown: <the resolver's answer>         the opt-in could not be read — never read as off
#
# /finalise 6d's check, moved here so 6d, develop's completion checklist and QA's docs check run one
# definition instead of three. Until task.248 it lived only in 6d, so a missing entry was found after
# the acceptance commit had been pushed. The order is 6d's: the opt-in first (an unset key must never
# reach the file test or the grep), then the file, then the grep — lifted, not rewritten.
#
# Tasks only. `(bug N)` and story citations are the documented follow-on in 6d; a valid story or bug
# stem is not applicable here, exactly as 6d passed it through before.
#
# Parameter expansion, not `[[ =~ ]]` + BASH_REMATCH, for the number: this file runs under bash, but
# its callers' blocks run under zsh too, and 6d's history (task.115 QA cycle 1, CR-1) is why the rule
# is kept everywhere. The stem's shape is doc-id.js's to decide, never a regex here.
#
# Both siblings are run with `bash`/`node`, which the bundler's source/exec rule does not see:
# bundle-dependency: shared/resources/changelog-enforce.sh
# bundle-dependency: shared/resources/doc-id.js

_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
STEM="${1:-}"

if [ -z "$STEM" ] || [ "$#" -ne 1 ]; then
  echo "usage: changelog-cites.sh <stem> (task.N, story.P.E.S, bug.N …)"
  exit 2
fi

# doc-id.js reads a basename, so `../task.248` would parse as task.248 — or a story path as a story,
# whose exit 3 6d passes through silently. A stem is an id, never a path (task.248 QA cycle 1, T248-QA-3).
case "$STEM" in
  */*)
    echo "usage: '${STEM}' is a path, not a work-item id — pass the id alone, e.g. task.248"
    exit 2
    ;;
esac

CL=$(bash "$_dir/changelog-enforce.sh")
case "$CL" in
  on) ;;
  off)
    echo "not-applicable: changelog checks not enabled"
    exit 3
    ;;
  *)
    # Exactly the resolver's answer after the prefix, so 6d's changelog-unknown HALT quotes it.
    echo "unknown: ${CL}"
    exit 4
    ;;
esac

PARSED=$(command node "$_dir/doc-id.js" parse "${STEM}.stem.md" --json 2>/dev/null)
KIND=$(printf '%s' "$PARSED" | jq -r 'if .ok and .id != null then "\(.kind) \(.artifact // "-") \(.id)" else "" end' 2>/dev/null)
if [ -z "$KIND" ]; then
  echo "usage: '${STEM}' is not a work-item id doc-id.js can read"
  exit 2
fi

# The file before the kind, as 6d had it: a story in a repository with no CHANGELOG.md was told so.
if [ ! -f CHANGELOG.md ]; then
  echo "not-applicable: no CHANGELOG.md"
  exit 3
fi

if [ "$KIND" != "task - $STEM" ]; then
  echo "not-applicable: ${STEM} is not a task — 6d cites tasks only"
  exit 3
fi

N="${STEM#task.}"
if awk '/^## \[Unreleased\]/{p=1;next} /^## \[/{p=0} p' CHANGELOG.md | grep -qiE "\btask[ .]${N}\b"; then
  echo "cites (task ${N})"
  exit 0
fi
echo "missing (task ${N})"
exit 1
