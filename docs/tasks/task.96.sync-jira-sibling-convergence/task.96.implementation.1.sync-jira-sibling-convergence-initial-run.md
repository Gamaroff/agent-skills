# Implementation Report: sync-jira-story/task/epic never converge — label diff and post-transition timestamp

**Task**: `task.96.sync-jira-sibling-convergence.md`
**Run Number**: 1
**Started**: 2026-09-07 00:00
**Status**: In Progress

---

## Summary

Port the two convergence fixes proven on the `sync-jira-bug` path (PR #338) into `sync-jira-story`, `sync-jira-task` and `sync-jira-epic`: diff labels against the payload actually sent, and re-read the `updated` timestamp after any successful transition — with end-to-end "sync twice, second run is a no-op" coverage per script.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set (frontmatter has no `risk_level`)                                  |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (GitHub Projects — "Agent Skills" board)                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.96.*` exists in git                               | `feature/task.96.sync-jira-sibling-convergence` created at `706770f4`, pushed w/ tracking | —                    |
| 2. review-task             | ✅ Done    | `task.96.review.1.sync-jira-sibling-convergence.md` exists             | READY TO IMPLEMENT, 8/10. 2 Critical / 5 Important / 3 Optional — all applied. Status `planned` → `ready-for-development` | Phase 1.5 pre-pass ×2 (inline, see Decisions Log) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 4/4 phases. 2672 pass / 0 fail. 6 fixes mutation-proven. Extraction: YES (`diffAgainstPayload`) | Pre-develop surface map (inline, see Decisions Log) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.96.qa.{N}.*.md`; `task.96.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.96.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-07

- Phase 0a-parallel: resolver not dispatched (explicit file path supplied and read inline); tracker poller and lite-mode detector satisfied inline from the task frontmatter and `skills-config.yaml` — no subagent failures.
- Q1 asked — Feature branch base: **develop** (Gitflow default; current branch is `develop`)
- Q2 asked — PR target branch: **develop** (Gitflow default)
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 2 (matches the develop-task required count)
- Pipeline mode: **standard** — computed from `risk_level=absent` (risk_ok=true) AND `phase_count=4` (NOT < 3) AND `single_module=false` (touches three skills plus `shared/resources/`). Fails on two of three booleans.
- Tracker: GitHub, issue #343 (`JIRA_URL` unset)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (all verified present)
- Task status on entry: `planned` — proceeding; Step 2 (`/review-task`) promotes it.

### Step 2 — review-task — 2026-09-07

- Output format auto-answered: **Comprehensive report** (pipeline default).
- Step 0a branch setup auto-skipped — already on `feature/task.96.sync-jira-sibling-convergence`.
- Phase 1.5 pre-pass: 2 Explore subagents dispatched in parallel (claim verification against HEAD; repo-conventions scan). Both returned; neither failed.
- **Verification result: every defect claim in the task holds, with no line drift** — story `:898` / task `:681` / epic `:912` diff blocks byte-identical; `collectIssueFields` appends `synced-from-*` so `diffFields` (`jira-sync.js:2084-2086`) can never converge; bug `:834` correct; and epic's `:990` re-read confirmed **dead code** behind the `:948` gate.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. 25 edits to the task file, 9 to the plan file. 0 skipped.
- **3 questions escalated to the user** (not covered by the autonomous-defaults table, non-trivial stakes):
  - Family registry has no home in the repo → **defer to task.93, park drafted entry in §Notes**
  - Fake Jira is not a reusable harness → **generalise into a shared helper first** (Phase 1 prerequisite)
  - PUT-count criterion unachievable for `sync-jira-task` (no skip gate) → **scope to story + epic**
- Step 9 auto-answered: **Yes, fixes complete** — outcome was READY TO IMPLEMENT. Status promoted in frontmatter, body header and trailing footer; Change Log gained a `1.2` verdict row and a status-transition row.
- Step 10: review outcome comment posted to GitHub issue #343 (`reason: posted`).
- Post-edit verification: card preflight exit 0 (no findings), `prettier --check` clean.

### Step 3 — develop — 2026-09-07

- Pre-develop surface map: 1 Explore subagent, ~20 files across the four scripts, `jira-sync.js`, the four `tests/` dirs and `package.json`. Not re-read in main context.
- Plan file found: `task.96.plan.sync-jira-sibling-convergence.md` — included as implementation context.
- Always-load files: 3 (coding-standards, tech-stack, source-tree) — all read.
- **Helper location changed from the review's `tests/helpers/` to `tests/lib/`** — the surface map found `tests/lib/relationship-assertion-lint.js` as the repo's established home for shared test helpers. Task doc, plan and review report all updated to match.
- **Phase 1** — harness generalised into `tests/lib/fake-jira.js`; bug suite re-pointed and its 5 assertions pass unchanged; 12 new sibling tests written and confirmed **red first**.
- **Phase 2** — label diff fixed in all three. Story needed the predicted two-pass build (`includeDescription` at `:944-946` derives from the diff); task and epic were straight reorders.
- **Phase 3** — post-transition re-read added to story, task and epic's update path at `:1428`.
- **Phase 4 — extraction decision: EXTRACT.** The pre-Phase-1 evidence said "keep local", and it was wrong because it compared the payload *builders* (which differ) rather than the corrected *diff blocks* (which are byte-identical). A helper taking the already-built `fields` needs no discriminating parameter. All four migrated; `sync-jira-bug`'s assertions unchanged.
- **Mutation proof**: all 6 fixes reverted individually, named tests confirmed red, restored. Story label 3→1 pass, task label 4→2, epic label 5→1, and each transition re-read disabled → story 3→1, task 4→1, epic 5→1.
- Doc sweep: `sync-jira-task/SKILL.md:418` literal test count replaced with a description; `jira-sync.js` header un-staled. `CHANGELOG.md` entry under `### Fixed`.
- `npm run bundle` fanned `jira-sync.js` to 22 bundled copies; `generate-catalog` and `generate-skill-deps` produced no drift.
- Implementation report stashed before branch creation, restored after (clean pop).
- Step 1 tracker signal: comment posted (`reason: posted`); board `work-started` Todo → **In Progress** (verified). Priority already `P1 High` — left untouched (never overwrite a human's choice).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Accepted risk (Step 2)**: `estimated_effort_hours: 8` is likely low — the rubric recomputes to 16h now that the harness generalisation is in Phase 1. The user was offered the bump alongside the generalisation decision and chose the generalisation without it, so 8 stands as a deliberate choice. Recorded in the review report under "Accepted Risks Carried Forward" rather than silently changed.
- **Deferred (Step 2)**: `sync-jira-task` and `sync-jira-bug` have no skip-when-no-diff gate while story and epic do. That asymmetry is itself family drift, but it is a separate defect from the two in scope. Logged in the task's §Notes → Known Issues for its own task.

---

## QA Iteration History

_Track each QA review/fix cycle._

**Findings surfaced during Step 3 (not defects in this work — recorded for follow-up):**

1. **A third convergence defect exists on the create path.** `newBodyHash` is computed from the body *before* the write-back mutates it, so the first update after a create can report `description` changed. It self-corrects from run 3 onward. Out of scope for task.96 (§4 limits it to the two named defects) and pre-existing — the create path was not touched by this work.
2. **The change-log marker can bleed into a preceding card section.** `<!-- change-log-start -->` is inserted immediately before `## Change Log`; when a card section (e.g. `## Success Criteria`) is the section directly before it, the marker is swallowed into that section's extracted content and changes the body hash. Only reachable in documents where the two are adjacent — the first task fixture hit it, real task docs have sections in between. Worth its own bug report.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.96.sync-jira-sibling-convergence`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
