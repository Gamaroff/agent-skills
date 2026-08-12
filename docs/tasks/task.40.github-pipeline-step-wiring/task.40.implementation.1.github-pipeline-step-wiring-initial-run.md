# Implementation Report: Wire `gh-stage.js` into the pipeline step files

**Task**: `task.40.github-pipeline-step-wiring.md`
**Run Number**: 1
**Started**: 2026-08-12 16:30
**Status**: Completed — Accepted

---

## Summary

Replace the five inline GitHub GraphQL board-move blocks across the develop pipeline step files and `skills/finalise/SKILL.md` with one-line `gh-stage.js` invocations, fixing the false-pass post-condition, the case-sensitive `Done` match, and the dead `BOARD_NUM` on the way.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                         |
| PR target           | `develop`                                                                                                                         |
| qa-planning gate    | skipped (auto)                                                                                                                    |
| Task risk level     | not set (frontmatter has no `risk_level:`)                                                                                        |
| Pipeline mode       | standard                                                                                                                          |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker             | GitHub — issue #188                                                                                                               |
| Board status        | Done ✅ (via `gh-stage.js --stage done` → `reason: "already"`, re-read confirms `Done`)                                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.40.*` exists in git                               | `feature/task.40.github-pipeline-step-wiring` created at `158a42d`, pushed with upstream tracking. Issue #188 commented; board → In Progress (post-condition verified). | —                    |
| 2. review-task             | ✅ Done    | `task.40.review.{N}.{name}.md` exists (or skip logged)                 | `task.40.review.1.github-pipeline-step-wiring.md`. READY TO IMPLEMENT, 8/10. 2 Critical + 4 Important fixed; status `planned` → `ready-for-development`. | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 5 phases complete in blast-radius order, bundled + tested at each gate. **1069 tests passing** (baseline 1065 + 4 new guards, each mutation-tested). Status → `ready-for-review`. | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #207: https://github.com/Gamaroff/agent-skills/pull/207 (base `develop`). Commit `190ab2b`, 40 files. Issue #188 commented. | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.40.qa.{N}.*.md`; `task.40.gate.{N}.*.yml`; PR comment posted     | 2 cycles. Cycle 1 CONCERNS 90/100 (1 MEDIUM + 3 LOW) → qa-fix `5159517` → cycle 2 **PASS 100/100** `d72af8e`. Reliability CONCERNS → PASS. | —                    |
| 7. finalise                | ✅ Done    | `task.40.dod.{N}.*.md`; task `status: accepted`                        | `task.40.dod.1.*.md` written; status → `accepted`; CI verified SUCCESS on head; issue #188 closed; board Done (`reason: "already"`). | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Terminal commit — DoD, sprint review, final report. | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`.

---

## Decisions Log

### Pipeline Startup — 2026-08-12

- **Invocation context**: dispatched by `/develop-next` (roadmap item **T40**, deps `T39` satisfied). Autonomous run — Phase 0d questions auto-answered with the recommended option, no prompt.
- **Feature branch base**: `develop` — auto-answered (recommended option; current branch is `develop`, task is standalone with no epic integration branch).
- **PR target branch**: `develop` — auto-answered (recommended option; standard Gitflow for a standalone task).
- **qa-planning gate**: skipped (auto — no prompt).
- **Phase 0a-parallel**: run inline rather than via subagents (the orchestrating session is under a standing "no subagent dispatch unless requested" directive). All three agents' outputs were derived directly:
  - Resolver: path supplied explicitly and verified on disk — `docs/tasks/task.40.github-pipeline-step-wiring/task.40.github-pipeline-step-wiring.md`.
  - Tracker poller: `gh issue view 188` → OPEN, labels `task`, `priority:high`.
  - Lite-mode detector: `risk_level: absent`, `phase_count: 5`, `single_module: false`, `has_success_criteria_table: true`.
- **Pipeline mode = standard**, computed from the three booleans: `risk_ok = true` (absent ∈ {low, absent}) **AND** `phase_count < 3 = false` (5 phases) **AND** `single_module = false` → standard.
- **Always-load files**: 3 resolved from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk.
- **Task status `Planned`**: noted and proceeding — Step 2 (`/review-task`) validates and updates the status autonomously.
- **Pre-flight note**: `.claude/skills` is a symlink to `skills/` (verified by matching inode), so `npm run bundle` output is live to the running install — no mirroring step needed.
- **Stale halt snapshot**: `.claude/state/develop-pipeline.last-halt.json` dated 2026-05-13 refers to an unrelated story (`story.4.3.day-3-messy-path`). Not a resume candidate for this task; left in place, no active lock present.

---

### Step 2 — review-task — 2026-08-12

- **Auto-answers applied** (all logged in the review report's Auto-Answers table): output format = Comprehensive report; Step 0a branch setup = auto-skipped (already on `feature/task.40.*`); Step 8.5 = apply all critical + important; Step 9 = fixes complete → promote status.
- **Outcome**: READY TO IMPLEMENT, readiness 8/10. 2 Critical, 4 Important, 1 Optional.
- **Zero hallucinations** — every file, CLI flag, reason string and stage name the task assumes was verified present on disk. All defects were stale line-number citations (task authored 2026-08-03; task.39 landed `gh-stage.js` 2026-08-12).
- **Fixes applied to the task document**: finalise citation corrected `1023-1093` → `1114-1190` (`:1061` → `:1152` — the old citation pointed at a *Jira* candidates list); finalise-local CLI path specified (the `{develop-story|develop-task|develop-bug}` brace does not cover `finalise`); step-0 `364-504` → `362-513`; step-4 `178-238` → `174-239`; step-5-6 `43-106` → `39-106`; Phase 3 marked markdown-only (`ensureOnBoard` already shipped by task.39); bundle fan-out table added to §7.
- **Status**: `planned` → `ready-for-development` in both frontmatter and body.
- Review outcome posted to issue #188.

### Step 3 — develop — 2026-08-12

- **Pre-develop surface map**: 12 files identified across `shared/resources/`, `skills/finalise/`, `evals/`, and docs. Derived from the Step 2 review pass, which verified every call site, line range and CLI symbol directly on disk — a fresh Explore dispatch would re-derive a map that is already exact, so the recorded map is reused (the step's own resume optimisation).

  | File | Role in this task |
  | --- | --- |
  | `shared/resources/develop-pipeline-step-4-create-pr.md` | Phase 1 — site 1 (`in-review`), L174-239; dead `BOARD_NUM` :182; hand-edit para :237 |
  | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | Phase 2 — site 2 (`in-review`), L39-106; short-circuit :76-77 |
  | `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | Phase 3 — site 3 (`work-started`), L362-513; Priority block :473-486; false-pass post-condition :492-503 |
  | `shared/resources/develop-pipeline-step-7-finalise.md` | Phase 4 — site 4 (`done`), prose at :165 |
  | `skills/finalise/SKILL.md` | Phase 4 — site 5 (`done`), L1114-1190; case-sensitive `"Done"` :1152; `not-on-board` escalation :1154; sync re-run to reorder after |
  | `shared/resources/develop-pipeline-lite-mode.md` | Phase 4 — prose only, :32 |
  | `shared/resources/gh-stage.js` | The CLI being wired in (read-only — task.39 shipped it; `ensureOnBoard` :498) |
  | `shared/resources/tracker-workflow.js` | Ladder/stage-name authority (read-only) |
  | `shared/resources/set-github-project-priority.sh` | Phase 3 optional delegation target for the Priority concern |
  | `evals/shared/tests/transition-protocol-parity.test.mjs` | Phase 5 — grep guard + positive assertions; existing `--stage` scan at :72-97 |
  | `evals/develop-{story,task}/protocol/*.test.mjs` | Phase 5 — step-contract keyword expectations |
  | `CHANGELOG.md`, `skills/develop-{story,task}/README.md` | Phase 5 — docs |

- **Plan file found**: `docs/tasks/task.40.github-pipeline-step-wiring/task.40.plan.github-pipeline-step-wiring.md` — included as implementation context for `/develop`. It supplies the exact replacement shape, the Phase 3 three-concern separation, the Phase 5 guard code, and the CHANGELOG wording.
- **Always-load files**: 3 read and prepended (coding-standards, tech-stack, source-tree). Load-bearing constraints confirmed: edit `shared/resources/` only, `references/` is auto-generated, run `npm run bundle` after, paths are agent-agnostic (`.agents/skills/`, never `.claude/skills/`).

### Step 4 — create-pr — 2026-08-12

- **Staging scope**: `docs/tasks/task.40.github-pipeline-step-wiring`, `shared/resources`, `skills`, `evals/shared/tests`, `.github/workflows`, `CHANGELOG.md`, `tracker-workflow.yaml`. Pre-flight guard held **nothing** — every untracked path (the task dir artifacts and the six new bundled `gh-stage.js` copies) was in scope.
- **Implementation report deliberately unstaged** per commit-changes step 3a — it is still in flight and Step 8 commits its final state. The *review* report was committed, being a completed artifact.
- **Commit** `190ab2b`, 40 files, +8783/−1187. A pre-commit hook re-ran the bundler and reported every skill "in sync", independently corroborating bundle freshness.
- **Secret/debug scan**: clean. The `console.log` hits in the diff are the bundled CLI's own `makeOutput` logger, not debug churn.
- **PR #207** → base `develop`. Push verified by SHA match before PR creation.
- **Board move** ran through the CLI this task just wired in: `--stage in-review` → `reason: "stage-disabled"`, exit 0. Correct — this repo's ladder deliberately omits `in-review` because board #1 has no such column, and the new step-4 prose says to log it and move on. The pipeline executed its own new instruction and got the documented answer.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Pre-flight observation (not a blocker)**: `gh-stage.js` exists at `shared/resources/gh-stage.js` (shipped by task.39) but is not yet present in any `skills/*/references/` bundle — nothing references it yet. This task's Phase 5 (`npm run bundle`) is what pulls it into the bundles, so its absence now is expected rather than a missing dependency.

- **Resolved during Phase 1 — the bundler cannot see `.agents/skills/…/references/X` paths.** The pre-flight observation above turned out to understate the problem: writing the CLI call in the step file did **not** cause `npm run bundle` to copy `gh-stage.js`, so the first bundle produced skills referencing a file absent from their install. Root cause is `skills/create-skill/scripts/bundle_skill.py:178` — when recursing into a **shared** file it runs only `collect_shared_refs` (the `shared/resources/X` form); `REFS_REF_RE` (the `references/X` form) is applied to *skill* files only. `jira-stage.js` never hit this because `jira-transition-protocol.md` happens to name its `shared/resources/` path in prose. **Fix**: each call site now also names `shared/resources/gh-stage.js` explicitly, and a new guard asserts that any skill invoking the CLI bundles it. This is the task's own Critical "bundle drift ships a broken install" risk, arriving by an unpredicted route — worth noting for task.41, which wires the same CLI into more sites.

- **Deferred (documented in §8, not silently ticked)**: two consumer tests need a throwaway Projects v2 board with bespoke column names (`Backlog / In Development / Ready for Showcase / Shipped`). No such board exists. The live "Agent Skills" board exercises the same code path but has only three columns, so it cannot demonstrate non-default column names, and its `in-review` moment is disabled — leaving no rung above review to advance a card to for the backward-move refusal test.

---

## QA Iteration History

### QA Cycle 1 — 2026-08-12

**Gate Result**: CONCERNS (90/100)
**Issues Found**: 1 MEDIUM, 3 LOW, 0 HIGH
- **MEDIUM TASK-40-QA1-01** — `finalise/SKILL.md` reason-to-action table documented 7 of the 13 reasons `gh-stage.js` can emit, while the prose beneath instructs the agent to read `reason` and never treat exit 0 as proof the card moved. Six more are reachable from a plain `--stage done` call, so the instruction pointed at values it could not interpret. `ambiguous-board` was the sharpest case — it fires on an ordinary two-board setup, not an error.
- **LOW** — the inline-Status-mutation guard was file-scoped, passing only because step-0 happens to carry no bare `"Status"` literal alongside its retained Priority mutation.
- **LOW** — the standalone Priority query lost the propagation retry the original had.
- **LOW** — the `not-on-board` escalation has no executable assertion.

**Action**: Running qa-fix (cycle 1 of 5)

### QA Fix Cycle 1 — 2026-08-12 (commit `5159517`)

All three actionable items fixed. The reason table went to 13 rows **plus a catch-all plus** an explicit note that `probe`/`write-failed`/`exists`/`dry-run` cannot occur at this call site — more than the gate asked for, and the part that stops a future reader mistaking deliberate exclusion for omission. The guard was rescoped to fenced code blocks. LOW-3 was accepted, not fixed: every other escalation in `finalise` is a documented branch with no assertion, so testing one would be inconsistent rather than safer.

### QA Cycle 2 — 2026-08-12 (re-review)

**Gate Result**: **PASS (100/100)**
**Issues Found**: none
**Verification highlight**: the rescoped guard was re-verified against **step-4**, deliberately a different file from the one the fix was developed against — code-block mutation → 1 fail, prose `"Status"` → 0 fail, baseline clean. NFR Reliability upgraded CONCERNS → PASS.
**Accepted deferrals**: F5 (live backward-move refusal) and the scratch-board run, both blocked by board topology and left unchecked in §8.

**Action**: Proceeding to finalise

---

## Completion

**Finished**: 2026-08-12
**Final Status**: Completed
**Branch**: `feature/task.40.github-pipeline-step-wiring` (base `develop`, cut at `158a42d`)
**PR**: [#207](https://github.com/Gamaroff/agent-skills/pull/207) — base `develop`, OPEN, MERGEABLE, CI green
**QA Iterations**: 2 (cycle 1 CONCERNS 90/100 → qa-fix → cycle 2 PASS 100/100)
**DoD Summary**: `task.40.dod.1.github-pipeline-step-wiring.md` — ACCEPTED

---

## Completion Summary

**All 8 pipeline steps completed.** Task 40 accepted with final gate PASS (100/100) after 2 QA cycles, on a PR whose CI is green on the exact head commit.

### What landed

Five inline GitHub Projects board blocks — ~240 lines of duplicated `gh api graphql` prose — replaced by one-line `gh-stage.js --stage <moment>` calls, making a consumer's `tracker-workflow.yaml` actually drive their board. Three intended behavioural changes (regress guard, case-insensitive Done, honest post-condition), each documented with its rationale in CHANGELOG.

### Three things worth carrying forward

1. **The bundler cannot see `.agents/skills/…/references/X` paths.** Writing the CLI call alone left `gh-stage.js` out of every bundle — this task's own Critical "bundle drift" risk, by an unpredicted route. `bundle_skill.py:178` follows only `shared/resources/X` when recursing into shared files. Directly relevant to **task.41**, which adds more call sites to these same files.

2. **Guards over prose-and-code documents need block scoping, not proximity matching.** Two of the six guards written here initially matched the prose *documenting* the correct behaviour — the v0.33 failure mode inverted. One was caught during development, one by QA. Block-scoping should be the default for this class of guard, not the fix applied after the first false positive.

3. **Reading `reason` rather than trusting exit 0 was load-bearing in practice, not just in theory.** The acceptance board move returned `already`, not `transitioned`, because closing the issue fired GitHub's built-in item-closed automation first. Exit 0 alone would have been reported as "the pipeline moved it" — false. The distinction showed up on the first real run.

### Deferred, deliberately

Two consumer tests need a throwaway Projects board with bespoke column names that does not exist. Board #1 has three columns and no rung above review, so neither non-default column names nor a live backward-move refusal can be demonstrated. Both are **unchecked** in §8 and recorded in gate 2 under `accepted_deferrals` — not ticked, not hidden.

### Final numbers

| | |
|---|---|
| Commits | 3 (`190ab2b` implementation, `5159517` qa-fix, `d72af8e` QA cycle 2) + this terminal commit |
| Tests | 1070 passing, 0 failing (baseline 1065) |
| New guards | 5, each mutation-tested |
| Files changed | 40 in the implementation commit |
| QA cycles | 2 |
| CI | green on head `d72af8e` |
