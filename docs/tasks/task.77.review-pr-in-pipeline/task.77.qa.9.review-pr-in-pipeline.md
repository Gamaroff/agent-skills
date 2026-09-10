---
type: qa-assessment
title: "QA Assessment 9 — post-gate-8 pass (task.77)"
description: "Independent execution-based assessment of commit 8293765, which claims to close DoD gaps 2–8 and the CY8-3/4/5 residual left open by gate 8."
status: complete
updated: 2026-09-03
tags: [qa, task-77, review-pr, remediation]
---

# QA Assessment 9 — post-gate-8 pass

**Work item**: `docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md`
**Branch**: `feature/task.77.review-pr-in-pipeline` — **PR #309**, base `develop`
**Commit under test**: `8293765` ("fix(task.77): close the DoD gaps and the CY8 residual")
**Verdict**: **CONCERNS — 91/100**

## Provenance

I was dispatched with **no account of how any of these fixes were made**, and did not ask for one.
I did not write the code, the docs, or the commit under review, and I have no fix here to defend.
Every claim in every repo artifact — the `8293765` commit message, the implementation report's
post-gate-8 section and its mutation matrix, the PR #309 body's mutation table, the task doc's
Change Log, `task.77.dod.1`, and gates 5–8 — was treated as a **hypothesis to test by execution**,
never as evidence.

This grades the **post-gate-8 pass, not a QA cycle**. The 5-cycle budget was spent at gate 5;
**Loop Escalation stands**, and a fourth remediation pass does not reset it.

**Headline**: the mutation matrix published in `8293765` is, for the first time in this trail, exactly
as strong as the sentence above it. All six published rows were executed; every one fires the
assertion the matrix names it as firing, and four of them name the deleted value in the failure
message. The instruction that shaped this review — "attack the claims, and the mutation matrix
hardest" — found nothing false in the matrix. What it did find is four **LOW** trail/coverage
residuals, two of them introduced by the commit under review.

---

## 1. Execution — the baseline

All commands run at local `HEAD = 8293765`, working tree clean before and after.

### `npm run ci`

Captured into a variable, not through an `echo` after a redirect:

```bash
npm run ci > ci.log 2>&1; ec=$?; echo "CI_EXIT=$ec"
```

```
CI_EXIT=0
All matched files use Prettier code style!
ℹ tests 2285
ℹ pass 2284
ℹ fail 0
ℹ skipped 1
ℹ duration_ms 421477.776861
[replay] 03-tick-and-cleanup: 4/4 assertions passed
```

`grep -c "not ok" ci.log` → **0**. `shared/resources/tests/qa-execute-snippets.test.mjs` did **not**
flake on this run, so no single-file re-run was needed. `eval:all` ran to completion.

### Parity suite

```
$ command node --test evals/shared/tests/pr-review-loop-parity.test.mjs
ℹ tests 18   ℹ pass 18   ℹ fail 0   ℹ duration_ms 156.628366
```

### Lock suite, both shells

```
$ bash shared/resources/advance-pipeline-lock.test.sh   → Results: 14 passed, 0 failed   BASH_EXIT=0
$ zsh  shared/resources/advance-pipeline-lock.test.sh   → Results: 14 passed, 0 failed   ZSH_EXIT=0
```

### PR #309

```
$ gh pr view 309 --json headRefOid,baseRefName,state
headRefOid = 829376567681c83e40013005d52def032e94c434   base = develop   state = OPEN
$ git rev-parse HEAD
829376567681c83e40013005d52def032e94c434
```

Head SHA is **byte-identical to local HEAD**, so the checks are not stale against the commit under
review.

```
$ gh pr checks 309
PR into main comes from an allowed branch   pass   3s
link-check                                  pass   34s
test                                        pass   1m27s
validate                                    pass   17s
```

GitHub's clean-room `test` job is green on this exact head.

---

## 2. The mutation matrix — attacked, and it holds

`8293765` publishes seven rows and claims **"each fires the KEYING by name, not a count canary"**.
That is the claim gate 8's CY8-3 said was false of the previous matrix. I executed every row and
captured the assertion message, because "red" alone cannot distinguish the keying from the canary.

| # | Mutation (published in `8293765`) | Claimed | Observed | Assertion that fired |
| --- | --- | --- | --- | --- |
| T1 | delete `pending — 5c not yet run` row, no decoy | red, keying by name | **RED** 17/1 | `expected exactly ONE sub-state row keyed on PR Review = "pending — 5c not yet run", found 0` |
| T2 | delete `REQUEST CHANGES` row, no decoy | red, keying by name | **RED** 17/1 | `…keyed on PR Review = "REQUEST CHANGES", found 0` |
| T3 | delete `review failed` row, no decoy | red, keying by name | **RED** 17/1 | `…keyed on PR Review = "review failed", found 0` |
| T4 | delete `not reached` row, no decoy | red, keying by name | **RED** 17/1 | `…keyed on PR Review = "not reached", found 0` |
| T5 | merge all four values into ONE key + 3 decoys (count holds at 5) | red, one-row-per-value | **RED** 17/1 | `"REQUEST CHANGES" shares row "…" with "pending — 5c not yet run" — each value needs its OWN row` |
| T6 | row present, action `n/a — nothing to do here; see the 5c notes above` | red, action-verb | **RED** 17/1 | `the row for "not reached" must state what the run DOES (re-enter / go to / proceed to / escalate)` |
| T7 | restore | 18/18 green, byte-identical | **GREEN** 18/0 | — `git status --porcelain` empty |

**The discrimination test.** Gate 8's CY8-3 was that a plain row deletion fired
`expected the sub-state table to parse into at least 5 rows, got 4` — a vacuity canary that a
row-counting guard would also produce. That canary is gone: `subStateRows.length >= 5` is now
`subStateRows.length > 0` plus a per-row well-formedness check, and a single deletion falls through
to the keying assertion at `pr-review-loop-parity.test.mjs:596`. Verified directly by reading the
failure trace, not inferred from the exit code. **CY8-3 is genuinely closed, and the fix is
mechanism-level, not matrix-level.**

The two remaining CY8 residuals were also mutation-checked rather than read:

- **CY8-4** — the old predicate `/\b5[abc]\b|Step 7|escalat/i` was one mention-match. It is now two
  assertions (verb, then destination). T6 is gate 8's own mutation 20 verbatim; it was green then
  and is red now.
- **CY8-5** — gate 8's mutation 21 verbatim is T5; green then, red now.

### 2.1 Mutations the published set would miss — built and executed

Seven of these are **GREEN**, and they are the substance of finding CY9-3 below.

| # | My mutation | Result | Why it matters |
| --- | --- | --- | --- |
| A1 | `REQUEST CHANGES` action → `re-enter at **5c**` (contract says **5b**) | **GREEN** 18/0 | right key, plausible but wrong destination |
| A2 | swap the actions of `REQUEST CHANGES` and `review failed` | **GREEN** 18/0 | two values swapped between rows |
| A3 | `not reached` action → `go to Step 7` (unconditional; inverts the arm) | **GREEN** 18/0 | destination named, contract inverted |
| A4 | `not reached` action → `no escalation needed; proceed to reading the 5c notes above` | **GREEN** 18/0 | verb + destination present, meaning absent |
| A5 | `APPROVE`/`CONCERNS` action → `re-enter at **5a**` (inverts the loop's exit) | **GREEN** 18/0 | the exit arm itself is unpinned |
| A6 | `review failed` action → `re-enter at **5c**`, dropping the once-only + escalation bound | **GREEN** 18/0 | the arm that stops an unattended driver looping forever |
| A7 | `pending` action → `re-enter at **5a**`, dropping the gate-conditional branch | **GREEN** 18/0 | per-value routing again |
| B1 | strip backticks from the `review failed` key | **RED** 17/1 | keying, by name |
| B2 | pad the key with spaces **inside** the backticks (`` ` review failed ` ``) | **RED** 17/1 | keying, by name |
| B3 | render the key with double backticks (` ``review failed`` `) | **GREEN** 18/0 | benign — the single-backtick substring survives |
| B4 | add a SECOND row also keyed on `review failed` | **RED** 17/1 | `…found 2` — exactly-one holds in both directions |
| B5 | strip the blockquote `>` markers from header, separator and all five rows | **GREEN** 18/0 | by design — parser does `replace(/^>\s*/, "")` |
| B6 | move the whole table block to EOF | **RED** 17/1 | end-marker assertion |
| B7 | delete ALL FIVE data rows | **RED** 17/1 | `parsed to zero rows — the parse is broken` |
| B8 | remove the table's end marker (lone `>`) | **RED** 17/1 | end-marker assertion |
| F1 | blank the `not reached` action to `TBD` | **RED** 17/1 | action-verb, names the cell contents |
| F2 | empty the `not reached` action cell entirely | **RED** 17/1 | well-formedness |
| F3 | delete `review failed` **and** add a decoy so the count is unchanged | **RED** 17/1 | keying, by name — the CY8-3 discrimination test |
| F4 | delete `review failed`, mention it inside `not reached`'s action prose | **RED** 17/1 | keying, by name — the CY6-1/CY7-1 regression |

**Read together**: the guard is now strong on *identity* (which values have their own row, in what
form) and still silent on *correctness* (what each row's action says). A1–A7 are the shape of that
gap. See CY9-3.

### 2.2 Every other mutation asserted anywhere in this trail — re-executed

Sources: commit messages `741117f`, `c762de4`, `a0ced9b`, `87e5bf9`, `8293765`; the implementation
report; the PR #309 body; `task.77.dod.1`; gate 8's `mutation_proofs_executed`.

| # | Trail-asserted mutation | Trail claims | Observed | Holds? |
| --- | --- | --- | --- | --- |
| C1 | revert the PASS arm (`qa-loop:243`) from 5c back to Step 7 | Held | **RED** 17/1 `the PASS arm must hand to 5c` | ✅ |
| C2 | restore `--stage ready-for-merge` into 5a's outcome branching | Held, by name | **RED** 17/1 `ready-for-merge must sit INSIDE 5c` | ✅ |
| C3 | rename `### Convergence check` in the QA-loop doc | Held | **RED** 16/2 `end marker not found after "### Outcome branching (shared)"` | ✅ |
| C4 | revert the banner worked example (`:116`) | Held | **RED** 17/1 `the worked example must RENDER the verdict` | ✅ |
| C5 | remove `PR review {verdict}` from the banner format line (`:39`) | Held | **RED** 17/1 `the banner doc must state that the Steps 5-6 exit parenthetical carries the PR review verdict` | ✅ |
| C6 | revert ONLY the generic placeholder at `:59` (CY8-6's fix) | Held since `87e5bf9` | **RED** 17/1 `the Format block's sample parenthetical must carry the verdict too` | ✅ |
| C7 | revert BOTH banner renderings (gate 7's mutation I verbatim) | Held | **RED** 17/1 | ✅ |
| C8 | remove `review-pr` from the lock noop arm | **"Did not hold — as predicted"** | **GREEN**: parity 18/18, lock bash 14/14, zsh 14/14 | ✅ the honest disclosure is accurate |
| D6b | remove `, PR review {verdict}` from 5c's own exit-line statement (`qa-loop:827`) | Held (gate 8 mutation 27) | **RED** 17/1 `5c must state the exit line the banner doc is the format authority for` | ✅ |
| E1 | run all 18 parity tests against `origin/develop` sources | "All fail against origin/develop; none is vacuous" | **18 tests / 0 pass / 18 fail** | ✅ |

**Zero trail-asserted proofs failed**, including the one the trail records as *not* holding.

### 2.3 Gap 8's replacement assertion — mutation-proved

`8293765` replaced `/review-pr --effort {medium|low} --comment` with two concrete invocations and
rewrote the parity assertion that had been pinning the broken form. That rewrite is itself pinned:

| # | Mutation | Result | Assertion |
| --- | --- | --- | --- |
| D1 | restore `/review-pr --effort {medium\|low} --comment` | **RED** 17/1 | `the medium-effort invocation must carry both flags…` |
| D2 | drop the `--effort low` invocation, keep only medium | **RED** 17/1 | `the low-effort invocation must carry both flags…` |
| D3 | drop `--comment` from the lite invocation | **RED** 17/1 | `the low-effort invocation must carry both flags…` |
| D4 | drop `--comment` from the standard invocation | **RED** 17/1 | `the medium-effort invocation must carry both flags…` |
| D5 | keep both invocations **and** re-add the placeholder in 5c prose | **RED** 17/1 | `the {medium\|low} placeholder is a zsh parse error in a bash fence` |
| D7 | remove `, PR review {verdict}` from the **5b** restatement (`qa-loop:301`) | **GREEN** 18/0 | third rendering, unpinned — see Observations |

**A mis-target of my own, disclosed.** My first attempt at gate 8's mutation 27 replaced the *first*
occurrence of `, PR review {verdict}` in the file, which is at `qa-loop:301` (inside 5b), not `:827`
(inside 5c). It came back green, which would have read as gate 8's mutation 27 failing. Re-targeted
to `:827` it is red (row D6b, §2.2). The mis-fire is kept in this record rather than deleted, because
it is what surfaced the unpinned third rendering.

**Total: 44 mutations executed** — 23 asserted or recorded somewhere in this trail, 21 of my own
devising. Not one trail-asserted proof failed.

---

## 3. Gap 3 — the re-derivation, independently re-derived

`8293765` claims the finding named one instance and re-derivation found **seven**. I re-derived
without reading the commit's list.

```bash
git grep -n "gate exits the loop" -- . | grep -v "docs/tasks/task.77"
git grep -n "ready-for-merge" -- . | grep -v "docs/tasks/task.77" | grep -iE "step ?6|QA pass|gate|awaiting merge|exits"
```

Surviving hits, triaged:

| Hit | Judgement |
| --- | --- |
| `evals/shared/tests/pr-review-loop-parity.test.mjs:333` — `test("Loop Setup does not still claim a clean gate exits the loop")` | the guard itself, not a restatement |
| `docs/tasks/task.76.…/implementation:181` — "a PASS gate exits the loop before 5b" | unrelated sense (convergence check in another task's record) |
| `docs/tasks/task.41.…/task.41.pipeline-moments-and-scaffolding.md:93` — `\| ready-for-merge \| Step 6, on a gate that exits the loop \|` | **surviving pre-5c statement**, and it *is* a hit of the task's Phase-6 grep (`qa-fix\|qa-story\|qa-task` matches 3×). **Legitimately excluded**: the implementation report's ruled-out table names `docs/tasks/**`, `docs/bugs/**` as "prior task/bug documents and their artifacts" — the same immutability principle the branch applies to `741117f`'s commit message. Disclosed by rule rather than by name; that is adequate for a category of that size |
| `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:110` — "the gate has cleared and the PR is ready" | `develop-bug` is explicitly out of scope (own verify loop, no 5c); named in the ruled-out table |

The eight rows the branch actually rewrote — `develop-story/README.md` ×2, `develop-task/README.md`
×2, `configuration.md:332`, `tracker-workflow.md:138` **and** `:908`, `tracker-workflow.default.yaml`
— reconcile exactly with "one named + seven re-derived". **The count is correct and the exclusions
are legitimate.**

I also swept for surviving pre-5c **pipeline-shape restatements** (a diagram or step table routing a
QA gate straight to finalise), by listing every file under `docs/` and `skills/` that mentions
`qa-fix` but not `review-pr` and reading the pipeline-shaped candidates:

- `docs/reference/troubleshooting.md` — the "QA fix loop hits 5 cycles" section is a symptom/fix
  entry, not a shape restatement. Its "Resume picked up the wrong step" artifact table omits the
  `pr-review` report, which is a **completeness** gap rather than a shape defect; recorded as an
  observation, not a finding.
- `docs/runbooks/first-week.md`, `docs/contributing/evals/reference.md`,
  `docs/standards/bug-documents.md` — incidental `qa-fix` mentions, no chain.
- `docs/concepts/overview.md:100`, `docs/operations/workflows.md`, `pipeline-artifacts.md`,
  `commands.md`, `glossary.md`, `invocation.md`, `quickstart-{story,task}.md`,
  `runbooks/{story,task}-development.md`, `runbooks/qa-flow.md` — all carry `review-pr` and route
  through 5c correctly.

**No surviving pre-5c pipeline-shape restatement outside the legitimately excluded historical
records.** Gap 2's fix was checked directly: both `docs/concepts/architecture.md` diagrams now carry
5c, and both **validate under a real Mermaid parser** (`valid: true`, types `flowchart` and
`sequence`).

---

## 4. Gap 8 — every fenced bash block, both shells

Extracted all ` ```bash ` fences from `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
(de-indented, written to files) and ran `bash -n` and `zsh -n` on each.

```
16 bash blocks in shared/resources/develop-pipeline-step-5-6-qa-loop.md
OK   block  1 @line  46   …  OK  block  8 @line 432
FAIL block  9 @line 562: bash=2 zsh=1
      bash: line 2: syntax error near unexpected token `>'
      zsh : 2: parse error near `>'
OK   block 10 @line 596   …  OK  block 16 @line 942
```

**Both halves of the commit's admission verified:**

1. *Fails under both shells* — confirmed: `bash -n` exit 2, `zsh -n` exit 1, both on the
   `<fastGateCommand> > "$FIX_LOG" 2>&1` line. It is therefore **not a shell-divergence defect**;
   Risk 1 is specifically about a snippet that parses under one shell and not the other.
2. *Pre-existing on `develop` and untouched here* — confirmed:
   `git show origin/develop:shared/resources/develop-pipeline-step-5-6-qa-loop.md` has 15 blocks and
   the same block fails identically (`bash=2 zsh=1`), and
   `git diff origin/develop...HEAD -- <file> | grep "FIX_LOG\|fastGateCommand"` is **empty**.

The claim "re-derived across all 16 bash blocks under both shells" is exact — there are 16, and 15
are clean. Block 14 (`@line 717`), the block gap 8 was about, parses under both.

---

## 5. Bundle freshness — by content, not by `npm run bundle`'s output

Compared every `skills/*/references/<name>` against `shared/resources/<name>` after stripping the
`AUTO-GENERATED — DO NOT EDIT. Source:` banner line and normalising the
`shared/resources/X` → `references/X` rewrite. `npm run bundle` was not trusted to report this
(task 86: transitive copies go stale while it prints *in sync*).

| Scope | Sources | Copies | Mismatching |
| --- | --- | --- | --- |
| Branch (sources changed vs `origin/develop`) | 9 | 45 | **0** |
| Repo-wide, this branch | 80 | 709 | 4 |
| Repo-wide, `origin/develop` | 80 | 709 | **8** |

The 4 remaining repo-wide mismatches — `create-story` + `create-task`
`set-github-project-priority.sh`, `qa-story` + `qa-task` `develop-pipeline-step-1-create-branch.md`
— are all **untouched by this branch** (`git diff --name-only origin/develop...HEAD` is empty for
each and for their sources) and are a subset of the 8 present on `origin/develop`. This branch
**net-reduces** bundle staleness by re-bundling four of them. **No regression; the same pre-existing
task-86 instances gates 6, 7 and 8 recorded.**

---

## 6. What the commit claims to close, checked one by one

| Item | Claim | Verified on disk |
| --- | --- | --- |
| DoD gap 2 | `architecture.md`'s two diagrams now carry 5c | ✅ both carry 5c and the REQUEST-CHANGES-back-to-5b arm; both Mermaid-valid |
| DoD gap 3 | seven further instances found and fixed | ✅ 8 rows rewritten across 5 files; count exact; exclusions legitimate (§3) |
| DoD gap 4 | registry row 77 → `ready-for-review` | ✅ `task-registry.md:119` |
| DoD gap 5 | §7 item 16 → four rows, counter 89 | ✅ rows 85–88 present; **Next Available Task Number: 89** |
| DoD gap 6 | §QA Artifacts extended with gates 6–8 + DoD row | ✅ five rows added, with the "no cycle number" rationale |
| DoD gap 7 | §QA Testing Results header moved to gate 8 / 87 / CONCERNS | ✅ header moved — but see CY9-2 and CY9-4 |
| DoD gap 8 | zsh-unparseable snippet replaced; the assertion pinning it updated | ✅ §4, and D1–D5 |
| CY8-3 | count canary replaced by a well-formedness check | ✅ §2 — the deletion now fires the keying |
| CY8-4 | action verb **and** destination, two assertions | ✅ T6 / F1 / F2 |
| CY8-5 | exactly one row per value, four distinct rows | ✅ T5 / B4 |
| CY8-1, CY8-2 | closed in `87e5bf9` | ✅ `git grep "5 of 7\|Five of the seven\|all three artifacts"` finds **no** live instance outside the historical gate/qa records; PR body `:43` now reads "Six of the eight" |
| CY8-6, CY8-7 | closed in `87e5bf9` | ✅ C6 red; PR body `:44` reworded off "closed all of it" |
| CY5-3 | close condition was "CY8-1 and CY8-2 corrected" | ✅ both corrected → **CY5-3 closes**, after five consecutive PARTIALs |
| Task 88 | cancelled/superseded, registry updated | ✅ `status: cancelled`, `## 0. Superseded` section, registry row reads "superseded, closed inside 77" |

---

## 7. Findings

### CY9-1 — LOW — the "consciously ruled out" table still vouches for two exclusions this branch reversed

`task.77.implementation.1.review-pr-in-pipeline-initial-run.md:150–151` is unchanged by `87e5bf9`
and `8293765`, and still reads:

> `docs/reference/configuration.md`, `tracker-workflow.md`, … | Mention `qa-*` skills but restate no
> pipeline chain; `ready-for-merge` semantics are unchanged (…only its firing point moved).

> `docs/concepts/architecture.md`, … | **Checked line by line: no pipeline-shape restatement that 5c
> invalidates.**

All three files were edited by `8293765` **because those exclusions were wrong** — DoD gap 2 quoted
`:151` verbatim as "contradicted", and gap 3 called `:150`'s rationale "self-refuting". That table is
the evidence artifact for an **acceptance-gating** Phase 6 criterion (task doc `:455`: "ruled-out
hits are named in the implementation report", ticked `[x]`), so a reader checking the sweep's scope
is told these files were correctly excluded.

Why LOW and not MEDIUM: the reversal **is** disclosed, unambiguously, in the same document's
post-gate-8 section (rows 2 and 3 of the gap table). No closure is asserted over it. But the report's
own convention — row 492, which gate 8 singled out as the right way to do this — is to reconcile
such a row **in place**, and that was not done.

**Fix**: annotate both rows, e.g. `— REVERSED in the post-gate-8 pass; see the gap table below`.

### CY9-2 — LOW — the status header points the residual at a task the same commit cancelled

`task.77.review-pr-in-pipeline.md:517`, written by `8293765`:

> **Gate Decision**: CONCERNS — **residual deferred to task 88**; acceptance needs a PASS/WAIVED gate
> or a recorded waiver

and `:539`, the §QA Artifacts gate-8 row, ends `Residual → task 88`.

The same commit marks `task.88` `status: cancelled` with a `## 0. Superseded` section, updates its
registry row to "superseded, closed inside 77", and closes CY8-3/4/5 inside this task. The §QA
Testing Results header is the field a reader consults for current status; it now defers work to a
cancelled follow-up that the same commit did here. The `:539` row is arguably historical narrative of
gate 8's recommendation; `:517` is not.

**Fix**: `…residual closed in the post-gate-8 pass (task 88 superseded); acceptance needs a
PASS/WAIVED gate or a recorded waiver`.

### CY9-3 — LOW — per-value *destination* is still unasserted; seven inversions of the resume contract stay green

The rewritten guard requires each value to own exactly one row and that row's action to contain a
verb **and** a destination. It does not check that the destination is the **right** one. Executed
(§2.1, A1–A7), all **18/18 green**:

- `REQUEST CHANGES` routing to **5c** instead of 5b (A1)
- the actions of `REQUEST CHANGES` and `review failed` **swapped** (A2)
- `not reached` routed unconditionally to Step 7, inverting the gate-conditional arm (A3)
- an action reading `no escalation needed; proceed to reading the 5c notes above` (A4) — verb and
  destination both present, meaning absent
- the **exit** arm itself inverted: `APPROVE`/`CONCERNS` → `re-enter at **5a**` (A5)
- `review failed` losing its once-only retry **and** the second-consecutive escalation bound — the
  arm that stops an unattended driver looping forever (A6)
- `pending` losing its `PASS`/`WAIVED` → 5c branch (A7)

This is **not a false claim**. `8293765` says only "an action VERB and a DESTINATION", which is
exactly what is asserted, and gate 8's CY8-5 *finding* (the merged-key table) is genuinely red now.
But gate 8's CY8-5 `suggested_action` asked for two things — exactly-one-row-per-value **and** "the
DISTINCT action each value owes: `REQUEST CHANGES` → 5b; `review failed` → 5c plus an escalation
clause; `pending`/`not reached` → the gate-conditional 5c-or-5a branch" — and only the first was
built. The harm CY8-5 described is still reachable by a slightly different route.

**Fix**: a per-value expected-destination map, e.g. `{"REQUEST CHANGES": /\b5b\b/, "review failed":
/\b5c\b/ + /escalat/i, "pending — 5c not yet run": /\b5c\b/ && /\b5a\b/, …}`, mutation-proved with
A1, A2 and A6 above.

### CY9-4 — LOW — three stale lines survive inside the section gap 7 refreshed

`8293765` moved the §QA Testing Results header from gate 4/5 to gate 8, but the §Test Coverage
Summary three lines below it was not swept with it (`task.77.review-pr-in-pipeline.md:543–546`):

- `**Tests Executed**: 17 parity tests` — the suite is **18**, and the task doc's own Change Log row
  for the post-gate-7 pass says "suite now 18"
- `**Critical Issues**: 0 open HIGH in gate 4`
- `**NFR Status** (gate 5, independent): … Maintainability FAIL` — gate 8 records
  Maintainability CONCERNS

**Fix**: three single-line edits, same pass as CY9-1/CY9-2.

---

## 8. Observations — recorded, not findings

- **A third, unpinned rendering of the exit line.** `qa-loop:301` restates
  `Steps 5–6/8 — QA LOOP ✅ complete ({N} cycles, {gate}, PR review {verdict})` inside 5b. Removing
  the verdict there leaves the suite green (D7), because the assertion is scoped to `section5c()`.
  Same class as CY8-6 (which was the banner's second rendering), one document further out, and
  materially less load-bearing than either pinned copy. Not raised as a finding: nothing in the trail
  claims it is pinned.
- **`8293765`'s bundle-verification sentence understates its own scope.** It says "8 shared sources,
  36 bundled copies compared by content"; branch scope is **9 sources / 45 copies**. `87e5bf9` said
  "8 shared **markdown** sources", which was exact; dropping "markdown" made the sentence false as
  written. The omitted source is `advance-pipeline-lock.sh` (9 copies) — which I verified clean, so
  the check is sound and only the sentence is narrow. A claim narrower than reality is the safe
  direction of error, so this is an observation, not a finding.
- **`troubleshooting.md`'s "Resume picked up the wrong step" table** lists the artifacts to delete to
  redo a step and does not list `*.pr-review.{n}.{name}.md` for 5c. A completeness gap, not a
  pipeline-shape restatement; outside the sweep the task defines.
- **The gap-2 and gap-3 doc fixes are pinned by no test.** `architecture.md`, `tracker-workflow.md`
  and both pipeline `README.md`s are read by no test file in the repo, so the same drift can recur
  invisibly. Gate 7 and gate 8 already propose the lint that would close this class; recorded here as
  further evidence for it, not as a defect of this pass.

---

## 9. Tree state

`git status --porcelain` was **empty** before the first mutation, after every restore, and at the
end. `git rev-parse HEAD` is `8293765` throughout. The detached `origin/develop` worktree created for
mutation E1 was removed with `git worktree remove --force` + `git worktree prune`; `git worktree
list` shows only the main tree. The only files this reviewer adds are this assessment and
`task.77.gate.9.review-pr-in-pipeline.yml`; neither is committed by me.

---

## 10. Verdict

**CONCERNS — 91/100.** Up from gate 8's 87.

**This does NOT support `accepted`.** `shared/resources/document-status-lifecycle.md:62` requires
"DoD checklist passed, QA gate PASS or WAIVED". Two of those three are unmet: the gate reads
CONCERNS, and `task.77.dod.1` did not accept. Closing gaps 2–8 does not itself re-run `/finalise` —
a `dod.2` is still owed.

**What stands between this branch and a PASS**, precisely:

1. **CY9-1** — two rows in the ruled-out table that are false on disk today (two annotations).
2. **CY9-2** — one status line deferring the residual to a task cancelled by the same commit (one
   sentence).

Those are the only two items I would hold a PASS for, and together they are three single-line edits
in one file. **CY9-3** (test strength) and **CY9-4** (three stale counts) are reasonable
carry-forward; neither blocks a merge and neither is a runtime risk.

**What is genuinely different about this pass.** Four consecutive independent gates found the defect
in the *reporting* rather than the change, and a mutation proof was published three times and was
weaker than its claim twice. That did not happen here. Every one of the six published matrix rows
fires the assertion the matrix names; ten further trail-asserted proofs from across the whole task
re-execute correctly, including the one honestly recorded as *not* holding; the gap-3 count is exact
and its exclusions are legitimate; and both halves of the gap-8 out-of-scope admission are true. The
two findings I raise are stale sentences in tables — not false proofs, and not overstated closures.
**On the axis this branch has been failing on, the trail is now honest.**

Loop Escalation stands. The 5-cycle budget was spent at gate 5, and a fourth remediation pass does
not restore it — the merge decision remains an operator's.
