# Implementation Report: The bug-fix runbook documents a pipeline that has been superseded twice

**Task**: `task.107.bug-runbook-rewrite.md`
**Run Number**: 1
**Started**: 2026-09-11 05:20
**Status**: In Progress

---

## Summary

Rewrite `docs/runbooks/bug-fix.md` against the shipped bug pipeline (`/develop-bug`, `/review-bug`, all
three bug modes, tracker sync on both arms), and add the bug branch to `docs/concepts/which-path.md`.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ — issue #386 created in Step 2, added to board, Priority P2 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.107.*` exists in git                              | `feature/task.107.bug-runbook-rewrite` created at `38f20587`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.107.review.{N}.{name}.md` exists (or skip logged)                | `task.107.review.1.bug-runbook-rewrite.md` — READY TO IMPLEMENT, 8/10, 0 critical / 4 important / 2 optional; all 4 important + 1 optional applied | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration, no stall. 4 files changed; fast gate 3155/3155 pass, 0 fail; 52 links checked, 0 dead; both mermaid diagrams validate | — (see Issues Log: surface-map subagent killed) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.107.qa.{N}.*.md`; `task.107.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.107.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Pipeline Startup — 2026-09-11

- **Invoked by `/develop-next`** (autonomous run). Item T107 selected from `docs/tasks/task-registry.md`
  via the selector's registry fallback — no roadmap phase held an actionable row.
- Phase 0a subagents dispatched: Agent 3 (lite-mode + always-load detector) only. Agent 1 (resolver)
  skipped — path supplied and resolved inline. Agent 2 (tracker state poller) skipped — the task has no
  `github_issue` / `jira_key`, so there is no tracker state to poll. Neither agent failed; both were
  inapplicable.
- Pipeline mode: **standard** — computed from `risk_level=low` (risk_ok true) AND `phase_count=4`
  (NOT < 3) AND `single_module=false`. Two of three conditions fail, so lite mode does not apply.
- Feature branch base: `develop` — auto-answered (develop-next autonomous directive; auto-derived
  recommended option, current branch is `develop`).
- PR target branch: `develop` — auto-answered (develop-next autonomous directive; auto-derived
  recommended option).
- qa-planning gate: skipped (auto — no prompt)
- **Step 2 auto-answers**: output format = "Comprehensive report"; Step 2 check 5 tracker sync = "Sync to
  GitHub" (recommended) → issue **#386** created, boarded, P2, `github_issue: 386` written back; Step 8.5
  = "Yes, apply all critical + important fixes"; Step 9 skipped by its own rule (status already
  `ready-for-development`).
- **Step 2 pre-pass**: Agent B (architecture alignment) → `aligned`; Agent C (codebase scan) →
  `not-implemented` — the task's premise is confirmed, nothing is already done.
- **Step 3 develop**: 1 iteration, no stall. `docs/runbooks/bug-fix.md` rewritten 68 → 200 lines (the
  ≤200 satellite budget review 1 added as Success Criterion 8); `docs/concepts/which-path.md` gained a
  defect branch as **Question 1**, ahead of the user-facing question so non-user-facing defects route
  correctly too, in all three representations (flowchart, prose fallback, quick-reference table);
  `docs/runbooks/README.md` one-line description re-checked; `CHANGELOG.md` gained two
  `[Unreleased] → Changed` entries. All 8 success criteria verified individually.
- **Step 3 gates**: `npm run ci:fast` → 3155 pass / 0 fail / 1 skipped. `prettier --check` clean.
  `markdown-link-check` → 52 links across the 3 changed docs, 0 dead, plus an independent
  tracked-tree resolver (`git ls-files`) because the working tree misses gitignored targets. Both
  mermaid flowcharts validated (`valid: true`).
- Tracker: `TRACKER=github`, `TRACKER_ISSUE` empty (task frontmatter carries neither `github_issue` nor
  `jira_key`). Issue/board operations are skipped until an issue exists.
- Implementation report stashed before branch creation, restored after (`git stash pop`, clean).

---

## Issues Log

- **Step 3 — pre-develop surface-map subagent killed after ~8 minutes unresponsive.** The Explore agent
  dispatched to map the bug pipeline never returned; it was stopped and **every fact it was asked for
  was verified in-line instead** — the 8-step table read directly from `skills/develop-bug/SKILL.md`,
  the verdict set and score scale from `skills/review-bug/SKILL.md`, the three mode patterns
  cross-checked against **both** `skills/create-bug-report/SKILL.md` and
  `docs/standards/file-naming.md`, the Change-Log exclusion and Status History column shape from
  `shared/resources/document-change-log.md` and the bug-report template, and the two sync arms from the
  four `*-bug-*-issue` / `sync-*-bug` skill descriptions. Recorded because independent mapping did
  **not** run: the page was written from one reader's pass over the sources, not two.
- **Step 3 — loop-audit subagent not dispatched.** After the hang above, the loop's exit condition was
  verified deterministically instead (`grep '^status:'` → `ready-for-review`, one iteration, no stall).
  A single grep does not need an agent; recorded so the substitution is visible rather than assumed.
- **Deferred follow-up (out of scope):** `docs/reference/pipeline-artifacts.md` contains **zero**
  mentions of bugs (`grep -c 'bug'` → 0), so the artifacts a `/develop-bug` run writes are documented
  nowhere but in the new runbook section. Task 107 §4 scopes the file list to three pages, so this was
  not folded in. Worth a follow-up task.
- **Step 2 — orchestrator's duplicate `review`-stage comment suppressed.** `/review-task` Step 10 posted
  the full review outcome to issue #386 in this same run (`reason: posted`, stage `review-task`). The
  orchestrator's own `review`-stage comment carries the same three facts to the same reader seconds
  later; posting both is noise, not redundancy. Logged rather than posted.
- **Step 1 — "Signal Work Started" skipped.** `TRACKER_ISSUE` is empty (the task document carries no
  `github_issue`), so there is no issue to comment on and no board item to move. Not a failure: the
  0c-reg procedure is conditional on `TRACKER_ISSUE` being set. If Step 2 (`/review-task`) creates the
  issue via `ensure-task-github-issue`, the signal is re-evaluated there.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: _pending_
**Final Status**: _pending_
**Branch**: `feature/task.107.bug-runbook-rewrite`
**PR**: _pending_
**QA Iterations**: _pending_
**DoD Summary**: _pending_
**Tracker debt**: _pending_
