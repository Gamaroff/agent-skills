---
type: implementation-report
status: in-progress
bug: 'bug.7.zero-blocks-executed-fires-on-correct-refusal'
mode: 'general'
started: '2026-09-06T19:36:46Z'
---

# Implementation Report — bug.7.zero-blocks-executed-fires-on-correct-refusal

**Started:** 2026-09-06T19:36:46Z
**Finished:** 2026-09-06T20:20:00Z
**Final Status:** ✅ Complete — bug closed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Minor / Medium
**Lite mode:** on
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.7.zero-blocks-executed-fires-on-correct-refusal` created at `22c60cf4` (base develop), pushed with tracking | — |
| 2 | review-bug | ✅ Done | READY TO FIX, 10/10. 4 Critical + 3 Important + 1 Optional auto-applied to the bug report (template sections, Expected/Actual, Scope & Impact, `related`, Change Log→Status History). Duplicate: none. Reproduces: verified in-line. | `bug.7.review.1.zero-blocks-executed-fires-on-correct-refusal.md` |
| 3 | investigate-fix | ✅ Done | Signal split on `counts.placeholder`; `notes[]` added to the report; 4 regression tests, mutation-proven (3 go red on the pre-fix branch); prose + parity eval updated; 5 engine + 5 rule-doc copies rebundled. Full suite 2510/2511 pass, 0 fail, 1 skipped. | — |
| 4 | create-pr | ✅ Done | PR #331: https://github.com/Gamaroff/agent-skills/pull/331 (base `develop`, state OPEN). No `--issue` — general bug, no linked tracker issue. Leak check: OK. | — |
| 5–6 | verify-fix loop | ✅ Done | Verify cycle 1 PASS — no fix cycles needed. Regression tests green, `npm run ci:fast` exit 0 (2510/0/1), all 5 remote CI checks green on PR head `2d9e1418` == local HEAD. Code review skipped (lite mode). | — |
| 7 | finalise-close | ✅ Done | `/finalise` invoked, inline bug-shaped DoD fallback taken (documented). DoD SATISFIED — 6 met, 1 N/A, 1 residual gap recorded. Resolution Summary written, bug `closed`, registry row 7 flipped, canonical PR comment posted. | — |
| 8 | commit-changes | ✅ Done | Closing commit: DoD file, Resolution Summary, registry row, final report state. Pushed to PR #331. | — |

## Decisions Log

- 2026-09-06T19:36:46Z — Bug resolved: docs/bugs/bug.7.zero-blocks-executed-fires-on-correct-refusal/bug.7.zero-blocks-executed-fires-on-correct-refusal.md (mode=general, prefix=bug.7.zero-blocks-executed-fires-on-correct-refusal)
- 2026-09-06T19:36:46Z — Lock state: no active lock; last-halt.json belongs to task.84 (different work item) — fresh run.
- 2026-09-06T19:36:46Z — Lite mode: on — severity=Minor, priority=Medium.
- 2026-09-06T19:36:46Z — Q1 branch model: bugfix (user-confirmed recommended default).
- 2026-09-06T19:36:46Z — Q2 base branch: develop (user-confirmed recommended default).
- 2026-09-06T19:36:46Z — Q3 PR target: develop (user-confirmed recommended default).
- 2026-09-06T19:36:46Z — Platform: TRACKER=github, VCS=github, ACCESS_TRACKER=full, ACCESS_VCS=full. Bug has no github_issue — tracker issue signalling skipped.

## Issues Log

- 2026-09-06 — Step 2 pre-pass run **in-line** rather than via two Explore subagents (session memory records repeated Explore hangs on this repo; both checks were two greps and one command over one known file). Evidence for each verdict is quoted in the review report so the shortcut is auditable.
- 2026-09-06 — Step 3 root-cause localisation done **in-line**, not via an Explore subagent: the defect is one 20-line guard in one known file, already quoted verbatim by the bug report. Session memory records repeated Explore hangs on this repo.
- 2026-09-06 — `npx prettier --check` flagged the two edited test files; fixed with `--write` and re-verified (100/100 on both suites after formatting).
- 2026-09-06 — Bug report cited engine lines `:865` / `:879-881`; the engine has since grown to `:1307` via the bug.6 and bug.10 fixes. Rewritten report cites the guard by its condition instead of by line number.

- 2026-09-06 — Staging scope (8 paths): `docs/bugs/bug.7.…`, `shared/resources`, `evals/shared/tests`, `skills/qa-task`, `skills/qa-story`, `skills/{develop-task,develop-story,double-check}/references`. Pre-flight guard held nothing — every untracked file was in the bug dir.
- 2026-09-06 — PR created: https://github.com/Gamaroff/agent-skills/pull/331 (commit `2d9e1418`). Post-PR state check: PR #331 state = OPEN, errors = 0.

- 2026-09-06 — Step 7: `/finalise` invoked; its **inline fallback** taken deliberately, as the skill sanctions for a document type it cannot process. Its four DoD agents need acceptance criteria and a parent story; a general bug has neither. Same approach as `bug.11.dod.1` / `bug.12.dod.1`.
- 2026-09-06 — Step 7 B4 tracker close: **N/A** — bug has no `github_issue`/`jira_key`. Skipped, logged rather than silent.
- 2026-09-06 — Roadmap: no `bug.7` / `B7` row exists in `project-completion-roadmap.md`, so there is nothing to tick. Recording the landing there is `/develop-next`'s post-merge step, not this pipeline's.

### Step 3 — fix summary

- **Root cause**: `executeFile()`'s anti-vacuity guard used one condition (`counts.runnable === 0`) for two states — an under-configured run and a file whose every command is deny-listed by design.
- **Fix**: branch on `counts.placeholder`. `> 0` keeps the `zero-blocks-executed` finding (now always carrying the `--bind` remedy, since in that branch it always applies); `=== 0` emits an informational `no-executable-blocks` record into a new `notes[]` array. The split reaches the exit code — a correctly-refused file now exits `0`.
- **Beyond the report**: the note carries a per-reason refusal breakdown with counts, so a fail-closed refusal stays distinguishable from a deny-listed one (bug.6 / bug.10 shape). The reproducing `commit-changes` file turns out to be *entirely* fail-closed, which the old bare finding never showed.
- **Regression tests**: 4, all named `bug.7: …`. Mutation-proven — reverting the discrimination turns 3 red; the 4th is the over-correction guard and stays green by design, so "delete the guard" cannot pass in place of "split the guard".
- **Blast radius**: 17 files — engine, rule doc, both QA skill docs, 2 test suites, and 10 bundled copies regenerated by `npm run bundle`.

## QA Iteration History

### Verify Cycle 1 — 2026-09-06

**Regression test**: pass — all four `bug.7: …` tests green; fails-without established in Step 3
**Suite + lint**: pass — `npm run ci:fast` exit 0, Prettier clean, 2510 pass / 0 fail / 1 skipped
**Code review**: not run — lite mode (Minor/Medium) runs signals 1+2 only
**Fast gate**: n/a — a passing cycle exits at 5a and never reaches 5b
**Remote CI**: all 5 PR #331 checks pass, polled to completion; PR head `2d9e1418` == local HEAD
**Verdict**: PASS
**Action**: Proceeding to finalise (Step 7)

### Step 7 — DoD note

The DoD's security criterion initially used a loose `…|exec|…` grep and returned 7 hits — every one
the substring `exec` inside the word *executed* in added comment prose. The finding was benign, the
method was not. The criterion was re-specified on the real symbols (`SAFE_COMMANDS`, `DENY_`,
`spawnSync`, `classifyBlock`, `COMMAND_RUNNERS`, `child_process`) and returns 0; the correction is
recorded in `bug.7.dod.1` rather than quietly applied.

## Completion Summary

The bug was reproducible on first attempt, root-caused to a single 20-line guard, and fixed in one
iteration with no reopen. Verify cycle 1 passed on every signal the lite-mode rule runs.

Two things went beyond the bug report's own suggested fix, both deliberate:

1. **The exit code was split too**, not just the JSON. A reporting split that leaves both states at
   exit `1` reaches only the callers that parse the payload.
2. **The informational record carries a per-reason refusal breakdown**, so a fail-closed refusal
   stays distinguishable from a deny-listed one. Without it, the new record would have been a lossy
   summary hiding the exact signal `bug.6` and `bug.10` were about.

Two process notes worth keeping: the parity eval's rule-doc assertion had pinned the *old* heading
text, so it would have kept passing against a doc that still gave the wrong instruction — a
structural test can outlive the contract it was written for. And the DoD's security grep passed on a
mis-specified pattern before being tightened; recorded rather than silently fixed.

**Residual gap:** `/review-code` was not run on the fix diff (lite mode runs signals 1–2 only). The
configured behaviour, but no adversarial read of the diff took place, and the record says so.

## Completion

**Branch:** bugfix/bug.7.zero-blocks-executed-fires-on-correct-refusal
**PR:** #331 — https://github.com/Gamaroff/agent-skills/pull/331
**DoD Summary:** `bug.7.dod.1.zero-blocks-executed-fires-on-correct-refusal.md` — SATISFIED (6 criteria met, 1 N/A security surface, 1 residual gap: review-code not run in lite mode)

