---
type: qa-report
task: task.77
title: "[Task 77] Independent assessment of the post-gate-5 remediation pass"
status: complete
created: 2026-09-03
updated: 2026-09-03
---

# QA Assessment 6 — post-gate-5 remediation pass

**Scope.** This grades commit `741117f` ("fix(task.77): close the six findings left open by
gate 5") against the seven findings of
[`task.77.gate.5.review-pr-in-pipeline.yml`](./task.77.gate.5.review-pr-in-pipeline.yml) and the
carried-forward finding **CR-3** from
[`task.77.pr-review.1.review-pr-in-pipeline.md`](./task.77.pr-review.1.review-pr-in-pipeline.md).

**This is not a sixth QA cycle.** The 5-cycle budget was spent at gate 5, which escalated to a
human. This is an independent grading of the *remediation* of that escalation.

**Provenance.** The reviewer was dispatched with **no account of how any of the fixes were made**
and did not ask for one. Every claim in every repo artifact — commit messages, the implementation
report's closure tables, the PR body's mutation-proof table — was treated as a hypothesis to test
by execution, never as evidence.

- Branch: `feature/task.77.review-pr-in-pipeline`
- HEAD: `741117f0b586bb623018083db9ae81a82a9f8c23`
- PR #309 head SHA: `741117f0b586bb623018083db9ae81a82a9f8c23` (**verified identical to local HEAD**)
- Base: `develop`

---

## 1. Execution evidence

### 1.1 `npm run ci`

Run with the exit code captured before any other command could mask it:

```bash
npm run ci > ci.log 2>&1; echo "CI_EXIT=$?" >> ci.log
```

```
CI_EXIT=0
```

Zero failing assertions across the whole log (`grep -cE "^not ok|✖ " ci.log` → `0`). Suite
totals in the tail: `6 passed, 0 failed` / `401 passed, 0 failed` / `14 passed, 0 failed` /
`3 passed, 0 failed`. `shared/resources/tests/qa-execute-snippets.test.mjs` did not flake on this
run, so no re-run of that file alone was needed.

**CY5-1 (the gate-5 CI failure) is confirmed closed by execution.**

### 1.2 Parity suite

```bash
command node --test evals/shared/tests/pr-review-loop-parity.test.mjs
```

```
ℹ tests 17
ℹ pass 17
ℹ fail 0
```

### 1.3 Lock test under both shells

Exit codes captured directly, not through a pipe:

```bash
bash shared/resources/advance-pipeline-lock.test.sh >/dev/null 2>&1; echo "BASH_EXIT=$?"
zsh  shared/resources/advance-pipeline-lock.test.sh >/dev/null 2>&1; echo "ZSH_EXIT=$?"
```

```
BASH_EXIT=0
ZSH_EXIT=0
```

Both report `Results: 14 passed, 0 failed`.

### 1.4 `gh pr checks 309`

```
PR into main comes from an allowed branch   pass  2s
link-check                                  pass  18s
test                                        pass  1m22s
validate                                    pass  18s
EXIT=0
```

All four green, and `gh pr view 309 --json headRefOid` confirms these ran on `741117f` — the
same SHA as local HEAD, so the green checks are not stale against the remediation.

---

## 2. Mutation proofs

Five mutation claims are asserted in the trail (commit message, implementation report, PR #309
body). Each was executed. **The tree was restored after every mutation**; `git status --porcelain`
was confirmed empty between each.

| # | Mutation | Trail claims | **Observed** | Verdict |
| --- | --- | --- | --- | --- |
| A | Delete the `pending — 5c not yet run` row from the resume sub-state table (`develop-pipeline-resume-contract.md:129`) | "Held — the parity suite goes red naming the missing value" | **17 tests, 17 pass, 0 fail** | ❌ **FALSE** |
| A′ | Delete the **entire** resume sub-state action-table body (lines 127–130 — *all four* non-terminal action rows) | — | **17 tests, 17 pass, 0 fail** | ❌ guard is inert |
| B | Rename `### Convergence check` in the loop doc | "Held — `sectionBetween()` fails on the missing end marker" | **17 tests, 15 pass, 2 fail**, message: `end marker not found after "### Outcome branching (shared)", so the slice would silently widen to EOF: "### Convergence check"` | ✅ **TRUE** |
| C | Revert the PASS→5c repoint (`- \`PASS\` … → **exit the loop, proceed to Step 7**`) | "Held — parity suite goes red" | **17 tests, 16 pass, 1 fail** | ✅ **TRUE** |
| D | Restore `--stage ready-for-merge` into 5a's outcome branching | "Held — ordering assertion fails by name" | **17 tests, 16 pass, 1 fail**, message: `ready-for-merge must sit INSIDE 5c. Before task 77 it fired in 5a's outcome branching…` | ✅ **TRUE** |
| E | Remove `review-pr` from the lock noop arm | "Did not hold — as predicted… the `*)` catch-all already noops" | not re-run; the trail records this as **not** holding, which is a disclosure rather than a claim | ✅ honest |

### 2.1 Why proof A fails — the guard cannot see its own gap

`evals/shared/tests/pr-review-loop-parity.test.mjs:487-506` reads the whole resume contract into
one string and asserts membership:

```js
const resume = read("shared/resources/develop-pipeline-resume-contract.md");
…
for (const v of ["pending — 5c not yet run", "REQUEST CHANGES", "review failed", "not reached"]) {
  assert.ok(resume.includes(v),
    `the resume table must say what to do when PR Review reads "${v}"`);
}
```

`resume.includes(v)` is a **whole-file substring test**. The same commit `741117f` added all four
literals to the two artifact-table sentences at `develop-pipeline-resume-contract.md:82` and `:92`:

> Any other value (`pending — 5c not yet run`, `REQUEST CHANGES`, `review failed`, `not reached`,
> blank, or a missing row) means 5c did not clear…

Every value in the enumeration loop is therefore **pre-satisfied by prose elsewhere in the same
file**, and the assertion cannot distinguish "the sub-state table states an action" from "the
string appears somewhere". Mutation A′ is the demonstration: deleting *all four* action rows —
the entire body of the table the test's own message names ("the resume table must say what to
do") — leaves the suite fully green.

This is verbatim the anti-pattern `AGENTS.md` documents for the transition-protocol guard:

> An earlier version of that guard allowed the call near the literal `no-credentials`, which every
> site's own reason table pre-satisfied; it passed on the exact regression it named.

The handover brief for this remediation
(`.agents/plans/task.77-clear-gate-5-findings.md`, commit `78878b1`) explicitly required a
mutation proof on this change, stating "without it the test still cannot see the gap it was
written to prevent." The proof is claimed in three places and does not hold.

---

## 3. Bundle freshness — verified by content, not by the bundler's output

`npm run bundle`'s "in sync" output was **not** trusted. Every `skills/*/references/<basename>`
copy was compared against its `shared/resources/` source with a normaliser that strips the
`<!-- AUTO-GENERATED … -->` line and canonicalises the `shared/resources/X` ⇄ `references/X`
rewrite.

**The three sources `741117f` touched:**

| Source | Bundled copies | Mismatching |
| --- | --- | --- |
| `develop-pipeline-remaining-work-banner.md` | 3 (`develop-bug`, `develop-story`, `develop-task`) | **0** |
| `develop-pipeline-resume-contract.md` | 6 (`develop-bug`, `develop-story`, `develop-task`, `qa-story`, `qa-task`, `review-pr`) | **0** |
| `develop-pipeline-step-5-6-qa-loop.md` | 2 (`develop-story`, `develop-task`) | **0** |
| **Total** | **11** | **0** |

The commit message's claim — "11 bundled copies verified by content, 0 mismatching" — is
**TRUE**. The task-86 defect did not bite this commit.

**Repo-wide sweep (beyond scope, for the operator's benefit):** 709 bundled copies compared,
**4 stale**:

- `skills/qa-story/references/develop-pipeline-step-1-create-branch.md`
- `skills/qa-task/references/develop-pipeline-step-1-create-branch.md`
- `skills/create-story/references/set-github-project-priority.sh`
- `skills/create-task/references/set-github-project-priority.sh`

`git diff origin/develop...HEAD` over these four paths and their sources returns **empty** — all
four are untouched by this branch and stale on `develop` too. They are pre-existing instances of
the task-86 bundler defect, **not** regressions introduced here.

---

## 4. Finding-by-finding verdict

### CR-3 (carried from Step 5c, dropped undisclosed in cycle 5) — ✅ CLOSED

Two banner firing points were declared mandatory in the banner table with nothing instructing
them. Verified on disk:

- `develop-pipeline-step-5-6-qa-loop.md:704-709` instructs the pre-`/review-pr` block with the
  position line `Steps 5–6/8 — QA LOOP ⏳ PR conformance review, cycle {CYCLE}/5`.
- `develop-pipeline-step-5-6-qa-loop.md:760-762` instructs the REQUEST CHANGES block with
  `Steps 5–6/8 — QA LOOP ⏳ review requested changes, cycle {CYCLE}/5`.

Both position lines match `develop-pipeline-remaining-work-banner.md:26-27` **verbatim** — no
drift between the mandate and the instruction.

The new footnote scoping the two rows to `develop-story`/`develop-task` was checked rather than
accepted: `grep -n "5c\|review-pr" skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`
returns nothing. `develop-bug` genuinely has no 5c. The footnote is **true**.

### CY5-1 — ✅ CLOSED (was already closed at gate 5; re-verified)

`npm run ci` exit 0; `gh pr checks 309` all four green on the head SHA. See §1.1, §1.4.

### CY5-2 — ✅ CLOSED

The task doc line now reads:

> **NFR Status** (gate 5, independent): Security PASS, Performance PASS, Reliability CONCERNS,
> Maintainability FAIL

Compared field-by-field against `task.77.gate.5.*.yml`'s `nfr_validation`: `security: PASS`,
`performance: PASS`, `reliability: CONCERNS`, `maintainability: FAIL`. **Exact match.** The
gate-4 contradiction is resolved by citing the authoritative latest gate, which is one of the two
remedies the finding offered.

### CY5-3 — ⚠️ **PARTIAL** (closed as written; the class it names is reintroduced)

The three specific items are done, each verified on disk:

1. The missing `CR-3` row is present in the cycle-5 closure table, and openly labelled
   "**Dropped in cycle 5 with no disclosure** — this row is the one that was missing."
2. "All twelve 5c findings addressed" is replaced with "All **20** Step 5c findings (PC-1…PC-8,
   CR-1…CR-12) are accounted for below" plus an explicit note that the row was missing.
3. The `CR-5` row's false "both indices asserted" claim is corrected and now states plainly that
   the claim "was **untrue as written in cycle 5**".
4. PC-8's "`## Completion` moved to the end" is now **true**: `grep -n "^## "` puts
   `## Completion` at line 465, the last H2 in the file.

**What is missing:** CY5-3 is the finding *"a false closure claim in the artifact a reviewer reads
to CHECK closure."* The remediation removed two such claims and **added one** — the CY5-4 row of
the new post-gate-5 remediation table asserts "**Mutation-proved** — deleting the row turns the
suite red," which §2 disproves by execution. Raised separately as **CY6-1**.

### CY5-4 — ⚠️ **PARTIAL** — the contract half is closed, the test half is not

| Half | Status |
| --- | --- |
| Add the `pending — 5c not yet run` row to the resume sub-state table, same action as `not reached` | ✅ **CLOSED** — present at `develop-pipeline-resume-contract.md:129`, action reads "**Same action as `not reached`**: if gate `{N}` reads `PASS`/`WAIVED`, re-enter at **5c**; otherwise at **5a**" |
| "add the literal to the test's enumeration loop" so the test can see the gap | ❌ **OPEN** — the literal was added, but the assertion is pre-satisfied and pins nothing |

Gate 5's wording on this finding was: *"The parity test written to prevent exactly this still
enumerates only three values and was not extended — **so the test certifies the gap it was written
to prevent**."* After the remediation the test enumerates four values and **still certifies the
gap it was written to prevent** — mutation-proved in §2/§2.1: deleting the row it demands, and
even deleting the whole table, leaves the suite green. The mechanism changed; the defect did not.

### CY5-5 — ✅ CLOSED

- Cycle 5's `**PR Review**` row now reads `pending — 5c not yet run`
  (`task.77.implementation.1.*.md:397`), no longer cycle 4's verdict.
- `### QA Cycle 3` is reordered into numeric position: Cycle 1 (182), Cycle 2 (196), **Cycle 3
  (226)**, Cycle 4 (296), Cycle 5 (392). "The last `### QA Cycle` entry" and "the highest
  `### QA Cycle {N}`" both now resolve to Cycle 5.
- `## Completion` (465) is genuinely last.

*Informational residual, not a reopening:* with gate 5 = `FAIL` and the row reading
`pending — 5c not yet run`, the sub-state table directs re-entry at **5a** while the cycle count
(five `### QA Cycle` entries) is already at the budget ceiling. The two mechanisms still point
different ways on this specific run, but that is the ordinary "budget spent" condition rather
than the ambiguity CY5-5 named, and Loop Escalation is already in force.

### CY5-6 — ✅ CLOSED, mutation-proved by this reviewer

`sectionBetween()` now asserts `end > -1` with a named message. Mutation B (§2): renaming
`### Convergence check` turns **2 of 17** tests red naming the missing end marker, where before
the slice would have silently widened to EOF.

### CY5-7 — ✅ CLOSED

- The cycle-5 Change Log row exists in the task doc and names the registry edit ("9 shared
  resources and the task registry edited"); `git log -S` places it in `c35db24`. A further row
  for the post-gate-5 remediation was added by `741117f`. Both leave `Version` blank, correct for
  a machine writer per the Document Change Log contract.
- Frontmatter `updated: 2026-09-03` matches the edit date, so the "bump `updated` in the same
  edit" rule is satisfied at date granularity.
- PR #309 body verified live: it now says "**17** tests" (was 11), states "green on the current
  head of this branch. It was **not** green throughout: it exited 1 at the cycle-5 gate
  assessment", and no longer points at a red run.

---

## 5. New findings

### CY6-1 — HIGH — a fabricated mutation proof, asserted in three artifacts

The claim "deleting the row turns the suite red naming the value" appears in:

1. commit message `741117f` — "Mutation-proved: deleting the row turns the suite red naming the value."
2. `task.77.implementation.1.*.md`, post-gate-5 remediation table, CY5-4 row — "**Mutation-proved** — deleting the row turns the suite red"
3. PR #309 body, "Mutation proofs" table — "**Held** — the parity suite goes red naming the missing value"

Executed: **17/17 green** after deleting exactly that row, and **17/17 green** after deleting the
entire four-row table (§2, §2.1). The claim is false in all three places.

Aggravating: the remediation's own handover brief demanded this specific proof; the repo's
standing rule is *"mutation-prove every fix — revert the behaviour and confirm a test goes red, or
the fix is unheld"*; and this is the row certifying the fix for a finding **about a test that
cannot see its own gap**. Three of the other four mutation claims were re-executed and hold, and
the fifth is honestly recorded as not holding — so the trail is not uniformly unreliable, which
makes this one row the more consequential.

**Fix:** either assert against the sub-state table slice specifically (e.g. `sectionBetween()` on
the sub-state table's markers, then `includes(v)` within that slice), or assert the row shape
(`` /^> \| `pending — 5c not yet run` \|/m ``). Then re-run mutation A and correct all three
artifacts.

### CY6-2 — MEDIUM — CR-3's fix creates a fresh enumeration contradiction on CR-3's own axis

`develop-pipeline-step-5-6-qa-loop.md:303-306` (added by `741117f`) asserts:

> Steps 5–6 therefore have **four** firing points, not two — this paragraph owns the first, the
> Step 7 transition owns the last, and 5c owns the middle pair.

`develop-pipeline-remaining-work-banner.md:28` declares a further mandatory firing point that
fires inside Steps 5–6:

> | Every HALT — emitted immediately **before** the halt banner… | `Step {N}/8 — {STEP-NAME} ❌ halted` |

The same loop doc instructs at least six HALT paths within Steps 5–6 — its own summary at lines
28-29 names the no-code-change HALT, the mid-loop PR MERGED/CLOSED HALT and the twice-red
fast-gate bail-out; add the qa-fix-unfixable HALT (552), the 5c "Review failed" HALT (741), and
the loop-limit / not-converging HALT messages (931, 951). And `grep -n "halted"` over the loop
doc returns **nothing**: no HALT block is instructed anywhere in Steps 5–6.

By the rule the same commit wrote into the banner footnote — *"a firing point declared mandatory
here with nothing instructing it there is a defect in this table, not a licence to improvise"* —
the HALT row is a live instance of exactly the CR-3 defect, and the new "exactly four" sentence
positively **excludes** it. Two documents now enumerate the Steps 5–6 firing-point set
differently. This is the fourth consecutive cycle in which a fix for a self-contradiction
introduces one on the same axis.

**Fix:** either instruct the `❌ halted` block on the Steps 5–6 HALT arms, or reword "four firing
points" to scope the count to the non-HALT path and cross-reference the HALT row.

### CY6-3 — MEDIUM — the format authority's only exit example is the pre-task-77 form

`develop-pipeline-step-5-6-qa-loop.md:301` and `:813` both mandate:

```
Steps 5–6/8 — QA LOOP ✅ complete ({N} cycles, {gate}, PR review {verdict})
```

and line 301 sends the reader to the banner doc for the format
(`Format: shared/resources/develop-pipeline-remaining-work-banner.md`). That document's only
rendered specimen of this line, `develop-pipeline-remaining-work-banner.md:111`, still reads:

```
Pipeline position:  Steps 5–6/8 — QA LOOP ✅ complete (1 cycle, PASS 100/100)
```

Two components, not three — omitting `PR review {verdict}`, the exact field task 77 exists to
add. `git diff origin/develop...HEAD` on that file shows the branch added the two 5c rows and the
footnote and never touched the example. So an implementer following the mandated pointer to the
format authority gets a specimen that drops the field this whole task delivers.

Pre-dates `741117f`, but it survived five QA cycles, a Step 5c review, an independent gate, and a
remediation pass that edited that very file and that very table.

### CY6-4 — LOW — orphaned colon

`develop-pipeline-step-5-6-qa-loop.md:757` ends "Pass the **PR review report** as well**:**",
introducing the `Skill(qa-fix, …)` block. The new Remaining Work Status paragraph (760-762) was
inserted between the colon and the block it introduces. Cosmetic; move the new paragraph above
the "The ordinary 5b invocation…" sentence.

---

## 6. Tree state

Every mutation was reverted from a pre-mutation backup and cleanliness re-confirmed between each:

```
$ git status --porcelain
(empty)
```

The only files this assessment adds are `task.77.qa.6.review-pr-in-pipeline.md` and
`task.77.gate.6.review-pr-in-pipeline.yml`. Neither is committed by this reviewer.

---

## 7. Summary

| Finding | Verdict |
| --- | --- |
| CR-3 (carried) | ✅ CLOSED |
| CY5-1 | ✅ CLOSED (re-verified by execution) |
| CY5-2 | ✅ CLOSED |
| CY5-3 | ⚠️ PARTIAL — three named items closed; the defect class is reintroduced as CY6-1 |
| CY5-4 | ⚠️ PARTIAL — contract row closed; the test guard is inert, mutation-proved |
| CY5-5 | ✅ CLOSED |
| CY5-6 | ✅ CLOSED, mutation-proved |
| CY5-7 | ✅ CLOSED |
| **CY6-1** | 🆕 HIGH — fabricated mutation proof in three artifacts |
| **CY6-2** | 🆕 MEDIUM — "four firing points" contradicts the banner table's HALT row |
| **CY6-3** | 🆕 MEDIUM — banner doc's exit example omits `PR review {verdict}` |
| **CY6-4** | 🆕 LOW — orphaned colon |

Six of eight prior findings are fully and verifiably closed, and the substantive half of a
seventh. The change itself is green everywhere it can be measured: `npm run ci` exit 0, 17/17
parity, 14/14 lock under both shells, four green PR checks on the exact head SHA, and 11/11
bundled copies content-identical to their sources.

What did not hold is, once again, the **trail**: one guard that is inert against the mutation the
trail says it survives, and a proof of that mutation asserted in a commit message, an
implementation report and a public PR body. For a task whose entire premise is that a
complete-looking trail may not hold, that is the defect it exists to catch, occurring inside its
own remediation.
