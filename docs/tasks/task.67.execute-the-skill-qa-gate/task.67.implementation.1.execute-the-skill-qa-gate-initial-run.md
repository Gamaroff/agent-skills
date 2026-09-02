# Implementation Report: Make QA execute a prose skill, not only read it

**Task**: `task.67.execute-the-skill-qa-gate.md`
**Run Number**: 1
**Started**: 2026-08-31 21:22
**Status**: In Progress

---

## Summary

Add an execution gate to `qa-task`/`qa-story` so a skill whose deliverable is runnable prose has its documented commands actually executed before the gate can reach PASS.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto — develop-next autonomous run)                                                                                   |
| PR target           | `develop` (auto — develop-next autonomous run)                                                                                   |
| qa-planning gate    | skipped (auto)                                                                                                                   |
| Task risk level     | medium                                                                                                                           |
| Pipeline mode       | standard                                                                                                                         |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                                                                            |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.67.*` exists in git                               | `feature/task.67.execute-the-skill-qa-gate` created at `556a078` from `develop` | —                    |
| 2. review-task             | ✅ Done    | `task.67.review.{N}.{name}.md` exists (or skip logged)                 | `task.67.review.1.execute-the-skill-qa-gate.md` — READY TO IMPLEMENT, 8/10; 1 critical + 3 important + 3 optional; 7 fixes applied, 0 skipped | 2 pre-pass Explore agents (alignment=drift, impl=not-started) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 5 phases implemented. 41 unit tests, 9 mutation proofs (all held). 5 engine defects found by dogfooding on real skill files, each fixed with a regression test. | Pre-develop surface map (1 Explore agent) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #289: https://github.com/Gamaroff/agent-skills/pull/289 — commit `2e7aa94`, 20 files, no out-of-scope leak. Issue comment skipped (no tracker issue linked). | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.67.qa.{N}.*.md`; `task.67.gate.{N}.*.yml`; PR comment posted     | 2 cycles. Gate 1 FAIL (0/100, 18 findings) → qa-fix → Gate 2 **PASS (90/100)**, 0 blocking. | Step 3b code-review Explore agent |
| 7. finalise                | ✅ Done    | `task.67.dod.{N}.*.md`; task `status: accepted`                        | DoD **PASSED**. Gate found red CI, 2 prose-only criteria, and 14 further fail-open routes (BUG-3) — all closed. | 3 parallel DoD Explore agents (AC, security, docs+compliance) |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | 4 commits: `2e7aa94`, `a74c59a`, `de9dc8a`, `0c4c05f`. CI green on final head. | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-08-31

- Invoked by `/develop-next` (roadmap item **T67**, PHASE 5 — Current frontier, source `roadmap`, no deps).
- Phase 0a-parallel: resolver **not dispatched** (task path supplied and verified directly). Tracker poller **not dispatched** — frontmatter carries no `github_issue:`/`jira_key:`, so there is no tracker issue to poll. Lite-mode detector **not dispatched** — no lite-mode CLI is bundled in this build; inputs read directly from the task document.
- Pipeline mode: **standard** — computed from `risk_ok = (risk_level "medium" ∈ {low, absent}) = false`, `phase_count = 5` (≥3), `single_module = false` (touches `qa-task`, `qa-story`, shared resources and the eval harness). All three booleans fail; mode is standard regardless.
- Tracker: `TRACKER=github`, `TRACKER_ISSUE=""` (no `github_issue:` in frontmatter) — all tracker comment/board operations skipped for this run.
- Q1 Feature branch base: **`develop`** — auto-answered with the recommended option (develop-next autonomous directive; current branch was `develop`).
- Q2 PR target branch: **`develop`** — auto-answered with the recommended option (develop-next autonomous directive).
- Questions asked: 0 of 2 required (both auto-answered under the autonomous-run directive, which suppresses the `AskUserQuestion` call).
- qa-planning gate: skipped (auto — no prompt).
- Branch created: `feature/task.67.execute-the-skill-qa-gate` from `develop` at `556a078`. Implementation report stashed before branch creation, restored after (clean pop).
- Signal Work Started: **skipped** — no `github_issue:` linked, so there is no tracker issue to comment on or move.
- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. 7 applied, 0 skipped.
- review-task Step 9: **skipped** — status was already `Ready for Development`, so no promotion was needed.
- review-task Step 10 (tracker comment): **skipped silently** — no `github_issue:` in frontmatter.
- Tracker sync **declined** during review: creating a public GitHub issue is an outward-facing side effect and was not performed unprompted in an autonomous run. Recorded as assumption A3 in the review report.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (all verified present).

---

## Step 3 — Implementation Record

**Delivered**

| Kind | Path |
|---|---|
| Created | `shared/resources/qa-execute-snippets.mjs` — extraction, fail-closed classification, dual-shell execution; library + CLI (exit 0/1/2) |
| Created | `shared/resources/qa-runnable-prose-detection.md` — the detection rule, stated once |
| Created | `shared/resources/tests/qa-execute-snippets.test.mjs` — 41 tests incl. the task-66 regression fixture |
| Modified | `skills/qa-task/SKILL.md` — `### Step 4b`, between Step 4 and Step 5 |
| Modified | `skills/qa-story/SKILL.md` — `#### Phase 1.7`, after Phase 1.6 (that file is phase-numbered) |
| Modified | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — cross-reference only |
| Modified | `CHANGELOG.md` — Unreleased/Added entry |
| Regenerated | `skills/{qa-task,qa-story,develop-task,develop-story}/references/*` via `npm run bundle` |

`package.json` was **not** modified — the existing `'shared/resources/tests/*.test.mjs'` glob already
collects the new suite, as the Step 2 review established.

**Five engine defects found by dogfooding, not by the unit tests.** Running the finished engine against
real skill files (`review-pr`, `qa-task`, `qa-story` — the last two being files this very change set
edits) surfaced defects the hand-written tests had not. Each is fixed, with a regression test and a
mutation proof:

1. **`git` resolved fail-open** — the safe-subcommand check matched only the *first* `git …` in a block
   and applied that verdict to the rest, so `git rev-parse HEAD` followed by `git checkout -b x`
   classified **runnable**. A hole in the safety boundary, in the direction it exists to prevent.
2. `case` arm glob patterns (`*://*/pull/*`) read as unrecognised commands.
3. Command substitutions swallowed — `P=$(git remote get-url origin)` skipped as an assignment, then
   `remote` read as the command word.
4. Arithmetic expansion read as a command — `M=$((N + 1))` reported `N`.
5. Backslash line-continuations starting a new command — `-- \` + `apps packages` reported `apps`.

Before fixes 2–5, the engine classified **0 of 12** blocks in `review-pr/SKILL.md` as runnable — the
over-broad-classification risk named in the task's §10, live. The `zero-blocks-executed` safeguard fired
correctly throughout, which is the safeguard working; the cause was the tokenizer.

**Mutation proofs — 9 run, 9 held.** Each reverts a real behaviour in the source and confirms the
intended test goes red: fail-closed allow-list · stdout-vs-status comparison · `executeFile`'s shell
selection · skip-reason recording · per-occurrence `git` resolution · command-name filter ·
`$(…)` segment breaking · arithmetic expansion · line-continuation joining.

> One proof initially found **nothing**: hard-coding `executeFile` to `["bash"]` broke no test, because
> the regression tests passed `shells` explicitly and only exercised `runBlock`. The production entry
> point was unheld while the mechanism it calls was fully covered. Two `executeFile`-level tests were
> added and the mutation now goes red.

**One decision recorded, one question left open** — both in the task's Notes section: the
`zero-blocks-executed` confidence was set to `medium` (the task did not specify it; `high` would have
blocked this very PR), and the `execution-failure` confidence was left at `high` exactly as specified,
with the potential for noise flagged rather than silently redesigned.

**Repo guard caught a real slip.** `tests/test-harness-concurrency.test.js` failed the first full run on
a hard-coded `timeout: 300` in the new suite. It is now a named constant documenting why this particular
value is an input to the assertion rather than the load-sized spawn budget that guard defends.

---

## Regression Fixture Evidence (Step 3 — captured before implementation)

The task-66 defect reproduced locally, so the fixture asserts against measured behaviour rather than a
remembered description. Directory holds 6 of the 7 artifact kinds (`*.bug.*.md` absent).

**Pre-fix block** (multi-glob `ls`):

| Shell | stdout lines | exit |
|---|---|---|
| bash | **6** | 1 |
| zsh  | **0** (`zsh:2: no matches found: d/*.bug.*.md`) | 1 |

**Post-fix block** (`find … -name` per pattern): identical 6-line stdout, exit **0** under both.

> **Design consequence — exit status alone cannot catch this.** Both shells exit `1` on the pre-fix
> block. Only the **stdout** comparison separates them. The task already specifies "either shell exits
> non-zero, **or** the two shells disagree on stdout"; this measurement is why the second clause is
> load-bearing rather than belt-and-braces, and the mutation proof should target it.

---

## Issues Log

- **Step 2 (review-task) — task plan targeted the wrong files in three places.** All corrected in the task document during Step 8.5; none blocking.
  - `npm run bundle` was absent from the plan, and `validate.yml`'s Bundle freshness check would have failed the PR (Critical).
  - The detection rule was routed to `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, which is bundled into `develop-story`/`develop-task` but **not** into either QA skill (Important).
  - "Add Step 4b" has no insertion point in `qa-story`, which is phase-numbered and has no test-suite step (Important).
  - No `command -v zsh` guard; on a zsh-less CI host the "zero blocks executed is a finding" rule would fire as a false defect (Important).

---

## QA Iteration History

### Cycle 1 — 2026-08-31 — Gate: **FAIL** (0/100)

- Artifacts: `task.67.qa.1.*.md`, `task.67.gate.1.*.yml`, `task.67.bug.1.classifier-fails-open.md`, `task.67.bug.2.extraction-and-coverage-gaps.md`
- **8 HIGH / 4 MEDIUM / 6 LOW.** The classifier fails open in 13 independently verified ways; every
  high-severity finding was reproduced against the shipped module before being accepted.
- Containment to the temp working copy **disproven** — a canary written by an executed block appeared
  outside it. Three Safety success criteria unmet.
- Suite green throughout (2040 tests, 0 failures) with all 13 holes present.
- Step 4b ran against this change set and behaved correctly; with `--bind` it executed 5 real blocks
  under both shells with no findings. QA re-verified 4 of the 9 claimed mutation proofs — all held.
- Next: qa-fix cycle 1.

### Cycle 1 fix — 2026-08-31 — commit `a74c59a`

- All 8 HIGH + 3 of 4 MEDIUM + 4 of 8 LOW closed. Suite 41 → 61 tests; **16 mutation proofs, all held**.
- **Added a second line of defence rather than a fourteenth rule.** The original nine proofs all held and
  none touched the paths where the holes were — a mutation proof can only falsify a check that exists.
  Each block now runs in `work/` inside a private temp root; the runner compares that root before and
  after and reports any write outside the copy **without consulting the classifier**.
- **Two defects introduced by the fixes, found by the adversarial pass and reported rather than quietly
  repaired**: the sentinel first derived its boundary as `cwd/..` and walked all of `/tmp` twice per
  block (hung the suite past 118s); and the first redirect pattern matched `2>&1`, making this repo's
  own documented zsh guard unrunnable.
- **Two mutation proofs came back UNHELD and both were real.** `COMMAND_RUNNERS` was dead code (those
  commands were already off the allow-list) → a precedence test now makes it defend a plausible future
  edit. And finding L3's mechanism was wrong: `spawnSync` throws on NaN/negative timeouts; the actual
  hole is `--timeout 0`. Corrected in BUG-2 rather than accepted.

### Cycle 2 — 2026-08-31 — Gate: **PASS** (90/100)

- Artifacts: `task.67.qa.2.*.md`, `task.67.gate.2.*.yml`. BUG-1 and BUG-2 → **Closed**.
- QA re-ran the evidence: **0/14 holes still open, 0/6 legitimate blocks refused**; containment canary
  no longer escapes; 4 QA-side mutation proofs held; full suite 2060 tests, 0 failures.
- No new findings, no regressions. 6 LOW/MEDIUM deferred with rationale — chiefly L5, that eight tests
  including the task-66 fixture skip silently on a host without zsh.

---

## Completion Summary

**Every gate caught something the one before it had missed, and each miss had the same shape: asking
again the question that had already been answered.**

| Gate | Found |
| --- | --- |
| Step 2 review | Plan omitted `npm run bundle` — CI would have gone red; two findings pointed at files and headings that do not exist |
| Dogfooding during develop | 5 engine defects the unit tests missed, incl. `git` resolved fail-open |
| QA cycle 1 | **13 fail-open holes**; containment disproved by a canary written outside the temp copy — while the suite was green |
| QA cycle 2 | Confirmed all 13 closed |
| **DoD gate** | Red CI the local suite could not see; 2 criteria whose only evidence was prose; **14 further fail-open routes**, two of them deny-listed by name |

The task's own thesis — *a passing test is evidence about the test, not about the behaviour* —
reproduced itself at every level, including inside its own fix.

Twice a mutation proof came back **UNHELD** and both times it was right: once about dead code, once
about a finding whose stated mechanism was factually wrong. Both were corrected in the record rather
than quietly accommodated.

**Final numbers:** 36 attack inputs → 0 runnable · 18 legitimate patterns → 0 refused · 66 module tests
+ 10 contract tests · 2075 repo-wide, 0 failures · 21 mutation proofs, all held · CI green.

---

## Completion

**Finished**: 2026-09-01
**Final Status**: Completed
**Branch**: `feature/task.67.execute-the-skill-qa-gate`
**PR**: [#289](https://github.com/Gamaroff/agent-skills/pull/289)
**QA Iterations**: 2 (gate 1 FAIL → qa-fix → gate 2 PASS), plus one DoD-gate fix cycle
**DoD Summary**: [`task.67.dod.1.execute-the-skill-qa-gate.md`](./task.67.dod.1.execute-the-skill-qa-gate.md) — **ACCEPTED**
**Tracker debt**: none — task 67 has no linked tracker issue, so no board or issue actions were owed.
