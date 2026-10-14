# Task Review Report: Task 175 - Resolve finalise's PR number from the branch, not the task body

**Reviewed:** 2026-10-12
**reviewed_blob:** 8e0f9c8ae94a0a51afc793c23cb305036e9dae5a
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-10-12

---

## Executive Summary

The task is well scoped and its motivation is measured, but its search for an existing helper missed `shared/resources/pr-read.sh`, which already reads the current branch's PR on both forges, and its list of derivation sites missed Step 7.2's "add if only in body" frontmatter write. The plan also named a `PR_NUMBER_ARG` input that nothing supplies. All three are fixed in the document and plan; the task is ready to implement.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked (autonomous `develop-task` run — each fix below takes the option that keeps the task's stated scope and design)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked: the review ran inside `/develop-task` (invoked by `/develop-next`, `--defaults`). Every Important finding had one fix consistent with the task's own design, recorded here so a human can revisit it.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking, References and Notes present. `type: task`, `description`, `tags`, `github_issue: 551` and the body link all present and consistent (issue #551 OPEN).
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve; "+N more" counts 4 / 3 / 1 (information, not a defect).
- `doc-links.js`: 1 relative link resolves.
- Sign-off: not enabled in `skills-config.yaml` — not checked.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Pre-pass agents B and C were not dispatched; the axes they cover were checked inline in this session (independence loss recorded).

#### Important

- **I1 — An existing helper already does rung 2 (check 6, same-class inventory).** The document said "No existing helper resolves a PR number", from `git grep -n 'resolve-pr\|pr-number'`. `shared/resources/pr-read.sh` (`pr_read`, output `PR_READ_NUMBER`) reads the PR for the current branch on GitHub and the one open PR from the branch on Bitbucket, with named failures, an HTTP-status check and a control-character-safe parse; develop-* Step 8 uses it. A resolver with its own Bitbucket source-branch query would be a second mechanism for the same job.
  - **Fix applied:** rung 2 **is** `pr_read` with no `--pr`; Technical Background, Target Architecture, Phase 1 and the plan's rung table say so. The Clarification on the body rung now names the case it really answers (on Bitbucket, a PR that is no longer open on a branch still checked out).
- **I2 — A derivation site is missing from the list (check 20, a site list without its search).** `skills/finalise/SKILL.md:1141` (Step 7.2): "Ensure `pr_number` is present in frontmatter (add if only in body)". It copies a body number into frontmatter, where the new rung 4 would trust it on every later run — the defect by another route.
  - **Fix applied:** the search that defines the list is recorded beside it; Step 7.2 joins Scope, Phase 2, the presence pin, the mutation table and a success criterion: it writes Step 3a's resolved `PR_NUMBER`, and nothing when none resolved.
- **I3 — `PR_NUMBER_ARG` has no source (check 9, an input nothing supplies).** The plan's Step 3a block passed `${PR_NUMBER_ARG:+--pr …}` as "the orchestrator's number when it passes one". finalise takes no PR argument (its only flag is `--bug`) and `develop-pipeline-step-7-finalise.md` passes none.
  - **Fix applied:** Step 3a calls the resolver without `--pr`; rung 1 stays in the resolver for direct callers and the tests.

#### Optional

- **O1 — Drifted line anchors (check 2).** `skills/finalise/SKILL.md:448-449` → `462-463`; `:234` → `243`; `develop-pipeline-step-4-create-pr.md:246` → `266`. Fixed.
- **O2 — State the inputs of test cases 5 and 6 (check 10).** Both need rungs 2–4 empty. Fixed in the task and the plan.

Other checks: cited helpers exist (`qa-cycle.sh`, `verify-push-state.sh`, `resolve-platform.sh`, `bitbucket-auth.sh`, `executed-prose.mjs` exports `fixtureRepo`, `ghStub`, `ghCalls`, `SHELLS`); the lock fields consumed (`pr_url`, `task_or_story_directory`) are written by Steps 1 and 4 (check 21); `advance-pipeline-lock.sh` canonicalises with `cd … && pwd -P` (line 212) as cited; check 15 removed-literal sweep — `git grep -nF -e 'pull/([0-9]+)' -e 'PR number from frontmatter' -e 'add if only in body' -- '*.test.*' evals tests` has no hits, so no existing test pins a literal this task removes.

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with files, checkboxes and risk. The new test lands in `shared/resources/tests/*.test.mjs`, which `npm test` reaches (check 18); the new script is under `git ls-files '*.sh'`, which `lint:shell` covers. Effort 8h is consistent with the rubric.

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

- Every behaviour criterion names its test (the executed resolver test or the presence pin); the CHANGELOG criterion is a documentation criterion; Performance is an explicit "not applicable". The post-merge observation update is in Notes, not a criterion.
- **O3 — zsh on CI (check 4).** CI lanes run bash only (`SHELLS` adds zsh only where installed). Testing Strategy now reads "every shell in `SHELLS` (bash in CI; zsh where installed, verified locally)". Fixed.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The stale-lock risk is mitigated by the directory match and by rung 2 sitting above rung 3; the standalone-run risk is low and named. Rollback is a revert plus `npm run bundle`.

- **O4 — Rung 2 on a base branch.** A standalone `/finalise` run on `develop` would take a PR whose head is `develop` (a release PR) as its own. Low probability (finalise runs on the work item's branch); left as a note for develop, not a change.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues (all applied)

1. Reuse `pr-read.sh` for rung 2.
2. Add Step 7.2's body-to-frontmatter write to the scope and the pin.
3. Drop the unsourced `PR_NUMBER_ARG`.

### Consider (Optional) - 4 items (3 applied)

1. Correct three line anchors (applied).
2. Pin cases 5–6 inputs (applied).
3. Scope the zsh baseline to where zsh exists (applied).
4. Rung 2 on a base branch (noted, no change).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (before fixes)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the three Important findings each had one fix consistent with the task's design, and all three are applied.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, autonomous)
- **Review Date:** 2026-10-12
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.175.finalise-pr-number-from-branch/task.175.finalise-pr-number-from-branch.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load)
