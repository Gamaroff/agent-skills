# Implementation Report: review-pr eval suite

**Task**: `task.185.review-pr-eval-suite.md`
**Run Number**: 1
**Started**: 2026-10-05 16:59
**Status**: In Progress

---

## Summary

Run 1 of the develop-task pipeline for task 185: deterministic `/review-pr` report numbering (obs #272), shared eval-harness extensions (setup hook, fake `gh`, repeat runner), and four `/review-pr` eval scenarios.

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
| Board status        | In Progress ✅ (gh-stage: Todo → In Progress, verified)                     |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.185.*` exists in git                              | Branch created at `c0faf152`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.185.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 9/10; Planned → Ready for Development; `task.185.review.1.review-pr-eval-suite.md` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 23/23 plan boxes; ci:fast 5339/0 fail; live N=5 20/20 | `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.185.qa.{N}.*.md`; `task.185.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.185.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-05

- Feature branch base: develop — recommended default; session started on `develop` (user confirmed).
- PR target branch: develop — recommended default (user confirmed).
- qa-planning gate: skipped (auto — no prompt)
- Upfront questions asked: 2 (Q1 branch base, Q2 PR target) — matches the required count.
- Phase 0 run inline: path given directly, so no resolver; lite-mode inputs derived by hand — risk_level absent (risk_ok true), phase_count 4 (not < 3), single_module false (runner, skill, evals) → PIPELINE_MODE standard.
- Tracker: GitHub (`JIRA_URL` unset), issue #573 (OPEN). Tracker poller not dispatched — no PR exists yet.
- Task status `Planned` → proceed; Step 2 `/review-task` promotes.
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Step 1: branch `feature/task.185.review-pr-eval-suite` from `develop` (`c0faf152`); report stashed and restored. Lock written at step 2.
- Tracker #573: work-started comment `posted`; board work-started → transitioned Todo → In Progress (verified). Priority P2 default block not run — task already carries `priority: Medium`.
- review-task invoked (no prior report); output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously.
- Review report: docs/tasks/task.185.review-pr-eval-suite/task.185.review.1.review-pr-eval-suite.md — 0 Critical, 3 Important, 2 Optional, all applied. Planned promoted to Ready for Development by review-task.
- Pre-pass: B `drift` (3 low, axes source `architecture`), C `not-implemented`. Mermaid checked inline; `mermaid-architect` not invoked (independence loss).
- Review outcome comments posted to GitHub issue #573 (`review-task` and `review` stages).
- Pre-develop surface map: 19 files identified in evals/shared (runner, assertions, drivers, lib, tests), skills/review-pr (SKILL.md Step 7, scripts, tests), package.json, .gitignore, docs (evals README/reference.md, tech-stack.md), CHANGELOG. Map notes: assertions are `{fn, args}`; no existing test spawns runner.mjs; the eval layer table lives in `docs/contributing/evals/reference.md`, not the README.
- Plan file found: docs/tasks/task.185.review-pr-eval-suite/task.185.plan.review-pr-eval-suite.md — included as implementation context for /develop.
- Always-loaded files: 3 (coding-standards, tech-stack, source-tree).
- Step 3 inline — /develop not invoked: plan file names every hunk and the surface map is recorded; the inline path owes /develop's Task Completion Checklist and writes the one Change Log row.
- Fast gate precondition: `develop.fastGateCommand` unset → default `npm run ci:fast`, which `npm run` lists — precondition passes.
- Baseline before harness changes: `/usr/bin/time -p npm run eval:all` → real 4.77 s, 39 scenarios pass (on the branch before Phase 2; Phase 1 does not touch eval:all).
- Phase 1: `next-report-number.sh` + Step 7 call + 15 tests (bash and zsh). Mutation: count + 1 → 6 tests red. Tree measure: all 90 tracked work-item dirs with `.pr-review.` reports get existing max + 1, no mismatch.
- Phase 2: runner `setup`/`cliArgs`/`liveAssertions`, `noFileMatching`, `git-sandbox` `dir`, claude-cli `cliArgs`/`EVAL_TIMEOUT_MS`, `fake-gh.mjs`, `repeat.mjs`; 4 new/extended test files. Six mutants (fake gh accepts `pr comment`; liveAssertions under replay; PATH appended not prefixed; no empty call log; cleanup deletes a caller-owned dir; noFileMatching not recursive) each turn a test red. `evals/shared/tests`: 583 pass. `eval:all` after Phase 2: 39/39.
- Isolation check: in a built sandbox, `GH_CONFIG_DIR=<sandbox>/.eval/gh-config GH_TOKEN= /usr/local/bin/gh auth status` → "You are not logged into any GitHub hosts" — the real `gh` is unauthenticated there.
- First live run failed in 7 s: the nested `claude` used this shell's `ANTHROPIC_API_KEY`, whose account returned "Credit balance is too low" on stdout while stderr showed only a connectors warning. Fix: live runs use `env -u ANTHROPIC_API_KEY` (claude.ai login); the claude-cli driver's error now includes stdout. Documented in both READMEs.
- Live run 2 of 01 (164 s): report written at `.pr-review.1.`, but REQUEST CHANGES — the reviewer found a real FIXTURE defect: `node --test src/` runs only `src/index.js`, so the trail's "3 tests pass" was false (CR-1 high/high). Also CR-3 (input validation, medium/low) and PC-1 (`pr_number` missing, low). And `gh --version` was logged unhandled. Fixes: fixture test script `node --test src/*.test.js` (verified 4/4 pass in a built sandbox), `isAdult` validates its input with a test (AC-4), `pr_number: 901` in the doc, fake gh answers `--version`/`version` (+ test). The happy fixture is now one where APPROVE is the honest verdict.
- Live sanity run (1 per scenario, parallel): 01 6/6 (159.8 s), 02 7/7 (162.4 s), 03 4/4 (122.8 s), 04 6/6 (179.4 s). 04 was caught by both lenses (PC-1 on AC-1, CR-1 at `src/age.js:8`). No refused/unhandled `gh` call. Replay golden output trimmed from these reports (01 `.1.`, 02 `.4.`, 04 `.1.`; 03 has none).
- Scenario-assertion mutants (replay, hermetic): a refused `pr comment` line in the log → 01 fails; 02's report renamed `.2.` → 02 fails; a `.pr-review.` file under docs/ → 03 fails; 04's verdict flipped to APPROVE → 04 fails. All restored; replay 4/4.
- Testing Strategy deviation: "make the fake gh accept `pr comment` and confirm the no-refused-call assertion still catches a posting run" cannot hold as worded — an accepting fake logs no refusal. Split into two proofs: the fake-gh unit test goes red when `comment` is accepted, and a posting run (a refused line) fails the scenario.
- Decision: `.gitignore` unchanged — no `fixture/` tree is committed (setup builds fixtures at run time); replay trees are covered by the existing negation (`git check-ignore -v` → `!evals/**/replay/**`).
- **Live verification (success criterion).** `env -u ANTHROPIC_API_KEY DRIVER=claude-cli node evals/shared/repeat.mjs evals/review-pr/scenarios/<s> --runs 5` per scenario (scenarios in parallel, runs sequential). Results: **01-happy 5/5 (min 4)**, **02-renumber-gap 5/5 (min 5)**, **03-unanchored 5/5 (min 5)**, **04-planted-bug 5/5 (min 4)**. Every run passed every assertion, including "no refused / unhandled `gh` call" and the live `pr view` assertion. Wall time per scenario (5 runs): 01 731 s, 02 790 s, 03 460 s, 04 887 s — about 92–177 s per run, all inside the default 5-minute `EVAL_TIMEOUT_MS`.
- **Live mutation of Step 7 did NOT go red.** With `skills/review-pr/SKILL.md` restored to `develop`'s prose rule ("starts at 1 and increments on re-review") and the script moved aside, 3 live runs of 02 each wrote `.4.` and kept both sentinels (7/7). The model applies highest + 1 by itself today, so scenario 02 checks the *outcome* and cannot tell the script from the prose. The script is held by its unit tests (count + 1 mutant → 6 red). Scenario 02 still guards the guarantee against a future regression in either mechanism. Testing Strategy expected red here; recorded as a deviation, not hidden. Restored and verified: Step 7 cites the script, tests 15/15.
- `eval:all` after: `/usr/bin/time -p npm run eval:all` → real 7.59 s and 7.92 s (two runs, idle machine), 43 scenarios pass (39 + 4). Growth +2.8–3.2 s against the 4.77 s baseline — under the 10 s bound.
- Fast gate: `npm run ci:fast` → TEST_EXIT=0, 5339 tests, 0 fail. The changed suites and the review-pr replay scenarios were re-run with the gitignored `.agents/skills` symlink moved aside: 845 pass, 4/4 scenarios.
- Loop audit iteration 1: `{"status":"ready-for-review","completed":23,"total":23}`, so the loop exits after one iteration. The task doc now has an Implementation Summary, an accurate Files Summary (the layer table lives in `reference.md`) and one Change Log row: "Implemented — 28 files, 37 new tests".
- Development completion comment posted to GitHub issue #573 (`develop-complete`, count=23).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.185.review-pr-eval-suite
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
