---
id: task.19
title: "Add create-pr diff summariser Explore subagent"
type: task
category: refactoring
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: —
github_issue: 37
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #4)
---

# Task 19 — Create-PR diff summariser subagent

**Status**: Planned

> Detailed implementation guide: [task.19.plan.create-pr-diff-summariser-subagent.md](task.19.plan.create-pr-diff-summariser-subagent.md)

## 1. Overview

`/create-pr` currently reads `git diff <base>...HEAD` into main context to author the PR title and body. For a multi-day branch the diff can be 10k+ lines.

**Scope**: dispatch Explore subagent to read the diff, produce structured PR-body sections (Summary / Changes / Test plan), and return as a small string. Main context consumes that string only.

## 2. Motivation

- Diffs of 5k+ lines burn context fast.
- PR-body consistency improves when one prompt writes the body, not ad-hoc main composition.

## 3. Technical Background

**Current**: `skills/create-pr/SKILL.md` shells `git log` and writes a body inline.

**Target**: capture diff to file (`.claude/state/pr-diff-<ts>.patch`), dispatch Explore: "Read this patch, produce 3 sections: Summary (3 bullets), Changes (grouped by area), Test plan (checklist). Return markdown only." Main inserts into `gh pr create --body`.

## 4. Scope

**In**: PR body generation only.
**Out**: PR title, GitHub issue auto-linking, Bitbucket REST path (covered by same change but verified separately).

## 5. Breaking Changes

None — body content shape compatible with existing template.

## 6. Implementation Plan

### Phase 1 — Capture diff to file (Low)
- [ ] Pre-write `git diff <base>...HEAD > .claude/state/pr-diff-<ts>.patch`

### Phase 2 — Authoring prompt (Low)
- [ ] Markdown-only output, fixed sections, ≤80 lines total
- [ ] Group changes by top-level dir

### Phase 3 — Wire (Medium)
- [ ] Replace inline body composition with subagent dispatch
- [ ] Preserve `--exclude` pathspec semantics (diff respects them)
- [ ] Bitbucket and GitHub paths both consume same body

### Phase 4 — Validation (Low)
- [ ] PR with ≥1k line diff: confirm body still concise
- [ ] PR with single-file diff: confirm not over-bloated

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
- [ ] Diff never read into main context
- [ ] PR body uses fixed 3-section template
- [ ] `--exclude` semantics preserved

**Performance**:
- [ ] Main tokens for create-pr step reduced ≥60% on 1k+ line diff

**Quality**:
- [ ] PR bodies pass team review style on representative cases

**Migration**:
- [ ] None — backwards-compatible

## 10. Risk Assessment

**Medium**: subagent omits important change → reviewer misses it. Mitigation: include "if anything unusual or risky, surface it as Concerns section" instruction.

**Low**: large diffs exceed subagent context. Mitigation: subagent reports "diff too large, summarising by file count + top-level paths only" fallback.

## 11. Rollback Plan

Revert `skills/create-pr/SKILL.md`; inline body composition restored.
