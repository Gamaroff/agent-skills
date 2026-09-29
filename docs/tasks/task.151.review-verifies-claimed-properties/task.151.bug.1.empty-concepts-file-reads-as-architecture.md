# Bug Report: Task 151 - A concepts file with no H2 headings reads as `source: architecture`

**Task**: [task.151](./task.151.review-verifies-claimed-properties.md)
**Bug ID**: TASK-151-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 1 diff code review, CR-1)
**Date Found**: 2026-09-28

## Description

`deriveAxes` classifies a half as read whenever its file exists, whatever the file holds. A
`concepts/tech-stack.md` or `concepts/coding-standards.md` with no `## ` headings (only H1/H3, or
empty) yields `source: "architecture"` with an empty `domains` or `axes` list.

## Steps to Reproduce

```bash
command node -e 'const {deriveAxes}=require("./shared/resources/prepass-axes.js"); console.log(JSON.stringify(deriveAxes({archDir:"x",readFile:()=>"# Title\n\n### only h3\n"})))'
```

## Expected Behavior

A half that yields no axes is not a measurement: it takes the fallback list for that half (as a
missing file does) and `source` reports it (`partial` / `fallback`), so Agent B is never dispatched
with blank slots.

## Actual Behavior

`{"reason":"architecture","source":"architecture","domains":[],"axes":[],"read":[…2 files]}` — the
strongest `source` value on the weakest input. Agent B's prompt then reads "domains are: ." and
"for each of these documented standards … —  —".

## Impact

The obs #130 failure returns in a new shape: a review measured against nothing, labelled as
measured against the repository's own architecture.

## Recommendation

Treat an empty `h2s()` result like a missing file for that half; add a fixture test for a concepts
file with no H2s.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-28

**Root Cause**: `take()` returned the file text whenever the read succeeded, and `source` was
computed from "was a file read", not "did the file yield an axis". A file with no `## ` heading
produced an empty list under `source: architecture`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-28

**Fix Description**:

- `take()` now returns the file's H2s (or `null` when absent); a half counts only when its list is
  non-empty, so an empty half takes the fallback list and `source` reports `partial` / `fallback`.
- Same cycle, same function: only ENOENT/ENOTDIR are absence; any other read error propagates and
  the CLI exits 1 with empty stdout (CR-2).

**Files Modified**:

- `shared/resources/prepass-axes.js`
- `shared/resources/tests/prepass-axes.test.mjs` — "a concepts file with no H2 heading is absent,
  not an empty measurement (CR-1)"
- Prose that states the `source` semantics: both prompt files, review-task and review-story
  `SKILL.md`, CHANGELOG

**Testing**: mutation-proven — reverting the non-empty check reds the CR-1 test by name
(`.claude/state/t151-qafix1-mutations.log`).

**Verification Steps for QA**:

1. `command node -e 'const {deriveAxes}=require("./shared/resources/prepass-axes.js"); console.log(JSON.stringify(deriveAxes({archDir:"x",readFile:()=>"# Title\n"})))'` → `source: "fallback"`, fallback lists.
2. `command node --test shared/resources/tests/prepass-axes.test.mjs` → 14/14.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-09-28 | New          | qa-task    | QA cycle 1, CR-1               |
| 2026-09-28 | In Progress  | qa-fix     | Investigation                  |
| 2026-09-28 | Ready for QA | qa-fix     | Fix + test, mutation-proven    |
| 2026-09-28 | Closed       | qa-task    | Verified in QA cycle 3 (gate 3 PASS)    |
