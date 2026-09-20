---
id: task.130.plan
title: "Implementation Plan: resume residue — bug-variant base, dispatch population, self-reported delete, who-restores enumeration"
type: plan
task-ref: task.130.resume-residue-bug-variant-base-and-who-restores.md
---

# Implementation Plan: resume residue from task.124

> Requirements and success criteria: [task.130.resume-residue-bug-variant-base-and-who-restores.md](task.130.resume-residue-bug-variant-base-and-who-restores.md)

## Overview

Five small phases on the merged task.124 surface; every phase is a one-file edit plus a test that goes red when the edit is reverted. Phases 1, 3 and 4 all edit the resume contract — land them in that order, one PR.

## Phase-by-Phase Implementation Guide

### Phase 1: Probe base — bug variant, HALT, label by cause

**Files to modify:**
- `shared/resources/develop-pipeline-resume-contract.md` — the `BASE_BRANCH=` block under `if [ -n "$DIRTY" ]; then` (search anchor: `The base is RECORDED STATE`)

**Exact changes:**

```bash
GH_ERR=$(mktemp); BASE_BRANCH=$(gh pr view --json baseRefName -q .baseRefName 2>"$GH_ERR"); GH_RC=$?
[ -n "$BASE_BRANCH" ] || BASE_BRANCH=$(sed -nE 's/^\| *Feature branch base *\| *`?([^ |`]+).*/\1/p' \
  {implementation-report-path} 2>/dev/null | head -1)
# The BUG-variant report records the base on one line, not in a table row
# (implementation-report-template.md § bug variant) — PR #436 review CR-1.
[ -n "$BASE_BRANCH" ] || BASE_BRANCH=$(sed -nE 's/^\*\*Branch model:\*\*.*\(base: *`?([^,) `]+).*/\1/p' \
  {implementation-report-path} 2>/dev/null | head -1)
if [ -z "$BASE_BRANCH" ]; then
  if [ "$GH_RC" -ne 0 ]; then echo "probe: gh pr view failed: $(head -1 "$GH_ERR")" >&2; else echo "probe: no PR on this branch" >&2; fi
  echo "HALT: cannot bind the probe base — no PR, and {implementation-report-path} carries neither a '| Feature branch base |' row nor a '**Branch model:** … (base: X' line; add the row and re-invoke. Nothing was discarded."; rm -f "$GH_ERR"; exit 1
fi
rm -f "$GH_ERR"; BASE_REF="origin/$BASE_BRANCH"
```

Update the Cost sentence ("one `gh pr view` (or up to two `sed` passes over the report)") and the (a)/(c) table's row (c): "an unbindable base — the whole tree is (c)".

**The proof is an executed test, not a recording** (review 1, Q2). New `shared/resources/tests/probe-base-binding.test.mjs`:

- Extract the `BASE_BRANCH=` block from `develop-pipeline-resume-contract.md` — the fenced block containing the `The base is RECORDED STATE` anchor, cut from `BASE_BRANCH=$(gh pr view` to `BASE_REF="origin/$BASE_BRANCH"` (the same extraction `qa-execute-snippets.mjs` performs; reuse its helper if exported).
- Run it under `bash` and `zsh` in a temp dir with a stub `gh` on `PATH` (one variant exits 1 with a stderr line, one exits 0 printing nothing) and `{implementation-report-path}` substituted with each of three fixtures under `shared/resources/tests/fixtures/probe-base/`:
  - `table-row.md` — a task-variant report with `| Feature branch base | develop |` → `BASE_BRANCH=develop`
  - `branch-model-line.md` — a bug-variant report with `**Branch model:** hotfix (base: main, PR target: main)` → `BASE_BRANCH=main`
  - `neither.md` — neither shape → exit 1; stdout contains `HALT: cannot bind the probe base` and both shape names; stderr contains `gh pr view failed:` under the failing stub and `no PR on this branch` under the empty one
- Assert no `git checkout` token in any transcript.
- Mutation proofs (record as `mutation-proven:` lines): delete the `**Branch model:**` arm → the `main` case red; restore `BASE_BRANCH=develop` as the fallback → the `neither` case red.

Fixture `evals/develop-task/step-isolation/17-resume-no-base-row-halts/`: copy 13's shape; a **develop-task** run (a develop-bug scenario has no runner — there is no `evals/develop-bug`) whose recorded implementation report predates the `Feature branch base` row and whose scenario has no PR → assertions: `fileMatches` on the HALT text naming both shapes, `fileDoesNotMatch` on `git checkout HEAD`, `fileDoesNotMatch` on `overlay discarded`. This documents Breaking Change 1 end to end; it cannot go red on a revert (it is a recording), which is why the unit test above exists.

### Phase 2: develop-bug dispatch mark + population pattern

**Files to modify:**
- `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` step 3 (line 18) — append, after "via a read-only Explore subagent (…)": `— marking the wait on the lock beside the dispatch (`bash .agents/skills/develop-bug/references/set-waiting-on.sh "step-3 root-cause localisation"`) and clearing it (`… --clear`) once the summary is read (task.130)`. The file is **not** bundled (no `AUTO-GENERATED` header; no `shared/resources/` source) — edit it in place.
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` — the `DISPATCH` constant (line 190; its regex is `subagent_type=|\bdispatch(?:es|ed)?\s+(?:an?|four|both|the|two)\s+…\b(?:subagents?|lenses|mapper)\b|run_in_background|gh pr checks --watch`, case-insensitive; `EXEMPT` is line 191): add alternatives `via a read-only Explore subagent`, `Explore subagent \(`, `Agent\(subagent_type`. **Do not touch the population list** — `listDir("skills/develop-bug/references", /^develop-bug-step-[1-9].*\.md$/)` (line 214) already enumerates the file; hand-adding it is the list this test was built to avoid (task.124 bug 3). Add instead a non-vacuity assertion: at least one line of `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` matches `DISPATCH` and not `EXEMPT`. Raise the `sites >= 12` floor (line 242) to the measured count.

**Mutation proofs**: remove the mark → the test names the develop-bug file as unmarked; narrow the regex back to its current form → the non-vacuity assertion red.

### Phase 3: stale-snapshot delete in the orchestrator

**Files to modify:**
- `shared/resources/pipeline-resume-detector-prompt.md` § Step 1 item 2 (line 85) — replace "**delete the file** (`rm -f` — the one write this read-only prompt makes …)" with "report it in `deltas_since_pause` as `{ "path": "<snapshot path>", "concern": "stale-snapshot: PR merged" }` — the object's existing fields (§ `deltas_since_pause` object fields), so the orchestrator can select on `concern` and read `path` — and **do not delete it**: the orchestrator deletes and verifies (resume contract § Consume Output)". Update the Invocation Context's "Read-only — with one named exception" (line 220) to plain read-only, and the decision-table row (line 211) from "reported as `stale-snapshot`, deleted" to "reported as `stale-snapshot`; the orchestrator deletes".
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — **the one statement of the delete** — add:

```bash
# Every `stale-snapshot` delta names a snapshot the detector proved belongs to a MERGED run.
# The detector is read-only; THIS is where it is deleted, one path per rm, and re-read afterwards.
printf '%s' "$DETECTOR_JSON" \
  | jq -r '.deltas_since_pause[] | select(.concern | startswith("stale-snapshot")) | .path' \
  | while IFS= read -r p; do
      rm -f "$p"
      [ ! -f "$p" ] || { echo "HALT: stale snapshot $p survived deletion — remove it by hand and re-invoke"; exit 1; }
    done
```
- `skills/develop-{task,story,bug}/SKILL.md` Step 0a — one sentence each: "Stale snapshots the detector reports are deleted **here**, by the orchestrator, and verified absent before Phase 0b — the loop is the resume contract § Consume Output; do not copy it." Three copies of the loop would be the enumeration this task removes.
- Fixture 16 (`16-resume-stale-snapshot-after-merge-deleted/`): re-record `replay/.eval/detector-output.json` with the object shape (the current recording says `stale-snapshot: … PR merged; deleted`); replace the `"PR merged; deleted"` assertion with `fileMatches` on `"concern": "stale-snapshot: PR merged"` and `fileDoesNotMatch` on `deleted`; keep `fileAbsent` on the snapshot; add an event after `resume-detector` in `pipeline-events.json` for the orchestrator's delete and assert it with `pipelineStepsRan` (or the transcript line order, whichever the runner exposes).

### Phase 4: one statement of who restores

**Files to modify:**
- `shared/resources/develop-pipeline-resume-contract.md` § "Restoring the lock — on either resume path" (Phase 0b) — replace the paragraph's rule text with: "Who restores, and when, is stated once — **Restore the lock (both resume paths)** under Phase 0a — and this paragraph only points at it. When that section says the command runs here, run:" + the fenced `--restore` command.
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0b — the sentence beginning "**Restore the lock before anything advances it**": keep the command; replace the `halt_reason` clause with "(which snapshots restore here and which wait for the grant: resume contract § Restore the lock (both resume paths))".
- `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock — same replacement; develop-bug's "no re-entry grant" sentence (develop-bug `SKILL.md:69`) moves into the one statement's develop-bug bullet (already there since task.124 cycle 5 — delete the SKILL.md copy). Leave the **Re-entry after a QA loop escalation** paragraphs (develop-task `:304`, develop-story `:317`) and contract § Re-entry step 3 (`:350`) alone — they carry `loop-limit|not-converging` for the grant-offer rule, not for who-restores.
- Mark the one statement: the first line under `### Restore the lock (both resume paths)` becomes `<!-- who-restores: statement -->`.
- New `shared/resources/tests/who-restores-single-statement.test.mjs` (review 1, Q1 — **keyed on the marker, not the token**: the token is shared with the grant-offer rule, and develop-bug's restatement has no token):

```js
const MARKER   = /<!-- who-restores: statement -->/;
const CITATION = /Restore the lock \(both resume paths\)/;
// A line is rule text when a restore verb and a discriminator share it.
const RESTORE_VERB  = /\b(restore|restores|restoring|runs the command)\b/i;
const DISCRIMINATOR = /loop-limit\|not-converging|no re-entry grant/;
// (i) exactly one marker across shared/resources/**/*.md + skills/develop-*/SKILL.md — assert === 1, not <= 1
// (ii) the five citation sites — contract § "Restoring the lock — on either resume path", step-0 §0b's
//      "Restore the lock before anything advances it" paragraph, and each SKILL.md's Step 0-lock paragraph —
//      contain no line matching RESTORE_VERB && DISCRIMINATOR
// (iii) each of the five sites contains CITATION
// Sites are located by heading/bold-lead anchor, not by line number; the contract's Re-entry section and the
// SKILL.md Re-entry paragraphs are outside every checked site by construction.
```

**Mutation proofs**: remove the marker → (i) red; paste the old Phase 0b sentence back → (ii) red on the contract; paste develop-bug's "`develop-bug` has **no re-entry grant** — …" sentence back → (ii) red on develop-bug (the token-free case a `PHRASE`-keyed test would have passed).

### Phase 5: gate-6 futures

**Files to modify:**
- `shared/resources/advance-pipeline-lock.sh` — factor candidate selection into `choose_candidate()`; add `--restore --which <dir>` (prints the chosen path, no writes, exit 1 on none) and `--accept-legacy` (a snapshot with no `task_or_story_directory` is refused with `reason: legacy-snapshot` unless passed).
- `shared/resources/grant-qa-cycles.sh` (search anchor: `read_budget "$SNAPSHOT"`) — `CHOSEN=$(bash "$ADVANCE" --restore --which "$DOC_DIR") || { … existing no-snapshot message … }; CURRENT=$(read_budget "$CHOSEN")`.
- `shared/resources/develop-pipeline-step-8-commit.md` § Cleanup (line 104, `SNAP_DIR=$(jq -r '.task_or_story_directory // ""' …)`) — after the same-document branch, a **glob-safe** count (never `ls <path> <glob> | wc -l`: zsh aborts the whole `ls` on an unmatched glob and the count reads 0 — `docs/reference/anti-patterns.md` § "Never put a must-succeed path and a glob in one `rm` argv"):

```bash
elif [ -z "$SNAP_DIR" ]; then
  # A snapshot with no directory predates task.123 and can belong to no run that will resume it.
  # Delete it only when it is the sole candidate on disk. Count with a loop: an unmatched glob
  # aborts `ls` under zsh, and `| wc -l` would then read 0 (anti-patterns § glob argv).
  n=0
  for f in .claude/state/develop-pipeline.last-halt.json .claude/state/develop-pipeline.lock.pausing.*; do
    [ -e "$f" ] && n=$((n + 1))
  done
  [ "$n" -eq 1 ] && rm -f "$SNAPSHOT" && echo "legacy snapshot (no directory) removed"
fi
```
  Add this fence to `halt-snippet-glob-safe.test.mjs`'s population if step-8 is not already scanned; it runs the snippet under both shells with an empty glob.
- Lint call sites — capture `rc=$?` before the `case` (inside a `*)` arm `$?` no longer names the linter's exit):
  - **Sites (1) and (4)** — Step Transition action 2 in the three SKILL.md (`develop-task:136`, `develop-story:143`, `develop-bug:127`) and step-8 (`:34`) — fenced, HALTing; replace `|| { echo "HALT: …"; exit 1; }` with

```bash
command node …/report-lint.js --file "$REPORT" --json; rc=$?
case $rc in
  0) ;;
  1) echo "HALT: report failed lint — repair $REPORT by hand (see the problems above)"; exit 1 ;;
  2) echo "HALT: report-lint usage error — the call site is wrong, not the report"; exit 1 ;;
  *) echo "HALT: report-lint.js not runnable (rc $rc) — check the bundled path"; exit 1 ;;
esac
```
  - **Site (2)** — the HALT rule's "Commit the report before any halt" bullet (`develop-task:285`, `develop-story:298`, `develop-bug:294`) is a **one-line inline call that warns and continues** (the snapshot and lock removal must still run). Keep it one line and warn-only: `command node …/report-lint.js --file "{implementation-report-path}" --json; rc=$?; case $rc in 0) ;; 1) echo "⚠️ report failed lint — HALT commit skipped; repair by hand" ;; 2) echo "⚠️ report-lint usage error — call site wrong, not the report" ;; *) echo "⚠️ report-lint.js not runnable (rc $rc)" ;; esac` — same three messages, no `exit`.
  - The PreCompact hook's site (3) is shell (`develop-pipeline-on-precompact.sh:202`) with its own tests and is out of scope here.
- Tests: `advance-pipeline-lock.test.sh` scenarios for `--which` (equals the path `--restore` consumes on the same fixture; exit 1 on none; tree untouched) and legacy refusal/acceptance; `grant-qa-cycles.test.sh` scenario: newer `.pausing.*` claim with a higher budget → guard refuses a lower `k` from the claim's budget, not the snapshot's.

## Key Patterns and References

- Candidate selection and the canonical-directory match live in `advance-pipeline-lock.sh` (task.124 Phase 4); `--which` must call the same function, never re-derive.
- Population tests derive from directories, never hand lists (task.124 bug 3; `qa-loop-lock-fields-parity.test.mjs`).
- Single-statement tests: `tests/mutation-call-site-coverage.test.js` (allowlist + floor shape).
- Mutation proving: `shared/resources/mutation-proving.md` — cp snapshot/restore, name the test before running.

## Testing Approach

- Per phase: the named test red on revert, green on fix, recorded as `mutation-proven:` lines in the QA report.
- Step 4b (`qa-execute-snippets.mjs --copy <seed>`) over the contract, the detector prompt and develop-bug step 3 under bash and zsh.
- `npm run ci:fast`, `npm run eval:develop-task`, `npm run bundle:check`, `npm run lint:shell`.
