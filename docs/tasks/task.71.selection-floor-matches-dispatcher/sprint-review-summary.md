# Sprint Review Summary — Task 71

**Task:** Make the selection floor equal what the dispatching pipeline accepts
**Status:** Accepted · **PR:** [#286](https://github.com/Gamaroff/agent-skills/pull/286) · **Issue:** [#285](https://github.com/Gamaroff/agent-skills/issues/285)
**Accepted:** 2026-08-31

## Summary

`/develop-next` could not see a freshly filed task. `/create-task` emits `status: planned`, and the
selector's eligibility floor was `{ready-for-development, in-progress}` — so **every task ever filed
entered the world outside the frontier** and stayed there until a human remembered to run
`/review-task`. That is exactly the manual tracking the registry fallback was built to remove for
bugs, reintroduced for tasks.

The floor now **equals** the set `develop-task` accepts: `{draft, planned, ready-for-development,
in-progress}`.

## What changed

- **One constant** widened in `skills/develop-next/scripts/select-next.mjs`.
- **The guard strengthened** from a one-directional `⊆` to a two-way equality parsed from
  `develop-task`'s own status table, failing on divergence in either direction and naming which way.
- **Seven prose sites** rewritten — two in `select-next.mjs`, four in `roadmap-selection.md`, two in
  `CHANGELOG.md` (one more than the plan enumerated, found by sweep).

## The decision this reverses

The old floor was argued for explicitly — *"the eligibility floor **is** the opt-out"*. That was
overturned rather than edited around, and the counter-argument is now written at every site that
stated it: the opt-out was never free (it charged every real filing a manual promotion step); the
failure it prevented costs one visible cycle while the failure it caused costs indefinite silence;
and the review gate did not disappear, it moved to `develop-task` Step 2, where a draft is reviewed
before any code is written.

## Demo notes

Show `select-next.mjs --lint` on a registry holding a `planned` row: previously
`"eligible": false, "reason": "document status planned — outside the task eligibility floor"`; now
eligible and selectable. Then show `16/H1` going red when `accepted` is added to the floor — the
over-widening case the old subset assertion could never catch.

## Quality

| | |
|---|---|
| Tests | 1999 pass, 0 fail (2 added, 3 rewritten) |
| CI | SUCCESS on head `885de04` — `test`, `validate`, `link-check`, branch policy |
| QA | Gate PASS 98/100, 2 cycles, 1 fix cycle |
| Mutation proofs | 3/3 executed and reverted |
| Bugs | 1 found, 1 closed |

## Impact

An unattended `/loop /develop-next` will now pick up `draft` and `planned` tasks it previously
skipped. A stub can consume one pipeline run and halt at Step 2 with review findings — deliberate:
a wasted cycle is visible and recoverable, invisibility is neither. Bugs are unaffected. Roadmap
precedence is unchanged, so nothing differs until the roadmap is complete.

## Known limitations / future work

- **No park value exists, by decision.** A filing that should not be worked is `cancelled`, or is
  not filed.
- **The bug axis still diverges** from `develop-bug` by `in-progress` and `ready-for-qa`. Measured
  and recorded in three places; closing it would put a `ready-for-qa` bug into an unattended loop
  and needs its own risk assessment.
- **No human review on the PR** — this repo requires none and CI is the enforcing gate, but that is
  recorded rather than reported as approval.
