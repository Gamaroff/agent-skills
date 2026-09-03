---
type: qa-assessment
title: "QA Assessment 10 — the post-dod.2 head (task.77)"
description: "Independent execution-based assessment of commit a74962b, the head produced after DoD run 2. Grades the post-dod.2 head, not a QA cycle: the 5-cycle budget was spent at gate 5 and Loop Escalation stands."
status: complete
updated: 2026-09-03
tags: [qa, task-77, review-pr, remediation, post-dod]
---

# QA Assessment 10 — the post-`dod.2` head

**Work item**: `docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md`
**Branch**: `feature/task.77.review-pr-in-pipeline` — **PR #309**, base `develop`
**Commit under test**: `a74962b` ("fix(task.77): DoD run 2 — five trail-currency defects, one of them mine")
**Verdict**: **CONCERNS — 90/100**

## Provenance

I was dispatched with **no account of how any of these fixes were made**, and did not ask for one.
I did not write the code, the docs, or the commit under review, and I have no fix here to defend.
Every claim in every repo artifact — the `a74962b` and `3bbd506` commit messages, the implementation
report, the PR #309 body, the task document's Change Log, `dod.1`, `dod.2`, and gates 1–9 — was
treated as a **hypothesis to test by execution**, never as evidence.

This grades the **post-`dod.2` head, not a QA cycle.** The 5-cycle budget was spent at gate 5;
**Loop Escalation stands**, and a fifth remediation pass does not restore it.

**Headline.** Everything gate 9 asked for was delivered, and everything `a74962b` claims is true. I
re-executed 29 trail-asserted proofs from across the whole task and **not one failed**, including
the one the PR body honestly records as *not* holding. All five of `a74962b`'s own claims verify.
`dod.2`'s load-bearing security number — 25 shell blocks failing at head, 25 at baseline, 0
introduced, 0 regressed — I re-derived independently and got the identical file set.

What I found is what the published set could not: **the verdict-branching table's destinations are
unasserted.** Four of five inversions of the routing arm this entire task exists to add stay green,
including `REQUEST CHANGES` exiting to Step 7. The assertion's own message names the property it
does not test. That is one severity band above the residual gate 9 carried, and it is why this is
CONCERNS and not PASS.

---

## 1. Execution — the baseline

All commands run at local `HEAD = a74962b`, working tree clean before and after every step.

### `npm run ci`

Captured as `npm run ci > ci.log 2>&1; ec=$?`, with the exit read from the **variable** — never
through an `echo` after a redirect.

- **First run: `CI_EXIT=1`.** Every one of the 14 failures was a timeout (`10000ms` / `30000ms` /
  `60000ms` bounds) in `shared/resources/tests/qa-execute-snippets.test.mjs` and the access-parity
  probe suite — the documented load flake. I had launched bundle- and shell-parse sweeps in
  parallel with it.
- **Second run, machine otherwise idle: `CI2_EXIT=0`.** `ℹ tests 2285 / pass 2284 / fail 0 /
  skipped 1 / duration_ms 401395`. `grep -c 'not ok' ci2.log` → **0**. `prettier --check .` → "All
  matched files use Prettier code style!". `eval:all` ran to completion
  (`[replay] 03-tick-and-cleanup: 4/4 assertions passed`).

**Recorded honestly**: the suite is exit-1 under load and exit-0 idle. The flake is real, it is
documented, and it is not this branch's.

### Parity suite

`command node --test evals/shared/tests/pr-review-loop-parity.test.mjs` → `ℹ tests 18 / pass 18 /
fail 0 / duration_ms 196.5`.

### Lock suite, both shells

Exit codes captured into variables: `BASH_EXIT=0`, `ZSH_EXIT=0`; **14 passed, 0 failed** under each,
including `PASS review-pr at step 6 noops (lock preserved, step unchanged)`.

### Other suites re-run

`skills/review-pr/tests/review-pr.test.js` 52/52 · the four `evals/develop-{task,story}/protocol/`
files 25/25 · `evals/shared/tests/transition-protocol-parity.test.mjs` 27/27.

### PR #309

`gh pr checks 309` → **4/4 pass** (allowed-branch, link-check, test, validate). PR
`headRefOid = a74962b773f9a5ee38078df42b00909b077f5529`, byte-identical to `git rev-parse HEAD`. The
green checks are on the exact commit under review, `mergeable: MERGEABLE`, `reviewDecision: ""`.

---

## 2. `a74962b`'s five claims, checked one by one

| # | Claim | Verified |
| --- | --- | --- |
| 1 | Both orchestrator `SKILL.md` `description:` fields now name 5c | ✅ `python3 -c "yaml.safe_load(...)"` parses both frontmatter blocks cleanly (`name`, `description`); both descriptions contain `review-pr (Step 5c, the QA loop's exit gate)`. The `''` escape inside the single-quoted YAML scalar is well-formed |
| 2 | The catalog was regenerated from them | ✅ `npm run generate-catalog` → exit 0, `git status --porcelain` **empty**. Byte-identical. Also machine-guarded: `tests/skill-frontmatter.test.js:181` regenerates and diffs on every CI run |
| 3 | The QA tables and header are current | ✅ §QA Testing Results reads gate 9 / 91 / "gates 5–9 issued by independent reviewers"; §QA Artifacts carries the `qa.9`/`gate.9` row **and** the `dod.2` row, with the footnote corrected to "Rows 6–9 and the DoD rows" |
| 4 | The Change Log order is restored | ✅ Verified against `git show -U6 3bbd506`: that commit inserted the two gate-9 rows **above** "DoD verification run" and "Post-gate-8 pass — DoD gaps 2–8 closed". `a74962b` moves them below. The 23 rows now read in true chronological order, and the breach is disclosed in the commit message, in `dod.2`, and in the task document |
| 5 | §DoD Gaps points at the current run instead of restating it | ✅ The section is now three pointer lines plus a disclosure blockquote; the eight restated gaps and their unticked boxes are gone. This is the one fix of the five that cannot go stale again |

**`dod.1` was not edited after the fact.** It was added by `8293765` and
`git diff 8293765..HEAD -- task.77.dod.1.*` is **empty**, as is `git diff HEAD -- ` on it.

---

## 3. The mutation matrix — attacked, and it holds

Every proof asserted anywhere in this trail was re-executed with the **assertion message captured
from the failure trace**, not inferred from an exit code. Full table in §7.

**All twelve resume sub-state mutations fire the assertion the trail names.** The four published row
deletions each fire, by their own value:

```
AssertionError: expected exactly ONE sub-state row keyed on PR Review = "review failed", found 0.
Being mentioned inside another row's prose is not a resume action — that is how the two previous
versions of this guard stayed green with the row deleted.
```

Gate 8's mutation 21 (merged key + decoys) fires the one-row-per-value assertion; its mutation 20
(`n/a — nothing to do here; see the 5c notes above`) fires the action-verb assertion at
`pr-review-loop-parity.test.mjs:616`. Both were green at gate 8 and are red now. The guard also holds
against **duplication** (`found 2`) and against **delete-plus-decoy** (count unchanged, keying still
fires by name).

**The disclosure the trail records as NOT holding is accurate.** Removing `review-pr` from
`advance-pipeline-lock.sh:84`'s noop arm leaves parity 18/18 green and the lock suite 14/14 under
bash *and* zsh. The `*)` catch-all already noops; the explicit arm is documentation. The PR body's
"Did not hold — as predicted" is correct.

**None of the 18 parity tests is vacuous.** Run inside a detached `origin/develop` worktree:
`ℹ tests 18 / pass 0 / fail 18`. Worktree removed with `--force` + `git worktree prune`;
`git worktree list` shows only the main tree.

---

## 4. Mutations the published set would miss — built and executed

Twenty-two of my own devising. Thirteen were caught, including every wholesale row swap, the
advisory-contract inversion, the `ready-for-merge`-on-REQUEST-CHANGES leak, and turning the shared
5-cycle budget into an additional one. **Nine came back GREEN**, and seven of those are one finding.

### The verdict-branching table has no per-verdict destination — CY10-1

`shared/resources/develop-pipeline-step-5-6-qa-loop.md`'s `#### Verdict branching` table is the
routing contract this whole task adds. Four of five destination inversions leave the suite at 18/18:

| Mutation | Result |
| --- | --- |
| `REQUEST CHANGES` → `Return to **5a**` | **18/0 GREEN** |
| `REQUEST CHANGES` → `Exit the loop and proceed to Step 7` | **18/0 GREEN** — the blocking arm becomes a clean exit |
| `APPROVE` → `proceed to Step 5a` | **18/0 GREEN** — the loop's exit inverted |
| Review-failed row: `**HALT**` → `**proceed to Step 7**` | **18/0 GREEN** — the outcome the doc calls "the one that must never happen" |
| `CONCERNS` → `proceed to Step 5a` | 17/1 — caught |

The mechanism: the guard at `:141` is

```js
/\|[^|\n]*REQUEST CHANGES[^|\n]*\|[^|\n]*5b[^|\n]*\|/
```

and the row's own explanatory clause — *"**Do not increment the counter here** — 5b's step 7
increments it on exit"* — supplies the `5b` the regex is looking for. The routing destination can
say anything.

**This is a false claim, not merely a gap.** The assertion's message reads *"the REQUEST CHANGES
table ROW must route back to 5b — **not merely prose mentioning both**"*, and the test file's header
comment (`:10`, `:61-62`) names this exact failure mode as one the current version closes: *"a regex
like `/REQUEST CHANGES.*5b/s` matched prose there and would have passed even if the verdict table
said the opposite."* It still would. The fix moved the decoy from the section into the row.

It is also the same class as CY6-1 → CY7-1 → CY8-4 → CY9-3 — a **mention-match standing in for a
mapping** — which gate 9's own `future` recommendation generalised in exactly these words. This is
the fifth instance and the first on the primary routing table rather than the resume sub-state one.
Gate 9's 44 mutations did not reach it: every one of them targeted the resume contract, the banner,
or the exit line.

### Same class, second instance: the effort→mode mapping

Swapping the `# standard mode` and `# lite mode` labels so lite gets `--effort medium` and standard
gets `--effort low` → **18/0 GREEN**. The guard (`:300-304`) requires both
`/review-pr --effort {medium,low} --comment` strings to appear in §5c; which mode owns which is
unasserted. §9's ticked criterion *"Lite mode degrades to `--effort low` and never skips"* rests on
this. (Changing `--effort low` in `develop-pipeline-lite-mode.md` **is** caught — `:258`.)

### CY9-3 confirmed still open, unchanged

`REQUEST CHANGES` resume action → 5c (18/0), `APPROVE`/`CONCERNS` → 5a (18/0), `review failed` losing
its escalation bound (18/0). All green, as gate 9 recorded. Carried, not regressed.

---

## 5. `dod.2`'s security claim — independently re-derived

`dod.2` reports "1190 dual-shell parse executions across every fenced shell block in all 116 changed
files, at head and at the `origin/develop` baseline — 25 failing at head, 25 at baseline, 0
introduced, 0 regressed."

I re-derived it without reading their method, checking **stderr and not only `$?`** (the trap
`dod.2` itself documents: `zsh -n` exits 0 on this parse-error class while still printing):

| Ref | Files present | Shell-tagged blocks | Failing under bash **or** zsh |
| --- | --- | --- | --- |
| `HEAD` | 124 | 295 | **25** |
| `origin/develop` | 94 | 282 | **25** |

The two failing sets are the **same 25 files** (line numbers shifted), so **0 introduced, 0
regressed** is exact. The file count "116" is narrower than the 122 at `3bbd506` and 124 at HEAD —
recorded as an observation, not a finding, on the same reasoning gate 9 applied to `8293765`'s
bundle sentence: a claim narrower than reality is the safe direction of error, and the substance is
exact.

**The QA-loop file's blocks, separately.** 16 ```` ```bash ```` blocks (11 anchored at column 0, 5
list-indented — `dod.2`'s methodology note is correct). 15 parse clean under both shells. Block 9
(`@:561`, the `<fastGateCommand>` block) fails under **both** — bash exit 2, zsh exit 1, both on
`` ` >` `` — so it is not a shell-divergence defect. `origin/develop`'s copy fails identically at
`@:515`, and `git diff origin/develop...HEAD` on that file contains no `fastGateCommand` hunk. The
out-of-scope claim is true on both halves. Block 14 (`@:716`), the one DoD gap 8 was about, parses
clean under both.

---

## 6. Bundle freshness — by content, not by `npm run bundle`'s output

Every `skills/*/references/<name>` compared byte-for-byte against `shared/resources/<name>` after
stripping the `AUTO-GENERATED` banner and normalising the `shared/resources/` → `references/`
rewrite (task 86: the bundler prints "in sync" for files it no longer examines).

| Scope | Copies | Mismatching |
| --- | --- | --- |
| `HEAD` | 709 | **4** |
| `origin/develop` | 709 | **8** |

The 4 at HEAD are a strict **subset** of develop's 8 (`create-story`/`create-task`
`set-github-project-priority.sh`; `qa-story`/`qa-task` `develop-pipeline-step-1-create-branch.md`).
For each of those four and for both of their sources, `git diff --name-only origin/develop...HEAD`
is **empty** — untouched by this branch. **The branch net-reduces repo-wide staleness from 8 to 4.**
No regression; the same pre-existing task-86 instances gates 6–9 recorded.

---

## 7. Every mutation executed

Baseline before all of them: 18/18. `git status --porcelain` empty before the first, after every
restore, and at the end; `git rev-parse HEAD` unchanged at `a74962b` throughout.

| # | Mutation | Claimed | Observed | Result |
| --- | --- | --- | --- | --- |
| 1 | Delete resume row `pending — 5c not yet run` | fires the keying by name | 17/1 — `expected exactly ONE … "pending — 5c not yet run", found 0` | **HOLDS** |
| 2 | Delete resume row `REQUEST CHANGES` | same | 17/1 — keying, by name | **HOLDS** |
| 3 | Delete resume row `review failed` | same | 17/1 — keying at `:596`, by name | **HOLDS** |
| 4 | Delete resume row `not reached` | same | 17/1 — keying, by name | **HOLDS** |
| 5 | Merge all four keys into one + 3 decoys (gate 8 mut 21) | RED on one-row-per-value | 17/1 — `"REQUEST CHANGES" shares row … each value needs its OWN row` | **HOLDS** |
| 6 | Action → `n/a — nothing to do here; see the 5c notes above` (gate 8 mut 20) | RED on the action verb | 17/1 at `:616` — `must state what the run DOES` | **HOLDS** |
| 7 | `not reached` action → `TBD` | RED | 17/1 — action-verb, quoting the cell | **HOLDS** |
| 8 | `not reached` action cell emptied | RED | 17/1 — `every sub-state row needs both a key and an action` | **HOLDS** |
| 9 | Delete **all five** data rows | RED on well-formedness only | 17/1 — `parsed to zero rows — the parse is broken` | **HOLDS** |
| 10 | Remove the table's end marker | RED | 17/1 — end-marker assertion | **HOLDS** |
| 11 | **Duplicate** the `review failed` row | — | 17/1 — `found 2` | **HOLDS both ways** |
| 12 | Delete `review failed` **+ decoy** so the count holds | RED on keying, not counting | 17/1 — keying, by name | **HOLDS** |
| 13 | Revert PASS/WAIVED arms from 5c to Step 7 | Held | 17/1 — `the PASS arm must hand to 5c` | **HOLDS** |
| 14 | Re-add `--stage ready-for-merge` to 5a's outcome branching | Held by name | 17/1 — `ready-for-merge must sit INSIDE 5c` | **HOLDS** |
| 15 | Remove `--stage ready-for-merge` entirely | — | 17/1 — `must still exist` | **HOLDS** |
| 16 | Rename `### Convergence check` | Held | 16/2 — `end marker not found after "### Outcome branching (shared)"` | **HOLDS** |
| 17 | Banner worked example loses the verdict | RED | 17/1 — `must RENDER the verdict` | **HOLDS** |
| 18 | Banner format line loses the verdict | RED | 17/1 | **HOLDS** |
| 19 | Banner **Format-block sample** loses the verdict (CY8-6) | closed by `87e5bf9` | 17/1 — `the Format block's sample parenthetical must carry the verdict too` | **HOLDS — CY8-6 closed** |
| 20 | 5c's own exit-line statement loses the verdict | RED | 17/1 — `5c must state the exit line the banner doc is the format authority for` | **HOLDS** |
| 21 | Restore the `{medium|low}` placeholder (gap 8) | RED on `doesNotMatch` | 17/1 | **HOLDS** |
| 22 | Drop `--comment` from the standard invocation | RED | 17/1 | **HOLDS** |
| 23 | Drop `--comment` from the lite invocation | RED | 17/1 | **HOLDS** |
| 24 | `--effort medium` → `--effort high` | — | 17/1 | **HOLDS** |
| 25 | Delete the whole invoke-the-review fence | — | 17/1 | **HOLDS** |
| 26 | `develop-pipeline-lite-mode.md`: `--effort low` → `medium` | — | 17/1 — `did not match /--effort low/` | **HOLDS** |
| 27 | Remove `review-pr` from the lock noop arm | **"Did not hold — as predicted"** | parity 18/0; lock **14/14 bash**, **14/14 zsh** | **DISCLOSURE ACCURATE** |
| 28 | 5b restatement at qa-loop `:301` loses the verdict | not claimed pinned | 18/0 GREEN | observation (gate 9 mut 42) |
| 29 | Run all 18 parity tests in a detached `origin/develop` worktree | all fail, none vacuous | `tests 18 / pass 0 / fail 18` | **HOLDS** |
| 30 | Resume `REQUEST CHANGES` action → 5c | green (CY9-3) | 18/0 GREEN | CY9-3 open |
| 31 | Resume `APPROVE`/`CONCERNS` action → 5a | green (CY9-3) | 18/0 GREEN | CY9-3 open |
| 32 | Resume `review failed` loses its escalation bound | green (CY9-3) | 18/0 GREEN | CY9-3 open |
| 33 | **NEW** Verdict table: `REQUEST CHANGES` → `5a` | — | **18/0 GREEN** | **CY10-1** |
| 34 | **NEW** Verdict table: `REQUEST CHANGES` → exit to Step 7 | — | **18/0 GREEN** | **CY10-1** |
| 35 | **NEW** Verdict table: `APPROVE` → Step 5a | — | **18/0 GREEN** | **CY10-1** |
| 36 | **NEW** Verdict table: Review-failed `HALT` → `proceed to Step 7` | — | **18/0 GREEN** | **CY10-1** |
| 37 | **NEW** Verdict table: `CONCERNS` → Step 5a | — | 17/1 — `must record findings, not block, AND still exit to Step 7` | caught |
| 38 | **NEW** Swap the `REQUEST CHANGES` and `APPROVE` actions wholesale | — | 17/1 — `the APPROVE table ROW must exit the loop` | caught |
| 39 | **NEW** Delete the Review-failed verdict row | — | 17/1 — `the verdict table must carry a failure row` | caught |
| 40 | **NEW** Signal `ready-for-merge` on REQUEST CHANGES too | — | 17/1 — `a run still inside the loop must not be advertised as merge-ready` | caught |
| 41 | **NEW** `CONCERNS` blocks (returns to 5b) | — | 17/1 | caught |
| 42 | **NEW** 5-cycle budget becomes **additional**, not shared | — | 17/1 — `5c must share the existing 5-cycle budget` | caught |
| 43 | **NEW** Invert the advisory contract (5c writes the gate) | — | 17/1 — `the step file must restate that /review-pr writes no gate` | caught |
| 44 | **NEW** Drop "Do **not** fall through to Step 7" | — | 17/1 — `a 5c failure must HALT` | caught |
| 45 | **NEW** Swap the lite / standard `--effort` levels | — | **18/0 GREEN** | **CY10-1, second instance** |
| 46 | **NEW** Revert `develop-task/SKILL.md` description to the pre-5c chain | — | parity **18/0 GREEN**; `skill-frontmatter` **5/1** — `skill-catalog.md is stale` | pairing CI-guarded, **content unpinned** |
| 47 | **NEW** `tracker-workflow.md` `ready-for-merge` → "Step 6, on a gate that exits the loop" | — | **18/0 GREEN** | known observation — no test reads these docs |

---

## 8. Findings

### CY10-1 — MEDIUM — the verdict-branching table's destinations are unasserted; four of five inversions stay green

`evals/shared/tests/pr-review-loop-parity.test.mjs:137-152`. Detailed in §4. The
`REQUEST CHANGES` row can be rewritten to route to **5a** or to **exit to Step 7**, the `APPROVE`
row to **5a**, and the failure arm's **HALT** to **proceed to Step 7**, all with 18/18 green,
because the row-scoped regex is satisfied by a decoy `5b` inside the same cell.

MEDIUM rather than LOW, on two grounds gate 9's CY9-3 explicitly did not meet:

1. **The assertion's own message names a property it does not test** — "must route back to 5b — not
   merely prose mentioning both". CY9-3 was LOW precisely because `8293765` claimed only "a verb AND
   a destination", which is what it tests. Here the claim and the test diverge.
2. **The file's header comment sells this as a closed failure mode** (`:61-62`): *"would have passed
   even if the verdict table said the opposite."* It still would.

It is a **test-strength** defect, not a runtime one: the prose on disk is correct and the pipeline
behaves as specified today. Nothing here is a deployment blocker.

**Suggested action.** Add a per-verdict expected-destination map beside the row match, keyed on the
row's **first destination token** rather than any `5b` anywhere in the cell — e.g.
`REQUEST CHANGES` → the action must open with `Return to **5b**`; `APPROVE` and `CONCERNS` → must
contain `Step 7` and must **not** contain `re-enter`/`Return to`; the failure row → must contain
`HALT`. Mutation-prove with mutations 33, 34, 35 and 36 above, all green today. Do the same for the
effort→mode mapping (mutation 45): assert the `# standard mode` comment is followed by
`--effort medium` and `# lite mode` by `--effort low`.

### CY10-2 — LOW — §7 item 12 is false on disk, and `a74962b` is what made it false

`docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md:349-350`, under the
heading **Files Regenerated (commit them — CI checks freshness)**:

> 12. ⬜ `docs/reference/skill-catalog.md` — **no change required**: no `description:` field changed,
>     so `npm run generate-catalog` is a no-op and the file is absent from the diff

All three clauses are false at HEAD, and the commit under review is what falsified them:

- `git diff --name-only origin/develop...HEAD -- docs/reference/skill-catalog.md` → **the file**.
- Two `description:` fields changed on the branch (`develop-story`, `develop-task`).
- `generate-catalog` was not a no-op — `a74962b` rewrites two catalog rows.

`dod.2` diagnosed the underlying triage as **circular** ("the catalog was clean only because the
stale source was never touched"), fixed the sources and regenerated the catalog — and left standing
the §7 row that recorded the circular triage. This is precisely the shape of gate 9's CY9-1 (a table
row vouching for something the same branch reversed), and precedent exists for holding §7 rows to
disk truth: DoD run 1's gap 5 was §7 item 16.

The row is not cited by any §9 success criterion, which is why it is LOW rather than MEDIUM.

**Suggested action.** One line: `12. ✅ docs/reference/skill-catalog.md — regenerated in the dod.2
pass: both orchestrator descriptions changed, so generate-catalog is no longer a no-op. (The earlier
"no change required" was circular — see dod.2.)`

### CY10-3 — LOW — the implementation report's `## Completion` block is stale in five places

`task.77.implementation.1.review-pr-in-pipeline-initial-run.md:654-660`:

- `:659` — `**DoD Summary**: not yet — Step 7 has not run`. `/finalise` has run **twice**; `dod.1` and
  `dod.2` are both on disk, and the task doc's own Change Log carries two rows authored `finalise`.
- `:655` — `**Final Status**: … `dod.2` and a gate 10 outstanding`. `dod.2` was committed by this very commit.
- `:654` — `**Finished**: … gates 5–8 remediated` — gate 9 was remediated too, by `3bbd506`.
- `:660` — `**Tracker debt**: {populated after Step 7}`, an unfilled template placeholder. `dod.2` resolved
  it: `no github_issue / jira_key — NOT_APPLICABLE`.
- `:658` — `**QA Iterations**: … 4 post-escalation remediation passes, each graded independently
  (gate 6 FAIL 75, gate 7 FAIL 78, gate 8 CONCERNS 87)`. Four passes, three gates; gate 9 is missing
  from a parenthetical that claims to enumerate them.

Same class as gate 9's CY9-2 — a present-tense status field contradicted by disk — in the sibling
artifact, and the post-`dod.2` pass did not sweep it.

**Not a finding**: the `Pipeline Progress` table's ⏳ on Steps 5–6, 7 and 8 is **correct**. The loop
escalated and neither DoD run accepted, and `develop-pipeline-step-7-finalise.md:384` requires the
row to stay ⏳ until every checklist item passes. I checked this before raising it.

**Suggested action.** Five single-line edits in one file, in the same pass as CY10-2.

### CY10-4 — LOW — CY9-3 is "carried" to nowhere, and the only place it could live says it is already done

The implementation report's post-gate-9 table ends CY9-3's row with *"**Filing this** rather than
widening the guard again inside an escalated run."* Nothing was filed: `task-registry.md` still
reads **Next Available Task Number: 89** and there is no `task.89.*`. The natural home is task 88 —
and `docs/tasks/task.88.resume-guard-strength/task.88.resume-guard-strength.md:27` reads *"All three
are fixed and mutation-proved there"* and `:32` *"do not implement it — it is already done."*

That is false for CY8-5's second half. Task 88's own §2 (`:63`) states CY8-5 as *"each value
having **its own** row, with **its own** action, is not [asserted]"*; only the first half was built, which is
exactly what gate 9's CY9-3 says and what my mutations 30-32 re-confirm. A future reader following
task 88's instruction skips work that is demonstrably outstanding — and CY10-1 has now widened it.

**Suggested action.** Either file a task carrying CY9-3 **and** CY10-1, or amend task 88's
`## 0. Superseded` to name the residual: "CY8-3 and CY8-4 are closed; CY8-5's *distinct action per
value* half is not — see gate 9's CY9-3 and gate 10's CY10-1."

### CY10-5 — LOW — two Phase-6 counts went stale when DoD gaps 2–3 widened the sweep

§7 item 10 reads "3 diagrams, 7 runbooks, 8 reference/concept docs"; §Progress Tracking Phase 6
repeats "3 diagrams re-drawn and validated" and "8 reference/concept docs updated". Phase 6's own
bullet list still has exactly 8 reference/concept entries and 3 diagram rows — neither was extended
when the post-gate-8 pass added `architecture.md`'s **two** diagrams (gap 2) and
`configuration.md` + `tracker-workflow.md` (gap 3). On disk it is 5 diagrams across 4 files, and 11
reference/concept docs. The runbook count (7) is exact.

The implementation report's **"Files added to Phase 6 beyond the task's enumeration"** section — the
mechanism the task defines for exactly this — still names only the two `docs/standards/` files.

Same class as CY9-4, in the sections either side of the ones CY9-4 fixed.

---

## 9. Observations — recorded, not findings

- **`dod.2`'s "116 changed files"** is narrower than the 122 at `3bbd506` (124 at HEAD). The
  substance — 25/25/0/0 — I reproduced exactly, with the identical file set. A claim narrower than
  reality is the safe direction of error; same treatment gate 9 gave `8293765`'s bundle sentence.
- **A third rendering of the exit line is still unpinned** (`qa-loop:301`, the 5b restatement).
  Green (mutation 28), as gate 9 recorded. Nothing claims it is pinned.
- **The `SKILL.md` description content is unpinned.** Reverting `develop-task`'s description to the
  pre-5c chain leaves parity 18/18 green; only the catalog **pairing** is CI-guarded
  (`tests/skill-frontmatter.test.js:181`), which fires because the catalog goes stale. Regenerate
  the catalog alongside the revert and nothing catches it. This is the defect `dod.2` just fixed,
  and it can recur silently.
- **No test reads the consumer docs** (`architecture.md`, `tracker-workflow.md`, either pipeline
  README). Mutation 47 confirms it. Gates 7, 8 and 9 already propose the lint that would close the
  class; this is a fifth data point, not a new defect.
- **This run produced no `.summaries/` artifacts.** `docs/tasks/task.77.review-pr-in-pipeline/`
  has no `.summaries/` directory, while ten other task directories do, and the QA-loop file this
  task edits mandates per-cycle persistence at `:137`, `:191` and `:664`. The Pipeline Progress
  `Subagent summary ref` for Steps 5–6 reads `—`, which the convention reserves for steps *without*
  subagents. Run hygiene, pre-dating this commit, claimed nowhere.
- **`.agents/plans/purrfect-whisper.md`** enumerates the pipeline as 8 steps ending
  `qa-fix → finalise → commit-changes`. It is pre-existing on `develop`, and §9's own criterion is
  that the pipeline **is still 8 steps** — so the enumeration is not falsified by 5c. Not a defect.

---

## 10. Tree state

`git status --porcelain` was **empty** before the first mutation, after every restore, and at the
end. `git rev-parse HEAD` is `a74962b` throughout. Every mutation restored its file from an
in-memory copy in a `finally` block. The detached `origin/develop` worktree created for mutation 29
was removed with `git worktree remove --force` + `git worktree prune`; `git worktree list` shows
only the main tree. `npm run generate-catalog` left the tree clean. The only files this reviewer
adds are this assessment and `task.77.gate.10.review-pr-in-pipeline.yml`; neither is committed by me.

---

## 11. Verdict

**CONCERNS — 90/100.**

**This does NOT support `accepted`.** `shared/resources/document-status-lifecycle.md:62` requires
*"DoD checklist passed, QA gate PASS or WAIVED"*. **Both** conditions are unmet: this gate reads
`CONCERNS` with `waiver.active: false`, and neither `dod.1` nor `dod.2` accepted. A `dod.3` is owed
regardless of route.

**Why not PASS.** By the repo's own decision rule (`skills/qa-gate/SKILL.md:255`, `:260`), LOW findings
alone do not force CONCERNS — a MEDIUM does, and maintainability CONCERNS does. CY10-1 is a MEDIUM:
an assertion whose message names a property it does not test, on the routing arm this task exists to
add, where four of five inversions stay green. I would not have graded the four LOW trail items
alone as CONCERNS.

**What is genuinely different about this pass.** Gate 9 named two items as *"the ONLY two items
standing between this branch and a PASS"* — CY9-1 and CY9-2. Both are closed, and I verified both by
reading disk rather than the closure claim. CY9-4 is closed too. All five of `a74962b`'s claims are
true. Twenty-nine trail-asserted proofs re-executed and **not one failed**. `dod.2`'s security number
reproduced exactly. The Change Log breach `3bbd506` introduced was disclosed rather than quietly
corrected, and the fix is right. **The trail's honesty is not in question at this head** — CY10-2
through CY10-5 are currency lapses in four documents, not false proofs, and none of them overstates
a closure.

**The pattern that broke and the pattern that did not.** Five consecutive gates found the defect in
the *reporting*. That did not happen here: the reporting defect I found (CY10-2) is one row, and the
substantive finding is in the *test*. But the deeper pattern — **a mention-match standing in for a
mapping** — is now at its fifth instance across four rewrites of the same guard family. Fixing
CY10-1 by widening one more regex will produce a sixth. The generalisation gate 9 wrote is the right
one and should be enforced mechanically: *when a guard enumerates N values, it must pin what
distinguishes them.*

**Two routes to `accepted`, and the choice is the operator's:**

1. **Close CY10-1** (a per-verdict destination map, mutation-proved with 33/34/35/36 and 45) and the
   four LOW edits, then issue a gate 11 and re-run `/finalise` for `dod.3`. CY10-1 is perhaps thirty
   lines of test.
2. **Record a waiver** — `waiver.active: true` with reason and approver over CY10-1 through CY10-5 —
   and re-run `/finalise`. The lifecycle explicitly admits `WAIVED`, nothing here is a runtime or
   deployment risk, and the branch is measurably better than `develop` on every axis I measured.

**Loop Escalation stands either way.** The 5-cycle budget was spent at gate 5 and a fifth
remediation pass does not restore it.
