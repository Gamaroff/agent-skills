---
name: develop-pipeline-step-2-review
description: Step 2 (review) shared by develop-story and develop-task. Covers gate check logic (skip conditions), review skill invocation, output format autonomous decision, outcome detection with post-review status table, and blocking/non-blocking findings handling. Story vs task variants are called out where they differ (skill name, file patterns, status values, commit message format).
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-step-2-review.md. Regenerate via `npm run bundle`. -->

# Develop Pipeline — Step 2: Review

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 2. Story/task variants are called out in labeled sub-sections where they differ.

---

## Gate Check

Re-read the document's `Status:` field (captured in Phase 0). Then check for an existing review report:

#### develop-story
```bash
ls {story-directory}/story.{epic}.{story}.review.*.md 2>/dev/null | sort | tail -1
```

#### develop-task
```bash
ls {task-directory}/task.{id}.review.*.md 2>/dev/null | sort | tail -1
```

### Skip/Run Decision Table

#### develop-story

| Pre-review status       | Review report exists? | Action                                                                               |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `Draft`                 | Either                | Run `/review-story` — story needs validation and promotion                           |
| `Ready for Development` | Yes                   | **Skip** — story reviewed and report exists; log and proceed                         |
| `Ready for Development` | No                    | Run `/review-story` — status set without completing a review                         |
| `In Progress`           | Yes                   | **Skip** — review already completed; log and proceed                                 |
| `In Progress`           | No                    | Run `/review-story` — story may have been marked In Progress without a proper review |

#### develop-task

| Pre-review status       | Review report exists? | Action                                                                               |
|-------------------------|-----------------------|--------------------------------------------------------------------------------------|
| `Planned`               | Either                | Run `/review-task` — task needs validation and promotion                             |
| `Ready for Development` | Yes                   | **Skip** — task reviewed and report exists; log and proceed                          |
| `Ready for Development` | No                    | Run `/review-task` — status set without completing a review                          |
| `In Progress`           | Yes                   | **Skip** — review already completed; log and proceed                                 |
| `In Progress`           | No                    | Run `/review-task` — task may have been marked In Progress without a proper review   |

---

## If Skipping

#### develop-story
- Log in Decisions Log: "review-story skipped — story status is `{status}` and review report exists at `{path}`"
- Update Pipeline Progress: ✅ review-story (skipped — already reviewed)

#### develop-task
- Log in Decisions Log: "review-task skipped — task status is `{status}` and review report exists at `{path}`"
- Update Pipeline Progress: ✅ review-task (skipped — already reviewed)

Proceed to Step 3.

---

## If Running the Review Skill

#### develop-story
Invoke the `/review-story` skill with the story file path.

**Output format gate**: `/review-story` Step 0 asks for output format. The pipeline auto-answers "Comprehensive report" (the canonical default lives in `references/develop-pipeline-autonomous-defaults.md`). Log: "review-story output: Comprehensive report — required for pipeline audit trail".

After review-story completes, locate the generated review report:
```bash
ls {story-directory}/story.{epic}.{story}.review.*.md 2>/dev/null | sort | tail -1
```
Record the path in the Decisions Log: "Review report: {path}". If no review report file is found, log a warning in the Issues Log ("review-story did not produce a review report file") but do not halt.

#### develop-task
Invoke the `/review-task` skill with the task file path.

**Output format gate**: `/review-task` Step 0 asks for output format. The pipeline auto-answers "Comprehensive report" (the canonical default lives in `references/develop-pipeline-autonomous-defaults.md`). Log: "review-task output: Comprehensive report — required for pipeline audit trail".

After review-task completes, locate the generated review report:
```bash
ls {task-directory}/task.{id}.review.*.md 2>/dev/null | sort | tail -1
```
Record the path in the Decisions Log: "Review report: {path}". If no review report file is found, log a warning in the Issues Log ("review-task did not produce a review report file") but do not halt.

---

## Detecting Outcomes

Re-read the document file and check the `Status:` field. Apply these autonomous rules:

#### develop-story post-review status table

| Post-review status      | Action                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `Ready for Development` | Proceed — draft promoted                                           |
| `In Progress`           | Proceed — acceptable intermediate state                            |
| `Draft` (unchanged)     | review-story left it Draft — log as issue, HALT and report to user |
| Downgraded / unclear    | HALT — report to user                                              |

#### develop-task post-review status table

| Post-review status      | Action                                                                  |
|-------------------------|-------------------------------------------------------------------------|
| `Ready for Development` | Proceed — clean pass or Planned promoted                                |
| `In Progress`           | Proceed — acceptable intermediate state                                 |
| `Planned` (unchanged)   | review-task left it Planned — log as issue, HALT and report to user     |
| Downgraded / unclear    | HALT — report to user                                                   |

---

## Handling Findings

#### develop-story

- **Draft → Ready for Development**: Log "Draft promoted to Ready for Development by review-story" in Decisions Log. Proceed autonomously.
- **Non-blocking suggestions**: Log as "Proceeding despite minor review suggestions: {list}" and continue.
- **Clean pass**: Log "Story review passed" and continue.
- **Blocking issues** (contradictory specs, missing ACs, status still `Draft`): Log each in Issues Log, invoke `/commit-changes` (message: `docs(story.{epic}.{story}): implementation report — review-story blocking halt`), then HALT: "review-story could not resolve blocking issues — human input required before development can proceed".

#### develop-task

- **Planned → Ready for Development**: Log "Planned promoted to Ready for Development by review-task" in Decisions Log. Proceed autonomously.
- **Non-blocking suggestions**: Log as "Proceeding despite minor review suggestions: {list}" and continue.
- **Clean pass**: Log "Task review passed" and continue.
- **Blocking issues** (missing success criteria, conflicting specs, or status still `Planned` after review): Log each in Issues Log, invoke `/commit-changes` (message: `docs(task.{id}): implementation report — review-task blocking halt`), then HALT: "review-task could not resolve blocking issues — human input required before development can proceed".

---

## Update Pipeline Progress

#### develop-story
Update Pipeline Progress: ✅ review-story

#### develop-task
Update Pipeline Progress: ✅ review-task
