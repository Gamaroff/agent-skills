---
id: task.107
title: "[Task 107] The bug-fix runbook documents a pipeline that has been superseded twice"
type: task
description: "docs/runbooks/bug-fix.md still describes the pre-develop-bug loop: create-bug-report by hand, fix, re-run qa-story, commit. It never mentions /develop-bug, /review-bug, general-bug mode, the bug registry, or any tracker sync — including the sync-jira-bug / sync-github-bug / ensure-bug-*-issue skills added in v0.46.0. A reader following it works entirely off-tracker and never learns the bug pipeline exists."
tags: [documentation, runbooks, develop-bug, bug-documents]
category: documentation
status: ready-for-development
priority: Medium
risk_level: low
created: 2026-09-10
updated: 2026-09-10
assignee:
estimated_effort_hours: 3
---

# Technical Task: rewrite the bug-fix runbook against the pipeline that exists

**Status:** Ready for Development

---

## 1. Overview

`docs/runbooks/bug-fix.md` (68 lines) is the entry point a reader reaches from
`docs/runbooks/README.md`, from `which-path.md`, and from the "Use a different runbook if" callout in
`story-development.md` and `task-development.md`. It documents a four-step manual loop that predates
the bug pipeline entirely.

Rewrite it against what ships, in the shape of the two runbooks it sits beside
(`story-development.md`, `task-development.md`).

## 2. Motivation

The runbook was accurate when it was written and has been overtaken twice without being revisited.

**First**, by `/develop-bug` and `/review-bug`. The runbook's "Steps" block is
`qa-story → create-bug-report → [developer fixes] → qa-story → commit-changes`. The pipeline that
exists is `create-branch → review-bug → investigate & fix → create-pr → verify loop → finalise →
commit-changes`, crash-safe, with a fix-readiness gate that halts on a duplicate or under-specified
bug. A reader following the runbook does the orchestrator's job by hand and never learns it is there.

**Second**, by tracker sync. v0.46.0 added `sync-jira-bug`, `sync-github-bug`,
`ensure-bug-jira-issue` and `ensure-bug-github-issue`; a bug now gets a real tracker card, linked as a
sibling of its parent story or task, with Status History rows written on creation and transition. The
runbook mentions no tracker at all — `grep -c 'tracker\|jira\|github_issue' docs/runbooks/bug-fix.md`
returns 0.

**Third, and smaller**, the naming section lists two of the three bug modes. General
(cross-cutting) bugs live in `docs/bugs/` with a global registry and are absent from the page, so a
reader with a bug that belongs to no story or task finds no route at all.

The cost is not that the documented loop fails — it works, and produces an untracked fix. It is that
the page is where a reader goes *first*, and it terminates before the capability starts.

## 3. Technical Background

Sources of truth to write against, none of which the runbook currently cites:

| Concern | Canonical |
| :--- | :--- |
| The bug pipeline | `skills/develop-bug/SKILL.md` |
| The fix-readiness gate | `skills/review-bug/SKILL.md` (`--validate` mode) |
| The three bug modes and their numbering | `docs/standards/bug-documents.md` |
| General-bug numbering | `docs/standards/bug-registry.md` |
| Tracker sync | `skills/sync-{jira,github}-bug/SKILL.md`, `shared/resources/status-history.js` |
| Bug reports carry Status History, never a Change Log | `shared/resources/document-change-log.md` |

Note the last row: bug reports are the one document type barred from the `## Change Log`, and a
rewrite is exactly where that rule gets broken by copying the story runbook's shape.

## 4. Scope

**In scope**

- Rewrite `docs/runbooks/bug-fix.md` against the shipped pipeline, matching the structure of
  `task-development.md` (Before you start → pipeline diagram → steps → artifacts → pitfalls → see also)
- All three bug modes, including the `docs/bugs/` + registry route
- The tracker-sync step, on both `TRACKER` arms
- Keep the hotfix boundary intact — the "is this the right runbook?" callout is correct and stays
- Update `docs/concepts/which-path.md`, which routes a bug fix to `/create-story` and offers no bug path

**Out of scope**

- Any change to the bug skills themselves
- The `docs/runbooks/hotfix.md` rewrite (separate page, separate question)
- Backfilling tracker cards for existing bug reports

## 5. Breaking Changes

None. Documentation only.

## 6. Implementation Plan

1. Read the four bug skills and `docs/standards/bug-documents.md`; write the step list from the
   skills, not from the current page.
2. Rewrite `bug-fix.md`. Verify every command in it by running it, or mark it explicitly as
   illustrative — the page currently contains no runnable command, which is why nothing caught the drift.
3. Add the bug branch to `which-path.md`'s flowchart, prose fallback and quick-reference table.
4. Re-run the docs link check locally against the tracked tree, not the working tree.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `docs/runbooks/bug-fix.md` | rewritten |
| `docs/concepts/which-path.md` | bug branch added to three places |
| `docs/runbooks/README.md` | one-line description re-checked against the new page |

## 8. Testing Strategy

Documentation, so the checks are the repo's existing doc gates rather than new tests:

- `Docs link check` workflow green (the page gains links to four skills and three standards)
- `npm run format:check`
- Every skill and standard named in the page resolves — verify against the **tracked** tree, not the
  working tree, which misses `#anchors` and gitignored targets

## 9. Success Criteria

1. `bug-fix.md` names `/develop-bug` and `/review-bug` and gives the pipeline's actual step order
2. All three bug modes appear, each with its filename pattern and its numbering rule
3. The tracker-sync step appears, on both arms, and names which skill does it
4. No `## Change Log` is introduced into any bug-report guidance on the page
5. `which-path.md` routes a reported bug to the bug path rather than to `/create-story`
6. The hotfix boundary callout survives unchanged
7. Every internal link resolves against the tracked tree

## 10. Risk Assessment

**Low.** Documentation only, no skill or script touched. The one real risk is the rewrite importing
the story runbook's Change Log convention into a document type that forbids it — Success Criterion 4
exists for that specific mistake.

## 11. Rollback Plan

`git revert` the commit. No state, no migration.

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2026-09-10 | 1.0     | Filed during v0.46.0 release doc sweep   | Claude |

## References

- `docs/runbooks/bug-fix.md` — the page under rewrite
- `skills/develop-bug/SKILL.md`, `skills/review-bug/SKILL.md`
- `docs/standards/bug-documents.md`, `docs/standards/bug-registry.md`
- Filed from the v0.46.0 release documentation sweep, alongside the CHANGELOG and install-runbook gaps
  fixed in that release
