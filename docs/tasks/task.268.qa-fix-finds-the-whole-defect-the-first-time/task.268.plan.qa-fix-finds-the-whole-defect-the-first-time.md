---
id: task.268.plan
title: "Implementation Plan: qa-fix finds the whole defect the first time"
type: plan
task-ref: task.268.qa-fix-finds-the-whole-defect-the-first-time.md
---

# Implementation Plan: qa-fix finds the whole defect the first time

> Requirements and success criteria: [task.268.qa-fix-finds-the-whole-defect-the-first-time.md](task.268.qa-fix-finds-the-whole-defect-the-first-time.md)

## Overview

Prose edits to `skills/qa-fix/SKILL.md`, with the Edit tool, one hunk per call; never a bundled `references/` copy.

## Phase-by-Phase Implementation Guide

### Phase 1: Step 3.5 probes

Insert after the identity-rule table (`:770` block) in the same row style:

- Classifier table (obs #16): "**For a fix that widens or narrows a classifier** (an error/refusal split, an allow/deny boundary, a 'could not look' class)": rows *Must now catch*, *Must still leave alone (include a failure that happens after the decision was already made)*, *Which direction did the last fix move?* (test the other).
- Weakest value (obs #18), added to the writer/refusal table: "**What is the weakest value that satisfies the new requirement, and does it carry the ambiguity the requirement was added to remove?** Required-field, non-empty and present-at-all checks are the usual shape. Add a test with that value."
- Earlier refusal (obs #20), same table: "**Did this fix add or widen an earlier check on a path?** Re-run the mutation proofs of later-stage guards whose tests send input through it; record the re-runs in the summary."
- Pre-fix population (obs #27), at the head of the documentation table (`:719`): "when a finding says a document states a value or rule wrongly, run the population command before fixing; fix or consolidate the whole population in this cycle; derive a guard's file set by the same search, never from a hand-kept list."

### Phase 2: Step 2.6 moves and Step 7 gate

- In the move table (`:623` block) add rows 5 and 6 (obs #42, #63) in the existing column shape, update "The four moves" and the `Move:` allowed values at `:655` to `consolidate | scope the claim | narrow the contract | extract to a script | waive | patch`.
- Step 7 (`:903`), before the post block: check the cycle's bug set for a bug naming an earlier bug of the same work item (`bug.N` text) or the same `file:` as a previous gate's entry; if one does and the summary lacks `Narrowing residue:`, print the missing block and stop the post. Same for a documentation fix and `Probe:`. Keep Step 7's best-effort framing: a refusal prints a reason and the waiver line is allowed.
- Verify the tests keyed on the shape still pass: `CI=true command node --test shared/resources/tests/qa-narrowing-residue.test.mjs evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`.

### Phase 3: Step 4 staging

At `:807`, before the commands: `git add -N -- <changed paths>` for new files, or `[ -z "$(git ls-files --others --exclude-standard -- <changed paths>)" ] || { echo "untracked files under the changed paths — stage them first"; exit 1; }`. `grep -n "ci:fast" shared/resources/develop-pipeline-step-3-develop-loop.md` decides whether the same hazard exists there.

### Phase 4: Evidence, bundle and sweep

Fixtures and controls in the QA scratch directory only. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`. `git grep -n "four moves" -- skills shared docs`.

## Key Patterns and References

- Table style: `skills/qa-fix/SKILL.md:770` block.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Behavioural, per the task doc § 8.
