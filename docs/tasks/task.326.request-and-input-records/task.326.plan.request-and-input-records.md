---
id: task.326.plan
title: "Implementation Plan: doc-id reads request and input records"
type: plan
task-ref: task.326.request-and-input-records.md
---

# Implementation Plan: doc-id reads request and input records

> Requirements and success criteria: [task.326.request-and-input-records.md](task.326.request-and-input-records.md)

## Overview

Two words in one list and one wider exclusion. Write each test first and see it red. Edit
`shared/resources/` only, and bundle.

## Phase-by-Phase Implementation Guide

### Phase 1: The vocabulary

Append to `ARTIFACTS` in `doc-id.js`:

```js
  "request",
  "input",
```

Nothing else in the parser changes: both words take the `{n}.{name}` shape the other numbered artifacts
take. The contract test that pins `ARTIFACTS` to `WORK_ITEM_ARTIFACT_RE` stays green, since the regex is
built from the list. It is not evidence for this task.

### Phase 2: The admission rule

The last line of `isCoLocatedArtifact`:

```js
  return WORK_ITEM_ARTIFACT_RE.test(base) && !/\.(bug|request|input)\./.test(base);
```

Extend point 4 of the comment above it: a request or an input records what somebody else asked or sent,
so `finalise` never rewrites it.

### Phase 3: The migrator, records and bundle

Confirm first, on the unchanged engine, that the migrator blocks on a request in a PRD directory. That
part was read in the code and not run. A fixture needs a PRD registry and a committed tree.

In the naming standard, add a row for each record to the story and task tables, and the same two lines
for PRDs and epics.

## Key Patterns and References

- `doc-id.test.mjs` asserts a name table per kind: add rows to it.
- `bug` is the precedent for an artifact that `finalise` does not admit.

## Testing Approach

The table and the mutation list in § 8 of the task.
