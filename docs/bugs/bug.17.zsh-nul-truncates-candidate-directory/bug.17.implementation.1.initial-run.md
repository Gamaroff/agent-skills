---
type: implementation-report
status: in-progress
bug: 'bug.17'
mode: 'general'
started: '2026-09-30T10:29:09Z'
---

# Implementation Report — bug.17

**Started:** 2026-09-30T10:29:09Z
**Finished:** —
**Final Status:** Halted — finalise DoD gaps (Step 7)
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Minor / Low
**Lite mode:** on
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch created at `8d5ba45e`; issue #529 created, work-started posted + board transitioned | |
| 2 | review-bug | ✅ Done | READY TO FIX 10/10; 1 Important applied (Expected Behavior restated as refusal contract) | |
| 3 | investigate-fix | ✅ Done | Reproduced (zsh NUL; also `\n` under both shells); control-char refusal in `choose_candidate()`; 10 regression cases, 9 red pre-fix; ci:fast + lint:shell green | |
| 4 | create-pr | ✅ Done | PR #530: https://github.com/Gamaroff/agent-skills/pull/530 | |
| 5–6 | verify-fix loop | ✅ Done | Cycle 1 PASS (lite: signals 1+2) | |
| 7 | finalise-close | ⚠️ Needs Attention | `/finalise --bug` → GAPS (1): security zero-guard (engine cannot reach `--restore <dir>`); HALT for operator decision | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- 2026-09-30T10:29:09Z — Bug resolved: docs/bugs/bug.17.zsh-nul-truncates-candidate-directory/bug.17.zsh-nul-truncates-candidate-directory.md (mode=general, prefix=bug.17). Resolved directly from the path develop-next's selector supplied; no Explore resolution needed.
- 2026-09-30T10:29:09Z — Dispatched by /develop-next (item B17, source bug-registry); AUTONOMOUS RUN directive in force.
- 2026-09-30T10:29:09Z — Phase 0b: no active lock. `.claude/state/develop-pipeline.last-halt.json` is for task.133 (PR #528, merged) — not this bug; left in place, fresh run.
- 2026-09-30T10:29:09Z — Phase 0c: status=new, severity=Minor, priority=Low, no tracker issue in frontmatter. TRACKER=github VCS=github.
- 2026-09-30T10:29:09Z — Lite mode: on — severity=Minor, priority=Low (applies to Step 5 only).
- 2026-09-30T10:29:09Z — Q1 branch model: bugfix (auto-answered — bug is not a production regression).
- 2026-09-30T10:29:09Z — Q2 base branch: develop (auto-answered, derived from Q1).
- 2026-09-30T10:29:09Z — Q3 PR target: develop (auto-answered, derived from Q1).
- 2026-09-30T10:30:34Z — Branch: `bugfix/bug.17.zsh-nul-truncates-candidate-directory` (base develop, pushed with upstream). Implementation report stashed before branch creation, restored after.
- 2026-09-30T10:30:34Z — Tracker: ensure-bug-github-issue created #529 (labels bug, priority:low; `severity:Minor` not defined in repo — dropped, severity carried in body). Board priority P3. github_issue written back; Status History row added.
- 2026-09-30T10:30:34Z — Signal Work Started: tracker-comment reason=posted; gh-stage work-started reason=transitioned.
- 2026-09-30T10:31:34Z — review-bug invoked in validate-and-apply mode → READY TO FIX (10/10). Report: `bug.17.review.1.zsh-nul-truncates-candidate-directory.md`. Pre-pass run in-line (registry grep + live repro: zsh rc=0, bash rc=1), not as Explore subagents. Tracker comment reason=posted.
- 2026-09-30T10:40:58Z — Step 3 fix summary:
  - Root cause: `choose_candidate()` compared a lossy `$(jq -r …)` read of `task_or_story_directory` — zsh keeps a NUL (canon's `cd` truncates), both shells strip a trailing newline.
  - Scope widened on evidence: `<doc>\n` was accepted under bash as well as zsh (probe rc 0/0); the same fix covers it.
  - Fix: `jq -e` control-character test (U+0000–U+001F, U+007F) on the JSON value before the read; skipped by name, never chosen or consumed.
  - Regression tests: `advance-pipeline-lock.test.sh` run_restore_scenarios — 4 suffix cases + NUL-claim-beside-matched-snapshot, bash and zsh (109/109). Mutation-proved (3 narrowing mutants + disable, all red).
  - Files: `shared/resources/advance-pipeline-lock.{sh,test.sh}`, 12 bundled copies, `CHANGELOG.md`, bug file + registry row (`ready-for-qa`).
- 2026-09-30T10:40:58Z — Root-cause localisation done in-line (the defect site was named by the report and confirmed by a live repro); no Explore subagent dispatched, so no waiting_on marker was set.
- 2026-09-30T10:42:10Z — Step 4 SCOPE_PATHS: bug dir, CHANGELOG.md, docs/bugs, shared/resources, 12 skills/*/references. No out-of-scope untracked files held.
- 2026-09-30T10:42:10Z — Commits: `4579f760` fix(advance-pipeline-lock) and `40894377` docs(bug.17). Leak check OK. PR #530 opened against develop, Closes #529. PR body written directly (small diff); the Explore summariser was not dispatched.
- 2026-09-30T10:42:10Z — Post-PR state check: PR #530 state = OPEN, checked with `gh pr view`, not the poller subagent. Tracker in-review comment reason=posted. GitHub board: in-review → stage-disabled.
- 2026-09-30T10:43:15Z — GitHub 529 — in-qa: stage-disabled. ready-for-merge: stage-disabled. qa-cycle-1 comment: posted.
- 2026-09-30T10:43:15Z — Detector prompt (`pipeline-resume-detector-prompt.md` item 1) left unchanged: it already drops any candidate whose directory string differs and defers to `choose_candidate()` as the authority.
- 2026-09-30T10:48:17Z — CI reading 1: SUCCESS @ `40894377f71c` over 5 checks (test, validate, shellcheck, link-check, branch policy).
- 2026-09-30T10:48:17Z — DoD agents: fix-evidence PASS (independent scratch mutation: 100 passed / 9 failed); docs PASS; compliance N/A; security FAIL (medium) — `probe mode executed no candidates`.
- 2026-09-30T10:48:17Z — Decision: GAPS. Step 8a not applicable (finding is medium; fix belongs in `security-probe.mjs`). task.133 cleared the same engine gap only by an explicit operator override; that approval was for task.133 and is not reused here without asking.
- 2026-09-30T10:48:17Z — Gaps path: DoD `bug.17.dod.1.zsh-nul-truncates-candidate-directory.md` filled (gaps); Status History row `DoD incomplete — 1 gap(s)`; engine record `bug.17.dod.security.run.json` + by-hand record `bug.17.dod.security.by-hand-probe.md` saved; gaps PR comment posted (#530 issuecomment-5909659347); registry-tick → not-a-task.

## Issues Log

## QA Iteration History

### Verify Cycle 1 — 2026-09-30
**Regression test**: pass (advance-pipeline-lock.test.sh 109/109, bash + zsh; 9/10 new cases red pre-fix)
**Suite + lint**: pass (grant-qa-cycles.test.sh 46/46; detector-candidate-rule + who-restores-single-statement 12/12; shellcheck clean)
**Code review**: skipped (lite mode) · Applied non-blocking: 0 · Declined: 0
**Fast gate**: n/a
**Verdict**: PASS
**Action**: Proceeding to finalise

### Finalise DoD Gaps — 2026-09-30

1. **Security zero-guard (medium).** The probe engine has no entry form for a shell script taking a flag + positional (`advance-pipeline-lock.sh --restore [--which] <doc-dir>`): `shell-fn:` exits 97 on source, `cli:` is `.mjs`/`.js` only, `shell:` reaches only the numeric arm → `totals.executed: 0`. Same gap as task.133 dod.2 (obs #231). Supplementary §5.1 by-hand probe: 66/66 post-fix, 8 mismatches pre-fix. Resolution options: operator override on that evidence (task.133's path), or the obs #231 engine extension first.

## Completion

**Branch:** `bugfix/bug.17.zsh-nul-truncates-candidate-directory`
**PR:** https://github.com/Gamaroff/agent-skills/pull/530
**DoD Summary:** `bug.17.dod.1.zsh-nul-truncates-candidate-directory.md` (GAPS — 1)
