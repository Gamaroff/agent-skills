# Bug Report: Task 81 - The six probe.mjs spec files are referenced nowhere

**Task**: [Link](./task.81.review-security-skill.md)
**Bug ID**: TASK-81-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-07

Confirmed by grep: nothing imported either `probe.mjs`. The suite declared its own `FIXTURES` map
holding the same `{sink, entry}` objects, so the entry paths had two homes and only one was executed.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-07

**Fix Description**: the suite now **imports** the specs and builds its fixture map from them, so the
spec files are the single source of truth and are what actually runs. Added two guard tests:

1. every fixture name resolves to an exported spec with a string `sink` and `entry`;
2. every spec names a sink the corpus knows, and an entry that **exists** and exports the named function.

**A second defect was found and fixed while writing guard 2.** The first version asserted only on
`resolveEntry(...).ok`. That call validates **shape and containment, not existence** — its own comment
says "a path that may not exist yet" — so the assertion read as an existence check while being nothing
of the kind. It would have passed for any well-formed in-repo path, present or absent. It now also
checks `fs.existsSync` and that the named export is a function. Catching this mattered: shipping it
would have meant fixing a vacuity finding with a vacuous test.

**Files Modified**:
- `skills/review-security/tests/review-security.test.js` — imports the specs; +2 guard tests (25 → 27)

**Testing — mutation-proven both ways**:

| Mutation | Before the fix | After the fix |
| --- | --- | --- |
| Point a spec's `entry` at a nonexistent file | green (suite read its own copy) | **3 red**, including the drift guard |
| Change a spec's export name to one that does not exist | green | **3 red**, including the drift guard |

**Verification Steps for QA**: point `fixtures/db-url/probe.mjs`'s `entry` at a nonexistent path and
confirm the suite reds; restore.

## Status History

| Date | Status | Note | Author |
| ---- | ------ | ---- | ------ |
| 2026-09-07 | New | Found during QA cycle 1 (Step 3b diff code review) | qa-task |
| 2026-09-07 | In Progress | Confirmed by grep — specs imported by nothing | qa-fix |
| 2026-09-07 | Ready for QA | Specs imported; 2 guard tests added, both mutation-proven | qa-fix |
