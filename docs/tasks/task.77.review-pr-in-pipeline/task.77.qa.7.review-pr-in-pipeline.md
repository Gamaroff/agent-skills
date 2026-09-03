---
type: qa-assessment
title: "QA Assessment 7 — post-gate-6 remediation pass (task.77)"
description: "Independent execution-based assessment of commit c762de4, which claims to close gate-6 findings CY6-1…CY6-4 and the two carried PARTIALs."
status: complete
updated: 2026-09-03
tags: [qa, task-77, review-pr, remediation]
---

# QA Assessment 7 — post-gate-6 remediation pass

**Work item**: `docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md`
**Branch**: `feature/task.77.review-pr-in-pipeline` — **PR #309**, base `develop`
**Commit under test**: `c762de4` ("fix(task.77): close the four gate-6 findings, and correct a false proof")
**Verdict**: **FAIL — 78/100**

## Provenance

I was dispatched with **no account of how any of these fixes were made**, and did not ask for one.
I did not write the code, the docs, or the commit under review. Every claim in every repo artifact —
the `c762de4` commit message, the implementation report's post-gate-6 closure table, the PR #309
body's mutation-proof table, the task doc's Change Log — was treated as a **hypothesis to test by
execution**, never as evidence. This continues the rule that produced gates 5 and 6.

This grades the **post-gate-6 remediation pass, not a QA cycle**. The 5-cycle budget was spent at
gate 5; Loop Escalation stands and a remediation pass does not reset it.

---

## 1. Execution evidence

### 1.1 `npm run ci`

```
$ npm run ci > .../ci.log 2>&1; ec=$?; echo "CI_EXIT=$ec" >> .../ci.log
CI_EXIT=0
```

Exit code captured into a variable *before* any echo, so the echo's own status could not mask it.
From the log:

```
ℹ tests 2284
ℹ suites 8
ℹ pass 2283
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 658109.073323
```

`shared/resources/tests/qa-execute-snippets.test.mjs` did **not** flake on this run; no re-run was
needed. Three benign shell diagnostics appear inside `tracker-access.test.sh` output
(`line 501: pass: command not found`, `line 1034/1040: ?: command not found`) — that file is
untouched by this branch (`git diff origin/develop...HEAD` is empty for it), the suite reports
`Results: … 0 failed`, and `npm run ci` exits 0. Pre-existing, out of scope, noted only so it is not
mistaken for a regression later.

### 1.2 Parity suite

```
$ command node --test evals/shared/tests/pr-review-loop-parity.test.mjs
ℹ tests 17   ℹ pass 17   ℹ fail 0
```

### 1.3 Lock test under both shells

```
$ bash shared/resources/advance-pipeline-lock.test.sh ; echo $?   → Results: 14 passed, 0 failed / BASH_EXIT=0
$ zsh  shared/resources/advance-pipeline-lock.test.sh ; echo $?   → Results: 14 passed, 0 failed / ZSH_EXIT=0
```

Exit codes captured directly into variables, not read through a pipe.

### 1.4 `gh pr checks 309` — and the head SHA

```
$ gh pr checks 309
PR into main comes from an allowed branch   pass   4s
link-check                                  pass   25s
test                                        pass   1m23s
validate                                    pass   24s
exit=0

$ gh pr view 309 --json headRefOid -q .headRefOid → c762de46696c8a165f083cd7e26d015c96270280
$ git rev-parse HEAD                              → c762de46696c8a165f083cd7e26d015c96270280
```

Identical — the green checks are **not** stale against the commit under review. (At first poll the
`test` check was still `pending`; it went green on the same SHA and is recorded here as observed.)

---

## 2. Mutation proofs — every proof asserted anywhere in this task's artifacts, re-executed

Tree was `git status --porcelain`-empty before each mutation and restored with `git checkout -- .`
after each; verified empty between every one and at the end.

| # | Mutation | Claimed | **Observed** | Right reason? |
| --- | --- | --- | --- | --- |
| A | Delete **only** the `pending — 5c not yet run` row (`develop-pipeline-resume-contract.md:129`), leaving the two other occurrences at :82/:92 intact | red, naming the value | **16 pass / 1 fail** | ✅ yes — `AssertionError: the resume sub-state TABLE must carry a row for PR Review = "pending — 5c not yet run", not merely mention the value somewhere in the file` |
| B | Remove the sub-state table's end marker (the lone `>` at :131) | red, "rather than widening the slice to EOF and re-admitting the sentences that made it inert" | **16 pass / 1 fail** | ⚠️ **fires, but the stated reason is false** — see §3.2 |
| C *(mine)* | Delete the `` `not reached`, blank, or no row `` row (:130) — a value in the assertion's own loop | (not claimed) | **17 pass / 0 fail — GREEN** | ❌ **the guard cannot see it** — see §3.1 |
| D | Rename `### Convergence check` in the QA-loop doc | red on the missing end marker | **15 pass / 2 fail** | ✅ yes — `end marker not found after "### Outcome branching (shared)", so the slice would silently widen to EOF` |
| E | Revert the `PASS` arm from 5c back to Step 7 | red | **16 pass / 1 fail** | ✅ yes — `the PASS arm must hand to 5c — a clean gate is no longer the loop's exit` |
| F | Restore `--stage ready-for-merge` into 5a's outcome branching | red, "ordering assertion fails by name" | **16 pass / 1 fail** | ✅ yes — `ready-for-merge must sit INSIDE 5c. Before task 77 it fired in 5a's outcome branching…` |
| G | Remove `review-pr` from the lock noop arm (`advance-pipeline-lock.sh:84`) | **does not hold** — the `*)` catch-all already noops | **bash 14/14, zsh 14/14, parity 17/17 — all green** | ✅ the honest disclosure is **accurate** |
| H | PR-body claim "All 17 fail against `origin/develop`; none is vacuous" | 17/17 red on develop | **0 pass / 17 fail** in a detached `origin/develop` worktree with only the test file copied in | ✅ holds |
| I *(mine)* | Revert CY6-3 — both banner renderings back to `(1 cycle, PASS 100/100)` | (not claimed) | **25 pass / 0 fail** across `pr-review-loop-parity` + `remaining-work-banner-parity` | ❌ the fix is **unpinned** — see §3.5 |
| J *(mine)* | Delete the `` `APPROVE` or `CONCERNS` `` row (:126) | (not claimed) | **17 pass / 0 fail — GREEN** | informational: terminal verdicts are outside the assertion's loop, arguably by design |

**Headline result.** Mutation A — the one gate 6 disproved, and the one this commit exists to make
real — **now genuinely holds, and fails for the right assertion with the right message**. That part
of CY6-1 is closed by execution, not by claim. But mutations C and B show the fix is narrower and
less well-founded than the three artifacts asserting it say.

### 2.1 Full row-by-row mutation of the sub-state table

Every row deleted individually, parity suite re-run each time:

| Row deleted | Result |
| --- | --- |
| `` `APPROVE` or `CONCERNS` `` (:126) | 17/17 green (outside the loop) |
| `` `REQUEST CHANGES` `` (:127) | **16/1 red** ✅ |
| `` `review failed` `` (:128) | **16/1 red** ✅ |
| `` `pending — 5c not yet run` `` (:129) | **16/1 red** ✅ |
| `` `not reached`, blank, or no row `` (:130) | **17/17 green** ❌ |

---

## 3. Findings

### 3.1 CY7-1 (HIGH) — the CY6-1 fix is weaker than its claim, on the same axis

`c762de4`'s message: *"The assertion is now scoped to the sub-state **TABLE** … and **requires a row
rather than a mention**."* The implementation report's post-gate-6 table repeats it: *"requires a row
(`` `value` ``), not a mention."*

Executed: deleting the `` `not reached`, blank, or no row `` row — **one of the four values the
assertion's own loop enumerates** — leaves the suite **17/17 green**.

The mechanism is the same one that made the pre-c762de4 guard inert, one scope level down. The
`pending` row's action text reads:

```
> | `pending — 5c not yet run` | 5a wrote its placeholder … **Same action as `not reached`**: if gate `{N}` reads `PASS`/`WAIVED` …
```

That backticked `` `not reached` `` sits **inside the slice**, so `subState.includes("`not reached`")`
is pre-satisfied by a *mention* — exactly what the fix says it now rejects. The assertion narrowed the
haystack from the file to the table; it did not change `includes(mention)` into `matches(row)`.

Aggravating: the row that can be deleted silently is the table's **default/fallback** arm — the one a
resumed run lands on for `not reached`, blank, or a missing row, i.e. the most common non-terminal
state. And the standing repo rule is mutation-prove-every-fix; the proof published for this fix
covers 3 of the 4 values it claims to cover.

**Fix**: assert the row *shape*, not the presence of the literal — e.g.
`assert.match(subState, new RegExp("^> \\| `" + escape(v) + "`", "m"))` — so a value can only satisfy
the guard by opening a row. Then re-run mutation C.

**CY5-4 therefore remains PARTIAL for a fourth consecutive assessment.**

### 3.2 CY7-2 (MEDIUM) — mutation B's stated rationale is false, in four places

The end-marker assertion's message, and the same words in `c762de4`'s message, the implementation
report (:485) and the PR #309 body, all say the guard exists because *"without an end marker this
slice would widen to EOF and **re-admit the artifact-table sentences**"*.

It cannot. The artifact-table sentences are at `develop-pipeline-resume-contract.md:82` and `:92` —
**above** `tableStart` (:124). A slice that starts at 124 and widens forward can never contain them.

Proved by direct simulation (read-only, on an in-memory copy with the end marker **and** the
`pending` row both removed):

```
tableEnd found? -1
slice length 5578 of 15781
pending — 5c not yet run -> false      ← the guard would STILL have caught it
REQUEST CHANGES -> true
review failed -> true
not reached -> true
does widened slice contain the artifact-table sentence? false
```

So the widened slice does **not** re-admit the sentences, and the pending-row mutation would have been
caught even with the end-marker guard absent. Mutation B does go red — the assertion is worth keeping,
because `slice(x, -1)` failing loudly beats failing silently — but the causal claim attached to it is
untrue. This is a mutation proof whose stated mechanism does not hold, published in the pass whose
entire purpose was to stop publishing those.

**Fix**: reword the assertion message and the three artifacts to what is actually true — "an absent
end marker makes `indexOf` return −1 and `slice(start, −1)` silently run to EOF, so assert it rather
than slice on it."

### 3.3 CY7-3 (MEDIUM) — a false closure claim inside the closure table, third occurrence

Implementation report `:490`:

> | CY5-3 (carried PARTIAL) | … That claim is now corrected in **all three artifacts it appeared in** |

Two lines later, `:492`:

> The `741117f` commit message **cannot be rewritten** — it is pushed and public. The correction is
> recorded here and in the PR body instead …

The three artifacts are the `741117f` commit message, the implementation report and the PR body. Two
of the three are corrected; the third is explicitly and deliberately *not*. The row therefore asserts
a closure the same section immediately withdraws.

This is CY5-3's own defect class — *a false closure claim in the artifact a reviewer reads to check
closure* — recurring inside the table that closes CY5-3. Not a large factual error; it is on the one
axis this task exists to police.

**Fix**: "corrected in the implementation report and the PR body; the `741117f` commit message keeps
the false claim by design, with the correction recorded here."

### 3.4 CY7-4 (MEDIUM) — a count contradicted by its own list, replicated in three artifacts

Implementation report `:466`:

> **Five of the seven** gate-5 findings verified genuinely closed (CR-3, CY5-1, CY5-2, CY5-5, CY5-6,
> CY5-7)

The parenthetical lists **six** items. And gate 6's own `status_reason` says *"**Six of the eight**
findings gate 5 left open are fully and verifiably closed"* — eight, because gate 5's `top_issues` are
CY5-1…CY5-7 (verified: seven `- id:` entries in `task.77.gate.5.review-pr-in-pipeline.yml`) **plus**
CR-3, which is carried from the 5c review and is not one of the seven. So the sentence mis-states both
numerator and denominator, and the item it folds into "seven" is the one that is not a member of it.

The identical "five of the seven" appears in `c762de4`'s commit message and in the PR #309 body
("Five of the seven were verified genuinely closed"). A count asserted as exhaustive that its own
list contradicts, in three artifacts, understating an independent gate's result.

### 3.5 CY7-5 (LOW) — a superseded claim left standing in two rows of the trail

Implementation report `:417` and `:453` both still assert *"the per-cycle banner paragraph enumerates
**all four** Steps 5–6 moments"*. `c762de4` removed that four-count from
`develop-pipeline-step-5-6-qa-loop.md` in closing CY6-2 — the paragraph now states *ownership* and
says HALT is additional and not in the count. Verified: `grep -rn "firing point"` finds no "four" in
any shared resource.

The same document amended its CY5-4 row **in place** when that row was found false, so the convention
in this file is to amend a superseded historical claim rather than leave it standing. Two rows were
missed.

### 3.6 CY7-6 (LOW) — Completion block stale by one pass

Implementation report `:503`: **Final Status**: *"awaiting an independent verdict on the post-gate-**5**
remediation"*. `c762de4` updated the adjacent **Finished** and **QA Iterations** lines in the same
block and left this one naming the wrong pass.

### 3.7 CY7-7 (LOW) — CY6-3's fix is unpinned

Reverting both banner renderings to the two-component form
(`Steps 5–6/8 — QA LOOP ✅ complete (1 cycle, PASS 100/100)`) leaves `pr-review-loop-parity` +
`remaining-work-banner-parity` at **25/25 green**. `remaining-work-banner-parity.test.mjs` asserts
that firing-point *names* appear in the canonical spec; nothing asserts the Steps 5–6 exit
parenthetical carries `PR review {verdict}` — the field task 77 exists to add.

That is precisely why the defect survived five QA cycles, a Step 5c review and an independent gate.
The fix is correct and verified on disk; it is simply not held by anything, and the repo's standing
rule is that an unheld fix is unproved.

---

## 4. Finding-by-finding verdict on gate 6

| Gate-6 finding | Verdict | Evidence |
| --- | --- | --- |
| **CY6-1** (HIGH) — fabricated mutation proof | ⚠️ **PARTIAL** | Mutation A now genuinely holds and fails for the right assertion; the false claim is corrected in the implementation report, the task doc Change Log and the PR body, and the commit message is left standing with the reason given. But the guard pins 3 of the 4 enumerated values (CY7-1), and mutation B's rationale is false (CY7-2) |
| **CY6-2** (MEDIUM) — "four firing points" contradiction | ✅ **CLOSED** | Reworded per the gate's own second suggested action: the paragraph now states ownership and says the banner's HALT row is additional and not in the count, naming three HALT arms with "included" (non-exhaustive). Residual, **not** a regression: `❌ halted` is instructed **nowhere** in the repo — `grep -rn "❌ halted"` hits only the banner table and its three bundled copies, and that is equally true on `origin/develop` |
| **CY6-3** (MEDIUM) — stale format-authority specimen | ✅ **CLOSED** | `develop-pipeline-remaining-work-banner.md:59` (format line) and `:116` (worked example, labelled "Step 7 transition, develop-story" — a pipeline that *does* have 5c) both carry `PR review APPROVE`. Unpinned — CY7-7 |
| **CY6-4** (LOW) — orphaned colon | ✅ **CLOSED** | `develop-pipeline-step-5-6-qa-loop.md:758-766` — the Remaining Work Status paragraph now precedes "Pass the **PR review report** as well:" and the ` ``` ` block follows the colon directly |
| **CY5-4** (carried PARTIAL) — test half not closed | ⚠️ **STILL PARTIAL** | Improved from "wholly inert" to "3 of 4 values pinned". See CY7-1 |
| **CY5-3** (carried PARTIAL) — false closure claim | ⚠️ **STILL PARTIAL** | The gate-6 claim is corrected; two new inaccurate claims land in the same table (CY7-3, CY7-4) |

---

## 5. Bundle freshness — by content, not by the bundler's word

`c762de4` touched two files under `shared/resources/`
(`develop-pipeline-remaining-work-banner.md`, `develop-pipeline-step-5-6-qa-loop.md`); the branch as a
whole also touches `develop-pipeline-resume-contract.md`. Their bundled copies:

- banner × 3 (`develop-bug`, `develop-story`, `develop-task`)
- qa-loop × 2 (`develop-story`, `develop-task`)
- resume-contract × 6 (`develop-bug`, `develop-story`, `develop-task`, `qa-story`, `qa-task`, `review-pr`)

All **11 compared by content** — after stripping the `<!-- AUTO-GENERATED … -->` line and applying the
bundler's `shared/resources/<f>` → `references/<f>` rewrite for every `<f>` that exists in
`shared/resources/`. **0 mismatching.** The commit's claim is true.

Repo-wide sweep of every `references/` `.md`/`.sh`/`.js` with a `shared/resources/` source: **4 stale**
—

```
DIFF  skills/create-story/references/set-github-project-priority.sh
DIFF  skills/create-task/references/set-github-project-priority.sh
DIFF  skills/qa-story/references/develop-pipeline-step-1-create-branch.md
DIFF  skills/qa-task/references/develop-pipeline-step-1-create-branch.md
MISMATCH_COUNT=4
```

`git diff --name-only origin/develop...HEAD` is **empty** for all four and for their sources → these
are pre-existing task-86 (bundler transitive-refresh) instances on `develop`, **not** regressions from
this branch. Identical to gate 6's finding.

---

## 6. Tree state

`git status --porcelain` was empty before the first mutation, after every restore, and at the end.
`git rev-parse HEAD` unchanged at `c762de4…`. A temporary `origin/develop` worktree was created for
mutation H and removed with `git worktree remove --force` + `git worktree prune`. The only files this
assessment adds are itself and `task.77.gate.7.review-pr-in-pipeline.yml`; neither is committed by
this reviewer.

---

## 7. Summary

The remediation is real work and most of it holds. The headline proof gate 6 disproved now genuinely
fires, with the right assertion and the right message; three of the four gate-6 findings are closed on
disk; the false claim is disclosed openly in three places rather than quietly patched; the suite is
green end to end, the four PR checks are green on the exact head SHA, and every bundled copy of every
touched source is content-identical.

It cannot pass, for one reason and one aggravating pattern.

The reason: **the fix for the HIGH finding is weaker than the sentence describing it, on the finding's
own axis.** The guard was inert; it is now inert for one of four values, and the one it cannot see is
the table's default arm. Three artifacts say it "requires a row rather than a mention", and for
`not reached` it still accepts a mention. That is a smaller instance of CY6-1, inside CY6-1's fix.

The pattern: **the closure table keeps acquiring claims that execution or the adjacent paragraph
contradicts.** Gate 5 found two; gate 6 found one; this pass corrects those and adds two more
(CY7-3, CY7-4), plus a mutation rationale that is factually impossible (CY7-2) and two superseded
sentences left standing (CY7-5, CY7-6). For a task whose premise is that a complete-looking trail may
not hold, that is the defect class rather than noise.

Nothing here is a runtime blocker. `npm run ci` exits 0, the PR is green on its head SHA, and the
change is still a net removal of shell surface. This is a trail-integrity and test-strength verdict.

**FAIL — 78/100.** Up 3 from gate 6: CY6-1's mechanism is materially better and three findings are
genuinely closed; not further, because the same defect class recurs in the fix and in the table that
records it.
