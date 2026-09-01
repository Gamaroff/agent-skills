# Implementation Report: `/review-code` branches on TRACKER where it should branch on VCS

**Task**: `task.68.review-code-vcs-branch.md`
**Run Number**: 1
**Started**: 2026-09-01 19:45
**Status**: In Progress

---

## Summary

Correct `skills/review-code/SKILL.md` Step 4 to branch PR-comment posting on `$VCS` rather than `$TRACKER`, give the skill its first contract tests, and sweep the review family for the same conflation.

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
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.68.*` exists in git                               | `feature/task.68.review-code-vcs-branch` created from `develop` at `af18a14`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.68.review.{N}.{name}.md` exists (or skip logged)                 | `task.68.review.1.review-code-vcs-branch.md` — READY TO IMPLEMENT, 9/10, 0 critical. 4 fixes applied, 1 skipped (tracker link) | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 3 phases, 3 files, 12 contract tests, 5 mutation proofs. Sweep: 64 hits / 20 source files classified | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.68.qa.{N}.*.md`; `task.68.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ⏳ Pending | `task.68.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-01

- **Invoked by `/develop-next`** (autonomous run). Roadmap item **T68**, Phase 5 — Current frontier, no deps, source `roadmap`.
- **Stale pipeline lock cleared before dispatch**: `.claude/state/develop-pipeline.lock` held a completed `develop-bug` run for bug.5 (PR #293 MERGED, bug `status: closed`, roadmap row already `[x]`). Verified complete, then removed. No work was resumed on top of it.
- Feature branch base: **develop** — auto-answered (develop-next autonomous directive; recommended option, current branch is `develop`).
- PR target branch: **develop** — auto-answered (develop-next autonomous directive; recommended option).
- qa-planning gate: skipped (auto — no prompt)
- **Pipeline mode: standard.** Computed from `risk_level=low` (∈ {low, absent} ✅), `phase_count=3` (**not** < 3 ❌), `single_module=false` (Phase 3 is a repo-wide sweep across `skills/` and `shared/`). Fails on two of three inputs — lite mode not applied.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk.
- Tracker: `github`; **no `github_issue` in frontmatter** → `TRACKER_ISSUE` empty, all tracker signalling skipped for this run (0c-reg, Step 4 issue comment, Step 7 issue close).
- **review-task ran** (status was `Ready for Development` but **no review report existed** — the decision table calls that "status set without completing a review"). Outcome **READY TO IMPLEMENT, 9/10, 0 critical**.
- review-task Step 0 auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 0a: branch setup **auto-skipped** — already on `feature/task.68.review-code-vcs-branch`.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. 4 applied, 1 skipped.
- review-task Step 9: **no status change needed** — already `Ready for Development` (skip condition, not an auto-answer).
- review-task Step 2 check 5 — **tracker sync skipped, no remote issue created.** The skill forbids creating a remote issue unprompted and no autonomous-defaults row authorises it; "Skip — leave unlinked" is an explicitly non-halting path. Important gap stands in the review report. Run `/sync-github-task` later if a card is wanted.
- review-task Step 10 (tracker comment): skipped silently — no `github_issue`.
- **Premise independently re-verified before dispatch and again in review**: the `TRACKER=github` branch is live at `skills/review-code/SKILL.md:98`. The task is real work, not already done.
- **Step 3 — Phase 3 sweep classification (recorded here as §9 Code Quality requires).** `grep -rn 'TRACKER=github' skills/ shared/` → **64 occurrences**; excluding auto-generated `skills/*/references/` copies, **20 source files**. Classification:

| Site | Operation guarded | Shape | Verdict |
|---|---|---|---|
| `skills/review-code/SKILL.md` Step 4 | post a comment on a **pull request** | **PR-shaped** | ❌ **WRONG — fixed by this task.** Now zero `TRACKER=` occurrences in the file |
| `skills/finalise/SKILL.md` (2) | close the issue, re-point the Document link, board move | issue-shaped | ✅ correct — keep. Its PR-comment section already branches on `$PLATFORM`/`$VCS` |
| `skills/qa-story/SKILL.md` 6b, `skills/qa-task/SKILL.md` 13b | `gh issue comment` | issue-shaped | ✅ correct — keep |
| `skills/review-story` (6), `skills/review-task` (5), `skills/review-epic` (2) | tracker linkage, issue comment, sync sub-skill dispatch, body-hash sync skip | issue-shaped | ✅ correct — keep |
| `skills/create-story`, `create-task`, `create-epic` (1 each) | create the issue, board add, write frontmatter | issue-shaped | ✅ correct — keep |
| `skills/sync-github-{epic,story,task}` (1 each) | platform guard — abort if `TRACKER=jira` | issue-shaped | ✅ correct — keep |
| `skills/develop-next`, `develop-batch`, `develop-bug` (1 each) | `gh-stage.js` board stage, bug issue linkage | issue-shaped | ✅ correct — keep |
| `shared/resources/develop-pipeline-step-4-create-pr.md` (3) | pass `--issue`, `Closes #N`, board update | issue-shaped | ✅ correct — keep |
| `shared/resources/develop-pipeline-step-{0,5-6,7}-*.md` (4) | signal work started, re-assert board status, close issue | issue-shaped | ✅ correct — keep |

  **`review-code` was the only PR-shaped hit.** `review-bug` and `review-pr` have none — `review-pr`'s PR comment already carries GitHub and Bitbucket arms under the `$VCS` branch. Recording the correct hits matters as much as the fix: §10 Risk 1 is that a sweep "fixes" a branch that was right, introducing the mirror-image bug.
- **Test scoping is deliberate.** Every branch-key assertion slices Step 4 out of the file first. A file-wide `doesNotMatch(/TRACKER=github/)` would have been easier and wrong — it would forbid the token in a future *issue-shaped* branch of the same skill, where it is correct.
- Phase 0 fan-out and review-task Phase 1.5 pre-pass both run **inline rather than via subagents** — the resolver was unnecessary (explicit path supplied) and the tracker poller inapplicable (no linked issue); the lite-mode inputs were read directly from the task document. Session standing instruction prohibits dispatching subagents unless requested.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Step 3 — a background gate reported success it had not earned

The first `npm run ci:fast` run was backgrounded as a compound command ending in `tail`. The completion
notification said **exit code 0** — but that was **`tail`'s** exit status, not npm's. The gate had in fact
**failed**: `prettier --check` flagged the newly created `skills/review-code/tests/review-code.test.js`.

Caught by re-running `prettier --check` by hand against the changed files after a later doc edit. Had it
not been, this task would have shipped exactly the failure task 67 shipped — a branch green on every local
gate and red in CI on formatting alone — which is the failure `develop.fastGateCommand` was introduced to
prevent. The fast gate was doing its job; the **harness around it** discarded the answer.

**Resolution**: formatted the file, then re-ran the gate as a command whose own exit status *is* the gate's
(`npm run ci:fast > log 2>&1; TEST_EXIT=$?; …; exit $TEST_EXIT`).

**Standing lesson, same shape as bug.5's**: a check whose result is read from the wrong place is not a
check. A backgrounded gate must end on the gate's own status — never on a formatting or reporting command
that cannot fail.

- **Step 1 — tracker signal skipped.** `0c-reg` (Signal Work Started) did not run: the task carries no `github_issue`, so `TRACKER_ISSUE` is empty. No board move, no pipeline-start comment. Not a failure — nothing to signal.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.68.review-code-vcs-branch`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
