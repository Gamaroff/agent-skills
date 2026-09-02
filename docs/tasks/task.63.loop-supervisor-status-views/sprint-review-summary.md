# Sprint Review Summary — Task 63

**Task:** Make an unattended run watchable from a second terminal, and audible when it stops
**Status:** ✅ Accepted · **PR:** [#277](https://github.com/Gamaroff/agent-skills/pull/277) · **Date:** 2026-08-28

---

## Summary

Task 62 delivered a supervisor that runs for hours and writes an accurate record of what it did. It
delivered no way to read that record while it was happening. This adds the two terminal views that
make an overnight run supervisable, plus a notification when it stops.

The reason this matters is narrower than "observability". The failure the loop-supervisor design
exists to catch is **silent quality degradation** — and that is only catchable by a human glancing at
progress. A run that has quietly idled for four iterations looks identical to a healthy one until
someone reads the ledger.

## What shipped

- **`run-loop.mjs status`** — one-shot snapshot; `--json` for machines.
- **`run-loop.mjs watch`** — the same content repainted every ~2s, in place, **never clearing
  scrollback**.
- **`--notify` / `--webhook`** — macOS notification and ntfy-shaped phone push, fired **once** when the
  loop ends, naming the reason.

Both views are **pure readers**: no lock, no writes, nothing spawned. Safe from a second terminal, over
SSH, twice at once, mid-iteration. They also branch before `claude` is resolved — a reader that dies
because the binary it never invokes is off `PATH` is not a reader.

## The interesting part: four states, not three

| State | Meaning |
| --- | --- |
| `running` | heartbeat present, pid alive |
| `no run in flight` | heartbeat absent — the normal state after a clean exit, exit 0 |
| `CRASHED SUPERVISOR` | heartbeat present, pid dead — last recorded values, not live |
| `HEARTBEAT UNREADABLE` | present but unparseable — state unknown, explicitly **not** "no run" |

The fourth state was **not** in the original design. QA cycle 1 found that an unparseable
`current.json` was indistinguishable from an absent one, so a torn heartbeat answered *"no run in
flight"* — telling the operator the loop had finished when it had not.

That is the same failure the task set out to prevent, and worse in one respect: a crashed report makes
someone look; "no run in flight" ends the investigation. The heartbeat is now written **atomically**
(temp + rename) and the reader distinguishes absent from unreadable regardless — because a view should
not depend on the writer being careful in order to avoid stating a falsehood.

## Demo

```bash
run-loop.mjs status          # snapshot; --json for machines
run-loop.mjs watch           # repaint every ~2s, Ctrl-C leaves the terminal as it found it
run-loop.mjs run --notify --webhook https://ntfy.sh/your-topic
```

## Quality

| | |
| --- | --- |
| QA cycles | 2 — cycle 1 CONCERNS (90/100), cycle 2 **PASS (100/100)** |
| Tests | 150 for the skill (40 new); 1833 repo-wide |
| Mutation-proving | **7 invariants** reverted in source and confirmed red |
| CI | ✅ green on the current head, verified explicitly |
| Bugs | 1 found, fixed, verified, closed |

Both QA cycles did real work. Cycle 1 rejected the change over a defect the success criteria did not
cover. Cycle 2 verified the fix independently *and* found a fragility the fix itself introduced — the
new sentinel was duck-typed, so a valid heartbeat carrying that key was misreported — which was
demonstrated, fixed and pinned in the same cycle.

## Known limitations

- No dashboard push — task 64, deliberately out of scope.
- Three LOW findings accepted with rationale: `process.exit` after an async write (verified bounded),
  `watch --json` as a no-op flag, and the tall-frame repaint limit.

## Follow-up not owned by this task

Five spawn-heavy tests in `shared/resources/tests/` carry 20–30s wall-clock budgets and time out under
local `node --test` pool pressure. Proved unrelated by controlled experiment — clean `develop` plus two
*filler* test files fails five tests, this branch fails one, and CI passes both. **Needs its own bug
report.** Not fixed here: widening someone else's timeouts under cover of an unrelated task is how a
suite stops meaning anything.
