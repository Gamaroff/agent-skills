---
id: task.325.plan
title: "Implementation Plan: The docs-only CI rule can exclude a path"
type: plan
task-ref: task.325.docs-only-rule-exclusions.md
---

# Implementation Plan: The docs-only CI rule can exclude a path

> Requirements and success criteria: [task.325.docs-only-rule-exclusions.md](task.325.docs-only-rule-exclusions.md)

## Overview

Six lines in one predicate and one check in the configuration reader. Write each test first and see it
red. Edit `shared/resources/` only, and bundle. Re-read both places after task 320 lands: line numbers
will have moved.

## Phase-by-Phase Implementation Guide

### Phase 1: The predicate

The end of `isDocsPath`, as it was run in the trial (222 of 222 tests in four suites):

```js
  if (!Array.isArray(globs)) return matchesAnyGlob(file, globs);
  const no = globs.filter((g) => typeof g === "string" && g.startsWith("!"));
  if (no.length && matchesAnyGlob(file, no.map((g) => g.slice(1)))) return false;
  return matchesAnyGlob(file, globs.filter((g) => !no.includes(g)));
```

Add one line to the predicate's comment: an exclusion wins in any order, and every reader must ask this
function, never `matchesAnyGlob` with the patterns.

### Phase 2: The configuration check

Beside the existing check of `patterns`: throw a `UsageError` when every entry starts with `!`, and when
an entry is `!` alone. Name `ci.docsOnly.patterns` in both. An empty list keeps its present answer.

### Phase 3: Records and bundle

In the reference, the row of `ci.docsOnly.patterns` and the "Executable markdown is not documentation"
point. In the runbook, the "Mirror the list" point. The default does not change.

## Key Patterns and References

- `CI_KEYS` / `DOCS_ONLY_KEYS` stay as they are: there is no new key.
- `reenter-qa-after-finalise.test.sh` shows how a committed `skills-config.yaml` is read at `HEAD`.

## Testing Approach

The table and the mutation list in § 8 of the task.
