# Activation Phrases

> **Audience:** developers who want to invoke skills with natural language instead of slash commands.

How to phrase requests so the right skill auto-activates. Each phrase pattern below is taken from the skill's `description` field (the metadata always in context) and adapted to common usage.

For slash-command form, see [commands](./commands.md). For the three invocation styles (natural language / explicit / slash), see [invocation](./invocation.md).

## Authoring

| Say something like… | Activates |
|---|---|
| "Create a PRD for a new mobile app" | `new-product-prd` |
| "Create a brownfield PRD for the auth refactor" | `create-prd` |
| "Shard this PRD" / "Split the PRD into sections" | `shard-prd` |
| "Create an epic for the notifications feature" | `create-epic` |
| "Create the next story for epic 2" | `create-story` |
| "Create a task for the database migration" | `create-task` |
| "Create a bug report for the login crash" | `create-bug-report` |

## Review

| Say something like… | Activates |
|---|---|
| "Review the PRD" | `review-prd` |
| "Review epic 178" | `review-epic` |
| "Review story 2.3" / "Story 2.3 has unclear requirements" | `review-story` |
| "Review this task" | `review-task` |
| "Validate story 2.3" / "Is story 2.3 ready?" | `review-story --validate` |
| "Review this bug report" / "Is this bug ready to fix?" | `review-bug` (the second phrasing picks `--validate`) |
| "Review my changes" / "Review this diff" / "Review PR 123" | `review-code` |

## Development

| Say something like… | Activates |
|---|---|
| "Develop and QA this story end to end" | `develop-story` |
| "Develop and QA this task end to end" | `develop-task` |
| "Research and fix this bug end to end" | `develop-bug` |
| "Work the next thing on the roadmap" / "What's next?" | `develop-next` |
| "Work everything that can go in parallel" | `develop-batch` |
| "Implement story 2.3" (lite intent) | `develop` |
| "Create a feature branch from story 2.3" | `create-branch` |
| "Commit these changes" / "Write a commit" | `commit-changes` |
| "Open a PR" / "Create a pull request" | `create-pr` |

## QA

| Say something like… | Activates |
|---|---|
| "Plan tests for story 2.3" / "Risk profile this story" | `qa-planning` |
| "Review the implementation of story 2.3" | `qa-story` |
| "Review the implementation of task 17" | `qa-task` |
| "Fix the QA findings" | `qa-fix` |
| "Waive the gate on story 2.3" / "Override the gate" | `qa-gate` |

## Tracker sync

| Say something like… | Activates |
|---|---|
| "Sync this epic to Jira" / "Publish epic to Jira" | `sync-jira-epic` |
| "Sync this story to Jira" | `sync-jira-story` |
| "Sync this task to Jira" | `sync-jira-task` |
| "Sync this epic to GitHub" / "Publish epic to GitHub" | `sync-github-epic` |
| "Sync this story to GitHub" | `sync-github-story` |
| "Sync this task to GitHub" | `sync-github-task` |
| "File an issue for this" / "Create a ticket" | `create-issue` (platform auto-detected) |

## Lifecycle / change management

| Say something like… | Activates |
|---|---|
| "Finalise story 2.3" / "Check DoD on story 2.3" | `finalise` |
| "The plan changed — we need to pivot" | `change-management` |
| "Story failed, what do we do?" | `correct-course` |
| "Edit epic 178 — change the priority to High" | `edit-epic` |
| "Edit story 2.3 — add an acceptance criterion" | `edit-story` |

## Discovery & meta

| Say something like… | Activates |
|---|---|
| "Find me a skill for X" / "Is there a skill for…" | `find-skills` |
| "Create a new skill for X" | `create-skill` |
| "Document this existing project" | `document-existing-project` |
| "Remember this — we use NX for testing" | `remember-insight` |

## Architecture

| Say something like… | Activates |
|---|---|
| "Create a full-stack architecture" | `architect` |
| "Validate the architecture" | `execute-architect-checklist` |
| "Create a backend architecture doc" | `create-architecture-doc` |
| "Diagram this flow" / "Add a Mermaid sequence diagram" | `mermaid-architect` |

## User Experience & Prototyping

| Say something like… | Activates |
|---|---|
| "Create a low-fidelity mobile wireframe for this layout" | `markdown-wireframe` |
| "Prototype this UI flow using Stitch" / "Design a monochrome grayscale outline" | `markdown-wireframe` |

## Tips for reliable activation

- **Be specific about the artifact.** "Review story 2.3" beats "review this" — the skill's matcher looks for "story" plus context.
- **Mention the verb explicitly.** "Implement", "review", "validate", "create", "edit", "sync" — these are matched against skill descriptions.
- **If activation is ambiguous, use the slash form.** `/qa-story` is unambiguous; "check this" is not.
- **For orchestrators, say "end to end".** "Develop and QA this story end to end" reliably triggers `develop-story` over the lighter `develop`.

## See also

- [Invocation styles](./invocation.md)
- [Commands](./commands.md)
- [Skill catalog](./skill-catalog.md) — full descriptions for every skill
