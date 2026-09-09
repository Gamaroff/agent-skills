# Implementation Report: observe-work — config schema, skill boundaries and the meta-skill family

**Task**: `task.95.observe-work-docs-boundaries.md`
**Run Number**: 1
**Started**: 2026-09-09 07:58
**Status**: In Progress

---

## Summary

Close the documentation gaps left open by tasks 93 and 94: document the `observations:` config block, add reciprocal boundary notes to `autoskill` / `remember-insight` / `double-check`, and ship a seeded `skill-families.md` template so `observe-work`'s sibling check has a registry from day one.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Feature branch base | `develop`                                                                                                                |
| PR target           | `develop`                                                                                                                |
| qa-planning gate    | skipped (auto)                                                                                                           |
| Task risk level     | not set (`risk_level` absent)                                                                                            |
| Pipeline mode       | standard                                                                                                                 |
| Always-load files   | 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` |
| Tracker             | GitHub (`JIRA_URL` unset)                                                                                                |
| Tracker Issue       | [#341](https://github.com/Gamaroff/agent-skills/issues/341)                                                              |
| Board status        | In Progress ✅ (Todo → In Progress, verified) · Priority `P1 High` (pre-set, not overwritten)                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                                                                                                                     | Notes                                                                 | Subagent summary ref |
| -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.95.*` exists in git                                                                                                                                | Pre-existing from partial run; verified at `399799b7`, pushed to origin with upstream set | —                    |
| 2. review-task             | ✅ Done    | `task.95.review.{N}.{name}.md` exists (or skip logged)                                                                                                                  | **Skipped** — gate satisfied by `review.1` (see Decisions Log)        | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                                                                                                                       | 4 phases, 10 files, 10 tests added (all mutation-proven); 1 iteration | —                    |
| 4. create-pr               | ⏳ Pending | PR URL targets `develop`; issue comment posted                                                                                                                          |                                                                       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.95.qa.{N}.*.md`; `task.95.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted        |                                                                       | —                    |
| 7. finalise                | ⏳ Pending | `task.95.dod.{N}.*.md`; task `status: accepted`                                                                                                                         |                                                                       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                                                                                                                      |                                                                       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-09

- **Resume vs fresh**: previous partial run detected (branch + `review.1` committed as `399799b7`, no implementation report, no PR, no lock). User answered **"Resume on existing branch"** — reuse the branch and the actioned review 1; start real work at Step 3.
- **Q1 — Feature branch base**: `develop` (recommended; the existing branch is one commit ahead of `develop`).
- **Q2 — PR target branch**: `develop` (recommended; repo's Gitflow target).
- **qa-planning gate**: skipped (auto — no prompt), per Phase 0d.
- **Phase 0 fan-out**: no Explore subagents dispatched. Project instruction `AGENTS.md` / session guidance forbids calling the Agent tool unless the user requested it, so resolution, tracker read and lite-mode inputs were gathered inline via Bash. All three produced complete results; nothing was defaulted on failure.
- **Pipeline mode = `standard`**, computed from the three booleans: `risk_ok = true` (`risk_level` absent ∈ {low, absent}); `phase_count = 8` → **not** `< 3` → false; `single_module = false` (scope spans `docs/reference/`, three `skills/*/SKILL.md`, a new `skills/observe-work/assets/` template and `README.md`). Lite mode requires all three; two are false.
- **Always-load files resolved**: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all three verified present on disk.
- **Tracker resolved**: `TRACKER=github` (`JIRA_URL` unset), `TRACKER_ISSUE=341` from frontmatter `github_issue:`.
- **Status handling**: task status is `ready-for-development` → proceed normally (Phase 0c table).

### Step 1 — create-branch — 2026-09-09

- Lock collision check: no `.claude/state/develop-pipeline.lock` present → proceeded.
- `/create-branch` **not invoked**: per the resume decision the branch already existed and was checked out with a clean tree. Step 1's required artifact ("branch exists in git") was verified directly rather than re-created, per the resume contract.
- Branch pushed to `origin` and upstream set (it was local-only).
- Pipeline lock written with `current_step: 2`.
- Tracker `work-started` comment: `reason: posted`.
- GitHub board `work-started`: `Todo → In Progress`, `verified: true`, observed `In Progress` on board "Agent Skills".
- Board Priority: already `P1 High` — the P2 default was correctly skipped rather than overwriting a human's choice.

### Step 2 — review-task — 2026-09-09

- **Gate decision: SKIP.** Pre-review status is `ready-for-development` and `task.95.review.1.observe-work-docs-boundaries.md` exists → the develop-task decision table's `Ready for Development` + `Yes` row skips.
- No freshness computation was run, and that is correct: the freshness rule governs the `Planned` row only. `Ready for Development` skips on report *presence*, because reaching that status required passing this gate and the status is itself the assertion that a review completed.
- Review 1 verdict: `NEEDS REVISION` as authored → `READY TO IMPLEMENT` with fixes. The task body records all 4 Critical + 5 Important fixes implemented 2026-09-09 (commit `399799b7`), so the outcome is not a blocking finding.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 1** — the pre-existing branch had no upstream and did not exist on `origin`. Pushed with `git push -u` before writing the lock, so the branch named in the `work-started` comment actually resolves. Non-blocking; no other effect.

---

## Completion Summary

_Filled in at Step 8._

### Step 3 — develop (pre-develop) — 2026-09-09

- **Pre-develop surface map: 9 files across 4 modules** — built **inline (Bash/grep), not via an Explore subagent**. Session-level instruction forbids calling the Agent tool unless the user requested it; the task's own `## 7. Files Summary` and the co-located plan file already enumerate the surface exactly, so the map was verified rather than discovered. Deviation from the step-3 reference is deliberate and recorded here.
  - `docs/reference/configuration.md` — `## Full schema` (L27), `## Key reference` (L149), `## Environment variables` (L837); `loopSupervisor` block is the style exemplar; `## Tracker workflow` (L283) is the prose-section exemplar.
  - `skills/autoskill/SKILL.md` (142 L) — `## Constraints` L136 is the tail; `## When to activate` L10 is where a reader looks for scope.
  - `skills/remember-insight/SKILL.md` (101 L) — `## What NOT to save` L91.
  - `skills/double-check/SKILL.md` (358 L) — `## When to Use This Skill` L37, `## Known Limits` L317.
  - `skills/observe-work/SKILL.md` (15.9 KB) — Session Start Protocol step 1 takes the one-line pointer; `assets/` does **not** yet exist.
  - `skills/observe-work/tests/observe-work.test.js` (20.9 KB) — existing suite; `observe-work-hook.test.js` is its sibling.
  - `README.md` — badge L5 and prose L7 both read `115`.
  - `CHANGELOG.md`, `skills/observe-work/assets/skill-families.template.md` (to create).
- **Plan file found**: `task.95.plan.observe-work-docs-boundaries.md` — included as implementation context.
- **Always-load files**: 3 read and used as context.
- **Pre-develop fact-checks run against the tree** (rather than trusting the plan's claims):
  - `resolve-observation-workspace.sh` reads `observations.workspace` only (L145); precedence config → `$OBS_WORKSPACE` → project-identity default (L27–28, L142–152); ephemeral refusal covers `.claude/worktrees/`, `/tmp`, `/private/tmp`, `/var/tmp` and linked git worktrees (L103–131); anchor is the **main** worktree via `--git-common-dir` (L73–82). ✅ matches the plan.
  - `OBS_STALE_DAYS` default is **14** (`observe-work-session-start.sh:111`). ✅
  - `observations.enabled` / `observations.review_interval_days` have **no reader** anywhere in the tree — the only hits are task 95's own documents. ✅ confirms the "do not document" instruction.
  - `parseFamilies()` (`shared/resources/observation-log.js:907`) requires `≥4` cells, skips separator and `Family` header rows, splits `Members` on `,` or `/`, `Shared`/`Member-specific` on `;`, and returns `{name, members, shared, memberSpecific}` — no coherence field. ✅
  - `families --audit` resolves `skills/<member>/SKILL.md`, tests `body.includes(rule)` per shared rule, suppresses via a **two-way** substring test against `memberSpecific`, and reports `reason: "already"` when `gaps` is empty. Noted: zero gaps ⇒ `already`, not `ok`.
  - Live skill count is **126** (`ls -d skills/*/ | wc -l`). ✅ matches the plan.

### Step 3 — develop (result) — 2026-09-09

**Outcome: complete in one iteration.** No stall, no test-failure triage cycle, no blocking condition.

Phases, each verified rather than asserted:

1. **Config schema** — `observations:` block (one key) in the Full schema, a Key reference row, `OBS_STALE_DAYS` in a new `### observe-work` Environment-variables subsection, and a `## Observation workspace` prose section covering the resolver order, the ephemeral refusal, the cwd rule and the user-scope rule. Verified by driving the resolver in a scratch project: config beat env, env was used when config was absent, and a `/tmp` anchor was refused with a non-zero return rather than defaulted.
2. **Boundary notes** — `autoskill`, `remember-insight`, `double-check`, each with the family's shared sentence verbatim. `npm run generate-catalog` produced **no diff**, which is the proof no `description:` moved.
3. **Family template** — `skills/observe-work/assets/skill-families.template.md`, a four-column table seeded with the meta-skills family plus a deliberately three-column guidance table the parser skips. `families --audit` against this repo returns **zero gaps**. A pointer was added to Session Start step 1, conditioned on an *empty* registry (never a missing one — `init` always creates the file).
4. **README and changelog** — badge and prose 115 → **126** (the live `ls -d skills/*/ | wc -l`, not 115 plus this task's additions), `observe-work` added to the featured Meta list, and one `CHANGELOG.md` entry covering tasks 93–95 as one capability.

**Scope beyond the letter of the plan, and why.** The shared sentence went into **four** members, not the three Phase 2 names: Phase 3's zero-gap audit covers every member the family lists, `observe-work` included, so omitting it would have made the seeded family fail its own audit on first run — the exact failure Phase 3 exists to prevent. And §8's Contract Tests ask for the precedence and the `OBS_STALE_DAYS` default to be *asserted by driving* rather than read; ad-hoc probes in a session log are not assertions, so five contract tests were committed.

**Tests added: 10** — 4 family-template, 4 resolver contract, 2 `OBS_STALE_DAYS`. Every one mutation-proven: paraphrasing the shared sentence in one member, widening the guidance table to four columns, letting Member-specific swallow the shared rule, disabling the config tier, disabling the env tier, turning the ephemeral refusal into a warning, and documenting a reader-less key each turn a named test red, and the suite returns green on restore.

**One test was vacuous when first written.** The `resolveIn` helper returned a single value, collapsing "the resolver refused" and "the resolver exported an empty string" into one signal — so the ephemeral-refusal assertion passed against a warn-and-continue mutant. Only the mutation pass exposed it; the helper now returns `{ refused, workspace }` and the refusal test reads the status. This is `docs/reference/anti-patterns.md`'s "Never let one signal report two states", reproduced inside the test written to enforce a refusal. Logged as **observation #16**.

**Gates**: `npm run format` clean · `npm run ci:fast` **2901 pass / 0 fail** (2902 total, 1 skipped) · `generate-catalog` no diff · `npm run bundle` idempotent on the second run · `quick_validate.py` passes on all four affected skills · bundled resolver confirmed byte-identical to its source apart from the generated banner (mutation residue check).

**Deferred**: nothing. `/finalise` correctly **not** invoked — pipeline bypass applies, Step 7 owns it.
