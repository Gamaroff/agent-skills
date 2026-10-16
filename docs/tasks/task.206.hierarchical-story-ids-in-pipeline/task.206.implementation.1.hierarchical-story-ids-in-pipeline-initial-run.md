# Implementation Report: Hierarchical story ids in the pipeline

**Task**: `task.206.hierarchical-story-ids-in-pipeline.md`
**Run Number**: 1
**Started**: 2026-10-16 08:21
**Status**: In Progress

---

## Summary

Move every story-side id reader/writer onto the task.202 doc-id engine so the pipeline runs on story.{P}.{E}.{S} documents — first run, dispatched by /develop-next (roadmap T206).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop (source: recommended, --defaults) |
| PR target           | develop (source: recommended, --defaults) |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set (absent) |
| Pipeline mode       | standard (source: detector — risk absent, phase_count 4, single_module false) |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; Priority already P2 Medium) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.206.*` exists in git                             | Branch created at `4378323e` | —                    | 2026-10-16T06:22Z |
| 2. review-task             | ✅ Done    | `task.206.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 8/10 — 0 Critical, 7 Important (all fixed), 2 Optional; `task.206.review.1.hierarchical-story-ids-in-pipeline.md`; Planned → Ready for Development | —                    | 2026-10-16T06:27Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 3 fast-gate iterations — iter 1: 5 failing tests (moved literals), iter 2: prettier, iter 3: 5752/0; status → Ready for Review | —                    | 2026-10-16T07:01Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.206.qa.{N}.*.md`; `task.206.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.206.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-16

- Feature branch base: develop — source: recommended (auto-answered via --defaults; AUTONOMOUS RUN, develop-next T206)
- PR target branch: develop — source: recommended (auto-answered via --defaults)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0d answer resolution (`pipeline-answers.js`): 0 questions asked; mode: standard — source: detector; skips: none; refused: none
- Phase 0 run inline (no Explore fan-out): file path given directly; risk_level absent, phase_count 4, single_module false → PIPELINE_MODE=standard
- Task status at start: `planned` — proceed; Step 2 (`/review-task`) validates and promotes
- Always-load files resolved: 3 files — from skills-config.yaml `devLoadAlwaysFiles`
- Branch: `feature/task.206.hierarchical-story-ids-in-pipeline` from `develop` @ `4378323e`, pushed with upstream
- Tracker #649: work-started comment `posted`; board work-started `transitioned` → In Progress
- Phase 0b: no prior run (no branch, PR or report for task.206) — fresh start
- review-task output: Comprehensive report — required for pipeline audit trail
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task
- review-task author decisions (task Notes) taken at their recommended options: fixture parents → stubs; `{p}`-less `branchPattern` → refused
- Review report: docs/tasks/task.206.hierarchical-story-ids-in-pipeline/task.206.review.1.hierarchical-story-ids-in-pipeline.md (reviewed_blob stamped)
- Pre-pass B aligned (prepass-axes source: architecture); pre-pass C not-implemented
- Review outcome comment skipped — review-task reported posted (stage review-task)
- Tracker key unchanged at Step 2 re-read (#649) — no work-started re-fire
- Pre-develop surface map: 19 files identified in shared/resources (finalise-fix-and-recheck, bug-doc, doc-id, migrate-doc-numbering), skills/{create-story,session-handoff,qa-next,develop-next}/scripts, their node:test suites, and the executed-prose harness (`shared/resources/tests/lib/executed-prose.mjs`); ESM sites load doc-id via `createRequire` + `require("./doc-id.js")`, skill scripts via `../references/doc-id.js`
- Plan file found: docs/tasks/task.206.hierarchical-story-ids-in-pipeline/task.206.plan.hierarchical-story-ids-in-pipeline.md — included as implementation context (corrected by review.1)
- Step 3 inline — /develop not invoked: the plan names every site and the surface map is recorded; /develop would only re-read them
- Fast gate: `npm run ci:fast` (develop.fastGateCommand unset → suggested default; script defined — precondition passed)

### Step 3 — develop (inline)

- Baseline before Phase 1: `npm test` on `4378323e`, 117 s wall (08:28:00 → 08:29:57, load 0.80 → 3.71); one failure was the bundle-freshness test tripped by a mid-run edit, so the clean comparison below supersedes it
- Fixture parents: stubs (Notes, decision 1). The migration requires the PRD to own `epics/`, so each develop-story tree's `feature/` was renamed `prd.feature/` and given a PRD stub and an epic stub (`epic_number: 5`) before the run
- Migration log (`migrate-doc-numbering.mjs --root docs/prd --apply --allow-in-flight`, one throwaway git repo per tree; the run's registry writes were not copied back):
  - 02-review-story: ok: 1 PRD, 1 epic(s), 1 story(ies), 4 file(s) under docs/prd
  - 03-develop-loop: ok: 1 PRD, 1 epic(s), 1 story(ies), 3 file(s) under docs/prd
  - 05-qa-story: ok: 1 PRD, 1 epic(s), 1 story(ies), 4 file(s) under docs/prd
  - 06-qa-fix: ok: 1 PRD, 1 epic(s), 1 story(ies), 3 file(s) under docs/prd
  - 07-finalise: ok: 1 PRD, 1 epic(s), 1 story(ies), 4 file(s) under docs/prd
  - 08-commit-changes: ok: 1 PRD, 1 epic(s), 1 story(ies), 3 file(s) under docs/prd
  - 10-qa-pass-low-only-cosmetic-residue-routes-to-5c: ok: 1 PRD, 1 epic(s), 1 story(ies), 6 file(s) under docs/prd
  - 11-qa-budget-spent-gate-the-last-fix-half-cycle: ok: 1 PRD, 1 epic(s), 1 story(ies), 15 file(s) under docs/prd
  - 12-qa-reentry-after-loop-limit-with-grant: ok: 1 PRD, 1 epic(s), 1 story(ies), 19 file(s) under docs/prd
- Every tree: `prd.feature → 1`, `epic 5 → 1.1`, `story.5.1 → story.1.1.1`; scenario.json / README / `.eval` / lock references rewritten to match
- `create-story` `01-happy`, `03-sign-off-enabled` (and the path `02-missing-core-config` names) are flat `docs/stories/` files with no PRD or epic: renamed by hand to `story.1.178.{8,9}` — the migration cannot place a parentless story
- Mutation proofs (each site's change reverted, the named test went red, restored):
  - finalise-fix-and-recheck isCoLocatedArtifact: old `story\.\d+\.\d+` stem restored → 'isCoLocatedArtifact keys on the doc-id story id…' red
  - bug-doc resolveBugMode: old RE_STORY_BUG restored ahead of doc-id → 'a sub-story bug resolves to its sub-story parent…' red
  - create-story lib storiesOfEpic: prefix regex `^story\.P\.E` instead of matchesEpic → 'scanExistingStoryIds — scoped to the epic (P, E)…' and 'nextStoryId … isolation' red
  - continuation.mjs: HEAD version restored (STORY_BRANCH two-number regex) → 3 story tests red incl. 'story.1.2.3 never reads story.1.2.30…'
  - continuation.mjs makeFindStory: id match replaced by `name.startsWith(id)` → 'PRD root precedence' red (walks into story.1.2.30)
  - uat-status storyFile: unparseable name skipped instead of reported → 'scanStories reads story.P.E.S…' red
  - uat-status: epicSurface keyed on E alone + old `\b\d+\.\d+\b` storyIds → 'scanStories…' and 'storyIds collects P.E.S…' red
  - select-next epicRef: old `\bEpic\s+(\d+)\b` keying restored → 'Epic P.E: a heading keys…', 'a legacy ## Epic 8 … ERRORS' and 'epicRef reads doc-id's epic grammar' red
  - Step 0 epic resolution: matchesEpic(b, P, E) → `p.epic === E` (E alone) → 'Step 0 reads story.1.2.3 … resolves the ONE epic (1, 2)…' and 'HALTs on zero epic documents' red
  - Step 0a.3 auto-skip: epic-wide glob `feature/story.P.E.*` added back → 'Step 0a (review-story) … auto-skips only on the story's own branch' red
  - create-branch 2b.4: `{p}` refusal removed → 'create-branch 2b.4 derives … refuses a pattern without {p}' red
  - ensure-story S1: the epic (P, E) equality guard removed → 'ensure-story S1 and sync-github-story Step 3 …' red (a stray story would take another epic's milestone)
- Fast gate iteration 1 (`npm run ci:fast`, `.agents/skills` moved aside): 5 failures — tests pinning moved literals (roadmap template id, create-branch `epic/` namespace, Step 0 sweep row, create-story validator examples, two undeclared `STORY_FILE_PATH` inputs); all five updated
- Iteration 2: prettier on one test file; `validate:all`, `bundle:check`, `lint:shell`, `check:generated` all exit 0
- Iteration 3: `ci:fast` exit 0 — 5752 tests, 0 failures; `eval:all` exit 0
- Timing criterion: base `4378323e` (clean worktree) 115.7 s, load 5.52; head (working tree) 117.2 s, load 4.74 → +1.3%. eval:all scenarios 44 → 44
- Deviations recorded in the task's Implementation Record: uat-status `storyIds` (an unlisted fourth two-number pattern), `nextStoryId` now highest + 1 (one allocator), the stub epic numbered 1.1, both create-story fixtures hand-renamed, bug-doc sub-story corroboration
- Deferred: task.205's review-epic 0a stanza is still positional (`awk -F.` reads P) — out of scope, noted for task.207
- Commits: 6f81bb5e (Phase 1), 232051a1 (Phase 2), b165c987 (Phase 3), 49b975e1 (fixtures), 4e778ba1 (bundles), b8f1388a (docs)
- Loop audit iter 1 (Explore): status ready-for-review, 15/15 plan checkboxes, head b8f1388a → exit loop
- Development completion comment posted to github issue 649 (stage develop-complete, count 15)
---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## Tracker Actions Required <!-- optional -->

_Tracker mutations this run wanted but did not perform — because `access.tracker` restricts this
run, or because the call failed. Rendered from `.claude/state/tracker-actions.jsonl` by
`handover-render.js --format summary`; the committed checklist, script and JSON sidecar are the
`*.handover.{n}.{name}.{md,sh,json}` artifacts beside this report. **Omit this section entirely when
the journal is empty** — an empty heading reads as "nothing was deferred" in the same shape it would
read as "the renderer broke"._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.206.hierarchical-story-ids-in-pipeline`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
