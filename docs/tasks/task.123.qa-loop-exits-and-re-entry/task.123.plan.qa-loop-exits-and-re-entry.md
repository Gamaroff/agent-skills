---
id: task.123.plan
title: "Implementation Plan: QA loop exits and re-entry"
type: plan
task-ref: task.123.qa-loop-exits-and-re-entry.md
---

# Implementation Plan: QA loop exits and re-entry

> Requirements and success criteria: [task.123.qa-loop-exits-and-re-entry.md](task.123.qa-loop-exits-and-re-entry.md)

## Overview

Two new routes in the Outcome branching, one lock mechanism, one resume subsection. Every route is a
predicate over the gate sequence and the current gate's queue, so express each as a fixture row
first and write the prose from the row.

## Phase-by-Phase Implementation Guide

### Phase 1: lock position

Read `shared/resources/advance-pipeline-lock.sh` and `develop-pipeline-on-stop.sh` together. The hook
re-prompts `invoke /<skill for current_step>`; under option B it reads `current_step: 5` for the whole
loop and a `qa_cycle` / `qa_phase: 5a|5b|5c` pair to name the sub-step. Under option A it needs no
change but every 5b→5a transition calls `advance-pipeline-lock.sh --set 5 --reason "qa cycle N re-entry"`.

Test: the existing lock test file (find it with `grep -rl advance-pipeline-lock tests shared/resources/tests`)
gains: backward move succeeds only via the chosen mechanism; `advance` alone still refuses 6 → 5.

### Phase 2: routes

In the step-5-6 doc, after the Convergence check and before the Diminishing-returns exit:

```
Route 2b — cosmetic residue (obs #100)
  preconditions: gate == PASS; every open top_issues[] entry has severity: low;
                 HIGH_{N} == 0 AND HIGH_{N-1} == 0
  action: move the open LOWs to recommendations.future (by id, with their finding text);
          write `**Loop exit**: cosmetic-residue — N low entries carried to future`; go to 5c
Route 2c — gate the last fix (obs #112)
  preconditions: N >= 3; HIGH_k == 0 for all k <= N; MEDIUM_N < MEDIUM_{N-1} < MEDIUM_{N-2};
                 every open entry's file: is in the previous fix commit's diff
  action: invoke qa-{task,story} with `review_only=true` (no 5b): review + gate on the current head;
          on PASS or CONCERNS-with-empty-queue → 5c; on any open entry → the loop continues and the
          guards read the extended sequence
```

Derive `MEDIUM_N` with the same awk as `HIGH_N` (severity: medium). Add both to the guards table
and to the worked-examples table staged on 2026-09-17 (rows `0,0,0` etc.). The `review_only` arg is a
new Skill arg for qa-task / qa-story — add it to their Pipeline Skill args section; it skips Steps
12–13's fix-facing writes but still writes the gate and report.

Replay fixtures: copy the shape of `evals/develop-task/step-isolation/09-qa-concerns-empty-gate-routes-to-5c/`.

### Phase 3: re-entry

`develop-pipeline-resume-contract.md` gains **Re-entry after a QA loop escalation**:

1. On resume, `QA_CYCLE = max N over task.*.gate.*.yml` (not the snapshot's `qa_cycles_completed`).
2. For each N with a gate but no `### QA Cycle N` entry in the implementation report, back-fill a
   minimal entry: gate verdict, HIGH_N, `run outside the loop (operator)`.
3. When `halt_reason` matches `loop-limit|not-converging`, Phase 0b's prompt is the halt message's
   own options plus `Resume at 5a with {k} more cycles`; the chosen k is written to the lock as
   `extra_cycles_granted` and `MAX_ITER` becomes `qa_cycles_completed + k` for this run.

Snapshot writer (in the step-5-6 doc's escalation block) adds `cycles_outside_loop: 0` and
`extra_cycles_granted: 0`; the detector prompt reads them.

## Key Patterns and References

- Accepting-route set stated once: step-5-6 doc §5c; `pr-review-loop-parity.test.mjs` forbids paraphrase.
- HIGH_N derivation: §Convergence check step 1 (awk over `top_issues[]`, ignoring `status: closed`).
- Fixture-first: the worked-examples table is the spec; the prose explains the rows.

## Testing Approach

`npm test` for the lock and predicate tests; `npm run eval:all` for the replay fixtures; a real
multi-cycle run for the consumer check (the loop-exit record names `cosmetic-residue` or
`gate-the-last-fix`).
