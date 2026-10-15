---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Medium'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'A stray four-backtick fence turns Steps 6–7 of create-epics-from-shards into a code block, so no engine reaches the Step 7 guard'
---

# Bug Report: Task 205 - A stray fence hides the Step 7 guard from every engine

**Bug ID**: TASK-205-BUG-14
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA cycle 6, gate 6, QA6-1)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Medium
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 6)

---

## Bug Description

**Summary**: The Step 5 `epics/index.md` template opens with a four-backtick `markdown` fence at
line 302 and closes it early at line 334, straight after the inner mermaid block. The real closing
fence at line 349 then opens a new code block that runs to line 471. Steps 6 and 7, and the Step 7
batch guard this task added, sit inside it.

**Actual Behavior**:

- The security probe's fence form cannot find `### Step 7: Quality Validation`
  (`entry-not-probeable: heading not found`). The QA cycle 6 record holds `executed: 0` for a
  boundary, which `/finalise`'s zero-guard fails.
- `qa-execute-snippets.mjs` finds 1 bash block in the file, not the 4 it has.
- GitHub renders Steps 6–7 as a code block.

**Expected Behavior**: The template closes once, at line 349. Steps 6–7 are prose with their bash
blocks visible, and the fence probe reaches the Step 7 guard.

## Provenance

The stray fence is pre-existing. `origin/develop` has the same pair at lines 330 and 345, from
`0260bd17b` (2026-05-28, by `git blame`). It becomes this task's defect because the Step 7 guard is
new here, and the fence is what puts the guard out of every engine's reach.

## Location

`skills/create-epics-from-shards/SKILL.md:334`

## Reproduction

```bash
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename \
  --entry 'fence:skills/create-epics-from-shards/SKILL.md#Step 7: Quality Validation' \
  --slot "$(printf '{PRD dir}"\nE0="{E0}"; COUNT="{count}')" \
  --cases-file .claude/state/t205-qa6-cases2.json --repo-root "$(git rev-parse --show-toplevel)" --json
# → verdict unverifiable, reason entry-not-probeable, detail: heading not found
```

QA ran the same command in a scratch worktree with line 334 deleted. Result: `engages`, 8/8
(2 legitimate accepted, 6 hostile rejected: misnamed file, missing, duplicate (P, E), prefix
collision `epic.2.20`, second-of-batch missing, `E0=0`).

## Recommendation

Delete the stray fence at line 334, then re-run the probe against the committed doc and record it.
Optionally add a guard that every `SKILL.md` fence closes where it opens.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The Step 5 index template closed its four-backtick fence twice (lines 334 and 349). The
test that executes the Step 7 block found it with a regex that ignores fence nesting, so it passed
while every fence-aware reader (security probe, QA snippet runner, GitHub) saw a code block.
**Fix Description**: Deleted the early closing fence. The test now reads every bash block through the
repository's one fence reader (`qa-execute-snippets.mjs` `extractBlocks`), so a block the engines
cannot see fails the test instead of passing it.
**Files Modified**: `skills/create-epics-from-shards/SKILL.md`, `tests/epic-numbering-retirement.test.js`
**Testing**: fence probe against the fixed doc: `engages`, 8/8. Mutation (stray fence restored) turns
`create-epics-from-shards blocks: … Step 7 checks the batch` red. All 9 epic skills: fence-reader
block count equals the raw `bash` fence count.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 6 (boundary probe declined `entry-not-probeable`) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 6 fix pass |
