---
name: develop-pipeline-step-4-create-pr
description: Step 4 (create-PR) shared by develop-story and develop-task. Covers /create-pr invocation with --base, --exclude (report path), and tracker-conditional --issue flag, implementation report exclusion via pathspec magic, leak verification, post-PR steps (Decisions Log, lock pr_url update), Jira tracker update (PR-opened comment + In Review transition), pipeline continuation banner, and failure handling. Story vs task variants called out where they differ.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-step-4-create-pr.md. Regenerate via `npm run bundle`. -->

# Develop Pipeline — Step 4: Create PR

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 4. Story/task variants are called out in labeled sub-sections where they differ.

---

## PR Target by Skill (Q2 Derivation)

The PR base branch (`--base {Q2_answer}`) is derived in Phase 0d and differs by skill:

| Skill | Q2 source | Default | Why |
|---|---|---|---|
| `develop-story` | Auto-set (never asked) | `{EPIC_BRANCH}` (`feature/epic.{n}.{name}`) | Story PRs always target their parent epic branch; the epic branch is merged to `develop` manually once all stories complete. See Phase 0d in `develop-pipeline-step-0-resolve-and-prepare.md`. |
| `develop-task`  | Asked via `AskUserQuestion` | `develop` | Tasks are standalone; user picks the base (typically `develop`, sometimes `main` for hotfixes). |

`{Q2_answer}` is resolved before Step 4 runs — Step 4 just consumes the variable. If `{Q2_answer}` is empty here, that is a Phase 0d bug; HALT with `Step 4: missing Q2_answer (PR base branch)`.

---

## Invoke /create-pr

Invoke the `/create-pr` skill passing `--base {Q2_answer}`, `--exclude {implementation-report-path}`, and conditionally `--issue`. The exact invocation commands are in the Implementation Report Exclusion section below. Branch on tracker platform for the `--issue` flag:

- **GitHub** (`TRACKER=github`): also pass `--issue {TRACKER_ISSUE}` — `create-pr` will add `Closes #N` to the PR body and comment on the GitHub issue.
- **Jira** (`TRACKER=jira`): omit `--issue` — `create-pr` handles Bitbucket PR creation natively; Bitbucket Issues are not enabled for this project, so passing `--issue` would cause a failed comment attempt.

#### develop-story (Jira note)
The PR body will reference the story file which contains `jira_key`.

#### develop-task (Jira note)
The PR body will reference the task file which contains `jira_key`.

This pre-supplies the target branch via create-pr's Step 0, skipping the interactive prompt entirely. Do not wait for create-pr to ask — Q2 is already resolved.

---

## Implementation Report Exclusion

`create-pr` will automatically commit any uncommitted code changes before opening the PR. At this point the implementation report is partially complete (Steps 1–3 documented). **CRITICAL**: The implementation report file must NOT be included in create-pr's auto-commit.

Pass `--exclude {implementation-report-path}` to `/create-pr` so it forwards the flag to `/commit-changes`, which switches to full-tree staging with explicit pathspec exclusion (`git add -A -- '.' ':(exclude){report-path}'`). This is deterministic exclusion — not timing-dependent unstaging.

#### develop-story invocation

```
/create-pr --base {Q2_answer} --issue {TRACKER_ISSUE} --exclude {implementation-report-path}
```

#### develop-task invocation

```
/create-pr --base {Q2_answer} --issue {TRACKER_ISSUE} --exclude {implementation-report-path}
```

(Omit `--issue` when `TRACKER=jira` per the rule above.)

After create-pr completes, verify the report was not committed using an exact-path match (avoids false positives from other `.implementation.*.md` files):

```bash
git log -1 --name-only HEAD | grep -Fxq "{implementation-report-path}" && echo "LEAK DETECTED" || echo "OK"
```

If the verification prints `LEAK DETECTED`, note this in the Issues Log (does not warrant a halt — the report will be updated again in Step 8 with a superseding commit). A leak here means the `--exclude` pathspec did not take effect; investigate before the next pipeline run.

The report will continue to be updated through Steps 5–8, and its final state will be captured in the dedicated Step 8 commit.

---

## Post-PR Steps (shared)

After the PR is created:
- Record the PR URL in the Decisions Log and in the **PR** field of the Completion section
- Update Pipeline Progress Notes: `PR #{N}: {url}` — e.g. `PR #42: https://github.com/org/repo/pull/42`
- Update Pipeline Progress: ✅ create-pr
- **Update the lock file with the PR URL** so the PreCompact hook can post pause comments:
  ```bash
  jq --arg url "{PR_URL}" '.pr_url = $url' .claude/state/develop-pipeline.lock \
    > .claude/state/develop-pipeline.lock.tmp && mv .claude/state/develop-pipeline.lock.tmp .claude/state/develop-pipeline.lock
  ```

### Post-PR State Verification (shared — uses tracker state poller)

Invoke the tracker state poller (see `references/tracker-state-poller-subagent.md`) via an Explore subagent with `PR_NUMBER={PR_NUMBER}` and `ISSUE_KEY=` (empty). Verify:

- `result.pr.state == "OPEN"` → proceed normally
- `result.pr.state == "MERGED"` or `"CLOSED"` → log warning in Issues Log: "PR #{PR_NUMBER} unexpectedly {state} after creation — possible auto-merge or branch policy"; proceed (non-blocking)
- `result.errors | length > 0` → log each error in Issues Log; proceed (non-blocking)

Log in Decisions Log: "Post-PR state check: PR #{PR_NUMBER} state = {state}. errors = {error_count}."

---

## Jira Tracker Update (when `TRACKER=jira` and `TRACKER_ISSUE` is set)

> **MUST execute — pipeline action, not optional sync.** Do not skip on the basis of any user memory that says "Jira sync is manual" (e.g. `feedback_jira_sync_manual_only.md`). That rule applies only to `/create-epic`, `/create-story`, `/create-task` — never to develop-pipeline steps. This is the symmetric Jira counterpart to the GitHub `gh issue comment` posted by `create-pr` in the `TRACKER=github` path.

After extracting the PR URL from `create-pr`'s output, use the Atlassian MCP tools:

1. **Post PR-opened comment** — call `addCommentToJiraIssue`:
   - `cloudId`: {hostname from `JIRA_URL`}
   - `issueIdOrKey`: `{TRACKER_ISSUE}`
   - `commentBody`: `"PR opened — {PR_URL}"`
   - `contentFormat`: `"markdown"`
   - On failure: log warning and continue (non-blocking)

2. **Transition to "In Review"** — call `getTransitionsForJiraIssue` then `transitionJiraIssue`:
   - Call `getTransitionsForJiraIssue` with `cloudId` and `issueIdOrKey: {TRACKER_ISSUE}`
   - Find a transition matching "In Review", "Code Review", or "Ready for Review" (case-insensitive, try in that order)
   - If found: call `transitionJiraIssue`; log "✅ Jira issue {TRACKER_ISSUE} moved to {transition name}"
   - If not found: log "⚠️ No review-phase transition available — issue remains In Progress" (non-blocking)

Log in Decisions Log: "Jira {TRACKER_ISSUE} — PR comment posted; status: {transition name or 'In Progress (no review transition)'}."

---

## On Failure

#### develop-story
Log in Issues Log. Invoke the `/commit-changes` skill to commit the report (suggested message: `docs(story.{epic}.{story}): implementation report — create-pr failure`), push, then HALT.

#### develop-task
Log in Issues Log. Invoke the `/commit-changes` skill to commit the report (suggested message: `docs(task.{id}): implementation report — create-pr failure`), push, then HALT.

---

## Pipeline Continuation (CRITICAL — PIPELINE DOES NOT END HERE)

Steps 5–8 are mandatory. Do NOT emit a "Step 4 COMPLETE" banner here — that competes with the Step Transition Protocol banner in SKILL.md and creates ambiguity at the boundary. The single banner emitted at this transition is the Step 5 banner from the Step Transition Protocol (`═══ DEVELOP-{STORY,TASK} PIPELINE: STEP 5/8 — QA REVIEW ═══`), output by the orchestrator *after* the lock-advance Bash call.

Record `PR created: {PR URL}` in the implementation report's Decisions Log only — not as a user-facing banner.
