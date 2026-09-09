# Implementation Report: A diminishing-returns exit for the QA loop

**Task**: `task.99.qa-loop-diminishing-returns-exit.md`
**Run Number**: 1
**Started**: 2026-09-09 11:40
**Status**: In Progress

---

## Summary

Add a fourth, clean exit to the develop pipeline's QA loop — a diminishing-returns exit that fires when HIGH findings are gone and the residue is entirely test machinery — plus the `qa.testArtifactGlobs` config key, the surrounding prose updates, and a replay test against the recorded tinker-city task.103 gate sequence.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                  |
| PR target           | `develop`                                                                  |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.99.*` exists in git                               | `feature/task.99.qa-loop-diminishing-returns-exit` created at `e65774b3`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.99.review.{N}.{name}.md` exists (or skip logged)                 | `task.99.review.1.qa-loop-diminishing-returns-exit.md` — 8/10, READY TO IMPLEMENT; 2 Critical + 5 Important + 2 Optional, 8 of 9 fixed in-place | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 5/5 phases, 12/12 success criteria; 8 files (3 added, 5 modified); 32 new tests, all conditions mutation-proved; `npm run ci:fast` green at 2936/0 | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [#361](https://github.com/Gamaroff/agent-skills/pull/361) → `develop`; 2 commits (`e934cefc`, `c788f769`); no issue comment — none linked | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.99.qa.{N}.*.md`; `task.99.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 5 cycles: FAIL 50 → FAIL 60 → CONCERNS 90 → CONCERNS 90 → **PASS 100**; HIGH sequence `1,1,0,0,0`; 5c = CONCERNS (non-blocking) | —                    |
| 7. finalise                | ⏳ Pending | `task.99.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-09

- Invoked by `/develop-next` (autonomous run). Item T99 selected via the task-registry fallback frontier — no phase in `docs/development/project-completion-roadmap.md` held an actionable row.
- Feature branch base: `develop` — auto-answered with the recommended option per the develop-next autonomous directive (Q1).
- PR target branch: `develop` — auto-answered with the recommended option per the develop-next autonomous directive (Q2).
- qa-planning gate: skipped (auto — no prompt)
- Phase 0a-parallel: no subagents dispatched. The file path was supplied directly by the selector (Agent 1 not applicable); no tracker issue is linked, so the tracker poller had nothing to poll (Agent 2 not applicable); the lite-mode inputs were read directly from the document (Agent 3 — no production lite-mode CLI exists in this repo despite the step-0 prose naming one).
- Pipeline mode: **standard**. Computed from `risk_level: medium` (risk_ok = false), phase_count = 4 (`## 6. Implementation Plan` has Phases 1–4, not < 3), single_module = false (touches `shared/resources/`, `docs/reference/`, and every `skills/*/references/` copy). All three conditions fail; any one would have sufficed.
- Always-load files resolved: 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` (from `skills-config.yaml` `devLoadAlwaysFiles`). All three verified present on disk.
- Tracker: `TRACKER=github`, no `github_issue:` in the task frontmatter → all tracker signals and board moves skipped for this run.
- Step 1: no tracker signal fired — `TRACKER_ISSUE` is empty (task carries no `github_issue:`), so the 0c-reg work-started comment and board move were skipped in full.
- review-task output format auto-answered: "Comprehensive report" — required for the pipeline audit trail.
- review-task Step 8.5 auto-answered: "Yes, apply all critical + important fixes" — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: "Yes, fixes complete" — status promoted `draft` → `ready-for-development` (both frontmatter and body).
- review-task Phase 1.5 pre-pass: the two Explore subagents were **not** dispatched; both axes (architecture alignment, already-implemented scan) were checked in-line against `shared/resources/develop-pipeline-step-5-6-qa-loop.md` and the live tree. Recorded because an in-line check is a narrower instrument than an independent read.
- review-task Step 8.6 (Jira body push) skipped — `TRACKER=github`. Step 10 (tracker comment) skipped — no `github_issue:`.
- Pre-develop surface map: 8 files identified across `shared/resources/` and `docs/reference/` — mapped **in-line, not via an Explore subagent** (same reason as the Step 2 pre-pass). (1) `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the prose contract; insertion point is between the *Convergence check* section (L311) and `### 5b. Run QA Fix (shared)` (L396); preamble exit count at L21–26; Loop Escalation table at L846–857. (2) `shared/resources/review-report-freshness.js` — the pattern to copy: a pure library (no filesystem access, never throws, every ambiguity resolves to the safe verdict) whose only caller is a prose gate. (3) `shared/resources/tests/review-report-freshness.test.mjs` — the test shape. (4) NEW `shared/resources/qa-diminishing-returns.js`. (5) NEW `shared/resources/tests/qa-diminishing-returns.test.mjs`. (6) NEW `shared/resources/tests/fixtures/qa-diminishing-returns/`. (7) `docs/reference/configuration.md` — where `qa.testArtifactGlobs` is documented. (8) `skills/{develop-story,develop-task}/references/develop-pipeline-step-5-6-qa-loop.md` — the two bundled copies `npm run bundle` regenerates.
- No plan file (`task.99.plan.*.md`) exists — proceeding without one.
- Always-load files read and passed to `/develop`: coding-standards, tech-stack, source-tree.
- Step 4 SCOPE_PATHS: `docs/tasks/task.99.qa-loop-diminishing-returns-exit`, `shared/resources`, `docs/reference`, `skills/develop-story/references`, `skills/develop-task/references`, `CHANGELOG.md`. Pre-flight guard held nothing — every untracked path was in scope. Leak check after commit: OK.
- Step 4: the implementation report was committed here, per the step-4 rule (its first commit belongs at Step 4 so reviewers can read the audit trail during QA and no tracked document acquires a dangling relative link).
- Step 4: split into two commits — the shipped change (`e934cefc`) and the task artifacts (`c788f769`) — rather than one, so the feature diff is reviewable without the pipeline paperwork.
- Step 4: `--issue` omitted and Step 6b skipped — no tracker issue is linked.
- Step 3 build order: **Phase 4 (the engine + one failing fixture) was built first**, not last, per the review report's Next Steps — so every later phase had something to prove itself against rather than something to describe.
- Step 3: `/develop` invoked in `CALLER_MODE=orchestrated`; `/finalise` correctly bypassed (pipeline Step 7 owns it).
- Step 3 alignment: greenfield — no prior implementation of the rule existed, so no alignment gate fired.
- Step 3 pre-develop Explore subagent: not dispatched; the surface map was supplied by this orchestrator (recorded above), which is the documented caller-supplied-context path.
- Review report: `docs/tasks/task.99.qa-loop-diminishing-returns-exit/task.99.review.1.qa-loop-diminishing-returns-exit.md`
- Task status was `draft` — proceeding per the Phase 0c develop-task status table; Step 2 (`/review-task`) validates and promotes.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Step 3 — two task statements the code could not honour as written (2026-09-09)

Both were corrected in the task document and are recorded here because each changes what shipped.

- **`category:` does not exist in the gate schema.** Condition 3 was specified as "`category: bug`
  against a non-test path". The reviewed task required verifying the field before implementing; it
  was verified, and no gate in the corpus carries it — entries carry `id`, `severity`, `file`,
  `finding`, `suggested_action`, `suggested_owner`, `status`. Requiring a field nothing emits would
  make the exit unreachable, which is dead rather than conservative and looks identical to broken.
  Condition 3 is carried by `nfr_validation.*.status` instead — a different part of the gate from
  `file:`, which is what preserves the independence from condition 2 that the risk table relies on.
  `category:` is honoured when present.
- **Success criterion 2 said "cycle 2" and §7's rule cannot fire there.** §7 needs `HIGH_N == 0` and
  `HIGH_{N-1} == 0`, from cycle 3 onward; the sequence is `2, 0, 0, 0`. At cycle 2 the previous
  reading is 2. Two consecutive zeros first exist at cycle 3, which is also the floor the §11 risk
  table justifies ("at least two full adversarial passes have run"). Implemented to §7 + §11, which
  agree; criterion 2 corrected. **Consequence stated rather than buried: this saves one cycle on the
  recorded run, not the two the Motivation section counts.**

### Step 3 — mutation-proving caught a false green (2026-09-09)

Eight mutations, one per condition. Seven went red immediately. The eighth — replacing condition 1
with `hN !== 0`, dropping the "two consecutive zero-HIGH" half — **stayed green on all 31 tests**,
because every fixture whose latest HIGH count is zero also has a zero before it. The half of
condition 1 that does the work was held by nothing. A `2, 1, 0` case was added and that mutation now
goes red (32 tests). This is the finding a passing suite had actively concealed, and it is the
argument for the practice: the suite was not incomplete in a way reading it would reveal.

### Step 2 — review-task findings (2026-09-09)

All fixed in the task document during review Step 8.5 except where noted.

- **[Critical] The Testing Strategy had no subject.** §9 demanded replaying gate sequences "through the rule" while §8 listed only prose deliverables — the only available test would have been a grep over the new section, which this repo's own anti-patterns file forbids. Fixed: `shared/resources/qa-diminishing-returns.js` (pure library, peer of `review-report-freshness.js`) plus its test file are now in scope, and new criterion 10 makes the module the thing every other criterion is asserted against.
- **[Critical] The replay fixtures are in another repository.** §9 named "tinker-city `task.103.gate.{1..4}.*.yml`, all committed" — committed there, not here; and `task.103` in *this* repo is an unrelated task, so the reference resolves to the wrong document. Fixed: reconstructed fixtures under `shared/resources/tests/fixtures/qa-diminishing-returns/`, labelled in-file as reconstructions of a recorded sequence.
- **[Important] The exit bypassed 5c.** §7 said "proceed to Step 7 with the current gate", which since the 5c rewrite would make it the only path reaching Step 7 without a PR conformance review. Fixed: it now hands to 5c exactly as a `PASS` gate does.
- **[Important] Scope item 4 targeted prose that no longer exists** ("the 'three exits' sentence"). The preamble now reads "one way the loop exits" / "two ways it escalates". Fixed: restated against the current wording.
- **[Important] `qa.testArtifactGlobs` had no shape or default.** Fixed: glob list, matched on repo-relative `top_issues[].file`, default `[]` — which is what makes the fail-safe direction the default rather than an opt-out.
- **[Important] Condition 3 was undefined against the gate schema** (`category:` is not a documented `top_issues[]` field here). Fixed: verify before implementing, and an undeterminable category now *fails* the condition.
- **[Important] No `github_issue:` linkage — NOT fixed, by design.** Creating a remote issue requires the opt-in prompt, which an autonomous run must not answer on the user's behalf. Every tracker signal in this run is a no-op. Run `/sync-github-task` to link it later.
- **[Optional]** Criterion 9's "verified by diff" named no diff (fixed); effort 6h → 9h (fixed).

---

## QA Iteration History

### QA Cycle 1 — 2026-09-09
**Gate Result**: FAIL
**Issues Found**: 3 (1 HIGH, 2 MEDIUM) + 3 LOW recorded as `recommendations.future`. TASK-99-001: the glob matcher case-folds `file:` paths, so the exit is silently inoperative for capitalised paths and the new 32-test suite cannot see it (every fixture path is lowercase). TASK-99-002: the section instructs a `**Loop exit**` row the QA Cycle template does not define. TASK-99-003: the invocation snippet's four variables have no documented source.
**HIGH findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5) → all 3 blocking findings fixed in one iteration (commit `71b1f17e`); proceeding to QA cycle 2

### QA Cycle 5 — 2026-09-09
**Gate Result**: PASS
**Issues Found**: none above LOW. Cycle 4's MEDIUM verified fixed, each replacement row checked against the document's own independent statements. All 12 success criteria mechanically re-verified.
**HIGH findings**: 0
**PR Review**: CONCERNS — 3 findings (1 medium, 2 low), none blocking; code lens found none. Report: `task.99.pr-review.1.qa-loop-diminishing-returns-exit.md`
**Loop exit**: n/a — this exit not taken
**Action**: 5c returned CONCERNS → exits the loop, proceeding to Step 7 (finalise)

> **5c findings, and what was done about them.** PC-1 (medium): the `task-registry.md` row for 99 still read `draft` with no PR reference, diverging from the convention every accepted task follows — **fixed**; it is also a known systemic gap that task.103 in this repo covers. PC-2 (low): the PR description had gone stale over five QA cycles — **fixed**, and a post-loop section added. PC-3 (low): no `github_issue:` linked, so the work is invisible on the board — **deliberate and logged**, not overlooked; an autonomous run must not create a remote issue unprompted.
>
> **Both 5c lenses ran in-line rather than as independent subagents**, the same caveat as every QA cycle. The code lens found nothing; the three conformance findings were reached by comparing committed artifacts against each other, which is a check an author can still perform honestly — unlike fresh reading, which is the part that was missing all run.

> **The one LOW was deliberately not fixed**, and recording that judgement is the point: it is machinery of the prose around the rule, and refining it is the behaviour the rule ends. A reviewer who fixes it has not understood what was shipped.
>
> **Loop cost, stated because this task is about loop cost.** Five cycles, eight findings (2 HIGH, 5 MEDIUM, 1 promoted LOW). Every finding after cycle 1 was in the prose, not the engine — `qa-diminishing-returns.js` took one HIGH at cycle 1 and was untouched thereafter. Three consecutive cycles found a defect introduced by the previous cycle's fix. And **the rule this task ships would not have cut this loop short, correctly**: condition 1 was first met at cycle 4 and condition 2 never was, because the residue was prose rather than test machinery. The findings were real defects in the deliverable, not pin-refinement.

### QA Cycle 4 — 2026-09-09
**Gate Result**: CONCERNS
**Issues Found**: 1 MEDIUM (TASK-99-008 — the route note cycle 3 added says a route-1 gate carries an empty `top_issues[]`, which is false for `WAIVED`; the same file contradicts it twice elsewhere, and the outcome-branching list already names the consequence). Cycle 3's MEDIUM verified fixed.
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5) → fixed (commit `a3606d2b`); proceeding to QA cycle 5

> **The live demonstration, and the most valuable evidence in this task.** Cycle 4 is the first cycle where **condition 1 is satisfied** — HIGH `1, 1, 0, 0`. Run against the real sequence and the real gate file: the Convergence check does **not** trip (`0 >= 0` true, `0 >= 1` false); the exit does **not** fire on this repository, because `qa.testArtifactGlobs` has never been set here and `[]` matches nothing; and it **does** fire when the globs are configured to cover the residue. The fail-safe default (criterion 7), the two guards' non-overlap (criterion 3) and the exit's reachability are all shown on a live run rather than a fixture.
>
> **A rule that could never fire is indistinguishable from a broken one.** Showing both branches on the same real input is what separates them, and no fixture can do it.

### QA Cycle 3 — 2026-09-09 (scope narrowed to files changed since gate 2)
**Gate Result**: CONCERNS
**Issues Found**: 1 MEDIUM + 1 new LOW; all 3 of cycle 2's verified fixed. TASK-99-007: widening 5c to admit route 2 falsified a sentence eighty lines further down 5c asserting an arriving gate carries an empty `top_issues[]`. On route 2 + REQUEST CHANGES, `/qa-fix` would be handed the machinery residue the exit declined to fix and would work it — the loop resumes refining pins through the back door.
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5) → fixed (commit `c282980a`); proceeding to QA cycle 4

> **Dogfood check.** The rule this task ships was run against this run's own HIGH sequence `1, 1, 0` using the engine and the Convergence check's own awk. Convergence: `0 >= 1` is false → does not trip. Diminishing-returns: `continue | high-findings-remain` → does not fire. Both decline, for the right reasons, without overlapping — success criterion 3 demonstrated on a real sequence rather than a fixture.
>
> **Both cycles' new findings were consequences of the previous cycle's fix.** Cycle 2's TASK-99-005 was introduced by cycle 1's fix; cycle 3's TASK-99-007 by cycle 2's. That is the qa-fix contract's "a fix is new code" holding twice in a row, and it is the argument for Step 3.5 existing at all.

### QA Cycle 2 — 2026-09-09 (mandatory refute pass, whole branch diff)
**Gate Result**: FAIL
**Issues Found**: 3 new (1 HIGH, 2 MEDIUM); all 3 of cycle 1's verified fixed. TASK-99-004: 5c's entry condition ("after a gate exits 5a with `PASS` or `WAIVED`") excludes the CONCERNS gate this exit hands it, so the exit path is undefined in the document that defines it. TASK-99-005: the `**Loop exit**` default `n/a — loop continued` is false on the ordinary-exit cycle — a defect introduced by cycle 1's own fix. TASK-99-006: "32 tests" is stale in three current-state claims; the suite is 33.
**HIGH findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5) → all 3 blocking findings fixed (commit `f2b54e56`); proceeding to QA cycle 3

> **The refute pass earned its cost, measurably.** Of its two new findings, one is in cycle 1's own fix and one is in the **original** change — which a re-review narrowed to "files changed since the last gate" would not have re-read at all. That is the argument the qa-task contract makes for the unnarrowed cycle-2 pass, observed rather than assumed.
>
> The four lifecycle transitions the contract names (teardown, in-flight, error path, reconnect) do **not** apply to a pure function with no lifecycle, subscription or cache. Reporting them as "passed" would be theatre, so the pass instead enumerated the **claims** the change set makes and tried to refute each: three were false, six held.

> **Cycle 1's Step 3b was not an independent pass.** The code review ran in-line, in the context that authored the change, rather than as a read-only Explore subagent — subagent dispatch was outside this session's remit. An author reviewing their own work is the weakest form of the check; TASK-99-001 surfaced only because the module was *executed* against a probe input rather than read. Recorded here as well as in the QA report so a resumed run does not mistake this cycle for an independent review.

> **Cycle 1's Step 4b result: `no-executable-blocks`** (information, exit 0). 17 bash blocks, 0 placeholder, all 17 correctly refused as mutating — the file documents `git push`, `awk`, write redirections and the like because that is what the pipeline does. The new section's own snippet was among the refusals (`unrecognised-command: command`), so it would have shipped unexecuted; it was run by hand against the bundled path and works.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.99.qa-loop-diminishing-returns-exit`
**PR**: https://github.com/Gamaroff/agent-skills/pull/361
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
