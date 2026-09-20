# Bug Report: Task 128 - Step 8a licenses the commit on forecast inputs (`commits: 1`, `touched`) that are never checked against git

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle-2 refute review CR-2, verified against Step 8a)
**Date Found**: 2026-09-20

## Description
Step 8a says "every input comes from something already on disk; none is a judgement", but the record template hard-codes `"commits": 1` before any commit exists and `touched` is "every path the fix **will** change". The second (licensing) evaluator run happens before the commit, so `single-commit` and `inside-files-summary` are never compared with `git rev-list --count` / `git diff --name-only` — the same self-report class BUG-4 closed for `mutation-proved`.

## Expected Behavior
The evaluator derives `commits` and `touched` from git when given a base ref, refuses a finding whose recorded values disagree with git, and Step 8a's licence to push is a post-commit run with that base.

## Actual Behavior
The licence is issued on the plan.

## Recommendation
`finalise-fix-and-recheck.mjs --git-base <ref>`: compute both from git, cross-check the record, fail closed on disagreement; Step 8a runs it a third time after the commit and pushes only on exit 0.

## Developer Fix Cycle

### Iteration 1
**Root cause**: the record's `commits` and `touched` were typed before the commit and never compared with git.
**Fix**: `finalise-fix-and-recheck.mjs --git-base <ref>` — `gitFacts()` derives `commits` (`git rev-list --count base..HEAD`) and `touched` (`git diff --name-only base..HEAD`); `evaluateFixAndRecheck(finding, {git})` refuses a record that disagrees (`single-commit` / `inside-files-summary` named with both values); git that cannot answer is a failed precondition. Step 8a gains step 2b: a third, post-commit run with `--git-base "$CI_HEAD_1"` is the licence to push; the checklist and the deviations block say so.
**Tests**: `--git-base: the record must agree with git…` — temp repo: 0 commits → refused; 1 commit touching exactly the named file → proceed; a second commit / an unnamed file → refused; bad ref → refused; CLI exit 1 and usage exit 2.
**Mutation proof**: git cross-check skipped → test red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | --git-base + Step 8a step 2b |
| 2026-09-20 | Closed | QA Engineer | Verified fixed at cycle 3 (execution) |
