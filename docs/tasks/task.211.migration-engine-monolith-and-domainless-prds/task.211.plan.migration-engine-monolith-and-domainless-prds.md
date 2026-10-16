---
id: task.211.plan
title: "Implementation Plan: Migration engine: monolith and domain-less PRDs"
type: plan
task-ref: task.211.migration-engine-monolith-and-domainless-prds.md
---

# Implementation Plan: Migration engine: monolith and domain-less PRDs

> Requirements and success criteria: [task.211.migration-engine-monolith-and-domainless-prds.md](task.211.migration-engine-monolith-and-domainless-prds.md)

## Overview

Three engine changes in `shared/resources/migrate-doc-numbering.mjs`, each followed by removing the
matching refusal from `skills/review-prd/scripts/migration-guard.mjs` (task.204). Line numbers are as
of task.204's branch head `687560bb`; re-grep before editing.

## Phase-by-Phase Implementation Guide

### Phase 1: Frontmatter

`editFrontmatter(text, edits)` (`:721`) — today:

```js
if (!isFence(lines[0])) return text;
```

Change: when there is no opening fence, prepend `---\n` + the edited keys (and `type: prd` for a PRD
document) + `---\n`. When the opening fence has no closing fence, do not edit: the plan (where
`docFields` is built, near `:944`) records a blocker `unclosed-frontmatter` for that document so the
apply never moves it. Post-check then reads `prd_number` from the new block.

### Phase 2: Outside links

Prefilter (`:1026`–`:1041`). Build `outsideSources` = every key of `planned.fileMap` that is not under
`root` (the monolith). For a file outside the tree, read it also when its text contains any
`outsideSources` path, or the source's path relative to the file's directory. The existing link pass
(`replaceTargets`, `:876`) and literal pass then re-point it. Do **not** add bare basenames: the token
pass rewrote the bare word `prd` across the tree in task.204 gate 7.

### Phase 3: Domain

Placement (`:455`–`:471`): where `domain` would be `"."` (root L1, root L2, root `index.md`), look up a
domain from `names` first. `--name` parsing (`:1523`): accept `<path>=<domain>/<slug>`; split on the
first `/` of the value; validate each part with `doc-id.js`'s slug rule; store `{domain, slug}`. With
no domain → blocker `needs-domain` naming the `--name` form. With one → `newDir = P.join(root, domain,
newStem)`, `domain = <domain>`.

review-prd's plan block: add `needs-domain` to the blocker instructions ("ask for `<domain>/<slug>`,
add the line to `MIG_NAME`").

## Key Patterns and References

- Blockers use the engine's existing `blocker(code, path, detail)` shape.
- task.204's guard and its gate-8 test row show each shape as a fixture; reuse them.

## Testing Approach

Per phase: an engine row in `shared/resources/tests/migrate-doc-numbering.test.mjs` (fixture repo,
`--check` then `--apply`, then `doc-id check --corpus`, then byte comparison of every untouched file),
and the matching assertion flipped in `evals/shared/tests/prd-skill-numbering.test.mjs`'s gate-8 row.
