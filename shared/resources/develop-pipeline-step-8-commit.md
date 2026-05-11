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

## Invoke /commit-changes

Then invoke the `/commit-changes` skill. The implementation report must be staged and included in this commit alongside any remaining uncommitted changes.

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
rm -f .claude/state/test-output-*.log

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

# 2. Test-output logs cleaned
ls .claude/state/test-output-*.log 2>/dev/null | grep -q . && { echo "❌ Step 8 incomplete: test-output logs remain"; exit 1; } || true

# 3. Implementation report finalised — Final Status must be 'Completed' or 'Accepted', Finished must NOT be '—'
REPORT="${IMPLEMENTATION_REPORT:?must be set from lock or context}"
grep -qE "^\*\*Final Status:\*\* (Completed|Accepted)" "$REPORT" || { echo "❌ Step 8 incomplete: Final Status not set to Completed/Accepted in $REPORT"; exit 1; }
grep -qE "^\*\*Finished:\*\* [0-9]" "$REPORT" || { echo "❌ Step 8 incomplete: Finished timestamp missing in $REPORT"; exit 1; }

# 4. Pipeline Progress table has no ⏳ Pending rows
grep -q "⏳ Pending" "$REPORT" && { echo "❌ Step 8 incomplete: Pipeline Progress still has ⏳ Pending rows"; exit 1; } || true

echo "✅ Step 8 post-conditions verified"
```

These checks address regressions #3 and #4 from the live-github-test (impl report stuck at "In Progress / Finished: —", lock file not removed). Treat the bash assertions as binding — emit the Phase 2 Completion banner only after all four pass.
