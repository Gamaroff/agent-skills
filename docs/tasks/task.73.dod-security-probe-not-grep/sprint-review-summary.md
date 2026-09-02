# Sprint Review Summary — Task 73

**Task**: Make the DoD security check execute candidate inputs, not grep for them
**Status**: ✅ Accepted · **PR**: [#297](https://github.com/Gamaroff/agent-skills/pull/297) · **Date**: 2026-09-02

---

## Summary

The `/finalise` DoD security agent was a grep-only inspector: every check asked whether a boundary
*existed*, none asked whether it *held*. It now has a gated **probe mode** — for work items whose
deliverable is a boundary, it generates candidate inputs, **executes** them against the shipped code,
and reports only what reproduced.

## Why it mattered

On task 67, a prompt that executed candidates found **fourteen fail-open routes** past a deny-list the
grep prompt had reported `PASS` — two of them commands the list named by hand, reached by adding a
quote. A QA security gate had passed the same file an hour earlier. Both checks asked whether the
mechanism existed; neither asked whether it held.

## What was delivered

- **Step 1b — a detection rule** with four signals and an explicit negative case, so the common work
  item (CRUD endpoint, renderer, migration) pays nothing.
- **Step 4 — probe mode**: locate the entry point, generate candidates across five axes, **execute
  them**, report only what reproduced — and probe the accept direction too, so an over-strict fix is
  caught as readily as a permeable one.
- **"Read-only" redefined** as *does not mutate*, not *does not run*, with three explicit
  prohibitions. The agent already had `Bash`; the old wording foreclosed a capability it had.
- **A contract that cannot be answered by omission**: `boundary:` required, `probes_executed:`
  required under it, `probes[]` filtered to reproduced findings. A missing `boundary` renders as
  *unverified*; a missing count reads as zero; **zero executed candidates on a boundary is a finding,
  not a pass**.
- **Two test suites**, 28 assertions, held by structural checks rather than substring presence.

## The result that matters

Run against the commit that closed the original fourteen, probe mode found **twelve more open
routes** — all reproduced deterministically on current `HEAD`, filed as **`bug.6`**. Three prior gates
had passed that file.

It is also **not** a machine that always finds something: it reports only what it ran, stayed silent
across ~30 controls, and on this very change set correctly returned `boundary: false` with its reason.

## Testing & QA

| | |
|---|---|
| QA gate | PASS, 95/100 (gate 3) |
| QA cycles | 4 — HIGH findings 4 → 2 → 1 → 0 |
| Findings | 21, all closed |
| Mutation proofs | 23 |
| Tests | 2169 in the full gate, 0 fail |
| CI | SUCCESS on head `9b2f47d` |

## Worth reporting at review

QA chased the same defect up three levels: `probes: []` meant three things; splitting it moved the
conflation to `boundary`; fixing that made the two verdict lines double-render. Twice a test that
claimed to protect an invariant could not observe its violation. Both are now structural.

## Known limitations / follow-up

- **`bug.6`** — the twelve open classifier routes. Four root causes, not twelve; a per-command flag
  table would end the recurring class.
- The other three DoD prompts (AC, compliance, docs) keep their current form — explicitly out of scope.
- Runtime safety is enforced by instruction, not by sandbox. Accepted in the task's own risk section
  with the mitigation that execution targets the classification entry point only.
