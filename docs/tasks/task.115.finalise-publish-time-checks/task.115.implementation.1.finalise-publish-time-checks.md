# Implementation Report: finalise publishes before it verifies: a doubled status header, a CI reading on the wrong head, a working-tree gate, and a CHANGELOG box with no mechanism

**Task**: `task.115.finalise-publish-time-checks.md`
**Run Number**: 1
**Started**: 2026-09-13 07:35
**Status**: In Progress

---

## Summary

Give `/finalise` Step 7 publish-time checks — one DoD status location, CI verified on the head that carries the acceptance, a gate on the committed tree rather than the working tree, and a mechanism behind the CHANGELOG checklist box (obs #40, #48, #57, #59). Run under `/develop-next` (autonomous; item T115 via task-registry fallback).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #401 (GitHub) — created by Step 2 `/review-task`                           |
| Board status        | work-started → transitioned ✅ (fired at Step 2 after the issue was created) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.115.*` exists in git                              | `feature/task.115.finalise-publish-time-checks` created from `develop` at `fe3f045b`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.115.review.{N}.{name}.md` exists (or skip logged)                | `task.115.review.1.finalise-publish-time-checks.md`; READY TO IMPLEMENT 8/10 (pre-fix 6/10); 1 Critical + 4 Important fixed; Planned → Ready for Development; issue #401 created | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 5/5 phases; ci:fast green (3248 pass) after one prettier fix; 6+1 mutation proofs | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.115.qa.{N}.*.md`; `task.115.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.115.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-13

- Invoked by `/develop-next` (item T115, `source: task-registry`) under the AUTONOMOUS RUN directive — all Phase 0d questions auto-answered with the recommended option.
- Feature branch base: develop — auto-derived (on `develop`, recommended option)
- PR target branch: develop — auto-derived (recommended option)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0a-parallel executed inline (file path supplied verbatim; tracker poll = no `github_issue`/`jira_key` in frontmatter; lite-mode inputs read from the document). No subagents dispatched.
- Pipeline mode: standard — `risk_level: medium` (risk_ok=false), phase_count=3, single_module=true. Note: the step-0 prose names a "production lite-mode CLI" that does not exist in the tree — logged as observation #79; mode computed from the document's own fields.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `planned` — proceeding; Step 2 (`/review-task`) validates and promotes.
- Step 2: review-task output: Comprehensive report — required for pipeline audit trail. Review report: docs/tasks/task.115.finalise-publish-time-checks/task.115.review.1.finalise-publish-time-checks.md
- Step 2: review-task pre-pass executed in-line (no Explore subagents). Autonomous decisions in place of the three question points — recorded in the report §User Decisions: header removal over a pre-post check; acceptance commit+push moved into Step 7 before the side-effects with the second CI reading recorded on the PR comment + implementation report; no-suppression rule + tracked-and-pushed assertions instead of an audit; changelog drift test scoped to tasks (bugs 13/15 the follow-on).
- Step 2: tracker linkage — autonomous recommended option "Sync to GitHub": issue #401 created via ensure-task-github-issue, board add, Priority P1 (Estimate field absent on board — non-blocking); `github_issue: 401` written.
- Step 2: review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. 6/6 applied, 0 skipped.
- Step 2: review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task.
- Step 2: Review outcome comment posted to github issue 401 (reason: posted).
- Step 2: work-started re-fired at Step 2 — issue 401 created by the review; lock updated. tracker-comment: posted; gh-stage work-started: transitioned.
- Step 3: fast-gate precondition — no `develop.fastGateCommand` set; fallback `npm run ci:fast` resolves (`package.json` defines it). Passed.
- Step 3: Pre-develop surface map: 9 files identified in finalise + pipeline step docs + evals — reused from the Step 2 review's in-line verification (no Explore subagent dispatched): skills/finalise/SKILL.md (Step 0 template l.87–100; Step 6 CI gate l.594–820; Step 7 l.822–1484 incl. checklist l.1469–1483; Step 8 mirror l.1493/1557), shared/resources/develop-pipeline-step-7-finalise.md (DoD→PR post l.126–160; tracker update; checklist l.~470), shared/resources/develop-pipeline-step-8-commit.md (commit point), shared/resources/develop-pipeline-step-5-6-qa-loop.md (5c l.851+; path-1 commit l.655–700), docs/contributing/releases.md (checklist l.23; one-liner l.33), evals/shared/tests/task-registry-drift.test.mjs (backstop shape), CHANGELOG.md ([Unreleased] cites tasks 107/108/113/114; bug 14 only), skills/finalise/assets/ (sprint-review template only), package.json (ci / ci:fast).
- Step 3: Plan file found: docs/tasks/task.115.finalise-publish-time-checks/task.115.plan.finalise-publish-time-checks.md — included as implementation context for /develop.
- Step 3: Always-load files read and prepended (3): coding-standards.md, tech-stack.md, source-tree.md.
- Step 3: /develop iteration 1 — CALLER_MODE=orchestrated; status gate n/a (Ready for Development); alignment: greenfield within existing docs (no existing checks to align). Implemented: Phase 1 (DoD header line removed from the Step 0 template; flip instructions retired at Step 7/8; checklist item reworded), Phase 2 (finalise Step 7 gains 6a acceptance commit+push / 6b tracked-and-pushed assertions / 6c second CI read with HALT `ci-not-green-on-acceptance-head` / 6d CHANGELOG advisory; CI_HEAD_1 recorded at Step 6; PR canonical comment carries both readings; pipeline step-7 doc gains "The publish boundary" + DoD-post assertion + checklist items; step-8 doc: implementation report only), Phase 3 (5c tracked-and-pushed assertion + no-suppression rule), Phase 4 (releases.md convention/test/owner/flip line; evals/shared/tests/changelog-entry-drift.test.mjs; evals/shared/tests/finalise-publish-boundary.test.mjs). CHANGELOG entry added under [Unreleased]/Changed (task 115).
- Step 3: design note — `verify-push-state.sh` not reused at 6b because it fails on any dirty tree and the orchestrator's implementation report is legitimately uncommitted until Step 8; per-artifact `git ls-files`/`git show origin/<branch>:<path>` used instead. `git add` of the registry split behind an existence check (one unmatched pathspec aborts the whole add).
- Step 3: mutation proofs — drift test: removed the task 114 citation → red naming task 114 (PR #400); shape test: 6 mutants (header line restored; PR comment moved before 6a; commit suppressed; 5c ls-files dropped; releases flip line removed; CI_HEAD_1 removed) → each caught by its own assertion; all sources restored byte-identical (cmp).
- Step 3: fast gate iteration 1 — first run TEST_EXIT=1 (prettier: 2 new test files), `prettier --write`, second run TEST_EXIT=0 (3249 tests, 3248 pass, 0 fail). `npm run bundle` run after the shared/resources edits (22 files incl. references/ copies). Logs removed.
- Step 3: loop audit (in-line) — status Ready for Review, 5/5 phases, exit after iteration 1.
- Step 1: implementation report stashed before branch creation, restored after. Branch `feature/task.115.finalise-publish-time-checks` ← `develop` (fe3f045b). Work-started tracker signal skipped — no issue linked yet (Step 2 creates it).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {populated at end}
**Branch**: `feature/task.115.finalise-publish-time-checks`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
