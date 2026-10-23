# QA Report: Task 200 - Tracker side effects after their gate

**Task**: [Link to task document](./task.200.tracker-side-effects-after-their-gate.md)
**Gate File**: [task.200.gate.1.tracker-side-effects-after-their-gate.yml](./task.200.gate.1.tracker-side-effects-after-their-gate.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: FAIL

---

## Executive Summary

All five phases are implemented, and the suite passes 6054/0. The new resolver is well tested
against its own branch-name table. The prose that calls it is not: bash cannot parse the guard line
added to all eight GitHub sites, so every ensure/sync link block fails before it runs. Nothing in the
suite executes those lines. Three MEDIUM findings concern binding, a halt message's accuracy, and
one site the population test cannot see.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (30/30 boxes)
- [x] Tests passing (`npm run ci:fast`, 6054/0, `.agents/skills` moved aside)
- [x] Breaking changes documented (§ 5)
- [x] Code on feature branch with open PR (#711, OPEN)

### Testing Approach

- [x] Automated Testing (the full suite plus the three new test files)
- [x] Regression Testing
- [x] Security Review (probe engine)
- [x] Code Review (Step 3b, independent Explore subagent)
- [x] Manual Testing: the eight migrated site lines executed verbatim (Step 4b supplement)

### Review Methodology

This is the first review, with direct tools plus one dispatched diff reviewer. The task has five
phases over several modules (develop-bug, eight ensure/sync skills, jira-sync, create-bug-report),
so this is the Adaptive Strategy's "default". The reviewer was dispatched at 18:33Z and returned with
`duration_ms` 200146 (3.3 minutes), inside the 10-minute budget. The diff excluded the generated
`skills/*/references/*` copies, which are byte copies of the `shared/resources/` sources it reviewed:
29 files, 2350 patch lines.

Step 4b ran over all 11 changed runnable-prose files; see Code Review. zsh is not installed on this
host, so every execution ran under bash only.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: resolver + CLI | PASS | Verified | 37 cases incl. the `task.20`/`task.200` control and a real git fixture with a call-counting `gh` stub |
| Phase 2: GitHub sites + jira-sync | FAIL | Not executed by any test | All 8 sites fail to parse (TASK-200-001); 3 sync sites read an unbound path (TASK-200-002) |
| Phase 3: develop-bug Step 2b | CONCERNS | Verified | Order, lock write and probe are executed in tests; one halt claim is false on a Jira path (TASK-200-003) |
| Phase 4: create-bug-report grep rule | PASS | Verified | Prose only |
| Phase 5: docs + bundle | PASS | Verified | `bundle:check` clean; CHANGELOG and configuration.md updated |

**Overall Phase Completion**: 3/5 phases passed.

---

## Success Criteria Verification

| Criterion (§ 9) | Evidence | Status |
| --- | --- | --- |
| develop-bug Step 1 contains no ensure, no signal, no push | `develop-bug.test.js` (task.200 test 1) | PASS |
| HALT rows name the local branch and report, delete nothing | `develop-bug.test.js` test 3 | CONCERNS (TASK-200-003: "nothing posted" can be false) |
| Step 2b writes both fields in one write; the six resume states | tests 4 and 5 execute the block and the probe against fixture locks | PASS |
| A card on an unrelated branch links to the default branch | `doc-link-branch.test.mjs` resolver table, plus the `sync-jira-task` docPath case | PASS for the resolver; FAIL at the 8 GitHub sites, which do not parse (TASK-200-001); create-epic unmigrated (TASK-200-004) |
| `task.20` on `feature/task.200.x` does not match | `doc-link-branch.test.mjs` branch table | PASS |
| At most one `gh repo view`, none with `--default` | CLI test with a call-counting `gh` stub | PASS |
| `npm test` green with `.agents/skills` moved aside; bundle and format clean | Step 3 log `test-output-2-*`: 6054/0; `bundle:check` 0 problems | PASS |
| Each new test mutation-proved | Step 3 record, 7/7 | PASS for those 7. No test covers the site lines, so none could be mutation-proved |
| `npm run validate` for every changed SKILL.md | 10/10 ok | PASS |
| CHANGELOG entry; configuration.md states the work-item rule | read | PASS |

---

## Breaking Changes Validation

### Breaking Change: a card on an unrelated branch links to the default branch

Documented: Yes (task § 5, PR body, CHANGELOG `### Changed`)
Migration Path Provided: Yes (explicit `--doc-branch` or a configured `docBranch` still wins)
Migration Tested: Yes, for the resolver. No, for the GitHub sites (TASK-200-001)
Consumer Code Updated: Yes (8 GitHub sites, 4 sync-jira scripts)

### Breaking Change: develop-bug no longer pushes or opens an issue before READY TO FIX

Documented: Yes
Migration Path Provided: Yes (resume contract § develop-bug Step 2b re-entry, state 5 covers pre-task.200 locks)
Migration Tested: Yes (the probe executed against all six states)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment**: CONCERNS. The documentation is complete, but the GitHub
half of the first change does not run.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The resolver guard line does not parse in any of the eight GitHub sites**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.200.bug.1.guard-message-apostrophe-breaks-site-parse.md](./task.200.bug.1.guard-message-apostrophe-breaks-site-parse.md)
- **Observation**: Each site's two lines, copied verbatim and run under bash, exit 2 with
  "unexpected EOF while looking for matching `''". The apostrophe in `skill's` inside the
  double-quoted `${DOC_BRANCH:?…}` opens a quote. `bash -n` on the three-line reproduction exits 2
  as well.
- **Impact**: Every GitHub issue create and sync that runs these blocks fails.
- **Recommendation**: Drop the apostrophe, and add a committed test that executes the site lines.
- **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: Three sync sites pass an unbound relative path** (TASK-200-002) — [bug 2](./task.200.bug.2.sync-sites-read-an-unbound-relative-path.md)

**Issue: A Step 2 halt says nothing was posted, but can post `blocked`** (TASK-200-003) — [bug 3](./task.200.bug.3.step-2-halt-can-still-post-blocked.md)

**Issue: create-epic links the checked-out branch** (TASK-200-004) — [bug 4](./task.200.bug.4.create-epic-links-the-checked-out-branch.md)

### LOW Severity Issues (0)

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 0

---

## NFR Assessment

### Performance — PASS
The resolver calls `gh` at most once, and never when `--default` is given. A test with a counting
stub pins this.

### Reliability — FAIL
TASK-200-001: the GitHub link path errors on every run.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (`totals.executed` of [the run record](./task.200.qa.1.security.run.json)); escaped: 0
- `security-probe.mjs --sink path --entry shared/resources/doc-link-branch.js#integrationBranchOf`.
  The function is a read-only lookup. It refuses nothing by design, and returns `""` when no epic
  directory is found, so the 8 hostile cases score as `accepted`. Each one read at most a frontmatter
  field from the caller's own path, and nothing was written. The branch value reaches URLs and `gh`
  arguments double-quoted. No secrets or tokens were touched.

### Maintainability — CONCERNS
The population test is keyed on one derivation token (`@{u}`), not on link construction
(TASK-200-004). Three blocks read a variable they do not bind (TASK-200-002).

---

## Code Review

Reviewed by an independent Explore subagent over `origin/develop...HEAD`: 29 files, 2350 patch lines,
generated copies excluded. `code_review_blocking=true` (run-level override, and no frontmatter opt-out).

**Correctness bugs (3):**
- [medium/high] `skills/sync-github-task/SKILL.md:110` — unbound `${TASK_RELATIVE_PATH}`, and the same at sync-github-bug:111 and sync-github-story:157 → bind it in the block. **Promoted** → TASK-200-002.
- [medium/medium] `skills/develop-bug/SKILL.md:328` — the halt rows' "nothing was pushed or posted" contradicts the terminal-HALT `blocked` signal → exempt Step 2 halts. Verified against `develop-pipeline-step-0-resolve-and-prepare.md` (the Phase 0c `jira_key` read) and SKILL.md:360; raised by QA → TASK-200-003.
- [medium/medium] `skills/create-epic/SKILL.md:168` — the link branch is taken from HEAD, and the population test cannot see it → route it through the resolver. Provenance: identical on `origin/develop`, but the task names this defect class in success criterion 2, so it stays in `top_issues[]` (QA-raised) → TASK-200-004.

**Cleanups (0).**

**QA's own finding (not from the reviewer):** TASK-200-001, the parse failure. It was found by
executing the eight site lines verbatim, which Step 4b's engine does not do for these blocks.

**Anchors:** `finding-anchors.js --rev HEAD` → `ok`; CR-1, CR-2 and CR-3 all read `anchor_check: ok`.

**Step 4b (runnable prose):** 11 changed files.

| File | Changed blocks | Executed | Note |
| --- | --- | --- | --- |
| `shared/resources/develop-pipeline-resume-contract.md` | 1 | 1 | Failed on the temp copy (no lock: `jq` could not open `.claude/state/develop-pipeline.lock`). This is harness seeding, not a prose defect: the same probe is executed against six fixture locks in `develop-bug.test.js` |
| `skills/create-bug-report/SKILL.md` | 0 | 0 | prose only |
| `skills/develop-bug/SKILL.md` | 1 | 0 | `mutating` (the 2b block calls `git push`). Its lock-write half is executed in `develop-bug.test.js` |
| 8 × ensure/sync `SKILL.md` | 1 each | 0 | `mutating` (`gh`). Executed by QA by hand, verbatim: **8/8 fail to parse** (TASK-200-001) |

An unchanged discovery block at sync-github-task:52 failed on seeding (`find docs/tasks`) and is not
part of this change. `zero-blocks-executed` on sync-github-epic/story comes from placeholder blocks
this change did not touch.

**Boundary:** `boundary: true` for `branchNamesWorkItem`, the classifier whose `false` keeps the
upstream out of the link. Its inputs are branch names, which no corpus sink models, so it is held by
the 30-row table (controls included) rather than the probe. The path-sink probe ran against
`integrationBranchOf`, the function that takes a caller-supplied path: `probes_executed: 11`,
`escaped: 0`.

**Mutation proofs** (from Step 3; every test named is committed):
- mutation-proven: upstream used without the work-item check → doc-link-branch.test.mjs resolver table → covered
- mutation-proven: `.` anchor dropped from segmentNames → branch table `task.200.x` row → covered
- mutation-proven: `-` separator dropped → branch table `task.200-x` row → covered
- mutation-proven: hotfix accepted for any document → branch table hotfix/task row → covered
- mutation-proven: ensure-bug-* back in Step 1 → develop-bug.test.js task.200 test 1 → covered
- mutation-proven: 2b writes tracker_issue without tracker_step → develop-bug.test.js test 4 → covered
- mutation-proven: an `@{u}` derivation reintroduced in a SKILL.md → doc-link-branch-population.test.js → covered
- Not proved: the eight site lines, because no test executes them (TASK-200-001).

---

## Regression Testing

| Area | Result |
| --- | --- |
| sync-jira-{task,story,epic,bug} (`resolveDocBranch` without docPath keeps the old rule) | PASS (pinned tests unchanged) |
| card-preflight isolated install (the new requires) | PASS after the Step 3 fix |
| epic-numbering-retirement path-root rule | PASS |
| GitHub ensure/sync link blocks | FAIL (TASK-200-001) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/doc-link-branch.js`, `shared/resources/jira-sync.js`,
`shared/resources/develop-pipeline-resume-contract.md`, `skills/develop-bug/SKILL.md`, the eight
ensure/sync `SKILL.md` files, `skills/create-epic/SKILL.md` (provenance), and the three new test files.

### Test Commands Executed
```bash
npm run ci:fast                       # .agents/skills moved aside — 6054 tests, 0 fail
npm run -s bundle:check               # 128 skills, 0 problems
npm run -s validate -- skills/<s>/    # 10 changed skills, all ok
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <f> --diff-base <merge-base> --copy-as skills:.agents/skills --json
node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/doc-link-branch.js#integrationBranchOf' --record task.200.qa.1.security.run.json --json
bash site-<skill>.sh                  # each site's two lines verbatim — 8/8 exit 2 (parse)
bash -n apos.sh                       # three-line reproduction — exit 2
```

### Coverage Report
Not measured (the repository has no coverage tooling for `node --test`).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-200-001: remove the apostrophe from the guard, and add an executing test for the site lines (P1).
2. TASK-200-002: bind the relative path in the three sync update blocks (P2).
3. TASK-200-003: exempt Step 2 halts from `blocked`, or name the signal in the halt message (P2).
4. TASK-200-004: migrate create-epic, or defer it with the criterion narrowed (P2).

### Short-term Actions (Non-Blocking)
1. qa-execute-snippets: run a syntax-only pass (`bash -n`, `zsh -n`) over every changed block,
   mutating ones included. It would have caught TASK-200-001 without executing anything.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH finding (gate rule 1) and Reliability FAIL (rule 3).
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.200.qa.1.tracker-side-effects-after-their-gate.md`
**Gate File**: co-located at `task.200.gate.1.tracker-side-effects-after-their-gate.yml`
**Next Steps**: `/qa-fix` for the four findings, then QA cycle 2 (the refute pass).
