# Implementation Report: Skill install profiles with dependency closure

**Task**: `task.84.skill-install-profiles.md`
**Run Number**: 1
**Started**: 2026-09-04 22:05
**Status**: In Progress

---

## Summary

Add install profiles (minimal/pipeline/full) plus per-skill add-ons to `setup-consumer.sh`, resolve the dependency closure over a generated skill call graph, apply the task-83 tracker filter after closure, and persist the choice in `skills-config.yaml` so `--update` is reproducible.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto — develop-next autonomous run)                             |
| PR target           | `develop` (auto — develop-next autonomous run)                             |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set (frontmatter has no `risk_level:`)                                 |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (issue #317 created during Step 2)                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.84.*` exists in git                               | `feature/task.84.skill-install-profiles` created from `develop` at `a0ac4b8`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.84.review.{N}.{name}.md` exists (or skip logged)                 | `task.84.review.1.skill-install-profiles.md` — READY TO IMPLEMENT, 9/10; 0 critical / 8 important / 3 optional, all important applied. Status Planned → Ready for Development | 2 Explore pre-pass agents (architecture alignment → `drift`; codebase scan → `not-started`) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 5 phases; 12 files + 20 SKILL.md `invokes:` declarations; 30 new tests; `npm run ci:fast` green (2398 tests, 0 fail); 6 guarantees mutation-proven. **Graph design changed** from prose-scrape to declared frontmatter — see Issues Log | 2 Explore pre-pass agents (Step 2); no third dispatched — their output was a superset of the pre-develop surface map |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.84.qa.{N}.*.md`; `task.84.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.84.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-04

- Invoked by `/develop-next` (roadmap item **T84**, PHASE 5 — Current frontier; deps satisfied: T83).
- Feature branch base: `develop` — auto-answered with the recommended option per the develop-next autonomous directive (Q1).
- PR target branch: `develop` — auto-answered with the recommended option per the develop-next autonomous directive (Q2).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0b: no prior run detected (no `feature/task.84.*` branch, no PR, no implementation report) — starting fresh, resume prompt not reached.
- Phase 0c status handling: task status is `planned` → proceed; Step 2 (`/review-task`) promotes it to `Ready for Development`.
- Phase 0a-parallel: resolver agent not dispatched (file path supplied inline). Tracker poller not dispatched (no `github_issue:`/`jira_key:` in frontmatter — nothing to poll). Lite-mode inputs read directly from the document rather than via a subagent; note that `references/develop-pipeline-step-0-resolve-and-prepare.md` refers to a "production lite-mode CLI" that does not exist in this repo.
- Pipeline mode `standard`, computed from: `risk_ok = true` (risk_level absent), `phase_count = 5` (**not** < 3), `single_module = false` (touches `scripts/`, `shared/resources/`, `docs/`, `package.json`). Two of three booleans false → standard.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`.
- Platform resolved: `VCS=github`, `TRACKER=github`.
- Step 1: branch base `develop` used without prompting (autonomous). Implementation report stashed before branch creation, restored after — clean pop.
- Step 1 tracker signal skipped: `TRACKER_ISSUE` empty (task frontmatter has no `github_issue:`). Step 2 `/review-task` created it; the work-started signal fired then.

### Step 2 — review-task — 2026-09-04

- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 0a branch setup auto-skipped: already on `feature/task.84.*`.
- review-task Step 2 check 5 tracker-sync question auto-answered: **Sync to GitHub** (the recommended option). Dedup search (`in:title "[Task 84]"`, `--state all`) returned zero matches → created issue **#317**, labels `task` + `priority:medium`, milestone `Technical Tasks (standalone)`, matching the convention of task 83 (#316). `github_issue: 317` and a body cross-reference link written to the task frontmatter.
- Deferred Step 1 signal then fired against #317: `work-started` comment posted (`reason: posted`), board moved to **In Progress**.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. 8 important fixes applied to the task document and plan, 0 skipped.
- review-task Step 9 auto-answered: **Yes, fixes complete** — outcome was READY TO IMPLEMENT (9/10), so `planned` → `ready-for-development` in frontmatter and `**Status:** Planned` → `Ready for Development` in the body; two Change Log rows written (verdict row bumps to 1.1; status-transition row leaves Version blank) and `updated:` bumped to 2026-09-04.
- Sign-off check skipped — `sign-off` absent from `skills-config.yaml`.
- Change Log currency check did not fire — status had not advanced past `planned` at review time.
- Tracker-card preflight (`sync-jira-task.js --check-card`): exit 0, zero findings; three blocks resolve.
- **develop-task Step 2's own `--stage review` tracker comment was deliberately not posted.** `/review-task` Step 10 had just posted a strictly richer comment (`--stage review-task`) covering the same outcome, findings counts, review-artifact path and the full list of applied fixes. The two stages carry different idempotency markers, so both would have posted — two near-identical comments on the same issue minutes apart. Skipped as redundant, not as failed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Step 3 — 2026-09-04

- **The task's specified dependency-graph design does not work, and was replaced.** §3 specified
  scraping `/slash-command` tokens from `SKILL.md` (+ `references/`). Built first, measured, and it
  fails in both directions — every variant either explodes the graph (`minimal` and `pipeline` both
  closing to ~34 of 120 skills, making the profiles indistinguishable and the feature worthless while
  reporting success) or drops real pipeline steps (`develop-story` 9 → 3). Root cause: a
  `/slash-command` token carries no direction, and prose is full of reverse references, including
  `skills/review-code/SKILL.md:180`'s literal "`/develop-story` and `/develop-task` do **not** call
  `/review-code`", which the scrape reads as two edges. Replaced with a declarative
  `invokes: [...]` frontmatter key on 20 skills; the generator, the committed JSON, the CI drift
  check and every §9 criterion are preserved. The scrape survives as an advisory report
  (`npm run skill-deps:candidates`) serving Risk 1's "catch a missed edge" intent. Full measurement
  table recorded in the task doc §3. **Flagged for the user — this changes a documented design
  decision.**
- **macOS symlink bug found and fixed.** `resolve-skill-set-cli.mjs`'s main-guard compared
  `process.argv[1]` to `fileURLToPath(import.meta.url)`. Node resolves an ESM module's URL through
  symlinks; `mktemp -d` on macOS returns `/var/...`, a symlink to `/private/var/...`. The compare
  failed, `main()` never ran, the CLI exited 0 with empty stdout, and the installer read that as
  "resolve produced nothing". Both scripts now compare real paths. Found by running the installer
  against a real temp dir rather than from the repo root.
- **`node` can be shadowed by a shell function.** nvm defines one. During testing it printed ~100
  lines of help text and exited 0, which `_resolve_skill_set` captured as "skill names"; every real
  skill then looked outside the profile and the install would have been near-empty *and reported as
  success*. Hardened: the resolved output is shape-checked (`^[a-z0-9][a-z0-9-]*$` per line, non-empty)
  and a failure falls back to the **unfiltered** install, never the empty one. Regression test added.
- Closure reporting bug fixed: seeds were counted as dependency-pulled, so `full` reported "15 pulled
  in by dependency" when everything was chosen.
- Measured context saving (GitHub consumer, post task-83 filter): `full` 109 skills / 35,425 desc
  bytes; `pipeline` 35 / 13,894 (−61%); `minimal` 5 / 1,893 (−95%). No literal is hardcoded in any
  assertion — the test measures both sides in the same run.
- **`--update` verified against a real invocation, not just a unit test** (§9 Migration criterion).
  Scratch repo with 6 skills pre-installed and `skills.profile: pipeline` in config, then
  `setup-consumer.sh --update --dry-run`: resolved the profile from the config file with no wizard
  (35 skills), reported the task-83 tracker filter (11 Jira-only) alongside it, wrote nothing, and
  left all 6 installed skills in place — including `use-railway`, `docker` and `jira-sprint-manager`,
  which are all outside the `pipeline` profile.
- `npx prettier --check` clean on every file touched. `shellcheck` **not run** — it is not installed
  on this machine and there is no CI lane for it yet (that lane is task 92's scope). The §9
  code-quality criterion "no new shellcheck warnings" is therefore **unverified**, not met or unmet.
- Mutation-proving: all six guarantees reverted and confirmed red — tracker-filter ordering (3 fail),
  visited set (hang/timeout), silent re-add of excluded skill (2 fail), config-first profile
  resolution (1 fail), profile grandfather `continue` (1 fail), stale committed graph (2 fail).

### Step 2 — 2026-09-04

- **Board `Estimate` field absent.** `set-github-project-estimate.sh` reported `'Estimate' number field not found` on the `Agent Skills` board, so `estimated_effort_hours: 8` was not mirrored. Non-blocking; Priority (P2) was set successfully.
- **`references/develop-pipeline-step-0-resolve-and-prepare.md` cites a "production lite-mode CLI" that does not exist.** No such script is present in `shared/resources/` or any skill's `scripts/`. Lite-mode inputs were read from the document directly instead, and `PIPELINE_MODE` computed from the three booleans as the Aggregation block specifies. Worth filing separately — the step doc instructs an agent to run something unavailable.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.84.skill-install-profiles`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
