# Document Status Lifecycle

> **Audience:** anyone setting `status:` frontmatter on a story, epic, or task document.

The canonical specification lives at [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md). This file is a thin pointer — read the canonical version for the full table, transition rules, and tooling contract.

## TL;DR

```
draft → planned → ready-for-development → in-progress → ready-for-review → accepted
```

`cancelled` is reachable from any non-terminal state.

**Sync rule:** frontmatter `status:` uses `lowercase-kebab-case`; the `**Status:**` line in the document body uses `Title Case`. Both must be updated in the same edit. `finalise` enforces this.

## See also

- Canonical spec: [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md)
- [Story documents](./story-documents.md)
- [Task documents](./task-documents.md)
- [Epic documents](./epic-documents.md)
