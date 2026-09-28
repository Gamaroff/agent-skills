# Bug Report: Task 151 - An H2 with no text counts as an axis

**Task**: [task.151](./task.151.review-verifies-claimed-properties.md)
**Bug ID**: TASK-151-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR-1)
**Date Found**: 2026-09-28

## Description

Cycle 1's fix for TASK-151-BUG-1 treats a half as absent only when `h2s()` returns an empty list.
A heading line with no text — `##  `, `##\t\t`, `## #`, `## ##` — still yields an entry (`" "`,
`"\t"`, `"#"`, `"##"`), so a file of empty headings is labelled `architecture` with blank slots.

## Steps to Reproduce

```bash
command node -e 'const {deriveAxes}=require("./shared/resources/prepass-axes.js"); console.log(JSON.stringify(deriveAxes({archDir:"x",readFile:()=>"##  \n"})))'
```

## Expected Behavior

An empty ATX heading (only whitespace, or only a closing `#` run) is not an axis; a half with only
such headings falls back.

## Actual Behavior

`{"source":"architecture","domains":[" "],"axes":[" "]}`.

## Impact

Same outcome as TASK-151-BUG-1 through a different input; the prompt prose's claim that a half
counts only when it has a heading is false for these inputs.

## Recommendation

Trim the captured text, strip a closing `#` run that forms the whole content (CommonMark), drop
empty results; add these inputs to the CR-1 test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-28

**Root Cause**: the heading reader was a regex grown one edge case per QA cycle; it had no rule for
an empty heading, so its capture returned whitespace or the closing `#` run as the heading text.

**Narrowing residue**: `shared/resources/prepass-axes.js` (trigger: pipeline offer — every MEDIUM on
gates 1–2 names this file at HIGH 0). **Move: consolidate** — the next patch would have been a third
correction to the same regex; the reader is replaced by one function, `atxH2`, written to the
CommonMark ATX rules and pinned by a table of one case per rule.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-28

**Fix Description**: `atxH2(line)` returns the heading text, `""` for an empty heading, or `null`
for a non-heading; `h2s` keeps only non-empty text.

**Files Modified**: `shared/resources/prepass-axes.js` (+ bundled copies),
`shared/resources/tests/prepass-axes.test.mjs` ("atxH2 follows the CommonMark ATX rules…", 16 cases).

**Testing**: 3 mutation proofs, each reds the table test by name
(`.claude/state/t151-qafix2-mutations.log`).

## Status History

| Date       | Status       | Changed By | Notes                                   |
| ---------- | ------------ | ---------- | --------------------------------------- |
| 2026-09-28 | New          | qa-task    | QA cycle 2 refute pass, C2-CR-1         |
| 2026-09-28 | In Progress  | qa-fix     | Narrowing offer — consolidate           |
| 2026-09-28 | Ready for QA | qa-fix     | atxH2 + CommonMark table, 3 proofs red  |
