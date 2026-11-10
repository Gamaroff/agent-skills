# Implementation Report: One bash tokenizer for the QA snippet classifier

**Task**: `task.292.qa-snippet-classifier-one-bash-tokenizer.md`
**Run Number**: 1
**Started**: 2026-11-10 00:00
**Status**: In Progress

---

## Summary

Replace the snippet classifier's separate regex re-implementations of bash's blank, quote, escape and line-join rules with one tokenizer every scan reads, and close the open T290-QA-3 write gap.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (not yet signalled)                                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.292.*` exists in git                              | Branch created at `89366af8` | —                    | 2026-11-10T04:10Z |
| 2. review-task             | ✅ Done | `task.292.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 9/10, 0 critical, 0 important | —                    | 2026-11-10T04:25Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (no /develop); 4 phases; 350 tests, fast gate green | —                    | 2026-11-10T05:12Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #869 → develop; in-review comment posted; body written from commits (Explore summariser not run) | —                    | 2026-11-10T05:10Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.292.qa.{N}.*.md`; `task.292.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.292.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-10

- Feature branch base: develop — source: recommended (--defaults)
- PR target branch: develop — source: recommended (--defaults)
- qa-planning gate: skipped (auto — no prompt)
- Mode: standard — source: detector (risk_level absent, 4 phases, so not lite)
- Phase 0 run inline (no subagents); lite-mode inputs derived from the document directly.
- Invoked by /develop-next (item T292) with --defaults.
- work-started: comment posted, board Todo → In Progress.
- review-task invoked; output: Comprehensive report (pipeline default); Step 8.5 auto-answered "apply all critical + important fixes" (none needed); Step 9 auto-answered "Yes, fixes complete". Status Planned → Ready for Development.
- Step 3 inline — /develop not invoked: the plan file names every phase and hunk, and the surface map is recorded. Plan file found: docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.plan.qa-snippet-classifier-one-bash-tokenizer.md — included as implementation context.
- Pre-develop surface map: 4 paths — shared/resources/qa-execute-snippets.mjs (engine), shared/resources/tests/qa-execute-snippets.test.mjs (suite), scripts/qa-snippets-differential.mjs and scripts/qa-snippets-docscan.mjs (new), package.json (two scripts). Built inline from the plan; no Explore subagent.
- Phase 1 calibration (instruments tried on a known failure before their green counts):
  - Differential on the unchanged engine: `node scripts/qa-snippets-differential.mjs --atoms blanks --count 20000 --seed 1` → total 20000, runnable 2416, writes 10; every writer holds a CR/FF/VT/NBSP/U+2028 before `#` (T290-QA-3 reproduced).
  - Docs scan against a copy of the engine widened by one rule (`if (c === "\\" && double)` → `if (c === "\\")` in `stripCommentQuoteAware`): newly runnable 1, `docs/tasks/task.83.platform-aware-skill-exclusion/task.83.bug.1.tracker-resolution-divergence.md:102`. Unwidened engine against `develop`: 3444 blocks, 0 newly runnable, 0 newly refused.
  - Suite rows red before the fix: `node --test --test-name-pattern=task.292 shared/resources/tests/qa-execute-snippets.test.mjs` → 5 gap rows and the fixed-seed slice fail, 2 controls and the blind-classifier calibration pass.
- Step 3 evidence (all re-measured at `be6fb8b4`):
  - Four commits on the branch: instruments (`9ae56d55`), tokenizer + comment scan (`6d96fc98`), stripProse/quote/blank scans (`115ddb38`), substitution mask + joins + whitespace guard (`be6fb8b4`), plus the doc/CHANGELOG commit that follows.
  - Full differential, seed 101, 60000 blocks per set (escapes, blanks, splits, nesting): 0 writes in all four. On the pre-change engine the same generator found writes in blanks (10, the cap), escapes (1), nesting (4) and splits (10, the cap).
  - Docs scan against `develop`: 3444 blocks, runnable 257 → 257, newly runnable 0, newly refused 0. Pass time over the corpus, five runs with `uptime` beside each (load 3.5–3.7 throughout): `develop` 490/486/503/485/520 ms, now 339/336/346/332/359 ms; median 503 → 339 ms (−33%), no outliers dropped.
  - Fixed-seed slice in the suite (seed 1, 4000 blocks per set, five sets): 2.70/2.70/2.68/2.69/2.67 s, median 2.69 s against the 10 s bound.
  - Deep nest (`echo "$(echo ` x N): N=1000/3000/6000 classify in 22/29/36 ms; `develop` 68/668/2585 ms.
  - Mutation proofs (each reverted, each named): CR/FF/VT/NBSP/U+2028 made blanks in the tokenizer → five T290-QA-3 gap rows and the slice red; blank normalisation removed → five assignment-gap rows and the slice red; escaped-quote refusal removed → the tokenizer-refusal row red and the docs scan reports `task.83.bug.1…md:102` newly runnable; an unlisted `\s` added → the whitespace guard red.
- Decision: an escaped quote outside quotes stays refused in the tokenizer. Reading it correctly makes `task.83.bug.1…md:102` newly runnable, and the plan's constraint is 0 newly runnable. Widening it is a separate decision for the owner.
- Decision: normalise non-blank whitespace once in `classifyInternal` (and the exported `commandInvocations`/`unboundVariables` entries) instead of rewriting 48 `\s` sites; the allowlist test names every function that holds a `\s` and why it is safe.
- Review report: docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.review.1.qa-snippet-classifier-one-bash-tokenizer.md. The two pre-pass Explore subagents did not run; they were done inline, so independent review of the pre-pass did not run.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Not migrated: the `WORD` regex in `variableArgumentToDenyListed` and the assignment regex in `assignedVariables`.** Both still carry a quote-aware regex, and the plan's table did not name them. They read text that regexes have already cut at `;`, `&&`, `$(` and newlines without regard to quotes, so a tokenizer read of a fragment would see an unterminated quote and refuse blocks it accepts today. Moving them means moving the segmentation onto tokens, which is a change of segmentation and not of lexing. The differential (240000 blocks) and the docs scan show no write through them. For QA to judge: raise it as a follow-up task or accept as out of scope.
- **Deep-nest speed regressed, then was fixed.** The first migration made a 3000-deep nest 3.5x slower (2.4 s against 0.67 s) and a 6000-deep one overflow the stack, because `collapseQuotedSpans` recursed per level and re-tokenised each slice. Rewritten as one pass with an explicit stack; now 36 ms at 6000.
- **`tmp-leak` ratchet tripped once** on a new prefix `ctx-wrap` from `context-pressure-statusline.test.mjs`, the leak tracked by task.291. Not this change: the three gates before and the one after it passed. Removed the stray directory and re-ran: green.
- A `pkill -f` I ran to stop a hung test run also ended its own shell; no state was lost.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — gate FAIL (80/100), 1 HIGH

**Action**: Running qa-fix

- **Found (QA 5a):** T292-QA-1. `echo $[1<<z]`, a writer line, then `z` classified runnable; bash writes. Diff reviewer CR-1, reproduced by QA with a control. Bug report `task.292.bug.1`.
- **Fix (5b):** the lexer refuses `$[`, refuses `<<` inside an open `(( ))` and refuses `<<` in a word with an unclosed `[`. A first version (refuse `$[` only) left `echo ;(($()$()<<z))` runnable; the new `arith` differential atom set found it (seed 11), so the cycle fixed the class, not the instance. The `qa-fix` ingester subagent did not run (one finding, already in hand), so independent ingest did not run.
- **Evidence:** suite 362/362; `arith` differential seeds 11/12/13 at 60000 blocks each: 0 writes (seed 11 wrote once before the second change); seeds 31/32, all six sets, 30000 each: 0 writes; docs scan 3445 blocks, 0 newly runnable, 0 newly refused; slice median about 2.9 s (bound 10 s); `CI=true npm run ci:fast` green once the QA report's bug link was staged.
- **Mutation proofs:** `$[` refusal reverted: 3 tests red. `(( ))` refusal removed: 2 red. Subscript refusal removed: only the tokenizer unit row red (the classify row is also refused by the allow-list).
- **Scope note:** a first `((` blanket refusal turned `if ((a>b))` mutating and broke an existing test; narrowed to a `<<` inside an open `(( ))`.

### QA Cycle 2 — gate FAIL (80/100), 1 HIGH

**Action**: Running qa-fix

- **Found (QA 5a, refute pass plus safety re-probe):** T292-QA-2. `commandInvocations` removed `$(( … ))` with a pattern that ends at the first `)`, so `echo $((1+$(touch W)))` classified runnable while bash wrote. Reviewer CR-1, reproduced by QA with a control; identical on `develop`. Bug 1 verified and closed. Bug report `task.292.bug.2`.
- **Fix (5b):** `openSubst` refuses a `$((` whose body holds `$(` or a backtick. Class sweep read every `.replace(/…/)` in the engine; the `blankConditionalSpans` copies feed the redirect path only and the command scan still sees the original text. The `qa-fix` ingester subagent did not run (one finding, already in hand), so independent ingest did not run.
- **Evidence:** suite 371/371; fast gate green (8332 pass, 0 fail); `arith` differential with the new `+` and writer atoms: pre-fix engine shows a write at seed 51, fixed engine 0 writes at seeds 51/52/53 (60000 each) and all six sets seed 54 (30000 each); docs scan 3445 blocks, 0 newly runnable, 1 newly refused (task.45 bug 1, line 76).
- **Mutation proof:** `refuseArithSubst` call removed: 8 tests red (seven rows and the tokenizer row).
- **Why the differential missed it in cycle 1:** the `arith` set had no operator and no atom with a writer inside, so `$((1+$(touch out)))` could not be built. Both atoms are added.
- **Open:** this is the second HIGH on `qa-execute-snippets.mjs`; a third would trip the third-strike rule. The `WORD` and assignment regexes remain the known follow-up.

### QA Cycle 3 — gate CONCERNS (90/100), 0 blocking

**Action**: Proceeding to 5c

- **Found (QA 5a, unscoped safety re-probe):** no finding attributable to this change. Reviewer CR-1 to CR-3 (`printf -v` and kin with a quoted `a[$(cmd)]`; PS4 and `${x@P}`; quoted data re-evaluated as arithmetic) are runnable-and-writing but identical on `develop`, absent from the corpus and outside the task's out-of-scope list, so they are `pre-existing` and routed to gate 3 `recommendations.future` for a follow-up task. Bug 2 verified and closed. The independent reviewer ran in 102 s.
- **Evidence:** suite 371/371; `arith` differential seed 61 (60000) and all six sets seed 62 (30000 each): 0 writes; docs scan 3446 blocks, 0 newly runnable, 1 newly refused; probe 31 executed, 0 escaped; mutation (`refuseArithSubst` removed) 8 red.
- **PR Review**: CONCERNS (5c, conformance lens only) — PC-1 trail medium (this section's headings and row, fixed here), PC-2 consistency low (boxes ticked), PC-3 coverage low/low dismissed after measurement (a recursive scan overflows the stack near 7365 frames, so the 20000-deep test goes red for it). No open coverage finding. Report `task.292.pr-review.1.*`.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: [#869](https://github.com/Gamaroff/agent-skills/pull/869)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
