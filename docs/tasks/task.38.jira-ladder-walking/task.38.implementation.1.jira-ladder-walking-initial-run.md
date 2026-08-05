# Implementation Report: Jira — walk the status ladder

**Task**: `task.38.jira-ladder-walking.md`
**Run Number**: 1
**Started**: 2026-08-05 05:53
**Status**: Completed

---

## Summary

Drive Jira transitions from the tracker-workflow ladder — walk intermediate rungs when a target is not
directly reachable, and restrict the done-category fallback to the ladder's last rung.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                        |
| PR target           | `develop`                                                                                                                        |
| qa-planning gate    | skipped (auto)                                                                                                                   |
| Task risk level     | not set (frontmatter has no `risk_level`; per-phase risk runs Low→High inside §6)                                                |
| Pipeline mode       | standard                                                                                                                         |
| Always-load files   | 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` |
| Tracker             | GitHub — issue #186                                                                                                              |
| Board status        | In Progress ✅ (verified post-condition)                                                                                         |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.38.*` exists in git                                | Branch pre-existed at develop's tip (0 ahead) — re-used, pushed, tracking `origin/…`. Created at `a36b7b8`. Issue #186 commented; board → In Progress ✅ | —                    |
| 2. review-task             | ✅ Done    | `task.38.review.{N}.{name}.md` exists (or skip logged)                  | **Skipped** — status `Ready for Development` + `task.38.review.1.jira-ladder-walking.md` exists (12/12 critical+important implemented). Skip notice posted to #186. | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                       | All 5 phases implemented. `npm test` 870/870. `npm run bundle` run (idempotent on re-run). 24 new tests. Two plan defects found + corrected — see Decisions Log. | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                            | PR #194: https://github.com/Gamaroff/agent-skills/pull/194 (base `develop`, state OPEN). 2 commits: `7798042` feat, `300781b` docs. Issue #186 commented. Board → In Review **skipped** (no such column — see Decisions Log). | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.38.qa.{N}.*.md`; `task.38.gate.{N}.*.yml`; PR comment posted      | **5 cycles**. Gate 1 FAIL (20/100) → Gate 2 **PASS (90/100)**. 23 findings, 23 fixed (7 high). Tests 870 → 888. | —                    |
| 7. finalise                | ✅ Done    | `task.38.dod.{N}.*.md`; task `status: accepted`                         | DoD PASS — 19/20 criteria; found and closed a PARTIAL performance criterion. Issue #186 closed, board → Done, both verified. | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                      | 9 commits, all pushed. CI green on the final head. | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Pipeline Startup — 2026-08-05

- **Phase 0 fan-out**: resolver skipped (path supplied inline); tracker poller skipped (GitHub issue
  #186 read directly from frontmatter, no PR yet); lite-mode detector dispatched and returned.
- **Pipeline mode**: `standard`. Computed from `risk_ok = (risk_level "absent" ∈ {low, absent}) = true`
  AND `phase_count (5) < 3 = false` AND `single_module = false`. Two of three booleans false → standard.
- **Always-load files**: 3 files resolved from `skills-config.yaml` `devLoadAlwaysFiles`; all three
  verified present on disk.
- **Feature branch base**: `develop` — the branch `feature/task.38.jira-ladder-walking` already exists
  and sits exactly at develop's tip (0 commits ahead), so Step 1 re-uses it.
- **PR target branch**: `develop` — matches the base, so the PR diff carries only task.38.
- **qa-planning gate**: skipped (auto — no prompt).
- **Task status on entry**: `ready-for-development` → proceed normally.
- **Uncommitted work present on entry**: modified `task.38.jira-ladder-walking.md` and
  `task.38.plan.jira-ladder-walking.md`, plus untracked `task.38.review.1.jira-ladder-walking.md`
  (the review-1 revision applied 2026-08-05). These are task documents, carried into the run.

### Step 3 — Pre-develop (2026-08-05)

- **Pre-develop surface map**: 13 files identified across `shared/resources/` (jira-sync.js,
  jira-stage.js, tracker-workflow.js, jira-transition-protocol.md), `shared/resources/tests/`
  (3 suites + 10 rapp-* fixtures), `evals/shared/tests/transition-protocol-parity.test.mjs`,
  `docs/reference/tracker-workflow.md`, `CHANGELOG.md`.
- **Anchor corrections from the map** (task/plan cite these; two are off):
  - `DEFAULT_STAGE_MAP.done` terminal is at **1410-1416**, not 1409-1414 (map starts 1388).
  - `transitionToStatus`'s internal `getTransitions` call is at **2390**, not 2388.
  - All other cited anchors verified exact.
- **Key API constraint confirmed**: `ladderFor` and `describeTarget` are **not exported** from
  `tracker-workflow.js` — which is precisely why `isLastRung` must be computed inside the engine,
  as the task and plan both require. `rankOf`, `planMove`, `resolveMoment`, `loadWorkflow` are exported.
- **Plan file found**: `task.38.plan.jira-ladder-walking.md` — included as implementation context
  for `/develop` (revised 2026-08-05 against review.1; all snippets re-verified).
- **Always-load files**: 3 files read and passed to `/develop`.
- **Planned/Draft gate**: n/a — status is already `Ready for Development`.
- **High-risk gate**: auto-skipped qa-planning (pipeline default; no prompt).
- **Alignment mismatch gate**: pre-answered "Align code to document" — the task document is the
  source of truth.

### Step 3 — Develop (2026-08-05)

Two defects in the **plan's own snippets** were found during implementation. Both were corrected, and
both would have shipped a broken feature if followed literally. Recorded here because the plan was
revised against review.1 and these survived that review.

1. **The last-rung restriction would not have taken effect.** The plan assumed `spec.terminal`
   controls `resolveTransition`'s rule 4. It does not — `transitionToStatus` derives terminality from
   `localStatus`, and `jira-stage.js:249` maps a non-terminal `done` moment to the literal `"done"`,
   which is itself in `TERMINAL_LOCAL_STATUSES`. Rule 4 would still have fired for exactly the
   retargeted case this task exists to fix. **Fix**: an explicit `terminal` override parameter on
   `transitionToStatus` governing rule 4 only, leaving `localStatus` to keep selecting the
   resolution. This preserves the `:249` behaviour the task explicitly says not to "fix".

2. **The ladder-aware rank snippet mixes two incompatible rank scales.** The plan chains ladder →
   record → `DEFAULT_STATUS_RANK`, but ladder ranks are rung **indices** (0..6) and the legacy ranks
   run 10..60, while `minRank` in ladder mode is an index. A status off the ladder but present in
   `DEFAULT_STATUS_RANK` would be compared at the wrong magnitude — "In Review" (30) against a target
   rung of 2 reads as a regress — so **every forward move would be refused** on any board whose
   ladder omits a column the defaults happen to name. **Fix**: supplying a workflow switches the
   guard to ladder ranks wholesale; off-ladder returns `null`. That is also the semantically correct
   answer — it matches `rankOf`'s documented "null means no opinion" and the existing treatment of
   side-states. Pinned by a test that names the trap.

Other decisions:

- **`stripStatusEmoji` was NOT re-exported** from `tracker-workflow.js` into `jira-sync.js`, despite
  `tracker-workflow.js:168` anticipating that task.38 would do so. The task's §4 Out of Scope keeps
  the engine change to `isLastRung` alone and its Files Summary does not list the de-duplication;
  the two implementations are byte-identical, so this is a no-op left for whoever wants it.
- **Bundling**: `bundle_skill.py` followed the new `require("./tracker-workflow.js")` automatically
  and pulled `yaml-subset.js` transitively — 11 skills each, 47 regenerated `references/` files.
  Re-running `npm run bundle` reports zero changes, confirming idempotency.
- **Test-failure triage**: not needed. The only failing run was a single expected `deepStrictEqual`
  shape assertion from the additive `isLastRung` field, fixed directly.

### Step 4 — Create PR (2026-08-05)

- **Staging scope**: `docs/tasks/task.38.jira-ladder-walking`, `shared/resources`,
  `evals/shared/tests`, `docs/reference`, `skills`, `CHANGELOG.md`. No out-of-scope untracked files
  existed, so the pre-flight hold was a no-op. Leak check clean.
- **Implementation report deliberately excluded** from both commits (`commit-changes` step 3a) — the
  pipeline is at Step 4, and Step 8 owns its final state.
- **Two commits**, split on a clean boundary: `7798042` carries the feature (sources, tests, the
  protocol contract, and every regenerated bundle — the bundles must travel with their sources) and
  `300781b` carries project documentation (CHANGELOG, reference doc, task docs).
- **PR #194** opened against `develop`, state verified OPEN. Issue #186 commented.
- **GitHub board → "In Review": skipped, correctly.** This project's board has exactly three Status
  options — Todo / In Progress / Done — so the "In Review" lookup returns empty and the step logs a
  skip, as its own reference documents. The issue stays In Progress. Worth noting that this is the
  same board shape task.38's own `tracker-workflow.yaml` describes, and the same principle the
  feature implements: a column the board does not have is a moment that does not fire.
- `npm test` re-run after both commits: 870/870, exit 0.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### ⚠️ Blocked (external): `rapp-story-ready-for-showcase.json` cannot be captured in this environment

**Raised**: Step 3 pre-develop, 2026-08-05.

§7 Files to Add requires a fixture capturing the transitions available **from** the
`READY FOR SHOWCASE` column, taken against the real RAPP board. Phase 5 of the task declares this an
**external dependency** ("needs a real issue parked in READY FOR SHOWCASE").

**Why it is blocked here**: this repo has no `.env` and no `JIRA_*` variables in the environment
(verified: 0 matches). The capture is a live authenticated
`GET /rest/api/3/issue/{key}/transitions?expand=transitions.fields` against a board this pipeline
cannot reach, on an issue that must first be parked in that column by a human.

**Resolution taken — deliver the coverage the fixture was for, without inventing the payload**:
fabricating the file would be worse than omitting it, because the whole point of the `rapp-*`
fixtures (per the suite's own header) is that they are *real* payloads that catch what hand-written
lists cannot. Instead:

1. The **two-hop real-payload integration test** is built on a path that **is** fully captured:
   `Waiting for Review → In Review → Ready for Testing` (hop 1 = `id=401` from
   `rapp-story-waiting-for-review.json`; hop 2 = `id=61` from `rapp-story-in-review.json`). This
   proves exactly the property §8 asks for — position-dependent transitions, re-fetched per hop —
   against real data.
2. The **UPPERCASE case-insensitivity assertion** is preserved using the real `id=21`
   `In Progress → READY FOR SHOWCASE` transition from `rapp-story-in-progress.json`, as a walk whose
   last rung is the showcase column.
3. `rapp-story-ready-for-showcase.json` is **not** created. Its Progress Tracking checkbox and the
   §9 success criterion "`rapp-story-ready-for-showcase.json` is captured and committed" stay
   **unticked**, with a pointer to this entry.

**What a human must do to close it**: park a RAPP Story in `READY FOR SHOWCASE`, run the capture
query in the `jira-stage-fixtures.test.mjs` header, commit the payload, and add the
`In Progress → READY FOR SHOWCASE → Waiting for Review` assertion. If that column turns out to offer
no route onward to Waiting for Review, §6 Phase 5 / §8 must be rewritten around whatever path the
board actually offers — the task itself flags this as unverified.

---

## QA Iteration History

Five cycles. The full narrative is in
[`task.38.qa.2.jira-ladder-walking.md`](./task.38.qa.2.jira-ladder-walking.md); the per-cycle fix
tables are in the task document's Implementation Record.

| Cycle | Gate | Findings | Commit | Tests |
| --- | --- | --- | --- | --- |
| 1 | **FAIL** 20/100 | CR-1…CR-5 — 3 high, 2 medium, 2 cleanups, 1 coverage gap | `90a403b` | 870 → 880 |
| 2 | — | CR-6 (the CR-4 fix was wrong), CR-7 (a test did not test its own name), CR-8…CR-10 | `530eb52` | 880 → 884 |
| 3 | — | CR-11 (the CR-6 fix regressed overlays), CR-12…CR-16 | `9184607` | 884 → 886 |
| 4 | — | CR-17 (the CR-11 fix was wrong the other way), CR-18, CR-19 | `1f0a959` | 886 → 887 |
| 5 | **PASS** 90/100 | CR-20, CR-21 (the MCP fallback could still fire a wrong Done), CR-22, CR-23 | `a9e4837`, `c79d24b` | 887 → 888 |

**The pattern worth carrying forward.** Cycles 2, 3 and 4 each found that the *previous cycle's fix*
was wrong, always in the same area — whether a consumer's ladder file outranks their older JSON
config, and for which moments. Each fix was correct about the case in front of it and wrong about a
neighbouring one, because the authorship gate and the resolution it guarded sat at different
granularities. They agree only at per-moment-per-issue-type.

Second-order lesson: cycle 1's fix added tests specifically to close the coverage gap that let its
bugs through, and cycle 2 found that the headline one of those tests did not test its own name — so
cycle 1's highest-severity fix had zero coverage. Cycle 3 then found the same defect reintroduced by
the fix for it. A test's *name* is not evidence; asserting on an observable that differs between the
correct and incorrect implementations is.

---

## Completion

**Finished**: 2026-08-05
**Final Status**: **Completed** — task accepted
**Branch**: `feature/task.38.jira-ladder-walking` (base `develop`, created at `a36b7b8`)
**PR**: [#194](https://github.com/Gamaroff/agent-skills/pull/194) → `develop`
**QA Iterations**: 5
**DoD Summary**: [`task.38.dod.1.jira-ladder-walking.md`](./task.38.dod.1.jira-ladder-walking.md) — PASS


---

## Completion Summary

Task 38 shipped: Jira resolves every pipeline moment from the consumer's `tracker-workflow.yaml`
ladder and walks the rungs between where a card sits and where the moment wants it, re-reading the
available transitions after each hop. The done-category fallback is restricted to the ladder's last
rung, and the monotonicity guard finally ranks declared bespoke columns.

| | |
| --- | --- |
| Task status | `accepted` |
| PR | [#194](https://github.com/Gamaroff/agent-skills/pull/194) → `develop`, OPEN, CI green |
| Issue | [#186](https://github.com/Gamaroff/agent-skills/issues/186) closed; board → Done |
| Final gate | PASS 90/100 |
| QA cycles | 5 |
| Findings | 24 found, 24 fixed (7 high-severity) |
| Tests | 870 → **889**, all passing |

**Commits**

| Hash | What |
| --- | --- |
| `7798042` | feat — walking, last-rung terminal, ladder-aware rank, protocol contract, bundles |
| `300781b` | docs — Jira execution semantics, CHANGELOG, task docs |
| `90a403b` | qa-fix 1 — three correctness bugs on the walk path |
| `530eb52` | qa-fix 2 — the cycle-1 precedence fix was itself wrong |
| `9184607` | qa-fix 3 — a per-type authored pipeline was being ignored |
| `1f0a959` | qa-fix 4 — authorship granularity now matches resolution |
| `a9e4837` | qa-fix 5 — the MCP fallback could still fire a wrong Done |
| `c79d24b` | final gate PASS + retire the "not wired yet" claims |
| `838489c` | accept — DoD verified, last partial criterion closed |

### What this run is worth recording

**One bug in the task became five in the code.** The task was written to fix one route to an
unrecoverable wrong Done. Four more were found, and each was *created or exposed by the fix for the
one before it*:

1. `done` retargeted at a gate column taking the done-category fallback — the known one
2. an unauthored file's built-in defaults outranking the record's `enabled: false`
3. a `byIssueType` overlay's authored target ignored entirely
4. a one-key overlay claiming authorship of all eight moments
5. the MCP fallback running `--print-plan` without `--issue-type`

All five are the same mistake in different clothes: **the gate answering "did a human choose this?"
sat at a different granularity from the code resolving the answer.** Per-file, then per-type, then
finally per-moment-per-issue-type — the only granularity at which the two agree.

**A green suite proved nothing, five times running.** Every cycle began at 100% passing. Cycle 1's
three high-severity bugs sat behind 24 new tests; two lived in `run()`, which no test drove. Cycle 1
then added tests specifically to close that gap — and cycle 2 found the headline one asserted
`no-transition` on a single-rung plan while calling itself a partial-walk test, so the fix it existed
to protect had **zero** coverage. Cycle 3 found the same defect reintroduced by the fix for it.

The lesson is narrow and reusable: a test earns its name only by asserting on an observable that
*differs* between the correct and broken implementations. Where both branch orders emit the same
object, assert on what actually differs — the exit code, or the warning that is never printed.

**Two of the task's own plan snippets were wrong**, both caught before shipping, both would have
produced a feature that does not work: the last-rung restriction would never have taken effect
(`transitionToStatus` derives terminality from `localStatus`, not `spec.terminal`), and the
ladder-aware rank snippet mixed two incompatible rank scales in a way that would have refused *every*
forward move on any board whose ladder omits a column the defaults happen to name.

**Verification found what five review cycles had not.** The DoD traceability pass — the last check of
all — caught a Performance criterion as only partially met, because `walkLadder` pre-fetched
transitions ahead of the two short-circuits that never touch the network. Fixed rather than
documented away.

### Deferred

1. **`rapp-story-ready-for-showcase.json`** — needs a live authenticated capture with an issue parked
   in that column. Fabricating it would defeat the purpose of fixtures whose whole value is being
   real. Substituted with a two-hop walk on a fully-captured path plus the UPPERCASE assertion against
   the real `id=21`; the gap is documented in the test file itself, not only in a report.
2. **Two consumer tests** (`--dry-run` per real column) — same blocker.
3. **Advisory** — `validateWorkflow` could warn when a file authors `statuses:` but no `pipeline:`.

### Next

PR #194 is ready to merge into `develop`. task.39 (GitHub execution), task.40 (step-file wiring) and
task.41 (new moments) follow.
