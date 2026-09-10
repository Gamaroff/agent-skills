---
type: qa-assessment
title: "QA Assessment 8 — post-gate-7 remediation pass (task.77)"
description: "Independent execution-based assessment of commit a0ced9b, which claims to close gate-7 findings CY7-1…CY7-7 and the two carried PARTIALs."
status: complete
updated: 2026-09-03
tags: [qa, task-77, review-pr, remediation]
---

# QA Assessment 8 — post-gate-7 remediation pass

**Work item**: `docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md`
**Branch**: `feature/task.77.review-pr-in-pipeline` — **PR #309**, base `develop`
**Commit under test**: `a0ced9b` ("fix(task.77): replace the resume guard mechanism, close the gate-7 findings")
**Verdict**: **CONCERNS — 87/100**

## Provenance

I was dispatched with **no account of how any of these fixes were made**, and did not ask for one.
I did not write the code, the docs, or the commit under review. Every claim in every repo artifact —
the `a0ced9b` commit message, the implementation report's post-gate-7 section and mutation matrix,
the PR #309 body's mutation table, the task doc's Change Log, and gates 5–7 — was treated as a
**hypothesis to test by execution**, never as evidence. This continues the rule that produced gates
5, 6 and 7, which itself existed because Step 5c's finding PC-1 was that the agent writing this
task's code had also written the gate clearing it.

This grades the **post-gate-7 remediation pass, not a QA cycle**. The 5-cycle budget was spent at
gate 5; **Loop Escalation stands** and a third remediation pass does not reset it.

**Headline**: this is the first pass in four whose headline mechanism is genuinely as strong as its
sentence. I attacked the row-keying claim six ways and could not defeat it on the axis it claims.
The residual findings are one incomplete trail correction and four narrow test-strength gaps — no
HIGH, and nothing that fails at runtime.

---

## 1. Execution evidence

### 1.1 `npm run ci`

```
$ npm run ci > .../ci.log 2>&1; ec=$?; echo "CI_EXIT=$ec" >> .../ci.log
CI_EXIT=0
```

The exit code was captured into a variable and written to the log by a *separate* statement, so no
`echo` sat between the command and `$?`. From the log:

```
> prettier --check .
All matched files use Prettier code style!

ℹ tests 2285
ℹ suites 8
ℹ pass 2284
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 479855.878942

> agent-skills@1.0.0 eval:all
[replay] 03-tick-and-cleanup: 4/4 assertions passed
CI_EXIT=0
```

2285 tests, up one from gate 7's 2284 — the added banner assertion lives in a single new `test()`.
`shared/resources/tests/qa-execute-snippets.test.mjs` did **not** flake on this run
(`✔ drain equivalence: qa-execute-snippets (usage path) writes the same bytes to a pipe and a file
(535.5ms)`), so no re-run of that file alone was needed. The only `⚠️` lines in the log are fixture
output from the tracker-comment negative paths (`gh issue comment failed`, `Jira comment failed:
HTTP 400: nope`) — deliberate, and their suites report 0 failed.

### 1.2 Parity suite

```
$ command node --test evals/shared/tests/pr-review-loop-parity.test.mjs
✔ the banner doc carries the PR review verdict in the Steps 5-6 exit line (0.304429ms)
✔ the 5c resume check reads the report, not the filesystem (3.589063ms)
ℹ tests 18   ℹ pass 18   ℹ fail 0
```

### 1.3 Lock test under both shells

```
$ bash shared/resources/advance-pipeline-lock.test.sh; BE=$?
BASH_EXIT=0   —   Results: 14 passed, 0 failed
$ zsh  shared/resources/advance-pipeline-lock.test.sh; ZE=$?
ZSH_EXIT=0    —   Results: 14 passed, 0 failed
```

Exit codes captured directly into variables, not read through a pipe.

### 1.4 `gh pr checks 309` — and the head SHA

```
$ gh pr view 309 --json headRefOid   ->  a0ced9b34f483937a1c62d72be83569147dc3f79
$ git rev-parse HEAD                 ->  a0ced9b34f483937a1c62d72be83569147dc3f79
```

Byte-identical, so the checks are not stale against the commit under review. At first poll `test`
was `pending`; on re-poll:

```
PR into main comes from an allowed branch   pass   4s
link-check                                  pass   26s
test                                        pass   1m31s
validate                                    pass   13s
```

4/4 green on the exact head SHA.

---

## 2. Mutation proofs — 27 executed

Every mutation claim asserted anywhere in this task's artifacts was re-executed, plus ten of my own
devised to defeat the specific claim `a0ced9b` makes. `git status --porcelain` was empty before the
first mutation, after every restore, and at the end.

### 2.1 Claims asserted by the trail

| # | Mutation | Asserted in | Claimed | Observed | Holds? |
| --- | --- | --- | --- | --- | --- |
| 1 | Delete the `pending — 5c not yet run` row (resume-contract:129) | `a0ced9b` msg; impl report :531; PR body :32 | red | 17 pass / 1 fail — fires **`expected the sub-state table to parse into at least 5 rows, got 4`** | red, but see CY8-3 |
| 2 | Delete the `REQUEST CHANGES` row (:127) | same | red | 17/1 — same row-count assertion | red, see CY8-3 |
| 3 | Delete the `review failed` row (:128) | same | red | 17/1 — same row-count assertion | red, see CY8-3 |
| 4 | Delete the `not reached` row (:130) | same, flagged "v1 green, v2 GREEN" | red | 17/1 — same row-count assertion | red, see CY8-3 |
| 5 | Row present, action cell blanked to `TBD` | same | red, naming the missing action | 17/1 — `the row for "not reached, blank, or no row" must say WHERE the run resumes (5a/5b/5c, Step 7, or escalation)` | **HOLDS** |
| 6 | Restore | same | 18/18 green, file byte-identical | 18 pass / 0 fail; `git status --porcelain` empty | **HOLDS** |
| 7 | Remove the table's end marker (lone `>` at :131) | test message; `a0ced9b` msg; impl report | red | 17/1 — `the sub-state table must be followed by its rationale block — without an end marker this slice runs to EOF and the row parse below would absorb the rows of any blockquote table added later in the file` | **HOLDS** |
| 8 | **The replacement CY7-2 rationale, simulated**: end marker removed *and* a blockquote table appended later in the file | `a0ced9b` msg: "it stops the row parse absorbing any blockquote table added later in the file" | the parse absorbs the later rows | `tableEnd -1`; `rows parsed: 8`; keys include `` `bogus row A` ``, `` `bogus row B` ``; `ABSORBED a later blockquote table row? true` | **HOLDS — the new rationale is TRUE** |
| 9 | **The retired CY7-2 rationale, re-checked**: does the widened slice contain the artifact-table sentence? | gate 7 CY7-2 called it impossible | impossible | `widened slice contains artifact-table sentence? false` — and the phrase "re-admit the artifact-table sentences" no longer appears in any live prose | correctly retired |
| 10 | Revert the banner worked example (:116) to `(1 cycle, PASS 100/100)` | `a0ced9b` msg (CY7-7); impl report | red | 17/1 — `the worked example must RENDER the verdict, not merely describe it — the example is what gets copied` | **HOLDS** |
| 11 | Remove `` `PR review {verdict}` `` from the banner format line (:39) | `a0ced9b` msg (CY7-7) | red | 17/1 — `the banner doc must state that the Steps 5-6 exit parenthetical carries the PR review verdict` | **HOLDS** |
| 12 | Gate 7's mutation I verbatim — revert **both** :59 and :116 | impl report: "gate 7's mutation I … was green and is now red" | red | 17/1 | **HOLDS** |
| 13 | Revert the PASS arm (qa-loop:243) from 5c back to Step 7 | PR body mutation table | Held | 17/1 — `the PASS arm must hand to 5c — a clean gate is no longer the loop's exit` | **HOLDS** |
| 14 | Restore `--stage ready-for-merge` into 5a's outcome branching | PR body | Held, by name | 17/1 — `ready-for-merge must sit INSIDE 5c. Before task 77 it fired in 5a's outcome branching…` | **HOLDS** |
| 15 | Rename `### Convergence check` in the QA-loop doc | PR body | Held | 16 pass / 2 fail — `end marker not found after "### Outcome branching (shared)", so the slice would silently widen to EOF` | **HOLDS** |
| 16 | Remove `review-pr` from the lock noop arm (`advance-pipeline-lock.sh:84`) | PR body: "**Did not hold — as predicted**" | does NOT hold | bash 14/14, zsh 14/14, parity 18/18 — all green | **the honest disclosure is ACCURATE** |
| 17 | Run all 18 parity tests inside a detached `origin/develop` worktree | PR body :20 — "All fail against `origin/develop`; none is vacuous" | 18 fail | `ℹ tests 18  ℹ pass 0  ℹ fail 18` | **HOLDS** |

### 2.2 My own mutations — devised to defeat `a0ced9b`'s claim

The claim under attack: *"It parses the sub-state table into rows, keys on the FIRST CELL, and
requires the action cell to name where the run re-enters. A value named anywhere else, including
inside another row's prose, no longer satisfies it."*

| # | Mutation | Observed | Verdict |
| --- | --- | --- | --- |
| 18 | Delete the `` `not reached` `` row **and add a decoy row** so the parsed count stays 5 | 17/1 — `the resume sub-state table must carry a ROW KEYED on PR Review = "not reached"` | **the keying HOLDS** |
| 19 | Same, for `REQUEST CHANGES` (:127), `review failed` (:128) and `pending — 5c not yet run` (:129) — each replaced by `` > \| `decoy-N` \| Decoy — re-enter at **5a** \| `` | each 17/1, each naming **its own** value | **the keying HOLDS per value** |
| 20 | Keep the `` `not reached` `` row key; replace its action with `n/a — nothing to do here; see the 5c notes above` | **18 pass / 0 fail — GREEN** | **GAP → CY8-4** |
| 21 | Merge all four enumerated values into **one** row key with one shared action `All: re-enter at **5a**`, and pad to 5 rows with four content-free decoys | **18 pass / 0 fail — GREEN** | **GAP → CY8-5** |
| 22 | Reorder rows — swap :127 and :130 | 18/18 green | correct; row order is not contractual |
| 23 | Strip the blockquote `>` markers from the header, separator and all five rows | 18/18 green | robust by design (`replace(/^>\s*/, "")`) |
| 24 | Move the whole table block to EOF | 17/1 on the end-marker assertion | caught |
| 25 | Delete the `` `APPROVE` or `CONCERNS` `` row (:126) — the PR body claims "Delete **any single row** … Held" | 17/1 — row-count assertion | red, so the PR body's "any single row" is literally true |
| 26 | Revert **only** the banner's generic format placeholder at :59, leaving :116 and :39 intact | **18 pass / 0 fail — GREEN** | **GAP → CY8-6** |
| 27 | Remove `, PR review {verdict}` from 5c's own statement (`qa-loop:816`) | 17/1 — `5c must state the exit line the banner doc is the format authority for` | **HOLDS** — the third assertion of the new test is live |

**Bottom line on CY7-1**: the mechanism is genuinely fixed. Mutations 18 and 19 are the sharp test
the trail did not run, and the guard passes all four of them, naming the deleted value. This is the
first time in four assessments that the headline claim survives an adversarial reading.

---

## 3. Findings

### 3.1 CY8-1 (MEDIUM) — CY7-4 is PARTIAL, and asserted closed in two artifacts

`a0ced9b`'s message: *"CY7-4 — 'Five of the seven' was followed by a list of six; the count was wrong
and the list was right. **Corrected** to six of eight, matching gate 6."* The implementation report
(:543) repeats it unqualified: *"'five of the seven' corrected to six of eight"*.

Gate 7's CY7-4 named **three** artifacts and its `suggested_action` said explicitly: *"Correct the
commit trail by note (not force-push) **and the PR body in place**."* On disk:

- `docs/…/task.77.implementation.1.…md:466-468` — **corrected**, and correctly annotated with what
  the earlier version said.
- **PR #309 body, line 43** — *"Five of the seven were verified genuinely closed"* — **uncorrected**.
- `docs/…/task.77.review-pr-in-pipeline.md:569` (task doc Change Log) — *"5 of 7 gate-5 findings
  verified closed"* — **uncorrected**. Gate 7 did not enumerate this one; it is a fourth instance.

The PR body **was** edited in this pass — a gate-7 paragraph was added at line 44 and the mutation
row at line 32 was rewritten to "third version of this guard". So the instance nine lines above was
passed over, not unreachable. One of three named artifacts corrected, published as "corrected".

### 3.2 CY8-2 (LOW) — the exact phrase CY7-3 named survives in the task doc

CY7-3 quoted *"That claim is now corrected in **all three artifacts it appeared in**"* and called it
a false closure claim. The implementation report's row 492 was reconciled properly:

> `| CY5-3 (carried PARTIAL) | … That claim is corrected in the two artifacts that can still be edited — this report and the PR body. The third, 741117f's commit message, is immutable; see the note below, which this row deliberately does not contradict |`

That is a good fix and I verified the PR body does carry the disclosure (line 43). But the task
doc's Change Log at `task.77.review-pr-in-pipeline.md:570` still ends:

> `…orphaned colon fixed; the false claim corrected in all three artifacts`

`grep -rn "all three artifacts"` over the task directory finds it in one line. CY7-3 as scoped
(the implementation report) is closed; this is a new instance of the same class.

### 3.3 CY8-3 (LOW) — the published mutation matrix does not discriminate the new mechanism

The implementation report puts the paragraph describing the row-keying immediately above the matrix,
and the matrix is offered as its proof. Executed (mutations 1–4), **all four row deletions fire
`subStateRows.length >= 5`** — the vacuity canary, whose own message reads *"if this drops, the
parse broke and every assertion below is vacuous"*. The `find`-on-first-cell assertion the paragraph
describes is never reached by any published mutation. A guard that only counted rows and never
looked at a key would produce a byte-identical matrix.

The keying **does** work — I proved it with mutations 18/19, which hold the count at 5 with a decoy.
So unlike CY6-1 and CY7-1 this is not an inert guard; it is evidence weaker than the sentence it
supports. Recorded because it is the fourth consecutive pass in which that gap appears, and because
adding a decoy row costs one line.

### 3.4 CY8-4 (LOW) — the action-cell assertion is a mention-match, not a re-entry check

Three artifacts say the guard *"requires the action cell to name where the run re-enters (5a/5b/5c,
Step 7, or escalation)"*. The predicate is `assert.match(row.action, /\b5[abc]\b|Step 7|escalat/i)`.
Replacing the `not reached` row's action with `n/a — nothing to do here; see the 5c notes above`
leaves **18/18 GREEN**. A blank or `TBD` action is caught (mutation 5); a meaningless one that
happens to contain the token is not. Same shape as CY6-1/CY7-1 one cell down, on a much smaller
surface — hence LOW, not a repeat of the HIGH.

### 3.5 CY8-5 (LOW) — per-value routing can be destroyed with the suite green

Merging all four enumerated values into a single row key —

```
> | `REQUEST CHANGES` / `review failed` / `pending — 5c not yet run` / `not reached` | All: re-enter at **5a** |
> | `decoy1` | re-enter at **5a** |   (…decoy2, decoy3, decoy4)
```

— leaves **18/18 GREEN**, even though `REQUEST CHANGES` no longer routes to **5b**, `review failed`
loses its once-only retry and its second-consecutive escalation bound, and `pending`/`not reached`
lose their gate-conditional branch. `key.includes(value)` matches a merged key and the count canary
is satisfied by the decoys. This is *outside* the sentence `a0ced9b` claims (a value in another
row's **prose** genuinely no longer satisfies it), so it is a residual coverage gap, not a false
claim. It is the strongest remaining hole in the contract's pinning.

### 3.6 CY8-6 (LOW) — CY7-7's fix pins one of the two renderings gate 7 named

Gate 7's CY7-7 named lines **59 and 116**. Reverting both is red (mutation 12); reverting :116 alone
is red (mutation 10); reverting **only :59** — the generic
`{optional short parenthetical: "(1 cycle, PASS 100/100, PR review APPROVE)"}` placeholder — is
**18/18 GREEN**. Minor: :59 is the generic format illustration for all steps, not the Steps 5–6
specimen, so the field task 77 exists to add is pinned where it matters.

### 3.7 CY8-7 (LOW) — an exhaustive closure claim published ahead of the verdict

PR body line 44 ends: *"A post-gate-7 pass **closed all of it**."* That is asserted before any
independent verdict on the pass, and is contradicted by CY8-1 nine lines above it in the same
document. Line 43 of the same body carries the uncorrected count.

---

## 4. Finding-by-finding verdict on gate 7

| Gate-7 finding | Sev | Verdict | Evidence |
| --- | --- | --- | --- |
| CY7-1 — guard weaker than "requires a row, not a mention" | HIGH | **CLOSED** | Mechanism replaced with a row parse. Mutations 18/19 — decoy substitution holding the parsed count at 5 — go red for **all four** values, each naming its own value. The trail did not run this test; I did, and it holds. |
| CY7-2 — end-marker rationale factually impossible | MEDIUM | **CLOSED** | The "re-admit the artifact-table sentences" wording is gone from every live artifact. The replacement rationale is *verified true* by direct simulation (mutation 8): with the end marker removed, the parse absorbs a later blockquote table's rows. |
| CY7-3 — false closure claim inside the closure table | MEDIUM | **CLOSED in the file it named** | Impl report :492 reconciled with the immutable-commit note. New instance elsewhere → CY8-2. |
| CY7-4 — "five of the seven" contradicted by its own list | MEDIUM | **PARTIAL** | Corrected in the implementation report; **still standing in the PR #309 body (:43) and the task doc Change Log (:569)** → CY8-1. |
| CY7-5 — "all four Steps 5–6 moments" left standing in two rows | LOW | **CLOSED** | `grep -rn "all four Steps\|four Steps 5\|four firing"` over `docs/tasks/task.77.*`, `shared/resources/` and `skills/` finds no surviving assertion of the count outside the historical gate/qa records and the report's own description of the correction. |
| CY7-6 — Completion block stale by one pass | LOW | **CLOSED** | `**Final Status**: In Progress — awaiting an independent verdict on the post-gate-7 remediation`; `**Finished**` and `**QA Iterations**` updated consistently. |
| CY7-7 — CY6-3's banner fix unpinned | LOW | **CLOSED** | New test with three assertions, all live: mutations 10, 11 and 27 each go red on their own message; gate 7's mutation I verbatim (12) is red. Residual → CY8-6. |
| **CY5-4** (carried PARTIAL, 4 consecutive) | MEDIUM | **CLOSED** | Contract half was already closed. The test half now genuinely pins the row per value (18/19). |
| **CY5-3** (carried PARTIAL) | LOW | **STILL PARTIAL** | Its own stated close condition is "closes when CY7-3, CY7-4, CY7-5 and CY7-6 are corrected". Three of four are; **CY7-4 is not** (CY8-1), and CY8-2 adds a fresh instance of the class. |

---

## 5. Bundle freshness — by content, not by the bundler's word

`a0ced9b` touches **no** file under `shared/resources/` (only the test file and three docs), so it
cannot introduce bundle drift. I checked at branch scope anyway, which is wider than the commit's
own claim of "11 bundled copies".

The branch touches **ten** sources under `shared/resources/`. Every `skills/*/references/<basename>`
copy was compared **by content** against its source after stripping the `AUTO-GENERATED — DO NOT
EDIT` line and applying the bundler's `shared/resources/<f>` → `references/<f>` rewrite for each
`<f>` that exists in `shared/resources`:

```
advance-pipeline-lock.sh                        9 copies
advance-pipeline-lock.test.sh                   0
develop-pipeline-autonomous-defaults.md         6
develop-pipeline-lite-mode.md                   6
develop-pipeline-remaining-work-banner.md       3
develop-pipeline-resume-contract.md             6
develop-pipeline-step-0-resolve-and-prepare.md  6
develop-pipeline-step-5-6-qa-loop.md            2
pipeline-resume-detector-prompt.md              6
qa-findings-ingester-prompt.md                  1
copies compared: 45   mismatching: 0
```

The commit's "11 bundled copies compared by content, 0 mismatching" is true but scoped to three
files; at branch scope it is **45/45 clean**.

**Repo-wide sweep** (709 bundled copies that have a `shared/resources` source, accepting either the
rewritten or the verbatim form since the bundler rewrites `.md`/`.js` only): **4 genuinely stale** —

```
skills/create-story/references/set-github-project-priority.sh
skills/create-task/references/set-github-project-priority.sh
skills/qa-story/references/develop-pipeline-step-1-create-branch.md
skills/qa-task/references/develop-pipeline-step-1-create-branch.md
```

`git diff --name-only origin/develop...HEAD` is empty for all four and for their sources, so these
are the **same pre-existing task-86 instances** gates 6 and 7 found on `develop` — not regressions
from this branch. (A first pass of my sweep reported 202; that was my own false positive from
applying the `.md`/`.js` rewrite to `.sh` copies. Corrected before reporting.)

---

## 6. Tree state

`git status --porcelain` was empty before the first mutation, after every restore, and at the end.
`git rev-parse HEAD` unchanged at `a0ced9b` throughout. A detached `origin/develop` worktree was
created for mutation 17 and removed with `git worktree remove --force` + `git worktree prune`
(`git worktree list` shows only the main tree). The only files I add are this assessment and
`task.77.gate.8.review-pr-in-pipeline.yml`; I commit neither.

---

## 7. Summary

**CONCERNS — 87/100.**

The substantive content of gate 7 is closed. The HIGH is genuinely fixed, and fixed by *replacing*
the mechanism rather than narrowing it a third time: the guard now parses rows and keys on the first
cell, and it survives the adversarial test the trail did not publish. The impossible CY7-2 rationale
was retired and its replacement is not merely plausible — I simulated it and it is true. CY7-7's
banner fix is now held by three live assertions. CY5-4, PARTIAL for four consecutive assessments, is
closed.

What keeps it out of PASS is one incomplete correction published as complete — CY7-4's wrong count
still stands in the PR body and the task doc Change Log, in a PR body that *was* edited in this same
pass — plus four narrow test-strength residuals I found by attacking the guard from angles the trail
did not try. None of them is a runtime risk: `npm run ci` exits 0 on 2285 tests with 0 failures,
4/4 PR checks are green on the exact head SHA, both shells pass the lock suite, and every bundled
copy of every touched source is content-identical.

The pattern that produced three consecutive FAILs — a claim that execution contradicts — has
narrowed from "the mechanism does not do what we said" to "one of three artifacts was not updated".
That is a real change in kind, and it is why this is CONCERNS rather than a fourth FAIL. It is not a
PASS because CY7-4 is PARTIAL and PARTIAL means PARTIAL.

**Loop Escalation stands.** The 5-cycle budget was spent at gate 5 and three remediation passes do
not restore it. Whether the residual — one MEDIUM, six LOW — blocks the merge is an operator
decision, not this gate's.
