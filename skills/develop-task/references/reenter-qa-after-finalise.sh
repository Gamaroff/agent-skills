#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/reenter-qa-after-finalise.sh. Regenerate via `npm run bundle`.
# reenter-qa-after-finalise.sh — re-enter the QA loop after a /finalise DoD-gaps HALT that was
# fixed by changing code (task.170, observation #235).
#
# Sibling of grant-qa-cycles.sh. A /finalise run that finds Definition of Done gaps HALTs the
# develop pipeline at Step 7 and leaves a halt snapshot with halt_step 7. When the gaps are closed
# by a CODE change, the plain resume (`advance-pipeline-lock.sh --restore`) brings the lock back at
# step 7 and /finalise re-runs over a head no QA gate has read — and the obvious backward move,
# `advance-pipeline-lock.sh 5`, is a silent no-op on a step-7 lock (that helper is monotonic, and
# stays so). This script is the ONE writer that may lower current_step, and only on this path:
#
#   1. REFUSES — every check runs before any write, so a refusal restores and consumes nothing:
#        lock-present         a live lock exists; this re-entry starts from a halt snapshot
#        no-snapshot          `advance-pipeline-lock.sh --restore --which <doc-dir>` chose no
#                             candidate (none on disk, or only one for another document, or a
#                             legacy one) — its stderr is relayed
#        not-a-finalise-halt  the candidate's halt_step is not 7 (a pause, or a halt elsewhere)
#        no-dod               no {stem}.dod.{N}.*.md beside the document — keyed on the work
#                             item's stem, so a co-located bug's DoD is never read as its verdict
#        dod-not-gaps         the newest DoD file's Final Status is not ❌ GAPS
#        no-gate              qa-cycle.sh found no single current gate
#        no-code-moved        nothing outside <doc-dir> moved past the gate's head: a
#                             document-only fix, for which /finalise re-running at 7 is correct
#      The reasons are printed as `reenter-qa: refused (<reason>) — …`. The resume contract
#      lists the same set; evals/shared/tests/reenter-qa-refusals-parity.test.mjs holds the two
#      equal.
#   2. MEASURES code movement with the qa-task Phase 0 measure, plus one exclusion: commits since the
#      gate's `head:` outside <doc-dir>, PLUS uncommitted and untracked changes outside it (and
#      outside .claude/state, the pipeline's own scratch, where the consumed snapshot lives); a
#      head that is absent, not 40-hex, not a commit or not an ancestor of HEAD counts as moved.
#      It fails toward re-review — one extra QA cycle — never toward "nothing moved".
#   3. RESTORES through `advance-pipeline-lock.sh --restore <doc-dir>` (the one restore path,
#      which consumes the snapshot) and then, in ONE atomic write (mktemp + mv beside the lock):
#        current_step = 5, qa_phase = "5a",
#        qa_max_cycles = max(existing, base + 2) — an absent budget counts as the loop's default 5
#          (its `.qa_max_cycles // 5` read), so a re-entry never lowers the budget the loop would
#          have used (task.170 QA cycle 2, CR-4); base reconstructed as grant-qa-cycles.sh
#          does: max(highest gate via qa-cycle.sh, `### QA Cycle` entries in the report); 2 is
#          the grant prompt's recommended k; an existing higher budget is kept, never lowered,
#        qa_reentry = {from_step: 7, reason: "dod-gaps-code-fix", at, gate_head}.
#      A failed write after the restore KEEPS the restored step-7 lock: the snapshot is consumed,
#      so the lock is the run's only state, and a lock at 7 is a resumable one (the grant's
#      undo_restore rule). No temp file is left behind on any path.
#
# Usage:
#   bash .agents/skills/{develop-story|develop-task}/references/reenter-qa-after-finalise.sh <doc-dir> [<implementation-report>]
#
# Run from the repository root — the movement measure's pathspecs are relative to it, and a
# <doc-dir> that IS the root is refused (its exclusion would hide every change).
# Exit: 0 re-entered; 1 refused or failed (the reason on stderr); 2 usage.
# Paths honour PIPELINE_LOCK and PIPELINE_HALT_SNAPSHOT for tests; both pass through to --restore.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
SNAPSHOT="${PIPELINE_HALT_SNAPSHOT:-.claude/state/develop-pipeline.last-halt.json}"
export PIPELINE_LOCK="$LOCK" PIPELINE_HALT_SNAPSHOT="$SNAPSHOT"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# bundle-dependency: shared/resources/advance-pipeline-lock.sh
ADVANCE="$HERE/advance-pipeline-lock.sh"
# bundle-dependency: shared/resources/qa-cycle.sh
QA_CYCLE_SH="$HERE/qa-cycle.sh"
# bundle-dependency: shared/resources/newest-numbered.sh
NEWEST_SH="$HERE/newest-numbered.sh"

usage() {
  echo "Usage: reenter-qa-after-finalise.sh <doc-dir> [<implementation-report>]   (run from the repository root)" >&2
  exit 2
}
refuse() { # $1 = reason, $2 = detail
  echo "reenter-qa: refused ($1) — $2" >&2
  exit 1
}

DOC_DIR="${1:-}"
REPORT="${2:-}"
[ $# -le 2 ] || usage
[ -n "$DOC_DIR" ] && [ -d "$DOC_DIR" ] || usage
DOC_DIR="${DOC_DIR%/}"
if [ -n "$REPORT" ] && [ ! -f "$REPORT" ]; then
  echo "reenter-qa: implementation report '$REPORT' not found" >&2
  usage
fi
command -v jq >/dev/null 2>&1 || { echo "reenter-qa: jq not found — the re-entry cannot be recorded" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "reenter-qa: git not found — code movement cannot be measured" >&2; exit 1; }
for f in "$ADVANCE" "$QA_CYCLE_SH" "$NEWEST_SH"; do
  [ -f "$f" ] || { echo "reenter-qa: $(basename "$f") not found beside this script ($f) — re-bundle the skill" >&2; exit 1; }
done
# A <doc-dir> at the repository root makes ":(exclude)$DOC_DIR" exclude the whole tree, and the
# measure would read 0 for every change (the qa-task Phase 0 guard, task.135 QA cycle 3, CR3-2).
PREFIX=$(git -C "$DOC_DIR" rev-parse --show-prefix 2>/dev/null) || { echo "reenter-qa: '$DOC_DIR' is not inside a git work tree" >&2; usage; }
[ -n "$PREFIX" ] || { echo "reenter-qa: '$DOC_DIR' is the repository root — its own files cannot be told from the code" >&2; usage; }

# ── 1. Refusals — every one before any write ─────────────────────────────────
[ -f "$LOCK" ] && refuse lock-present "a live lock exists at '$LOCK'; this re-entry starts from a halt snapshot, and a live lock means the run is already resumed"

WHICH_ERR=$(mktemp) || exit 1
CAND=$(bash "$ADVANCE" --restore --which "$DOC_DIR" 2>"$WHICH_ERR"); rc=$?
WHY=$(cat "$WHICH_ERR"); rm -f "$WHICH_ERR"
if [ "$rc" -ne 0 ] || [ -z "$CAND" ] || [ ! -f "$CAND" ]; then
  [ -n "$WHY" ] && printf '%s\n' "$WHY" | sed 's/^advance-pipeline-lock:/reenter-qa:/' >&2
  refuse no-snapshot "no halt snapshot for '$DOC_DIR' to re-enter from"
fi

# halt_step is a STRING when the HALT snippet wrote it with `jq --arg` — compare as text.
HALT_STEP=$(jq -r '.halt_step // empty | tostring' "$CAND" 2>/dev/null)
[ "$HALT_STEP" = "7" ] || refuse not-a-finalise-halt "the snapshot '$CAND' records halt_step '${HALT_STEP:-none}', not 7 — resume it with advance-pipeline-lock.sh --restore"

# shellcheck source=newest-numbered.sh
source "$NEWEST_SH" || { echo "reenter-qa: could not source newest-numbered.sh" >&2; exit 1; }
# Keyed on the work item's own STEM, never the directory: a co-located bug writes its own
# {bug-prefix}.dod.{N}.*.md beside the parent's, and a directory-wide pattern read a higher-numbered
# bug DoD as the task's verdict (task.170 QA cycle 1, CR-1 — the same reason finalise keys its own
# lookup on the stem, TASK-125-BUG-8). The stem is the directory's task.{id} or story.{epic}.{story}
# prefix — the story number may carry create-parallel-stories' hybrid suffix (story.305.1-1) and a
# sub-story letter (story.309.2.3A) (task.170 QA cycle 2, CR-2); a directory carrying neither shape
# cannot be a develop-task / develop-story work item.
STEM=$(basename "$DOC_DIR" | sed -nE 's/^(task\.[0-9]+|story\.[0-9]+\.[0-9]+(-[0-9]+)?[A-Za-z]?)(\..*)?$/\1/p')
[ -n "$STEM" ] || { echo "reenter-qa: '$DOC_DIR' is not a task.{id}.* or story.{epic}.{story}.* work-item directory" >&2; usage; }
DOD=$(newest_numbered "$DOC_DIR" dod -name "${STEM}.dod.*.md")
[ -n "$DOD" ] && [ -f "$DOD" ] || refuse no-dod "no ${STEM}.dod.{N}.*.md in '$DOC_DIR' — a step-7 halt with no DoD file is not a DoD-gaps halt"
grep -q '^\*\*Final Status:\*\* ❌ GAPS' "$DOD" || refuse dod-not-gaps "the newest DoD file '$DOD' does not carry **Final Status:** ❌ GAPS"

# The gate and its cycle number come from the ONE definition, qa-cycle.sh, and are refused together.
# Deliberately NOT stem-keyed like the DoD above: qa-cycle.sh is the selection the QA loop itself,
# grant-qa-cycles.sh and the resume contract use, and the re-entered loop continues from the cycle
# it names — a second gate key here would let this script and the loop disagree about the base
# (task.170 QA cycle 2, CR-6; tests/qa-cycle.test.js forbids another gate derivation in a helper).
# A co-located bug gate that makes the cycle ambiguous is refused by qa-cycle.sh, never guessed.
GATE=$(bash "$QA_CYCLE_SH" "$DOC_DIR" --path gate 2>/dev/null) || GATE=""
BASE=$(bash "$QA_CYCLE_SH" "$DOC_DIR" 2>/dev/null) || BASE=""
case "$BASE" in ''|*[!0-9]*) BASE="" ;; esac
[ -n "$GATE" ] && [ -f "$GATE" ] && [ -n "$BASE" ] || refuse no-gate "qa-cycle.sh found no single current gate in '$DOC_DIR'"

# ── 2. The qa-task Phase 0 movement measure, all of it ───────────────────────
GATE_HEAD=$(grep -E '^head:' "$GATE" 2>/dev/null | head -1 | sed -E "s/^head:[[:space:]]*//; s/[[:space:]]+#.*$//; s/['\"]//g; s/[[:space:]]*$//")
if [ -z "$GATE_HEAD" ]; then
  MOVED=1; WHY_MOVED="the gate carries no head: (schema 1) — it cannot vouch for the present tree"
elif ! { printf '%s' "$GATE_HEAD" | grep -qE '^[0-9a-f]{40}$' \
         && git cat-file -e "${GATE_HEAD}^{commit}" 2>/dev/null \
         && git merge-base --is-ancestor "$GATE_HEAD" HEAD 2>/dev/null; }; then
  MOVED=1; WHY_MOVED="the gate head '$GATE_HEAD' is not a 40-hex commit on this branch"
else
  MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- . ":(exclude)$DOC_DIR" 2>/dev/null || echo 1)
  # .claude/state is the pipeline's own scratch — the halt snapshot this script consumes lives there,
  # so in a repo that does not gitignore .claude/ it would always count as movement and the
  # no-code-moved refusal could never fire (task.170 QA cycle 1, CR-2; qa-task Step 3b excludes it too).
  git diff --quiet HEAD -- . ":(exclude)$DOC_DIR" ":(exclude).claude/state" 2>/dev/null || MOVED=$((MOVED + 1))
  [ -z "$(git ls-files --others --exclude-standard -- . ":(exclude)$DOC_DIR" ":(exclude).claude/state" 2>/dev/null)" ] || MOVED=$((MOVED + 1))
  WHY_MOVED="$MOVED change(s) outside '$DOC_DIR' since the gate's head ${GATE_HEAD:0:12}"
fi
[ "$MOVED" -gt 0 ] 2>/dev/null || refuse no-code-moved "nothing outside '$DOC_DIR' moved since the gate's head ${GATE_HEAD:0:12} — a document-only fix; resume at step 7 with advance-pipeline-lock.sh --restore and re-run /finalise"

# ── 3. Budget base, as grant-qa-cycles.sh reconstructs it ────────────────────
# max(highest gate — BASE, read above — , `### QA Cycle` entries in the report).
if [ -n "$REPORT" ]; then
  # `|| true`, not `|| echo 0`: grep -c prints 0 AND exits 1 on no match.
  DONE=$(grep -c '^### QA Cycle' "$REPORT" 2>/dev/null || true)
  [ "${DONE:-0}" -gt "$BASE" ] 2>/dev/null && BASE="$DONE"
fi

# ── 4. Restore, then lower — one atomic write ────────────────────────────────
if ! RESTORE_OUT=$(bash "$ADVANCE" --restore "$DOC_DIR" 2>&1); then
  printf '%s\n' "$RESTORE_OUT" | sed 's/^advance-pipeline-lock:/reenter-qa:/' >&2
  exit 1
fi
# --restore exits 0 for "lock present — nothing to restore" as well as for a real restore. A lock that
# appeared after the lock-present refusal above is not one this script restored, and lowering it would
# rewrite another run's lock (task.170 QA cycle 2, CR-5): only a real restore proceeds.
printf '%s\n' "$RESTORE_OUT" | grep -q 'lock restored from' \
  || refuse lock-present "a lock appeared at '$LOCK' before the restore ran — it is not this re-entry's; nothing written"
keep_restored() { echo "reenter-qa: the lock restored at step 7 is kept (its snapshot was consumed); the re-entry was NOT written — the run resumes at step 7" >&2; }
if ! jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1; then
  echo "reenter-qa: the restored lock is not a JSON object — refusing to write" >&2
  exit 1
fi
TMP=$(mktemp "$(dirname "$LOCK")/.reenter-qa.XXXXXX") || { keep_restored; exit 1; }
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if ! jq --argjson base "$BASE" --arg now "$NOW" --arg head "$GATE_HEAD" '
       .current_step = 5
       | .qa_phase = "5a"
       | .qa_max_cycles = ([((.qa_max_cycles // 5) | tonumber? // 5), ($base + 2)] | max)
       | .qa_reentry = {from_step: 7, reason: "dod-gaps-code-fix", at: $now, gate_head: $head}' \
     "$LOCK" > "$TMP"; then
  rm -f "$TMP"
  keep_restored
  echo "reenter-qa: jq write failed" >&2
  exit 1
fi
if ! mv "$TMP" "$LOCK"; then
  rm -f "$TMP"
  keep_restored
  exit 1
fi
echo "reenter-qa: $WHY_MOVED" >&2
echo "reenter-qa: re-entered QA at step 5 / qa_phase 5a — qa_max_cycles=$(jq -r '.qa_max_cycles' "$LOCK") (base $BASE), gate_head=${GATE_HEAD:-none}"
exit 0
