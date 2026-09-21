#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/gh-labels.sh. Regenerate via `npm run bundle`.
# gh-labels.sh — the ONE definition of "which labels may reach a gh mutation".
#
# Source it (`source references/gh-labels.sh || exit 1`), then:
#
#   gh_labels_filter LABEL...        → prints, one per line, each LABEL that may be
#                                       passed to `gh issue create --label` /
#                                       `gh issue edit --add-label`
#
# Every GitHub call site that builds a label from a document field
# (`priority:${priority}`, `severity:${SEVERITY}`) routes through this function.
# `gh` rejects the WHOLE create or edit on one unknown label — and this
# repository's labels are lowercase `priority:*` with no `severity:*` at all — so
# a frontmatter value passed verbatim (`priority:High`) created nothing and an
# unattended bug proceeded with no issue (task.125, obs #65). The rule was first
# written at one of the nine sites; the shared function is what makes it hold at
# all of them (TASK-125-BUG-3), and `tests/gh-labels.test.js` scans the sites.
#
# What it does, per candidate, in order:
#   1. An EMPTY value (`priority:`, `severity:`, or nothing) is no label — dropped
#      silently. An absent field is not a mistake to warn about.
#   2. A candidate that is not ONE line is refused with a warning naming it.
#      `grep -F` reads a multi-line pattern as several patterns, so
#      `priority:high<LF>foo` matched a real `priority:high` and the newline
#      reached `--label`, failing the create (TASK-125-BUG-6).
#   3. The candidate is looked up as given, then lowercased; the first form the
#      repository defines is emitted. Lowercasing is the sibling sites' existing
#      convention (`ensure-task-github-issue` reads `priority` lowercase); trying
#      the given case first keeps a repository whose labels ARE cased working.
#   4. A candidate the repository does not define in either case is dropped with a
#      warning naming it. A label is metadata; the issue is the deliverable.
#
# The label read (`gh label list`) runs ONCE, with an explicit limit: gh's default
# is 30, and on a larger repository a real label past the first page read as
# "not defined" and was stripped (TASK-125-BUG-2). Its EXIT CODE, not its output,
# decides the fallback: when the read itself fails (no network, a token without
# the scope) every candidate passes through unchecked — lowercased, the
# repository convention — so the create's own failure names the label rather
# than this function stripping every label from every issue. A repository with genuinely zero labels is the other state that
# yields an empty list — it is read as "nothing is defined", and every candidate
# is dropped with a warning, which is the true answer (CR-7: the two states must
# not share one value).
#
# Portable across bash 3.2 (macOS /bin/bash) and zsh: no arrays returned, no
# `mapfile`, no `${var,,}`. Callers collect the lines:
#
#   LABEL_ARGS=()
#   while IFS= read -r l; do [ -n "$l" ] && LABEL_ARGS+=(--label "$l"); done \
#     < <(gh_labels_filter "bug" "priority:${PRIORITY}" "severity:${SEVERITY}")

# The limit is a named constant so a test can mutate it; gh's silent default of
# 30 is the defect it exists to avoid.
GH_LABELS_LIST_LIMIT=${GH_LABELS_LIST_LIMIT:-1000}

gh_labels_filter() {
  local repo_labels rc candidate lower nl
  nl=$(printf '\n_'); nl=${nl%_}
  repo_labels=$(gh label list --json name -L "$GH_LABELS_LIST_LIMIT" -q '.[].name' 2>/dev/null)
  rc=$?
  for candidate in "$@"; do
    case "$candidate" in
      ''|*:) continue ;;                       # rule 1 — an empty field is no label
    esac
    case "$candidate" in
      *"$nl"*)                                 # rule 2 — one line, or it is refused
        printf '⚠️  label %s is not a single line — skipped (the create still runs)\n' \
          "$(printf '%s' "$candidate" | tr '\n' '|')" >&2
        continue ;;
    esac
    lower=$(printf '%s' "$candidate" | tr '[:upper:]' '[:lower:]')
    if [ "$rc" -ne 0 ]; then                   # the READ failed — pass through unchecked,
      printf '%s\n' "$lower"                  # in the repository convention (lowercase)
      continue
    fi
    if printf '%s\n' "$repo_labels" | grep -qxF -- "$candidate"; then
      printf '%s\n' "$candidate"               # rule 3 — as given
    elif printf '%s\n' "$repo_labels" | grep -qxF -- "$lower"; then
      printf '%s\n' "$lower"                   # rule 3 — lowercased
    else                                       # rule 4 — not defined, in either case
      printf '⚠️  label '"'"'%s'"'"' is not defined in this repository — skipped (the create still runs)\n' \
        "$candidate" >&2
    fi
  done
}
