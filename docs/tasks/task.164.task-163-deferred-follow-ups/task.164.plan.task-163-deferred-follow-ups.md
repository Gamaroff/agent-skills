---
id: task.164.plan
title: "Implementation Plan: Close task.163's deferred follow-ups"
type: plan
task-ref: task.164.task-163-deferred-follow-ups.md
---

# Implementation Plan: Close task.163's deferred follow-ups

> Requirements and success criteria: [task.164.task-163-deferred-follow-ups.md](task.164.task-163-deferred-follow-ups.md)

## Overview

This task makes one prose change in the banner doc: the doc defers to the hook instead of restating it, and it names the halting step. It makes three test changes in `step-8-completion-checklist.test.mjs`, adds a test-only seam to scenario 4b, and adds one new test file. Start from `develop` at or after `f73f3cc5`, where task.163 is merged. Anchors are string identities, not line numbers.

## Phase-by-Phase Implementation Guide

### Phase 1: The banner doc defers and names the halting step

**`shared/resources/develop-pipeline-remaining-work-banner.md`**, "Cheap to produce" bullet (anchor: `**One exception: a Stop-hook re-prompt.**`).

1. **Re-prompt exception.** The task.163 text restates the lock-8 position ("Step 8 pending with Step 7 unverified") and a shortened list ("the list starts at the first unfinished row at or below Step 7"). Replace both with deferral. For example:

   > **One exception: a Stop-hook re-prompt.** When the `Stop` hook re-prompts a stalled run, its
   > reason names the position and the steps still ahead (the hook's `POSITION` and `STEPS_AHEAD`
   > bindings are their one statement). Emit the position as the reason gives it. Resolve the
   > reason's steps-ahead instruction into one `- Step N:` line per remaining step, in the Format
   > above. Every other firing point, including the ordinary Step 7 → 8 transition, follows this
   > rule (task 163, task 164).

   The banner test's regex anchors the clause's end on its closing token (today `/\*\*One exception: ([^*]+)\*\*(.+?)\(task 163\)\./`). The new clause ends `(task 163, task 164).`, which that regex does not match, so change it in the same edit to `/\*\*One exception: ([^*]+)\*\*(.+?)\(task 163, task 164\)\./`. The HALT sentence that follows ends `(task 164).`, so the lazy match stops before it.

2. **HALT rule.** Add one sentence after the exception, and align the HALT row of the position table:

   > **A HALT names the step that halted.** The position of a HALT block is the step being executed
   > when it halted, and the list starts at that step — not at `current_step`. At lock 8 the two
   > differ: `/finalise` moves the lock to 8 before Step 7's tail runs, so a HALT in Step 7's tail
   > reads `Step 7/8 — FINALISE ❌ halted` (task 164).

   The HALT row's `Step {N}/8 — {STEP-NAME} ❌ halted` stays. The cell's `{N}` is the halting step by the sentence above. Do not touch the `halt_step` the HALT snapshot writes (Out of Scope).

### Phase 2: The tests compare what they claim to compare

**`shared/resources/tests/step-8-completion-checklist.test.mjs`**

1. **Banner test** (`the banner doc defers to the Stop hook's lock-8 position and list, at a re-prompt only`):
   - keep `stopHookReasonAt8("develop-task")` and the `position` / `ahead` extraction, and keep asserting that the hook carries `Step 7 unverified` and `first unfinished row at or below Step 7`;
   - keep the `exception[1] === "a Stop-hook re-prompt."` scope check and the carve-out phrase (`the ordinary Step 7 → 8 transition`);
   - **replace** the phrase loop with the following, where `exception[2]` is whitespace-collapsed:
     - the doc carries none of the hook's **distinctive fragments**, derived from the rendered reason, never typed as literals. That means the position's parenthetical before its colon (`position[1].match(/\(([^:]+):/)[1]` → `Step 7 unverified`) and the list's first five words (`ahead[1].split(" ").slice(0, 5).join(" ")` → `the first unfinished row at`). Assert each fragment is non-empty (a floor), then assert `!exception[2].includes(fragment)`. **Do not assert against the whole rendered strings.** The doc paraphrases the hook rather than copying it, so `!includes(position[1])` passes on task.163's current text, and the Phase 4 "restatement restored" mutation would never go red;
     - `exception[2]` names `POSITION` and `STEPS_AHEAD`;
     - `exception[2]` carries the `- Step N:` instruction (match `/one `- Step N:` line per remaining step/`, or whatever phrase Phase 1 settles on);
   - rename it, e.g. `the banner doc defers to the Stop hook at a re-prompt without restating it`.

2. **Population floor** (the test "every orchestrator mention of --complete names the Step 8 Completion Checklist"). Beside the per-file tally, count hook lines that mention `--complete` and do not match `/^\s*#/`:

   ```js
   const hookCode = readDoc(STOP_HOOK)
     .split("\n")
     .filter((l) => l.includes("--complete") && !/^\s*#/.test(l)).length;
   assert.ok(
     hookCode >= 2,
     `${STOP_HOOK}: expected --complete in COMPLETION_LINE and ALREADY_DONE (2 non-comment lines), found ${hookCode}`,
   );
   ```

   Keep the existing `perSkill[STOP_HOOK] >= 1` or replace it. The non-comment floor subsumes it.

3. **HALT-step pin** (new test). Read the banner doc with whitespace collapsed. Require the sentence starting `**A HALT names the step that halted.**` and require it to contain `not at \`current_step\`` and `Step 7/8`. Keep it one test, and name it for the rule.

### Phase 3: Scenario 4b's arms are reachable from a committed test

**`shared/resources/advance-pipeline-lock.test.sh`**, scenario 4b:

```bash
# Test-only seam (task 164): a committed test overrides the command list to reach 4b's empty and
# builtin arms. Unset in every normal run, which gives `rm dirname`.
read -r -a NOJQ_CMDS <<< "${ADVANCE_LOCK_TEST_4B_CMDS:-rm dirname}"
for c in "${NOJQ_CMDS[@]}"; do
  p=$(command -v "$c")
  case "$p" in
    "") ... ;;                                              # unchanged
    /*) ... ;;                                              # unchanged
    *) echo "  SKIP  4b: '$c' is a builtin, not linked" ;;  # was a silent `;;`
  esac
done
```

The builtin arm must print. Silent, it cannot be observed from outside the file: linking a builtin makes a dangling self-link that none of the no-jq commands uses, so the file passes 95/0 whether the arm skips or links (probed at review). The `SKIP` prefix matches the file's existing `SKIP  zsh interpreter pass …` line and is not counted as a pass or a fail. Update the comment above the loop to name the seam and the skip line.

**`shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`** (new). Use `spawnSync("bash", [SCRIPT], { env: { ...process.env, ADVANCE_LOCK_TEST_4B_CMDS: … } })`, or the `run` helper from `./lib/executed-prose.mjs` if it fits:

- `ADVANCE_LOCK_TEST_4B_CMDS="rm dirname no-such-cmd-t164"` → `status === 1`; stdout matches `/4b setup: 'no-such-cmd-t164' not found on PATH/`; stdout has no `without jq`.
- `ADVANCE_LOCK_TEST_4B_CMDS="rm dirname printf"` → `status === 0`; stdout matches `/SKIP  4b: 'printf' is a builtin, not linked/`; stdout has no `4b setup:`.
- The override **deleted** from the child's env (`const env = { ...process.env }; delete env.ADVANCE_LOCK_TEST_4B_CMDS;`) → `status === 0`; stdout carries both `PASS  without jq, …` lines. This is Risk 3's "an unset override gives `rm dirname`" check, and deleting the key is what stops a value in the developer's shell leaking into it.

Name the timeout: the file runs about 7s per invocation (zsh cases included), and the test runs it three times, so set the `node:test` timeout generously (60s per case). The suite glob `shared/resources/tests/*.test.mjs` already picks the file up in `npm test`, so no `package.json` change is needed (confirm with `grep` before assuming).

### Phase 4: Proof and gates

| Mutation | Expected |
| --- | --- |
| Banner exception restates the task.163 lock-8 text verbatim | banner test red |
| `- Step N:` instruction dropped | banner test red |
| `ALREADY_DONE` stops naming `--complete` | population floor red (and the old `>= 1` floor alone stays green — record it) |
| HALT sentence says `current_step` instead | HALT pin red |
| 4b `"")` arm changed to a skip | missing-command test red |
| 4b bare-name arm links instead of skipping | builtin test red |

Then run `npm run bundle`; `mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills`; `npm run lint:shell`; `npm run bundle:check`. Add a CHANGELOG entry under `[Unreleased]` › Fixed citing (task 164).

## Key Patterns and References

- `stopHookReasonAt8(skill)` in `step-8-completion-checklist.test.mjs` already renders the hook at lock 8. Reuse it.
- task.163's mutation scripts (`t163-mutate*.sh` shape: `FILES` array, `cp` snapshot, `mut` via split/join, `cmp` restore) are the shape to copy.
- The banner doc's clause ends on the `(task 163)` token, and the banner test's regex anchors on it.

## Testing Approach

- `node --test shared/resources/tests/step-8-completion-checklist.test.mjs --test-name-pattern "defers|halting|complete names"` before and after each edit.
- `node --test shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`.
- `bash shared/resources/advance-pipeline-lock.test.sh` with no override, to confirm 95/0 unchanged.
