# Implementation Report: Gates say what they know

**Task**: `task.275.gates-say-what-they-know.md`
**Run Number**: 1
**Started**: 2026-11-15 16:24
**Status**: Completed

---

## Summary

Add an open-points count slot to the `qa-gate` / `qa-cycle` plain-language leads, and a `remedy:` status to gate recommendations (obs #84, #86).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (resolved at Step 3)                                              |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.275.*` exists in git                              | Branch created at `2537e35a6` from develop | —                    | 2026-11-15T16:24Z |
| 2. review-task             | ✅ Done    | `task.275.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; 0 critical, 7 important (all fixed), 2 optional | —                    | 2026-11-15T16:28Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Count slot, helper, 5 sites, remedy schema; ci:fast green on .249 | —                    | 2026-11-15T16:49Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #911 opened; no tracker issue to comment on | —                    | 2026-11-15T16:49Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.275.qa.{N}.*.md`; `task.275.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 2 gates PASS 95/100, 1 fix cycle; route 2b exit; 5c APPROVE | —                    | 2026-11-15T17:00Z |
| 7. finalise                | ✅ Done | `task.275.dod.{N}.*.md`; task `status: accepted`                       | DoD 1 ACCEPTED; wall-time criterion amended (owner-approved); CI reading 2 SUCCESS (tree-equivalent to 519d8cf0c) | —                    | 2026-11-15T17:18Z |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Report committed with Step 8 | —                    | 2026-11-15T17:19Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-15

- Feature branch base: develop — source: recommended (`--defaults`, invoked by develop-next)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (risk_level absent, 3 phases so not < 3, single module)
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no Explore subagents dispatched); lite-mode inputs derived from the document directly.
- No tracker issue linked (`github_issue` absent) — tracker signals skipped.

### Step 3 — develop — 2026-11-15

- Step 3 inline — `/develop` not invoked: the plan names every hunk. Plan file found: `task.275.plan.gates-say-what-they-know.md`, used as context.
- Helper is `shared/resources/gate-open-count.js` (Node, not shell as first sketched): it shares the engine's language and its test lives beside `stakeholder-summary.test.mjs`, so `test:suite` needed no edit.
- `gateSentence(verdict, openCount)` takes the slots as arguments, and the templates call it with `s.verdict, s.open_count`. A first version took `s` whole; `stakeholder-summary.test.mjs`'s "every slot a template reads is classified" check scans template source for `s.NAME` and failed, so the reads stay syntactic.
- Sweep: the helper ran clean on 400 committed gate files; task 213's gate 2 reads 0 open.
- Fast gate: first run red on prettier (4 files), fixed with `prettier --write`; second run `ci:fast` on .249 exit 0 (`CI=true`).
- Mutation proof: with the count branch disabled (`&& false`) the PASS-with-count test went red (1 fail of 60); restored, 86/86 green across the three suites.
- Feed guard (Guard D) added to `comment-slot-coverage.test.mjs`, with a non-vacuity floor of 5 sites and a synthetic control that must fail and pass.
- Correction: the Completed (UTC) cells for steps 1-4 were first written from memory (two were local time); re-set from the review report mtime, the branch reflog and the PR creation time.
- Open: the wall-time criterion (five alternating runs, within 10% of `develop`) is not measured; it goes to QA.

### Step 2 — review-task

- review-task output: Comprehensive report — required for pipeline audit trail. Report: `task.275.review.1.gates-say-what-they-know.md`.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — status `Planned` → `Ready for Development`.
- Pre-pass Agents B and C not dispatched; both passes done in-line by the orchestrator (independent review did not run for these two passes).
- Review decisions (autonomous, no user present): D1 bare PASS sentence kept for count 0/absent, a feed guard added; D2 `develop-bug`'s `qa-cycle` fed from its `Declined` non-blocking count; D3 `remedy: verified` needs `verified_by:`.
- Reviewed blob stamped (`record-reviewed-blob.js`: written). Tracker re-read: no `github_issue`, no work-started re-fire.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA cycle 1 — T275-QA-1 (wall-time criterion): measured on the changed surface, finding left open

- **What was measured.** Five alternating pairs of `CI=true node --test` over the test files this task touches, `develop` (a detached worktree of `origin/develop`) against this branch, laptop, `date +%s%N` around each run, load average read beside each (`/proc/loadavg`). The branch side also runs the new `gate-open-count.test.mjs`, which `develop` does not have.
- **Result (ms, develop → branch, load):** 1948 → 2293 (18.89); 2106 → 2137 (19.78); 2656 → 1620 (22.36); 942 → 705 (22.36); 672 → 723 (21.69). Medians: develop 1948, branch 1620. Per-pair differences: +345, +31, −1036, −237, +51; median +31 ms.
- **How to read it.** The laptop was loaded (load average 19 to 22), so the spread is larger than the difference: the measurement cannot tell the two sides apart, which is the claim (no measurable cost), but it is not the criterion's own measurement. The full `CI=true npm test` was not run five times per side: that is about two hours on the shared LAN server for a change whose added tests run in about 0.4 s of a 685 s suite.
- **Status.** The criterion's bound (within 10%) is met by every available measure; its method (five alternating runs of the full suite, `uptime` beside each) is not. Per qa-fix's rule the criterion text is not edited. T275-QA-1 stays open in the gate for QA to re-read, and an owner may amend the criterion with `approved by <name>` or ask for the full runs.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-15
**Gate Result**: PASS
**Issues Found**: 1 — T275-QA-1 (low): the wall-time criterion was bounded (0.4 s of added tests against a 685 s run), not measured as five alternating runs
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-11-15
**Gate Result**: PASS
**Issues Found**: 1 open low — T275-QA-1 (wall-time criterion method); one overclaim in the helper header found by qa-fix's adversarial pass and fixed in 9181242e7
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — 1 low coverage finding (PC-1, the wall-time criterion, already carried as T275-QA-1); recorded, not fixed (a criterion is never edited to meet its evidence)
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 2 with HIGH 0 for cycles 1 and 2; all 1 open findings are LOW and are carried to the gate's recommendations.future by id (T275-QA-1). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-11-15T17:19Z
**Final Status**: Completed
**Branch**: {populated after Step 1}
**PR**: https://github.com/Gamaroff/agent-skills/pull/911
**QA Iterations**: 2 gates (PASS 95 each), 1 fix cycle; 5c APPROVE
**DoD Summary**: ACCEPTED — `task.275.dod.1.gates-say-what-they-know.md`. CI reading 1 SUCCESS @ 519d8cf0c; CI reading 2 SUCCESS (tree-equivalent to 519d8cf0c) @ c030beb47.
**Tracker debt**: none (no tracker issue linked)
