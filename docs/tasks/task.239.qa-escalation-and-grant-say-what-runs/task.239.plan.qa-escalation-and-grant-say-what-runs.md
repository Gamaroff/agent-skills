---
id: task.239.plan
title: "Implementation Plan: QA escalation and grant say what will run"
type: plan
task-ref: task.239.qa-escalation-and-grant-say-what-runs.md
---

# Implementation Plan: QA escalation and grant say what will run

> Requirements and success criteria: [task.239.qa-escalation-and-grant-say-what-runs.md](task.239.qa-escalation-and-grant-say-what-runs.md)

## Overview

The plan has one script change (a new lock field written in the existing atomic `jq` write), a rule change in the Convergence check, two template changes, and a label sweep. Edit the `shared/resources/` sources only, then run `npm run bundle`.

## Phase-by-Phase Implementation Guide

### Phase 1: The grant window

**`shared/resources/grant-qa-cycles.sh`.** Extend the one write (the `jq --argjson k "$K" --argjson c "$QA_CYCLE" --arg p "$REENTER"` call):

```bash
jq --argjson k "$K" --argjson c "$QA_CYCLE" --arg p "$REENTER" \
   '.extra_cycles_granted = $k | .qa_max_cycles = ($c + $k) | .qa_phase = $p
    | .convergence_from_cycle = ($c + 1)' "$LOCK" > "$TMP"
```

Append the field to the result line, and keep the existing tokens in their current order, because callers read `reenter_at=`:

```bash
echo "grant-qa-cycles: QA_CYCLE=$QA_CYCLE extra_cycles_granted=$K qa_max_cycles=$WRITTEN reenter_at=$(jq -r '.qa_phase' "$LOCK") convergence_from_cycle=$(jq -r '.convergence_from_cycle' "$LOCK")"
```

Update the header comment's output-line description (`:79`) and the label (`:6`).

**Why `base + 1`.** `QA_CYCLE` is the base: the last completed cycle, reconstructed from the gates on disk. A not-converging re-entry fixes that cycle's findings at 5b, and the first new reading is cycle `base + 1`. A loop-limit re-entry reviews at 5a as cycle `base + 1`. Both first readings are `base + 1`.

**`develop-pipeline-pause.md:114`.** Add a row: `convergence_from_cycle` | Optional. The first cycle the Convergence check reads (task.239). One writer: `grant-qa-cycles.sh`. Absent means 1.

**Convergence check, step 3 (step-5-6).** Prefix the rule: *"Take readings only from cycles `>= convergence_from_cycle` (the lock field; absent → 1). A grant restarts the three-reading rule, so 'k more cycles' delivers k cycles. The guard re-arms once three post-grant readings exist."* Add a row to the worked-examples table:

| Sequence | `convergence_from_cycle` | Trips? | Why |
|---|---|---|---|
| `1, 1, 1 \| 1` (cycles 1–4) | 4 | no, at cycle 4 | one post-grant reading; the task.215 case (obs #72) |

**`evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`.** Add the field to the documented field list in the header comment and to whatever list the test checks. Find it by `extra_cycles_granted` (`:10`, `:106`).

### Phase 2: The label

Run the site command from the task's § 3 and replace `Resume at 5a with {k} more cycles` with `Resume the QA loop with {k} more cycles` at each site. In the README mermaid edges the plain form is `Resume the QA loop with k more cycles`. In the two step-isolation evals, update the expected answer text only, never the scenario's facts.

**Phase 0b** (`skills/develop-task/SKILL.md:334`, `skills/develop-story/SKILL.md:347`, resume contract step 3). After the grant call, add: *"Report the phase from the script's result line: `reenter_at=5b` → 're-entering at 5b: fix first', `reenter_at=5a` → 're-entering at 5a: review first'. Do not restate the rule that picks it."*

`qa-loop-lock-fields-parity.test.mjs:724` asserts the old label. Change it to the new one and add a negative assertion for the old one.

### Phase 3: The escalation entry

In both templates (`#### develop-story escalation template`, `#### develop-task escalation template`):

1. Under **HIGH findings per cycle**, add the grant boundary: `{HIGH_1}, … {HIGH_b} | {HIGH_b+1}, … — grant at cycle {b}` when the lock has `convergence_from_cycle`.
2. In the *Convergence stall* variant only, add:
   ```
   **Flat-count reading**: {stall | discovery} — {file}: {mechanism}, cycle {N-1} vs cycle {N}
   ```
   *Stall*: the latest HIGH's `file:` is in the previous gate's `high_files`, **and** its `finding:` names the same function or mechanism, or cites the previous fix. *Discovery*: otherwise. On *discovery*, recommended step 1 says the earlier fixes held, and that the HIGH is new ground.
3. Before **Recommended next steps**, run the third-strike comparison as 5b does. Point at the `high_files()` block by its heading, and do not copy it. For each file it prints, item 1 must be **delete**, **replace** or **waive**, and it names the mechanism read from the three `finding:` texts. A patch to a struck mechanism may not be recommended, because the resumed 5b forbids it.

Add a one-line reason under the template: *"A recommendation written at a halt must already obey the rules the resumed run will apply (obs #71)."*

### Phase 4: Guards, bundle and record

- `grant-qa-cycles.test.sh`: add cases for both halt kinds asserting the field and the printed token. Mutation: remove `| .convergence_from_cycle = ($c + 1)` and the test goes red.
- `evals/shared/tests/qa-escalation-template.test.mjs` (new): extract both template fences by heading. Assert the `Flat-count reading` line is in the stall variant, and that the third-strike clause names the comparison and all three moves. Mutation: delete the clause and the test goes red.
- Window rule: a unit test that evaluates the trip function on the sequences in the task's § 8. The function is defined in the test and mirrors the prose. The test also asserts that the prose carries the `convergence_from_cycle` clause, so the two cannot drift silently.
- `npm run bundle`, `npm run bundle:check`, CHANGELOG `[Unreleased]`.

## Key Patterns and References

- `grant-qa-cycles.sh` reads the budget back from the lock rather than recomputing it (`WRITTEN=$(jq -r '.qa_max_cycles' …)`). Do the same for the new field.
- The third-strike rule already says to name the mechanism from the three `finding:` texts. The escalation reuses that sentence and adds nothing new.
- Edit sources, never bundled copies.

## Testing Approach

- `bash shared/resources/grant-qa-cycles.test.sh` runs standalone. Its fixtures write a lock and a halt snapshot under a temp dir.
- Control case: a lock without the field must behave exactly as today on `7, 7, 7`.
- Move the `.agents/skills` symlink aside before trusting a local green.
