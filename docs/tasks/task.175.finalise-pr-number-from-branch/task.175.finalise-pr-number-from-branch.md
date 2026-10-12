---
id: task.175
title: "[Task 175] Resolve finalise's PR number from the branch, not the task body"
type: task
description: "Resolve PR_NUMBER from the branch first (`gh pr view --json number` for the current branch, or the pipeline lock's `pr_url`), then from frontmatter, and never from a free-text body match."
tags: [finalise, observation]
category: infrastructure
status: accepted
priority: Medium
created: 2026-10-02
updated: 2026-10-12
completed_date: 2026-10-12
pr_number: 635
assignee:
estimated_effort_hours: 8
github_issue: 551
---

# Technical Task: Resolve finalise's PR number from the branch, not the task body

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.175.review.1.finalise-pr-number-from-branch.md` implemented 2026-10-12

**GitHub Issue**: [#551](https://github.com/Gamaroff/agent-skills/issues/551)

---

## 1. Overview

`/finalise` decides which pull request it is judging by reading `pr_number:` from the work item's frontmatter and, when that is absent, the **first** `PR #NNN` / `pull/NNN` anywhere in the document body. At Step 7 of a develop pipeline the frontmatter never has `pr_number:` yet (finalise writes it at 7.2), so the body fallback always runs — and a task document routinely cites other work's PRs. Three runs have picked a cited PR instead of their own (observation #184).

This task gives finalise one authoritative resolver: the PR whose head is the current branch, then the pipeline lock's `pr_url`, then frontmatter, and a body match only when it is confirmed against the current branch.

**Scope**:

- A new resolver, `shared/resources/resolve-pr-number.sh`, with an executed test
- `skills/finalise/SKILL.md` Step 3a, the bug-mode note that cites it, and Step 7.2's `pr_number:` write
- `shared/resources/finalise-dod-ac-prompt.md` Step 1 and `shared/resources/finalise-dod-fix-evidence-prompt.md` Step 1, which re-derive the number from the body themselves

**Key deliverables**:

1. `resolve-pr-number.sh` returns the PR number and the source it came from, and refuses rather than guesses when no authoritative source exists.
2. finalise Step 3a calls it; no derivation site in finalise reads a body `PR #N` unconfirmed, and Step 7.2 writes the resolved number, never one copied from the body.
3. The two agent prompts take the number they are given (`<PR_NUMBER>`) and no longer derive it from the document.
4. Tests fail when any of these is reverted.

---

## 2. Motivation

### Current Problems

1. **The body fallback picks another work item's PR.** Measured with `grep -oE 'PR #([0-9]+)|pull/([0-9]+)' <task-doc> | head -1` on each run's own document:
   - task.146 (own PR #488) → **472**, task.144's follow-up PR, cited in the worked example (observation #184, 2026-09-25)
   - task.147 (own PR #489) → **207**, a historical citation (recurrence, 2026-09-25)
   - task.166 (own PR #550) → **505**, obs #204's change "merged via PR #505" (recurrence, 2026-10-02)
2. **The fallback always runs inside a pipeline.** `pr_number:` is written by finalise itself at Step 7.2 (`skills/finalise/SKILL.md` § "Update Frontmatter"), after Step 3a reads it, so a pipeline-run document reaches Step 3a with no frontmatter value every time.
3. **A wrong number misleads three agents.** The AC agent reads that PR's review state, the docs agent greps the CHANGELOG for `#<PR_NUMBER>`, and the diff for the AC agent comes from `gh pr diff "$PR_NUMBER"` — all against the wrong change.
4. **Each run was saved only by an orchestrator that already knew its PR** and passed it by hand. Nothing in finalise reads the source that knows: the pipeline lock's `pr_url`, written at Step 4.

### Benefits

1. finalise judges the right PR without the orchestrator remembering to correct it.
2. A standalone `/finalise` (no lock) still finds the PR from the branch.
3. When no authoritative source exists, the run says so instead of acting on a guess.

---

## 3. Technical Background

### Current Architecture

Four places derive the PR number, each from the document. The search that defines the list, from the repository root: `grep -nE "PR #|pull/|pr_number|PR number from|PR_NUMBER=" skills/finalise/SKILL.md shared/resources/finalise-dod-*-prompt.md`, keeping only the lines that take a number *from the document* (the remaining hits read `$PR_NUMBER` or are worked examples):

- `skills/finalise/SKILL.md:462-463` (Step 3a, *`# PR number`*): `pr_number:` from frontmatter, else `grep -oE 'PR #([0-9]+)|pull/([0-9]+)' {story-file} | grep -oE '[0-9]+' | head -1`.
- `shared/resources/finalise-dod-ac-prompt.md:20` (Step 1, *"The PR number from frontmatter (`pr_number:`) or body text"*): the AC agent re-derives the number from the document even though `<PR_NUMBER>` is substituted into its prompt.
- `shared/resources/finalise-dod-fix-evidence-prompt.md:34` (Step 1, same wording): the bug-mode agent does the same.
- `skills/finalise/SKILL.md:1141` (Step 7.2, *"Ensure `pr_number` is present in frontmatter (add if only in body)"*): the acceptance write copies a body number into frontmatter, where rung 4 below would then trust it on every later run.

One prose citation depends on the Step 3a rule: `skills/finalise/SKILL.md:243` (bug mode `read-document`: *"`PR_NUMBER` comes from Step 3a's existing derivation over the document"*).

The authoritative sources already exist and nothing in finalise reads them:

- The pipeline lock's `pr_url`, written at Step 4: `shared/resources/develop-pipeline-step-4-create-pr.md:266` (*`jq --arg url "{PR_URL}" '.pr_url = $url'`*).
- The PR whose head is the current branch: `gh pr view --json number,headRefName` on GitHub (qa-task already resolves its PR this way — its PR existence check runs `gh pr view --json url,state,title,number` on the current branch); Bitbucket's `pullrequests?q=source.branch.name=…` query, which `qa-fix` and `review-pr` already use.

**One existing helper already reads the current branch's PR, and the resolver reuses it rather than sitting beside it.** `shared/resources/pr-read.sh` (sourced, `pr_read [--pr N] [--branch B]`) sets `PR_READ_NUMBER` for the PR `gh` finds for the current branch on GitHub, and for the **one open** PR whose source branch is the current branch on Bitbucket; none or several is a named failure (`PR_READ_ERROR`), and it reads Bitbucket's HTTP status rather than trusting an empty body (develop-* Step 8 uses it). Rung 2 below **is** `pr_read` with no `--pr`, so the forge queries, the auth handling and the control-character-safe JSON parse stay in one place. The resolver adds what `pr_read` does not do: the rung order, the lock and document rungs, and the body confirmation. An earlier draft of this section said no helper resolved a PR number; its search (`git grep -n 'resolve-pr\|pr-number'`) could not see `pr-read.sh`, whose output is `PR_READ_NUMBER`. `pr-conformance-prompt.md:127`'s `resolved_via: … pr-number …` is review-pr's label for the opposite direction (work item from a PR) and is unrelated.

### Target Architecture

`shared/resources/resolve-pr-number.sh --doc <work-item> [--pr <N>] [--json]` resolves in this order and stops at the first source that answers:

1. `--pr <N>` — an explicit number from the caller (the orchestrator, which knows it from Step 4)
2. the PR whose head is the current branch: `pr_read` from `pr-read.sh`, with no `--pr` (GitHub: the PR `gh` finds for the current branch; Bitbucket: the one open PR from the current branch)
3. the pipeline lock's `pr_url`, only when the lock's `task_or_story_directory` is the work item's directory
4. frontmatter `pr_number:`
5. a body `PR #N` / `pull/N` match, **only** when that PR's head branch is the current branch; an unconfirmed match is refused

It prints the number (or `{"pr": N, "source": "<rung>"}` with `--json`) and exits 0, or exits 1 with `reason: none` and no number. It never prints a number it could not attribute to a rung. It exits 2 on a usage error. Platform comes from `resolve-platform.sh`, sourced as `source … || exit 1`.

finalise Step 3a calls it **without `--pr`**: finalise takes no PR argument and no orchestrator passes one, so inside a pipeline rung 2 answers. Rung 1 serves direct callers of the resolver and its tests. The two prompts' Step 1 read only `<PR_NUMBER>`, and Step 7.2 writes `pr_number: <PR_NUMBER>` only when Step 3a resolved one — an unresolved run writes no `pr_number:`. A resolver exit 1 leaves `PR_NUMBER` empty, which the agents already handle (*"If PR number not found: set pr_status = NOT_FOUND"*), and the DoD records it as unresolved rather than guessed.

### Important Clarifications

- **Writing `pr_number:` at Step 4** (create-pr), which observation #184 also suggests, is left out: rung 2 finds the PR from the branch at every point after Step 4, so the frontmatter write would only add a second copy of a value git already holds. Recorded as a possible follow-up, not done here.
- **The body rung stays, confirmed, and it is narrow.** It answers only when rung 2 found no PR for the current branch but the cited PR's head branch *is* the current branch — on Bitbucket, a PR that is no longer open (`pr_read` reads open PRs only) on a branch that is still checked out. Confirmation reads the cited PR's head branch (GitHub `gh pr view <N> --json headRefName`; Bitbucket `.source.branch.name`), so the path is kept without trusting the body blind. A deleted head branch, or a citation of another work item's PR, cannot be confirmed: the body rung refuses and the run says `none`.

---

## 4. Scope

### In Scope

✅ `shared/resources/resolve-pr-number.sh` (new) and its executed test
✅ `shared/resources/pr-read.sh`: `pr_read` also reports the PR's head branch (`PR_READ_HEAD_BRANCH`), which rung 5 compares — so the per-number forge query stays in the one helper (added during development)
✅ `skills/finalise/SKILL.md` Step 3a, the `read-document` bug-mode note and Step 7.2's `pr_number:` write
✅ `shared/resources/finalise-dod-ac-prompt.md` and `shared/resources/finalise-dod-fix-evidence-prompt.md` Step 1
✅ Bundled copies regenerated; CHANGELOG `[Unreleased]` entry citing (task 175)

### Out of Scope

❌ Writing `pr_number:` at Step 4 (see Clarifications)
❌ Other skills that resolve a PR from the branch already (qa-task, qa-fix, review-pr) — they are not affected
❌ `/finalise`'s decision matrix and CI gates — unchanged

---

## 5. Breaking Changes

None to any interface. One behaviour change: when no authoritative source names a PR, finalise now runs with `PR_NUMBER` empty (recorded as unresolved) instead of using the first PR cited in the document body.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.175.plan.finalise-pr-number-from-branch.md](task.175.plan.finalise-pr-number-from-branch.md)

### Phase 1: The resolver

**Risk**: Medium. A wrong rung order or an unconfirmed fallback reintroduces the defect.

**Files**: `shared/resources/resolve-pr-number.sh` (new)

- [x] `--doc` (required), `--pr`, `--json`; usage errors exit 2.
- [x] Rungs 1–5 in the stated order; rung 3 only when the lock's `task_or_story_directory` canonicalises to the work item's directory; rung 5 only on a `headRefName` match with the current branch.
- [x] Exit 0 with the number and its source; exit 1 with `reason: none` and no number.
- [x] Rung 2 is `pr_read` from the sibling `pr-read.sh` (sourced `|| exit 1`); rung 5's confirmation has GitHub and Bitbucket arms, platform from `resolve-platform.sh` (`source … || exit 1`).

### Phase 2: finalise uses it

**Risk**: Low.

**Files**: `skills/finalise/SKILL.md`, `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-dod-fix-evidence-prompt.md`

- [x] Step 3a: replace the two `PR_NUMBER=` lines with the resolver call; record the source in the running summary.
- [x] Bug-mode `read-document` note: cite the resolver, not "Step 3a's existing derivation over the document".
- [x] Step 7.2: replace "Ensure `pr_number` is present in frontmatter (add if only in body)" with a write of Step 3a's `PR_NUMBER`, skipped when it is empty.
- [x] AC prompt and fix-evidence prompt Step 1: read the PR number only from `<PR_NUMBER>`; drop the frontmatter/body derivation.

### Phase 3: Tests

**Risk**: Low.

**Files**: `shared/resources/tests/resolve-pr-number.test.mjs` (new)

- [x] Executed against a fixture repo with a `gh` stub (`shared/resources/tests/lib/executed-prose.mjs` `fixtureRepo` / `ghStub`): each rung wins when the rungs above it are empty; a body citation of another PR is refused when its head branch differs (rungs 2–4 empty: the stub finds no PR for the branch, no lock, no `pr_number:`); no source → exit 1 with no number.
- [x] A presence pin: no finalise derivation site (Step 3a, Step 7.2, the two prompts) reads a body `PR #N` pattern or copies a body number into frontmatter; keyed on the derivation regex and the "add if only in body" / "PR number from frontmatter" prose, with a non-vacuity floor that Step 3a calls the resolver.

### Phase 4: Proof and gates

**Risk**: Low.

- [x] Mutation-prove under bash with `cp` snapshots and `cmp`-checked restore: drop rung 5's confirmation → red; swap rungs 2 and 4 → red; restore the body regex in Step 3a → red.
- [x] `npm run bundle`, `npm run ci:fast` with `.agents/skills` moved aside, `npm run bundle:check`, `npm run validate -- skills/finalise/`, `npm run lint:shell`.
- [x] CHANGELOG `[Unreleased]` entry citing (task 175).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/resolve-pr-number.sh` (new): the resolver
2. ✅ `skills/finalise/SKILL.md`: Step 3a, the bug-mode note and Step 7.2
3. ✅ `shared/resources/finalise-dod-ac-prompt.md`: Step 1
4. ✅ `shared/resources/finalise-dod-fix-evidence-prompt.md`: Step 1

5. ✅ `shared/resources/pr-read.sh`: `PR_READ_HEAD_BRANCH` output (GitHub `headRefName`, Bitbucket `.source.branch.name`; best-effort, never fails the read)

### Files to Modify (Tests)

6. ✅ `shared/resources/tests/resolve-pr-number.test.mjs` (new)
7. ✅ `shared/resources/pr-read.test.sh`: three head-branch cases

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

8. ✅ `CHANGELOG.md`: `[Unreleased]` entry
9. ✅ Bundled copies under `skills/*/references/` (regenerated by `npm run bundle`, never edited by hand)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the resolver's rung order, the body-rung confirmation, the refusal
- **Command**: `node --test shared/resources/tests/resolve-pr-number.test.mjs`
- **Target**: each Phase 4 mutation goes red; baseline green under every shell in `SHELLS` (bash in CI, which has no zsh; zsh where installed, verified locally)

### Integration Tests

- **Scope**: bundled copies equal their sources (`npm run bundle:check`); `lint:shell` passes on the new script
- **Command**: `npm run bundle:check && npm run lint:shell`

### Performance Tests

Not applicable — one `gh` call per resolution, at most three.

### Consumer Tests

- The next pipeline `/finalise` on a document that cites another PR resolves its own PR from rung 2 (or rung 1, when the orchestrator passes it), recorded in the DoD's running summary with its source.

---

## 9. Success Criteria

### Functional

- [ ] `resolve-pr-number.sh` resolves through rungs 1–5 in order, and its executed test holds each rung (Phases 1, 3).
- [ ] A body `PR #N` is used only when PR N's head branch is the current branch; an unconfirmed citation is refused — held by the test that cites another PR in the fixture document (Phases 1, 3).
- [ ] With no source, the resolver exits 1 and prints no number (Phases 1, 3).
- [ ] finalise Step 3a calls the resolver, Step 7.2 writes only the resolved number, and no finalise derivation site reads a body `PR #N` pattern — held by the presence pin (Phases 2, 3).

### Performance

- [ ] Not applicable: one to three `gh` calls per run.

### Code Quality

- [ ] `npm run ci:fast` passes with `.agents/skills` moved aside; `bundle:check`, `npm run validate -- skills/finalise/` and `lint:shell` pass.
- [ ] Each Phase 4 mutation goes red under bash, with the restore checked by `cmp`.

### Migration

- [ ] CHANGELOG `[Unreleased]` entry cites (task 175).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

1. **The resolver picks a stale lock.**
   - **Risk**: a lock left by another work item's run supplies its `pr_url`.
   - **Probability**: Low. **Impact**: High (the defect, by another route).
   - **Mitigation**: rung 3 applies only when the lock's `task_or_story_directory` is this work item's directory, compared canonicalised (the `advance-pipeline-lock.sh --restore` comparison); rung 2, which reads the branch, is above it.
   - **Rollback**: revert Phase 2; Step 3a returns to its two lines.

2. **A standalone run on a branch with no PR loses a number it used to find.**
   - **Risk**: the old body fallback found a correct number by luck; the resolver refuses.
   - **Probability**: Low. **Impact**: Low — the agents already handle a missing number (`pr_status = NOT_FOUND`), and the DoD says so rather than judging the wrong PR.
   - **Mitigation**: `--pr` lets any caller supply it.

### Low Risk Areas

1. **Bitbucket arm untested against a live host.** Mitigation: it reuses the source-branch query `qa-fix` and `review-pr` already run; the test covers it with a stubbed `curl`.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: finalise runs with an empty `PR_NUMBER` where a PR exists; the new test red on `develop`
- **Steps**: revert the merge commit, run `npm run bundle`, run `npm run ci:fast`
- **Validation**: suites green; Step 3a shows its two original lines

### Partial Rollback (1-2 hours)

- **When**: the prompts' change is wrong but the resolver is sound
- **Steps**: revert the two prompt edits only; keep the resolver and Step 3a

### Forward Fix (< 4 hours)

- **When**: a rung misses a real case (a Bitbucket response shape, a lock spelling)
- **Approach**: add the case to the resolver and its test

### Rollback Triggers

- **Critical**: a wrong PR number resolved; red suite on `develop`
- **Non-critical**: an unresolved number where one could have been found (fix forward)

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-12
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.175.qa.1.finalise-pr-number-from-branch.md](./task.175.qa.1.finalise-pr-number-from-branch.md)
- **Gate File**: [task.175.gate.1.finalise-pr-number-from-branch.yml](./task.175.gate.1.finalise-pr-number-from-branch.yml)

### Test Coverage Summary
- **Tests Executed**: 19 (16 resolver cases, 3 pr-read cases) plus the full fast gate
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Two advisory code-review findings (CR-1 branch rung on a long-lived branch, CR-2 refusal wording) routed to future work. Security is `boundary: true` with `probes_executed: 0` — no probe entry form reaches the resolver, so finalise's zero-guard will need a recorded override.

## Definition of Done - Gaps Identified — run 1 (historical, superseded by run 2 below)

**Status:** superseded — run 2 accepted the task with the security zero-guard closed by a recorded human override

### QA Gate Status

**QA Report**: `task.175.qa.1.finalise-pr-number-from-branch.md`
**Gate File**: `task.175.gate.1.finalise-pr-number-from-branch.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

### Missing Criteria:

1. **Security Review:**
   - [ ] Probe zero-guard: no `security-probe.mjs` entry form reaches `shared/resources/resolve-pr-number.sh` (flag-parsed, `gh`-networked). The engine's 14 `shell:` runs measured the argument parser (exit 2 on every input), not the control — needs task.181's `shell-argv:` form or a recorded human override citing the executed fixture suite

All eight success criteria, documentation, compliance (not applicable) and CI reading 1 (SUCCESS @ `545ca1bd14e6`) pass.

### Next Steps:

- [ ] **BLOCKING**: a human records a security override in a DoD run 2 (task.125 / task.133 / task.188 precedent), or task.181 lands first

**Estimated Effort:** Small (record an override and re-run `/finalise`)

**Gap Report Generated:** 2026-10-12

**Detailed Verification Log:** See `task.175.dod.1.finalise-pr-number-from-branch.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.175.qa.1.finalise-pr-number-from-branch.md`
**Gate File**: `task.175.gate.1.finalise-pr-number-from-branch.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 8/8 met — the four behaviour criteria each held by `resolve-pr-number.test.mjs` / `pr-read.test.sh`, run per PR
✅ **PR Review:** PR #635; Step 5c `/review-pr` APPROVE (0 findings); no host reviews required
✅ **Tests:** 16 resolver cases + 3 pr-read cases; 7 mutations red; `ci:fast` 5364 tests, 0 failures
✅ **Documentation:** CHANGELOG `[Unreleased]` › Fixed cites (task 175); finalise SKILL.md and both DoD prompts updated and bundled
✅ **Security Review:** PASS by recorded human override — the probe zero-guard (no `security-probe.mjs` entry form reaches the flag-parsed, `gh`-networked resolver); checklist otherwise clean
✅ **Compliance Review:** not applicable (internal tooling)
✅ **CI:** reading 1 SUCCESS @ `bd06cc3d68c1` (5 checks)

**Task marked as ACCEPTED on:** 2026-10-12

**Detailed Verification Log:** See `task.175.dod.2.finalise-pr-number-from-branch.md` (run 2, with the override block) and `task.175.dod.1.finalise-pr-number-from-branch.md` (run 1) for complete verification evidence and timestamps.

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-02 | 1.0     | Initial draft — cut from observation #184  | create-task |
| 2026-10-12 | 1.1     | Review passed (8/10) — rung 2 reuses `pr-read.sh`; Step 7.2's body-to-frontmatter `pr_number` write added to scope; unsourced `PR_NUMBER_ARG` dropped; anchors corrected | review-task |
| 2026-10-12 |         | Status → ready-for-development | review-task |
| 2026-10-12 |         | Implemented — 1 new script, 1 new test file (16 cases), 5 sources edited; 7 mutations proved red | develop |
| 2026-10-12 |         | QA gate PASS (100/100) — 0 findings; 2 advisory code-review notes | qa-task |
| 2026-10-12 |  | DoD incomplete — 1 gap identified (security probe zero-guard) | finalise |
| 2026-10-12 | 1.2 | DoD verified — accepted (PR #635); security zero-guard closed by a recorded human override | finalise |

---
<!-- change-log-end -->

## Progress Tracking

### Phase 1: The resolver

- [x] Rungs, refusal, platform arms

### Phase 2: finalise uses it

- [x] Step 3a, bug-mode note, two prompts

### Phase 3: Tests

- [x] Executed resolver test; presence pin

### Phase 4: Proof and gates

- [x] Mutation proofs; gates; CHANGELOG

---

## References

- Observation #184 — finalise Step 3a PR_NUMBER falls back to the first 'PR #N' in the body — picks a cited PR, not the task's (recurrences: task.147, task.166)
- `skills/finalise/SKILL.md` § Step 3a; `shared/resources/develop-pipeline-step-4-create-pr.md` § Post-PR Steps (the lock's `pr_url`); `shared/resources/pr-read.sh` (rung 2)

---

## Notes

- **Post-merge:** set observation #184 to `actioned` through `observation-log.js set-status` once this merges.
- Edit the `shared/resources/` sources, then run `npm run bundle`. Never edit a `skills/*/references/` copy.

---

**Status:** Accepted

**Next Steps**:

1. `/develop-task docs/tasks/task.175.finalise-pr-number-from-branch/task.175.finalise-pr-number-from-branch.md`
2. QA artifacts will be co-located: `task.175.qa.{N}.*.md`, `task.175.gate.{N}.*.yml`, `task.175.bug.{N}.*.md`
