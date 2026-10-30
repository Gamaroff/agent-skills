#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/code-moved-since-gate.sh. Regenerate via `npm run bundle`.
# code-moved-since-gate.sh <work-item-dir> <gate-file>
#
# Prints the count of changes OUTSIDE <work-item-dir> since the commit <gate-file> judged
# (its `head:`): commits, plus one for uncommitted edits and one for untracked files. 0 means the
# gate read this exact tree; anything above 0 means code moved after it.
#
# A head it cannot vouch for fails toward "re-read": a missing `head:` (schema 1), one that is not a
# 40-hex commit, one this checkout lacks, or one that is not an ancestor of HEAD prints 1 and exits
# 0, with one line on stderr naming the head. A hand-typed `head: HEAD` counted 0 commits on every
# run, and an off-branch head counted only what it happened not to share, so a PASS gate skipped
# review whatever landed after it (task.168 CR4-1).
#
# Exit 2 on usage: a missing argument, an unreadable gate, or a work-item directory that is the
# repository root (":(exclude)." would exclude the whole tree and the count would always read 0 —
# task.135 QA cycle 3, CR3-2). Run it from inside the repository.
#
# The ONE definition of "did code move since this gate". Called by qa-task Phase 0 (its re-review
# trigger) and by grant-qa-cycles.sh (which picks the grant's re-entry phase from it) — task.244.
# Anything outside the work-item directory counts, committed, uncommitted or untracked: a fixed list
# of source directories missed scripts/, tests/ and a consumer's src/ (task.135 CR-3), and excluding
# all of docs/ hid a documentation deliverable (CR2-4). The work item's own directory is excluded
# because the gate, the QA report, the work item and the implementation report live there and move
# on every cycle. Untracked files count even though Step 3b only warns on one: the count cannot tell
# a restored file from a new fix file, so it fails toward re-review (task.168 QA cycle 2, CR-3).
set -u

DIR=${1:-}
GATE=${2:-}
if [ -z "$DIR" ] || [ -z "$GATE" ]; then
  echo "⚠️  code-moved-since-gate: usage: code-moved-since-gate.sh <work-item-dir> <gate-file>" >&2
  exit 2
fi
if [ ! -d "$DIR" ]; then
  echo "⚠️  code-moved-since-gate: '$DIR' is not a directory" >&2
  exit 2
fi
if [ ! -f "$GATE" ]; then
  echo "⚠️  code-moved-since-gate: '$GATE' is not a readable gate file" >&2
  exit 2
fi
# The prefix of DIR from the repository root; empty means DIR IS the root.
PREFIX=$(git -C "$DIR" rev-parse --show-prefix 2>/dev/null)
if [ -z "$PREFIX" ]; then
  echo "⚠️  code-moved-since-gate: '$DIR' is the repository root (or not in a repository) — the count cannot tell the work item's own files from the code" >&2
  exit 2
fi
# Resolve the gate to an absolute path, then count from the repository root with DIR as a
# root-relative pathspec, so the answer does not depend on the caller's working directory.
GATE=$(cd "$(dirname "$GATE")" && printf '%s/%s' "$PWD" "$(basename "$GATE")")
cd "$(git -C "$DIR" rev-parse --show-toplevel)" || exit 2
DIR=${PREFIX%/}

GATE_HEAD=$(grep -E '^head:' "$GATE" 2>/dev/null | head -1 | sed -E "s/^head:[[:space:]]*//; s/[[:space:]]+#.*$//; s/['\"]//g; s/[[:space:]]*$//")

if [ -z "$GATE_HEAD" ]; then
  echo "trigger: gate '$GATE' carries no head: (schema 1) — re-reviewing" >&2
  echo 1
  exit 0
fi
if ! { printf '%s' "$GATE_HEAD" | grep -qE '^[0-9a-f]{40}$' \
     && git cat-file -e "${GATE_HEAD}^{commit}" 2>/dev/null \
     && git merge-base --is-ancestor "$GATE_HEAD" HEAD 2>/dev/null; }; then
  echo "trigger: gate head '$GATE_HEAD' is not a 40-hex commit on this branch — re-reviewing" >&2
  echo 1
  exit 0
fi

# `|| echo 1` fails toward re-review when git cannot answer.
MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- . ":(exclude)$DIR" 2>/dev/null || echo 1)
git diff --quiet HEAD -- . ":(exclude)$DIR" 2>/dev/null || MOVED=$((MOVED + 1))
[ -z "$(git ls-files --others --exclude-standard -- . ":(exclude)$DIR" 2>/dev/null)" ] || MOVED=$((MOVED + 1))
echo "$MOVED"
