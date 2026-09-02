---
id: task.65.sprint-review
title: 'Sprint Review Summary — Task 65: Derive the selection frontier from the registries'
type: sprint-review-summary
description: 'Accepted 2026-08-29 after 3 QA cycles. /develop-next now falls through to the bug and task registries when no roadmap phase holds an actionable row, so filed work cannot be invisible to the loop.'
tags: [sprint-review, task.65, develop-next]
status: complete
created: 2026-08-29
updated: 2026-08-29
---

# Sprint Review Summary — Task 65

**Task:** [task.65.registry-aware-selection.md](./task.65.registry-aware-selection.md)
**PR:** [#281](https://github.com/Gamaroff/agent-skills/pull/281) · **Issue:** [#280](https://github.com/Gamaroff/agent-skills/issues/280)
**Accepted:** 2026-08-29 · **Final gate:** PASS (90/100) · **QA cycles:** 3

---

## Summary

`/develop-next` read exactly one file: the completion roadmap. Work filed in
`docs/bugs/bug-registry.md` or `docs/tasks/task-registry.md` was invisible to it, so the loop would
report `roadmap-complete` while real work sat registered and unreferenced.

**The failure mode is silence** — `roadmap-complete` is indistinguishable from "there is genuinely
nothing to do", and both `/loop /develop-next` and `loop-supervisor` terminate on it. An overnight run
that stops at 23:05 with a Major bug registered and unreferenced has not finished the work; it has
failed to find it, and reported success. That had already happened: `bug.2` was filed Major/High with
a documented root cause, and the selector reported `roadmap-complete` the same day.

Selection now falls through to the two registries when — and only when — no phase holds an actionable
row.

## What shipped

- **A fallback frontier** at exactly one point in `selectNext`: the terminal `roadmap-complete`
  return. Roadmap precedence is absolute.
- **Only `roadmap-complete` is pre-empted.** `human-gated`, `planning-gap`, `manual-checkpoint` and
  `phase-blocked` still stop the loop — one test per stop reason asserts the registry loader was never
  *called*.
- **Eligibility is the document's frontmatter, not the registry row**, and the floor must be a subset
  of the statuses the dispatching pipeline accepts — held by a test that parses both pipelines' own
  status tables rather than restating them.
- **`item.source`** on every selection, roadmap ones included.
- **Header-aware registry parsing** — columns read by name with a documented positional fallback;
  malformed rows reported rather than silently dropped.
- **Roadmap `PHASE 4` retired** and seven drifted registry rows corrected, which is what makes the
  feature reachable rather than merely merged.

## Demo notes

```bash
node skills/develop-next/scripts/select-next.mjs        # selection, now carrying item.source
node skills/develop-next/scripts/select-next.mjs --lint  # every registry row considered, with a reason
```

With the roadmap exhausted, flip any accepted task document to `ready-for-development` and the
selector returns `selected` with `source: "task-registry"`.

## Testing & QA

| | |
| --- | --- |
| Suite | 1946 tests — 1945 pass, 1 pre-existing skip, **0 fail** (from 1924) |
| Unit tests for this change | **121** (from 72) |
| CI | SUCCESS on the exact accepted head, 4/4 jobs |
| Gate progression | FAIL 60 → CONCERNS 80 → **PASS 90** |

**Three QA cycles, and the cycle-1 fix introduced the cycle-2 defect.** Making an invisible registry
row visible made non-rows falsely visible — the same defect pointed the other way, in the same
`--lint` report. Every fix was mutation-proved, and in cycle 3 QA verified a claim about a *test*:
that one had been rewritten because it could not fail. Reverting the fixture confirmed it.

## Impact

A filed bug or task reaches the loop without anyone transcribing a row into a third place. The manual
step between "work exists" and "the loop can see it" is gone — and with it the silent failure of an
unattended run reporting success because it could not see the work.

## Known limitations

- **Performance:** `--lint` reads one document per registry row (67 here) — linear and unbounded, but
  confined to an operator-invoked diagnostic. Selection short-circuits.
- **LR-1 / LR-2:** two edge behaviours on already-malformed markdown (a blank-line-split table; two
  tables with no blank line between them). Neither fixed by choice.

## Future work

- Measure `--lint` on a registry an order of magnitude larger before recommending it inside a loop.
