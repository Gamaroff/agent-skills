---
name: develop-pipeline-step-7-finalise
description: Step 7 (finalise + tracker close) shared by develop-story and develop-task. Covers /finalise invocation, completion detection, DoD gaps halt, tracker issue update (GitHub close + board Done, Jira Done transition), DoD summary file location, and Pipeline Progress update. Story vs task variants called out where they differ (file path, commit message format, completion log phrase, completion comment text).
---

# Develop Pipeline — Step 7: Finalise

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 7. Story/task variants are called out in labeled sub-sections where they differ.

---

## DO NOT Inline This Step (CRITICAL)

The orchestrator MUST invoke the `/finalise` skill via the Skill tool. It MUST NOT:

- Write the `dod.N.md` file directly with `Write` (the finalise skill produces it)
- Set `status: accepted` without first running `/finalise` (status is part of finalise's output, not a precondition)
- Skip /finalise in lite mode (lite mode only affects Step 5 QA — see `shared/resources/develop-pipeline-lite-mode.md`)

If you find yourself reaching for `Write` to author a DoD file, STOP and invoke `/finalise` instead. Inlining the step bypasses the DoD checks and produces an audit trail that doesn't match what the spec says happened.

---

## Invoke /finalise

#### develop-story

Invoke the `/finalise` skill with the story file path.

#### develop-task

Invoke the `/finalise` skill with the task file path.

---

## Detecting Completion

#### develop-story

After finalise returns, read the story file and check the `status:` frontmatter field:

- `accepted` → success, continue
- Any other status, or if finalise listed DoD gaps → halt

#### develop-task

After finalise returns, read the task file and check the `status:` frontmatter field:

- `accepted` → success, continue
- Any other status, or if finalise listed DoD gaps → halt

---

## If DoD Gaps Are Found

Log each gap with specific detail in Issues Log. Invoke the `/commit-changes` skill to commit the implementation report before halting so the audit trail is in git:

#### develop-story

Suggested commit message: `docs(story.{epic}.{story}): implementation report — finalise gaps identified`

#### develop-task

Suggested commit message: `docs(task.{id}): implementation report — finalise gaps identified`

Then push:

```bash
git push origin HEAD
```

Then HALT:

```
⚠️ Finalise identified Definition of Done gaps.
Review the implementation report at {path} and address the gaps before re-running /finalise.
```

---

## On Success

#### develop-story

Log "Story accepted" in Decisions Log.

#### develop-task

Log "Task completed" in Decisions Log.

---

## Post DoD Body to PR (REQUIRED — lite and standard modes alike)

After the DoD file is written, post its **full content** as a PR comment so reviewers see the acceptance evidence on the PR itself (not only in the repo tree). A one-line "task/story accepted" comment is insufficient.

```bash
DOD_FILE=$(ls {story-or-task-directory}/{story-or-task-prefix}.dod.*.md 2>/dev/null | sort | tail -1)
DOD_BODY=$(cat "$DOD_FILE")
# Wrap in tracker_call_with_retry for transient GitHub/API failures (3× exponential backoff).
# Source the helper from references/resolve-platform.sh first.
tracker_call_with_retry gh pr comment {PR_NUMBER} --body "$(cat <<EOF
## ✅ Definition of Done

$DOD_BODY
EOF
)"
```

For Jira/Bitbucket, attach the DoD body to the PR via the equivalent Bitbucket PR-comment API or `addCommentToJiraIssue` (whichever the project uses for PR-level visibility).

Log in Decisions Log: "DoD body posted to PR — comment URL: {url}."

This step runs in **both lite and standard modes**. Lite mode skips QA agents (Steps 5–6); it does NOT skip the DoD-on-PR comment, the issue close/comment, or the board transition below.

---

## Tracker Issue Update

> **Note — Document-link re-point (owned by `/finalise`).** As part of acceptance, the `/finalise` skill re-points the tracker issue's `## Document` link to the durable branch (`$DURABLE_BRANCH`) **before** closing/transitioning the issue, so the link survives the feature branch being deleted after merge (GitHub: surgical body rewrite; Jira: re-sync with `--doc-branch`). The close/comment/board-move actions below are the orchestrator-visible effects layered on top — they do not replace the re-point. (`review-story` performs the same re-point on sync; see `finalise/SKILL.md`.)

Branch on `TRACKER`:

### GitHub (`TRACKER=github`) — shared structure, story/task text differs

If `TRACKER_ISSUE` is set, explicitly close the issue and move the project board to Done:

All `gh issue comment`/`gh issue close` calls below MUST be wrapped in `tracker_call_with_retry` (3× exponential backoff — see `references/resolve-platform.sh`). Source the helper at the top of the step.

#### develop-story

```bash
# 1. Post completion comment
tracker_call_with_retry gh issue comment {TRACKER_ISSUE} --body "Story development complete — PR: {PR_URL}. Story status: accepted. All DoD criteria verified."

# 2. Close the issue
tracker_call_with_retry gh issue close {TRACKER_ISSUE} --comment "Closing — story accepted. PR: {PR_URL} (pending merge). Implementation report: {report-path}"
```

#### develop-task

```bash
# 1. Post completion comment
tracker_call_with_retry gh issue comment {TRACKER_ISSUE} --body "Task development complete — PR: {PR_URL}. Task status: accepted. All DoD criteria verified."

# 2. Close the issue
tracker_call_with_retry gh issue close {TRACKER_ISSUE} --comment "Closing — task accepted. PR: {PR_URL} (pending merge). Implementation report: {report-path}"
```

#### Shared (both orchestrators)

After closing, verify the issue is actually closed using the tracker state poller (see `shared/resources/tracker-state-poller-subagent.md`). Invoke via Explore subagent with `PR_NUMBER=` (empty) and `ISSUE_KEY={TRACKER_ISSUE}`:

- `result.issue.state == "CLOSED"` → log "✅ GitHub Issue #{TRACKER_ISSUE} confirmed closed"
- Any other state → log "⚠️ GitHub Issue #{TRACKER_ISSUE} still {state}" — `tracker_call_with_retry` already retried 3× during close; if still not CLOSED, post PR comment warning
- `result.errors | length > 0` → log each error in Issues Log; proceed (non-blocking)

On any `gh issue close` failure: `tracker_call_with_retry` retries 3× (1s, 2s, 4s) automatically. If all retries fail, log the error in the Decisions Log and Issues Log and post a PR comment: "⚠️ Issue #{TRACKER_ISSUE} could not be closed automatically — please close manually."

Log in Decisions Log: "Post-close state check (poller): issue #{TRACKER_ISSUE} state = {state}. errors = {error_count}."
Log in Decisions Log: "GitHub Issue #{TRACKER_ISSUE} — close: {CLOSED ✅ / OPEN ⚠️ (manual action required)}."

Then **signal the `done` stage** — run the deterministic CLI:

```bash
node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage done --json
```

Engine source: `shared/resources/gh-stage.js` (bundled into each skill as `references/gh-stage.js`).

The column this lands in comes from `pipeline.done` in `tracker-workflow.yaml`. A consumer who omitted `done:` from `pipeline:` — because a human moves the final card themselves — gets `reason: "stage-disabled"`, and that is a **success, not a warning**. Do not log it as a failure. Likewise `already` (the card is on the final column) and `would-regress` (a human moved it somewhere beyond Done) are correct outcomes.

Log in Decisions Log: "GitHub Issue #{TRACKER_ISSUE} — board: done → {landed / already / stage-disabled / not-on-board / would-regress}."

### Jira (`TRACKER=jira`) — shared structure, story/task text differs

> **MUST execute — pipeline action, not optional sync.** Do not skip on the basis of any user memory that says "Jira sync is manual" (e.g. `feedback_jira_sync_manual_only.md`). That rule applies only to `/create-epic`, `/create-story`, `/create-task` — never to develop-pipeline steps. This is the symmetric Jira counterpart to the GitHub close + board-move block above.

If `TRACKER_ISSUE` is set, use the Atlassian MCP tools to post a completion comment and transition to Done (`cloudId` derived from `JIRA_URL` hostname):

1. **Post completion comment** — call `addCommentToJiraIssue`:
   - `issueIdOrKey`: `{TRACKER_ISSUE}`
   - `commentBody`: Build a structured summary. Locate the DoD summary file and gate file:

     ```bash
     DOD_PATH=$(ls {story-or-task-directory}/*.dod.*.md 2>/dev/null | sort | tail -1)
     FINAL_GATE=$(ls {story-or-task-directory}/*.gate.*.yml 2>/dev/null | sort | tail -1 \
       | xargs -I{} grep '^gate:' {} 2>/dev/null | awk '{print $2}' || echo "N/A")
     ```

     Format (story variant shown; substitute "Task" for develop-task):

     ```
     ## ✅ Story Accepted — Definition of Done Verified

     **PR**: {PR_URL}
     **QA Gate**: {FINAL_GATE}
     **Accepted**: {YYYY-MM-DD}
     **DoD Summary**: `{DOD_PATH}`

     All Definition of Done criteria verified. Story accepted and transitioning to Done.
     ```

     If `DOD_PATH` is empty (finalise was not run via develop-story — rare), omit the DoD Summary line.

   - `contentFormat`: `"markdown"`
   - On failure: log warning and continue (non-blocking)

2. **Confirm the `done` stage** — `/finalise` (invoked at the top of this step) already drives the Done transition, via `sync-jira-{story,task}.js` when credentials exist and the MCP protocol otherwise. Do **not** transition again here as a matter of course: a second call is redundant, and re-deriving the candidates in a second place is how the two paths drift apart.

   Run the stage CLI only as a **repair** — when `/finalise` reported its Jira step as failed or skipped:

   ```bash
   node .agents/skills/{develop-story|develop-task|develop-bug}/references/jira-stage.js \
     --issue {TRACKER_ISSUE} --stage done --json
   ```

   It is idempotent (`reason: "already"` when `/finalise` succeeded), so running it after an ambiguous report costs one API call and cannot double-close anything. On `reason: "no-credentials"`, fall back to `shared/resources/jira-transition-protocol.md` with `candidates = ["Done", "Closed", "Resolved", "Complete", "Completed"]` and `terminal = true` — that unlocks the protocol's narrow single-done-transition fallback and fills a required `resolution` from the transition's own `allowedValues`. Its MUST-NOT clauses are binding: if no transition matches, log the skip and do not call `transitionJiraIssue`. Never fall back to another transition (e.g. `To Do`) — leaving the issue where it is, is the correct behaviour when the workflow has no done state.

3. **Post-transition state verification** — invoke the tracker state poller (see `shared/resources/tracker-state-poller-subagent.md`) with `PR_NUMBER=` (empty) and `ISSUE_KEY={TRACKER_ISSUE}`:
   - `result.issue.state` is in the done **status category**, or matches "Done", "Closed", "Resolved", "Complete" or "Completed" (case-insensitive) → log "✅ Jira issue {TRACKER_ISSUE} confirmed Done via poller"
   - Any other state → log "⚠️ Jira issue {TRACKER_ISSUE} still showing {state} — transition may not have taken effect"
   - `result.errors | length > 0` → log each error in Issues Log; proceed (non-blocking)

Log in Decisions Log: "Jira issue {TRACKER_ISSUE} — comment: {posted ✅ / ⚠️ failed}."
Log in Decisions Log: "Jira issue {TRACKER_ISSUE} — Done: {✅ by /finalise / ✅ repaired via jira-stage / ⚠️ no matching transition found / ⚠️ failed}."
Log in Decisions Log: "Post-close state check (poller): issue {TRACKER_ISSUE} state = {state}. errors = {error_count}."

---

## Step 7 Completion Checklist (MUST verify before marking ✅)

Before updating the Pipeline Progress row to ✅ Done, the orchestrator MUST verify every item below. If any item is missing, the row stays ⏳ and the orchestrator goes back and completes the missing action — do NOT mark ✅ with caveats in the Notes column.

- [ ] `/finalise` skill was invoked (not inlined with `Write`)
- [ ] `*.dod.{N}.*.md` file exists in the story/task directory
- [ ] Story/task `status:` (frontmatter) AND `Status:` (body) both read `accepted` / `Accepted`
- [ ] Full DoD body posted as PR comment (verify URL captured in Decisions Log)
- [ ] Tracker issue `## Document` link re-pointed to the durable branch by `/finalise` (before close/transition)
- [ ] Tracker issue commented (GitHub `gh issue comment` or Jira `addCommentToJiraIssue`)
- [ ] Tracker issue closed (GitHub `gh issue close` confirmed CLOSED) — N/A for Jira (handled by transition)
- [ ] Project board / Jira board moved to Done (verify via tracker state poller — `result.issue.state` or `result.issue.column`; see `shared/resources/tracker-state-poller-subagent.md`)
- [ ] All five Decisions Log lines written: "DoD summary", "DoD body posted to PR", "issue close" (GitHub), "board transition", and the success log entry ("Story accepted" / "Task completed")

This checklist applies in **both lite and standard modes**. Lite mode skips Steps 5–6; it never skips any item in this list.

---

## Pipeline Progress and DoD Summary

Update Pipeline Progress: ✅ finalise.

Locate the DoD summary file created by finalise:

#### develop-story

```bash
ls {story-directory}/story.{epic}.{story}.dod.*.md 2>/dev/null | sort | tail -1
```

#### develop-task

```bash
ls {task-directory}/task.{id}.dod.*.md 2>/dev/null | sort | tail -1
```

Record its path in the Decisions Log: "DoD summary: {path}". Add it to the Completion section of the implementation report as **DoD Summary**: {path}.
