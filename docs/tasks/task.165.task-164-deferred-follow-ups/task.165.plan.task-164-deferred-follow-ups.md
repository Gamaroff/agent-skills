---
id: task.165.plan
title: "Implementation Plan: Close task.164's deferred follow-ups"
type: plan
task-ref: task.165.task-164-deferred-follow-ups.md
---

# Implementation Plan: Close task.164's deferred follow-ups

> Requirements and success criteria: [task.165.task-164-deferred-follow-ups.md](task.165.task-164-deferred-follow-ups.md)

## Overview

Start from `develop` after PR #508 (task.164) has merged. The work is a wording change to Exception 2, three test tightenings, a second test-only seam in the lock test file, and an outcome-gated lock-cooperation block in both review skills. Anchors are string identities, not line numbers.

## Phase-by-Phase Implementation Guide

### Phase 1: Exception 2 says only what is true

**`shared/resources/develop-pipeline-remaining-work-banner.md`**, anchor `**Exception 2: a HALT names the step that halted.**`.

Target text, in substance (keep the wrapped-line style and the closing `(task 164).` token, now `(task 164, task 165).`):

> **Exception 2: a HALT names the step that halted.** The position of a HALT block is the step
> being executed when it halted, not `current_step`. That step did not finish, so it is also the
> first line of the steps-ahead list: a HALT in Step N lists `- Step N:` first, and a HALT inside
> the QA loop lists `- Steps 5–6:` first, where a block derived from `current_step` starts at
> `Step {N+1}`. The halting step and `current_step` differ whenever a sub-skill has advanced the
> lock as its last action and its step's tail then halts. Where such a sub-skill moves the lock is
> stated once, in the `--skill` mapping of `advance-pipeline-lock.sh`; this file does not list
> them. `/finalise` is one: … (the `/finalise` example and the `halt_step` sentence are unchanged).

The Exception 2 regex in the HALT pin anchors on `\(task 164\)\.`. If the closing token changes, change the regex in the same edit.

### Phase 2: The pins measure what they claim

**`shared/resources/tests/step-8-completion-checklist.test.mjs`**

1. **Mapping parse.** Replace
   `/\n {2}--skill\)\n([\s\S]*?)\n {4}esac/` with an anchor on the mapping's own case:

   ```js
   const mapping = readDoc("shared/resources/advance-pipeline-lock.sh").match(
     /SKILL_NAME="\$2"\n\s*case "\$SKILL_NAME" in\n([\s\S]*?)\n\s*esac/,
   );
   assert.ok(mapping, 'advance-pipeline-lock.sh: no `case "$SKILL_NAME" in` block after SKILL_NAME="$2"');
   ```

   Keep the `advancing.length >= 5 && finalise → 8` floor, and name the anchor in its message.

2. **Plain-prose refusal.** For each mapped name other than `finalise`:

   ```js
   const re = new RegExp(`(^|[^A-Za-z0-9-])/?${name.replace(/-/g, "\\-")}(?![A-Za-z0-9-])`);
   assert.ok(!re.test(rule[1]), `${BANNER}: the HALT rule names "${name}" from the --skill mapping; cite the mapping instead`);
   ```

   `rule[1]` already has whitespace collapsed. Add one positive-control assertion: the same regex for `develop` does **not** match the literal `develop-story and develop-task`, so the boundary cannot silently rot.

3. **HALT pin phrases.** Replace `"not at \`current_step\`"` with `"not \`current_step\`"`, and add `"lists \`- Steps 5–6:\` first"` and `"a block derived from \`current_step\` starts at"`.

4. **Hook floor by binding.** In `every orchestrator mention of --complete names the Step 8 Completion Checklist`, replace the `hookCode` count:

   ```js
   const hook = readDoc(STOP_HOOK).split("\n");
   for (const binding of ["COMPLETION_LINE", "ALREADY_DONE"]) {
     assert.ok(
       hook.some((l) => new RegExp(`^\\s*${binding}=.*--complete`).test(l)),
       `${STOP_HOOK}: no ${binding}= assignment carries --complete`,
     );
   }
   ```

   Both bindings are assigned more than once (per `NEXT`), so `some` is the right quantifier: the step-8 branch is the one that carries `--complete`.

### Phase 3: The 4b meta-test runs only 4b

**`shared/resources/advance-pipeline-lock.test.sh`**, immediately after scenario 4b's block (after the `fi` that closes `if [ "$NOJQ_SETUP_OK" -eq 1 ]`):

```bash
# Test-only early exit (task 165): advance-pipeline-lock-4b-setup.test.mjs needs scenario 4b and
# nothing after it — the zsh passes of scenarios 13–14 are most of the file's runtime. Unset in
# every normal run. When set the file says so, so a leaked value shows in the direct npm test run.
if [ -n "${ADVANCE_LOCK_TEST_4B_ONLY:-}" ]; then
  echo "  NOTE  4b-only: ADVANCE_LOCK_TEST_4B_ONLY is set — stopping after scenario 4b (test-only seam)"
  echo ""
  echo "Results: $PASS passed, $FAIL failed"
  [ "$FAIL" -eq 0 ] && exit 0 || exit 1
fi
```

Check first that nothing between 4b and the summary is needed for 4b's own verdict, and that scenarios 1–4 do not dominate the runtime. If they do, the halving bound is unreachable; stop and report the measured split instead.

**`shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`**: `runLockTests(cmds)` sets `env.ADVANCE_LOCK_TEST_4B_ONLY = "1"` for every case. Each case asserts `/NOTE {2}4b-only:/`. The unset case still deletes `ADVANCE_LOCK_TEST_4B_CMDS` and asserts the default list, but now also requires the 4b-only NOTE, which proves the early exit fired.

Measure `time node --test shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs` before the change and after, on the same host in one session, and record both in the implementation report.

### Phase 4: Both review skills cooperate with the lock, on a passing review only

**`skills/review-task/SKILL.md`**: append, in `skills/review-story/SKILL.md`'s shape:

````markdown
## Pipeline Lock Cooperation (when invoked by `/develop-story` or `/develop-task`)

When this skill is invoked as a step in a develop pipeline, advance the pipeline lock as the
**last action** before returning — **only when the review passed**: the recommendation is READY TO
IMPLEMENT and Step 9 promoted the task. On NEEDS REVISION or REQUIRES REWORK, leave the lock where
it is: the orchestrator's Step 2 HALTs on those outcomes, and a lock already at 3 would let the
Stop hook or a resume send the run to Step 3 on a task that failed review.

```bash
if [ -f .claude/state/develop-pipeline.lock ] && [ "{outcome}" = "READY TO IMPLEMENT" ]; then
  bash .agents/skills/review-task/references/advance-pipeline-lock.sh --skill review-task 2>/dev/null || true
fi
```
````

Then gate `skills/review-story/SKILL.md`'s existing block the same way on its GO outcome (Draft promoted to Ready for Development). Keep the idempotence paragraph and the `pipeline-lock-cooperation.md` link.

`{outcome}` is a placeholder the agent substitutes, consistent with how other blocks in these skills bind values. Do not introduce a shell variable that no block sets (step-3 doc, "A plan's shell-variable names are claims about a file").

Run `npm run bundle`, then confirm `skills/review-task/references/advance-pipeline-lock.sh` and `skills/review-task/references/pipeline-lock-cooperation.md` exist and `npm run bundle:check` is clean.

### Phase 5: Proof and gates

The mutation table, with each mutation applied to a `cp` snapshot and restored with a `cmp` check:

| Mutation | Expected |
| --- | --- |
| Exception 2 gains "develop (→ 4) and create-pr (→ 5)" in plain prose | HALT pin red |
| Exception 2's contrast reverts to "every other block starts at" | HALT pin red |
| The step-8 `ALREADY_DONE=` loses `--complete`, and a new `echo "--complete"` line is added | hook floor red |
| A decoy `x) NEXT=9 ;;` is added inside the commit-changes early-exit arm (scratch copy), with the old regex vs the new | new parse ignores it, old parse reads it (record both) |
| The 4b early exit is removed | the meta-test's 4b-only NOTE assertion goes red |

Then run `npm run bundle`, `npm run ci:fast` (with `.agents/skills` moved aside), `npm run lint:shell`, `npm run bundle:check` and `npm run validate -- skills/review-task/ skills/review-story/`. Add a CHANGELOG `[Unreleased]` › Fixed entry citing (task 165).

## Key Patterns and References

- task.164's mutation scripts (`mut.mjs` split/join with an asserted count, a `cp` snapshot, a `cmp` restore) are the shape to copy.
- `review-story`'s cooperation block is the model for review-task's. The lock helper is `shared/resources/advance-pipeline-lock.sh`, bundled per skill.
- For the seam and NOTE pattern, see task.164's `ADVANCE_LOCK_TEST_4B_CMDS`.

## Testing Approach

- `node --test shared/resources/tests/step-8-completion-checklist.test.mjs --test-name-pattern "halted|complete names|defers"`
- `node --test shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`, timed before and after
- `bash shared/resources/advance-pipeline-lock.test.sh` with no seam set: 95/0 and every scenario run
