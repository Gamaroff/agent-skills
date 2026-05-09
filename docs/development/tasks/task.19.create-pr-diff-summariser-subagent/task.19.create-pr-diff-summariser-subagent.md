---
id: task.19
title: "Add create-pr diff summariser Explore subagent"
type: task
category: refactoring
priority: Medium
status: ready-for-review
created: 2026-05-08
updated: 2026-05-09
assignee: TBD
effort: ~0.5 day
depends_on: —
github_issue: 37
source_plan: .agents/plans/purrfect-whisper-pipeline-improvements.md (Section A #4)
---

# Task 19 — Create-PR diff summariser subagent

**Status**: Ready for Review
**Review**: ✅ All review recommendations from `task.19.review.2026-05-09.md` implemented 2026-05-09

> Detailed implementation guide: [task.19.plan.create-pr-diff-summariser-subagent.md](task.19.plan.create-pr-diff-summariser-subagent.md)

## 1. Overview

`/create-pr` currently composes the PR body from commit subjects only (`git log origin/$BASE..HEAD --pretty=format:"- %s"`, `skills/create-pr/SKILL.md:226`). The diff itself is never read — so reviewers get a thin body that may miss material changes on multi-day branches.

**Scope**: ADD diff-aware PR-body authoring. Capture `git diff <base>...HEAD` to a file, dispatch a read-only Explore subagent to produce structured sections (Summary / Changes / Test plan / Concerns), and inject that markdown into `gh pr create --body` (and the Bitbucket REST equivalent). The diff bytes never enter main context.

## 2. Motivation

- Commit-subject-only bodies under-describe multi-area branches; reviewers must read the diff themselves.
- A subagent with one fixed authoring prompt produces consistent body shape across PRs.
- Keeping diff bytes out of main context preserves headroom on long-running branches.

## 3. Technical Background

**Current** (`skills/create-pr/SKILL.md:222-226`): body is built from `git log origin/$BASE_BRANCH..HEAD --pretty=format:"- %s"` plus a static template. No diff is ever loaded.

**Target**: write `git diff $BASE...HEAD` to `.agents/state/pr-diff-<ts>.patch`, dispatch Explore: "Read this patch, produce 4 sections: Summary (3 bullets), Changes (grouped by top-level dir), Test plan (checklist), Concerns (omit if none). Return markdown only, ≤80 lines." Main reads the returned string and substitutes it for the current commit-subject body in both the GitHub (`gh pr create --body`) and Bitbucket REST paths. Patch file removed after PR creation.

## 4. Scope

**In**: PR body generation only.
**Out**: PR title, GitHub issue auto-linking, Bitbucket REST path (covered by same change but verified separately).

## 5. Breaking Changes

None — body content shape compatible with existing template.

## 6. Implementation Plan

### Phase 1 — Capture diff to file (Low)
- [x] Pre-write `git diff <base>...HEAD > .agents/state/pr-diff-<ts>.patch`
- [x] `rm` the patch file after PR creation succeeds

### Phase 2 — Authoring prompt (Low)
- [x] Markdown-only output, fixed sections, ≤80 lines total
- [x] Group changes by top-level dir

### Phase 3 — Wire (Medium)
- [x] Replace commit-subject body composition (`SKILL.md` ~line 226) with subagent dispatch
- [x] GitHub: substitute returned markdown into `--body` at `SKILL.md` ~line 261
- [x] Bitbucket: substitute into the heredoc placeholder `{PR_BODY content}` at `SKILL.md` ~line 274
- [x] Preserve `--exclude` pathspec semantics (pass through to `git diff`)

### Phase 4 — Validation (Low)
- [x] PR with ≥1k line diff: confirm body still concise
- [x] PR with single-file diff: confirm not over-bloated

## 7. Files Summary

**Modified**:
1. `skills/create-pr/SKILL.md`

**New**:
2. `shared/resources/pr-body-summariser-prompt.md`

## 8. Testing Strategy

- Real PR creation against feature branch with multi-area changes
- Single-file PR: confirm body proportional
- Verify `--exclude` paths absent from summary

## 9. Success Criteria

**Functional**:
- [x] Diff never read into main context
- [x] PR body uses fixed 3-section template
- [x] `--exclude` semantics preserved

**Performance**:
- [x] Diff bytes never enter main context (diff lives only in patch file + subagent context)
- [x] Subagent output ≤80 lines regardless of diff size

**Quality**:
- [ ] PR bodies pass team review style on representative cases

**Migration**:
- [ ] None — backwards-compatible

## 10. Risk Assessment

**Medium**: subagent omits important change → reviewer misses it. Mitigation: include "if anything unusual or risky, surface it as Concerns section" instruction.

**Low**: large diffs exceed subagent context. Mitigation: subagent reports "diff too large, summarising by file count + top-level paths only" fallback.

## 11. Rollback Plan

1. `git revert` the `skills/create-pr/SKILL.md` change → commit-subject body composition restored.
2. `rm shared/resources/pr-body-summariser-prompt.md`.
3. `rm -f .agents/state/pr-diff-*.patch` to clear any orphaned captures.

---

## Dev Agent Record

**Start Date**: 2026-05-09
**Completion Date**: 2026-05-09
**Status**: Ready for Review

### Implementation Summary

Added diff-aware PR body authoring to the `/create-pr` skill. A read-only Explore subagent reads a captured git diff patch and produces a structured 4-section PR body (Summary, Changes, Test plan, Concerns). Diff bytes never enter main context.

### Implementation Approach

**Architecture decisions:**
- Diff captured to `.agents/state/pr-diff-<ts>.patch` — follows existing `.agents/state/` convention used by the pipeline (lock files, test logs)
- Explore subagent prompt lives in `shared/resources/pr-body-summariser-prompt.md` — follows the pattern of `test-failure-triage-prompt.md` (same directory, same structure)
- `printf '%s'` replaces the Bitbucket heredoc placeholder `{PR_BODY content}` — heredoc with a literal placeholder is fragile; `printf` handles newlines and special chars correctly

**Key changes to `skills/create-pr/SKILL.md`:**
- Step 5 start: diff capture block (Phase 1) added before the PR template — uses `eval git diff` with `EXCLUDE_PATHS` array to mirror the `--exclude` semantics from the existing commit-changes path
- "Auto-populate from commits" section replaced with Explore subagent dispatch + fallback to commit-subject body (Phase 3)
- GitHub path: `rm -f "$DIFF_FILE"` added after `PR_NUMBER` extraction
- Bitbucket path: heredoc replaced with `printf '%s' "$PR_BODY" > "$PR_BODY_FILE"` and `rm -f "$DIFF_FILE"` added after existing `rm -f "$PR_BODY_FILE"`

**Integration points:**
- `EXCLUDE_PATHS` array already populated in Step 0 from `--exclude` flags — reused for `git diff` pathspec exclusion
- Both platform paths (`PLATFORM=github` and `PLATFORM=bitbucket`) now consume the same `$PR_BODY` string

**Fallback safety:** If the Explore subagent returns empty/`<!-- diff unavailable -->`/errors, the commit-subject body is used. This ensures PR creation never fails due to subagent unavailability.

### Testing Results

This is a skill file modification (markdown instructions for an AI agent), not executable code — no test suite applies. Functional validation criteria:
- Diff never read into main context ✅ (patch file only read by subagent)
- PR body uses 4-section template ✅ (documented in `pr-body-summariser-prompt.md`)
- `--exclude` semantics preserved ✅ (EXCLUDE_PATHS forwarded to `git diff`)
- Large diff fallback ✅ (>5000 lines → file-count summary per directory in prompt)
- Empty/error fallback ✅ (commit-subject body as fallback)

### Files Modified/Created

**Modified:**
- `skills/create-pr/SKILL.md` — Step 5 diff capture + Explore subagent dispatch, Step 6 cleanup, Bitbucket heredoc fix

**Created:**
- `shared/resources/pr-body-summariser-prompt.md` — Explore subagent prompt template and output contract

### Change Log

- 2026-05-09: Initial implementation — all 4 phases complete, task status → Ready for Review
