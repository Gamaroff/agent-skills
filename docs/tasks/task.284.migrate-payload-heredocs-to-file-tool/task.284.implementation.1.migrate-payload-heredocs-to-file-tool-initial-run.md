# Implementation Report: Migrate shipped payload heredocs to the file tool

**Task**: `task.284.migrate-payload-heredocs-to-file-tool.md`
**Run Number**: 1
**Started**: 2026-11-20 10:50
**Status**: In Progress
**Report format**: 2

---

## Summary

Move each allow-listed payload heredoc in shipped skill prose to the file tool plus `--body-file` / `--findings-file`, delete its ratchet allowlist entry, and cite the fresh-body-post recipe at the other posting sites.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml devLoadAlwaysFiles) — checked in Step 3    |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.284.*` exists in git                              | Branch created at `850985da3`, pushed | —                    | (not measured)  |
| 2. review-task             | ✅ Done    | `task.284.review.{N}.{name}.md` exists (or skip logged)                | review.1: 8/10, READY; 5 important fixed in the document; task promoted to ready-for-development | —                    | 2026-11-20T08:51Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 31 heredocs migrated, allowlist emptied; `ci:fast` green on the LAN server (12m51s) | —                    | 2026-11-20T09:44Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.284.qa.{N}.*.md`; `task.284.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.284.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-20

- Feature branch base: develop — source: recommended (`--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 0 (`--defaults`; nothing in conflict)
- Mode: standard — source: detector (risk_level absent, 5 phases ≥ 3, so not lite); no skips
- Phase 0 run inline (no 0a-parallel agents): lite-mode inputs derived from the document by the orchestrator
- Run via `/develop-next`; heavy test runs go to the LAN server (`npm run test:remote`) per operator instruction
- Tracker: none linked (no `github_issue`); issue signals skipped

### Step 3 — develop (inline; `/develop` not invoked) — 2026-11-20

- Step 3 inline — `/develop` not invoked: the work is prose migration across 30-odd documents, planned in the task's five phases; no separate plan file beyond the task document.
- Surface map: 8 `shared/resources` files (lock, comment and resume sites), 16 skill `SKILL.md` files (qa, finalise, create-pr/issue, ensure-*, review-*, sync-github-*), the ratchet test, and the bundled `references/` copies.
- Design decision: values a heredoc used to expand (lock `started_at`, finalise `FINAL_GATE`/`DOD_PATH`) are printed first and typed into the file. Epic and story create blocks derive their own values rather than re-binding printed ones, because an unbound `MILESTONE_TITLE` reads as "no epic" (task.206 CR-2).
- Gate 1 (`ci:fast`, LAN server) failed on five suites that pin the old prose (ensure-epic/story self-derivation, step-0 ```markdown fence, stale-snapshot bind block, qa-read-back guard position, tmp-leak). Each was a real regression in my prose or a test pinning the old shape; all fixed and gate 2 is green. The qa read-back guard is now repeated immediately before each post.
- Mutation proof: one added `cat > … <<EOF` line in `file-write-rules.md` turned the ratchet red; reverted byte-identically (`cmp`).
- Open: the `uptime; time CI=true npm test` comparison against `develop` is not yet measured.
- One `sed -i` was used for a test-title rename, against the operator's shell rule; the change is a one-line rename.

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
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
