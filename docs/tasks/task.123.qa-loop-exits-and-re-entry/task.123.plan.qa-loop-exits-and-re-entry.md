---
id: task.123.plan
title: "Implementation Plan: QA loop exits and re-entry"
type: plan
task-ref: task.123.qa-loop-exits-and-re-entry.md
---

# Implementation Plan: QA loop exits and re-entry

> Requirements and success criteria: [task.123.qa-loop-exits-and-re-entry.md](task.123.qa-loop-exits-and-re-entry.md)

## Overview

One new route in the Outcome branching (2b), one pre-escalation step in Loop Escalation (2c), one
lock field (`qa_phase`, option B), one resume subsection. Every route is a predicate over the gate
sequence, the current gate's queue and the budget state, so it lives in the engine
(`shared/resources/qa-diminishing-returns.js`, which already owns the Diminishing-returns predicate):
express each as a fixture row first and write the prose from the row. Decisions recorded in
`task.123.review.1.qa-loop-exits-and-re-entry.md` (2026-09-18).

## Phase-by-Phase Implementation Guide

### Phase 1: lock position

**Option B is decided.** Read `shared/resources/advance-pipeline-lock.sh` and
`develop-pipeline-on-stop.sh` together. The hook re-prompts `invoke /<skill for current_step>`; it
now reads `current_step: 5` for the whole loop and `qa_phase: 5a|5b|5c` to name the sub-step
(`/qa-task|/qa-story`, `/qa-fix`, `/review-pr`; absent → `/qa-task|/qa-story`, the loud re-entrant
default). Only the story/task `case 5)` arms at `on-stop.sh:22-23` change; `case 6)` stays for
`develop-bug`. The lock helper stays monotonic and gains nothing; 5a/5b/5c write `qa_phase` through
the same `mktemp`+`mv` pattern the helper uses (`jq '.qa_phase = "5b"'`), never touching `current_step`.

Test: `shared/resources/advance-pipeline-lock.test.sh` gains: `advance 5` on a lock at `current_step: 5`
with any `qa_phase` is a noop; `advance 6` is never called inside the loop (grep the step doc);
`advance` still refuses 6 → 5. The hook test gains one row per `qa_phase` value plus absence.

### Phase 2: routes

Engine first. Extend `qa-diminishing-returns.js` with `classifyLoopRoute()` and `describeLoopRoute()`;
`classifyDiminishingReturns` becomes one arm of it (keep the export — its test and the step doc's
invocation still call it). `MEDIUM_N` is computed inside the engine from `latestGateContent` with the
same entry-boundary rules the HIGH awk documents (first-entry indent, `severity:` at the entry's key
indent, `status: closed` NOT excluded) — never a second awk in prose. Fixture table rows include the
existing `7,7,7,7,4` and `0,0,0` sequences plus the two new routes and their negatives.

```
Route 2b — cosmetic residue (obs #100)                     [Outcome branching, beside the Diminishing-returns exit]
  preconditions: gate token == PASS — and only PASS: a CONCERNS token is a reservation 5c must see
                 raised, not carried (state this exclusion in the route);
                 every open top_issues[] entry has severity: low; HIGH_N == 0 AND HIGH_{N-1} == 0
  action: move the open LOWs to recommendations.future (by id, with their finding text);
          `**Loop exit**` row from describeLoopRoute; go to 5c
Route 2c — gate the last fix (obs #112)                     [Loop Escalation, loop-limit trigger, BEFORE the entry is written]
  preconditions: budget spent (N == QA_MAX_CYCLES); the last budgeted cycle routed to 5b (its Action
                 row reads `Running qa-fix`) — so a fix exists on the head that no gate has read;
                 HIGH_k == 0 for all k <= N; MEDIUM_N < MEDIUM_{N-1} < MEDIUM_{N-2}
  action: one ordinary 5a — invoke qa-{task,story} exactly as a cycle does; it writes gate.{N+1} and
          qa.{N+1} and a `### QA Cycle {N+1}` entry marked `half-cycle: gate-the-last-fix`; no 5b.
          PASS or CONCERNS with no open entry → 5c; `**Loop exit**: gate-the-last-fix`.
          any open entry → the Loop-limit escalation as today, with gate.{N+1} in its table.
  negative row: budget spent, last cycle reached 5c and REQUEST CHANGES sent it back → no half-cycle
```

No new mode or argument on `qa-task` / `qa-story`. Add both routes to the guards table (the
"opposites" paragraph becomes a four-way table: stall / finished / cosmetic / budget), to §5c's
accepting-route set, and to the worked-examples table. `pr-review-loop-parity.test.mjs` tests at
lines 226, 351 and 409 enumerate the routes — extend them, do not paraphrase the set.

Replay fixtures: copy the shape of `evals/develop-task/step-isolation/09-qa-concerns-empty-gate-routes-to-5c/`
and mirror each into `evals/develop-story/step-isolation/` — the doc is shared, so a fixture on one
side pins half of it.

### Phase 3: re-entry

`develop-pipeline-resume-contract.md` §QA Cycle Count Reconstruction gains **Re-entry after a QA
loop escalation**:

1. On resume, `QA_CYCLE = max N over {task,story}.*.gate.*.yml` on disk. The existing
   `grep -c "^### QA Cycle"` count becomes the cross-check; `cycles_outside_loop = QA_CYCLE − that
   count`, **derived here and never stored** — the halt snapshot cannot record cycles that have not
   happened when it is written.
2. For each N with a gate but no `### QA Cycle N` entry, back-fill a minimal entry: gate verdict,
   HIGH_N, `run outside the loop (operator)`.
3. When `halt_reason` matches `loop-limit|not-converging`, Phase 0b's prompt — which lives in
   `skills/develop-task/SKILL.md` (≈ line 273, "Resume from {halt_step} / Start fresh") and its
   develop-story twin, not in the step doc — is the halt message's own three options plus
   `Resume at 5a with {k} more cycles`. The chosen k is written into the **lock** as
   `extra_cycles_granted`, beside `qa_max_cycles = QA_CYCLE at resume + k` — the budget the loop reads
   (QA cycle 1, CR-1: `5 + k` counted every later gate against the grant). Do not name it
   `MAX_ITER`: that is the Step 3 develop-loop bound at resume-contract line ~184.

The terminal-HALT snapshot writer (`skills/develop-task/SKILL.md` ≈ line 266, the `jq --arg reason`
block; develop-story twin) is unchanged in shape — the snapshot is a superset of the lock, so it
carries `extra_cycles_granted` and `qa_phase` automatically once they are in the lock. The detector
prompt reads `extra_cycles_granted` and reports it in `deltas_since_pause`. Both HALT messages in the
step doc gain a fourth line: "4. Re-run /develop-task to resume with more cycles".

## Key Patterns and References

- Accepting-route set stated once: step-5-6 doc §5c; `pr-review-loop-parity.test.mjs` forbids paraphrase.
- HIGH_N derivation: §Convergence check step 1 (awk over `top_issues[]`, counting `status: closed` too — it
  counts what the gate *raised*). MEDIUM_N follows the same rule, inside the engine.
- Same-class inventory: `qa-diminishing-returns.js` is the existing classifier; 2b/2c **extend** it.
- Fixture-first: the worked-examples table is the spec; the prose explains the rows.

## Testing Approach

`npm test` for the lock and predicate tests; `npm run eval:all` for the replay fixtures; a real
multi-cycle run for the consumer check (the loop-exit record names `cosmetic-residue` or
`gate-the-last-fix`).
