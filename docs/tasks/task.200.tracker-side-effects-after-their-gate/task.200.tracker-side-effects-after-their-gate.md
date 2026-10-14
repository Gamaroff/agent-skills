---
id: task.200
title: "Tracker side effects after their gate"
type: task
description: "develop-bug creates its tracker issue and signals work started only after review-bug says READY TO FIX, and every tracker document link uses the current branch only when that branch is the document's own work item."
tags: [develop-bug, ensure-github-issue, sync-github, jira-sync, tracker, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-10-09
updated: 2026-10-09
assignee:
estimated_effort_hours: 16
github_issue: 616
---

# Technical Task: Tracker side effects after their gate

**Status:** Planned
**GitHub Issue**: [#616](https://github.com/Gamaroff/agent-skills/issues/616)

---

## 1. Overview

Two tracker writes happen at the wrong moment or from the wrong input. `develop-bug` creates a public
tracker issue, moves its card and signals work started **before** `review-bug` decides whether the bug
should be fixed at all (obs #220). Every tracker card's document link is built from the current branch's
upstream, even when HEAD is a branch for an unrelated work item (obs #287). Both are fixed by putting the
side effect behind the fact that justifies it: the gate verdict, and the document's own identity.

**Scope**: `develop-bug`'s step order and halt cleanup; one shared resolver for the document-link
branch, called from the four `ensure-*-github-issue` skills, the four `sync-github-*` skills and
`jira-sync.js`; `create-bug-report`'s guidance for a population grep.

**Key deliverables**:

1. `develop-bug`: a STALE, DUPLICATE or NEEDS DETAIL verdict leaves nothing outside the bug directory:
   no tracker issue, no card move, no `work-started` comment, and no branch holding only paperwork.
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

1. A bug that is already fixed costs one review, not an issue to close, a card to move back and a branch
   to delete.
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
Step 1   create-branch → lock (tracker_issue: "")                     ← no tracker write
Step 2   review-bug → READY TO FIX ─┐
                     other verdict ─┴→ HALT + paperwork-branch cleanup (nothing outside the bug dir)
Step 2b  ensure-bug-{github,jira}-issue → lock.tracker_issue → Signal Work Started
```

```js
// shared/resources/doc-link-branch.js — pure resolver + CLI
resolveDocLinkBranch({ explicit, configured, upstream, defaultBranch, docPath })
//  explicit → configured → upstream IF branchNamesWorkItem(upstream, docPath) → defaultBranch
workItemOf(docPath)          // task.N | story.E.S | epic.N | story.E.S.bug.N | task.N.bug.N | bug.N
branchNamesWorkItem(branch, docPath) // the branch stem carries the work item's id, or (story) its epic's
                                     // integration branch epic/E.<name>
```

The GitHub sites replace their two derivation lines with one call:
`DOC_BRANCH=$(command node .agents/skills/<skill>/references/doc-link-branch.js --doc "<path>" [--explicit "$DOC_BRANCH"])`.
`resolveDocBranch` keeps its signature and delegates the upstream decision to the same function.

### Important Clarifications

- **GitHub does not gain the `jira.docBranch` setting here.** Unifying the config key across trackers
  changes GitHub behaviour for repos that set it for Jira only. That is a separate decision.
- **Re-runs are unaffected.** `ensure-*` sub-routines dedup by existing frontmatter and title search, so
  moving the call to Step 2b changes when it runs, not what it creates.

---

## 4. Scope

### In Scope

✅ `develop-bug` Step 1/2 reorder, the new Step 2b, the HALT table, the lock's `tracker_issue` update and
the resume contract's handling of a lock with an empty `tracker_issue`.
✅ Paperwork-branch cleanup on a non-ready verdict: when the bug branch has no commit beyond its base
other than the bug directory's paperwork, check out the base and delete the branch, locally and on the
remote if it was pushed.
✅ `shared/resources/doc-link-branch.js` with unit tests; migration of the 9 sites above; a population
test that fails on a new `@{u}`-derived `DOC_BRANCH` in a `SKILL.md`.
✅ `create-bug-report`: the population-grep rule.

### Out of Scope

❌ `develop-story` / `develop-task` step order. Their Step 1 also precedes review, but a story or task is
rarely already done. A filed bug often is.
❌ Making GitHub read `jira.docBranch` (see Clarifications).
❌ Re-pinning existing cards that already carry a bad link. `/finalise` re-pins on acceptance.

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
      integration branch for a story, detached HEAD, explicit and configured precedence

### Phase 2: Migrate the link sites

**Risk**: Medium. Depends on Phase 1.

- [ ] The 8 GitHub `SKILL.md` sites call the CLI
- [ ] `jira-sync.js` `resolveDocBranch` gains a `docPath` argument and delegates the upstream decision;
      the 4 `sync-jira-*` callers pass the document path
- [ ] Population test: no `SKILL.md` derives `DOC_BRANCH` from `@{u}`; non-vacuity floor of 8 migrated sites
- [ ] `npm run bundle`

### Phase 3: develop-bug gate order

**Risk**: Medium. Independent of Phases 1–2.

- [ ] Move "Ensure a tracker issue" and "Signal Work Started" from Step 1 to a new Step 2b after READY TO FIX
- [ ] Step 1 writes the lock with `tracker_issue: ""`; Step 2b updates it in the same block that sets `TRACKER_ISSUE`
- [ ] HALT table: on NEEDS DETAIL / DUPLICATE / STALE, run the paperwork-branch cleanup
- [ ] Resume contract: a `develop-bug` resume past Step 2 with an empty `tracker_issue` runs Step 2b first

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
12. ✅ existing `jira-sync` / `sync-jira-*` tests that stub `getCurrentBranchUpstream`
13. ✅ `skills/develop-bug/tests/*` for the step order and HALT cleanup

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

- Population test over tracked `SKILL.md` files: zero `DOC_BRANCH=…@{u}` derivations, 8 CLI call sites.
- `develop-bug`: the step-order test reads Step 1 and asserts no `ensure-bug-*` invocation precedes the
  Step 2 verdict. The HALT cleanup block, executed in a fixture repo: paperwork-only branch → deleted; a
  branch with a code commit → kept, and the halt says why.

### Consumer Tests

- `sync-jira-*` existing suites stay green with the new `docPath` argument.

---

## 9. Success Criteria

### Functional

- [ ] A STALE, DUPLICATE or NEEDS DETAIL `develop-bug` run creates no tracker issue and posts no comment
- [ ] On those verdicts a paperwork-only bug branch is deleted; a branch with other commits is kept and named in the halt
- [ ] A READY TO FIX run creates the issue, writes `tracker_issue` to the lock and signals work started, as today
- [ ] A card created on an unrelated branch links to the default branch; on its own branch, to that branch
- [ ] `task.20` on branch `feature/task.200.x` does not match

### Performance

- [ ] No extra network call on any path (the resolver is local git only)
- [ ] `develop-bug` READY TO FIX path makes the same tracker calls as before

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

1. **Deleting a branch that holds real work**
   - Risk: the cleanup deletes a branch with a commit the operator made
   - Probability: Low. Impact: High
   - Mitigation: delete only when every commit beyond the base touches only the bug directory; otherwise keep it and name it in the halt
   - Rollback: the branch tip is printed before deletion, so `git branch <name> <sha>` restores it

### Medium Risk Areas

1. **Work-item matching too loose or too strict**: an id substring (`task.20` in `task.200`) or an
   unusual branch prefix. Mitigation: match on the id followed by `.` or end of name, with the control
   case above.
2. **Resume of a run halted between Step 2 and Step 2b**: the lock has no issue. Mitigation: the resume
   contract runs Step 2b first when `tracker_issue` is empty.

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

- **Critical**: a branch with non-paperwork commits deleted; a READY TO FIX run with no issue.
- **Non-critical**: a link pointing at the default branch where the work branch would have been right.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                      | Author      |
| ---------- | ------- | ------------------------------------------------ | ----------- |
| 2026-10-09 | 1.0     | Initial draft — cut from observations #220, #287 | create-task |
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
