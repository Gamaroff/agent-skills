# Task Review Report: Task 200 - Tracker side effects after their gate

**Reviewed:** 2026-10-09
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 9 recommendations implemented (6 Important, 3 Optional) — 2026-10-09

---

## Executive Summary

The task is well grounded: every derivation site is measured with its command, and the pre-pass found
nothing implemented yet. Its gaps are in the edges: the branch-matching rule misses three real branch
shapes, the halt cleanup would delete the evidence for the verdict it halts on, and the resume rule
names one reconstruction state of six.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION (all six Important items are fixable in the document; see Step 8.5)

---

## User Decisions & Clarifications

### Question Point 2: Technical & Implementation

**Q1: What counts as "the document's own branch"?** Real bug branches are `bugfix/bug.17.<name>` and
`bugfix/task.144-<name>` (hyphen after the id; `git log --merges --format=%s origin/develop | grep -i bug`),
hotfixes are `hotfix/v1.2.1` (`skills/create-branch/SKILL.md:92`), and a bug filed during QA lives on its
parent task's branch.
- **User Decision**: Id or parent id, any separator.
- **Impact**: `branchNamesWorkItem` matches the document's id or its parent's (task.N for task.N.bug.M,
  story.E.S for story.E.S.bug.M, the epic integration branch for a story), followed by `.`, `-` or the end
  of the segment. `hotfix/v*` matches a bug document only.

### Question Point 3: Completeness & Safety

**Q2: What should a STALE/DUPLICATE halt leave?**
- **User Decision**: Keep the branch, no push.
- **Impact**: The deletion block is dropped. The branch holds `review-bug`'s report, the evidence for the
  verdict. Nothing is pushed or posted before Step 2b, so the branch is local only; the HALT names it and
  its review report.

**Q3: How does a resume tell "Step 2b never ran" from "2b ran and returned no issue"?**
- **User Decision**: Lock field `tracker_step: opened`.
- **Impact**: Step 2b writes `tracker_step` with `tracker_issue` in one jq write. A resume runs 2b only when
  the field is absent, so a deferred or failed create is not re-run on every resume.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 sections present; frontmatter carries `type`, `description`, `tags`; Change Log present.
- Card preflight (`sync-jira-task.js --check-card`): 3 blocks resolve. `+N more` counts: Summary 3,
  Success Criteria 7, Breaking Changes 2.
- `doc-links.js --file`: 1 relative link, resolves.
- Tracker: `github_issue: 616`, issue OPEN, body link matches.
- Sign-off: not enabled in `skills-config.yaml` (no `sign-off:` key), not checked.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Pre-pass B: `alignment: drift`, `axes_checked` all ten coding-standards axes (`prepass-axes.js` source
`architecture`). Two low findings: test placement (the repository already uses `shared/resources/tests/`)
and `npm run generate-catalog` (Optional O2). Pre-pass C: `implementation_status: not-implemented`; every
cited site confirmed at its line.

### Important

- **I1. Matching rule misses real branch shapes** (check 10). The plan's `id followed by "." or end`
  rejects `bugfix/task.144-cli-decline-keyed-by-name`, every `hotfix/v*` branch, and a QA bug on its
  parent task's branch. Each would link to `develop` and 404 until merge. *Per Q1.*
- **I2. Removed literals pinned by tests are not listed** (check 15). `resolveDocBranch` is pinned by
  `skills/sync-jira-task/tests/sync-jira-task.test.js:2023-2055` (the `:2044` test asserts "with no config
  set, git decides") and once each in the `sync-jira-epic` and `sync-jira-story` suites. Search:
  `git grep -n 'resolveDocBranch\|getCurrentBranchUpstream' -- '*.test.*'`. The plan keeps the no-`docPath`
  behaviour, so these should stay green, but they must be listed and a `docPath` case added beside them.
- **I3. Population test key misses a token-free restatement** (check 13). `DOC_BRANCH=.*@{u}` does not see
  `@{upstream}`, a different variable name, or a `branch --show-current` derivation. Key the test on the
  derivation itself (`rev-parse` with `@{u}` or `@{upstream}`) across `skills/*/SKILL.md` and
  `shared/resources/*.{js,sh,md}`, with `develop-pipeline-step-1-create-branch.md:77` (a tracking check,
  not a link) as the one allowlisted site, and keep the non-vacuity floor.

### Optional

- **O1.** `ensure-bug-github-issue` builds `PARENT_DOC_URL` from the same `BASE`
  (`skills/ensure-bug-github-issue/SKILL.md:91-93`). The plan's before/after shows only `DOC_URL`; state
  that `BASE` stays and the parent link follows the bug document's branch.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

- **I4. Resume states not listed** (check 19). The plan names one state (empty `tracker_issue` past Step 2).
  The rule must hold in six: halted before the Step 2 verdict; READY TO FIX with 2b not run; 2b created the
  issue but the lock write did not land (the `ensure-*` dedup finds it through `github_issue` frontmatter);
  2b ran and returned no issue (deferred or failed); a lock from before this change (issue set in Step 1);
  a PreCompact pause between Step 2 and 2b (`develop-pipeline-on-precompact.sh:156` reads `tracker_issue`
  and posts no pause comment when it is empty). *Per Q3.*

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

- **I5. Three criteria fit no finalise kind** (Step 6 check 4).
  - "A STALE, DUPLICATE or NEEDS DETAIL run creates no tracker issue" and "A READY TO FIX run creates the
    issue … as today" are behaviour criteria whose fix is prose in `develop-bug/SKILL.md`; no test can run
    a pipeline. Rescope both to the structural property the planned test holds: Step 1 contains no
    `ensure-bug-*` invocation and no Signal Work Started; Step 2b is the only one, after READY TO FIX.
  - "No extra network call on any path (the resolver is local git only)" is contradicted by the plan's
    own CLI, which calls `gh repo view` without `--default`, and names no test. Reword: the resolver makes
    at most the one `gh repo view` each site makes today, and none with `--default`; pin it with a stubbed
    `gh` in the CLI test.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

- **I6. The halt cleanup is destructive and loses the verdict's evidence.** The block deletes the branch
  holding `review-bug`'s report, and refuses none of: `BR` equal to `BASE`, a protected name, a dirty
  working tree. *Per Q2:* drop the deletion; Step 1 does not push the bug branch, so a halt leaves a local
  branch only, named in the HALT message. The High-risk entry and its rollback go with it.

### Optional

- **O2.** `npm run generate-catalog` is needed only if a `description:` changes (pre-pass B). No
  description changes are planned; say so.
- **O3.** Effort 16h is consistent with 5 phases, 12 criteria and ~16 files.

---

## Summary of Recommendations

### Should Fix (Important) - 6

1. I1: widen `branchNamesWorkItem` to id-or-parent, separator `.`/`-`/end, `hotfix/v*` for bug docs.
2. I6: drop the branch deletion; Step 1 never pushes; HALT names the local branch and report.
3. I4: add `tracker_step: opened` and list the six resume states.
4. I5: rescope two criteria to the structural test; reword the network criterion and pin it.
5. I3: key the population test on the derivation, with one allowlisted site.
6. I2: list the pinning tests and add a `docPath` case.

### Consider (Optional) - 3

1. O1: keep `BASE` for `PARENT_DOC_URL`.
2. O2: note no `description:` change, so no catalog regeneration.
3. O3: no change.

---

## Implementation Readiness Assessment

**Score:** 7/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 7/10
- Consistency: 7/10
- Risk Management: 6/10

**Confidence Level for Successful Implementation:** Medium, High once the six fixes land.

**Recommendation:** ⚠️ NEEDS REVISION. Every finding has a decided fix; none needs further input.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-10-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.200.tracker-side-effects-after-their-gate/task.200.tracker-side-effects-after-their-gate.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (pre-pass B)
