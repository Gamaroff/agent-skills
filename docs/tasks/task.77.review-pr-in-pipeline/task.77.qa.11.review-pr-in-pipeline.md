# QA Assessment 11 — task.77.review-pr-in-pipeline

**Assessed head:** `ef3a0c1` (PR #309, base `develop`) · **Date:** 2026-09-04
**Gate:** [`task.77.gate.11.review-pr-in-pipeline.yml`](./task.77.gate.11.review-pr-in-pipeline.yml) — ⚠️ **CONCERNS, 90/100**
**Scope:** grades the **post-gate-10 head**, not a QA cycle. The 5-cycle budget was spent at gate 5; Loop Escalation stands.

---

## Provenance

I was dispatched with **no account of how any of these fixes were made**, and did not ask for one. I
did not write the code, the docs or the commit under review, and I have no fix here to defend. Every
claim in every repo artifact — the `ef3a0c1` commit message and its seven-row mutation-proof block,
the implementation report's post-gate-10 section, the task document's Change Log and QA tables,
`task.88.resume-guard-strength.md`, `dod.1`, `dod.2` and gates 1–10 — was treated as a **hypothesis
to test by execution**, never as evidence.

I was told as fact that six consecutive independent gates and two DoD runs had each found a defect,
and that gate 10 found the **fifth** instance of a mention standing in for a mapping. I was told the
highest-value activity was to hunt a **sixth** instance and to try to defeat the new parsed-row
mechanism.

**I found one, and it is inside the fix itself.** `CY9-3` was closed for four of its five values.
The fifth — the resume table's `APPROVE` / `CONCERNS` row, the loop's **exit** arm — has no
destination assertion at all, and three artifacts plus the test's own comment say otherwise.

---

## 1. Execution — what was measured, not read

| Check | Result |
| --- | --- |
| `npm run ci` (exit captured into a variable: `npm run ci > ci.log 2>&1; ec=$?`) | **exit 0** — `ℹ tests 2287 / pass 2286 / fail 0 / skipped 1`. `grep -cE '^not ok \|^✖ '` → **0**. `eval:all` ran to completion. **First run, no re-run needed** — neither documented flake fired (`qa-execute-snippets` clean; the `process.exit()`-truncation premise test passed) |
| `command node --test evals/shared/tests/pr-review-loop-parity.test.mjs` | **20/20** (`ℹ tests 20 / pass 20 / fail 0`) — 18 before `ef3a0c1`, +2 |
| Same suite in a **detached `origin/develop` worktree**, only the test file copied in | `ℹ tests 20 / pass 0 / **fail 20**` — **no test is vacuous**, including both new ones |
| `bash shared/resources/advance-pipeline-lock.test.sh` | **14 passed, 0 failed** |
| `zsh shared/resources/advance-pipeline-lock.test.sh` | **14 passed, 0 failed** |
| `evals/shared/tests/transition-protocol-parity.test.mjs` | 27/27 |
| `evals/shared/tests/remaining-work-banner-parity.test.mjs` | 8/8 |
| `skills/review-pr/tests/review-pr.test.js` | 52/52 |
| `evals/develop-task/protocol/*` · `evals/develop-story/protocol/*` | 12/12 · 68/68 |
| `tests/skill-frontmatter.test.js` | 6/6 |
| `gh pr checks 309` | **4/4 pass** — `PR into main comes from an allowed branch`, `link-check`, `test`, `validate` |
| PR head SHA vs local HEAD | `ef3a0c1b12223706dee9801ef70de4da676b1af9` == local HEAD ✅ |

> Test count moved 2285 → 2287, matching the two tests `ef3a0c1` adds. Consistent with gate 10.

---

## 2. Bundle freshness — by content, never by `npm run bundle`'s output

`npm run bundle`'s report is unreliable (task 86). I reimplemented `bundle_skill.py`'s
`rewrite_text()` + `inject_header()` exactly (importing the module's own compiled regexes) and
compared every bundled copy **byte-for-byte** against its rewritten source.

| Tree | Copies compared | Content-stale |
| --- | --- | --- |
| `ef3a0c1` (head) | 709 | **7** |
| `origin/develop` (`9291efa`, detached worktree) | 709 | **11** |

The 7 at head are a **strict subset** of the 11 on `origin/develop`, and **not one of them appears
in `git diff --name-only origin/develop...HEAD`**:

```
skills/create-story/references/set-github-project-priority.sh
skills/create-task/references/set-github-project-priority.sh
skills/develop-bug/references/verify-push-state.sh
skills/develop-story/references/verify-push-state.sh
skills/develop-task/references/verify-push-state.sh
skills/qa-story/references/develop-pipeline-step-1-create-branch.md
skills/qa-task/references/develop-pipeline-step-1-create-branch.md
```

**Verdict: 0 regressions.** The branch net-*reduces* repo-wide bundle staleness by 4 — the
`qa-story` / `qa-task` copies of `develop-pipeline-resume-contract.md` and
`develop-pipeline-step-0-resolve-and-prepare.md`, stale on `develop`, are fresh at head. All ten
`shared/resources/` files this branch edits are content-identical in every consumer's `references/`.

---

## 3. The seven mutations `ef3a0c1` claims to have turned red

Each re-executed and the **assertion message captured from the failure trace**, to confirm it fails
on the *intended* assertion rather than incidentally.

| Claimed | Result | Assertion that fired |
| --- | --- | --- |
| g10 #33 `REQUEST CHANGES` → `5a` | ✅ **19/1 RED** | `REQUEST CHANGES must route back to 5b as a DIRECTIVE — a clause elsewhere in the cell mentioning 5b is not a destination` |
| g10 #34 `REQUEST CHANGES` → exit to Step 7 | ✅ **19/1 RED** | same assertion |
| g10 #35 `APPROVE` → `5a` | ✅ **18/2 RED** | `APPROVE must exit the loop` + `the APPROVE table ROW must exit the loop` |
| g10 #36 failure arm `HALT` → `proceed to Step 7` | ✅ **19/1 RED** | `the failure arm must HALT` |
| g10 #45 swap lite/standard `--effort` | ✅ **19/1 RED** | `the effort mapping is directional — swapping the levels degrades the standard path and over-runs the lite one` |
| g9 #30 resume `REQUEST CHANGES` → `5c` | ✅ **19/1 RED** | `a run killed after 5c routed back must resume at 5b …` |
| g9 #31 resume `APPROVE`/`CONCERNS` → `5a` | ❌ **20/0 GREEN** | — **see CY11-1** |

**Six of seven hold. The seventh does not, and it is mislabelled in the proof.**

`ef3a0c1`'s commit message lists the seventh as `gate 9 #31 resume 'review failed' -> 5a -> red`.
Gate 10's own mutation table (`qa.10`, row 31) and gate 10's `mutations_executed` entry both define
**#31 as `APPROVE`/`CONCERNS` exit arm → 5a**, reproducing gate 9's mutation 27:

> `CY9-3 30-32. Resume REQUEST CHANGES action → 5c; APPROVE/CONCERNS exit arm → 5a; review failed
> losing its once-only retry and second-consecutive escalation bound — observed 18/0 GREEN on all
> three`

The proof therefore reports a *different, red* mutation under the label of the *one green* member of
30–32. I verified the substitute independently: `review failed` → `5a` **is** red
(`\`review failed\` resumes at 5c — the review is what did not run`). The mutation that is actually
numbered 31 is still green.

**Diagnosed as a labelling error, not fabrication** — the substitute exists and fires, and #32 is
correctly reported. But it is a mutation-proof row that does not correspond to the mutation it
names, which is the class CY6-1 and CY7-1 were raised for, and its effect is that the sole green
member of the set never reached the record.

---

## 4. `CY9-3` re-executed in full — all seven inversions gate 9 enumerated

`gate.9`'s CY9-3 lists seven (A1–A7), and its `suggested_action` names the map to build, explicitly
including **`APPROVE`/`CONCERNS` → `/Step 7/`**.

| # | Inversion | Now |
| --- | --- | --- |
| A1 | `REQUEST CHANGES` → `5c` | ✅ RED — `must resume at 5b` |
| A2 | swap the `REQUEST CHANGES` and `review failed` action cells | ✅ RED — `must resume at 5b` |
| A3 | `not reached` → unconditional `go to Step 7` | ✅ RED — `"not reached" resumes at 5c when the gate is clean` |
| A4 | action = `no escalation needed; proceed to reading the 5c notes above` (verb + destination present, meaning absent) | ✅ RED — same |
| A5 | **`APPROVE`/`CONCERNS` → `re-enter at **5a**` — inverting the LOOP'S EXIT** | ❌ **20/0 GREEN** |
| A6 | `review failed` loses its once-only retry and escalation bound | ✅ RED — `the review failed retry must stay bounded` |
| A7 | `pending — 5c not yet run` loses its `PASS`/`WAIVED` → 5c branch | ✅ RED — `"pending — 5c not yet run" resumes at 5c when the gate is clean` |

**Six of seven closed. A5 open**, plus a stronger variant I added:

| N1 | **Delete the `APPROVE` or `CONCERNS` resume row outright** | **20/0 GREEN** |

The new `PER-VALUE DESTINATION` block enumerates `pending — 5c not yet run`, `REQUEST CHANGES`,
`review failed` and `not reached` — four values. `APPROVE` / `CONCERNS` is in the table, is parsed
into `subStateRows`, and receives only the generic well-formedness check (`key.length > 0 &&
action.length > 0`). Its destination is asserted nowhere, and it is not in the `claimedBy`
one-row-per-value loop either, so the row can be deleted with the suite green.

**Why this is the sixth instance, not a nitpick.** Four artifacts assert the property that is not
tested:

| Artifact | Claim | Status |
| --- | --- | --- |
| `pr-review-loop-parity.test.mjs:727-731` (the fix's own comment) | *"Each value resumes somewhere specific, so each is asserted specifically."* | false for 1 of 5 |
| `ef3a0c1` commit message | *"The resume rows likewise now assert WHICH destination each value resumes at"* | false for 1 of 5 |
| implementation report, post-gate-10 table | *"the resume rows now assert which destination each value resumes at, not merely that one is named"* | false for 1 of 5 |
| `task.88.resume-guard-strength.md` | *"It is now **genuinely closed** … mutation-proved with gate 9's mutations 30–32"* | #31 of 30–32 is green |

This is the same shape gate 10 used to place CY10-1 at MEDIUM rather than LOW: *"the assertion's own
message reads … naming a property it does not test"*. Gate 9 graded the same gap LOW **precisely
because** `8293765` claimed only *"a verb AND a destination"*, which is what it tested. That
exculpation no longer applies — the closure claim now exceeds the guard.

The harm is real and specific: the row inverted routes an **already-approved** resumed run back
through the whole QA loop at 5a, re-deriving the gate that just passed and burning cycles from a
budget that can reach Loop Escalation. Gate 9 singled it out by name — *"inverting the LOOP'S
EXIT"*.

**Not a runtime defect.** The prose on disk is correct today (`5c cleared — Step 5–6 is complete, go
to Step 7`). This is guard strength plus a false closure claim.

---

## 5. Attacking the new parsed-row mechanism directly

Ten novel attacks aimed at the parse itself, as instructed.

| # | Attack | Result |
| --- | --- | --- |
| M1 | **Reorder** the verdict rows | 20/0 GREEN — benign: row order carries no contract meaning, each destination is read off its own cell |
| M2 | Add a **decoy** `REQUEST CHANGES (minor)` verdict row routing to Step 7 | 19/1 caught — `expected exactly ONE verdict row for "REQUEST CHANGES", found 2` |
| M3 | **Delete the blank line** the parse uses as its end marker (glue the rationale blockquote to the table) | 20/0 GREEN — benign: the slice widens, but blockquote lines start `>` and are filtered by `startsWith("\|")` |
| M4 | **Right destination, wrong verdict** — swap the `APPROVE` and `Review failed` action cells | 19/1 caught — `APPROVE must exit the loop` |
| M5 | **Move the table** out of 5c into Loop Escalation, leaving a pointer | 15/5 caught — `the 5c verdict table must exist` + 4 more |
| M6 | **Merge cells** — `REQUEST CHANGES / APPROVE` sharing one verdict cell | 18/2 caught — `expected at least 4 verdict rows, parsed 3` |
| M7 | Blank line **inserted mid-table**, truncating the parse before `Review failed` | 19/1 caught — same row-count canary |
| M8 | `REQUEST CHANGES` keeps `Return to **5b**` but gains *"skip 5b and go straight on to Step 7 instead"* | 20/0 GREEN — negative regex is `/exit the loop\|proceed to Step 7\|Return to \*\*5a\*\*/` |
| M9 | `APPROVE` keeps `exit the loop` but gains *"re-enter at **5a** for a confirmation cycle"* | 20/0 GREEN — negative regex is `/Return to \*\*5[ab]\*\*/` |
| M10 | Failure arm keeps `HALT` + the forbidding sentence but gains *"Exception: if the PR is already merged, continue on to Step 7"* | 20/0 GREEN |

**Assessment: the positive half of the mechanism is sound.** Every genuine repointing, merge, decoy,
relocation and end-marker attack is caught by name. M1 and M3 are benign by construction.

M8–M10 are **recorded as observations, not raised as findings.** They are *negative* assertions on
prose, which can only ever forbid enumerated phrasings; defeating them requires deliberately writing
a synonym for a clause the document elsewhere contradicts. This is an inherent limit of
regex-on-markdown, not a defect of this fix, and it is categorically different from CY11-1 (where
the property is asserted **nowhere**). I note M9 with mild concern only because its assertion message
— *"it must not route back into 5a or 5b"* — states more than it enforces.

---

## 6. Where nobody had aimed: three further surfaces

Per the brief, I aimed at the surfaces no gate had targeted. Results:

### 6a. `ready-for-merge sits inside 5c` is an ORDERING check, not a containment check — **CY11-2**

```js
const s5c   = loopDoc.indexOf("### 5c. ");
const stage = loopDoc.indexOf("--stage ready-for-merge");
assert.ok(stage > s5c, "ready-for-merge must sit INSIDE 5c. …");
```

5c is the **last** section before Loop Escalation, so *"after the 5c heading"* and *"inside 5c"* are
not the same predicate — everything downstream of the heading satisfies it.

| N2 | Relocate the whole `jira-stage.js` / `gh-stage.js` `--stage ready-for-merge` block **out of 5c and into `## Loop Escalation`** | **20/0 GREEN** |

The mutated document signals a card **merge-ready from the escalation path** — a run that failed to
converge in five cycles — which is a stronger form of the exact harm the assertion's own message
names (*"advertised a card as merge-ready while the run could still loop back into qa-fix"*). The
sibling assertions do not save it: `never on REQUEST CHANGES` stays inside 5c, and the
`doesNotMatch` on the outcome-branching slice is unaffected.

`section5c()` — a guarded, end-asserted slice — is defined 300 lines above in the same file and is
the one-line fix. Two controls confirm the guard is otherwise live: **#14** (re-add the stage call to
5a's outcome branching) and **#15** (remove it entirely) both fail by name; **N3** (rename the stage
to `in-qa`) fails too.

### 6b. The two Step 5c banner firing points are pinned by nothing — **CY11-5**

The banner doc's preamble calls every listed moment mandatory; task 77 added two rows for 5c, and
§5c says *"this section owns it"*. Nothing tests the pairing.

| N4 | **Delete both Step 5c rows** from `develop-pipeline-remaining-work-banner.md`'s firing-point table | **28/0 GREEN** |
| N5 | **Swap** the two 5c position lines (wrong moment → wrong line) | **28/0 GREEN** |
| N6 | **Delete both** mandatory Remaining Work Status instructions from §5c | **28/0 GREEN** |

(28 = the 20 parity tests plus the 8 in `remaining-work-banner-parity.test.mjs`.)

`remaining-work-banner-parity.test.mjs:27` is named *"the canonical banner spec exists and **names
every firing point**"* and checks six generic substrings — `Every step transition`,
`develop-loop iteration`, `QA/verify cycle`, `HALT` and two format markers. Neither 5c row is
reachable from it. This is the same defect class one level up: a test whose **name** asserts
completeness over a table it does not enumerate.

Context: this surface is CR-3, a gate-5 finding, closed in prose at `741117f` and recorded closed in
the implementation report at `:423` and `:459`. Neither artifact claims a test pins it, so this is an
**unasserted guard, not a false claim** — which is why it is LOW, not MEDIUM.

### 6c. Step 0's progress rows — same class, same file-scoped match

```js
assert.match(step0, /`\*\*PR Review\*\*` row on the highest `### QA Cycle \{N\}`/,
  "Step 0 must state the same report-row condition the resume contract does");
```

The condition appears **twice** in `develop-pipeline-step-0-resolve-and-prepare.md` — once in the
`develop-story` progress table (`:676`) and once in `develop-task`'s (`:770`). The assertion is
file-scoped.

| N7 | **Delete it from the `develop-task` table only**, leaving the story one intact | **28/0 GREEN** |
| N8 | Delete it from **both** 5–6 rows and re-attach it to the **Step 7 / finalise** row | **28/0 GREEN** |

N8 is the plainest form of the pattern in this task: a completion condition attached to the wrong
step, satisfying an assertion that only asks whether the sentence exists somewhere in the file.

**N9** (observation): the QA-loop doc's own statement of which glob the ingester uses
(`The findings ingester globs \`*.pr-review.*.md\``) can be rewritten to `*.gate.*.yml` with the
suite green — the assertion reads the **ingester** file, so the loop doc's description of it can
contradict it silently.

### 6d. Surfaces that held

- **`advance-pipeline-lock.sh` stage arms** — `advance-pipeline-lock.test.sh` genuinely *runs* the
  script and asserts the resulting `current_step`, i.e. a mapping check, not a mention. `PASS
  review-pr at step 5/6 noops (lock preserved, step unchanged)` under **both** shells. Gate 10's
  mutation 27 (remove the `review-pr` arm) is green because the `*)` catch-all also `exit 0`s —
  behaviourally identical, and the trail's *"Did not hold — as predicted"* disclosure is accurate.
  I re-confirmed lock 14/14 bash **and** 14/14 zsh under that mutation.
- **The `tracker-workflow.md` moment table** — mutation 47 is green, exactly as gate 10 discloses
  (*"no test reads these docs"*). Known and recorded, not a new finding.
- **The ingester contract** — the header shape, both finding sections, the arrow continuation, the
  `no severity: key` warning, the `ref is not always a file:line` warning and the `source:` enum are
  all asserted on the ingester and renderer files themselves.

---

## 7. Gate 10's published 47-mutation table, re-executed in full

Baseline at `ef3a0c1` is **20/20**; gate 10 measured against 18, so its `17/1` reads as `19/1` here.

| # | Mutation | Gate 10 said | I measured | Verdict |
| --- | --- | --- | --- | --- |
| 1 | delete resume row `pending — 5c not yet run` | 17/1 keying | 19/1 — `expected exactly ONE … found 0` | ✅ |
| 2 | delete resume row `REQUEST CHANGES` | 17/1 | 19/1 — keying, by name | ✅ |
| 3 | delete resume row `review failed` | 17/1 | 19/1 — keying, by name | ✅ |
| 4 | delete resume row `not reached` | 17/1 | 19/1 — keying, by name | ✅ |
| 5 | merge all keys into one + 3 decoys | 17/1 | 19/1 — `each value needs its OWN row` | ✅ |
| 6 | action → `n/a — nothing to do here…` | 17/1 | 19/1 — `must state what the run DOES` | ✅ |
| 7 | `not reached` action → `TBD` | 17/1 | 19/1 — action verb, quoting the cell | ✅ |
| 8 | `not reached` action cell emptied | 17/1 | 19/1 — `needs both a key and an action` | ✅ |
| 9 | delete all data rows | 17/1 | 19/1 — `parsed to zero rows` | ✅ |
| 10 | remove the table's end marker | 17/1 | 19/1 — end-marker assertion | ✅ |
| 11 | duplicate the `review failed` row | 17/1 | 19/1 — `found 2` | ✅ |
| 12 | delete `review failed` + decoy | 17/1 | 19/1 — keying, by name | ✅ |
| 13 | PASS/WAIVED arms revert to Step 7 | 17/1 | 19/1 — `the PASS arm must hand to 5c` | ✅ |
| 14 | re-add `ready-for-merge` to 5a branching | 17/1 | 19/1 — `must sit INSIDE 5c` | ✅ |
| 15 | remove `--stage ready-for-merge` entirely | 17/1 | 19/1 — `must still exist` | ✅ |
| 16 | rename `### Convergence check` | 16/2 | 18/2 — `end marker not found after "### Outcome branching (shared)"` | ✅ |
| 17 | banner worked example loses the verdict | 17/1 | 19/1 — `must RENDER the verdict` | ✅ |
| 18 | banner format line loses the verdict | 17/1 | 19/1 | ✅ |
| 19 | banner Format-block sample loses the verdict | 17/1 | 19/1 — `Format block's sample … too` | ✅ |
| 20 | 5c's own exit-line statement loses the verdict | 17/1 | 19/1 — `5c must state the exit line…` | ✅ † |
| 21 | restore the `{medium\|low}` placeholder | 17/1 | 19/1 — `must carry both flags` | ✅ |
| 22 | drop `--comment` from the standard invocation | 17/1 | 19/1 | ✅ |
| 23 | drop `--comment` from the lite invocation | 17/1 | 19/1 — low-effort variant | ✅ |
| 24 | `--effort medium` → `high` | 17/1 | 19/1 | ✅ |
| 25 | delete the whole invoke-the-review fence | 17/1 | 19/1 | ✅ |
| 26 | lite-mode.md `--effort low` → `medium` | 17/1 | 19/1 — `did not match /--effort low/` | ✅ |
| 27 | remove `review-pr` from the lock noop arm | GREEN, "as predicted" | **20/0 GREEN**; lock 14/14 bash + 14/14 zsh | ✅ disclosure accurate |
| 28 | 5b restatement at `:301` loses the verdict | GREEN | **20/0 GREEN** | ✅ observation accurate |
| 29 | whole suite vs detached `origin/develop` worktree | 18 fail / 0 pass | **20 fail / 0 pass** — none vacuous | ✅ |
| 30 | resume `REQUEST CHANGES` → `5c` | GREEN (CY9-3) | **19/1 RED** | ✅ **now closed** |
| 31 | resume `APPROVE`/`CONCERNS` exit arm → `5a` | GREEN (CY9-3) | **20/0 GREEN** | ❌ **CY11-1 — still open** |
| 32 | resume `review failed` loses its escalation bound | GREEN (CY9-3) | **19/1 RED** | ✅ **now closed** |
| 33 | verdict `REQUEST CHANGES` → `5a` | GREEN (CY10-1) | **19/1 RED** | ✅ **now closed** |
| 34 | verdict `REQUEST CHANGES` → exit to Step 7 | GREEN (CY10-1) | **19/1 RED** | ✅ **now closed** |
| 35 | verdict `APPROVE` → `5a` | GREEN (CY10-1) | **18/2 RED** | ✅ **now closed** |
| 36 | failure arm `HALT` → `proceed to Step 7` | GREEN (CY10-1) | **19/1 RED** | ✅ **now closed** |
| 37 | verdict `CONCERNS` → `5a` | 17/1 caught | 18/2 — `CONCERNS must exit the loop` | ✅ |
| 38 | swap `REQUEST CHANGES` and `APPROVE` wholesale | 17/1 caught | 17/3 | ✅ stronger |
| 39 | delete the Review-failed verdict row | 17/1 caught | 18/2 | ✅ |
| 40 | signal `ready-for-merge` on REQUEST CHANGES too | 17/1 caught | 19/1 — `must not be advertised as merge-ready` | ✅ |
| 41 | `CONCERNS` blocks (returns to 5b) | 17/1 caught | 18/2 | ✅ |
| 42 | 5-cycle budget becomes additional | 17/1 caught | 19/1 — `must share the existing 5-cycle budget` | ✅ |
| 43 | invert the advisory contract (5c writes the gate) | 17/1 caught | 19/1 — `must restate that /review-pr writes no gate` | ✅ |
| 44 | drop `Do **not** fall through to Step 7` | 17/1 caught | 18/2 | ✅ |
| 45 | swap the lite/standard `--effort` levels | GREEN (CY10-1) | **19/1 RED** | ✅ **now closed** |
| 46 | revert `develop-task/SKILL.md` to the pre-5c chain | parity GREEN; `skill-frontmatter` 5/1 | **parity 20/0 GREEN**; `skill-frontmatter` **5/1 — `skill-catalog.md is stale`** | ✅ reproduces exactly |
| 47 | `tracker-workflow.md` `ready-for-merge` firing point | GREEN, known | **20/0 GREEN** | ✅ observation accurate |

† **A mis-target of mine, kept in the record.** The exit-line string occurs **twice** in the QA-loop
doc; my first attempt replaced the earlier (5b restatement, `:301`) occurrence and came back
20/0 green — which is mutation **28**, not 20. Re-run against the occurrence inside §5c, it is
19/1 red on the assertion gate 10 names. Gate 10's row 20 is correct; my first run was not.

**Score: 45 of the 47 published rows reproduce exactly. One (#31) does not — it is the finding.**
One (#46) required the *full* pre-5c revert to reproduce; removing only the parenthetical leaves the
catalog green, because `generate_catalog.py` truncates at **25 words** and word 25 is `review-pr`
either way. Gate 10's own conclusion for that row — *"pairing CI-guarded, **content unpinned**"* —
is exactly right.

---

## 8. Trail consistency, audited directly against disk

### 8a. `dod.1` and `dod.2` were not edited after the fact — **verified by blob identity**

| File | Introduced | Blob at every later commit |
| --- | --- | --- |
| `task.77.dod.1.…md` | `8293765` | `8c54b80f…` at `8293765`, `3bbd506`, `a74962b`, `ef3a0c1` — **byte-identical** |
| `task.77.dod.2.…md` | `a74962b` | `46b517a3…` at `a74962b`, `ef3a0c1` — **byte-identical** |

Each has exactly **one** commit in `git log -- <path>`. Their self-declared graded heads (`87e5bf9`,
`3bbd506`) are the heads they *assessed*, not the commits that added them — internally consistent
and consistent with the trail's own wording.

### 8b. Change Log — append-only and chronological ✅

23 rows. The two gate-10 rows are **appended at the bottom**; the reorder `a74962b` performed (fixing
`3bbd506`'s breach) is intact. No row was edited or removed. Machine writers leave `Version` blank,
as the contract requires.

### 8c. `## Completion` (implementation report) — **current** ✅

CY10-3's fix holds on every one of its five points: `gates 5–10 remediated`; `gate 10 CONCERNS (90)`;
**6** post-escalation passes enumerated with their gates; `Step 7 has run twice, and accepted neither
time` with both DoD runs and their heads; the `{populated after Step 7}` placeholder replaced with
the substantive fact (*"this task was never on a board"* — confirmed: no `github_issue`, no
`jira_key` in frontmatter). `a gate 11 and a dod.3 are outstanding` — accurate as of this file.

### 8d. §7 Files Summary — **CY10-2's fix is incomplete** (CY11-3)

Item 12 was rewritten to record that the *"no change required … `npm run generate-catalog` is a no-op
and the file is absent from the diff"* reasoning was circular. The **indented continuation line was
left in place**:

```
12. ✅ `docs/reference/skill-catalog.md` — **regenerated.** This row previously read "no change
    required: … a no-op and the file is absent from the diff". That reasoning was **circular** …
    `npm run generate-catalog` is a no-op and the file is absent from the diff      ← still there
```

The list item now asserts a claim and its refutation in consecutive sentences, and the surviving
sentence is the falsified one, unqualified. Introduced by `ef3a0c1` — the commit that closed CY10-2.
Everything else in §7 verifies: items 1–9 all present in the diff; item 11's six consumers confirmed;
item 16's *"counter 85 → 89"* matches `docs/tasks/task-registry.md:5` (`**Next Available Task Number:**
**89**`) with rows 85–88 present.

### 8e. §QA Testing Results, §QA Artifacts, §Test Coverage Summary, §DoD Gaps — **a gate stale again** (CY11-4)

`ef3a0c1` wrote `gate.10` and `qa.10` to disk and updated the Change Log and the implementation
report, but left four sections of the task document pointing at gate 9:

| Location | Says | Disk |
| --- | --- | --- |
| `:513` **QA Status** | `CONCERNS (gate 9, independent)` | `gate.10` exists |
| `:514` **QA Engineer** | `gates 5–9 issued by independent reviewers` | 5–10 |
| `:516` **Quality Score** | `91/100 (gate 9)` | gate 10 → 90 |
| `:517` **Gate Decision** | `CONCERNS (gate 9, 91)` | stale |
| §QA Artifacts table | last row is `qa.9`/`gate.9`; **no `qa.10`/`gate.10` row** | both on disk, added by this commit |
| footnote under it | `Rows 6–9 and the DoD rows` | 6–10 |
| `:546` **Tests Executed** | `18 parity tests` | **20** — `ℹ tests 20` |
| `:548` **Critical Issues** | `0 open HIGH in gate 9 (the latest)` | gate 10 is latest |
| `:549` **NFR Status** | `(gate 9, independent — the latest)` | stale |
| `:582-583` §DoD Gaps | `The latest gate on disk is gate.9 … **A gate 10 is outstanding**` | `gate.10` is on disk, in this commit |

Two of these are **recurrences of already-closed findings**: `18 parity tests` is the very line
CY9-4 corrected from 17, and *"the QA tables and header were a gate stale again"* is `dod.2`'s own
third defect. `:582-583` is falsified by the commit that wrote it, which is the same shape as CY10-2
and, per gate 10's count, now the **fourth** time a closure commit has falsified a neighbouring row.

### 8f. `§Definition of Done` / Progress Tracking — consistent ✅

All Phase 1–7 boxes ticked; Phase 6's `5 diagrams` / `11 reference/concept docs` match §7 item 10
after CY10-5. Frontmatter is well-formed: `type: task` present (OKF), `status: ready-for-review`
matching the body `**Status:** Ready for Review`, `updated: 2026-09-03`.

### 8g. Residual noted, not raised

`skills/develop-task/SKILL.md:184` and `skills/develop-story/SKILL.md:197` still render the
invocation as `/review-pr --effort {medium|low} --comment`. This is **inline code in prose, not a
fenced block**, so it is outside DoD gap 8's scope (*"all 16 bash blocks"*) and outside the snippet
gate — no artifact overclaims here. But the placeholder §5c calls a zsh parse error and the parity
suite forbids by name survives verbatim in the two documents an agent reads first.

---

## 9. Findings

| ID | Sev | Summary |
| --- | --- | --- |
| **CY11-1** | **MEDIUM** | `CY9-3` closed for 4 of 5 values. The resume table's `APPROVE`/`CONCERNS` row — the loop's **exit** arm — has no destination assertion: it can be repointed to `re-enter at **5a**` (gate 9 mut 27 / gate 10 mut 31) or **deleted outright**, both 20/0 green. Four artifacts, including the fix's own comment and `task.88`'s *"genuinely closed … mutation-proved with gate 9's mutations 30–32"*, assert otherwise; `ef3a0c1`'s proof block lists a *different*, red mutation under the `#31` label |
| **CY11-2** | LOW | *"ready-for-merge sits inside 5c"* is asserted by an **ordering** (`indexOf(stage) > indexOf("### 5c. ")`), not containment. 5c is the last section, so the stage-call block can be relocated into **Loop Escalation** — signalling merge-ready on a run that failed to converge — 20/0 green. `section5c()` exists in the same file |
| **CY11-3** | LOW | CY10-2's fix is incomplete: §7 item 12's indented continuation line still asserts *"`npm run generate-catalog` is a no-op and the file is absent from the diff"*, the exact claim the rewritten sentence above it calls circular. Introduced by `ef3a0c1` |
| **CY11-4** | LOW | §QA Testing Results header (4 lines), §QA Artifacts (missing the `qa.10`/`gate.10` row + footnote), §Test Coverage Summary (3 lines, incl. `18 parity tests` — now 20, and the line CY9-4 already corrected once) and §DoD Gaps (*"A gate 10 is outstanding"*) are a gate stale, made so by `ef3a0c1` itself |
| **CY11-5** | LOW | Guard gaps on three task-77 surfaces nothing has aimed at: both **Step 5c banner firing points** can be deleted from the authority table, swapped, or removed from §5c (28/0 green); Step 0's 5c resume condition can be deleted from the `develop-task` progress table alone, or moved to the **Step 7** row (28/0 green). `remaining-work-banner-parity.test.mjs:27` is named *"names every firing point"* and reaches neither 5c row |

**No HIGH. Nothing here is a runtime or deployment risk** — every routing arm on disk is correct, CI
is green, PR checks are green, and the branch introduces no bundle regression.

---

## 10. Verdict

**⚠️ CONCERNS — quality_score 90/100.**

Per `skills/qa-gate/SKILL.md` §Decision Criteria: *"Else if any `top_issues.severity == medium` →
Gate = **CONCERNS**"*. One MEDIUM (CY11-1) forces this; a LOW-only residual would not have.

I want to be explicit about what this gate is **not** saying. `ef3a0c1` is a genuinely good commit.
CY10-1 is properly closed at the mechanism, not patched: the verdict table is parsed, every
destination is read off its own action cell, and all nine of my structural attacks on the parse —
decoys, merges, relocation, mid-table truncation, wrong-verdict destinations — are caught by name.
Six of gate 9's seven CY9-3 inversions are red. 45 of gate 10's 47 published rows reproduce exactly.
`dod.1` and `dod.2` are byte-unchanged. The Change Log is append-only and chronological. CI is green
on the first run. The branch net-reduces bundle staleness.

What holds it at CONCERNS is that the **closure claim once again exceeds the guard**, on the one row
of five that carries the loop's exit — and that the mutation-proof block reports a substitute under
the failing mutation's number, so the gap left no trace in the record. Gate 10 called CY10-1 the
**fifth** instance of a mention standing in for a mapping; this is the **sixth**, and it is inside
the commit that closed the fifth.

### Does this support `accepted`?

**No.** `shared/resources/document-status-lifecycle.md:62` gives the `accepted` precondition as
*"DoD checklist passed, QA gate PASS or WAIVED"*. Neither half is met:

1. This gate reads **CONCERNS**, with `waiver.active: false`. Not PASS, not WAIVED.
2. **No DoD run has passed.** `dod.1` — NOT ACCEPTED (8 gaps). `dod.2` — NOT ACCEPTED (blocked on
   this same precondition). A `dod.3` is owed on either route.

**Exactly what remains, in order:**

1. **CY11-1** — add the fifth entry to the per-value destination map: `dest("APPROVE")` (or a
   `key.includes("APPROVE")` lookup, since the row keys `APPROVE` or `CONCERNS` together) must match
   `/Step 7/` and must not match `/re-enter/`. Mutation-prove with gate 10's **#31** and with **N1**
   (delete the row), both green today. ~6 lines. Then correct the three artifacts that claim
   30–32 were all proved — `ef3a0c1`'s message is immutable, so disclose in the implementation
   report and on `task.88`, as this task has done before.
2. **CY11-2** — change `loopDoc.indexOf("--stage ready-for-merge")` to
   `section5c().includes("--stage ready-for-merge")`. Mutation-prove with **N2**. ~2 lines.
3. **CY11-3, CY11-4** — delete one orphaned continuation line; refresh four sections of the task
   document to gate 10 (header ×4, artifacts row + footnote, `18` → `20` parity tests, `gate 9 (the
   latest)` ×2, and §DoD's *"a gate 10 is outstanding"*). ~12 single-line edits.
4. **CY11-5** — optional and out of the critical path: pin the two banner firing points and scope the
   Step 0 assertion per pipeline. Mutation-prove with N4/N5/N6 and N7/N8.
5. Then a gate reading **PASS** or **WAIVED**, and a `dod.3` that passes.

**Loop Escalation stands.** Five of five QA cycles were spent at gate 5; this is the **eighth**
post-escalation assessment (gates 6–10 plus `dod.1` and `dod.2`) and none of them restores the
budget. Whether the open findings block the
merge is a human decision, not this gate's.
