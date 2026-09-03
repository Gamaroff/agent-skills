# Resume Brief — Task 77, mid-pipeline handover

> **Not a pipeline artifact kind.** `.handover.` is reserved for deferred *tracker* mutations
> rendered by `handover-render.js`; this is a plain briefing for a fresh context window and is named
> so it cannot be mistaken for one. Delete it when the task closes.

**Written**: 2026-09-03 · **Branch**: `feature/task.77.review-pr-in-pipeline` · **HEAD**: `9c0f5a7`
**PR**: [#309](https://github.com/Gamaroff/agent-skills/pull/309) — OPEN, MERGEABLE, targets `develop`

---

## The one thing outstanding

**Run `/qa-task` to produce an independent cycle-5 gate.** Everything else is done, committed and
pushed; `npm run ci` is green.

```bash
/qa-task docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md
```

Then follow its verdict: `PASS`/`WAIVED` → Step 5c (`/review-pr`) → Step 7 `/finalise` → Step 8.
`CONCERNS`/`FAIL` → 5b `/qa-fix`, but note the budget is spent (see *Cycle budget* below).

**Why it was not done in-session, and this is the important part:** the previous agent was the
subject of Step 5c's first finding — it upgraded its own QA gate from CONCERNS to PASS, on the exact
field that decides whether the loop releases it. Writing a further self-assessed gate on the fixes to
that finding would repeat the error with the correction as cover. **Do not let the agent that wrote
the fixes also write the gate that clears them.** That is the whole reason this handover exists.

---

## State

| | |
| --- | --- |
| Pipeline lock | **released** at session end. Resume context is in `.claude/state/develop-pipeline.last-halt.json` (`halt_step: 5-6`), whose `halt_reason` records this as an operator handover, **not a blockage**. A fresh `/develop-task` reads that snapshot in Phase 0b and offers *Resume from Step 5–6* or *Start fresh* — take Resume |
| develop-next state | `.claude/state/develop-next.state.json` — `dispatched:false, merged:false, ticked:false` |
| Task status | `ready-for-review` |
| Working tree | clean, everything pushed |
| Roadmap | T77 at line 92, still `- [ ]` — ticked by develop-next Step 4 after merge |
| Tracker | none — this repo does not link tasks to GitHub issues. **Not a trail gap** |

### Gate history

| Cycle | Gate | Verdict | Note |
| --- | --- | --- | --- |
| 1 | `gate.1` | FAIL (70) | 3 HIGH |
| 2 | `gate.2` | FAIL (70) | 3 HIGH — **2 introduced by cycle 1's own fixes** (refute pass) |
| 3 | `gate.3` | FAIL (70) | 3 HIGH — convergence stall, escalated to the operator |
| 4 | `gate.4` | **CONCERNS (85)** | 0 HIGH. Was edited to PASS(92) and **withdrawn** — see the note inside the file |
| 5 | — | **none, deliberately** | fixes applied; gate withheld for independence |
| 5c | `pr-review.1` | 🚨 REQUEST CHANGES | advisory; writes no gate. All 12 findings now closed |

`qa.2`, `qa.3`, `qa.4` exist but are **disclosed as written retrospectively** at cycle 5 — the cycles
originally emitted gates with no reports (finding PC-3). Treat their headers as load-bearing.

---

## What the task is

Wires `/review-pr` into `/develop-story` and `/develop-task` as **Step 5c**, the exit gate of the
Steps 5–6 QA loop. A gate reading `PASS`/`WAIVED` hands to 5c instead of Step 7. `REQUEST CHANGES`
routes back to 5b `/qa-fix` on the **same** 5-cycle budget; `CONCERNS` records without blocking;
`APPROVE` exits. `ready-for-merge` moved behind the review. Not a ninth step — the lock still
validates `1..8` and no `{N}/8` string changed.

Full spec: `task.77.review-pr-in-pipeline.md`. Narrative of all five cycles: the implementation
report's **QA Iteration History**.

---

## Two operator decisions already made — do not reopen

1. **The 5c resume predicate was DELETED, not corrected** (third strike — it failed three cycles).
   Step 5–6 completeness now reads the `**PR Review**` row of the last `### QA Cycle` entry in the
   implementation report. No index arithmetic, no globs, no shell. Pinned by test, mutation-proved.
2. **The ingester describes the rendered report format**, with a test pinning it against
   `review-pr`'s Step 7 template. The machine-readable `findings:` block is **task 85**, deliberately
   out of scope here because it changes an accepted skill's output.

---

## Cycle budget — read before running qa-task

The loop has used **5 of 5** cycles. If the new gate is not clean, the honest outcome is **Loop
Escalation**, not cycle 6. The escalation templates in `develop-pipeline-step-5-6-qa-loop.md` now
carry a *"Loop limit via review"* variant for exactly this shape (final gate clean, 5c never
cleared). Do not quietly extend the budget.

---

## Three traps that bit this run — you will hit them too

1. **zsh unmatched globs.** Three separate times. A failed glob *aborts the command substitution or
   the whole command*, and `[ 0 -ge "" ]` is **true** in zsh. It produced a false link-check failure,
   a false-PASS verification predicate, and an aborted `rm`. Always quote globs, always prefix them
   with a directory, and test snippets under **both** shells. Filed as **task 87** (table-cell
   commands escape `qa-execute-snippets.mjs`, which is why the predicate survived three cycles).
2. **`bundle_skill.py` silently stales transitive copies.** It discovers references only from a
   skill's *own* files, so anything bundled transitively is never refreshed — while printing
   `✅ in sync`. It went stale **three times** during this run for `qa-story`/`qa-task`. After any
   `shared/resources/` edit, verify: for each changed file, every `skills/*/references/<file>` must
   match. Filed as **task 86 (High)**.
3. **`node` is an nvm shell function here.** Bare `node` prints nvm help first. Use `command node`.

---

## Follow-ups filed (registry at next=88)

| Task | Priority | What |
| --- | --- | --- |
| 85 | Medium | Machine-readable `findings:` block from `/review-pr` |
| **86** | **High** | Bundler never refreshes transitively-bundled refs; reports `in sync` regardless. Affects *any* skill |
| 87 | Medium | Table-cell commands invisible to the snippet-execution gate |

---

## If the new gate is clean

1. Step 5c — `/review-pr --effort medium --comment`. A `pr-review.2` report will be written.
2. Step 7 — `/finalise`. Writes the DoD, sets `status: accepted`, comments the PR.
3. Step 8 — `/commit-changes`, push, then `advance-pipeline-lock.sh --complete`.
4. `develop-next` Step 3 merges PR #309 (gate: `npm run ci`), Step 4 ticks **T77** in the roadmap and
   adds a Change Log row, Step 5 deletes `.claude/state/develop-next.state.json`.

## Verification commands

```bash
npm run ci                                                    # must be exit 0
command node --test evals/shared/tests/pr-review-loop-parity.test.mjs   # 17 pass
bash shared/resources/advance-pipeline-lock.test.sh           # 14 pass
zsh  shared/resources/advance-pipeline-lock.test.sh           # 14 pass — both shells
npm run bundle && git status --porcelain skills/              # must be empty
```
