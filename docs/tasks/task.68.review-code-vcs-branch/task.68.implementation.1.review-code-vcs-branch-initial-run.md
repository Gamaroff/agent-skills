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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #294](https://github.com/Gamaroff/agent-skills/pull/294) → `develop`. Commit `31b3184`, 7 files. Issue comment skipped — no linked issue | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.68.qa.{N}.*.md`; `task.68.gate.{N}.*.yml`; PR comment posted     | 2 cycles: gate.1 CONCERNS 90/100 (1 MEDIUM) → qa-fix → gate.2 **PASS 100/100**. 3 PR comments posted | —                    |
| 7. finalise                | ✅ Done    | `task.68.dod.{N}.*.md`; task `status: accepted`                        | DoD 6/6 PASS, CI SUCCESS 4/4 on final head. `task.68.dod.1.*.md` + `sprint-review-summary.md` written; canonical PR comment posted. Tracker close/board move N/A — no linked issue | —                    |
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
- **Step 4 staging scope**: `docs/tasks/task.68.review-code-vcs-branch`, `skills/review-code`, `CHANGELOG.md`, `package.json`. The step-4 algorithm derives scope dirs via `dirname` and skips `"."`, which would have dropped the two **root-level** files (`CHANGELOG.md`, `package.json`) from the commit — both are essential to this change, so they were added to the scope explicitly. Pre-flight guard found no out-of-scope untracked files; post-commit leak check clean (7 files, all in scope).
- **The pre-commit hook ran `npm run bundle`** and reported every skill in sync, including `review-code` — confirming no bundled-`references/` drift from the `SKILL.md` edit.
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

### Cycle 1 — gate CONCERNS (90/100)

**Found: TASK68-001 (MEDIUM)** — the new contract suite failed outside this repository. Two tests read sibling skills (`../review-pr/SKILL.md`, `../finalise/SKILL.md`) with a bare `readFileSync`; `package_skill.py` walks the whole skill dir and excludes only `{__pycache__, .git, node_modules, .DS_Store}`, so `tests/` ships in the packaged skill. **Reproduced, not inferred** — copying `SKILL.md` + `tests/` alone into a temp dir gave 2 of 12 failing with `ENOENT`.

QA also ran an **independent** mutation the developer had not (`VCS=bitbucket` → `TRACKER=bitbucket`): 3 red, restored green. Two LOW observations recorded: the Bitbucket arm's undeclared `BB_*` variables, and a Step 4b `zero-blocks-executed` result **verified pre-existing** against a byte-identical `develop` baseline.

### Cycle 1 fix — qa-fix

`readSibling()` helper returning `null` on `ENOENT` and **rethrowing every other error**; both cross-skill tests `t.skip(...)` when the sibling is absent. Both assertions kept — deleting the drift guard would have been the cheaper, worse fix.

The failure mode of this fix is that it degrades the guard into a skip-everywhere no-op that leaves a green suite behind, so three checks were run rather than the obvious one: in-repo **12 pass / 0 skipped**; standalone **10 pass / 0 fail / 2 skipped**; and a mutation of `review-pr`'s rule wording → **1 red / 0 skipped**, proving the guard still bites.

### Cycle 2 — gate PASS (100/100)

TASK68-001 closed. Per the Step 3b protocol, cycle 2 ran a **full refute pass over the whole branch diff** rather than a narrowed one — the files changed since gate 1 are cycle 1's own fixes, and a narrowed pass would read only the repairs.

The refute targeted the original change's highest-risk claim, chosen because it is in the *same defect class as the bug being fixed*: "the Bitbucket arm names a recipe that actually exists". The old text got exactly this wrong. Probed — `skills/review-code/references/bitbucket-auth.sh` is present, and `git ls-tree develop` confirms it was bundled **before** this branch, so the pointer resolves independently of this change. **The refute failed; the claim holds.** All four NFRs PASS. No new findings.

---

## Completion Summary

Task 68 fixed a defect whose defining property was silence: `/review-code` chose its PR-comment path from `TRACKER` rather than `VCS`, so a Bitbucket-hosted repo took the `gh` arm against a Bitbucket PR, the comment never landed, and the run reported success.

**Three things are worth carrying forward.**

**First, the fix's own guard had the same shape as the bug.** QA found that the new test file crashed with `ENOENT` outside this repository — `tests/` ships in the packaged skill, and two tests read sibling skills. The obvious repair (make them skip) would have silently deleted the drift guard while leaving a green suite behind. That is the *same* failure mode as the original defect — a mechanism reporting success without having checked anything — reproduced one level up, inside the fix for it. It was caught only because the fix was verified three ways rather than one: in-repo (0 skipped), standalone (2 skipped, 0 failing), and under mutation (1 red, proving the guard still bites).

**Second, a backgrounded gate reported an exit code that was not its own.** The first `npm run ci:fast` run ended in a `tail`, so the completion notification carried `tail`'s status. The gate had actually failed on `prettier --check`. Same shape again — and had it stood, this task would have shipped precisely the red build that `develop.fastGateCommand` exists to prevent. **A backgrounded gate must end on the gate's own status.**

**Third, the sweep's value was in what it did not change.** 64 occurrences across 20 source files; exactly one was wrong. The other 63 — issue comments, board moves, milestones, tracker linkage — are correctly keyed on `TRACKER`, and recording them as deliberately kept is what stops the next sweep introducing the mirror-image bug, which the task's own risk register named as the hazard.

## Completion

**Finished**: 2026-09-01 19:00
**Final Status**: Completed
**Branch**: `feature/task.68.review-code-vcs-branch`
**PR**: https://github.com/Gamaroff/agent-skills/pull/294
**QA Iterations**: 2 (CONCERNS 90/100 → PASS 100/100)
**DoD Summary**: `task.68.dod.1.review-code-vcs-branch.md` — 6/6 PASS
**Tracker debt**: none — the task carries no `github_issue`, so no tracker mutation was ever due. Nothing deferred, nothing to reconcile.
