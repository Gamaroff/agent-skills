# Implementation Report: security-probe: a uniform failure is declined, not scored

**Task**: `task.256.probe-uniform-failure-declined.md`
**Run Number**: 1
**Started**: 2026-11-04 09:40 UTC
**Status**: In Progress

---

## Summary

Make `security-probe` decline `entry-not-probeable` when every case fails the same way, so a usage error or a broken harness cannot publish false security findings.

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
| Board status        | In Progress ✅                                                             |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.256.*` exists in git                              | Branch created at `14e9d0ba`, pushed on the third attempt | —                    | 2026-11-04T09:42Z |
| 2. review-task             | ✅ Done    | `task.256.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT, 9/10 after 8 fixes; `task.256.review.1.probe-uniform-failure-declined.md` | —                    | 2026-11-04T09:48Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline; 301/301 probe tests, 18/18 mutations red | —                    | 2026-11-04T10:14Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.256.qa.{N}.*.md`; `task.256.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.256.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-04

- Feature branch base: develop — source: asked (Recommended)
- PR target branch: develop — source: asked (Recommended)
- Mode: standard — source: detector; computed inline from risk_level absent (risk_ok true), phase_count 3 (not under 3), so the AND is false
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 ran inline, not by subagent fan-out: the file path was given, the task and this session's context were already read, and the document names inline Phase 0 as a first-class case. Tracker poller not dispatched; issue #825 was created this session and has no PR.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Status at start: Planned; Step 2 validates and updates it.

### Step 2 — review-task

- review-task output: Comprehensive report — required for pipeline audit trail.
- Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete. Planned promoted to Ready for Development by review-task.
- Review report: `task.256.review.1.probe-uniform-failure-declined.md`. Review outcome comment skipped here: review-task reported `posted`.
- Independence: the session that wrote the task also reviewed it. Only pre-pass Agents B and C read it independently (B: drift, 2 findings; C: not-implemented).
- Critical finding C1, found by running the prototype: raw stderr leaked through the `needs-fake-gh` return. Plan changed so the key is removed before that return.

### Step 3 — develop

- Pre-develop surface map: inline, not by Explore: 4 files identified in `shared/resources`, read during Step 2 of this run — `security-probe.mjs` (the four arms, `runProbeSpec`, header), `tests/security-probe.test.mjs`, `tests/fixtures/security-probe/`, `probe-boundary-rule.md`; plus `security-probe-plan.mjs` (read only) and `CHANGELOG.md`. Independence loss: none beyond the review's, since the map only locates files the plan names.
- Plan file found: `task.256.plan.probe-uniform-failure-declined.md` — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan names every hunk, and its code ran as a prototype this session.
- Tests written first: 10 new tests plus an extended spawn test; on the unmodified engine 7 failed and the stay-scored rows passed, as intended.
- Mutation proof: 18 mutations of the engine, each run against the whole test file; all 18 went red in a test that guards the invariant, the engine was restored and compared to its snapshot. M4 (drop the both-directions condition) turned 66 tests red, because a hostile-only corpus is also the shape of most decline tests; the hostile-only row itself is among them.
- Result: `npm run lint:shell` clean, `npm run bundle:check` clean, prettier clean, no `*.run.json` changed against `origin/develop`.
- Develop loop: iteration 1 only, so the loop audit is the Step 3 check above, not a separate Explore pass. Independence loss: none claimed for the audit, which was done in-line.
- Development completion comment posted to github issue 825.
- Fast gate: `develop.fastGateCommand` is unset in `skills-config.yaml`, so the fallback `npm run ci:fast` applies; the precondition found that script defined.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3: `CI=true npm run ci:fast` ends 7201 pass, 1 fail. The failure is "under CI, every tool a suite skips without is on PATH": zsh is not installed on this laptop, and CI installs it (`.github/workflows/test.yml`). Not caused by this change. It does mean no test has run under zsh locally, so CI is the first run of the new tests under both shells.
- Step 1: `git push -u` of the new branch was rejected twice with `remote rejected … (Internal Server Error)`. A GitHub-side failure; the third attempt with backoff succeeded, confirmed by `git ls-remote`.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.256.probe-uniform-failure-declined
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
