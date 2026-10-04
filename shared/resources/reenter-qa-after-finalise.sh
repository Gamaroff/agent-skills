#!/usr/bin/env bash
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
#        uncommitted-fix      a TRACKED change outside <doc-dir> is uncommitted: the re-entered
#                             review reads committed history (qa-task Step 3b HALTs on it), so
#                             commit the fix and re-run — never resume at 7 over it
#        no-code-moved        no commit outside <doc-dir> since the gate's head: a document-only
#                             fix, for which /finalise at 7 is correct. Untracked files outside
#                             <doc-dir> are NAMED in the message, never a refusal of their own —
#                             Step 4 restores the files it held aside, so the measure cannot tell
#                             one of those from a new fix file; the operator, who can, decides
#      Each reason's route (resume at 7 / commit and re-run) is stated once, in the resume
#      contract's refusal list.
#      The reasons are printed as `reenter-qa: refused (<reason>) — …`. The resume contract
#      lists the same set; evals/shared/tests/reenter-qa-refusals-parity.test.mjs holds the two
#      equal.
#   2. MEASURES code movement as COMMITTED history, because that is what the re-entered review reads
#      (qa-task Step 3b scopes from commits and HALTs on an uncommitted tracked change): commits since
#      the gate's `head:` outside <doc-dir>; a head that is absent, not 40-hex, not a commit or not an
#      ancestor of HEAD counts as moved. Uncommitted work is not movement — it is refused
#      (uncommitted-fix), because it can neither be reviewed nor safely left for /finalise. Untracked
#      files are never counted and never refused: after Step 4 restores the files it held aside an
#      untracked file is the normal state of a branch, and no measure here can tell one of those from
#      a new fix file — so they are named on every outcome, and the operator decides (task.170 QA
#      cycle 4, CR-2). .claude/state, the pipeline's scratch, is never counted.
#   3. RESTORES through `advance-pipeline-lock.sh --restore <doc-dir>` (the one restore path,
#      which consumes the snapshot) and then, in ONE atomic write (mktemp + mv beside the lock):
#        current_step = 5, qa_phase = "5a",
#        qa_max_cycles = max(existing, base + 2) — an absent budget counts as the loop's default 5
#          (its `.qa_max_cycles // 5` read), so a re-entry never lowers the budget the loop would
#          have used (task.170 QA cycle 2, CR-4); base reconstructed as grant-qa-cycles.sh
#          does: max(highest gate via qa-cycle.sh, `### QA Cycle` entries in the report); 2 is
#          the grant prompt's recommended k; an existing higher budget is kept, never lowered,
#        qa_reentry = {from_step: 7, reason: "dod-gaps-code-fix", at, gate_head, report_entries}.
#      report_entries — the number of `### QA Cycle` headings the report holds at re-entry ONCE THE
#      RESUME HAS BACK-FILLED it, i.e. max(highest gate, headings), the same BASE the budget uses — is
#      what the resume contract's re-entry precedence keys on: while the report holds no more headings
#      than that, its last entry's verdict predates the re-entry. A COUNT, because the re-entered cycle
#      is guaranteed to add one heading whatever its number (entries are gate-numbered — task.170 QA
#      cycle 4, CR-3); the BACK-FILLED count, because the resume's reconstruction adds a heading for
#      every gate without one, and a raw count let that back-fill clear the rule before any re-entered
#      cycle ran (QA cycle 5, CR-1).
#      A failed write after the restore KEEPS the restored step-7 lock: the snapshot is consumed,
#      so the lock is the run's only state, and a lock at 7 is a resumable one (the grant's
#      undo_restore rule). No temp file is left behind on any path.
#
# Usage:
#   bash .agents/skills/{develop-story|develop-task}/references/reenter-qa-after-finalise.sh <doc-dir> <implementation-report>
#
# The report is REQUIRED: report_entries is read from it, and without it the resume precedence would
# have nothing to key on.
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
  echo "Usage: reenter-qa-after-finalise.sh <doc-dir> <implementation-report>   (run from the repository root)" >&2
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
[ -n "$REPORT" ] || usage
if [ ! -f "$REPORT" ]; then
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
# lookup on the stem, TASK-125-BUG-8). The stem is READ from the DoD files themselves rather than
# parsed from the directory name: a regex over the name has to know every numbering shape — a
# parallel story.305.1-1, a sub-story story.309.2.3A — and cycles 2 and 3 each found one it missed.
# A DoD's stem is the text before its first .dod.; it is the work item's when the directory name
# continues it with a "." — so task.42 never matches task.420.*, and a co-located bug's stem
# (task.42.bug.3) is never one the parent's directory name continues. The longest such stem wins.
STEM=$(find "$DOC_DIR" -maxdepth 1 -type f -name '*.dod.*.md' 2>/dev/null | while IFS= read -r f; do
  b=${f##*/}; p=${b%%.dod.*}
  # The leading ( is load-bearing: bash 3.2 (macOS /bin/bash) cannot parse an unparenthesised
  # case pattern inside $(...) and fails at ";;" (task.170 finalise, DoD gap 1).
  case "$(basename "$DOC_DIR")." in ("$p".*) printf '%s\n' "$p" ;; esac
done | awk '{ print length, $0 }' | sort -rn | head -1 | cut -d' ' -f2-)
[ -n "$STEM" ] || refuse no-dod "no DoD file in '$DOC_DIR' whose stem the directory name continues (bug DoDs excluded) — a step-7 halt with no DoD file is not a DoD-gaps halt"
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

# ── 2. Movement, measured as committed history ───────────────────────────────
# Uncommitted tracked work outside the work item is refused first, whatever else moved: the
# re-entered review cannot read it (qa-task Step 3b HALTs on it), and /finalise must not run over it.
DIRTY=$(git status --porcelain --untracked-files=no -- . ":(exclude)$DOC_DIR" ":(exclude).claude/state" 2>/dev/null)
[ -z "$DIRTY" ] || refuse uncommitted-fix "uncommitted changes outside '$DOC_DIR' — commit the fix, then re-run this script (the re-entered review reads committed history; do NOT resume at step 7 over them): $(printf '%s' "$DIRTY" | tr '\n' ' ')"
UNTRACKED=$(git ls-files --others --exclude-standard -- . ":(exclude)$DOC_DIR" ":(exclude).claude/state" 2>/dev/null)
GATE_HEAD=$(grep -E '^head:' "$GATE" 2>/dev/null | head -1 | sed -E "s/^head:[[:space:]]*//; s/[[:space:]]+#.*$//; s/['\"]//g; s/[[:space:]]*$//")
if [ -z "$GATE_HEAD" ]; then
  MOVED=1; WHY_MOVED="the gate carries no head: (schema 1) — it cannot vouch for the present tree"
elif ! { printf '%s' "$GATE_HEAD" | grep -qE '^[0-9a-f]{40}$' \
         && git cat-file -e "${GATE_HEAD}^{commit}" 2>/dev/null \
         && git merge-base --is-ancestor "$GATE_HEAD" HEAD 2>/dev/null; }; then
  MOVED=1; WHY_MOVED="the gate head '$GATE_HEAD' is not a 40-hex commit on this branch"
else
  MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- . ":(exclude)$DOC_DIR" 2>/dev/null || echo 1)
  WHY_MOVED="$MOVED commit(s) outside '$DOC_DIR' since the gate's head ${GATE_HEAD:0:12}"
fi
# Untracked files are named, never counted and never refused (task.170 QA cycle 4, CR-2): Step 4
# restores the files it held aside, so an untracked file is the normal state of a branch, and nothing
# here can tell one of those from a new fix file. Naming them on both outcomes hands that one
# judgement to the operator, who can make it, instead of a rule that is wrong in one direction.
UNTRACKED_NOTE=""
[ -z "$UNTRACKED" ] || UNTRACKED_NOTE=" Untracked files outside '$DOC_DIR' (not read by any review — if one is part of the fix, commit it and run this script again): $(printf '%s' "$UNTRACKED" | tr '\n' ' ')"
[ "$MOVED" -gt 0 ] 2>/dev/null || refuse no-code-moved "nothing outside '$DOC_DIR' was committed since the gate's head ${GATE_HEAD:0:12} — a document-only fix; resume at step 7 with advance-pipeline-lock.sh --restore and re-run /finalise.$UNTRACKED_NOTE"
[ -z "$UNTRACKED_NOTE" ] || echo "reenter-qa:$UNTRACKED_NOTE" >&2

# ── 3. Budget base, as grant-qa-cycles.sh reconstructs it ────────────────────
# max(highest gate — BASE, read above — , `### QA Cycle` entries in the report).
# `|| true`, not `|| echo 0`: grep -c prints 0 AND exits 1 on no match.
DONE=$(grep -c '^### QA Cycle' "$REPORT" 2>/dev/null || true)
DONE=${DONE:-0}
[ "$DONE" -gt "$BASE" ] 2>/dev/null && BASE="$DONE"

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
if ! jq --argjson base "$BASE" --argjson entries "$BASE" --arg now "$NOW" --arg head "$GATE_HEAD" '
       .current_step = 5
       | .qa_phase = "5a"
       | .qa_max_cycles = ([((.qa_max_cycles // 5) | tonumber? // 5), ($base + 2)] | max)
       | .qa_reentry = {from_step: 7, reason: "dod-gaps-code-fix", at: $now, gate_head: $head, report_entries: $entries}' \
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
