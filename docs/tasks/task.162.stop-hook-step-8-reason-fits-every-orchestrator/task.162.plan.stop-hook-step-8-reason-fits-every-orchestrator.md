---
id: task.162.plan
title: "Implementation Plan: The Stop hook's step-8 reason fits every orchestrator"
type: plan
task-ref: task.162.stop-hook-step-8-reason-fits-every-orchestrator.md
---

# Implementation Plan: The Stop hook's step-8 reason fits every orchestrator

> Requirements and success criteria: [task.162.stop-hook-step-8-reason-fits-every-orchestrator.md](task.162.stop-hook-step-8-reason-fits-every-orchestrator.md)

## Overview

This touches one `case` in `develop-pipeline-on-stop.sh` and three test files. Choose the step-8 Step 7-tail text by `SKILL`, make the status-block position step-aware at 8, and delete a dead clause. Then widen one population test and tighten one fixture. Start from `develop` at or after `771928ef` (task.161 merged).

## Phase-by-Phase Implementation Guide

### Phase 1: The step-8 reason fits every orchestrator

**`shared/resources/develop-pipeline-on-stop.sh`**. The anchors are string identities, not line numbers.

1. **Skill-aware Step 7 tail.** In the `elif [ "$NEXT" = "8" ]; then` branch of the `COMPLETION_LINE` block, the sentence currently reads "…finish that step first (for Step 7: the DoD body to the PR, the tracker update, the Step 7 checklist)." Bind the parenthetical before the `if`:

   ```bash
   # The tail of Step 7 differs by orchestrator. develop-bug's Step 7 is /finalise --bug (Part A,
   # which advances the lock to 8) and then the bug-close routine (Part B) — the work that closes
   # the bug (develop-bug-step-7-close-bug.md). A story/task tail is the DoD body, tracker update
   # and Step 7 checklist (task.161 gate.3 CR-2 / pr-review.1 CR-1).
   if [ "$SKILL" = "develop-bug" ]; then
     STEP7_TAIL="for Step 7: Part B's bug-close routine — the Resolution Summary, status \`closed\`, the parent or registry linkage, the tracker-close check (develop-bug-step-7-close-bug.md)"
   else
     STEP7_TAIL="for Step 7: the DoD body to the PR, the tracker update, the Step 7 checklist"
   fi
   ```

   Then use `(${STEP7_TAIL})` in the step-8 line. Keep every other sentence of that line verbatim. The resume-contract rule and "Never run `--complete` on your own" are pinned by 5b.

2. **Step-aware position.** The `REASON` heredoc line reads "Then: emit the Remaining Work Status block (position \`Step $((NEXT - 1))/8 ✅ complete\`, …". Bind `POSITION` before the heredoc:

   ```bash
   # At Step 8 the lock is not evidence Step 7 finished (/finalise advances it first), so the
   # position must not assert it (task.161 gate.3 CR-1 — pre-existing, identical before task.161).
   if [ "$NEXT" = "8" ]; then
     POSITION="Step 8/8 — ${NEXT_NAME} ⏳ pending (Step 7 unverified: check its row first)"
   else
     POSITION="Step $((NEXT - 1))/8 ✅ complete"
   fi
   ```

   Then `(position \`${POSITION}\`, …)`. Check the wording against the position forms in `develop-pipeline-remaining-work-banner.md` (its `Pipeline position:` examples) before settling it.

3. **Dead clause.** In the generic `else` `COMPLETION_LINE`, delete ` (or \`--complete\` if that was Step 8)`.

**`shared/resources/develop-pipeline-on-stop.test.sh`**:

- Scenario 5b loops `develop-story develop-task develop-bug`. Add a per-skill check inside the loop:
  - `develop-bug` → require `Resolution Summary` and `closed`, and forbid `the DoD body to the PR`;
  - otherwise → require `the DoD body to the PR`.
- New scenario 5d: for each of the three skills at lock 8, assert the reason does not contain `Step 7/8 ✅ complete`. Scenario 5c (lock 3) already asserts the generic text; add `Step 2/8 ✅ complete` to its checks so the step-aware position cannot leak.

### Phase 2: Guards and fixture

**`shared/resources/tests/step-8-completion-checklist.test.mjs`**. In the test "every orchestrator mention of --complete names the Step 8 Completion Checklist", `developPipelineDocs()` returns only `.md` files. Add the hook script to that test's file list, not to `developPipelineDocs()`, which the Pipeline Progress test also uses:

```js
const files = [...developPipelineDocs(), "shared/resources/develop-pipeline-on-stop.sh"];
```

Update the comment above the test to name the widened population. Keep the per-orchestrator floor (2 per SKILL.md) and the total floor. Lines in the hook that mention `--complete` must name the Completion Checklist. Today the step-8 line does and the generic clause does not, so this test is red before Phase 1 and green after it. Record that order.

Watch the shell comments. The hook's comments mention `--complete` too. Either reword them to name the Completion Checklist or skip `#`-comment lines for the `.sh` file only, and state the choice in the test comment. Prefer rewording, so there is no exemption.

**`shared/resources/advance-pipeline-lock.test.sh`**, scenario 4b:

```bash
for c in rm dirname; do
  p=$(command -v "$c")
  case "$p" in /*) ln -sf "$p" "$NOJQ_BIN/$c" ;; esac   # a builtin resolves to its bare name: skip it
done
```

The script's shebang runs under `"$BASH_BIN"` (an absolute path), so `bash` need not be on the stripped `PATH`. Confirm the three 4b assertions still pass.

### Phase 3: Proof and gates

- **Probe.** Run the qa-fix Step 3.5 population command for the phrases `Step 7/8`, `the DoD body to the PR` and `names the Completion Checklist`. `develop-pipeline-hooks.md:84` says the hook "names the Completion Checklist … as the step's end" and routes by the resume contract's rule. That stays true. Record the probe block in the implementation report.
- **Mutations** (bash, `FILES` array, `cp` snapshot, restore checked by `cmp`):

| Mutation | Expected |
| --- | --- |
| `STEP7_TAIL` always the story/task text | 5b develop-bug case red |
| `POSITION` always `Step $((NEXT - 1))/8 ✅ complete` | 5d red ×3 |
| restore the generic `(or --complete if that was Step 8)` clause | widened population test red |
| add `printf` back to the 4b loop | 4b stays green: the absolute-path guard skips the builtin (absorbed by design) |

- `npm run bundle`; then `mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills`; then `npm run lint:shell` and `npm run bundle:check`.
- CHANGELOG `[Unreleased]` › Fixed, citing (task 162).

## Key Patterns and References

- task.161 cycle 2 set the Stop hook's step-8 line to **state the resume contract's rule, not a finer one**. The skill-aware parenthetical only describes Step 7's tail. It must not add a new routing rule.
- `ALREADY_DONE` (task.161 CR-2) is already step-aware and is the pattern for binding a step-dependent string before the heredoc.
- `develop-bug`'s `case "$NEXT"` block already branches on `SKILL`, so the `STEP7_TAIL` binding follows the file's own convention.

## Testing Approach

- `bash shared/resources/develop-pipeline-on-stop.test.sh` after each hook edit.
- Render by hand for all three skills at lock 8 and at lock 3 (`mktemp -d`, a `.claude/state/develop-pipeline.lock` fixture, `echo '{}' | bash <hook> | jq -r .reason`), and read the full reason once for each skill.
- `node --test shared/resources/tests/step-8-completion-checklist.test.mjs --test-name-pattern "--complete names"` before and after Phase 1, to show red then green.
