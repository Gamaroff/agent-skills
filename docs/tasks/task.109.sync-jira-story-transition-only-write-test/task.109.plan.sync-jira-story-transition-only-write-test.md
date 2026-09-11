---
id: task.109.plan
title: "Implementation Plan: name the transition-only write path"
type: plan
task-ref: task.109.sync-jira-story-transition-only-write-test.md
---

# Implementation Plan: name the transition-only write path

> Requirements and success criteria: [task.109.sync-jira-story-transition-only-write-test.md](task.109.sync-jira-story-transition-only-write-test.md)

## Overview

One test, one mutation proof. Under an hour of work; the estimate covers the mutation run and the
handoff edit.

## Phase-by-Phase Implementation Guide

### Phase 1: the test

Open `skills/sync-jira-epic/tests/end-to-end.test.js` at the case titled *"the skip path's --json
timestamp matches the one written to the file"* (≈290) and port it: same two-run shape, story fixture,
story field names. Add:

```js
assert.match(written, /\| Status → In Progress \| sync-jira-story \|/);
```

(match the exact status name the fixture's ladder produces — read it from run 2's `--json`, do not
hard-code from memory).

### Phase 2: mutation

Locate the gate: `grep -n "changeLogEntries.length" skills/sync-jira-story/scripts/sync-jira-story.js`.
Force the arm false, run the file, record the failing test name; restore with `git checkout --` **only
after committing the new test** (obs #55: a path-scoped checkout before commit deletes the fix).

## Key Patterns and References

- `skills/sync-jira-story/tests/fake-jira.js` `makeRunner` (≈377)
- `shared/resources/mutation-proving.md`

## Testing Approach

`command node --test skills/sync-jira-story/tests/end-to-end.test.js`; then the full suite.
