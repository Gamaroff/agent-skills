#!/usr/bin/env bash
# resolve-bare-task.sh — resolve an ALL-DIGITS argument as a TASK ID before an issue number
# (task.282, obs #128).
#
# Run it from a fenced block by the path the skill states, from the repository root:
#
#   ANSWER=$(bash .agents/skills/review-task/references/resolve-bare-task.sh 243) || exit 1
#
# (the installed path, `.agents/skills/<skill>/references/`: a path relative to the skill does
# not exist from the repository root in a consumer repository — T282-QA-4)
#
# `/review-task 243` and `/develop-task 243` used to read 243 as a GitHub issue number.
# Issue #243 here was an unrelated merged PR, the lookup found no document and the run
# HALTed "No local document found" for a task that existed only on a side branch.
# `#243`, an issue URL and a Jira key stay the unambiguous issue forms; this resolves
# only a bare number, and only as far as saying WHERE the task is.
#
# Prints ONE tab-separated line and exits 0 for all four answers:
#   found     <path>                 the task document in THIS working tree
#   elsewhere <path>   worktree      in another linked worktree; <path> is the document there
#   elsewhere <branch> branch        only on a branch no worktree holds
#   none                             no task document anywhere
#   none      registry               no document anywhere, but the task registry has the row
# Exit 1: could not look (not a git repository, git failed) or two documents claim the
# number — a data error a human settles; nothing is printed on stdout but the reason on
# stderr, so a caller never reads a guess. Exit 2: usage (not all digits).
#
# The work-item document is the one named after its own directory ({stem}/{stem}.md):
# artefacts beside it (plan, review, implementation…) are never the answer. `task.1.*`
# does not match `task.10.*` — the dot after the number is literal.
set -u

n="${1:-}"
case "$n" in
  '' | *[!0-9]*)
    echo "usage: resolve-bare-task.sh <all-digits task number>" >&2
    exit 2
    ;;
esac
# Leading zeros: 007 is task 7. String operations, never `$((10#$n))`: bash arithmetic wraps
# silently past 19 digits (18446744073709551617 reads as 1), which resolved a different task
# (T282-QA-1). Nine digits is the cap qa-cycle.sh applies to a cycle number, and far past any
# task id; a longer value is refused, never read as a smaller number.
n=${n#"${n%%[!0]*}"}
[ -n "$n" ] || n=0
if [ "${#n}" -gt 9 ]; then
  echo "usage: resolve-bare-task.sh takes at most 9 digits after leading zeros" >&2
  exit 2
fi

root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "resolve-bare-task: not inside a git repository" >&2
  exit 1
}

# doc_in <base> — print the work-item document of task $n under <base>, one per line.
doc_in() {
  local base=$1 d b
  for d in "$base"/docs/tasks/task."$n".*/; do
    [ -d "$d" ] || continue
    b=$(basename "$d")
    [ -f "$d$b.md" ] && printf '%s\n' "$d$b.md"
  done
}

# 1. This working tree.
here=$(doc_in "$root")
count=$(printf '%s' "$here" | grep -c .)
if [ "$count" -gt 1 ]; then
  echo "resolve-bare-task: $count documents claim task $n:" >&2
  printf '%s\n' "$here" >&2
  exit 1
fi
if [ "$count" -eq 1 ]; then
  printf 'found\t%s\n' "${here#"$root"/}"
  exit 0
fi

# 2. Another linked worktree. The current worktree was just searched.
wts=$(git worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p') || {
  echo "resolve-bare-task: git worktree list failed" >&2
  exit 1
}
while IFS= read -r wt; do
  [ -n "$wt" ] || continue
  [ "$wt" = "$root" ] && continue
  there=$(doc_in "$wt" | head -1)
  if [ -n "$there" ]; then
    printf 'elsewhere\t%s\tworktree\n' "$there"
    exit 0
  fi
done <<EOF
$wts
EOF

# 3. A branch no worktree holds: the newest commit, on any ref, that touched the document.
commit=$(git log --all --format=%H -n 1 -- "docs/tasks/task.$n.*" 2>/dev/null) || {
  echo "resolve-bare-task: git log --all failed" >&2
  exit 1
}
if [ -n "$commit" ]; then
  branch=$(git branch -a --contains "$commit" --format='%(refname:short)' 2>/dev/null | head -1)
  if [ -n "$branch" ]; then
    printf 'elsewhere\t%s\tbranch\n' "$branch"
    exit 0
  fi
fi

# 4. Nowhere. The registry row tells "no such task" from "a task whose branch is gone".
if [ -f "$root/docs/tasks/task-registry.md" ] \
  && grep -qE "^\| *$n *\|" "$root/docs/tasks/task-registry.md"; then
  printf 'none\tregistry\n'
else
  printf 'none\n'
fi
exit 0
