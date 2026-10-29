---
id: task.244.plan
title: "Implementation Plan: The QA loop always ends on a gate"
type: plan
task-ref: task.244.qa-loop-ends-on-a-gate.md
---

# Implementation Plan: The QA loop always ends on a gate

> Requirements and success criteria: [task.244.qa-loop-ends-on-a-gate.md](task.244.qa-loop-ends-on-a-gate.md)

## Overview

Move the budget test from after the fix (§5b step 7) to the two places that route to a fix
(Outcome branching and §5c REQUEST CHANGES). Delete route 2c. Make the grant pick its re-entry phase
from code movement since the newest gate, using one helper shared with qa-task Phase 0.

Origin: approved in plan mode on 2026-10-29, after task.242 handed over `cc0da45e` without a gate. The
user decided the budget counts gates and the default stays 5 (5 gates, 4 fixes).

## Phase-by-Phase Implementation Guide

### Phase 1: The rule in the step doc

**File:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

1. **Loop Setup** (§ Loop Setup, the paragraph starting "This is the iterative heart"). Replace
   "The loop limit is **`QA_MAX_CYCLES` complete cycles**" with:

   > The loop limit is **`QA_MAX_CYCLES` gates**. Cycle N is gate N, plus the fix that answers it.
   > **A fix runs only when a gate will read it within the budget**: 5b is entered only when
   > `N < QA_MAX_CYCLES`. At `N == QA_MAX_CYCLES`, a gate or a review that would route to 5b goes to
   > **Loop Escalation** instead, with its findings open. The loop always ends on a gate.

   That sentence is the rule's single statement. The integration test keys on it, and every other
   site points at it rather than restating it.
   - Rewrite the five-routes paragraph to four routes (drop route 2c).
   - Drop the guard table's budget row and the "four guards" wording, which becomes three.

2. **Outcome branching** (§ Outcome branching). Arms 4–5 resolve to 5b only after the Convergence
   check and the route classifier. Add the budget test as the last resolution:

   ```
   After the Convergence check and the route classifier both resolve to 5b:
   if N == QA_MAX_CYCLES → Loop Escalation, Loop limit trigger.
     **Action**: Escalating — loop limit reached
     **PR Review**: not reached — gate did not exit the loop
   ```

   The "fourth resolution" sentence (written by the Loop limit trigger) now describes this write.

3. **§5c Verdict branching** (the `🚨 **REQUEST CHANGES**` row and the CONCERNS-with-open-coverage
   row): prefix both with "If `N == QA_MAX_CYCLES` → Loop Escalation (*Loop limit via review*); the
   review's findings are handed over unfixed. Otherwise return to **5b** …". Update the
   "shared budget" paragraph (the one starting "The 5-cycle budget is **shared**").

4. **§5b step 7**. Replace it with: "Increment the cycle counter and return to 5a. The budget was
   tested before this 5b was entered (Loop Setup), so a gate always follows." Keep the Convergence
   sentence.

5. **Loop Escalation**:
   - Trigger table, Loop limit row: "gate `QA_MAX_CYCLES` (or its 5c review) would route to a fix".
     Remove the half-cycle sentence.
   - Delete § *Gate-the-last-fix half-cycle* entirely (from its heading to just before "Before
     halting, write a thorough escalation entry").
   - Keep the "On `continue`" duty to overwrite only the Action row. It moves into the Outcome
     branching write above.
   - "cycles that actually ran": `{N}` is `QA_MAX_CYCLES` on a loop limit. Drop the `+ 1` clause.
   - Escalation commit paragraph: the existing "on a convergence stall, this cycle's gate `.yml` and QA
     report `.md` alongside it" becomes "on a convergence stall **or a loop limit** …". Neither has a
     `fix(...)` commit to carry them.
   - Both HALT messages, option 4: unchanged text. It is still true, and a grant now buys k fixes.

6. **QA Cycle template**: delete the paragraph introducing the `**Half-cycle**` row and the
   paragraph about the route-2c row (around the `A cycle written by the **gate-the-last-fix
   half-cycle**` sentence). Add one line: "Reports written before task.244 may carry a
   `**Half-cycle**` row; readers accept it."

7. **Filling rule 1 table** (third-strike comparison): the Loop-limit row's "Re-enters at" becomes
   "5b (or 5a when code moved since gate N)". The resumed 5b now runs the third-strike comparison over
   gates N-2..N, so a loop-limit halt also lists the three-gate block's files as struck.

### Phase 2: Engine and grant

**`shared/resources/qa-diminishing-returns.js`**

- Delete:
  - `ROUTES.GATE_THE_LAST_FIX` (`GATE_THE_LAST_FIX: "gate-the-last-fix"`).
  - `RUNNING_QA_FIX_RE`.
  - The whole `if (budgetSpent) { … }` block in `classifyLoopRoute()`.
  - `budgetSpent` and `lastCycleAction` from the destructured parameters. Unknown keys are ignored,
    so old callers keep working.
- `describeLoopRoute()`: keep one branch for the literal `"gate-the-last-fix"`, returning
  `Loop route: gate-the-last-fix (route 2c, removed in task.244) — <reason>`.
- Update the file's header comment (the route list).

**`shared/resources/code-moved-since-gate.sh`** (new, sibling of `qa-cycle.sh`)

```bash
#!/usr/bin/env bash
# code-moved-since-gate.sh <work-item-dir> <gate-file>
# Prints the count of changes OUTSIDE <work-item-dir> since the gate's `head:` — commits,
# uncommitted edits and untracked files. Prints 1 and exits 0 for a head it cannot vouch for
# (not 40-hex, not a commit, not an ancestor of HEAD): that is the safe answer, "re-read".
# Exit 2 on usage (missing args, dir is the repo root). The ONE definition, called by qa-task
# Phase 0 and grant-qa-cycles.sh (task.244).
```

Move the body of the qa-task Phase 0 trigger block into it verbatim:
- the head validation;
- `git rev-list --count "$GATE_HEAD"..HEAD -- . ":(exclude)$DIR"`;
- the `git diff --quiet HEAD` and `git ls-files --others` increments;
- the repo-root refusal.

`DOC_MOVED` stays in qa-task: the grant does not need it.

**`skills/qa-task/SKILL.md`** Phase 0, step 3: replace the inline count with

```bash
CODE_MOVED=$(bash .agents/skills/qa-task/references/code-moved-since-gate.sh "$TASK_DIR" "$LATEST_GATE") \
  || { echo "HALT: code-moved-since-gate.sh refused (see its line above)"; exit 1; }
```

The head-validity branch's `echo "trigger: gate head … re-reviewing"` moves into the helper's stderr.
`qa-scope-from-head.test.mjs` extracts `triggerBlock()` from this SKILL.md. Check that its extractor
still finds the block, and that the bundled helper is on the path its fixture runs from. The memory
note on the gitignored `.agents/skills` symlink applies: run the test with that symlink moved aside.

**`shared/resources/grant-qa-cycles.sh`**

- Add `# bundle-dependency: shared/resources/code-moved-since-gate.sh` beside the `qa-cycle.sh` one,
  and resolve the path the same way (`CODE_MOVED_SH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/code-moved-since-gate.sh"`).
- The newest gate path comes from `bash "$QA_CYCLE_SH" "$DOC_DIR" --path gate` (already the
  one selector).
- Replace `REENTER=5a` + the `case "$HALT_REASON"` with:

  ```bash
  MOVED=$(bash "$CODE_MOVED_SH" "$DOC_DIR" "$LATEST_GATE" 2>/dev/null); rc=$?
  if [ "$rc" -ne 0 ] || ! [[ "$MOVED" =~ ^[0-9]+$ ]]; then
    echo "grant-qa-cycles: could not measure code movement since $LATEST_GATE (rc=$rc) — re-entering at 5a, which re-gates" >&2
    REENTER=5a
  elif [ "$MOVED" -gt 0 ]; then REENTER=5a    # an ungated fix (a pre-task.244 loop-limit halt, or an operator edit)
  else REENTER=5b; fi                          # the newest gate read this head: fix its findings, then gate
  ```

- Update the header comment's item 1 (it mentions "a route-2c half-cycle"), the `reenter_at=` notes
  (`:74-79`) and the obs #228 comment.

### Phase 3: develop-bug

**`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`**

- Loop Setup (`Maintain a **fix cycle counter** …`): add "A fix runs only when a verify will follow it
  within `MAX_ITER`. A failed verify on cycle `MAX_ITER` goes to Loop Limit Escalation."
- At the end of 5a's FAIL branch: add the `N == MAX_ITER` → escalation test before entering 5b.
- 5b step 5 stays "Increment the counter and return to **5a**". There is no budget test there.
- The escalation heading `(after 5 cycles without PASS)` becomes `(verify failed on cycle MAX_ITER)`.
  The opening line: "The pipeline ran `MAX_ITER` verify cycles; the last one failed, and its findings
  are handed over unfixed."
- This file is skill-native, not shared. `evals/shared/tests/ci-gate-parity.test.mjs` already asserts
  that the three loop docs share a gate. Extend the new integration test to read this file as well.

### Phase 4: Sweep, tests, evals, bundle

**Sweep.** Re-run the population command in task § 7. Expected sites as of 2026-10-29 (re-measure
them; do not trust this list):
- `skills/develop-{task,story}/SKILL.md`: the descriptions ("up to 5 cycles"), the shared-budget line,
  and the `reenter_at` report line.
- `skills/develop-{task,story}/README.md`.
- `skills/develop-bug/SKILL.md`.
- `shared/resources/develop-pipeline-resume-contract.md`: the re-entry section and the `:676`
  half-cycle mention.
- `shared/resources/pr-conformance-prompt.md:67`.
- `shared/resources/code-review-prompt.md:219`.
- `skills/review-pr/SKILL.md:1077`.
- `docs/runbooks/qa-flow.md`: the mermaid edges `D -->|budget spent…|` and the table row.
- `docs/reference/troubleshooting.md:201`.
- `docs/operations/workflows.md`.

**CHANGELOG** (unreleased):

> **The QA loop always ends on a gate (task.244).** `qa_max_cycles` now counts gates: a budget of N
> runs at most N−1 fixes, and a fix runs only when a gate will read it. Route 2c (the gate-the-last-fix
> half-cycle) is removed. A grant re-enters at 5b (fix the last gate's findings) unless code moved
> since that gate, in which case it re-enters at 5a. To keep five fixes, set `qa_max_cycles: 6`.

## Key Patterns and References

- **Sibling helper pattern:** `qa-cycle.sh` is the model. It has one definition, is called by path
  from `grant-qa-cycles.sh`, and carries a `bundle-dependency:` comment so the bundler copies it.
  `tests/shared-script-literals.test.js` already pins literal script references. Check that it accepts
  the new one.
- **Fail toward re-review:** qa-task Phase 0's rule (`|| echo 1`, an unvouched head reads as moved).
  The grant inherits the direction: unsure → 5a.
- **Single statement + pointer:** the step doc's own convention for the accepting-route set ("every
  other document that needs the set points at §5c rather than restating the tokens"). Use the same
  convention for the budget rule.
- **Doc-sweep memory:** about 8–10 consumer docs restate pipeline behaviour on their own, and eval
  fixture fields that no assertion reads drift too.

## Testing Approach

- **Route table** (`qa-loop-route.test.mjs`):
  - Delete the rows labelled `2c …` and the task.143 budget row.
  - Keep the `budgetSpent: false` rows. Add one row with `budgetSpent: true` asserting the same
    result as `false`.
  - Delete the test "route 2c reads MEDIUM_N from the gate…" and the input-shape rows at
    `:575-582`, or repoint them at the mid-loop path.
- **Grant** (`grant-qa-cycles.test.sh`):
  - The fixture is a temp git repo with a doc dir holding `*.gate.{N}.*.yml` whose `head:` is the
    current commit.
  - Cases (a)–(e) are in task § 8. Calibrate first. Case (a) expects 5b and must fail against
    today's script, which prints 5a for every loop-limit halt: run it red before the fix. Case (b)
    passes on both scripts and is the control.
- **Integration** (`evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs`):
  - Read the step doc and the develop-bug loop doc.
  - Assert the rule sentence appears exactly once in Loop Setup.
  - Assert both 5b-routing arms name `QA_MAX_CYCLES` and Loop Escalation.
  - Assert §5b step 7 contains no `QA_MAX_CYCLES` test.
  - Assert no heading matches `/Gate-the-last-fix/`.
  - **Mutation proof:** write a copy of the doc with step 7's old text restored, and point the test's
    reader at it through an env var. It must go red. Record it in the implementation report.
- **Evals:** rename both `11-qa-budget-spent-gate-the-last-fix-half-cycle` to
  `11-qa-budget-spent-ends-on-a-gate`. The replay is a cycle-5 CONCERNS gate with no route exit.
  Expected: an escalation entry, no `fix(` commit, gate 5 and QA report 5 in the escalation commit.
  Add `12-qa-budget-spent-review-request-changes`. Replay fixtures must be git-tracked; check the
  `.gitignore` negation block.
- **Full:** `npm run ci:fast`, `npm run bundle:check`, `npm run eval:all`.
