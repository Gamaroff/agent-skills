---
id: task.271.plan
title: "Implementation Plan: finalise accepts what the record already shows"
type: plan
task-ref: task.271.finalise-accepts-what-the-record-already-shows.md
---

# Implementation Plan: finalise accepts what the record already shows

> Requirements and success criteria: [task.271.finalise-accepts-what-the-record-already-shows.md](task.271.finalise-accepts-what-the-record-already-shows.md)

## Overview

Sources in `shared/resources/` and `skills/finalise/` only, edited with the Edit tool. Each arm is additive: no matching record, no change in behaviour.

## Phase-by-Phase Implementation Guide

### Phase 1: Owner decisions

Ask with `AskUserQuestion`, one question each: (1) equivalence for a measurement: same code tree by `ci-tree-equivalence.js`, or also require the same suite inputs; (2) re-run: once, only outside the diff, only docs-only delta; (3) deferral: which record counts (gate `recommendations.future`, Deferred Work) and who may approve. Write the answers here.

**Answers (owner, 2026-11-07; recommendations accepted as given):**

1. **Arm 1, equivalence**: same code tree as judged by `ci-tree-equivalence.js` (`tree-equivalent`); docs-only deltas count. No extra suite-input requirement. A missing load record, or any non-equivalent commit, stays `FAIL` with `note: "re-measure"`.
2. **Arm 2, re-run**: exactly one re-run, never more. Only when the red test is outside the PR diff **and** the delta from the last green head is docs-only. Accept only on a green second attempt; record both attempts in the DoD.
3. **Arm 3, deferral**: a mechanical match on case id against the gate's `recommendations.future` or the work item's Deferred Work. The entry must name a follow-up task and an approver, and **the approver must be the repository owner**. No match, no task, or no owner approval stays `FAIL`. The agent never judges a deferral.

### Phase 2: Arm 1

`finalise-dod-ac-prompt.md:72`: replace "taken on the PR's head commit" with "taken on the head, or on a commit whose code tree equals the head's (`ci-tree-equivalence.js` answers `tree-equivalent`); cite the result". Run `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`.

### Phase 3: Arm 2

In the CI gate (`SKILL.md:1162` bucket and `:1261` block), add the single re-run arm using the same engine call; record attempt 1 and 2 in the DoD. Investigate the vanishing template: `fixtureRepo` in `shared/resources/tests/lib/executed-prose.mjs` copying `/tmp/executed-prose-*/origin.git/objects`; look for a concurrent cleanup. Fix if small, else note the cause.

### Phase 4: Arm 3

A matcher script (`finalise-deferral-match.js` or similar, with a `--json` `reason` contract): inputs the probe result and the gate; output matched/unmatched with owner, date and task. Wire into Step 3b.1 item 6 before `overall` is recomputed, reusing the `WAIVED` record shape.

### Phase 5

Tests beside `shared/resources/tests/finalise-deferred-ci.test.mjs`. Mutation-prove each refusal with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `skills/finalise/SKILL.md:1261` (tree-equivalence call), `:345`–`:353` (WAIVED shape).
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixtures; unmatched controls are the non-vacuity case.
