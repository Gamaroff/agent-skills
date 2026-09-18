# Bug Report: Task 121 - The cycle suffix is guessed as `1` on a number-less gate, and does not survive the fenced-block boundary between the lead call and the tracker call

**Task**: [Link](./task.121.cycle-scoped-qa-tracker-comments.md)
**Bug ID**: TASK-121-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (refute pass, cycle 2 — reviewer findings CR-1 and CR-3, verified)
**Date Found**: 2026-09-18

## Description

Two defects with one root cause — the cycle is computed as a shell variable in one place and consumed
in another, with a fallback that guesses:

1. **The fallback keys an unknown cycle to `1`.** With BUG-1's `sed -n … p` in place, a newest gate
   whose name carries no number (the form qa-story's File Naming Conventions still instruct — BUG-3)
   yields an empty match, and `${QA_CYCLE:-1}` / `${FIX_CYCLE:-1}` then posts **every** cycle under
   `qa-gate-1` / `qa-fix-1`. Cycle 2 onward reads `already` — the exact silent suppression task.121
   exists to remove, now wearing a suffix. The contract's own words for a fixed suffix apply.
   `tests/qa-cycle-derivation.test.js` currently **pins** this outcome as correct
   (`gate.legacy-unnumbered.yml` → `"1"`).
2. **`$QA_CYCLE` / `$FIX_CYCLE` are derived in one fenced block and read in another.** In
   `qa-task` the derivation (:1275) sits in the Step 13 block (:1200–:1300) and the tracker call
   (:1352) in the Step 13b block (:1333–:1360); `qa-story` and `qa-fix` are split the same way. Each
   fenced block is executed as its own Bash tool call, and no shell variable survives that boundary —
   so at the tracker call the variable is unset, the stage is `qa-gate-` / `qa-fix-`, both CLIs exit 2,
   and the `|| echo "⚠️ … continuing"` swallows it. Before task.121 the same split only lost a slot;
   now it loses the comment. Only qa-fix carries a "re-derive if running this block on its own" note.

## Steps to Reproduce

```bash
d=$(mktemp -d); touch "$d/task.9.gate.legacy.yml"
TASK_DIR=$d; QA_CYCLE=$(ls -t "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null | head -1 | sed -nE 's/.*\.gate\.([0-9]+)\..*/\1/p'); echo "${QA_CYCLE:-1}"   # 1 — on every cycle
# Block boundary: run Step 13's block and Step 13b's block as two separate shell invocations —
# the second sees QA_CYCLE unset and passes --stage "qa-gate-".
```

## Expected Behavior

- The cycle is derived **in every block that uses it** (or by a helper each block calls), so no
  value crosses a fenced-block boundary.
- A newest gate whose name has no number is a **refusal with a visible warning and no post** — never
  a guess of `1`. Whether an empty directory (no gate at all, which cannot happen at Step 13b or
  qa-fix Step 7 because the gate was just written/read) still falls back to `1` or also refuses is
  a design choice; refusing is simpler and honest.
- The pinning test asserts the refusal, and a guard asserts that every block containing
  `--stage "qa-gate-${QA_CYCLE}"` / `"qa-fix-${FIX_CYCLE}"` also contains the derivation.

## Actual Behavior

A number-less gate posts under cycle 1 forever; a literal reading of the prose posts nothing at all
because the variable is unset where it is used.

## Impact

Latent for (1) (no writer produces a number-less gate; BUG-3 removes the instruction to). Real for
(2): an agent executing the skills block-by-block — the normal way — loses the per-cycle tracker
comment with only a `⚠️` line to show for it, which is the failure class this task was opened to
end.

## Recommendation

One shared helper — `shared/resources/qa-cycle.sh <dir>` (bundled into qa-task / qa-story / qa-fix as
`references/qa-cycle.sh`) — that prints the numeric cycle of the newest `*.gate.*.yml` in `<dir>`,
and on a number-less newest gate (or no gate) prints nothing, writes one warning line to stderr, and
exits 1. Each block that needs the cycle calls it: `QA_CYCLE=$(bash references/qa-cycle.sh "$TASK_DIR") || QA_CYCLE=`
and guards its post on `[ -n "$QA_CYCLE" ]`. Test the helper directly (numbered → number;
number-less → exit 1, empty stdout; empty dir → exit 1), and replace the "same shape" extraction test
with a "derived in the same block as used" guard over the three SKILL.md files. An inline
re-derivation in each block is acceptable instead of the helper **only** with that same-block guard.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-18 · **Developer**: qa-fix (develop-task pipeline, QA cycle 2)

**Root Cause Analysis**: the cycle was a *value computed in one block and remembered in another*,
and a shell has no memory across the Bash tool calls that execute a skill's fenced blocks; the
`:-1` fallback then papered over the empty case by guessing. Both are the same mistake — treating
the cycle as state rather than as a function of what is on disk.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-18

**Fix Description**:
- **One definition**: `shared/resources/qa-cycle.sh <dir>` (bundled as `references/qa-cycle.sh`
  into qa-task, qa-story, qa-fix). Prints the **highest-numbered** `*.gate.{N}.*.yml` in `<dir>`
  (not the mtime-newest — ties in a fresh checkout fell back to lexical order; this also closes
  the cycle-1 CR-2 follow-up). No numbered gate → prints nothing, one ⚠️ on stderr, exit 1.
  Un-numbered files beside numbered ones are ignored. Runs under bash by construction
  (`bash references/qa-cycle.sh`), so zsh's unmatched-glob abort never reaches it.
- **Derived where used**: every block that passes `--stage "qa-gate-${QA_CYCLE}"` /
  `"qa-fix-${FIX_CYCLE}"` now calls the helper itself (six blocks: PR lead + tracker in each of the
  three skills). No `:-1`. Unknown cycle → the PR comment still posts (no marker; its lead is
  skipped with a ⚠️) and the tracker comment is **skipped with a ⚠️**, never keyed to a guess.
- In qa-task / qa-story Step 13b, `THIS_GATE` (for `blocking_count`) is now the gate that carries
  `$QA_CYCLE`, so count and suffix cannot name different rounds.
- The inline `sed` derivations are gone from all three skills.

**Files Modified**:
- `shared/resources/qa-cycle.sh` — **new** helper (ShellCheck clean)
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-fix/SKILL.md` — six blocks
- `shared/resources/tracker-comment-contract.md` — the "derived once, above both calls" sentence
  replaced with the helper description
- `tests/qa-cycle.test.js` — **new** (replaces `tests/qa-cycle-derivation.test.js`): helper
  behaviour under bash **and** zsh (highest number wins with identical mtimes; empty dir, only
  un-numbered, missing dir → exit 1 with empty stdout; un-numbered beside numbered ignored) +
  same-block guard (≥6 blocks pass a cycle-scoped stage and every one calls the helper) + no inline
  derivation remains + the helper is bundled into each caller
- bundled `references/` copies regenerated

**Testing**: `tests/qa-cycle.test.js` 15/15 (bash + zsh). Mutation proofs (cp-restore, tree
verified unchanged): (A) helper made to guess `1` → the two "never guess 1" tests red; (B) the
qa-task 13b helper call removed → same-block guard red naming the block; (C) an inline `sed`
derivation reinserted → "no inline derivation" guard red. `npm run ci:fast` green (3431 / 3430).

**Verification Steps for QA**:
1. `command node --test tests/qa-cycle.test.js` — 15 pass.
2. `d=$(mktemp -d); touch $d/task.9.gate.legacy.yml; bash shared/resources/qa-cycle.sh $d; echo $?` → warning on stderr, empty stdout, `1`.
3. Execute qa-task Step 13 and Step 13b as **separate** shells — 13b posts under the right cycle.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-18 | New | QA Engineer | Refute pass, cycle 2 (CR-1 + CR-3) |
| 2026-09-18 | In Progress | qa-fix | Root cause: cycle treated as cross-block state |
| 2026-09-18 | Ready for QA | qa-fix | Shared helper, derived where used, refusing fallback |
| 2026-09-18 | Closed | QA Engineer | Verified in cycle 3 — helper in all six blocks; refusal proven under bash and zsh; same-block guard red when a call is removed — superseded on the PATH FORM only by BUG-4 |
