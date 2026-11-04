# Implementation Report: security-probe: a uniform failure is declined, not scored

**Task**: `task.256.probe-uniform-failure-declined.md`
**Run Number**: 1
**Started**: 2026-11-04 09:40 UTC
**Status**: Completed

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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #827 to develop; issue 825 commented | —                    | 2026-11-04T10:15Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.256.qa.{N}.*.md`; `task.256.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | QA cycle 1 PASS 95; PR review APPROVE | — | 2026-11-04T10:40Z |
| 7. finalise                | ✅ Done    | `task.256.dod.{N}.*.md`; task `status: accepted`                       | DoD 16/16; CI reading 1 SUCCESS, reading 2 SUCCESS (tree-equivalent) | —                    | 2026-11-04T11:19Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Report committed and pushed | —                    | 2026-11-04T11:21Z |

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

### Step 5 — qa-task, cycle 1

- Traceability mapper skipped: the task's Success Criteria are checklists, not a table. Board re-assert returned `stage-disabled` (no in-review column configured).
- Gate 1: PASS, 95/100, no open entries. The QA skill repeated all 18 mutations (all red, engine verified identical afterwards) and re-ran the original reproduction (declined, exit 1).
- Outcome: route 1 (PASS, no open entry) to 5c. Gate and QA report committed and pushed once before `/review-pr`.

### Step 4 — create-pr

- Staging scope (8 paths): the task directory, `CHANGELOG.md`, `shared/resources`, `shared/resources/tests`, and the four `skills/*/references` directories that `npm run bundle` changed. No untracked file fell outside it, so nothing was held.
- Commit `4dc52774` carries the code, the generated copies, and the implementation and review reports. The first push was accepted.
- PR #827 opened against `develop`, body written by the orchestrator from context rather than by the summariser subagent (the diff is 2008 lines; the change was made in this session). Issue 825 commented.

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

### QA Cycle 1 — 2026-11-04
**Gate Result**: PASS
**Issues Found**: none gating; one advisory code-review note (CR-1, low confidence)
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE (task.256.pr-review.1.probe-uniform-failure-declined.md; one low consistency finding, fixed in the acceptance commit)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-11-04 11:20 UTC
**Final Status**: Completed
**Branch**: feature/task.256.probe-uniform-failure-declined
**PR**: [#827](https://github.com/Gamaroff/agent-skills/pull/827)
**QA Iterations**: 1 (gate PASS 95/100; PR review APPROVE)
**DoD Summary**: `task.256.dod.1.probe-uniform-failure-declined.md` — 16/16 criteria, accepted
**Tracker debt**: none

**Completion Summary**: Implemented `uniformFailure` in `security-probe.mjs` so a run where every case fails the same way before reaching the control is declined (`unverifiable` / `entry-not-probeable`, executed 0) instead of scored `absent`. The private failure record is removed ahead of every return, so `needs-fake-gh` leaks no stderr. 10 new tests and 12 fixtures; probe suite 301/301; 18 of 18 engine mutations red (twice: development and QA). One QA cycle, no fix cycle. CI green on both readings (reading 2 tree-equivalent to the code head `4dc52774bbd1`, since the acceptance commit is docs-only).

**CI**: reading 1 SUCCESS @ `73b0df2444cf`; reading 2 SUCCESS (tree-equivalent to `4dc52774bbd1`) @ `75fc707eab8d`.

**Deviations and notes**: the finalise security agent ran the classifier only and returned its checklist as not-applicable; the checklist greps were run inline over the PR diff and found nothing. `CI=true npm run ci:fast` fails locally on the zsh-on-PATH guard because zsh is not installed on this laptop; CI installs it and passed. Advisory CR-1 (a genuinely errored case loses its own detail in the fold) is left open as a future improvement.
