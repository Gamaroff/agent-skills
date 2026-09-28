---
id: task.163.plan
title: "Implementation Plan: Close task.162's step-8 follow-ups"
type: plan
task-ref: task.163.stop-hook-step-8-follow-ups.md
---

# Implementation Plan: Close task.162's step-8 follow-ups

> Requirements and success criteria: [task.163.stop-hook-step-8-follow-ups.md](task.163.stop-hook-step-8-follow-ups.md)

## Overview

Two text edits (the develop-bug tail, the step-8 status clause), one shared phrase kept identical in the hook and the resume contract, two test floors and one fixture fix. Start from `develop` at or after `e5c1f97d` (task.162 merged). Anchors are string identities, not line numbers.

## Phase-by-Phase Implementation Guide

### Phase 1: The step-8 text is complete and consistent

**`shared/resources/develop-pipeline-on-stop.sh`**

1. **develop-bug tail.** The develop-bug arm of the `STEP7_TAIL` binding currently ends "…the parent or registry linkage and the tracker-close check (develop-bug-step-7-close-bug.md)". Make it end with Part B's own checklist, for example:

   ```bash
   STEP7_TAIL="for Step 7: Part B's bug-close routine, meaning the Resolution Summary, status \`closed\`, the parent or registry linkage, the tracker-close check and Part B's Step 7 Completion Checklist (develop-bug-step-7-close-bug.md)"
   ```

   Keep the phrase `Step 7 Completion Checklist` verbatim: the parity test (Phase 2) matches it.

2. **Step-aware list clause.** The heredoc line beginning `Then: emit the Remaining Work Status block` contains the literal `then the steps still ahead through Step 8`. Bind it before the heredoc, beside `POSITION`:

   ```bash
   if [ "$NEXT" = "8" ]; then
     STEPS_AHEAD="then Step 8 as the only step still ahead"
   else
     STEPS_AHEAD="then the steps still ahead through Step 8"
   fi
   ```

   and write `(position \`${POSITION}\`, ${STEPS_AHEAD})`. Check the step-8 wording against the `Pipeline steps still ahead:` examples in `develop-pipeline-remaining-work-banner.md` before settling it.

**`shared/resources/develop-pipeline-resume-contract.md`**, Phase 0b paragraph (anchor: "Step 8 is decided by the resume record"): the develop-bug clause "for develop-bug: Part B's bug-close routine in `develop-bug-step-7-close-bug.md`, meaning …the tracker-close check" gains "and Part B's Step 7 Completion Checklist".

**`shared/resources/develop-pipeline-on-stop.test.sh`**

- 5b, develop-bug arm: add `grep -q "Step 7 Completion Checklist"` to the conditions.
- 5d: add, per skill, a required `then Step 8 as the only step still ahead` and a forbidden `then the steps still ahead through Step 8`.
- 5c (lock 3): require `then the steps still ahead through Step 8`.

### Phase 2: The guards have floors and fail in the right place

**`shared/resources/tests/step-8-completion-checklist.test.mjs`**

1. In "every orchestrator mention of --complete names the Step 8 Completion Checklist", after the per-skill floors:

   ```js
   assert.ok(
     (perSkill[STOP_HOOK] || 0) >= 1,
     `${STOP_HOOK}: expected at least one --complete line (the step-8 COMPLETION_LINE), found ${perSkill[STOP_HOOK] || 0}`,
   );
   ```

2. New test, "the Stop hook and the resume contract describe Step 7's tail in the same words". Render the reason by running the hook against a fixture lock, the way `develop-pipeline-on-stop.test.sh` does: a temp dir holding `.claude/state/develop-pipeline.lock` with `{"skill":"<skill>","current_step":8,"report_path":"r.md"}`, `bash <hook>` with that dir as `cwd` and `{}` on stdin, then `JSON.parse(stdout).reason`. Reuse the file's existing spawn helper if one fits. Read `RESUME` and cut the Phase 0b paragraph by its "Step 8 is decided by the resume record" anchor.
   - Floors: the paragraph is found; the develop-bug reason is non-empty.
   - For develop-bug, each of `Resolution Summary`, `status \`closed\``, `Step 7 Completion Checklist` appears in both the reason and the paragraph.
   - For develop-task, `the DoD body to the PR` appears in both.

**`shared/resources/advance-pipeline-lock.test.sh`**, scenario 4b loop:

```bash
NOJQ_SETUP_OK=1
for c in rm dirname; do
  p=$(command -v "$c")
  case "$p" in
    "") fail "4b setup: '$c' not found on PATH" "the no-jq fixture cannot link a command that does not resolve"; NOJQ_SETUP_OK=0 ;;
    /*) ln -sf "$p" "$NOJQ_BIN/$c" ;;
    *)  : ;;   # a builtin resolves to its bare name: skip it (linking it would self-reference)
  esac
done
```

The file's `fail` helper (`fail() { …; FAIL=$((FAIL + 1)); }`) counts rather than exits, and the summary line at the end reports the total. So a setup failure is one counted FAIL, and the two 4b assertions below it run only when `NOJQ_SETUP_OK=1` (they would otherwise fail for the setup's reason, twice, under their own names). Update the comment above the loop to name the three cases.

### Phase 3: Proof and gates

Mutations (bash, `FILES` array, `cp` snapshot, `cmp` restore):

| Mutation | Expected |
| --- | --- |
| develop-bug `STEP7_TAIL` without the checklist phrase | 5b develop-bug red; parity test red |
| contract clause without the checklist phrase | parity test red |
| `STEPS_AHEAD` always the generic clause | 5d red ×3 |
| every hook `--complete` renamed (e.g. `--finish`) | `STOP_HOOK` floor red |
| 4b loop name replaced by a non-existent command | 4b setup fails naming it |
| `printf` added to the 4b loop | 4b green (absorbed: bare name skipped) |

Then `npm run bundle`; `mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills`; `npm run lint:shell`; `npm run bundle:check`. CHANGELOG `[Unreleased]` › Fixed, citing (task 163).

## Key Patterns and References

- `POSITION` and `ALREADY_DONE` (task.161/162) are the pattern for a step-dependent string bound before the heredoc.
- task.162's `t162-mutate.sh` (the implementation report's Step 3 entry) is the mutation-script shape to copy.
- The hook's step-8 line states the resume contract's rule and no finer one (task.161 QA cycle 2).

## Testing Approach

- `bash shared/resources/develop-pipeline-on-stop.test.sh` after each hook edit.
- `node --test shared/resources/tests/step-8-completion-checklist.test.mjs --test-name-pattern "same words|complete names"` before and after Phase 1 to show the parity test red then green.
- `bash shared/resources/advance-pipeline-lock.test.sh`, and once with the loop's command name mutated, to see the setup failure message.
