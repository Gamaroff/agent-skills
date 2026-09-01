---
id: task.68
title: "[Task 68] /review-code branches on TRACKER where it should branch on VCS"
type: task
description: "review-code Step 4 chooses its PR-comment path from TRACKER, but posting a PR comment is a VCS operation. In a Bitbucket-VCS + GitHub-tracker repo it takes the gh branch against a Bitbucket PR and the comment silently never lands."
tags: [review-code, platform-detection, bitbucket, bug]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-08-31
updated: 2026-09-01
assignee:
estimated_effort_hours: 4
---

# Technical Task: `/review-code` branches on TRACKER where it should branch on VCS

**Status:** Ready for Review

---

## 1. Overview

`skills/review-code/SKILL.md` Step 4 decides how to post PR comments by testing `TRACKER=github`. Posting a comment on a **pull request** is a VCS operation governed by `$VCS`, not by which tracker holds the issues. Correct the branch and add a guard.

**Scope**: one conditional in one skill, plus the guard that keeps it correct.

---

## 2. Motivation

### Current Problems

1. **`TRACKER` and `VCS` are separate axes, and this conflates them.** `shared/resources/resolve-platform.sh` sets both precisely because a repo can host code on Bitbucket while tracking work in Jira — or on Bitbucket with GitHub issues.
2. **The wrong branch is taken silently.** With `VCS=bitbucket` and `TRACKER=github`, Step 4 takes the `gh pr comment` path against a Bitbucket PR. `gh` cannot address it; the comment never appears and the run reports success.
3. **The step it delegates to does not exist.** Step 4's Bitbucket arm says "mirror `/qa-story` step 6" — but `/qa-story` has **no numbered Step 6 at all** in its main review flow (its workflow lives under an unnumbered `### Review Workflow`; the only `Step 6` headings in the file belong to unrelated sub-workflows). The pointer is dead outright, not merely pointing at a GitHub-only step. An implementer following the instruction finds nothing to mirror. (Task 69 covers giving the qa-* skills a Bitbucket PR-comment path.)
4. **`review-pr` already got this right**, and states the rule explicitly. The two sibling skills now disagree about the same decision.

### Benefits

1. **Bitbucket users get working PR comments from `/review-code`** — currently they silently get none.
2. **One consistent rule across the review family**, stated the same way in both skills.
3. **Cheap**: a one-line conditional plus a contract test.

---

## 3. Technical Background

### Current architecture

`skills/review-code/SKILL.md` Step 4:

```
2. **GitHub** (`TRACKER=github`): post each finding as an inline review comment …
3. **Bitbucket / Jira**: post a summary comment via the platform's PR-comment path (mirror `/qa-story` step 6).
```

Three problems in three lines: the branch key is wrong, the alternative arm groups a VCS (`Bitbucket`) with a tracker (`Jira`) as though they were alternatives to each other, and the step it delegates to does not exist.

### Target architecture

```
2. **GitHub** (`VCS=github`): …
3. **Bitbucket** (`VCS=bitbucket`): …
```

`review-pr` states the rule as: *"Branch on `$VCS` for everything PR-shaped, on `$TRACKER` for everything issue-shaped."* Reuse that wording verbatim so the two skills agree.

---

## 4. Scope

### In Scope

✅ Correct Step 4's branch key from `TRACKER` to `VCS` in `skills/review-code/SKILL.md`
✅ Split the conflated "Bitbucket / Jira" arm into a `VCS=bitbucket` arm
✅ Restate the VCS-vs-TRACKER rule using `review-pr`'s wording
✅ A contract test asserting PR-shaped branches key off `$VCS`
✅ Sweep the other review-family skills for the same conflation and report findings

### Out of Scope

❌ **Giving `/qa-story` and `/qa-task` a Bitbucket PR-comment path** — that is task 69, and this task's Bitbucket arm should point there rather than at a path that does not exist
❌ Inline PR comments (task 70)
❌ Any change to `resolve-platform.sh`

---

## 5. Breaking Changes

None. In a GitHub/GitHub repo — which is every repo this has been exercised in — the two keys resolve identically, so behaviour is unchanged. The fix only alters behaviour in the mixed configuration that is currently broken.

---

## 6. Implementation Plan

### Phase 1: Fix the branch

**Risk Level**: Low

**Files**: `skills/review-code/SKILL.md`

**Changes**:
- [x] Step 4 item 2: `TRACKER=github` → `VCS=github`
- [x] Step 4 item 3: replace "Bitbucket / Jira" with a `VCS=bitbucket` arm
- [x] Add the rule statement, worded as in `review-pr`: branch on `$VCS` for PR-shaped work, `$TRACKER` for issue-shaped work
- [x] Replace the "mirror `/qa-story` step 6" pointer — that step does not exist. Point at the working dual-platform recipe in `skills/finalise/SKILL.md` **Step 7 ("Mark as Accepted and Generate Artifacts")**, which carries both a GitHub (`gh pr comment`) and a Bitbucket (`bitbucket-auth.sh` + REST `/pullrequests/{id}/comments`) arm, and note task 69 as the fix for the qa-* side

**Dependencies**: none

---

### Phase 2: Guard it

**Risk Level**: Low

**Files**: `skills/review-code/tests/review-code.test.js` (new — the skill currently has no tests)

**Changes**:
- [x] Create the test directory and a contract-test file, modelled on `skills/review-pr/tests/review-pr.test.js`
- [x] Assert the Step 4 section matches `VCS=github` / `VCS=bitbucket` and does **not** match `TRACKER=github`
- [x] Assert both platform arms exist
- [x] Add `'skills/review-code/tests/*.test.js'` to the `package.json` test globs

**Dependencies**: Phase 1

---

### Phase 3: Sweep for the same conflation elsewhere

**Risk Level**: Low

**Files**: read-only sweep; fixes as found

**Changes**:
- [x] `grep -rn 'TRACKER=github' skills/ shared/` and classify each hit: PR-shaped (wrong) vs issue-shaped (correct)
- [x] Fix any other PR-shaped use of `TRACKER` — none found; `review-code` was the only one
- [x] Record the classification in the implementation report, so a future reader knows the correct hits were checked and kept

**Dependencies**: Phase 1

---

## 7. Files Summary

### Files to Modify

1. ✅ `skills/review-code/SKILL.md` — Step 4 branch key and the Bitbucket arm
2. ✅ `package.json` — new test glob

### Files to Create

3. ✅ `skills/review-code/tests/review-code.test.js` — first tests for this skill

---

## 8. Testing Strategy

### Contract Tests

- [x] Step 4 branches on `$VCS`, not `$TRACKER`
- [x] A `VCS=bitbucket` arm exists with a real recipe, not a pointer to a GitHub-only step
- [x] The VCS-vs-TRACKER rule is stated
- [x] No dead cross-reference to `/qa-story` step 6 as a Bitbucket source

**Command**: `node --test 'skills/review-code/tests/*.test.js'`

### Mutation Proving

- [x] Revert the branch key to `TRACKER=github` → the test goes red (3 failing)
- [x] Delete the Bitbucket arm → the test goes red (3 failing)

---

## 9. Success Criteria

### Functional

- [x] `/review-code --comment` takes the Bitbucket path when `VCS=bitbucket`, regardless of `TRACKER`
- [x] The Bitbucket arm names a recipe that actually exists
- [x] The VCS-vs-TRACKER rule is stated in the skill

### Code Quality

- [x] `skills/review-code/tests/` exists and runs under `npm test`
- [x] Every fix is mutation-proved — 5 reverts, all red, each proved to have applied
- [x] The sweep's classification is recorded, including the hits deliberately left alone

---

## 10. Risk Assessment

### Low Risk Areas

**1. A `TRACKER=github` hit that is genuinely correct gets "fixed"**

- **Risk**: the sweep changes an issue-shaped branch that was right.
- **Probability**: Medium
- **Impact**: Minor, but it would introduce the mirror-image bug.
- **Mitigation**: classify every hit before changing any; record the classification. Issue comments, board moves and milestones are issue-shaped and must keep `TRACKER`.

**2. Untestable on this repo**

- **Risk**: this is a GitHub-hosted repo, so the corrected Bitbucket path still cannot be executed.
- **Probability**: High
- **Impact**: Minor — the fix is a one-line branch key whose correctness is visible by inspection.
- **Mitigation**: state it plainly rather than implying live verification. See task 67 for the general shape of this problem.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the sweep broke an issue-shaped branch.

**Steps**: `git revert` the commit; the change is confined to one skill file, one test file and one `package.json` line.

**Verification**: `npm test` green; `grep -n 'TRACKER=github' skills/review-code/SKILL.md` back to its prior state.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-01
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.68.qa.1.review-code-vcs-branch.md](./task.68.qa.1.review-code-vcs-branch.md)
- **Gate File**: [task.68.gate.1.review-code-vcs-branch.yml](./task.68.gate.1.review-code-vcs-branch.yml)

### Test Coverage Summary
- **Tests Executed**: 2116 (0 failures); 12 new contract tests
- **Phases Verified**: 3/3 complete (Phase 2 CONCERNS)
- **Critical Issues**: 0 HIGH, 1 MEDIUM, 2 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
`TASK68-001` (MEDIUM) — two of the new tests read sibling skills (`../review-pr`, `../finalise`), and `tests/` ships in the distributed zip, so the suite fails 2/12 with `ENOENT` outside this repo. Reproduced, not inferred. The fix itself is correct and independently mutation-verified.

## Dev Agent Record — QA Fix Cycle 1

**Date**: 2026-09-01
**Gate addressed**: [task.68.gate.1.review-code-vcs-branch.yml](./task.68.gate.1.review-code-vcs-branch.yml) — CONCERNS, 90/100

### TASK68-001 (MEDIUM) — shipped test suite failed outside this repository

**Root cause**: two tests read sibling skills via `path.join(ROOT, "..", <sibling>, "SKILL.md")` with a bare `readFileSync`. `package_skill.py` walks the whole skill directory and excludes only `{__pycache__, .git, node_modules, .DS_Store}`, so `tests/` ships in the distributed zip. Wherever `review-code` is installed without `review-pr` and `finalise` beside it, those two reads throw `ENOENT` and the suite fails 2 of 12.

**Fix**: added a `readSibling(name, rel)` helper that returns `null` on `ENOENT` and **rethrows every other error** (a bare try/catch would have swallowed `EACCES`/`EISDIR` and turned a real fault into a silent skip). Both cross-skill tests now take the node:test context and `t.skip(...)` when the sibling is absent. Both assertions are kept — the drift guard is the reason they exist.

**Files modified**: `skills/review-code/tests/review-code.test.js`

**Verification** — the risk in this fix is that it degrades the guard into a no-op that skips everywhere while leaving a green suite behind, so all three were run rather than the obvious one:

| Check | Result |
|---|---|
| In-repo run | **12 pass, 0 skipped** — the guards genuinely execute here |
| Standalone install (`SKILL.md` + `tests/` alone in a temp dir) | **10 pass, 0 fail, 2 skipped** — was 2 failing |
| Mutation: reword `review-pr`'s rule statement, siblings present | **1 red, 0 skipped** — the guard still bites; mutation proved to have applied, then restored |

`skills/review-pr/SKILL.md` confirmed unchanged after the mutation.

### Deferred (advisory, per the gate)

Both LOW findings were deliberately not fixed this cycle: the Bitbucket arm's undeclared `BB_*` variables (the `finalise` Step 7 pointer covers them), and the pre-existing `zero-blocks-executed` Step 4b result (verified byte-identical on `develop` — not a regression from this task).

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — found while building task.66 | create-task |
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, no placeholders, links resolve, effort rubric checked; status → ready-for-development | review-task |
| 2026-09-01 | 1.2     | Review passed (9/10) — READY TO IMPLEMENT. Premise re-verified against the tree: the `TRACKER=github` branch is live at `skills/review-code/SKILL.md:98`, `skills/review-code/tests/` does not exist, and `review-pr`'s rule is at `skills/review-pr/SKILL.md:79`. Sharpened two imprecise claims: `/qa-story` has no Step 6 at all (dead pointer, not a GitHub-only one), and the replacement pointer now names `finalise` Step 7 explicitly. One Important gap left open: no `github_issue` linked | review-task |
| 2026-09-01 |         | Implemented — 3 files, 12 tests. Step 4 now branches on `$VCS`; the Bitbucket arm names `finalise` Step 7 and the real REST endpoint; 5 mutation reverts all red. Sweep: 64 `TRACKER=github` occurrences across 20 source files classified — `review-code` was the only PR-shaped one | develop |
| 2026-09-01 |         | QA gate CONCERNS (90/100) — 1 MEDIUM, 2 LOW. Fix and guards verified, incl. an independent mutation revert; the MEDIUM is in the new test file, which fails 2/12 outside this repo | qa-task |
| 2026-09-01 |         | QA findings fixed — TASK68-001 (MEDIUM) closed, 1 iteration. Cross-skill test reads now degrade to a skip when the sibling skill is absent; guard proved still live in-repo under mutation | qa-fix |

---

## Progress Tracking

### Phase 1: Fix the branch
- [x] Step 4 branch key
- [x] Bitbucket arm
- [x] Rule statement

### Phase 2: Guard it
- [x] Contract tests (12, all green)
- [x] package.json glob

### Phase 3: Sweep
- [x] Classify every TRACKER=github hit (64 occurrences / 20 source files)
- [x] Fix PR-shaped ones (1 found, 1 fixed)

---

## References

- **Origin**: found while building [`task.66`](../task.66.review-pr/task.66.review-pr.md); recorded in its § Notes follow-ups
- **The correct rule, already written**: `skills/review-pr/SKILL.md` Step 0
- **Platform spec**: [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md)
- **Working dual-platform PR comment**: `skills/finalise/SKILL.md` Step 7 — GitHub and Bitbucket arms, both live
- **Related**: task 69 (the `/qa-story` step 6 half of the dead pointer)

---

## Notes

### Important Reminders

- Not every `TRACKER=github` is wrong. Issue comments, board moves and milestones are issue-shaped and correctly keyed on `TRACKER`. Classify before changing.

---

**Status:** Ready for Review

**Next Steps**:
1. `/review-task docs/tasks/task.68.review-code-vcs-branch/task.68.review-code-vcs-branch.md`
2. `/develop-task docs/tasks/task.68.review-code-vcs-branch/task.68.review-code-vcs-branch.md`
