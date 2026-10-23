# QA Report: Task 200 - Tracker side effects after their gate (cycle 2)

**Task**: [Link to task document](./task.200.tracker-side-effects-after-their-gate.md)
**Gate File**: [task.200.gate.2.tracker-side-effects-after-their-gate.yml](./task.200.gate.2.tracker-side-effects-after-their-gate.yml)
**Previous Report**: [task.200.qa.1.tracker-side-effects-after-their-gate.md](./task.200.qa.1.tracker-side-effects-after-their-gate.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's fixes for TASK-200-001, 002 and 003 hold: each was reverted at a site cycle 1 did not use, and a committed test went red. The cycle-2 refute pass re-read the whole branch and found a HIGH that cycle 1 introduced. create-epic's migrated PRD-link block reads a path it never binds, so it aborts. That is the TASK-200-002 shape again, and the execute test hid it by supplying the binding itself. It also found three MEDIUMs, one of them a gap in cycle 1's own link scan.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-200-001: guard apostrophe breaks all 8 sites | high | ✅ FIXED | Apostrophe restored in `ensure-task-github-issue` (not cycle 1's site): the execute test goes red |
| TASK-200-002: unbound relative path in sync sites | medium | ✅ FIXED | Binding deleted in `ensure-epic-github-issue`: the execute test goes red. The same class remains in one other read (TASK-200-006) and one other skill (TASK-200-005), filed separately |
| TASK-200-003: Step 2 halt can post `blocked` | medium | ✅ FIXED | The rule's Step 2b clause removed: the develop-bug test goes red |
| TASK-200-004: create-epic links the checked-out branch | medium | ⚠️ PARTIAL | The link now goes through the resolver, but its block reads an unbound path (TASK-200-005), and the widened scan misses a reassignment (TASK-200-008) |

Bug reports: BUG-1, BUG-2 and BUG-3 → Closed. BUG-4 → Reopened.

---

## New Findings This Cycle

- **[high]** `skills/create-epic/SKILL.md:164`: the PRD-link block reads `PRD_SOURCE_PATH`, which only the parent-PRD block (line 131) binds, so `--doc ""` exits 2 and the guard aborts both arms. Fix: bind it with a `{placeholder}` line, and make the test take the binding from the block. ([BUG-5](./task.200.bug.5.create-epic-prd-link-reads-an-unbound-path.md))
- **[medium]** `skills/sync-github-story/SKILL.md:158`: `--explicit "${DOC_BRANCH:-}"` has no writer, so the review-story/finalise pin is dropped. Fix: bind the pin from a `{placeholder}`, and add a pinned execute case. ([BUG-6](./task.200.bug.6.sync-github-story-pin-is-never-bound.md))
- **[medium]** `shared/resources/doc-link-branch.js:80`: a `{parent}.bug.{N}` branch names the parent's own document and its sibling bugs. Fix: reject a `.bug.<n>` remainder for another bug, and add must-differ rows. ([BUG-7](./task.200.bug.7.a-sibling-bug-branch-names-the-wrong-work-item.md))
- **[medium]** `tests/doc-link-branch-population.test.js`: `unresolvedLinks` accepts a variable that any resolver line assigns, so a later reassignment from HEAD passes. Fix: flag any non-resolver assignment of a link variable. ([BUG-8](./task.200.bug.8.link-scan-misses-a-reassigned-branch.md))

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review` after cycle 1)
- [x] All implementation phases completed
- [x] Tests passing (fast gate 6060/0 at `fe0121c0`)
- [x] Breaking changes documented (CHANGELOG behaviour change for develop-bug)
- [x] Code on feature branch with open PR (#711, OPEN)

### Review Methodology

Re-review, direct tools, plus one Explore code reviewer. Cycle 2 makes the review a full refute pass, whatever the Adaptive Review Strategy says.

```
Re-review scope: unscoped — cycle 2 refute pass over origin/develop...HEAD
```

The patch reviewed was 2207 lines of the authored change set. Excluded: the bundled `skills/*/references/` copies that `npm run bundle:check` holds byte-equal to their `shared/resources/` sources, and this task's own directory. Hand-authored `references/` changes were appended. `SAFETY_REPROBE=false`: clause 1 (`qa-safety-clause1.sh`) printed false, and gate 1 failed on reliability, not a safety axis.

Reviewer: dispatched 18:57:21Z, returned 19:02:37Z (`date -u` at dispatch and at return; `duration_ms` 267917). It returned 6 findings, all with `anchor_check: ok` (`finding-anchors.js --rev HEAD`).

Step 4b: run (runnable prose changed). See below.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: doc-link-branch.js resolver | CONCERNS | Verified | Sibling-bug match (TASK-200-007) |
| Phase 2: GitHub sites + jira-sync delegation | CONCERNS | Verified | 8 sites parse and bind; sync-github-story pin dropped (TASK-200-006) |
| Phase 3: create-epic + population test | FAIL | Partial | Unbound path (TASK-200-005); scan bypass (TASK-200-008) |
| Phase 4: develop-bug Step 2b | PASS | Verified | `blocked` exemption holds |
| Phase 5: docs, CHANGELOG, config | PASS | Verified | |

**Overall Phase Completion**: 2/5 pass, 5/5 implemented

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Step 1 has no ensure-bug-*, no work-started signal, no push; Step 2b is the only ensure-bug-* | PASS | `develop-bug.test.js` step-order tests |
| NEEDS DETAIL / DUPLICATE / STALE halts name branch + report, delete nothing | PASS | same suite |
| Step 2b writes `tracker_issue` + `tracker_step` in one write; resume contract states six states | PASS | `develop-bug.test.js` (lock write and probe run, not grepped) |
| Unrelated branch → default; own / parent / hotfix branch → that branch | CONCERNS | `doc-link-branch.test.mjs` holds the listed cases; a sibling bug's branch is wrongly accepted (TASK-200-007) |
| `task.20` does not match `feature/task.200.x` | PASS | same test |
| At most one `gh repo view`, none with `--default` | PASS | CLI test with stubbed `gh` |
| `npm test` green with `.agents/skills` aside; bundle:check, format:check clean | PASS | `ci:fast` attempt 2 at `fe0121c0`: 6060 tests, 0 failures |
| Each new test mutation-proved | CONCERNS | 4 of 5 QA proofs covered; the link scan's reassignment case is `no-red-untested` (TASK-200-008) |
| `npm run validate` for every changed skill | PASS | 11 skills, all exit 0 |
| CHANGELOG entry; configuration.md § Document link branch | PASS | read |

---

## Breaking Changes Validation

### Breaking Change: develop-bug opens no tracker issue on a Step 2 halt
Documented: Yes (CHANGELOG **Behaviour change**)
Migration Path Provided: Yes (key scripts on READY TO FIX)
Migration Tested: N/A
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: create-epic's PRD-link block reads an unbound path**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.200.bug.5.create-epic-prd-link-reads-an-unbound-path.md](./task.200.bug.5.create-epic-prd-link-reads-an-unbound-path.md)
- **Observation**: Cycle 1's resolver call and `:?` guard turn the pre-existing unbound read into an abort.
- **Impact**: An epic created by running the block as written gets no PRD link, and the block fails.
- **Recommendation**: Bind the path in the block; make the test take it from the block.
- **Priority**: P1

### MEDIUM Severity Issues (3)

TASK-200-006 ([BUG-6](./task.200.bug.6.sync-github-story-pin-is-never-bound.md)), TASK-200-007 ([BUG-7](./task.200.bug.7.a-sibling-bug-branch-names-the-wrong-work-item.md)) and TASK-200-008 ([BUG-8](./task.200.bug.8.link-scan-misses-a-reassigned-branch.md)). See New Findings.

### LOW Severity Issues (1)

- CR-5: the Step 2 halt message says no tracker issue was commented on, but review-bug Step 7 comments when the bug already has an issue. Routed to `recommendations.future`.

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
At most one `gh` call per resolution. CR-6 (eager `gitDefaultBranch()` in `resolveDocBranch`) is a cleanup.

### Reliability — FAIL
TASK-200-005 aborts create-epic's PRD-link block, and TASK-200-006 silently drops a pin.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (`totals.executed` of [task.200.qa.2.security.run.json](./task.200.qa.2.security.run.json)); escaped: 0
- Path sink against `doc-link-branch.js#integrationBranchOf`, re-run because this is a new cycle (the file is unchanged since gate 1). The lookup refuses nothing by design: a traversing path reads only a frontmatter field. The branch reaches URLs and `gh` arguments quoted.

### Maintainability — CONCERNS
The link scan can be bypassed (TASK-200-008), and the create-epic execute test injects the binding it should check.

---

## Code Review

Advisory, except where promoted under `code_review_blocking=true` (pipeline override).

**Correctness bugs (5):**
- [high/high] `skills/create-epic/SKILL.md:164`: the PRD-link block reads an unbound `PRD_SOURCE_PATH`. **Promoted → TASK-200-005**
- [medium/high] `skills/sync-github-story/SKILL.md:158`: `${DOC_BRANCH:-}` pin has no writer. **Promoted → TASK-200-006**
- [medium/high] `shared/resources/doc-link-branch.js:80`: a sibling bug's branch names the wrong work item (reproduced). **Promoted → TASK-200-007**
- [medium/medium] `shared/resources/doc-link-branch.js:230`: the GitHub CLI has no configured step, so on a repo whose default is `main`, a card created on `develop` links to `main`. Not promoted (medium confidence); routed to `recommendations.future`. This repository's default is `develop`.
- [low/high] `skills/develop-bug/references/develop-bug-step-2-review.md:67`: the halt message can be false when review-bug comments. Not promoted (low).

**Cleanups (1):**
- `shared/resources/jira-sync.js:468`: `gitDefaultBranch()` is computed eagerly on every `docPath` call; fall back lazily.

**Provenance (Step 5b):** CR-2's unbound `${DOC_BRANCH:-…}` reads the same on `origin/develop` (line 158 there). It stays in `top_issues[]` because the task puts this defect class in scope: TASK-200-002 fixed it at the path variable in the same block. CR-1 and CR-3 are introduced by this branch: on `develop`, create-epic had no resolver call or guard, and the work-item match did not exist.

**Boundary (Step 3b.3):** `boundary: true`. `branchNamesWorkItem` is a predicate whose `false` sends a link to the default branch. No corpus sink models an identity rule, so it was probed by hand (CR-3's five must-match/must-differ pairs above); by-hand probes do not count toward `probes_executed`. `integrationBranchOf` (a filesystem path input) was probed with the engine: `probes_executed: 11`, `escaped: 0`.

**Mutation proofs (Step 3c),** run in a scratch worktree at `fe0121c0` after the reviewer returned, with a green baseline (39/39) before and after:
- mutation-proven: guard apostrophe restored in `ensure-task-github-issue` → `doc-link-branch-sites-execute` "every GitHub site…" → covered
- mutation-proven: `EPIC_RELATIVE_PATH=` binding deleted in `ensure-epic-github-issue` → same test → covered
- mutation-proven: create-epic GitHub arm reverted to `git rev-parse --abbrev-ref HEAD` → `create-epic's PRD link-branch lines…` → covered (the link scan did not go red: TASK-200-008)
- mutation-proven: `DOC_BRANCH=$(git branch --show-current)` inserted before `DOC_URL=` in `sync-github-task` → nothing red → no-red-untested (TASK-200-008)
- mutation-proven: "and the halt comes after Step 2b" removed from develop-bug → `the terminal-HALT blocked signal excludes the Step 2 halts` → covered

4 of 5 covered.

---

## Step 4b: Documented Commands

`qa-execute-snippets.mjs --diff-base $(git merge-base origin/develop HEAD) --copy-as skills:.agents/skills`, bash only (`zsh-unavailable` on this host):

| File | Changed blocks | Executed | Refusal |
| --- | --- | --- | --- |
| `skills/create-epic/SKILL.md` | 1 | 0 | mutating — helper `resolve-platform.sh` (deny-list `gh issue`) |
| `skills/develop-bug/SKILL.md` | 1 | 0 | mutating — `rm -rf` (the Step 2b lock write) |
| `skills/sync-github-task/SKILL.md` | 1 | 0 | mutating — `gh issue` |
| `skills/ensure-epic-github-issue/SKILL.md` | 1 | 0 | mutating — unrecognised `gh`, `awk`, `node` |

Every changed block was refused as mutating (`changed-blocks-not-executed`, medium). Each refused block's link-branch lines are run by a committed test instead: `doc-link-branch-sites-execute.test.js`, and `develop-bug.test.js` for the lock write. One unchanged block, `sync-github-task:52` (`find docs/tasks`), failed only when `docs` was not seeded. Re-run with `--copy-as docs:docs` it passes: a harness finding (obs #143), not a prose finding.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full `ci:fast` suite (6060 tests) | PASS |
| sync-jira-* suites (resolveDocBranch delegation) | PASS (in the suite) |
| develop-bug suite (30) | PASS |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                       # .agents/skills moved aside; attempt 2: 6060 tests, 0 fail
npm run -s validate -- skills/<s>/    # 11 changed skills, all exit 0
command node --test tests/doc-link-branch-sites-execute.test.js tests/doc-link-branch-population.test.js skills/develop-bug/tests/
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/doc-link-branch.js#integrationBranchOf' --record task.200.qa.2.security.run.json --json
"$NODE" .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <f> --diff-base <mb> --copy-as skills:.agents/skills --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-200-005 (P1), then TASK-200-006, 007 and 008 (P2).

### Short-term Actions (Non-Blocking)
1. CR-4: a configured link-branch step for the GitHub CLI.
2. CR-5: a conditional halt message.
3. CR-6: lazy `gitDefaultBranch()`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH (TASK-200-005) and three MEDIUMs, two of them in cycle 1's own fix and its test.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.200.qa.2.tracker-side-effects-after-their-gate.md`
**Gate File**: co-located at `task.200.gate.2.tracker-side-effects-after-their-gate.yml`
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3 (scoped to files changed since `fe0121c0`).
