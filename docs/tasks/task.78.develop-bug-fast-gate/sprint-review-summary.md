# Sprint Review Summary — Task 78

**Task:** Give `develop-bug`'s fix cycle the same fast gate as the other pipelines
**Status:** ✅ Accepted · **PR:** [#314](https://github.com/Gamaroff/agent-skills/pull/314) · **Date:** 2026-09-04

---

## Summary

One of the three pipelines could still commit an unformatted tree. Task 75 put a fast gate
(`develop.fastGateCommand`, default `npm run ci:fast`) before the commit in the develop loop and in
each `qa-fix` cycle. `develop-bug` shares the develop-loop document and picked that half up for free
— but its per-cycle **verify** loop is a different document and got nothing.

The consequence was concrete: `npm test` does not run `format:check`, so a bug fix cycle could close
green, push, and fail CI on a file it had just rewritten. That is the task-67 failure, still live for
bug fixes only, on the run least able to afford a round trip through red CI.

## What shipped

- **The gate**, as step `3a` of `5b. Fix` — after the no-change check that HALTs, before the commit.
  That is where the qa-fix loop's step `0a` sits relative to its own steps, so the placement mistake
  task 75's QA identified (`TASK-75-001`: gate before the no-change check) is avoided by construction.
- **An honest retry bound** — 2 attempts, with `MAX_ITER` described as bounding *cycles* and
  explicitly not this inner retry. That is the wording task 75's QA corrected; the task's own notes
  warned against re-introducing the version it replaced.
- **A parity test over all three loop documents**, each read at its own authoritative source, with a
  `length === 3` assertion so an entry cannot be dropped silently.
- **A doc sweep** — three consumer-facing sites that still described the gate as running in two places.

## Why it was missed — the durable part

The other two loop documents live in `shared/resources/`. This one is **skill-native**, authored
directly in `skills/develop-bug/references/` with no shared source, so a file list drawn from
`shared/resources/` could not see it. The task document itself had the same defect — every reference
in it named a `shared/resources/` path that does not exist — which meant the fix was about to
reproduce the mistake it was fixing. `/review-task` caught that as its one Critical finding.

## Evidence

| Check | Result |
| --- | --- |
| Success criteria | 6/6, each traced to a line |
| Mutation proving | All three loop documents stripped in turn → parity test red on each; all restored green |
| QA | 2 cycles: CONCERNS 80/100 → **PASS 100/100** |
| Step 5c `/review-pr` | CONCERNS (non-blocking); its one medium finding closed |
| CI | ✅ SUCCESS on the final head `302ed3f`, waited for rather than assumed |
| DoD | ✅ All criteria met |

**The safety criterion is held by a mutation proof rather than by a green test** — which is the only
form of evidence that means anything for a test whose entire job is to fail.

## Worth noting

- **The pipeline caught a defect in its own fix.** The Step 3.5 adversarial pass found that the first
  version of one fix added a `Fast gate` field to the tracker-comment template — a comment posted at
  the end of 5a, *before* the gate runs, so the field could never be filled. Reverted, and the
  asymmetry documented in place.
- **Two port artifacts, in a task that warned about exactly that.** The task's §3 said "this is not a
  copy-paste" about the gate's *placement*. QA found the warning applied equally to the block's prose:
  a "step-3" reference that is unambiguous in the source document and collides in this one, and a
  failure instruction pointing at a template with no field for it.

## Deliberately not done

- **Widening the Step 4b runnable-prose rule** to skill-native `references/*.md`. It scopes to
  `SKILL.md` and `shared/resources/*.md` — this task's own blind spot, one layer up. Its own item.
- **The uncommitted-fix handover** on a fifth-cycle twice-red gate. Identical to the story/task
  qa-fix loop, so changing it here alone would break the parity this task exists to establish.

## Follow-up

The task carries no `github_issue`, so no tracker signal fired at any step. Run `/sync-github-task`
on the file to link it.
