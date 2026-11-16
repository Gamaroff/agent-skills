# Implementation Report: QA loop readers read the right thing

**Task**: `task.278.qa-loop-readers-read-the-right-thing.md`
**Run Number**: 1
**Started**: 2026-11-16 17:31
**Status**: In Progress
**Report format**: 2

---

## Summary

Fix three QA-loop readers that classify on the wrong input: the narrowing-residue file fold, the 5c carry on the fix path, and the gate reader's top-level status.

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
| 1. create-branch           | ✅ Done | Branch `feature/task.278.*` exists in git                              | Branch created at `76f4d35ae` | —                    | 2026-11-16T17:32Z |
| 2. review-task             | ✅ Done | `task.278.review.{N}.{name}.md` exists (or skip logged)                | Review 1: 7/10 → 9/10 after 4 Important + 2 Optional fixes; status → ready-for-development; pre-pass subagents not dispatched (done inline) | —                    | 2026-11-16T17:35Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Phases 1–4 done inline; ci:fast green; perf −3.5% | —                    | 2026-11-16T20:28Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.278.qa.{N}.*.md`; `task.278.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.278.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-16

- Feature branch base: develop — source: recommended (`--defaults`, develop-next autonomous run)
- PR target branch: develop — source: recommended (`--defaults`, develop-next autonomous run)
- Pipeline mode: standard — source: detector (no `risk_level`; task plan has 4 phases)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0b: no previous run detected (no branch, PR or report) — fresh start
- Questions asked: 0 (the resolver answered everything)

### Step 3 — develop (inline)

- Pre-develop surface map: done inline, not by a subagent. Independent review did not run for the map or the pre-pass.
- `/develop` was not invoked: a plan file exists and the surface map was done inline.
- Phase 1 re-scoped: the quoted-text filter already existed; the defect was within one line (quoted text at a key position). Found by running the reader, not reading it.
- Phase 2: `foldTestFilesIntoSubjects` folds a test file into its production MEDIUM only when `testArtifactGlobs` is set. Unconfigured consumers keep `medium-files-differ`.
- Phase 3: `fix_path` counts only for a `.md` directly in the work item directory that is a docs path. Anything else reads as absent.
- Migration check: 14 of 1021 committed gates read differently (2202 entries). All 14 were the old reader taking `status` or `category` from quoted prose.
- Mutation proofs: each phase's behaviour reverted → tests red (8, 1, 2 failures); restored → green.
- `ci:fast` on the LAN server: green, 8528 pass, 0 fail, 3 skipped.
- Performance (`CI=true npm run test:remote -- --run test`, five alternating runs, develop vs branch, LAN server; secs, load-1m at start): develop 1093 (16.3), 770 (11.9), 875 (10.7), 726 (0.2), 728 (0.5); branch 878 (2.7), 1196 (18.8), 743 (1.7), 725 (0.2), 726 (0.8). Median develop 770, branch 743 (−3.5%), within 10%. The two quiet-server pairs agree within 2 s. The server is shared, so the loaded pairs are noise.

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
**Branch**: feature/task.278.qa-loop-readers-read-the-right-thing
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
