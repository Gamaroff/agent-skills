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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.99.qa.{N}.*.md`; `task.99.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
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

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.99.qa-loop-diminishing-returns-exit`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
