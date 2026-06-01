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

## GitHub Board Update (when `TRACKER=github` and `TRACKER_ISSUE` is set)

> **MUST execute — pipeline action, not optional sync.** This is the GitHub Projects counterpart to the Jira "In Review" transition below. `create-pr` already posts the PR-opened `gh issue comment`; this step additionally moves the issue's board column.

After the PR URL is confirmed, move the issue to **"In Review"** on the GitHub Projects board (graceful — warn and continue on any failure):

```bash
(
  OWNER=$(gh repo view --json owner -q '.owner.login')
  REPO_NAME=$(gh repo view --json name -q '.name')
  BOARD_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')

  RESPONSE=$(gh api graphql -f query='
  {
    repository(owner: "'"$OWNER"'", name: "'"$REPO_NAME"'") {
      issue(number: {TRACKER_ISSUE}) {
        projectItems(first: 10) {
          nodes {
            id
            project {
              id
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options { id name }
                  }
                }
              }
            }
          }
        }
      }
    }
  }')

  ITEM_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].id // empty')
  PROJECT_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.id // empty')
  STATUS_FIELD_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Status") | .id // empty')
  IN_REVIEW_OPTION_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Status") | .options[] | select(.name == "In Review") | .id // empty')

  if [ -z "$ITEM_ID" ] || [ -z "$PROJECT_ID" ] || [ -z "$STATUS_FIELD_ID" ] || [ -z "$IN_REVIEW_OPTION_ID" ]; then
    echo "⚠️  Could not resolve project item or In Review option — skipping board update"
    echo "    ITEM_ID=${ITEM_ID} PROJECT_ID=${PROJECT_ID} STATUS_FIELD_ID=${STATUS_FIELD_ID} IN_REVIEW_OPTION_ID=${IN_REVIEW_OPTION_ID}"
  else
    gh api graphql -f query='
    mutation {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: "'"$PROJECT_ID"'"
          itemId: "'"$ITEM_ID"'"
          fieldId: "'"$STATUS_FIELD_ID"'"
          value: { singleSelectOptionId: "'"$IN_REVIEW_OPTION_ID"'" }
        }
      ) {
        projectV2Item { id }
      }
    }' \
      && echo "✅ Issue #{TRACKER_ISSUE} moved to In Review on Projects board" \
      || echo "⚠️  Board In Review update failed — continuing"
  fi
) || echo "⚠️  GitHub board In Review update skipped (gh project unavailable or auth scope missing)"
```

> The board must have a Status column option named exactly **"In Review"**. If the project uses a different label (e.g. "Review", "Code Review"), the option lookup returns empty and the block logs a skip — update `select(.name == "In Review")` to match the exact option name.

Log in Decisions Log: "GitHub board: issue #{TRACKER_ISSUE} → In Review (or ⚠️ skipped — see output)."

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

2. **Transition to "In Review"** — follow `references/jira-transition-protocol.md` exactly with `candidates = ["In Review", "Code Review", "Ready for Review"]`. The protocol's MUST-NOT clauses are binding: if no transition matches, log the skip and return without calling `transitionJiraIssue`. Do NOT fall back to `To Do`, `In Progress`, or any other transition — the issue must remain `In Progress` through QA when no review state exists in the workflow.

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
