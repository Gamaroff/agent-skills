# Standards

> **Audience:** anyone authoring or generating documents in a project that uses these skills.

Rules and schemas that documents in a consuming project must follow. Skills enforce these patterns when generating; humans must follow them when hand-authoring.

## Document schemas

- [PRD documents](./prd-documents.md) — Product Requirements Documents
- [Epic documents](./epic-documents.md) — epic frontmatter and layout
- [Story documents](./story-documents.md) — story frontmatter, layout, artifacts
- [Task documents](./task-documents.md) — task frontmatter, layout, artifacts

## Cross-cutting rules

- [File naming](./file-naming.md) — canonical filename patterns
- [Status lifecycle](./status-lifecycle.md) — frontmatter `status:` values and transitions
- [Plan file locations](./plan-file-locations.md) — where implementation plans live
- [Epic registry](./epic-registry.md) — global epic numbering
- [Task registry](./task-registry.md) — global task numbering

## Section template

All schema docs in this directory follow this order:

1. Purpose
2. Directory layout
3. File naming
4. Frontmatter schema (table)
5. Required body sections (if any)
6. Co-located artifacts
7. Status lifecycle (link to canonical + per-doc transitions)
8. Branch strategy (if applicable)
9. Prerequisites checklist
10. Invocation
11. See also
