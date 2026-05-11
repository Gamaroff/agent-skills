# Plan File Locations

> **Audience:** anyone (human or agent) writing an implementation plan in this repo.

Implementation plans must be co-located with the work they describe — never left in agent scratch directories like `~/.agents/plans/` or `/tmp/`. Plans outside the repo are not version-controlled and invisible to teammates.

## Locations

| Plan type | Location | Filename |
|---|---|---|
| Task plan | Inside the task directory | `task.{N}.plan.{descriptive-name}.md` |
| Story plan | Inside the story directory (alongside story doc) | `story.{E}.{S}.plan.{descriptive-name}.md` |
| General plan (not tied to a task/story) | `.agents/plans/` in the repo | `{descriptive-kebab-case-name}.md` |

## Rule

If a plan was generated upstream by an agent scratch directory, **relocate its content** into the appropriate in-repo location above. Do not link to home-directory paths — they're outside the repo, not version-controlled, and invisible to teammates.

## See also

- [Task documents](./task-documents.md)
- [Story documents](./story-documents.md)
- [File naming](./file-naming.md)
