---
id: task.161.plan
title: "Implementation Plan: Step 8 keeps its resume record until the Completion Checklist passes"
type: plan
task-ref: task.161.step-8-resume-record-survives-commit.md
---

# Implementation Plan: Step 8 keeps its resume record until the Completion Checklist passes

> Requirements and success criteria: [task.161.step-8-resume-record-survives-commit.md](task.161.step-8-resume-record-survives-commit.md)

## Overview

Move the lock's terminal removal from `/commit-changes`' cooperation call to Step 8's own `--complete`, which runs after the Completion Checklist's checks 2–5 pass. Everything else follows from that one move: a Step 8 HALT snapshots, the Stop hook guards the tail, and resume at step 8 covers the whole step. Then clamp the detector to 8 and close task.160's two review findings.

Start from `develop` after task.160 (PR #499) has merged. Every file below is read in its post-task.160 state.

## Phase-by-Phase Implementation Guide

### Phase 1: The lock survives the Step 8 commit

**Population check first.** Run this and record one line per hit in the task's implementation report:

```bash
grep -rln 'develop-pipeline.lock' skills/*/SKILL.md skills/*/scripts shared/resources \
  | grep -v '/references/' | sort
```

Known readers as of 2026-09-27, all of which read presence as "in flight":

- `develop-next` step 2: a present lock means re-enter the run
- `develop-batch`: tiebreak on the worktree lock
- `loop-supervisor`: `run-loop.mjs` polls `current_step`
- the PreCompact and Stop hooks
- `grant-qa-cycles.sh`, `set-qa-phase.sh` and `set-waiting-on.sh`

Proceed only when no reader treats absence as "Step 8's checklist passed".

**`shared/resources/advance-pipeline-lock.sh`**, the `commit-changes)` arm (anchor: the comment *"commit-changes is the ONLY pipeline sub-skill invoked at more than one step"*):

```bash
# before
if [ "$CUR" -ge 8 ] 2>/dev/null; then
  rm -f "$LOCK"
  echo "advance-pipeline-lock: pipeline complete (commit-changes at step $CUR), lock removed"
  ...
# after — the arm never removes; --complete is the one terminal remover (task 161)
#   (keep require_parsable_lock; print a noop line naming --complete as the remover)
```

Update the arm's comment. The Step 8 invocation is no longer special, because Step 8 ends with `--complete` after its checklist. Update the header usage line for `--complete` to read "Step 8 checklist passed".

**`shared/resources/develop-pipeline-step-8-commit.md`**:

- § Cleanup Transient State: delete the final `rm -f .claude/state/develop-pipeline.lock` and its comment. Keep the `find … -delete` and the this-run snapshot sweep.
- § Step 8 Completion Checklist: move check 1 to the end, and put `--complete` before it:

  ```bash
  # checks 2, 2b, 3, 4, 5 unchanged …
  bash .agents/skills/{develop-story|develop-task|develop-bug}/references/advance-pipeline-lock.sh --complete
  # 1. Lock file removed — by --complete, the one terminal remover, only after 2–5 passed
  [ ! -f .claude/state/develop-pipeline.lock ] || { echo "❌ Step 8 incomplete: lock file still present"; exit 1; }
  ```

  Keep the `{a|b|c}` alternation form, because it is what the bundler follows.
- § Final Implementation Report Update: rewrite "What the record covers" as "from `/finalise`'s advance to 8 until the Completion Checklist passes". Delete "What it does not cover" and the CR5-3 lint-failed-HALT sentence, since every HALT is now resumable.

**`skills/develop-{task,story,bug}/SKILL.md`**: in the Step Transition Protocol's action 1, "If the just-completed step was Step 8, use `--complete` instead" becomes "Step 8 already ran `--complete` after its checklist, so this call is a no-op". The helper already exits 0 with no lock.

**`skills/commit-changes/SKILL.md`** § Pipeline Lock Cooperation and **`shared/resources/pipeline-lock-cooperation.md`**: replace "removes the lock only at the terminal Step 8 commit" with "never removes the lock; Step 8's `--complete` ends the run".

### Phase 2: A Step 8 HALT is resumable

These go in `shared/resources/tests/step-8-completion-checklist.test.mjs`. Reuse the existing `LOCK` constant and `run()` helper, and the pattern of the task.160 test *"finalise's lock cooperation moves the record to step 8 before Step 7's tail runs"*.

1. **HALT at 8 snapshots.** Write a lock at `current_step` 8 in a temp dir. Run `advance-pipeline-lock.sh --skill commit-changes`, then the HALT rule's snapshot block cut verbatim from `skills/develop-task/SKILL.md`. Locate it by the anchor `jq --arg reason "{halt_reason}"` and substitute `{halt_reason}`/`{halt_step}`. Assert that `.claude/state/develop-pipeline.last-halt.json` exists with `halt_step` "8", and that the lock is gone. Loop `SHELLS`.
2. **A failing checklist keeps the lock.** Build a fixture report with an unfinished row. Run the checklist block cut from the step doc, which now ends in `--complete` and then check 1. Assert a non-zero exit, and that the lock still reads `current_step` 8.
3. **Restore reads 8.** From test 1's snapshot, `advance-pipeline-lock.sh --restore <dir>` produces a lock with `current_step` 8.

In `shared/resources/advance-pipeline-lock.test.sh`, add a case: `commit-changes` at step 8 leaves the lock, and `--complete` removes it.

### Phase 3: Resume names step 8

**`shared/resources/pipeline-resume-detector-prompt.md`**:

- Step 3 (anchor *"Every expected summary present and valid"*): `recommended_step = min(LOCK_STEP + 1, 8)`. Add a sentence: "a record at step 8 means Step 8 has not passed its checklist; recommend 8".
- The summary table row "Every summary … present and valid → LOCK_STEP + 1" becomes "LOCK_STEP + 1, or 8 when LOCK_STEP is 8".

**`shared/resources/develop-pipeline-resume-contract.md`** Phase 0b, the step-8 paragraph:

- Delete "(the detector's `LOCK_STEP + 1` would name a step 9 that does not exist)".
- Delete "The record covers Step 8 only until its commit … the step-8 doc names that gap."
- Keep "an unfinished Step 7 row still wins", because `/finalise`'s early advance is unchanged.

**CR-2**, in the three SKILL.md Context Compression Recovery blocks: move the "Exception — a record at step 8" paragraph to before item 2, or prefix items 2 and 3 with "(see the step-8 exception below first)". Moving it is cleaner. With the detector fixed, it reduces to "an unfinished row at or below Step 7 wins over `recommended_step` 8".

**CR-1**: the three lines, anchored by the text *"After each step: update the Pipeline Progress table"*. Append: "— after Step 8 this is a no-op; see the Step Transition Protocol, action 2".

**Enumerating test.** Record the pattern and its exclusions in the test itself, per obs #117. The count lives in the test, not in prose.

```js
const FILES = [...glob("skills/develop-*/SKILL.md"), ...glob("shared/resources/develop-pipeline-*.md")];
const PAT = /update (the )?Pipeline Progress|Pipeline Progress (table|row).*(✅|update)/i;
// each hit's paragraph must mention "Step 8" together with "no-op", or "action 2"
// floor: at least the 3 known generic lines
```

Read the hits before finalising `PAT`. A scan wider than the hazard needs an allowlist, and an allowlist has to be believable.

### Phase 4: Proof and gates

Run the mutations under `bash` with a real array, taking `cp` snapshots and asserting restore with `cmp`:

| Mutation | Expected red |
| --- | --- |
| restore `rm -f "$LOCK"` in the `commit-changes` arm | Phase 2 test 1 fails: the lock is gone before the snapshot, so no snapshot is written. Also the `advance-pipeline-lock.test.sh` step-8 case |
| move `--complete` above check 4 in the step doc | Phase 2 test 2 (lock removed on a failing checklist) |
| restore `LOCK_STEP + 1` without the clamp | detector prose guard |
| drop one orchestrator's CR-1 suffix | enumerating test |

Then run `npm run bundle`, then:

- `mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills`
- `npm run lint:shell`
- `npm run bundle:check`
- `npm run check:generated`
- `npm run validate -- skills/<s>/` for commit-changes and develop-{task,story,bug}

Finally, add the CHANGELOG `[Unreleased]` entry.

## Key Patterns and References

- task.160's executed lifecycle test: *"[sh] the Step 8 commit ends the record and Cleanup removes this run's snapshot"* in `step-8-completion-checklist.test.mjs`. **This task inverts its first half.** Update that test, don't add a contradicting one.
- `grant-qa-cycles.sh` and `advance-pipeline-lock.sh --restore`: the restore semantics a Step 8 snapshot must satisfy.
- `docs/reference/anti-patterns.md` § "Never put a must-succeed path and a glob in one `rm` argv". Keep Cleanup's log sweep as `find -delete`.

## Testing Approach

- Execute the shipped blocks rather than grepping them: cut them from the step doc and SKILL.md by anchor, as task.159 and task.160 did (memory: *assert behaviour, not source text*).
- Hermetic temp dirs; `fs.realpathSync(os.tmpdir())` for macOS `/var` → `/private/var`.
- zsh cases run wherever zsh is installed. CI runs bash.
