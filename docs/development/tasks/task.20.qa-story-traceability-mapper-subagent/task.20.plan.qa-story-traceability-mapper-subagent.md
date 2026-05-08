---
id: task.20.plan
title: "Implementation Plan: qa-story traceability mapper subagent"
type: plan
task-ref: task.20.qa-story-traceability-mapper-subagent.md
---

# Implementation Plan — Task 20

> Requirements and success criteria: [task.20.qa-story-traceability-mapper-subagent.md](task.20.qa-story-traceability-mapper-subagent.md)

## Overview

Pre-`/qa-story` Explore agent maps ACs → spec/src files; result passed via `--traceability-matrix <path>`. `/qa-story` skips internal mapping when arg present.

## Phase 1 — Matrix schema

Markdown table written to `<task-dir>/.summaries/qa-traceability-matrix.md`:

```markdown
| AC | Spec files | Src files | Coverage |
|----|------------|-----------|----------|
| AC1 | `foo.spec.ts:42` | `foo.ts` | full |
| AC2 | (none) | `bar.ts` | gap |
```

Coverage: full | partial | gap | uncertain.

## Phase 2 — Mapper prompt

`shared/resources/qa-traceability-mapper-prompt.md`:

```
Read <story_path>. Extract Acceptance Criteria.
For each AC:
  - Grep for likely spec files: `*.spec.*`, `*.test.*` matching keywords
  - Identify src files referenced in story File List or implied by AC keywords
  - Coverage: full if both exist, partial if 1, gap if 0, uncertain if multiple ambiguous matches
Return matrix in markdown table form. Cap 30 ACs.
```

## Phase 3 — Orchestrator wiring

In `develop-pipeline-step-5-6-qa-loop.md`:
- Before `/qa-story` invocation, dispatch mapper
- Append `--traceability-matrix <path>` arg

## Phase 4 — `/qa-story` consumption

In `skills/qa-story/SKILL.md`:
- Accept `--traceability-matrix <path>` arg
- When present, read matrix instead of internal mapping
- Use coverage column in NFR/AC traceability section

## Key References

- Existing `/qa-story` traceability section (find in qa-story SKILL.md)
- File-list pattern in story frontmatter

## Testing Approach

1. Story with 5 ACs, 3 fully covered + 1 partial + 1 gap → matrix matches manual review
2. Run with arg vs without; gate decisions identical
