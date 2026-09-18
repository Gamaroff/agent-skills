# Bug Report: Task 121 - The tracker blocks call the helper by a skill-dir-relative path beside an engine call that is repo-root-relative, so from the cwd the block assumes the helper is not found and the post is skipped

**Task**: [Link](./task.121.cycle-scoped-qa-tracker-comments.md)
**Bug ID**: TASK-121-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 3 — reviewer CR-1, verified)
**Date Found**: 2026-09-18

## Description

In the tracker blocks — qa-task Step 13b (:1361), qa-story Step 6b (:1932), qa-fix Step 7 tracker
block (:915) — the cycle-2 fix calls `bash references/qa-cycle.sh` while the engine call beside it is
`node .agents/skills/<skill>/references/tracker-comment.js`. Those two forms resolve from different
working directories. From the repository root — the cwd the engine call presupposes, and the one this
pipeline actually runs in — `bash references/qa-cycle.sh` is `No such file or directory` (exit 127),
`|| QA_CYCLE=` empties the variable, and the block takes its "cycle unknown → skipped" branch on
**every** cycle: the original "nothing posts" outcome with a ⚠️ attached. (The PR-lead blocks are
internally consistent — `node references/stakeholder-summary-cli.js` beside `bash references/qa-cycle.sh`
share the skill-dir assumption — so the defect is confined to the three tracker blocks.)

## Steps to Reproduce

```bash
cd "$(git rev-parse --show-toplevel)"; bash references/qa-cycle.sh docs/tasks/task.121.cycle-scoped-qa-tracker-comments; echo $?   # No such file … 127
```

## Expected Behavior

Every command in a block resolves from the same cwd: the helper is addressed the way the engine call
beside it is (`bash .agents/skills/<skill>/references/qa-cycle.sh` in the tracker blocks), and the
same-block guard accepts both spellings.

## Actual Behavior

Helper not found from the repo root; tracker comment skipped with a warning.

## Recommendation

Use `.agents/skills/<skill>/references/qa-cycle.sh` in the three tracker blocks (matching their engine
call); widen `DERIVES_CYCLE` in `tests/qa-cycle.test.js` to accept the `.agents/skills/…/` prefix; add
a guard that within one block the helper path form matches the engine's (both skill-relative or both
repo-root-relative). Also state in the prose which values a block inherits from earlier blocks
(`$TASK_DIR`/`$STORY_DIR`/`$STORY_FILE`, `$GATE_DECISION`, `$score`, `$QA_ISSUE`) so the
"blocks are separate shells" premise is applied deliberately rather than only to the cycle (CR-2).

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-18 · **Developer**: qa-fix (QA cycle 3)

**Root Cause**: two cwd assumptions in one block — the helper was written skill-relatively (copied
from the PR-lead block, where that is right beside `node references/stakeholder-summary-cli.js`) into
tracker blocks whose engine call is addressed from the repository root.

**Fix Description**:
- The three tracker blocks now call `bash .agents/skills/<skill>/references/qa-cycle.sh`, matching
  the `node .agents/skills/<skill>/references/tracker-comment.js` beside them; the three PR-lead
  blocks keep `bash references/qa-cycle.sh`, matching their lead-CLI call. One cwd per block.
- Each derivation states which values the block **inherits** (inputs an agent re-binds: the
  document path / `$TASK_DIR` / `$STORY_DIR` / `$STORY_FILE`, `$GATE_DECISION`, `$score`,
  `$QA_ISSUE`, PR metadata) versus what is **computed** in-block (the cycle) — CR-2.
- `tests/qa-cycle.test.js`: `DERIVES_CYCLE` accepts either path form; a new guard asserts that within
  one block the helper's path form matches the engine call's (≥6 blocks checked); the
  inline-derivation guard now catches any digit-extracting `$(…)` near `.gate.` (plain or escaped
  dots; sed/awk/grep/cut) — CR-5.

**Files Modified**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-fix/SKILL.md`,
`tests/qa-cycle.test.js` (+ bundled copies).

**Testing**: 20/20 (bash + zsh). Mutation proofs: tracker helper call reverted to the skill-relative
form → path-form guard red naming the block; an `awk`-spelled and a `grep -oE '\.gate\.[0-9]+'`-spelled
inline derivation → inline guard red; `npm run ci:fast` green (3436 / 3435).

**Verification Steps for QA**: from the repo root, run the 13b/6b/Step-7 tracker block as written —
the helper resolves; `command node --test tests/qa-cycle.test.js` → 20 pass.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-18 | New | QA Engineer | Cycle 3 narrowed review (CR-1) |
| 2026-09-18 | Ready for QA | qa-fix | Path forms aligned per block + guard |
| 2026-09-18 | Closed | QA Engineer | Verified in cycle 4 — tracker blocks root-form; path-form guard red when reverted; qa-fix-3 posted from a root-cwd shell. The PR-lead blocks' own cwd mix is BUG-6 |
