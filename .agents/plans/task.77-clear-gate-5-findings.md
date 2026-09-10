# Handover — clear the six gate-5 findings on task 77

> Lives in `.agents/plans/`, not the task directory. A file named `task.{n}.{slug}.md` inside a
> work-item directory is the **primary task-document shape**, so every glob enumerating tasks counts
> it as one — that mistake broke CI once already this run (finding CY5-1). Delete this when done.

**Written**: 2026-09-03 · **Branch**: `feature/task.77.review-pr-in-pipeline` · **HEAD**: `c35db24`
**PR**: [#309](https://github.com/Gamaroff/agent-skills/pull/309) — OPEN, MERGEABLE, **all 4 CI checks green**

---

## Goal

Clear the findings left open by **gate 5** (`docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.5.review-pr-in-pipeline.yml`),
then obtain an **independent** gate. This is remediation of an escalation, **not a sixth QA cycle** —
the 5-cycle budget is spent and the loop already escalated by design.

## Rule that must not be broken

**Do not write the closing gate yourself.** Gate 5 exists because Step 5c found the agent that wrote
the fixes had also written the gate clearing them, and had upgraded it on the field deciding whether
the loop released it. After fixing, dispatch a **separate reviewer** (a subagent given no account of
how the fixes were made, told to verify by execution) or hand back to the operator. The same rule
applies to you.

## State

| | |
| --- | --- |
| Pipeline lock | released; escalation recorded in `.claude/state/develop-pipeline.last-halt.json` |
| develop-next | `.claude/state/develop-next.state.json` — `dispatched:false, merged:false, ticked:false` |
| CI | `npm run ci` exit 0; PR checks all green |
| Working tree | clean |

**Already closed — do not redo:** CY5-1 (CI failure; the brief was moved to `.agents/plans/`) and
CY5-2 (the task doc's NFR line now reads gate 5's values at `task.77.review-pr-in-pipeline.md:539`).
CY5-7 is **half** done — the Change Log rows exist; only the PR body is stale.

---

## The work — six items, all verified open as of `c35db24`

### 1. CR-3 — banner firing points declared mandatory with nothing instructing them

*Gate 5 records this as NOT-FIXED. It is the one finding that was dropped while full closure was
claimed, so it matters more than its severity suggests.*

`shared/resources/develop-pipeline-remaining-work-banner.md:26-27` adds two Step 5c rows to a table
whose preamble says every listed firing point is mandatory and "a step that ends without one is a
protocol violation". Nothing instructs them: `develop-pipeline-step-5-6-qa-loop.md` §5c contains no
"Remaining Work" instruction (verified — zero matches), and its enumeration of banner moments still
names only two. The rows also read as applying to `develop-bug`, which has no 5c.

**Fix — pick one arm and do it fully:**
- (a) Add explicit *"emit the Remaining Work Status block"* instructions to §5c — before invoking
  `/review-pr`, and on the REQUEST CHANGES arm — and extend the enumeration near the QA-cycle banner
  paragraph; **or**
- (b) Scope the two rows to develop-story/develop-task and mark them as owned by §5c.

### 2. CY5-4 — a sixth enum value with no resume row (and a test that cannot see the gap)

`develop-pipeline-step-5-6-qa-loop.md:263` added `pending — 5c not yet run` to the `**PR Review**`
enum. `shared/resources/develop-pipeline-resume-contract.md` has **no matching row** (verified: zero
matches for the literal). A run killed between 5a writing the row and 5c writing its verdict resumes
with no stated action — breaking the invariant gate 4 closed TASK77-024 on.

**Fix:**
- Add a `pending — 5c not yet run` row to the resume sub-state table, same action as `not reached`
  (gate `{N}` PASS/WAIVED → re-enter at **5c**; otherwise **5a**).
- `evals/shared/tests/pr-review-loop-parity.test.mjs:482` — add the literal to the enumeration loop,
  which currently covers only `["REQUEST CHANGES", "review failed", "not reached"]`. **Without this
  the test certifies the gap it was written to prevent.**

### 3. CY5-5 — the resume contract's first live application contradicts itself

`task.77.implementation.1.review-pr-in-pipeline-initial-run.md:389` records
`**PR Review**: REQUEST CHANGES (cycle 4's 5c run)` on **cycle 5's** row. Cycle 5's own 5c never ran.
And `### QA Cycle 3` sits at line 432, *after* Cycle 5 (384) and after `## Completion` (421) — so
"the last `### QA Cycle` entry" and "the highest `### QA Cycle {N}`" resolve to different entries,
and the two resume mechanisms disagree about this very run.

**Fix:** set the row to `pending — 5c not yet run`; move `### QA Cycle 3` into numeric order.

### 4. CY5-3 — two false closure claims in the artifact used to check closure

Same file. The closure table has **no CR-3 row** (verified: zero matches) while both it and the
cycle-5 commit message assert "All twelve 5c findings addressed". The `PC-8` row at line 402 claims
"`## Completion` moved to the end" — it is at 421, ahead of QA Cycle 3 at 432.

**Fix:** add a CR-3 row stating the fix or an explicit deferral; correct the PC-8 row (fixing item 3
above makes the claim true — do that first, then the row is honest as written).

### 5. CY5-6 — a comment overstating what it asserts

`evals/shared/tests/pr-review-loop-parity.test.mjs:62` — `sectionBetween()`'s comment says "with
**BOTH** indices asserted"; the code asserts only `start` and lets `end` fall back to EOF. In a helper
extracted specifically to stop a comment overstating a guarantee.

**Fix:** assert `end > -1` as well, **or** reword to "start asserted; end falls back to EOF". Prefer
asserting — a renamed end marker should fail by name, not silently widen every slice.

### 6. CY5-7 (remainder) — the PR body is stale

PR #309's description says the parity suite has **11 tests**; it has **17**. It also points at a CI
run that was red at the time. Change Log rows are already done.

**Fix:** `gh pr edit 309 --body-file <updated>`.

---

## Constraints

- **Edit `shared/resources/` only** — never `skills/*/references/`, which `npm run bundle` reverts.
- **After any `shared/resources/` edit, re-bundle AND verify every consumer by content.** The bundler
  discovers references only from a skill's *own* files, so transitively-bundled copies go stale while
  it prints `✅ in sync`. It happened **three times** in this run. Filed as **task 86 (High)**.
- **zsh**: an unmatched glob aborts the command substitution, and `[ 0 -ge "" ]` is **true**. Quote
  globs, prefix them with a directory, test snippets under both shells. Filed as **task 87**.
- **`node` is an nvm shell function here** — use `command node`.
- Do not renumber pipeline steps; no `{N}/8` string may change.

## Verify before handing back

```bash
npm run ci                                                              # exit 0
command node --test evals/shared/tests/pr-review-loop-parity.test.mjs   # expect 17+ pass
bash shared/resources/advance-pipeline-lock.test.sh                     # 14 pass
zsh  shared/resources/advance-pipeline-lock.test.sh                     # 14 pass
npm run bundle && git status --porcelain skills/                        # must be empty
gh pr checks 309                                                        # all green
```

Then **mutation-prove the CY5-4 test change**: remove the `pending — 5c not yet run` row from the
resume contract and confirm the parity suite goes red. If it stays green, the test still cannot see
the gap and item 2 is not actually done.

## Done looks like

All six closed, CI green, the parity suite green *and* mutation-proved, and a gate issued by someone
— or something — that did not write the fixes. Then `/develop-next` resumes: it merges #309 behind
the `npm run ci` gate, ticks **T77** in the roadmap, and clears
`.claude/state/develop-next.state.json`.

## Context, if you want it

- Why 5c exists and what it does: `docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md`
- The five-cycle narrative, including the self-inflicted findings: the implementation report's
  **QA Iteration History**
- The finding that produced this rule: `task.77.pr-review.1.review-pr-in-pipeline.md`, PC-1/PC-2
- Broader resume brief: `.agents/plans/task.77-resume-brief.md`
