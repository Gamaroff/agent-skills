---
id: task.68
title: "[Task 68] /review-code branches on TRACKER where it should branch on VCS"
type: task
description: "review-code Step 4 chooses its PR-comment path from TRACKER, but posting a PR comment is a VCS operation. In a Bitbucket-VCS + GitHub-tracker repo it takes the gh branch against a Bitbucket PR and the comment silently never lands."
tags: [review-code, platform-detection, bitbucket, bug]
category: infrastructure
status: ready-for-development
priority: Medium
risk_level: low
created: 2026-08-31
updated: 2026-08-31
assignee:
estimated_effort_hours: 4
---

# Technical Task: `/review-code` branches on TRACKER where it should branch on VCS

**Status:** Ready for Development

---

## 1. Overview

`skills/review-code/SKILL.md` Step 4 decides how to post PR comments by testing `TRACKER=github`. Posting a comment on a **pull request** is a VCS operation governed by `$VCS`, not by which tracker holds the issues. Correct the branch and add a guard.

**Scope**: one conditional in one skill, plus the guard that keeps it correct.

---

## 2. Motivation

### Current Problems

1. **`TRACKER` and `VCS` are separate axes, and this conflates them.** `shared/resources/resolve-platform.sh` sets both precisely because a repo can host code on Bitbucket while tracking work in Jira — or on Bitbucket with GitHub issues.
2. **The wrong branch is taken silently.** With `VCS=bitbucket` and `TRACKER=github`, Step 4 takes the `gh pr comment` path against a Bitbucket PR. `gh` cannot address it; the comment never appears and the run reports success.
3. **The step it delegates to does not exist.** Step 4's Bitbucket arm says "mirror `/qa-story` step 6" — but `/qa-story` step 6 is itself GitHub-only. An implementer following the instruction finds nothing to mirror. (Task 69 covers that half.)
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

Two problems in three lines: the branch key is wrong, and the alternative arm groups a VCS (`Bitbucket`) with a tracker (`Jira`) as though they were alternatives to each other.

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
- [ ] Step 4 item 2: `TRACKER=github` → `VCS=github`
- [ ] Step 4 item 3: replace "Bitbucket / Jira" with a `VCS=bitbucket` arm
- [ ] Add the rule statement, worded as in `review-pr`: branch on `$VCS` for PR-shaped work, `$TRACKER` for issue-shaped work
- [ ] Replace the "mirror `/qa-story` step 6" pointer — that path is GitHub-only. Point at the working dual-platform recipes in `skills/finalise/SKILL.md`, and note task 69 as the fix for the qa-* side

**Dependencies**: none

---

### Phase 2: Guard it

**Risk Level**: Low

**Files**: `skills/review-code/tests/review-code.test.js` (new — the skill currently has no tests)

**Changes**:
- [ ] Create the test directory and a contract-test file, modelled on `skills/review-pr/tests/review-pr.test.js`
- [ ] Assert the Step 4 section matches `VCS=github` / `VCS=bitbucket` and does **not** match `TRACKER=github`
- [ ] Assert both platform arms exist
- [ ] Add `'skills/review-code/tests/*.test.js'` to the `package.json` test globs

**Dependencies**: Phase 1

---

### Phase 3: Sweep for the same conflation elsewhere

**Risk Level**: Low

**Files**: read-only sweep; fixes as found

**Changes**:
- [ ] `grep -rn 'TRACKER=github' skills/ shared/` and classify each hit: PR-shaped (wrong) vs issue-shaped (correct)
- [ ] Fix any other PR-shaped use of `TRACKER`
- [ ] Record the classification in the implementation report, so a future reader knows the correct hits were checked and kept

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

- [ ] Step 4 branches on `$VCS`, not `$TRACKER`
- [ ] A `VCS=bitbucket` arm exists with a real recipe, not a pointer to a GitHub-only step
- [ ] The VCS-vs-TRACKER rule is stated
- [ ] No dead cross-reference to `/qa-story` step 6 as a Bitbucket source

**Command**: `node --test 'skills/review-code/tests/*.test.js'`

### Mutation Proving

- [ ] Revert the branch key to `TRACKER=github` → the test goes red
- [ ] Delete the Bitbucket arm → the test goes red

---

## 9. Success Criteria

### Functional

- [ ] `/review-code --comment` takes the Bitbucket path when `VCS=bitbucket`, regardless of `TRACKER`
- [ ] The Bitbucket arm names a recipe that actually exists
- [ ] The VCS-vs-TRACKER rule is stated in the skill

### Code Quality

- [ ] `skills/review-code/tests/` exists and runs under `npm test`
- [ ] Every fix is mutation-proved
- [ ] The sweep's classification is recorded, including the hits deliberately left alone

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

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — found while building task.66 | create-task |
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, no placeholders, links resolve, effort rubric checked; status → ready-for-development | review-task |

---

## Progress Tracking

### Phase 1: Fix the branch
- [ ] Step 4 branch key
- [ ] Bitbucket arm
- [ ] Rule statement

### Phase 2: Guard it
- [ ] Contract tests
- [ ] package.json glob

### Phase 3: Sweep
- [ ] Classify every TRACKER=github hit
- [ ] Fix PR-shaped ones

---

## References

- **Origin**: found while building [`task.66`](../task.66.review-pr/task.66.review-pr.md); recorded in its § Notes follow-ups
- **The correct rule, already written**: `skills/review-pr/SKILL.md` Step 0
- **Platform spec**: [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md)
- **Working dual-platform PR comment**: `skills/finalise/SKILL.md`
- **Related**: task 69 (the `/qa-story` step 6 half of the dead pointer)

---

## Notes

### Important Reminders

- Not every `TRACKER=github` is wrong. Issue comments, board moves and milestones are issue-shaped and correctly keyed on `TRACKER`. Classify before changing.

---

**Status:** Ready for Development

**Next Steps**:
1. `/review-task docs/tasks/task.68.review-code-vcs-branch/task.68.review-code-vcs-branch.md`
2. `/develop-task docs/tasks/task.68.review-code-vcs-branch/task.68.review-code-vcs-branch.md`
