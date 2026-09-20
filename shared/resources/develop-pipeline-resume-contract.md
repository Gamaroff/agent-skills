---
name: develop-pipeline-resume-contract
description: Resume verification contract shared by develop-story and develop-task. Covers per-step artifact verification, plan freshness check, MAX_ITER=5 stall semantics, QA cycle count reconstruction, and branch/PR cross-check. File naming patterns differ between story and task — both listed. Step 8 push command is a normal-flow concern (not a resume concern); it lives inline in each SKILL.md under the `### Step 8: Commit Changes` section.
---

# Develop Pipeline — Resume Verification Contract

## When This Contract Applies

This contract is invoked during Phase 0 of `/develop-story` or `/develop-task` when resuming a previous pipeline run. Phase 0a (stale-context detector) runs first; Phase 0b (artifact verification) uses its output to narrow the verification scope.

---

## Phase 0a — Stale-Context Detector Dispatch

Dispatch a **read-only Explore subagent** using the prompt in `shared/resources/pipeline-resume-detector-prompt.md`. The subagent reads the lock file, lists step summaries, and diffs artifact mtimes — returning `recommended_step`, `deltas_since_pause`, and `blocking_issues`. The orchestrator never re-reads raw artifacts itself; the subagent does the reading.

### Dispatch

```
Dispatch Explore subagent with the full content of shared/resources/pipeline-resume-detector-prompt.md as its prompt.
Pass task_or_story_directory from the lock file as context.
```

### Consume Output

Parse the JSON result:

```bash
# Validate schema
jq -e '.schema_version == 1 and (.recommended_step | type == "number") and (.blocking_issues | type == "array")' <output>
```

If validation fails (parse error or missing required fields): log `"⚠️ Detector output invalid — falling back to full Phase 0b verification"` and proceed to Phase 0b using `current_step` from the lock as the upper bound (treat all steps as unverified).

**Delete what the detector proved stale — here, once, and verified.** The detector is read-only;
when it finds a `last-halt.json` for this document whose PR is `MERGED` it reports the file as a
`deltas_since_pause` object whose `concern` starts `stale-snapshot` and whose `path` names it, and
leaves the file in place (detector prompt, Step 1 item 2). This is the **one** statement of the
delete — the three orchestrators cite this section and carry no copy of the loop (task.130,
PR #436 review CR-3; a subagent that self-reports a delete it may not perform, and three
orchestrator copies of the rm, are two shapes of the same enumeration). Run it before Phase 0b:

```bash
# Every `stale-snapshot` delta names a snapshot the detector proved belongs to a MERGED run.
# The detector is read-only; THIS is where it is deleted, one path per rm, and re-read afterwards.
#
# Fail CLOSED on a broken input (task.130 QA cycle 1, bug 2): an unbound DETECTOR_JSON, a
# `deltas_since_pause` that is not an array, or a jq failure must HALT — behind a bare process
# substitution all three emitted nothing and the block exited 0 with the snapshot still on
# disk, so "no stale snapshot" and "the reader is broken" reported one value. The list is
# materialised first, with jq's exit read; `(.concern // "")` makes a delta with no concern a
# non-match rather than a jq abort.
# (No apostrophe in the :? message — bash parses the word for quotes even inside "…".)
: "${DETECTOR_JSON:?HALT: DETECTOR_JSON is unbound — bind the validated detector output before this block}"
# `jq -r`, not `-e`: -e exits 4 on an EMPTY result, and no stale snapshot is the ordinary case.
# A parse failure (exit 2) or the error() below (exit 5) still fails the assignment.
STALE_PATHS=$(printf '%s' "$DETECTOR_JSON" \
  | jq -r 'if (.deltas_since_pause | type) != "array" then error("deltas_since_pause is not an array") else
           [ .deltas_since_pause[] | select((.concern // "") | startswith("stale-snapshot")) | .path ] | .[] end' 2>&1) \
  || { echo "HALT: could not read stale-snapshot deltas from the detector output — $STALE_PATHS"; exit 1; }
# The loop body runs in THIS shell (here-string, not a pipe): under bash a piped `while` body is
# a subshell, and its `exit 1` ended the subshell while the block carried on past the HALT
# (found by executing this block under both shells — stale-snapshot-delete.test.mjs, case C).
while IFS= read -r p; do
  [ -n "$p" ] || continue
  rm -f "$p"
  [ ! -f "$p" ] || { echo "HALT: stale snapshot $p survived deletion — remove it by hand and re-invoke"; exit 1; }
done <<< "$STALE_PATHS"
```

`$DETECTOR_JSON` is the detector's validated output (the `<output>` the schema check above read).
The re-read is the point: a delete that is reported and not verified is the failure mode this
section replaces, one layer up.

### Surface Results to User

Always surface the detector output before proceeding, in this format:

```
⚙️ Resume detector result
  Recommended step:   {recommended_step}
  Lock step:          {current_step_in_lock}
  Summaries seen:     {summaries_seen | join(", ") or "none"}
  Deltas since pause: {N} — {paths or "none"}
  Blocking issues:    {blocking_issues | join("; ") or "none"}
```

Wait for user confirmation before proceeding to Phase 0b. If the user disputes `recommended_step`, accept their correction and record it in the Decisions Log.

### Handle Blocking Issues

If `blocking_issues` is non-empty: **HALT** — display each issue to the user and require manual resolution before resuming. Do not proceed to Phase 0b.

### Restore the lock (both resume paths)

<!-- who-restores: statement -->

When `source` is `halt_snapshot` or `orphaned_claim` and the operator chooses Resume, the lock does
not exist — a HALT or pause removed it, and a resume skips Step 1, its only ordinary writer. **Who
restores depends on the snapshot's `halt_reason`** (task.124 QA cycle 3, CR-1):

- `halt_reason` matches `loop-limit|not-converging` **in `develop-task` or `develop-story`** →
  **do not restore here.** The Phase 0b prompt is the grant prompt (**Re-entry after a QA loop
  escalation**, below), and `grant-qa-cycles.sh` restores through `--restore` **only after its
  never-lower guard passes**. A declined or refused grant therefore restores nothing and consumes
  nothing — the task.123 CR-1 rule — and the run returns to the halt message's own three options
  with the snapshot still on disk. **`develop-bug` has no grant prompt**: its verify loop's
  limit HALT is escalated, not re-entered, so a `develop-bug` snapshot takes the next bullet
  whatever its `halt_reason` reads (task.124 QA cycle 5, CR-1 — an earlier revision stated this
  bullet for all three pipelines while develop-bug's own Step 0-lock said the opposite).
- any other `halt_reason`, or a PreCompact `pause_reason`, or **any `develop-bug` snapshot** → run
  `advance-pipeline-lock.sh --restore {doc-directory}` **here**, before Phase 0b, on the
  re-invocation path exactly as the in-session continuation does (QA cycle 2, CR-2; the step-0
  doc's Shared Resume Logic states the call).

A numeric advance with no lock is an error, so a resume that skips whichever of these applies
fails at its first transition.

### Narrow Phase 0b Scope

Pass `recommended_step` to Phase 0b. Phase 0b only verifies artifacts for steps **up to `recommended_step - 1`** (i.e., steps the detector considers completed). Steps at or after `recommended_step` are treated as ⏳ Pending.

---

## Phase 0b — Resume Artifact Verification (CRITICAL)

### Working-tree probe — before any artifact is trusted (task.124, obs #85)

A resume inherits whatever the working tree holds, and the pipeline's own steps assume a clean
tree: Step 3's `/develop` commits with `git add -u`, Step 8's `/commit-changes --scope` sweeps the
work-item directory, and every `✅` verification below reads files that an uncommitted overlay may
have rewritten. On task.116 a resume inherited a dirty tree unseen and an overlay reverted every
bundled copy the run had produced. So the probe runs **first**, and it **classifies every
`git status --porcelain` entry before acting, and acts only on the classified paths**:

| Class | What it is | Action |
| --- | --- | --- |
| **(a) overlay** | every entry is byte-identical to the base branch — a tracked file whose content equals `$BASE_REF`'s, or an untracked file the base **has** with the same bytes (a stray checkout/copy, not work) | discard, path by path, **from `HEAD` into both the index and the working tree**: `git checkout HEAD -- <tracked paths>`, `git clean -f -- <untracked paths>`; then re-read the **full** `git status --porcelain --no-renames` and HALT if anything remains; list every discarded path in the Decisions Log |
| **(b) bundle drift** | every entry is under `skills/*/references/` — bundled copies out of date with their sources | `npm run bundle -- --check \|\| npm run bundle`, then continue |
| **(c) anything else** | an entry the probe cannot classify — real uncommitted work, an untracked file the base does not have, a mix; and an **unbindable base** (no PR, no report row, no `**Branch model:**` line), which makes the whole tree (c) | **HALT**: print the entries and stop. A resume that guesses here is the task.116 overlay again |

```bash
# `--no-renames`: a staged rename would otherwise print as one `R  old -> new` entry whose
# "path" is the whole arrow expression — a pathspec that matches nothing, is quiet under `git
# diff`, and is "discarded" without effect (task.124 QA cycle 2, CR-4). Split, it is a `D` and
# an `A`, each a real path; the `A` is not in the base and so is class (c).
DIRTY=$(git status --porcelain --no-renames)
if [ -n "$DIRTY" ]; then
  # The base is RECORDED STATE, never a bare shell variable with a `develop` default: nothing in
  # any pipeline binds BASE_BRANCH, so `${BASE_BRANCH:-develop}` probed every hotfix off `main`
  # and every epic-integration branch against develop — and the one outcome that deletes bytes,
  # the (a) discard, keyed on that comparison (task.124 QA cycle 5, CR-2). Order: the PR's own
  # base when the branch has one (Steps 4+); else the Q1 answer in the report's Pipeline
  # Configuration row (Steps 1–3); else the bug-variant report's `**Branch model:**` line; else
  # HALT — a base the probe cannot bind is a base it must not guess, because the guess is what
  # the (a) discard compares against (task.130, PR #436 review CR-1).
  GH_ERR=$(mktemp); BASE_BRANCH=$(gh pr view --json baseRefName -q .baseRefName 2>"$GH_ERR"); GH_RC=$?
  [ -n "$BASE_BRANCH" ] || BASE_BRANCH=$(sed -nE 's/^\| *Feature branch base *\| *`?([^ |`]+).*/\1/p' \
    {implementation-report-path} 2>/dev/null | head -1)
  # The BUG-variant report records the base on one line, not in a table row
  # (implementation-report-template.md § Bug variant) — PR #436 review CR-1.
  [ -n "$BASE_BRANCH" ] || BASE_BRANCH=$(sed -nE 's/^\*\*Branch model:\*\*.*\(base: *`?([^,) `]+).*/\1/p' \
    {implementation-report-path} 2>/dev/null | head -1)
  if [ -z "$BASE_BRANCH" ]; then
    # Label the cause on stderr: a failed `gh` and a branch with no PR are different findings —
    # and `gh pr view` exits 1 for BOTH, so the split reads its stderr, not only its status.
    if [ "$GH_RC" -ne 0 ] && ! grep -qi 'no pull requests found' "$GH_ERR"; then
      echo "probe: gh pr view failed: $(head -1 "$GH_ERR")" >&2
    else
      echo "probe: no PR on this branch" >&2
    fi
    echo "HALT: cannot bind the probe base — no PR, and {implementation-report-path} carries neither a '| Feature branch base |' row nor a '**Branch model:** … (base: X' line; add the row and re-invoke. Nothing was discarded."
    rm -f "$GH_ERR"; exit 1
  fi
  rm -f "$GH_ERR"; BASE_REF="origin/$BASE_BRANCH"
  # Classify EVERY entry first; act only on the classified paths (never `checkout -- .`, never a
  # directory-wide `clean`). `git diff <commit> -- <path>` does not see an untracked path, so `??`
  # entries need their own test: base must HAVE the path and the bytes must match.
  TRACKED=(); UNTRACKED=(); OVERLAY=true
  while IFS= read -r line; do
    st=${line:0:2}; p=${line:3}
    # A quoted path (a space, a tab, a non-ASCII byte) is printed with its C-style escapes; the
    # probe does not unescape, so it cannot address the file — class (c), never (a).
    case "$p" in \"*) OVERLAY=false; break ;; esac
    if [ "$st" = "??" ]; then
      if git cat-file -e "$BASE_REF:$p" 2>/dev/null && git show "$BASE_REF:$p" | cmp -s - "$p"; then
        UNTRACKED+=("$p")
      else OVERLAY=false; break; fi
    else
      # The base must HAVE the path: `git diff --quiet` is 0 for a path absent on BOTH sides, so
      # an uncommitted deletion of a file the branch added would otherwise read as "identical
      # to base" and the discard would re-create it (task.124 QA cycle 3, CR-2).
      if git cat-file -e "$BASE_REF:$p" 2>/dev/null && git diff --quiet "$BASE_REF" -- "$p" 2>/dev/null; then TRACKED+=("$p"); else OVERLAY=false; break; fi
    fi
  done <<< "$DIRTY"
  if [ "$OVERLAY" = true ]; then
    # `git checkout HEAD -- <paths>`, never `git checkout -- <paths>`: the bare form restores the
    # WORKING TREE FROM THE INDEX, and a staged overlay (`M ` in the first porcelain column) is
    # in the index — the checkout is a no-op, the entry survives, and the success line below
    # would be printed over nothing discarded (task.124 QA cycle 1, CR-4). Naming HEAD restores
    # index and worktree alike from the branch's own committed state.
    [ ${#TRACKED[@]} -gt 0 ]   && git checkout HEAD -- "${TRACKED[@]}"
    [ ${#UNTRACKED[@]} -gt 0 ] && git clean -f -- "${UNTRACKED[@]}"
    # Re-read the WHOLE tree, not the discarded pathspecs: every entry was classified (a), so
    # after the discard the porcelain must be empty, and a pathspec-filtered re-read would be
    # satisfied vacuously by the very entry a bad pathspec never addressed (QA cycle 2, CR-4).
    # A discard that succeeded and left anything behind is the failure the probe exists to
    # stop, so it is a HALT, not a warning.
    LEFT=$(git status --porcelain --no-renames)
    if [ -n "$LEFT" ]; then
      echo "HALT: overlay discard left entries behind — classify by hand before resuming:"; printf '%s\n' "$LEFT"; exit 1
    fi
    echo "overlay discarded: ${#TRACKED[@]} tracked, ${#UNTRACKED[@]} untracked paths (porcelain re-read: clean)"   # list every path in the Decisions Log
  elif ! printf '%s\n' "$DIRTY" | grep -qv 'skills/[^/]*/references/'; then
    npm run bundle -- --check || npm run bundle
  else
    echo "HALT: dirty tree on resume — classify by hand before resuming:"; printf '%s\n' "$DIRTY" | head -20; exit 1
  fi
fi
```

**Why (a) is path-scoped, why `??` has its own test, and why the discard names `HEAD`.**
`git checkout -- .` and a directory-wide `git clean` cannot tell "the overlay" from "the work this
step authored" — both succeed, both report success, and `git status` afterwards shows *less* work
rather than broken work (the step-3 doc's "Never revert or clean by directory" rule, obs #38).
`git diff --quiet $BASE_REF -- <path>` **never reports an untracked path**, so the tracked-file
test alone passes every `??` entry as "identical to base" and `git clean` then deletes a file the
base never had. The `cat-file -e` + `cmp` pair is what makes an untracked file identical-to-base
*provably* so; anything else is (c). The tracked arm needs the same `cat-file -e` precondition,
because `git diff --quiet` is also silent for a path absent on both sides — an uncommitted deletion
of a branch-added file (cycle 3 CR-2). And `git checkout -- <path>` restores the working tree **from
the index**, so a *staged* overlay survives it — the discard names `HEAD` and re-reads the **whole**
porcelain afterwards (a pathspec-filtered re-read is satisfied vacuously by an entry whose path the
probe mis-parsed), because a probe that prints "discarded" over an entry it did not discard is the
task.116 failure with a success line in front of it (cycle 1 CR-4, cycle 2 CR-4). Renames are
split by `--no-renames` and a quoted path is (c) for the same reason: the probe acts only on paths
it can address. Cost: one `gh pr view` (or up to two `sed` passes over the report) to bind the base — an
unbindable base is a HALT before any entry is classified, never a `develop` guess — one `git
status --porcelain --no-renames`, plus one `git cat-file -e` and one
`git diff --quiet` (tracked) or `git show | cmp` (untracked) per entry for (a), plus one full
porcelain re-read.

**Halt snapshot for another document.** When Phase 0a's detector reports a `last-halt.json` whose
`task_or_story_directory` is not this document's, it is **refused, not resumed** — and when a
snapshot for *this* document names a `pr_url` that is `MERGED`, the detector reports it as
`stale-snapshot` and **the orchestrator deletes it** (§ Consume Output, verified on disk) rather
than offering a resume of merged work (obs #88; the detector prompt's Step 1; task.130). A document that reads `status: accepted` is **not** evidence the run
finished — `/finalise` writes it before its second CI reading and before Step 8 — so an accepted
document with an unmerged PR keeps its snapshot (task.124 QA cycle 2, CR-1). A completed run also deletes its own snapshot at Step 8, so a snapshot
that reaches this point is either this run's live one or a leftover the detector names.

**Restoring the lock — on either resume path.** The PreCompact hook and every terminal HALT
**remove the lock** and leave a superset of it behind (`last-halt.json`, or an orphaned
`.lock.pausing.<pid>` claim). Step 1 is the lock's only ordinary writer and *every* resume skips
it — a session that continues in place after a pause **and** a re-invocation that chooses Resume
in Phase 0b — so neither has a step that puts the lock back unless it is stated, and
`advance-pipeline-lock.sh <n>` with no lock is now an **error naming the fix**, not a silent no-op
(obs #123; QA cycle 2, CR-2). Who restores, and when, is stated once — under Phase 0a,
**Restore the lock (both resume paths)** — and this paragraph only points at it (task.130;
obs #132: five restatements of that rule produced bugs 9 → 11 → 12 → 13, each fixed at one site
while the others stayed wrong). When that section says the command runs here, run:

```bash
bash .agents/skills/{develop-story|develop-task|develop-bug}/references/advance-pipeline-lock.sh --restore {doc-directory}
```

It rebuilds the lock from the newest candidate for this document, strips the halt/pause fields and
any `waiting_on`, keeps `current_step` at the halted step, and **consumes** the candidates. `grant-qa-cycles.sh`'s own
restore (task.123) is this same call — one restore path, one document-match rule, one consumption
policy (the resume contract's **Re-entry after a QA loop escalation**, below, is unchanged from the
caller's side).

### Artifact verification

**Scope**: Verify only steps **up to `recommended_step - 1`** (as determined by Phase 0a). Steps at or after `recommended_step` are ⏳ Pending — do not verify. If Phase 0a failed validation, fall back to verifying all steps using `current_step` from the lock as the upper bound.

For each step marked ✅ in the implementation report (within the Phase 0a scope), verify the expected artifact exists. If verification fails, **do not skip the step** — re-run it and log: "Resume verification failed for Step {N} — artifact missing, re-running."

A step marked `⏸️ Paused` (set by the PreCompact hook on graceful pause) is treated identically to `⏳ Pending`: re-run from the start of that step. Earlier `✅` steps still skip per their artifact verification. Log: "Resuming after graceful pause — re-running Step {N}."

Steps 2 and 8 do not require artifact verification beyond reading the implementation report.

### Subagent Summary Replay

For ✅ steps whose `Subagent summary ref` column points to a `.summaries/step-<N>-*.json` file, prefer reading the JSON summary over re-running the subagent or re-reading the source artifacts the subagent consumed. This is the resume-side counterpart to the on-disk persistence convention in `shared/resources/subagent-summary-artifact.md`. If the JSON file is absent (in-flight pipeline started before the convention existed) or fails `jq -e '.schema_version == 1'`, fall back to the implementation report's textual notes for that step. Do NOT re-dispatch the subagent on resume just to repopulate the summary — the step is already ✅ and re-running is wasted work.

### develop-story artifact table

| Step | Artifact to verify | Verification command |
| ---- | ------------------ | -------------------- |
| 1. create-branch | Branch exists in git | `git branch --list "feature/story.{epic}.{story}.*"` returns the branch |
| 3. develop | All tasks complete | Story file `Status:` field reads `Ready for Review` |
| 4. create-pr | PR exists | `gh pr view {PR-number} --json state` returns open or merged |
| 5–6. qa loop | **Both** `story.{epic}.{story}.qa.{N}.*.md` **and** `story.{epic}.{story}.gate.{N}.*.yml` exist **and** PR comment posted. **Conditional — the 5c check reads the implementation report, not the filesystem**: when the latest gate **reached 5c** — read mechanically from the same entry this check already opens: the highest `### QA Cycle {N}` entry's `**Action**` row reads `Proceeding to 5c` (5a writes it on every one of §5c's five accepting routes; do not re-derive the set from the gate's token or queue) — that entry's `**PR Review**` row must hold a **terminal verdict** — `APPROVE` or `CONCERNS`. Any other value (`pending — 5c not yet run`, `REQUEST CHANGES`, `review failed`, `not reached`, blank, or a missing row) means 5c did not clear, and Step 5–6 is **not** complete. A mid-loop resume on a gate that routed to 5b (its entry's `**Action**` row reads `Running qa-fix`) legitimately has no terminal verdict. | `ls {story-directory}/story.*.qa.*.md` AND `ls {story-directory}/story.*.gate.*.yml` AND `gh pr view {PR} --comments --json comments \| grep -i "QA"` — gate alone is insufficient. Then the 5c check, which is a **read of the implementation report** performed by the resume detector, not a shell command: take the last `### QA Cycle` entry and read its `**PR Review**` row. |
| 7. finalise | **All three**: `story.{epic}.{story}.dod.{N}.*.md` exists **and** story `status:` reads `accepted` **and** finalise acceptance comment posted to PR | `ls {story-directory}/story.*.dod.*.md` AND `grep -iE "^status:\s*accepted" {story-file}` AND `gh pr view {PR} --comments --json comments \| grep -i "accepted"` |

### develop-task artifact table

| Step | Artifact to verify | Verification command |
|------|-------------------|---------------------|
| 1. create-branch | Branch exists in git | `git branch --list "feature/task.{id}.*"` returns the branch |
| 3. develop | All phases complete | Task file `Status:` field reads `Ready for Review` |
| 4. create-pr | PR exists | `gh pr view {PR-number} --json state` returns open or merged |
| 5–6. qa loop | **Both** `task.{id}.qa.{N}.*.md` **and** `task.{id}.gate.{N}.*.yml` exist **and** PR comment posted. **Conditional — the 5c check reads the implementation report, not the filesystem**: when the latest gate **reached 5c** — read mechanically from the same entry this check already opens: the highest `### QA Cycle {N}` entry's `**Action**` row reads `Proceeding to 5c` (5a writes it on every one of §5c's five accepting routes; do not re-derive the set from the gate's token or queue) — that entry's `**PR Review**` row must hold a **terminal verdict** — `APPROVE` or `CONCERNS`. Any other value (`pending — 5c not yet run`, `REQUEST CHANGES`, `review failed`, `not reached`, blank, or a missing row) means 5c did not clear, and Step 5–6 is **not** complete. A mid-loop resume on a gate that routed to 5b (its entry's `**Action**` row reads `Running qa-fix`) legitimately has no terminal verdict. | `ls {task-directory}/task.*.qa.*.md` AND `ls {task-directory}/task.*.gate.*.yml` AND `gh pr view {PR} --comments --json comments \| grep -i "QA"` — gate alone is insufficient. Then the 5c check, which is a **read of the implementation report** performed by the resume detector, not a shell command: take the last `### QA Cycle` entry and read its `**PR Review**` row. |
| 7. finalise | **All three**: `task.{id}.dod.{N}.*.md` exists **and** task `status:` reads `accepted` **and** finalise acceptance comment posted to PR | `ls {task-directory}/task.{id}.dod.*.md` AND `grep -iE "^status:\s*accepted" {task-file}` AND `gh pr view {PR} --comments --json comments \| grep -i "accepted"` |

## Plan Freshness (Step 3 Prerequisite)

If the Decisions Log records a plan file from a prior session and Step 3 is being resumed, verify the plan file is at least as fresh as the story/task file:

```bash
# develop-story (macOS/Linux portable):
_mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1"; }
plan=$(ls {story-directory}/story.{epic}.{story}.plan.*.md 2>/dev/null | head -1)
[ -n "$plan" ] && [ "$(_mtime "$plan")" -ge "$(_mtime {story-file})" ]

# develop-task (macOS/Linux portable):
plan=$(ls {task-directory}/task.{id}.plan.*.md 2>/dev/null | head -1)
[ -n "$plan" ] && [ "$(_mtime "$plan")" -ge "$(_mtime {task-file})" ]
```

If the plan is stale (older than the story/task file), do **not** reuse it — drop the cached "Pre-develop surface map:" entry from the in-memory resume context, re-run the Explore subagent, and re-discover the plan file. Log: "Plan file stale on resume (mtime < story/task mtime) — re-running pre-develop discovery." Cap re-discovery at **1 retry per resume** to prevent loops; if the plan is still stale after the retry, proceed with the latest plan and log a warning. If no plan file exists in the directory, the freshness check is a no-op.

## Gate File Conflation Warning (CRITICAL)

A `gate.yml` written manually (without running the QA skill) does NOT satisfy Step 5–6. The required artifacts are the `qa.N.md` report file (created by `/qa-story` or `/qa-task`) AND the `gate.N.yml`. Similarly, updating DoD checkboxes in the story/task doc does NOT satisfy Step 7 — `/finalise` must write a separate `dod.N.md` file AND post an acceptance comment to the PR.

## QA Cycle Count Reconstruction (if resuming at Step 5–6)

> **Resume inside 5c re-enters at 5c, not 5a.** The `### QA Cycle {N}` heading is written at 5a as
> soon as the gate is read, so a run killed *inside* 5c already has N headings and naive
> reconstruction would set `NEXT_CYCLE=N+1` and re-run the whole QA review against an unchanged tree
> — burning a cycle to re-derive the gate that just passed. Detect the 5c sub-state instead: read the
> highest `### QA Cycle {N}` entry's `**PR Review**` row — **after** its `**Action**` row. **Precedence:
> an `**Action**` that begins `Escalating —` wins over every PR Review value**, because a run that
> left the loop through Loop Escalation has no cycle to re-enter whatever its last verdict was
> (a loop-limit-via-review entry carries a real `REQUEST CHANGES` *and* the escalation Action —
> task.123 QA cycle 4, CR-3). Only when the Action is not an escalation does the PR Review row
> select a row below. Exactly one row matches any entry.
>
> | `**PR Review**` reads | Resume action |
> | --- | --- |
> | `APPROVE` or `CONCERNS` | 5c cleared — Step 5–6 is complete, go to Step 7 |
> | `REQUEST CHANGES` (an `**Action**` of `Proceeding to 5c` or `Running qa-fix`) | 5c ran and routed back — set the counter to `N`, re-enter at **5b** |
> | `review failed` | 5c could not run (usually the PR state). Set the counter to `N` and re-enter at **5c** — **once**. Its usual cause is not self-healing, so an unattended driver would otherwise re-run `/review-pr`, HALT, and repeat forever. On a **second consecutive** `review failed` for the same cycle `N`, do not re-enter: escalate to Loop Escalation with the review's own error text. |
> | `pending — 5c not yet run` | 5a wrote its placeholder on a gate that routed to 5c and the run died before 5c overwrote it. **Same action as `not reached`**: if the entry's `**Action**` row reads `Proceeding to 5c` (gate `{N}` reached 5c by any of §5c's five routes), re-enter at **5c**; otherwise at **5a**. This is the narrowest window in the loop — it opens when 5a writes the `### QA Cycle {N}` entry and closes when 5c records its verdict — and it is the value the artifact tables above will actually be reading on a run killed inside it |
> | `not reached`, blank, or no row (an `**Action**` of `Running qa-fix` or `Proceeding to 5c`) | The gate did not exit the loop, or the run died before 5c. If the entry's `**Action**` row reads `Proceeding to 5c` (same signal as the row above), re-enter at **5c**; otherwise at **5a** |
> | an `**Action**` of `Escalating — loop not converging` or `Escalating — loop limit reached` (whatever the PR Review row says) | The run **left the loop through Loop Escalation**; there is no cycle to re-enter. Do not re-enter at 5a. Apply **Re-entry after a QA loop escalation** (below): reconstruct from disk, back-fill, and offer the grant — or, if the halt snapshot's `halt_reason` is neither `loop-limit` nor `not-converging`, surface the mismatch to the user rather than resuming |
>
> **Why this reads the report rather than the filesystem.** An earlier version of this check compared
> `gate.{N}` against `pr-review.{n}` on disk. That was wrong twice over — the two indices count
> different things (`gate` per QA cycle, `pr-review` per 5c *invocation*, and 5c runs only on a gate in
> the accepting-route set), and the shell predicate implementing it returned a **false PASS under zsh** when its glob
> matched nothing, verifying a run with no artifacts at all as complete. Three consecutive QA cycles
> failed to state that predicate correctly, which is this repo's signal to replace the mechanism
> rather than correct it again. The `**PR Review**` row is written every cycle by contract, it is
> already the row this section reads for cycle reconstruction, and it carries the verdict directly —
> so no index arithmetic, no globs, and no shell portability surface.

If the last completed step was within the QA loop, reconstruct the cycle count **from the gates on
disk**, and use the `### QA Cycle` entries in the implementation report as the cross-check:

```bash
# The gate is what a QA run leaves behind whether or not it ran inside this pipeline.
QA_CYCLE=$(ls {doc-directory}/{story|task}.*.gate.*.yml 2>/dev/null \
  | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/' | sort -n | tail -1)
QA_CYCLE=${QA_CYCLE:-0}
COMPLETED=$(grep -c "^### QA Cycle" {implementation-report-path})
CYCLES_OUTSIDE_LOOP=$((QA_CYCLE - COMPLETED))     # derived here, never stored — see below
NEXT_CYCLE=$((QA_CYCLE + 1))
```

Set the cycle counter to `NEXT_CYCLE` (= highest gate + 1) before re-entering the loop. This is the cycle **about to be attempted**.

Examples:
- 0 gates → `NEXT_CYCLE=1` (fresh start, equivalent to non-resume)
- `gate.2` highest, 2 entries → `NEXT_CYCLE=3` (cycles 1 + 2 complete, attempting 3 next)
- `gate.5` highest, 5 entries → `NEXT_CYCLE=6` → exceeds `QA_MAX_CYCLES` → the **Re-entry** rule below decides between the grant and **Loop Escalation**
- `gate.6` highest, 5 entries → `CYCLES_OUTSIDE_LOOP=1`: the operator ran a cycle by hand between halt and re-invocation — back-fill it (below), then `NEXT_CYCLE=7`
- `gate.3` highest, 5 entries → `CYCLES_OUTSIDE_LOOP=-2`: the report claims two cycles that have **no gate on disk** (a gate never committed, or deleted). The cross-check has failed in the other direction — the report is the only record of those cycles. Do not back-fill and do not delete the entries: log `"⚠️ 2 QA Cycle entries have no gate on disk — resuming from the report's count"` in the Issues Log and set `NEXT_CYCLE = COMPLETED + 1`, the pre-task.123 rule, so a cycle is never re-run against a gate that no longer exists

This convention ensures the cycle budget is respected across resumes.

### Re-entry after a QA loop escalation

> **The gap this closes (task.123, obs #95).** A standalone `/qa-task` or `/qa-story` run by the
> operator after a loop-limit halt writes `gate.{N}` and `qa.{N}` to disk and **no `### QA Cycle`
> entry** in the implementation report — the entry is the orchestrator's, and no orchestrator was
> running. Counting report entries therefore under-counts by exactly the cycles the operator ran,
> and a resumed pipeline re-runs a cycle that already happened. The halt snapshot cannot carry the
> count either: it is written *at* the halt, before those cycles exist. So the count is
> **reconstructed from disk at resume** and the report is brought up to it.

1. **Reconstruct.** `QA_CYCLE` = the highest `{N}` over `gate.{N}.*.yml` on disk (the snippet
   above). `CYCLES_OUTSIDE_LOOP = QA_CYCLE − COMPLETED` is **derived here and never stored** — it is
   always `0` at halt time, so a snapshot field for it would only ever record nothing.
2. **Back-fill.** For each `N` with a gate on disk but no `### QA Cycle N` entry, append a minimal
   entry to QA Iteration History, in cycle order, so the Convergence check and the route classifier
   read a complete sequence: the gate verdict, `**HIGH findings**` (the Convergence check's awk over
   that gate), `**MEDIUM findings**` (`countRaised`), `**PR Review**: not reached — gate did not
   exit the loop`, `**Loop exit**: n/a — this exit not taken`, `**Action**` from the gate's queue by
   the Outcome branching's arms, and — directly under the heading — `**Origin**: run outside the
   loop (operator)`. The back-filled entry is a record of a cycle that ran, not a claim that the
   pipeline ran it.
3. **Offer the grant.** When the halt snapshot's `halt_reason` matches `loop-limit|not-converging`,
   Phase 0b's prompt — which lives in `skills/develop-task/SKILL.md` and `skills/develop-story/SKILL.md`,
   not here — is the halt message's own three options plus **"Resume at 5a with {k} more cycles"**.
   On accept, record the grant with **one call** to the bundled writer:

   ```bash
   bash .agents/skills/{develop-story|develop-task}/references/grant-qa-cycles.sh {doc-directory} {k} {implementation-report-path}
   ```

   Source: `shared/resources/grant-qa-cycles.sh`; suite: `grant-qa-cycles.test.sh`. Everything it
   does was a defect when the prose left it to the caller (task.123 QA cycles 2 and 3):

   - It **reconstructs the base** as `max(highest gate on disk, `### QA Cycle` entries in the
     report)` — the same number step 1 resumes from on either of its paths — and never from a
     `$QA_CYCLE` bound in a neighbouring fenced block, which does not exist in this one.
   - It **restores the lock from the halt snapshot when no lock exists** — through
     `advance-pipeline-lock.sh --restore`, the one restore path since task.124, which also
     consumes the snapshot: a terminal HALT removes
     the lock, and the only ordinary writer of it (the end of `/create-branch`) is a step a resume
     skips, so without this the grant had no file to land on. The restore drops the snapshot's
     halt-only fields (`halted_at`, `halt_reason`, `halt_step`) and PreCompact's (`paused_at`,
     `pause_reason`) and keeps everything else, the snapshot being a superset of the lock. It
     **refuses a snapshot for another document** — one whose `task_or_story_directory` is not
     `{doc-directory}` — because a stale snapshot persists by design.
   - It **never lowers** a `qa_max_cycles` the lock already carries.
   - It **writes three fields atomically** — `extra_cycles_granted = k` (the record),
     `qa_max_cycles = base + k` (the budget) and `qa_phase = 5a` (an accepted grant *is* a 5a
     re-entry; a Stop between the grant and a separate `set-qa-phase.sh` call would otherwise name
     `/qa-fix`) — via `mktemp` + `mv`, removing its temp file on every failure, and prints the
     budget back from the written lock.

   The loop then runs with **`QA_MAX_CYCLES` = the lock's `qa_max_cycles`** (absent → 5). The
   budget is **relative to the reconstructed count, not to 5**: a grant of `k` must deliver `k`
   cycles from the point of re-entry, and every gate written since the original budget — a route-2c
   half-cycle's `gate.6`, an operator's standalone cycle, a previous grant's cycles — has already
   consumed cycle numbers that `5 + k` would count against the grant. On a halt at 5 with an
   operator cycle 6 on disk, `k = 2` gives `qa_max_cycles = 8` and cycles 7–8 run; `5 + 2 = 7`
   would have delivered one. It is written to the lock as an **absolute** number, rather than
   recomputed from disk on every read, so a compaction pause and resume inside the granted run
   does not creep the budget upward by re-adding `k` to a larger count. The names are
   `extra_cycles_granted` and `qa_max_cycles` in the lock, the halt snapshot (a superset of the
   lock), the writer script, the step-5-6 doc and both SKILL.md — one spelling each, and
   `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` fails when any file disagrees. **Do not
   reuse `MAX_ITER`**: that is the Step 3 develop-loop bound (below), a different budget over a
   different loop.
4. **Re-enter at 5a as cycle `NEXT_CYCLE`.** The grant already wrote `qa_phase: 5a` and restored
   the lock; 5a's own first action (`set-qa-phase.sh 5a`) then runs as on any cycle and is a noop
   here. **A declined grant, or a grant the script refused (exit 1 — surface its stderr line to the
   user), does not re-enter the loop at all**: no lock is restored, no cycle runs, and the run
   returns to the halt message's own three options. That is the one statement of the declined path;
   the step-5-6 HALT messages and both SKILL.md Phase 0b blocks point here rather than restating it
   (task.123 QA cycle 4, CR-2). A resume with `NEXT_CYCLE > QA_MAX_CYCLES` and no grant is the same
   case — it is the halt, re-surfaced.

The lock's `qa_phase` (`5a|5b|5c`, written by the loop as it moves) corroborates the 5c sub-state
table above — a snapshot at `qa_phase: 5c` with `**PR Review**: pending` is the narrow window that
table describes — but the `**PR Review**` row stays the source of truth, because it is written by
contract on every cycle and `qa_phase` is absent on a lock from a run that predates it. **The convergence check
also survives a resume**: it reads the per-cycle HIGH counts back out of the `### QA Cycle` entries
in the implementation report (`**HIGH findings**: {n}`), so a resumed run at cycle 3 or later
evaluates the same sequence a continuous run would. If an earlier cycle's entry has no HIGH count
recorded (a run that predates the check), treat that cycle's count as unknown and do not trip the
guard on it — the check needs three real readings. Mid-cycle resume (entry written but qa-fix not yet committed) is handled by re-running 5a — `/qa-story` / `/qa-task` is idempotent and will overwrite the same `qa.N.md` / `gate.N.yml` for the in-flight cycle.

## Branch and PR Cross-Check

Cross-check the recorded pipeline state against current reality before resuming:

```bash
# Verify branch still exists
git branch --list "$(grep 'Branch:' {implementation-report} | awk '{print $2}')"
# Verify PR still exists
gh pr view "$(grep 'PR:' {implementation-report} | awk '{print $2}')" --json state 2>/dev/null
```

If the branch or PR no longer matches, warn the user before proceeding: "Pipeline state has diverged — recorded branch/PR may differ from current state. Proceeding anyway."

## Develop Loop — Stall Semantics and MAX_ITER Bound

> `MAX_ITER` bounds the **Step 3 develop loop** and nothing else. The QA loop's budget is
> `QA_MAX_CYCLES` (step-5-6 doc, Loop Setup; the lock's `qa_max_cycles`, set by the grant above).

Before iteration 1: dispatch an Explore subagent (read-only) to capture initial loop state, using the **shared loop-audit prompt** (`shared/resources/loop-audit-prompt.md`). Mark the wait on the lock beside the dispatch — `bash .agents/skills/{develop-story|develop-task}/references/set-waiting-on.sh "step-3 initial loop audit"` — and `… --clear` once its JSON is read (task.124; the Stop hook otherwise reads the yielded turn as a stall).

Substitute: `<DOC_TYPE>` = `story` or `task` (per orchestrator); `<DOC_PATH>` = absolute story/task file path; `<TASKS_SECTION>` = `## Tasks` (story) or `## Implementation Plan` (task). Pass the resulting prompt verbatim.

Failure semantics: this is the **initial audit** row in the shared prompt's "Caller Failure Semantics" table — JSON parse failure → retry once → inline shell fallback (`grep -cE '\[x\]'` + `grep -cE '\[[ x]\]'` + `git rev-parse HEAD`) and log `"Initial audit JSON failed — used inline fallback."`. Persistence: write `step-3-iteration-audit-0.json` per the shared prompt's "Persistence" table.

Record: `INITIAL_COMPLETED = audit.completed` (or fallback), `M = audit.total` (or fallback), `LAST_COMMIT_HASH = audit.last_commit_hash` (or fallback). Set `ITER=1`, `MAX_ITER=5`, `LAST_COMPLETED=INITIAL_COMPLETED`.

**Progress is made if EITHER `CURRENT_COMPLETED > LAST_COMPLETED` OR `CURRENT_COMMIT_HASH != LAST_COMMIT_HASH`** (a new commit on the branch counts as progress even if no checkbox ticked, e.g. when only subtask work or test fixes were committed).

- **No progress** (both equal): HALT. Log: "Step 3 stall: /develop returned `In Progress` without ticking a checkbox or producing a new commit (iteration {ITER}, {CURRENT_COMPLETED}/{M})". Set report status to `Escalated` and HALT.
- **`ITER >= MAX_ITER`**: iteration cap reached — HALT. Log: "Step 3 hit MAX_ITER={MAX_ITER} without reaching `Ready for Review` ({CURRENT_COMPLETED}/{M} ticks). Manual intervention required."
- **Otherwise**: log "Step 3 iteration {ITER}: {CURRENT_COMPLETED}/{M} ticks complete (commit-progress: {yes/no}). Re-invoking /develop." Set `LAST_COMPLETED=CURRENT_COMPLETED`, `LAST_COMMIT_HASH=CURRENT_COMMIT_HASH`, increment `ITER`.
