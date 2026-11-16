# Implementation Report: Halts and re-entries leave and read true state

**Task**: `task.276.halts-and-re-entries-leave-and-read-true-state.md`
**Run Number**: 1
**Started**: 2026-11-15 00:00
**Status**: In Progress

---

## Summary

First automated run of task 276 (develop-next, `--defaults`): HALT helper and restore guard, re-entry refusal and budget base, resume-prompt check.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — defaults (docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md) |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.276.*` exists in git                              | Branch created at `34ec0cceb` | —                    | 2026-11-15T17:30Z |
| 2. review-task             | ✅ Done | `task.276.review.{N}.{name}.md` exists (or skip logged)                | review.1: 2 Critical + 6 Important fixed; 8/10; guard re-keyed (no writer emits `finalise-dod-gaps`) | —                    | 2026-11-15T17:55Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | 4 phases built inline; remote CI-parity suite 8497 pass / 0 fail; mutation proofs: guard, distinct base, --halt | —                    | 2026-11-15T19:24Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #913 → develop (no tracker issue, so no issue comment) | —                    | 2026-11-15T19:40Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.276.qa.{N}.*.md`; `task.276.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 4 gates: CONCERNS 80, CONCERNS 85, PASS 92, PASS 92 (cycle 4 re-entered after DoD run 1 gaps); 5c CONCERNS at cycle 3, 0 open coverage; wall time +0.8% | —                    | 2026-11-16T06:17Z |
| 7. finalise                | 🛑 Halted | `task.276.dod.{N}.*.md`; task `status: accepted`                       | dod.1: GAPS — 5 gaps (criteria 2, 5, 7, 8 and one stale behaviour-doc line); security 44 probes / 0 reproduced; head CI test job still running | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-15

- Feature branch base: develop — source: recommended (develop-next `--defaults`)
- PR target branch: develop — source: recommended
- Mode: standard — source: detector (phase_count 4 ≥ 3, so not lite)
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 0 (resolver `questions[]` empty)
- Always-load files: defaults (skills-config.yaml sets no `devLoadAlwaysFiles` for this run)
- Phase 0a-parallel agents: not dispatched; Phase 0 run inline (document read directly). Lite-mode inputs: risk_level absent, phase_count 4, single_module false-by-judgement → standard.
- Tracker: none linked (no `github_issue:` / `jira_key:` in frontmatter) — tracker signals skipped.

### Step 2 review decisions — 2026-11-15

- Review score 8/10; task moved to `ready-for-development`. Two Critical and six Important findings were folded into the task document before any code: the DoD-gaps restore guard is keyed on `halt_step` 7 plus the newest DoD reading `❌ GAPS` (no writer emits a `finalise-dod-gaps` token, so a guard on one would never fire); `--allow-dod-gaps` is the one bypass (the guard would otherwise refuse its own entry point, `reenter-qa-after-finalise.sh`); the HALT sites are the fences in three SKILL.md files, not step docs; every prose-only fix got an executable check.
- **Decision made for the user — obs #75 amended.** The task text said to refuse `no-code-moved` on untracked files. That contradicts the test-pinned task.170 QA cycle 4 CR-2 behaviour (untracked files are named, never refused on: Step 4 restores held-aside files, so an untracked file is the normal state of a branch). Resolved by an **ordered route** instead: with untracked files the message offers commit-and-re-run first and step 7 after "Otherwise"; on a clean tree it offers step 7 alone. The step-7 restore consumes the snapshot the script reads, so that order is what avoids destroying the second remedy.

### Step 3 develop — 2026-11-15

- Step 3 run inline; `/develop` not invoked as a separate skill (the task is four self-contained phases over shell scripts with a settled design).
- Surface map: `advance-pipeline-lock.sh` (guard, `--halt`, `--newest-dod`), `reenter-qa-after-finalise.sh` and `grant-qa-cycles.sh` (distinct budget base, flag, ordered routes), new `qa-report-cycles.sh` and `resume-prompt-check.sh` with suites, three SKILL.md HALT fences, the resume contract, `tests/halt-fence.test.js`, `package.json` registration, bundled copies.
- `--halt` mode: snapshot is written first (mktemp + mv), the lock is removed only after the snapshot exists, and the post-condition is checked inside the script. A missing `jq` is an error here (every other mode exits 0 silently): this mode's job is a snapshot nobody can rebuild by hand.
- `newest_dod` now lives once in `advance-pipeline-lock.sh` (`--newest-dod`); the re-entry script calls it instead of keeping its own copy, so the guard and the re-entry cannot disagree about which halt is a DoD-gaps halt. That left `newest-numbered.sh` unreached in two skills; the two bundled copies were removed (`bundle --check` reported them `UNREACHED`).
- `resume-prompt-check.sh` reads gates through `qa-cycle.sh` and derives nothing itself (`tests/qa-cycle.test.js` forbids a second derivation).
- **Process slip, disclosed:** one `sed -i` was used on the report to tick the Step 1 row, against the standing rule to use the Edit tool. No protected path was involved and the result was lint-clean; every later report edit used Edit.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1

- **Gate**: CONCERNS, 80/100. Four findings (three medium, one low); independent diff reviewer ran.
- **Fixed**: T276-QA-1 (lock compared on directory, foreign lock ignored), T276-QA-2 (CHANGELOG entry), T276-QA-4 (en dash alternation); stale `reenter-qa-after-finalise.sh` header reworded (CR-4).
- **Mutation-proven**: reverting the directory comparison reds "a step-7 lock for ANOTHER document is ignored"; reverting the alternation reds "step 5 row found under LC_ALL=C".
- **Open, not fixed**: T276-QA-3 — the wall-time criterion (median of five alternating runs against `develop`) is unmeasured. Criteria are not edited by qa-fix; it stays an open finding for the next gate or a human decision.
- **PR Review**: not run — this cycle went to 5b on open findings; 5c ran at cycle 3

### QA Cycle 2

- **Gate**: CONCERNS, 85/100. Full-diff refute pass; the reviewer read `resume-prompt-check.sh`, the `canon()` and `halt_lock` code and `qa-report-cycles.sh`, not the whole patch.
- **Fixed**: T276-QA-5 (a relative lock directory read as another document's from a different cwd) — `canon()` strips `./` and trailing slashes as `advance-pipeline-lock.sh` does, and a relative lock directory that does not resolve from the current directory answers `cannot tell`. Two new tests, 30/0.
- **Mutation-proven**: removing the `cannot tell` guard reds "a relative lock directory that does not resolve from this cwd: cannot tell".
- **Open, not fixed**: T276-QA-3, the wall-time criterion. It needs a human decision: measure (about 2.5 hours on the LAN server) or amend the criterion with an approver.
- **PR Review**: not run — this cycle went to 5b on open findings; 5c ran at cycle 3

### QA Cycle 3

- **Gate**: PASS, 92/100. Scoped to the files changed since gate 2; the reviewer read the 51-line delta and the whole of `resume-prompt-check.sh`, and ran 12 guard probes. CI on the PR head was green.
- **Closed**: T276-QA-5 (mutation-proven: removing the `cannot tell` guard reds its test) and T276-QA-3. The wall-time criterion is measured: median of five alternating develop/branch pairs on the LAN server, develop 747 s, branch 753 s, +0.8% against a 10% bound; all ten runs exited 0.
- **Open, carried**: T276-QA-6 (a `./` lock directory is called unresolvable) and T276-QA-7 (a stale relative lock directory answers `cannot tell` with a cwd-blaming message; the `canon()` change is inert under the guard, mutation `no-red-dead`). Both low, both reproduced by QA, neither reachable from any writer in the pipeline.
- **HIGH findings**: 0
- **Action**: Proceeding to 5c (PR conformance review)
- **Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 3 with HIGH 0 for cycles 2 and 3; all 2 open findings are LOW and are carried to the gate's recommendations.future by id (T276-QA-6, T276-QA-7). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
- **PR Review**: CONCERNS — conformance lens only (`--no-code`), report `task.276.pr-review.1`; 0 open coverage findings. PC-2 (medium): no `pr_number` in the task frontmatter, which `/finalise` writes at acceptance. PC-1 and PC-3 (low): unticked checkboxes and an unfilled Completion line, both finalise's. Nothing sent back to 5b; nothing fixed in the carry (no doc-only finding names one clean tracked file).

### QA Cycle 4

- **Gate**: PASS, 92/100. Re-entered at step 5 after `/finalise` run 1 found 5 gaps (HALT at step 7). Scoped to the files changed since gate 3; QA read the 18-line delta inline, so **independent review did not run** this cycle. CI on the head `5abb1c99c` was green.
- **Closed**: all 5 DoD gaps, with committed evidence: the ordered refusal-then-re-entry test (criterion 2), four mutation proofs that each red a committed test (criterion 5), `lint:shell` clean on 145 scripts on the LAN server (criterion 7), the re-measured caller list (criterion 8), three corrected behaviour docs.
- **New findings**: 0. T276-QA-6 and T276-QA-7 stay open, low and advisory, carried in the gate's `recommendations.future`.
- **HIGH findings**: 0
- **Action**: Proceeding to 5c (PR conformance review), then `/finalise` run 2
- **PR Review**: APPROVE — conformance lens only (`--no-code`), report `task.276.pr-review.2`; 0 open coverage findings. PC-1 (low, scope): `qa-report-cycles.sh` was missing from the task's §7 Files Summary; fixed in the document (item 4c).

### QA Cycle 5

- **Gate**: PASS, 92/100. Re-entered at step 5 after `/finalise` run 2 found 2 low evidence gaps (HALT at step 7). No code changed since gate 4; QA reviewed no diff, so **independent review did not run** this cycle. CI on the head `948f5f6e9` was green (all six checks).
- **Closed**: criterion 4, wall time re-measured on head: median of five alternating develop/branch pairs on the LAN server, develop 770 s, branch 796 s, **+3.4%** wall and -1.7% suite time against the 10% bound (pairs 2 and 5 are load outliers on opposite sides of the median). Criterion 5, a named mutation proof for the `no-code-moved` ordered route: swapping the remedy order reds "untracked route order" (82 passed, 1 failed); restored and green at 83/0.
- **Process note**: three earlier measurement attempts were lost (two stopped by the host for low memory; one wasted by a stale server lock that made every develop run fail in under 3 s). The fourth attempt produced all the data. A fail-fast guard was added to the script.
- **New findings**: 0. T276-QA-6 and T276-QA-7 stay open, low and advisory.
- **Action**: Proceeding to 5c (PR conformance review), then `/finalise` run 3.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.276.halts-and-re-entries-leave-and-read-true-state
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
