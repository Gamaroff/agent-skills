# QA Report: Task 39 — `gh-stage.js` (cycles 2–5, final)

**Task**: [task.39.github-board-stage-engine.md](./task.39.github-board-stage-engine.md)
**Gate File**: [task.39.gate.5.github-board-stage-engine.yml](./task.39.gate.5.github-board-stage-engine.yml)
**Supersedes**: [cycle-1 report](./task.39.qa.1.github-board-stage-engine.md)
**QA Engineer**: QA Engineer
**Review Dates**: 2026-08-12 (cycles 1–5)
**PR**: [#206](https://github.com/Gamaroff/agent-skills/pull/206)
**Final Gate**: PASS (100/100)

---

## Executive Summary

Five QA cycles, twenty findings, all fixed and independently verified. The change
is approved for merge.

The loop is worth reading as a whole, because the interesting failure was not in
the original implementation — it was in a fix. Cycle 2 addressed four issues, of
which three narrowed what the code accepts and one widened it. The one that
widened it (tolerating a partially-failed board read) arrived labelled
*low-confidence advisory*, was fixed in the same pass as the blockers, and
reopened the cycle-1 wrong-board defect through a door nobody was watching. That
cost cycle 3 a FAIL.

**Final Assessment**: PASS · **Deployment**: APPROVED

---

## Gate progression

| Cycle | Gate | Score | What it turned on |
|---|---|---|---|
| 1 | FAIL | 60 | `selectBoard` fell through an unmatched `--board` and wrote to a board nobody named; four tests passed vacuously |
| 2 | CONCERNS | 80 | All 12 fixes held; four issues the fixes themselves introduced |
| 3 | **FAIL** | 55 | Cycle 2's partial-read tolerance **reopened the cycle-1 defect** via the one-board short-circuit |
| 4 | CONCERNS | 90 | Selection matrix verified exhaustively; `probeBoard`'s reporting had drifted out of step with `run()` |
| 5 | **PASS** | 100 | No findings. Cycle-4 fix confirmed by reverting it and observing the test fail |

Test suite across the loop: **51 → 65**. Full repo suite: **1050 → 1065**, always green.

---

## The findings that mattered

**CR-1 / CR3-1 — writing to a board the operator did not name.** The same defect,
found twice, through two different doors.

First (cycle 1): `selectBoard` chained its precedence tiers with `||`, and the
helper returned `null` both for *hint absent* and for *hint present but matched
nothing*. The chain could not tell those apart, so a mistyped `--board 999` fell
through to `project.yml` and set the status elsewhere. Reproduced before it was
accepted into the gate.

Second (cycle 3): the fix was correct, but cycle 2 then made partially-failed
reads return the boards that *did* resolve — and `selectBoard`'s
`items.length === 1 → only-board` short-circuit ran *before* the hint check. So a
read that failed for the named board and succeeded for another wrote to the
survivor without ever comparing its name, silently under `--json`, which is how
the pipelines call it.

The resolution distinguishes two kinds of hint, which the earlier attempts had
conflated. `--board` and `github.projectBoard` are *an operator naming a board*:
each is its own tier and each fails closed alone. `project.yml` is *ambient repo
config*: it disambiguates when several boards are in play and never vetoes a move
on the single board an issue sits on — treating it as authoritative refused every
issue living anywhere other than the repo's usual board, which cycle 3's first
attempt did until the tests caught it.

**CR-3 — a retry that never retried.** A GraphQL error envelope is a *successful*
process exit: `gh` returns 0 and prints the errors. With the errors check outside
the retried closure, `withRetry` never saw a failure and exactly one mutation was
ever issued — while §8 claimed the path was retried. Measured 1 attempt, not 3.

**CR-4/5/6 — four tests that passed without testing anything.** The verify re-read
was unasserted (its fixture had no matching `itemId`, so the assertion held with
the re-read deleted). `guard: refuses a lower-ranked target` asserted
`transitioned === true` — it moved *forward*. `guard: unranked either side`
short-circuited at `already` before reaching the guard. The retry test asserted
only the reason, never the attempt count.

That pattern recurred: cycle 3 found another vacuous test among cycle 2's own
fixes, passing only because its fixture already satisfied the assertion. From
cycle 4 the review explicitly checked whether each new test fails when its fix is
reverted, and cycle 5 did so for the last one.

**CR3-2 — a fix that could not work.** Cycle 2 tried to resolve a title-valued
`--board` into a board number by matching against the read response. But that
response is issue-scoped: it lists boards the issue is *already on*. So the
resolution could only ever "add" the issue to a board it was already on — a no-op
costing a write, a 3s sleep and a second read. The honest contract replaced it:
`--add-to-board` needs a number, and says so when handed a title.

---

## NFR Assessment (final)

| NFR | Status | Note |
|---|---|---|
| Security | PASS | `--issue` validated on every path including the probe, before any query is built. Auth wholly in `gh`; no secrets; no second transport to secure. |
| Performance | PASS | Measured: 3 `gh api` calls per move, 0 `item-add` without the flag. Net reduction against the inline block. |
| Reliability | PASS | Upgraded from FAIL twice. Failure modes now bias consistently toward refusing to act rather than acting wrongly — the right direction for a tool whose only brake is its own guard. |
| Maintainability | PASS | 65 tests, each pinning a defect that actually occurred. No vacuous tests remain. The no-`jira-sync.js` boundary is asserted by a test rather than left as convention. |

---

## Verification performed

- Full suite green at every cycle boundary: 1050 → 1065, 0 failures throughout.
- Every high-confidence subagent finding **re-executed independently** before being
  allowed to gate the build. This mattered in both directions: the findings were
  real, and one claimed fix (CR3-2) turned out not to work when traced.
- The selection matrix walked exhaustively at cycle 4 — 16 combinations of
  `--board` × `github.projectBoard` × one-vs-many boards × `project.yml` matching —
  rather than spot-checked.
- **Read-only verification against the live board** after every cycle:
  `--probe-board` and `--dry-run` across all eight moments, with the board
  confirmed unchanged each time. The write-free contract was never taken on trust
  from the stub alone.

---

## Deferred, with reasons

- **`DEFAULT_LADDER` rung 0 lacks `"Todo"`**, GitHub's stock first column, so an
  unconfigured board is unranked and the guard is inert there. Out of scope: it
  changes a default that Jira consumers also read. Recorded in the task's Known
  Issues with its blast radius stated, and `--probe-board` surfaces it.
- **Nothing calls `gh-stage.js` yet** — task.40, deliberately. That ordering is
  what made it safe to get the multi-board and option-id questions wrong twice.
- **The scratch-board pre-adoption ritual** — needs a real Projects v2 board
  created on the account, an outward-facing change outside this task's mandate.
  The `gh-bespoke-columns` fixture pins the same shape.

---

## Final Assessment

**Gate**: PASS · **Quality Score**: 100/100 · **Deployment**: APPROVED

**Rationale**: No findings survive. Every one of twenty is fixed and verified, the
riskiest logic was checked exhaustively rather than sampled, and the test suite
that reports this now provably fails when the fixes are reverted — which was not
true of it four cycles ago.

> One lesson worth carrying forward, recorded in the gate: of cycle 2's four
> changes, the only one that *widened* what the code accepts is the only one that
> regressed — and it arrived labelled low-confidence advisory. A guard that gets
> loosened deserves the scrutiny of a new feature, whatever label it arrives under.

---

**Next Steps**: `/finalise` — Definition of Done verification, then merge.
