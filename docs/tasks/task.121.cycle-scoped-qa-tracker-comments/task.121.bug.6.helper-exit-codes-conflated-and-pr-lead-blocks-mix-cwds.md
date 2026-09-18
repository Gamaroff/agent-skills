# Bug Report: Task 121 - `|| QA_CYCLE=` conflates helper-not-found with helper-refused, and the PR-lead blocks still mix repo-root and skill-relative paths

**Task**: [Link](./task.121.cycle-scoped-qa-tracker-comments.md)
**Bug ID**: TASK-121-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 4 — reviewer CR-2 and CR-3, verified)
**Date Found**: 2026-09-18

## Description

Two related defects in how the six blocks invoke `qa-cycle.sh`:

1. **Exit codes conflated.** `VAR=$(bash … qa-cycle.sh …) || VAR=` (all six sites) maps
   *helper not found / not runnable* (exit 127 / 126) onto the same empty value as *helper refused*
   (exit 1), and the fallback message says "see qa-cycle.sh above" although the helper never ran.
   This is exactly the shape in which BUG-4 hid for a cycle: a path drift is swallowed as a
   refusal. Verified: `bash nonexistent/qa-cycle.sh x` → rc 127 → `QA_CYCLE=[]`.
2. **The PR-lead blocks mix two cwds.** qa-task Step 13 / qa-story Step 6 / qa-fix's PR-lead block
   write `mkdir -p .claude/state` and `BODY_FILE=.claude/state/…` (repo-root-relative) while calling
   `bash references/qa-cycle.sh` and `node references/stakeholder-summary-cli.js` (skill-relative).
   The lead-CLI line predates this task; the helper call is new and copied its form. From the repo
   root — the cwd the pipeline actually runs in and the one the tracker blocks now assume — the
   helper exits 127, which defect 1 then swallows, and the lead is dropped every cycle.

## Expected Behavior

- A non-zero exit other than `1` from the helper is a hard, visible failure of the block
  (`rc=$?; [ "$rc" -le 1 ] || { echo "qa-cycle.sh not runnable (rc=$rc)"; exit 1; }`), never an
  empty cycle.
- Every block addresses every file from the repository root: `.agents/skills/<skill>/references/…`
  for the helper **and** the lead CLI in the PR-lead blocks, beside `.claude/state/…`. The path-form
  guard treats `.claude/state/` as a root-form signal and requires root form for the helper and the
  engine/lead call wherever it appears.

## Recommendation

Rewrite the six helper calls with an rc check; switch the three PR-lead blocks (helper and lead CLI)
to the repo-root form; extend the guard: helper form must be root wherever the block mentions
`.claude/state/` or a `.agents/skills/` path, and helper/engine forms must agree; mutation-prove
with (a) a skill-relative helper in a PR-lead block and (b) `|| QA_CYCLE=` restored.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-18 · **Developer**: qa-fix (QA cycle 4)

**Fix Description**:
- **rc check at all six sites**: `VAR=$(bash … qa-cycle.sh "$DIR"); rc=$?` then
  `[ "$rc" -le 1 ] || { echo "⚠️ qa-cycle.sh not runnable (rc=$rc) — check the path" >&2; exit 1; }`.
  rc 1 (refusal) still yields the empty value and the skip branch; 127/126 abort the block loudly.
- **One cwd everywhere**: the three PR-lead blocks now address the helper **and** the lead CLI as
  `.agents/skills/<skill>/references/…`, beside their `.claude/state/…` paths — every block in the
  three skills resolves from the repository root. Comments rewritten accordingly ("one cwd per
  block, the same cwd in every block"); the remaining `references/qa-cycle.sh` mentions were the
  file's *name* and now read "the bundled `qa-cycle.sh`".
- **Guard**: `DERIVES_CYCLE` accepts the root form only; the path-form guard requires root form for
  helper and engine/lead call in every block and names `.claude/state/` as the block's cwd signal.

**Files Modified**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-fix/SKILL.md`,
`tests/qa-cycle.test.js` (+ bundled copies).

**Testing**: 23/23; `npm run ci:fast` green (3439 / 3438) — comment-slot-coverage's `PR_SITES`
still collects the root-form lead calls; transition-protocol-parity still attributes them as lead
stages. Mutation proofs: qa-task PR-lead helper reverted to `bash references/qa-cycle.sh` → root-form
guard red naming the block; `|| VAR=` behaviour reproduced against a nonexistent helper path → the
new rc check exits 1 with the ⚠️ instead of an empty cycle.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-18 | New | QA Engineer | Cycle 4 (CR-2 + CR-3) |
| 2026-09-18 | Ready for QA | qa-fix | rc check ×6; root form in all six blocks; guard |
| 2026-09-18 | Closed | QA Engineer | Verified in cycle 5 — rc check at all six sites (nonexistent helper → rc 127 → loud exit 1); all six blocks root-form for helper and lead CLI; reverting one → root-form guard red naming the block |
