# Implementation Report: finalise accepts what the record already shows

**Task**: `task.271.finalise-accepts-what-the-record-already-shows.md`
**Run Number**: 1
**Started**: 2026-11-07 00:00
**Status**: In Progress

---

## Summary

Add three recorded acceptance arms to `/finalise` (equivalent-commit measurement, one bounded re-run of a red outside the diff, an owner-deferred probe reproduction); run launched by develop-next.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml)                                           |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.271.*` exists in git                              | Created from develop at 1bb1aaa4 | —                    | 2026-11-07T19:38Z |
| 2. review-task             | ✅ Done    | `task.271.review.{N}.{name}.md` exists (or skip logged)                | 9/10, READY TO IMPLEMENT; no Explore subagents (pre-passes inline) | —                    | 2026-11-07T19:40Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map known from review); ci:fast 8043 tests green | —                    | 2026-11-07T19:50Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.271.qa.{N}.*.md`; `task.271.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.271.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

---

## Decisions Log

### Pipeline Startup — 2026-11-07

- Feature branch base: develop — source: recommended
- PR target branch: develop — source: recommended
- Mode: standard — source: detector (3+ phases, High-risk phases)
- qa-planning gate: skipped (auto — no prompt)
- Phase 1 owner decisions recorded in the task plan before dispatch (commit 1bb1aaa4, local, unpushed).

### Step 2: review-task — 2026-11-07

- Output format: Comprehensive report (pipeline default). Fixes: apply all critical + important (pipeline default). Status: promoted to ready-for-development (pipeline default).
- Tracker sync: skipped (no `github_issue`; creating a remote issue is outward-facing and the opt-in prompt cannot be answered unattended).
- Review report: `task.271.review.1.finalise-accepts-what-the-record-already-shows.md`. Independence: pre-pass Agents B/C ran inline, not as Explore subagents.

### Step 3: develop — 2026-11-07

- Step 3 inline — /develop not invoked: the plan file (`task.271.plan.*.md`) and the review's surface map were both in hand, and the plan names every hunk. Pre-develop surface map: 9 files (AC prompt, `skills/finalise/SKILL.md` CI gate and Step 3b.1, `ci-tree-equivalence.js` as the reused docs-path definition, `executed-prose.mjs`, `configuration.md`, `CHANGELOG.md`) found during review, not by an Explore subagent (independent mapping did not run). Plan file found: `task.271.plan.finalise-accepts-what-the-record-already-shows.md` — included as implementation context.
- Design choice: Arms 1 and 2 share one new engine, `finalise-delta.js` (`docs-only`, `rerun-eligible`), which reuses `isDocsPath`, `diffNames` and `readConfigAtCommit` from `ci-tree-equivalence.js` so the repository still has one definition of a docs path. The existing engine could not be called as-is: it needs a PENDING/NONE head and walks to a CI-green ancestor, while Arm 1 starts from a commit the figure names and Arm 2 from a red head.
- Arm 3 owner identity: `finalise.deferralApprover` in `skills-config.yaml` (comma-separated), read by the caller and passed as `--approver`; unset means nothing is deferred. Documented in `configuration.md`.
- Vanishing fixture template (obs #50): reproduced nothing. Measured with `GIT_TRACE2_EVENT=… node probe-fixture.mjs`: building the template spawned 3 detached `git maintenance run --auto --quiet --detach` children. Fix: `maintenance.auto=false`, `gc.auto=0`, `receive.autogc=false` on the template's repos. Held by `executed-prose-no-background-git.test.mjs`. The cause of the original ENOENT is **suspected, not proven**.
- Mutation proofs (revert, run, restore): M1 drop the docs-path check (5 tests red), M2 drop the in-diff exclusion (1 red), M3 drop the owner-list check (2 red), M4 allow unlimited re-runs (1 red), fixture fix reverted (1 red). Each file restored byte-identical (`diff` against a saved copy).
- Plan deviation: `finalise-dod-security-prompt.md` and `finalise-ci-poll.sh` were not changed (see the task's Files Summary).
- Not done in Step 3: the Performance criterion (`npm test` median of five alternating runs against `develop`) is left to QA, which records it.
- Verification: `CI=true npm run ci:fast` exit 0 (8043 tests, 0 fail, 2 skipped; tmp-leak ratchet ok); `npm run bundle -- --check` 0 problems.

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
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required; reconcile later with /tracker-reconcile}
