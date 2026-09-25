---
name: develop-pipeline-step-8-commit
description: Step 8 (commit-changes + lock removal) shared by develop-story and develop-task. Covers final implementation report update (Finished timestamp, Final Status, QA Iterations, Completion Summary), /commit-changes invocation, final push, Pipeline Progress update, and pipeline lock file removal. Near-identical for both orchestrators — one variant noted for Completion Summary wording.
---

# Develop Pipeline — Step 8: Commit Changes

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 8. Content is nearly identical for both orchestrators. The one variant (Completion Summary wording) is noted below.

---

## Final Implementation Report Update

Before invoking `/commit-changes`, update the implementation report one final time:

- Set **Finished** timestamp
- Set **Final Status** to `Completed`
- Fill in **QA Iterations** count
- Ensure the Pipeline Progress table shows ✅ for all steps
- Write a **Completion Summary** paragraph:
  - develop-story: what was **built**, QA iterations taken, notable decisions
  - develop-task: what was **implemented**, QA iterations taken, notable decisions

---

## Lint the report before the terminal commit

**Before** invoking `/commit-changes`, read the report back with the linter. This is call site **(4)** of the four the report-lint contract names (the other three: the Step Transition Protocol's post-Edit check, the HALT rule's pre-commit check, and the PreCompact hook). The Step 8 commit is the last writer of the report and the one every later reader trusts, and task.117's HALT commit shipped a report doubled and spliced mid-line because no boundary read it back (obs #115):

```bash
REPORT="${IMPLEMENTATION_REPORT:?must be set from lock or context}"
command node .agents/skills/{develop-story|develop-task|develop-bug}/references/report-lint.js --file "$REPORT" --json; rc=$?
case $rc in
  0) ;;
  1) echo "HALT: report failed lint — repair $REPORT by hand before committing (see the problems above)"; exit 1 ;;
  2) echo "HALT: report-lint usage error — the call site is wrong, not the report"; exit 1 ;;
  *) echo "HALT: report-lint.js not runnable (rc $rc) — check the bundled path"; exit 1 ;;
esac
```

Engine: `shared/resources/report-lint.js`; expected sections come from `shared/resources/implementation-report-template.md`, the one definition. A `problems` result is a HALT with nothing committed; the linter never repairs. The exit is read into `rc` **before** the `case` — inside a `*)` arm `$?` no longer names the linter's status — and the three non-zero arms carry distinct messages because they name three different repairs: the report (1), the call site (2), the install (127 or anything else). A single `|| { HALT }` reported all three as "the report failed lint" (task.130; task.124 cycle-1 CR-7).

## Invoke /commit-changes

Then invoke the `/commit-changes` skill with `--scope {work-item-dir}`. This stages new, modified and deleted files **inside the work-item dir only** (`git add -- {work-item-dir}`), including the finalised implementation report. It sweeps in neither unrelated untracked paths nor another session's tracked edits in a shared checkout (obs #142):

> **What this commit carries changed with task.115.** The acceptance artefacts — the document with
> `status: accepted`, the DoD summary, `sprint-review-summary.md` and (tasks) the ticked registry —
> are committed and pushed by `/finalise` itself at its Step 7 action 6a, *before* any PR or tracker
> side-effect, so that CI can be read on the head that carries the acceptance. This Step 8 commit is
> therefore the **implementation report and nothing else new** — with one expected residue: on a Jira
> project the document carries a frontmatter-only `jira_last_*` rewrite from Step 7 action 8's
> Document-link re-point, which runs after the 6a commit by design and rides here. If `git status`
> shows a `*.dod.*` file, the sprint review, or any change to the document beyond those three keys,
> `/finalise` did not cross its publish boundary — that is a Step 7 defect to surface (the step-7 doc's
> "publish boundary" section has the mechanical check), not something for this sweep to absorb
> silently. Note also that this
> commit is docs-only and lands *after* the second CI reading; that residue is deliberate (recording
> a verification inside the commit it verifies needs a third commit) and `develop-next` Step 3
> re-verifies the final head before merging.

```
/commit-changes --scope {work-item-dir}
```

The implementation report and all other work-item artifacts must be staged and included in this commit.

After `/commit-changes` completes, run `git log --oneline -1` to capture the final commit hash. Update the Pipeline Progress Notes for Step 8: `Committed in \`{hash}\`` (and note the PR reference if applicable, e.g. `Committed in \`{hash}\`, merged via PR #{N}`).

---

## Final Push

Push the final commit so the PR reflects the completed implementation report and DoD summary:
```bash
git push origin HEAD
```

Update Pipeline Progress: ✅ commit-changes.

---

## Cleanup Transient State

Pipeline finished cleanly — no further pause possible. Remove the lock file and any leftover test-output logs from this run:

```bash
# Remove transient test-output logs from Step 3 develop loop iterations.
# Successful iterations remove their own log on TEST_EXIT==0; this catches
# logs left behind by failed iterations that later recovered, plus any
# logs from prior aborted runs that never reached cleanup.
# `find -delete`, not an `rm` glob: an unmatched glob is a zsh `nomatch` abort
# (obs #111; docs/reference/anti-patterns.md § "Never put a must-succeed path
# and a glob in one `rm` argv").
find .claude/state -maxdepth 1 -name 'test-output-*.log' -delete 2>/dev/null || true

# Delete the halt snapshot this run's own earlier HALT left behind — and ONLY
# this run's. A completed run used to leave `last-halt.json` on disk, and the
# next `/develop-*` invocation was offered a resume of merged work (obs #88).
# Match on the snapshot's task_or_story_directory, canonicalised the way
# advance-pipeline-lock.sh --restore compares it (relative and absolute
# spellings of one directory are one directory); a snapshot for ANOTHER
# document is left for its own run's detector to refuse.
SNAPSHOT=.claude/state/develop-pipeline.last-halt.json
if [ -f "$SNAPSHOT" ]; then
  canon() { local s; s=$(printf '%s' "$1" | sed -E 's#^\./##; s#/+$##'); (cd "$s" 2>/dev/null && pwd -P) || printf '%s' "$s"; }
  SNAP_DIR=$(jq -r '.task_or_story_directory // ""' "$SNAPSHOT" 2>/dev/null)
  if [ -n "$SNAP_DIR" ] && [ "$(canon "$SNAP_DIR")" = "$(canon "{work-item-dir}")" ]; then
    rm -f "$SNAPSHOT" && echo "halt snapshot for this run removed"
  elif ! jq -e 'type == "object"' "$SNAPSHOT" >/dev/null 2>&1; then
    # An EMPTY SNAP_DIR is reached by two states — a parsed object with no directory (legacy)
    # and a snapshot jq could not read at all. The second is left alone, named: a corrupt file
    # is not evidence of anything and may be another run's (task.130 QA cycle 1, CR-3).
    echo "halt snapshot at $SNAPSHOT is not a JSON object — left in place; inspect it by hand"
  elif [ -z "$SNAP_DIR" ]; then
    # A snapshot with no directory predates task.123 and can belong to no run that will
    # resume it (--restore refuses it without --accept-legacy; task.130). Delete it only when
    # it is the SOLE candidate on disk — beside a live claim it might be the operator's
    # evidence. Count the claims with `find`, never a glob: under zsh an unmatched glob is
    # `nomatch`, which aborts `ls <path> <glob> | wc -l` AND a `for f in <path> <glob>` loop
    # alike (the loop form was proposed and found aborting by halt-snippet-glob-safe.test.mjs
    # F1 under zsh); docs/reference/anti-patterns.md § "Never put a must-succeed path and a
    # glob in one `rm` argv".
    n=1   # the snapshot itself
    while IFS= read -r f; do [ -n "$f" ] && n=$((n + 1)); done \
      < <(find .claude/state -maxdepth 1 -name 'develop-pipeline.lock.pausing.*' -type f 2>/dev/null)
    if [ "$n" -eq 1 ]; then
      rm -f "$SNAPSHOT" && echo "legacy snapshot (no directory) removed — it belonged to no resumable run"
    else
      # Named, not silent: a kept file must be distinguishable from "no snapshot found" (CR-7).
      echo "legacy snapshot (no directory) left in place beside $((n - 1)) orphaned claim(s) — inspect .claude/state by hand"
    fi
  fi
fi

# Remove the pipeline lock — must be last so a crash mid-cleanup still leaves
# the lock available for resume.
rm -f .claude/state/develop-pipeline.lock
```

---

## Step 8 Completion Checklist (BLOCKING — verify before emitting the Phase 2 Completion banner)

Run these post-condition checks. **If any fails, do NOT emit "Story/Task Development Complete" — fix the gap and re-check.**

```bash
# 1. Lock file removed
[ ! -f .claude/state/develop-pipeline.lock ] || { echo "❌ Step 8 incomplete: lock file still present"; exit 1; }

# 2. Test-output logs cleaned (`find`, not `ls <glob>`: an unmatched glob aborts under zsh)
[ -z "$(find .claude/state -maxdepth 1 -name 'test-output-*.log' 2>/dev/null)" ] || { echo "❌ Step 8 incomplete: test-output logs remain"; exit 1; }

# 2b. No halt snapshot for THIS work item survives the run (task.124 — a snapshot that
#     outlives its run is offered as a resume for merged work on the next invocation)
if [ -f .claude/state/develop-pipeline.last-halt.json ]; then
  SNAP_DIR=$(jq -r '.task_or_story_directory // ""' .claude/state/develop-pipeline.last-halt.json 2>/dev/null)
  [ -n "$SNAP_DIR" ] && [ "$(cd "$SNAP_DIR" 2>/dev/null && pwd -P)" = "$(cd "{work-item-dir}" && pwd -P)" ] \
    && { echo "❌ Step 8 incomplete: halt snapshot for this work item still present"; exit 1; }
fi

# 3. Implementation report finalised — Final Status must be 'Completed' or 'Accepted', Finished must NOT be '—'.
#    Both bold forms: the template's story and task variants write `**Final Status**:` (colon
#    outside the bold) and the bug variant's header writes `**Final Status:**` (inside). A regex
#    for one form failed every report written from the other (obs #173).
REPORT="${IMPLEMENTATION_REPORT:?must be set from lock or context}"
grep -qE "^\*\*Final Status(:\*\*|\*\*:) (Completed|Accepted)" "$REPORT" || { echo "❌ Step 8 incomplete: Final Status not set to Completed/Accepted in $REPORT"; exit 1; }
grep -qE "^\*\*Finished(:\*\*|\*\*:) [0-9]" "$REPORT" || { echo "❌ Step 8 incomplete: Finished timestamp missing in $REPORT"; exit 1; }

# 4. Pipeline Progress table has no ⏳ Pending rows
grep -q "⏳ Pending" "$REPORT" && { echo "❌ Step 8 incomplete: Pipeline Progress still has ⏳ Pending rows"; exit 1; } || true

# 5. The work actually exists on the remote — commits present, tree clean WITHIN THE WORK ITEM,
#    local HEAD == remote HEAD, and (when a PR is open) PR head == local HEAD. --scope names dirt
#    outside {work-item-dir} as a warning instead of failing on it: in a checkout another session
#    is editing, that dirt is not this run's, and failing on it made the step unpassable on a
#    correct run (obs #142, task.128).
#    Run it UNPIPED and read its own exit status; see the note below.
#    BASE_BRANCH is bound HERE, from the PR's own base — Step 8 runs after Step 4, so the branch
#    has a PR, and this is the first source the resume contract's probe reads too. It was read
#    unbound (`${BASE_BRANCH:?}`) through five green cycles because every host ran a feature
#    branch off develop (obs #133, task.132); a block that reads a name must bind it.
BASE_BRANCH=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null)
[ -n "$BASE_BRANCH" ] || { echo "❌ Step 8 incomplete: cannot bind BASE_BRANCH — no PR on this branch (gh pr view --json baseRefName)"; exit 1; }
bash .agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh --base "$BASE_BRANCH" --scope "{work-item-dir}" ${PR_NUMBER:+--pr "$PR_NUMBER"}
VERIFY_EXIT=$?
[ "$VERIFY_EXIT" -eq 0 ] || { echo "❌ Step 8 incomplete: verify-push-state failed (exit $VERIFY_EXIT)"; exit 1; }

echo "✅ Step 8 post-conditions verified"
```

Checks 1–4 (and 2b) address regressions #3 and #4 from the live-github-test and obs #88 (impl report stuck at "In Progress / Finished: —", lock file not removed). Treat the bash assertions as binding — emit the Phase 2 Completion banner only after all five pass.

---

## Why check 5 exists, and why it is mechanical rather than an instruction

On 2026-08-13 a pipeline reported a "PR-ready branch pushed" and, separately, that a trunk fix had been "isolated in its own commit so the orchestrator can drop it at rebase". **Neither was true.** The branch ref existed on the remote but pointed at the base tip — **0 commits** — and every file was still an uncommitted working-tree modification. The orchestrator relayed that claim to two sibling pipelines and planned a merge around it.

The develop-batch merge gate's head-SHA check would have refused the merge, so nothing broken could ship. But that check runs at **merge** time, and the false claim was acted on well before it. That gap is the cost, and it is why this assertion belongs at **report** time.

**Do not "fix" this class of problem by strengthening the prose.** The prompt already said to report the PR; adding "and be accurate" changes nothing, because the failure is not disobedience — it is reporting an intention as an accomplishment without looking. Only a mechanical check whose output is pasted into the report closes it.

**Paste the script's output verbatim into the final report.** A summary of a verification is not a verification.

⚠️ **Read the script's own exit status — never a pipeline's.** The same session produced *three* separate false passes from exactly that mistake: `npm test 2>&1 | tail -80` reported `tail`'s exit 0 over a suite that had failed, and twice more from wrapper scripts whose status came from a trailing `grep`/`echo`. If the output is large, redirect to a file and read the file:

```bash
bash .../verify-push-state.sh --base "$BASE_BRANCH" --scope "{work-item-dir}" > /tmp/verify.log 2>&1; VERIFY_EXIT=$?
```

Each `! outside scope (warning): <path>` line the scoped run prints names a dirty path this run did not make. Paste those lines too: they are how an operator sees a concurrent session, or a file `/develop` edited that Step 4's scope did not reach.

`{skill}` above is the pipeline's own skill directory (`develop-story`, `develop-task` or `develop-bug`) — each vendors its own copy of the script under `references/`.
