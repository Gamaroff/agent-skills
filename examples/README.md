# Examples

Worked examples of the skills in this repository being applied to real work.

## `docs/tasks/`

The [`docs/tasks/`](../docs/tasks/) directory contains the actual task documents, QA reports, gate files, implementation reports, and Sprint Review summaries produced by the develop/QA pipeline as it iterated on this codebase itself.

Each task subdirectory typically includes:

| Artifact | Pattern | Produced by |
|---|---|---|
| Task spec | `task.{n}.{name}.md` | `create-task` |
| Review | `task.{n}.{name}.review.{date}.md` | `review-task` |
| QA report | `task.{n}.qa.{m}.{name}.md` | `qa-task` |
| Gate file | `task.{n}.gate.{m}.{name}.yml` | `qa-gate` |
| Implementation log | `task.{n}.implementation.{m}.{name}.md` | `develop-task` |
| DoD checklist | `task.{n}.dod.{m}.{name}.md` | `finalise` |
| Sprint review | `sprint-review-summary.md` | `finalise` |

## How to use these as reference

- **Authoring a task?** Open one of the task spec files (e.g. `task.6.create-epic-jira-tracker-path/task.6.create-epic-jira-tracker-path.md`) to see the expected structure and tone.
- **Looking at QA output?** The `*.qa.*.md` files show how `qa-task` formats findings, severity, NFR coverage, and traceability.
- **Tracking a full lifecycle?** Walk through one task directory top-to-bottom: spec → review → implementation report → QA report → gate file → DoD → sprint summary.

These are real artifacts, not curated demos — expect some inconsistencies and dead-ends. They're representative of how the skills perform in practice rather than how they perform on a perfect happy-path.
