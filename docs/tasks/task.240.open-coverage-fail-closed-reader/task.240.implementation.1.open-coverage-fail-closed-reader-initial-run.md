# Implementation Report: Fail-closed reader for the 5c open-coverage check

**Task**: `task.240.open-coverage-fail-closed-reader.md`
**Run Number**: 1
**Started**: 2026-10-28 16:05
**Status**: Completed

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
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.240.qa.{N}.*.md`; `task.240.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 9 cycles. Escalated at 5 and at 7, re-entered each time (budget 9). Gate 9 PASS (100); 5c CONCERNS, `OPEN_COVERAGE=0` (`task.240.pr-review.1`) | —                    | 2026-10-28T18:08Z |
| 7. finalise                | ✅ Done    | `task.240.dod.{N}.*.md`; task `status: accepted`                       | `task.240.dod.1` ACCEPTED; `4d61b657`; CI reading 2 SUCCESS (tree-equivalent); #771 closed | —                    | 2026-10-28T18:16Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report only (`docs(task.240)` commit) | —                    | 2026-10-28T18:17Z |

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
- QA loop re-entry (2026-10-28, user-approved): 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk. `grant-qa-cycles.sh` → `QA_CYCLE=5 extra_cycles_granted=2 qa_max_cycles=7 reenter_at=5a`. Between the halt and the re-entry, the operator applied the escalation's recommended step 1 by hand: commit `22bdc3e9` adds the PyYAML differential test (CR-6) and six more refusals. It wrote no gate, so it is not a cycle. The halt had not removed the lock and wrote no snapshot; the lock's stale `waiting_on` (5a qa-task code review, since 15:24Z) was cleared with `set-waiting-on.sh --clear`. Gate 6 reads `195ea1d9` + `22bdc3e9`.
- Gate 6 (scoped: 12 files since `0c11216f`; reviewer ran 16:21:56Z–16:26:36Z): CONCERNS, HIGH 0 and MEDIUM 3. All three promoted findings were reproduced against PyYAML 6.0.3, and corpus hits were 0 of 168 readable blocks. Severities were kept: review-pr is a model writer, so "no writer emits it" does not hold. In every finding the reader prints the count the writer meant; what breaks is the fail-closed contract. Convergence check: HIGH sequence all zeros, not tripped. Route classifier: `continue` (`not-a-pass-gate`; route 2 declined with `product-defect-signal`) → 5b.
- QA Cycle 6 — changes-requested: `stage-disabled`.
- Narrowing offer: not signalled (`medium-files-differ`). The MEDIUMs over cycles 5–6 name `open-coverage.js` and `open-coverage-differential.test.mjs`.
- Third-strike rule: not applicable (HIGH 0).
- qa-fix cycle 6: the fast gate was green on attempt 1 (6,680 pass, 0 fail). Commit `5f69c201` carries the fix, gate.6, qa.6 and bugs 5–8. Pushed once; the PR is OPEN. BUG-7 was fixed by refusing an indicator-led value under every key, the reverse of the bug's first recommendation. The reason was a measurement: about 1,140 free-text values, 1,092 quoted, none indicator-led.
- Gate 7 (scoped: 13 files since `22bdc3e9`; the reviewer was dispatched at 16:44:42Z, `duration_ms` 210,496): CONCERNS, HIGH 0, MEDIUM 2. The QA hand probe (34 shapes) found BUG-9. The reviewer's CR-1 became BUG-10, and its CR-2 is the low. Both were reproduced against PyYAML, with 0 corpus hits. BUG-6, BUG-7 and BUG-8 were closed. CI pending at 5f69c201. Convergence: not tripped. Route: `continue` (`not-a-pass-gate`). Narrowing: not signalled (`medium-files-differ`).
- qa-fix cycle 7: the generator was widened first, red on 92 of 25,000. The fast gate was green on attempt 1 (6,688 pass, 0 fail). Commit `443e4f6d` carries the fix, gate.7, qa.7 and bugs 6–10. Pushed once; the PR is OPEN.
- Loop limit at cycle 7: route 2c declined (`medium-not-falling`, 1, 3, 2), so the loop escalated (Issues Log, second entry).
- After the second halt (2026-10-28, user-approved), the operator applied the escalation's recommended step 1 in session: the reader now reads one line per key over an allow-listed character set, instead of refusing named shapes. It wrote no gate, so it is not a cycle; a re-entry at 5a gates it with `443e4f6d`. Measured first: the 168 readable tracked blocks use only one-line keys, and their unquoted values hold `§`, `—`, backticks, `|`, `"`, `bundle:check` and `PR #657` (a comment in YAML), so the plain-value rule follows YAML's one-line rules (letter, digit or non-ASCII first; no `: `; ` #` starts a comment) rather than a narrow ASCII set. SC-4: 187 of 187 reports read the same. The author approved amending the Target Architecture and SC-2: 10 parity fixtures in flow, nested, block-scalar or wrapped shapes now expect `unreadable`; 3 whose point is "keys count only in key position" keep their count with the free text quoted, and a new case pins the plain form as `unreadable`. None changes from one count to another. The differential generator was re-aimed at characters and one-line value forms. On the old reader it found 194 wrong counts in 25,000 blocks, including three new classes: `reviewed_gate: a: b`, control characters, and a no-break space after `pre-existing` read as pre-existing (a false 0). New reader: 7 seeds × 25,000, 0 disagreements; the gate-7 hand probe, 0 wrong (22 of 34 over-refused). Mutations M28–M35 are each red. M35 (flow guard off) is caught by the unit reasons only, since a flow entry is still refused as not-a-map.
- QA loop re-entry (2026-10-28, user-approved via `/develop-task … resume at 5a with 2 more cycles`): 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk (7 gates, 7 `### QA Cycle` entries). `grant-qa-cycles.sh` → `QA_CYCLE=7 extra_cycles_granted=2 qa_max_cycles=9 reenter_at=5a`; lock restored from the halt snapshot. Gate 8 reads `443e4f6d` + `149f9235` (the allow-list reader).
- Gate 8 (scoped: 16 files since `5f69c201`; reviewer 17:41:46Z–17:48:31Z, `duration_ms` 376,663): CONCERNS, HIGH 0, MEDIUM 1 (TASK-240-QA-14, BUG-11: lenient UTF-8 decode in the CLI). Reproduced against PyYAML 6.0.3; 0 of 187 corpus reports hold invalid UTF-8; severity kept. The parser held: 54-shape hand probe 0 wrong, differential seeds 3/17/777/8080/31337 × 25,000 green, 4 worktree mutations each red. BUG-9 and BUG-10 closed. CI green on `afccc788`. Convergence: HIGH all zeros, not tripped. Route: `continue` (`not-a-pass-gate`; route 2 declined `product-defect-signal`) → 5b. `boundary: internal` kept: a filename-sink probe of the CLI scored that sink's own contract, so its record was discarded.
- QA Cycle 8 — changes-requested: `stage-disabled`.
- Third-strike rule: not applicable (HIGH 0).
- Narrowing residue — every MEDIUM on gates 7 and 8 names shared/resources/open-coverage.js (TASK-240-QA-11, TASK-240-QA-12, TASK-240-QA-14); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation. The mechanism differs from gates 1–7: the CLI's file decode, not the parser.
- qa-fix cycle 8: the findings ingester was not dispatched. The gate's one finding was written by this session minutes earlier, so it was read inline. **No independent ingest ran.** `pr_review`: none (selector `none`). `fix_cycle` was derived from the gate (8). Step 2.6 move: consolidate. Step 3.5 probe (phrases `readFileSync(file, "utf8")`, `bad-encoding`, `lenientFreeText`): 4 hits, all unrelated `node -e` readers, unaffected. The fast gate was red on attempt 1 (`format:check`, the new test rows) and green on attempt 2 after Prettier (6,710 pass, 0 fail). Commit `a3b9c0d0` carries the fix, gate.8, qa.8, bug.11, and bugs 9–10 closed. Pushed once; the PR is OPEN at `a3b9c0d0` (read with `gh pr view` directly, not the poller agent).
- QA cycle 9 ran from the qa-task instructions already loaded, without re-invoking the skill. Gate 9 PASS (100), with no open entry. bug.11 closed. Committed `966aba75` (gate 9, qa.9) and pushed; the trail assertion passed. 5c: `/review-pr --effort medium --comment --no-code` gave CONCERNS, `OPEN_COVERAGE=0`, review comment https://github.com/Gamaroff/agent-skills/pull/776#issuecomment-6476805470. Carry: bugs 2–4 closed, and the task document's § 5 and Implementation Notes fixed. The loop exited through route 1.
- DoD summary: `task.240.dod.1.open-coverage-fail-closed-reader.md`. ACCEPTED: AC PASS (11/11), security PASS (`boundary: internal`), compliance N/A, docs PASS. The host requires no review, so that column is met by `task.240.pr-review.1`.
- CI reading 1: SUCCESS @ `966aba7584de` (6 checks); CI reading 2: SUCCESS (tree-equivalent to `a3b9c0d051cc`) @ `4d61b65760e7` (the acceptance commit; everything after `a3b9c0d0` is docs-only).
- Acceptance commit `4d61b657` (`docs(task.240): accept — DoD, sprint review; registry ticked; 5c review carried`), pushed; 6b assertions passed; 6d: CHANGELOG cites task 240.
- DoD body posted to PR: https://github.com/Gamaroff/agent-skills/pull/776#issuecomment-6476993564 (the canonical summary).
- Issue close: #771 `done` comment `posted`, closed, state confirmed CLOSED. The Document link was unchanged (it already points at a durable target).
- Board transition: `gh-stage.js --stage done` gave `already` (the card was already at Done).
- Task completed: `status: accepted`, Change Log 1.3, registry row `ticked`.
- Not done, out of this task's scope: review-pr's template writes `finding:` and `suggested_action:` unquoted, and a sentence holding `: ` written there now halts 5c as `unreadable`. None of the 30 unquoted ones in the corpus does. Quoting both in the template is a follow-up.

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

### QA Loop Limit Reached — 2026-10-28 (after the granted re-entry, cycles 6–7)

The pipeline completed 7 qa-task/qa-fix cycles (5 plus 2 granted) without a clean PASS.

**Final gate status**: CONCERNS (gate 7, head `5f69c201`; cycle 7's fix `443e4f6d` is ungated)
**HIGH findings per cycle**: 0, 0, 0, 0, 0, 0, 0 (medium 1, 1, 1, 1, 1, 3, 2)

**Remaining issues** (from gate 7; all fixed in `443e4f6d`, not yet gated):

- TASK-240-QA-11, medium, `shared/resources/open-coverage.js`. A whitespace-only line holding a tab was skipped as blank (bug.9, now Ready for QA).
- TASK-240-QA-12, medium, `shared/resources/open-coverage.js`. A plain flow value holding a bracket was accepted (bug.10, now Ready for QA).
- TASK-240-QA-13, low, `shared/resources/tests/open-coverage-differential.test.mjs`. The flow generator emitted no bracket (bug.10).

**What was attempted per cycle** (cycles 1–5 are in the entry above):

| Cycle | Bug | What was wrong | Fix |
| --- | --- | --- | --- |
| 6 | bug.6–8 | A comment inside a wrapped value and an indicator-led value got a count; the generator reached neither | Generator widened first (red on 542 of 25,000), then both refused, and tabs refused (`5f69c201`) |
| 7 | bug.9–10 | A tab-holding blank line and a bracket in a plain flow value got a count | Generator widened first (red on 92 of 25,000), then both refused (`443e4f6d`) |

- Route 2c was considered again and declined: `medium-not-falling`, with MEDIUM at 1, 3, 2 over cycles 5–7.
- The narrowing-residue offer was not signalled at cycle 6 or 7 (`medium-files-differ`).
- The differential test recommended by the first escalation now exists and works. It caught every shape class it was taught, and each fix was red before it landed. But both granted cycles still found new classes outside its grammar: the hand probe found one, the code reviewer another.

**Likely root cause**: the reader is a deny-list. It accepts a YAML subset and refuses each shape someone names, and so does its generator. Ten bugs, each in a different shape class, show that this tail does not end on review. Two facts bound the risk. First, every wrong count matched what the writer meant: no bug misplaced a deciding key in a block a real writer produced. Second, none of the ten shapes occurs in the 187 tracked review reports, where free text is quoted (1,092 of about 1,140 values).

**Recommended next steps**:

1. **Structural move (recommended): turn the deny-list into an allow-list.** Accept a plain value only from a narrow character set, such as `[A-Za-z0-9 _./()'-]`, and only in the line shapes review-pr's template emits. Everything else, including quoted text, takes the quoted path or reads `unreadable`. Then a new shape class fails closed by construction, and the differential suite checks the narrow grammar instead of chasing its tail. Measure first that every tracked report still reads the same. Do this as its own task, or as a re-entry.
2. Accept the current state: run `/review-pr --effort medium --comment --no-code`, then `/finalise`. Record the residual risk as "YAML shapes no writer emits". The cycle-7 fix is ungated, but it is mutation-proven and CI runs on it.
3. Re-run `/develop-task` with more cycles. This is not recommended: the evidence says each cycle finds one more class.

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

### QA Cycle 6 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 3 medium. TASK-240-QA-8: a comment inside a wrapped plain value is accepted (BUG-6). TASK-240-QA-9: a value starting with an indicator is read as plain (BUG-7). TASK-240-QA-10: the differential generator cannot produce either shape (BUG-8). Plus 3 low items in `future` (CR-4, CR-5, CR-6). BUG-5 verified fixed and closed.
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 6 of 7)
**Fixes Applied**: The differential generator was widened first (BUG-8). The unchanged reader then disagreed with PyYAML on 542 of 25,000 blocks, in all three classes. Reader changes: a comment ends a wrapped plain value or a nested plain scalar (BUG-6). A value that starts with an indicator is refused under every key, the reverse of the bug's first recommendation, decided after measuring the corpus: 0 such values, 1,092 of about 1,140 free-text values quoted (BUG-7). A tab outside a block scalar is refused (CR-4). A floor of N ≥ 1000 (CR-5). Added 16 refused and 4 accepted unit rows. M19–M25 each red. Differential suite: 5 seeds × 25,000, 0 disagreements. `ci:fast`: 6,680 pass. CR-6 (`python3 -I`) remains in `future`.
**Commit**: `5f69c201`

### QA Cycle 7 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 2 medium, 1 low. TASK-240-QA-11: a whitespace-only line holding a tab is skipped as blank (BUG-9, from the QA hand probe). TASK-240-QA-12: a plain flow value holding a bracket is accepted (BUG-10, code review CR-1). TASK-240-QA-13 (low): the flow generator never emits a bracket (CR-2). BUG-6, BUG-7 and BUG-8 are verified fixed and closed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: The generator was widened first: whitespace-only lines, 10% of them holding a tab, and flow values with a bracket. On the unchanged reader it was red on 92 of 25,000 blocks. Then the reader refuses a tab-holding blank line (BUG-9) and a bracket in a plain flow value (BUG-10). Added 6 refused and 2 accepted unit rows. M26 and M27 each red. Differential: 7 seeds × 25,000, 0 disagreements. `ci:fast`: 6,688 pass. Route 2c declined (`medium-not-falling`). No gate reads this fix.
**Commit**: `443e4f6d`

### QA Cycle 8 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 1 medium. TASK-240-QA-14: the CLI decodes the report leniently, so an invalid UTF-8 byte becomes U+FFFD and the block still counts where PyYAML raises ReaderError (BUG-11, code review CR-1). 2 low cleanups in `future` (CR-2, CR-3). BUG-9 and BUG-10 verified fixed and closed. The allow-list parser: 54-shape hand probe 0 wrong, 5 new differential seeds × 25,000 green, corpus distribution unchanged.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 8 of 9)
**Fixes Applied**: Step 2.6 consolidate move. The UTF-8 decode moved inside `countOpenCoverage`, which now takes the report's bytes and decodes them with a fatal `TextDecoder` (`ignoreBOM` keeps valid input byte-identical); an invalid sequence is the new reason `bad-encoding`, and the CLI reads bytes (BUG-11). Gate 8 CR-2 (differential test header) fixed too. Added 4 byte-level refusal rows, a bytes-equal-text row and a CLI case. M36 (lenient decode in the reader) 5 red; M37 (`utf8` read in the CLI) 1 red. Corpus: 187 reports, distribution unchanged. `ci:fast`: attempt 1 red on `format:check` for the test file, attempt 2 green after Prettier (6,710 pass, 0 fail).
**Commit**: `a3b9c0d0`

### QA Cycle 9 — 2026-10-28
**Gate Result**: PASS
**Issues Found**: none open. BUG-11 verified fixed and closed. 2 low cleanups in `future` (CR-1: a non-view byte container reads `no-section`; CR-2: `ignoreBOM` not pinned on the bytes path). Reviewer: fatal decoder vs Python strict UTF-8 over 862,998 sequences identical; 15 byte injections and 18 input types, no false count.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: ⚠️ CONCERNS — `task.240.pr-review.1.open-coverage-fail-closed-reader.md` (conformance lens only, `--no-code`; `OPEN_COVERAGE=0`). 4 medium (PC-1–PC-3: bugs 2–4 never closed; PC-5: § 5 claimed the review-pr template emits no `: ` free text), 3 low (PC-4, PC-6, PC-7). Summary comment posted to PR #776.
**Loop exit**: 5c route 1 (gate 9 PASS, no open entry). CONCERNS with no open coverage finding, so the loop exits to Step 7
**Action**: Proceeding to 5c (PR conformance review)
**Carried to 6a**: task.240.pr-review.1 report; bug.2, bug.3 and bug.4 closed (they cite qa.3, qa.4 and qa.5); task document § 5 corrected (PC-5), and Implementation Notes for cycles 6–8 and version 1.2 added, with cycles 1–5 marked superseded (PC-6)
**Recorded, not fixed at 5c**: PC-4 (this report's header, Steps 5–6 row and Completion; Step 8 owns them); PC-7 (the differential test is not in Files Summary; its `ref` is a test path, outside the doc-only patterns). Follow-up: quote `finding:` and `suggested_action:` in the review-pr template (PC-5)

---

## Completion

**Finished**: 2026-10-28T18:17Z
**Final Status**: Completed
**Branch**: feature/task.240.open-coverage-fail-closed-reader
**PR**: #776 — https://github.com/Gamaroff/agent-skills/pull/776
**QA Iterations**: 9 (base budget 5, plus 2 cycles granted after each of the two escalations)
**DoD Summary**: `task.240.dod.1.open-coverage-fail-closed-reader.md` — ACCEPTED
**Tracker debt**: none

**Completion Summary**: Implemented `shared/resources/open-coverage.js`, a fail-closed reader that
replaces the §5c open-coverage awk with one `command node` call. It took 9 QA cycles. Cycles 1–7
fixed shape after shape in a lenient parser, and the loop escalated twice. After the second
escalation, the author approved narrowing the reader to one line per key over an allow-listed
character set (version 1.2). Cycle 8 then closed the last gap, a lenient UTF-8 decode, by decoding
the report's bytes strictly. Gate 9 passed at 100 with no open entry. The 5c review was CONCERNS
with no coverage finding, and its doc-only findings rode the acceptance commit. 11 bugs were filed
and closed. One follow-up is recorded: quote `finding:` and `suggested_action:` in the review-pr
template (PC-5).
