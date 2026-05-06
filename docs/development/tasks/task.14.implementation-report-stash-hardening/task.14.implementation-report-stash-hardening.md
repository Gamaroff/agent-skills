---
id: task.14
title: "Harden implementation-report stash dance in develop pipeline"
type: task
category: refactoring
priority: Low
status: 📋 Planned
created: 2026-05-06
assignee: TBD
effort: 0.5 day
depends_on: —
github_issue: 21
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #8)
---

# Task 14 — Harden implementation-report stash dance in develop pipeline

## 1. Overview

`develop-pipeline-step-1-create-branch.md` stashes the implementation report, runs `/create-branch`, then pops. `develop-pipeline-step-4-create-pr.md` runs `git restore --staged` on the report immediately before `/create-pr`, which itself runs `git add -A` via `/commit-changes`. If `/commit-changes` re-stages everything (it does), the report can leak into the PR commit. Currently relies on the staged-restore happening in the same shell turn as `/create-pr`, which is fragile.

**Scope**: pick the most robust of two approaches and ship it.

- **Approach A**: add an explicit exclusion (`:!{report-path}`) to `/commit-changes` when invoked from the pipeline (a `--exclude` flag or pre-supplied env var)
- **Approach B**: move the implementation report outside the working tree (`.claude/state/`) until Step 8, then move it into the task directory before the final commit

**Key deliverables**:

- A chosen approach implemented in the pipeline references and `/commit-changes`
- The PR commit verifiably never contains the implementation report (until the Step 8 commit)
- Resume logic still finds the report

**Expected outcome**: the implementation report leak risk is eliminated, not papered over with timing assumptions.

## 2. Motivation

**Current Problems**:

- Report leak into PR commits if any future `/commit-changes` edit changes its staging behaviour
- Fragile reliance on tool-call ordering within a turn
- Hard to test — the failure mode is silent and only surfaces in PR review

**Benefits**:

- Deterministic exclusion, not timing-dependent
- Easier to add new "always-excluded from PR commits" artifacts later
- Reviewer-friendly: PRs stay clean

## 3. Technical Background

**Current dance** (`develop-pipeline-step-4-create-pr.md`):

```bash
git restore --staged "{implementation-report-path}" 2>/dev/null || true
# then invoke /create-pr → /commit-changes runs `git add -A`
```

**Approach A** (`--exclude` flag in `/commit-changes`):

```bash
/commit-changes --exclude "{implementation-report-path}"
```

`/commit-changes` would run `git add -A -- ':!{exclude}'` instead of `git add -A`.

**Approach B** (move report to `.claude/state/` until Step 8):

- Step 0e creates report at `.claude/state/develop-pipeline/{task-id}.implementation.md`
- Step 8 moves it back into the task directory: `mv .claude/state/develop-pipeline/{id}.implementation.md docs/.../task.{id}.implementation.{N}.{name}.md` then commits
- Resume logic checks both locations

**Recommended**: Approach A is smaller, more localised, easier to test. Approach B is more robust but touches every step that references the report path.

## 4. Scope

**In Scope**:

- ✅ Implement Approach A: add `--exclude <path>` flag to `/commit-changes`
- ✅ Update `develop-pipeline-step-4-create-pr.md` to invoke `/commit-changes` with the exclude flag (via the `/create-pr` pre-supplied params already in use)
- ✅ Update `/create-pr` to forward an exclude path to `/commit-changes`
- ✅ Verification step: after `/create-pr`, confirm report not in `git log -p HEAD`

**Out of Scope**:

- ❌ Approach B (deferred unless Approach A proves insufficient)
- ❌ Generalising to multiple exclusion patterns

## 5. Breaking Changes

None. The `--exclude` flag is additive in `/commit-changes`; pipeline behaviour is unchanged when no exclusion is supplied.

## 6. Implementation Plan

### Phase 1 — Add `--exclude` to commit-changes (Risk: Low)

Files:

- `skills/commit-changes/SKILL.md`

Changes:

- [ ] Document a new `--exclude <path>` flag (or env var equivalent)
- [ ] Modify the `git add` step to use pathspec exclusion: `git add -A -- ':!{exclude}'`
- [ ] Document edge cases (multiple excludes, glob patterns)

### Phase 2 — Plumb through create-pr (Risk: Medium)

Files:

- `skills/create-pr/SKILL.md`

Changes:

- [ ] Accept an `--exclude <path>` arg; forward to `/commit-changes`
- [ ] Document the new arg in the "Check for Pre-Supplied Parameters" section

### Phase 3 — Pipeline reference update (Risk: Low)

Files:

- `shared/resources/develop-pipeline-step-4-create-pr.md`

Changes:

- [ ] Replace the `git restore --staged` dance with `/create-pr --base {Q2} --issue {N} --exclude {report-path}`
- [ ] Add a verification step: `git log -1 --name-only HEAD | grep -q "$(basename {report-path})" && echo "LEAK DETECTED" || echo "OK"`

## 7. Files Summary

**Modified**:

- `skills/commit-changes/SKILL.md`
- `skills/create-pr/SKILL.md`
- `shared/resources/develop-pipeline-step-4-create-pr.md`

## 8. Testing Strategy

- **Manual**: run `/develop-task` against a sandbox task; after Step 4, confirm report not in PR commit (`git log --name-only`).
- **Negative**: deliberately re-stage the report before `/create-pr`; verify pipeline still excludes it.
- **Static**: `grep -n "git restore --staged" shared/resources/develop-pipeline-step-4-create-pr.md` should return zero hits after migration.

## 9. Success Criteria

**Functional**:

- [ ] PR commit never contains the implementation report
- [ ] `/commit-changes --exclude` works for arbitrary paths
- [ ] Pipeline verification step catches leaks if exclusion fails

**Code Quality**:

- [ ] Stash dance removed from Step 4 reference
- [ ] Step 1 stash/pop dance reviewed: keep for now (not a leak risk, only ordering safety)

## 10. Risk Assessment

**Medium Risk** — `git add` pathspec exclusion edge cases:

- Probability: Medium. Impact: report still leaks.
- Mitigation: explicit verification step in pipeline catches leaks; unit-test in `/commit-changes` smoke instructions.

**Low Risk** — Forward-compat with future excludes:

- Mitigation: design `--exclude` to take repeated args.

## 11. Rollback Plan

**Immediate (< 30 min)**: revert the Step 4 reference to the old `git restore --staged` dance; ignore the new `--exclude` flag (additive, unused). `/commit-changes` and `/create-pr` changes are backward-compatible.

**Triggers**: PR commits start including unintended files; pipeline halts on commit-changes argument errors.
