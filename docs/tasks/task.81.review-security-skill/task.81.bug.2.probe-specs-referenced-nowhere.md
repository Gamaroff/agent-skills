# Bug Report: Task 81 - The six probe.mjs spec files are referenced nowhere

**Task**: [Link](./task.81.review-security-skill.md)
**Bug ID**: TASK-81-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-09-07

## Description

Phase 2 ships `tests/fixtures/redis-tls/probe.mjs` and `tests/fixtures/db-url/probe.mjs`, each
exporting `engaged` and `inert` probe specs. Nothing imports either file.

`review-security.test.js` declares its own `FIXTURES` map with the same `{sink, entry}` objects
written out again, so the entry paths exist in two places and only one of them is executed.

## Steps to Reproduce

```bash
grep -rn "fixtures/redis-tls/probe\|fixtures/db-url/probe" --include='*.js' --include='*.mjs' . \
  --exclude-dir=node_modules --exclude-dir=.git
```

Returns only the spec files themselves.

## Expected Behavior

The probe specs are the declared artifact — the task's Files Summary lists them, and the prompt
describes a spec as the agent's deliverable. The test should consume them, so that the specs are
what is actually executed.

## Actual Behavior

They are dead code with zero coverage. Editing a spec's `entry` to a nonexistent path leaves the
suite green, because the suite reads its own copy. The files can drift from the paths that are
really probed and nothing reports it.

## Impact

Two failure modes, neither loud:

1. **Silent drift** — the specs can become wrong while the suite stays green, and they are the
   artifact a reader consults to learn the spec shape.
2. **The declared deliverable is unexercised** — Phase 2's "a `probe.mjs` spec per fixture" ships as
   a file that demonstrably works for nobody, which is a weaker version of the presence-without-
   engagement problem this very task exists to name.

## Recommendation

Have the test import the specs instead of redeclaring them:

```js
const { engaged: redisEngaged, inert: redisInert } = await import(".../redis-tls/probe.mjs");
```

Build the `FIXTURES` map from the imported specs so there is one source of truth, and the specs are
executed rather than merely present.

## Status History

| Date | Status | Note | Author |
| ---- | ------ | ---- | ------ |
| 2026-09-07 | New | Found during QA cycle 1 (Step 3b diff code review) | qa-task |
