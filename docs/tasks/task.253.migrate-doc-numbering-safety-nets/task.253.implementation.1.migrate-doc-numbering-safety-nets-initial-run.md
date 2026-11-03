# Implementation Report: migrate-doc-numbering: link, frontmatter and downstream safety nets

**Task**: `task.253.migrate-doc-numbering-safety-nets.md`
**Run Number**: 1
**Started**: 2026-11-03 00:00
**Status**: In Progress

---

## Summary

Run the six migrate-doc-numbering safety-net gaps (multi-line links, post-apply scans, frontmatter, link-free stub, dirty/behind guard, generated files, legacy-name warning) through the full pipeline, tests first.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.253.*` exists in git                              | Branch created at `05dc71ad` | —                    | 2026-11-03T00:00Z |
| 2. review-task             | ✅ Done | `task.253.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; 0 critical, 3 important fixed; status → ready-for-development | —                    | 2026-11-03T19:50Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline, 5 phase commits (`7df115b6`..`1b70e777`); audit 14/14; gap 3 dropped (did not reproduce) | —                    | 2026-11-03T21:00Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.253.qa.{N}.*.md`; `task.253.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.253.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

---

## Decisions Log

### Pipeline Startup — 2026-11-03

- Feature branch base: develop — source: recommended (--defaults, develop-next)
- PR target branch: develop — source: recommended (--defaults, develop-next)
- Mode: standard — source: detector (5 phases, so not lite; risk_level absent)
- Phase 0 run inline (no Explore fan-out): task has no tracker issue, so the poller was skipped; lite inputs read from the document directly.
- Task status `planned` — proceeding; Step 2 /review-task will validate.
- Always-load files resolved: 3 files — from skills-config.yaml devLoadAlwaysFiles
- qa-planning gate: skipped (auto — no prompt)
- Run started by /develop-next (item T253, task-registry fallback).

### Step 2 — Review (2026-11-03)

- Review report: docs/tasks/task.253.migrate-doc-numbering-safety-nets/task.253.review.1.migrate-doc-numbering-safety-nets.md — READY TO IMPLEMENT 8/10; 0 critical, 3 important (all applied), 1 optional.
- review-task output: Comprehensive report — required for pipeline audit trail.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — status Planned → Ready for Development.
- Review pre-pass subagents (architecture alignment, already-implemented) did not run: checks were done inline. Independent review of those two axes did not happen.
- Key review finding: gap 1's cause is the per-line apply loop in migrate-doc-numbering.mjs, not the doc-links matcher; the task now says so.
- No tracker issue linked: outcome comment skipped.

### Step 3 — Develop (advisor notes folded in)

- Plan file found: docs/tasks/task.253.migrate-doc-numbering-safety-nets/task.253.plan.migrate-doc-numbering-safety-nets.md — included as implementation context for /develop.
- Pre-develop surface map: 6 files identified in shared/resources (migrate-doc-numbering.mjs, doc-links.js (conditional), tests/migrate-doc-numbering.test.mjs, tests/doc-links.test.mjs (conditional)), CHANGELOG.md, docs/standards/*.md and docs/contributing/traps.md that describe the tool; bundled copy skills/review-prd/references/migrate-doc-numbering.mjs via npm run bundle. Map made inline (Explore not dispatched); independence loss recorded.
- Planned/Draft gate auto-answered: Yes — review-task validation in Step 2 is sufficient.
- Fast gate precondition: `npm run ci:fast` defined — ok.
- Hazards to honour (from advisor): (1) gap-1 fix must not rewrite a fenced copy on a following line, so it needs the target's own line from the scanner, with a fenced control fixture; (2) behind-upstream check must decide fetch vs report `@{u}` staleness and have fetched-not-pulled and never-fetched fixtures; (3) reuse inRewriteScope/isHistory/isTestFixture for generated files; (4) leave citable evidence for the QA report (Phase 1 results table in the task doc, committed mutation log).

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
