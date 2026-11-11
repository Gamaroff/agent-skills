---
type: implementation-report
status: in-progress
bug: 'bug.21'
mode: 'general'
started: '2026-11-11T11:10:00Z'
---

# Implementation Report — bug.21

**Started:** 2026-11-11T11:10:00Z
**Finished:** 2026-11-11T12:15Z
**Final Status:** Completed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 0

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref | Completed (UTC) |
|------|-------|--------|-------|----------------------|-----------------|
| 1 | create-branch | ✅ Done | `bugfix/bug.21.precompact-claim-mkdir-not-exclusive` off develop, local only; lock written at step 2 | | 2026-11-11T11:12Z |
| 2 | review-bug | ✅ Done | READY TO FIX 9/10 (`bug.21.review.1.*`); duplicate scans run in-line, no subagent. 2b: branch pushed, issue #880 opened, board In Progress, work-started comment posted | | 2026-11-11T11:25Z |
| 3 | investigate-fix | ✅ Done | Race reproduced on the LAN kernel (mkdir doubled 264/300); `take_claim` now uses `ln`; scenario 12a red 12/12 on old hook, suite 0 red in 20 runs after; lint:shell clean | | 2026-11-11T12:20Z |
| 4 | create-pr | ✅ Done | PR #881 → develop, closes #880; two commits (fix, bug records) | | 2026-11-11T11:46Z |
| 5–6 | verify-fix loop | ✅ Done | Cycle 1 PASS: regression test, suite + lint, /review-code clean (1 comment applied, 2 declined); no fix cycle needed | | 2026-11-11T11:52Z |
| 7 | finalise-close | ✅ Done | `/finalise --bug`: DoD `bug.21.dod.1.*` ACCEPTED, CI reading 1 and 2 SUCCESS; issue #880 closed; bug closed, registry row `closed` | | 2026-11-11T12:10Z |
| 8 | commit-changes | ✅ Done | Final report commit, push, lock removed | | 2026-11-11T12:15Z |

## Decisions Log

- 2026-11-11T11:10Z — Bug resolved: docs/bugs/bug.21.precompact-claim-mkdir-not-exclusive/bug.21.precompact-claim-mkdir-not-exclusive.md (mode=general, prefix=bug.21)
- 2026-11-11T11:10Z — Phase 0b: an active develop-task lock for task.304 (step 5, QA phase 5c, PR #876) blocked the run. The user chose to snapshot it and run this bug first. The lock was copied to `.claude/state/develop-pipeline.last-halt.json` (halt_step 5) and removed; a second copy is kept outside the repo. Resume task.304 with `/develop-task` afterwards (`advance-pipeline-lock.sh --restore`).
- 2026-11-11T11:10Z — Branch model, base and PR target: bugfix / develop / develop, all `recommended` (flag `--defaults`; Q1 had no production-regression signal).
- 2026-11-11T11:10Z — Lite mode off: severity Major is never lite.

## Issues Log

## QA Iteration History

### Verify Cycle 1 — 2026-11-11

**Regression test**: pass (scenario 12a green on the fix; red 12 of 12 on the old hook on the affected kernel, 3 of 3 on the laptop)
**Suite + lint**: pass (hook suite 32/32; 0 red in 20 runs on the affected kernel; `lint:shell` clean; full suite 8371 pass, 0 fail; `bundle:check` clean)
**Code review**: clean — 0 blocking findings · Applied non-blocking: 1 (CR-3: comment in scenario 12a naming the `git` stand-in that guarantees the overlap) · Declined: 2
**Fast gate**: n/a
**Verdict**: PASS
**Action**: Proceeding to finalise

Declined, with reasons:

- **CR-1** (a new run linking its pid while the previous holder's `rm -rf` empties the directory; bug, low confidence): `ln` onto `pid` can only succeed after the holder has unlinked its own `pid`, and the holder's `rm -rf` then fails its `rmdir` on the non-empty directory, leaving the new holder's pid intact. The old `mkdir` claim had the same release path.
- **CR-2** (an orphan `precompact-claim.pid.<pid>` after a SIGKILL between the temp write and the `ln`; cleanup): `take_claim` removes the temp file on both outcomes, a SIGKILL skips any trap, and the window is two syscalls leaving one pid line.

## Completion

**Branch:** `bugfix/bug.21.precompact-claim-mkdir-not-exclusive`
**PR:** [#881](https://github.com/Gamaroff/agent-skills/pull/881) → `develop` (open; closes #880 on merge)
**DoD Summary:** `docs/bugs/bug.21.precompact-claim-mkdir-not-exclusive/bug.21.dod.1.precompact-claim-mkdir-not-exclusive.md`

**CI reading 1:** SUCCESS @ `a17fb2182912` (acceptance decision). **CI reading 2:** SUCCESS @ `dff7e7349412` over 6 checks (the head carrying the DoD file).

**Completion Summary:** the PreCompact hook's pause claim now takes its exclusivity from `ln` rather than `mkdir`, which is not exclusive on the LAN server's kernel. The bug was reproduced there (264 of 300 doubles), fixed with a deterministic regression test (scenario 12a, red 12 of 12 on the old hook) and passed one verify cycle with no fix cycle. The finalise docs check then found two stale lines the first sweep missed (the flow diagram label and a "retried `mkdir`" phrase); they were fixed in `ad731215` and only the docs and fix-evidence agents were re-run, since the change touched no code. Security and compliance first-pass results stand. Two verify-cycle review findings were declined with reasons (QA Iteration History).

**Deviations recorded:** earlier step timestamps in this report were first written from a guess and later corrected to the git commit times. The task.304 pipeline lock was snapshotted at the start of this run (Phase 0b) and is untouched; resume it with `advance-pipeline-lock.sh --restore`.
