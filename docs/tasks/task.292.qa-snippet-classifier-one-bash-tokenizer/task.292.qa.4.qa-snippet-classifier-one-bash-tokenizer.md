# QA Report 4: Task 292 — closing the `/finalise` DoD gaps

**Date:** 2026-11-10
**Trigger:** `/finalise` run `task.292.dod.1` returned GAPS on criteria 5, 6, 7 and 10 (gate 3 had passed them).
**Engine:** `shared/resources/qa-execute-snippets.mjs` is **unchanged** (byte-identical to `9a3b04e9`, checked with `cmp` after every mutation). Only the test file changed.
**Machine:** Omarchy laptop. Load is recorded beside each timing.

## Criterion 10 — mutation proofs, with the red test named

Each mutation was made with an edit to the engine, the suite was run (`CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`), and the engine was restored from a snapshot (`cmp` clean). Baseline: 371 pass before this report, 379 pass after.

| Change | Mutation | Result | Red test (first) |
| --- | --- | --- | --- |
| T292-QA-1: `$[` refusal | the `refuse("legacy arithmetic $[")` replaced by `i += 2` | 2 red | `task.292 tokenizer refuses the legacy arithmetic form $[`; `task.292 gap (T292-QA-1): $[ ] shift with blanks is refused as mutating` |
| T292-QA-1: `<<` in `(( ))` refusal | the `arith > 0` refusal line deleted | 2 red | `task.292 tokenizer refuses (( and a << inside a subscript`; `task.292 gap (T292-QA-1): (( )) with empty substitutions is refused as mutating` |
| Substitution scan stays iterative | recursion whose depth follows the nesting added to `openSubst` | 1 red | `task.292 tokenizer: nesting is bounded by the heap, not the call stack` |
| `classifyInternal` blank normalisation | the `code.replace(NOT_A_BASH_BLANK, …)` line deleted | **0 red before this report** (suite 371/371; differential `blanks`, `splits`, `escapes`, seed 71, 8000 blocks each, 0 writes) | none — absorbed |
| same, after the new rows below | same deletion | 6 red | `task.292 classifyInternal normalises blanks: "command\recho hi" is refused` (and the `\f`, `\v`, `\r-v` rows) |
| Migration: `maskSubstitutions` | masks nothing | 24 red | `task.274 base scan controls: the look-alikes that write nothing stay runnable` |
| Migration: `collapseQuotedSpans` | returns its text | 19 red | `BUG-6: an unterminated quote blanks nothing, so it cannot hide a command` |
| Migration: `stripProse` | returns its text | 28 red | `a mutating command inside a heredoc body is data, not an invocation` |
| Migration: `stripNonCode` | returns its text | 38 red | `BUG-6: an unterminated quote blanks nothing, so it cannot hide a command` |
| Migration: `cutJoins` | cuts nothing | 7 red | `a backslash line-continuation does not start a new command` |
| Migration: prose-pass join | `cutJoins(...)` dropped from the prose pass | 1 red | `task.274 base scan: a variable split by a line continuation is refused as mutating` |
| New consumer-count test | an unlisted `tokenize(` call added | 1 red | `task.292 the tokenizer's consumers are counted, and each scan still reads it` |

**The `classifyInternal` line was unproven, and it is now proven.** Comparing verdicts with the line removed found the behaviour: without it, `command` followed by a CR, FF, VT, NBSP or U+2028 reads as the `command` builtin and the block is called `runnable`, where bash reads one unknown word. Seven rows in the suite now hold it (`T292_COMMAND_BLANKS` and the control `command echo hi`). The earlier absorption claim (QA 1) stands for the old suite; it no longer holds.

## Criterion 7 — the call-site test counts consumers

New test `task.292 the tokenizer's consumers are counted, and each scan still reads it`. It counts the `tokenize(` call sites in the engine (4: `cutJoins`, `maskSubstitutions`, `collapseQuotedSpans`, `stripProse`), checks each body, checks that `stripNonCode` reads it through `collapseQuotedSpans` and `stripProse`, and that the prose pass uses `cutJoins(stripProse(code), "")`. An unlisted consumer turns it red (row above).

## Criterion 5 — docs scan timing, on the head

`node scripts/qa-snippets-docscan.mjs --time`, five runs, on `9a3b04e9` (engine unchanged since `7ec74b57`). Load average (1 / 5 / 15 min) at each run: 3.53 / 1.83 / 1.31; 3.53 / 1.83 / 1.31; 3.53 / 1.83 / 1.31; 3.40 / 1.83 / 1.31; 3.40 / 1.83 / 1.31.

| Run | develop | now |
| --- | --- | --- |
| 1 | 512 ms | 351 ms |
| 2 | 567 ms | 395 ms |
| 3 | 543 ms | 385 ms |
| 4 | 522 ms | 373 ms |
| 5 | 545 ms | 384 ms |
| **median** | **543 ms** | **384 ms** (−29%) |

No outliers dropped. Docs scan result on the head: 3447 blocks, runnable 257 on `develop` and 256 now, **0 newly runnable**, 1 newly refused (`docs/tasks/task.45…/task.45.bug.1…md:76`).

## Criterion 6 — fixed-seed slice, on the head

`node --test --test-name-pattern="differential slice" shared/resources/tests/qa-execute-snippets.test.mjs`, five runs. The slice test took 3368, 4343, 3799, 3079 and 3046 ms, **median 3368 ms**, under the 10 s bound. Load at the runs: 3.40 / 1.83 / 1.31; 3.37 / 1.85 / 1.32; 3.82 / 1.97 / 1.36; 3.84 / 2.01 / 1.38; 3.84 / 2.01 / 1.38. The calibration test beside it adds about 0.5 s per run.

## Gate

No new finding. Suite 379/379 under `CI=true`. The security probe plan is re-run by `/finalise` (it is the run that records it for DoD 2).

## Checklist

- [x] Mutation proofs recorded with red tests named (criterion 10)
- [x] Consumer-count test (criterion 7)
- [x] Timings on the head with load (criteria 5, 6)

---

## Gate 4 review (`/qa-task`, head `e32c06c3`)

**Gate:** [task.292.gate.4.qa-snippet-classifier-one-bash-tokenizer.yml](./task.292.gate.4.qa-snippet-classifier-one-bash-tokenizer.yml) — CONCERNS, 90/100.

### Review Methodology

Direct tools. Diff review: code review, scoped to files changed since gate 3 (head `7ec74b57`): `shared/resources/tests/qa-execute-snippets.test.mjs` only. Re-review scope: files changed since gate 3 (head `7ec74b57`; 1 code file) — default. Step 4b: not applicable (no runnable prose in the change set). CI_SUMMARY: CI on e32c06c3d691: pending (read once, not waited on).

### Re-Review Context

| Previous item | Status |
| --- | --- |
| Gate 3 `top_issues` | none |
| DoD 1 gaps #5, #6, #7, #10 | closed in this report above (timings, consumer-count test, mutation proofs) |
| T292-CR-1..3 | unchanged, pre-existing, in `recommendations.future` |

### New Findings This Cycle

- **[medium]** task document, criterion 10: reworded after review (`(QA 4)` appended) with no approver; `criteria-drift.js` reports `reworded`, `approved: false`. The bound is unchanged. Owner approves or restores the text (T292-QA4-1).

Searched: engine byte-identical to `7ec74b57` (`cmp` clean), so the engine and its security surface were not re-read; the test diff (75 lines) was read in full.

### Evidence

- `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 379 pass, 0 fail.
- `security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock'`: 31 executed, 0 reproduced, 0 escaped, verdict `engages` (`task.292.qa.4.security.run.json`).
- mutation-proven: the `classifyInternal` blank normalisation line deleted → six `classifyInternal normalises blanks` rows red → covered.
- mutation-proven: an unused function calling `tokenize(` added → `task.292 the tokenizer's consumers are counted, and each scan still reads it` red → covered. A first attempt (a top-level `void tokenize("")`) broke module loading and was discarded as `mutation-void`.
- After each mutation the engine was restored from a snapshot; `cmp` clean, `git diff` clean.

### Code Review

Correctness bugs (0). Cleanups (0). The blank rows assert behaviour (`classifyBlock(...).klass`). The consumer-count test reads source text by design (it counts call sites) and is paired with those behavioural rows.

### NFR

Security CONCERNS (known holes unchanged, pre-existing); Performance, Reliability, Maintainability PASS.
