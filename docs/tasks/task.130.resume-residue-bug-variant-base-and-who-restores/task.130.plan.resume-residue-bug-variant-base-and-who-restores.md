---
id: task.130.plan
title: "Implementation Plan: resume residue — bug-variant base, dispatch population, self-reported delete, who-restores enumeration"
type: plan
task-ref: task.130.resume-residue-bug-variant-base-and-who-restores.md
---

# Implementation Plan: resume residue from task.124

> Requirements and success criteria: [task.130.resume-residue-bug-variant-base-and-who-restores.md](task.130.resume-residue-bug-variant-base-and-who-restores.md)

## Overview

Five small phases on the merged task.124 surface; every phase is a one-file edit plus a test that goes red when the edit is reverted. Land Phase 1 before Phase 4 (both edit the resume contract).

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

Fixture `evals/develop-task/step-isolation/17-resume-bug-hotfix-base-main/`: copy 13's shape; a bug-variant report with `**Branch model:** hotfix (base: main, PR target: main)`, no PR in the scenario, a dirty tracked file whose bytes equal `origin/develop`'s copy but differ from `origin/main`'s → assertion: class (c), HALT, no `git checkout HEAD` line.

### Phase 2: develop-bug dispatch mark + population pattern

**Files to modify:**
- `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` step 3 — append, after "via a read-only Explore subagent (…)": `— marking the wait on the lock beside the dispatch (`bash .agents/skills/develop-bug/references/set-waiting-on.sh "step-3 root-cause localisation"`) and clearing it (`… --clear`) once the summary is read (task.130)`. Source is `shared/resources/develop-bug-step-3-investigate-fix.md` if the file is bundled — check with `grep -l AUTO-GENERATED`.
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` — the `DISPATCH_PATTERN` (search anchor: the case-insensitive regex that lists `dispatch an Explore subagent`): add alternatives `via a read-only Explore subagent`, `Explore subagent \(`, `Agent\(subagent_type`; add `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` to the expected-population list; raise the floor from 12 to the measured count.

**Mutation proof**: remove the mark → the test names the develop-bug file as unmarked.

### Phase 3: stale-snapshot delete in the orchestrator

**Files to modify:**
- `shared/resources/pipeline-resume-detector-prompt.md` § Step 1 item 2 — replace "**delete the file** (`rm -f` — the one write this read-only prompt makes …)" with "report it as `stale-snapshot: <path> — PR merged` and **do not delete it**: the orchestrator deletes and verifies (resume contract § Consume Output)". Update the Invocation Context's "Read-only — with one named exception" to plain read-only, and the decision table row.
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — add:

```bash
# Every `stale-snapshot:` delta names a snapshot the detector proved belongs to a MERGED run.
# The detector is read-only; THIS is where it is deleted, and it is re-read afterwards.
for p in $(printf '%s' "$DETECTOR_JSON" | jq -r '.deltas_since_pause[] | select(.concern | startswith("stale-snapshot:")) | .path'); do
  rm -f "$p"; [ ! -f "$p" ] || { echo "HALT: stale snapshot $p survived deletion"; exit 1; }
done
```
- Fixture 16: assert the `rm -f` appears in the orchestrator's transcript after the detector returns, and the file is absent.

### Phase 4: one statement of who restores

**Files to modify:**
- `shared/resources/develop-pipeline-resume-contract.md` § "Restoring the lock — on either resume path" (Phase 0b) — replace the paragraph's rule text with: "Who restores, and when, is stated once — **Restore the lock (both resume paths)** under Phase 0a — and this paragraph only points at it. When that section says the command runs here, run:" + the fenced `--restore` command.
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0b — the sentence beginning "**Restore the lock before anything advances it**": keep the command; replace the `halt_reason` clause with "(which snapshots restore here and which wait for the grant: resume contract § Restore the lock (both resume paths))".
- `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock — same replacement; develop-bug's "no re-entry grant" sentence moves into the one statement's develop-bug bullet (already there since task.124 cycle 5 — delete the SKILL.md copy).
- New `shared/resources/tests/who-restores-single-statement.test.mjs`:

```js
// exactly one section of the contract contains the phrase; every other file that mentions it does so on a citation line
const PHRASE = /loop-limit\|not-converging/;
const CITATION = /Restore the lock \(both resume paths\)/;
// contract: count H3 sections containing PHRASE === 1 (non-vacuity: assert === 1, not <= 1)
// each of step-0 and the three SKILL.md: every line matching PHRASE also matches CITATION
```

**Mutation proof**: paste the old Phase 0b sentence back → red.

### Phase 5: gate-6 futures

**Files to modify:**
- `shared/resources/advance-pipeline-lock.sh` — factor candidate selection into `choose_candidate()`; add `--restore --which <dir>` (prints the chosen path, no writes, exit 1 on none) and `--accept-legacy` (a snapshot with no `task_or_story_directory` is refused with `reason: legacy-snapshot` unless passed).
- `shared/resources/grant-qa-cycles.sh` (search anchor: `read_budget "$SNAPSHOT"`) — `CHOSEN=$(bash "$ADVANCE" --restore --which "$DOC_DIR") || { … existing no-snapshot message … }; CURRENT=$(read_budget "$CHOSEN")`.
- `shared/resources/develop-pipeline-step-8-commit.md` § Cleanup — after the same-document branch: `elif [ -z "$SNAP_DIR" ] && [ "$(ls .claude/state/develop-pipeline.last-halt.json .claude/state/develop-pipeline.lock.pausing.* 2>/dev/null | wc -l)" -eq 1 ]; then rm -f "$SNAPSHOT" && echo "legacy snapshot (no directory) removed"`.
- Lint call sites (Step Transition action 2 in the three SKILL.md; HALT rule; step-8): replace `|| { echo "HALT: …"; exit 1; }` with

```bash
command node …/report-lint.js --file "$REPORT" --json; case $? in
  0) ;;
  1) echo "HALT: report failed lint — repair by hand"; exit 1 ;;
  2) echo "HALT: report-lint usage error — the call site is wrong, not the report"; exit 1 ;;
  *) echo "HALT: report-lint.js not runnable (rc $?) — check the bundled path"; exit 1 ;;
esac
```
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
