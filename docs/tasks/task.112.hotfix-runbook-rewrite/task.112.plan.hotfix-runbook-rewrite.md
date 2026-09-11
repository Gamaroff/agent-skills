---
id: task.112.plan
title: "Implementation Plan: the hotfix runbook meets the pipeline"
type: plan
task-ref: task.112.hotfix-runbook-rewrite.md
---

# Implementation Plan: the hotfix runbook meets the pipeline

> Requirements and success criteria: [task.112.hotfix-runbook-rewrite.md](task.112.hotfix-runbook-rewrite.md)

## Overview

A task.107-shaped rewrite. Reuse its plan structure; the source-of-truth table in §3 is the reading
list.

## Phase-by-Phase Implementation Guide

### Phase 1: read the skill, not the page

`skills/develop-bug/SKILL.md` ≈160-200 (Phase 0d Q1–Q3, `--base main`, the hotfix note) and
`references/develop-bug-step-0-resolve-bug.md`. Write the step list from those.

### Phase 2: rewrite

Section shape from `docs/runbooks/bug-fix.md` (post-task.107): Before you start → pipeline diagram
→ steps → artifacts → pitfalls → see also. Diagram: file bug → `/develop-bug` (Q1 = hotfix) →
`review-bug` gate → fix + regression test → PR → `main` → verify loop → finalise → **tag (human)** →
back-merge PR `main → develop`.

### Phase 3: the two riders

- `workflows.md`: find where PR/issue comments are described; add the lead paragraph with a pointer
  to `shared/resources/stakeholder-summary.md`.
- `faq.md:25`: `Step 5c` → `[Step 5c](../operations/workflows.md#…)` or the runbook anchor that
  defines it — verify the anchor exists in the tracked tree.

## Key Patterns and References

- task.107's implementation report and review for what its reviewer flagged (arrival points, length
  budget, no Change Log in bug guidance).

## Testing Approach

Link check against `git ls-files`; `npm run format:check`; `wc -l` ≤ 150.
