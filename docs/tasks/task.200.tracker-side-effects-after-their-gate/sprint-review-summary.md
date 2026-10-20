# Sprint Review Summary - Tracker side effects after their gate

**Story/Task ID:** task.200
**Epic:** n/a (standalone technical task)
**Completed Date:** 2026-10-20
**Completed By:** Lorien Gamaroff (pipeline: `/develop-next` → `/develop-task`)
**Pull Request:** [#711](https://github.com/Gamaroff/agent-skills/pull/711)

---

## Summary

`develop-bug` now creates the bug's tracker issue, and signals that work has started, only after `review-bug` says READY TO FIX. Every tracker document link now uses the current branch only when that branch names the document's own work item, and otherwise uses the default branch.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] develop-bug Step 1 makes no tracker write and no push. Step 2b, after the review gate, is the only place `ensure-bug-*` runs.
- [x] The NEEDS DETAIL, DUPLICATE and STALE halts name the local branch and the review report, and delete nothing.
- [x] Step 2b writes `tracker_issue` and `tracker_step` in one write. The resume contract states all six states.
- [x] An unrelated branch links to the default branch. The work item's own branch, its parent's branch, a story's integration branch (under the configured `branchPattern` prefix) and a bug's `hotfix/v<digit>` branch link to that branch.
- [x] `task.20` never matches `feature/task.200.x`.
- [x] The resolver makes at most one `gh repo view` call, and none when `--default` is given.
- [x] CI is green without the local `.agents/skills` symlink. `bundle:check`, `format:check` and `validate` are clean.
- [x] Each behaviour is mutation-proved. The residue (tests without a mutant of their own) is named in the DoD log.
- [x] CHANGELOG `[Unreleased]` entry, and `docs/reference/configuration.md` § Document link branch.

### Key Features Implemented

- **`doc-link-branch.js`**: one resolver for the document-link branch, used by 8 GitHub `ensure-*`/`sync-github-*` sites, `create-epic` and `jira-sync.js`. It replaces per-site copies of the rule.
- **develop-bug Step 2b**: the tracker issue, the work-started signal and the first push move after the review gate. A halt at Step 2 leaves no tracker trace.
- **create-bug-report grep rule**: a sibling-bug check before a new bug is filed.

---

## Technical Details

### Files Modified/Created

- `shared/resources/doc-link-branch.js` — the resolver and CLI (new)
- `shared/resources/jira-sync.js` — delegates the branch decision to the resolver
- `skills/develop-bug/SKILL.md` and its step docs — Step 1 / Step 2b split, halt rows
- `shared/resources/develop-pipeline-resume-contract.md` — § develop-bug Step 2b re-entry
- 8 `ensure-*`/`sync-github-*` SKILL.md files, plus `create-epic` and `create-bug-report`
- Tests: `shared/resources/tests/doc-link-branch.test.mjs`, `tests/doc-link-branch-population.test.js`, `tests/doc-link-branch-sites-execute.test.js`, and new cases in the `develop-bug` and `sync-jira-task` suites

### Architecture/Design Decisions

One resolver, re-exported to every site through the bundler, so the "which branch does this document live on" rule has one definition and a population test that fails on a restatement. DoD 1 found the rule too broad. Commit 655ce648 narrowed it: the story integration fallback reads `branching.epicIntegration.branchPattern`, and the bug hotfix rule requires a version.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** Behaviour narrows only. A card created from an unrelated branch, such as a release branch or a non-version hotfix branch, now links to the default branch.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** `doc-link-branch.test.mjs` (54 tests) plus three suites with new cases. The full fast gate passed 6079 tests with 0 failures.
- **Integration Tests:** `doc-link-branch-sites-execute.test.js` runs every site's link lines in an isolated install
- **Test Coverage:** every predicate direction, both in the TABLE and in security probes

### Code Review

- **Reviewers:** QA cycles 1–4 (adversarial code reviewer each cycle), and the 5c PR conformance review
- **Approval Status:** ✅ 5c APPROVE (single-maintainer repository; no host review required)
- **Review Comments Addressed:** 8 QA findings fixed (bugs 1–8 closed). Remaining advisories are in gate 4's `recommendations.future`.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Boundary probed: `branchNamesWorkItem`, 100 cases across the source and 4 bundled copies, plus a configured prefix. 0 reproduced, 0 escaped.
- [x] No secrets; process calls use `execFileSync` with argv arrays
- [x] No dependency changes

### Compliance Review

NOT_APPLICABLE. This is an internal skill library change with no personal, payment, UI or health data.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]` — four task 200 entries
- `docs/reference/configuration.md` § Document link branch — the work-item rule

### Documentation Links

- DoD log: `task.200.dod.2.tracker-side-effects-after-their-gate.md`
- Final gate: `task.200.gate.4.tracker-side-effects-after-their-gate.yml`

---

## Demo Notes

### How to Verify

- `command node shared/resources/doc-link-branch.js --doc <story-doc>` on an unrelated branch prints the default branch. On the story's own branch, or `epic/{P}.{E}…`, it prints that branch.
- Run `/develop-bug` on a bug that review-bug halts: no issue is created and nothing is pushed.

### Screenshots/Visuals

n/a

---

## Impact & Value

### User Impact

Tracker cards no longer point at a branch that has nothing to do with the work, and a rejected bug review no longer leaves an orphan issue behind.

### Technical Impact

The branch rule went from per-site copies to one tested definition, held by a population test.

---

## Known Limitations & Future Work

### Current Limitations

- The integration fallback only recognises `branchPattern` values that put `{p}.{n}` in one segment after a literal prefix (CR-1; the same before this change).
- An empty `branchPattern` turns the fallback off (CR-2).

### Suggested Follow-Up Stories

- Gate 4 `recommendations.future`: match the whole configured pattern (CR-1), treat an empty pattern as unset (CR-2), add an `hfix/1.4.ui` TABLE row (Q2).
