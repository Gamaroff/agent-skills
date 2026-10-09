---
id: task.200
title: "Tracker side effects after their gate"
type: task
description: "develop-bug creates its tracker issue and signals work started only after review-bug says READY TO FIX, and every tracker document link uses the current branch only when that branch is the document's own work item."
tags: [develop-bug, ensure-github-issue, sync-github, jira-sync, tracker, observation]
category: refactoring
status: ready-for-development
priority: Medium
created: 2026-10-09
updated: 2026-10-09
assignee:
estimated_effort_hours: 16
github_issue: 616
---

# Technical Task: Tracker side effects after their gate

**Status:** Ready for Development
**Review**: ✅ All review recommendations from `task.200.review.1.tracker-side-effects-after-their-gate.md` implemented 2026-10-09
**GitHub Issue**: [#616](https://github.com/Gamaroff/agent-skills/issues/616)

---

## 1. Overview

Two tracker writes happen at the wrong moment or from the wrong input. `develop-bug` creates a public
tracker issue, moves its card and signals work started **before** `review-bug` decides whether the bug
should be fixed at all (obs #220). Every tracker card's document link is built from the current branch's
upstream, even when HEAD is a branch for an unrelated work item (obs #287). Both are fixed by putting the
side effect behind the fact that justifies it: the gate verdict, and the document's own identity.

**Scope**: `develop-bug`'s step order and what a halt leaves; one shared resolver for the document-link
branch, called from the four `ensure-*-github-issue` skills, the four `sync-github-*` skills and
`jira-sync.js`; `create-bug-report`'s guidance for a population grep.

**Key deliverables**:

1. `develop-bug`: a STALE, DUPLICATE or NEEDS DETAIL verdict leaves nothing outside the local
   checkout: no tracker issue, no card move, no `work-started` comment and no pushed branch. The local
   bug branch keeps `review-bug`'s report, the evidence for the verdict, and the HALT names it.
2. `shared/resources/doc-link-branch.js`: one resolver for the document-link branch, with every
   current derivation site migrated to it and a population test that refuses a new one.
3. `create-bug-report`: a population grep must match the defective branch only.

---

## 2. Motivation

### Current Problems

1. **A gate placed after the side effects it should prevent** (obs #220). On 2026-09-29, `/develop-next`
   dispatched bug.16. `develop-bug` Step 1 created GitHub issue #522, moved its card to in-progress and
   pushed a branch. Step 2 (`review-bug`) then returned STALE: the defect had been fixed on `develop` in
   `39e595f9` on 2026-09-24. The run left an open, in-progress issue for work that will never happen, and
   a branch holding only paperwork.
2. **Step 1 says so on purpose.** `skills/develop-bug/SKILL.md:197` *("Ensure a tracker issue (runs before
   the lock is written …)")* places the issue ahead of the lock so the lock records a real issue. That
   reason survives the move: the lock can be written in Step 1 without the field and updated once the
   issue exists.
3. **A document link derived from ambient state** (obs #287, carrier for #188). Every GitHub
   derivation is the same line: `DOC_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} … )`
   (`skills/ensure-task-github-issue/SKILL.md:104`, and 7 more below). When a work item is created while
   HEAD is another work item's feature branch, the card links to a branch that never carries the
   document, and the link 404s once that branch is deleted. `/finalise` re-pins the link at acceptance,
   so only items that never run a pipeline keep the bad link.
4. **Two copies of the rule already disagree.** The Jira side resolves explicit → `jira.docBranch` config
   → upstream → git default (`shared/resources/jira-sync.js:453`, `resolveDocBranch`). The GitHub side is
   explicit (sync-github-story only) → upstream → `gh` default. Eight bash copies of one line are eight
   places to fix.
5. **A population grep matched the fallback, not the defect** (obs #220). bug.16's grep
   (`resolve(process.argv\[1\]) === fileURLToPath`) matched the `catch` fallback line of five files whose
   primary branch already used `realpathSync`. Five of the six listed files were correct when filed.

### Benefits

1. A bug that is already fixed costs one review, not an issue to close, a card to move back and a pushed
   branch to delete.
2. A card's document link survives the deletion of whatever branch HEAD happened to be on.
3. One resolver, tested once, instead of nine derivations.
4. Bug reports enumerate the defective sites, so review-bug's stale scan reads the right population.

---

## 3. Technical Background

### Current Architecture

**develop-bug step order** (`skills/develop-bug/SKILL.md`, `### Step 1: Create Branch` at :189,
`### Step 2: Review Bug` at :207):

```
Step 1  create-branch → ensure-bug-{github,jira}-issue → lock (tracker_issue) → Signal Work Started
Step 2  review-bug (validate-and-apply) → READY TO FIX | NEEDS DETAIL | DUPLICATE | STALE (HALT)
```

The HALT table (`skills/develop-bug/SKILL.md:290-293`) halts on the three non-ready verdicts and does
nothing about Step 1's side effects. `review-bug` Step 7 posts its outcome comment only when the bug
already has `github_issue`/`jira_key` (`skills/review-bug/SKILL.md:162`).

**Document-link branch derivation**, measured with
`git grep -n '@{u}' -- 'skills/*/SKILL.md' 'shared/resources/*.js' | grep -v /references/`:

| Site | Derivation |
| --- | --- |
| `skills/ensure-task-github-issue/SKILL.md:104` | `@{u}` → `gh` default branch |
| `skills/ensure-story-github-issue/SKILL.md:81` | same |
| `skills/ensure-epic-github-issue/SKILL.md:58` | same |
| `skills/ensure-bug-github-issue/SKILL.md:90` | same |
| `skills/sync-github-task/SKILL.md:111` | same |
| `skills/sync-github-story/SKILL.md:146` | explicit `DOC_BRANCH` → `@{u}` → `gh` default |
| `skills/sync-github-epic/SKILL.md:138` | `@{u}` → `gh` default |
| `skills/sync-github-bug/SKILL.md:110` | same |
| `shared/resources/jira-sync.js:453` `resolveDocBranch` | explicit → `jira.docBranch` → `getCurrentBranchUpstream()` (:477) → git default |

`resolveDocBranch` is called by all four `sync-jira-{epic,story,task,bug}` scripts
(`lib.resolveDocBranch(args.docBranch)`, e.g. `skills/sync-jira-task/scripts/sync-jira-task.js:543`);
`getCurrentBranchUpstream` is re-exported by `sync-jira-{epic,story,task}`. `develop-pipeline-step-1-create-branch.md:77` also reads `@{u}`, but to
check tracking, not to build a link, and stays out of scope.

### Target Architecture

```
develop-bug
Step 1   create-branch (no push) → lock (tracker_issue: "")            ← no tracker write, no push
Step 2   review-bug → READY TO FIX ─┐
                     other verdict ─┴→ HALT naming the local branch and its review report
Step 2b  ensure-bug-{github,jira}-issue → lock {tracker_issue, tracker_step: "opened"} → Signal Work Started
```

```js
// shared/resources/doc-link-branch.js — pure resolver + CLI
resolveDocLinkBranch({ explicit, configured, upstream, defaultBranch, docPath })
//  explicit → configured → upstream IF branchNamesWorkItem(upstream, docPath) → defaultBranch
workItemOf(docPath)          // task.N | story.E.S | epic.N | story.E.S.bug.N | task.N.bug.N | bug.N
branchNamesWorkItem(branch, docPath)
// true when the branch's last segment starts with the document's id OR its parent's id
// (task.N for task.N.bug.M, story.E.S for story.E.S.bug.M), followed by ".", "-" or the end;
// a story also matches its epic's integration branch; hotfix/v* matches a bug document only.
// Real shapes it must accept: bugfix/bug.17.<name>, bugfix/task.144-<name>, hotfix/v1.2.1,
// feature/task.N.<name> for a QA bug of task.N.
```

The GitHub sites replace their two derivation lines with one call:
`DOC_BRANCH=$(command node .agents/skills/<skill>/references/doc-link-branch.js --doc "<path>" [--explicit "$DOC_BRANCH"])`.
`resolveDocBranch` keeps its signature and delegates the upstream decision to the same function.

### Important Clarifications

- **GitHub does not gain the `jira.docBranch` setting here.** Unifying the config key across trackers
  changes GitHub behaviour for repos that set it for Jira only. That is a separate decision.
- **Re-runs are unaffected.** `ensure-*` sub-routines dedup by existing frontmatter and title search, so
  moving the call to Step 2b changes when it runs, not what it creates.
- **Resume states the Step 2b rule must hold in** (review I4). The lock gains `tracker_step: "opened"`,
  written by Step 2b in the same jq write as `tracker_issue`. A resume runs 2b only when the field is
  absent:
  1. Halted before the Step 2 verdict: no `tracker_step` → Step 2 re-runs, then 2b.
  2. READY TO FIX, 2b not run: no `tracker_step` → 2b runs.
  3. 2b created the issue but the lock write did not land: 2b runs again; the `ensure-*` dedup finds the
     issue through the `github_issue`/`jira_key` frontmatter it already wrote.
  4. 2b ran and returned no issue (deferred or failed create): `tracker_step: "opened"` with an empty
     `tracker_issue` → 2b is not re-run; the handover checklist carries the create, as today.
  5. A lock written before this change (issue set in Step 1): `tracker_issue` set, no `tracker_step` →
     treated as opened, 2b skipped.
  6. A PreCompact pause between Step 2 and 2b: `develop-pipeline-on-precompact.sh:156` reads an empty
     `tracker_issue` and posts no pause comment; the resume then runs 2b (state 2).
- **The parent link follows the bug's branch** (review O1). `ensure-bug-github-issue` and
  `sync-github-bug` build `PARENT_DOC_URL` from the same `BASE` as `DOC_URL`
  (`skills/ensure-bug-github-issue/SKILL.md:91-93`). `BASE` stays; only its branch input changes.
- **No catalog regeneration** (review O2). No `description:` frontmatter changes, so
  `npm run generate-catalog` is not needed.

---

## 4. Scope

### In Scope

✅ `develop-bug` Step 1/2 reorder, the new Step 2b, the HALT table, the lock's `tracker_issue` and
`tracker_step` fields, and the resume contract's six states (Clarifications).
✅ A halt that leaves a local branch only: Step 1 declines `create-branch`'s optional push, and the HALT
message names the branch and its `review-bug` report. Nothing is deleted (review I6, operator decision).
✅ `shared/resources/doc-link-branch.js` with unit tests; migration of the 9 sites above; a population
test that fails on a new upstream-derived document link anywhere in the skill sources.
✅ `create-bug-report`: the population-grep rule.

### Out of Scope

❌ `develop-story` / `develop-task` step order. Their Step 1 also precedes review, but a story or task is
rarely already done. A filed bug often is.
❌ Making GitHub read `jira.docBranch` (see Clarifications).
❌ Re-pinning existing cards that already carry a bad link. `/finalise` re-pins on acceptance.
❌ Deleting a halted bug branch. It holds the verdict's evidence; the operator keeps or deletes it.

---

## 5. Breaking Changes

None to any CLI or file format. Behaviour changes a consumer can observe:

1. **`develop-bug` posts no tracker comment for a bug it halts on.** A run that used to leave an issue
   for a STALE bug now leaves none. Consumers scripting against "every develop-bug run has an issue"
   should key on the READY TO FIX verdict instead.
2. **A card created from an unrelated branch links to the default branch.** Before: the unrelated
   branch. After: the default branch (or the explicit/configured branch, as today).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.200.plan.tracker-side-effects-after-their-gate.md](task.200.plan.tracker-side-effects-after-their-gate.md)

### Phase 1: The resolver (primitive)

**Risk**: Low

- [ ] `shared/resources/doc-link-branch.js`: `workItemOf`, `branchNamesWorkItem`, `resolveDocLinkBranch`, CLI
- [ ] `shared/resources/tests/doc-link-branch.test.mjs`: every work-item kind, an unrelated branch, an epic
      integration branch for a story, a QA bug on its parent task's branch, `bugfix/task.144-<name>`,
      `hotfix/v1.2.1` for a bug and for a task, detached HEAD, explicit and configured precedence

### Phase 2: Migrate the link sites

**Risk**: Medium. Depends on Phase 1.

- [ ] The 8 GitHub `SKILL.md` sites call the CLI
- [ ] `jira-sync.js` `resolveDocBranch` gains a `docPath` argument and delegates the upstream decision;
      the 4 `sync-jira-*` callers pass the document path
- [ ] Population test, keyed on the derivation not the variable: no `rev-parse` of `@{u}` or `@{upstream}`
      in `skills/*/SKILL.md` or `shared/resources/*.{js,sh,md}` outside `doc-link-branch.js`, with
      `develop-pipeline-step-1-create-branch.md:77` (a tracking check, not a link) the one allowlisted site;
      non-vacuity floor of 8 CLI call sites (review I3)
- [ ] Add a `docPath` case beside the pinned `resolveDocBranch` tests, which stay green unchanged
      (review I2: `git grep -n 'resolveDocBranch\|getCurrentBranchUpstream' -- '*.test.*'`)
- [ ] `npm run bundle`

### Phase 3: develop-bug gate order

**Risk**: Medium. Independent of Phases 1–2.

- [ ] Move "Ensure a tracker issue" and "Signal Work Started" from Step 1 to a new Step 2b after READY TO FIX
- [ ] Step 1 declines `create-branch`'s optional push and writes the lock with `tracker_issue: ""`
- [ ] Step 2b writes `tracker_issue` and `tracker_step: "opened"` in one jq write (mktemp + mv)
- [ ] HALT table: on NEEDS DETAIL / DUPLICATE / STALE, the message names the local branch and its review report
- [ ] Resume contract: a `develop-bug` lock with no `tracker_step` and no `tracker_issue` re-enters at 2b
      after a READY TO FIX verdict; the six states in Clarifications

### Phase 4: create-bug-report grep rule

**Risk**: Low. Independent.

- [ ] A population grep matches the defective primary branch only, and the report records it beside the list

### Phase 5: Close-out

- [ ] CHANGELOG `[Unreleased]`, `docs/reference/configuration.md` § Document link branch

---

## 7. Files Summary

### Core Implementation

1. ➕ `shared/resources/doc-link-branch.js`
2. ✅ `shared/resources/jira-sync.js` (`resolveDocBranch`, `getCurrentBranchUpstream`)
3. ✅ `skills/sync-jira-{epic,story,task,bug}/scripts/sync-jira-*.js` (pass the document path)
4. ✅ `skills/ensure-{task,story,epic,bug}-github-issue/SKILL.md`
5. ✅ `skills/sync-github-{task,story,epic,bug}/SKILL.md`
6. ✅ `skills/develop-bug/SKILL.md` (Step 1, Step 2b, HALT table)
7. ✅ `skills/develop-bug/references/develop-bug-step-2-review.md` (skill-local, not bundled)
8. ✅ `shared/resources/develop-pipeline-resume-contract.md` (develop-bug Step 2b re-entry)
9. ✅ `skills/create-bug-report/SKILL.md`

### Tests

10. ➕ `shared/resources/tests/doc-link-branch.test.mjs`
11. ➕ a population test for `@{u}` link derivation (`tests/` or `evals/shared/tests/`)
12. ✅ `skills/sync-jira-task/tests/sync-jira-task.test.js:2023-2055` and the `resolveDocBranch` tests in
    the `sync-jira-epic` and `sync-jira-story` suites (pinned; stay green, gain a `docPath` case)
13. ✅ `skills/develop-bug/tests/develop-bug.test.js` for the step order and the halt message

### Documentation

14. ✅ `CHANGELOG.md`
15. ✅ `docs/reference/configuration.md` § Document link branch
16. ✅ generated `skills/*/references/` copies (via `npm run bundle`)

---

## 8. Testing Strategy

### Unit Tests

- `resolveDocLinkBranch` over a table: each work-item kind on its own branch (upstream used), on an
  unrelated branch (default used), a story on its epic's integration branch (upstream used), no upstream,
  explicit beats everything, configured beats upstream.
- CLI: prints the branch, exit 2 on a missing `--doc`.
- **Control case** (obs #176): a branch whose name contains the id as a substring of a different id
  (`task.20` vs `task.200`) must not match.

### Integration Tests

- Population test over the skill sources: zero upstream-derived document links outside the resolver and
  the one allowlisted tracking check; at least 8 CLI call sites. Control: a restatement with
  `@{upstream}` and a different variable name must be caught.
- `develop-bug`: the step-order test reads Step 1 and asserts no `ensure-bug-*` invocation, no Signal Work
  Started and no push precede the Step 2 verdict, and that Step 2b is the only `ensure-bug-*` invocation.
- CLI with a stubbed `gh`: one `gh repo view` call without `--default`, none with it.

### Consumer Tests

- `sync-jira-*` existing suites stay green with the new `docPath` argument.

---

## 9. Success Criteria

### Functional

- [ ] `develop-bug/SKILL.md` Step 1 contains no `ensure-bug-*` invocation, no Signal Work Started and no push,
      and Step 2b, after READY TO FIX, is the only `ensure-bug-*` invocation (step-order test in
      `skills/develop-bug/tests/develop-bug.test.js`)
- [ ] The HALT rows for NEEDS DETAIL, DUPLICATE and STALE name the local branch and its review report, and
      none deletes a branch (same test)
- [ ] Step 2b writes `tracker_issue` and `tracker_step` in one write, and the resume contract states the six
      states (resume-contract test beside the existing develop-bug resume tests)
- [ ] A card created on an unrelated branch links to the default branch; on its own branch, its parent's
      branch, or (bug only) a hotfix branch, to that branch (`doc-link-branch.test.mjs`)
- [ ] `task.20` on branch `feature/task.200.x` does not match (same test)

### Performance

- [ ] The resolver makes at most the one `gh repo view` call each site makes today, and none with `--default`
      (CLI test with a stubbed `gh`)

### Code Quality

- [ ] `npm test` green with `.agents/skills` moved aside; `npm run bundle:check` and `npm run format:check` clean
- [ ] Each new test mutation-proved (revert the behaviour, the test goes red)
- [ ] `npm run validate -- skills/<skill>/` for every changed `SKILL.md`

### Migration

- [ ] CHANGELOG `[Unreleased]` entry
- [ ] `configuration.md` § Document link branch states the work-item rule

---

## 10. Risk Assessment

### High Risk Areas

1. **A READY TO FIX run that opens no issue**
   - Risk: moving the writes leaves a path where Step 2b never runs (resume, or a halt-then-continue)
   - Probability: Low. Impact: High (the card never reaches the board)
   - Mitigation: `tracker_step` and the six resume states; the step-order test pins 2b after READY TO FIX
   - Rollback: revert Phase 3 alone; Phases 1–2 are independent

### Medium Risk Areas

1. **Work-item matching too loose or too strict**: an id substring (`task.20` in `task.200`) or an
   unusual branch prefix. Mitigation: match the id or parent id followed by `.`, `-` or end, with the
   real branch shapes and the control case in the unit table.
2. **A halted bug branch left behind**: local only, named in the HALT. The operator deletes it; nothing
   remote needs cleaning.

### Low Risk Areas

1. Bundled copies drifting from source: caught by `bundle:check`.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a READY TO FIX `develop-bug` run creates no issue; a card links to a branch that does not exist.
- **Steps**: revert the merge commit; `npm run bundle`; `npm test`.

### Partial Rollback (1-2 hours)

- Phases 1–2 and Phase 3 are independent: revert only the phase whose trigger fired.

### Forward Fix

- A matching-rule miss for one branch naming convention is fixed in `branchNamesWorkItem` with a new table row.

### Rollback Triggers

- **Critical**: a READY TO FIX run with no issue; a halted run that pushed a branch or posted a comment.
- **Non-critical**: a link pointing at the default branch where the work branch would have been right.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                      | Author      |
| ---------- | ------- | ------------------------------------------------ | ----------- |
| 2026-10-09 | 1.0     | Initial draft — cut from observations #220, #287 | create-task |
| 2026-10-09 | 1.1 | Review 7/10, six Important fixes applied: id-or-parent branch match, halt keeps a local branch, tracker_step and six resume states, structural criteria, derivation-keyed population test, pinned tests listed | review-task |
| 2026-10-09 |  | Status → ready-for-development | review-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The resolver

- [ ] Complete

### Phase 2: Migrate the link sites

- [ ] Complete

### Phase 3: develop-bug gate order

- [ ] Complete

### Phase 4: create-bug-report grep rule

- [ ] Complete

### Phase 5: Close-out

- [ ] Complete

---

## References

- Observation #220 — develop-bug creates the tracker issue and branch before review-bug can find the bug STALE
- Observation #287 — Tracker doc links derive from @{u} even when HEAD is an unrelated branch (carrier for #188)

---

## Notes

- QA report: `task.200.qa.{n}.tracker-side-effects-after-their-gate.md`
- Quality gate: `task.200.gate.{n}.tracker-side-effects-after-their-gate.yml` (co-located)
- One task by operator decision (2026-10-09). Phases 1–2 and Phase 3 are independently shippable; they
  share the theme "a tracker write gated on the fact that justifies it", and either half can be reverted
  alone (§ 11).
