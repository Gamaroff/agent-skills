# Implementation Report: Fail-closed reader for the 5c open-coverage check

**Task**: `task.240.open-coverage-fail-closed-reader.md`
**Run Number**: 1
**Started**: 2026-10-28 16:05
**Status**: Escalated

---

## Summary

Replace the §5c open-coverage awk with a bundled Node reader (`open-coverage.js`) that parses the PR review's findings block strictly and prints `unreadable` for any shape it cannot read.

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
| Tracker Issue       | #771 (GitHub)                                                              |
| Board status        | In Progress ✅ (work-started: Todo → In Progress, verified)                |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.240.*` exists in git                              | Branch created at `83aacf7b` | —                    | 2026-10-28T14:00Z |
| 2. review-task             | ✅ Done    | `task.240.review.{N}.{name}.md` exists (or skip logged)                | `task.240.review.1.open-coverage-fail-closed-reader.md` — READY 8/10; Planned → Ready for Development | —                    | 2026-10-28T14:07Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (iter 1); 15/15 phases; ci:fast green on iter 2 | `.summaries/step-3-iteration-audit-1.json` | 2026-10-28T14:34Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #776: https://github.com/Gamaroff/agent-skills/pull/776 | —                    | 2026-10-28T14:36Z |
| 5–6. qa-task / qa-fix loop | ⚠️ Escalated | `task.240.qa.{N}.*.md`; `task.240.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | Loop limit: 5 cycles, all CONCERNS with HIGH 0 and MEDIUM 1; route 2c declined (medium-not-falling) | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.240.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-28

- Invoked by `/develop-next` (roadmap item T240) with `--defaults` — autonomous run.
- Feature branch base: develop — source: recommended (auto-answer via `--defaults`, Phase 0d Recommended option)
- PR target branch: develop — source: recommended (auto-answer via `--defaults`, Phase 0d Recommended option)
- Mode: standard — source: detector. Phase 0 run inline (no 0a-parallel agents dispatched; the task path was given exactly): risk_level absent (risk_ok=true), phase_count 4 (Phases 0–3, not < 3), single_module false (shared/resources + evals + two bundled skills) → standard.
- Skips: none. Refused flags: none. Questions asked: 0 (`--defaults`, nothing in conflict).
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Tracker poller not dispatched (inline Phase 0); tracker state is read by Step 1's stage CLI.
- Status `planned` at start — Step 2 `/review-task` will validate and promote.
- Branch: `feature/task.240.open-coverage-fail-closed-reader` from `develop` (`83aacf7b`), pushed with tracking. Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment `posted`; GitHub board: work-started → In Progress (transitioned, verified). Priority already P1 High — not overwritten.
- review-task ran (status `planned`, no prior report). Output: Comprehensive report (pipeline default). Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete" — pipeline proceeds autonomously.
- Review report: `task.240.review.1.open-coverage-fail-closed-reader.md` — READY TO IMPLEMENT, 8/10, 0 critical / 6 important / 3 optional. All 6 important fixes applied (parser rules aligned with pinned parity cases; SC-5 given a test) plus 3 optional. Planned promoted to Ready for Development by review-task. `reviewed_blob` stamped.
- Pre-pass B (architecture) and C (codebase) dispatched as Explore subagents: aligned / not-implemented.
- Review outcome comment skipped — review-task reported `posted` (stage review-task). Tracker key unchanged (#771), no work-started re-fire.
- Phase 0 precondition (task Phase 0): task.238 (PR #770) is MERGED; `git grep -n 'OPEN_COVERAGE=\$(' origin/develop -- shared/resources/develop-pipeline-step-5-6-qa-loop.md` hits at `:1556`.

### Step 3 — develop

- Step 3 inline: `/develop` was not invoked. The plan file names every hunk, and the Step 2 review mapped every file in scope.
- Pre-develop surface map: built inline from the Step 2 review and its pre-pass C scan, not from a separate Explore agent. **No independent surface map ran.** The scope was 5 source files plus bundled copies: `open-coverage.js` (new), `tests/open-coverage.test.mjs` (new), `pr-review-current.js`, the §5c block in `develop-pipeline-step-5-6-qa-loop.md`, and `pr-review-loop-parity.test.mjs`.
- The reader's accepted and refused shapes follow the plan's corrected parser rules. Every row of the parity suite's three fixture tables now also runs through `countOpenCoverage` (SC-1).
- Corpus diff (SC-4): the old block from `83aacf7b` and the new CLI were run over `git ls-files '*pr-review.*.md'`, with 0 changes. Distribution: `0` ×128, `1` ×35, `2` ×5, `unreadable` ×19.
- Mutation proofs: M1 (skip an unplaceable line) turned 2 tests red, M2 (drop the pre-existing filter) 7, M3 (refusal read as 0) 40, and M4 (remove the `case` guard) 1. All four were reverted, and `cmp` confirmed the reader is byte-identical.
- The parity suite also ran with the local `.agents/skills` symlink moved aside: 83/83 pass.
- zsh is not installed on this machine, so the parity suite's zsh arm ran only in CI.
- Fast gate: iteration 1 was red (1 failure), iteration 2 was green (6,605 pass, 0 fail). See the Issues Log.
- `bundle:check`: 0 problems. `validate` for develop-task and develop-story: pass.
- Loop audit iter 1 (Explore): `ready-for-review`, 15/15 — exit loop. Artifact `.summaries/step-3-iteration-audit-1.json`.
- Development completion comment posted to GitHub issue #771 (`develop-complete`, `posted`).

### Step 4 — create-pr

- SCOPE_PATHS: `docs/tasks/task.240.open-coverage-fail-closed-reader`, `CHANGELOG.md`, `evals/shared/tests`, `shared/resources`, `skills/develop-story/references`, `skills/develop-task/references`, `skills/qa-fix/references`.
- Pre-flight guard: 0 out-of-scope untracked files held.
- Report link check (`doc-links.js`): implementation report and review report, 0 relative links, exit 0.
- `/create-pr --base develop --issue 771` with the seven scopes. Two commits: `feb2c916` docs(task.240) and `c054f8f4` feat(qa). Pushed.
- PR body written inline, not by the pr-body summariser agent: the orchestrator wrote the diff in this session.
- PR #776: https://github.com/Gamaroff/agent-skills/pull/776
- Leak check: OK on both commits. Held files: none to restore.
- The lock now records `pr_url`. The develop-next run state records `prNumber: 776`.
- Tracker: in-review comment `posted` on #771.
- GitHub board: in-review → `stage-disabled`. `tracker-workflow.yaml` sets no in-review moment.
- Post-PR state check: PR #776 state = OPEN (read with `gh pr view` directly, not the poller agent), errors = 0.

### Steps 5–6 — QA loop

- GitHub board: QA-start re-assert → `stage-disabled`.
- Traceability mapper skipped: the Success Criteria are a checkbox list, not a table (`HAS_SUCCESS_CRITERIA_TABLE=false`).
- Gate 1: CONCERNS with 1 open medium finding. No waiver. Convergence check not applicable (cycle < 3). Route classifier: no exit (2 and 2c need cycle ≥ 3; 2b needs a PASS gate). → 5b.
- QA Cycle 1 — changes-requested: `stage-disabled`.
- Third-strike rule: not applicable (cycle 1, HIGH 0). Narrowing-residue offer: not applicable (one cycle of residue).
- qa-fix cycle 1: the findings ingester was not dispatched. The gate's one finding was written by this session minutes earlier, so the findings were read inline. **No independent ingest ran.** `pr_review`: none (selector `none`). `fix_cycle`: not supplied, so it was derived from the gate (1).
- qa-fix cycle 1: Step 3.5 probe with the phrase 'deeper line' found 0 sites; 'open-coverage.js' found 1, the loop doc, which is unaffected. The CHANGELOG was updated. Mutant M8 survived its first run, so an end-of-block case was added and it then went red.
- qa-fix cycle 1: the fast gate was green on attempt 1 (6,618 pass, 0 fail). Commit `a98f5470` carries the fix plus gate.1, qa.1 and bug.1. The implementation report was excluded. Pushed once.
- Post-fix PR state: OPEN at `a98f5470`. This was read with `gh pr view` directly, not with the poller agent.
- Gate 2: CONCERNS with 1 open medium (TASK-240-QA-2). Convergence check: not applicable (cycle < 3). Route classifier: `continue` (`not-a-pass-gate`; route 2 is below the cycle floor), so the loop goes to 5b.
- Gate 2 promoted the refute pass's CR-1 and re-rated it from high to medium. The basis: the shape appears in 0 of 187 corpus reports, and no writer emits it. CR-2, CR-3 and CR-4 read the same on the base awk and have 0 corpus hits, so they were routed to `recommendations.future` as pre-existing.
- Narrowing residue — every MEDIUM on gates 1 and 2 names shared/resources/open-coverage.js (TASK-240-QA-1, TASK-240-QA-2); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation.
- QA Cycle 2 — changes-requested: `stage-disabled`.
- qa-fix cycle 2 ran from the qa-fix instructions already loaded in this session (not re-invoked). The ingester was not dispatched: the gate's one finding was written by this session. `fix_cycle` was derived from the gate (2). Step 2.6 move: consolidate (an allow-list), recorded in the fix summary.
- Gate 3 (narrowed scope; reviewer 52 s): CONCERNS. Convergence check: HIGH sequence 0, 0, 0, so not tripped (`HIGH_N = 0`). Route classifier: `continue` (`not-a-pass-gate`; route 2 declined with `product-defect-signal`). Third-strike detector: no HIGHs, so it does not fire.
- Gate 3 re-rated CR-1 and CR-2 from high to medium. The measurement: 0 of 187 tracked reports carry any nested value under an empty key.
- Narrowing residue — every MEDIUM on gates 2 and 3 names shared/resources/open-coverage.js (TASK-240-QA-2, TASK-240-QA-3); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation. It is the second offer in a row on the same mechanism, so the fix takes the third-strike menu's **replace** move even though the detector did not fire.
- qa-fix cycle 3: the first comment write failed (the file had changed on disk), so the qa-fix-3 PR and issue comments were posted with the stale one-line gate body. Both were corrected with PATCH. Their marker and lead were kept. A re-post was not an option, because the engine returns `already`.
- Gate 4 (narrowed scope; the reviewer took 188 s): CONCERNS. HIGH sequence 0, 0, 0, 0, so the convergence check did not trip. Route classifier: `continue` (route 2 declined with `product-defect-signal`). CR-1 was re-rated from high to medium on 0 corpus hits; no writer quotes a deciding value.
- Narrowing residue — every MEDIUM on gates 3 and 4 names shared/resources/open-coverage.js (TASK-240-QA-3, TASK-240-QA-5); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation. The mechanism is separate from bugs 2 and 3: escape decoding, not nested quote closure. Move: consolidate.
- qa-fix cycle 4: the fast gate was green on attempt 1 (6,639 pass, 0 fail). Commit `0c11216f` carries the fix plus gate.4, qa.4 and bug.4. Pushed once; the PR is OPEN at `0c11216f`.
- qa-fix cycle 3: the fast gate was green on attempt 1 (6,634 pass, 0 fail). Commit `32065fbf` carries the fix plus gate.3, qa.3 and bug.3. Pushed once; PR state OPEN at `32065fbf`.
- qa-fix cycle 2: the fast gate was green on attempt 1 (6,622 pass, 0 fail). Commit `46146a35` carries the fix plus gate.2, qa.2, bug.2 and bug.1 (now closed). Pushed once. PR state: OPEN.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3, fast gate iteration 1 — attributable red, fixed.** `tests/relationship-assertion-lint.test.js` › "no file in the live corpus is invisible to the scanner" failed on `shared/resources/tests/open-coverage.test.mjs`. A bisect located the cause: a template-literal test title held a nested string with backticks (`` "```yaml\n" ``), and from that line on the scanner lost its quote state. The fix: the title now names the row by index, with a comment saying why. The lint and the unit suite pass (64/64), and fast gate iteration 2 is green.

### QA Loop Limit Reached — 2026-10-28

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (gate 5, head `0c11216f`; cycle 5's fix `195ea1d9` is ungated)
**HIGH findings per cycle**: 0, 0, 0, 0, 0 (medium 1, 1, 1, 1, 1)

**Remaining issues** (from gate 5; both fixed in `195ea1d9`, not yet gated):

- TASK-240-QA-6, medium, `shared/resources/open-coverage.js`. Wide spacing after a dash misplaced an entry's keys, giving a false 0 (bug.5, now Ready for QA).
- TASK-240-QA-7, low, `shared/resources/open-coverage.js`. The header had drifted from the code.

**What was attempted per cycle**:

| Cycle | Bug | What was wrong | Fix |
| --- | --- | --- | --- |
| 1 | bug.1 | Wrapped values under non-deciding keys read `unreadable` | Accept wrapped values (`a98f5470`) |
| 2 | bug.2 | A quote opened on the line after an empty value hid a key | A nested opener must close on its line (`46146a35`) |
| 3 | bug.3 | The opener scan missed openers behind a prefix | Replaced by a character rule, `NESTED_OPENER` (`32065fbf`) |
| 4 | bug.4 | An escape in a deciding value was read literally | A deciding value refuses escapes (`0c11216f`) |
| 5 | bug.5 | Wide spacing after a dash misplaced keys | The key column is measured (`195ea1d9`) |

- Route 2c (gate-the-last-fix half-cycle) was considered and declined. The reason was `medium-not-falling`: MEDIUM read 1, 1, 1 over cycles 3–5.
- Every cycle's finding was re-rated, or rated, medium on the same measurement: 0 of 187 tracked reports carry the shape, and no writer emits it.

**Likely root cause**: this is not a stall on one defect. Each cycle fixed its finding (mutation-proven, corpus unchanged, CI green), and each refute pass then found one more hand-picked YAML shape where the reader and YAML disagree. A strict hand-written YAML subset reader has a long tail of such shapes. None of them occurs in practice: no tracked report and no writer produces any of the five. What the loop lacks is a mechanism that searches that tail systematically. Gate 5 carries it as CR-6, a differential test against PyYAML.

**Recommended next steps**:

1. Add a differential test (CR-6). It would generate small findings blocks (spacing, quoting, escapes, nesting, flow), compare the reader with PyYAML, and assert that the reader never prints a count PyYAML disagrees with. Fix what it finds, then re-run `/develop-task` and resume at 5a. One more gate would read cycle 5's fix.
2. Or accept the current state: run `/review-pr --effort medium --comment --no-code`, then `/finalise`. Record the residual risk as "contrived YAML shapes no writer emits".
3. Decide the pre-existing items routed to future (case-blind keys, a flow key with no space after the colon), which the base awk shares.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 1. TASK-240-QA-1 (medium): a wrapped value under a non-deciding key reads unreadable (BUG-1).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: `open-coverage.js` now accepts a value that wraps onto deeper lines under any key except `category`/`provenance`. A wrapped plain line that reads as `key: ` is refused. A quoted value runs to its closing quote, and a quote still open at the key indent or at the end of the block is refused. It has 9 unit cases and 4 parity rows. M5–M8 each went red. Corpus: 0 changes. `ci:fast`: green.
**Commit**: `a98f5470`

### QA Cycle 2 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 1. TASK-240-QA-2 (medium): when an empty value is followed by a quoted value on the next line, a key line inside the quote is hidden, giving a false 0 (BUG-2). BUG-1 was verified fixed and is closed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: Step 2.6 consolidate move. A nested value under an empty key must close each quoted scalar or flow collection on the line where it opens; otherwise it is refused (`nestedLine()`). bug.2's shape now reads `unreadable`. 3 unit cases and 1 parity row were added. M9–M11 each went red. Corpus: 0 changes. `ci:fast`: green.
**Commit**: `46146a35`

### QA Cycle 3 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 2 issues. TASK-240-QA-3 (medium): the nested opener check misses an opener behind a prefix or inside a flow collection, giving a false 0 (BUG-3). TASK-240-QA-4 (low): a false `unreadable` on a quoted `#`. BUG-2 is fixed for its own shape.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: Replace move. The nested opener scan was replaced by a character rule, `NESTED_OPENER`. The four bug.3 shapes now read `unreadable`, and QA-4 is resolved by design. 8 unit cases and 4 parity rows were added. Mutants M9 and M12–M15 all went red. Corpus: 0 changes. `ci:fast`: green.
**Commit**: `32065fbf`

### QA Cycle 4 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 1 issue. TASK-240-QA-5 (medium): an escape in a deciding value is read literally, giving a false 0 (BUG-4, present since `c054f8f4`). BUG-3 verified fixed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: Consolidate move: one `strict` rule now refuses an escape in every value the count compares (flow entries, `category:`, `provenance:`). Added 3 unit cases and 2 parity rows. M16 and M17 both red. Corpus: 0 changes. `ci:fast`: green.
**Commit**: `0c11216f`

### QA Cycle 5 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 2 issues. TASK-240-QA-6 (medium): an entry's keys were assumed at dash + 2, so a wide-dash block that YAML rejects reads a false 0 (BUG-5, present since `c054f8f4`). TASK-240-QA-7 (low): header drift. BUG-4 verified fixed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: Loop route: continue (medium-not-falling) — MEDIUM reads 1, 1, 1 over cycles 3–5 — route 2c needs it strictly falling, or 0 on the last gate, which is the evidence that one more gate would clear.
**Action**: Escalating — loop limit reached
**Fixes Applied**: the key column is now measured (`keyIndent`) and the header is reworded. Added 1 accepted case, 2 refused cases and 2 parity rows. M18 turns 5 tests red. Corpus: 0 changes. `ci:fast`: green. No gate reads this fix, because the budget is spent.
**Commit**: `195ea1d9`

---

## Completion

**Finished**: 2026-10-28 (halted at the QA loop limit)
**Final Status**: Escalated
**Branch**: feature/task.240.open-coverage-fail-closed-reader
**PR**: #776 — https://github.com/Gamaroff/agent-skills/pull/776
**QA Iterations**: 5 (loop limit)
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
